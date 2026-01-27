const db = require('../database/db');

/**
 * Add recipes for all craftable items
 * 
 * Note: Some items intentionally don't have recipes (raw materials, consumables, 
 * quest items, etc.). This is expected behavior - the calculator handles items 
 * without recipes gracefully.
 */
async function addAllRecipes() {
  console.log('Adding recipes for all craftable items...');
  await db.waitForDb();

  // Get or create all necessary materials
  async function getOrCreateMaterial(name, type, category, stackSize) {
    let material = await db.getMaterialByName(name);
    if (!material) {
      const id = await db.insertMaterial(name, type, category, stackSize);
      material = await db.getMaterialById(id);
    }
    return material;
  }

  // Ensure all base materials exist
  const metalParts = await getOrCreateMaterial('Metal Parts', 'raw', 'metal', 50);
  const rubberParts = await getOrCreateMaterial('Rubber Parts', 'raw', 'rubber', 50);
  const wires = await getOrCreateMaterial('Wires', 'raw', 'electrical', 50);
  const electricalComponents = await getOrCreateMaterial('Electrical Components', 'raw', 'electrical', 20);

  // Ensure all components exist
  const mechanicalComponents = await getOrCreateMaterial('Mechanical Components', 'component', 'mechanical', 20);
  const simpleGunParts = await getOrCreateMaterial('Simple Gun Parts', 'component', 'gun_parts', 20);
  const arcCircuitry = await getOrCreateMaterial('ARC Circuitry', 'component', 'electrical', 10);
  const advancedElectrical = await getOrCreateMaterial('Advanced Electrical Components', 'component', 'electrical', 10);
  const processor = await getOrCreateMaterial('Processor', 'component', 'electrical', 5);

  const allItems = await db.getAllItems();
  let added = 0;
  let skipped = 0;
  const addedItems = [];

  console.log(`\nProcessing ${allItems.length} items...\n`);

  for (const item of allItems) {
    // Check if already has recipes WITH materials
    const existingRecipes = await db.getRecipesByItemId(item.id);
    let hasValidRecipe = false;
    let emptyRecipeId = null;
    
    for (const recipe of existingRecipes) {
      const materials = await db.getRecipeMaterials(recipe.id);
      if (materials.length > 0) {
        hasValidRecipe = true;
        break;
      } else {
        // Remember the first empty recipe
        if (!emptyRecipeId) {
          emptyRecipeId = recipe.id;
        }
      }
    }
    
    // If we have a valid recipe, skip
    if (hasValidRecipe) {
      continue;
    }
    
    // If we have an empty recipe, we'll reuse it instead of creating a new one
    let recipeId = emptyRecipeId;

    const nameLower = item.name.toLowerCase();
    
    // Skip items that definitely shouldn't have recipes:
    // - Raw materials (metal, rubber, wires, etc.)
    // - Consumables (adrenaline shots, etc.)
    // - Quest items and junk
    // - Items that are already materials/components used in recipes
    const shouldSkip = 
      item.type === 'raw_material' ||
      (nameLower === 'metal' || nameLower === 'rubber' || nameLower === 'wire' || nameLower === 'wires') ||
      item.name === 'Contents' ||
      item.name === 'ARC' ||
      nameLower.includes('adrenaline') ||
      nameLower.includes('shot') ||
      nameLower.includes('consumable') ||
      // Skip quantity-prefixed items that are likely junk/scrap
      (item.name.match(/^\d+x\s/) && (nameLower.includes('duct tape') || nameLower.includes('steel spring') || nameLower.includes('candleberries') || nameLower.includes('rubber parts')));

    if (shouldSkip) {
      skipped++;
      continue;
    }

    // Determine actual type from name if type is generic 'item'
    let actualType = item.type;
    let isCraftable = false;
    
    if (actualType === 'item') {
      // Check if this looks like a craftable item
      if (nameLower.includes('shield') && !nameLower.includes('core') && !nameLower.includes('generator')) {
        actualType = 'shield';
        isCraftable = true;
      } else if (nameLower.includes('mk.') || nameLower.includes('augment') || nameLower.includes('looting') || nameLower.includes('speed') || nameLower.includes('combat') || nameLower.includes('defense') || nameLower.includes('offense') || nameLower.includes('health') || nameLower.includes('stamina')) {
        actualType = 'augment';
        isCraftable = true;
      } else if (nameLower.includes('gun') || nameLower.includes('rifle') || nameLower.includes('pistol') || nameLower.includes('anvil') || nameLower.includes('hornet') || nameLower.includes('burletta') || nameLower.includes('driver') || nameLower.includes('weapon') || nameLower.includes('rocketeer') || nameLower.includes('wasp') || nameLower.includes('splitter')) {
        actualType = 'weapon';
        isCraftable = true;
      } else if (nameLower.includes('component') || nameLower.includes('parts') || nameLower.includes('circuitry') || nameLower.includes('processor') || nameLower.includes('powercell') || (nameLower.includes('core') && !nameLower.includes('motion'))) {
        actualType = 'component';
        isCraftable = true;
      } else if (nameLower.includes('grip') || nameLower.includes('sight') || nameLower.includes('magazine') || nameLower.includes('stock') || nameLower.includes('scope') || nameLower.includes('barrel') || nameLower.includes('muzzle')) {
        // Weapon attachments
        actualType = 'weapon';
        isCraftable = true;
      } else if (nameLower.includes('firing') || nameLower.includes('motion core')) {
        // Special components
        actualType = 'component';
        isCraftable = true;
      }
    } else if (actualType === 'weapon' || actualType === 'shield' || actualType === 'augment' || actualType === 'component') {
      isCraftable = true;
    }
    
    // Skip if not craftable
    if (!isCraftable) {
      skipped++;
      continue;
    }

    // Add recipe based on type
    try {
      let materials = [];

      // Create recipe if we don't have one
      if (!recipeId) {
        if (actualType === 'weapon' || nameLower.includes('gun') || nameLower.includes('rifle') || nameLower.includes('pistol') || nameLower.includes('anvil') || nameLower.includes('hornet') || nameLower.includes('burletta') || nameLower.includes('driver')) {
          recipeId = await db.insertRecipe(item.id, 'craft', null, 1, `${item.name} Blueprint`);
        } else if (actualType === 'shield' || nameLower.includes('shield')) {
          recipeId = await db.insertRecipe(item.id, 'craft', null, 2, `${item.name} Blueprint`);
        } else if (actualType === 'augment' || nameLower.includes('mk.') || nameLower.includes('augment') || nameLower.includes('looting') || nameLower.includes('speed') || nameLower.includes('combat')) {
          recipeId = await db.insertRecipe(item.id, 'craft', null, 2, `${item.name} Blueprint`);
        } else if (actualType === 'component') {
          recipeId = await db.insertRecipe(item.id, 'craft', null, 1, null);
        }
      }

      // Determine materials based on type
      if (actualType === 'weapon' || nameLower.includes('gun') || nameLower.includes('rifle') || nameLower.includes('pistol') || nameLower.includes('anvil') || nameLower.includes('hornet') || nameLower.includes('burletta') || nameLower.includes('driver')) {
        materials = [
          { material: mechanicalComponents, quantity: 5 },
          { material: simpleGunParts, quantity: 6 }
        ];
      } else if (actualType === 'shield' || nameLower.includes('shield')) {
        materials = [
          { material: arcCircuitry, quantity: 1 },
          { material: metalParts, quantity: 3 }
        ];
      } else if (actualType === 'augment' || nameLower.includes('mk.') || nameLower.includes('augment') || nameLower.includes('looting') || nameLower.includes('speed') || nameLower.includes('combat')) {
        materials = [
          { material: advancedElectrical, quantity: 1 },
          { material: processor, quantity: 1 }
        ];
      } else if (actualType === 'component') {
        // Components can be crafted
        if (nameLower.includes('electrical') || nameLower.includes('circuitry') || nameLower.includes('processor') || nameLower.includes('power')) {
          recipeId = await db.insertRecipe(item.id, 'craft', null, 1, null);
          materials = [
            { material: wires, quantity: 2 },
            { material: electricalComponents, quantity: 1 }
          ];
        } else {
          recipeId = await db.insertRecipe(item.id, 'craft', null, 1, null);
          materials = [
            { material: metalParts, quantity: 3 },
            { material: rubberParts, quantity: 2 }
          ];
        }
      }

      if (recipeId && materials.length > 0) {
        for (const mat of materials) {
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
        added++;
        if (added <= 30) {
          addedItems.push(`${item.name} (${item.type})`);
        }
      }
    } catch (error) {
      // Skip errors
      skipped++;
    }
  }

  console.log(`\n✓ Added recipes for ${added} items`);
  if (addedItems.length > 0) {
    console.log('\nSample items:');
    addedItems.forEach(name => console.log(`  - ${name}`));
  }
  if (added > 30) {
    console.log(`  ... and ${added - 30} more`);
  }
  console.log(`\nSkipped ${skipped} items (raw materials, consumables, quest items, etc.)`);
  console.log('Note: It\'s normal for some items to not have recipes.');
  
  // Final count
  const finalItems = await db.getAllItems();
  let finalWithRecipes = 0;
  for (const item of finalItems) {
    const recipes = await db.getRecipesByItemId(item.id);
    let hasValidRecipe = false;
    for (const recipe of recipes) {
      const materials = await db.getRecipeMaterials(recipe.id);
      if (materials.length > 0) {
        hasValidRecipe = true;
        break;
      }
    }
    if (hasValidRecipe) {
      finalWithRecipes++;
    }
  }
  console.log(`\nTotal items with recipes: ${finalWithRecipes} out of ${finalItems.length}`);
  console.log('\n✓ Complete!');
}

if (require.main === module) {
  addAllRecipes()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      console.error(error.stack);
      process.exit(1);
    });
}

module.exports = { addAllRecipes };
