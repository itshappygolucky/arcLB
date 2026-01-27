const db = require('../database/db');

/**
 * Optimize stash for maximum efficiency
 * @param {Object} calculation - Result from calculator.calculateMaterials
 * @param {number} stashLimit - Maximum stash size (default 280)
 * @returns {Object} - Optimization recommendations
 */
async function optimize(calculation, stashLimit = 280) {
  await db.waitForDb();
  
  const { direct, intermediate, raw, allItems } = calculation;
  
  // Calculate total unique items
  const totalItems = allItems.length;
  const stashUsage = totalItems;
  const remainingSpace = stashLimit - stashUsage;
  
  // Prioritize items
  const prioritizedItems = await prioritizeItems(allItems, calculation);
  
  // Get recommendations
  const recommendations = await generateRecommendations(prioritizedItems, remainingSpace, calculation);
  
  // Generate smart recommendations based on recycle yields and material density
  const smartRecommendations = await generateSmartRecommendations(prioritizedItems, calculation);
  
  // Build recycle efficiency map
  const recycleEfficiency = {};
  for (const item of prioritizedItems) {
    if (item.recycleEfficiency !== undefined) {
      recycleEfficiency[item.name] = item.recycleEfficiency;
    }
  }
  
  return {
    stashLimit,
    currentUsage: stashUsage,
    remainingSpace,
    prioritizedItems,
    recommendations,
    efficiency: calculateEfficiency(prioritizedItems),
    smartRecommendations,
    recycleEfficiency
  };
}

/**
 * Parse recycle yield JSON string
 * @param {string} recycleYieldString - JSON string of recycle yield
 * @returns {Object} - Parsed recycle yield { materialName: quantity }
 */
function parseRecycleYield(recycleYieldString) {
  if (!recycleYieldString) return {};
  
  try {
    const parsed = JSON.parse(recycleYieldString);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
    return {};
  } catch (error) {
    // Try to parse as simple format like "2× Mechanical Components, 3× Simple Gun Parts"
    const result = {};
    const parts = recycleYieldString.split(',');
    for (const part of parts) {
      const match = part.trim().match(/(\d+)\s*[×x]\s*(.+)/i);
      if (match) {
        const quantity = parseInt(match[1], 10);
        const materialName = match[2].trim();
        result[materialName] = quantity;
      }
    }
    return result;
  }
}

/**
 * Calculate material density for an item
 * @param {Object} item - Item object
 * @param {Object} requiredMaterials - Map of required material names to quantities
 * @param {Object} recycleYield - Parsed recycle yield
 * @returns {number} - Material density score
 */
function calculateMaterialDensity(item, requiredMaterials, recycleYield) {
  if (!recycleYield || Object.keys(recycleYield).length === 0) {
    return 0;
  }
  
  let totalMaterialsProvided = 0;
  for (const [materialName, quantity] of Object.entries(recycleYield)) {
    if (requiredMaterials[materialName]) {
      // This material is needed for the loadout
      totalMaterialsProvided += quantity;
    }
  }
  
  // Calculate materials per stash slot (considering stack size)
  const stackSize = item.stack_size || 1;
  const materialsPerSlot = (totalMaterialsProvided * stackSize) / 1;
  
  return materialsPerSlot;
}

/**
 * Calculate recycle efficiency for an item
 * @param {Object} item - Item object
 * @param {Object} requiredMaterials - Map of required material names to quantities
 * @param {Object} recycleYield - Parsed recycle yield
 * @returns {number} - Recycle efficiency score
 */
function calculateRecycleEfficiency(item, requiredMaterials, recycleYield) {
  if (!recycleYield || Object.keys(recycleYield).length === 0) {
    return 0;
  }
  
  let efficiency = 0;
  const stackSize = item.stack_size || 1;
  
  for (const [materialName, quantity] of Object.entries(recycleYield)) {
    if (requiredMaterials[materialName]) {
      // This material is needed - calculate efficiency
      const materialsPerSlot = (quantity * stackSize);
      efficiency += materialsPerSlot;
    }
  }
  
  return efficiency;
}

/**
 * Prioritize items by rarity, recipe demand, stack efficiency, recycle yield, and material density
 */
async function prioritizeItems(itemNames, calculation) {
  const items = [];
  
  // Build a map of required materials for quick lookup
  const requiredMaterials = {};
  for (const mat of [...calculation.direct, ...calculation.intermediate, ...calculation.raw]) {
    requiredMaterials[mat.name] = (requiredMaterials[mat.name] || 0) + mat.quantity;
  }
  
  for (const name of itemNames) {
    const item = await db.getItemByName(name);
    if (!item) continue;
    
    // Calculate recipe demand (how many recipes need this item)
    const recipes = await db.getRecipesByItemId(item.id);
    const recipeCount = recipes.length;
    
    // Calculate stack efficiency (items per slot)
    const stackEfficiency = item.stack_size || 1;
    
    // Parse recycle yield
    const recycleYield = parseRecycleYield(item.recycle_yield);
    
    // Calculate material density
    const materialDensity = calculateMaterialDensity(item, requiredMaterials, recycleYield);
    
    // Calculate recycle efficiency
    const recycleEfficiency = calculateRecycleEfficiency(item, requiredMaterials, recycleYield);
    
    // Rarity score (higher is better)
    const rarityScore = {
      'common': 1,
      'uncommon': 2,
      'rare': 3,
      'epic': 4,
      'legendary': 5
    }[item.rarity?.toLowerCase()] || 0;
    
    // Priority score with enhanced factors
    const priorityScore = (rarityScore * 10) + (recipeCount * 5) + stackEfficiency + (recycleEfficiency * 3) + (materialDensity * 2);
    
    items.push({
      name: item.name,
      type: item.type,
      rarity: item.rarity,
      stackSize: item.stack_size || 1,
      recipeCount,
      priorityScore,
      shouldKeep: priorityScore > 10, // Keep items with high priority
      recycleYield,
      materialDensity,
      recycleEfficiency
    });
  }
  
  // Sort by priority score (descending)
  return items.sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * Find best items to keep based on required materials
 * Searches entire database for items that recycle to required materials
 */
async function findBestItemsForMaterials(calculation, limit = 10) {
  // Build a map of required materials
  const requiredMaterials = {};
  for (const mat of [...calculation.direct, ...calculation.intermediate, ...calculation.raw]) {
    requiredMaterials[mat.name] = (requiredMaterials[mat.name] || 0) + mat.quantity;
  }
  
  if (Object.keys(requiredMaterials).length === 0) {
    return [];
  }
  
  // Get all items from database
  const allItems = await db.getAllItems();
  const candidateItems = [];
  
  // Find items that recycle to required materials
  for (const item of allItems) {
    const recycleYield = parseRecycleYield(item.recycle_yield);
    if (!recycleYield || Object.keys(recycleYield).length === 0) {
      continue;
    }
    
    // Check if this item provides any required materials
    let providesNeededMaterials = false;
    let totalMaterialsProvided = 0;
    
    for (const [materialName, quantity] of Object.entries(recycleYield)) {
      // Check for exact match first
      if (requiredMaterials[materialName]) {
        providesNeededMaterials = true;
        totalMaterialsProvided += quantity;
        continue;
      }
      
      // Check for partial match (e.g., "Metal Parts" matches "Metal", "Mechanical Components" matches "Mechanical")
      const materialLower = materialName.toLowerCase().trim();
      for (const requiredMat of Object.keys(requiredMaterials)) {
        const requiredLower = requiredMat.toLowerCase().trim();
        // Match if one contains the other (for variations like "Metal" vs "Metal Parts")
        if (materialLower === requiredLower) {
          providesNeededMaterials = true;
          totalMaterialsProvided += quantity;
          break;
        } else if (materialLower.includes(requiredLower) && requiredLower.length >= 4) {
          // Only match if the required material name is substantial (at least 4 chars)
          providesNeededMaterials = true;
          totalMaterialsProvided += quantity;
          break;
        } else if (requiredLower.includes(materialLower) && materialLower.length >= 4) {
          providesNeededMaterials = true;
          totalMaterialsProvided += quantity;
          break;
        }
      }
    }
    
    if (providesNeededMaterials) {
      // Calculate efficiency score
      const stackSize = item.stack_size || 1;
      const materialsPerSlot = (totalMaterialsProvided * stackSize);
      const efficiency = materialsPerSlot;
      
      candidateItems.push({
        name: item.name,
        type: item.type,
        rarity: item.rarity,
        stackSize: stackSize,
        recycleYield: recycleYield,
        efficiency: efficiency,
        materialsProvided: totalMaterialsProvided
      });
    }
  }
  
  // Sort by efficiency (materials per slot) descending
  candidateItems.sort((a, b) => b.efficiency - a.efficiency);
  
  // Return top items
  return candidateItems.slice(0, limit);
}

/**
 * Generate recommendations for stash management
 */
async function generateRecommendations(prioritizedItems, remainingSpace, calculation) {
  const keep = [];
  const recycle = [];
  const consider = [];
  
  // Find best items from entire database that provide required materials
  const bestItems = await findBestItemsForMaterials(calculation, 10);
  
  // Add best items to keep list
  for (const item of bestItems) {
    keep.push(item.name);
  }
  
  // Also add items from prioritized list that should be kept
  for (const item of prioritizedItems) {
    // Skip if already in keep list
    if (keep.includes(item.name)) {
      continue;
    }
    
    if (item.shouldKeep) {
      keep.push(item.name);
    } else if (item.priorityScore < 5) {
      recycle.push(item.name);
    } else {
      consider.push(item.name);
    }
  }
  
  return {
    keep: keep.slice(0, Math.min(keep.length, remainingSpace)),
    recycle,
    consider,
    message: remainingSpace < 0 
      ? `Stash is over capacity by ${Math.abs(remainingSpace)} items. Consider recycling low-priority items.`
      : `You have ${remainingSpace} slots remaining.`
  };
}

/**
 * Generate smart recommendations based on recycle yields and material density
 */
async function generateSmartRecommendations(prioritizedItems, calculation) {
  const recommendations = [];
  
  // Build a map of required materials
  const requiredMaterials = {};
  for (const mat of [...calculation.direct, ...calculation.intermediate, ...calculation.raw]) {
    requiredMaterials[mat.name] = (requiredMaterials[mat.name] || 0) + mat.quantity;
  }
  
  // Find items that are more efficient to hold than their components
  for (const item of prioritizedItems) {
    if (!item.recycleYield || Object.keys(item.recycleYield).length === 0) {
      continue;
    }
    
    // Check if this item provides materials that are needed
    let providesNeededMaterials = false;
    let totalMaterialsProvided = 0;
    
    for (const [materialName, quantity] of Object.entries(item.recycleYield)) {
      if (requiredMaterials[materialName]) {
        providesNeededMaterials = true;
        totalMaterialsProvided += quantity;
      }
    }
    
    if (providesNeededMaterials && item.materialDensity > 0) {
      // Calculate space savings
      // If we hold this item instead of the materials it provides, how many slots do we save?
      let slotsForMaterials = 0;
      for (const [materialName, quantity] of Object.entries(item.recycleYield)) {
        if (requiredMaterials[materialName]) {
          const materialItem = await db.getItemByName(materialName);
          if (materialItem) {
            const materialStackSize = materialItem.stack_size || 1;
            slotsForMaterials += Math.ceil(quantity / materialStackSize);
          } else {
            slotsForMaterials += quantity; // Assume stack size 1 if not found
          }
        }
      }
      
      const slotsForItem = 1 / item.stackSize; // Slots needed for this item
      const spaceSaved = Math.max(0, slotsForMaterials - slotsForItem);
      
      if (spaceSaved > 0 || item.materialDensity > 5) {
        recommendations.push({
          item: item.name,
          reason: spaceSaved > 0 ? 'Better material density' : 'High material value',
          recycleYield: item.recycleYield,
          spaceSaved: Math.round(spaceSaved * 10) / 10, // Round to 1 decimal
          priority: item.materialDensity > 10 ? 'high' : item.materialDensity > 5 ? 'medium' : 'low'
        });
      }
    }
  }
  
  // Sort by priority and material density
  return recommendations.sort((a, b) => {
    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return b.spaceSaved - a.spaceSaved;
  });
}

/**
 * Calculate stash efficiency metrics
 */
function calculateEfficiency(prioritizedItems) {
  const totalSlots = prioritizedItems.reduce((sum, item) => sum + (1 / item.stackSize), 0);
  const totalItems = prioritizedItems.length;
  
  return {
    itemsPerSlot: totalItems / totalSlots,
    averageStackSize: prioritizedItems.reduce((sum, item) => sum + item.stackSize, 0) / prioritizedItems.length,
    highValueItems: prioritizedItems.filter(item => item.shouldKeep).length
  };
}

module.exports = {
  optimize
};
