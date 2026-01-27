const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'arcraiders.db');
const schemaPath = path.join(__dirname, 'schema.sql');

// Ensure directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
let db;
let dbInitialized = false;

// Promise wrapper for database operations
function promisify(fn) {
  return function(...args) {
    return new Promise((resolve, reject) => {
      fn.call(this, ...args, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  };
}

// Initialize database
function initDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      
      // Enable foreign keys
      db.run("PRAGMA foreign_keys = ON", (err) => {
        if (err) {
          console.error('Error enabling foreign keys:', err);
        }
      });
      
      // Check if tables exist
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='items'", (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!row) {
          console.log('Initializing database schema...');
          const schema = fs.readFileSync(schemaPath, 'utf8');
          db.exec(schema, (err) => {
            if (err) {
              console.error('Error running schema:', err);
              reject(err);
              return;
            }
            console.log('Database schema initialized');
            dbInitialized = true;
            resolve();
          });
        } else {
          dbInitialized = true;
          resolve();
        }
      });
    });
  });
}

// Initialize immediately
initDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
});

// Helper functions for database operations

// Items
function getItemByName(name) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM items WHERE name = ?', [name], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function getAllItems() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM items ORDER BY name', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function getItemsByType(type) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM items WHERE type = ? ORDER BY name', [type], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function insertItem(name, type, rarity, stackSize, recycleYield, category) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO items (name, type, rarity, stack_size, recycle_yield, category) VALUES (?, ?, ?, ?, ?, ?)',
      [name, type, rarity, stackSize, recycleYield, category],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function getItemById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM items WHERE id = ?', [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Materials
function getMaterialByName(name) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM materials WHERE name = ?', [name], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function getMaterialById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM materials WHERE id = ?', [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function getAllMaterials() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM materials ORDER BY name', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function insertMaterial(name, type, category, stackSize) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO materials (name, type, category, stack_size) VALUES (?, ?, ?, ?)',
      [name, type, category, stackSize],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

// Recipes
function getRecipesByItemId(itemId) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM recipes WHERE item_id = ?', [itemId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function getRecipeById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM recipes WHERE id = ?', [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function insertRecipe(itemId, recipeType, upgradeFromItemId, workbenchLevel, blueprintRequired) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO recipes (item_id, recipe_type, upgrade_from_item_id, workbench_level, blueprint_required) VALUES (?, ?, ?, ?, ?)',
      [itemId, recipeType, upgradeFromItemId, workbenchLevel, blueprintRequired],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

// Recipe Materials
function getRecipeMaterials(recipeId) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM recipe_materials WHERE recipe_id = ?', [recipeId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function insertRecipeMaterial(recipeId, materialId, materialName, quantity, materialType) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO recipe_materials (recipe_id, material_id, material_name, quantity, material_type) VALUES (?, ?, ?, ?, ?)',
      [recipeId, materialId, materialName, quantity, materialType],
      function(err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// Complex queries
function getItemWithRecipes(name) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT 
        i.*,
        r.id as recipe_id,
        r.recipe_type,
        r.upgrade_from_item_id,
        r.workbench_level,
        r.blueprint_required
      FROM items i
      LEFT JOIN recipes r ON i.id = r.item_id
      WHERE i.name = ?`,
      [name],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

// Wait for database to be ready
async function waitForDb() {
  while (!dbInitialized) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

module.exports = {
  db,
  initDatabase,
  waitForDb,
  // Items
  getItemByName,
  getAllItems,
  getItemsByType,
  insertItem,
  getItemById,
  
  // Materials
  getMaterialByName,
  getMaterialById,
  getAllMaterials,
  insertMaterial,
  
  // Recipes
  getRecipesByItemId,
  getRecipeById,
  insertRecipe,
  
  // Recipe Materials
  getRecipeMaterials,
  insertRecipeMaterial,
  
  // Complex queries
  getItemWithRecipes,
};
