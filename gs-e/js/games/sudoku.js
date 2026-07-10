/* ═══════════════════════════════════════════════════════════════════════════
   SUDOKU  –  Pen / Pencil mode toggle
   Exports: GameSudoku  (consumed by popup.js)
═══════════════════════════════════════════════════════════════════════════ */
const GameSudoku = (() => {

  function randomUnit() {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] / 0x100000000;
  }

  function randomInt(max) {
    return Math.floor(randomUnit() * max);
  }

  /* ── Puzzle bank ─────────────────────────────────────────────────────── */
  const PUZZLES = {
    easy: [
      ['530070000600195000098000060800060003400803001700020006060000280000419005000080079',
       '534678912672195348198342567859761423426853791713924856961537284287419635345286179'],
      ['200080300060070084030500209000105408000000000402706000301007040720040060004010003',
       '271986345963571284834524219619125478548397162472863591395712846127849653486213937'],
    ],
    medium: [
      ['000000907000420180000705026100904000050000040000507009920108000034059000507000000',
       '264831957795426183813795426127984365956213748438567219921148673634579812579362841'],
      ['030000000000195000008000060800060003400803001700020006060000280000410000000080079',
       '534678912672195348198342567859761423426853791713924856961537284287419635345286179'],
    ],
    hard: [
      ['800000000003600000070090200060005300004803001300010060020060005500009800000800700',
       '812753649943682175675491283168945327294837561357126498421968735589374912736215874'],
      ['000000085000210009960080100500800016000000000890006007009070052300054000480000000',
       '174396285538217469962485173593872416641539728827641957719768352356924781482153694'],
    ],
  };

  const BOARD_SIZE = 9;
  const BOX_SIZE = 3;
  const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
  const ARROW_MOVES = { ArrowUp: -BOARD_SIZE, ArrowDown: BOARD_SIZE, ArrowLeft: -1, ArrowRight: 1 };
  const DIGITS = [1,2,3,4,5,6,7,8,9];

  /* ── State ───────────────────────────────────────────────────────────── */
  let board, fixed, notes, solution;
  let sel = -1, pencilMode = false, diff = 'easy';
  let timer = 0, timerID = null, errors = 0;
  let rootPane = null;
  const lastPuzzleIndexByDifficulty = { easy: -1, medium: -1, hard: -1 };

  /* ── Helpers ─────────────────────────────────────────────────────────── */
  const $   = id => document.getElementById(id);
  const pad = n  => String(n).padStart(2,'0');
  const fmt = s  => `${pad(Math.floor(s/60))}:${pad(s%60)}`;

  function rowOf(idx) { return Math.floor(idx / BOARD_SIZE); }
  function colOf(idx) { return idx % BOARD_SIZE; }
  function boxOf(row, col) { return Math.floor(row / BOX_SIZE) * BOX_SIZE + Math.floor(col / BOX_SIZE); }
  function cellIndex(row, col) { return row * BOARD_SIZE + col; }

  function conflicts(idx) {
    const value = board[idx];
    if (!value) return false;
    return rowConflict(idx, value) || colConflict(idx, value) || boxConflict(idx, value);
  }

  function rowConflict(idx, value) {
    const row = rowOf(idx);
    const col = colOf(idx);
    return DIGITS.some(offset => {
      const checkCol = offset - 1;
      return checkCol !== col && board[cellIndex(row, checkCol)] === value;
    });
  }

  function colConflict(idx, value) {
    const row = rowOf(idx);
    const col = colOf(idx);
    return DIGITS.some(offset => {
      const checkRow = offset - 1;
      return checkRow !== row && board[cellIndex(checkRow, col)] === value;
    });
  }

  function boxConflict(idx, value) {
    const row = rowOf(idx);
    const col = colOf(idx);
    const startRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
    const startCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
    return boxIndexes(startRow, startCol).some(checkIdx => checkIdx !== idx && board[checkIdx] === value);
  }

  function boxIndexes(startRow, startCol) {
    const indexes = [];
    for (let dr = 0; dr < BOX_SIZE; dr++) {
      for (let dc = 0; dc < BOX_SIZE; dc++) {
        indexes.push(cellIndex(startRow + dr, startCol + dc));
      }
    }
    return indexes;
  }

  function isSolved() { return board.every((v,i) => v===solution[i]); }

  function choosePuzzle(difficulty) {
    const bank = PUZZLES[difficulty];
    let index = randomInt(bank.length);
    if (bank.length > 1 && index === lastPuzzleIndexByDifficulty[difficulty]) {
      index = (index + 1 + randomInt(bank.length - 1)) % bank.length;
    }
    lastPuzzleIndexByDifficulty[difficulty] = index;
    return bank[index];
  }

  /* ── Timer ───────────────────────────────────────────────────────────── */
  function startTimer() {
    clearInterval(timerID); timer = 0;
    timerID = setInterval(() => { timer++; renderTimer(); }, 1000);
  }
  function stopTimer()  { clearInterval(timerID); timerID = null; }
  function renderTimer(){ const el=$('sdk-timer'); if(el) el.textContent=fmt(timer); }

  /* ── New game ────────────────────────────────────────────────────────── */
  function newGame(d) {
    diff = d || diff;
    const [givens, sol] = choosePuzzle(diff);
    solution = sol.split('').map(Number);
    board    = givens.split('').map(Number);
    fixed    = board.map(v => v!==0);
    notes    = Array.from({length:CELL_COUNT}, () => new Set());
    sel = -1; errors = 0; pencilMode = false;
    startTimer();
    render();
  }

  /* ── Input ───────────────────────────────────────────────────────────── */
  function placeValue(n) {
    if (sel < 0 || fixed[sel]) return;

    if (pencilMode) {
      handlePencilInput(n);
    } else {
      handlePenInput(n);
    }

    render();
    if (!pencilMode && isSolved()) onWin();
  }

  function handlePencilInput(n) {
    if (!n) {
      notes[sel].clear();
      return;
    }
    if (board[sel]) return;
    toggleNote(sel, n);
  }

  function handlePenInput(n) {
    if (board[sel] === n) {
      board[sel] = 0;
      return;
    }

    board[sel] = n;
    notes[sel].clear();
    if (!n) return;

    clearPeerNotes(sel, n);
    if (!conflicts(sel) && board[sel] !== solution[sel]) errors++;
  }

  function toggleNote(idx, n) {
    if (notes[idx].has(n)) notes[idx].delete(n);
    else notes[idx].add(n);
  }

  function clearPeerNotes(idx,v) {
    clearRowAndColumnNotes(idx, v);
    clearBoxNotes(idx, v);
  }

  function clearRowAndColumnNotes(idx, value) {
    const row = rowOf(idx);
    const col = colOf(idx);
    for (let i = 0; i < BOARD_SIZE; i++) {
      notes[cellIndex(row, i)].delete(value);
      notes[cellIndex(i, col)].delete(value);
    }
  }

  function clearBoxNotes(idx, value) {
    const row = rowOf(idx);
    const col = colOf(idx);
    const startRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
    const startCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
    boxIndexes(startRow, startCol).forEach(cell => notes[cell].delete(value));
  }

  function onWin() {
    stopTimer();
    const info=$('sdk-info');
    if (info) info.textContent=`✓ Solved in ${fmt(timer)} — ${errors} error${errors!==1?'s':''}!`;
  }

  /* ── Mode toggle ─────────────────────────────────────────────────────── */
  function toggleMode() { pencilMode=!pencilMode; renderModeToggle(); }

  function renderModeToggle() {
    const btn=$('sdk-mode-btn'); if(!btn) return;
    if (pencilMode) {
      btn.textContent='✏ Pencil';
      btn.classList.add('sdk-mode-pencil'); btn.classList.remove('sdk-mode-pen');
    } else {
      btn.textContent='🖊 Pen';
      btn.classList.add('sdk-mode-pen'); btn.classList.remove('sdk-mode-pencil');
    }
  }

  /* ── Render ──────────────────────────────────────────────────────────── */
  function render() {
    const grid=$('sdk-grid'); if(!grid) return;
    grid.innerHTML='';
    renderCells(grid, selectedMeta());
    renderTimer();
    renderModeToggle();
    renderErrors();
  }

  function selectedMeta() {
    if (sel < 0) return { row: -1, col: -1, box: -1, value: 0 };
    const row = rowOf(sel);
    const col = colOf(sel);
    return { row, col, box: boxOf(row, col), value: board[sel] };
  }

  function renderCells(grid, selected) {
    for (let i = 0; i < CELL_COUNT; i++) {
      grid.appendChild(createCell(i, selected));
    }
  }

  function createCell(idx, selected) {
    const cell=document.createElement('div');
    cell.className='sdk-cell';
    applyCellClasses(cell, idx, selected);
    renderCellContent(cell, idx);
    wireCellEvents(cell, idx);
    return cell;
  }

  function applyCellClasses(cell, idx, selected) {
    const row = rowOf(idx);
    const col = colOf(idx);
    const box = boxOf(row, col);
    addGridBorderClasses(cell, row, col);
    addSelectionClasses(cell, idx, row, col, box, selected);
    addStateClasses(cell, idx, selected.value);
  }

  function addGridBorderClasses(cell, row, col) {
    if (col % BOX_SIZE === 0 && col !== 0) cell.classList.add('sdk-box-left');
    if (row % BOX_SIZE === 0 && row !== 0) cell.classList.add('sdk-box-top');
  }

  function addSelectionClasses(cell, idx, row, col, box, selected) {
    if (idx === sel) {
      cell.classList.add('sdk-sel');
      return;
    }
    if (selected.row >= 0 && isSelectedBand(row, col, box, selected)) cell.classList.add('sdk-band');
  }

  function addStateClasses(cell, idx, selectedValue) {
    if (selectedValue && board[idx] === selectedValue && !conflicts(idx)) cell.classList.add('sdk-same-num');
    if (fixed[idx]) cell.classList.add('sdk-fixed');
    if (conflicts(idx)) cell.classList.add('sdk-conflict');
  }

  function isSelectedBand(row, col, box, selected) {
    return row === selected.row || col === selected.col || box === selected.box;
  }

  function renderCellContent(cell, idx) {
    if (notes[idx].size > 0 && !board[idx]) {
      cell.classList.add('sdk-has-notes');
      cell.appendChild(createNotesGrid(idx));
      return;
    }
    cell.textContent=board[idx]||'';
  }

  function createNotesGrid(idx) {
    const noteGrid=document.createElement('div');
    noteGrid.className='sdk-notes';
    DIGITS.forEach(n => {
      const item=document.createElement('span');
      item.textContent=notes[idx].has(n)?n:'';
      noteGrid.appendChild(item);
    });
    return noteGrid;
  }

  function wireCellEvents(cell, idx) {
    cell.addEventListener('click', () => selectCell(idx));
    cell.addEventListener('contextmenu', event => toggleModeForCell(event, idx));
  }

  function selectCell(idx) {
    sel = idx;
    render();
  }

  function toggleModeForCell(event, idx) {
    event.preventDefault();
    sel = idx;
    pencilMode = !pencilMode;
    render();
  }

  function renderErrors() {
    const ec=$('sdk-err-count');
    if(ec) ec.textContent=`Errors: ${errors}`;
  }

  /* ── Build pane ──────────────────────────────────────────────────────── */
  function buildPane(c) {
    rootPane = c;
    c.innerHTML = paneHtml();
    wireDifficultyButtons(c);
    wireModeButton();
    wireNumberButtons(c);
  }

  function paneHtml() {
    return `
      <div class="sdk-topbar">
        <div class="sdk-diff-bar">
          <button class="sdk-diff-btn active" data-d="easy">Easy</button>
          <button class="sdk-diff-btn" data-d="medium">Med</button>
          <button class="sdk-diff-btn" data-d="hard">Hard</button>
        </div>
        <span id="sdk-timer" class="sdk-timer">00:00</span>
        <span id="sdk-err-count" class="sdk-err-count">Errors: 0</span>
      </div>
      <div id="sdk-info" class="sdk-info"></div>
      <div id="sdk-grid" class="sdk-grid"></div>
      <div class="sdk-controls-row">
        <button id="sdk-mode-btn" class="sdk-mode-btn sdk-mode-pen" title="Toggle pen/pencil mode (P)">🖊 Pen</button>
        <div class="sdk-numpad">
          ${DIGITS.map(numButtonHtml).join('')}
          <button class="sdk-num-btn sdk-clr-btn" data-n="0">✕</button>
        </div>
      </div>
      <div class="game-hint">Click cell · 1-9 to fill · P toggles Pencil/Pen · Right-click toggles Pencil/Pen</div>
    `;
  }

  function numButtonHtml(n) {
    return `<button class="sdk-num-btn" data-n="${n}">${n}</button>`;
  }

  function wireDifficultyButtons(c) {
    c.querySelectorAll('.sdk-diff-btn').forEach(button => {
      button.addEventListener('click', handleDifficultyClick);
    });
  }

  function handleDifficultyClick(event) {
    const button = event.currentTarget;
    setActiveDifficultyButton(button);
    newGame(button.dataset.d);
  }

  function setActiveDifficultyButton(activeButton) {
    if (!rootPane) return;
    rootPane.querySelectorAll('.sdk-diff-btn').forEach(button => button.classList.remove('active'));
    activeButton.classList.add('active');
  }

  function wireModeButton() {
    $('sdk-mode-btn').addEventListener('click', toggleMode);
  }

  function wireNumberButtons(c) {
    c.querySelectorAll('.sdk-num-btn').forEach(button => {
      button.addEventListener('click', handleNumberButtonClick);
    });
  }

  function handleNumberButtonClick(event) {
    placeValue(Number(event.currentTarget.dataset.n));
  }

  function handleModeKey(e) {
    if (e.key !== 'p' && e.key !== 'P') return false;
    e.preventDefault();
    toggleMode();
    return true;
  }

  function handleDigitKey(e) {
    if (e.key < '1' || e.key > '9') return false;
    e.preventDefault();
    placeValue(Number(e.key));
    return true;
  }

  function handleClearKey(e) {
    if (!['0','Delete','Backspace'].includes(e.key)) return false;
    e.preventDefault();
    placeValue(0);
    return true;
  }

  function handleArrowKey(e) {
    if (sel < 0 || ARROW_MOVES[e.key] === undefined) return false;
    e.preventDefault();
    moveSelection(ARROW_MOVES[e.key]);
    return true;
  }

  function moveSelection(offset) {
    const nextSel = sel + offset;
    if (nextSel < 0 || nextSel >= CELL_COUNT) return;
    sel = nextSel;
    render();
  }

  /* ── Public API — matches what popup.js expects ──────────────────────── */
  return {
    init(pane) { buildPane(pane); newGame('easy'); },
    onKey(e) {
      if (handleModeKey(e)) return;
      if (handleDigitKey(e)) return;
      if (handleClearKey(e)) return;
      handleArrowKey(e);
    },
  };

})();
