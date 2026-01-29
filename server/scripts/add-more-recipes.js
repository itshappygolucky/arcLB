const db = require('../database/db');

/**
 * Add recipes for more items beyond the basic Anvil series
 * This expands the database with recipes for common weapons, shields, and augments
 */
async function addMoreRecipes() {
  console.log('Adding recipes for more items...');
  await db.waitForDb();

  // Get or create materials
  async function getOrCreateMaterial(name, type, category, stackSize) {
    let material = await db.getMaterialByName(name);
    if (!material) {
      const id = await db.insertMaterial(name, type, category, stackSize);
      material = await db.getMaterialById(id);
    }
    return material;
  }

  // Get or create item
  async function getOrCreateItem(name, type, rarity, stackSize, recycleYield, category) {
    let item = await db.getItemByName(name);
    if (!item) {
      const id = await db.insertItem(name, type, rarity, stackSize, recycleYield, category);
      item = await db.getItemById(id);
    }
    return item;
  }

  // Ensure all base materials exist
  const metal = await getOrCreateMaterial('Metal', 'raw', 'metal', 50);
  const metalParts = await getOrCreateMaterial('Metal Parts', 'raw', 'metal', 50);
  const rubber = await getOrCreateMaterial('Rubber', 'raw', 'rubber', 50);
  const rubberParts = await getOrCreateMaterial('Rubber Parts', 'raw', 'rubber', 50);
  const wire = await getOrCreateMaterial('Wire', 'raw', 'electrical', 50);
  const wires = await getOrCreateMaterial('Wires', 'raw', 'electrical', 50);
  const arcAlloy = await getOrCreateMaterial('ARC Alloy', 'raw', 'metal', 20);
  const electricalComponents = await getOrCreateMaterial('Electrical Components', 'raw', 'electrical', 20);

  // Ensure all components exist
  const mechanicalComponents = await getOrCreateMaterial('Mechanical Components', 'component', 'mechanical', 20);
  const simpleGunParts = await getOrCreateMaterial('Simple Gun Parts', 'component', 'gun_parts', 20);
  const lightGunParts = await getOrCreateMaterial('Light Gun Parts', 'component', 'gun_parts', 20);
  const mediumGunParts = await getOrCreateMaterial('Medium Gun Parts', 'component', 'gun_parts', 15);
  const heavyGunParts = await getOrCreateMaterial('Heavy Gun Parts', 'component', 'gun_parts', 10);
  const arcCircuitry = await getOrCreateMaterial('ARC Circuitry', 'component', 'electrical', 10);
  const advancedElectrical = await getOrCreateMaterial('Advanced Electrical Components', 'component', 'electrical', 10);
  const processor = await getOrCreateMaterial('Processor', 'component', 'electrical', 5);
  const powerCell = await getOrCreateMaterial('Power Cell', 'component', 'electrical', 5);
  const shieldCore = await getOrCreateMaterial('Shield Core', 'component', 'electrical', 5);

  // Create items and their recipes
  const recipesAdded = [];

  // ===== WEAPONS =====
  
  // Burletta series (common pistol)
  const burletta1 = await getOrCreateItem('Burletta I', 'weapon', 'common', 1, null, 'weapon');
  let recipes = await db.getRecipesByItemId(burletta1.id);
  if (recipes.length === 0) {
    const recipeId = await db.insertRecipe(burletta1.id, 'craft', null, 1, 'Burletta Blueprint');
    await db.insertRecipeMaterial(recipeId, mechanicalComponents.id, 'Mechanical Components', 4, 'component');
    await db.insertRecipeMaterial(recipeId, simpleGunParts.id, 'Simple Gun Parts', 5, 'component');
    recipesAdded.push('Burletta I');
  }

  const burletta2 = await getOrCreateItem('Burletta II', 'weapon', 'uncommon', 1, null, 'weapon');
  recipes = await db.getRecipesByItemId(burletta2.id);
  if (recipes.length === 0) {
    const recipeId = await db.insertRecipe(burletta2.id, 'upgrade', burletta1.id, 2, null);
    await db.insertRecipeMaterial(recipeId, mechanicalComponents.id, 'Mechanical Components', 3, 'component');
    await db.insertRecipeMaterial(recipeId, lightGunParts.id, 'Light Gun Parts', 2, 'component');
    recipesAdded.push('Burletta II');
  }

  // Hornet series (common SMG)
  const hornet1 = await getOrCreateItem('Hornet I', 'weapon', 'common', 1, null, 'weapon');
  recipes = await db.getRecipesByItemId(hornet1.id);
  if (recipes.length === 0) {
    const recipeId = await db.insertRecipe(hornet1.id, 'craft', null, 1, 'Hornet Blueprint');
    await db.insertRecipeMaterial(recipeId, mechanicalComponents.id, 'Mechanical Components', 5, 'component');
    await db.insertRecipeMaterial(recipeId, simpleGunParts.id, 'Simple Gun Parts', 6, 'component');
    recipesAdded.push('Hornet I');
  }

  // Hairpin series (so "Hairpin" base name resolves to Hairpin I in stash optimizer)
  const hairpin1 = await getOrCreateItem('Hairpin I', 'weapon', 'common', 1, null, 'weapon');
  recipes = await db.getRecipesByItemId(hairpin1.id);
  if (recipes.length === 0) {
    const recipeId = await db.insertRecipe(hairpin1.id, 'craft', null, 1, 'Hairpin Blueprint');
    await db.insertRecipeMaterial(recipeId, metalParts.id, 'Metal Parts', 8, 'raw');
    recipesAdded.push('Hairpin I');
  }

  // Bobcat series (so "Bobcat" base name resolves to Bobcat I in stash optimizer)
  const bobcat1 = await getOrCreateItem('Bobcat I', 'weapon', 'common', 1, null, 'weapon');
  recipes = await db.getRecipesByItemId(bobcat1.id);
  if (recipes.length === 0) {
    const recipeId = await db.insertRecipe(bobcat1.id, 'craft', null, 1, 'Bobcat Blueprint');
    await db.insertRecipeMaterial(recipeId, mechanicalComponents.id, 'Mechanical Components', 1, 'component');
    await db.insertRecipeMaterial(recipeId, lightGunParts.id, 'Light Gun Parts', 1, 'component');
    await db.insertRecipeMaterial(recipeId, advancedElectrical.id, 'Advanced Electrical Components', 1, 'component');
    recipesAdded.push('Bobcat I');
  }

  // ===== SHIELDS =====
  
  // Small Shield
  const smallShield = await getOrCreateItem('Small Shield', 'shield', 'uncommon', 1, null, 'shield');
  recipes = await db.getRecipesByItemId(smallShield.id);
  if (recipes.length === 0) {
    const recipeId = await db.insertRecipe(smallShield.id, 'craft', null, 1, 'Small Shield Blueprint');
    await db.insertRecipeMaterial(recipeId, electricalComponents.id, 'Electrical Components', 2, 'raw');
    await db.insertRecipeMaterial(recipeId, metalParts.id, 'Metal Parts', 3, 'raw');
    recipesAdded.push('Small Shield');
  }

  // Large Shield
  const largeShield = await getOrCreateItem('Large Shield', 'shield', 'epic', 1, null, 'shield');
  recipes = await db.getRecipesByItemId(largeShield.id);
  if (recipes.length === 0) {
    const recipeId = await db.insertRecipe(largeShield.id, 'craft', null, 3, 'Large Shield Blueprint');
    await db.insertRecipeMaterial(recipeId, arcCircuitry.id, 'ARC Circuitry', 2, 'component');
    await db.insertRecipeMaterial(recipeId, shieldCore.id, 'Shield Core', 1, 'component');
    recipesAdded.push('Large Shield');
  }

  // ===== AUGMENTS =====
  
  // Looting Mk. 1
  const lootingMk1 = await getOrCreateItem('Looting Mk. 1', 'augment', 'common', 1, null, 'augment');
  recipes = await db.getRecipesByItemId(lootingMk1.id);
  if (recipes.length === 0) {
    const recipeId = await db.insertRecipe(lootingMk1.id, 'craft', null, 1, 'Looting Mk. 1 Blueprint');
    await db.insertRecipeMaterial(recipeId, electricalComponents.id, 'Electrical Components', 1, 'raw');
    await db.insertRecipeMaterial(recipeId, processor.id, 'Processor', 1, 'component');
    recipesAdded.push('Looting Mk. 1');
  }

  // Looting Mk. 2
  const lootingMk2 = await getOrCreateItem('Looting Mk. 2', 'augment', 'uncommon', 1, null, 'augment');
  recipes = await db.getRecipesByItemId(lootingMk2.id);
  if (recipes.length === 0) {
    const recipeId = await db.insertRecipe(lootingMk2.id, 'craft', null, 2, 'Looting Mk. 2 Blueprint');
    await db.insertRecipeMaterial(recipeId, advancedElectrical.id, 'Advanced Electrical Components', 1, 'component');
    await db.insertRecipeMaterial(recipeId, processor.id, 'Processor', 1, 'component');
    recipesAdded.push('Looting Mk. 2');
  }

  // Looting Mk. 3 (Safekeeper) - Gear Bench 3, 2× Advanced Electrical, 3× Processor
  const lootingMk3Safekeeper = await getOrCreateItem('Looting Mk. 3 (Safekeeper)', 'augment', 'rare', 1, null, 'augment');
  recipes = await db.getRecipesByItemId(lootingMk3Safekeeper.id);
  if (recipes.length === 0) {
    const recipeId = await db.insertRecipe(lootingMk3Safekeeper.id, 'craft', null, 3, 'Looting Mk. 3 (Safekeeper) Blueprint');
    await db.insertRecipeMaterial(recipeId, advancedElectrical.id, 'Advanced Electrical Components', 2, 'component');
    await db.insertRecipeMaterial(recipeId, processor.id, 'Processor', 3, 'component');
    recipesAdded.push('Looting Mk. 3 (Safekeeper)');
  }

  // Tactical Mk. 3 (Revival) - Gear Bench 3, 2× Advanced Electrical, 3× Processor
  const tacticalMk3Revival = await getOrCreateItem('Tactical Mk. 3 (Revival)', 'augment', 'rare', 1, null, 'augment');
  recipes = await db.getRecipesByItemId(tacticalMk3Revival.id);
  if (recipes.length === 0) {
    const recipeId = await db.insertRecipe(tacticalMk3Revival.id, 'craft', null, 3, 'Tactical Mk. 3 (Revival) Blueprint');
    await db.insertRecipeMaterial(recipeId, advancedElectrical.id, 'Advanced Electrical Components', 2, 'component');
    await db.insertRecipeMaterial(recipeId, processor.id, 'Processor', 3, 'component');
    recipesAdded.push('Tactical Mk. 3 (Revival)');
  }

  // Speed Mk. 1
  const speedMk1 = await getOrCreateItem('Speed Mk. 1', 'augment', 'common', 1, null, 'augment');
  recipes = await db.getRecipesByItemId(speedMk1.id);
  if (recipes.length === 0) {
    const recipeId = await db.insertRecipe(speedMk1.id, 'craft', null, 1, 'Speed Mk. 1 Blueprint');
    await db.insertRecipeMaterial(recipeId, mechanicalComponents.id, 'Mechanical Components', 3, 'component');
    await db.insertRecipeMaterial(recipeId, powerCell.id, 'Power Cell', 1, 'component');
    recipesAdded.push('Speed Mk. 1');
  }

  // ===== COMPONENT RECIPES =====
  // Add recipes for components that don't have them yet

  // Light Gun Parts
  const lightGunPartsItem = await getOrCreateItem('Light Gun Parts', 'component', 'common', 20, null, 'gun_parts');
  recipes = await db.getRecipesByItemId(lightGunPartsItem.id);
  if (recipes.length === 0) {
    const recipeId = await db.insertRecipe(lightGunPartsItem.id, 'craft', null, 1, null);
    await db.insertRecipeMaterial(recipeId, metalParts.id, 'Metal Parts', 2, 'raw');
    await db.insertRecipeMaterial(recipeId, rubberParts.id, 'Rubber Parts', 1, 'raw');
    recipesAdded.push('Light Gun Parts recipe');
  }

  // Medium Gun Parts
  const mediumGunPartsItem = await getOrCreateItem('Medium Gun Parts', 'component', 'uncommon', 15, null, 'gun_parts');
  recipes = await db.getRecipesByItemId(mediumGunPartsItem.id);
  if (recipes.length === 0) {
    const recipeId = await db.insertRecipe(mediumGunPartsItem.id, 'craft', null, 2, null);
    await db.insertRecipeMaterial(recipeId, metalParts.id, 'Metal Parts', 4, 'raw');
    await db.insertRecipeMaterial(recipeId, rubberParts.id, 'Rubber Parts', 2, 'raw');
    recipesAdded.push('Medium Gun Parts recipe');
  }

  // Power Cell
  const powerCellItem = await getOrCreateItem('Power Cell', 'component', 'uncommon', 5, null, 'electrical');
  recipes = await db.getRecipesByItemId(powerCellItem.id);
  if (recipes.length === 0) {
    const recipeId = await db.insertRecipe(powerCellItem.id, 'craft', null, 2, null);
    await db.insertRecipeMaterial(recipeId, wires.id, 'Wires', 2, 'raw');
    await db.insertRecipeMaterial(recipeId, electricalComponents.id, 'Electrical Components', 1, 'raw');
    recipesAdded.push('Power Cell recipe');
  }

  // Shield Core
  const shieldCoreItem = await getOrCreateItem('Shield Core', 'component', 'rare', 5, null, 'electrical');
  recipes = await db.getRecipesByItemId(shieldCoreItem.id);
  if (recipes.length === 0) {
    const recipeId = await db.insertRecipe(shieldCoreItem.id, 'craft', null, 2, null);
    await db.insertRecipeMaterial(recipeId, arcCircuitry.id, 'ARC Circuitry', 1, 'component');
    await db.insertRecipeMaterial(recipeId, powerCell.id, 'Power Cell', 1, 'component');
    recipesAdded.push('Shield Core recipe');
  }

  // Count items with recipes before adding more
  const itemsBefore = await db.getAllItems();
  let itemsWithRecipesBefore = 0;
  for (const item of itemsBefore) {
    const recipes = await db.getRecipesByItemId(item.id);
    if (recipes.length > 0) {
      itemsWithRecipesBefore++;
    }
  }
  
  // Add recipes for any items that were scraped but don't have recipes
  // This is a fallback to ensure common items have at least basic recipes
  console.log('\nChecking for items without recipes...');
  const allItems = await db.getAllItems();
  let itemsWithoutRecipes = 0;
  const skippedTypes = new Set();
  
  for (const item of allItems) {
    const recipes = await db.getRecipesByItemId(item.id);
    if (recipes.length === 0) {
      // Skip raw materials and very common items that shouldn't have recipes
      const nameLower = item.name.toLowerCase();
      const shouldSkip = 
        item.type === 'raw_material' || 
        (item.name.includes('Parts') && !['Simple Gun Parts', 'Heavy Gun Parts', 'Light Gun Parts', 'Medium Gun Parts'].includes(item.name)) ||
        (nameLower.includes('metal') && nameLower.includes('parts')) ||
        (nameLower.includes('rubber') && nameLower.includes('parts')) ||
        (nameLower.includes('wire') && nameLower.includes('parts')) ||
        nameLower === 'metal' ||
        nameLower === 'rubber' ||
        nameLower === 'wire' ||
        nameLower === 'wires' ||
        (nameLower.includes('alloy') && !nameLower.includes('arc')) ||
        item.name.startsWith('10x ') ||
        item.name.startsWith('15x ') ||
        item.name.startsWith('200x ') ||
        item.name.startsWith('260x ') ||
        item.name === 'Contents' ||
        item.name === 'ARC';
      
      if (shouldSkip) {
        skippedTypes.add(item.type || 'unknown');
        continue;
      }
      
      // Create a basic recipe based on item type
      try {
        let recipeId;
        let materials = [];
        const nameLower = item.name.toLowerCase();
        
        if (item.type === 'weapon') {
          recipeId = await db.insertRecipe(item.id, 'craft', null, 1, `${item.name} Blueprint`);
          materials = [
            { material: mechanicalComponents, quantity: 5 },
            { material: simpleGunParts, quantity: 6 }
          ];
        } else if (item.type === 'shield') {
          recipeId = await db.insertRecipe(item.id, 'craft', null, 2, `${item.name} Blueprint`);
          materials = [
            { material: arcCircuitry, quantity: 1 },
            { material: metalParts, quantity: 3 }
          ];
        } else if (item.type === 'augment') {
          recipeId = await db.insertRecipe(item.id, 'craft', null, 2, `${item.name} Blueprint`);
          materials = [
            { material: advancedElectrical, quantity: 1 },
            { material: processor, quantity: 1 }
          ];
        } else if (item.type === 'component') {
          // Components can be crafted from raw materials
          // Check if it's an electrical component
          if (nameLower.includes('electrical') || nameLower.includes('circuitry') || nameLower.includes('processor') || nameLower.includes('power') || nameLower.includes('shield')) {
            recipeId = await db.insertRecipe(item.id, 'craft', null, 1, null);
            materials = [
              { material: wires, quantity: 2 },
              { material: electricalComponents, quantity: 1 }
            ];
          } else {
            // Mechanical component
            recipeId = await db.insertRecipe(item.id, 'craft', null, 1, null);
            materials = [
              { material: metalParts, quantity: 3 },
              { material: rubberParts, quantity: 2 }
            ];
          }
        } else if (item.type === 'item') {
          // Generic items - try to determine type from name
          if (nameLower.includes('shield')) {
            recipeId = await db.insertRecipe(item.id, 'craft', null, 2, `${item.name} Blueprint`);
            materials = [
              { material: arcCircuitry, quantity: 1 },
              { material: metalParts, quantity: 3 }
            ];
          } else if (nameLower.includes('mk.') || nameLower.includes('augment')) {
            recipeId = await db.insertRecipe(item.id, 'craft', null, 2, `${item.name} Blueprint`);
            materials = [
              { material: advancedElectrical, quantity: 1 },
              { material: processor, quantity: 1 }
            ];
          } else if (nameLower.includes('gun') || nameLower.includes('weapon') || nameLower.includes('rifle') || nameLower.includes('pistol')) {
            recipeId = await db.insertRecipe(item.id, 'craft', null, 1, `${item.name} Blueprint`);
            materials = [
              { material: mechanicalComponents, quantity: 5 },
              { material: simpleGunParts, quantity: 6 }
            ];
          }
        }
        
        if (recipeId && materials.length > 0) {
          for (const mat of materials) {
            // Make sure material exists
            if (mat.material && mat.material.id) {
              await db.insertRecipeMaterial(
                recipeId,
                mat.material.id,
                mat.material.name,
                mat.quantity,
                mat.material.type === 'raw' ? 'raw' : 'component'
              );
            }
          }
          itemsWithoutRecipes++;
          if (itemsWithoutRecipes <= 20) {
            recipesAdded.push(`${item.name} (${item.type})`);
          }
        }
      } catch (error) {
        // Skip if there's an error (item might already have recipe, etc.)
        console.error(`Error adding recipe for ${item.name}:`, error.message);
      }
    }
  }
  
  if (itemsWithoutRecipes > 20) {
    console.log(`  ... and ${itemsWithoutRecipes - 20} more items`);
  }
  
  console.log(`\n✓ Added recipes for ${itemsWithoutRecipes} items`);
  if (recipesAdded.length > 0) {
    console.log('\nSample items:');
    recipesAdded.slice(0, 20).forEach(name => console.log(`  - ${name}`));
  }
  console.log(`\nTotal items with recipes now: ${itemsWithRecipesBefore + itemsWithoutRecipes}`);
  console.log('\nDatabase now has recipes for more items!');
}

// Run if called directly
if (require.main === module) {
  addMoreRecipes()
    .then(() => {
      console.log('\n✓ Complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error adding recipes:', error);
      console.error(error.stack);
      process.exit(1);
    });
}

module.exports = { addMoreRecipes };
