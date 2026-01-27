import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../_contexts/ThemeContext';
import { getItemImageSource } from '../_utils/itemImages';

interface ItemSelectorProps {
  onItemSelect: (itemName: string) => void;
  selectedItems: string[];
}

// Load data files
const BACKPACK_ITEMS_RAW: { Item: string; Rarity?: string; Category?: string; 'Stack Size'?: number }[] = require('../../data/backpack-items.json');
const RECIPES_RAW = require('../../data/recipes.json');

// Normalize recipes to handle both old format (array) and new format (object with output and ingredients)
type RecipeFormat = 
  | { material: string; quantity: number }[] // Old format
  | { output?: number; ingredients: { material: string; quantity: number }[] }; // New format

const RECIPES: Record<string, RecipeFormat> = RECIPES_RAW;

// Helper to check if item is craftable
function isCraftable(itemName: string): boolean {
  const recipe = RECIPES[itemName];
  if (!recipe) return false;
  if (Array.isArray(recipe)) {
    return recipe.length > 0;
  } else {
    return (recipe.ingredients || []).length > 0;
  }
}

interface BackpackItemDef {
  id: string;
  name: string;
  category: string;
  rarity: string;
  rarityColor: string;
  stackSize: number;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

const WEAPON_RARITY_COLORS: Record<string, string> = {
  legendary: '#FFD700',
  epic: '#E040FB',
  rare: '#2196F3',
  uncommon: '#4CAF50',
  common: '#9E9E9E',
};

// Process backpack items (same as loadout builder)
const BACKPACK_ITEMS: BackpackItemDef[] = BACKPACK_ITEMS_RAW.map((o) => {
  const r = ((o.Rarity || 'Common') as string).toLowerCase();
  const rawStack = (o as Record<string, unknown>)['Stack Size'];
  const stackSize = Math.max(1, Math.floor(Number(rawStack)) || 1);
  return {
    id: slug(o.Item),
    name: o.Item,
    category: o.Category || '',
    rarity: r,
    rarityColor: (WEAPON_RARITY_COLORS as Record<string, string>)[r] ?? WEAPON_RARITY_COLORS.common,
    stackSize,
  };
});


// Filter to only items that have recipes
const CRAFTABLE_ITEMS = BACKPACK_ITEMS.filter(item => isCraftable(item.name));

export function ItemSelector({ onItemSelect, selectedItems }: ItemSelectorProps) {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  // Get unique categories from craftable items
  const categories = useMemo(() => {
    const cats = new Set<string>();
    CRAFTABLE_ITEMS.forEach(item => {
      if (item.category) cats.add(item.category);
    });
    return ['All', ...Array.from(cats).sort()];
  }, []);

  // Filter items
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return CRAFTABLE_ITEMS.filter((item) => {
      if (q && !item.name.toLowerCase().includes(q)) return false;
      if (filterCategory === 'All') return true;
      return item.category === filterCategory;
    });
  }, [searchQuery, filterCategory]);

  const handleItemPress = (item: BackpackItemDef) => {
    onItemSelect(item.name);
  };

  const isFavorited = (itemName: string) => selectedItems.includes(itemName);

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
    },
    title: {
      color: colors.text,
    },
    searchInput: {
      borderColor: colors.border,
      backgroundColor: colors.background,
      color: colors.text,
    },
    filterButton: {
      backgroundColor: colors.background,
    },
    filterButtonActive: {
      backgroundColor: colors.primary,
    },
    filterText: {
      color: colors.textSecondary,
    },
    filterTextActive: {
      color: '#fff',
    },
    itemRow: {
      backgroundColor: colors.background,
      borderColor: colors.border,
    },
    itemRowSelected: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    itemName: {
      color: colors.text,
    },
    itemType: {
      color: colors.textSecondary,
    },
    selectedBadge: {
      color: colors.primary,
    },
    loadingText: {
      color: colors.textSecondary,
    },
  });

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <Text style={[styles.title, dynamicStyles.title]}>Search Items to Favorite</Text>
      
      <TextInput
        style={[styles.searchInput, dynamicStyles.searchInput]}
        placeholder="Search items..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor={colors.textSecondary}
      />

      <View style={styles.filterContainer}>
        {categories.map(category => (
          <TouchableOpacity
            key={category}
            style={[
              styles.filterButton,
              dynamicStyles.filterButton,
              filterCategory === category && dynamicStyles.filterButtonActive
            ]}
            onPress={() => setFilterCategory(category)}
          >
            <Text style={[
              styles.filterText,
              dynamicStyles.filterText,
              filterCategory === category && dynamicStyles.filterTextActive
            ]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const imgSrc = getItemImageSource(item.name, item.id);
          return (
            <TouchableOpacity
              style={[
                styles.itemRow,
                dynamicStyles.itemRow,
                isFavorited(item.name) && dynamicStyles.itemRowSelected
              ]}
              onPress={() => handleItemPress(item)}
            >
              {imgSrc && (
                <Image source={imgSrc} style={styles.itemImage} />
              )}
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, dynamicStyles.itemName]}>{item.name}</Text>
                <Text style={[styles.itemType, dynamicStyles.itemType]}>
                  {item.category} {item.rarity && `• ${item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}`}
                </Text>
              </View>
              {isFavorited(item.name) ? (
                <Ionicons name="star" size={20} color={colors.primary} />
              ) : (
                <Ionicons name="star-outline" size={20} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          );
        }}
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  filterText: {
    fontSize: 12,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  itemImage: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderRadius: 4,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemType: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  selectedBadge: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
