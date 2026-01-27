/**
 * Builds recipes.json, recycles.json, and salvages.json from data/items/*.json
 * Run from project root: node data/scripts/build-from-items.js
 *
 * Keeps EN-only for: type, rarity, foundIn, value, weightKg, stackSize, craftBench,
 * recipe, recyclesInto, salvagesInto. Output uses name.en as keys and resolved
 * material names (from id -> name.en) in values.
 */

const fs = require('fs');
const path = require('path');

const ITEMS_DIR = path.join(__dirname, '..', 'items');
const OUT_RECIPES = path.join(__dirname, '..', 'recipes.json');
const OUT_RECYCLES = path.join(__dirname, '..', 'recycles.json');
const OUT_SALVAGES = path.join(__dirname, '..', 'salvages.json');

function idToDisplayName(id) {
  return id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function toIngredientList(obj, idToName) {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj).map(([id, qty]) => ({
    material: idToName[id] || idToDisplayName(id),
    quantity: Number(qty) || 0,
  })).filter((x) => x.quantity > 0);
}

// 1) Load all items
const files = fs.readdirSync(ITEMS_DIR).filter((f) => f.endsWith('.json'));
const items = [];
for (const f of files) {
  try {
    const raw = fs.readFileSync(path.join(ITEMS_DIR, f), 'utf8');
    const data = JSON.parse(raw);
    const nameEn = data.name && (data.name.en || data.name['en']);
    if (!nameEn && !data.id) continue;
    items.push({
      id: data.id,
      nameEn: nameEn || idToDisplayName(data.id || path.basename(f, '.json')),
      recipe: data.recipe,
      recyclesInto: data.recyclesInto,
      salvagesInto: data.salvagesInto,
    });
  } catch (e) {
    console.warn('Skip', f, e.message);
  }
}

// 2) id -> name.en for resolving
const idToName = {};
for (const it of items) {
  if (it.id) idToName[it.id] = it.nameEn;
}

// 3) Build recipes, recycles, salvages
const recipes = {};
const recycles = {};
const salvages = {};

for (const it of items) {
  const key = it.nameEn;
  if (it.recipe && typeof it.recipe === 'object' && Object.keys(it.recipe).length > 0) {
    recipes[key] = toIngredientList(it.recipe, idToName);
  }
  if (it.recyclesInto && typeof it.recyclesInto === 'object' && Object.keys(it.recyclesInto).length > 0) {
    recycles[key] = toIngredientList(it.recyclesInto, idToName);
  }
  if (it.salvagesInto && typeof it.salvagesInto === 'object' && Object.keys(it.salvagesInto).length > 0) {
    salvages[key] = toIngredientList(it.salvagesInto, idToName);
  }
}

// 4) Write
fs.writeFileSync(OUT_RECIPES, JSON.stringify(recipes, null, 2), 'utf8');
fs.writeFileSync(OUT_RECYCLES, JSON.stringify(recycles, null, 2), 'utf8');
fs.writeFileSync(OUT_SALVAGES, JSON.stringify(salvages, null, 2), 'utf8');

console.log('Wrote:', OUT_RECIPES, Object.keys(recipes).length, 'recipes');
console.log('Wrote:', OUT_RECYCLES, Object.keys(recycles).length, 'recycles');
console.log('Wrote:', OUT_SALVAGES, Object.keys(salvages).length, 'salvages');
