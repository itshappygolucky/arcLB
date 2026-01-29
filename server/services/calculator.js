const db = require('../database/db');

/**
 * Calculate all materials needed for a list of items
 * @param {string[]} itemNames - Array of item names
 * @returns {Object} - Object containing intermediate and raw materials
 */
async function calculateMaterials(itemNames) {
  await db.waitForDb();
  
  const directRequirements = {}; // Direct recipe requirements (what you actually need to craft)
  const intermediateMaterials = {}; // Components like Mechanical Components, Gun Parts (from nested recipes)
  const rawMaterials = {}; // Base materials like Metal, Rubber
  const allItemsNeeded = new Set(); // Track all items needed
  const upgradeChains = []; // Track upgrade chains for each selected item
  
  // Process each item
  for (const itemName of itemNames) {
    const item = await db.getItemByNameOrWeaponFallback(itemName);
    if (!item) {
      console.warn(`Item not found: ${itemName}`);
      continue;
    }
    
    // Build upgrade chain for this item
    const chain = await buildUpgradeChain(item.id);
    if (chain && chain.length > 0) {
      upgradeChains.push({
        targetItem: itemName,
        chain: chain
      });
    }
    
    // Resolve all recipes for this item (including upgrade paths)
    await resolveItemRecipes(item.id, directRequirements, intermediateMaterials, rawMaterials, allItemsNeeded, new Set(), true);
  }
  
  // Convert intermediate materials to raw materials where possible (but keep direct requirements)
  await convertToRawMaterials(intermediateMaterials, rawMaterials, directRequirements);
  
  // Merge direct requirements into intermediate materials for display
  // Direct requirements take priority (they show what you actually need)
  const allIntermediate = { ...directRequirements };
  for (const [name, quantity] of Object.entries(intermediateMaterials)) {
    // Only add if not already in direct requirements
    if (!allIntermediate[name]) {
      allIntermediate[name] = quantity;
    } else {
      // If it's in both, use the larger quantity
      allIntermediate[name] = Math.max(allIntermediate[name], quantity);
    }
  }
  
  return {
    direct: Object.entries(directRequirements)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    intermediate: Object.entries(allIntermediate)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    raw: Object.entries(rawMaterials)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    allItems: Array.from(allItemsNeeded).sort(),
    upgradeChains: upgradeChains
  };
}

/**
 * Recursively resolve all recipes for an item
 * @param {boolean} isDirect - Whether this is a direct requirement for the selected item
 */
async function resolveItemRecipes(itemId, directRequirements, intermediateMaterials, rawMaterials, allItemsNeeded, visited = new Set(), isDirect = false) {
  if (visited.has(itemId)) {
    return; // Prevent infinite loops
  }
  visited.add(itemId);
  
  const item = await db.getItemById(itemId);
  if (!item) return;
  
  allItemsNeeded.add(item.name);
  
  // Get all recipes for this item
  // Note: Some items don't have recipes (raw materials, consumables, etc.) - that's okay.
  // If there are no recipes, this loop simply doesn't execute and the item is still tracked.
  const recipes = await db.getRecipesByItemId(itemId);
  
  for (const recipe of recipes) {
    const materials = await db.getRecipeMaterials(recipe.id);
    
    for (const material of materials) {
      const materialName = material.material_name || (material.material_id ? (await db.getMaterialById(material.material_id))?.name : null);
      if (!materialName) continue;
      
      const quantity = material.quantity || 1;
      
      if (material.material_type === 'raw') {
        // Direct raw material
        rawMaterials[materialName] = (rawMaterials[materialName] || 0) + quantity;
      } else if (material.material_type === 'component') {
        // Intermediate component
        if (isDirect) {
          // This is a direct requirement - show it as such
          directRequirements[materialName] = (directRequirements[materialName] || 0) + quantity;
        } else {
          // This is from a nested recipe
          intermediateMaterials[materialName] = (intermediateMaterials[materialName] || 0) + quantity;
        }
      } else if (material.material_type === 'item') {
        // Another item - need to resolve its recipe
        const materialItem = await db.getItemByNameOrWeaponFallback(materialName);
        if (materialItem) {
          // Recursively resolve this item's recipes (not direct anymore)
          await resolveItemRecipes(materialItem.id, directRequirements, intermediateMaterials, rawMaterials, allItemsNeeded, new Set(visited), false);
        } else {
          // Item not found, treat as intermediate material
          if (isDirect) {
            directRequirements[materialName] = (directRequirements[materialName] || 0) + quantity;
          } else {
            intermediateMaterials[materialName] = (intermediateMaterials[materialName] || 0) + quantity;
          }
        }
      }
    }
    
    // Handle upgrade paths
    if (recipe.recipe_type === 'upgrade' && recipe.upgrade_from_item_id) {
      await resolveItemRecipes(recipe.upgrade_from_item_id, directRequirements, intermediateMaterials, rawMaterials, allItemsNeeded, new Set(visited), false);
    }
  }
}

/**
 * Build upgrade chain for an item (e.g., Anvil IV → Anvil III → Anvil II → Anvil I)
 * @param {number} itemId - The item ID to build chain for
 * @returns {Array} - Array of chain steps, from base to target
 */
async function buildUpgradeChain(itemId, visited = new Set()) {
  if (visited.has(itemId)) {
    return []; // Prevent infinite loops
  }
  visited.add(itemId);
  
  const item = await db.getItemById(itemId);
  if (!item) return [];
  
  const recipes = await db.getRecipesByItemId(itemId);
  const upgradeRecipe = recipes.find(r => r.recipe_type === 'upgrade' && r.upgrade_from_item_id);
  
  if (upgradeRecipe) {
    // This is an upgrade - get the base item and continue building the chain
    const baseItem = await db.getItemById(upgradeRecipe.upgrade_from_item_id);
    if (!baseItem) return [];
    
    // Get materials for this upgrade step
    const upgradeMaterials = await db.getRecipeMaterials(upgradeRecipe.id);
    const materials = [];
    for (const m of upgradeMaterials) {
      let materialName = m.material_name;
      if (!materialName && m.material_id) {
        const materialItem = await db.getMaterialById(m.material_id);
        materialName = materialItem?.name || null;
      }
      if (materialName) {
        materials.push({
          name: materialName,
          quantity: m.quantity || 1,
          type: m.material_type
        });
      }
    }
    
    // Recursively build chain from base item
    const baseChain = await buildUpgradeChain(upgradeRecipe.upgrade_from_item_id, new Set(visited));
    
    // Add this upgrade step to the chain
    return [
      ...baseChain,
      {
        item: item.name,
        type: 'upgrade',
        from: baseItem.name,
        materials: materials
      }
    ];
  } else {
    // This is a base craft - check if it has a craft recipe
    const craftRecipe = recipes.find(r => r.recipe_type === 'craft');
    if (craftRecipe) {
      const craftMaterials = await db.getRecipeMaterials(craftRecipe.id);
      const materials = [];
      for (const m of craftMaterials) {
        let materialName = m.material_name;
        if (!materialName && m.material_id) {
          const materialItem = await db.getMaterialById(m.material_id);
          materialName = materialItem?.name || null;
        }
        if (materialName) {
          materials.push({
            name: materialName,
            quantity: m.quantity || 1,
            type: m.material_type
          });
        }
      }
      
      return [{
        item: item.name,
        type: 'craft',
        from: null,
        materials: materials
      }];
    }
    
    // No recipe - return empty (item doesn't need crafting)
    return [];
  }
}

/**
 * Convert intermediate materials to raw materials where recipes exist
 * But don't break down direct requirements
 */
async function convertToRawMaterials(intermediateMaterials, rawMaterials, directRequirements) {
  const materialsToProcess = Object.keys(intermediateMaterials);
  
  for (const materialName of materialsToProcess) {
    // Skip if this is a direct requirement - we want to show it as-is
    if (directRequirements[materialName]) {
      continue;
    }
    
    const material = await db.getMaterialByName(materialName) || await db.getItemByNameOrWeaponFallback(materialName);
    
    if (material && material.type === 'component') {
      // Try to find if this component has a recipe to break it down
      const item = await db.getItemByNameOrWeaponFallback(materialName);
      if (item) {
        const recipes = await db.getRecipesByItemId(item.id);
        for (const recipe of recipes) {
          if (recipe.recipe_type === 'craft') {
            const recipeMaterials = await db.getRecipeMaterials(recipe.id);
            const quantity = intermediateMaterials[materialName];
            
            for (const rm of recipeMaterials) {
              const rmName = rm.material_name || (rm.material_id ? (await db.getMaterialById(rm.material_id))?.name : null);
              if (rmName && rm.material_type === 'raw') {
                rawMaterials[rmName] = (rawMaterials[rmName] || 0) + (rm.quantity * quantity);
              }
            }
            
            // Remove from intermediate since we've broken it down
            delete intermediateMaterials[materialName];
            break;
          }
        }
      }
    }
  }
}

/**
 * Calculate hierarchical breakdown for a single item
 * @param {string} itemName - Name of the item
 * @returns {Object} - Hierarchical breakdown structure
 */
async function calculateItemBreakdown(itemName) {
  await db.waitForDb();
  
const item = await db.getItemByNameOrWeaponFallback(itemName);
  if (!item) {
    return {
      item: itemName,
      directRequirements: [],
      error: 'Item not found'
    };
  }

  // Get recipes for this item (prefer craft recipes, fall back to upgrade)
  const recipes = await db.getRecipesByItemId(item.id);
  const craftRecipe = recipes.find(r => r.recipe_type === 'craft');
  const upgradeRecipe = recipes.find(r => r.recipe_type === 'upgrade' && r.upgrade_from_item_id);
  
  const recipe = craftRecipe || upgradeRecipe;
  if (!recipe) {
    return {
      item: itemName,
      directRequirements: [],
      error: 'No recipe found'
    };
  }
  
  // Get materials for this recipe
  const recipeMaterials = await db.getRecipeMaterials(recipe.id);
  const directRequirements = [];
  
  for (const rm of recipeMaterials) {
    let materialName = rm.material_name;
    if (!materialName && rm.material_id) {
      const materialItem = await db.getMaterialById(rm.material_id);
      materialName = materialItem?.name || null;
    }
    
    if (!materialName) continue;
    
    const quantity = rm.quantity || 1;
    
    // Check if this material has a recipe (can be broken down)
    const materialItem = await db.getItemByNameOrWeaponFallback(materialName) || await db.getMaterialByName(materialName);
    let breakdown = null;
    
    if (materialItem) {
      const materialRecipes = await db.getRecipesByItemId(materialItem.id);
      const materialCraftRecipe = materialRecipes.find(r => r.recipe_type === 'craft');
      
      if (materialCraftRecipe) {
        // This material can be broken down - recursively get its breakdown
        const materialBreakdown = await getMaterialBreakdown(materialName, quantity, new Set());
        if (materialBreakdown && materialBreakdown.length > 0) {
          breakdown = materialBreakdown;
        }
      }
    }
    
    directRequirements.push({
      name: materialName,
      quantity: quantity,
      hasRecipe: breakdown !== null && breakdown.length > 0,
      breakdown: breakdown || []
    });
  }
  
  return {
    item: itemName,
    directRequirements: directRequirements
  };
}

/**
 * Recursively get breakdown for a material
 * @param {string} materialName - Name of the material
 * @param {number} quantity - Quantity needed
 * @param {Set} visited - Track visited items to prevent loops
 * @returns {Array} - Array of breakdown materials
 */
async function getMaterialBreakdown(materialName, quantity, visited) {
  if (visited.has(materialName)) {
    return []; // Prevent infinite loops
  }
  visited.add(materialName);
  
  const materialItem = await db.getItemByNameOrWeaponFallback(materialName) || await db.getMaterialByName(materialName);
  if (!materialItem) return [];
  
  const recipes = await db.getRecipesByItemId(materialItem.id);
  const craftRecipe = recipes.find(r => r.recipe_type === 'craft');
  
  if (!craftRecipe) {
    return []; // No recipe to break down
  }
  
  const recipeMaterials = await db.getRecipeMaterials(craftRecipe.id);
  const breakdown = [];
  
  for (const rm of recipeMaterials) {
    let subMaterialName = rm.material_name;
    if (!subMaterialName && rm.material_id) {
      const subMaterialItem = await db.getMaterialById(rm.material_id);
      subMaterialName = subMaterialItem?.name || null;
    }
    
    if (!subMaterialName) continue;
    
    const subQuantity = (rm.quantity || 1) * quantity; // Multiply by parent quantity
    
    // Check if this sub-material can be broken down further
    const subMaterialItem = await db.getItemByNameOrWeaponFallback(subMaterialName) || await db.getMaterialByName(subMaterialName);
    let subBreakdown = null;
    
    if (subMaterialItem) {
      const subRecipes = await db.getRecipesByItemId(subMaterialItem.id);
      const subCraftRecipe = subRecipes.find(r => r.recipe_type === 'craft');
      
      if (subCraftRecipe) {
        const nestedBreakdown = await getMaterialBreakdown(subMaterialName, subQuantity, new Set(visited));
        if (nestedBreakdown && nestedBreakdown.length > 0) {
          subBreakdown = nestedBreakdown;
        }
      }
    }
    
    breakdown.push({
      name: subMaterialName,
      quantity: subQuantity,
      hasRecipe: subBreakdown !== null && subBreakdown.length > 0,
      breakdown: subBreakdown || []
    });
  }
  
  return breakdown;
}

/**
 * Calculate breakdowns for multiple items
 * @param {string[]} itemNames - Array of item names
 * @returns {Array} - Array of item breakdowns
 */
async function calculateItemBreakdowns(itemNames) {
  const breakdowns = [];
  
  for (const itemName of itemNames) {
    const breakdown = await calculateItemBreakdown(itemName);
    breakdowns.push(breakdown);
  }
  
  return breakdowns;
}

module.exports = {
  calculateMaterials,
  calculateItemBreakdown,
  calculateItemBreakdowns
};
