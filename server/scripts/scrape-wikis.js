const scraper = require('../services/scraper');

async function main() {
  try {
    await scraper.scrapeAll();
    console.log('Wiki scraping completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during scraping:', error);
    process.exit(1);
  }
}

main();
