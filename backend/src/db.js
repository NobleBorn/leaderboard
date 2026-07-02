// Uses Node's built-in sqlite (Node >= 22.5, stable in Node 24)
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../data/leaderboard.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);

db.exec(`PRAGMA journal_mode = WAL`);
db.exec(`PRAGMA foreign_keys = ON`);

db.exec(`
  CREATE TABLE IF NOT EXISTS participants (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS games (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL UNIQUE,
    scoring_type TEXT NOT NULL,
    enabled      INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_id INTEGER NOT NULL REFERENCES participants(id),
    game_id        INTEGER NOT NULL REFERENCES games(id),
    date           TEXT NOT NULL,
    raw_result     TEXT NOT NULL,
    score          REAL NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(participant_id, game_id, date)
  );
`);

// Seed the four default games
const seedGame = db.prepare(`INSERT OR IGNORE INTO games (name, scoring_type) VALUES (?, ?)`);
[
  ['Wordle', 'direct'],
  ['Connections', 'direct'],
].forEach(([name, type]) => seedGame.run(name, type));

module.exports = db;
