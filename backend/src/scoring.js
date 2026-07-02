/**
 * Scoring logic for each game type.
 *
 * Direct-scored games (Wordle, Connections) produce a score at
 * submission time from the raw result string.
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
 *   Yellow = 1, Green = 2, Blue = 3, Purple = 4
 * Score = sum of solved-group points − mistakes, clamped between 0 and 10.
 * "failed" always scores 0, regardless of any partial progress.
 */
const CONNECTIONS_GROUP_POINTS = { yellow: 1, green: 2, blue: 3, purple: 4 };

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

  return Math.max(0, Math.min(10, groupPoints - mistakes));
}

/**
 * Entry point: compute the score for a direct-scored game.
 * Throws with a user-friendly message on bad input.
 */
function computeDirectScore(gameName, rawResult) {
  switch (gameName) {
    case 'Wordle':      return scoreWordle(rawResult);
    case 'Connections': return scoreConnections(rawResult);
    default:
      throw new Error(`Unknown direct-scored game: ${gameName}`);
  }
}

module.exports = { computeDirectScore };
