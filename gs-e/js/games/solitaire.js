// solitaire.js — Klondike Solitaire — fully rewritten, clean render
const GameSolitaire = (() => {
  const STORAGE_KEY = 'game_solitaire';
  const SUITS = ['♠','♥','♦','♣'];
  const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

  let stock=[], waste=[], foundations=[[],[],[],[]], tableau=[[],[],[],[],[],[],[]];
  let selected=null; // {source:'waste'|'tableau'|'foundation', col, cardIdx}
  let hint=null; // {source,target,text} — visual suggestion only, never auto-moves cards
  let hintEnabled=false; // ON/OFF assist toggle; when ON, refreshes after each move
  let moves=0, won=false, container=null;
  let history=null; // HistoryManager instance — created in init()

  function serialize() { return {stock,waste,foundations,tableau,moves,won}; }

  // ── Undo/Redo (command/snapshot pattern) ────────────────────────────────
  // A snapshot captures every field that defines the game's visible state.
  // Because the full state is tiny (52 cards), snapshotting before each
  // discrete player action is cheap and removes the need for per-move-type
  // "reverse" logic (which is where undo bugs usually hide — e.g. forgetting
  // to re-hide a flipped card, or mis-restoring stock/waste on a recycle).
  function snapshotState() {
    return JSON.parse(JSON.stringify({stock,waste,foundations,tableau,moves,won}));
  }
  function restoreState(snap) {
    stock=snap.stock; waste=snap.waste; foundations=snap.foundations;
    tableau=snap.tableau; moves=snap.moves; won=snap.won;
    selected=null;
  }
  function createLocalHistory(maxSize=200) {
    let undoStack=[];
    let redoStack=[];
    return {
      push(beforeSnapshot,label) {
        undoStack.push({snapshot:beforeSnapshot,label,timestamp:Date.now()});
        if (undoStack.length>maxSize) undoStack.shift();
        redoStack=[];
      },
      undo(currentSnapshot) {
        if (!undoStack.length) return null;
        const entry=undoStack.pop();
        redoStack.push({snapshot:currentSnapshot,label:entry.label,timestamp:Date.now()});
        return entry.snapshot;
      },
      redo(currentSnapshot) {
        if (!redoStack.length) return null;
        const entry=redoStack.pop();
        undoStack.push({snapshot:currentSnapshot,label:entry.label,timestamp:Date.now()});
        return entry.snapshot;
      },
      canUndo() { return undoStack.length>0; },
      canRedo() { return redoStack.length>0; },
      clear() { undoStack=[]; redoStack=[]; },
      size() { return {undo:undoStack.length,redo:redoStack.length}; }
    };
  }
  // Wrap a mutating action: snapshot before, run it, then push to history
  // ONLY if the state actually changed (keeps no-op clicks, e.g. an Auto
  // press that finds nothing to do, out of the undo stack).
  function commitMove(label, mutateFn) {
    const before=snapshotState();
    mutateFn();
    const after=snapshotState();
    const changed=JSON.stringify(before)!==JSON.stringify(after);
    if (changed&&history&&typeof history.push==='function') history.push(before,label);
    refreshHint();
  }
  function doUndo() {
    if (!history||!history.canUndo()) return;
    const current=snapshotState();
    const prev=history.undo(current);
    if (prev) { restoreState(prev); refreshHint(); saveState(); render(); }
  }
  function doRedo() {
    if (!history||!history.canRedo()) return;
    const current=snapshotState();
    const next=history.redo(current);
    if (next) { restoreState(next); refreshHint(); saveState(); render(); }
  }
  async function saveState() { Storage.saveLazy(STORAGE_KEY,serialize()); }
  async function loadState() {
    const s=await Storage.load(STORAGE_KEY);
    if (s&&s.tableau&&s.tableau.length===7) {
      stock=s.stock; waste=s.waste; foundations=s.foundations;
      tableau=s.tableau; moves=s.moves; won=s.won; return true;
    }
    return false;
  }

  function isRed(card) { return card.s==='♥'||card.s==='♦'; }
  function rankIdx(r)  { return RANKS.indexOf(r); }

  function canFoundation(card,pile) {
    if (!pile.length) return card.r==='A';
    const top=pile[pile.length-1];
    return card.s===top.s && rankIdx(card.r)===rankIdx(top.r)+1;
  }
  function canTableau(card,col) {
    const pile=tableau[col];
    if (!pile.length) return card.r==='K';
    const top=pile[pile.length-1];
    return top.up && isRed(card)!==isRed(top) && rankIdx(card.r)===rankIdx(top.r)-1;
  }

  function startNew() {
    const deck=[];
    for (const s of SUITS) for (const r of RANKS) deck.push({r,s,up:false});
    for (let i=deck.length-1;i>0;i--) {
      const j=Math.floor(Math.random()*(i+1));
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
    waste=[]; foundations=[[],[],[],[]];
    selected=null; moves=0; won=false;
    if (history) history.clear();
    refreshHint();
  }

  function flipTops() {
    for (const col of tableau)
      if (col.length&&!col[col.length-1].up) col[col.length-1].up=true;
  }
  function foundationCount() { return foundations.reduce((total,pile)=>total+pile.length,0); }
  function checkWin() { won=foundations.every(f=>f.length===13); }
  function refreshHint() { hint=hintEnabled ? findHint() : null; }
  function clearHint() { hint=null; }
  function cardLabel(card) { return card ? `${card.r}${card.s}` : ''; }
  function stackLabel(stack) {
    if (!stack.length) return 'card';
    return stack.length===1 ? cardLabel(stack[0]) : `${cardLabel(stack[0])} stack`;
  }
  function columnLabel(col) { return `column ${col+1}`; }

  function isHintSource(type,col,idx) {
    if (!hint||!hint.source||hint.source.type!==type) return false;
    if (type==='stock') return true;
    if (hint.source.col!==col) return false;
    if (type==='tableau') return idx>=hint.source.idx;
    return true;
  }
  function isHintTarget(type,col,idx) {
    if (!hint||!hint.target||hint.target.type!==type) return false;
    if (hint.target.col!==col) return false;
    if (type==='tableau') return idx===undefined||idx===tableau[col].length-1;
    return true;
  }

  function findHint() {
    let simpleTableauMove=null;

    // Best hints first: move a tableau stack that reveals a face-down card.
    for (let from=0;from<7;from++) {
      for (let idx=0;idx<tableau[from].length;idx++) {
        const stack=tableau[from].slice(idx);
        if (!stack.length||!stack[0].up) continue;
        for (let to=0;to<7;to++) {
          if (to===from) continue;
          if (!canTableau(stack[0],to)) continue;
          const candidate={
            source:{type:'tableau',col:from,idx},
            target:{type:'tableau',col:to},
            text:`Move ${stackLabel(stack)} from ${columnLabel(from)} to ${columnLabel(to)}`
          };
          if (idx>0&&!tableau[from][idx-1].up) return candidate;
          if (!simpleTableauMove) simpleTableauMove=candidate;
        }
      }
    }

    // Waste to tableau keeps the game moving without burning Auto.
    if (waste.length) {
      const c=waste[waste.length-1];
      for (let to=0;to<7;to++) {
        if (canTableau(c,to)) {
          return {
            source:{type:'waste',col:-1,idx:waste.length-1},
            target:{type:'tableau',col:to},
            text:`Move ${cardLabel(c)} from waste to ${columnLabel(to)}`
          };
        }
      }
    }

    // Foundation back down is a rescue hint when a top-row card is needed.
    for (let f=0;f<4;f++) {
      if (!foundations[f].length) continue;
      const c=foundations[f][foundations[f].length-1];
      for (let to=0;to<7;to++) {
        if (canTableau(c,to)) {
          return {
            source:{type:'foundation',col:f,idx:foundations[f].length-1},
            target:{type:'tableau',col:to},
            text:`Move ${cardLabel(c)} from foundation back to ${columnLabel(to)}`
          };
        }
      }
    }

    // Foundation moves are safe, but lower priority than board-freeing moves.
    if (waste.length) {
      const c=waste[waste.length-1];
      for (let f=0;f<4;f++) {
        if (canFoundation(c,foundations[f])) {
          return {
            source:{type:'waste',col:-1,idx:waste.length-1},
            target:{type:'foundation',col:f},
            text:`Move ${cardLabel(c)} from waste to foundation`
          };
        }
      }
    }
    for (let from=0;from<7;from++) {
      if (!tableau[from].length) continue;
      const idx=tableau[from].length-1;
      const c=tableau[from][idx];
      if (!c.up) continue;
      for (let f=0;f<4;f++) {
        if (canFoundation(c,foundations[f])) {
          return {
            source:{type:'tableau',col:from,idx},
            target:{type:'foundation',col:f},
            text:`Move ${cardLabel(c)} from ${columnLabel(from)} to foundation`
          };
        }
      }
    }

    if (simpleTableauMove) return simpleTableauMove;

    if (stock.length) return {source:{type:'stock'},target:null,text:'Draw from stock to reveal another playable card'};
    if (waste.length) return {source:{type:'stock'},target:null,text:'Recycle the waste pile to continue scanning the deck'};
    return {source:null,target:null,text:'No obvious legal move found. You may need to undo or start a new deal.'};
  }

  function toggleHint() {
    hintEnabled=!hintEnabled;
    refreshHint();
    render();
  }

  function getStack() {
    if (!selected) return [];
    if (selected.source==='waste') return [waste[waste.length-1]];
    if (selected.source==='foundation') return [foundations[selected.col][foundations[selected.col].length-1]];
    return tableau[selected.col].slice(selected.cardIdx);
  }
  function removeSelected() {
    if (!selected) return;
    if (selected.source==='waste') waste.pop();
    else if (selected.source==='foundation') foundations[selected.col].pop();
    else tableau[selected.col].splice(selected.cardIdx);
  }

  function findFoundationDestination(card) {
    for (let f=0;f<4;f++) if (canFoundation(card,foundations[f])) return f;
    return -1;
  }
  function findTableauDestination(stack,excludeCol=-1) {
    if (!stack.length) return -1;
    for (let col=0;col<7;col++) {
      if (col===excludeCol) continue;
      if (canTableau(stack[0],col)) return col;
    }
    return -1;
  }
  function autoPlaceWaste() {
    if (won||!waste.length) return false;
    selected=null;
    const card=waste[waste.length-1];
    const foundationDest=findFoundationDestination(card);
    if (foundationDest!==-1) {
      commitMove('Waste auto-place to foundation', () => {
        foundations[foundationDest].push(waste.pop()); moves++;
        flipTops(); checkWin();
      });
      saveState(); render(); return true;
    }
    const tableauDest=findTableauDestination([card]);
    if (tableauDest!==-1) {
      commitMove('Waste auto-place to tableau', () => {
        tableau[tableauDest].push(waste.pop()); moves++;
        flipTops(); checkWin();
      });
      saveState(); render(); return true;
    }
    refreshHint(); render(); return false;
  }
  function autoPlaceFoundation(f) {
    if (won||!foundations[f].length) return false;
    selected=null;
    const card=foundations[f][foundations[f].length-1];
    const tableauDest=findTableauDestination([card]);
    if (tableauDest!==-1) {
      commitMove('Foundation auto-place to tableau', () => {
        tableau[tableauDest].push(foundations[f].pop()); moves++;
        flipTops(); checkWin();
      });
      saveState(); render(); return true;
    }
    refreshHint(); render(); return false;
  }
  function autoPlaceTableau(col,cardIdx) {
    if (won) return false;
    const pile=tableau[col];
    if (!pile||!pile.length||cardIdx<0||cardIdx>=pile.length) return false;
    const card=pile[cardIdx];
    if (!card||!card.up) return false;
    selected=null;

    // Top cards keep the classic Solitaire double-click behaviour: try a
    // foundation first, then fall back to a legal tableau move if one exists.
    if (cardIdx===pile.length-1) {
      const foundationDest=findFoundationDestination(card);
      if (foundationDest!==-1) {
        commitMove('Tableau auto-place to foundation', () => {
          foundations[foundationDest].push(tableau[col].pop()); moves++;
          flipTops(); checkWin();
        });
        saveState(); render(); return true;
      }
    }

    const stack=pile.slice(cardIdx);
    const tableauDest=findTableauDestination(stack,col);
    if (tableauDest!==-1) {
      commitMove('Tableau auto-place stack', () => {
        tableau[col].splice(cardIdx);
        tableau[tableauDest].push(...stack); moves++;
        flipTops(); checkWin();
      });
      saveState(); render(); return true;
    }
    refreshHint(); render(); return false;
  }

  function clickStock() {
    selected=null;
    commitMove('Draw / recycle stock', () => {
      if (!stock.length) { stock=[...waste].reverse().map(c=>({...c,up:false})); waste=[]; }
      else { const c=stock.pop(); c.up=true; waste.push(c); }
      moves++;
    });
    saveState(); render();
  }

  function clickWaste() {
    if (won||!waste.length) return;
    if (selected&&selected.source==='waste') { selected=null; render(); return; }
    if (selected) { selected=null; render(); return; }
    selected={source:'waste',col:-1,cardIdx:waste.length-1};
    render();
  }
  function dblClickWaste() {
    autoPlaceWaste();
  }

  function clickFoundation(f) {
    if (won) return;

    // No active selection: allow the top foundation card to be selected so it
    // can be moved back down to the tableau when that is the only way forward.
    if (!selected) {
      if (foundations[f].length) selected={source:'foundation',col:f,cardIdx:foundations[f].length-1};
      render();
      return;
    }

    if (selected.source==='foundation'&&selected.col===f) {
      selected=null;
      render();
      return;
    }

    const stack=getStack();
    if (stack.length===1&&selected.source!=='foundation'&&canFoundation(stack[0],foundations[f])) {
      commitMove('Move to foundation', () => {
        removeSelected(); foundations[f].push(stack[0]); moves++;
        flipTops(); checkWin();
      });
    }
    selected=null; saveState(); render();
  }

  function clickTableau(col,cardIdx) {
    if (won) return;
    const pile=tableau[col];

    // Empty column
    if (cardIdx===undefined||pile[cardIdx]===undefined) {
      if (selected) {
        const stack=getStack();
        if (stack.length&&stack[0].r==='K') {
          commitMove('Move King to empty column', () => {
            removeSelected(); tableau[col].push(...stack); moves++;
            flipTops(); checkWin();
          });
        }
        selected=null;
      }
      saveState(); render(); return;
    }

    const card=pile[cardIdx];
    if (!card.up) { selected=null; render(); return; }

    if (selected) {
      // Deselect same card
      if (selected.source==='tableau'&&selected.col===col&&selected.cardIdx===cardIdx) {
        selected=null; render(); return;
      }
      const stack=getStack();
      if (stack.length&&canTableau(stack[0],col)) {
        commitMove('Tableau to tableau', () => {
          removeSelected(); tableau[col].push(...stack); moves++;
          flipTops(); checkWin();
        });
        selected=null;
        saveState(); render(); return;
      }
      selected=null;
    }
    selected={source:'tableau',col,cardIdx};
    render();
  }

  function dblClickTableau(col,cardIdx) {
    autoPlaceTableau(col,cardIdx);
  }

  function moveVisibleCardsToFoundation() {
    let moved=false;

    if (waste.length) {
      const c=waste[waste.length-1];
      for (let f=0;f<4;f++) {
        if (canFoundation(c,foundations[f])) {
          foundations[f].push(waste.pop());
          moves++;
          moved=true;
          break;
        }
      }
    }

    for (let col=0;col<7;col++) {
      if (!tableau[col].length) continue;
      const c=tableau[col][tableau[col].length-1];
      if (!c.up) continue;
      for (let f=0;f<4;f++) {
        if (canFoundation(c,foundations[f])) {
          foundations[f].push(tableau[col].pop());
          moves++;
          moved=true;
          break;
        }
      }
    }

    if (moved) {
      flipTops();
      checkWin();
    }
    return moved;
  }

  function drawOrRecycleForAuto() {
    if (!stock.length&&waste.length) {
      stock=[...waste].reverse().map(c=>({...c,up:false}));
      waste=[];
      moves++;
      return true;
    }
    if (stock.length) {
      const c=stock.pop();
      c.up=true;
      waste.push(c);
      moves++;
      return true;
    }
    return false;
  }

  function autoFoundation() {
    selected=null;
    clearHint();
    commitMove('Auto play', () => {
      // Light Auto: only move cards that are already visible on the board/waste.
      // It does not draw through stock and should feel like a tidy-up helper.
      while (moveVisibleCardsToFoundation()) {}
    });
    saveState(); render();
  }

  function smartAutoFoundation() {
    selected=null;
    clearHint();
    commitMove('Smart auto play', () => {
      const autoStart=snapshotState();
      const startFoundationCount=foundationCount();

      // First clear everything already visible.
      while (moveVisibleCardsToFoundation()) {}

      // Then search through the stock/waste for foundation moves. This lets
      // Smart Auto rescue games where the next useful A/2/3 is buried in the
      // draw pile. A full stock/waste cycle with no foundation move stops.
      let drawsSinceProgress=0;
      let maxDrawsWithoutProgress=stock.length+waste.length+1;
      let guard=0;
      while (!won&&guard<260&&maxDrawsWithoutProgress>0&&drawsSinceProgress<maxDrawsWithoutProgress) {
        guard++;
        if (!drawOrRecycleForAuto()) break;
        drawsSinceProgress++;
        let progressed=false;
        while (moveVisibleCardsToFoundation()) progressed=true;
        if (progressed) {
          drawsSinceProgress=0;
          maxDrawsWithoutProgress=stock.length+waste.length+1;
        }
      }

      // If Smart Auto found no foundation move, leave the game exactly as it was.
      // It should not act like a hidden stock-cycle button.
      if (foundationCount()===startFoundationCount) restoreState(autoStart);
      else { flipTops(); checkWin(); }
    });
    saveState(); render();
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function makeCardEl(card,sel) {
    const el=document.createElement('div');
    el.className='sol-card'+(isRed(card)?' sol-red':'')+(sel?' sol-sel-card':'');
    el.innerHTML=`<span class="sol-rank">${card.r}</span><span class="sol-suit">${card.s}</span>`;
    return el;
  }
  function makeBackEl() {
    const el=document.createElement('div'); el.className='sol-card sol-back'; return el;
  }
  function makeEmptyEl(label) {
    const el=document.createElement('div'); el.className='sol-empty';
    if (label) el.textContent=label; return el;
  }

  function render() {
    if (!container) return;
    container.querySelector('.sol-moves').textContent=`Moves: ${moves}`;
    const winEl=container.querySelector('.sol-win');
    if (winEl) winEl.style.display=won?'block':'none';

    const undoBtn=container.querySelector('#sol-undo');
    const redoBtn=container.querySelector('#sol-redo');
    if (undoBtn) undoBtn.disabled=!history||!history.canUndo();
    if (redoBtn) redoBtn.disabled=!history||!history.canRedo();

    const hintBtn=container.querySelector('#sol-hint');
    if (hintBtn) {
      hintBtn.textContent=hintEnabled?'Hint ON':'Hint OFF';
      hintBtn.classList.toggle('active',hintEnabled);
    }
    const hintMsg=container.querySelector('.sol-hint-msg');
    if (hintMsg) {
      hintMsg.textContent=hint?`Hint: ${hint.text}`:'';
      hintMsg.style.display=hint?'block':'none';
    }

    // Stock
    const stockEl=container.querySelector('.sol-stock');
    if (stockEl) {
      stockEl.innerHTML='';
      const c=stock.length?makeBackEl():makeEmptyEl('↺');
      if (!stock.length) c.classList.add('sol-stock-empty');
      if (isHintSource('stock',-1,-1)) c.classList.add('sol-sel-card');
      stockEl.appendChild(c);
    }

    // Waste
    const wasteEl=container.querySelector('.sol-waste');
    if (wasteEl) {
      wasteEl.innerHTML='';
      if (waste.length) {
        const card=waste[waste.length-1];
        const sel=selected&&selected.source==='waste';
        const hinted=isHintSource('waste',-1,waste.length-1);
        wasteEl.appendChild(makeCardEl(card,sel||hinted));
      } else {
        wasteEl.appendChild(makeEmptyEl());
      }
    }

    // Foundations
    for (let f=0;f<4;f++) {
      const fEl=container.querySelector(`.sol-foundation[data-f="${f}"]`);
      if (!fEl) continue;
      fEl.innerHTML='';
      if (foundations[f].length) {
        const top=foundations[f][foundations[f].length-1];
        const sel=selected&&selected.source==='foundation'&&selected.col===f;
        const hinted=isHintSource('foundation',f,foundations[f].length-1)||isHintTarget('foundation',f,foundations[f].length-1);
        fEl.appendChild(makeCardEl(top,sel||hinted));
      } else {
        const hint=document.createElement('span');
        hint.className='sol-foundation-hint'; hint.textContent=SUITS[f];
        if (isHintTarget('foundation',f,undefined)) hint.classList.add('sol-sel-card');
        fEl.appendChild(hint);
      }
    }

    // Tableau columns — use a relative container with absolutely-positioned cards
    for (let col=0;col<7;col++) {
      const colEl=container.querySelector(`.sol-col[data-col="${col}"]`);
      if (!colEl) continue;
      colEl.innerHTML='';

      if (!tableau[col].length) {
        const emp=makeEmptyEl();
        emp.style.cssText='width:46px;height:66px;';
        if (isHintTarget('tableau',col,undefined)) emp.classList.add('sol-sel-card');
        emp.addEventListener('click',()=>clickTableau(col,undefined));
        colEl.style.height='66px';
        colEl.appendChild(emp); continue;
      }

      // Each face-down card = 14px peek, face-up = 20px peek, last card full height 66px
      const BACK_H=14, FACE_H=20, CARD_H=66;
      let top=0;
      tableau[col].forEach((card,idx)=>{
        const isLast=(idx===tableau[col].length-1);
        const inStack=selected&&selected.source==='tableau'&&selected.col===col&&idx>=selected.cardIdx;
        const hinted=isHintSource('tableau',col,idx)||isHintTarget('tableau',col,idx);
        const el=document.createElement('div');
        el.style.cssText=`position:absolute;top:${top}px;left:0;width:46px;z-index:${idx+1};`;

        if (card.up) {
          el.className='sol-card'+(isRed(card)?' sol-red':'')+((inStack||hinted)?' sol-sel-card':'');
          el.innerHTML=`<span class="sol-rank">${card.r}</span><span class="sol-suit">${card.s}</span>`;
          el.addEventListener('click',(e)=>{e.stopPropagation();clickTableau(col,idx);});
          el.addEventListener('dblclick',(e)=>{e.stopPropagation();dblClickTableau(col,idx);});
        } else {
          el.className='sol-card sol-back';
          el.addEventListener('click',(e)=>{e.stopPropagation();clickTableau(col,idx);});
        }
        colEl.appendChild(el);
        top+=isLast?0:(card.up?FACE_H:BACK_H);
      });
      colEl.style.height=(top+CARD_H)+'px';
    }
  }

  async function init(el) {
    container=el;
    container.innerHTML=`
      <div class="sol-topbar">
        <span class="sol-moves">Moves: 0</span>
        <div class="sol-topbar-actions">
          <button class="sol-auto-btn" id="sol-undo" title="Undo (Ctrl+Z)">↩ Undo</button>
          <button class="sol-auto-btn" id="sol-redo" title="Redo (Ctrl+Y)">↪ Redo</button>
          <button class="sol-auto-btn" id="sol-auto" title="Auto: move visible playable cards to foundations only">Auto ♠</button>
          <button class="sol-auto-btn" id="sol-smart-auto" title="Smart Auto: scan stock and move playable cards to foundations">Smart Auto</button>
          <button class="sol-auto-btn" id="sol-hint" title="Toggle suggested-move highlighting on or off">Hint OFF</button>
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
        <div class="sol-hint-msg" style="display:none;color:var(--yellow);font-size:10px;text-align:center;max-width:390px;line-height:1.3;"></div>
        <div class="game-hint">Auto = visible moves · Smart Auto = scans stock · Hint toggle = highlights next move · Double-click = auto-place</div>
      </div>
    `;

    container.querySelector('.sol-stock').addEventListener('click',clickStock);
    const w=container.querySelector('.sol-waste');
    w.addEventListener('click',clickWaste);
    w.addEventListener('dblclick',dblClickWaste);
    for (let f=0;f<4;f++) {
      const foundationEl=container.querySelector(`.sol-foundation[data-f="${f}"]`);
      foundationEl.addEventListener('click',()=>clickFoundation(f));
      foundationEl.addEventListener('dblclick',(e)=>{e.stopPropagation();autoPlaceFoundation(f);});
    }
    container.querySelector('#sol-auto').addEventListener('click',autoFoundation);
    container.querySelector('#sol-smart-auto').addEventListener('click',smartAutoFoundation);
    container.querySelector('#sol-hint').addEventListener('click',toggleHint);
    container.querySelector('#btn-reset-sol').addEventListener('click',reset);
    container.querySelector('#sol-undo').addEventListener('click',doUndo);
    container.querySelector('#sol-redo').addEventListener('click',doRedo);

    // Solitaire is in popup.js's MOUSE_ONLY set, so the central keydown
    // router never calls onKey() for this game. Ctrl+Z/Ctrl+Y are scoped
    // here instead, and only act while the Solitaire pane is the active one.
    if (!history) {
      // Defensive: undo/redo is an enhancement and must never be able to
      // break the core game loop. Prefer the shared HistoryManager when it is
      // loaded, otherwise use a real Solitaire-local history stack instead of
      // a no-op fallback.
      try {
        if (typeof HistoryManager!=='undefined'&&HistoryManager&&typeof HistoryManager.create==='function') {
          history = HistoryManager.create({maxSize:200});
        }
      } catch (e) {
        console.error('Solitaire: shared HistoryManager failed; using local history fallback.', e);
      }
      if (!history) history = createLocalHistory(200);
      document.addEventListener('keydown',(e)=>{
        if (!container.classList.contains('active')) return;
        const z=e.key.toLowerCase()==='z', y=e.key.toLowerCase()==='y';
        if ((e.ctrlKey||e.metaKey)&&z&&!e.shiftKey) { e.preventDefault(); doUndo(); }
        else if ((e.ctrlKey||e.metaKey)&&(y||(z&&e.shiftKey))) { e.preventDefault(); doRedo(); }
      });
    }

    const resumed=await loadState();
    if (!resumed) startNew();
    render();
  }

  async function reset() { await Storage.remove(STORAGE_KEY); startNew(); render(); }
  function onKey() {}
  return {init,onKey,reset};
})();
