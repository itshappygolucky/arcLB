import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { DarkModeToggle } from '../lib/components/DarkModeToggle';
import { ItemSelector } from '../lib/components/ItemSelector';
import { StashOptimizer as StashOptimizerComponent } from '../lib/components/StashOptimizer';
import { useTheme } from '../lib/contexts/ThemeContext';
import { api, LoadoutCalculation } from '../lib/services/api';
import { getItemImageSource } from '../lib/utils/itemImages';
import { aggregateMaterialStacks, analyzeMultipleItems, getSuggestedStacksForItem, ItemStashAnalysis } from '../lib/utils/stashAnalysis';
import { storage } from '../lib/utils/storage';
import { getLevelFromWeaponItemName, getWeaponIdFromItemName, getWeaponIngredientsForLevel, isLeveledWeapon } from '../lib/utils/weaponRecipes';

function slug(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

type Phase = 'select_items' | 'analysis' | 'results';

export default function StashOptimizer() {
  const { colors } = useTheme();
  const [phase, setPhase] = useState<Phase>('select_items');
  const [targetItems, setTargetItems] = useState<string[]>([]);
  const [stashLimit, setStashLimit] = useState<number>(280);
  const [optimization, setOptimization] = useState<LoadoutCalculation['optimization'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<ItemStashAnalysis[]>([]);
  const [expandedAnalyses, setExpandedAnalyses] = useState<Record<string, boolean>>({});
  const [selectorExpanded, setSelectorExpanded] = useState(false);
  const [targetQuantities, setTargetQuantities] = useState<Record<string, number>>({});
  const [targetLevels, setTargetLevels] = useState<Record<string, number>>({});
  const [higherTierSectionExpanded, setHigherTierSectionExpanded] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      const prefs = await storage.getStashPreferences();
      setTargetItems(prefs.targetItems || []);
      setTargetQuantities(prefs.targetQuantities || {});
      setTargetLevels(prefs.targetLevels || {});
      setStashLimit(prefs.stashLimit || 280);
    };
    loadPreferences();
  }, []);

  // Save preferences whenever they change
  useEffect(() => {
    const savePreferences = async () => {
      await storage.saveStashPreferences({
        targetItems,
        targetQuantities,
        targetLevels,
        stashLimit,
      });
    };
    savePreferences();
  }, [targetItems, targetQuantities, targetLevels, stashLimit]);

  // Toggle item selection
  const toggleItem = (itemName: string) => {
    setTargetItems(prev => {
      if (prev.includes(itemName)) {
        return prev.filter(i => i !== itemName);
      } else {
        return [...prev, itemName];
      }
    });
  };

  // Analyze items when moving to analysis phase
  const handleAnalyze = () => {
    if (targetItems.length === 0) {
      Alert.alert('No Items Selected', 'Please select at least one item you want to craft.');
      return;
    }
    const analyses = analyzeMultipleItems(targetItems);
    setAnalyses(analyses);
    setPhase('analysis');
  };

  // Calculate optimization
  const calculateOptimization = async () => {
    if (targetItems.length === 0) {
      Alert.alert('No Items Selected', 'Please select at least one item you want to craft.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.calculateStashOptimization(targetItems, stashLimit);
      setOptimization(result);
      setPhase('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate optimization');
      console.error('Optimization error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle expanded state for analysis
  const toggleExpanded = (itemName: string) => {
    setExpandedAnalyses(prev => ({
      ...prev,
      [itemName]: !prev[itemName],
    }));
  };

  const setQuantityForItem = (itemName: string, value: number) => {
    const n = Math.max(1, Math.min(999, Math.floor(value)));
    setTargetQuantities(prev => ({ ...prev, [itemName]: n }));
  };

  const getQuantityForItem = (itemName: string) => targetQuantities[itemName] ?? 1;

  const setLevelForItem = (itemName: string, value: number) => {
    const l = Math.max(1, Math.min(4, Math.floor(value)));
    setTargetLevels(prev => ({ ...prev, [itemName]: l }));
  };

  const getLevelForItem = (itemName: string) =>
    targetLevels[itemName] ?? (isLeveledWeapon(itemName) ? getLevelFromWeaponItemName(itemName) : 1);

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 12,
      paddingTop: 50,
      paddingBottom: 12,
      backgroundColor: colors.header,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      gap: 8,
    },
    headerText: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.headerText,
      marginBottom: 2,
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.headerText,
      opacity: 0.9,
    },
    content: {
      flex: 1,
    },
    section: {
      marginTop: 12,
      marginHorizontal: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    selectedItemsContainer: {
      marginBottom: 16,
    },
    selectedItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      marginBottom: 8,
      borderRadius: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    selectedItemImage: {
      width: 32,
      height: 32,
      marginRight: 10,
      borderRadius: 4,
    },
    selectedItemName: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    button: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: colors.primary,
      alignItems: 'center',
      marginTop: 16,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    buttonSecondary: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonSecondaryText: {
      color: colors.text,
    },
    stashLimitInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      backgroundColor: colors.background,
      color: colors.text,
      marginTop: 8,
      width: 120,
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
      marginTop: 8,
    },
    loadingText: {
      color: colors.textSecondary,
      fontSize: 14,
      marginTop: 8,
    },
    emptyState: {
      alignItems: 'center',
      padding: 32,
    },
    emptyStateText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 12,
      textAlign: 'center',
    },
    analysisCard: {
      marginBottom: 16,
      padding: 12,
      backgroundColor: colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    analysisHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    analysisItemName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    analysisDetail: {
      marginTop: 8,
      paddingLeft: 8,
    },
    analysisDetailLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 8,
    },
    analysisDetailValue: {
      fontSize: 13,
      color: colors.text,
      marginTop: 4,
    },
    analysisRecipe: {
      fontSize: 13,
      color: colors.text,
      marginTop: 4,
    },
    recommendationBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      marginTop: 8,
    },
    recommendationBadgeKeepCrafted: {
      backgroundColor: colors.primary + '20',
    },
    recommendationBadgeKeepMaterials: {
      backgroundColor: '#4CAF50' + '20',
    },
    recommendationBadgeKeepRecycle: {
      backgroundColor: '#FF9500' + '20',
    },
    recommendationText: {
      fontSize: 13,
      fontWeight: '600',
      marginTop: 4,
    },
    recommendationTextKeepCrafted: {
      color: colors.primary,
    },
    recommendationTextKeepMaterials: {
      color: '#4CAF50',
    },
    recommendationTextKeepRecycle: {
      color: '#FF9500',
    },
    multiUseBadge: {
      backgroundColor: colors.primary + '15',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginLeft: 4,
    },
    multiUseText: {
      fontSize: 11,
      color: colors.primary,
      fontWeight: '600',
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <View style={dynamicStyles.headerText}>
          <Text style={dynamicStyles.headerTitle}>Stash Optimizer</Text>
          <Text style={dynamicStyles.headerSubtitle}>
            Select items you want to craft, then see what to keep in your stash
          </Text>
        </View>
        <DarkModeToggle />
      </View>

      <ScrollView style={dynamicStyles.content} contentContainerStyle={{ paddingBottom: 20 }}>
        {phase === 'select_items' && (
          <>
            <View style={dynamicStyles.section}>
              <Text style={dynamicStyles.sectionTitle}>Select Items to Craft</Text>
              <Text style={{ color: colors.textSecondary, marginBottom: 12, fontSize: 14 }}>
                Choose items you want to be able to craft. We'll analyze whether to keep the crafted items or their materials.
              </Text>

              {targetItems.length > 0 && (
                <View style={dynamicStyles.selectedItemsContainer}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                    Selected Items ({targetItems.length}):
                  </Text>
                  {targetItems.map(item => {
                    const imgSrc = getItemImageSource(item, slug(item));
                    return (
                      <View key={item} style={dynamicStyles.selectedItemRow}>
                        {imgSrc && (
                          <Image source={imgSrc} style={dynamicStyles.selectedItemImage} />
                        )}
                        <Text style={dynamicStyles.selectedItemName}>{item}</Text>
                        <TouchableOpacity onPress={() => toggleItem(item)}>
                          <Ionicons name="close-circle" size={20} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}

              <TouchableOpacity
                onPress={() => setSelectorExpanded(!selectorExpanded)}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 12,
                  backgroundColor: colors.background,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>
                  {selectorExpanded ? 'Hide' : 'Show'} Item Selector
                </Text>
                <Ionicons
                  name={selectorExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              {selectorExpanded && (
                <ItemSelector onItemSelect={toggleItem} selectedItems={targetItems} />
              )}

              {targetItems.length > 0 && (
                <TouchableOpacity
                  style={dynamicStyles.button}
                  onPress={handleAnalyze}
                >
                  <Text style={dynamicStyles.buttonText}>
                    Analyze Stash Options ({targetItems.length} items)
                  </Text>
                </TouchableOpacity>
              )}

              {targetItems.length === 0 && (
                <View style={dynamicStyles.emptyState}>
                  <Ionicons name="cube-outline" size={48} color={colors.textSecondary} />
                  <Text style={dynamicStyles.emptyStateText}>
                    Select items you want to craft to get started
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {phase === 'analysis' && (
          <>
            <View style={dynamicStyles.section}>
              <Text style={dynamicStyles.sectionTitle}>Stash Analysis</Text>
              <Text style={{ color: colors.textSecondary, marginBottom: 12, fontSize: 14 }}>
                Recommendations for each item based on stack sizes, multi-use, and recycle paths.
              </Text>

              {analyses.map(analysis => {
                const isExpanded = expandedAnalyses[analysis.itemName] ?? true;
                const imgSrc = getItemImageSource(analysis.itemName, slug(analysis.itemName));

                return (
                  <View key={analysis.itemName} style={dynamicStyles.analysisCard}>
                    <TouchableOpacity
                      style={dynamicStyles.analysisHeader}
                      onPress={() => toggleExpanded(analysis.itemName)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        {imgSrc && (
                          <Image source={imgSrc} style={{ width: 24, height: 24, marginRight: 8, borderRadius: 4 }} />
                        )}
                        <Text style={dynamicStyles.analysisItemName}>{analysis.itemName}</Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 13, color: colors.textSecondary, marginRight: 8 }}>
                        I want to craft:
                      </Text>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: colors.border,
                          borderRadius: 6,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          fontSize: 14,
                          minWidth: 48,
                          backgroundColor: colors.background,
                          color: colors.text,
                        }}
                        value={String(getQuantityForItem(analysis.itemName))}
                        onChangeText={t => setQuantityForItem(analysis.itemName, parseInt(t, 10) || 1)}
                        keyboardType="number-pad"
                        maxLength={3}
                      />
                      <Text style={{ fontSize: 13, color: colors.text, marginLeft: 6 }}>{analysis.itemName}</Text>
                      {isLeveledWeapon(analysis.itemName) && (
                        <>
                          <Text style={{ fontSize: 13, color: colors.textSecondary, marginLeft: 16, marginRight: 8 }}>
                            at level:
                          </Text>
                          <TextInput
                            style={{
                              borderWidth: 1,
                              borderColor: colors.border,
                              borderRadius: 6,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              fontSize: 14,
                              minWidth: 40,
                              backgroundColor: colors.background,
                              color: colors.text,
                            }}
                            value={String(getLevelForItem(analysis.itemName))}
                            onChangeText={t => setLevelForItem(analysis.itemName, parseInt(t, 10) || 1)}
                            keyboardType="number-pad"
                            maxLength={1}
                          />
                          <Text style={{ fontSize: 11, color: colors.textSecondary, marginLeft: 4 }}>(1–4)</Text>
                        </>
                      )}
                    </View>

                    {isExpanded && (
                      <>
                        <View style={dynamicStyles.analysisDetail}>
                          <Text style={dynamicStyles.analysisDetailLabel}>
                            Recipe{isLeveledWeapon(analysis.itemName) ? ` (level ${getLevelForItem(analysis.itemName)})` : ''}:
                          </Text>
                          <Text style={(() => {
                            const level = getLevelForItem(analysis.itemName);
                            const weaponId = getWeaponIdFromItemName(analysis.itemName);
                            const ingredients = weaponId != null && level >= 1 && level <= 4
                              ? getWeaponIngredientsForLevel(weaponId, level)
                              : analysis.recipe;
                            return ingredients.length > 0 ? dynamicStyles.analysisRecipe : { color: colors.textSecondary };
                          })()}>
                            {(() => {
                              const level = getLevelForItem(analysis.itemName);
                              const weaponId = getWeaponIdFromItemName(analysis.itemName);
                              const ingredients = weaponId != null && level >= 1 && level <= 4
                                ? getWeaponIngredientsForLevel(weaponId, level)
                                : analysis.recipe;
                              return ingredients.length > 0
                                ? ingredients.map(r => `${r.quantity}× ${r.material}`).join(', ')
                                : 'No recipe';
                            })()}
                          </Text>
                        </View>

                        {(() => {
                          const qty = getQuantityForItem(analysis.itemName);
                          const level = getLevelForItem(analysis.itemName);
                          const { materialSuggestions } = getSuggestedStacksForItem(analysis.itemName, qty, level);
                          if (materialSuggestions.length === 0) return null;
                          return (
                            <View style={dynamicStyles.analysisDetail}>
                              <Text style={dynamicStyles.analysisDetailLabel}>
                                Suggested stacks (for {qty}× {analysis.itemName}{isLeveledWeapon(analysis.itemName) ? ` at level ${level}` : ''}):
                              </Text>
                              {materialSuggestions.map(ms => (
                                <Text key={ms.material} style={dynamicStyles.analysisDetailValue}>
                                  Keep {ms.stacks} stack{ms.stacks !== 1 ? 's' : ''} of {ms.material} ({ms.totalInStacks} total, need {ms.needed})
                                </Text>
                              ))}
                            </View>
                          );
                        })()}

                        <View style={dynamicStyles.analysisDetail}>
                          <Text style={dynamicStyles.analysisDetailLabel}>Stack Comparison:</Text>
                          <Text style={dynamicStyles.analysisDetailValue}>
                            Keep {analysis.itemName}: {analysis.efficiencyKeepCrafted.toFixed(1)} items/slot (stack {analysis.itemStackSize})
                          </Text>
                          <Text style={dynamicStyles.analysisDetailValue}>
                            Keep Materials: {analysis.efficiencyKeepMaterials.toFixed(1)} items/slot
                          </Text>
                        </View>

                        {Object.values(analysis.multiUseCount).some(count => count > 0) && (
                          <View style={dynamicStyles.analysisDetail}>
                            <Text style={dynamicStyles.analysisDetailLabel}>Multi-use:</Text>
                            {Object.entries(analysis.multiUseCount)
                              .filter(([_, count]) => count > 0)
                              .map(([material, count]) => (
                                <View key={material} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                  <Text style={dynamicStyles.analysisDetailValue}>
                                    {material} used in {count + 1} craft{count + 1 > 1 ? 's' : ''}
                                  </Text>
                                </View>
                              ))}
                          </View>
                        )}

                        {analysis.recyclePathOptions.length > 0 && (
                          <View style={dynamicStyles.analysisDetail}>
                            <Text style={dynamicStyles.analysisDetailLabel}>Recycle Path Options:</Text>
                            {analysis.recyclePathOptions.map((option, idx) => (
                              <Text key={idx} style={dynamicStyles.analysisDetailValue}>
                                {option.sourceItem} (stack {option.sourceStackSize}) → {option.efficiency.toFixed(1)} items/slot
                              </Text>
                            ))}
                          </View>
                        )}

                        <View
                          style={[
                            dynamicStyles.recommendationBadge,
                            analysis.recommendation === 'keep_crafted' && dynamicStyles.recommendationBadgeKeepCrafted,
                            analysis.recommendation === 'keep_materials' && dynamicStyles.recommendationBadgeKeepMaterials,
                            analysis.recommendation === 'keep_recycle_source' && dynamicStyles.recommendationBadgeKeepRecycle,
                          ]}
                        >
                          <Text
                            style={[
                              dynamicStyles.recommendationText,
                              analysis.recommendation === 'keep_crafted' && dynamicStyles.recommendationTextKeepCrafted,
                              analysis.recommendation === 'keep_materials' && dynamicStyles.recommendationTextKeepMaterials,
                              analysis.recommendation === 'keep_recycle_source' && dynamicStyles.recommendationTextKeepRecycle,
                            ]}
                          >
                            {analysis.recommendation === 'keep_crafted' && '✓ Keep Crafted'}
                            {analysis.recommendation === 'keep_materials' && '✓ Keep Materials'}
                            {analysis.recommendation === 'keep_recycle_source' && '✓ Keep Higher-Tier Item'}
                          </Text>
                          <Text style={[dynamicStyles.analysisDetailValue, { marginTop: 4 }]}>
                            {analysis.recommendationReason}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                );
              })}

              <View style={{ marginTop: 16 }}>
                <Text style={{ color: colors.text, fontSize: 14, marginBottom: 8 }}>
                  Stash Limit:
                </Text>
                <TextInput
                  style={dynamicStyles.stashLimitInput}
                  value={stashLimit.toString()}
                  onChangeText={(text) => {
                    const num = parseInt(text, 10);
                    if (!isNaN(num) && num > 0) {
                      setStashLimit(num);
                    }
                  }}
                  keyboardType="numeric"
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity
                  style={[dynamicStyles.button, dynamicStyles.buttonSecondary, { flex: 1 }]}
                  onPress={() => setPhase('select_items')}
                >
                  <Text style={[dynamicStyles.buttonText, dynamicStyles.buttonSecondaryText]}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    dynamicStyles.button,
                    { flex: 1 },
                    loading && dynamicStyles.buttonDisabled,
                  ]}
                  onPress={calculateOptimization}
                  disabled={loading}
                >
                  <Text style={dynamicStyles.buttonText}>
                    {loading ? 'Calculating...' : `Optimize Stash (${targetItems.length} items)`}
                  </Text>
                </TouchableOpacity>
              </View>

              {error && <Text style={dynamicStyles.errorText}>{error}</Text>}
              {loading && <Text style={dynamicStyles.loadingText}>Calculating optimization...</Text>}
            </View>
          </>
        )}

        {phase === 'results' && optimization && (() => {
          const { totalStashSlots, materialStacks } = aggregateMaterialStacks(targetItems, targetQuantities, targetLevels);
          return (
            <>
              <View style={dynamicStyles.section}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={dynamicStyles.sectionTitle}>Optimization Results</Text>
                  <TouchableOpacity
                    style={[dynamicStyles.button, { paddingHorizontal: 12, paddingVertical: 8, marginTop: 0 }]}
                    onPress={() => setPhase('analysis')}
                  >
                    <Text style={dynamicStyles.buttonText}>Edit</Text>
                  </TouchableOpacity>
                </View>
                <StashOptimizerComponent 
                  optimization={optimization} 
                  totalStashSlotsUsed={totalStashSlots}
                  materialStacksToKeep={materialStacks}
                  targetItems={targetItems}
                />
              </View>

              {(() => {
              // Find all items with recycle path options that could save stash slots
              const allHigherTierOptions: Array<{
                targetItem: string;
                desiredQty: number;
                sourceItem: string;
                sourceStackSize: number;
                recyclesTo: { material: string; quantity: number } | undefined;
                material: string;
                materialStackSize: number;
                materialNeeded: number;
                materialSuggestion: { stacks: number; totalInStacks: number; needed: number } | null;
                recycleSuggestion: { stacksOfSourceNeeded: number; totalMaterialFromStacks: number } | null;
                efficiencyHigherTier: number;
                efficiencyMaterial: number;
              }> = [];

              analyses.forEach(a => {
                if (a.recyclePathOptions.length === 0) return;
                
                const desiredQty = getQuantityForItem(a.itemName);
                const desiredLevel = getLevelForItem(a.itemName);
                const { materialSuggestions, recycleSourceSuggestions } = getSuggestedStacksForItem(a.itemName, desiredQty, desiredLevel);
                
                // Check each recycle path option
                a.recyclePathOptions.forEach(option => {
                  const recipeEntry = a.recipe.find(r => option.recyclesTo.some(rt => rt.material === r.material));
                  const material = recipeEntry?.material;
                  if (!material) return;
                  
                  const qtyPerCraft = recipeEntry?.quantity ?? 1;
                  const materialStackSize = a.materialStackSizes[material] ?? 1;
                  const efficiencyMaterial = qtyPerCraft > 0 ? (materialStackSize / qtyPerCraft) : 0;
                  const materialNeeded = qtyPerCraft * desiredQty;
                  
                  const materialSuggestion = materialSuggestions.find(ms => ms.material === material) ?? null;
                  const recycleSuggestion = recycleSourceSuggestions.find(
                    rs => rs.recyclesToMaterial === material && rs.sourceItem === option.sourceItem
                  ) ?? null;
                  
                  // Include if it saves stash slots OR has better efficiency
                  const materialStacks = materialSuggestion?.stacks ?? 0;
                  const higherTierStacks = recycleSuggestion?.stacksOfSourceNeeded ?? 0;
                  const savesStashSlots = materialStacks > 0 && higherTierStacks > 0 && materialStacks > higherTierStacks;
                  const hasBetterEfficiency = option.efficiency > efficiencyMaterial;
                  
                  if (savesStashSlots || hasBetterEfficiency) {
                    allHigherTierOptions.push({
                      targetItem: a.itemName,
                      desiredQty,
                      sourceItem: option.sourceItem,
                      sourceStackSize: option.sourceStackSize,
                      recyclesTo: option.recyclesTo.find(rt => rt.material === material),
                      material,
                      materialStackSize,
                      materialNeeded,
                      materialSuggestion,
                      recycleSuggestion,
                      efficiencyHigherTier: option.efficiency,
                      efficiencyMaterial,
                    });
                  }
                });
              });

              // Group by sourceItem + material combination, aggregating all target items
              const groupedOptions = new Map<string, {
                sourceItem: string;
                sourceStackSize: number;
                recyclesTo: { material: string; quantity: number } | undefined;
                material: string;
                materialStackSize: number;
                targetItems: Array<{ targetItem: string; desiredQty: number }>;
                totalMaterialNeeded: number;
                materialSuggestion: { stacks: number; totalInStacks: number; needed: number } | null;
                recycleSuggestion: { stacksOfSourceNeeded: number; totalMaterialFromStacks: number } | null;
                efficiencyHigherTier: number;
                efficiencyMaterial: number;
              }>();

              allHigherTierOptions.forEach(opt => {
                const key = `${opt.sourceItem}|${opt.material}`;
                const existing = groupedOptions.get(key);
                
                if (existing) {
                  // Add this target item to the group
                  existing.targetItems.push({ targetItem: opt.targetItem, desiredQty: opt.desiredQty });
                  // Sum up total material needed
                  existing.totalMaterialNeeded += opt.materialNeeded;
                  // Use the best efficiency
                  if (opt.efficiencyHigherTier > existing.efficiencyHigherTier) {
                    existing.efficiencyHigherTier = opt.efficiencyHigherTier;
                  }
                } else {
                  // Create new group
                  groupedOptions.set(key, {
                    sourceItem: opt.sourceItem,
                    sourceStackSize: opt.sourceStackSize,
                    recyclesTo: opt.recyclesTo,
                    material: opt.material,
                    materialStackSize: opt.materialStackSize,
                    targetItems: [{ targetItem: opt.targetItem, desiredQty: opt.desiredQty }],
                    totalMaterialNeeded: opt.materialNeeded,
                    materialSuggestion: opt.materialSuggestion,
                    recycleSuggestion: opt.recycleSuggestion,
                    efficiencyHigherTier: opt.efficiencyHigherTier,
                    efficiencyMaterial: opt.efficiencyMaterial,
                  });
                }
              });

              // Recalculate stacks based on aggregated material needs
              const higherTierItems = Array.from(groupedOptions.values()).map(group => {
                // Recalculate material suggestion based on total material needed
                const materialStackSize = group.materialStackSize;
                const materialStacks = Math.max(1, Math.ceil(group.totalMaterialNeeded / materialStackSize));
                const materialTotalInStacks = materialStacks * materialStackSize;
                
                // Recalculate recycle suggestion based on total material needed
                const recyclesToQty = group.recyclesTo?.quantity ?? 1;
                const sourceStackSize = group.sourceStackSize;
                const unitsOfSourceNeeded = Math.ceil(group.totalMaterialNeeded / recyclesToQty);
                const stacksOfSourceNeeded = Math.max(1, Math.ceil(unitsOfSourceNeeded / sourceStackSize));
                const totalMaterialFromStacks = stacksOfSourceNeeded * sourceStackSize * recyclesToQty;
                
                return {
                  ...group,
                  materialSuggestion: {
                    stacks: materialStacks,
                    totalInStacks: materialTotalInStacks,
                    needed: group.totalMaterialNeeded,
                  },
                  recycleSuggestion: {
                    stacksOfSourceNeeded: stacksOfSourceNeeded,
                    totalMaterialFromStacks: totalMaterialFromStacks,
                  },
                  materialNeeded: group.totalMaterialNeeded,
                };
              })
              .sort((a, b) => {
                const ratioA = a.efficiencyMaterial > 0 ? a.efficiencyHigherTier / a.efficiencyMaterial : 0;
                const ratioB = b.efficiencyMaterial > 0 ? b.efficiencyHigherTier / b.efficiencyMaterial : 0;
                return ratioB - ratioA; // higher efficiency ratio first
              });

              if (higherTierItems.length === 0) return null;

              return (
                <View style={[dynamicStyles.section, { marginTop: 8 }]}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 4,
                    }}
                    onPress={() => setHigherTierSectionExpanded(prev => !prev)}
                    activeOpacity={0.7}
                  >
                    <Text style={dynamicStyles.sectionTitle}>Why Keep Higher-Tier Items?</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginRight: 6 }}>
                        {higherTierItems.length} item{higherTierItems.length !== 1 ? 's' : ''}
                      </Text>
                      <Ionicons
                        name={higherTierSectionExpanded ? 'chevron-up' : 'chevron-down'}
                        size={22}
                        color={colors.textSecondary}
                      />
                    </View>
                  </TouchableOpacity>

                  {higherTierSectionExpanded && (
                    <>
                      <Text style={{ color: colors.textSecondary, marginBottom: 16, fontSize: 14 }}>
                        These items use stash space more efficiently than keeping the crafting material. Recycle when you need the material.
                      </Text>
                      {higherTierItems.map((item, idx) => {
                        const sourceImg = getItemImageSource(item.sourceItem, slug(item.sourceItem));
                        const materialImg = getItemImageSource(item.material, slug(item.material));
                        const isBetter = item.efficiencyHigherTier > item.efficiencyMaterial;
                        
                        // Calculate stash slot savings
                        const materialStacksNeeded = item.materialSuggestion?.stacks ?? 0;
                        const higherTierStacksNeeded = item.recycleSuggestion?.stacksOfSourceNeeded ?? 0;
                        const stashSlotSavings = materialStacksNeeded > 0 && higherTierStacksNeeded > 0 
                          ? materialStacksNeeded - higherTierStacksNeeded 
                          : 0;
                        const hasStashSavings = stashSlotSavings > 0;
                        
                        return (
                          <View
                            key={`${item.sourceItem}-${item.material}-${idx}`}
                            style={[
                              dynamicStyles.analysisCard,
                              { marginBottom: 16, padding: 16 },
                            ]}
                          >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                              <View style={{ flex: 1, minWidth: 200 }}>
                                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>
                                  For crafting{' '}
                                  {item.targetItems.map((ti, tiIdx) => (
                                    <Text key={tiIdx}>
                                      {ti.desiredQty}× {ti.targetItem}
                                      {tiIdx < item.targetItems.length - 1 ? ' and ' : ''}
                                    </Text>
                                  ))}:
                                </Text>
                                {item.efficiencyMaterial > 0 && (
                                  <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600', marginTop: 4 }}>
                                    Efficiency: {(item.efficiencyHigherTier / item.efficiencyMaterial).toFixed(1)}x better ({item.efficiencyHigherTier.toFixed(1)} vs {item.efficiencyMaterial.toFixed(1)} items/slot)
                                  </Text>
                                )}
                              </View>
                              {hasStashSavings && (
                                <View style={{ 
                                  backgroundColor: '#4CAF50', 
                                  paddingHorizontal: 10, 
                                  paddingVertical: 4, 
                                  borderRadius: 12,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  marginTop: 4,
                                }}>
                                  <Ionicons name="save" size={14} color="white" style={{ marginRight: 4 }} />
                                  <Text style={{ fontSize: 12, fontWeight: '700', color: 'white' }}>
                                    Saves {stashSlotSavings} stash slot{stashSlotSavings !== 1 ? 's' : ''}
                                  </Text>
                                </View>
                              )}
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                              <View style={{ alignItems: 'center', flex: 1, minWidth: 120 }}>
                                {sourceImg && (
                                  <Image source={sourceImg} style={{ width: 48, height: 48, borderRadius: 8, marginBottom: 6 }} />
                                )}
                                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'center' }} numberOfLines={2}>
                                  {item.sourceItem}
                                </Text>
                                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                                  Stack: {item.sourceStackSize}
                                </Text>
                                {item.recyclesTo && (
                                  <Text style={{ fontSize: 11, color: colors.primary, marginTop: 4, fontWeight: '600' }}>
                                    Recycles to {item.recyclesTo.quantity}× {item.recyclesTo.material}
                                  </Text>
                                )}
                                {item.recycleSuggestion && (
                                  <View style={{ marginTop: 6, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 12, color: '#4CAF50', fontWeight: '600' }}>
                                      Keep {item.recycleSuggestion.stacksOfSourceNeeded} stack{item.recycleSuggestion.stacksOfSourceNeeded !== 1 ? 's' : ''}
                                    </Text>
                                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                                      ({item.recycleSuggestion.totalMaterialFromStacks} total, need {item.materialNeeded})
                                    </Text>
                                    <Text style={{ fontSize: 11, color: '#4CAF50', marginTop: 2, fontWeight: '600' }}>
                                      = {item.recycleSuggestion.stacksOfSourceNeeded} stash slot{item.recycleSuggestion.stacksOfSourceNeeded !== 1 ? 's' : ''}
                                    </Text>
                                  </View>
                                )}
                                <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                  <Text style={{ fontSize: 14, fontWeight: '700', color: isBetter ? '#4CAF50' : colors.text }}>
                                    {item.efficiencyHigherTier.toFixed(1)} items/slot
                                  </Text>
                                  {isBetter && (
                                    <Ionicons name="checkmark-circle" size={18} color="#4CAF50" style={{ marginLeft: 4 }} />
                                  )}
                                </View>
                              </View>
                              <View style={{ alignItems: 'center', paddingHorizontal: 12 }}>
                                <Ionicons name="arrow-forward" size={24} color={colors.textSecondary} />
                                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>vs</Text>
                              </View>
                              <View style={{ alignItems: 'center', flex: 1, minWidth: 120 }}>
                                {materialImg && (
                                  <Image source={materialImg} style={{ width: 48, height: 48, borderRadius: 8, marginBottom: 6 }} />
                                )}
                                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'center' }} numberOfLines={2}>
                                  {item.material}
                                </Text>
                                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                                  Stack: {item.materialStackSize}
                                </Text>
                                {item.materialSuggestion && (
                                  <View style={{ marginTop: 6, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                      Keep {item.materialSuggestion.stacks} stack{item.materialSuggestion.stacks !== 1 ? 's' : ''}
                                    </Text>
                                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                                      ({item.materialSuggestion.totalInStacks} total, need {item.materialSuggestion.needed})
                                    </Text>
                                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, fontWeight: '600' }}>
                                      = {item.materialSuggestion.stacks} stash slot{item.materialSuggestion.stacks !== 1 ? 's' : ''}
                                    </Text>
                                  </View>
                                )}
                                <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                  <Text style={{ fontSize: 14, fontWeight: '700', color: !isBetter ? '#4CAF50' : colors.text }}>
                                    {item.efficiencyMaterial.toFixed(1)} items/slot
                                  </Text>
                                  {!isBetter && (
                                    <Ionicons name="checkmark-circle" size={18} color="#4CAF50" style={{ marginLeft: 4 }} />
                                  )}
                                </View>
                              </View>
                            </View>
                            <View
                              style={{
                                marginTop: 12,
                                paddingTop: 12,
                                borderTopWidth: 1,
                                borderTopColor: colors.border,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Ionicons name="information-circle" size={16} color={colors.primary} style={{ marginRight: 4 }} />
                              <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }}>
                                {hasStashSavings 
                                  ? `Keeping ${item.recycleSuggestion?.stacksOfSourceNeeded ?? 0} stack${(item.recycleSuggestion?.stacksOfSourceNeeded ?? 0) !== 1 ? 's' : ''} of ${item.sourceItem} instead of ${item.materialSuggestion?.stacks ?? 0} stack${(item.materialSuggestion?.stacks ?? 0) !== 1 ? 's' : ''} of ${item.material} saves ${stashSlotSavings} stash slot${stashSlotSavings !== 1 ? 's' : ''} for crafting ${item.targetItems.map(ti => `${ti.desiredQty}× ${ti.targetItem}`).join(' and ')}. Recycle when you need the material.`
                                  : `Keeping ${item.sourceItem} saves space: 1 slot gives you more craft potential than 1 slot of ${item.material} for crafting ${item.targetItems.map(ti => `${ti.desiredQty}× ${ti.targetItem}`).join(' and ')}.`
                                }
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </>
                  )}
                </View>
              );
              })()}
            </>
          );
        })()}
      </ScrollView>
    </View>
  );
}
