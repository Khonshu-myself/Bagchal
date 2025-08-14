
const SIZE = 5;
const TIGER = 'T';
const GOAT  = 'G';
const EMPTY = '';

/* DOM refs */
const playerName = document.getElementById('playerName');
const modeLabel  = document.getElementById('modeLabel');
const boardEl    = document.getElementById('board');
const turnEl     = document.getElementById('turn');
const phaseEl    = document.getElementById('phase');
const capturedEl = document.getElementById('captured');
const statusEl   = document.getElementById('status');
const resetBtn   = document.getElementById('resetBtn');
const logoutBtn  = document.getElementById('logoutBtn');

/* State */
let state = {
  mode: 'two',      // 'two' | 'bot'
  name: 'Player',
  board: Array(SIZE*SIZE).fill(EMPTY),
  goatsPlaced: 0,
  goatsCaptured: 0,
  turn: 'Goat',
  selected: null
};

/* Helpers */
const DIRS = [[-1,0],[1,0],[0,-1],[0,1]];
function idx(r,c){ return r*SIZE + c; }
function rc(i){ return { r: Math.floor(i/SIZE), c: i%SIZE }; }
function inBounds(r,c){ return r>=0 && r<SIZE && c>=0 && c<SIZE; }
function neighbors(i){
  const {r,c} = rc(i);
  const out = [];
  for(const [dr,dc] of DIRS){
    const nr=r+dr, nc=c+dc;
    if(inBounds(nr,nc)) out.push(idx(nr,nc));
  }
  return out;
}

/* Init from URL params */
(function readParams(){
  const p = new URLSearchParams(location.search);
  const name = p.get('name') || 'Player';
  const mode = p.get('mode') === 'bot' ? 'bot' : 'two';
  state.name = name;
  state.mode = mode;
})();

/* Core game functions */
function initBoard(){
  state.board.fill(EMPTY);
  state.board[idx(0,0)] = TIGER;
  state.board[idx(0,SIZE-1)] = TIGER;
  state.board[idx(SIZE-1,0)] = TIGER;
  state.board[idx(SIZE-1,SIZE-1)] = TIGER;
  state.goatsPlaced = 0;
  state.goatsCaptured = 0;
  state.turn = 'Goat';
  state.selected = null;
  statusEl.textContent = '';
}

function render(){
  playerName.textContent = state.name || '—';
  modeLabel.textContent  = state.mode === 'bot' ? 'Vs Computer (Tigers)' : '2 Players (Friends)';
  turnEl.textContent     = state.turn;
  phaseEl.textContent    = state.goatsPlaced < 20 ? `Placing (${state.goatsPlaced}/20)` : 'Moving';
  capturedEl.textContent = state.goatsCaptured;

  boardEl.innerHTML = '';
  for(let i=0;i<state.board.length;i++){
    const btn = document.createElement('button');
    btn.className = 'cell' + (state.selected===i ? ' selected' : '');
    btn.textContent = state.board[i]===TIGER ? '🐯' : (state.board[i]===GOAT ? '🐐' : '');
    btn.addEventListener('click', ()=>onCell(i));
    boardEl.appendChild(btn);
  }
}

function tigerHasMoves(){
  for(let i=0;i<state.board.length;i++){
    if(state.board[i] !== TIGER) continue;
    for(const n of neighbors(i)) if(state.board[n]===EMPTY) return true;
    const {r,c} = rc(i);
    for(const [dr,dc] of DIRS){
      const mr=r+dr, mc=c+dc, lr=r+2*dr, lc=c+2*dc;
      if(!inBounds(mr,mc)||!inBounds(lr,lc)) continue;
      const mid=idx(mr,mc), land=idx(lr,lc);
      if(state.board[mid]===GOAT && state.board[land]===EMPTY) return true;
    }
  }
  return false;
}

function checkWin(){
  if(state.goatsCaptured >= 5){
    statusEl.textContent = 'Tigers win (5 goats captured).';
    freeze(); return true;
  }
  if(!tigerHasMoves()){
    statusEl.textContent = 'Goats win (all tigers blocked).';
    freeze(); return true;
  }
  return false;
}

function freeze(){
  const cells = boardEl.querySelectorAll('.cell');
  cells.forEach(c => c.replaceWith(c.cloneNode(true)));
}

function onCell(i){
  if(statusEl.textContent) return;

  if(state.turn==='Goat'){
    if(state.goatsPlaced < 20){
      if(state.board[i]===EMPTY){
        state.board[i]=GOAT; state.goatsPlaced++; state.turn='Tiger'; state.selected=null;
        render(); if(!checkWin()) maybeBot();
      }
      return;
    }
    if(state.selected===null){
      if(state.board[i]===GOAT){ state.selected=i; render(); }
      return;
    }
    if(state.board[i]===EMPTY && neighbors(state.selected).includes(i)){
      state.board[i]=GOAT; state.board[state.selected]=EMPTY; state.selected=null; state.turn='Tiger';
      render(); if(!checkWin()) maybeBot();
      return;
    }
    if(state.board[i]===GOAT){ state.selected=i; render(); }
    return;
  }

  // Tiger turn (human only in 2-player mode)
  if(state.mode==='two'){
    if(state.selected===null){
      if(state.board[i]===TIGER){ state.selected=i; render(); }
      return;
    }
    tryTigerMove(state.selected, i);
  }
}

function tryTigerMove(from, to){
  const {r:fr,c:fc}=rc(from), {r:tr,c:tc}=rc(to);
  const dr=tr-fr, dc=tc-fc;

  if(Math.abs(dr)+Math.abs(dc)===1 && state.board[to]===EMPTY){
    state.board[to]=TIGER; state.board[from]=EMPTY; state.selected=null; state.turn='Goat';
    render(); checkWin(); return;
  }
  if(Math.abs(dr)+Math.abs(dc)===2 && (dr===0||dc===0)){
    const midR=fr+(dr===0?0:dr/Math.abs(dr));
    const midC=fc+(dc===0?0:dc/Math.abs(dc));
    const mid=idx(midR,midC);
    if(state.board[mid]===GOAT && state.board[to]===EMPTY){
      state.board[to]=TIGER; state.board[from]=EMPTY; state.board[mid]=EMPTY;
      state.goatsCaptured++; state.selected=null; state.turn='Goat';
      render(); checkWin(); return;
    }
  }
  if(state.board[to]===TIGER){ state.selected=to; render(); }
}

/* Bot: Tigers capture-first, else first legal step */
function botMoveTiger(){
  for(let i=0;i<state.board.length;i++){
    if(state.board[i]!==TIGER) continue;
    const {r,c}=rc(i);
    for(const [dr,dc] of DIRS){
      const mr=r+dr, mc=c+dc, lr=r+2*dr, lc=c+2*dc;
      if(!inBounds(mr,mc)||!inBounds(lr,lc)) continue;
      const mid=idx(mr,mc), land=idx(lr,lc);
      if(state.board[mid]===GOAT && state.board[land]===EMPTY){
        state.board[land]=TIGER; state.board[i]=EMPTY; state.board[mid]=EMPTY;
        state.goatsCaptured++; state.turn='Goat'; render(); return;
      }
    }
  }
  for(let i=0;i<state.board.length;i++){
    if(state.board[i]!==TIGER) continue;
    for(const n of neighbors(i)){
      if(state.board[n]===EMPTY){
        state.board[n]=TIGER; state.board[i]=EMPTY; state.turn='Goat'; render(); return;
      }
    }
  }
}

function maybeBot(){
  if(state.mode==='bot' && state.turn==='Tiger' && !statusEl.textContent){
    setTimeout(()=>{ botMoveTiger(); checkWin(); }, 200);
  }
}

/* Controls */
resetBtn.addEventListener('click', () => {
  initBoard(); render();
  if(state.mode==='bot' && state.turn==='Tiger') maybeBot();
});
logoutBtn.addEventListener('click', () => {
  window.location.href = 'index.html';
});

/* Kickoff */
initBoard();
render();
