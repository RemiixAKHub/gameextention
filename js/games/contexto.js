// contexto.js — Offline word-ranking game (Contexto-style), Phase 1
// Uses CONTEXTO_CLUSTERS from contexto-data.js (must load first — see popup.html snippet).
// Follows the same module pattern / Storage usage as other games (see solitaire.js).
const GameContexto = (() => {
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
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function seedToIndex(seed, len) { return hashStr(seed) % len; }

  function defaultState(mode, clusterIndex, date, recentPractice) {
    return {
      date, mode, clusterIndex,
      guesses: [],       // [{word, rank}]
      hintsUsed: 0,
      won: false,
      done: false,
      statsCounted: false,
      revealed: false,
      recentPractice: recentPractice || [], // last N practice cluster indexes, oldest first
    };
  }

  function defaultStats() {
    return { played: 0, wins: 0, losses: 0, totalGuesses: 0, currentStreak: 0, bestStreak: 0 };
  }

  // Simple, hand-picked category relationships — used only as a fallback
  // signal when a guess is absent from the current cluster's rankedWords.
  const CATEGORY_RELATIONS = {
    Animals:    ['Nature', 'Geography', 'Food'],
    Nature:     ['Animals', 'Geography', 'Science', 'Travel'],
    Geography:  ['Nature', 'Travel', 'History'],
    Food:       ['Household', 'Travel', 'Animals'],
    Travel:     ['Geography', 'Transport', 'Nature'],
    Transport:  ['Travel', 'Technology'],
    Space:      ['Science', 'Technology'],
    Science:    ['Space', 'Nature', 'Technology'],
    Technology: ['Science', 'Transport', 'Jobs'],
    Music:      ['Movies'],
    Movies:     ['Music'],
    Household:  ['Food', 'Jobs'],
    Jobs:       ['Technology', 'Household'],
    History:    ['Geography'],
    Sports:     [],
  };
  // Food/animal terms allowed to bridge Animals<->Food even though most
  // food words shouldn't feel close to an animal target (and vice versa).
  const FISH_SEAFOOD_WORDS = new Set(['fish','seafood','salmon','tuna','shrimp','crab','lobster','oyster','shell']);

  // word -> Set(category) index, built once lazily across every cluster.
  let wordCategoryIndex = null;
  function buildWordCategoryIndex() {
    wordCategoryIndex = new Map();
    CONTEXTO_CLUSTERS.forEach(c => {
      const cats = wordCategoryIndex.get(c.target) || new Set();
      cats.add(c.category);
      wordCategoryIndex.set(c.target, cats);
      c.rankedWords.forEach(w => {
        const s = wordCategoryIndex.get(w) || new Set();
        s.add(c.category);
        wordCategoryIndex.set(w, s);
      });
    });
  }

  function rankGuess(cluster, word) {
    if (word === cluster.target) return 1;
    const idx = cluster.rankedWords.indexOf(word);
    if (idx !== -1) return idx + 1;

    if (!wordCategoryIndex) buildWordCategoryIndex();
    const wordCats = wordCategoryIndex.get(word);
    if (wordCats) {
      // Same category as the current puzzle (word just missing from this
      // specific cluster's list) — treat as a near-miss, not a cold guess.
      if (wordCats.has(cluster.category)) {
        return 120 + (hashStr(word + cluster.target) % 100); // 120–219
      }
      // Related category via the hand-picked relation table.
      const related = CATEGORY_RELATIONS[cluster.category] || [];
      const isRelated = [...wordCats].some(c => related.includes(c));
      // Special-case: fish/seafood words feel close to an Animals target
      // even when the target's own category isn't Food.
      const isFoodBridge = FISH_SEAFOOD_WORDS.has(word) &&
        (cluster.category === 'Animals' || wordCats.has('Animals'));
      if (isRelated || isFoodBridge) {
        return 250 + (hashStr(word + cluster.target) % 200); // 250–449
      }
    }
    return 500 + (hashStr(word + cluster.target) % 701); // deterministic 500–1200, true cold
  }

  function heatInfo(rank) {
    if (rank === 1)                return { label: 'Correct',      cls: 'ctx-correct',      pct: 100 };
    if (rank <= 10)                return { label: 'Very hot',     cls: 'ctx-very-hot',      pct: 88  };
    if (rank <= 25)                return { label: 'Hot',          cls: 'ctx-hot',           pct: 72  };
    if (rank <= 50)                return { label: 'Warm',         cls: 'ctx-warm',          pct: 56  };
    if (rank <= 100)               return { label: 'Getting warm', cls: 'ctx-getting-warm',  pct: 42  };
    if (rank <= 300)               return { label: 'Cool',         cls: 'ctx-cool',          pct: 28  };
    if (rank <= 700)               return { label: 'Far',          cls: 'ctx-far',           pct: 14  };
    return { label: 'Cold', cls: 'ctx-cold', pct: 5 };
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

  const RECENT_PRACTICE_LIMIT = 20;
  const MIN_POOL_FOR_NO_REPEAT = 25; // below this, recent-avoidance isn't worth the constraint

  function startPracticePuzzle() {
    const total = CONTEXTO_CLUSTERS.length;
    const recent = (state && Array.isArray(state.recentPractice)) ? state.recentPractice : [];
    const avoid = new Set(recent);
    if (state) avoid.add(state.clusterIndex);

    let idx;
    if (total >= MIN_POOL_FOR_NO_REPEAT && avoid.size < total) {
      // Full no-repeat behavior: skip the current cluster + last 20 practice picks.
      do { idx = Math.floor(Math.random() * total); } while (avoid.has(idx));
    } else if (total > 1) {
      // Small dataset, or the avoid-set already covers everything — just
      // dodge the current cluster, same as the original Phase-1 behavior.
      do { idx = Math.floor(Math.random() * total); } while (state && idx === state.clusterIndex);
    } else {
      idx = 0;
    }

    const updatedRecent = [...recent, idx].slice(-RECENT_PRACTICE_LIMIT);
    state = defaultState('practice', idx, todayStr(), updatedRecent);
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
        <div class="ctx-guess-row-top">
          <span class="ctx-word">${g.word.toUpperCase()}</span><span class="ctx-rank">#${g.rank}</span><span class="ctx-label">${info.label}</span>
        </div>
        <div class="ctx-closeness-bar"><div class="ctx-closeness-fill" style="width:${info.pct}%"></div></div>
      `;
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
