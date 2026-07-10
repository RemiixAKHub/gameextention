// puzzle15.js — 15 Sliding Tile Puzzle (4x4)
// KEY FIX: ALL tiles are slidable when adjacent to blank — p15-correct no longer
// overrides p15-slidable. Green tint is cosmetic only, never blocks interaction.

const GamePuzzle15 = (() => {

  function randomUnit() {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] / 0x100000000;
  }

  function randomInt(max) {
    return Math.floor(randomUnit() * max);
  }
  const STORAGE_KEY='game_puzzle15';
  const N=4;
  let tiles=[], blank=15, moves=0, won=false, container=null;

  function serialize() { return {tiles,blank,moves,won}; }
  async function saveState() { Storage.saveLazy(STORAGE_KEY,serialize()); }
  async function loadState() {
    const s=await Storage.load(STORAGE_KEY);
    if (s?.tiles) { tiles=s.tiles; blank=s.blank; moves=s.moves; won=s.won; return true; }
    return false;
  }

  function isSolvable(arr) {
    let inv=0;
    for (let i=0;i<arr.length;i++)
      for (let j=i+1;j<arr.length;j++)
        if (arr[i]&&arr[j]&&arr[i]>arr[j]) inv++;
    const blankFromBottom=N-Math.floor(arr.indexOf(0)/N);
    if (N%2===1) return inv%2===0;
    return blankFromBottom%2===0 ? inv%2===1 : inv%2===0;
  }

  function isSolved() {
    for (let i=0;i<N*N-1;i++) if (tiles[i]!==i+1) return false;
    return tiles[N*N-1]===0;
  }

  function shuffle() {
    do {
      // tiles[0..14] = 1..15, tiles[15] = 0 before shuffle
      // remap: position i holds value i+1, blank at end
      tiles=new Array(N*N).fill(0).map((_,i)=>i+1); tiles[N*N-1]=0;
      for (let i=tiles.length-1;i>0;i--) {
        const j=randomInt(i+1);
        [tiles[i],tiles[j]]=[tiles[j],tiles[i]];
      }
    } while (!isSolvable(tiles)||isSolved());
    blank=tiles.indexOf(0);
    moves=0; won=false;
  }

  function canSlide(idx) {
    const br=Math.floor(blank/N), bc=blank%N;
    const tr=Math.floor(idx/N),   tc=idx%N;
    return Math.abs(br-tr)+Math.abs(bc-tc)===1;
  }

  function slide(idx) {
    if (!canSlide(idx)||won) return;
    tiles[blank]=tiles[idx];
    tiles[idx]=0;
    blank=idx;
    moves++;
    won=isSolved();
    saveState(); render();
  }

  function slideDir(dr,dc) {
    const br=Math.floor(blank/N), bc=blank%N;
    const tr=br-dr, tc=bc-dc;
    if (tr<0||tr>=N||tc<0||tc>=N) return;
    slide(tr*N+tc);
  }

  function render() {
    if (!container) return;
    container.querySelector('.p15-moves').textContent=`Moves: ${moves}`;
    container.querySelector('.p15-msg').textContent=won?'🎉 Solved!':'';

    const board=container.querySelector('.p15-board');
    board.innerHTML='';
    for (let i=0;i<N*N;i++) {
      const v=tiles[i];
      const cell=document.createElement('div');

      if (v===0) {
        cell.className='p15-blank';
      } else {
        const slidable=canSlide(i);
        const correct=(v===i+1); // tile is in its solved position

        // IMPORTANT: slidable always wins — correct tiles can still be moved
        // We show both classes but slidable styling takes priority via CSS order
        cell.className='p15-tile';
        if (correct)  cell.classList.add('p15-correct');
        if (slidable) cell.classList.add('p15-slidable'); // added LAST so it wins
        cell.textContent=v;
        cell.addEventListener('click',()=>slide(i));
      }
      board.appendChild(cell);
    }
  }

  async function init(el) {
    container=el;
    container.innerHTML=`
      <div class="p15-header">
        <span class="p15-moves">Moves: 0</span>
        <span class="p15-msg"></span>
      </div>
      <div class="p15-board"></div>
      <button class="btn-reset" id="btn-reset-p15">Shuffle</button>
      <div class="game-hint">Click tile next to gap to slide it · Arrow keys move the gap</div>
    `;
    container.querySelector('#btn-reset-p15').addEventListener('click',()=>{
      Storage.remove(STORAGE_KEY); shuffle(); render();
    });
    const resumed=await loadState();
    if (!resumed) shuffle();
    render();
  }

  function onKey(e) {
    if (e.key==='ArrowUp')    { e.preventDefault(); slideDir(-1,0); }
    if (e.key==='ArrowDown')  { e.preventDefault(); slideDir(1,0); }
    if (e.key==='ArrowLeft')  { e.preventDefault(); slideDir(0,-1); }
    if (e.key==='ArrowRight') { e.preventDefault(); slideDir(0,1); }
  }

  async function reset() { await Storage.remove(STORAGE_KEY); shuffle(); render(); }
  return {init,onKey,reset};
})();
