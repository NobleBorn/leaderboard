const express = require('express');
const db = require('../db');
const router = express.Router();

// GET /api/participants
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT id, name, created_at FROM participants ORDER BY name COLLATE NOCASE').all();
  res.json(rows);
});

// POST /api/participants  { name }
router.post('/', (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name is required.' });
  if (name.length > 50) return res.status(400).json({ error: 'Name must be 50 characters or fewer.' });

  try {
    const info = db.prepare('INSERT INTO participants (name) VALUES (?)').run(name);
    const created = db.prepare('SELECT id, name, created_at FROM participants WHERE id = ?').get(Number(info.lastInsertRowid));
    res.status(201).json(created);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      // Return the existing participant rather than erroring
      const existing = db.prepare('SELECT id, name, created_at FROM participants WHERE name = ? COLLATE NOCASE').get(name);
      return res.status(200).json(existing);
    }
    throw err;
  }
});

// DELETE /api/participants/:id — also removes their submissions
router.delete('/:id', (req, res) => {
  const participant = db.prepare('SELECT id FROM participants WHERE id = ?').get(req.params.id);
  if (!participant) return res.status(404).json({ error: 'Participant not found.' });

  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM submissions WHERE participant_id = ?').run(participant.id);
    db.prepare('DELETE FROM participants WHERE id = ?').run(participant.id);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  res.status(204).end();
});

module.exports = router;
