// yahtzee.js — Full Yahtzee: 13 categories, upper bonus, Yahtzee bonus, auto-save

const GameYahtzee = (() => {
  const STORAGE_KEY = 'game_yahtzee';

  const UPPER = ['ones','twos','threes','fours','fives','sixes'];
  const LOWER = ['threeOfAKind','fourOfAKind','fullHouse','smallStraight','largeStraight','yahtzee','chance'];
  const ALL_CATS = [...UPPER, ...LOWER];

  const CAT_LABELS = {
    ones:'Ones', twos:'Twos', threes:'Threes', fours:'Fours', fives:'Fives', sixes:'Sixes',
    threeOfAKind:'3 of a Kind', fourOfAKind:'4 of a Kind', fullHouse:'Full House (25)',
    smallStraight:'Sm. Straight (30)', largeStraight:'Lg. Straight (40)',
    yahtzee:'Yahtzee! (50)', chance:'Chance',
  };

  let dice=[0,0,0,0,0], held=[false,false,false,false,false];
  let rollsLeft=3, scorecard={}, yahtzeeBonus=0, gameOver=false;
  let container=null;

  function serialize() { return {dice,held,rollsLeft,scorecard,yahtzeeBonus,gameOver}; }
  async function saveState() { Storage.saveLazy(STORAGE_KEY, serialize()); }
  async function loadState() {
    const s = await Storage.load(STORAGE_KEY);
    if (s?.scorecard!==undefined) {
      dice=s.dice; held=s.held; rollsLeft=s.rollsLeft;
      scorecard=s.scorecard; yahtzeeBonus=s.yahtzeeBonus||0; gameOver=s.gameOver;
      return true;
    }
    return false;
  }

  function counts(d) { const c=new Array(7).fill(0); d.forEach(v=>c[v]++); return c; }
  function sum(d) { return d.reduce((a,b)=>a+b,0); }

  function randomDie() {
    const values = new Uint32Array(1);
    const max = 0xFFFFFFFF - (0xFFFFFFFF % 6);
    do {
      crypto.getRandomValues(values);
    } while (values[0] >= max);
    return (values[0] % 6) + 1;
  }

  function uniqueSortedDice(d) { return [...new Set(d)].sort((a,b)=>a-b).join(''); }
  function hasCountAtLeast(c, target) { return c.some(v=>v>=target); }
  function upperScore(c, face) { return c[face]*face; }
  function smallStraightScore(d) {
    const u=uniqueSortedDice(d);
    return (u.includes('1234')||u.includes('2345')||u.includes('3456'))?30:0;
  }
  function largeStraightScore(d) {
    const u=uniqueSortedDice(d);
    return (u==='12345'||u==='23456')?40:0;
  }

  const SCORE_HANDLERS = {
    ones: c=>upperScore(c,1),
    twos: c=>upperScore(c,2),
    threes: c=>upperScore(c,3),
    fours: c=>upperScore(c,4),
    fives: c=>upperScore(c,5),
    sixes: c=>upperScore(c,6),
    threeOfAKind: (c,d,s)=>hasCountAtLeast(c,3)?s:0,
    fourOfAKind: (c,d,s)=>hasCountAtLeast(c,4)?s:0,
    fullHouse: c=>(c.includes(3)&&c.includes(2))?25:0,
    smallStraight: (c,d)=>smallStraightScore(d),
    largeStraight: (c,d)=>largeStraightScore(d),
    yahtzee: c=>c.includes(5)?50:0,
    chance: (c,d,s)=>s,
  };

  function calcScore(cat, d) {
    const c=counts(d), s=sum(d);
    return SCORE_HANDLERS[cat]?.(c,d,s) ?? 0;
  }

  function upperTotal() { return UPPER.reduce((t,c)=>t+(scorecard[c]??0),0); }
  function upperBonus()  { return upperTotal()>=63?35:0; }
  function lowerTotal()  { return LOWER.reduce((t,c)=>t+(scorecard[c]??0),0); }
  function grandTotal()  { return upperTotal()+upperBonus()+lowerTotal()+yahtzeeBonus*100; }
  function scoredCount() { return ALL_CATS.filter(c=>scorecard[c]!==undefined).length; }

  function rollDice() {
    if (rollsLeft===0||gameOver) return;
    for (let i=0;i<5;i++) if (!held[i]) dice[i]=randomDie();
    rollsLeft--;
    saveState(); render();
  }

  function toggleHold(i) {
    if (rollsLeft===3) return;
    held[i]=!held[i];
    saveState(); render();
  }

  function scoreCategory(cat) {
    if (scorecard[cat]!==undefined||rollsLeft===3) return;
    if (cat!=='yahtzee'&&calcScore('yahtzee',dice)===50&&scorecard['yahtzee']===50) yahtzeeBonus++;
    scorecard[cat]=calcScore(cat,dice);
    rollsLeft=3; held=[false,false,false,false,false]; dice=[0,0,0,0,0];
    if (scoredCount()===13) gameOver=true;
    saveState(); render();
  }

  const DIE_FACES=['','⚀','⚁','⚂','⚃','⚄','⚅'];

  function render() {
    if (!container) return;
    // Dice
    const diceEl=container.querySelector('.ytz-dice');
    diceEl.innerHTML='';
    for (let i=0;i<5;i++) {
      const d=document.createElement('div');
      d.className='ytz-die'+(held[i]?' ytz-held':'');
      d.textContent=dice[i]?DIE_FACES[dice[i]]:'·';
      if (rollsLeft<3) d.addEventListener('click',()=>toggleHold(i));
      diceEl.appendChild(d);
    }
    // Roll button
    const btn=container.querySelector('#ytz-roll');
    btn.disabled=rollsLeft===0||gameOver;
    btn.textContent=rollsLeft===3?'🎲 Roll Dice':`🎲 Re-roll (${rollsLeft} left)`;

    // Scorecard
    ALL_CATS.forEach(cat=>{
      const row=container.querySelector(`[data-cat="${cat}"]`);
      if (!row) return;
      const sc=row.querySelector('.ytz-score');
      const scored=scorecard[cat]!==undefined;
      row.classList.toggle('ytz-scored',scored);
      row.classList.toggle('ytz-available',!scored&&rollsLeft<3);
      if (scored) {
        sc.textContent=scorecard[cat]; sc.style.color='';
      } else if (rollsLeft<3) {
        const p=calcScore(cat,dice);
        sc.textContent=p>0?`+${p}`:'0';
        sc.style.color=p>0?'var(--green)':'var(--text-dim)';
      } else {
        sc.textContent='—'; sc.style.color='';
      }
    });

    // Totals
    const ut=upperTotal();
    container.querySelector('#ytz-upper-total').textContent=ut;
    container.querySelector('#ytz-bonus-val').textContent=ut>=63?'35 ✓':`Need ${63-ut} more`;
    container.querySelector('#ytz-lower-total').textContent=lowerTotal();
    container.querySelector('#ytz-ybonus').textContent=yahtzeeBonus?`+${yahtzeeBonus*100}`:'—';
    container.querySelector('#ytz-grand').textContent=grandTotal();

    const banner=container.querySelector('.ytz-banner');
    banner.style.display=gameOver?'flex':'none';
    if (gameOver) banner.textContent=`🎉 Final Score: ${grandTotal()}`;
  }

  async function init(el) {
    container=el;
    let html=`
      <div class="ytz-top">
        <div class="ytz-dice"></div>
        <button id="ytz-roll" class="ytz-roll-btn">🎲 Roll Dice</button>
      </div>
      <div class="ytz-banner"></div>
      <div class="ytz-card">
        <div class="ytz-section-hdr">UPPER SECTION</div>`;
    UPPER.forEach(cat=>{
      html+=`<div class="ytz-row" data-cat="${cat}"><span class="ytz-label">${CAT_LABELS[cat]}</span><span class="ytz-score">—</span></div>`;
    });
    html+=`<div class="ytz-total-row"><span>Upper Total</span><span id="ytz-upper-total">0</span></div>
      <div class="ytz-total-row"><span>Bonus (≥63)</span><span id="ytz-bonus-val">Need 63 more</span></div>
      <div class="ytz-section-hdr">LOWER SECTION</div>`;
    LOWER.forEach(cat=>{
      html+=`<div class="ytz-row" data-cat="${cat}"><span class="ytz-label">${CAT_LABELS[cat]}</span><span class="ytz-score">—</span></div>`;
    });
    html+=`<div class="ytz-total-row"><span>Yahtzee Bonus</span><span id="ytz-ybonus">—</span></div>
      <div class="ytz-total-row"><span>Lower Total</span><span id="ytz-lower-total">0</span></div>
      <div class="ytz-grand-row"><span>GRAND TOTAL</span><span id="ytz-grand">0</span></div>
      </div>
      <button class="btn-reset" id="btn-reset-ytz">New Game</button>
      <div class="game-hint">Roll → click dice to hold → click category to score</div>`;
    container.innerHTML=html;
    container.querySelector('#ytz-roll').addEventListener('click',rollDice);
    container.querySelector('#btn-reset-ytz').addEventListener('click',reset);
    container.querySelectorAll('.ytz-row[data-cat]').forEach(row=>{
      row.addEventListener('click',()=>scoreCategory(row.dataset.cat));
    });
    const resumed=await loadState();
    if (!resumed) startNew();
    render();
  }

  function startNew() {
    dice=[0,0,0,0,0]; held=[false,false,false,false,false];
    rollsLeft=3; scorecard={}; yahtzeeBonus=0; gameOver=false;
  }

  async function reset() { await Storage.remove(STORAGE_KEY); startNew(); render(); }
  function onKey() {}
  return {init,onKey,reset};
})();
