-- Items table: stores all game items (weapons, shields, augments, materials)
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL, -- 'weapon', 'shield', 'augment', 'component', 'raw_material'
    rarity TEXT, -- 'common', 'uncommon', 'rare', 'epic', 'legendary'
    stack_size INTEGER DEFAULT 1,
    recycle_yield TEXT, -- JSON string of what this item recycles to
    category TEXT, -- 'mechanical', 'electrical', 'gun_parts', etc.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Materials table: stores all materials (components and raw materials)
CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL, -- 'component' (intermediate) or 'raw' (base material)
    category TEXT, -- 'mechanical', 'electrical', 'gun_parts', 'metal', 'rubber', etc.
    stack_size INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Recipes table: stores crafting and upgrade recipes
CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    recipe_type TEXT NOT NULL, -- 'craft' or 'upgrade'
    upgrade_from_item_id INTEGER, -- For upgrade recipes, the item this upgrades from
    workbench_level INTEGER, -- Required workbench level
    blueprint_required TEXT, -- Name of blueprint required
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (upgrade_from_item_id) REFERENCES items(id)
);

-- Recipe materials table: stores what materials/components are needed for each recipe
CREATE TABLE IF NOT EXISTS recipe_materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    material_id INTEGER, -- Can be NULL if using material_name instead
    material_name TEXT, -- Direct material name (for flexibility)
    quantity INTEGER NOT NULL DEFAULT 1,
    material_type TEXT NOT NULL, -- 'item', 'component', 'raw'
    FOREIGN KEY (recipe_id) REFERENCES recipes(id),
    FOREIGN KEY (material_id) REFERENCES materials(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_recipes_item_id ON recipes(item_id);
CREATE INDEX IF NOT EXISTS idx_recipe_materials_recipe_id ON recipe_materials(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_materials_material_id ON recipe_materials(material_id);
