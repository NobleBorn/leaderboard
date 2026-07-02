// In dev, Vite proxies /api to the backend (see vite.config.js). In production,
// set VITE_API_URL to the deployed backend's origin, e.g. https://leaderboard-api.onrender.com
const BASE = `${import.meta.env.VITE_API_URL || ''}/api`;

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (res.status === 204) {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return null;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // Participants
  getParticipants:    ()       => request('GET',  '/participants'),
  createParticipant:  (name)   => request('POST', '/participants', { name }),
  deleteParticipant:  (id)     => request('DELETE', `/participants/${id}`),

  // Games
  getGames:    (all)              => request('GET', `/games${all ? '?all=1' : ''}`),
  addGame:     (name, scoringType) => request('POST', '/games', { name, scoringType }),
  setGameEnabled: (id, enabled)   => request('PATCH', `/games/${id}`, { enabled }),

  // Submissions
  getSubmissions:    (date)    => request('GET',  `/submissions${date ? `?date=${date}` : ''}`),
  createSubmission:  (data)    => request('POST', '/submissions', data),
  updateSubmission:  (id, raw) => request('PUT',  `/submissions/${id}`, { rawResult: raw }),

  // Leaderboard
  getLeaderboard:     ()       => request('GET', '/leaderboard'),
  getGameLeaderboard: (name)   => request('GET', `/leaderboard/game/${encodeURIComponent(name)}`),

  // Tournament
  getTournamentConfig: ()       => request('GET', '/tournament-config'),
  updateTournamentConfig: (cfg) => request('PUT', '/tournament-config', cfg),
};
