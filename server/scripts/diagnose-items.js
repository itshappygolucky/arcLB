const db = require('../database/db');

async function diagnose() {
  await db.waitForDb();
  
  const items = await db.getAllItems();
  console.log(`Total items: ${items.length}\n`);
  
  const byType = {};
  const withoutRecipes = [];
  const withRecipes = [];
  
  for (const item of items) {
    const type = item.type || 'unknown';
    byType[type] = (byType[type] || 0) + 1;
    
    const recipes = await db.getRecipesByItemId(item.id);
    let hasMaterials = false;
    for (const recipe of recipes) {
      const materials = await db.getRecipeMaterials(recipe.id);
      if (materials.length > 0) {
        hasMaterials = true;
        break;
      }
    }
    
    if (hasMaterials) {
      withRecipes.push(item.name);
    } else {
      withoutRecipes.push({ name: item.name, type: item.type });
    }
  }
  
  console.log('Items by type:');
  Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  
  console.log(`\nItems WITH recipes (${withRecipes.length}):`);
  withRecipes.slice(0, 20).forEach(name => console.log(`  - ${name}`));
  if (withRecipes.length > 20) console.log(`  ... and ${withRecipes.length - 20} more`);
  
  console.log(`\nItems WITHOUT recipes (${withoutRecipes.length}):`);
  const byTypeNoRecipe = {};
  withoutRecipes.forEach(item => {
    byTypeNoRecipe[item.type] = (byTypeNoRecipe[item.type] || 0) + 1;
  });
  
  console.log('  By type:');
  Object.entries(byTypeNoRecipe).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    console.log(`    ${type}: ${count}`);
  });
  
  console.log('\n  Sample items without recipes:');
  withoutRecipes.slice(0, 30).forEach(item => {
    console.log(`    - ${item.name} (${item.type})`);
  });
  if (withoutRecipes.length > 30) {
    console.log(`    ... and ${withoutRecipes.length - 30} more`);
  }
}

diagnose().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
