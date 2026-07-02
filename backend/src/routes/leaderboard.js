const express = require('express');
const db = require('../db');
const router = express.Router();

// GET /api/leaderboard
// Returns all participants ranked by total points, then avg points per game.
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT
      p.id,
      p.name,
      COALESCE(SUM(s.score), 0)                          AS totalPoints,
      COUNT(s.id)                                        AS gamesPlayed,
      CASE WHEN COUNT(s.id) > 0
           THEN ROUND(CAST(SUM(s.score) AS REAL) / COUNT(s.id), 2)
           ELSE 0 END                                    AS avgPoints
    FROM participants p
    LEFT JOIN submissions s ON s.participant_id = p.id
    GROUP BY p.id
    ORDER BY totalPoints DESC, avgPoints DESC, p.name COLLATE NOCASE
  `).all();

  // Attach rank (handle ties)
  let rank = 1;
  const ranked = rows.map((row, i) => {
    if (i > 0) {
      const prev = rows[i - 1];
      if (row.totalPoints < prev.totalPoints ||
          (row.totalPoints === prev.totalPoints && row.avgPoints < prev.avgPoints)) {
        rank = i + 1;
      }
    }
    return { rank, ...row };
  });

  res.json(ranked);
});

// GET /api/leaderboard/game/:gameName — per-game leaderboard
router.get('/game/:gameName', (req, res) => {
  const game = db.prepare('SELECT id FROM games WHERE name = ?').get(req.params.gameName);
  if (!game) return res.status(404).json({ error: 'Game not found.' });

  const rows = db.prepare(`
    SELECT
      p.id,
      p.name,
      COALESCE(SUM(s.score), 0)                          AS totalPoints,
      COUNT(s.id)                                        AS gamesPlayed,
      CASE WHEN COUNT(s.id) > 0
           THEN ROUND(CAST(SUM(s.score) AS REAL) / COUNT(s.id), 2)
           ELSE 0 END                                    AS avgPoints
    FROM participants p
    LEFT JOIN submissions s ON s.participant_id = p.id AND s.game_id = ?
    WHERE s.id IS NOT NULL
    GROUP BY p.id
    ORDER BY totalPoints DESC, avgPoints DESC, p.name COLLATE NOCASE
  `).all(game.id);

  let rank = 1;
  const ranked = rows.map((row, i) => {
    if (i > 0) {
      const prev = rows[i - 1];
      if (row.totalPoints < prev.totalPoints ||
          (row.totalPoints === prev.totalPoints && row.avgPoints < prev.avgPoints)) {
        rank = i + 1;
      }
    }
    return { rank, ...row };
  });

  res.json(ranked);
});

module.exports = router;
