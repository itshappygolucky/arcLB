# Arc Raiders Loadout Builder

A web application to help players track items and materials needed for their Arc Raiders loadouts, with stash optimization for maximum efficiency.

## Features

- **Loadout Builder**: Select items you want to use in your loadout
- **Material Calculator**: Automatically calculates all intermediate and raw materials needed
- **Stash Optimizer**: Provides recommendations for managing your 280-item stash limit
- **Wiki Integration**: Scrapes data from Arc Raiders wikis for up-to-date item information

## Prerequisites

- Node.js (v16 or higher)
- npm

## Setup

### 1. Install Dependencies

Install frontend dependencies:
```bash
npm install
```

Install backend dependencies:
```bash
cd server
npm install
cd ..
```

### 2. Populate the Database

**IMPORTANT**: You must populate the database before using the app!

```bash
cd server
npm run populate
cd ..
```

This command will:
1. Seed the database with example items (Anvil IV, Medium Shield, Looting Mk. 3, etc.)
2. Scrape data from the Arc Raiders wikis
3. Store all items and recipes in the database

**Alternative**: If you only want the example items without scraping:
```bash
cd server
npm run seed
cd ..
```

### 3. Verify Database (Optional)

Check what's in your database:
```bash
cd server
npm run verify
cd ..
```

### 4. Start the Backend Server

In a terminal, start the API server:
```bash
cd server
npm start
```

The server will run on `http://localhost:3001`

### 5. Start the Frontend

In another terminal, start the Expo web server:
```bash
npm run web
```

The application will open in your browser automatically.

## Usage

1. **Select Items**: Use the search and filter to find items you want in your loadout
2. **Build Loadout**: Click items to add them to your selected loadout
3. **Calculate Materials**: Click "Calculate Materials" to see what you need
4. **View Results**: 
   - See intermediate materials (components, gun parts, etc.)
   - See raw materials (metal, rubber, wires, etc.)
   - View stash optimization recommendations

## Example

Try selecting these items:
- Anvil IV
- Medium Shield
- Looting Mk. 3 (Cautious)

The app will show you need:
- **Intermediate Materials**: Mechanical Components (16), Simple Gun Parts (7), Heavy Gun Parts (2), ARC Circuitry (1), Advanced Electrical Components (1), Processor (1)
- **Raw Materials**: Metal, Rubber, Wire, ARC Alloy (calculated from intermediate materials)

## Troubleshooting

### No items showing up when searching

**Solution**: Make sure you've populated the database:
```bash
cd server
npm run populate
cd ..
```

Then verify items are in the database:
```bash
cd server
npm run verify
cd ..
```

### Backend won't start
- Make sure port 3001 is not in use
- Check that all dependencies are installed: `cd server && npm install`
- Check that the database file exists: `server/database/arcraiders.db`

### Frontend can't connect to backend
- Ensure the backend is running on port 3001
- Check the API URL in `app/services/api.ts` (defaults to `http://localhost:3001/api`)
- Check browser console for CORS errors

### Calculations not working
- Ensure items have recipes in the database
- Check the server console for error messages
- Verify items exist: `cd server && npm run verify`

### Scraper not finding items
- Wiki pages may have changed structure - the scraper will try multiple parsing methods
- Some items may need to be added manually via the seed script
- Check server console for scraping errors

## Project Structure

```
arcLB/
├── app/                    # Frontend React Native/Expo app
│   ├── components/         # React components
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API client
│   └── index.tsx          # Main app page
├── server/                 # Backend Express API
│   ├── database/          # Database schema and connection
│   ├── routes/            # API routes
│   ├── services/          # Business logic (calculator, scraper, optimizer)
│   └── scripts/           # Utility scripts (scraper, seed, populate)
└── package.json           # Frontend dependencies
```

## API Endpoints

- `GET /api/items` - List all items (supports `?search=` and `?type=` query params)
- `GET /api/items/:name` - Get specific item with recipes
- `POST /api/loadout/calculate` - Calculate materials for selected items
  ```json
  {
    "items": ["Anvil IV", "Medium Shield", "Looting Mk. 3 (Cautious)"]
  }
  ```

## Development

### Backend Development
```bash
cd server
npm run dev  # Auto-reload on file changes
```

### Frontend Development
The Expo dev server automatically reloads on file changes when running `npm run web`.

### Database Scripts

- `npm run seed` - Load example items only (fast)
- `npm run populate` - Load example items + scrape wikis (slower, more complete)
- `npm run scrape` - Scrape wikis only
- `npm run verify` - Check what's in the database

## Database

The application uses SQLite (via `better-sqlite3`) for data storage. The database file is created at `server/database/arcraiders.db`.

### Database Schema

- **items**: Game items (weapons, shields, augments, materials)
- **materials**: Components and raw materials
- **recipes**: Crafting and upgrade recipes
- **recipe_materials**: Materials required for each recipe

## License

Private project
