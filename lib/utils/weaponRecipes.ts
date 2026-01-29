/**
 * Weapon recipe resolution for stash optimizer: level 1–4 ingredients.
 * Mirrors planner weapon logic (base recipe + upgrade steps).
 */

const RECIPES_RAW = require('../../data/recipes.json');

type RecipeFormat =
  | { material: string; quantity: number }[]
  | { output?: number; ingredients: { material: string; quantity: number }[] };

const RECIPES: Record<string, RecipeFormat> = RECIPES_RAW;

function getRecipeData(recipe: RecipeFormat | undefined): { ingredients: { material: string; quantity: number }[] } {
  if (!recipe) return { ingredients: [] };
  if (Array.isArray(recipe)) return { ingredients: recipe };
  return { ingredients: recipe.ingredients || [] };
}

/** Weapons that cannot be upgraded (only level 1). */
const WEAPONS_NO_UPGRADE = new Set(['aphelion', 'jupiter', 'equalizer']);

/** Upgrade materials per step: 1→2, 2→3, 3→4. */
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

/** Weapon display name (base or "X I/II/III/IV") -> weapon id. */
const WEAPON_ITEM_TO_ID: Record<string, string> = {};
const WEAPON_IDS = [
  'jupiter', 'equalizer', 'aphelion', 'bobcat', 'tempest', 'vulcano', 'bettina', 'hullcracker',
  'torrente', 'venator', 'renegade', 'osprey', 'il_toro', 'burletta', 'arpegio', 'anvil', 'stitcher',
  'kettle', 'hairpin', 'ferro', 'rattler',
];
const WEAPON_BASE_NAMES: Record<string, string> = {
  jupiter: 'Jupiter', equalizer: 'Equalizer', aphelion: 'Aphelion', bobcat: 'Bobcat', tempest: 'Tempest',
  vulcano: 'Vulcano', bettina: 'Bettina', hullcracker: 'Hullcracker', torrente: 'Torrente', venator: 'Venator',
  renegade: 'Renegade', osprey: 'Osprey', il_toro: 'Il Toro', burletta: 'Burletta', arpegio: 'Arpeggio',
  anvil: 'Anvil', stitcher: 'Stitcher', kettle: 'Kettle', hairpin: 'Hairpin', ferro: 'Ferro', rattler: 'Rattler',
};
const ROMAN = ['I', 'II', 'III', 'IV'];
WEAPON_IDS.forEach((id) => {
  const baseName = WEAPON_BASE_NAMES[id];
  if (baseName) {
    WEAPON_ITEM_TO_ID[baseName] = id;
    ROMAN.forEach((r, i) => {
      WEAPON_ITEM_TO_ID[`${baseName} ${r}`] = id;
    });
  }
});

/** Get weapon id from item name (e.g. "Bettina I" -> "bettina"), or null if not a leveled weapon. */
export function getWeaponIdFromItemName(itemName: string): string | null {
  return WEAPON_ITEM_TO_ID[itemName] ?? null;
}

/** Whether this item is a leveled weapon (has level 1–4). */
export function isLeveledWeapon(itemName: string): boolean {
  const id = getWeaponIdFromItemName(itemName);
  if (!id) return false;
  return !WEAPONS_NO_UPGRADE.has(id) && WEAPON_UPGRADES[id] != null;
}

/** Base recipe name in RECIPES for this weapon (e.g. "bettina" -> "Bettina"). */
function getBaseRecipeName(weaponId: string): string {
  return WEAPON_BASE_NAMES[weaponId] ?? weaponId;
}

/** Get combined ingredients for crafting this weapon at the given level (1–4). */
export function getWeaponIngredientsForLevel(
  weaponId: string,
  level: number
): { material: string; quantity: number }[] {
  const baseName = getBaseRecipeName(weaponId);
  const baseRecipe = RECIPES[baseName];
  const { ingredients: base } = getRecipeData(baseRecipe);
  const l = Math.max(1, Math.min(4, Math.floor(level) || 1));
  if (l <= 1) return base;
  if (WEAPONS_NO_UPGRADE.has(weaponId)) return base;
  const up = WEAPON_UPGRADES[weaponId];
  if (!up) return base;
  const combined = new Map<string, number>();
  for (const { material, quantity } of base) combined.set(material, (combined.get(material) ?? 0) + quantity);
  for (let s = 0; s < l - 1 && s < up.length; s++) {
    for (const { material, quantity } of up[s]) {
      combined.set(material, (combined.get(material) ?? 0) + quantity);
    }
  }
  return Array.from(combined.entries(), ([material, quantity]) => ({ material, quantity }))
    .sort((a, b) => a.material.localeCompare(b.material));
}

/** Parse level from item name (e.g. "Bettina III" -> 3). Default 1. */
export function getLevelFromWeaponItemName(itemName: string): number {
  const id = getWeaponIdFromItemName(itemName);
  if (!id) return 1;
  const baseName = WEAPON_BASE_NAMES[id];
  for (let i = 0; i < ROMAN.length; i++) {
    if (itemName === `${baseName} ${ROMAN[i]}`) return i + 1;
  }
  if (itemName === baseName) return 1;
  return 1;
}

/** All display names for a weapon (base + I–IV), lowercased. Use to exclude leveled variants from "Items to Exfil" when the user targets that weapon. */
export function getLeveledVariantNamesForExclusion(itemName: string): string[] {
  const id = getWeaponIdFromItemName(itemName);
  if (!id) return [itemName.trim().toLowerCase()];
  const baseName = WEAPON_BASE_NAMES[id];
  const names = [baseName, ...ROMAN.map((r) => `${baseName} ${r}`)];
  return names.map((n) => n.toLowerCase());
}
