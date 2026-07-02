const express = require('express');
const db = require('../db');
const { computeDirectScore, parseMiniCrosswordTime, rankMiniCrossword } = require('../scoring');
const router = express.Router();

// GET /api/submissions?date=YYYY-MM-DD
router.get('/', (req, res) => {
  const { date } = req.query;
  let query = `
    SELECT s.id, p.name AS participant, g.name AS game, s.date, s.raw_result, s.score, s.created_at
    FROM submissions s
    JOIN participants p ON p.id = s.participant_id
    JOIN games g ON g.id = s.game_id
  `;
  const params = [];
  if (date) {
    query += ' WHERE s.date = ?';
    params.push(date);
  }
  query += ' ORDER BY s.date DESC, g.name, s.score DESC';
  res.json(db.prepare(query).all(...params));
});

// POST /api/submissions
router.post('/', (req, res) => {
  const { participantId, gameId, date, rawResult } = req.body;

  if (!participantId || !gameId || !date || rawResult === undefined || rawResult === '') {
    return res.status(400).json({ error: 'participantId, gameId, date, and rawResult are required.' });
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD.' });
  }

  const participant = db.prepare('SELECT id FROM participants WHERE id = ?').get(participantId);
  if (!participant) return res.status(404).json({ error: 'Participant not found.' });

  const game = db.prepare('SELECT id, name, scoring_type FROM games WHERE id = ?').get(gameId);
  if (!game) return res.status(404).json({ error: 'Game not found.' });

  // Compute score
  let score;
  try {
    if (game.scoring_type === 'ranked') {
      // For Mini Crossword, parse the time — actual score set after ranking
      score = parseMiniCrosswordTime(rawResult);
    } else {
      score = computeDirectScore(game.name, rawResult);
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  // For ranked games, score stored temporarily as totalSeconds; overwritten after ranking below
  const insertStmt = db.prepare(`
    INSERT INTO submissions (participant_id, game_id, date, raw_result, score)
    VALUES (?, ?, ?, ?, ?)
  `);

  let info;
  try {
    info = insertStmt.run(participantId, gameId, date, rawResult.trim(), score);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({
        error: `You already submitted ${game.name} for ${date}. Use PUT to edit your submission.`,
      });
    }
    throw err;
  }

  // Re-rank all Mini Crossword submissions for this date
  if (game.scoring_type === 'ranked') {
    recomputeRankedScores(game.id, date);
  }

  const created = db.prepare(`
    SELECT s.id, p.name AS participant, g.name AS game, s.date, s.raw_result, s.score
    FROM submissions s
    JOIN participants p ON p.id = s.participant_id
    JOIN games g ON g.id = s.game_id
    WHERE s.id = ?
  `).get(Number(info.lastInsertRowid));

  res.status(201).json(created);
});

// PUT /api/submissions/:id  — edit a submission
router.put('/:id', (req, res) => {
  const { rawResult } = req.body;
  if (rawResult === undefined || rawResult === '') {
    return res.status(400).json({ error: 'rawResult is required.' });
  }

  const sub = db.prepare(`
    SELECT s.id, s.game_id, s.date, g.name AS game_name, g.scoring_type
    FROM submissions s JOIN games g ON g.id = s.game_id
    WHERE s.id = ?
  `).get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Submission not found.' });

  let score;
  try {
    if (sub.scoring_type === 'ranked') {
      score = parseMiniCrosswordTime(rawResult);
    } else {
      score = computeDirectScore(sub.game_name, rawResult);
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  db.prepare('UPDATE submissions SET raw_result = ?, score = ? WHERE id = ?')
    .run(rawResult.trim(), score, sub.id);

  if (sub.scoring_type === 'ranked') {
    recomputeRankedScores(sub.game_id, sub.date);
  }

  const updated = db.prepare(`
    SELECT s.id, p.name AS participant, g.name AS game, s.date, s.raw_result, s.score
    FROM submissions s
    JOIN participants p ON p.id = s.participant_id
    JOIN games g ON g.id = s.game_id
    WHERE s.id = ?
  `).get(sub.id);

  res.json(updated);
});

/**
 * Recompute rank-based scores for all Mini Crossword submissions on a given date.
 * We always re-derive totalSeconds from raw_result so stale rank-point values
 * in the score column don't corrupt rankings.
 */
function recomputeRankedScores(gameId, date) {
  const rows = db.prepare(
    'SELECT id, raw_result FROM submissions WHERE game_id = ? AND date = ?'
  ).all(gameId, date).map(r => ({
    id: r.id,
    totalSeconds: parseMiniCrosswordTime(r.raw_result),
  }));

  const scoreMap = rankMiniCrossword(rows);
  const updateStmt = db.prepare('UPDATE submissions SET score = ? WHERE id = ?');

  db.exec('BEGIN');
  try {
    scoreMap.forEach((pts, id) => updateStmt.run(pts, id));
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

module.exports = router;
