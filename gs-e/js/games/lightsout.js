// lightsout.js — Lights Out: toggle a light and its 4 neighbours to turn all off.
// Includes difficulty levels (3x3, 5x5, 7x7) and a guaranteed-solvable shuffle.

const GameLightsOut = (() => {

  function randomUnit() {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] / 0x100000000;
  }

  function randomInt(max) {
    return Math.floor(randomUnit() * max);
  }
  const STORAGE_KEY = 'game_lightsout';

  const SIZES = { easy:3, medium:5, hard:7 };
  let size=5, grid=[], moves=0, won=false, difficulty='medium';
  let container=null;

  function serialize() { return {grid,moves,won,size,difficulty}; }
  async function saveState() { Storage.saveLazy(STORAGE_KEY,serialize()); }
  async function loadState() {
    const s=await Storage.load(STORAGE_KEY);
    if (s?.grid) {
      grid=s.grid; moves=s.moves; won=s.won;
      size=s.size||5; difficulty=s.difficulty||'medium';
      return true;
    }
    return false;
  }

  function toggle(r,c) {
    // Toggle cell and all orthogonal neighbours
    const cells=[[r,c],[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
    for (const [nr,nc] of cells) {
      if (nr>=0&&nr<size&&nc>=0&&nc<size) grid[nr][nc]=1-grid[nr][nc];
    }
  }

  function makeBoard() {
    // Start from solved state and apply random valid moves (guarantees solvability)
    grid=Array.from({length:size},()=>new Array(size).fill(0));
    const presses=size*size*2;
    for (let i=0;i<presses;i++) {
      const r=randomInt(size);
      const c=randomInt(size);
      toggle(r,c);
    }
    // Make sure not already solved
    if (isSolvedGrid()) makeBoard();
    moves=0; won=false;
  }

  function click(r,c) {
    if (won) return;
    toggle(r,c); moves++;
    won=isSolvedGrid();
    saveState(); render();
  }

  function isSolvedGrid() {
    return grid.every(row => row.every(value => value === 0));
  }

  function winMessage() {
    return won ? '🎉 All lights out!' : '';
  }

  function cellSizeForBoard() {
    if (size === 3) return 72;
    if (size === 5) return 56;
    return 40;
  }

  function cellClass(row, col) {
    return grid[row][col] ? 'lo-cell lo-on' : 'lo-cell';
  }

  function render() {
    if (!container) return;
    container.querySelector('.lo-moves').textContent=`Moves: ${moves}`;
    container.querySelector('.lo-msg').textContent=winMessage();

    // Difficulty buttons
    container.querySelectorAll('.lo-diff-btn').forEach(b=>{
      b.classList.toggle('active',b.dataset.diff===difficulty);
    });

    const board=container.querySelector('.lo-board');
    board.innerHTML='';
    board.style.gridTemplateColumns=`repeat(${size},1fr)`;
    const cellSize=cellSizeForBoard();

    for (let r=0;r<size;r++) {
      for (let c=0;c<size;c++) {
        const cell=document.createElement('div');
        cell.className=cellClass(r,c);
        cell.style.width=cellSize+'px';
        cell.style.height=cellSize+'px';
        cell.addEventListener('click',()=>click(r,c));
        board.appendChild(cell);
      }
    }
  }

  async function init(el) {
    container=el;
    container.innerHTML=`
      <div class="lo-header">
        <div class="lo-diff-bar">
          <button class="lo-diff-btn" data-diff="easy">3×3</button>
          <button class="lo-diff-btn" data-diff="medium">5×5</button>
          <button class="lo-diff-btn" data-diff="hard">7×7</button>
        </div>
        <span class="lo-moves">Moves: 0</span>
      </div>
      <div class="lo-board"></div>
      <div class="lo-msg"></div>
      <button class="btn-reset" id="btn-reset-lo">New Puzzle</button>
      <div class="game-hint">Click a light to toggle it and its neighbours</div>
    `;

    container.querySelectorAll('.lo-diff-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        difficulty=btn.dataset.diff;
        size=SIZES[difficulty];
        Storage.remove(STORAGE_KEY);
        makeBoard(); render();
      });
    });

    container.querySelector('#btn-reset-lo').addEventListener('click',()=>{
      Storage.remove(STORAGE_KEY); makeBoard(); render();
    });

    const resumed=await loadState();
    if (!resumed) { size=SIZES[difficulty]; makeBoard(); }
    render();
  }

  function onKey() {}
  async function reset() { await Storage.remove(STORAGE_KEY); size=SIZES[difficulty]; makeBoard(); render(); }
  return {init,onKey,reset};
})();
