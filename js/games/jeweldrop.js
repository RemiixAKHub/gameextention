// jeweldrop.js — Jewel Drop Phase 2.2
// Adds rotating score and colour-collection objectives while preserving the
// stable clearing, animation, reshuffle, save/resume, and best-score systems.

const GameJewelDrop = (() => {
  const STATE_KEY = 'game_jeweldrop_state';
  const BEST_KEY = 'game_jeweldrop_best';
  const ROWS = 8;
  const COLS = 8;
  const MIN_GROUP = 2;
  const CLEAR_MS = 210;
  const DROP_MS = 280;
  const RESHUFFLE_OUT_MS = 170;
  const RESHUFFLE_IN_MS = 330;
  const MAX_SHUFFLE_ATTEMPTS = 60;
  const OBJECTIVES = [
    {
      id: 'score-5000',
      type: 'score',
      title: 'Score Run',
      description: 'Reach 5,000 points.',
      targetScore: 5000,
      moveLimit: 20,
    },
    {
      id: 'ruby-sapphire',
      type: 'collect',
      title: 'Ruby & Sapphire Hunt',
      description: 'Collect 24 rubies and 18 sapphires.',
      targets: { ruby: 24, sapphire: 18 },
      moveLimit: 22,
    },
    {
      id: 'emerald-topaz',
      type: 'collect',
      title: 'Emerald & Topaz Hunt',
      description: 'Collect 22 emeralds and 20 topaz jewels.',
      targets: { emerald: 22, topaz: 20 },
      moveLimit: 22,
    },
    {
      id: 'amethyst-diamond',
      type: 'collect',
      title: 'Rare Jewel Hunt',
      description: 'Collect 18 amethysts and 14 diamonds.',
      targets: { amethyst: 18, diamond: 14 },
      moveLimit: 24,
    },
  ];
  const JEWELS = ['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst', 'diamond'];
  const SYMBOLS = {
    ruby: '◆', sapphire: '◆', emerald: '◆',
    topaz: '◆', amethyst: '◆', diamond: '◆',
  };

  let board = [];
  let score = 0;
  let best = 0;
  let moves = 0;
  let selected = [];
  let container = null;
  let message = '';
  let animating = false;
  let scoreBurst = 0;
  let roundStatus = 'playing'; // playing | won | lost
  let objectiveIndex = 0;
  let collected = {};

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function randomUnit() {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] / 0x100000000;
  }

  function randomInt(max) {
    return Math.floor(randomUnit() * max);
  }

  function randomJewel() {
    return JEWELS[randomInt(JEWELS.length)];
  }

  function newBoard() {
    return Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, randomJewel)
    );
  }

  function isValidBoard(candidate) {
    return Array.isArray(candidate) && candidate.length === ROWS &&
      candidate.every(row => Array.isArray(row) && row.length === COLS &&
        row.every(jewel => JEWELS.includes(jewel)));
  }

  function flattenBoard(candidate = board) {
    return candidate.flat();
  }

  function boardFromFlat(flat) {
    return Array.from({ length: ROWS }, (_, r) =>
      flat.slice(r * COLS, (r + 1) * COLS)
    );
  }

  function shuffleFlat(flat) {
    const out = [...flat];
    for (let i = out.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }


  function inventorySignature(list) {
    return JEWELS.map(jewel => `${jewel}:${list.filter(v => v === jewel).length}`).join('|');
  }

  function forcePlayableArrangement(flat) {
    const out = [...flat];
    const positions = new Map();
    out.forEach((jewel, index) => {
      if (!positions.has(jewel)) positions.set(jewel, []);
      positions.get(jewel).push(index);
    });
    const duplicate = [...positions.entries()].find(([, indexes]) => indexes.length >= 2);
    if (!duplicate) return out;

    const [, indexes] = duplicate;
    const targets = [0, 1];
    indexes.slice(0, 2).forEach((sourceIndex, i) => {
      const targetIndex = targets[i];
      const actualSource = out[targetIndex] === duplicate[0]
        ? targetIndex
        : out.findIndex((value, idx) => value === duplicate[0] && !targets.slice(0, i).includes(idx));
      if (actualSource >= 0 && actualSource !== targetIndex) {
        [out[targetIndex], out[actualSource]] = [out[actualSource], out[targetIndex]];
      }
    });
    return out;
  }

  function createPlayableBoard() {
    let candidate = newBoard();
    for (let attempt = 0; attempt < MAX_SHUFFLE_ATTEMPTS && !hasValidGroup(candidate); attempt++) {
      candidate = newBoard();
    }
    if (!hasValidGroup(candidate)) {
      const flat = flattenBoard(candidate);
      candidate = boardFromFlat(forcePlayableArrangement(flat));
    }
    return candidate;
  }

  function serialize() {
    return { board, score, moves, roundStatus, objectiveIndex, collected };
  }

  async function saveState() {
    Storage.saveLazy(STATE_KEY, serialize());
    Storage.saveLazy(BEST_KEY, best);
  }

  async function loadState() {
    const saved = await Storage.load(STATE_KEY);
    const savedBest = await Storage.load(BEST_KEY);
    best = Number.isFinite(savedBest) ? savedBest : 0;

    if (!saved || !isValidBoard(saved.board)) return false;

    board = saved.board;
    score = Number.isFinite(saved.score) ? saved.score : 0;
    moves = Number.isFinite(saved.moves) ? saved.moves : 0;
    objectiveIndex = Number.isInteger(saved.objectiveIndex)
      ? Math.max(0, Math.min(OBJECTIVES.length - 1, saved.objectiveIndex))
      : 0;
    collected = saved.collected && typeof saved.collected === 'object' ? { ...saved.collected } : {};
    roundStatus = ['playing', 'won', 'lost'].includes(saved.roundStatus) ? saved.roundStatus : 'playing';
    best = Math.max(best, score);
    updateRoundStatus();
    return true;
  }

  function neighbours(r, c) {
    return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
      .filter(([nr, nc]) => nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS);
  }

  function findGroup(startR, startC) {
    const target = board[startR][startC];
    if (!target) return [];

    const stack = [[startR, startC]];
    const visited = new Set();
    const group = [];

    while (stack.length) {
      const [r, c] = stack.pop();
      const key = `${r},${c}`;
      if (visited.has(key) || board[r][c] !== target) continue;
      visited.add(key);
      group.push([r, c]);
      neighbours(r, c).forEach(cell => stack.push(cell));
    }

    return group;
  }

  function hasValidGroup(candidate = board) {
    if (!isValidBoard(candidate)) return false;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (c + 1 < COLS && candidate[r][c] === candidate[r][c + 1]) return true;
        if (r + 1 < ROWS && candidate[r][c] === candidate[r + 1][c]) return true;
      }
    }
    return false;
  }

  function collapseBoard() {
    for (let c = 0; c < COLS; c++) {
      const kept = [];
      for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r][c]) kept.push(board[r][c]);
      }

      for (let r = ROWS - 1, i = 0; r >= 0; r--, i++) {
        board[r][c] = kept[i] || randomJewel();
      }
    }
  }

  function reshuffleBoardPreservingInventory() {
    const original = flattenBoard();
    const originalSignature = inventorySignature(original);
    let candidate = [...original];

    for (let attempt = 0; attempt < MAX_SHUFFLE_ATTEMPTS; attempt++) {
      candidate = shuffleFlat(original);
      const candidateBoard = boardFromFlat(candidate);
      if (hasValidGroup(candidateBoard)) {
        board = candidateBoard;
        break;
      }
    }

    if (!hasValidGroup(board)) {
      candidate = forcePlayableArrangement(candidate);
      board = boardFromFlat(candidate);
    }

    if (!isValidBoard(board) || inventorySignature(flattenBoard()) !== originalSignature || !hasValidGroup()) {
      console.error('Jewel Drop: reshuffle validation failed; creating a safe playable board.');
      board = createPlayableBoard();
    }
  }

  function runBoardValidationTests() {
    const valid = Array.from({ length: ROWS }, () => Array(COLS).fill('ruby'));
    const wrongRows = valid.slice(0, ROWS - 1);
    const wrongJewel = valid.map(row => [...row]);
    wrongJewel[0][0] = 'unknown';
    const noGroups = Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => JEWELS[(r + c) % JEWELS.length])
    );

    const tests = [
      isValidBoard(valid),
      hasValidGroup(valid),
      !isValidBoard(wrongRows),
      !isValidBoard(wrongJewel),
      !hasValidGroup(noGroups),
    ];
    if (tests.some(result => !result)) {
      console.error('Jewel Drop: Phase 1.3 board validation self-test failed.');
      return false;
    }
    return true;
  }

  async function controlledReshuffle() {
    message = 'No moves available — reshuffling the jewels.';
    const grid = container?.querySelector('.jd-grid');
    grid?.classList.add('jd-reshuffle-out');
    await wait(RESHUFFLE_OUT_MS);

    reshuffleBoardPreservingInventory();
    selected = [];
    render({ animateReshuffle: true });
    await wait(RESHUFFLE_IN_MS);

    container?.querySelector('.jd-grid')?.classList.remove('jd-reshuffle-out');
    message = 'Board reshuffled — every jewel was preserved.';
    render();
  }


  function currentObjective() {
    return OBJECTIVES[objectiveIndex] || OBJECTIVES[0];
  }

  function movesRemaining() {
    return Math.max(0, currentObjective().moveLimit - moves);
  }

  function collectedCount(jewel) {
    return Number.isFinite(collected[jewel]) ? collected[jewel] : 0;
  }

  function objectiveComplete() {
    const objective = currentObjective();
    if (objective.type === 'score') return score >= objective.targetScore;
    return Object.entries(objective.targets).every(([jewel, target]) => collectedCount(jewel) >= target);
  }

  function objectiveProgressPercent() {
    const objective = currentObjective();
    if (objective.type === 'score') {
      return Math.min(100, Math.round((score / objective.targetScore) * 100));
    }
    const entries = Object.entries(objective.targets);
    const total = entries.reduce((sum, [, target]) => sum + target, 0);
    const progress = entries.reduce((sum, [jewel, target]) => sum + Math.min(target, collectedCount(jewel)), 0);
    return total ? Math.min(100, Math.round((progress / total) * 100)) : 0;
  }

  function updateRoundStatus() {
    if (objectiveComplete()) {
      roundStatus = 'won';
      return;
    }
    if (moves >= currentObjective().moveLimit) {
      roundStatus = 'lost';
      return;
    }
    roundStatus = 'playing';
  }

  function scoreGroup(size) {
    return size * size * 10;
  }

  function selectedSet() {
    return new Set(selected.map(([r, c]) => `${r},${c}`));
  }

  function setBoardBusy(isBusy) {
    const grid = container?.querySelector('.jd-grid');
    if (!grid) return;
    grid.classList.toggle('jd-busy', isBusy);
    grid.setAttribute('aria-busy', String(isBusy));
  }

  async function removeGroup(group) {
    if (animating || roundStatus !== 'playing') return;
    animating = true;
    selected = group;
    setBoardBusy(true);

    const keys = new Set(group.map(([r, c]) => `${r},${c}`));
    container.querySelectorAll('.jd-cell').forEach(cell => {
      if (keys.has(`${cell.dataset.r},${cell.dataset.c}`)) {
        cell.classList.add('jd-clearing');
      }
    });

    await wait(CLEAR_MS);

    const clearedJewel = board[group[0][0]][group[0][1]];
    group.forEach(([r, c]) => { board[r][c] = null; });
    const gained = scoreGroup(group.length);
    score += gained;
    if (clearedJewel) collected[clearedJewel] = collectedCount(clearedJewel) + group.length;
    moves++;
    best = Math.max(best, score);
    updateRoundStatus();
    selected = [];
    scoreBurst = gained;

    collapseBoard();
    message = `Cleared ${group.length} jewels · +${gained}`;

    render({ animateDrop: true });
    await wait(DROP_MS);

    if (roundStatus === 'playing' && !hasValidGroup()) await controlledReshuffle();

    scoreBurst = 0;
    animating = false;
    render();
    saveState();
  }

  function selectCell(r, c) {
    if (animating || roundStatus !== 'playing') return;
    const group = findGroup(r, c);
    if (group.length < MIN_GROUP) {
      selected = [];
      message = 'Select a connected group of 2 or more.';
      render();
      return;
    }

    const current = selectedSet();
    const sameSelection = current.size === group.length &&
      group.every(([gr, gc]) => current.has(`${gr},${gc}`));

    if (sameSelection) {
      removeGroup(group);
      return;
    }

    selected = group;
    message = `${group.length} jewels selected · click again to clear`;
    render();
  }

  function renderObjectiveItems() {
    const objective = currentObjective();
    const items = container.querySelector('.jd-objective-items');
    items.innerHTML = '';

    if (objective.type === 'score') {
      const item = document.createElement('div');
      item.className = 'jd-objective-item jd-objective-score';
      item.innerHTML = `<span>Target score</span><strong>${score} / ${objective.targetScore}</strong>`;
      items.appendChild(item);
      return;
    }

    Object.entries(objective.targets).forEach(([jewel, target]) => {
      const current = Math.min(target, collectedCount(jewel));
      const item = document.createElement('div');
      item.className = `jd-objective-item jd-objective-${jewel}`;
      if (current >= target) item.classList.add('jd-objective-complete');
      item.innerHTML = `
        <span class="jd-objective-gem jd-${jewel}">◆</span>
        <span class="jd-objective-name">${jewel}</span>
        <strong>${current} / ${target}</strong>
      `;
      items.appendChild(item);
    });
  }

  function resultSummary() {
    const objective = currentObjective();
    if (objective.type === 'score') return `Final score: ${score} / ${objective.targetScore}.`;
    return Object.entries(objective.targets)
      .map(([jewel, target]) => `${jewel}: ${Math.min(target, collectedCount(jewel))}/${target}`)
      .join(' · ');
  }

  function render(options = {}) {
    if (!container) return;
    const { animateDrop = false, animateReshuffle = false } = options;
    const objective = currentObjective();

    container.querySelector('.jd-score').textContent = score;
    container.querySelector('.jd-best').textContent = best;
    container.querySelector('.jd-moves').textContent = `${moves}/${objective.moveLimit}`;
    container.querySelector('.jd-objective-title').textContent = objective.title;
    container.querySelector('.jd-objective-description').textContent = objective.description;
    container.querySelector('.jd-moves-left').textContent = movesRemaining();
    container.querySelector('.jd-round-number').textContent = `${objectiveIndex + 1}/${OBJECTIVES.length}`;
    renderObjectiveItems();

    const progress = objectiveProgressPercent();
    const fill = container.querySelector('.jd-objective-fill');
    fill.style.width = `${progress}%`;
    fill.parentElement.setAttribute('aria-valuenow', String(progress));

    const result = container.querySelector('.jd-result');
    const resultTitle = container.querySelector('.jd-result-title');
    const resultText = container.querySelector('.jd-result-text');
    const replayButton = container.querySelector('.jd-replay-btn');
    if (roundStatus === 'won') {
      result.hidden = false;
      result.className = 'jd-result jd-result-win';
      resultTitle.textContent = 'OBJECTIVE COMPLETE';
      resultText.textContent = objectiveIndex + 1 < OBJECTIVES.length
        ? `${resultSummary()} Next objective unlocked.`
        : `${resultSummary()} Objective cycle complete.`;
      replayButton.textContent = objectiveIndex + 1 < OBJECTIVES.length ? 'Next Objective' : 'Restart Cycle';
      message = 'Objective complete.';
    } else if (roundStatus === 'lost') {
      result.hidden = false;
      result.className = 'jd-result jd-result-loss';
      resultTitle.textContent = 'OUT OF MOVES';
      resultText.textContent = resultSummary();
      replayButton.textContent = 'Retry Objective';
      message = 'Move limit reached — try clearing larger or required-colour groups.';
    } else {
      result.hidden = true;
    }
    container.querySelector('.jd-message').textContent = message;

    const burst = container.querySelector('.jd-score-burst');
    burst.textContent = scoreBurst ? `+${scoreBurst}` : '';
    burst.classList.toggle('jd-score-burst-active', Boolean(scoreBurst));

    const selectedKeys = selectedSet();
    const grid = container.querySelector('.jd-grid');
    grid.innerHTML = '';

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const jewel = board[r][c];
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = `jd-cell jd-${jewel}`;
        cell.dataset.r = String(r);
        cell.dataset.c = String(c);
        if (selectedKeys.has(`${r},${c}`)) cell.classList.add('jd-selected');
        if (animateDrop) {
          cell.classList.add('jd-drop-in');
          cell.style.setProperty('--jd-delay', `${(ROWS - 1 - r) * 10 + c * 3}ms`);
        }
        if (animateReshuffle) {
          cell.classList.add('jd-reshuffle-in');
          cell.style.setProperty('--jd-delay', `${(r + c) * 7}ms`);
        }
        cell.disabled = animating || roundStatus !== 'playing';
        cell.setAttribute('aria-label', `${jewel} jewel, row ${r + 1}, column ${c + 1}`);
        cell.innerHTML = `<span>${SYMBOLS[jewel]}</span>`;
        cell.addEventListener('click', () => selectCell(r, c));
        grid.appendChild(cell);
      }
    }

    setBoardBusy(animating);
  }

  function startNew(index = objectiveIndex) {
    objectiveIndex = Math.max(0, Math.min(OBJECTIVES.length - 1, index));
    board = createPlayableBoard();
    score = 0;
    moves = 0;
    collected = {};
    selected = [];
    animating = false;
    scoreBurst = 0;
    roundStatus = 'playing';
    const objective = currentObjective();
    message = `${objective.description} You have ${objective.moveLimit} moves.`;
  }

  async function reset() {
    if (animating) return;
    await Storage.remove(STATE_KEY);
    startNew(objectiveIndex);
    await saveState();
    render({ animateDrop: true });
  }

  async function advanceObjective() {
    if (animating) return;
    const nextIndex = objectiveIndex + 1 < OBJECTIVES.length ? objectiveIndex + 1 : 0;
    await Storage.remove(STATE_KEY);
    startNew(nextIndex);
    await saveState();
    render({ animateDrop: true });
  }

  async function handleReplay() {
    if (roundStatus === 'won') await advanceObjective();
    else await reset();
  }

  async function init(el) {
    container = el;
    container.innerHTML = `
      <div class="jd-wrap">
        <div class="jd-header">
          <div>
            <div class="jd-title">JEWEL DROP</div>
            <div class="jd-subtitle">PHASE 2.2 · MULTIPLE OBJECTIVES</div>
          </div>
          <button class="btn-reset jd-new-btn" type="button">New Game</button>
        </div>
        <div class="jd-stats">
          <div><span>Score</span><strong class="jd-score">0</strong></div>
          <div><span>Best</span><strong class="jd-best">0</strong></div>
          <div><span>Moves</span><strong class="jd-moves">0</strong></div>
        </div>
        <div class="jd-objective">
          <div class="jd-objective-heading">
            <div>
              <span class="jd-objective-kicker">Objective <strong class="jd-round-number">1/${OBJECTIVES.length}</strong></span>
              <strong class="jd-objective-title"></strong>
              <span class="jd-objective-description"></span>
            </div>
            <span>Moves left: <strong class="jd-moves-left"></strong></span>
          </div>
          <div class="jd-objective-items"></div>
          <div class="jd-objective-track" role="progressbar" aria-label="Objective progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <div class="jd-objective-fill"></div>
          </div>
        </div>
        <div class="jd-board-shell">
          <div class="jd-score-burst" aria-live="polite"></div>
          <div class="jd-grid" role="grid" aria-label="Jewel Drop board" aria-busy="false"></div>
        </div>
        <div class="jd-result" hidden>
          <div class="jd-result-title"></div>
          <div class="jd-result-text"></div>
          <button class="btn-reset jd-replay-btn" type="button">Next Objective</button>
        </div>
        <div class="jd-message" aria-live="polite"></div>
        <div class="game-hint">Click a group once to select it · click again to clear it</div>
      </div>
    `;

    container.querySelector('.jd-new-btn').addEventListener('click', reset);
    container.querySelector('.jd-replay-btn').addEventListener('click', handleReplay);
    runBoardValidationTests();
    const resumed = await loadState();
    if (!resumed) startNew(0);
    else if (!hasValidGroup()) {
      reshuffleBoardPreservingInventory();
      message = 'Saved board restored and safely reshuffled.';
      await saveState();
    }
    render({ animateDrop: !resumed });
  }

  function onKey() {}

  return { init, onKey, reset };
})();
