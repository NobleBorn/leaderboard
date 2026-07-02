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
          <select v-model="participantId" class="form-control">
            <option value="" disabled>Select your name…</option>
            <option v-for="p in participants" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
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
          <select v-model="rawResult" class="form-control">
            <option value="" disabled>Pick your score…</option>
            <option v-for="o in wordleOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </template>

        <!-- Connections -->
        <template v-else-if="selectedGame.name === 'Connections'">
          <div :class="{ 'disabled-group': connectionsFailed }" style="display:flex;flex-direction:column;gap:.4rem;margin-bottom:.75rem">
            <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-weight:600">
              <input type="checkbox" v-model="connectionsSolved.yellow" :disabled="connectionsFailed" /> 🟡 Yellow group — easiest (50 pts)
            </label>
            <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-weight:600">
              <input type="checkbox" v-model="connectionsSolved.green" :disabled="connectionsFailed" /> 🟢 Green group (100 pts)
            </label>
            <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-weight:600">
              <input type="checkbox" v-model="connectionsSolved.blue" :disabled="connectionsFailed" /> 🔵 Blue group (150 pts)
            </label>
            <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-weight:600">
              <input type="checkbox" v-model="connectionsSolved.purple" :disabled="connectionsFailed" /> 🟣 Purple group — hardest (200 pts)
            </label>
          </div>
          <div :class="{ 'disabled-group': connectionsFailed }">
            <label>Mistakes</label>
            <select v-model="connectionsMistakes" class="form-control" style="width:160px" :disabled="connectionsFailed">
              <option value="" disabled>Pick mistakes…</option>
              <option v-for="o in mistakesOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>
          <label style="display:flex;align-items:center;gap:.3rem;cursor:pointer;font-weight:600;margin-top:.6rem">
            <input type="checkbox" v-model="connectionsFailed" /> Failed — couldn't finish the puzzle (0 pts)
          </label>
          <p v-if="connectionsFailed" style="font-size:.82rem;color:var(--text-muted);margin-top:.4rem">
            🔒 Groups and mistakes are disabled — a failed attempt always scores 0 pts.
          </p>
        </template>

        <!-- Mini Crossword -->
        <template v-else-if="selectedGame.name === 'Mini Crossword'">
          <div style="display:flex;gap:.5rem;align-items:center">
            <input
              v-model="crosswordMin"
              type="number" min="0" max="99"
              class="form-control" style="width:80px;text-align:center"
              placeholder="min"
            />
            <span style="font-weight:700;font-size:1.2rem">:</span>
            <input
              v-model="crosswordSec"
              type="number" min="0" max="59"
              class="form-control" style="width:80px;text-align:center"
              placeholder="sec"
            />
            <span style="color:var(--text-muted)">or</span>
            <label style="display:flex;align-items:center;gap:.3rem;cursor:pointer;font-weight:600">
              <input type="checkbox" v-model="crosswordFailed" /> Failed / DNF
            </label>
          </div>
        </template>

        <!-- Strands -->
        <template v-else-if="selectedGame.name === 'Strands'">
          <select v-model="rawResult" class="form-control">
            <option value="" disabled>Pick result…</option>
            <option value="no hints">No hints used (5 pts)</option>
            <option value="with hints">Completed with hints (3 pts)</option>
            <option value="failed">Failed (0 pts)</option>
          </select>
        </template>
      </div>

      <!-- Preview score for direct games -->
      <div v-if="previewScore !== null" class="alert alert-info" style="margin-bottom:1.25rem">
        🎯 This will earn you <strong>{{ previewScore }} point{{ previewScore !== 1 ? 's' : '' }}</strong>
        <span v-if="selectedGame?.name === 'Mini Crossword'">(exact score computed after all players submit)</span>
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

// Mini Crossword specific
const crosswordMin   = ref('');
const crosswordSec   = ref('');
const crosswordFailed = ref(false);

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

const GAME_INFO = {
  Wordle: {
    emoji: '🟩',
    description: 'Guess the secret 5-letter word in 6 tries.',
    scoring: 'Fewer guesses = more points: 1/6 = 6 pts, 2/6 = 5 pts, … 6/6 = 1 pt. X/6 (failed) = 0 pts.',
  },
  Connections: {
    emoji: '🔗',
    description: 'Sort 16 words into 4 hidden groups of 4. Groups get trickier as you go — yellow is easiest, purple is hardest.',
    scoring: 'Score = (Yellow×50) + (Green×100) + (Blue×150) + (Purple×200) − (Mistakes×25), plus a +100 bonus for solving all four groups. You get up to 3 mistakes — a 4th ends the round and should be submitted as Failed (0 pts).',
  },
  'Mini Crossword': {
    emoji: '✏️',
    description: 'A bite-sized daily crossword, raced against the clock.',
    scoring: "Scored by daily rank: 1st = 5 pts, 2nd = 4 pts, 3rd = 3 pts, 4th = 2 pts, everyone else = 1 pt. Failed/DNF = 0 pts.",
  },
  Strands: {
    emoji: '🧵',
    description: 'Find themed words hidden in a letter grid, plus the bonus "spangram".',
    scoring: 'No hints used = 5 pts, completed with hints = 3 pts, failed = 0 pts.',
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
  if (selectedGame.value.name === 'Mini Crossword') {
    if (crosswordFailed.value) return 'failed';
    const m = String(crosswordMin.value).trim();
    const s = String(crosswordSec.value).padStart(2, '0').slice(0, 2);
    if (m === '' || crosswordSec.value === '') return '';
    return `${m}:${s}`;
  }
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
  crosswordMin.value = '';
  crosswordSec.value = '';
  crosswordFailed.value = false;
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
    crosswordMin.value = '';
    crosswordSec.value = '';
    crosswordFailed.value = false;
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
