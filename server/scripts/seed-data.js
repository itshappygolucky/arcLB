const db = require('../database/db');

/**
 * Seed the database with example Arc Raiders items and recipes
 * This includes the example items: Anvil IV, Medium Shield, Looting Mk. 3 (Cautious)
 */
async function seedData() {
  console.log('Seeding database with example data...');
  
  // Wait for database to be ready
  await db.waitForDb();

  // Insert raw materials
  const metalId = await db.insertMaterial('Metal', 'raw', 'metal', 50);
  const rubberId = await db.insertMaterial('Rubber', 'raw', 'rubber', 50);
  const wireId = await db.insertMaterial('Wire', 'raw', 'electrical', 50);
  const arcAlloyId = await db.insertMaterial('ARC Alloy', 'raw', 'metal', 20);

  // Insert intermediate components
  const mechanicalComponentId = await db.insertMaterial('Mechanical Components', 'component', 'mechanical', 20);
  const simpleGunPartsId = await db.insertMaterial('Simple Gun Parts', 'component', 'gun_parts', 20);
  const heavyGunPartsId = await db.insertMaterial('Heavy Gun Parts', 'component', 'gun_parts', 10);
  const arcCircuitryId = await db.insertMaterial('ARC Circuitry', 'component', 'electrical', 10);
  const advancedElectricalId = await db.insertMaterial('Advanced Electrical Components', 'component', 'electrical', 10);
  const processorId = await db.insertMaterial('Processor', 'component', 'electrical', 5);

  // Insert items
  // Anvil series
  const anvil1Id = await db.insertItem('Anvil I', 'weapon', 'common', 1, null, 'weapon');
  const anvil2Id = await db.insertItem('Anvil II', 'weapon', 'uncommon', 1, null, 'weapon');
  const anvil3Id = await db.insertItem('Anvil III', 'weapon', 'rare', 1, null, 'weapon');
  const anvil4Id = await db.insertItem('Anvil IV', 'weapon', 'epic', 1, null, 'weapon');

  // Shield
  const mediumShieldId = await db.insertItem('Medium Shield', 'shield', 'rare', 1, 'ARC Circuitry ×1', 'shield');

  // Augment
  const lootingMk3Id = await db.insertItem('Looting Mk. 3 (Cautious)', 'augment', 'rare', 1, null, 'augment');

  // Insert recipes
  // Anvil I recipe (craft)
  const anvil1RecipeId = await db.insertRecipe(anvil1Id, 'craft', null, 1, 'Anvil Blueprint');
  await db.insertRecipeMaterial(anvil1RecipeId, mechanicalComponentId, 'Mechanical Components', 5, 'component');
  await db.insertRecipeMaterial(anvil1RecipeId, simpleGunPartsId, 'Simple Gun Parts', 6, 'component');

  // Anvil II recipe (upgrade from Anvil I)
  const anvil2RecipeId = await db.insertRecipe(anvil2Id, 'upgrade', anvil1Id, 2, null);
  await db.insertRecipeMaterial(anvil2RecipeId, mechanicalComponentId, 'Mechanical Components', 3, 'component');
  await db.insertRecipeMaterial(anvil2RecipeId, simpleGunPartsId, 'Simple Gun Parts', 1, 'component');

  // Anvil III recipe (upgrade from Anvil II)
  const anvil3RecipeId = await db.insertRecipe(anvil3Id, 'upgrade', anvil2Id, 3, null);
  await db.insertRecipeMaterial(anvil3RecipeId, mechanicalComponentId, 'Mechanical Components', 4, 'component');
  await db.insertRecipeMaterial(anvil3RecipeId, heavyGunPartsId, 'Heavy Gun Parts', 1, 'component');

  // Anvil IV recipe (upgrade from Anvil III)
  const anvil4RecipeId = await db.insertRecipe(anvil4Id, 'upgrade', anvil3Id, 4, null);
  await db.insertRecipeMaterial(anvil4RecipeId, mechanicalComponentId, 'Mechanical Components', 4, 'component');
  await db.insertRecipeMaterial(anvil4RecipeId, heavyGunPartsId, 'Heavy Gun Parts', 1, 'component');

  // Medium Shield recipe (craft)
  const mediumShieldRecipeId = await db.insertRecipe(mediumShieldId, 'craft', null, 2, 'Medium Shield Blueprint');
  await db.insertRecipeMaterial(mediumShieldRecipeId, arcCircuitryId, 'ARC Circuitry', 1, 'component');

  // Looting Mk. 3 (Cautious) recipe (craft)
  const lootingMk3RecipeId = await db.insertRecipe(lootingMk3Id, 'craft', null, 2, 'Looting Mk. 3 Blueprint');
  await db.insertRecipeMaterial(lootingMk3RecipeId, advancedElectricalId, 'Advanced Electrical Components', 1, 'component');
  await db.insertRecipeMaterial(lootingMk3RecipeId, processorId, 'Processor', 1, 'component');

  // Add recipes for breaking down components to raw materials (optional, for demonstration)
  // First, we need to create items for the materials so they can have recipes
  // Mechanical Components item
  const mechanicalComponentItemId = await db.insertItem('Mechanical Components', 'component', 'common', 20, null, 'mechanical');
  const mechCompRecipeId = await db.insertRecipe(mechanicalComponentItemId, 'craft', null, 1, null);
  await db.insertRecipeMaterial(mechCompRecipeId, metalId, 'Metal', 5, 'raw');

  // Simple Gun Parts item
  const simpleGunPartsItemId = await db.insertItem('Simple Gun Parts', 'component', 'common', 20, null, 'gun_parts');
  const simpleGunRecipeId = await db.insertRecipe(simpleGunPartsItemId, 'craft', null, 1, null);
  await db.insertRecipeMaterial(simpleGunRecipeId, metalId, 'Metal', 3, 'raw');
  await db.insertRecipeMaterial(simpleGunRecipeId, rubberId, 'Rubber', 2, 'raw');

  // Heavy Gun Parts item
  const heavyGunPartsItemId = await db.insertItem('Heavy Gun Parts', 'component', 'uncommon', 10, null, 'gun_parts');
  const heavyGunRecipeId = await db.insertRecipe(heavyGunPartsItemId, 'craft', null, 2, null);
  await db.insertRecipeMaterial(heavyGunRecipeId, metalId, 'Metal', 5, 'raw');
  await db.insertRecipeMaterial(heavyGunRecipeId, rubberId, 'Rubber', 3, 'raw');

  // ARC Circuitry item
  const arcCircuitryItemId = await db.insertItem('ARC Circuitry', 'component', 'rare', 10, null, 'electrical');
  const arcCircuitryRecipeId = await db.insertRecipe(arcCircuitryItemId, 'craft', null, 2, null);
  await db.insertRecipeMaterial(arcCircuitryRecipeId, arcAlloyId, 'ARC Alloy', 2, 'raw');

  // Advanced Electrical Components item
  const advancedElectricalItemId = await db.insertItem('Advanced Electrical Components', 'component', 'rare', 10, null, 'electrical');
  const advElecRecipeId = await db.insertRecipe(advancedElectricalItemId, 'craft', null, 2, null);
  await db.insertRecipeMaterial(advElecRecipeId, wireId, 'Wire', 3, 'raw');
  await db.insertRecipeMaterial(advElecRecipeId, metalId, 'Metal', 2, 'raw');

  // Processor item
  const processorItemId = await db.insertItem('Processor', 'component', 'uncommon', 5, null, 'electrical');
  const processorRecipeId = await db.insertRecipe(processorItemId, 'craft', null, 2, null);
  await db.insertRecipeMaterial(processorRecipeId, wireId, 'Wire', 2, 'raw');
  await db.insertRecipeMaterial(processorRecipeId, metalId, 'Metal', 1, 'raw');

  console.log('Database seeded successfully!');
  console.log('\nExample items added:');
  console.log('- Anvil I, II, III, IV');
  console.log('- Medium Shield');
  console.log('- Looting Mk. 3 (Cautious)');
  console.log('\nYou can now test the loadout calculator with these items.');
}

// Run seed if called directly
if (require.main === module) {
  seedData()
    .then(() => {
      console.log('\n✓ Seed complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error seeding database:', error);
      process.exit(1);
    });
}

module.exports = { seedData };
