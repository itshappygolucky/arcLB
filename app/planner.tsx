import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { ITEM_IMAGES } from '../item-images.generated';
import { useTheme } from './_contexts/ThemeContext';
import { AUGMENT_IMAGE_KEYS, BACKPACK_IMAGE_ALIAS, getAugmentImageSource, getItemImageSource, getMaterialImageSource } from './_utils/itemImages';
import { SavedLoadout, storage } from './_utils/storage';

type AugmentId = string;

interface AugmentDef {
  id: AugmentId;
  name: string;
  weightLimit: number;
  backpack: number;
  safePocket: number;
  quickUse: number;
  weaponSlots: number;
  augmentedSlots: string | null;
  shieldCompatibility: string;
}

const FREE_LOADOUT: AugmentDef = {
  id: 'free',
  name: 'Free Loadout Augment',
  weightLimit: 35,
  backpack: 14,
  safePocket: 0,
  quickUse: 4,
  weaponSlots: 2,
  augmentedSlots: null,
  shieldCompatibility: 'Light Shields',
};

const AUGMENTS: AugmentDef[] = [
  { id: 'loot1', name: 'Looting Mk. 1', weightLimit: 50, backpack: 18, safePocket: 1, quickUse: 4, weaponSlots: 2, augmentedSlots: null, shieldCompatibility: 'Light Shields' },
  { id: 'combat1', name: 'Combat Mk. 1', weightLimit: 45, backpack: 16, safePocket: 1, quickUse: 4, weaponSlots: 2, augmentedSlots: null, shieldCompatibility: 'Light or Medium Shields' },
  { id: 'tactical1', name: 'Tactical Mk. 1', weightLimit: 40, backpack: 15, safePocket: 1, quickUse: 5, weaponSlots: 2, augmentedSlots: null, shieldCompatibility: 'Light or Medium Shields' },
  { id: 'loot2', name: 'Looting Mk. 2', weightLimit: 60, backpack: 22, safePocket: 2, quickUse: 4, weaponSlots: 2, augmentedSlots: '3 Trinket', shieldCompatibility: 'Light Shields' },
  { id: 'combat2', name: 'Combat Mk. 2', weightLimit: 55, backpack: 18, safePocket: 1, quickUse: 4, weaponSlots: 2, augmentedSlots: '1 Grenade', shieldCompatibility: 'Light, Medium, or Heavy Shields' },
  { id: 'tactical2', name: 'Tactical Mk. 2', weightLimit: 45, backpack: 17, safePocket: 1, quickUse: 5, weaponSlots: 2, augmentedSlots: '1 Utility', shieldCompatibility: 'Light or Medium Shields' },
  { id: 'loot3c', name: 'Looting Mk. 3 (Cautious)', weightLimit: 70, backpack: 24, safePocket: 2, quickUse: 5, weaponSlots: 2, augmentedSlots: '1 Integrated Binoculars', shieldCompatibility: 'Light Shields' },
  { id: 'loot3s', name: 'Looting Mk. 3 (Survivor)', weightLimit: 80, backpack: 20, safePocket: 3, quickUse: 5, weaponSlots: 2, augmentedSlots: '1 Utility', shieldCompatibility: 'Light or Medium Shields' },
  { id: 'combat3a', name: 'Combat Mk. 3 (Aggressive)', weightLimit: 65, backpack: 18, safePocket: 1, quickUse: 4, weaponSlots: 2, augmentedSlots: '2 Grenade', shieldCompatibility: 'Light, Medium, or Heavy Shields' },
  { id: 'combat3f', name: 'Combat Mk. 3 (Flanking)', weightLimit: 60, backpack: 20, safePocket: 2, quickUse: 5, weaponSlots: 2, augmentedSlots: '3 Utility', shieldCompatibility: 'Light Shields' },
  { id: 'tactical3d', name: 'Tactical Mk. 3 (Defensive)', weightLimit: 60, backpack: 20, safePocket: 1, quickUse: 5, weaponSlots: 2, augmentedSlots: '1 Integrated Shield Recharger', shieldCompatibility: 'Light, Medium or Heavy Shields' },
  { id: 'tactical3h', name: 'Tactical Mk. 3 (Healing)', weightLimit: 55, backpack: 16, safePocket: 3, quickUse: 4, weaponSlots: 2, augmentedSlots: '3 Healing', shieldCompatibility: 'Light or Medium Shields' },
];

const ALL_AUGMENTS: AugmentDef[] = [FREE_LOADOUT, ...AUGMENTS];

type ShieldId = string;

interface ShieldDef {
  id: ShieldId;
  name: string;
  description: string;
  shieldCharge: number;
  damageMitigation: string;
  movementPenalty: string;
  compatibleWith: AugmentId[] | null; // null = all augments
  weight: number;
}

const SHIELDS: ShieldDef[] = [
  { id: 'light', name: 'Light Shield', description: 'A lightweight shield that blocks a small portion of incoming damage without impacting mobility.', shieldCharge: 40, damageMitigation: '40%', movementPenalty: 'NIL', compatibleWith: null, weight: 5 },
  { id: 'medium', name: 'Medium Shield', description: 'A standard shield that blocks a medium portion of incoming damage at a moderate cost to mobility.', shieldCharge: 70, damageMitigation: '42.5%', movementPenalty: '5% Reduced Movement Speed', compatibleWith: ['tactical1', 'combat1', 'tactical2', 'combat2', 'tactical3h', 'combat3a', 'loot3s'], weight: 7 },
  { id: 'heavy', name: 'Heavy Shield', description: 'A heavy shield that blocks a large portion of incoming damage, but carries a significant cost to mobility.', shieldCharge: 80, damageMitigation: '52.5%', movementPenalty: '15% Reduced Movement Speed', compatibleWith: ['combat2', 'combat3a', 'tactical3d'], weight: 9 },
];

function isShieldCompatible(shield: ShieldDef, augmentId: AugmentId): boolean {
  if (shield.compatibleWith == null) return true;
  return shield.compatibleWith.includes(augmentId);
}

/** Light = uncommon, Medium = rare, Heavy = epic. */
function getShieldRarity(shieldId: string): string {
  if (shieldId === 'light') return 'uncommon';
  if (shieldId === 'medium') return 'rare';
  if (shieldId === 'heavy') return 'epic';
  return 'common';
}
function getShieldRarityColor(shieldId: string): string | null {
  const r = getShieldRarity(shieldId);
  return r === 'common' ? null : (WEAPON_RARITY_COLORS as Record<string, string>)[r] ?? null;
}

type WeaponId = string;
type WeaponRarity = 'legendary' | 'epic' | 'rare' | 'uncommon' | 'common';

type ModSlotType = 'Muzzle' | 'Underbarrel' | 'Light Magazine' | 'Medium Magazine' | 'Stock' | 'Shotgun Muzzle' | 'Shotgun Magazine' | 'Tech Mod';

interface AttachmentDef {
  id: string;
  name: string;
  modSlot: ModSlotType;
}

interface WeaponDef {
  id: WeaponId;
  name: string;
  rarity: WeaponRarity;
  color: string;
  weight: number;
  modSlots?: ModSlotType[]; // Mod slots available on this weapon
}

const WEAPON_RARITY_COLORS: Record<WeaponRarity, string> = {
  legendary: '#FFD700',
  epic: '#E040FB',
  rare: '#2196F3',
  uncommon: '#4CAF50',
  common: '#9E9E9E',
};

const WEAPONS: WeaponDef[] = [
  { id: 'jupiter', name: 'Jupiter', rarity: 'legendary', color: WEAPON_RARITY_COLORS.legendary, weight: 9, modSlots: [] },
  { id: 'equalizer', name: 'Equalizer', rarity: 'legendary', color: WEAPON_RARITY_COLORS.legendary, weight: 14, modSlots: [] },
  { id: 'aphelion', name: 'Aphelion', rarity: 'legendary', color: WEAPON_RARITY_COLORS.legendary, weight: 10, modSlots: ['Underbarrel', 'Stock'] },
  { id: 'bobcat', name: 'Bobcat', rarity: 'epic', color: WEAPON_RARITY_COLORS.epic, weight: 7, modSlots: ['Muzzle', 'Underbarrel', 'Light Magazine', 'Stock'] },
  { id: 'tempest', name: 'Tempest', rarity: 'epic', color: WEAPON_RARITY_COLORS.epic, weight: 11, modSlots: ['Muzzle', 'Underbarrel', 'Medium Magazine'] },
  { id: 'vulcano', name: 'Vulcano', rarity: 'epic', color: WEAPON_RARITY_COLORS.epic, weight: 8, modSlots: ['Shotgun Muzzle', 'Underbarrel', 'Shotgun Magazine', 'Stock'] },
  { id: 'bettina', name: 'Bettina', rarity: 'epic', color: WEAPON_RARITY_COLORS.epic, weight: 9, modSlots: ['Muzzle', 'Underbarrel', 'Stock'] },
  { id: 'hullcracker', name: 'Hullcracker', rarity: 'epic', color: WEAPON_RARITY_COLORS.epic, weight: 7, modSlots: ['Underbarrel', 'Stock'] },
  { id: 'torrente', name: 'Torrente', rarity: 'rare', color: WEAPON_RARITY_COLORS.rare, weight: 12, modSlots: ['Muzzle', 'Medium Magazine', 'Stock'] },
  { id: 'venator', name: 'Venator', rarity: 'rare', color: WEAPON_RARITY_COLORS.rare, weight: 2, modSlots: ['Underbarrel', 'Medium Magazine'] },
  { id: 'renegade', name: 'Renegade', rarity: 'rare', color: WEAPON_RARITY_COLORS.rare, weight: 10, modSlots: ['Muzzle', 'Medium Magazine', 'Stock'] },
  { id: 'osprey', name: 'Osprey', rarity: 'rare', color: WEAPON_RARITY_COLORS.rare, weight: 7, modSlots: ['Muzzle', 'Underbarrel', 'Medium Magazine', 'Stock'] },
  { id: 'il_toro', name: 'Il Toro', rarity: 'uncommon', color: WEAPON_RARITY_COLORS.uncommon, weight: 8, modSlots: ['Shotgun Muzzle', 'Underbarrel', 'Shotgun Magazine', 'Stock'] },
  { id: 'burletta', name: 'Burletta', rarity: 'uncommon', color: WEAPON_RARITY_COLORS.uncommon, weight: 4, modSlots: ['Muzzle', 'Light Magazine'] },
  { id: 'arpegio', name: 'Arpeggio', rarity: 'uncommon', color: WEAPON_RARITY_COLORS.uncommon, weight: 7, modSlots: ['Muzzle', 'Underbarrel', 'Medium Magazine', 'Stock'] },
  { id: 'anvil', name: 'Anvil', rarity: 'uncommon', color: WEAPON_RARITY_COLORS.uncommon, weight: 5, modSlots: ['Muzzle', 'Tech Mod'] },
  { id: 'stitcher', name: 'Stitcher', rarity: 'common', color: WEAPON_RARITY_COLORS.common, weight: 5, modSlots: ['Muzzle', 'Underbarrel', 'Light Magazine', 'Stock'] },
  { id: 'kettle', name: 'Kettle', rarity: 'common', color: WEAPON_RARITY_COLORS.common, weight: 7, modSlots: ['Muzzle', 'Underbarrel', 'Light Magazine', 'Stock'] },
  { id: 'hairpin', name: 'Hairpin', rarity: 'common', color: WEAPON_RARITY_COLORS.common, weight: 3, modSlots: ['Light Magazine'] },
  { id: 'ferro', name: 'Ferro', rarity: 'common', color: WEAPON_RARITY_COLORS.common, weight: 8, modSlots: ['Muzzle', 'Underbarrel', 'Stock'] },
  { id: 'rattler', name: 'Rattler', rarity: 'common', color: WEAPON_RARITY_COLORS.common, weight: 6, modSlots: ['Muzzle', 'Underbarrel', 'Stock'] },
];

/** Weapons that cannot be upgraded (only level 1). */
const WEAPONS_NO_UPGRADE: Set<string> = new Set(['aphelion', 'jupiter', 'equalizer']);

/** Upgrade materials per step: 1→2, 2→3, 3→4. Excludes the "1× Weapon N" input. */
const WEAPON_UPGRADES: Record<string, { material: string; quantity: number }[][]> = {
  bobcat: [
    [{ material: 'Advanced Mechanical Components', quantity: 1 }, { material: 'Light Gun Parts', quantity: 1 }],
    [{ material: 'Advanced Mechanical Components', quantity: 2 }, { material: 'Light Gun Parts', quantity: 3 }],
    [{ material: 'Advanced Mechanical Components', quantity: 2 }, { material: 'Light Gun Parts', quantity: 3 }],
  ],
  kettle: [
    [{ material: 'Metal Parts', quantity: 8 }, { material: 'Plastic Parts', quantity: 10 }],
    [{ material: 'Metal Parts', quantity: 10 }, { material: 'Simple Gun Parts', quantity: 1 }],
    [{ material: 'Mechanical Components', quantity: 3 }, { material: 'Simple Gun Parts', quantity: 1 }],
  ],
  rattler: [
    [{ material: 'Metal Parts', quantity: 10 }, { material: 'Rubber Parts', quantity: 10 }],
    [{ material: 'Mechanical Components', quantity: 3 }, { material: 'Simple Gun Parts', quantity: 1 }],
    [{ material: 'Mechanical Components', quantity: 3 }, { material: 'Simple Gun Parts', quantity: 1 }],
  ],
  arpegio: [
    [{ material: 'Mechanical Components', quantity: 4 }, { material: 'Simple Gun Parts', quantity: 1 }],
    [{ material: 'Mechanical Components', quantity: 5 }, { material: 'Medium Gun Parts', quantity: 1 }],
    [{ material: 'Mechanical Components', quantity: 5 }, { material: 'Medium Gun Parts', quantity: 1 }],
  ],
  tempest: [
    [{ material: 'Advanced Mechanical Components', quantity: 2 }, { material: 'Medium Gun Parts', quantity: 1 }],
    [{ material: 'Advanced Mechanical Components', quantity: 2 }, { material: 'Medium Gun Parts', quantity: 3 }],
    [{ material: 'Advanced Mechanical Components', quantity: 2 }, { material: 'Medium Gun Parts', quantity: 3 }],
  ],
  bettina: [
    [{ material: 'Advanced Mechanical Components', quantity: 1 }, { material: 'Heavy Gun Parts', quantity: 2 }],
    [{ material: 'Advanced Mechanical Components', quantity: 1 }, { material: 'Heavy Gun Parts', quantity: 2 }],
    [{ material: 'Advanced Mechanical Components', quantity: 2 }, { material: 'Heavy Gun Parts', quantity: 2 }],
  ],
  ferro: [
    [{ material: 'Metal Parts', quantity: 7 }],
    [{ material: 'Metal Parts', quantity: 9 }, { material: 'Simple Gun Parts', quantity: 1 }],
    [{ material: 'Mechanical Components', quantity: 1 }, { material: 'Simple Gun Parts', quantity: 1 }],
  ],
  renegade: [
    [{ material: 'Advanced Mechanical Components', quantity: 1 }, { material: 'Medium Gun Parts', quantity: 2 }],
    [{ material: 'Advanced Mechanical Components', quantity: 1 }, { material: 'Medium Gun Parts', quantity: 2 }],
    [{ material: 'Advanced Mechanical Components', quantity: 2 }, { material: 'Medium Gun Parts', quantity: 2 }],
  ],
  stitcher: [
    [{ material: 'Metal Parts', quantity: 8 }, { material: 'Rubber Parts', quantity: 12 }],
    [{ material: 'Metal Parts', quantity: 10 }, { material: 'Simple Gun Parts', quantity: 1 }],
    [{ material: 'Mechanical Components', quantity: 3 }, { material: 'Simple Gun Parts', quantity: 1 }],
  ],
  il_toro: [
    [{ material: 'Mechanical Components', quantity: 3 }, { material: 'Simple Gun Parts', quantity: 1 }],
    [{ material: 'Mechanical Components', quantity: 4 }, { material: 'Heavy Gun Parts', quantity: 1 }],
    [{ material: 'Mechanical Components', quantity: 4 }, { material: 'Heavy Gun Parts', quantity: 1 }],
  ],
  vulcano: [
    [{ material: 'Advanced Mechanical Components', quantity: 1 }, { material: 'Heavy Gun Parts', quantity: 1 }],
    [{ material: 'Advanced Mechanical Components', quantity: 2 }, { material: 'Heavy Gun Parts', quantity: 1 }],
    [{ material: 'Advanced Mechanical Components', quantity: 2 }, { material: 'Heavy Gun Parts', quantity: 3 }],
  ],
  hairpin: [
    [{ material: 'Metal Parts', quantity: 8 }],
    [{ material: 'Metal Parts', quantity: 9 }, { material: 'Simple Gun Parts', quantity: 1 }],
    [{ material: 'Mechanical Components', quantity: 1 }, { material: 'Simple Gun Parts', quantity: 1 }],
  ],
  burletta: [
    [{ material: 'Mechanical Components', quantity: 3 }, { material: 'Simple Gun Parts', quantity: 1 }],
    [{ material: 'Mechanical Components', quantity: 3 }, { material: 'Simple Gun Parts', quantity: 1 }],
    [{ material: 'Mechanical Components', quantity: 4 }, { material: 'Simple Gun Parts', quantity: 1 }],
  ],
  venator: [
    [{ material: 'Advanced Mechanical Components', quantity: 1 }, { material: 'Medium Gun Parts', quantity: 2 }],
    [{ material: 'Advanced Mechanical Components', quantity: 1 }, { material: 'Medium Gun Parts', quantity: 2 }],
    [{ material: 'Advanced Mechanical Components', quantity: 2 }, { material: 'Medium Gun Parts', quantity: 2 }],
  ],
  anvil: [
    [{ material: 'Mechanical Components', quantity: 3 }, { material: 'Simple Gun Parts', quantity: 1 }],
    [{ material: 'Mechanical Components', quantity: 4 }, { material: 'Heavy Gun Parts', quantity: 1 }],
    [{ material: 'Mechanical Components', quantity: 4 }, { material: 'Heavy Gun Parts', quantity: 1 }],
  ],
  torrente: [
    [{ material: 'Advanced Mechanical Components', quantity: 1 }, { material: 'Medium Gun Parts', quantity: 2 }],
    [{ material: 'Advanced Mechanical Components', quantity: 1 }, { material: 'Medium Gun Parts', quantity: 2 }],
    [{ material: 'Advanced Mechanical Components', quantity: 2 }, { material: 'Medium Gun Parts', quantity: 2 }],
  ],
  osprey: [
    [{ material: 'Advanced Mechanical Components', quantity: 1 }, { material: 'Medium Gun Parts', quantity: 2 }],
    [{ material: 'Advanced Mechanical Components', quantity: 1 }, { material: 'Medium Gun Parts', quantity: 2 }],
    [{ material: 'Advanced Mechanical Components', quantity: 2 }, { material: 'Medium Gun Parts', quantity: 2 }],
  ],
  hullcracker: [
    [{ material: 'Advanced Mechanical Components', quantity: 1 }, { material: 'Heavy Gun Parts', quantity: 2 }],
    [{ material: 'Advanced Mechanical Components', quantity: 2 }, { material: 'Heavy Gun Parts', quantity: 1 }],
    [{ material: 'Advanced Mechanical Components', quantity: 2 }, { material: 'Heavy Gun Parts', quantity: 3 }],
  ],
};

function getWeaponRecipe(name: string, id: string, level: number): { material: string; quantity: number }[] {
  const baseRecipe = RECIPES[name];
  const { ingredients: base } = getRecipeData(baseRecipe);
  if (level <= 1) return base;
  if (WEAPONS_NO_UPGRADE.has(id)) return base;
  const up = WEAPON_UPGRADES[id];
  if (!up) return base;
  const combined = new Map<string, number>();
  for (const { material, quantity } of base) combined.set(material, (combined.get(material) ?? 0) + quantity);
  for (let s = 0; s < level - 1 && s < up.length; s++) {
    for (const { material, quantity } of up[s]) combined.set(material, (combined.get(material) ?? 0) + quantity);
  }
  return Array.from(combined.entries(), ([material, quantity]) => ({ material, quantity })).sort((a, b) => a.material.localeCompare(b.material));
}

const WEAPON_LEVEL_ROMAN = ['I', 'II', 'III', 'IV'] as const;

// Backpack items from data/backpack-items.json
type BackpackItemId = string;
interface BackpackItemDef {
  id: BackpackItemId;
  name: string;
  category: string;
  rarity: string;
  rarityColor: string;
  stackSize: number;
}

type PackSlot = { id: BackpackItemId | null; qty: number };

function slug(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

// Map mod slot types to their icon filenames
const MOD_SLOT_ICONS: Record<ModSlotType, import('react-native').ImageSourcePropType> = {
  'Muzzle': require('../assets/images/icons/mods/38px-Mods_Muzzle.png.webp'),
  'Underbarrel': require('../assets/images/icons/mods/38px-Mods_Underbarrel.png.webp'),
  'Light Magazine': require('../assets/images/icons/mods/30px-Mods_Light-Mag.png.webp'),
  'Medium Magazine': require('../assets/images/icons/mods/38px-Mods_Medium-Mag.png.webp'),
  'Stock': require('../assets/images/icons/mods/38px-Mods_Stock.png.webp'),
  'Shotgun Muzzle': require('../assets/images/icons/mods/30px-Mods_Shotgun-Muzzle.png.webp'),
  'Shotgun Magazine': require('../assets/images/icons/mods/30px-Mods_Shotgun-Mag.png.webp'),
  'Tech Mod': require('../assets/images/icons/mods/30px-Mods_Tech-Mod.png.webp'),
} as Record<ModSlotType, import('react-native').ImageSourcePropType>;

function getModSlotIcon(modType: ModSlotType): import('react-native').ImageSourcePropType {
  return MOD_SLOT_ICONS[modType];
}

// Attachment definitions
const ATTACHMENTS: AttachmentDef[] = [
  // Tier I
  { id: 'compensator_i', name: 'Compensator I', modSlot: 'Muzzle' },
  { id: 'muzzle_brake_i', name: 'Muzzle Brake I', modSlot: 'Muzzle' },
  { id: 'shotgun_choke_i', name: 'Shotgun Choke I', modSlot: 'Shotgun Muzzle' },
  { id: 'angled_grip_i', name: 'Angled Grip I', modSlot: 'Underbarrel' },
  { id: 'vertical_grip_i', name: 'Vertical Grip I', modSlot: 'Underbarrel' },
  { id: 'extended_light_mag_i', name: 'Extended Light Mag I', modSlot: 'Light Magazine' },
  { id: 'extended_medium_mag_i', name: 'Extended Medium Mag I', modSlot: 'Medium Magazine' },
  { id: 'extended_shotgun_mag_i', name: 'Extended Shotgun Mag I', modSlot: 'Shotgun Magazine' },
  { id: 'stable_stock_i', name: 'Stable Stock I', modSlot: 'Stock' },
  // Tier II
  { id: 'compensator_ii', name: 'Compensator II', modSlot: 'Muzzle' },
  { id: 'muzzle_brake_ii', name: 'Muzzle Brake II', modSlot: 'Muzzle' },
  { id: 'shotgun_choke_ii', name: 'Shotgun Choke II', modSlot: 'Shotgun Muzzle' },
  { id: 'silencer_i', name: 'Silencer I', modSlot: 'Muzzle' },
  { id: 'angled_grip_ii', name: 'Angled Grip II', modSlot: 'Underbarrel' },
  { id: 'vertical_grip_ii', name: 'Vertical Grip II', modSlot: 'Underbarrel' },
  { id: 'extended_light_mag_ii', name: 'Extended Light Mag II', modSlot: 'Light Magazine' },
  { id: 'extended_medium_mag_ii', name: 'Extended Medium Mag II', modSlot: 'Medium Magazine' },
  { id: 'extended_shotgun_mag_ii', name: 'Extended Shotgun Mag II', modSlot: 'Shotgun Magazine' },
  { id: 'stable_stock_ii', name: 'Stable Stock II', modSlot: 'Stock' },
  // Tier III
  { id: 'compensator_iii', name: 'Compensator III', modSlot: 'Muzzle' },
  { id: 'muzzle_brake_iii', name: 'Muzzle Brake III', modSlot: 'Muzzle' },
  { id: 'shotgun_choke_iii', name: 'Shotgun Choke III', modSlot: 'Shotgun Muzzle' },
  { id: 'silencer_ii', name: 'Silencer II', modSlot: 'Muzzle' },
  { id: 'silencer_iii', name: 'Silencer III', modSlot: 'Muzzle' },
  { id: 'shotgun_silencer', name: 'Shotgun Silencer', modSlot: 'Shotgun Muzzle' },
  { id: 'extended_barrel', name: 'Extended Barrel', modSlot: 'Muzzle' },
  { id: 'angled_grip_iii', name: 'Angled Grip III', modSlot: 'Underbarrel' },
  { id: 'vertical_grip_iii', name: 'Vertical Grip III', modSlot: 'Underbarrel' },
  { id: 'horizontal_grip', name: 'Horizontal Grip', modSlot: 'Underbarrel' },
  { id: 'extended_light_mag_iii', name: 'Extended Light Mag III', modSlot: 'Light Magazine' },
  { id: 'extended_medium_mag_iii', name: 'Extended Medium Mag III', modSlot: 'Medium Magazine' },
  { id: 'extended_shotgun_mag_iii', name: 'Extended Shotgun Mag III', modSlot: 'Shotgun Magazine' },
  { id: 'stable_stock_iii', name: 'Stable Stock III', modSlot: 'Stock' },
  { id: 'lightweight_stock', name: 'Lightweight Stock', modSlot: 'Stock' },
  { id: 'padded_stock', name: 'Padded Stock', modSlot: 'Stock' },
  { id: 'kinetic_converter', name: 'Kinetic Converter', modSlot: 'Stock' },
  { id: 'anvil_splitter', name: 'Anvil Splitter', modSlot: 'Tech Mod' },
];

const BACKPACK_ITEMS_RAW: { Item: string; Rarity?: string; Category?: string; 'Stack Size'?: number }[] = require('../data/backpack-items.json');
const RECIPES_RAW = require('../data/recipes.json');

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
const QUICK_USE_ITEMS = BACKPACK_ITEMS.filter((i) => i.category === 'Quick Use');
const BACKPACK_ITEMS_BY_ID = new Map<string, BackpackItemDef>(BACKPACK_ITEMS.map((i) => [i.id, i]));

// Map planner ids to image keys in data/images/items (filename without .png)
const WEAPON_IMAGE_KEYS: Record<string, string> = { hairpin: 'hairpin_i', arpegio: 'arpeggio' };
const SHIELD_IMAGE_KEYS: Record<string, string> = { light: 'light_shield', medium: 'medium_shield', heavy: 'heavy_shield' };

function getItemSource(key: string | undefined) {
  return key ? (ITEM_IMAGES[key] as import('react-native').ImageSourcePropType) : undefined;
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return `rgba(0,0,0,${alpha})`;
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${alpha})`;
}

/** Free = common (no tint). Mk.1 = uncommon, Mk.2 = rare, Mk.3 = epic. */
function getAugmentRarityColor(augmentId: string): string | null {
  if (augmentId === 'free') return null;
  if (augmentId.includes('3')) return WEAPON_RARITY_COLORS.epic;
  if (augmentId.includes('2')) return WEAPON_RARITY_COLORS.rare;
  if (augmentId.includes('1')) return WEAPON_RARITY_COLORS.uncommon;
  return null;
}

function getAugmentRarity(augmentId: string): string {
  if (augmentId === 'free') return 'common';
  if (augmentId.includes('3')) return 'epic';
  if (augmentId.includes('2')) return 'rare';
  if (augmentId.includes('1')) return 'uncommon';
  return 'common';
}

const RARITY_ORDER = ['legendary', 'epic', 'rare', 'uncommon', 'common'];

const AUGMENT_CATEGORIES = ['All', 'Free Loadout', 'Mk. 1', 'Mk. 2', 'Mk. 3'];
const WEAPON_CATEGORIES = ['All', 'Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'];
const SHIELD_CATEGORIES = ['All', 'Light', 'Medium', 'Heavy'];

function getCaps(augmentId: AugmentId | null): { backpack: number; quickUse: number; safePocket: number } {
  const a = augmentId ? ALL_AUGMENTS.find((x) => x.id === augmentId) : FREE_LOADOUT;
  const def = a ?? FREE_LOADOUT;
  return { backpack: def.backpack, quickUse: def.quickUse, safePocket: def.safePocket };
}

function WeaponPlaceholder({ borderColor }: { borderColor: string }) {
  return (
    <View style={weaponStyles.container}>
      <View style={[weaponStyles.barrel, { borderColor }]} />
      <View style={[weaponStyles.body, { borderColor }]} />
      <View style={[weaponStyles.grip, { borderColor }]} />
      <View style={[weaponStyles.muzzle, { borderColor }]} />
    </View>
  );
}

// Weapon styles - border colors will be set dynamically
const weaponStyles = StyleSheet.create({
  container: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  barrel: { position: 'absolute', top: '30%', left: '15%', width: '55%', height: 8, backgroundColor: '#4a4a4a', borderRadius: 2, borderWidth: 1 },
  body: { position: 'absolute', top: '38%', left: '25%', width: '35%', height: 18, backgroundColor: '#3a3a3a', borderRadius: 2, borderWidth: 1 },
  grip: { position: 'absolute', bottom: '18%', left: '38%', width: 12, height: 22, backgroundColor: '#3a3a3a', borderRadius: 2, borderWidth: 1 },
  muzzle: { position: 'absolute', top: '32%', right: '12%', width: 8, height: 4, backgroundColor: '#555', borderRadius: 1, borderWidth: 1 },
});

const CELL_SIZE = 80;

function SlotGrid({ count, columns, renderSlot }: { count: number; columns: number; renderSlot: (i: number) => React.ReactNode }) {
  const rows: number[][] = [];
  for (let i = 0; i < count; i += columns) rows.push(Array.from({ length: Math.min(columns, count - i) }, (_, j) => i + j));
  return (
    <View style={slotGridStyles.grid}>
      {rows.map((row, ri) => (
        <View key={ri} style={slotGridStyles.row}>
          {row.map((i) => (
            <View key={i} style={[slotGridStyles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}>{renderSlot(i)}</View>
          ))}
        </View>
      ))}
    </View>
  );
}

const slotGridStyles = StyleSheet.create({
  grid: { gap: 6 },
  row: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  cell: {},
});

// --- Loadout code (base64 JSON) ---
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function toBase64(s: string): string {
  let r = '', i = 0, n: number, L = s.length;
  for (; i < L; ) {
    n = s.charCodeAt(i++) << 16;
    if (i < L) n |= s.charCodeAt(i++) << 8;
    if (i < L) n |= s.charCodeAt(i++);
    r += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  return r.slice(0, r.length - ((3 - (L % 3)) % 3));
}
function fromBase64(s: string): string {
  s = s.replace(/\s/g, '');
  const idx = (c: string) => { const i = B64.indexOf(c); if (i < 0) throw new Error('Invalid'); return i; };
  let r = '', i = 0, n: number, L = s.length;
  while (i < L) {
    n = (idx(s[i]) << 18) | (idx(s[i + 1]) << 12) | (idx(s[i + 2]) << 6) | idx(s[i + 3]);
    r += String.fromCharCode((n >> 16) & 255, (n >> 8) & 255, n & 255);
    i += 4;
  }
  const pad = (s.match(/=*$/) || [''])[0].length;
  return pad ? r.slice(0, -pad) : r;
}

interface LoadoutCodeData {
  a: string;
  s: string | null;
  w1: string | null;
  w2: string | null;
  w1L: number;
  w2L: number;
  att?: Record<string, string>;
  bp: PackSlot[];
  qu: PackSlot[];
}

function encodeLoadoutCode(state: {
  augmentId: string;
  shieldId: string | null;
  weapon1Id: string | null;
  weapon2Id: string | null;
  weapon1Level: number;
  weapon2Level: number;
  equippedAttachments?: Record<string, string>;
  backpackSlots: PackSlot[];
  quickUseSlots: PackSlot[];
}): string {
  const obj = {
    a: state.augmentId,
    s: state.shieldId,
    w1: state.weapon1Id,
    w2: state.weapon2Id,
    w1L: Math.max(1, Math.min(4, Math.floor(state.weapon1Level) || 1)),
    w2L: Math.max(1, Math.min(4, Math.floor(state.weapon2Level) || 1)),
    att: state.equippedAttachments || {},
    bp: state.backpackSlots.map((s) => ({ i: s.id, q: s.qty })),
    qu: state.quickUseSlots.map((s) => ({ i: s.id, q: s.qty })),
  };
  return toBase64(JSON.stringify(obj));
}

function decodeLoadoutCode(raw: string): { valid: true; data: LoadoutCodeData } | { valid: false; error: string } {
  const t = raw.replace(/\s/g, '').trim();
  if (!t) return { valid: false, error: 'Empty code' };
  let obj: unknown;
  try {
    obj = JSON.parse(fromBase64(t));
  } catch {
    return { valid: false, error: 'Invalid or corrupted code' };
  }
  if (!obj || typeof obj !== 'object' || !('a' in obj)) return { valid: false, error: 'Invalid format' };
  const d = obj as Record<string, unknown>;
  const a = typeof d.a === 'string' ? d.a : 'free';
  if (!ALL_AUGMENTS.some((x) => x.id === a)) return { valid: false, error: 'Unknown augment' };
  if (d.s != null && typeof d.s === 'string' && !SHIELDS.some((x) => x.id === d.s)) return { valid: false, error: 'Unknown shield' };
  if (d.w1 != null && typeof d.w1 === 'string' && !WEAPONS.some((x) => x.id === d.w1)) return { valid: false, error: 'Unknown weapon' };
  if (d.w2 != null && typeof d.w2 === 'string' && !WEAPONS.some((x) => x.id === d.w2)) return { valid: false, error: 'Unknown weapon' };
  const bp = Array.isArray(d.bp) ? d.bp : [];
  const qu = Array.isArray(d.qu) ? d.qu : [];
  const adef = ALL_AUGMENTS.find((x) => x.id === a) ?? FREE_LOADOUT;
  const norm = (arr: unknown[], len: number): PackSlot[] =>
    Array.from({ length: len }, (_, i) => {
      const el = arr[i];
      if (el === null || typeof el === 'string') {
        const id = typeof el === 'string' && BACKPACK_ITEMS_BY_ID.has(el) ? el : null;
        const def = id ? BACKPACK_ITEMS_BY_ID.get(id) : null;
        return { id, qty: id ? (def?.stackSize ?? 1) : 0 };
      }
      if (el && typeof el === 'object' && !Array.isArray(el)) {
        const o = el as Record<string, unknown>;
        const id = (o.i === null || o.i === undefined) ? null : (typeof o.i === 'string' && BACKPACK_ITEMS_BY_ID.has(o.i) ? o.i : null);
        const def = id ? BACKPACK_ITEMS_BY_ID.get(id) : null;
        const maxQ = def?.stackSize ?? 1;
        const q = typeof o.q === 'number' ? Math.min(maxQ, Math.max(1, Math.floor(o.q))) : maxQ;
        return { id, qty: id ? q : 0 };
      }
      return { id: null, qty: 0 };
    });
  const w1L = typeof d.w1L === 'number' ? Math.max(1, Math.min(4, Math.floor(d.w1L) || 1)) : 1;
  const w2L = typeof d.w2L === 'number' ? Math.max(1, Math.min(4, Math.floor(d.w2L) || 1)) : 1;
  const att = d.att && typeof d.att === 'object' && !Array.isArray(d.att) ? d.att as Record<string, string> : {};
  return {
    valid: true,
    data: {
      a,
      s: d.s != null && typeof d.s === 'string' ? d.s : null,
      w1: d.w1 != null && typeof d.w1 === 'string' ? d.w1 : null,
      w2: d.w2 != null && typeof d.w2 === 'string' ? d.w2 : null,
      w1L,
      w2L,
      att,
      bp: norm(bp, adef.backpack),
      qu: norm(qu, adef.quickUse),
    },
  };
}

export default function Planner() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const [selectedAugmentId, setSelectedAugmentId] = useState<AugmentId>('free');
  const [augmentModalVisible, setAugmentModalVisible] = useState(false);

  const caps = useMemo(() => getCaps(selectedAugmentId), [selectedAugmentId]);
  const selectedAugment = useMemo(
    () => ALL_AUGMENTS.find((a) => a.id === selectedAugmentId) ?? FREE_LOADOUT,
    [selectedAugmentId],
  );
  const augmentedSlotCount = useMemo(() => {
    if (!selectedAugment.augmentedSlots) return 0;
    const n = parseInt(selectedAugment.augmentedSlots, 10);
    return n >= 1 && n <= 3 ? n : 0;
  }, [selectedAugment.augmentedSlots]);

  const [selectedShieldId, setSelectedShieldId] = useState<ShieldId | null>(null);
  const [shieldModalVisible, setShieldModalVisible] = useState(false);

  const [weapon1Id, setWeapon1Id] = useState<WeaponId | null>(null);
  const [weapon2Id, setWeapon2Id] = useState<WeaponId | null>(null);
  const [weapon1Level, setWeapon1Level] = useState<number>(1);
  const [weapon2Level, setWeapon2Level] = useState<number>(1);
  const [weaponModalSlot, setWeaponModalSlot] = useState<1 | 2 | null>(null);
  const weaponModalVisible = weaponModalSlot != null;
  
  // Track equipped attachments: weaponSlot_modSlotType -> attachmentId
  const [equippedAttachments, setEquippedAttachments] = useState<Record<string, string>>({});
  const [attachmentModal, setAttachmentModal] = useState<{ weaponSlot: 1 | 2; modSlotType: ModSlotType } | null>(null);
  const attachmentModalVisible = attachmentModal != null;

  const [backpackSlots, setBackpackSlots] = useState<PackSlot[]>([]);
  const [quickUseSlots, setQuickUseSlots] = useState<PackSlot[]>([]);
  const [itemModal, setItemModal] = useState<{ kind: 'backpack' | 'quickuse'; index: number } | null>(null);

  const [augmentSearch, setAugmentSearch] = useState('');
  const [augmentCategory, setAugmentCategory] = useState('All');
  const [augmentFilterOpen, setAugmentFilterOpen] = useState(false);
  const [weaponSearch, setWeaponSearch] = useState('');
  const [weaponCategory, setWeaponCategory] = useState('All');
  const [weaponFilterOpen, setWeaponFilterOpen] = useState(false);
  const [shieldSearch, setShieldSearch] = useState('');
  const [shieldCategory, setShieldCategory] = useState('All');
  const [shieldFilterOpen, setShieldFilterOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [itemCategory, setItemCategory] = useState('All');
  const [itemFilterOpen, setItemFilterOpen] = useState(false);
  const [attachmentSearch, setAttachmentSearch] = useState('');

  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportCode, setExportCode] = useState('');
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [savedLoadouts, setSavedLoadouts] = useState<SavedLoadout[]>([]);
  const [loadoutsModalVisible, setLoadoutsModalVisible] = useState(false);
  const [saveLoadoutModalVisible, setSaveLoadoutModalVisible] = useState(false);
  const [saveLoadoutName, setSaveLoadoutName] = useState('');

  const selectedWeapon1 = useMemo(() => (weapon1Id ? WEAPONS.find((w) => w.id === weapon1Id) : null), [weapon1Id]);
  const selectedWeapon2 = useMemo(() => (weapon2Id ? WEAPONS.find((w) => w.id === weapon2Id) : null), [weapon2Id]);

  useEffect(() => {
    setBackpackSlots((prev) => (prev.length > caps.backpack ? prev.slice(0, caps.backpack) : prev));
  }, [caps.backpack]);
  useEffect(() => {
    setQuickUseSlots((prev) => (prev.length > caps.quickUse ? prev.slice(0, caps.quickUse) : prev));
  }, [caps.quickUse]);

  const compatibleShields = useMemo(
    () => SHIELDS.filter((s) => isShieldCompatible(s, selectedAugmentId)),
    [selectedAugmentId],
  );
  const selectedShield = useMemo(() => (selectedShieldId ? SHIELDS.find((s) => s.id === selectedShieldId) : null), [selectedShieldId]);

  const filteredAugments = useMemo(() => {
    const q = augmentSearch.trim().toLowerCase();
    return ALL_AUGMENTS.filter((a) => {
      if (q && !a.name.toLowerCase().includes(q)) return false;
      if (augmentCategory === 'All') return true;
      if (augmentCategory === 'Free Loadout') return a.id === 'free';
      if (augmentCategory === 'Mk. 1') return getAugmentRarity(a.id) === 'uncommon';
      if (augmentCategory === 'Mk. 2') return getAugmentRarity(a.id) === 'rare';
      if (augmentCategory === 'Mk. 3') return getAugmentRarity(a.id) === 'epic';
      return true;
    });
  }, [augmentSearch, augmentCategory]);

  const filteredWeapons = useMemo(() => {
    const q = weaponSearch.trim().toLowerCase();
    return WEAPONS.filter((w) => {
      if (q && !w.name.toLowerCase().includes(q)) return false;
      if (weaponCategory === 'All') return true;
      return w.rarity === weaponCategory.toLowerCase();
    });
  }, [weaponSearch, weaponCategory]);

  const filteredShields = useMemo(() => {
    const q = shieldSearch.trim().toLowerCase();
    return compatibleShields.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q)) return false;
      if (shieldCategory === 'All') return true;
      return s.id === shieldCategory.toLowerCase();
    });
  }, [compatibleShields, shieldSearch, shieldCategory]);

  const itemModalSource = useMemo(
    () => (itemModal?.kind === 'quickuse' ? QUICK_USE_ITEMS : BACKPACK_ITEMS),
    [itemModal?.kind],
  );
  const itemCategories = useMemo(
    () => ['All', ...[...new Set(itemModalSource.map((i) => i.category).filter(Boolean))].sort()],
    [itemModalSource],
  );
  const filteredItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    return itemModalSource.filter((i) => {
      if (q && !i.name.toLowerCase().includes(q)) return false;
      if (itemCategory === 'All') return true;
      return i.category === itemCategory;
    });
  }, [itemModalSource, itemSearch, itemCategory]);

  useEffect(() => {
    if (!selectedShieldId) return;
    const s = SHIELDS.find((x) => x.id === selectedShieldId);
    if (s && !isShieldCompatible(s, selectedAugmentId)) setSelectedShieldId(null);
  }, [selectedAugmentId, selectedShieldId]);

  useEffect(() => { if (!augmentModalVisible) setAugmentFilterOpen(false); }, [augmentModalVisible]);
  useEffect(() => { if (!weaponModalVisible) setWeaponFilterOpen(false); }, [weaponModalVisible]);
  useEffect(() => { if (!attachmentModalVisible) setAttachmentSearch(''); }, [attachmentModalVisible]);
  useEffect(() => { if (!shieldModalVisible) setShieldFilterOpen(false); }, [shieldModalVisible]);
  useEffect(() => { if (!itemModal) setItemFilterOpen(false); }, [itemModal]);

  // Load saved loadouts on mount
  useEffect(() => {
    const loadLoadouts = async () => {
      const loadouts = await storage.getLoadouts();
      setSavedLoadouts(loadouts);
    };
    loadLoadouts();
  }, []);

  const onExport = () => {
    setExportCode(encodeLoadoutCode({
      augmentId: selectedAugmentId,
      shieldId: selectedShieldId,
      weapon1Id: weapon1Id,
      weapon2Id: weapon2Id,
      weapon1Level,
      weapon2Level,
      equippedAttachments,
      backpackSlots,
      quickUseSlots,
    }));
    setExportModalVisible(true);
  };

  const onExportCopy = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(exportCode);
        Alert.alert('Copied', 'Loadout code copied to clipboard.');
      } else {
        await Share.share({ message: exportCode, title: 'Loadout Code' });
      }
    } catch (e) {
      Alert.alert('Error', 'Could not copy or share the code.');
    }
  };

  const onImport = () => {
    setImportCode('');
    setImportModalVisible(true);
  };

  const onImportApply = () => {
    const r = decodeLoadoutCode(importCode);
    if (!r.valid) {
      Alert.alert('Invalid Code', r.error);
      return;
    }
    const { data } = r;
    setSelectedAugmentId(data.a);
    setSelectedShieldId(data.s);
    setWeapon1Id(data.w1);
    setWeapon2Id(data.w2);
    setWeapon1Level(data.w1L);
    setWeapon2Level(data.w2L);
    setEquippedAttachments(data.att || {});
    setBackpackSlots(data.bp);
    setQuickUseSlots(data.qu);
    setImportModalVisible(false);
    setImportCode('');
    Alert.alert('Loaded', 'Loadout imported successfully.');
  };

  const onReset = () => {
    setSelectedAugmentId('free');
    setSelectedShieldId(null);
    setWeapon1Id(null);
    setWeapon2Id(null);
    setEquippedAttachments({});
    setWeapon1Level(1);
    setWeapon2Level(1);
    setBackpackSlots([]);
    setQuickUseSlots([]);
    Alert.alert('Reset', 'Loadout reset.');
  };

  const onSaveLoadout = async () => {
    if (!saveLoadoutName.trim()) {
      Alert.alert('Error', 'Please enter a name for the loadout.');
      return;
    }
    const newLoadout: SavedLoadout = {
      id: Date.now().toString(),
      name: saveLoadoutName.trim(),
      createdAt: Date.now(),
      data: {
        augmentId: selectedAugmentId,
        shieldId: selectedShieldId,
        weapon1Id: weapon1Id,
        weapon2Id: weapon2Id,
        weapon1Level,
        weapon2Level,
        equippedAttachments,
        backpackSlots: backpackSlots.map(s => ({ id: s.id, qty: s.qty })),
        quickUseSlots: quickUseSlots.map(s => ({ id: s.id, qty: s.qty })),
      },
    };
    const updated = [...savedLoadouts, newLoadout];
    await storage.saveLoadouts(updated);
    setSavedLoadouts(updated);
    setSaveLoadoutName('');
    setSaveLoadoutModalVisible(false);
    Alert.alert('Saved', 'Loadout saved successfully.');
  };

  const onLoadLoadout = async (loadout: SavedLoadout) => {
    const { data } = loadout;
    setSelectedAugmentId(data.augmentId);
    setSelectedShieldId(data.shieldId);
    setWeapon1Id(data.weapon1Id);
    setWeapon2Id(data.weapon2Id);
    setWeapon1Level(data.weapon1Level);
    setWeapon2Level(data.weapon2Level);
    setEquippedAttachments(data.equippedAttachments || {});
    setBackpackSlots(data.backpackSlots.map(s => ({ id: s.id, qty: s.qty })));
    setQuickUseSlots(data.quickUseSlots.map(s => ({ id: s.id, qty: s.qty })));
    setLoadoutsModalVisible(false);
    Alert.alert('Loaded', `Loadout "${loadout.name}" loaded successfully.`);
  };

  const onDeleteLoadout = async (loadoutId: string) => {
    Alert.alert(
      'Delete Loadout',
      'Are you sure you want to delete this loadout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = savedLoadouts.filter(l => l.id !== loadoutId);
            await storage.saveLoadouts(updated);
            setSavedLoadouts(updated);
            Alert.alert('Deleted', 'Loadout deleted successfully.');
          },
        },
      ]
    );
  };

  const onSelectItem = (item: BackpackItemDef | null) => {
    if (!itemModal) return;
    const empty: PackSlot = { id: null, qty: 0 };
    const filled = (i: BackpackItemDef): PackSlot => ({ id: i.id, qty: i.stackSize });
    if (itemModal.kind === 'backpack') {
      setBackpackSlots((prev) => {
        const n = [...prev];
        while (n.length <= itemModal.index) n.push(empty);
        n[itemModal.index] = item ? filled(item) : empty;
        return n;
      });
    } else {
      setQuickUseSlots((prev) => {
        const n = [...prev];
        while (n.length <= itemModal.index) n.push(empty);
        n[itemModal.index] = item ? filled(item) : empty;
        return n;
      });
    }
    setItemModal(null);
  };

  const adjustSlotQuantity = (kind: 'backpack' | 'quickuse', index: number, delta: number) => {
    if (kind === 'backpack') {
      setBackpackSlots((prev) => {
        const n = [...prev];
        const slot = n[index] ?? { id: null, qty: 0 };
        if (!slot.id) return n;
        const item = BACKPACK_ITEMS_BY_ID.get(slot.id);
        if (!item) return n;
        const newQty = Math.max(1, Math.min(item.stackSize, slot.qty + delta));
        if (newQty === 0) {
          n[index] = { id: null, qty: 0 };
        } else {
          n[index] = { ...slot, qty: newQty };
        }
        return n;
      });
    } else {
      setQuickUseSlots((prev) => {
        const n = [...prev];
        const slot = n[index] ?? { id: null, qty: 0 };
        if (!slot.id) return n;
        const item = BACKPACK_ITEMS_BY_ID.get(slot.id);
        if (!item) return n;
        const newQty = Math.max(1, Math.min(item.stackSize, slot.qty + delta));
        if (newQty === 0) {
          n[index] = { id: null, qty: 0 };
        } else {
          n[index] = { ...slot, qty: newQty };
        }
        return n;
      });
    }
  };

  const onSelectAugment = (a: AugmentDef) => {
    setSelectedAugmentId(a.id);
    setAugmentModalVisible(false);
  };

  const onSelectShield = (s: ShieldDef | null) => {
    setSelectedShieldId(s?.id ?? null);
    setShieldModalVisible(false);
  };

  const onOpenWeaponModal = (slot: 1 | 2) => {
    setWeaponModalSlot(slot);
  };
  const onSelectWeapon = (w: WeaponDef | null) => {
    if (weaponModalSlot === 1) {
      setWeapon1Id(w?.id ?? null);
      setWeapon1Level(1);
      // Clear attachments for weapon 1 when weapon changes
      setEquippedAttachments((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach(key => {
          if (key.startsWith('1_')) delete updated[key];
        });
        return updated;
      });
    }
    if (weaponModalSlot === 2) {
      setWeapon2Id(w?.id ?? null);
      setWeapon2Level(1);
      // Clear attachments for weapon 2 when weapon changes
      setEquippedAttachments((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach(key => {
          if (key.startsWith('2_')) delete updated[key];
        });
        return updated;
      });
    }
    setWeaponModalSlot(null);
  };

  const onSelectAttachment = (attachment: AttachmentDef | null) => {
    if (!attachmentModal) return;
    const key = `${attachmentModal.weaponSlot}_${attachmentModal.modSlotType}`;
    setEquippedAttachments((prev) => {
      const updated = { ...prev };
      if (attachment) {
        updated[key] = attachment.id;
      } else {
        delete updated[key];
      }
      return updated;
    });
    setAttachmentModal(null);
  };

  const filteredAttachments = useMemo(() => {
    if (!attachmentModal) return [];
    let filtered = ATTACHMENTS.filter(a => a.modSlot === attachmentModal.modSlotType);
    if (attachmentSearch.trim()) {
      const q = attachmentSearch.trim().toLowerCase();
      filtered = filtered.filter(a => a.name.toLowerCase().includes(q));
    }
    return filtered;
  }, [attachmentModal, attachmentSearch]);

  const currentWeight = useMemo(
    () =>
      (selectedShield?.weight ?? 0) +
      (selectedWeapon1?.weight ?? 0) +
      (selectedWeapon2?.weight ?? 0),
    [selectedShield, selectedWeapon1, selectedWeapon2],
  );
  const weightLimit = selectedAugment.weightLimit;
  const isOverEncumbered = currentWeight > weightLimit;

  // Create a map of material name to rarity
  const materialRarityMap = useMemo(() => {
    const map = new Map<string, string>();
    BACKPACK_ITEMS_RAW.forEach(item => {
      const rarity = ((item.Rarity || 'Common') as string).toLowerCase();
      map.set(item.Item, rarity);
    });
    return map;
  }, []);

  // Rarity order (higher number = higher rarity)
  const RARITY_ORDER_MAP: Record<string, number> = {
    'common': 1,
    'uncommon': 2,
    'rare': 3,
    'epic': 4,
    'legendary': 5,
  };

  const loadoutMaterials = useMemo(() => {
    const totals = new Map<string, number>();
    const add = (ings: { material: string; quantity: number }[] | undefined) => {
      if (!ings) return;
      for (const { material, quantity } of ings) {
        totals.set(material, (totals.get(material) ?? 0) + quantity);
      }
    };
    if (selectedAugment.id !== 'free') {
      const augmentRecipe = RECIPES[selectedAugment.name];
      const { ingredients } = getRecipeData(augmentRecipe);
      add(ingredients);
    }
    if (selectedShield) {
      const shieldRecipe = RECIPES[selectedShield.name];
      const { ingredients } = getRecipeData(shieldRecipe);
      add(ingredients);
    }
    if (selectedWeapon1 && weapon1Id) add(getWeaponRecipe(selectedWeapon1.name, weapon1Id, weapon1Level));
    if (selectedWeapon2 && weapon2Id) add(getWeaponRecipe(selectedWeapon2.name, weapon2Id, weapon2Level));
    
    // Add attachment materials
    Object.entries(equippedAttachments).forEach(([key, attachmentId]) => {
      const attachment = ATTACHMENTS.find(a => a.id === attachmentId);
      if (attachment) {
        const attachmentRecipe = RECIPES[attachment.name];
        if (attachmentRecipe) {
          const { ingredients } = getRecipeData(attachmentRecipe);
          add(ingredients);
        }
      }
    });
    
    const addSlot = (slot: PackSlot) => {
      if (!slot?.id) return;
      const item = BACKPACK_ITEMS_BY_ID.get(slot.id);
      if (!item) return;
      const recipeData = getRecipeData(RECIPES[item.name]);
      if (recipeData.ingredients.length === 0) return;
      
      // Calculate how many crafts are needed to produce slot.qty units
      const craftsNeeded = Math.ceil(slot.qty / recipeData.output);
      for (const { material, quantity } of recipeData.ingredients) {
        totals.set(material, (totals.get(material) ?? 0) + quantity * craftsNeeded);
      }
    };
    for (const s of backpackSlots) addSlot(s);
    for (const s of quickUseSlots) addSlot(s);
    return Array.from(totals.entries(), ([material, quantity]) => ({ material, quantity }));
  }, [selectedAugment, selectedShield, selectedWeapon1, selectedWeapon2, weapon1Id, weapon2Id, weapon1Level, weapon2Level, equippedAttachments, backpackSlots, quickUseSlots]);

  // Group materials by rarity
  const loadoutMaterialsByRarity = useMemo(() => {
    const byRarity: Record<string, Array<{ material: string; quantity: number }>> = {
      legendary: [],
      epic: [],
      rare: [],
      uncommon: [],
      common: [],
    };

    loadoutMaterials.forEach(({ material, quantity }) => {
      const rarity = materialRarityMap.get(material) || 'common';
      byRarity[rarity].push({ material, quantity });
    });

    // Sort each rarity group alphabetically
    Object.keys(byRarity).forEach(rarity => {
      byRarity[rarity].sort((a, b) => a.material.localeCompare(b.material));
    });

    // Return in rarity order (highest to lowest)
    return [
      { rarity: 'legendary', materials: byRarity.legendary },
      { rarity: 'epic', materials: byRarity.epic },
      { rarity: 'rare', materials: byRarity.rare },
      { rarity: 'uncommon', materials: byRarity.uncommon },
      { rarity: 'common', materials: byRarity.common },
    ].filter(group => group.materials.length > 0);
  }, [loadoutMaterials, materialRarityMap]);

  const loadoutBreakdown = useMemo(() => {
    const out: { key: string; name: string; imageKey: string; rarity: string; recipe: { material: string; quantity: number }[] }[] = [];
    const add = (key: string, name: string, imageKey: string, rarity: string, recipeOverride?: { material: string; quantity: number }[]) => {
      let recipeData: { ingredients: { material: string; quantity: number }[]; output: number };
      if (recipeOverride) {
        recipeData = { ingredients: recipeOverride, output: 1 };
      } else {
        recipeData = getRecipeData(RECIPES[name]);
      }
      if (recipeData.ingredients.length > 0) {
        out.push({ key, name, imageKey, rarity, recipe: recipeData.ingredients });
      }
    };
    if (selectedAugment.id !== 'free') {
      const augmentImgKey = AUGMENT_IMAGE_KEYS[selectedAugment.id] ?? selectedAugment.id;
      add('augment', selectedAugment.name, augmentImgKey, getAugmentRarity(selectedAugment.id));
    }
    if (selectedShield) {
      add('shield', selectedShield.name, SHIELD_IMAGE_KEYS[selectedShield.id] ?? selectedShield.id, getShieldRarity(selectedShield.id));
    }
    if (selectedWeapon1 && weapon1Id) {
      const recipe = getWeaponRecipe(selectedWeapon1.name, weapon1Id, weapon1Level);
      const nameSuffix = !WEAPONS_NO_UPGRADE.has(weapon1Id) && weapon1Level > 1 ? ` (${WEAPON_LEVEL_ROMAN[weapon1Level - 1]})` : '';
      if (recipe.length) add('weapon1', selectedWeapon1.name + nameSuffix, WEAPON_IMAGE_KEYS[selectedWeapon1.id] ?? selectedWeapon1.id, selectedWeapon1.rarity, recipe);
    }
    if (selectedWeapon2 && weapon2Id) {
      const recipe = getWeaponRecipe(selectedWeapon2.name, weapon2Id, weapon2Level);
      const nameSuffix = !WEAPONS_NO_UPGRADE.has(weapon2Id) && weapon2Level > 1 ? ` (${WEAPON_LEVEL_ROMAN[weapon2Level - 1]})` : '';
      if (recipe.length) add('weapon2', selectedWeapon2.name + nameSuffix, WEAPON_IMAGE_KEYS[selectedWeapon2.id] ?? selectedWeapon2.id, selectedWeapon2.rarity, recipe);
    }
    // Add attachments to breakdown
    Object.entries(equippedAttachments).forEach(([key, attachmentId]) => {
      const attachment = ATTACHMENTS.find(a => a.id === attachmentId);
      if (attachment) {
        const attachmentRecipe = RECIPES[attachment.name];
        if (attachmentRecipe) {
          const { ingredients } = getRecipeData(attachmentRecipe);
          if (ingredients.length > 0) {
            const weaponSlot = key.startsWith('1_') ? '1' : '2';
            const modSlotType = key.split('_')[1];
            add(`attachment_${key}`, attachment.name, attachment.id, 'common', ingredients);
          }
        }
      }
    });
    backpackSlots.forEach((slot, i) => {
      if (!slot?.id) return;
      const item = BACKPACK_ITEMS_BY_ID.get(slot.id);
      if (!item) return;
      const recipeData = getRecipeData(RECIPES[item.name]);
      if (recipeData.ingredients.length === 0) return;
      
      // Calculate how many crafts are needed to produce slot.qty units
      const craftsNeeded = Math.ceil(slot.qty / recipeData.output);
      const recipe = recipeData.ingredients.map(({ material, quantity }) => ({ 
        material, 
        quantity: quantity * craftsNeeded 
      }));
      if (recipe.length) add(`backpack-${i}`, item.name + (slot.qty > 1 ? ` (×${slot.qty})` : ''), BACKPACK_IMAGE_ALIAS[item.id] ?? item.id, item.rarity, recipe);
    });
    quickUseSlots.forEach((slot, i) => {
      if (!slot?.id) return;
      const item = BACKPACK_ITEMS_BY_ID.get(slot.id);
      if (!item) return;
      const recipeData = getRecipeData(RECIPES[item.name]);
      if (recipeData.ingredients.length === 0) return;
      
      // Calculate how many crafts are needed to produce slot.qty units
      const craftsNeeded = Math.ceil(slot.qty / recipeData.output);
      const recipe = recipeData.ingredients.map(({ material, quantity }) => ({ 
        material, 
        quantity: quantity * craftsNeeded 
      }));
      if (recipe.length) add(`quickuse-${i}`, item.name + (slot.qty > 1 ? ` (×${slot.qty})` : ''), BACKPACK_IMAGE_ALIAS[item.id] ?? item.id, item.rarity, recipe);
    });
    return out;
  }, [selectedAugment, selectedShield, selectedWeapon1, selectedWeapon2, weapon1Id, weapon2Id, weapon1Level, weapon2Level, equippedAttachments, backpackSlots, quickUseSlots]);

  const loadoutBreakdownGrouped = useMemo(() => {
    const byRarity: Record<string, typeof loadoutBreakdown> = {};
    for (const r of RARITY_ORDER) byRarity[r] = [];
    for (const item of loadoutBreakdown) {
      const r = RARITY_ORDER.includes(item.rarity) ? item.rarity : 'common';
      byRarity[r].push(item);
    }
    return RARITY_ORDER.map((rarity) => ({ rarity, items: byRarity[rarity] })).filter((g) => g.items.length > 0);
  }, [loadoutBreakdown]);

  const augmentImg = getAugmentImageSource(selectedAugment.id);
  const shieldImg = selectedShield ? getItemSource(SHIELD_IMAGE_KEYS[selectedShield.id] ?? selectedShield.id) : undefined;
  const weapon1Img = selectedWeapon1 ? getItemSource(WEAPON_IMAGE_KEYS[selectedWeapon1.id] ?? selectedWeapon1.id) : undefined;
  const weapon2Img = selectedWeapon2 ? getItemSource(WEAPON_IMAGE_KEYS[selectedWeapon2.id] ?? selectedWeapon2.id) : undefined;
  const augmentRarityColor = getAugmentRarityColor(selectedAugment.id);
  const shieldRarityColor = selectedShield ? getShieldRarityColor(selectedShield.id) : null;

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
      marginBottom: 16,
    },
    headerLeft: {
      flex: 1,
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.headerText,
      marginBottom: 2,
    },
    titleIcon: {
      marginTop: 6,
    },
    headerButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    btnExport: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    btnExportText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
    },
    btnImport: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: colors.success,
    },
    btnImportText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
    },
    btnReset: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: colors.error,
    },
    btnResetText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
    },
    weightLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 1.1,
      marginBottom: 4,
    },
    weightValue: {
      fontSize: 12,
      color: colors.text,
      marginBottom: 6,
    },
    weightOver: {
      color: colors.error,
    },
    weightBarBg: {
      width: '20%',
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      overflow: 'hidden',
    },
    weightBarFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 2,
    },
    weightBarOver: {
      backgroundColor: colors.error,
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 1.1,
    },
    slotCount: {
      fontSize: 10,
      color: colors.primary,
      letterSpacing: 0.5,
    },
    slotSmall: {
      flex: 1,
      aspectRatio: 1.1,
      maxHeight: 80,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 4,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 4,
    },
    slotLabel: {
      fontSize: 8,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 0.8,
      marginBottom: 2,
    },
    augmentName: {
      fontSize: 9,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    shieldName: {
      fontSize: 9,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    shieldCompat: {
      fontSize: 7,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 2,
    },
    augmentedLabel: {
      fontSize: 9,
      color: colors.primary,
      letterSpacing: 0.6,
    },
    slotWeapon: {
      flex: 1,
      minHeight: 88,
      position: 'relative',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 4,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      padding: 6,
    },
    weaponLevelBtn: {
      paddingVertical: 2,
      paddingHorizontal: 5,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 4,
    },
    weaponLevelBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    weaponLevelBtnText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.primary,
    },
    weaponLevelBtnTextActive: {
      color: '#fff',
    },
    weaponName: {
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
      color: colors.text,
    },
    backpackSlot: {
      width: '100%',
      height: '100%',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 4,
      overflow: 'hidden',
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickUseSlot: {
      width: '100%',
      height: '100%',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 4,
      overflow: 'hidden',
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemName: {
      fontSize: 10,
      fontWeight: '600',
      textAlign: 'center',
      color: colors.text,
    },
    plusSymbol: {
      fontSize: 20,
      color: colors.border,
      fontWeight: '300',
    },
    augmentedSlot: {
      width: CELL_SIZE,
      height: CELL_SIZE,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    safePocketSlot: {
      width: CELL_SIZE,
      height: CELL_SIZE,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    materialsTitle: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 1.1,
      marginBottom: 10,
    },
    materialsEmpty: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    materialsRow: {
      fontSize: 12,
      color: colors.text,
    },
    materialsBreakdownTitle: {
      fontSize: 9,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 1,
      marginBottom: 10,
    },
    materialsBreakdownItemName: {
      fontSize: 12,
      color: colors.text,
      flex: 1,
      minWidth: 0,
    },
    materialsBreakdownRecipe: {
      fontSize: 11,
      color: colors.textSecondary,
      flex: 1,
      textAlign: 'right',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalCard: {
      width: '100%',
      maxWidth: 340,
      maxHeight: '70%',
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    modalTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 1,
      marginBottom: 12,
    },
    modalSearch: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 14,
      color: colors.text,
      marginBottom: 10,
    },
    modalFilterTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      backgroundColor: colors.background,
    },
    modalFilterTriggerText: {
      fontSize: 13,
      color: colors.text,
    },
    modalFilterOptions: {
      marginTop: 4,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    modalFilterOption: {
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalFilterOptionText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    modalFilterOptionTextActive: {
      color: colors.primary,
      fontWeight: '600',
    },
    modalList: {
      maxHeight: 300,
    },
    modalOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalOptionText: {
      color: colors.text,
      fontSize: 14,
    },
    modalOptionSub: {
      color: colors.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },
    modalCodeHint: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    modalCodeInput: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 10,
      fontSize: 12,
      color: colors.text,
      marginBottom: 12,
    },
  });

  // Create weapon styles with theme colors
  const weaponStylesWithTheme = StyleSheet.create({
    barrel: { ...weaponStyles.barrel, borderColor: colors.border },
    body: { ...weaponStyles.body, borderColor: colors.border },
    grip: { ...weaponStyles.grip, borderColor: colors.border },
    muzzle: { ...weaponStyles.muzzle, borderColor: colors.border },
  });

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, dynamicStyles.header]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.title, dynamicStyles.title]}>Build Your Loadout</Text>
            <View style={styles.titleIcon}>
              <Ionicons name="layers-outline" size={28} color={colors.headerText} />
            </View>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={[styles.btnExport, dynamicStyles.btnExport]} onPress={onExport} activeOpacity={0.7}>
              <Text style={[styles.btnExportText, dynamicStyles.btnExportText]}>Export</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnImport, dynamicStyles.btnImport]} onPress={onImport} activeOpacity={0.7}>
              <Text style={[styles.btnImportText, dynamicStyles.btnImportText]}>Import</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnImport, dynamicStyles.btnImport]} onPress={() => setLoadoutsModalVisible(true)} activeOpacity={0.7}>
              <Text style={[styles.btnImportText, dynamicStyles.btnImportText]}>Loadouts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnReset, dynamicStyles.btnReset]} onPress={onReset} activeOpacity={0.7}>
              <Text style={[styles.btnResetText, dynamicStyles.btnResetText]}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.weightRow}>
          <Text style={[styles.weightLabel, dynamicStyles.weightLabel]}>WEIGHT</Text>
          <Text style={[styles.weightValue, dynamicStyles.weightValue, isOverEncumbered && dynamicStyles.weightOver]}>
            {currentWeight.toFixed(1)} / {weightLimit.toFixed(1)} kg
          </Text>
          <View style={[styles.weightBarBg, dynamicStyles.weightBarBg]}>
            <View style={[styles.weightBarFill, dynamicStyles.weightBarFill, { width: `${Math.min(100, (currentWeight / weightLimit) * 100)}%` }, isOverEncumbered && dynamicStyles.weightBarOver]} />
          </View>
        </View>

        <View style={styles.columns}>
          {/* ——— Column 1: Equipment ——— */}
          <View style={styles.col}>
            <Text style={[styles.sectionLabel, styles.sectionLabelBlock, dynamicStyles.sectionLabel]}>EQUIPMENT</Text>
            <View style={styles.eqTopRow}>
              <TouchableOpacity style={[styles.slotSmall, dynamicStyles.slotSmall]} onPress={() => setAugmentModalVisible(true)} activeOpacity={0.8}>
                {augmentRarityColor ? <View style={[styles.rarityBgFull, { backgroundColor: hexToRgba(augmentRarityColor, 0.12) }]} /> : null}
                <Text style={[styles.slotLabel, dynamicStyles.slotLabel]}>AUGMENT</Text>
                {augmentImg ? <Image source={augmentImg} style={styles.slotSmallImg} resizeMode="contain" /> : null}
                <Text style={[styles.augmentName, dynamicStyles.augmentName]} numberOfLines={2}>{selectedAugment.name}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.slotSmall, dynamicStyles.slotSmall]} onPress={() => setShieldModalVisible(true)} activeOpacity={0.8}>
                {shieldRarityColor ? <View style={[styles.rarityBgFull, { backgroundColor: hexToRgba(shieldRarityColor, 0.12) }]} /> : null}
                <Text style={[styles.slotLabel, dynamicStyles.slotLabel]}>SHIELD</Text>
                {selectedShield ? (
                  <>
                    {shieldImg ? <Image source={shieldImg} style={styles.slotSmallImg} resizeMode="contain" /> : null}
                    <Text style={[styles.shieldName, dynamicStyles.shieldName]} numberOfLines={1}>{selectedShield.name}</Text>
                    <Text style={[styles.shieldCompat, dynamicStyles.shieldCompat]} numberOfLines={1}>{selectedShield.shieldCharge} · {selectedShield.damageMitigation}</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="shield-outline" size={22} color={colors.primary} />
                    <Text style={[styles.shieldCompat, dynamicStyles.shieldCompat]} numberOfLines={2}>{selectedAugment.shieldCompatibility}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            {selectedAugment.augmentedSlots ? (
              <View style={styles.augmentedRow}>
                <Text style={[styles.augmentedLabel, dynamicStyles.augmentedLabel]}>AUGMENTED: {selectedAugment.augmentedSlots}</Text>
              </View>
            ) : null}
            <View style={styles.weaponSlots}>
              <View style={[styles.slotWeapon, dynamicStyles.slotWeapon]}>
                {selectedWeapon1 && selectedWeapon1.rarity !== 'common' && (
                  <View style={[styles.rarityBgFull, { backgroundColor: hexToRgba(selectedWeapon1.color, 0.12) }]} />
                )}
                <TouchableOpacity style={styles.weaponSlotTouchable} onPress={() => onOpenWeaponModal(1)} activeOpacity={0.8}>
                  <Text style={styles.slotLabel}>WEAPON 1</Text>
                  <View style={styles.weaponPlaceholderWrap}>
                    {weapon1Img ? (
                      <Image source={weapon1Img} style={styles.weaponImg} resizeMode="contain" />
                    ) : selectedWeapon1 ? (
                      <Text style={[styles.weaponName, dynamicStyles.weaponName, { color: selectedWeapon1.color }]} numberOfLines={2}>{selectedWeapon1.name}</Text>
                    ) : (
                      <WeaponPlaceholder borderColor={colors.border} />
                    )}
                  </View>
                  {selectedWeapon1 && selectedWeapon1.modSlots && selectedWeapon1.modSlots.length > 0 && (
                    <View style={styles.weaponModSlots}>
                      {selectedWeapon1.modSlots.map((modType, idx) => {
                        const attachmentKey = `1_${modType}`;
                        const equippedAttachmentId = equippedAttachments[attachmentKey];
                        const equippedAttachment = equippedAttachmentId ? ATTACHMENTS.find(a => a.id === equippedAttachmentId) : null;
                        const attachmentImg = equippedAttachment ? getItemImageSource(equippedAttachment.name) : null;
                        return (
                          <TouchableOpacity
                            key={idx}
                            style={[styles.weaponModSlot, { borderColor: colors.border }, equippedAttachment && styles.weaponModSlotEquipped]}
                            onPress={(e) => {
                              e.stopPropagation();
                              setAttachmentModal({ weaponSlot: 1, modSlotType: modType });
                            }}
                            activeOpacity={0.7}
                          >
                            {attachmentImg ? (
                              <Image source={attachmentImg} style={styles.weaponModSlotIcon} resizeMode="contain" />
                            ) : (
                              <Image source={getModSlotIcon(modType)} style={styles.weaponModSlotIcon} resizeMode="contain" />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </TouchableOpacity>
                {selectedWeapon1 && weapon1Id && !WEAPONS_NO_UPGRADE.has(weapon1Id) && (
                  <View style={styles.weaponLevelWrap}>
                    {([1, 2, 3, 4] as const).map((l) => (
                      <TouchableOpacity key={l} style={[styles.weaponLevelBtn, dynamicStyles.weaponLevelBtn, weapon1Level === l && dynamicStyles.weaponLevelBtnActive]} onPress={() => setWeapon1Level(l)}>
                        <Text style={[styles.weaponLevelBtnText, dynamicStyles.weaponLevelBtnText, weapon1Level === l && dynamicStyles.weaponLevelBtnTextActive]}>{WEAPON_LEVEL_ROMAN[l - 1]}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <View style={[styles.slotWeapon, dynamicStyles.slotWeapon]}>
                {selectedWeapon2 && selectedWeapon2.rarity !== 'common' && (
                  <View style={[styles.rarityBgFull, { backgroundColor: hexToRgba(selectedWeapon2.color, 0.12) }]} />
                )}
                <TouchableOpacity style={styles.weaponSlotTouchable} onPress={() => onOpenWeaponModal(2)} activeOpacity={0.8}>
                  <Text style={styles.slotLabel}>WEAPON 2</Text>
                  <View style={styles.weaponPlaceholderWrap}>
                    {weapon2Img ? (
                      <Image source={weapon2Img} style={styles.weaponImg} resizeMode="contain" />
                    ) : selectedWeapon2 ? (
                      <Text style={[styles.weaponName, dynamicStyles.weaponName, { color: selectedWeapon2.color }]} numberOfLines={2}>{selectedWeapon2.name}</Text>
                    ) : (
                      <WeaponPlaceholder borderColor={colors.border} />
                    )}
                  </View>
                  {selectedWeapon2 && selectedWeapon2.modSlots && selectedWeapon2.modSlots.length > 0 && (
                    <View style={styles.weaponModSlots}>
                      {selectedWeapon2.modSlots.map((modType, idx) => {
                        const attachmentKey = `2_${modType}`;
                        const equippedAttachmentId = equippedAttachments[attachmentKey];
                        const equippedAttachment = equippedAttachmentId ? ATTACHMENTS.find(a => a.id === equippedAttachmentId) : null;
                        const attachmentImg = equippedAttachment ? getItemImageSource(equippedAttachment.name) : null;
                        return (
                          <TouchableOpacity
                            key={idx}
                            style={[styles.weaponModSlot, { borderColor: colors.border }, equippedAttachment && styles.weaponModSlotEquipped]}
                            onPress={(e) => {
                              e.stopPropagation();
                              setAttachmentModal({ weaponSlot: 2, modSlotType: modType });
                            }}
                            activeOpacity={0.7}
                          >
                            {attachmentImg ? (
                              <Image source={attachmentImg} style={styles.weaponModSlotIcon} resizeMode="contain" />
                            ) : (
                              <Image source={getModSlotIcon(modType)} style={styles.weaponModSlotIcon} resizeMode="contain" />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </TouchableOpacity>
                {selectedWeapon2 && weapon2Id && !WEAPONS_NO_UPGRADE.has(weapon2Id) && (
                  <View style={styles.weaponLevelWrap}>
                    {([1, 2, 3, 4] as const).map((l) => (
                      <TouchableOpacity key={l} style={[styles.weaponLevelBtn, dynamicStyles.weaponLevelBtn, weapon2Level === l && dynamicStyles.weaponLevelBtnActive]} onPress={() => setWeapon2Level(l)}>
                        <Text style={[styles.weaponLevelBtnText, dynamicStyles.weaponLevelBtnText, weapon2Level === l && dynamicStyles.weaponLevelBtnTextActive]}>{WEAPON_LEVEL_ROMAN[l - 1]}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* ——— Column 2: Backpack ——— */}
          <View style={styles.col}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionLabel, dynamicStyles.sectionLabel]}>BACKPACK</Text>
              <Text style={[styles.slotCount, dynamicStyles.slotCount]}>{backpackSlots.filter((s) => s?.id != null).length} / {caps.backpack}</Text>
            </View>
            <SlotGrid
              count={caps.backpack}
              columns={4}
              renderSlot={(i) => {
                const slot = backpackSlots[i] ?? { id: null, qty: 0 };
                const id = slot.id;
                const item = id ? BACKPACK_ITEMS_BY_ID.get(id) : null;
                const src = item ? getItemImageSource(item.name, item.id) : undefined;
                return (
                  <View style={[styles.backpackSlot, dynamicStyles.backpackSlot]}>
                    <TouchableOpacity style={styles.slotTouchable} onPress={() => setItemModal({ kind: 'backpack', index: i })} activeOpacity={0.8}>
                      {item && item.rarity !== 'common' && (
                        <View style={[styles.rarityBgFull, { backgroundColor: hexToRgba(item.rarityColor, 0.12) }]} />
                      )}
                      {item ? (
                        <View style={styles.slotContent}>
                          {src ? <Image source={src} style={styles.slotGridImg} resizeMode="contain" /> : <Text style={[styles.itemName, dynamicStyles.itemName, { color: item.rarityColor }]} numberOfLines={2}>{item.name}</Text>}
                        </View>
                      ) : null}
                      {item && (
                        <Text style={styles.slotQty} numberOfLines={1}>{slot.qty}</Text>
                      )}
                    </TouchableOpacity>
                    {item && (
                      <View style={styles.quantityControls}>
                        <TouchableOpacity 
                          style={[styles.quantityBtn, { backgroundColor: colors.primary }]} 
                          onPress={(e) => {
                            e.stopPropagation();
                            adjustSlotQuantity('backpack', i, -1);
                          }}
                          disabled={slot.qty <= 1}
                        >
                          <Ionicons name="remove" size={12} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.quantityBtn, { backgroundColor: colors.primary }]} 
                          onPress={(e) => {
                            e.stopPropagation();
                            adjustSlotQuantity('backpack', i, 1);
                          }}
                          disabled={slot.qty >= item.stackSize}
                        >
                          <Ionicons name="add" size={12} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              }}
            />
          </View>

          {/* ——— Column 3: Quick Use + Safe Pocket ——— */}
          <View style={styles.col}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionLabel, dynamicStyles.sectionLabel]}>QUICK USE</Text>
              <Text style={[styles.slotCount, dynamicStyles.slotCount]}>{quickUseSlots.filter((s) => s?.id != null).length} / {caps.quickUse}</Text>
            </View>
            <SlotGrid
              count={caps.quickUse}
              columns={3}
              renderSlot={(i) => {
                const slot = quickUseSlots[i] ?? { id: null, qty: 0 };
                const id = slot.id;
                const item = id ? BACKPACK_ITEMS_BY_ID.get(id) : null;
                const src = item ? getItemImageSource(item.name, item.id) : undefined;
                return (
                  <View style={[styles.quickUseSlot, dynamicStyles.quickUseSlot]}>
                    <TouchableOpacity style={styles.slotTouchable} onPress={() => setItemModal({ kind: 'quickuse', index: i })} activeOpacity={0.8}>
                      {item && item.rarity !== 'common' && (
                        <View style={[styles.rarityBgFull, { backgroundColor: hexToRgba(item.rarityColor, 0.12) }]} />
                      )}
                      {item ? (
                        <View style={styles.slotContent}>
                          {src ? <Image source={src} style={styles.slotGridImg} resizeMode="contain" /> : <Text style={[styles.itemName, dynamicStyles.itemName, { color: item.rarityColor }]} numberOfLines={2}>{item.name}</Text>}
                        </View>
                      ) : (
                        <Text style={[styles.plusSymbol, dynamicStyles.plusSymbol]}>+</Text>
                      )}
                      {item && (
                        <Text style={styles.slotQty} numberOfLines={1}>{slot.qty}</Text>
                      )}
                    </TouchableOpacity>
                    {item && (
                      <View style={styles.quantityControls}>
                        <TouchableOpacity 
                          style={[styles.quantityBtn, { backgroundColor: colors.primary }]} 
                          onPress={(e) => {
                            e.stopPropagation();
                            adjustSlotQuantity('quickuse', i, -1);
                          }}
                          disabled={slot.qty <= 1}
                        >
                          <Ionicons name="remove" size={12} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.quantityBtn, { backgroundColor: colors.primary }]} 
                          onPress={(e) => {
                            e.stopPropagation();
                            adjustSlotQuantity('quickuse', i, 1);
                          }}
                          disabled={slot.qty >= item.stackSize}
                        >
                          <Ionicons name="add" size={12} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              }}
            />
            {augmentedSlotCount > 0 && (
              <View style={styles.augmentedSlotsWrap}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>AUGMENTED SLOTS</Text>
                  <Text style={styles.slotCount}>0 / {augmentedSlotCount}</Text>
                </View>
                <View style={styles.augmentedSlotsRow}>
                  {Array.from({ length: augmentedSlotCount }).map((_, i) => (
                    <View key={i} style={[styles.augmentedSlot, dynamicStyles.augmentedSlot]}>
                      <Ionicons name="cube-outline" size={18} color={colors.primary} />
                    </View>
                  ))}
                </View>
              </View>
            )}
            <View style={styles.safePocketWrap}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>SAFE POCKET</Text>
                <Text style={[styles.slotCount, dynamicStyles.slotCount]}>0 / {caps.safePocket}</Text>
              </View>
              <View style={styles.safePocketRow}>
                {Array.from({ length: caps.safePocket }).map((_, i) => (
                  <View key={i} style={[styles.safePocketSlot, dynamicStyles.safePocketSlot]}>
                    <Ionicons name="lock-closed" size={18} color={colors.primary} />
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.materialsWrap, { borderTopColor: colors.border }]}>
          <Text style={[styles.materialsTitle, dynamicStyles.materialsTitle]}>MATERIALS REQUIRED</Text>
          {loadoutMaterials.length === 0 ? (
            <Text style={[styles.materialsEmpty, dynamicStyles.materialsEmpty]}>No craftable items in loadout.</Text>
          ) : (
            <>
              {loadoutMaterialsByRarity.map(({ rarity, materials }) => (
                <View key={rarity} style={styles.materialsRarityGroup}>
                  <Text style={[styles.materialsRarityHeader, { color: (WEAPON_RARITY_COLORS as Record<string, string>)[rarity] ?? colors.primary }]}>
                    {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                  </Text>
                  <View style={styles.materialsList}>
                    {materials.map(({ material, quantity }) => {
                      const src = getMaterialImageSource(material);
                      return (
                        <View key={material} style={[styles.materialsItemCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                          {src && (
                            <Image source={src} style={styles.materialsItemImg} resizeMode="contain" />
                          )}
                          <View style={styles.materialsItemContent}>
                            <Text style={[styles.materialsItemName, dynamicStyles.materialsRow]} numberOfLines={2}>
                              {material}
                            </Text>
                            <Text style={[styles.materialsItemQty, { color: colors.primary }]}>
                              ×{quantity}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
              {loadoutBreakdownGrouped.length > 0 && (
                <View style={[styles.materialsBreakdown, { borderTopColor: colors.border }]}>
                  <Text style={[styles.materialsBreakdownTitle, dynamicStyles.materialsBreakdownTitle]}>BY ITEM</Text>
                  {loadoutBreakdownGrouped.map(({ rarity, items }) => (
                    <View key={rarity} style={styles.materialsRarityGroup}>
                      <Text style={[styles.materialsRarityHeader, { color: (WEAPON_RARITY_COLORS as Record<string, string>)[rarity] ?? colors.primary }]}>
                        {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                      </Text>
                      {items.map(({ key, name, imageKey, recipe }) => {
                        const src = getItemSource(imageKey);
                        return (
                          <View key={key} style={styles.materialsBreakdownRow}>
                            <View style={styles.materialsBreakdownLeft}>
                              {src ? <Image source={src} style={styles.materialsBreakdownImg} resizeMode="contain" /> : null}
                              <Text style={[styles.materialsBreakdownItemName, dynamicStyles.materialsBreakdownItemName]} numberOfLines={1}>{name}</Text>
                            </View>
                            <Text style={[styles.materialsBreakdownRecipe, dynamicStyles.materialsBreakdownRecipe]}>{recipe.map(({ material: m, quantity: q }) => `${m} ×${q}`).join(', ')}</Text>
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal visible={augmentModalVisible} transparent animationType="fade">
        <View style={dynamicStyles.modalOverlay}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={() => setAugmentModalVisible(false)} />
          <View style={dynamicStyles.modalCard}>
            <Text style={dynamicStyles.modalTitle}>Select Augment</Text>
            <TextInput style={dynamicStyles.modalSearch} value={augmentSearch} onChangeText={setAugmentSearch} placeholder="Search augments..." placeholderTextColor={colors.textSecondary} />
            <View style={{ marginBottom: 10 }}>
              <TouchableOpacity style={dynamicStyles.modalFilterTrigger} onPress={() => setAugmentFilterOpen((o) => !o)} activeOpacity={0.7}>
                <Text style={dynamicStyles.modalFilterTriggerText}>{augmentCategory}</Text>
                <Ionicons name={augmentFilterOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
              </TouchableOpacity>
              {augmentFilterOpen && (
                <View style={dynamicStyles.modalFilterOptions}>
                  {AUGMENT_CATEGORIES.map((c) => (
                    <TouchableOpacity key={c} style={dynamicStyles.modalFilterOption} onPress={() => { setAugmentCategory(c); setAugmentFilterOpen(false); }}>
                      <Text style={[dynamicStyles.modalFilterOptionText, augmentCategory === c && dynamicStyles.modalFilterOptionTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <FlatList
              data={filteredAugments}
              keyExtractor={(a) => a.id}
              style={dynamicStyles.modalList}
              renderItem={({ item }) => {
                const src = getAugmentImageSource(item.id);
                return (
                  <TouchableOpacity style={dynamicStyles.modalOption} onPress={() => onSelectAugment(item)}>
                    <View style={styles.optionThumbWrap}>
                      {src ? <Image source={src} style={styles.optionThumb} resizeMode="contain" /> : null}
                    </View>
                    <View style={styles.optionLeft}>
                      <Text style={dynamicStyles.modalOptionText}>{item.name}</Text>
                      <Text style={dynamicStyles.modalOptionSub}>
                        B:{item.backpack} S:{item.safePocket} Q:{item.quickUse}  ·  {item.weightLimit} kg
                        {item.augmentedSlots ? `  ·  ${item.augmentedSlots}` : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={weaponModalVisible} transparent animationType="fade">
        <View style={dynamicStyles.modalOverlay}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={() => setWeaponModalSlot(null)} />
          <View style={dynamicStyles.modalCard}>
            <Text style={dynamicStyles.modalTitle}>Select Weapon {weaponModalSlot === 1 ? '1' : '2'}</Text>
            <TouchableOpacity style={dynamicStyles.modalOption} onPress={() => onSelectWeapon(null)}>
              <View style={styles.optionLeft}>
                <Text style={dynamicStyles.modalOptionText}>None</Text>
              </View>
            </TouchableOpacity>
            <TextInput style={dynamicStyles.modalSearch} value={weaponSearch} onChangeText={setWeaponSearch} placeholder="Search weapons..." placeholderTextColor={colors.textSecondary} />
            <View style={{ marginBottom: 10 }}>
              <TouchableOpacity style={dynamicStyles.modalFilterTrigger} onPress={() => setWeaponFilterOpen((o) => !o)} activeOpacity={0.7}>
                <Text style={dynamicStyles.modalFilterTriggerText}>{weaponCategory}</Text>
                <Ionicons name={weaponFilterOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
              </TouchableOpacity>
              {weaponFilterOpen && (
                <View style={dynamicStyles.modalFilterOptions}>
                  {WEAPON_CATEGORIES.map((c) => (
                    <TouchableOpacity key={c} style={dynamicStyles.modalFilterOption} onPress={() => { setWeaponCategory(c); setWeaponFilterOpen(false); }}>
                      <Text style={[dynamicStyles.modalFilterOptionText, weaponCategory === c && dynamicStyles.modalFilterOptionTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <FlatList
              data={filteredWeapons}
              keyExtractor={(w) => w.id}
              style={dynamicStyles.modalList}
              renderItem={({ item }) => {
                const src = getItemSource(WEAPON_IMAGE_KEYS[item.id] ?? item.id);
                return (
                  <TouchableOpacity style={dynamicStyles.modalOption} onPress={() => onSelectWeapon(item)}>
                    <View style={styles.optionThumbWrap}>
                      {src ? <Image source={src} style={styles.optionThumb} resizeMode="contain" /> : null}
                    </View>
                    <View style={styles.optionLeft}>
                      <Text style={[dynamicStyles.modalOptionText, { color: item.color }]}>{item.name}</Text>
                      <Text style={dynamicStyles.modalOptionSub}>
                        {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}  ·  {item.weight} kg
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={itemModal != null} transparent animationType="fade">
        <View style={dynamicStyles.modalOverlay}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={() => setItemModal(null)} />
          <View style={dynamicStyles.modalCard}>
            <Text style={dynamicStyles.modalTitle}>
              {itemModal?.kind === 'backpack' ? 'Select for Backpack' : 'Select for Quick Use'}
            </Text>
            <TouchableOpacity style={dynamicStyles.modalOption} onPress={() => onSelectItem(null)}>
              <View style={styles.optionLeft}>
                <Text style={dynamicStyles.modalOptionText}>None</Text>
              </View>
            </TouchableOpacity>
            <TextInput style={dynamicStyles.modalSearch} value={itemSearch} onChangeText={setItemSearch} placeholder="Search items..." placeholderTextColor={colors.textSecondary} />
            <View style={{ marginBottom: 10 }}>
              <TouchableOpacity style={dynamicStyles.modalFilterTrigger} onPress={() => setItemFilterOpen((o) => !o)} activeOpacity={0.7}>
                <Text style={dynamicStyles.modalFilterTriggerText}>{itemCategory}</Text>
                <Ionicons name={itemFilterOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
              </TouchableOpacity>
              {itemFilterOpen && (
                <ScrollView style={[dynamicStyles.modalFilterOptions, { maxHeight: 160 }]} nestedScrollEnabled>
                  {itemCategories.map((c) => (
                    <TouchableOpacity key={c} style={dynamicStyles.modalFilterOption} onPress={() => { setItemCategory(c); setItemFilterOpen(false); }}>
                      <Text style={[dynamicStyles.modalFilterOptionText, itemCategory === c && dynamicStyles.modalFilterOptionTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
            <FlatList
              data={filteredItems}
              keyExtractor={(i) => i.id}
              style={dynamicStyles.modalList}
              renderItem={({ item }) => {
                const imgKey = BACKPACK_IMAGE_ALIAS[item.id] ?? item.id;
                const src = getItemSource(imgKey);
                return (
                  <TouchableOpacity style={dynamicStyles.modalOption} onPress={() => onSelectItem(item)}>
                    <View style={styles.optionThumbWrap}>
                      {src ? <Image source={src} style={styles.optionThumb} resizeMode="contain" /> : null}
                    </View>
                    <View style={styles.optionLeft}>
                      <Text style={[dynamicStyles.modalOptionText, { color: item.rarityColor }]}>{item.name}</Text>
                      <Text style={dynamicStyles.modalOptionSub}>
                        {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}  ·  {item.category}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={shieldModalVisible} transparent animationType="fade">
        <View style={dynamicStyles.modalOverlay}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={() => setShieldModalVisible(false)} />
          <View style={dynamicStyles.modalCard}>
            <Text style={dynamicStyles.modalTitle}>Select Shield</Text>
            <TouchableOpacity style={dynamicStyles.modalOption} onPress={() => onSelectShield(null)}>
              <View style={styles.optionLeft}>
                <Text style={dynamicStyles.modalOptionText}>None</Text>
              </View>
            </TouchableOpacity>
            <TextInput style={dynamicStyles.modalSearch} value={shieldSearch} onChangeText={setShieldSearch} placeholder="Search shields..." placeholderTextColor={colors.textSecondary} />
            <View style={{ marginBottom: 10 }}>
              <TouchableOpacity style={dynamicStyles.modalFilterTrigger} onPress={() => setShieldFilterOpen((o) => !o)} activeOpacity={0.7}>
                <Text style={dynamicStyles.modalFilterTriggerText}>{shieldCategory}</Text>
                <Ionicons name={shieldFilterOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
              </TouchableOpacity>
              {shieldFilterOpen && (
                <View style={dynamicStyles.modalFilterOptions}>
                  {SHIELD_CATEGORIES.map((c) => (
                    <TouchableOpacity key={c} style={dynamicStyles.modalFilterOption} onPress={() => { setShieldCategory(c); setShieldFilterOpen(false); }}>
                      <Text style={[dynamicStyles.modalFilterOptionText, shieldCategory === c && dynamicStyles.modalFilterOptionTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <FlatList
              data={filteredShields}
              keyExtractor={(s) => s.id}
              style={dynamicStyles.modalList}
              renderItem={({ item }) => {
                const src = getItemSource(SHIELD_IMAGE_KEYS[item.id] ?? item.id);
                return (
                  <TouchableOpacity style={dynamicStyles.modalOption} onPress={() => onSelectShield(item)}>
                    <View style={styles.optionThumbWrap}>
                      {src ? <Image source={src} style={styles.optionThumb} resizeMode="contain" /> : null}
                    </View>
                    <View style={styles.optionLeft}>
                      <Text style={dynamicStyles.modalOptionText}>{item.name}</Text>
                      <Text style={dynamicStyles.modalOptionSub}>
                        {item.shieldCharge} charge  ·  {item.damageMitigation}  ·  {item.weight} kg  ·  {item.movementPenalty}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={attachmentModalVisible} transparent animationType="fade">
        <View style={dynamicStyles.modalOverlay}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={() => setAttachmentModal(null)} />
          <View style={dynamicStyles.modalCard}>
            <Text style={dynamicStyles.modalTitle}>
              Select Attachment - {attachmentModal?.modSlotType}
            </Text>
            <TouchableOpacity style={dynamicStyles.modalOption} onPress={() => onSelectAttachment(null)}>
              <View style={styles.optionLeft}>
                <Text style={dynamicStyles.modalOptionText}>None</Text>
              </View>
            </TouchableOpacity>
            <TextInput 
              style={dynamicStyles.modalSearch} 
              value={attachmentSearch} 
              onChangeText={setAttachmentSearch} 
              placeholder="Search attachments..." 
              placeholderTextColor={colors.textSecondary} 
            />
            <FlatList
              data={filteredAttachments}
              keyExtractor={(a) => a.id}
              style={dynamicStyles.modalList}
              renderItem={({ item }) => {
                const src = getItemImageSource(item.name);
                return (
                  <TouchableOpacity style={dynamicStyles.modalOption} onPress={() => onSelectAttachment(item)}>
                    <View style={styles.optionThumbWrap}>
                      {src ? <Image source={src} style={styles.optionThumb} resizeMode="contain" /> : null}
                    </View>
                    <View style={styles.optionLeft}>
                      <Text style={dynamicStyles.modalOptionText}>{item.name}</Text>
                      <Text style={dynamicStyles.modalOptionSub}>
                        {item.modSlot}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={loadoutsModalVisible} transparent animationType="fade">
        <View style={dynamicStyles.modalOverlay}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={() => setLoadoutsModalVisible(false)} />
          <View style={dynamicStyles.modalCard}>
            <Text style={dynamicStyles.modalTitle}>Saved Loadouts</Text>
            <TouchableOpacity 
              style={[styles.btnImport, dynamicStyles.btnImport, { marginBottom: 12 }]} 
              onPress={() => {
                setSaveLoadoutName('');
                setSaveLoadoutModalVisible(true);
              }} 
              activeOpacity={0.7}
            >
              <Text style={[styles.btnImportText, dynamicStyles.btnImportText]}>Save Current Loadout</Text>
            </TouchableOpacity>
            {savedLoadouts.length === 0 ? (
              <Text style={[dynamicStyles.modalOptionText, { textAlign: 'center', padding: 20, color: colors.textSecondary }]}>
                No saved loadouts. Save your first loadout to get started!
              </Text>
            ) : (
              <FlatList
                data={savedLoadouts.sort((a, b) => b.createdAt - a.createdAt)}
                keyExtractor={(item) => item.id}
                style={dynamicStyles.modalList}
                renderItem={({ item }) => {
                  const date = new Date(item.createdAt);
                  const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <View style={[dynamicStyles.modalOption, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                      <TouchableOpacity 
                        style={{ flex: 1 }} 
                        onPress={() => onLoadLoadout(item)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.optionLeft}>
                          <Text style={dynamicStyles.modalOptionText}>{item.name}</Text>
                          <Text style={dynamicStyles.modalOptionSub}>{dateStr}</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => onDeleteLoadout(item.id)}
                        style={{ padding: 8 }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            )}
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
              <TouchableOpacity style={[styles.btnExport, dynamicStyles.btnExport]} onPress={() => setLoadoutsModalVisible(false)}>
                <Text style={[styles.btnExportText, dynamicStyles.btnExportText]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={saveLoadoutModalVisible} transparent animationType="fade">
        <View style={dynamicStyles.modalOverlay}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={() => setSaveLoadoutModalVisible(false)} />
          <View style={dynamicStyles.modalCard}>
            <Text style={dynamicStyles.modalTitle}>Save Loadout</Text>
            <Text style={[dynamicStyles.modalOptionSub, { marginBottom: 12 }]}>Enter a name for this loadout:</Text>
            <TextInput 
              style={[dynamicStyles.modalSearch, { marginBottom: 12 }]} 
              value={saveLoadoutName} 
              onChangeText={setSaveLoadoutName} 
              placeholder="Loadout name..." 
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
              <TouchableOpacity style={[styles.btnExport, dynamicStyles.btnExport]} onPress={() => setSaveLoadoutModalVisible(false)}>
                <Text style={[styles.btnExportText, dynamicStyles.btnExportText]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnImport, dynamicStyles.btnImport]} onPress={onSaveLoadout}>
                <Text style={[styles.btnImportText, dynamicStyles.btnImportText]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={exportModalVisible} transparent animationType="fade">
        <View style={dynamicStyles.modalOverlay}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={() => setExportModalVisible(false)} />
          <View style={dynamicStyles.modalCard}>
            <Text style={dynamicStyles.modalTitle}>Loadout Code</Text>
            <Text style={dynamicStyles.modalCodeHint}>Share this code to save or transfer your loadout.</Text>
            <TextInput style={dynamicStyles.modalCodeInput} value={exportCode} editable={false} multiline placeholder="" />
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
              <TouchableOpacity style={[styles.btnImport, dynamicStyles.btnImport]} onPress={onExportCopy}>
                <Text style={[styles.btnImportText, dynamicStyles.btnImportText]}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnExport, dynamicStyles.btnExport]} onPress={() => setExportModalVisible(false)}>
                <Text style={[styles.btnExportText, dynamicStyles.btnExportText]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={importModalVisible} transparent animationType="fade">
        <View style={dynamicStyles.modalOverlay}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={() => setImportModalVisible(false)} />
          <View style={dynamicStyles.modalCard}>
            <Text style={dynamicStyles.modalTitle}>Import Loadout</Text>
            <Text style={dynamicStyles.modalCodeHint}>Paste a loadout code below.</Text>
            <TextInput style={[dynamicStyles.modalCodeInput, { minHeight: 80 }]} value={importCode} onChangeText={setImportCode} placeholder="Paste code here..." placeholderTextColor={colors.textSecondary} multiline />
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
              <TouchableOpacity style={[styles.btnImport, dynamicStyles.btnImport]} onPress={onImportApply}>
                <Text style={[styles.btnImportText, dynamicStyles.btnImportText]}>Import</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnExport, dynamicStyles.btnExport]} onPress={() => setImportModalVisible(false)}>
                <Text style={[styles.btnExportText, dynamicStyles.btnExportText]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Modal styles moved to dynamicStyles

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 56, paddingHorizontal: 12 },
  scrollContentDesktop: { maxWidth: 1400, alignSelf: 'center', width: '100%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flex: 1 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: 0.5 },
  titleIcon: { marginTop: 6 },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  btnExport: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, borderWidth: 1 },
  btnExportText: { fontSize: 12, fontWeight: '600' },
  btnImport: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  btnReset: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  btnImportText: { fontSize: 12, fontWeight: '700' },
  btnResetText: { fontSize: 12, fontWeight: '700' },
  weightRow: { marginBottom: 12 },
  weightLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.1, marginBottom: 4 },
  weightValue: { fontSize: 12, marginBottom: 6 },
  weightOver: {},
  weightBarBg: { width: '20%', height: 4, borderRadius: 2, overflow: 'hidden' },
  weightBarFill: { height: '100%', borderRadius: 2 },
  weightBarOver: {},
  columns: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  col: { flex: 1, minWidth: 100 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  sectionLabelBlock: { marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  slotCount: { fontSize: 10, letterSpacing: 0.5 },
  eqTopRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  slotSmall: { flex: 1, aspectRatio: 1.1, maxHeight: 80, borderWidth: 1, borderRadius: 4, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: 4 },
  slotSmallImg: { width: 28, height: 28 },
  slotLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 0.8, marginBottom: 2 },
  augmentName: { fontSize: 9, textAlign: 'center' },
  shieldName: { fontSize: 9, textAlign: 'center' },
  shieldCompat: { fontSize: 7, textAlign: 'center', marginTop: 2 },
  augmentedRow: { marginBottom: 8 },
  augmentedLabel: { fontSize: 9, letterSpacing: 0.6 },
  weaponSlots: { gap: 8 },
  slotWeapon: { flex: 1, minHeight: 100, position: 'relative', borderWidth: 1, borderRadius: 4, overflow: 'hidden', padding: 6 },
  weaponSlotTouchable: { flex: 1 },
  weaponPlaceholderWrap: { flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  weaponLevelWrap: { position: 'absolute', bottom: 4, right: 4, flexDirection: 'row', gap: 2, zIndex: 10 },
  weaponLevelBtn: { paddingVertical: 2, paddingHorizontal: 5, borderWidth: 1, borderRadius: 4 },
  weaponLevelBtnActive: {},
  weaponLevelBtnText: { fontSize: 10, fontWeight: '600' },
  weaponLevelBtnTextActive: {},
  weaponImg: { width: '100%', height: '100%', minHeight: 48 },
  weaponName: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  weaponModSlots: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4, justifyContent: 'center' },
  weaponModSlot: { width: 24, height: 24, borderWidth: 1, borderRadius: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.1)' },
  weaponModSlotEquipped: { backgroundColor: 'rgba(0,255,0,0.2)', borderWidth: 2 },
  weaponModSlotIcon: { width: 18, height: 18 },
  rarityBgFull: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  slotContent: { flex: 1, padding: 6, alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center' },
  backpackSlot: { width: '100%', height: '100%', borderWidth: 1, borderRadius: 4, overflow: 'hidden', backgroundColor: 'transparent', position: 'relative' },
  quickUseSlot: { width: '100%', height: '100%', borderWidth: 1, borderRadius: 4, overflow: 'hidden', backgroundColor: 'transparent', position: 'relative' },
  slotTouchable: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  slotGridImg: { width: '100%', height: '100%' },
  slotQty: { position: 'absolute', bottom: 2, right: 2, fontSize: 9, fontWeight: '700', color: '#fff', textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  quantityControls: {
    position: 'absolute',
    top: 2,
    right: 2,
    flexDirection: 'row',
    gap: 2,
    zIndex: 10,
  },
  quantityBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  plusSymbol: { fontSize: 20, fontWeight: '300' },
  augmentedSlotsWrap: { marginTop: 16 },
  augmentedSlotsRow: { flexDirection: 'row', gap: 8 },
  augmentedSlot: { width: CELL_SIZE, height: CELL_SIZE, borderWidth: 1, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  safePocketWrap: { marginTop: 16 },
  safePocketRow: { flexDirection: 'row', gap: 8 },
  safePocketSlot: { width: CELL_SIZE, height: CELL_SIZE, borderWidth: 1, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  materialsWrap: { marginTop: 20, paddingTop: 16, paddingHorizontal: 4, borderTopWidth: 1 },
  materialsTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, marginBottom: 16, textTransform: 'uppercase' },
  materialsEmpty: { fontSize: 12 },
  materialsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  materialsItemCard: {
    width: 100,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  materialsItemImg: { width: 48, height: 48, marginBottom: 6 },
  materialsItemContent: {
    alignItems: 'center',
    width: '100%',
  },
  materialsItemName: { 
    fontSize: 11, 
    textAlign: 'center',
    marginBottom: 4,
    minHeight: 32,
  },
  materialsItemQty: {
    fontSize: 13,
    fontWeight: '700',
  },
  materialsRow: { fontSize: 12 },
  materialsBreakdown: { marginTop: 16, paddingTop: 12, borderTopWidth: 1 },
  materialsBreakdownTitle: { fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  materialsRarityGroup: { marginBottom: 16 },
  materialsRarityHeader: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' },
  materialsBreakdownRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 },
  materialsBreakdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  materialsBreakdownImg: { width: 48, height: 48 },
  materialsBreakdownItemName: { fontSize: 12, flex: 1, minWidth: 0 },
  materialsBreakdownRecipe: { fontSize: 11, flex: 1, textAlign: 'right' },
  optionLeft: { flex: 1 },
  optionThumbWrap: { width: 40, height: 40, marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  optionThumb: { width: 36, height: 36 },
  bottomSpacer: { height: 24 },
});
