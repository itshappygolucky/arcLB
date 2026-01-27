const db = require('../database/db');
const scraper = require('../services/scraper');
const { seedData } = require('./seed-data');
const { addMoreRecipes } = require('./add-more-recipes');
const { addAllRecipes } = require('./add-all-recipes');

/**
 * Populate database with data from seed script and wiki scraping
 */
async function populateDatabase() {
  console.log('='.repeat(60));
  console.log('Populating Arc Raiders Loadout Builder Database');
  console.log('='.repeat(60));
  
  try {
    // Wait for database to be ready
    await db.waitForDb();
    
    // First, run the seed script to ensure we have the example items
    console.log('\n[1/4] Seeding database with example items...');
    await seedData();
    console.log('✓ Seed data loaded');
    
    // Add more recipes for common items
    console.log('\n[2/4] Adding recipes for more items...');
    await addMoreRecipes();
    console.log('✓ Additional recipes added');
    
    // Add recipes for all craftable items
    console.log('\n[2.5/4] Adding recipes for all craftable items...');
    await addAllRecipes();
    console.log('✓ All recipes added');
    
    // Check what we have so far
    const itemsAfterSeed = await db.getAllItems();
    console.log(`  Items in database: ${itemsAfterSeed.length}`);
    
    // Then scrape from wikis
    console.log('\n[3/5] Scraping data from wikis...');
    console.log('  This may take a few minutes...');
    
    const scrapeResult = await scraper.scrapeAll();
    console.log('✓ Wiki scraping complete');
    console.log(`  Items found: ${scrapeResult.items.length}`);
    console.log(`  Recipes found: ${scrapeResult.recipes.length}`);
    
    // Add recipes again after scraping (in case new items were added)
    console.log('\n[4/5] Adding recipes for newly scraped items...');
    await addAllRecipes();
    console.log('✓ Recipes updated');
    
    // Final count
    console.log('\n[5/5] Verifying database...');
    const finalItems = await db.getAllItems();
    const finalMaterials = await db.getAllMaterials();
    
    console.log('✓ Database populated successfully!');
    console.log(`\nFinal counts:`);
    console.log(`  Items: ${finalItems.length}`);
    console.log(`  Materials: ${finalMaterials.length}`);
    
    // Show some example items
    console.log('\nSample items in database:');
    finalItems.slice(0, 10).forEach(item => {
      console.log(`  - ${item.name} (${item.type}, ${item.rarity || 'N/A'})`);
    });
    
    if (finalItems.length > 10) {
      console.log(`  ... and ${finalItems.length - 10} more`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('Database population complete!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error populating database:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  populateDatabase()
    .then(() => {
      console.log('\n✓ All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { populateDatabase };
