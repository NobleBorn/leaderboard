<template>
  <div>
    <div class="page-header">
      <h1>📅 Daily Results</h1>
      <p>All submissions for a given day, grouped by game.</p>
    </div>

    <!-- Date picker -->
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap">
      <input type="date" v-model="date" class="form-control" style="width:180px" :max="today" @change="load" />
      <span class="badge badge-gray">{{ date }}</span>
      <button class="btn btn-secondary btn-sm" @click="goToday">Today</button>
    </div>

    <div v-if="loading" class="loading">Loading…</div>

    <div v-else-if="Object.keys(grouped).length === 0" class="empty-state">
      <div class="emoji">😴</div>
      No submissions for this date yet.
    </div>

    <div v-else style="display:flex;flex-direction:column;gap:1.25rem">
      <div v-for="(subs, game) in grouped" :key="game" class="card">
        <div class="card-title">
          <span :class="gameIconClass(game)" class="game-icon">{{ gameEmoji(game) }}</span>
          {{ game }}
          <span class="badge badge-gray" style="margin-left:auto">{{ subs.length }} submission{{ subs.length !== 1 ? 's' : '' }}</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>Result</th>
                <th>Points</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in subs" :key="s.id">
                <td style="font-weight:600">{{ s.participant }}</td>
                <td>
                  <code style="background:var(--bg);padding:.15rem .4rem;border-radius:4px">{{ s.raw_result }}</code>
                </td>
                <td>
                  <span :class="pointsBadge(s.score, game)">{{ s.score }} pts</span>
                </td>
                <td style="font-size:.82rem;color:var(--text-muted)">
                  {{ formatTime(s.created_at) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api/index.js';

const date    = ref(new Date().toISOString().slice(0, 10));
const today   = new Date().toISOString().slice(0, 10);
const loading = ref(true);
const grouped = ref({});

const GAME_ORDER = ['Wordle', 'Connections', 'Mini Crossword', 'Strands'];

async function load() {
  loading.value = true;
  try {
    const subs = await api.getSubmissions(date.value);
    const g = {};
    GAME_ORDER.forEach(name => {
      const items = subs.filter(s => s.game === name);
      if (items.length) g[name] = items.sort((a, b) => b.score - a.score);
    });
    // Any games not in GAME_ORDER
    subs.forEach(s => {
      if (!g[s.game]) g[s.game] = [];
      if (!g[s.game].includes(s)) g[s.game].push(s);
    });
    grouped.value = g;
  } finally {
    loading.value = false;
  }
}

function goToday() {
  date.value = today;
  load();
}

function gameEmoji(game) {
  return { Wordle: '🟩', Connections: '🔗', 'Mini Crossword': '✏️', Strands: '🧵' }[game] || '🎮';
}
function gameIconClass(game) {
  return { Wordle: 'game-wordle', Connections: 'game-connections', 'Mini Crossword': 'game-crossword', Strands: 'game-strands' }[game] || '';
}

function pointsBadge(score, game) {
  const max = { Wordle: 6, Connections: 600, 'Mini Crossword': 5, Strands: 5 }[game] || 5;
  if (score === max) return 'badge badge-green';
  if (score >= max * 0.6) return 'badge badge-yellow';
  if (score <= 0) return 'badge badge-red';
  return 'badge badge-purple';
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso.includes('T') ? iso : iso + 'Z');
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

onMounted(load);
</script>
