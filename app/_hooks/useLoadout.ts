import { useState, useCallback, useEffect } from 'react';
import { Material } from '../_services/api';
import { storage } from '../_utils/storage';
import { calculateRawMaterialsFromLocal } from '../_utils/materialCalculator';

export interface LootPlannerCalculation {
  directRecipes: Material[]; // Intermediate materials (e.g., Advanced Electrical Components)
  rawMaterials: Material[]; // Final raw materials
  usedFallback: string[];
  materialUsage: Record<string, string[]>; // material name → array of item names using it
}

export function useLoadout() {
  const [favoritedItems, setFavoritedItems] = useState<string[]>([]);
  const [calculation, setCalculation] = useState<LootPlannerCalculation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Load favorites from storage on mount
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const saved = await storage.getFavorites();
        setFavoritedItems(saved);
        setInitialized(true);
      } catch (err) {
        console.error('Error loading favorites:', err);
        setInitialized(true);
      }
    };
    loadFavorites();
  }, []);

  // Save favorites whenever they change
  useEffect(() => {
    if (initialized) {
      storage.saveFavorites(favoritedItems);
    }
  }, [favoritedItems, initialized]);

  const calculateMaterials = useCallback(async () => {
    if (favoritedItems.length === 0) {
      setCalculation(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use local recipes.json as primary source
      const localResult = calculateRawMaterialsFromLocal(favoritedItems);
      const missingItems = favoritedItems.filter(item => !localResult.processedItems.includes(item));
      
      // Convert Map to Record for React state
      const materialUsageRecord: Record<string, string[]> = {};
      localResult.materialUsage.forEach((itemSet, materialName) => {
        materialUsageRecord[materialName] = Array.from(itemSet);
      });
      
      setCalculation({
        directRecipes: localResult.directRecipes,
        rawMaterials: localResult.rawMaterials,
        usedFallback: [], // Always using local recipes.json, so no fallback needed
        materialUsage: materialUsageRecord,
      });

      if (missingItems.length > 0) {
        setError(`Some items not found in recipes: ${missingItems.join(', ')}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate materials');
      setCalculation(null);
    } finally {
      setLoading(false);
    }
  }, [favoritedItems]);

  // Auto-calculate materials when favorites change
  useEffect(() => {
    if (!initialized) return;
    if (favoritedItems.length === 0) {
      setCalculation(null);
      setError(null);
      return;
    }

    calculateMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoritedItems, initialized]);

  const toggleFavorite = useCallback((itemName: string) => {
    setFavoritedItems(prev => {
      if (prev.includes(itemName)) {
        return prev.filter(name => name !== itemName);
      }
      return [...prev, itemName];
    });
    setError(null);
  }, []);

  const removeItem = useCallback((itemName: string) => {
    setFavoritedItems(prev => prev.filter(name => name !== itemName));
    setError(null);
  }, []);

  const clearLoadout = useCallback(() => {
    setFavoritedItems([]);
    setCalculation(null);
    setError(null);
  }, []);

  const setFavoritedItemsDirect = useCallback((items: string[]) => {
    setFavoritedItems(items);
    setError(null);
  }, []);

  // Keep selectedItems alias for backward compatibility with ItemSelector
  return {
    favoritedItems,
    selectedItems: favoritedItems, // Alias for backward compatibility
    calculation,
    loading,
    error,
    addItem: toggleFavorite, // Toggle behavior
    removeItem,
    calculateMaterials, // Keep for compatibility but auto-calls
    clearLoadout,
    toggleFavorite,
    setFavoritedItems: setFavoritedItemsDirect,
  };
}
