<template>
  <div>
    <div class="page-header">
      <h1>✏️ Submit Result</h1>
      <p>Enter your daily puzzle score. One submission per game per day.</p>
    </div>

    <div style="display:flex;gap:1.5rem;align-items:flex-start;flex-wrap:wrap">
    <div class="card" style="max-width:520px;flex:1 1 420px">
      <div v-if="alert.msg" :class="['alert', `alert-${alert.type}`]">
        <span>{{ alert.icon }}</span> {{ alert.msg }}
      </div>

      <!-- Step 1: pick or create participant -->
      <div class="form-group">
        <label>Your Name</label>
        <div style="display:flex;gap:.5rem">
          <ThemedSelect
            v-model="participantId"
            :options="participantOptions"
            placeholder="Select your name…"
          />
        </div>
        <div style="margin-top:.5rem;display:flex;gap:.5rem">
          <input
            v-model="newName"
            class="form-control"
            placeholder="Or type a new name…"
            @keydown.enter="addParticipant"
            style="flex:1"
          />
          <button class="btn btn-secondary btn-sm" :disabled="!newName.trim()" @click="addParticipant">Add</button>
        </div>
      </div>

      <!-- Game -->
      <div class="form-group">
        <label>Game</label>
        <ThemedSelect
          v-model="gameId"
          :options="gameOptions"
          placeholder="Select a game…"
          @change="onGameChange"
        />
      </div>

      <!-- Date -->
      <div class="form-group">
        <label>Date</label>
        <input type="date" v-model="date" class="form-control" :max="today" />
      </div>

      <!-- Result input — changes based on game -->
      <div v-if="selectedGame" class="form-group">
        <label>Result</label>

        <!-- Wordle -->
        <template v-if="selectedGame.name === 'Wordle'">
          <ThemedSelect
            v-model="rawResult"
            :options="wordleOptions"
            placeholder="Pick your score…"
          />
        </template>

        <!-- Connections -->
        <template v-else-if="selectedGame.name === 'Connections'">
          <div :class="{ 'disabled-group': connectionsFailed }" style="display:flex;flex-direction:column;gap:.4rem;margin-bottom:.75rem">
            <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-weight:600">
              <input type="checkbox" v-model="connectionsSolved.yellow" :disabled="connectionsFailed" /> 🟡 Yellow group — easiest (1 pt)
            </label>
            <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-weight:600">
              <input type="checkbox" v-model="connectionsSolved.green" :disabled="connectionsFailed" /> 🟢 Green group (2 pts)
            </label>
            <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-weight:600">
              <input type="checkbox" v-model="connectionsSolved.blue" :disabled="connectionsFailed" /> 🔵 Blue group (3 pts)
            </label>
            <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-weight:600">
              <input type="checkbox" v-model="connectionsSolved.purple" :disabled="connectionsFailed" /> 🟣 Purple group — hardest (4 pts)
            </label>
          </div>
          <div :class="{ 'disabled-group': connectionsFailed }">
            <label>Mistakes</label>
            <div style="width:260px">
              <ThemedSelect
                v-model="connectionsMistakes"
                :options="mistakesOptions"
                placeholder="Pick mistakes…"
                :disabled="connectionsFailed"
              />
            </div>
          </div>
          <label style="display:flex;align-items:center;gap:.3rem;cursor:pointer;font-weight:600;margin-top:.6rem">
            <input type="checkbox" v-model="connectionsFailed" /> Failed — couldn't finish the puzzle (0 pts)
          </label>
          <p v-if="connectionsFailed" style="font-size:.82rem;color:var(--text-muted);margin-top:.4rem">
            🔒 Groups and mistakes are disabled — a failed attempt always scores 0 pts.
          </p>
        </template>
      </div>

      <!-- Preview score for direct games -->
      <div v-if="previewScore !== null" class="alert alert-info" style="margin-bottom:1.25rem">
        🎯 This will earn you <strong>{{ previewScore }} point{{ previewScore !== 1 ? 's' : '' }}</strong>
      </div>

      <!-- Editing existing submission? -->
      <div v-if="existingSubmission" class="alert alert-info">
        ✏️ You already submitted this game today ({{ existingSubmission.raw_result }} = {{ existingSubmission.score }} pts).
        Submitting will <strong>update</strong> your result.
      </div>

      <button
        class="btn btn-primary"
        style="width:100%"
        :disabled="!canSubmit || submitting"
        @click="submit"
      >
        {{ submitting ? 'Submitting…' : (existingSubmission ? '✏️ Update Result' : '✅ Submit Result') }}
      </button>
    </div>

    <!-- Game info -->
    <div v-if="selectedGame" class="card" style="flex:1 1 260px;max-width:320px">
      <div class="card-title">
        <span>{{ gameInfo.emoji }}</span> {{ selectedGame.name }}
      </div>
      <p>{{ gameInfo.description }}</p>
      <p style="margin-top:.6rem;font-size:.85rem;color:var(--text-muted)">{{ gameInfo.scoring }}</p>
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { api } from '../api/index.js';
import { computePreviewScore } from '../scoring.js';
import ThemedSelect from '../components/ThemedSelect.vue';

const participants    = ref([]);
const games          = ref([]);
const participantId  = ref('');
const gameId         = ref('');
const date           = ref(new Date().toISOString().slice(0, 10));
const today          = new Date().toISOString().slice(0, 10);
const rawResult      = ref('');
const newName        = ref('');
const submitting     = ref(false);
const existingSubmission = ref(null);

// Connections specific
const connectionsSolved = ref({ yellow: false, green: false, blue: false, purple: false });
const connectionsMistakes = ref('');
const connectionsFailed = ref(false);

const alert = ref({ msg: '', type: 'info', icon: '' });

const wordleOptions = [
  { value: '1/6', label: '1/6 — Hole in one! (6 pts)' },
  { value: '2/6', label: '2/6 — Excellent! (5 pts)' },
  { value: '3/6', label: '3/6 — Great! (4 pts)' },
  { value: '4/6', label: '4/6 — Good (3 pts)' },
  { value: '5/6', label: '5/6 — Close call (2 pts)' },
  { value: '6/6', label: '6/6 — Phew! (1 pt)' },
  { value: 'X/6', label: 'X/6 — Did not get it (0 pts)' },
];

const mistakesOptions = [0, 1, 2, 3].map(n => ({
  value: String(n),
  label: `${n} mistake${n !== 1 ? 's' : ''}${n === 3 ? ' — last one before failing' : ''}`,
}));

const gameOptions = computed(() => games.value.map(g => ({ value: g.id, label: g.name })));
const participantOptions = computed(() => participants.value.map(p => ({ value: p.id, label: p.name })));

const GAME_INFO = {
  Wordle: {
    emoji: '🟩',
    description: 'Guess the secret 5-letter word in 6 tries.',
    scoring: 'Fewer guesses = more points: 1/6 = 6 pts, 2/6 = 5 pts, … 6/6 = 1 pt. X/6 (failed) = 0 pts.',
  },
  Connections: {
    emoji: '🔗',
    description: 'Sort 16 words into 4 hidden groups of 4. Groups get trickier as you go — yellow is easiest, purple is hardest.',
    scoring: 'Score = Yellow (1 pt) + Green (2 pts) + Blue (3 pts) + Purple (4 pts) − 1 pt per mistake, clamped between 0 and 10. You get up to 3 mistakes — a 4th ends the round and should be submitted as Failed (0 pts).',
  },
};

const selectedGame = computed(() => games.value.find(g => g.id === gameId.value));

const gameInfo = computed(() => GAME_INFO[selectedGame.value?.name] || {
  emoji: '🎮',
  description: 'A daily puzzle game.',
  scoring: "Scoring rules for this game haven't been documented yet.",
});

const effectiveRawResult = computed(() => {
  if (!selectedGame.value) return '';
  if (selectedGame.value.name === 'Connections') {
    if (connectionsFailed.value) return 'failed';
    if (connectionsMistakes.value === '' || connectionsMistakes.value === null) return '';
    const solved = Object.entries(connectionsSolved.value).filter(([, v]) => v).map(([k]) => k);
    return `${solved.join(',')};${connectionsMistakes.value}`;
  }
  return rawResult.value;
});

const previewScore = computed(() => {
  if (!selectedGame.value || !effectiveRawResult.value) return null;
  if (selectedGame.value.scoring_type === 'ranked') return '?';
  try {
    return computePreviewScore(selectedGame.value.name, effectiveRawResult.value);
  } catch {
    return null;
  }
});

const canSubmit = computed(() =>
  participantId.value && gameId.value && date.value && effectiveRawResult.value
);

function onGameChange() {
  rawResult.value = '';
  connectionsSolved.value = { yellow: false, green: false, blue: false, purple: false };
  connectionsMistakes.value = '';
  connectionsFailed.value = false;
  existingSubmission.value = null;
  checkExisting();
}

// Check if there's an existing submission for (participant, game, date)
async function checkExisting() {
  if (!participantId.value || !gameId.value || !date.value) { existingSubmission.value = null; return; }
  const subs = await api.getSubmissions(date.value);
  existingSubmission.value = subs.find(
    s => s.participant === participants.value.find(p => p.id === participantId.value)?.name
      && s.game === selectedGame.value?.name
  ) || null;
}

watch([participantId, gameId, date], checkExisting);

async function addParticipant() {
  const name = newName.value.trim();
  if (!name) return;
  try {
    const p = await api.createParticipant(name);
    if (!participants.value.find(x => x.id === p.id)) participants.value.push(p);
    participants.value.sort((a, b) => a.name.localeCompare(b.name));
    participantId.value = p.id;
    newName.value = '';
    showAlert('success', '🎉', `Welcome, ${p.name}!`);
  } catch (err) {
    showAlert('error', '❌', err.message);
  }
}

async function submit() {
  if (!canSubmit.value) return;
  submitting.value = true;
  alert.value = { msg: '', type: 'info', icon: '' };

  try {
    if (existingSubmission.value) {
      const updated = await api.updateSubmission(existingSubmission.value.id, effectiveRawResult.value);
      showAlert('success', '✅', `Updated! New score: ${updated.score} pts`);
    } else {
      const created = await api.createSubmission({
        participantId: participantId.value,
        gameId: gameId.value,
        date: date.value,
        rawResult: effectiveRawResult.value,
      });
      showAlert('success', '🎉', `Submitted! You earned ${created.score} pt${created.score !== 1 ? 's' : ''}`);
    }
    // Reset form
    gameId.value = '';
    rawResult.value = '';
    connectionsSolved.value = { yellow: false, green: false, blue: false, purple: false };
    connectionsMistakes.value = '';
    connectionsFailed.value = false;
    existingSubmission.value = null;
  } catch (err) {
    showAlert('error', '❌', err.message);
  } finally {
    submitting.value = false;
  }
}

function showAlert(type, icon, msg) {
  alert.value = { msg, type, icon };
  setTimeout(() => { alert.value.msg = ''; }, 6000);
}

onMounted(async () => {
  [participants.value, games.value] = await Promise.all([
    api.getParticipants(),
    api.getGames(),
  ]);
  participants.value.sort((a, b) => a.name.localeCompare(b.name));
});
</script>
