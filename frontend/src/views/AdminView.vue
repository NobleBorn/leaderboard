<template>
  <div>
    <div class="page-header">
      <h1>🛠️ Admin</h1>
      <p>Manage players, games, and submitted scores.</p>
    </div>

    <!-- Pin gate -->
    <div v-if="!unlocked" class="card" style="max-width:360px">
      <div class="card-title">🔒 Enter Pincode</div>
      <div v-if="pinError" class="alert alert-error">{{ pinError }}</div>
      <div class="form-group">
        <label>Pincode</label>
        <input
          v-model="pinInput"
          type="password"
          inputmode="numeric"
          class="form-control"
          placeholder="Enter pincode…"
          @keydown.enter="submitPin"
        />
      </div>
      <button class="btn btn-primary" style="width:100%" :disabled="!pinInput" @click="submitPin">Unlock</button>
    </div>

    <div v-else style="display:flex;flex-direction:column;gap:1.5rem">

      <!-- Players -->
      <div class="card">
        <div class="card-title">👥 Players</div>
        <div v-if="playerAlert.msg" :class="['alert', `alert-${playerAlert.type}`]">{{ playerAlert.msg }}</div>

        <div v-if="loadingPlayers" class="loading">Loading…</div>
        <div v-else-if="enrichedParticipants.length === 0" class="empty-state">
          <div class="emoji">🤷</div>
          No players yet.
        </div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr><th>Player</th><th>Total Points</th><th>Games Played</th><th></th></tr>
            </thead>
            <tbody>
              <tr v-for="p in enrichedParticipants" :key="p.id">
                <td style="font-weight:600">{{ p.name }}</td>
                <td><span class="badge badge-purple">{{ p.totalPoints ?? '—' }}</span></td>
                <td>{{ p.gamesPlayed ?? '—' }}</td>
                <td style="text-align:right">
                  <button class="btn btn-secondary btn-sm" :disabled="removingId === p.id" @click="removePlayer(p)">
                    {{ removingId === p.id ? '…' : '🗑️ Remove' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Games -->
      <div class="card">
        <div class="card-title">🎮 Games</div>
        <div v-if="gameAlert.msg" :class="['alert', `alert-${gameAlert.type}`]">{{ gameAlert.msg }}</div>

        <div v-if="loadingGames" class="loading">Loading…</div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Scoring</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              <tr v-for="g in games" :key="g.id">
                <td style="font-weight:600">{{ g.name }}</td>
                <td><span class="badge badge-gray">{{ g.scoring_type }}</span></td>
                <td>
                  <span :class="g.enabled ? 'badge badge-green' : 'badge badge-red'">{{ g.enabled ? 'Enabled' : 'Disabled' }}</span>
                </td>
                <td style="text-align:right">
                  <button class="btn btn-secondary btn-sm" :disabled="togglingId === g.id" @click="toggleGame(g)">
                    {{ togglingId === g.id ? '…' : (g.enabled ? 'Disable' : 'Enable') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Edit submissions -->
      <div class="card">
        <div class="card-title">✏️ Edit Submissions</div>
        <div v-if="subAlert.msg" :class="['alert', `alert-${subAlert.type}`]">{{ subAlert.msg }}</div>

        <div style="display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:1rem">
          <div style="flex:1 1 180px">
            <label style="display:block;font-weight:600;font-size:.85rem;margin-bottom:.3rem;color:var(--text-muted)">Player</label>
            <ThemedSelect v-model="filterParticipant" :options="participantFilterOptions" placeholder="All players" />
          </div>
          <div style="flex:1 1 180px">
            <label style="display:block;font-weight:600;font-size:.85rem;margin-bottom:.3rem;color:var(--text-muted)">Game</label>
            <ThemedSelect v-model="filterGame" :options="gameFilterOptions" placeholder="All games" />
          </div>
        </div>

        <div v-if="loadingSubs" class="loading">Loading…</div>
        <div v-else-if="filteredSubmissions.length === 0" class="empty-state">
          <div class="emoji">🗒️</div>
          No submissions match.
        </div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr><th>Player</th><th>Game</th><th>Date</th><th>Result</th><th>Score</th><th></th></tr>
            </thead>
            <tbody>
              <tr v-for="s in filteredSubmissions" :key="s.id">
                <td style="font-weight:600">{{ s.participant }}</td>
                <td>{{ s.game }}</td>
                <td style="font-size:.85rem;color:var(--text-muted)">{{ s.date }}</td>
                <td>
                  <input
                    v-if="editingId === s.id"
                    v-model="editingRaw"
                    class="form-control"
                    style="font-size:.85rem;min-width:160px"
                    @keydown.enter="saveEdit(s)"
                  />
                  <code v-else style="background:var(--bg);padding:.15rem .4rem;border-radius:4px">{{ s.raw_result }}</code>
                </td>
                <td>
                  <span v-if="editingId === s.id" style="font-size:.82rem;color:var(--text-muted)">
                    {{ editingPreview !== null ? `→ ${editingPreview} pts` : 'invalid format' }}
                  </span>
                  <span v-else class="badge badge-purple">{{ s.score }} pts</span>
                </td>
                <td style="text-align:right;white-space:nowrap">
                  <template v-if="editingId === s.id">
                    <button class="btn btn-primary btn-sm" :disabled="saving" @click="saveEdit(s)">{{ saving ? '…' : 'Save' }}</button>
                    <button class="btn btn-secondary btn-sm" style="margin-left:.3rem" @click="cancelEdit">Cancel</button>
                  </template>
                  <button v-else class="btn btn-secondary btn-sm" @click="startEdit(s)">✏️ Edit</button>
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
import { ref, computed, onMounted } from 'vue';
import { api } from '../api/index.js';
import { computePreviewScore } from '../scoring.js';
import ThemedSelect from '../components/ThemedSelect.vue';

const ADMIN_PIN = '3130514';
const unlocked  = ref(sessionStorage.getItem('adminUnlocked') === 'true');
const pinInput  = ref('');
const pinError  = ref('');

const participants = ref([]);
const leaderboard   = ref([]);
const games         = ref([]);
const submissions   = ref([]);

const loadingPlayers = ref(true);
const loadingGames   = ref(true);
const loadingSubs    = ref(true);

const removingId   = ref(null);
const playerAlert  = ref({ msg: '', type: 'success' });

const togglingId          = ref(null);
const gameAlert           = ref({ msg: '', type: 'success' });

const filterParticipant = ref('');
const filterGame        = ref('');
const editingId          = ref(null);
const editingRaw         = ref('');
const saving             = ref(false);
const subAlert           = ref({ msg: '', type: 'success' });

const enrichedParticipants = computed(() =>
  participants.value.map(p => {
    const lb = leaderboard.value.find(l => l.id === p.id);
    return { ...p, totalPoints: lb?.totalPoints ?? (lb ? 0 : null), gamesPlayed: lb?.gamesPlayed ?? null };
  }).sort((a, b) => a.name.localeCompare(b.name))
);

const participantFilterOptions = computed(() => [
  { value: '', label: 'All players' },
  ...participants.value.map(p => ({ value: p.name, label: p.name })),
]);

const gameFilterOptions = computed(() => [
  { value: '', label: 'All games' },
  ...games.value.map(g => ({ value: g.name, label: g.name })),
]);

const filteredSubmissions = computed(() =>
  submissions.value
    .filter(s => !filterParticipant.value || s.participant === filterParticipant.value)
    .filter(s => !filterGame.value || s.game === filterGame.value)
    .sort((a, b) => b.date.localeCompare(a.date))
);

const editingPreview = computed(() => {
  if (editingId.value === null) return null;
  const sub = submissions.value.find(s => s.id === editingId.value);
  if (!sub || !editingRaw.value.trim()) return null;
  try {
    return computePreviewScore(sub.game, editingRaw.value.trim());
  } catch {
    return null;
  }
});

async function removePlayer(p) {
  if (!confirm(`Remove ${p.name}? This deletes all of their submissions too.`)) return;
  removingId.value = p.id;
  playerAlert.value = { msg: '', type: 'success' };
  try {
    await api.deleteParticipant(p.id);
    participants.value = participants.value.filter(x => x.id !== p.id);
    submissions.value = submissions.value.filter(s => s.participant !== p.name);
    leaderboard.value = leaderboard.value.filter(l => l.id !== p.id);
    playerAlert.value = { msg: `${p.name} removed.`, type: 'success' };
    setTimeout(() => { playerAlert.value.msg = ''; }, 3000);
  } catch (err) {
    playerAlert.value = { msg: err.message, type: 'error' };
  } finally {
    removingId.value = null;
  }
}

async function toggleGame(g) {
  togglingId.value = g.id;
  gameAlert.value = { msg: '', type: 'success' };
  try {
    const updated = await api.setGameEnabled(g.id, !g.enabled);
    const idx = games.value.findIndex(x => x.id === g.id);
    if (idx !== -1) games.value[idx] = updated;
  } catch (err) {
    gameAlert.value = { msg: err.message, type: 'error' };
  } finally {
    togglingId.value = null;
  }
}

function startEdit(s) {
  editingId.value = s.id;
  editingRaw.value = s.raw_result;
  subAlert.value = { msg: '', type: 'success' };
}

function cancelEdit() {
  editingId.value = null;
  editingRaw.value = '';
}

async function saveEdit(s) {
  const raw = editingRaw.value.trim();
  if (!raw) return;
  saving.value = true;
  try {
    const updated = await api.updateSubmission(s.id, raw);
    // Re-fetch: editing a ranked game (e.g. Mini Crossword) can shift other players' scores that day too.
    submissions.value = await api.getSubmissions();
    cancelEdit();
    subAlert.value = { msg: `Updated ${updated.participant}'s ${updated.game} result to ${updated.score} pts.`, type: 'success' };
    setTimeout(() => { subAlert.value.msg = ''; }, 4000);
  } catch (err) {
    subAlert.value = { msg: err.message, type: 'error' };
  } finally {
    saving.value = false;
  }
}

function submitPin() {
  if (pinInput.value === ADMIN_PIN) {
    unlocked.value = true;
    sessionStorage.setItem('adminUnlocked', 'true');
    pinError.value = '';
    loadData();
  } else {
    pinError.value = 'Incorrect pincode.';
  }
  pinInput.value = '';
}

async function loadData() {
  const [p, lb, g, subs] = await Promise.all([
    api.getParticipants(),
    api.getLeaderboard(),
    api.getGames(),
    api.getSubmissions(),
  ]);
  participants.value = p;
  leaderboard.value = lb;
  games.value = g;
  submissions.value = subs;
  loadingPlayers.value = false;
  loadingGames.value = false;
  loadingSubs.value = false;
}

onMounted(() => {
  if (unlocked.value) loadData();
});
</script>
