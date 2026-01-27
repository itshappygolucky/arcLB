const db = require('../database/db');

/**
 * Verify recipes and their materials are properly linked
 */
async function verifyRecipes() {
  await db.waitForDb();
  
  console.log('='.repeat(60));
  console.log('Recipe Verification');
  console.log('='.repeat(60));
  
  const items = await db.getAllItems();
  let itemsWithRecipes = 0;
  let itemsWithoutRecipes = 0;
  let recipesWithMaterials = 0;
  let recipesWithoutMaterials = 0;
  
  console.log(`\nChecking ${items.length} items...\n`);
  
  for (const item of items) {
    const recipes = await db.getRecipesByItemId(item.id);
    
    if (recipes.length > 0) {
      itemsWithRecipes++;
      
      for (const recipe of recipes) {
        const materials = await db.getRecipeMaterials(recipe.id);
        
        if (materials.length > 0) {
          recipesWithMaterials++;
          
          // Verify materials can be resolved
          for (const mat of materials) {
            const materialName = mat.material_name || (mat.material_id ? (await db.getMaterialById(mat.material_id))?.name : null);
            if (!materialName) {
              console.log(`⚠️  Recipe ${recipe.id} for ${item.name} has material with no name (material_id: ${mat.material_id})`);
            }
          }
        } else {
          recipesWithoutMaterials++;
          console.log(`⚠️  Recipe ${recipe.id} for ${item.name} has no materials`);
        }
      }
    } else {
      itemsWithoutRecipes++;
      // Only show first 10 items without recipes
      if (itemsWithoutRecipes <= 10 && item.type !== 'raw_material') {
        console.log(`  - ${item.name} (${item.type}) - no recipes`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Summary:');
  console.log(`  Items with recipes: ${itemsWithRecipes}`);
  console.log(`  Items without recipes: ${itemsWithoutRecipes}`);
  console.log(`  Recipes with materials: ${recipesWithMaterials}`);
  console.log(`  Recipes without materials: ${recipesWithoutMaterials}`);
  console.log('='.repeat(60));
  
  // Test a specific item
  console.log('\nTesting Anvil IV recipe resolution:');
  const anvil4 = await db.getItemByName('Anvil IV');
  if (anvil4) {
    const recipes = await db.getRecipesByItemId(anvil4.id);
    console.log(`  Found ${recipes.length} recipe(s)`);
    for (const recipe of recipes) {
      const materials = await db.getRecipeMaterials(recipe.id);
      console.log(`  Recipe ${recipe.id} (${recipe.recipe_type}):`);
      for (const mat of materials) {
        const materialName = mat.material_name || (mat.material_id ? (await db.getMaterialById(mat.material_id))?.name : null);
        console.log(`    - ${materialName}: ${mat.quantity} (type: ${mat.material_type})`);
      }
    }
  }
  
  // Test another item
  console.log('\nTesting Medium Shield recipe resolution:');
  const mediumShield = await db.getItemByName('Medium Shield');
  if (mediumShield) {
    const recipes = await db.getRecipesByItemId(mediumShield.id);
    console.log(`  Found ${recipes.length} recipe(s)`);
    for (const recipe of recipes) {
      const materials = await db.getRecipeMaterials(recipe.id);
      console.log(`  Recipe ${recipe.id} (${recipe.recipe_type}):`);
      for (const mat of materials) {
        const materialName = mat.material_name || (mat.material_id ? (await db.getMaterialById(mat.material_id))?.name : null);
        console.log(`    - ${materialName}: ${mat.quantity} (type: ${mat.material_type})`);
      }
    }
  }
}

if (require.main === module) {
  verifyRecipes()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = { verifyRecipes };
