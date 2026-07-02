/**
 * Scoring logic for each game type.
 *
 * Direct-scored games (Wordle, Connections, Strands) produce a score
 * at submission time from the raw result string.
 *
 * Ranked games (Mini Crossword) produce a rank-based score that is
 * recomputed for all submissions on a given date whenever a new entry
 * arrives.
 */

/**
 * Wordle: "1/6" through "6/6" or "X/6"
 * 1/6 = 6 pts, 2/6 = 5, ..., 6/6 = 1, X/6 = 0
 */
function scoreWordle(rawResult) {
  const upper = rawResult.trim().toUpperCase();
  if (upper === 'X/6') return 0;
  const match = upper.match(/^([1-6])\/6$/);
  if (!match) throw new Error(`Invalid Wordle result: "${rawResult}". Expected 1/6–6/6 or X/6.`);
  return 7 - parseInt(match[1], 10); // 1→6, 2→5, …, 6→1
}

/**
 * Connections: which color groups were solved, plus mistakes made — or "failed".
 * Raw format: "<comma-separated solved colors>;<mistakes>"  or  "failed"
 *   e.g. "yellow,green,blue,purple;2"  or  "yellow,green;3"  or  ";1" (nothing solved yet)
 * Mistakes range 0–3: a 4th wrong guess ends the round and should be submitted as "failed".
 * Colors are weighted by difficulty (yellow easiest → purple hardest):
 *   Yellow = 50, Green = 100, Blue = 150, Purple = 200
 * Score = sum of solved-group points − (mistakes × 25),
 *         plus a +100 bonus for solving all four groups.
 * "failed" always scores 0, regardless of any partial progress.
 */
const CONNECTIONS_GROUP_POINTS = { yellow: 50, green: 100, blue: 150, purple: 200 };

function scoreConnections(rawResult) {
  const trimmed = rawResult.trim();
  if (trimmed.toLowerCase() === 'failed') return 0;

  const match = trimmed.match(/^([a-zA-Z,\s]*);(\d+)$/);
  if (!match) {
    throw new Error(
      `Invalid Connections result: "${rawResult}". Expected "<solved colors>;<mistakes>", e.g. "yellow,green,blue,purple;2".`
    );
  }

  const [, colorsPart, mistakesPart] = match;
  const mistakes = parseInt(mistakesPart, 10);
  if (mistakes > 3) {
    throw new Error(`Invalid Connections result: "${rawResult}". Mistakes can't exceed 3 — a 4th wrong guess ends the round and should be submitted as "failed".`);
  }

  const solvedColors = colorsPart
    .toLowerCase()
    .split(',')
    .map(c => c.trim())
    .filter(Boolean);

  const validColors = Object.keys(CONNECTIONS_GROUP_POINTS);
  for (const color of solvedColors) {
    if (!validColors.includes(color)) {
      throw new Error(
        `Invalid Connections result: "${rawResult}". Unknown color "${color}", expected one of ${validColors.join(', ')}.`
      );
    }
  }

  const uniqueSolved = new Set(solvedColors);
  const groupPoints = [...uniqueSolved].reduce((sum, color) => sum + CONNECTIONS_GROUP_POINTS[color], 0);
  const totalSolved = uniqueSolved.size;
  const bonus = totalSolved === 4 ? 100 : 0;

  return groupPoints - mistakes * 25 + bonus;
}

/**
 * Strands: "no hints" | "with hints" | "failed"
 * no hints = 5, with hints = 3, failed = 0
 */
function scoreStrands(rawResult) {
  switch (rawResult.trim().toLowerCase()) {
    case 'no hints':   return 5;
    case 'with hints': return 3;
    case 'failed':     return 0;
    default:
      throw new Error(`Invalid Strands result: "${rawResult}". Expected "no hints", "with hints", or "failed".`);
  }
}

/**
 * Mini Crossword: "M:SS" or "MM:SS" (completion time)
 * Returns time in total seconds. Score is computed separately via rankMiniCrossword().
 * Returns -1 for "failed" / did not complete.
 */
function parseMiniCrosswordTime(rawResult) {
  const lower = rawResult.trim().toLowerCase();
  if (lower === 'failed' || lower === 'dnf') return -1;
  const match = rawResult.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid Mini Crossword time: "${rawResult}". Expected M:SS or MM:SS (e.g. 3:45) or "failed".`);
  }
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  if (seconds >= 60) throw new Error(`Seconds must be 0–59, got ${seconds}.`);
  return minutes * 60 + seconds;
}

/**
 * Given an array of { id, totalSeconds } for all submissions on a day,
 * compute rank-based scores.
 * Completions rank 1st→5pts, 2nd→4, 3rd→3, 4th→2, else→1.
 * Failed (totalSeconds === -1) = 0 pts.
 * Returns a Map of submission id → score.
 */
function rankMiniCrossword(entries) {
  const scores = new Map();

  // Sort completions by time ascending; failed entries go last
  const completed = entries
    .filter(e => e.totalSeconds >= 0)
    .sort((a, b) => a.totalSeconds - b.totalSeconds);

  const rankPoints = [5, 4, 3, 2]; // rank 1–4
  completed.forEach((entry, index) => {
    scores.set(entry.id, index < rankPoints.length ? rankPoints[index] : 1);
  });

  entries
    .filter(e => e.totalSeconds < 0)
    .forEach(e => scores.set(e.id, 0));

  return scores;
}

/**
 * Entry point: compute the score for a direct-scored game.
 * Throws with a user-friendly message on bad input.
 */
function computeDirectScore(gameName, rawResult) {
  switch (gameName) {
    case 'Wordle':      return scoreWordle(rawResult);
    case 'Connections': return scoreConnections(rawResult);
    case 'Strands':     return scoreStrands(rawResult);
    default:
      throw new Error(`Unknown direct-scored game: ${gameName}`);
  }
}

module.exports = { computeDirectScore, parseMiniCrosswordTime, rankMiniCrossword };
