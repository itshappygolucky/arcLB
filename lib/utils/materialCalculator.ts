import { Material } from '../services/api';

const RECIPES_RAW = require('../../data/recipes.json');

// Normalize recipes to handle both old format (array) and new format (object with output and ingredients)
type RecipeFormat = 
  | { material: string; quantity: number }[] // Old format
  | { output?: number; ingredients: { material: string; quantity: number }[] }; // New format

const RECIPES: Record<string, RecipeFormat> = RECIPES_RAW;

// Helper to get recipe ingredients and output quantity
function getRecipeData(recipe: RecipeFormat): { ingredients: { material: string; quantity: number }[]; output: number } {
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

/**
 * Recursively resolve a material to raw materials.
 * Returns null if the material has no recipe (it's already raw).
 */
function resolveMaterialToRaw(
  materialName: string,
  quantity: number,
  visited: Set<string> = new Set(),
): { materials: Material[]; isRaw: boolean } {
  // Prevent infinite loops
  if (visited.has(materialName)) {
    return { materials: [{ name: materialName, quantity }], isRaw: true };
  }
  visited.add(materialName);

  const recipe = RECIPES[materialName];
  if (!recipe) {
    // No recipe means it's a raw material
    return { materials: [{ name: materialName, quantity }], isRaw: true };
  }

  const { ingredients, output } = getRecipeData(recipe);
  if (ingredients.length === 0) {
    return { materials: [{ name: materialName, quantity }], isRaw: true };
  }

  // Calculate how many crafts are needed to produce the required quantity
  const craftsNeeded = Math.ceil(quantity / output);

  // This material has a recipe - break it down
  const rawMaterials = new Map<string, number>();
  for (const { material: ing, quantity: ingQty } of ingredients) {
    const resolved = resolveMaterialToRaw(ing, ingQty * craftsNeeded, new Set(visited));
    for (const { name, quantity: qty } of resolved.materials) {
      rawMaterials.set(name, (rawMaterials.get(name) || 0) + qty);
    }
  }

  return {
    materials: Array.from(rawMaterials.entries(), ([name, qty]) => ({ name, quantity: qty })),
    isRaw: false,
  };
}

/**
 * Recursively resolve a material to raw materials and track which items use each material.
 */
function resolveMaterialToRawWithUsage(
  materialName: string,
  quantity: number,
  sourceItem: string,
  materialUsage: Map<string, Set<string>>,
  visited: Set<string> = new Set(),
): { materials: Material[]; isRaw: boolean } {
  // Prevent infinite loops
  if (visited.has(materialName)) {
    // Track usage even for circular references
    if (!materialUsage.has(materialName)) {
      materialUsage.set(materialName, new Set());
    }
    materialUsage.get(materialName)!.add(sourceItem);
    return { materials: [{ name: materialName, quantity }], isRaw: true };
  }
  visited.add(materialName);

  const recipe = RECIPES[materialName];
  if (!recipe) {
    // No recipe means it's a raw material - track usage
    if (!materialUsage.has(materialName)) {
      materialUsage.set(materialName, new Set());
    }
    materialUsage.get(materialName)!.add(sourceItem);
    return { materials: [{ name: materialName, quantity }], isRaw: true };
  }

  const { ingredients, output } = getRecipeData(recipe);
  if (ingredients.length === 0) {
    if (!materialUsage.has(materialName)) {
      materialUsage.set(materialName, new Set());
    }
    materialUsage.get(materialName)!.add(sourceItem);
    return { materials: [{ name: materialName, quantity }], isRaw: true };
  }

  // Calculate how many crafts are needed to produce the required quantity
  const craftsNeeded = Math.ceil(quantity / output);

  // This material has a recipe - break it down
  const rawMaterials = new Map<string, number>();
  for (const { material: ing, quantity: ingQty } of ingredients) {
    const resolved = resolveMaterialToRawWithUsage(ing, ingQty * craftsNeeded, sourceItem, materialUsage, new Set(visited));
    for (const { name, quantity: qty } of resolved.materials) {
      rawMaterials.set(name, (rawMaterials.get(name) || 0) + qty);
    }
  }

  return {
    materials: Array.from(rawMaterials.entries(), ([name, qty]) => ({ name, quantity: qty })),
    isRaw: false,
  };
}

/**
 * Check if a material is raw (has no recipe).
 */
function isRawMaterial(materialName: string): boolean {
  const recipe = RECIPES[materialName];
  if (!recipe) return true;
  const { ingredients } = getRecipeData(recipe);
  return ingredients.length === 0;
}

/**
 * Get all items that use a given material as an ingredient.
 * This is the inverse lookup: material → items that need it.
 */
export function getItemsUsingMaterial(materialName: string): string[] {
  const items: string[] = [];
  
  for (const [itemName, recipe] of Object.entries(RECIPES)) {
    const { ingredients } = getRecipeData(recipe);
    // Check if this recipe uses the material
    const usesMaterial = ingredients.some(ing => ing.material === materialName);
    if (usesMaterial) {
      items.push(itemName);
    }
  }
  
  return items.sort();
}

/**
 * Get all unique materials that appear as ingredients in recipes.
 * Useful for building a material selector.
 */
export function getAllMaterials(): string[] {
  const materials = new Set<string>();
  
  for (const recipe of Object.values(RECIPES)) {
    const { ingredients } = getRecipeData(recipe);
    for (const ing of ingredients) {
      materials.add(ing.material);
    }
  }
  
  return Array.from(materials).sort();
}

/**
 * Calculate materials needed for items using local recipes.json.
 * Returns direct recipes (intermediate materials) and raw materials.
 */
export function calculateRawMaterialsFromLocal(
  items: string[],
): { 
  directRecipes: Material[]; // Intermediate materials needed (e.g., Advanced Electrical Components, ARC Circuitry)
  rawMaterials: Material[]; // Final raw materials
  processedItems: string[];
  materialUsage: Map<string, Set<string>>; // material name → set of item names using it
} {
  const directMaterials = new Map<string, number>(); // Materials directly from recipes
  const rawMaterials = new Map<string, number>(); // Final raw materials
  const materialUsage = new Map<string, Set<string>>(); // Track which items use each material
  const processedItems: string[] = [];

  for (const itemName of items) {
    const recipe = RECIPES[itemName];
    if (!recipe) {
      continue;
    }

    const { ingredients, output } = getRecipeData(recipe);
    if (ingredients.length === 0) {
      continue;
    }

    processedItems.push(itemName);

    // For items in the favorites list, we assume we need 1 unit of the item
    // Calculate how many crafts are needed (for ammo, this accounts for output quantity)
    const quantityNeeded = 1; // 1 unit of the favorited item
    const craftsNeeded = Math.ceil(quantityNeeded / output);

    // Process each ingredient in the recipe
    for (const { material: ing, quantity: ingQty } of ingredients) {
      const totalIngQty = ingQty * craftsNeeded;
      
      // Add to direct materials (what you need to craft the item)
      directMaterials.set(ing, (directMaterials.get(ing) || 0) + totalIngQty);

      // Track usage for direct materials
      if (!materialUsage.has(ing)) {
        materialUsage.set(ing, new Set());
      }
      materialUsage.get(ing)!.add(itemName);

      // Also resolve to raw materials and track usage
      const resolved = resolveMaterialToRawWithUsage(ing, totalIngQty, itemName, materialUsage);
      for (const { name, quantity: qty } of resolved.materials) {
        rawMaterials.set(name, (rawMaterials.get(name) || 0) + qty);
      }
    }
  }

  // Show ALL direct materials in recipes section (including raw ones like Processor)
  const allDirectMaterials = Array.from(directMaterials.entries())
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // For raw materials, exclude ones that are already shown in direct recipes
  // to avoid duplication
  const directMaterialNames = new Set(directMaterials.keys());
  const finalRawMaterials = Array.from(rawMaterials.entries())
    .filter(([name]) => !directMaterialNames.has(name)) // Exclude materials already in direct recipes
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { 
    directRecipes: allDirectMaterials,
    rawMaterials: finalRawMaterials, 
    processedItems,
    materialUsage
  };
}
