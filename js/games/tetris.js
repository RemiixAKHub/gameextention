// tetris.js — Full Tetris implementation
// Left/Right: move, Down: soft drop, Up/Space: rotate, Shift: hard drop.
// Game loop runs only when tab is active; saves on every lock.

const GameTetris = (() => {

  function randomUnit() {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] / 0x100000000;
  }

  function randomInt(max) {
    return Math.floor(randomUnit() * max);
  }
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
  let score = 0, lines = 0, level = 1, best = 0;
  let gameOver = false;
  let bag = [];
  let container = null;
  let tickHandle = null;
  let softDrop = false;

  // ── State ────────────────────────────────────────────────────────────────

  function serialize() {
    return { board, current, next, score, lines, level, best, gameOver, bag };
  }

  async function saveState() {
    Storage.saveLazy(STORAGE_KEY, serialize());
  }

  async function loadState() {
    const s = await Storage.load(STORAGE_KEY);
    if (s?.board) {
      board = s.board; current = s.current; next = s.next;
      score = s.score; lines = s.lines; level = s.level;
      best = s.best; gameOver = s.gameOver; bag = s.bag || [];
      return true;
    }
    return false;
  }

  // ── Piece helpers ────────────────────────────────────────────────────────

  function emptyBoard() {
    return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  }

  function nextFromBag() {
    if (!bag.length) bag = shuffle([...PIECE_KEYS]);
    const key = bag.pop();
    const p = PIECES[key];
    return { shape: p.shape.map(r => [...r]), color: p.color, r: 0, c: Math.floor((COLS - p.shape[0].length) / 2) };
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function rotate(shape) {
    const rows = shape.length, cols = shape[0].length;
    const out = Array.from({ length: cols }, () => new Array(rows).fill(0));
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
    while (board.length < ROWS) board.unshift(new Array(COLS).fill(0));
    lines += cleared.length;
    const pts = [0, 100, 300, 500, 800][cleared.length] * level;
    score += pts;
    level = Math.floor(lines / 10) + 1;
    if (score > best) best = score;
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

  function clearCanvas(ctx, canvas) {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawGrid(ctx, canvas, CW, CH) {
    ctx.strokeStyle = '#252525';
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c * CW, 0); ctx.lineTo(c * CW, canvas.height); ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * CH); ctx.lineTo(canvas.width, r * CH); ctx.stroke();
    }
  }

  function drawBoard(ctx, CW, CH) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c]) drawCell(ctx, r, c, board[r][c], CW, CH);
      }
    }
  }

  function drawShape(ctx, piece, r, c, CW, CH, alpha = 1) {
    for (let sr = 0; sr < piece.shape.length; sr++) {
      for (let sc = 0; sc < piece.shape[0].length; sc++) {
        if (piece.shape[sr][sc]) drawCell(ctx, r + sr, c + sc, piece.color, CW, CH, alpha);
      }
    }
  }

  function drawCurrentPiece(ctx, CW, CH) {
    if (gameOver || !current) return;
    const gr = ghostRow();
    if (gr !== current.r) drawShape(ctx, current, gr, current.c, CW, CH, 0.25);
    drawShape(ctx, current, current.r, current.c, CW, CH);
  }

  function drawGameOver(ctx, canvas) {
    if (!gameOver) return;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = '11px monospace';
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
  }

  function drawNextPreview() {
    const nextCanvas = container.querySelector('.tet-next');
    const nc = nextCanvas.getContext('2d');
    clearCanvas(nc, nextCanvas);
    if (!next) return;
    const pw = nextCanvas.width / 4, ph = nextCanvas.height / 4;
    const offR = Math.floor((4 - next.shape.length) / 2);
    const offC = Math.floor((4 - next.shape[0].length) / 2);
    drawShape(nc, next, offR, offC, pw, ph);
  }

  function render() {
    if (!container) return;
    container.querySelector('.tet-score').textContent = `Score: ${score}  Lines: ${lines}  Level: ${level}  Best: ${best}`;

    const canvas = container.querySelector('.tet-canvas');
    const ctx = canvas.getContext('2d');
    const CW = canvas.width / COLS, CH = canvas.height / ROWS;

    clearCanvas(ctx, canvas);
    drawGrid(ctx, canvas, CW, CH);
    drawBoard(ctx, CW, CH);
    drawCurrentPiece(ctx, CW, CH);
    drawGameOver(ctx, canvas);
    drawNextPreview();
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
          <div class="tet-next-label">NEXT</div>
          <canvas class="tet-next" width="60" height="60"></canvas>
          <button class="btn-reset" id="btn-reset-tet">New Game</button>
        </div>
      </div>
      <div class="game-hint">←→: move &nbsp; ↓: soft drop &nbsp; ↑/Space: rotate &nbsp; Shift: hard drop</div>
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
    gameOver = false; bag = [];
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

  function moveCurrent(dc) {
    if (!fits(current.shape, current.r, current.c + dc)) return;
    current.c += dc;
    render();
  }

  function rotateCurrent() {
    const rot = rotate(current.shape);
    // Wall kick: try offsets 0, -1, +1, -2, +2
    for (const dc of [0, -1, 1, -2, 2]) {
      if (fits(rot, current.r, current.c + dc)) {
        current.shape = rot;
        current.c += dc;
        break;
      }
    }
    render();
  }

  function hardDrop() {
    while (fits(current.shape, current.r + 1, current.c)) {
      current.r++;
      score += 2;
    }
    lock();
    render();
    scheduleNext();
  }

  function onKey(e) {
    if (!container || gameOver) return;
    const handlers = {
      ArrowLeft: () => moveCurrent(-1),
      ArrowRight: () => moveCurrent(1),
      ArrowDown: () => { softDrop = true; scheduleNext(); },
      ArrowUp: rotateCurrent,
      ' ': rotateCurrent,
      Shift: hardDrop,
    };
    const handler = handlers[e.key];
    if (!handler) return;
    e.preventDefault();
    handler();
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
