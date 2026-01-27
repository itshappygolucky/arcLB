const axios = require('axios');
const cheerio = require('cheerio');
const db = require('../database/db');

// Add delay between requests to be respectful
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Scrape Arc Raiders wiki for item data
 * https://arcraiders.wiki/wiki/Loot
 */
async function scrapeArcRaidersWiki() {
  try {
    console.log('Scraping arcraiders.wiki/wiki/Loot...');
    const response = await axios.get('https://arcraiders.wiki/wiki/Loot', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    const items = [];
    
    // Try multiple table selectors - wikis can have different structures
    const tableSelectors = [
      'table.wikitable',
      'table.sortable',
      'table',
      '.mw-parser-output table'
    ];
    
    let foundTable = false;
    
    for (const selector of tableSelectors) {
      const tables = $(selector);
      
      if (tables.length > 0) {
        foundTable = true;
        console.log(`Found table with selector: ${selector}`);
        
        tables.each((tableIndex, table) => {
          const $table = $(table);
          const rows = $table.find('tr');
          
          // Try to find header row to understand structure
          let headerRow = null;
          rows.each((i, row) => {
            const $row = $(row);
            const headerCells = $row.find('th');
            if (headerCells.length > 0) {
              headerRow = $row;
              return false; // break
            }
          });
          
          // Parse data rows
          rows.each((i, row) => {
            const $row = $(row);
            const cells = $row.find('td');
            
            // Skip header rows
            if (cells.length === 0 || $row.find('th').length > 0) {
              return;
            }
            
            if (cells.length >= 2) {
              // Extract item name (usually first column)
              let name = $(cells[0]).text().trim();
              
              // Clean up name - remove links, extra whitespace
              name = name.replace(/\s+/g, ' ').trim();
              
              // Skip empty rows
              if (!name || name.length < 2) {
                return;
              }
              
              // Extract rarity (usually second column, but could vary)
              let rarity = '';
              let recycleYield = '';
              let stackSize = 1;
              let category = '';
              
              // Try to find rarity in various columns
              for (let j = 1; j < Math.min(cells.length, 6); j++) {
                const cellText = $(cells[j]).text().trim().toLowerCase();
                if (cellText.match(/^(common|uncommon|rare|epic|legendary)$/)) {
                  rarity = $(cells[j]).text().trim();
                } else if (cellText.includes('recycle') || cellText.includes('×')) {
                  recycleYield = $(cells[j]).text().trim();
                } else if (!isNaN(parseInt(cellText)) && parseInt(cellText) > 0 && parseInt(cellText) < 1000) {
                  stackSize = parseInt(cellText) || 1;
                }
              }
              
              // If we didn't find rarity in cells, try to extract from name or other patterns
              if (!rarity) {
                const nameLower = name.toLowerCase();
                if (nameLower.includes('common') || nameLower.includes('basic')) rarity = 'Common';
                else if (nameLower.includes('uncommon')) rarity = 'Uncommon';
                else if (nameLower.includes('rare')) rarity = 'Rare';
                else if (nameLower.includes('epic')) rarity = 'Epic';
                else if (nameLower.includes('legendary')) rarity = 'Legendary';
              }
              
              // Determine item type
              const type = determineItemType(name);
              
              items.push({
                name,
                rarity: rarity || 'Common',
                recycleYield: recycleYield || null,
                stackSize,
                type,
                category
              });
            }
          });
        });
        
        break; // Found a table, stop looking
      }
    }
    
    if (!foundTable) {
      console.log('No tables found, trying alternative parsing...');
      // Fallback: look for list items or other structures
      $('.mw-parser-output li, .mw-parser-output p').each((i, elem) => {
        const text = $(elem).text().trim();
        if (text.length > 3 && text.length < 100) {
          // Simple heuristic: if it looks like an item name
          const match = text.match(/^([A-Z][a-zA-Z\s]+(?:Parts|Components|Shield|Mk\.|Anvil|Gun)?)/);
          if (match) {
            items.push({
              name: match[1].trim(),
              rarity: 'Common',
              recycleYield: null,
              stackSize: 1,
              type: determineItemType(match[1]),
              category: ''
            });
          }
        }
      });
    }
    
    console.log(`Found ${items.length} items from arcraiders.wiki`);
    
    // Remove duplicates
    const uniqueItems = [];
    const seen = new Set();
    for (const item of items) {
      if (!seen.has(item.name.toLowerCase())) {
        seen.add(item.name.toLowerCase());
        uniqueItems.push(item);
      }
    }
    
    console.log(`After deduplication: ${uniqueItems.length} unique items`);
    return uniqueItems;
  } catch (error) {
    console.error('Error scraping arcraiders.wiki:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
    }
    return [];
  }
}

/**
 * Scrape Fandom wiki for crafting recipes
 * https://arc-raiders.fandom.com/wiki/Items
 */
async function scrapeFandomWiki() {
  try {
    console.log('Scraping arc-raiders.fandom.com/wiki/Items...');
    const response = await axios.get('https://arc-raiders.fandom.com/wiki/Items', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    const recipes = [];
    const items = [];
    
    // Look for item pages linked from the Items page
    $('a[href*="/wiki/"]').each((i, link) => {
      const href = $(link).attr('href');
      const text = $(link).text().trim();
      
      // Skip navigation and non-item links
      if (text && text.length > 2 && text.length < 100 && 
          !text.includes('Category:') && 
          !text.includes('File:') &&
          !text.includes('Template:') &&
          href && href.includes('/wiki/')) {
        
        const itemName = text;
        items.push({
          name: itemName,
          rarity: 'Common',
          type: determineItemType(itemName),
          stackSize: 1
        });
      }
    });
    
    // Also parse tables for recipe data
    $('table').each((i, table) => {
      const $table = $(table);
      const rows = $table.find('tr');
      
      rows.each((rowIndex, row) => {
        if (rowIndex === 0) return; // Skip header
        
        const $row = $(row);
        const cells = $row.find('td');
        
        if (cells.length >= 2) {
          const itemName = $(cells[0]).text().trim();
          const recipeText = $(cells[1]).text().trim();
          
          if (itemName && recipeText) {
            const materials = extractMaterialsFromText(recipeText);
            
            if (materials.length > 0) {
              recipes.push({
                itemName,
                materials,
                recipeType: recipeText.toLowerCase().includes('upgrade') ? 'upgrade' : 'craft'
              });
            }
          }
        }
      });
    });
    
    // Parse infoboxes and other structured data
    $('.infobox, .mw-parser-output').each((i, elem) => {
      const $elem = $(elem);
      const heading = $elem.find('h2, h3').first().text().trim();
      
      if (heading) {
        const content = $elem.text();
        const materials = extractMaterialsFromText(content);
        
        if (materials.length > 0) {
          recipes.push({
            itemName: heading,
            materials,
            recipeType: content.toLowerCase().includes('upgrade') ? 'upgrade' : 'craft'
          });
        }
      }
    });
    
    console.log(`Found ${items.length} items and ${recipes.length} recipes from fandom.com`);
    
    return { items, recipes };
  } catch (error) {
    console.error('Error scraping fandom.com:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
    }
    return { items: [], recipes: [] };
  }
}

/**
 * Scrape individual item pages from Fandom for detailed recipes
 */
async function scrapeItemPage(itemName) {
  try {
    // Convert item name to URL format
    const urlName = itemName.replace(/\s+/g, '_');
    const url = `https://arc-raiders.fandom.com/wiki/${encodeURIComponent(urlName)}`;
    
    await delay(500); // Be respectful with rate limiting
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const materials = [];
    
    // Look for recipe sections
    $('.mw-parser-output').find('*').each((i, elem) => {
      const text = $(elem).text();
      if (text.includes('Craft') || text.includes('Recipe') || text.includes('Required')) {
        const extracted = extractMaterialsFromText(text);
        materials.push(...extracted);
      }
    });
    
    return materials;
  } catch (error) {
    // Item page might not exist, that's okay
    return [];
  }
}

/**
 * Determine item type from name
 */
function determineItemType(name) {
  const lower = name.toLowerCase();
  
  if (lower.includes('shield')) return 'shield';
  if (lower.includes('augment') || lower.includes('mk.') || lower.match(/\bmk\s*\d+/i)) return 'augment';
  if (lower.includes('anvil') || lower.includes('gun') || lower.includes('weapon') || lower.includes('rifle') || lower.includes('pistol')) return 'weapon';
  if (lower.includes('component') || lower.includes('parts')) return 'component';
  if (lower.includes('metal') || lower.includes('rubber') || lower.includes('wire') || lower.includes('alloy')) return 'raw_material';
  
  return 'item';
}

/**
 * Extract materials from recipe text with improved patterns
 */
function extractMaterialsFromText(text) {
  const materials = [];
  
  // Multiple patterns to catch different formats
  const patterns = [
    /(\d+)\s*[x×]\s*([A-Z][a-zA-Z\s]+(?:Parts|Components|Shield|Circuitry|Alloy|Metal|Rubber|Wire|Processor)?)/g,
    /(\d+)\s+([A-Z][a-zA-Z\s]+(?:Parts|Components|Shield|Circuitry|Alloy|Metal|Rubber|Wire|Processor)?)/g,
    /([A-Z][a-zA-Z\s]+(?:Parts|Components|Shield|Circuitry|Alloy|Metal|Rubber|Wire|Processor)?)\s*[x×]?\s*(\d+)/g,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      let quantity, name;
      
      if (match[1] && !isNaN(parseInt(match[1]))) {
        quantity = parseInt(match[1]);
        name = match[2]?.trim();
      } else if (match[2] && !isNaN(parseInt(match[2]))) {
        name = match[1]?.trim();
        quantity = parseInt(match[2]);
      }
      
      if (name && quantity && quantity > 0 && quantity < 1000) {
        // Clean up name
        name = name.replace(/\s+/g, ' ').trim();
        
        // Avoid duplicates
        const existing = materials.find(m => m.name.toLowerCase() === name.toLowerCase());
        if (!existing) {
          materials.push({ name, quantity });
        } else {
          // Use the larger quantity if duplicate found
          existing.quantity = Math.max(existing.quantity, quantity);
        }
      }
    }
  }
  
  return materials;
}

/**
 * Store scraped data in database
 */
async function storeScrapedData(items, recipes) {
  console.log('Storing scraped data in database...');
  await db.waitForDb();
  
  let itemsStored = 0;
  let recipesStored = 0;
  
  // Store items
  for (const item of items) {
    try {
      const existing = await db.getItemByName(item.name);
      if (!existing) {
        await db.insertItem(
          item.name,
          item.type || 'item',
          item.rarity || 'Common',
          item.stackSize || 1,
          item.recycleYield || null,
          item.category || null
        );
        itemsStored++;
      }
    } catch (error) {
      console.error(`Error storing item ${item.name}:`, error.message);
    }
  }
  
  console.log(`Stored ${itemsStored} new items`);
  
  // Store recipes
  for (const recipe of recipes) {
    try {
      const item = await db.getItemByName(recipe.itemName);
      if (!item) {
        // Create item if it doesn't exist
        const itemId = await db.insertItem(
          recipe.itemName,
          determineItemType(recipe.itemName),
          'Common',
          1,
          null,
          null
        );
        
        const recipeId = await db.insertRecipe(
          itemId,
          recipe.recipeType || 'craft',
          null,
          null,
          null
        );
        
        // Store recipe materials
        for (const material of recipe.materials) {
          const materialItem = await db.getItemByName(material.name) || 
                             await db.getMaterialByName(material.name);
          const materialId = materialItem ? materialItem.id : null;
          
          await db.insertRecipeMaterial(
            recipeId,
            materialId,
            material.name,
            material.quantity,
            materialItem ? (materialItem.type === 'raw_material' ? 'raw' : 'item') : 'component'
          );
        }
        recipesStored++;
      } else {
        // Item exists, check if recipe exists
        const existingRecipes = await db.getRecipesByItemId(item.id);
        if (existingRecipes.length === 0 && recipe.materials.length > 0) {
          const recipeId = await db.insertRecipe(
            item.id,
            recipe.recipeType || 'craft',
            null,
            null,
            null
          );
          
          // Store recipe materials
          for (const material of recipe.materials) {
            const materialItem = await db.getItemByName(material.name) || 
                               await db.getMaterialByName(material.name);
            const materialId = materialItem ? materialItem.id : null;
            
            await db.insertRecipeMaterial(
              recipeId,
              materialId,
              material.name,
              material.quantity,
              materialItem ? (materialItem.type === 'raw_material' ? 'raw' : 'item') : 'component'
            );
          }
          recipesStored++;
        }
      }
    } catch (error) {
      console.error(`Error storing recipe for ${recipe.itemName}:`, error.message);
    }
  }
  
  console.log(`Stored ${recipesStored} new recipes`);
  console.log('Data storage complete!');
}

/**
 * Main scrape function
 */
async function scrapeAll() {
  console.log('Starting wiki scraping...');
  
  // Scrape arcraiders.wiki for items
  const items1 = await scrapeArcRaidersWiki();
  await delay(1000);
  
  // Scrape fandom.com for items and recipes
  const fandomData = await scrapeFandomWiki();
  const items2 = fandomData.items || [];
  const recipes = fandomData.recipes || [];
  
  // Combine items
  const allItems = [...items1];
  const seenNames = new Set(items1.map(i => i.name.toLowerCase()));
  
  for (const item of items2) {
    if (!seenNames.has(item.name.toLowerCase())) {
      allItems.push(item);
      seenNames.add(item.name.toLowerCase());
    }
  }
  
  console.log(`Total unique items found: ${allItems.length}`);
  console.log(`Total recipes found: ${recipes.length}`);
  
  // Store everything
  await storeScrapedData(allItems, recipes);
  
  console.log('Scraping complete!');
  return { items: allItems, recipes };
}

module.exports = {
  scrapeAll,
  scrapeArcRaidersWiki,
  scrapeFandomWiki,
  scrapeItemPage
};
