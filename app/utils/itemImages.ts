import { ITEM_IMAGES } from '../../item-images.generated';

function slug(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

// Augment image keys mapping (from planner.tsx)
const AUGMENT_IMAGE_KEYS: Record<string, string> = {
  free: 'free_loadout_augment',
  loot1: 'looting_mk_1',
  combat1: 'combat_mk_1',
  tactical1: 'tactical_mk_1',
  loot2: 'looting_mk_2',
  combat2: 'Combat_Mk2',
  tactical2: 'Tactical_Mk2',
  loot3c: 'looting_mk3_cautious',
  loot3s: 'looting_mk3_survivor',
  combat3a: 'combat_mk3_aggressive',
  combat3f: 'combat_mk3_flanking',
  tactical3d: 'tactical_mk3_defensive',
  tactical3h: 'tactical_mk3_healing',
};

// Map augment names from backpack-items.json to their image keys
const AUGMENT_NAME_TO_IMAGE_KEY: Record<string, string> = {
  'Free Loadout Augment': 'free_loadout_augment',
  'Looting Mk. 1': 'looting_mk_1',
  'Looting Mk. 2': 'looting_mk_2',
  'Looting Mk. 3 (Cautious)': 'looting_mk3_cautious',
  'Looting Mk. 3 (Survivor)': 'looting_mk3_survivor',
  'Combat Mk. 1': 'combat_mk_1',
  'Combat Mk. 2': 'Combat_Mk2',
  'Combat Mk. 3 (Aggressive)': 'combat_mk3_aggressive',
  'Combat Mk. 3 (Flanking)': 'combat_mk3_flanking',
  'Tactical Mk. 1': 'tactical_mk_1',
  'Tactical Mk. 2': 'Tactical_Mk2',
  'Tactical Mk. 3 (Defensive)': 'tactical_mk3_defensive',
  'Tactical Mk. 3 (Healing)': 'tactical_mk3_healing',
};

// Backpack item image aliases (from planner.tsx)
const BACKPACK_IMAGE_ALIAS: Record<string, string> = {
  raider_hatchkey: 'raider_hatch_key',
  combat_mk_2: 'Combat_Mk2',
  tactical_mk_2: 'Tactical_Mk2',
  looting_mk_3_survivor: 'looting_mk3_survivor',
};

/**
 * Get image source for an item by name.
 * Handles augments, backpack items, and regular items.
 */
export function getItemImageSource(itemName: string, itemId?: string): import('react-native').ImageSourcePropType | undefined {
  // First check if it's an augment with a direct name mapping
  if (AUGMENT_NAME_TO_IMAGE_KEY[itemName]) {
    const key = AUGMENT_NAME_TO_IMAGE_KEY[itemName];
    return ITEM_IMAGES[key] as import('react-native').ImageSourcePropType | undefined;
  }

  // If we have an itemId, check aliases first
  if (itemId) {
    const aliasKey = BACKPACK_IMAGE_ALIAS[itemId];
    if (aliasKey) {
      return ITEM_IMAGES[aliasKey] as import('react-native').ImageSourcePropType | undefined;
    }
  }

  // Fall back to slugged name
  const slugged = itemId || slug(itemName);
  return ITEM_IMAGES[slugged] as import('react-native').ImageSourcePropType | undefined;
}

/**
 * Get image source for an augment by its ID (used in planner).
 */
export function getAugmentImageSource(augmentId: string): import('react-native').ImageSourcePropType | undefined {
  const key = AUGMENT_IMAGE_KEYS[augmentId] ?? augmentId;
  return ITEM_IMAGES[key] as import('react-native').ImageSourcePropType | undefined;
}

/**
 * Get image source for a material by name.
 */
export function getMaterialImageSource(materialName: string): import('react-native').ImageSourcePropType | undefined {
  const key = slug(materialName);
  return ITEM_IMAGES[key] as import('react-native').ImageSourcePropType | undefined;
}

// Export constants for use in other files
export { AUGMENT_IMAGE_KEYS, BACKPACK_IMAGE_ALIAS };
