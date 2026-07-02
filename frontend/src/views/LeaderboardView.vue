<template>
  <div>
    <div class="page-header">
      <h1>🥇 Leaderboard</h1>
      <p>Overall standings sorted by total points, then average per game.</p>
    </div>

    <!-- Game filter tabs -->
    <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1.25rem">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="btn"
        :class="activeTab === tab.key ? 'btn-primary' : 'btn-secondary'"
        style="font-size:.85rem"
        @click="setTab(tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="card">
      <div v-if="loading" class="loading">Loading…</div>
      <div v-else-if="rows.length === 0" class="empty-state">
        <div class="emoji">🏁</div>
        No scores yet. Submit the first result!
      </div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Total Points</th>
              <th>Games Played</th>
              <th>Avg / Game</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <td>
                <span :class="rankClass(row.rank)" class="rank-badge">
                  {{ row.rank <= 3 ? ['🥇','🥈','🥉'][row.rank-1] : row.rank }}
                </span>
              </td>
              <td>
                <strong>{{ row.name }}</strong>
                <span v-if="row.rank === 1" style="margin-left:.4rem">👑</span>
              </td>
              <td>
                <span class="badge badge-purple" style="font-size:.95rem">{{ row.totalPoints }}</span>
              </td>
              <td>{{ row.gamesPlayed }}</td>
              <td>
                <span :class="avgBadge(row.avgPoints)">{{ row.avgPoints }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api/index.js';

const loading  = ref(true);
const rows     = ref([]);
const games    = ref([]);
const activeTab = ref('overall');

const tabs = ref([{ key: 'overall', label: '🏆 Overall' }]);

function rankClass(rank) {
  if (rank === 1) return 'rank-1';
  if (rank === 2) return 'rank-2';
  if (rank === 3) return 'rank-3';
  return 'rank-n';
}

function avgBadge(avg) {
  if (avg >= 4) return 'badge badge-green';
  if (avg >= 2.5) return 'badge badge-yellow';
  return 'badge badge-gray';
}

async function setTab(key) {
  activeTab.value = key;
  loading.value = true;
  try {
    if (key === 'overall') {
      rows.value = await api.getLeaderboard();
    } else {
      rows.value = await api.getGameLeaderboard(key);
    }
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  games.value = await api.getGames();
  const gameEmojis = { Wordle: '🟩', Connections: '🔗', 'Mini Crossword': '✏️', Strands: '🧵' };
  games.value.forEach(g => {
    tabs.value.push({ key: g.name, label: `${gameEmojis[g.name] || '🎮'} ${g.name}` });
  });
  await setTab('overall');
});
</script>
