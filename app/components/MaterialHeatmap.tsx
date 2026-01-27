import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../_contexts/ThemeContext';
import { Material } from '../_services/api';
import { getMaterialImageSource } from '../_utils/itemImages';

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

function slug(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

// Create a map of item name to rarity
const ITEM_RARITY_MAP = new Map<string, string>();
BACKPACK_ITEMS_RAW.forEach(item => {
  const rarity = ((item.Rarity || 'Common') as string).toLowerCase();
  ITEM_RARITY_MAP.set(item.Item, rarity);
});

interface MaterialHeatmapProps {
  directRecipes: Material[];
  rawMaterials: Material[];
  materialUsage: Record<string, string[]>; // material name → array of item names using it
}

interface MaterialWithUtility extends Material {
  utility: number; // Number of different items using this material
}

/**
 * Interpolate color from red (low) → yellow (medium) → green (high)
 * @param ratio Value between 0 and 1
 * @returns Hex color string
 */
function getUtilityColor(ratio: number): string {
  // Clamp ratio between 0 and 1
  const clamped = Math.max(0, Math.min(1, ratio));

  // Red (#ef4444 = 239, 68, 68) to Yellow (#eab308 = 234, 179, 8) (0 to 0.5)
  if (clamped <= 0.5) {
    const t = clamped * 2; // 0 to 1
    const r = Math.round(239 + (234 - 239) * t); // 239 (red) to 234 (yellow)
    const g = Math.round(68 + (179 - 68) * t); // 68 (red) to 179 (yellow)
    const b = Math.round(68 + (8 - 68) * t); // 68 (red) to 8 (yellow)
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  // Yellow (#eab308 = 234, 179, 8) to Green (#22c55e = 34, 197, 94) (0.5 to 1)
  const t = (clamped - 0.5) * 2; // 0 to 1
  const r = Math.round(234 + (34 - 234) * t); // 234 (yellow) to 34 (green)
  const g = Math.round(179 + (197 - 179) * t); // 179 (yellow) to 197 (green)
  const b = Math.round(8 + (94 - 8) * t); // 8 (yellow) to 94 (green)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function MaterialHeatmap({ directRecipes, rawMaterials, materialUsage }: MaterialHeatmapProps) {
  const { colors } = useTheme();
  const [viewMode, setViewMode] = useState<'heatmap' | 'rarity'>('heatmap');

  // Combine all materials and calculate utility
  const materialsWithUtility = useMemo(() => {
    const allMaterials = new Map<string, MaterialWithUtility>();

    // Add direct recipes
    directRecipes.forEach(material => {
      const usageCount = materialUsage[material.name]?.length || 0;
      allMaterials.set(material.name, {
        ...material,
        utility: usageCount,
      });
    });

    // Add raw materials (may override if already exists, but that's fine)
    rawMaterials.forEach(material => {
      const usageCount = materialUsage[material.name]?.length || 0;
      allMaterials.set(material.name, {
        ...material,
        utility: usageCount,
      });
    });

    return Array.from(allMaterials.values());
  }, [directRecipes, rawMaterials, materialUsage]);

  // Sort by utility (descending) and calculate color scale
  const sortedMaterialsByUtility = useMemo(() => {
    const sorted = [...materialsWithUtility].sort((a, b) => b.utility - a.utility);
    
    if (sorted.length === 0) return [];

    // Find min and max utility for normalization
    const minUtility = Math.min(...sorted.map(m => m.utility));
    const maxUtility = Math.max(...sorted.map(m => m.utility));
    const range = maxUtility - minUtility;

    // Normalize and assign colors
    return sorted.map(material => {
      const normalized = range > 0 
        ? (material.utility - minUtility) / range 
        : 0.5; // If all have same utility, use middle color
      return {
        ...material,
        color: getUtilityColor(normalized),
      };
    });
  }, [materialsWithUtility]);

  // Sort by rarity (descending)
  const sortedMaterialsByRarity = useMemo(() => {
    return [...materialsWithUtility]
      .map(material => {
        const rarity = ITEM_RARITY_MAP.get(material.name) || 'common';
        const rarityOrder = RARITY_ORDER[rarity] || 0;
        const rarityColor = WEAPON_RARITY_COLORS[rarity] || WEAPON_RARITY_COLORS.common;
        return {
          ...material,
          rarity,
          rarityOrder,
          rarityColor,
        };
      })
      .sort((a, b) => {
        // First sort by rarity (descending)
        if (b.rarityOrder !== a.rarityOrder) {
          return b.rarityOrder - a.rarityOrder;
        }
        // Then by name for same rarity
        return a.name.localeCompare(b.name);
      });
  }, [materialsWithUtility]);

  const sortedMaterials = viewMode === 'heatmap' ? sortedMaterialsByUtility : sortedMaterialsByRarity;

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
    materialName: {
      color: '#fff',
    },
    materialQuantity: {
      color: '#fff',
    },
    utilityBadge: {
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    utilityText: {
      color: '#fff',
    },
  });

  if (sortedMaterials.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Material Utility</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              onPress={() => setViewMode('heatmap')}
              style={[
                styles.toggleButton,
                viewMode === 'heatmap' && { backgroundColor: colors.primary + '30' },
              ]}
            >
              <Ionicons 
                name="color-filter" 
                size={14} 
                color={viewMode === 'heatmap' ? colors.primary : colors.textSecondary} 
              />
              <Text style={[
                styles.toggleText,
                { color: viewMode === 'heatmap' ? colors.primary : colors.textSecondary }
              ]}>
                Heatmap
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode('rarity')}
              style={[
                styles.toggleButton,
                viewMode === 'rarity' && { backgroundColor: colors.primary + '30' },
              ]}
            >
              <Ionicons 
                name="star" 
                size={14} 
                color={viewMode === 'rarity' ? colors.primary : colors.textSecondary} 
              />
              <Text style={[
                styles.toggleText,
                { color: viewMode === 'rarity' ? colors.primary : colors.textSecondary }
              ]}>
                Rarity
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={styles.list}>
        {sortedMaterials.map((material, index) => {
          const imgSrc = getMaterialImageSource(material.name);
          const backgroundColor = viewMode === 'heatmap' 
            ? (material as any).color 
            : (material as any).rarityColor || colors.background;
          const isRarityView = viewMode === 'rarity';
          const rarity = isRarityView ? (material as any).rarity : null;
          
          return (
            <View
              key={`${viewMode}-${index}`}
              style={[
                styles.materialRow,
                { backgroundColor },
                isRarityView && { borderLeftWidth: 3, borderLeftColor: backgroundColor },
              ]}
            >
              {imgSrc && (
                <Image source={imgSrc} style={styles.materialImage} />
              )}
              <View style={styles.materialInfo}>
                <Text style={[
                  styles.materialName, 
                  dynamicStyles.materialName,
                  isRarityView && { color: colors.text }
                ]}>
                  {material.name}
                </Text>
                <View style={[
                  styles.utilityBadge, 
                  dynamicStyles.utilityBadge,
                  isRarityView && { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
                ]}>
                  {viewMode === 'heatmap' ? (
                    <Text style={[styles.utilityText, dynamicStyles.utilityText]}>
                      Used by {material.utility} item{material.utility !== 1 ? 's' : ''}
                    </Text>
                  ) : (
                    <Text style={[
                      styles.utilityText, 
                      { color: '#fff', fontWeight: '600' }
                    ]}>
                      {rarity ? rarity.charAt(0).toUpperCase() + rarity.slice(1) : 'Common'}
                    </Text>
                  )}
                </View>
              </View>
              <Text style={[
                styles.materialQuantity, 
                dynamicStyles.materialQuantity,
                isRarityView && { color: colors.text }
              ]}>
                ×{material.quantity}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
  },
  header: {
    marginBottom: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  list: {
    flex: 1,
  },
  materialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    marginBottom: 6,
    borderRadius: 6,
  },
  materialImage: {
    width: 32,
    height: 32,
    marginRight: 12,
    borderRadius: 4,
  },
  materialInfo: {
    flex: 1,
  },
  materialName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  utilityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  utilityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  materialQuantity: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
