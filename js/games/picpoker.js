// picpoker.js — Picture Poker (Super Mario DS style)
// 5 cards dealt with picture faces. Bet star coins. Hold cards. Dealer matches.
// Hands: High Card → Pair → Two Pair → Three of a Kind → Full House → Four of a Kind → Five of a Kind

const GamePicPoker = (() => {

  function randomUnit() {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] / 0x100000000;
  }

  function randomInt(max) {
    return Math.floor(randomUnit() * max);
  }
  const STORAGE_KEY = 'game_picpoker';

  // Picture "suits" — each is a face/icon. 5 types × 4 copies = 20 card deck (like Mario DS)
  const PICTURES = [
    { id:0, label:'🍄', name:'Mushroom'  },
    { id:1, label:'🌸', name:'Flower'    },
    { id:2, label:'⭐', name:'Star'      },
    { id:3, label:'👻', name:'Boo'       },
    { id:4, label:'🐢', name:'Shell'     },
  ];
  // Each picture appears 4 times in the deck (4 "suits" × 5 pictures = 20 cards)
  // Hand rank is purely by count — no suits, no straights. Like video poker but simpler.

  const HAND_RANKS = [
    { name:'Five of a Kind', payout:10 },
    { name:'Four of a Kind', payout:5  },
    { name:'Full House',     payout:4  },
    { name:'Three of a Kind',payout:3  },
    { name:'Two Pair',       payout:2  },
    { name:'One Pair',       payout:1  },
    { name:'High Card',      payout:0  },
  ];

  const START_COINS = 20;
  const MAX_BET = 5;

  let coins=START_COINS, bet=1;
  let playerHand=[], dealerHand=[];
  let held=[false,false,false,false,false];
  let phase='bet';     // 'bet' | 'hold' | 'result'
  let message='', resultDetail='';
  let container=null;

  // ── Deck helpers ───────────────────────────────────────────────────────────
  function buildDeck() {
    const d=[];
    for (const p of PICTURES)
      for (let i=0;i<4;i++) d.push({...p});
    return shuffle(d);
  }

  function shuffle(arr) {
    for (let i=arr.length-1;i>0;i--) {
      const j=randomInt(i+1);
      [arr[i],arr[j]]=[arr[j],arr[i]];
    }
    return arr;
  }

  function dealN(deck,n) { return deck.splice(0,n); }

  // ── Hand evaluation ────────────────────────────────────────────────────────
  function evalHand(hand) {
    const counts={};
    for (const c of hand) counts[c.id]=(counts[c.id]||0)+1;
    const vals=Object.values(counts).sort((a,b)=>b-a);

    if (vals[0]===5) return {rank:0, name:'Five of a Kind', payout:10};
    if (vals[0]===4) return {rank:1, name:'Four of a Kind', payout:5};
    if (vals[0]===3&&vals[1]===2) return {rank:2, name:'Full House', payout:4};
    if (vals[0]===3) return {rank:3, name:'Three of a Kind', payout:3};
    if (vals[0]===2&&vals[1]===2) return {rank:4, name:'Two Pair', payout:2};
    if (vals[0]===2) return {rank:5, name:'One Pair', payout:1};
    return {rank:6, name:'High Card', payout:0};
  }

  // ── State ──────────────────────────────────────────────────────────────────
  function serialize() { return {coins,bet,playerHand,dealerHand,held,phase,message,resultDetail}; }
  async function saveState() { Storage.saveLazy(STORAGE_KEY,serialize()); }
  async function loadState() {
    const s=await Storage.load(STORAGE_KEY);
    if (s?.phase) {
      coins=s.coins; bet=s.bet; playerHand=s.playerHand; dealerHand=s.dealerHand;
      held=s.held; phase=s.phase; message=s.message; resultDetail=s.resultDetail||'';
      return true;
    }
    return false;
  }

  // ── Game flow ──────────────────────────────────────────────────────────────
  function deal() {
    if (phase!=='bet'||coins<bet) return;
    coins-=bet;
    const deck=buildDeck();
    playerHand=dealN(deck,5);
    dealerHand=dealN(deck,5); // dealer gets 5, shown face-down until result
    held=[false,false,false,false,false];
    phase='hold';
    message='Hold your best cards, then Draw';
    saveState(); render();
  }

  function toggleHold(i) {
    if (phase!=='hold') return;
    held[i]=!held[i];
    render(); // no save needed, just visual
  }

  function resolveHandResult(pResult, dResult) {
    if (pResult.rank < dResult.rank) {
      const winnings = bet * (pResult.payout + 1); // +1 = return bet
      return { winnings, outcome: `You win! +${winnings - bet} coins` };
    }
    if (pResult.rank > dResult.rank) {
      return { winnings: 0, outcome: `Dealer wins! Lost ${bet} coins` };
    }
    return { winnings: bet, outcome: 'Draw! Bet returned' };
  }

  function draw() {
    if (phase!=='hold') return;
    // Replace un-held cards
    const deck=buildDeck();
    for (let i=0;i<5;i++) {
      if (!held[i]) playerHand[i]=deck.pop();
    }
    // Evaluate both hands
    const pResult=evalHand(playerHand);
    const dResult=evalHand(dealerHand);
    const { winnings, outcome } = resolveHandResult(pResult, dResult);

    coins+=winnings;
    resultDetail=`Your: ${pResult.name}  |  Dealer: ${dResult.name}`;
    message=outcome;
    phase='result';

    if (coins<=0) { coins=START_COINS; message+=' (Out of coins! Restarted)'; }
    saveState(); render();
  }

  function nextRound() {
    if (phase!=='result') return;
    phase='bet'; message=''; resultDetail='';
    playerHand=[]; dealerHand=[];
    held=[false,false,false,false,false];
    saveState(); render();
  }

  function changeBet(delta) {
    if (phase!=='bet') return;
    bet=Math.max(1,Math.min(MAX_BET,Math.min(coins,bet+delta)));
    render();
  }

  // ── Rendering ──────────────────────────────────────────────────────────────
  function cardHTML(card, faceDown=false, isHeld=false, idx=-1) {
    if (faceDown) {
      return `<div class="pp-card pp-back">?</div>`;
    }
    const heldClass=isHeld?' pp-held':'';
    const clickAttr=idx>=0?' data-idx="'+idx+'"':'';
    return `<div class="pp-card${heldClass}"${clickAttr}>
      <div class="pp-face">${card.label}</div>
      <div class="pp-name">${card.name}</div>
      ${isHeld?'<div class="pp-hold-tag">HOLD</div>':''}
    </div>`;
  }

  function render() {
    if (!container) return;

    container.querySelector('.pp-coins').textContent=`⭐ ${coins}`;
    container.querySelector('.pp-bet-val').textContent=bet;
    container.querySelector('.pp-msg').textContent=message;
    container.querySelector('.pp-detail').textContent=resultDetail;

    // Player hand
    const playerEl=container.querySelector('.pp-player-hand');
    if (playerHand.length) {
      playerEl.innerHTML=playerHand.map((c,i)=>cardHTML(c,false,held[i],i)).join('');
      playerEl.querySelectorAll('.pp-card[data-idx]').forEach(el=>{
        el.addEventListener('click',()=>toggleHold(Number.parseInt(el.dataset.idx, 10)));
      });
    } else {
      playerEl.innerHTML='<div class="pp-hand-empty">Your cards appear here</div>';
    }

    // Dealer hand — face down during hold phase
    const dealerEl=container.querySelector('.pp-dealer-hand');
    if (dealerHand.length) {
      const faceDown=phase==='hold';
      dealerEl.innerHTML=dealerHand.map(c=>cardHTML(c,faceDown)).join('');
    } else {
      dealerEl.innerHTML='<div class="pp-hand-empty">Dealer cards</div>';
    }

    // Button states
    const show=(sel,v)=>{ const e=container.querySelector(sel); if(e) e.style.display=v?'':'none'; };
    show('.pp-bet-controls', phase==='bet');
    show('#pp-deal-btn',     phase==='bet');
    show('#pp-draw-btn',     phase==='hold');
    show('#pp-next-btn',     phase==='result');

    // Payout table highlighting
    container.querySelectorAll('.pp-pay-row').forEach(row=>{
      if (phase==='result') {
        const pResult=evalHand(playerHand);
        row.classList.toggle('pp-pay-active', row.dataset.hand===pResult.name);
      } else {
        row.classList.remove('pp-pay-active');
      }
    });
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  async function init(el) {
    container=el;
    container.innerHTML=`
      <div class="pp-table">
        <div class="pp-top">
          <div class="pp-status">
            <span class="pp-coins">⭐ ${START_COINS}</span>
            <span class="pp-bet-display">Bet: <span class="pp-bet-val">1</span></span>
          </div>
          <div class="pp-paytable">
            ${HAND_RANKS.filter(h=>h.payout>0).map(h=>
              `<div class="pp-pay-row" data-hand="${h.name}">
                <span>${h.name}</span><span>${h.payout}×</span>
              </div>`
            ).join('')}
          </div>
        </div>
        <div class="pp-dealer-area">
          <div class="pp-area-label">🃏 Dealer</div>
          <div class="pp-dealer-hand pp-hand"></div>
        </div>
        <div class="pp-msg-area">
          <div class="pp-msg"></div>
          <div class="pp-detail"></div>
        </div>
        <div class="pp-player-area">
          <div class="pp-area-label">🎮 You</div>
          <div class="pp-player-hand pp-hand"></div>
        </div>
        <div class="pp-controls">
          <div class="pp-bet-controls">
            <button class="pp-btn" id="pp-bet-down">−</button>
            <span>Bet</span>
            <button class="pp-btn" id="pp-bet-up">+</button>
          </div>
          <button class="pp-btn pp-main-btn" id="pp-deal-btn">Deal ⭐</button>
          <button class="pp-btn pp-main-btn" id="pp-draw-btn" style="display:none">Draw Cards</button>
          <button class="pp-btn pp-main-btn" id="pp-next-btn" style="display:none">Next Hand</button>
        </div>
      </div>
      <button class="btn-reset" id="btn-reset-pp">Reset Coins</button>
      <div class="game-hint">Click cards to hold · Beat the dealer's hand!</div>
    `;

    container.querySelector('#pp-bet-down').addEventListener('click',()=>changeBet(-1));
    container.querySelector('#pp-bet-up').addEventListener('click',()=>changeBet(1));
    container.querySelector('#pp-deal-btn').addEventListener('click',deal);
    container.querySelector('#pp-draw-btn').addEventListener('click',draw);
    container.querySelector('#pp-next-btn').addEventListener('click',nextRound);
    container.querySelector('#btn-reset-pp').addEventListener('click',reset);

    const resumed=await loadState();
    if (!resumed) startNew();
    render();
  }

  function startNew() {
    coins=START_COINS; bet=1;
    playerHand=[]; dealerHand=[];
    held=[false,false,false,false,false];
    phase='bet'; message='Place your bet and deal!'; resultDetail='';
  }

  async function reset() { await Storage.remove(STORAGE_KEY); startNew(); render(); }
  function onKey() {}
  return {init,onKey,reset};
})();
