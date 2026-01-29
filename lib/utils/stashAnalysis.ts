import { Material } from '../services/api';
import { getWeaponIdFromItemName, getWeaponIngredientsForLevel } from './weaponRecipes';

// Load data files
const RECIPES_RAW = require('../../data/recipes.json');
const BACKPACK_ITEMS_RAW: Array<{
  Item: string;
  'Stack Size'?: number;
  'Recycles To'?: Array<{ material: string; quantity: number }> | null;
}> = require('../../data/backpack-items.json');
const RECYCLES_RAW = require('../../data/recycles.json');

// Normalize recipes
type RecipeFormat = 
  | { material: string; quantity: number }[]
  | { output?: number; ingredients: { material: string; quantity: number }[] };

const RECIPES: Record<string, RecipeFormat> = RECIPES_RAW;
const RECYCLES: Record<string, Array<{ material: string; quantity: number }>> = RECYCLES_RAW;

// Build lookup maps for quick access
const ITEM_STACK_SIZES: Record<string, number> = {};
const ITEM_RECYCLES: Record<string, Array<{ material: string; quantity: number }>> = {};

BACKPACK_ITEMS_RAW.forEach(item => {
  ITEM_STACK_SIZES[item.Item] = item['Stack Size'] || 1;
  if (item['Recycles To'] && item['Recycles To'].length > 0) {
    ITEM_RECYCLES[item.Item] = item['Recycles To'];
  }
});

// Also add from recycles.json (may have items not in backpack-items.json)
Object.keys(RECYCLES).forEach(itemName => {
  if (!ITEM_RECYCLES[itemName] && RECYCLES[itemName].length > 0) {
    ITEM_RECYCLES[itemName] = RECYCLES[itemName];
  }
});

export interface ItemStashAnalysis {
  itemName: string;
  recipe: Array<{ material: string; quantity: number }>;
  itemStackSize: number;
  materialStackSizes: Record<string, number>;
  efficiencyKeepCrafted: number; // items per slot if keeping crafted item
  efficiencyKeepMaterials: number; // items craftable per slot if keeping materials
  multiUseCount: Record<string, number>; // how many target items use each material
  recyclePathOptions: Array<{
    sourceItem: string;
    sourceStackSize: number;
    recyclesTo: Array<{ material: string; quantity: number }>;
    efficiency: number;
  }>;
  recommendation: 'keep_crafted' | 'keep_materials' | 'keep_recycle_source';
  recommendationReason: string;
}

/**
 * Get stack size for an item (defaults to 1 if not found)
 */
export function getItemStackSize(itemName: string): number {
  return ITEM_STACK_SIZES[itemName] || 1;
}

/**
 * Get recipe data for an item
 */
function getRecipeData(itemName: string): { ingredients: Array<{ material: string; quantity: number }>; output: number } {
  const recipe = RECIPES[itemName];
  if (!recipe) {
    return { ingredients: [], output: 1 };
  }
  
  if (Array.isArray(recipe)) {
    return { ingredients: recipe, output: 1 };
  } else {
    return {
      ingredients: recipe.ingredients || [],
      output: recipe.output ?? 1
    };
  }
}

/**
 * Find all items that recycle INTO a given material
 */
export function findItemsRecyclingToMaterial(materialName: string): Array<{
  itemName: string;
  stackSize: number;
  recycleYield: Array<{ material: string; quantity: number }>;
}> {
  const results: Array<{
    itemName: string;
    stackSize: number;
    recycleYield: Array<{ material: string; quantity: number }>;
  }> = [];

  // Check backpack-items.json
  BACKPACK_ITEMS_RAW.forEach(item => {
    if (item['Recycles To']) {
      const hasMaterial = item['Recycles To'].some(r => r.material === materialName);
      if (hasMaterial) {
        results.push({
          itemName: item.Item,
          stackSize: item['Stack Size'] || 1,
          recycleYield: item['Recycles To'],
        });
      }
    }
  });

  // Check recycles.json
  Object.keys(RECYCLES).forEach(itemName => {
    const recycleYield = RECYCLES[itemName];
    const hasMaterial = recycleYield.some(r => r.material === materialName);
    if (hasMaterial && !results.find(r => r.itemName === itemName)) {
      results.push({
        itemName,
        stackSize: getItemStackSize(itemName),
        recycleYield,
      });
    }
  });

  return results;
}

/**
 * Calculate stack efficiency for keeping materials vs keeping crafted item
 */
function calculateStackEfficiency(
  itemName: string,
  recipe: Array<{ material: string; quantity: number }>,
  recipeOutput: number
): { keepCrafted: number; keepMaterials: number } {
  const itemStackSize = getItemStackSize(itemName);
  const keepCrafted = itemStackSize; // items per slot if keeping crafted

  // For keepMaterials, we need to find the bottleneck material
  // (the one that limits how many items we can craft per slot)
  let minItemsPerSlot = Infinity;

  for (const { material, quantity } of recipe) {
    const materialStackSize = getItemStackSize(material);
    if (materialStackSize === 0) continue; // Skip if material not found
    
    // How many items can we craft per slot if we only had this material?
    // One slot of material = materialStackSize units
    // We need quantity units per craft
    // So: (materialStackSize / quantity) * recipeOutput items per slot
    const itemsPerSlotForThisMaterial = (materialStackSize / quantity) * recipeOutput;
    minItemsPerSlot = Math.min(minItemsPerSlot, itemsPerSlotForThisMaterial);
  }

  const keepMaterials = minItemsPerSlot === Infinity ? 0 : minItemsPerSlot;

  return { keepCrafted, keepMaterials };
}

/**
 * Analyze stash options for a target item
 */
export function analyzeItemStashOptions(
  targetItem: string,
  allTargetItems: string[] = []
): ItemStashAnalysis | null {
  const recipeData = getRecipeData(targetItem);
  if (recipeData.ingredients.length === 0) {
    return null; // Item has no recipe
  }

  const itemStackSize = getItemStackSize(targetItem);
  const { keepCrafted, keepMaterials } = calculateStackEfficiency(
    targetItem,
    recipeData.ingredients,
    recipeData.output
  );

  // Calculate multi-use count for each material
  const multiUseCount: Record<string, number> = {};
  recipeData.ingredients.forEach(({ material }) => {
    multiUseCount[material] = 0;
    allTargetItems.forEach(otherItem => {
      if (otherItem === targetItem) return;
      const otherRecipe = getRecipeData(otherItem);
      const usesMaterial = otherRecipe.ingredients.some(ing => ing.material === material);
      if (usesMaterial) {
        multiUseCount[material]++;
      }
    });
  });

  // Find recycle path options for each material
  const recyclePathOptions: Array<{
    sourceItem: string;
    sourceStackSize: number;
    recyclesTo: Array<{ material: string; quantity: number }>;
    efficiency: number;
  }> = [];

  recipeData.ingredients.forEach(({ material, quantity }) => {
    const itemsRecyclingToMaterial = findItemsRecyclingToMaterial(material);
    itemsRecyclingToMaterial.forEach(({ itemName, stackSize, recycleYield }) => {
      // Find how much of the material this item recycles to
      const materialYield = recycleYield.find(r => r.material === material);
      if (!materialYield) return;

      // Calculate efficiency: if we keep this higher-tier item, how many target items can we craft per slot?
      // One slot = stackSize units of source item
      // Each source item recycles to materialYield.quantity units of material
      // We need quantity units of material per craft
      // So: (stackSize * materialYield.quantity / quantity) * recipeOutput items per slot
      const efficiency = (stackSize * materialYield.quantity / quantity) * recipeData.output;

      // Only suggest if it's better than keeping the material directly
      const materialStackSize = getItemStackSize(material);
      const directMaterialEfficiency = (materialStackSize / quantity) * recipeData.output;
      
      if (efficiency > directMaterialEfficiency && efficiency > keepCrafted) {
        recyclePathOptions.push({
          sourceItem: itemName,
          sourceStackSize: stackSize,
          recyclesTo: recycleYield,
          efficiency,
        });
      }
    });
  });

  // Sort recycle paths by efficiency (best first)
  recyclePathOptions.sort((a, b) => b.efficiency - a.efficiency);

  // Determine recommendation
  let recommendation: 'keep_crafted' | 'keep_materials' | 'keep_recycle_source' = 'keep_crafted';
  let recommendationReason = '';

  // Check if any material is multi-use
  const hasMultiUse = Object.values(multiUseCount).some(count => count > 0);
  const maxMultiUse = Math.max(...Object.values(multiUseCount), 0);

  // Check recycle path
  if (recyclePathOptions.length > 0) {
    const bestRecyclePath = recyclePathOptions[0];
    recommendation = 'keep_recycle_source';
    recommendationReason = `Keep ${bestRecyclePath.sourceItem} instead - recycles to ${bestRecyclePath.recyclesTo.find(r => recipeData.ingredients.some(ing => ing.material === r.material))?.material || 'materials'} (${bestRecyclePath.efficiency.toFixed(1)} items/slot vs ${keepCrafted.toFixed(1)} for crafted)`;
  } else if (hasMultiUse && keepMaterials >= keepCrafted) {
    // Materials are used in multiple crafts and efficiency is at least as good
    const multiUseMaterials = Object.entries(multiUseCount)
      .filter(([_, count]) => count > 0)
      .map(([material]) => material);
    recommendation = 'keep_materials';
    recommendationReason = `Keep materials (${multiUseMaterials.join(', ')}) - used in ${maxMultiUse + 1} craft${maxMultiUse + 1 > 1 ? 's' : ''} and ${keepMaterials >= keepCrafted ? 'same or better' : 'similar'} efficiency`;
  } else if (keepMaterials > keepCrafted) {
    recommendation = 'keep_materials';
    recommendationReason = `Keep materials - better efficiency (${keepMaterials.toFixed(1)} items/slot vs ${keepCrafted.toFixed(1)})`;
  } else {
    recommendation = 'keep_crafted';
    recommendationReason = `Keep ${targetItem} - better efficiency (${keepCrafted.toFixed(1)} items/slot vs ${keepMaterials.toFixed(1)})`;
  }

  // Build material stack sizes map
  const materialStackSizes: Record<string, number> = {};
  recipeData.ingredients.forEach(({ material }) => {
    materialStackSizes[material] = getItemStackSize(material);
  });

  return {
    itemName: targetItem,
    recipe: recipeData.ingredients,
    itemStackSize,
    materialStackSizes,
    efficiencyKeepCrafted: keepCrafted,
    efficiencyKeepMaterials: keepMaterials,
    multiUseCount,
    recyclePathOptions: recyclePathOptions.slice(0, 3), // Top 3 options
    recommendation,
    recommendationReason,
  };
}

/**
 * Analyze multiple target items and return combined analysis
 */
export function analyzeMultipleItems(targetItems: string[]): ItemStashAnalysis[] {
  return targetItems
    .map(item => analyzeItemStashOptions(item, targetItems))
    .filter((analysis): analysis is ItemStashAnalysis => analysis !== null);
}

export interface MaterialStackSuggestion {
  material: string;
  needed: number;
  stackSize: number;
  stacks: number;
  totalInStacks: number;
}

export interface RecycleSourceStackSuggestion {
  sourceItem: string;
  sourceStackSize: number;
  recyclesToMaterial: string;
  recyclesToQuantity: number;
  materialNeeded: number;
  unitsOfSourceNeeded: number;
  stacksOfSourceNeeded: number;
  totalMaterialFromStacks: number;
}

/**
 * Get suggested stack counts for crafting `quantity` of `itemName`.
 * For leveled weapons, pass `level` (1–4) to use that tier's recipe.
 */
export function getSuggestedStacksForItem(
  itemName: string,
  quantity: number,
  level?: number
): {
  materialSuggestions: MaterialStackSuggestion[];
  recycleSourceSuggestions: RecycleSourceStackSuggestion[];
} {
  let ingredients: Array<{ material: string; quantity: number }>;
  const weaponId = getWeaponIdFromItemName(itemName);
  if (weaponId != null && level != null && level >= 1 && level <= 4) {
    ingredients = getWeaponIngredientsForLevel(weaponId, level);
  } else {
    const recipeData = getRecipeData(itemName);
    ingredients = recipeData.ingredients;
  }
  if (ingredients.length === 0) {
    return { materialSuggestions: [], recycleSourceSuggestions: [] };
  }

  const materialSuggestions: MaterialStackSuggestion[] = ingredients.map(
    ({ material, quantity: qtyPerCraft }) => {
      const needed = qtyPerCraft * quantity;
      const stackSize = getItemStackSize(material);
      const stacks = Math.max(1, Math.ceil(needed / stackSize));
      const totalInStacks = stacks * stackSize;
      return { material, needed, stackSize, stacks, totalInStacks };
    }
  );

  const recycleSourceSuggestions: RecycleSourceStackSuggestion[] = [];
  ingredients.forEach(({ material, quantity: qtyPerCraft }) => {
    const materialNeeded = qtyPerCraft * quantity;
    const sources = findItemsRecyclingToMaterial(material);
    sources.forEach(({ itemName: sourceItem, stackSize: sourceStackSize, recycleYield }) => {
      const entry = recycleYield.find(r => r.material === material);
      if (!entry) return;
      const recyclesToQuantity = entry.quantity;
      const unitsOfSourceNeeded = Math.ceil(materialNeeded / recyclesToQuantity);
      const stacksOfSourceNeeded = Math.max(1, Math.ceil(unitsOfSourceNeeded / sourceStackSize));
      const totalMaterialFromStacks = stacksOfSourceNeeded * sourceStackSize * recyclesToQuantity;
      recycleSourceSuggestions.push({
        sourceItem,
        sourceStackSize,
        recyclesToMaterial: material,
        recyclesToQuantity,
        materialNeeded,
        unitsOfSourceNeeded,
        stacksOfSourceNeeded,
        totalMaterialFromStacks,
      });
    });
  });

  return { materialSuggestions, recycleSourceSuggestions };
}

/**
 * Aggregate material stacks needed across multiple target items with quantities.
 * For leveled weapons, pass targetLevels (1–4) so the correct tier recipe is used.
 */
export function aggregateMaterialStacks(
  targetItems: string[],
  targetQuantities: Record<string, number>,
  targetLevels?: Record<string, number>
): {
  totalStashSlots: number;
  materialStacks: Array<{
    material: string;
    totalNeeded: number;
    stackSize: number;
    stacks: number;
    totalInStacks: number;
  }>;
} {
  const materialTotals: Record<string, number> = {};

  targetItems.forEach(itemName => {
    const quantity = targetQuantities[itemName] ?? 1;
    const level = targetLevels?.[itemName];
    const { materialSuggestions } = getSuggestedStacksForItem(itemName, quantity, level);
    materialSuggestions.forEach(ms => {
      materialTotals[ms.material] = (materialTotals[ms.material] || 0) + ms.needed;
    });
  });

  // Calculate stacks for each material
  const materialStacks = Object.entries(materialTotals).map(([material, totalNeeded]) => {
    const stackSize = getItemStackSize(material);
    const stacks = Math.max(1, Math.ceil(totalNeeded / stackSize));
    const totalInStacks = stacks * stackSize;
    return { material, totalNeeded, stackSize, stacks, totalInStacks };
  });

  // Total stash slots = sum of stacks
  const totalStashSlots = materialStacks.reduce((sum, ms) => sum + ms.stacks, 0);

  return { totalStashSlots, materialStacks };
}
