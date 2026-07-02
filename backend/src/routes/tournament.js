const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const CONFIG_PATH = path.join(__dirname, '../tournament.json');

// GET /api/tournament-config
router.get('/', (req, res) => {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  res.json(config);
});

// PUT /api/tournament-config
router.put('/', (req, res) => {
  const { name, startDate, endDate, enabledGames } = req.body;
  if (!name || !startDate || !endDate || !Array.isArray(enabledGames)) {
    return res.status(400).json({ error: 'name, startDate, endDate, and enabledGames are required.' });
  }
  const config = { name, startDate, endDate, enabledGames };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  res.json(config);
});

module.exports = router;
