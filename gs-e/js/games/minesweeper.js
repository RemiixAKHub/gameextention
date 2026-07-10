// minesweeper.js — Classic Windows Minesweeper look
// LEFT CLICK: reveal | RIGHT CLICK: flag | Difficulty: Beginner/Intermediate/Expert

const GameMinesweeper = (() => {

  function randomUnit() {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] / 0x100000000;
  }

  function randomInt(max) {
    return Math.floor(randomUnit() * max);
  }
  const STORAGE_KEY = 'game_minesweeper';

  const DIFFICULTIES = {
    beginner:     { rows: 9,  cols: 9,  mines: 10, label: 'Beginner' },
    intermediate: { rows: 16, cols: 16, mines: 40, label: 'Intermediate' },
    expert:       { rows: 16, cols: 30, mines: 99, label: 'Expert' },
  };

  let difficulty = 'beginner';
  let ROWS, COLS, MINES;

  let board = [];
  let gameOver = false, won = false, started = false;
  let minesLeft = 0;
  let timerVal = 0, timerHandle = null;
  let facePressed = false;
  let container = null;

  // ── State ────────────────────────────────────────────────────────────────

  function serialize() {
    return { board, gameOver, won, started, minesLeft, timerVal, difficulty };
  }

  async function saveState() {
    Storage.saveLazy(STORAGE_KEY, serialize());
  }

  async function loadState() {
    const s = await Storage.load(STORAGE_KEY);
    if (s?.board && s?.difficulty && DIFFICULTIES[s.difficulty]) {
      difficulty = s.difficulty;
      applyDifficulty();
      board = s.board; gameOver = s.gameOver; won = s.won;
      started = s.started; minesLeft = s.minesLeft; timerVal = s.timerVal || 0;
      return true;
    }
    return false;
  }

  function applyDifficulty() {
    const d = DIFFICULTIES[difficulty];
    ROWS = d.rows; COLS = d.cols; MINES = d.mines;
  }

  // ── Board creation ───────────────────────────────────────────────────────

  function makeBoard() {
    applyDifficulty();
    board = Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => ({ mine: false, revealed: false, flagged: false, questioned: false, adj: 0 }))
    );
    started = false; gameOver = false; won = false;
    minesLeft = MINES; timerVal = 0;
    stopTimer();
  }

  function placeMines(safeR, safeC) {
    let placed = 0;
    while (placed < MINES) {
      const r = randomInt(ROWS);
      const c = randomInt(COLS);
      if (board[r][c].mine) continue;
      if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
      board[r][c].mine = true;
      placed++;
    }
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (!board[r][c].mine)
          board[r][c].adj = neighbors(r, c).filter(([nr, nc]) => board[nr][nc].mine).length;
  }

  function neighbors(r, c) {
    const res = [];
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) res.push([nr, nc]);
      }
    return res;
  }

  // ── Timer ─────────────────────────────────────────────────────────────────

  function startTimer() {
    stopTimer();
    timerHandle = setInterval(() => {
      timerVal = Math.min(999, timerVal + 1);
      renderHeader();
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerHandle);
    timerHandle = null;
  }

  // ── Game actions ─────────────────────────────────────────────────────────

  function reveal(r, c) {
    if (gameOver || board[r][c].flagged || board[r][c].questioned || board[r][c].revealed) return;
    if (!started) { placeMines(r, c); started = true; startTimer(); }
    floodReveal(r, c);
    checkWin();
    saveState();
    render();
  }

  // Chord: reveal all neighbors if flagged count matches number
  function chord(r, c) {
    const cell = board[r][c];
    if (!cell.revealed || cell.adj === 0) return;
    const ns = neighbors(r, c);
    const flagCount = ns.filter(([nr, nc]) => board[nr][nc].flagged).length;
    if (flagCount !== cell.adj) return;
    ns.forEach(([nr, nc]) => {
      if (!board[nr][nc].flagged && !board[nr][nc].revealed) floodReveal(nr, nc);
    });
    checkWin();
    saveState();
    render();
  }

  function floodReveal(r, c) {
    const stack = [[r, c]];
    while (stack.length) {
      const [cr, cc] = stack.pop();
      const cell = board[cr][cc];
      if (cell.revealed || cell.flagged) continue;
      cell.revealed = true;
      if (cell.mine) { gameOver = true; stopTimer(); revealAllMines(cr, cc); return; }
      if (cell.adj === 0)
        neighbors(cr, cc).forEach(([nr, nc]) => { if (!board[nr][nc].revealed) stack.push([nr, nc]); });
    }
  }

  function revealAllMines(hitR, hitC) {
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const cell = board[r][c];
        if (cell.mine && !cell.flagged) cell.revealed = true;
        if (!cell.mine && cell.flagged) cell.wrongFlag = true;
        if (cell.mine && r === hitR && c === hitC) cell.hitMine = true;
      }
  }

  function cycleFlag(r, c) {
    if (gameOver || board[r][c].revealed) return;
    const cell = board[r][c];
    if (!cell.flagged && !cell.questioned) {
      cell.flagged = true; minesLeft--;
    } else if (cell.flagged) {
      cell.flagged = false; cell.questioned = true; minesLeft++;
    } else {
      cell.questioned = false;
    }
    saveState();
    render();
  }

  function checkWin() {
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const cell = board[r][c];
        if (!cell.mine && !cell.revealed) return;
      }
    won = true; gameOver = true; stopTimer();
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (board[r][c].mine) { board[r][c].flagged = true; board[r][c].revealed = false; }
    minesLeft = 0;
  }

  // ── Rendering ────────────────────────────────────────────────────────────

  const ADJ_COLORS = ['','#0000ff','#007b00','#ff0000','#00007b','#7b0000','#007b7b','#000','#7b7b7b'];

  function lcdDigits(n, digits = 3) {
    const s = Math.max(0, Math.min(999, Math.abs(Math.floor(n)))).toString().padStart(digits, '0');
    const digitSpans = [...s]
      .map(d => '<span class="ms-lcd-d ms-lcd-' + d + '">' + d + '</span>')
      .join('');
    return `<span class="ms-lcd">${digitSpans}</span>`;
  }

  function faceEmoji() {
    if (won) return '😎';
    if (gameOver) return '😵';
    if (facePressed) return '😮';
    return '🙂';
  }

  function renderHeader() {
    const h = container.querySelector('.ms-header');
    if (!h) return;
    h.querySelector('.ms-left-lcd').innerHTML = lcdDigits(minesLeft);
    h.querySelector('.ms-face').textContent = faceEmoji();
    h.querySelector('.ms-right-lcd').innerHTML = lcdDigits(timerVal);
  }

  function configureGrid(grid) {
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${COLS}, 18px)`;
    grid.style.gridTemplateRows = `repeat(${ROWS}, 18px)`;
  }

  function applyRevealedCellVisual(el, cell) {
    el.classList.add('ms-revealed');
    if (cell.hitMine) {
      el.classList.add('ms-hit');
      el.textContent = '💣';
    } else if (cell.mine) {
      el.textContent = '💣';
    } else if (cell.wrongFlag) {
      el.classList.add('ms-wrong');
      el.textContent = '🚩';
    } else if (cell.adj > 0) {
      el.textContent = cell.adj;
      el.style.color = ADJ_COLORS[cell.adj];
    }
  }

  function applyHiddenCellVisual(el, cell) {
    if (cell.wrongFlag) {
      el.classList.add('ms-wrong');
      el.textContent = '🚩';
    } else if (cell.flagged) {
      el.classList.add('ms-flagged');
      el.textContent = '🚩';
    } else if (cell.questioned) {
      el.classList.add('ms-questioned');
      el.textContent = '?';
    } else {
      el.classList.add('ms-unrevealed');
    }
  }

  function applyCellVisual(el, cell) {
    if (cell.revealed) {
      applyRevealedCellVisual(el, cell);
      return;
    }
    applyHiddenCellVisual(el, cell);
  }

  function pressFaceForCell(cell, event) {
    if (event.button === 0 && !cell.revealed) {
      facePressed = true;
      renderHeader();
    }
  }

  function releaseCell(cell, row, col, event) {
    facePressed = false;
    if (event.button === 0) {
      if (cell.revealed) chord(row, col);
      else reveal(row, col);
      return;
    }
    if (event.button === 2) cycleFlag(row, col);
  }

  function attachCellEvents(el, cell, row, col) {
    el.addEventListener('mousedown', event => pressFaceForCell(cell, event));
    el.addEventListener('mouseup', event => releaseCell(cell, row, col, event));
  }

  function createCellElement(row, col) {
    const cell = board[row][col];
    const el = document.createElement('div');
    el.className = 'ms-cell';
    applyCellVisual(el, cell);
    attachCellEvents(el, cell, row, col);
    return el;
  }

  function renderGridCells(grid) {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        grid.appendChild(createCellElement(row, col));
      }
    }
  }

  function renderDifficultyButtons() {
    const btns = container.querySelectorAll('.ms-diff-btn');
    btns.forEach(btn => btn.classList.toggle('active', btn.dataset.diff === difficulty));
  }

  function render() {
    if (!container) return;
    renderHeader();

    const grid = container.querySelector('.ms-grid');
    if (!grid) return;
    configureGrid(grid);
    renderGridCells(grid);
    renderDifficultyButtons();
  }

  // ── Public API ───────────────────────────────────────────────────────────

  async function init(el) {
    container = el;
    container.innerHTML = `
      <div class="ms-window">
        <div class="ms-diff-bar">
          <button class="ms-diff-btn" data-diff="beginner">Beginner</button>
          <button class="ms-diff-btn" data-diff="intermediate">Intermediate</button>
          <button class="ms-diff-btn" data-diff="expert">Expert</button>
        </div>
        <div class="ms-border-outer">
          <div class="ms-header">
            <div class="ms-left-lcd"></div>
            <button class="ms-face">🙂</button>
            <div class="ms-right-lcd"></div>
          </div>
          <div class="ms-field-border">
            <div class="ms-grid" oncontextmenu="return false;"></div>
          </div>
        </div>
      </div>
      <div class="game-hint">Left click: reveal &nbsp;|&nbsp; Right click: flag/? &nbsp;|&nbsp; Click number: chord</div>
    `;

    // Difficulty buttons
    container.querySelectorAll('.ms-diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        difficulty = btn.dataset.diff;
        resetFull();
      });
    });

    // Smiley face = new game
    container.querySelector('.ms-face').addEventListener('click', resetFull);
    container.querySelector('.ms-face').addEventListener('mousedown', () => { facePressed = true; renderHeader(); });
    container.querySelector('.ms-face').addEventListener('mouseup', () => { facePressed = false; });

    const resumed = await loadState();
    if (!resumed) makeBoard();
    // Resume timer if game was in progress
    if (started && !gameOver) startTimer();
    render();
  }

  async function resetFull() {
    stopTimer();
    await Storage.remove(STORAGE_KEY);
    makeBoard();
    render();
  }

  function onKey() {} // keyboard disabled for minesweeper (mouse-only)

  return { init, onKey, reset: resetFull };
})();
