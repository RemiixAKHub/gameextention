// popup.js — Central controller: tab switching, keyboard routing, game init

const GAMES = {
  '2048':       { module: () => Game2048,        label: '2048'    },
  'mine':       { module: () => GameMinesweeper,  label: 'Mine'    },
  'sudoku':     { module: () => GameSudoku,       label: 'Sudo'    },
  'tetris':     { module: () => GameTetris,       label: 'Tetris'  },
  'connect4':   { module: () => GameConnect4,     label: 'C4'      },
  'chess':      { module: () => GameChess,        label: 'Chess'   },
  'yahtzee':    { module: () => GameYahtzee,      label: 'Yatzee'  },
  'blackjack':  { module: () => GameBlackjack,    label: 'BJ'      },
  'solitaire':  { module: () => GameSolitaire,    label: 'Soli'    },
  'lightsout':  { module: () => GameLightsOut,    label: 'Lights'  },
  'puzzle15':   { module: () => GamePuzzle15,     label: '15'      },
  'picpoker':   { module: () => GamePicPoker,     label: 'Poker'   },
  'trafficjam': { module: () => GameTrafficJam,   label: 'Traffic' },
  'marblerun':  { module: () => GameMarbleRun,    label: 'Marble'  },
  'contexto':   { module: () => GameContexto,     label: 'Context' },
  'wordly':     { module: () => GameWordly,       label: 'Wordly'  },
  'jeweldrop':  { module: () => GameJewelDrop,    label: 'Jewels'  },
};

const MOUSE_ONLY = new Set(['mine','chess','blackjack','solitaire','picpoker','trafficjam','marblerun']);
const LAST_GAME_KEY = 'last_game';
let activeGame=null, activeId=null;

async function switchGame(id) {
  if (activeId===id) return;
  if (activeId==='tetris'&&GameTetris.onVisible) GameTetris.onVisible(false);

  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.game===id));
  document.querySelectorAll('.game-pane').forEach(p=>p.classList.toggle('active',p.dataset.game===id));

  const pane=document.querySelector(`.game-pane[data-game="${id}"]`);
  const mod=GAMES[id].module();
  if (!pane.dataset.inited) { await mod.init(pane); pane.dataset.inited='1'; }

  activeId=id; activeGame=mod;
  if (id==='tetris'&&GameTetris.onVisible) GameTetris.onVisible(true);
  Storage.save(LAST_GAME_KEY,id);
}

document.addEventListener('keydown',(e)=>{
  if (!activeGame||MOUSE_ONLY.has(activeId)) return;
  activeGame.onKey(e);
});
document.addEventListener('keyup',(e)=>{
  if (activeGame&&activeGame.onKeyUp) activeGame.onKeyUp(e);
});

function buildUI() {
  const tabBar=document.getElementById('tab-bar');
  const content=document.getElementById('game-content');
  const ids=Object.keys(GAMES);
  const row1=ids.slice(0,6), row2=ids.slice(6,12), row3=ids.slice(12);

  [row1,row2,row3].forEach(rowIds=>{
    if (!rowIds.length) return;
    const row=document.createElement('div');
    row.className='tab-row';
    rowIds.forEach(id=>{
      const btn=document.createElement('button');
      btn.className='tab-btn'; btn.dataset.game=id; btn.textContent=GAMES[id].label;
      btn.addEventListener('click',()=>switchGame(id));
      row.appendChild(btn);
    });
    tabBar.appendChild(row);
  });

  ids.forEach(id=>{
    const pane=document.createElement('div');
    pane.className='game-pane'; pane.dataset.game=id;
    content.appendChild(pane);
  });
}

async function main() {
  buildUI();
  const last=await Storage.load(LAST_GAME_KEY);
  const startId=(last&&GAMES[last])?last:'2048';
  await switchGame(startId);
}
main();
