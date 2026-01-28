import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Material } from '../services/api';
import { getItemImageSource, getMaterialImageSource } from '../utils/itemImages';
import { MaterialHeatmap } from './MaterialHeatmap';

function slug(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

const RECIPES_RAW = require('../../data/recipes.json');

// Normalize recipes to handle both old format (array) and new format (object with output and ingredients)
type RecipeFormat = 
  | { material: string; quantity: number }[] // Old format
  | { output?: number; ingredients: { material: string; quantity: number }[] }; // New format

const RECIPES: Record<string, RecipeFormat> = RECIPES_RAW;

// Helper to get recipe ingredients and output quantity
function getRecipeData(recipe: RecipeFormat | undefined): { ingredients: { material: string; quantity: number }[]; output: number } {
  if (!recipe) {
    return { ingredients: [], output: 1 };
  }
  if (Array.isArray(recipe)) {
    // Old format: array of ingredients, output = 1
    return { ingredients: recipe, output: 1 };
  } else {
    // New format: object with output and ingredients
    return { 
      ingredients: recipe.ingredients || [], 
      output: recipe.output ?? 1 
    };
  }
}

function isCraftable(materialName: string): boolean {
  const recipe = RECIPES[materialName];
  if (!recipe) return false;
  const { ingredients } = getRecipeData(recipe);
  return ingredients.length > 0;
}

/**
 * Recursively resolve a material to raw materials.
 */
function resolveMaterialToRaw(
  materialName: string,
  quantity: number,
  visited: Set<string> = new Set(),
): Material[] {
  if (visited.has(materialName)) {
    return [{ name: materialName, quantity }];
  }
  visited.add(materialName);

  const recipe = RECIPES[materialName];
  if (!recipe) {
    return [{ name: materialName, quantity }];
  }

  const { ingredients, output } = getRecipeData(recipe);
  if (ingredients.length === 0) {
    return [{ name: materialName, quantity }];
  }

  // Calculate how many crafts are needed to produce the required quantity
  const craftsNeeded = Math.ceil(quantity / output);

  const rawMaterials = new Map<string, number>();
  for (const { material: ing, quantity: ingQty } of ingredients) {
    const resolved = resolveMaterialToRaw(ing, ingQty * craftsNeeded, new Set(visited));
    for (const { name, quantity: qty } of resolved) {
      rawMaterials.set(name, (rawMaterials.get(name) || 0) + qty);
    }
  }

  return Array.from(rawMaterials.entries(), ([name, qty]) => ({ name, quantity: qty }));
}

interface ItemBreakdown {
  itemName: string;
  recipe: { material: string; quantity: number; rawMaterials: Material[] }[];
}

interface RawMaterialsListProps {
  favoritedItems: string[];
  directRecipes?: Material[];
  rawMaterials: Material[];
  usedFallback?: string[];
  materialUsage?: Record<string, string[]>;
}

// Load backpack items for rarity data
const BACKPACK_ITEMS_RAW: { Item: string; Rarity?: string }[] = require('../../data/backpack-items.json');

// Rarity order (higher number = higher rarity)
const RARITY_ORDER: Record<string, number> = {
  'common': 1,
  'uncommon': 2,
  'rare': 3,
  'epic': 4,
  'legendary': 5,
};

const WEAPON_RARITY_COLORS: Record<string, string> = {
  legendary: '#FFD700',
  epic: '#E040FB',
  rare: '#2196F3',
  uncommon: '#4CAF50',
  common: '#9E9E9E',
};

// Create a map of item name to rarity
const ITEM_RARITY_MAP = new Map<string, string>();
BACKPACK_ITEMS_RAW.forEach(item => {
  const rarity = ((item.Rarity || 'Common') as string).toLowerCase();
  ITEM_RARITY_MAP.set(item.Item, rarity);
});

export function RawMaterialsList({ 
  favoritedItems, 
  directRecipes = [], 
  rawMaterials, 
  usedFallback = [], 
  materialUsage = {},
  hideHeatmap = false
}: RawMaterialsListProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const [heatmapExpanded, setHeatmapExpanded] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'item' | 'rarity'>('item');

  // Calculate breakdown per item
  const itemBreakdowns = useMemo(() => {
    const breakdowns: ItemBreakdown[] = [];

    for (const itemName of favoritedItems) {
      const recipe = RECIPES[itemName];
      if (!recipe) {
        continue;
      }

      const { ingredients, output } = getRecipeData(recipe);
      if (ingredients.length === 0) {
        continue;
      }

      // For favorited items, we assume we need 1 unit
      const quantityNeeded = 1;
      const craftsNeeded = Math.ceil(quantityNeeded / output);

      const recipeWithRaw: ItemBreakdown['recipe'] = ingredients.map(({ material, quantity }) => {
        const totalQty = quantity * craftsNeeded;
        const rawMaterials = resolveMaterialToRaw(material, totalQty);
        return { material, quantity: totalQty, rawMaterials };
      });

      breakdowns.push({
        itemName,
        recipe: recipeWithRaw,
      });
    }

    return breakdowns;
  }, [favoritedItems]);

  // Group all materials by rarity for rarity box view
  const materialsByRarity = useMemo(() => {
    // Combine all materials
    const allMaterials = new Map<string, number>();
    directRecipes.forEach(m => {
      allMaterials.set(m.name, (allMaterials.get(m.name) || 0) + m.quantity);
    });
    rawMaterials.forEach(m => {
      allMaterials.set(m.name, (allMaterials.get(m.name) || 0) + m.quantity);
    });

    // Group by rarity
    const byRarity: Record<string, Array<{ name: string; quantity: number }>> = {
      legendary: [],
      epic: [],
      rare: [],
      uncommon: [],
      common: [],
    };

    allMaterials.forEach((quantity, name) => {
      const rarity = ITEM_RARITY_MAP.get(name) || 'common';
      byRarity[rarity].push({ name, quantity });
    });

    // Sort each rarity group alphabetically
    Object.keys(byRarity).forEach(rarity => {
      byRarity[rarity].sort((a, b) => a.name.localeCompare(b.name));
    });

    // Return in rarity order (highest to lowest)
    return [
      { rarity: 'legendary', materials: byRarity.legendary },
      { rarity: 'epic', materials: byRarity.epic },
      { rarity: 'rare', materials: byRarity.rare },
      { rarity: 'uncommon', materials: byRarity.uncommon },
      { rarity: 'common', materials: byRarity.common },
    ].filter(group => group.materials.length > 0);
  }, [directRecipes, rawMaterials]);

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
    },
    sectionTitle: {
      color: colors.text,
    },
    sectionSubtitle: {
      color: colors.textSecondary,
    },
    itemCard: {
      backgroundColor: colors.background,
      borderColor: colors.border || colors.textSecondary + '30',
    },
    itemName: {
      color: colors.text,
    },
    recipeItemRow: {
      backgroundColor: colors.surface,
      borderLeftColor: colors.primary,
    },
    recipeItemName: {
      color: colors.text,
    },
    rawMaterialText: {
      color: colors.textSecondary,
    },
    materialQuantity: {
      color: colors.primary,
    },
    emptyText: {
      color: colors.textSecondary,
    },
    fallbackWarning: {
      backgroundColor: colors.error + '20',
      borderLeftColor: colors.error,
    },
    fallbackText: {
      color: colors.error,
    },
  });

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Materials to Keep</Text>
          <View style={styles.viewToggleContainer}>
            <TouchableOpacity
              onPress={() => setViewMode('item')}
              style={[
                styles.viewToggleButton,
                viewMode === 'item' && { backgroundColor: colors.primary + '30' },
              ]}
            >
              <Ionicons 
                name="list" 
                size={14} 
                color={viewMode === 'item' ? colors.primary : colors.textSecondary} 
              />
              <Text style={[
                styles.viewToggleText,
                { color: viewMode === 'item' ? colors.primary : colors.textSecondary }
              ]}>
                Items
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode('rarity')}
              style={[
                styles.viewToggleButton,
                viewMode === 'rarity' && { backgroundColor: colors.primary + '30' },
              ]}
            >
              <Ionicons 
                name="grid" 
                size={14} 
                color={viewMode === 'rarity' ? colors.primary : colors.textSecondary} 
              />
              <Text style={[
                styles.viewToggleText,
                { color: viewMode === 'rarity' ? colors.primary : colors.textSecondary }
              ]}>
                Rarity
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {usedFallback.length > 0 && (
        <View style={[styles.fallbackWarning, dynamicStyles.fallbackWarning]}>
          <View style={styles.fallbackContent}>
            <Ionicons name="warning-outline" size={16} color={colors.error} />
            <Text style={[styles.fallbackText, dynamicStyles.fallbackText]}>
              Some items used local recipe data (server unavailable or item not found)
            </Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.list}>
        {viewMode === 'item' ? (
          itemBreakdowns.length === 0 ? (
            <Text style={[styles.emptyText, dynamicStyles.emptyText]}>No materials needed</Text>
          ) : (
            <View style={isDesktop ? styles.itemsGrid : undefined}>
              {itemBreakdowns.map((breakdown, itemIndex) => {
              const itemImgSrc = getItemImageSource(breakdown.itemName, slug(breakdown.itemName));
              return (
                <View key={`item-${itemIndex}`} style={[styles.itemCard, dynamicStyles.itemCard, isDesktop && styles.itemCardDesktop]}>
                  {/* Item Header */}
                  <View style={styles.itemHeader}>
                    {itemImgSrc && (
                      <Image source={itemImgSrc} style={styles.itemImage} />
                    )}
                    <Text style={[styles.itemName, dynamicStyles.itemName]}>{breakdown.itemName}</Text>
                    <Text style={[styles.itemSeparator, { color: colors.textSecondary }]}>:</Text>
                  </View>

                  {/* Recipe Items */}
                  {breakdown.recipe.map((recipeItem, recipeIndex) => {
                    const recipeImgSrc = getMaterialImageSource(recipeItem.material);
                    const craftable = isCraftable(recipeItem.material);
                    const rawMaterialsText = recipeItem.rawMaterials
                      .map(rm => `${rm.name} ×${rm.quantity}`)
                      .join(', ');

                    return (
                      <View key={`recipe-${recipeIndex}`} style={styles.recipeItemContainer}>
                        {/* Recipe Item Row */}
                        <View style={[styles.recipeItemRow, dynamicStyles.recipeItemRow]}>
                          {recipeImgSrc && (
                            <Image source={recipeImgSrc} style={styles.recipeItemImage} />
                          )}
                          <View style={styles.recipeItemContent}>
                            <View style={styles.recipeItemNameRow}>
                              <Text style={[styles.recipeItemName, dynamicStyles.recipeItemName]}>
                                {recipeItem.material}
                              </Text>
                              {craftable && (
                                <View style={[styles.craftableBadge, { backgroundColor: colors.primary + '30' }]}>
                                  <Ionicons name="hammer" size={10} color={colors.primary} />
                                  <Text style={[styles.craftableText, { color: colors.primary }]}>Craft</Text>
                                </View>
                              )}
                            </View>
                            {/* Raw Materials Text Below */}
                            {rawMaterialsText && (
                              <Text style={[styles.rawMaterialText, dynamicStyles.rawMaterialText]}>
                                {rawMaterialsText}
                              </Text>
                            )}
                          </View>
                          <Text style={[styles.materialQuantity, dynamicStyles.materialQuantity]}>
                            ×{recipeItem.quantity}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
              })}
            </View>
          )
        ) : (
          materialsByRarity.length === 0 ? (
            <Text style={[styles.emptyText, dynamicStyles.emptyText]}>No materials needed</Text>
          ) : (
            materialsByRarity.map(({ rarity, materials }) => (
              <View key={rarity} style={styles.rarityGroup}>
                <Text style={[styles.rarityGroupTitle, { color: WEAPON_RARITY_COLORS[rarity] || colors.primary }]}>
                  {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                </Text>
                <View style={styles.rarityGrid}>
                  {materials.map(({ name, quantity }) => {
                    const imgSrc = getMaterialImageSource(name);
                    return (
                      <View key={name} style={[styles.rarityBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                        {imgSrc && (
                          <Image source={imgSrc} style={styles.rarityBoxImage} resizeMode="contain" />
                        )}
                        <Text style={[styles.rarityBoxName, { color: colors.text }]} numberOfLines={2}>
                          {name}
                        </Text>
                        <Text style={[styles.rarityBoxQuantity, { color: colors.primary }]}>
                          ×{quantity}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>

      {/* Material Utility Heatmap */}
      {!hideHeatmap && materialUsage && Object.keys(materialUsage).length > 0 && (
        <View style={styles.heatmapContainer}>
          <TouchableOpacity 
            onPress={() => setHeatmapExpanded(!heatmapExpanded)}
            style={[styles.heatmapHeader, { backgroundColor: colors.background }]}
          >
            <Text style={[styles.heatmapHeaderText, { color: colors.text }]}>
              Material Utility Heatmap
            </Text>
            <View style={[styles.expandButton, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons 
                name={heatmapExpanded ? 'chevron-up' : 'chevron-down'} 
                size={16} 
                color={colors.primary} 
              />
            </View>
          </TouchableOpacity>
          {heatmapExpanded && (
            <MaterialHeatmap
              directRecipes={directRecipes}
              rawMaterials={rawMaterials}
              materialUsage={materialUsage}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingLeft: 12,
    paddingTop: 12,
    paddingBottom: 12,
    paddingRight: 8,
  },
  header: {
    marginBottom: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewToggleContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  viewToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  viewToggleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  rarityGroup: {
    marginBottom: 20,
  },
  rarityGroupTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  rarityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  rarityBox: {
    width: 80,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rarityBoxImage: {
    width: 48,
    height: 48,
    marginBottom: 6,
  },
  rarityBoxName: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 4,
    minHeight: 28,
  },
  rarityBoxQuantity: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  heatmapContainer: {
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  heatmapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  heatmapHeaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  expandButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  itemCardDesktop: {
    width: '32%',
    minWidth: 280,
    maxWidth: 350,
    padding: 10,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  itemImage: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  itemSeparator: {
    fontSize: 16,
    fontWeight: '600',
  },
  recipeItemContainer: {
    marginBottom: 6,
  },
  recipeItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    marginLeft: 8,
  },
  recipeItemImage: {
    width: 28,
    height: 28,
    marginRight: 10,
    borderRadius: 4,
  },
  recipeItemContent: {
    flex: 1,
    minWidth: 0,
  },
  recipeItemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
    flexWrap: 'wrap',
  },
  recipeItemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  rawMaterialText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
    lineHeight: 14,
  },
  craftableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  craftableText: {
    fontSize: 9,
    fontWeight: '600',
  },
  materialQuantity: {
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 6,
    minWidth: 45,
    textAlign: 'right',
    flexShrink: 0,
  },
  fallbackWarning: {
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  fallbackContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fallbackText: {
    fontSize: 12,
    flex: 1,
  },
  list: {
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
});
