<template>
  <div>
    <div class="page-header">
      <h1>{{ config?.name || 'Summer Games 2026' }} 🌞</h1>
      <p>Internal daily puzzle tournament. May the best puzzler win!</p>
    </div>

    <!-- Tournament info -->
    <div v-if="config" class="card" style="margin-bottom:1.5rem">
      <div class="card-title">📅 Tournament Period</div>
      <div style="display:flex;gap:2rem;flex-wrap:wrap">
        <div>
          <div class="stat-label">Start</div>
          <div style="font-weight:700">{{ config.startDate }}</div>
        </div>
        <div>
          <div class="stat-label">End</div>
          <div style="font-weight:700">{{ config.endDate }}</div>
        </div>
        <div>
          <div class="stat-label">Active Games</div>
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-top:2px">
            <span v-for="g in config.enabledGames" :key="g" class="badge badge-purple">{{ g }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Stats row -->
    <div class="grid-3" style="margin-bottom:1.5rem">
      <div class="card stat-tile">
        <div class="stat-value">{{ participants.length }}</div>
        <div class="stat-label">Players</div>
      </div>
      <div class="card stat-tile">
        <div class="stat-value">{{ todaySubmissions.length }}</div>
        <div class="stat-label">Submissions Today</div>
      </div>
      <div class="card stat-tile">
        <div class="stat-value">{{ topPlayer?.name ? topPlayer.name.split(' ')[0] : '—' }}</div>
        <div class="stat-label">Current Leader</div>
      </div>
    </div>

    <!-- Top 3 leaderboard preview -->
    <div class="card" style="margin-bottom:1.5rem">
      <div class="card-title">🥇 Top Players</div>
      <div v-if="leaderboard.length === 0" class="empty-state">
        <div class="emoji">🎮</div>
        No results yet — submit your first score!
      </div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rank</th><th>Player</th><th>Points</th><th>Games</th><th>Avg</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in leaderboard.slice(0,5)" :key="row.id">
              <td>
                <span :class="rankClass(row.rank)" class="rank-badge">
                  {{ row.rank <= 3 ? ['🥇','🥈','🥉'][row.rank-1] : row.rank }}
                </span>
              </td>
              <td style="font-weight:600">{{ row.name }}</td>
              <td><strong>{{ row.totalPoints }}</strong></td>
              <td>{{ row.gamesPlayed }}</td>
              <td>{{ row.avgPoints }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style="margin-top:1rem">
        <router-link to="/leaderboard" class="btn btn-secondary btn-sm">View full leaderboard →</router-link>
      </div>
    </div>

    <!-- Today's activity -->
    <div class="card">
      <div class="card-title">📅 Today's Activity <span class="badge badge-gray" style="margin-left:.5rem">{{ today }}</span></div>
      <div v-if="todaySubmissions.length === 0" class="empty-state" style="padding:1.5rem">
        <div class="emoji">☀️</div>
        No submissions yet today. Be the first!
      </div>
      <div v-else class="table-wrap">
        <table>
          <thead><tr><th>Player</th><th>Game</th><th>Result</th><th>Points</th></tr></thead>
          <tbody>
            <tr v-for="s in todaySubmissions" :key="s.id">
              <td style="font-weight:600">{{ s.participant }}</td>
              <td>
                <span :class="gameIconClass(s.game)" class="game-icon">{{ gameEmoji(s.game) }}</span>
                {{ s.game }}
              </td>
              <td><code>{{ s.raw_result }}</code></td>
              <td><span class="badge badge-purple">{{ s.score }} pts</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style="margin-top:1rem;display:flex;gap:.75rem;flex-wrap:wrap">
        <router-link to="/submit" class="btn btn-primary btn-sm">Submit a result ✏️</router-link>
        <router-link to="/daily" class="btn btn-secondary btn-sm">Full daily view →</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { api } from '../api/index.js';

const config          = ref(null);
const participants    = ref([]);
const leaderboard     = ref([]);
const todaySubmissions = ref([]);
const today = new Date().toISOString().slice(0, 10);

const topPlayer = computed(() => leaderboard.value[0] || null);

function rankClass(rank) {
  if (rank === 1) return 'rank-1';
  if (rank === 2) return 'rank-2';
  if (rank === 3) return 'rank-3';
  return 'rank-n';
}

function gameEmoji(game) {
  const map = { Wordle: '🟩', Connections: '🔗', 'Mini Crossword': '✏️', Strands: '🧵' };
  return map[game] || '🎮';
}
function gameIconClass(game) {
  const map = {
    Wordle: 'game-wordle',
    Connections: 'game-connections',
    'Mini Crossword': 'game-crossword',
    Strands: 'game-strands',
  };
  return map[game] || '';
}

onMounted(async () => {
  [config.value, participants.value, leaderboard.value, todaySubmissions.value] = await Promise.all([
    api.getTournamentConfig(),
    api.getParticipants(),
    api.getLeaderboard(),
    api.getSubmissions(today),
  ]);
});
</script>
