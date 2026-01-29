const express = require('express');
const router = express.Router();
const calculator = require('../services/calculator');
const stashOptimizer = require('../services/stashOptimizer');

// POST /api/loadout/calculate - Calculate materials needed for loadout
router.post('/calculate', async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' });
    }
    
    // Calculate materials
    const calculation = await calculator.calculateMaterials(items);
    
    // Optimize stash
    const optimization = await stashOptimizer.optimize(calculation, 280);
    
    // Structure response to match API interface
    res.json({
      items: items,
      materials: {
        direct: calculation.direct,
        intermediate: calculation.intermediate,
        raw: calculation.raw,
        allItems: calculation.allItems,
        upgradeChains: calculation.upgradeChains || []
      },
      optimization: optimization
    });
  } catch (error) {
    console.error('Error calculating loadout:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to calculate loadout', details: error.message });
  }
});

// POST /api/loadout/breakdown - Calculate hierarchical breakdown for items
router.post('/breakdown', async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' });
    }
    
    // Calculate breakdowns for each item
    const breakdowns = await calculator.calculateItemBreakdowns(items);
    
    res.json(breakdowns);
  } catch (error) {
    console.error('Error calculating breakdown:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to calculate breakdown', details: error.message });
  }
});

// POST /api/loadout/stash-optimize - Calculate stash optimization for target items
router.post('/stash-optimize', async (req, res) => {
  try {
    const { targetItems, stashLimit = 280 } = req.body;
    
    if (!targetItems || !Array.isArray(targetItems) || targetItems.length === 0) {
      return res.status(400).json({ error: 'targetItems array is required' });
    }
    
    // Calculate materials needed for target items
    const calculation = await calculator.calculateMaterials(targetItems);
    
    // Optimize stash
    const optimization = await stashOptimizer.optimize(calculation, stashLimit);
    
    // Return just the optimization object (matches LoadoutCalculation['optimization'])
    res.json(optimization);
  } catch (error) {
    console.error('Error calculating stash optimization:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to calculate stash optimization', details: error.message });
  }
});

module.exports = router;
