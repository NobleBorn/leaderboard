// Frontend scoring preview (mirrors backend logic for immediate feedback)
export function computePreviewScore(gameName, rawResult) {
  switch (gameName) {
    case 'Wordle': {
      const u = rawResult.trim().toUpperCase();
      if (u === 'X/6') return 0;
      const m = u.match(/^([1-6])\/6$/);
      return m ? 7 - parseInt(m[1]) : null;
    }
    case 'Connections': {
      const trimmed = rawResult.trim();
      if (trimmed.toLowerCase() === 'failed') return 0;
      const match = trimmed.match(/^([a-zA-Z,\s]*);(\d+)$/);
      if (!match) return null;
      const groupPoints = { yellow: 50, green: 100, blue: 150, purple: 200 };
      const [, colorsPart, mistakesPart] = match;
      const mistakes = parseInt(mistakesPart, 10);
      if (mistakes > 3) return null;
      const solved = new Set(colorsPart.toLowerCase().split(',').map(c => c.trim()).filter(Boolean));
      for (const c of solved) if (!(c in groupPoints)) return null;
      const points = [...solved].reduce((sum, c) => sum + groupPoints[c], 0);
      const bonus = solved.size === 4 ? 100 : 0;
      return points - mistakes * 25 + bonus;
    }
    case 'Strands': {
      const map = { 'no hints': 5, 'with hints': 3, 'failed': 0 };
      return map[rawResult.trim().toLowerCase()] ?? null;
    }
    default:
      return null;
  }
}
