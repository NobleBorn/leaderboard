<template>
  <div>
    <div class="page-header">
      <h1>👥 Participants</h1>
      <p>Everyone competing in this tournament.</p>
    </div>

    <!-- Add participant -->
    <div class="card" style="max-width:420px;margin-bottom:1.5rem">
      <div class="card-title">➕ Add Player</div>
      <div v-if="addAlert.msg" :class="['alert', `alert-${addAlert.type}`]">{{ addAlert.msg }}</div>
      <div style="display:flex;gap:.5rem">
        <input
          v-model="newName"
          class="form-control"
          placeholder="Player name…"
          @keydown.enter="add"
        />
        <button class="btn btn-primary" :disabled="!newName.trim() || adding" @click="add">
          {{ adding ? '…' : 'Add' }}
        </button>
      </div>
    </div>

    <!-- List -->
    <div class="card">
      <div v-if="loading" class="loading">Loading…</div>
      <div v-else-if="participants.length === 0" class="empty-state">
        <div class="emoji">🤷</div>
        No participants yet. Add the first player above!
      </div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr><th>Player</th><th>Joined</th><th>Total Points</th><th>Games Played</th><th>Rank</th></tr>
          </thead>
          <tbody>
            <tr v-for="p in enriched" :key="p.id">
              <td style="font-weight:600">{{ p.name }}</td>
              <td style="font-size:.85rem;color:var(--text-muted)">{{ p.joined }}</td>
              <td><span class="badge badge-purple">{{ p.totalPoints ?? '—' }}</span></td>
              <td>{{ p.gamesPlayed ?? '—' }}</td>
              <td>
                <span v-if="p.rank" :class="rankClass(p.rank)" class="rank-badge">
                  {{ p.rank <= 3 ? ['🥇','🥈','🥉'][p.rank-1] : p.rank }}
                </span>
                <span v-else class="badge badge-gray">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '../api/index.js';

const participants = ref([]);
const leaderboard  = ref([]);
const loading      = ref(true);
const newName      = ref('');
const adding       = ref(false);
const addAlert     = ref({ msg: '', type: 'success' });

const enriched = computed(() => {
  return participants.value.map(p => {
    const lb = leaderboard.value.find(l => l.id === p.id);
    return {
      ...p,
      joined: p.created_at ? new Date(p.created_at.includes('T') ? p.created_at : p.created_at + 'Z').toLocaleDateString() : '—',
      totalPoints: lb?.totalPoints ?? (lb ? 0 : null),
      gamesPlayed: lb?.gamesPlayed ?? null,
      rank: lb?.rank ?? null,
    };
  }).sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999) || a.name.localeCompare(b.name));
});

function rankClass(rank) {
  if (rank === 1) return 'rank-1';
  if (rank === 2) return 'rank-2';
  if (rank === 3) return 'rank-3';
  return 'rank-n';
}

async function add() {
  const name = newName.value.trim();
  if (!name) return;
  adding.value = true;
  addAlert.value = { msg: '', type: 'success' };
  try {
    const p = await api.createParticipant(name);
    if (!participants.value.find(x => x.id === p.id)) {
      participants.value.push(p);
    }
    newName.value = '';
    addAlert.value = { msg: `${p.name} added!`, type: 'success' };
    setTimeout(() => { addAlert.value.msg = ''; }, 3000);
  } catch (err) {
    addAlert.value = { msg: err.message, type: 'error' };
  } finally {
    adding.value = false;
  }
}

onMounted(async () => {
  [participants.value, leaderboard.value] = await Promise.all([
    api.getParticipants(),
    api.getLeaderboard(),
  ]);
  loading.value = false;
});
</script>
