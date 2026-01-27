const db = require('../database/db');

/**
 * Verify what's in the database
 */
async function verifyDatabase() {
  console.log('='.repeat(60));
  console.log('Database Verification');
  console.log('='.repeat(60));
  
  try {
    await db.waitForDb();
    
    const items = await db.getAllItems();
    const materials = await db.getAllMaterials();
    
    console.log(`\nItems: ${items.length}`);
    if (items.length > 0) {
      console.log('\nFirst 20 items:');
      items.slice(0, 20).forEach(item => {
        console.log(`  - ${item.name} (${item.type}, ${item.rarity || 'N/A'})`);
      });
      
      // Check for example items
      const exampleItems = ['Anvil IV', 'Medium Shield', 'Looting Mk. 3 (Cautious)'];
      console.log('\nChecking for example items:');
      for (const name of exampleItems) {
        const item = await db.getItemByName(name);
        if (item) {
          console.log(`  ✓ ${name} - FOUND (ID: ${item.id})`);
          const recipes = await db.getRecipesByItemId(item.id);
          console.log(`    Recipes: ${recipes.length}`);
        } else {
          console.log(`  ✗ ${name} - NOT FOUND`);
        }
      }
    } else {
      console.log('\n⚠️  No items found in database!');
      console.log('   Run: cd server && npm run populate');
    }
    
    console.log(`\nMaterials: ${materials.length}`);
    if (materials.length > 0) {
      console.log('\nFirst 10 materials:');
      materials.slice(0, 10).forEach(mat => {
        console.log(`  - ${mat.name} (${mat.type})`);
      });
    }
    
    // Check recipes
    let totalRecipes = 0;
    for (const item of items) {
      const recipes = await db.getRecipesByItemId(item.id);
      totalRecipes += recipes.length;
    }
    
    console.log(`\nTotal recipes: ${totalRecipes}`);
    
    console.log('\n' + '='.repeat(60));
    
  } catch (error) {
    console.error('Error verifying database:', error);
    console.error(error.stack);
  }
}

// Run if called directly
if (require.main === module) {
  verifyDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { verifyDatabase };
