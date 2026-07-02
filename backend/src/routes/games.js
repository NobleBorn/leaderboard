const express = require('express');
const db = require('../db');
const router = express.Router();

const VALID_SCORING_TYPES = ['direct', 'ranked'];

// GET /api/games?all=1  (default: only enabled games)
router.get('/', (req, res) => {
  const query = req.query.all
    ? 'SELECT id, name, scoring_type, enabled FROM games ORDER BY id'
    : 'SELECT id, name, scoring_type, enabled FROM games WHERE enabled = 1 ORDER BY id';
  res.json(db.prepare(query).all());
});

// POST /api/games — add a new game, enabled by default
router.post('/', (req, res) => {
  const { name, scoringType } = req.body;
  if (!name || !VALID_SCORING_TYPES.includes(scoringType)) {
    return res.status(400).json({ error: `name and scoringType (${VALID_SCORING_TYPES.join(' or ')}) are required.` });
  }

  let info;
  try {
    info = db.prepare('INSERT INTO games (name, scoring_type) VALUES (?, ?)').run(name.trim(), scoringType);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: `A game named "${name}" already exists.` });
    }
    throw err;
  }

  const created = db.prepare('SELECT id, name, scoring_type, enabled FROM games WHERE id = ?')
    .get(Number(info.lastInsertRowid));
  res.status(201).json(created);
});

// PATCH /api/games/:id — enable or disable a game
router.patch('/:id', (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled (boolean) is required.' });
  }

  const game = db.prepare('SELECT id FROM games WHERE id = ?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found.' });

  db.prepare('UPDATE games SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, game.id);
  res.json(db.prepare('SELECT id, name, scoring_type, enabled FROM games WHERE id = ?').get(game.id));
});

module.exports = router;
