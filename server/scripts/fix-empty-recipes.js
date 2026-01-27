const db = require('../database/db');
const { addAllRecipes } = require('./add-all-recipes');

/**
 * Fix empty recipes by adding materials to them
 */
async function fixEmptyRecipes() {
  await db.waitForDb();
  
  console.log('Fixing empty recipes...');
  
  // Get all recipes
  const items = await db.getAllItems();
  let fixed = 0;
  let deleted = 0;
  
  for (const item of items) {
    const recipes = await db.getRecipesByItemId(item.id);
    
    for (const recipe of recipes) {
      const materials = await db.getRecipeMaterials(recipe.id);
      
      if (materials.length === 0) {
        // This recipe has no materials - delete it so add-all-recipes can recreate it properly
        try {
          await new Promise((resolve, reject) => {
            db.db.run('DELETE FROM recipes WHERE id = ?', [recipe.id], (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          deleted++;
        } catch (error) {
          console.error(`Error deleting empty recipe ${recipe.id}:`, error.message);
        }
      }
    }
  }
  
  console.log(`Deleted ${deleted} empty recipes`);
  console.log('Now running add-all-recipes to populate them...\n');
  
  await addAllRecipes();
  
  console.log('\n✓ Empty recipes fixed!');
}

if (require.main === module) {
  fixEmptyRecipes()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = { fixEmptyRecipes };
