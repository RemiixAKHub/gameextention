// blackjack.js — Full Blackjack: bet, hit, stand, double down, split, insurance
// Persistent chip stack. Dealer hits soft 16. Standard Vegas rules.

const GameBlackjack = (() => {

  function randomUnit() {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] / 0x100000000;
  }

  function randomInt(max) {
    return Math.floor(randomUnit() * max);
  }
  const STORAGE_KEY = 'game_blackjack';
  const SUITS = ['♠','♥','♦','♣'];
  const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const START_CHIPS = 1000;

  let chips=START_CHIPS, bet=0, sideBet=0; // sideBet = insurance
  let deck=[], playerHand=[], dealerHand=[], splitHand=[];
  let activeHand=0; // 0=main, 1=split
  let phase='bet'; // 'bet' | 'insurance' | 'play' | 'result'
  let message='', subMessage='';
  let container=null;

  // ── State ─────────────────────────────────────────────────────────────────
  function serialize() {
    return {chips,bet,sideBet,deck,playerHand,dealerHand,splitHand,
            activeHand,phase,message,subMessage};
  }
  async function saveState() { Storage.saveLazy(STORAGE_KEY,serialize()); }
  async function loadState() {
    const s=await Storage.load(STORAGE_KEY);
    if (s?.phase) {
      chips=s.chips; bet=s.bet; sideBet=s.sideBet||0;
      deck=s.deck; playerHand=s.playerHand; dealerHand=s.dealerHand;
      splitHand=s.splitHand||[]; activeHand=s.activeHand||0;
      phase=s.phase; message=s.message; subMessage=s.subMessage||'';
      return true;
    }
    return false;
  }

  // ── Deck helpers ──────────────────────────────────────────────────────────
  function buildDeck(numDecks=6) {
    const d=[];
    for (let n=0;n<numDecks;n++)
      for (const s of SUITS) for (const r of RANKS) d.push({r,s});
    return shuffle(d);
  }

  function shuffle(arr) {
    for (let i=arr.length-1;i>0;i--) {
      const j=randomInt(i+1);
      [arr[i],arr[j]]=[arr[j],arr[i]];
    }
    return arr;
  }

  function deal() {
    if (deck.length<20) deck=buildDeck(6);
    return deck.pop();
  }

  function cardValue(card) {
    if (['J','Q','K'].includes(card.r)) return 10;
    if (card.r==='A') return 11;
    return Number.parseInt(card.r, 10);
  }

  function handValue(hand) {
    let total=0, aces=0;
    for (const c of hand) {
      total+=cardValue(c);
      if (c.r==='A') aces++;
    }
    while (total>21&&aces>0) { total-=10; aces--; }
    return total;
  }

  function isSoft(hand) {
    let total=0, aces=0;
    for (const c of hand) { total+=cardValue(c); if(c.r==='A')aces++; }
    return aces>0&&total<=21&&total-10>0;
  }

  function isBust(hand) { return handValue(hand)>21; }
  function isBlackjack(hand) { return hand.length===2&&handValue(hand)===21; }

  // ── Betting ───────────────────────────────────────────────────────────────
  function placeBet(amount) {
    if (phase!=='bet') return;
    const add=Math.min(amount,chips-bet);
    if (add<=0) return;
    bet+=add;
    render();
  }

  function startRound() {
    if (phase!=='bet'||bet<=0) return;
    chips-=bet; // deducted at bet time via placeBet already subtracting from pool
    // Reset hands
    playerHand=[deal(),deal()];
    dealerHand=[deal(),deal()];
    splitHand=[]; activeHand=0;
    subMessage='';

    // Insurance offer
    if (dealerHand[0].r==='A') {
      phase='insurance'; message='Dealer shows Ace — Insurance?';
    } else {
      phase='play';
      message='';
      // Check dealer blackjack silently handled at stand
    }

    // Natural blackjack check (no insurance case)
    if (phase==='play'&&isBlackjack(playerHand)) {
      if (isBlackjack(dealerHand)) {
        endRound('push');
      } else {
        endRound('blackjack');
      }
      return;
    }
    saveState(); render();
  }

  // ── Insurance ─────────────────────────────────────────────────────────────
  function takeInsurance() {
    const insAmt=Math.min(Math.floor(bet/2),chips);
    chips-=insAmt; sideBet=insAmt;
    phase='play';
    checkDealerBlackjack();
  }

  function declineInsurance() {
    sideBet=0; phase='play';
    checkDealerBlackjack();
  }

  function checkDealerBlackjack() {
    if (isBlackjack(dealerHand)) {
      if (sideBet>0) { chips+=sideBet*3; subMessage=`Insurance pays ${sideBet*2}!`; }
      if (isBlackjack(playerHand)) endRound('push');
      else endRound('dealer-bj');
    } else {
      if (sideBet>0) { subMessage='Insurance lost.'; sideBet=0; }
      if (isBlackjack(playerHand)) endRound('blackjack');
      else { message=''; saveState(); render(); }
    }
  }

  // ── Play actions ──────────────────────────────────────────────────────────
  function currentHand() { return activeHand===0?playerHand:splitHand; }

  function hit() {
    if (phase!=='play') return;
    const h=currentHand();
    h.push(deal());
    if (isBust(h)) {
      if (activeHand===0&&splitHand.length>0) {
        activeHand=1; saveState(); render();
      } else if (activeHand===1) {
        // Both bust or main bust+split check
        dealerPlay();
      } else {
        dealerPlay();
      }
    } else {
      saveState(); render();
    }
  }

  function stand() {
    if (phase!=='play') return;
    if (activeHand===0&&splitHand.length>0) {
      activeHand=1; saveState(); render();
    } else {
      dealerPlay();
    }
  }

  function doubleDown() {
    if (phase!=='play'||currentHand().length!==2) return;
    const extra=Math.min(bet,chips);
    if (extra<=0) return;
    chips-=extra; bet+=extra;
    hit();
    if (phase==='play') stand();
  }

  function splitCards() {
    if (phase!=='play'||playerHand.length!==2) return;
    if (cardValue(playerHand[0])!==cardValue(playerHand[1])) return;
    const extra=Math.min(bet,chips);
    if (extra<=0) return;
    chips-=extra;
    splitHand=[playerHand.pop()];
    playerHand.push(deal());
    splitHand.push(deal());
    activeHand=0;
    saveState(); render();
  }

  function dealerPlay() {
    // Reveal dealer hole card, then hit until >=17 (hit soft 16)
    while (handValue(dealerHand)<17||(handValue(dealerHand)===17&&isSoft(dealerHand))) {
      dealerHand.push(deal());
    }
    resolveRound();
  }

  function resolveRound() {
    const dv=handValue(dealerHand);
    const dBust=isBust(dealerHand);

    // Evaluate main hand
    const pv=handValue(playerHand);
    const pBust=isBust(playerHand);

    if (pBust) {
      // lost
    } else if (dBust||pv>dv) {
      chips+=bet*2;
    } else if (pv===dv) {
      chips+=bet; // push
    }
    // else lost

    // Split hand
    if (splitHand.length>0) {
      const sv=handValue(splitHand);
      const sBust=isBust(splitHand);
      if (!sBust&&(dBust||sv>dv)) {
        chips+=bet*2;
      } else if (!sBust&&sv===dv) {
        chips+=bet;
      }
    }

    let msg='';
    if (pBust) msg='Bust!';
    else if (dBust) msg='Dealer busts — You win!';
    else if (pv>dv) msg='You win!';
    else if (pv===dv) msg='Push';
    else msg='Dealer wins';

    message=msg;
    phase='result';
    bet=0; sideBet=0;
    if (chips<=0) { chips=START_CHIPS; subMessage='Out of chips — restarted with $1000'; }
    saveState(); render();
  }

  function endRound(outcome) {
    if (outcome==='blackjack') {
      const payout=Math.floor(bet*1.5);
      chips+=bet+payout; message=`Blackjack! +$${payout}`;
    } else if (outcome==='push') {
      chips+=bet; message='Push — bet returned';
    } else if (outcome==='dealer-bj') {
      message='Dealer Blackjack!';
    }
    phase='result'; bet=0; sideBet=0;
    saveState(); render();
  }

  function newRound() {
    if (phase!=='result') return;
    playerHand=[]; dealerHand=[]; splitHand=[];
    bet=0; sideBet=0; activeHand=0;
    phase='bet'; message='Place your bet'; subMessage='';
    saveState(); render();
  }

  // ── Rendering ──────────────────────────────────────────────────────────────
  function cardHTML(card, hidden=false) {
    if (hidden) return `<div class="bj-card bj-back">🂠</div>`;
    const red=card.s==='♥'||card.s==='♦';
    return `<div class="bj-card${red?' bj-red':''}"><div class="bj-card-top">${card.r}</div><div class="bj-card-suit">${card.s}</div></div>`;
  }

  function handHTML(hand, hideSecond=false) {
    return hand.map((c,i)=>cardHTML(c,hideSecond&&i===1)).join('');
  }

  function formatHandValue(value, hand, blackjack=false) {
    let label = String(value);
    if (isBust(hand)) label += ' BUST';
    if (blackjack) label += ' BJ!';
    return label;
  }

  function clearBet() {
    if (phase !== 'bet') return;
    bet = 0;
    render();
  }

  function render() {
    if (!container) return;

    const dealerHidden = phase==='play'||phase==='insurance';
    const dv = dealerHidden ? handValue([dealerHand[0]]) : handValue(dealerHand);
    const pv = handValue(playerHand);

    container.querySelector('.bj-dealer-cards').innerHTML = handHTML(dealerHand, dealerHidden);
    const dealerValueLabel = dealerHidden ? String(dv) : formatHandValue(dv, dealerHand);
    container.querySelector('.bj-dealer-val').textContent = dealerValueLabel;
    container.querySelector('.bj-player-cards').innerHTML = handHTML(playerHand);
    container.querySelector('.bj-player-val').textContent = formatHandValue(pv, playerHand, isBlackjack(playerHand));

    const splitEl=container.querySelector('.bj-split-area');
    if (splitHand.length>0) {
      splitEl.style.display='flex';
      container.querySelector('.bj-split-cards').innerHTML=handHTML(splitHand);
      const sv=handValue(splitHand);
      container.querySelector('.bj-split-val').textContent=`${sv}${isBust(splitHand)?' BUST':''}`;
      container.querySelector('.bj-player-area').classList.toggle('bj-active-hand',activeHand===0);
      splitEl.classList.toggle('bj-active-hand',activeHand===1);
    } else {
      splitEl.style.display='none';
    }

    container.querySelector('.bj-chips').textContent=`$${chips}`;
    container.querySelector('.bj-bet').textContent=`Bet: $${bet}`;
    container.querySelector('.bj-msg').textContent=message;
    container.querySelector('.bj-submsg').textContent=subMessage;

    // Button visibility
    const show=(sel,v)=>{ const e=container.querySelector(sel); if(e) e.style.display=v?'':'none'; };
    const canSplit=phase==='play'&&activeHand===0&&playerHand.length===2&&cardValue(playerHand[0])===cardValue(playerHand[1])&&chips>=bet;

    show('.bj-bet-controls', phase==='bet');
    show('#bj-deal', phase==='bet'&&bet>0);
    show('.bj-insurance-btns', phase==='insurance');
    show('.bj-play-btns', phase==='play');
    show('#bj-double', phase==='play'&&currentHand().length===2&&chips>=bet);
    show('#bj-split', canSplit);
    show('#bj-next', phase==='result');
  }

  async function init(el) {
    container=el;
    container.innerHTML=`
      <div class="bj-table">
        <div class="bj-dealer-area">
          <div class="bj-area-label">Dealer <span class="bj-dealer-val"></span></div>
          <div class="bj-dealer-cards bj-cards"></div>
        </div>
        <div class="bj-mid">
          <div class="bj-msg"></div>
          <div class="bj-submsg"></div>
        </div>
        <div class="bj-split-area" style="display:none">
          <div class="bj-area-label">Split <span class="bj-split-val"></span></div>
          <div class="bj-split-cards bj-cards"></div>
        </div>
        <div class="bj-player-area">
          <div class="bj-area-label">You <span class="bj-player-val"></span></div>
          <div class="bj-player-cards bj-cards"></div>
        </div>
        <div class="bj-controls">
          <div class="bj-status">
            <span class="bj-chips">$1000</span>
            <span class="bj-bet">Bet: $0</span>
          </div>
          <div class="bj-bet-controls">
            <button class="bj-chip-btn" data-amt="5">$5</button>
            <button class="bj-chip-btn" data-amt="25">$25</button>
            <button class="bj-chip-btn" data-amt="100">$100</button>
            <button class="bj-chip-btn bj-clear-btn" id="bj-clear">Clear</button>
          </div>
          <div class="bj-insurance-btns">
            <button class="bj-action-btn" id="bj-ins-yes">Take Insurance</button>
            <button class="bj-action-btn" id="bj-ins-no">Decline</button>
          </div>
          <div class="bj-play-btns">
            <button class="bj-action-btn" id="bj-hit">Hit</button>
            <button class="bj-action-btn" id="bj-stand">Stand</button>
            <button class="bj-action-btn" id="bj-double">Double</button>
            <button class="bj-action-btn" id="bj-split">Split</button>
          </div>
          <button class="bj-action-btn" id="bj-deal">Deal</button>
          <button class="bj-action-btn" id="bj-next" style="display:none">Next Hand</button>
        </div>
      </div>
      <button class="btn-reset" id="btn-reset-bj">Reset ($1000)</button>
      <div class="game-hint">Dealer hits soft 16 · Blackjack pays 3:2</div>
    `;

    container.querySelectorAll('.bj-chip-btn[data-amt]').forEach(b=>{
      b.addEventListener('click',()=>placeBet(Number.parseInt(b.dataset.amt, 10)));
    });
    container.querySelector('#bj-clear').addEventListener('click', clearBet);
    container.querySelector('#bj-deal').addEventListener('click',startRound);
    container.querySelector('#bj-ins-yes').addEventListener('click',takeInsurance);
    container.querySelector('#bj-ins-no').addEventListener('click',declineInsurance);
    container.querySelector('#bj-hit').addEventListener('click',hit);
    container.querySelector('#bj-stand').addEventListener('click',stand);
    container.querySelector('#bj-double').addEventListener('click',doubleDown);
    container.querySelector('#bj-split').addEventListener('click',splitCards);
    container.querySelector('#bj-next').addEventListener('click',newRound);
    container.querySelector('#btn-reset-bj').addEventListener('click',reset);

    const resumed=await loadState();
    if (!resumed) startNew();
    render();
  }

  function startNew() {
    chips=START_CHIPS; bet=0; sideBet=0;
    deck=buildDeck(6);
    playerHand=[]; dealerHand=[]; splitHand=[];
    activeHand=0; phase='bet'; message='Place your bet'; subMessage='';
  }

  async function reset() { await Storage.remove(STORAGE_KEY); startNew(); render(); }
  function onKey() {}
  return {init,onKey,reset};
})();
