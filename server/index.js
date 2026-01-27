const express = require('express');
const cors = require('cors');
const itemsRouter = require('./routes/items');
const loadoutRouter = require('./routes/loadout');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/items', itemsRouter);
app.use('/api/loadout', loadoutRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Arc Raiders Loadout Builder API' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
