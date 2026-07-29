// connect4.js — Full Connect 4 implementation with AI opponent
// Left/Right: move column cursor, Space/Down/Enter: drop piece.

const GameConnect4 = (() => {
  const STORAGE_KEY = 'game_connect4';
  const ROWS = 6;
  const COLS = 7;
  const CENTER_COL = 3;
  const HUMAN = 1;
  const AI = 2;
  const EMPTY = 0;
  const DRAW = -1;
  const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
  const COLUMNS = range(COLS);
  const ROW_INDEXES = range(ROWS);
  const BOARD_CELLS = ROW_INDEXES.flatMap(r => COLUMNS.map(c => [r, c]));
  const SCORE_LINES = buildScoreLines();

  let board = [];    // ROWS x COLS, 0=empty, 1=human, 2=AI
  let cursor = CENTER_COL; // column cursor (0-based)
  let turn = HUMAN;
  let winner = EMPTY;      // 0=none, 1=human, 2=AI, -1=draw
  let winCells = [];
  let vsAI = true;
  let container = null;

  // ── State ────────────────────────────────────────────────────────────────

  function serialize() {
    return { board, cursor, turn, winner, winCells, vsAI };
  }

  async function saveState() {
    Storage.saveLazy(STORAGE_KEY, serialize());
  }

  async function loadState() {
    const s = await Storage.load(STORAGE_KEY);
    if (!s?.board) return false;
    board = s.board;
    cursor = s.cursor;
    turn = s.turn;
    winner = s.winner;
    winCells = s.winCells || [];
    vsAI = s.vsAI ?? true;
    return true;
  }

  // ── Shared helpers ───────────────────────────────────────────────────────

  function range(size) {
    return Array.from({ length: size }, (_, index) => index);
  }

  function emptyBoard() {
    return ROW_INDEXES.map(() => new Array(COLS).fill(EMPTY));
  }

  function cloneBoard(source) {
    return source.map(row => [...row]);
  }

  function inBounds(r, c) {
    return r >= 0 && r < ROWS && c >= 0 && c < COLS;
  }

  function isEmptyTopCell(source, col) {
    return source[0][col] === EMPTY;
  }

  function findOpenRow(source, col) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (source[r][col] === EMPTY) return r;
    }
    return -1;
  }

  function dropOnBoard(source, col, player) {
    const row = findOpenRow(source, col);
    if (row !== -1) source[row][col] = player;
    return row;
  }

  function drop(col, player) {
    return dropOnBoard(board, col, player);
  }

  function dropTemp(source, col, player) {
    const nextBoard = cloneBoard(source);
    dropOnBoard(nextBoard, col, player);
    return nextBoard;
  }

  // ── Win / draw logic ─────────────────────────────────────────────────────

  function runCells(source, player, r, c, dr, dc) {
    const cells = [];
    for (let i = 0; i < 4; i++) {
      const nr = r + dr * i;
      const nc = c + dc * i;
      if (!inBounds(nr, nc) || source[nr][nc] !== player) return null;
      cells.push([nr, nc]);
    }
    return cells;
  }

  function findRunFromCell(source, player, r, c) {
    if (source[r][c] !== player) return null;
    for (const [dr, dc] of DIRS) {
      const cells = runCells(source, player, r, c, dr, dc);
      if (cells) return cells;
    }
    return null;
  }

  function findWinningCells(source, player) {
    for (const [r, c] of BOARD_CELLS) {
      const cells = findRunFromCell(source, player, r, c);
      if (cells) return cells;
    }
    return null;
  }

  function checkWin(player) {
    return findWinningCells(board, player);
  }

  function hasWinner(source) {
    return Boolean(findWinningCells(source, HUMAN) || findWinningCells(source, AI));
  }

  function isDraw() {
    return board[0].every(v => v !== EMPTY);
  }

  // ── AI scoring ───────────────────────────────────────────────────────────

  function scoreWindow(window, player) {
    const opp = player === AI ? HUMAN : AI;
    const playerCount = countValue(window, player);
    const emptyCount = countValue(window, EMPTY);
    const opponentCount = countValue(window, opp);
    if (playerCount === 4) return 100;
    if (playerCount === 3 && emptyCount === 1) return 5;
    if (playerCount === 2 && emptyCount === 2) return 2;
    if (opponentCount === 3 && emptyCount === 1) return -4;
    return 0;
  }

  function countValue(values, value) {
    return values.filter(item => item === value).length;
  }

  function readWindow(source, r, c, dr, dc) {
    return range(4).map(i => source[r + dr * i][c + dc * i]);
  }

  function lineStarts(rowEnd, colEnd) {
    return range(rowEnd).flatMap(r => range(colEnd).map(c => [r, c]));
  }

  function buildScoreLines() {
    return [
      { dr: 0, dc: 1, starts: lineStarts(ROWS, COLS - 3) },
      { dr: 1, dc: 0, starts: lineStarts(ROWS - 3, COLS) },
      { dr: 1, dc: 1, starts: lineStarts(ROWS - 3, COLS - 3) },
      { dr: -1, dc: 1, starts: lineStarts(ROWS - 3, COLS - 3).map(([r, c]) => [r + 3, c]) },
    ];
  }

  function scoreLine(source, player, line) {
    return line.starts.reduce((total, [r, c]) => {
      const window = readWindow(source, r, c, line.dr, line.dc);
      return total + scoreWindow(window, player);
    }, 0);
  }

  function centerColumnScore(source, player) {
    return source.map(row => row[CENTER_COL]).filter(v => v === player).length * 3;
  }

  function scoreBoard(source, player) {
    return SCORE_LINES.reduce(
      (total, line) => total + scoreLine(source, player, line),
      centerColumnScore(source, player),
    );
  }

  // ── AI minimax with alpha-beta ───────────────────────────────────────────

  function getValidCols(source) {
    return COLUMNS.filter(col => isEmptyTopCell(source, col));
  }

  function isTerminal(source) {
    return hasWinner(source) || getValidCols(source).length === 0;
  }

  function updateBestMax(bestMove, candidateScore, col) {
    return candidateScore > bestMove.score ? { score: candidateScore, col } : bestMove;
  }

  function updateBestMin(bestMove, candidateScore, col) {
    return candidateScore < bestMove.score ? { score: candidateScore, col } : bestMove;
  }

  function maximizeMove(source, depth, alpha, beta, cols) {
    let bestMove = { score: -Infinity, col: cols[0] };
    for (const col of cols) {
      const nextBoard = dropTemp(source, col, AI);
      const { score } = minimax(nextBoard, depth - 1, alpha, beta, false);
      bestMove = updateBestMax(bestMove, score, col);
      alpha = Math.max(alpha, bestMove.score);
      if (alpha >= beta) break;
    }
    return bestMove;
  }

  function minimizeMove(source, depth, alpha, beta, cols) {
    let bestMove = { score: Infinity, col: cols[0] };
    for (const col of cols) {
      const nextBoard = dropTemp(source, col, HUMAN);
      const { score } = minimax(nextBoard, depth - 1, alpha, beta, true);
      bestMove = updateBestMin(bestMove, score, col);
      beta = Math.min(beta, bestMove.score);
      if (alpha >= beta) break;
    }
    return bestMove;
  }

  function boardScore(source) {
    return scoreBoard(source, AI) - scoreBoard(source, HUMAN);
  }

  function minimax(source, depth, alpha, beta, maximizing) {
    if (depth === 0 || isTerminal(source)) return { score: boardScore(source) };
    const cols = getValidCols(source);
    if (maximizing) return maximizeMove(source, depth, alpha, beta, cols);
    return minimizeMove(source, depth, alpha, beta, cols);
  }

  function chooseAiColumn() {
    const { col } = minimax(board, 5, -Infinity, Infinity, true);
    return col ?? getValidCols(board)[0];
  }

  function finishAiTurn() {
    const winningCells = checkWin(AI);
    if (winningCells) {
      winner = AI;
      winCells = winningCells;
    } else if (isDraw()) {
      winner = DRAW;
    }
    turn = HUMAN;
    saveState();
    render();
  }

  function aiMove() {
    drop(chooseAiColumn(), AI);
    finishAiTurn();
  }

  // ── Player action ────────────────────────────────────────────────────────

  function finishHumanWinningTurn(winningCells) {
    winner = HUMAN;
    winCells = winningCells;
    saveState();
    render();
  }

  function finishDrawTurn() {
    winner = DRAW;
    saveState();
    render();
  }

  function queueAiTurn() {
    turn = AI;
    render();
    setTimeout(() => { aiMove(); }, 200);
  }

  function playerDrop() {
    if (winner !== EMPTY || turn !== HUMAN || !isEmptyTopCell(board, cursor)) return;
    drop(cursor, HUMAN);
    const winningCells = checkWin(HUMAN);
    if (winningCells) { finishHumanWinningTurn(winningCells); return; }
    if (isDraw()) { finishDrawTurn(); return; }
    queueAiTurn();
  }

  // ── Rendering ────────────────────────────────────────────────────────────

  function infoText() {
    if (winner === HUMAN) return 'You win! 🎉';
    if (winner === AI) return 'AI wins!';
    if (winner === DRAW) return "It's a draw!";
    return turn === HUMAN ? 'Your turn' : 'AI thinking...';
  }

  function updateInfo() {
    const info = container.querySelector('.c4-info');
    if (info) info.textContent = infoText();
  }

  function updateArrows() {
    container.querySelectorAll('.c4-arrow')
      .forEach((arrow, index) => arrow.classList.toggle('c4-arrow-active', index === cursor));
  }

  function isWinCell(r, c) {
    return winCells.some(([wr, wc]) => wr === r && wc === c);
  }

  function setCellPlayerClass(cell, value) {
    if (value === HUMAN) cell.classList.add('c4-p1');
    if (value === AI) cell.classList.add('c4-p2');
  }

  function updateCell(cell, idx) {
    const [r, c] = BOARD_CELLS[idx];
    cell.className = 'c4-cell';
    setCellPlayerClass(cell, board[r][c]);
    if (isWinCell(r, c)) cell.classList.add('c4-win');
  }

  function render() {
    if (!container) return;
    updateInfo();
    updateArrows();
    container.querySelectorAll('.c4-cell').forEach(updateCell);
  }

  // ── Markup / events ──────────────────────────────────────────────────────

  function arrowHtml() {
    return `<div class="c4-arrows">${COLUMNS.map(() => '<div class="c4-arrow">▼</div>').join('')}</div>`;
  }

  function boardCellHtml([r, c]) {
    return `<div class="c4-cell" data-r="${r}" data-c="${c}"></div>`;
  }

  function boardHtml() {
    return `<div class="c4-board">${BOARD_CELLS.map(boardCellHtml).join('')}</div>`;
  }

  function gameHtml() {
    return [
      '<div class="c4-info"></div>',
      arrowHtml(),
      boardHtml(),
      '<button class="btn-reset" id="btn-reset-c4">New Game</button>',
      '<div class="game-hint">←→: move column &nbsp; Space/↓: drop</div>',
    ].join('');
  }

  function handleBoardClick(e) {
    const cell = e.target.closest('.c4-cell');
    if (!cell) return;
    cursor = Number.parseInt(cell.dataset.c, 10);
    playerDrop();
  }

  function wireEvents() {
    container.querySelector('.c4-board').addEventListener('click', handleBoardClick);
    container.querySelector('#btn-reset-c4').addEventListener('click', reset);
  }

  // ── Public API ───────────────────────────────────────────────────────────

  async function init(el) {
    container = el;
    container.innerHTML = gameHtml();
    wireEvents();
    const resumed = await loadState();
    if (!resumed) startNew();
    render();
  }

  function startNew() {
    board = emptyBoard();
    cursor = CENTER_COL;
    turn = HUMAN;
    winner = EMPTY;
    winCells = [];
  }

  async function reset() {
    await Storage.remove(STORAGE_KEY);
    startNew();
    render();
  }

  function moveCursor(delta) {
    cursor = Math.max(0, Math.min(COLS - 1, cursor + delta));
    render();
  }

  function keyHandlers() {
    return {
      ArrowLeft: () => moveCursor(-1),
      ArrowRight: () => moveCursor(1),
      ArrowDown: playerDrop,
      Enter: playerDrop,
      ' ': playerDrop,
    };
  }

  function onKey(e) {
    if (!container || winner !== EMPTY) return;
    const handler = keyHandlers()[e.key];
    if (!handler) return;
    e.preventDefault();
    handler();
  }

  return { init, onKey, reset };
})();
