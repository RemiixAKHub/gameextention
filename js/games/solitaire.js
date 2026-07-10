// solitaire.js — Klondike Solitaire — fully rewritten, clean render
const GameSolitaire = (() => {

  function randomUnit() {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] / 0x100000000;
  }

  function randomInt(max) {
    return Math.floor(randomUnit() * max);
  }

  const STORAGE_KEY = 'game_solitaire';
  const SUITS = ['♠','♥','♦','♣'];
  const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

  let stock=[], waste=[], foundations=[[],[],[],[]], tableau=[[],[],[],[],[],[],[]];
  let selected=null; // {source:'waste'|'tableau', col, cardIdx}
  let moves=0, won=false, container=null;
  let history=null; // HistoryManager instance — created in init()
  let keyboardBound=false;

  function serialize() { return {stock,waste,foundations,tableau,moves,won}; }

  // ── Undo/Redo (command/snapshot pattern) ────────────────────────────────
  function snapshotState() {
    return structuredClone({stock,waste,foundations,tableau,moves,won});
  }

  function restoreState(snap) {
    stock=snap.stock;
    waste=snap.waste;
    foundations=snap.foundations;
    tableau=snap.tableau;
    moves=snap.moves;
    won=snap.won;
    selected=null;
  }

  function statesEqual(a,b) {
    return JSON.stringify(a)===JSON.stringify(b);
  }

  function commitMove(label, mutateFn) {
    const before=snapshotState();
    mutateFn();
    const after=snapshotState();
    if (!statesEqual(before,after)) history?.push(before,label);
  }

  function doUndo() {
    if (!history?.canUndo()) return;
    const current=snapshotState();
    const prev=history.undo(current);
    if (!prev) return;
    restoreState(prev);
    saveState();
    render();
  }

  function doRedo() {
    if (!history?.canRedo()) return;
    const current=snapshotState();
    const next=history.redo(current);
    if (!next) return;
    restoreState(next);
    saveState();
    render();
  }

  async function saveState() { Storage.saveLazy(STORAGE_KEY,serialize()); }

  async function loadState() {
    const s=await Storage.load(STORAGE_KEY);
    if (s?.tableau?.length===7) {
      stock=s.stock;
      waste=s.waste;
      foundations=s.foundations;
      tableau=s.tableau;
      moves=s.moves;
      won=s.won;
      return true;
    }
    return false;
  }

  function isRed(card) { return card.s==='♥'||card.s==='♦'; }
  function rankIdx(r)  { return RANKS.indexOf(r); }
  function topCard(pile) { return pile.at(-1); }

  function canFoundation(card,pile) {
    if (!pile.length) return card.r==='A';
    const top=topCard(pile);
    return card.s===top.s && rankIdx(card.r)===rankIdx(top.r)+1;
  }

  function canTableau(card,col) {
    const pile=tableau[col];
    if (!pile.length) return card.r==='K';
    const top=topCard(pile);
    return top.up && isRed(card)!==isRed(top) && rankIdx(card.r)===rankIdx(top.r)-1;
  }

  function startNew() {
    const deck=[];
    for (const s of SUITS) {
      for (const r of RANKS) deck.push({r,s,up:false});
    }
    for (let i=deck.length-1;i>0;i--) {
      const j=randomInt(i+1);
      [deck[i],deck[j]]=[deck[j],deck[i]];
    }
    tableau=Array.from({length:7},()=>[]);
    for (let col=0;col<7;col++) {
      for (let row=0;row<=col;row++) {
        const card=deck.pop();
        card.up=(row===col);
        tableau[col].push(card);
      }
    }
    stock=deck.map(c=>({...c,up:false}));
    waste=[];
    foundations=[[],[],[],[]];
    selected=null;
    moves=0;
    won=false;
    history?.clear();
  }

  function flipTops() {
    for (const col of tableau) {
      const card=topCard(col);
      if (card&&!card.up) card.up=true;
    }
  }

  function checkWin() { won=foundations.every(f=>f.length===13); }

  function getStack() {
    if (!selected) return [];
    if (selected.source==='waste') return [topCard(waste)];
    return tableau[selected.col].slice(selected.cardIdx);
  }

  function removeSelected() {
    if (!selected) return;
    if (selected.source==='waste') waste.pop();
    else tableau[selected.col].splice(selected.cardIdx);
  }

  function findFoundationIndex(card) {
    return foundations.findIndex(pile=>canFoundation(card,pile));
  }

  function finishMove() {
    selected=null;
    saveState();
    render();
  }

  function clickStock() {
    selected=null;
    commitMove('Draw / recycle stock', () => {
      if (!stock.length) {
        stock=[...waste].reverse().map(c=>({...c,up:false}));
        waste=[];
      } else {
        const c=stock.pop();
        c.up=true;
        waste.push(c);
      }
      moves++;
    });
    saveState();
    render();
  }

  function clickWaste() {
    if (won||!waste.length) return;
    if (selected?.source==='waste') {
      selected=null;
      render();
      return;
    }
    if (selected) {
      selected=null;
      render();
      return;
    }
    selected={source:'waste',col:-1,cardIdx:waste.length-1};
    render();
  }

  function moveWasteToFoundation() {
    const card=topCard(waste);
    const foundationIndex=findFoundationIndex(card);
    if (foundationIndex<0) return false;

    commitMove('Waste to foundation', () => {
      foundations[foundationIndex].push(waste.pop());
      moves++;
      flipTops();
      checkWin();
    });
    return true;
  }

  function dblClickWaste() {
    if (won||!waste.length) return;
    selected=null;
    if (moveWasteToFoundation()) {
      saveState();
      render();
    }
  }

  function moveSelectedToFoundation(f) {
    const stack=getStack();
    if (stack.length!==1||!canFoundation(stack[0],foundations[f])) return false;

    commitMove('Move to foundation', () => {
      removeSelected();
      foundations[f].push(stack[0]);
      moves++;
      flipTops();
      checkWin();
    });
    return true;
  }

  function clickFoundation(f) {
    if (won||!selected) return;
    moveSelectedToFoundation(f);
    finishMove();
  }

  function moveSelectedToEmptyColumn(col) {
    const stack=getStack();
    if (!stack.length||stack[0].r!=='K') return false;

    commitMove('Move King to empty column', () => {
      removeSelected();
      tableau[col].push(...stack);
      moves++;
      flipTops();
      checkWin();
    });
    return true;
  }

  function moveSelectedToTableau(col) {
    const stack=getStack();
    if (!stack.length||!canTableau(stack[0],col)) return false;

    commitMove('Tableau to tableau', () => {
      removeSelected();
      tableau[col].push(...stack);
      moves++;
      flipTops();
      checkWin();
    });
    return true;
  }

  function isSameTableauSelection(col,cardIdx) {
    return selected?.source==='tableau'&&selected.col===col&&selected.cardIdx===cardIdx;
  }

  function handleEmptyTableauClick(col) {
    if (selected) moveSelectedToEmptyColumn(col);
    finishMove();
  }

  function handleSelectedTableauClick(col,cardIdx) {
    if (isSameTableauSelection(col,cardIdx)) {
      selected=null;
      render();
      return true;
    }
    if (moveSelectedToTableau(col)) {
      finishMove();
      return true;
    }
    selected=null;
    return false;
  }

  function clickTableau(col,cardIdx) {
    if (won) return;
    const pile=tableau[col];
    const card=pile[cardIdx];

    if (cardIdx===undefined||card===undefined) {
      handleEmptyTableauClick(col);
      return;
    }

    if (!card.up) {
      selected=null;
      render();
      return;
    }

    if (selected&&handleSelectedTableauClick(col,cardIdx)) return;
    selected={source:'tableau',col,cardIdx};
    render();
  }

  function moveTableauTopToFoundation(col) {
    const pile=tableau[col];
    const card=topCard(pile);
    if (!card?.up) return false;

    const foundationIndex=findFoundationIndex(card);
    if (foundationIndex<0) return false;

    commitMove('Tableau to foundation', () => {
      foundations[foundationIndex].push(pile.pop());
      moves++;
      flipTops();
      checkWin();
    });
    return true;
  }

  function dblClickTableau(col,cardIdx) {
    if (won) return;
    const pile=tableau[col];
    if (cardIdx!==pile.length-1) return;
    selected=null;
    if (moveTableauTopToFoundation(col)) {
      saveState();
      render();
    }
  }

  function autoMoveWasteToFoundation() {
    if (!waste.length) return false;
    const card=topCard(waste);
    const foundationIndex=findFoundationIndex(card);
    if (foundationIndex<0) return false;

    foundations[foundationIndex].push(waste.pop());
    moves++;
    return true;
  }

  function autoMoveTableauToFoundation() {
    for (let col=0;col<7;col++) {
      const pile=tableau[col];
      const card=topCard(pile);
      if (!card?.up) continue;
      const foundationIndex=findFoundationIndex(card);
      if (foundationIndex<0) continue;
      foundations[foundationIndex].push(pile.pop());
      moves++;
      return true;
    }
    return false;
  }

  function autoFoundation() {
    commitMove('Auto play', () => {
      while (autoMoveWasteToFoundation()||autoMoveTableauToFoundation()) {
        // Keep moving foundation-safe cards until no more moves are available.
      }
      flipTops();
      checkWin();
    });
    finishMove();
  }

  // ── Render ───────────────────────────────────────────────────────────────
  function cardClass(card,selectedCard) {
    const classes=['sol-card'];
    if (isRed(card)) classes.push('sol-red');
    if (selectedCard) classes.push('sol-sel-card');
    return classes.join(' ');
  }

  function makeCardEl(card,selectedCard) {
    const el=document.createElement('div');
    el.className=cardClass(card,selectedCard);
    el.innerHTML=`<span class="sol-rank">${card.r}</span><span class="sol-suit">${card.s}</span>`;
    return el;
  }

  function makeBackEl() {
    const el=document.createElement('div');
    el.className='sol-card sol-back';
    return el;
  }

  function makeEmptyEl(label) {
    const el=document.createElement('div');
    el.className='sol-empty';
    if (label) {
      el.textContent=label;
    }
    return el;
  }

  function updateHeader() {
    container.querySelector('.sol-moves').textContent=`Moves: ${moves}`;
    const winEl=container.querySelector('.sol-win');
    if (winEl) winEl.style.display=won?'block':'none';

    const undoBtn=container.querySelector('#sol-undo');
    const redoBtn=container.querySelector('#sol-redo');
    if (undoBtn) undoBtn.disabled=!history?.canUndo();
    if (redoBtn) redoBtn.disabled=!history?.canRedo();
  }

  function renderStock() {
    const stockEl=container.querySelector('.sol-stock');
    if (!stockEl) return;
    stockEl.innerHTML='';
    const cardEl=stock.length?makeBackEl():makeEmptyEl('↺');
    if (!stock.length) cardEl.classList.add('sol-stock-empty');
    stockEl.appendChild(cardEl);
  }

  function renderWaste() {
    const wasteEl=container.querySelector('.sol-waste');
    if (!wasteEl) return;
    wasteEl.innerHTML='';
    if (!waste.length) {
      wasteEl.appendChild(makeEmptyEl());
      return;
    }

    const card=topCard(waste);
    wasteEl.appendChild(makeCardEl(card,selected?.source==='waste'));
  }

  function renderFoundations() {
    for (let f=0;f<4;f++) {
      const fEl=container.querySelector(`.sol-foundation[data-f="${f}"]`);
      if (!fEl) continue;
      fEl.innerHTML='';
      if (foundations[f].length) {
        fEl.appendChild(makeCardEl(topCard(foundations[f]),false));
        continue;
      }
      const hint=document.createElement('span');
      hint.className='sol-foundation-hint';
      hint.textContent=SUITS[f];
      fEl.appendChild(hint);
    }
  }

  function tableauOffset(card,isLast) {
    if (isLast) return 0;
    return card.up?20:14;
  }

  function makeTableauCardEl(card,col,idx,top,inStack) {
    const el=document.createElement('div');
    el.style.cssText=`position:absolute;top:${top}px;left:0;width:46px;z-index:${idx+1};`;
    if (card.up) {
      el.className=cardClass(card,inStack);
      el.innerHTML=`<span class="sol-rank">${card.r}</span><span class="sol-suit">${card.s}</span>`;
      el.addEventListener('click',(e)=>{e.stopPropagation();clickTableau(col,idx);});
      el.addEventListener('dblclick',(e)=>{e.stopPropagation();dblClickTableau(col,idx);});
      return el;
    }

    el.className='sol-card sol-back';
    el.addEventListener('click',(e)=>{e.stopPropagation();clickTableau(col,idx);});
    return el;
  }

  function renderEmptyColumn(colEl,col) {
    const emp=makeEmptyEl();
    emp.style.cssText='width:46px;height:66px;';
    emp.addEventListener('click',()=>clickTableau(col,undefined));
    colEl.style.height='66px';
    colEl.appendChild(emp);
  }

  function renderTableauColumn(col) {
    const colEl=container.querySelector(`.sol-col[data-col="${col}"]`);
    if (!colEl) return;
    colEl.innerHTML='';

    if (!tableau[col].length) {
      renderEmptyColumn(colEl,col);
      return;
    }

    const CARD_H=66;
    let top=0;
    tableau[col].forEach((card,idx)=>{
      const isLast=idx===tableau[col].length-1;
      const inStack=selected?.source==='tableau'&&selected.col===col&&idx>=selected.cardIdx;
      colEl.appendChild(makeTableauCardEl(card,col,idx,top,inStack));
      top+=tableauOffset(card,isLast);
    });
    colEl.style.height=(top+CARD_H)+'px';
  }

  function renderTableau() {
    for (let col=0;col<7;col++) renderTableauColumn(col);
  }

  function render() {
    if (!container) return;
    updateHeader();
    renderStock();
    renderWaste();
    renderFoundations();
    renderTableau();
  }

  function createFallbackHistory() {
    return {
      push(){},
      undo(){return null;},
      redo(){return null;},
      canUndo(){return false;},
      canRedo(){return false;},
      clear(){},
    };
  }

  function setupHistory() {
    if (history) return;
    try {
      history = HistoryManager.create({maxSize:200});
    } catch (e) {
      console.error('Solitaire: HistoryManager unavailable — undo/redo disabled. '+
        'Make sure <script src="js/history.js"> is included before solitaire.js.', e);
    }
    history ||= createFallbackHistory();
  }

  function setupKeyboardShortcuts() {
    if (keyboardBound) return;
    keyboardBound=true;
    document.addEventListener('keydown',(e)=>{
      if (!container?.classList.contains('active')) return;
      const z=e.key.toLowerCase()==='z';
      const y=e.key.toLowerCase()==='y';
      const modifier=e.ctrlKey||e.metaKey;
      if (modifier&&z&&!e.shiftKey) {
        e.preventDefault();
        doUndo();
      } else if (modifier&&(y||(z&&e.shiftKey))) {
        e.preventDefault();
        doRedo();
      }
    });
  }

  async function init(el) {
    container=el;
    container.innerHTML=`
      <div class="sol-topbar">
        <span class="sol-moves">Moves: 0</span>
        <div class="sol-topbar-actions">
          <button class="sol-history-btn" id="sol-undo" title="Undo (Ctrl+Z)">↩ Undo</button>
          <button class="sol-history-btn" id="sol-redo" title="Redo (Ctrl+Y)">↪ Redo</button>
          <button class="sol-auto-btn" id="sol-auto">Auto ♠</button>
        </div>
      </div>
      <div class="sol-top-row">
        <div class="sol-stock"></div>
        <div class="sol-waste"></div>
        <div class="sol-spacer"></div>
        <div class="sol-foundation" data-f="0"></div>
        <div class="sol-foundation" data-f="1"></div>
        <div class="sol-foundation" data-f="2"></div>
        <div class="sol-foundation" data-f="3"></div>
      </div>
      <div class="sol-tableau-area">
        <div class="sol-col" data-col="0"></div>
        <div class="sol-col" data-col="1"></div>
        <div class="sol-col" data-col="2"></div>
        <div class="sol-col" data-col="3"></div>
        <div class="sol-col" data-col="4"></div>
        <div class="sol-col" data-col="5"></div>
        <div class="sol-col" data-col="6"></div>
      </div>
      <div class="sol-win" style="display:none">🎉 You Win! 🎉</div>
      <div class="sol-footer">
        <button class="btn-reset" id="btn-reset-sol">New Game</button>
        <div class="game-hint">Click to select · Click destination to move · Double-click → foundation · Ctrl+Z to undo</div>
      </div>
    `;

    container.querySelector('.sol-stock').addEventListener('click',clickStock);
    const w=container.querySelector('.sol-waste');
    w.addEventListener('click',clickWaste);
    w.addEventListener('dblclick',dblClickWaste);
    for (let f=0;f<4;f++) {
      container.querySelector(`.sol-foundation[data-f="${f}"]`).addEventListener('click',()=>clickFoundation(f));
    }
    container.querySelector('#sol-auto').addEventListener('click',autoFoundation);
    container.querySelector('#btn-reset-sol').addEventListener('click',reset);
    container.querySelector('#sol-undo').addEventListener('click',doUndo);
    container.querySelector('#sol-redo').addEventListener('click',doRedo);

    setupHistory();
    setupKeyboardShortcuts();

    const resumed=await loadState();
    if (!resumed) startNew();
    render();
  }

  async function reset() {
    await Storage.remove(STORAGE_KEY);
    startNew();
    render();
  }

  function onKey() {}

  return {init,onKey,reset};
})();
