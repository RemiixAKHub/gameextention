// tetris.js — Full Tetris implementation
// Left/Right: move, Down: soft drop, Up/Space: rotate, Shift: hard drop, C: hold.
// Game loop runs only when tab is active; saves on every lock.

const GameTetris = (() => {
  const STORAGE_KEY = 'game_tetris';
  const COLS = 10, ROWS = 20;
  const TICK_START = 600, TICK_MIN = 80, TICK_STEP = 30;

  const PIECES = {
    I: { shape: [[1,1,1,1]], color: '#26c6da' },
    O: { shape: [[1,1],[1,1]], color: '#ffd54f' },
    T: { shape: [[0,1,0],[1,1,1]], color: '#ab47bc' },
    S: { shape: [[0,1,1],[1,1,0]], color: '#66bb6a' },
    Z: { shape: [[1,1,0],[0,1,1]], color: '#ef5350' },
    J: { shape: [[1,0,0],[1,1,1]], color: '#5c6bc0' },
    L: { shape: [[0,0,1],[1,1,1]], color: '#ff7043' },
  };
  const PIECE_KEYS = Object.keys(PIECES);

  let board = [];       // ROWS x COLS, 0 or color string
  let current = null;   // { shape, color, r, c }
  let next = null;
  let held = null;      // piece stored for later use
  let canHold = true;   // one hold allowed per falling piece
  let score = 0, lines = 0, level = 1, best = 0;
  let gameOver = false;
  let bag = [];
  let container = null;
  let tickHandle = null;
  let lastTickTime = 0;
  let softDrop = false;

  // ── State ────────────────────────────────────────────────────────────────

  function serialize() {
    return { board, current, next, held, canHold, score, lines, level, best, gameOver, bag };
  }

  async function saveState() {
    Storage.saveLazy(STORAGE_KEY, serialize());
  }

  async function loadState() {
    const s = await Storage.load(STORAGE_KEY);
    if (s && s.board) {
      board = s.board; current = s.current; next = s.next;
      held = s.held || null; canHold = s.canHold ?? true;
      score = s.score; lines = s.lines; level = s.level;
      best = s.best; gameOver = s.gameOver; bag = s.bag || [];
      return true;
    }
    return false;
  }

  // ── Piece helpers ────────────────────────────────────────────────────────

  function emptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  }

  function nextFromBag() {
    if (!bag.length) bag = shuffle([...PIECE_KEYS]);
    const key = bag.pop();
    const p = PIECES[key];
    return { shape: p.shape.map(r => [...r]), color: p.color, r: 0, c: Math.floor((COLS - p.shape[0].length) / 2) };
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function rotate(shape) {
    const rows = shape.length, cols = shape[0].length;
    const out = Array.from({ length: cols }, () => Array(rows).fill(0));
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        out[c][rows - 1 - r] = shape[r][c];
    return out;
  }

  function fits(shape, r, c) {
    for (let sr = 0; sr < shape.length; sr++)
      for (let sc = 0; sc < shape[0].length; sc++) {
        if (!shape[sr][sc]) continue;
        const br = r + sr, bc = c + sc;
        if (br < 0 || br >= ROWS || bc < 0 || bc >= COLS) return false;
        if (board[br][bc]) return false;
      }
    return true;
  }

  function lock() {
    for (let sr = 0; sr < current.shape.length; sr++)
      for (let sc = 0; sc < current.shape[0].length; sc++)
        if (current.shape[sr][sc])
          board[current.r + sr][current.c + sc] = current.color;
    clearLines();
    current = next;
    next = nextFromBag();
    canHold = true;
    if (!fits(current.shape, current.r, current.c)) {
      gameOver = true;
      stopLoop();
      if (score > best) best = score;
      saveState();
      render();
    }
    saveState();
  }

  function clearLines() {
    const cleared = [];
    for (let r = ROWS - 1; r >= 0; r--)
      if (board[r].every(v => v !== 0)) cleared.push(r);
    if (!cleared.length) return;
    for (const r of cleared) board.splice(r, 1);
    while (board.length < ROWS) board.unshift(Array(COLS).fill(0));
    lines += cleared.length;
    const pts = [0, 100, 300, 500, 800][cleared.length] * level;
    score += pts;
    level = Math.floor(lines / 10) + 1;
    if (score > best) best = score;
  }


  function resetPiecePosition(piece) {
    piece.r = 0;
    piece.c = Math.floor((COLS - piece.shape[0].length) / 2);
    return piece;
  }

  function holdCurrent() {
    if (gameOver || !current || !canHold) return;

    const outgoing = resetPiecePosition({
      shape: current.shape.map(row => [...row]),
      color: current.color,
      r: 0,
      c: 0,
    });

    if (held) {
      current = resetPiecePosition(held);
      held = outgoing;
    } else {
      held = outgoing;
      current = next;
      next = nextFromBag();
    }

    canHold = false;
    if (!fits(current.shape, current.r, current.c)) {
      gameOver = true;
      stopLoop();
    }
    saveState();
    render();
  }

  function ghostRow() {
    let gr = current.r;
    while (fits(current.shape, gr + 1, current.c)) gr++;
    return gr;
  }

  // ── Game loop ────────────────────────────────────────────────────────────

  function tick() {
    if (gameOver) return;
    if (fits(current.shape, current.r + 1, current.c)) {
      current.r++;
    } else {
      lock();
    }
    render();
  }

  function scheduleNext() {
    if (tickHandle) clearTimeout(tickHandle);
    const interval = softDrop ? Math.max(40, TICK_START - (level - 1) * TICK_STEP) / 5
                               : Math.max(TICK_MIN, TICK_START - (level - 1) * TICK_STEP);
    tickHandle = setTimeout(() => { tick(); scheduleNext(); }, interval);
  }

  function startLoop() {
    if (!gameOver) scheduleNext();
  }

  function stopLoop() {
    clearTimeout(tickHandle);
    tickHandle = null;
  }

  // ── Rendering ────────────────────────────────────────────────────────────

  function render() {
    if (!container) return;
    container.querySelector('.tet-score').textContent = `Score: ${score}  Lines: ${lines}  Level: ${level}  Best: ${best}`;

    const canvas = container.querySelector('.tet-canvas');
    const ctx = canvas.getContext('2d');
    const CW = canvas.width / COLS, CH = canvas.height / ROWS;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines (subtle)
    ctx.strokeStyle = '#252525';
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * CW, 0); ctx.lineTo(c * CW, canvas.height); ctx.stroke(); }
    for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * CH); ctx.lineTo(canvas.width, r * CH); ctx.stroke(); }

    // Draw board
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (board[r][c]) drawCell(ctx, r, c, board[r][c], CW, CH);

    if (!gameOver && current) {
      // Ghost
      const gr = ghostRow();
      if (gr !== current.r) {
        for (let sr = 0; sr < current.shape.length; sr++)
          for (let sc = 0; sc < current.shape[0].length; sc++)
            if (current.shape[sr][sc]) drawCell(ctx, gr + sr, current.c + sc, current.color, CW, CH, 0.25);
      }
      // Current piece
      for (let sr = 0; sr < current.shape.length; sr++)
        for (let sc = 0; sc < current.shape[0].length; sc++)
          if (current.shape[sr][sc]) drawCell(ctx, current.r + sr, current.c + sc, current.color, CW, CH);
    }

    if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#e0e0e0';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 10);
      ctx.font = '11px monospace';
      ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
    }

    drawPreview(container.querySelector('.tet-hold'), held);
    drawPreview(container.querySelector('.tet-next'), next);

    const holdLabel = container.querySelector('.tet-hold-label');
    if (holdLabel) holdLabel.classList.toggle('tet-hold-locked', !canHold);
  }


  function drawPreview(previewCanvas, piece) {
    if (!previewCanvas) return;
    const previewCtx = previewCanvas.getContext('2d');
    previewCtx.fillStyle = '#1a1a1a';
    previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
    if (!piece) return;

    const pw = previewCanvas.width / 4, ph = previewCanvas.height / 4;
    const offR = Math.floor((4 - piece.shape.length) / 2);
    const offC = Math.floor((4 - piece.shape[0].length) / 2);
    for (let sr = 0; sr < piece.shape.length; sr++)
      for (let sc = 0; sc < piece.shape[0].length; sc++)
        if (piece.shape[sr][sc]) drawCell(previewCtx, offR + sr, offC + sc, piece.color, pw, ph);
  }

  function drawCell(ctx, r, c, color, CW, CH, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(c * CW + 1, r * CH + 1, CW - 2, CH - 2);
    // Highlight top-left
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(c * CW + 1, r * CH + 1, CW - 2, 3);
    ctx.fillRect(c * CW + 1, r * CH + 1, 3, CH - 2);
    ctx.globalAlpha = 1;
  }

  // ── Public API ───────────────────────────────────────────────────────────

  async function init(el) {
    container = el;
    container.innerHTML = `
      <div class="tet-score"></div>
      <div class="tet-area">
        <canvas class="tet-canvas" width="160" height="320"></canvas>
        <div class="tet-side">
          <div class="tet-preview-group">
            <div class="tet-next-label tet-hold-label">HOLD · C</div>
            <canvas class="tet-hold" width="60" height="60"></canvas>
          </div>
          <div class="tet-preview-group">
            <div class="tet-next-label">NEXT</div>
            <canvas class="tet-next" width="60" height="60"></canvas>
          </div>
          <button class="btn-reset" id="btn-reset-tet">New Game</button>
        </div>
      </div>
      <div class="game-hint">←→: move · ↓: soft drop · ↑/Space: rotate · Shift: hard drop · C: hold</div>
    `;
    container.querySelector('#btn-reset-tet').addEventListener('click', reset);

    const resumed = await loadState();
    if (!resumed) startNew();
    render();
    if (!gameOver) startLoop();
  }

  function startNew() {
    board = emptyBoard();
    score = 0; lines = 0; level = 1;
    gameOver = false; bag = []; held = null; canHold = true;
    current = nextFromBag(); current.r = 0;
    next = nextFromBag();
  }

  async function reset() {
    stopLoop();
    await Storage.remove(STORAGE_KEY);
    startNew();
    render();
    startLoop();
  }

  function onKey(e) {
    if (!container || gameOver) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (fits(current.shape, current.r, current.c - 1)) { current.c--; render(); }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (fits(current.shape, current.r, current.c + 1)) { current.c++; render(); }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      softDrop = true;
      scheduleNext();
    } else if (e.key === 'ArrowUp' || e.key === ' ') {
      e.preventDefault();
      const rot = rotate(current.shape);
      // Wall kick: try offsets 0, -1, +1, -2, +2
      for (const dc of [0, -1, 1, -2, 2]) {
        if (fits(rot, current.r, current.c + dc)) {
          current.shape = rot; current.c += dc; break;
        }
      }
      render();
    } else if (e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      holdCurrent();
    } else if (e.key === 'Shift') {
      e.preventDefault();
      // Hard drop
      while (fits(current.shape, current.r + 1, current.c)) { current.r++; score += 2; }
      lock(); render(); scheduleNext();
    }
  }

  function onKeyUp(e) {
    if (e.key === 'ArrowDown') { softDrop = false; scheduleNext(); }
  }

  function onVisible(visible) {
    if (visible && !gameOver && tickHandle === null) startLoop();
    else if (!visible) stopLoop();
  }

  return { init, onKey, onKeyUp, reset, onVisible };
})();
