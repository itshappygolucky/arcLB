# Quick Start Guide

## 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

## 2. Populate the Database

**IMPORTANT**: You must populate the database before items will show up!

```bash
cd server
npm run populate
cd ..
```

This will:
1. Create the database
2. Seed it with example items (Anvil I, II, III, IV, Medium Shield, Looting Mk. 3)
3. Scrape data from the Arc Raiders wikis
4. Store all items and recipes

**Alternative (example items only, faster):**
```bash
cd server
npm run seed
cd ..
```

**Verify the database has items:**
```bash
cd server
npm run verify
cd ..
```

## 3. Start the Backend

In one terminal:
```bash
cd server
npm start
```

You should see: `Server running on http://localhost:3001`

## 4. Start the Frontend

In another terminal (from the root directory):
```bash
npm run web
```

The app will open in your browser automatically.

## 5. Test the Application

1. Search for "Anvil IV" in the item selector
2. Click it to add to your loadout
3. Search for "Medium Shield" and add it
4. Search for "Looting Mk. 3" and add it
5. Click "Calculate Materials"
6. View the results:
   - Intermediate materials needed
   - Raw materials needed
   - Stash optimization recommendations

## Expected Results

For Anvil IV + Medium Shield + Looting Mk. 3 (Cautious):

**Intermediate Materials:**
- Mechanical Components: 16
- Simple Gun Parts: 7
- Heavy Gun Parts: 2
- ARC Circuitry: 1
- Advanced Electrical Components: 1
- Processor: 1

**Raw Materials:**
- Metal: (calculated from components)
- Rubber: (calculated from components)
- Wire: (calculated from components)
- ARC Alloy: (calculated from ARC Circuitry)

## Troubleshooting

- **Backend won't start**: Make sure port 3001 is available
- **Frontend can't connect**: Ensure backend is running first
- **No items showing**: Run `cd server && npm run seed` again
- **Calculations fail**: Check server console for errors
