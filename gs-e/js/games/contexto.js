// contexto.js — Offline word-ranking game (Contexto-style), Phase 1
// Uses CONTEXTO_CLUSTERS from contexto-data.js (must load first — see popup.html snippet).
// Follows the same module pattern / Storage usage as other games (see solitaire.js).
const GameContexto = (() => {

  function randomUnit() {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] / 0x100000000;
  }

  function randomInt(max) {
    return Math.floor(randomUnit() * max);
  }
  const STATE_KEY = 'game_contexto_state';
  const STATS_KEY = 'game_contexto_stats';

  let container = null;
  let inputEl   = null;
  let state     = null;
  let stats     = null;

  // ── Helpers ──────────────────────────────────────────────────────────────
  function todayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  }

  function hashStr(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.codePointAt(i)) | 0;
    return Math.abs(h);
  }

  function seedToIndex(seed, len) { return hashStr(seed) % len; }

  function defaultState(mode, clusterIndex, date) {
    return {
      date, mode, clusterIndex,
      guesses: [],       // [{word, rank}]
      hintsUsed: 0,
      won: false,
      done: false,
      statsCounted: false,
      revealed: false,
    };
  }

  function defaultStats() {
    return { played: 0, wins: 0, losses: 0, totalGuesses: 0, currentStreak: 0, bestStreak: 0 };
  }

  function rankGuess(cluster, word) {
    if (word === cluster.target) return 1;
    const idx = cluster.rankedWords.indexOf(word);
    if (idx !== -1) return idx + 1;
    return 500 + (hashStr(word + cluster.target) % 701); // deterministic 500–1200
  }

  function closenessWidth(rank) {
    if (rank === 1) return 100;
    const cappedRank = Math.min(Math.max(rank, 1), 1200);
    return Math.max(6, Math.round(100 - ((cappedRank - 1) / 1199) * 92));
  }

  function heatInfo(rank) {
    const width = closenessWidth(rank);
    if (rank === 1)   return { label: 'Correct',      cls: 'ctx-correct',      width };
    if (rank <= 10)   return { label: 'Very hot',     cls: 'ctx-very-hot',     width };
    if (rank <= 25)   return { label: 'Hot',          cls: 'ctx-hot',          width };
    if (rank <= 50)   return { label: 'Warm',         cls: 'ctx-warm',         width };
    if (rank <= 100)  return { label: 'Getting warm', cls: 'ctx-getting-warm', width };
    if (rank <= 250)  return { label: 'Cool',         cls: 'ctx-cool',         width };
    if (rank <= 500)  return { label: 'Far',          cls: 'ctx-far',          width };
    return { label: 'Cold', cls: 'ctx-cold', width };
  }

  // ── Persistence ──────────────────────────────────────────────────────────
  async function saveState() { await Storage.save(STATE_KEY, state); }
  async function saveStats() { await Storage.save(STATS_KEY, stats); }

  async function loadOrInitState() {
    const today = todayStr();
    const saved = await Storage.load(STATE_KEY);
    if (saved && saved.date === today) {
      state = saved;
    } else {
      // No saved state, or it's from a previous day — start today's daily puzzle.
      const idx = seedToIndex(today, CONTEXTO_CLUSTERS.length);
      state = defaultState('daily', idx, today);
      await saveState();
    }
  }

  async function loadStatsData() {
    const s = await Storage.load(STATS_KEY);
    stats = s || defaultStats();
  }

  // ── Game actions ─────────────────────────────────────────────────────────
  function finishPuzzle() {
    if (state.statsCounted) return;
    state.statsCounted = true;
    stats.played++;
    if (state.won) {
      stats.wins++;
      stats.currentStreak++;
      stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
    } else {
      stats.losses++;
      stats.currentStreak = 0;
    }
    stats.totalGuesses += state.guesses.length;
    saveStats();
  }

  function showMessage(text) {
    const m = container.querySelector('.ctx-msg');
    if (!m) return;
    m.textContent = text;
    setTimeout(() => { if (m.textContent === text) m.textContent = ''; }, 1500);
  }

  function submitGuess(raw) {
    if (!state || state.done) return;
    const word = (raw || '').toLowerCase().trim();
    if (!word) return;
    if (state.guesses.some(g => g.word === word)) {
      showMessage('Already guessed that word');
      return;
    }
    const cluster = CONTEXTO_CLUSTERS[state.clusterIndex];
    const rank = rankGuess(cluster, word);
    state.guesses.push({ word, rank });
    if (rank === 1) {
      state.won = true;
      state.done = true;
      finishPuzzle();
    }
    saveState();
    renderAll();
  }

  function useHint() {
    if (!state || state.done) return;
    const cluster = CONTEXTO_CLUSTERS[state.clusterIndex];
    if (state.hintsUsed < cluster.hints.length) {
      state.hintsUsed++;
      saveState();
      renderAll();
    }
  }

  function giveUp() {
    if (!state || state.done) return;
    state.done = true;
    state.won = false;
    state.revealed = true;
    finishPuzzle();
    saveState();
    renderAll();
  }

  function startPracticePuzzle() {
    let idx = randomInt(CONTEXTO_CLUSTERS.length);
    if (CONTEXTO_CLUSTERS.length > 1) {
      while (idx === state.clusterIndex) idx = randomInt(CONTEXTO_CLUSTERS.length);
    }
    state = defaultState('practice', idx, todayStr());
    saveState();
    renderAll();
  }

  // ── Render ───────────────────────────────────────────────────────────────
  function buildSkeleton() {
    container.innerHTML = `
      <div class="ctx-wrap">
        <div class="ctx-header">
          <div class="ctx-title">CONTEXTO</div>
          <div class="ctx-category"></div>
        </div>
        <div class="ctx-input-row">
          <input type="text" class="ctx-input" placeholder="Type a word..." autocomplete="off" spellcheck="false" />
          <button class="ctx-btn ctx-guess-btn">Guess</button>
        </div>
        <div class="ctx-msg"></div>
        <div class="ctx-controls">
          <button class="ctx-btn ctx-hint-btn">Hint</button>
          <button class="ctx-btn ctx-reveal-btn">Give Up</button>
          <button class="ctx-btn ctx-new-btn">New Puzzle</button>
        </div>
        <div class="ctx-status-bar">
          <span class="ctx-guess-count">Guesses: 0</span>
          <span class="ctx-best-rank">Best: —</span>
        </div>
        <div class="ctx-win-msg" style="display:none"></div>
        <div class="ctx-hint-panel"></div>
        <div class="ctx-history"></div>
        <div class="ctx-stats-panel"></div>
      </div>
    `;
  }

  function renderAll() {
    if (!container || !state) return;
    const cluster = CONTEXTO_CLUSTERS[state.clusterIndex];

    container.querySelector('.ctx-category').textContent =
      `${state.mode === 'daily' ? 'Daily' : 'Practice'} · ${cluster.category}`;

    container.querySelector('.ctx-guess-count').textContent = `Guesses: ${state.guesses.length}`;

    const best = state.guesses.reduce((m, g) => Math.min(m, g.rank), Infinity);
    container.querySelector('.ctx-best-rank').textContent =
      `Best: ${Number.isFinite(best) ? '#' + best : '—'}`;

    const winMsg = container.querySelector('.ctx-win-msg');
    if (state.done) {
      winMsg.style.display = 'block';
      winMsg.textContent = state.won
        ? `🎉 Solved in ${state.guesses.length} guesses! The word was "${cluster.target}".`
        : `Revealed: the word was "${cluster.target}".`;
    } else {
      winMsg.style.display = 'none';
    }

    const hintPanel = container.querySelector('.ctx-hint-panel');
    hintPanel.innerHTML = '';
    for (let i = 0; i < state.hintsUsed; i++) {
      const div = document.createElement('div');
      div.className = 'ctx-hint-item';
      div.textContent = `Hint ${i + 1}: ${cluster.hints[i]}`;
      hintPanel.appendChild(div);
    }

    const historyEl = container.querySelector('.ctx-history');
    historyEl.innerHTML = '';
    const sorted = [...state.guesses].sort((a, b) => a.rank - b.rank);
    sorted.forEach(g => {
      const info = heatInfo(g.rank);
      const row = document.createElement('div');
      row.className = `ctx-guess-row ${info.cls}`;
      row.innerHTML = `
        <div class="ctx-guess-main">
          <span class="ctx-word">${g.word.toUpperCase()}</span>
          <span class="ctx-rank">#${g.rank}</span>
          <span class="ctx-label">${info.label}</span>
        </div>
        <div class="ctx-closeness-bar" aria-hidden="true">
          <div class="ctx-closeness-fill" style="width:${info.width}%"></div>
        </div>`;
      historyEl.appendChild(row);
    });

    const statsPanel = container.querySelector('.ctx-stats-panel');
    const avg = stats.played ? (stats.totalGuesses / stats.played).toFixed(1) : '—';
    statsPanel.innerHTML = `
      <div class="ctx-stats-row">Played: ${stats.played} · Wins: ${stats.wins} · Losses: ${stats.losses}</div>
      <div class="ctx-stats-row">Avg guesses: ${avg} · Streak: ${stats.currentStreak} · Best streak: ${stats.bestStreak}</div>
    `;

    container.querySelector('.ctx-hint-btn').disabled = state.done || state.hintsUsed >= cluster.hints.length;
    container.querySelector('.ctx-reveal-btn').disabled = state.done;
    container.querySelector('.ctx-guess-btn').disabled = state.done;
    if (inputEl) inputEl.disabled = state.done;
  }

  function attachHandlers() {
    inputEl = container.querySelector('.ctx-input');
    container.querySelector('.ctx-guess-btn').addEventListener('click', () => {
      submitGuess(inputEl.value);
      inputEl.value = '';
      inputEl.focus();
    });
    container.querySelector('.ctx-hint-btn').addEventListener('click', useHint);
    container.querySelector('.ctx-reveal-btn').addEventListener('click', giveUp);
    container.querySelector('.ctx-new-btn').addEventListener('click', startPracticePuzzle);
  }

  // ── Public API ───────────────────────────────────────────────────────────
  async function init(el) {
    container = el;
    buildSkeleton();
    await loadOrInitState();
    await loadStatsData();
    attachHandlers();
    renderAll();
  }

  // Central router (popup.js) calls this on every keydown while this tab is
  // active, since Contexto is intentionally NOT in MOUSE_ONLY. We only act
  // on Enter; all other keys pass through untouched for normal text input.
  function onKey(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const val = inputEl ? inputEl.value : '';
    submitGuess(val);
    if (inputEl) { inputEl.value = ''; inputEl.focus(); }
  }

  async function reset() {
    const today = todayStr();
    const idx = seedToIndex(today, CONTEXTO_CLUSTERS.length);
    state = defaultState('daily', idx, today);
    await saveState();
    renderAll();
  }

  return { init, onKey, reset };
})();
