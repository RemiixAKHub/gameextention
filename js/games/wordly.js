// wordly.js — Offline Wordly/Wordle-style word guessing game
// 6 guesses, 5-letter answer, keyboard + on-screen keyboard, auto-save.

const GameWordly = (() => {

  function randomUnit() {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] / 0x100000000;
  }

  function randomInt(max) {
    return Math.floor(randomUnit() * max);
  }
  const STORAGE_KEY = 'game_wordly';
  const WORD_LEN = 5;
  const MAX_GUESSES = 6;

  const ANSWERS = [
    'about','above','actor','admit','adopt','after','again','agent','agree','alarm',
    'album','alert','alien','allow','amber','angel','anger','apple','arena','argue',
    'arise','arrow','audio','avoid','baker','basic','beach','beard','began','begin',
    'below','bench','birth','black','blade','blame','blank','blast','blend','block',
    'blood','board','brain','brand','brave','bread','break','brick','bring','broad',
    'brown','build','cabin','cable','carry','catch','cause','chain','chair','chase',
    'cheap','check','chess','chill','claim','class','clean','clear','climb','clock',
    'close','cloud','coach','coast','could','count','court','cover','craft','crash',
    'cream','crime','cross','crowd','crown','dance','depth','dream','dress','drink',
    'drive','earth','elite','empty','enemy','enjoy','enter','equal','error','event',
    'every','exact','faith','false','fault','field','fight','final','first','flame',
    'floor','focus','force','frame','fresh','front','fruit','ghost','giant','given',
    'glass','globe','grace','grade','grand','grant','grass','green','grind','group',
    'guard','guess','guest','guide','habit','happy','heart','heavy','house','human',
    'image','index','inner','joint','judge','known','label','large','later','laugh',
    'layer','learn','leave','level','light','limit','local','logic','loose','magic',
    'major','march','match','maybe','metal','minor','model','money','month','motor',
    'music','never','night','noise','north','novel','ocean','offer','often','order',
    'other','paint','panel','paper','party','peace','phone','photo','piece','pilot',
    'place','plain','plane','plant','plate','point','power','press','price','pride',
    'prime','print','prize','proof','queen','quick','quiet','radio','raise','range',
    'reach','ready','reply','right','river','robot','rough','round','route','royal',
    'scale','scene','score','sense','serve','seven','share','sharp','sheet','shift',
    'shirt','shock','short','sight','skill','sleep','small','smart','smile','solid',
    'sound','south','space','spare','speak','speed','spend','spice','spike','sport',
    'staff','stage','stand','start','state','steam','steel','still','stone','store',
    'storm','story','style','sugar','table','teach','thank','theme','there','thick',
    'thing','think','third','throw','tight','timer','today','tower','trace','track',
    'trade','train','trial','trust','truth','under','union','upper','urban','value',
    'video','visit','voice','waste','watch','water','wheel','where','white','whole',
    'woman','world','worth','would','write','wrong','young'
  ];

  const VALID_WORDS = new Set(ANSWERS);
  const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

  let answer = '';
  let guesses = [];
  let current = '';
  let status = 'playing'; // playing | won | lost
  let message = '';
  let container = null;

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function hashStr(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.codePointAt(i)) | 0;
    return Math.abs(h);
  }

  function dailyAnswer() {
    return ANSWERS[hashStr(todayKey()) % ANSWERS.length];
  }

  function randomAnswer() {
    return ANSWERS[randomInt(ANSWERS.length)];
  }

  function serialize() { return { answer, guesses, current, status, message, date: todayKey() }; }
  async function saveState() { Storage.saveLazy(STORAGE_KEY, serialize()); }
  async function loadState() {
    const s = await Storage.load(STORAGE_KEY);
    if (s && s.answer && Array.isArray(s.guesses) && s.date === todayKey()) {
      answer = s.answer;
      guesses = s.guesses;
      current = s.current || '';
      status = s.status || 'playing';
      message = s.message || '';
      return true;
    }
    return false;
  }

  function startNew(useRandom = false) {
    answer = useRandom ? randomAnswer() : dailyAnswer();
    guesses = [];
    current = '';
    status = 'playing';
    message = useRandom ? 'New random puzzle started' : 'Daily puzzle started';
    saveState();
    render();
  }

  function evaluateGuess(guess) {
    const result = Array(WORD_LEN).fill('absent');
    const remaining = {};

    for (let i = 0; i < WORD_LEN; i++) {
      if (guess[i] === answer[i]) {
        result[i] = 'correct';
      } else {
        remaining[answer[i]] = (remaining[answer[i]] || 0) + 1;
      }
    }

    for (let i = 0; i < WORD_LEN; i++) {
      if (result[i] === 'correct') continue;
      const ch = guess[i];
      if (remaining[ch] > 0) {
        result[i] = 'present';
        remaining[ch]--;
      }
    }
    return result;
  }

  function keyboardState() {
    const rank = { absent: 1, present: 2, correct: 3 };
    const state = {};
    for (const guess of guesses) {
      const res = evaluateGuess(guess);
      for (let i = 0; i < WORD_LEN; i++) {
        const ch = guess[i].toUpperCase();
        if (!state[ch] || rank[res[i]] > rank[state[ch]]) state[ch] = res[i];
      }
    }
    return state;
  }

  function submitGuess() {
    if (status !== 'playing') return;
    const guess = current.toLowerCase();
    if (guess.length !== WORD_LEN) {
      message = 'Enter 5 letters';
      render();
      return;
    }
    if (!/^[a-z]{5}$/.test(guess)) {
      message = 'Letters only';
      render();
      return;
    }

    guesses.push(guess);
    current = '';

    if (guess === answer) {
      status = 'won';
      message = `Solved in ${guesses.length}/${MAX_GUESSES}`;
    } else if (guesses.length >= MAX_GUESSES) {
      status = 'lost';
      message = `Answer: ${answer.toUpperCase()}`;
    } else {
      message = '';
    }
    saveState();
    render();
  }

  function pressKey(key) {
    if (status !== 'playing') return;
    if (key === 'Enter') { submitGuess(); return; }
    if (key === 'Backspace') {
      current = current.slice(0, -1);
      saveState();
      render();
      return;
    }
    if (/^[a-zA-Z]$/.test(key) && current.length < WORD_LEN) {
      current += key.toLowerCase();
      saveState();
      render();
    }
  }

  function buildSkeleton() {
    container.innerHTML = `
      <div class="wly-wrap">
        <div class="wly-header">
          <div class="wly-title">WORDLY</div>
          <div class="wly-subtitle">Guess the 5-letter word</div>
        </div>
        <div class="wly-grid"></div>
        <div class="wly-message"></div>
        <div class="wly-keyboard"></div>
        <div class="wly-actions">
          <button class="wly-btn wly-new-daily">Daily</button>
          <button class="wly-btn wly-new-random">New Puzzle</button>
        </div>
      </div>
    `;

    container.querySelector('.wly-new-daily').addEventListener('click', () => startNew(false));
    container.querySelector('.wly-new-random').addEventListener('click', () => startNew(true));
  }

  function renderGrid() {
    const grid = container.querySelector('.wly-grid');
    grid.innerHTML = '';

    for (let row = 0; row < MAX_GUESSES; row++) {
      const isSubmitted = row < guesses.length;
      const word = isSubmitted ? guesses[row] : (row === guesses.length ? current : '');
      const result = isSubmitted ? evaluateGuess(word) : [];

      for (let col = 0; col < WORD_LEN; col++) {
        const cell = document.createElement('div');
        cell.className = 'wly-cell';
        const ch = word[col] || '';
        cell.textContent = ch.toUpperCase();
        if (ch) cell.classList.add('wly-filled');
        if (isSubmitted) cell.classList.add(`wly-${result[col]}`);
        grid.appendChild(cell);
      }
    }
  }

  function renderKeyboard() {
    const kb = container.querySelector('.wly-keyboard');
    const state = keyboardState();
    kb.innerHTML = '';

    KEY_ROWS.forEach((row, rowIndex) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'wly-key-row';

      if (rowIndex === 2) rowEl.appendChild(makeKey('Enter', 'wly-wide-key'));
      for (const ch of row) rowEl.appendChild(makeKey(ch, state[ch] ? `wly-${state[ch]}` : ''));
      if (rowIndex === 2) rowEl.appendChild(makeKey('⌫', 'wly-wide-key', 'Backspace'));

      kb.appendChild(rowEl);
    });
  }

  function makeKey(label, cls = '', keyOverride = null) {
    const btn = document.createElement('button');
    btn.className = `wly-key ${cls}`.trim();
    btn.textContent = label;
    btn.addEventListener('click', () => pressKey(keyOverride || label));
    return btn;
  }

  function render() {
    if (!container) return;
    renderGrid();
    renderKeyboard();
    const msg = container.querySelector('.wly-message');
    msg.textContent = message;
    msg.classList.toggle('wly-win', status === 'won');
    msg.classList.toggle('wly-lost', status === 'lost');
  }

  async function init(el) {
    container = el;
    buildSkeleton();
    const resumed = await loadState();
    if (!resumed) startNew(false);
    else render();
  }

  function onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Enter' || e.key === 'Backspace' || /^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      pressKey(e.key);
    }
  }

  async function reset() {
    await Storage.remove(STORAGE_KEY);
    startNew(false);
  }

  return { init, onKey, reset };
})();
