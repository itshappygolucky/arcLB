const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET /api/items - Get all items
router.get('/', async (req, res) => {
  try {
    await db.waitForDb();
    const { type, search } = req.query;
    let items;
    
    if (type) {
      items = await db.getItemsByType(type);
    } else {
      items = await db.getAllItems();
    }
    
    // Filter by search term if provided
    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter(item => 
        item.name.toLowerCase().includes(searchLower)
      );
    }
    
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// GET /api/items/:name - Get specific item with recipes
router.get('/:name', async (req, res) => {
  try {
    await db.waitForDb();
    const { name } = req.params;
    const item = await db.getItemByName(name);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const recipes = await db.getRecipesByItemId(item.id);
    const itemWithRecipes = {
      ...item,
      recipes: await Promise.all(recipes.map(async (recipe) => {
        const materials = await db.getRecipeMaterials(recipe.id);
        return {
          ...recipe,
          materials
        };
      }))
    };
    
    res.json(itemWithRecipes);
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

module.exports = router;
