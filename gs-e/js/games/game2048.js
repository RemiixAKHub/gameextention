// game2048.js — Full 2048 implementation
// Arrow keys to move. Auto-saves after every move via chrome.storage.local.

const Game2048 = (() => {

  function randomUnit() {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] / 0x100000000;
  }

  function randomInt(max) {
    return Math.floor(randomUnit() * max);
  }
  const STORAGE_KEY = 'game_2048';
  const SIZE = 4;

  let board = [];
  let score = 0;
  let best = 0;
  let gameOver = false;
  let container = null;

  // ── State helpers ────────────────────────────────────────────────────────

  function emptyBoard() {
    return Array.from({ length: SIZE }, () => new Array(SIZE).fill(0));
  }

  function serialize() {
    return { board, score, best, gameOver };
  }

  async function saveState() {
    Storage.saveLazy(STORAGE_KEY, serialize());
  }

  async function loadState() {
    const saved = await Storage.load(STORAGE_KEY);
    if (saved?.board) {
      board = saved.board;
      score = saved.score || 0;
      best  = saved.best  || 0;
      gameOver = saved.gameOver || false;
      return true;
    }
    return false;
  }

  // ── Core game logic ──────────────────────────────────────────────────────

  function addRandomTile() {
    const empty = [];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (board[r][c] === 0) empty.push([r, c]);
    if (!empty.length) return;
    const [r, c] = empty[randomInt(empty.length)];
    board[r][c] = randomUnit() < 0.9 ? 2 : 4;
  }

  function slideRow(row) {
    // Remove zeros
    let arr = row.filter(v => v !== 0);
    let gained = 0;
    // Merge
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        gained += arr[i];
        arr.splice(i + 1, 1);
      }
    }
    // Pad with zeros
    while (arr.length < SIZE) arr.push(0);
    return { arr, gained };
  }

  function moveLeft() {
    let moved = false, gained = 0;
    for (let r = 0; r < SIZE; r++) {
      const { arr, gained: g } = slideRow(board[r]);
      if (arr.join() !== board[r].join()) moved = true;
      board[r] = arr;
      gained += g;
    }
    return { moved, gained };
  }

  function rotateClockwise() {
    const b = emptyBoard();
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        b[c][SIZE - 1 - r] = board[r][c];
    board = b;
  }

  function rotateCounter() {
    rotateClockwise(); rotateClockwise(); rotateClockwise();
  }

  function move(dir) {
    if (gameOver) return;
    let moved = false, gained = 0;

    if (dir === 'left')  { ({ moved, gained } = moveLeft()); }
    if (dir === 'right') { rotateClockwise(); rotateClockwise(); ({ moved, gained } = moveLeft()); rotateClockwise(); rotateClockwise(); }
    if (dir === 'up')    { rotateCounter(); ({ moved, gained } = moveLeft()); rotateClockwise(); }
    if (dir === 'down')  { rotateClockwise(); ({ moved, gained } = moveLeft()); rotateCounter(); }

    if (!moved) return;
    score += gained;
    if (score > best) best = score;
    addRandomTile();
    if (!canMove()) gameOver = true;
    saveState();
    render();
  }

  function canMove() {
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) return true;
        if (c < SIZE - 1 && board[r][c] === board[r][c + 1]) return true;
        if (r < SIZE - 1 && board[r][c] === board[r + 1][c]) return true;
      }
    return false;
  }

  // ── Rendering ────────────────────────────────────────────────────────────

  const TILE_COLORS = {
    0:    ['#3a3a3a', '#3a3a3a'],
    2:    ['#eee4da', '#776e65'],
    4:    ['#ede0c8', '#776e65'],
    8:    ['#f2b179', '#f9f6f2'],
    16:   ['#f59563', '#f9f6f2'],
    32:   ['#f67c5f', '#f9f6f2'],
    64:   ['#f65e3b', '#f9f6f2'],
    128:  ['#edcf72', '#f9f6f2'],
    256:  ['#edcc61', '#f9f6f2'],
    512:  ['#edc850', '#f9f6f2'],
    1024: ['#edc53f', '#f9f6f2'],
    2048: ['#edc22e', '#f9f6f2'],
  };

  function tileColor(v) {
    return TILE_COLORS[v] || ['#3c3a32', '#f9f6f2'];
  }

  function tileFontSize(value) {
    if (value >= 1024) return '14px';
    if (value >= 128) return '16px';
    return '20px';
  }

  function render() {
    if (!container) return;
    const info = container.querySelector('.g2048-info');
    info.innerHTML = `<span>SCORE <b>${score}</b></span><span>BEST <b>${best}</b></span>`;

    const grid = container.querySelector('.g2048-grid');
    grid.innerHTML = '';
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const v = board[r][c];
        const cell = document.createElement('div');
        cell.className = 'g2048-cell';
        const [bg, fg] = tileColor(v);
        cell.style.background = bg;
        cell.style.color = fg;
        cell.style.fontSize = tileFontSize(v);
        if (v) cell.textContent = v;
        grid.appendChild(cell);
      }
    }

    const msg = container.querySelector('.g2048-msg');
    msg.textContent = gameOver ? 'Game Over' : '';
  }

  // ── Public API ───────────────────────────────────────────────────────────

  async function init(el) {
    container = el;
    container.innerHTML = `
      <div class="g2048-info"></div>
      <div class="g2048-grid"></div>
      <div class="g2048-msg"></div>
      <button class="btn-reset" id="btn-reset-2048">New Game</button>
      <div class="game-hint">Arrow keys to move</div>
    `;
    container.querySelector('#btn-reset-2048').addEventListener('click', reset);

    const resumed = await loadState();
    if (!resumed) startNew();
    render();
  }

  function startNew() {
    board = emptyBoard();
    score = 0;
    gameOver = false;
    addRandomTile();
    addRandomTile();
  }

  async function reset() {
    await Storage.remove(STORAGE_KEY);
    startNew();
    render();
  }

  function onKey(e) {
    const map = { ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down' };
    const dir = map[e.key];
    if (dir) { e.preventDefault(); move(dir); }
  }

  return { init, onKey, reset };
})();
