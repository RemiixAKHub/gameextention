/* ═══════════════════════════════════════════════════════════════════════════
   MARBLE RUN  —  Holographic Racing League
   Phase 3: Track rendering — buildTrack, draw, race screen shell, static marbles.
   Exports: GameMarbleRun  (consumed by popup.js)
═══════════════════════════════════════════════════════════════════════════ */
const GameMarbleRun = (() => {

  function randomUnit() {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] / 0x100000000;
  }

  function randomInt(max) {
    return Math.floor(randomUnit() * max);
  }

  /* ── Constants ───────────────────────────────────────────────────────── */
  const MARBLES = [
    { id:0, name:'Crimson', color:'#ff3366', glow:'#ff003399' },
    { id:1, name:'Cobalt',  color:'#0099ff', glow:'#0066ff99' },
    { id:2, name:'Jade',    color:'#00ffaa', glow:'#00ff8899' },
    { id:3, name:'Gold',    color:'#ffcc00', glow:'#ffaa0099' },
    { id:4, name:'Violet',  color:'#cc44ff', glow:'#9900ff99' },
    { id:5, name:'Ember',   color:'#ff6600', glow:'#ff440099' },
    { id:6, name:'Arctic',  color:'#aaeeff', glow:'#88ddff99' },
    { id:7, name:'Rose',    color:'#ff88cc', glow:'#ff66aa99' },
  ];

  const WAGER_OPTIONS = [50, 100, 250, 500];
  const BALANCE_KEY   = 'mr_balance';
  const START_BALANCE = 1000;
  const TOURNAMENT_ROUNDS = 3;

  const W        = 400;   // canvas width (fitted to 420px popup)
  const H        = 3200;  // total track height
  const R        = 11;    // marble radius
  const VH       = 560;   // visible canvas height (viewport)
  const FINISH_Y = 2400;

  /* ── State ───────────────────────────────────────────────────────────── */
  let paneEl   = null;
  let balance  = START_BALANCE;
  let selected = null;
  let wager    = 100;
  let phase    = 'pick';   // pick | race | result
  let raceMode    = 'single';  // single | tournament
  let tourneyRound = 0;        // current round (1-based) when in tournament
  let tourneyWins  = 0;        // wins so far this tournament

  // Race state
  let canvasEl  = null;
  let rafId     = null;
  let track     = null;
  let marbles   = [];
  let camY      = 0;
  let positions = [];
  let progress  = 0;

  /* ── Storage ─────────────────────────────────────────────────────────── */
  async function loadBalance() {
    const saved = await Storage.load(BALANCE_KEY);
    balance = (saved !== null && Number.isFinite(saved)) ? saved : START_BALANCE;
  }
  function saveBalance() { Storage.saveLazy(BALANCE_KEY, balance); }

  /* ═══════════════════════════════════════════════════════════════════════
     TRACK BUILDER — ported verbatim from MarbleRun.jsx, W adjusted to 400
  ═══════════════════════════════════════════════════════════════════════ */
  function createTrackParts() {
    return {
      segments: [],
      pegs: [],
      boosts: [],
      funnels: [],
      loops: [],
      domes: [],
    };
  }

  function addWall(parts, x1, y1, x2, y2, type = 'wall') {
    parts.segments.push({ x1, y1, x2, y2, type });
  }

  function addStartChute(parts) {
    addWall(parts, W / 2 - 60, 40, W / 2 - 60, 200);
    addWall(parts, W / 2 + 60, 40, W / 2 + 60, 200);
    addWall(parts, W / 2 - 60, 200, 60, 360, 'ramp');
    addWall(parts, W / 2 + 60, 200, W - 60, 360, 'ramp');
  }

  function addSpeedZone(parts) {
    for (let i = 0; i < 3; i++) {
      parts.boosts.push({ x: 60 + i * 100, y: 375, w: 70, h: 16, label: 'BOOST' });
    }
    addWall(parts, 30, 480, W - 30, 480, 'floor');
  }

  function addCurvesZone(parts) {
    for (let a = 0; a <= 60; a += 6) {
      const rad = a * Math.PI / 180;
      const nextRad = rad + 0.1;
      const r2 = 170;
      addWall(
        parts,
        W / 2 - r2 * Math.cos(rad * 0.9) + r2 * Math.cos(nextRad * 0.9),
        600 + r2 * Math.sin(rad) - r2 * Math.sin(nextRad),
        W / 2 - r2 * Math.cos(nextRad * 0.9),
        600 + r2 * Math.sin(nextRad),
        'curve'
      );
    }
    addWall(parts, 30, 720, W - 30, 720, 'floor');
  }

  function addPlinkoZone(parts, rows, startX, startY, rowGap, colGap, big = false) {
    for (let row = 0; row < rows; row++) {
      const evenRow = row % 2 === 0;
      const cols = evenRow ? 5 : 4;
      const offsetX = evenRow ? 0 : 28;
      for (let c = 0; c < cols; c++) {
        parts.pegs.push({ x: startX + offsetX + c * colGap, y: startY + row * rowGap, big });
      }
    }
  }

  function addLoopSection(parts) {
    parts.loops.push(
      { cx: W / 2 - 65, cy: 1470, r: 70 },
      { cx: W / 2 + 80, cy: 1530, r: 60 }
    );
    addWall(parts, 30, 1620, W - 30, 1620, 'floor');
  }

  function addFinalSprint(parts) {
    addWall(parts, 80, 2080, 300, 2140, 'ramp');
    addWall(parts, 300, 2140, 80, 2200, 'ramp');
    addWall(parts, 80, 2200, W - 80, 2220, 'ramp');
  }

  function buildTrack() {
    const parts = createTrackParts();

    addStartChute(parts);
    addSpeedZone(parts);
    addCurvesZone(parts);
    parts.funnels.push({ x: W / 2, y: 770, topW: 300, botW: 55, h: 100 });
    addPlinkoZone(parts, 7, 55, 840, 36, 58);
    addWall(parts, 30, 1080, W - 30, 1080, 'floor');
    parts.domes.push({ cx: W / 2, cy: 1175, rx: 140, ry: 82 });
    parts.funnels.push({ x: W / 2, y: 1330, topW: 260, botW: 70, h: 100 });
    addLoopSection(parts);
    parts.domes.push({ cx: W / 2, cy: 1710, rx: 150, ry: 88 });
    addPlinkoZone(parts, 5, 40, 1820, 32, 68, true);
    addWall(parts, 30, 1960, W - 30, 1960, 'floor');
    parts.funnels.push({ x: W / 2, y: 2010, topW: 320, botW: 90, h: 100 });
    addFinalSprint(parts);
    addWall(parts, 30, 2400, W - 30, 2400, 'finish');

    return parts;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     DRAW — ported verbatim from MarbleRun.jsx, dimensions adjusted for W=400
  ═══════════════════════════════════════════════════════════════════════ */
  const SEGMENT_COLORS = {
    wall: 'rgba(0,200,255,0.7)',
    ramp: 'rgba(100,180,255,0.6)',
    curve: 'rgba(0,255,200,0.6)',
    floor: 'rgba(0,180,255,0.5)',
    finish: 'rgba(255,220,0,0.9)',
  };

  function isRecentlyHit(obj) {
    return Boolean(obj.hitTime && performance.now() - obj.hitTime < 180);
  }

  function drawBackground(ctx) {
    ctx.clearRect(0, 0, W, VH);
    const bg = ctx.createLinearGradient(0, 0, 0, VH);
    bg.addColorStop(0, '#050818');
    bg.addColorStop(1, '#0a0f2e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, VH);
  }

  function drawGrid(ctx) {
    ctx.strokeStyle = 'rgba(0,200,255,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, VH);
      ctx.stroke();
    }
    for (let y = 0; y < VH; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }

  function drawBoost(ctx, b) {
    const hit = isRecentlyHit(b);
    const grad = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
    grad.addColorStop(0, hit ? 'rgba(150,255,220,0.95)' : 'rgba(0,255,150,0.7)');
    grad.addColorStop(1, hit ? 'rgba(150,230,255,0.95)' : 'rgba(0,200,255,0.7)');
    ctx.fillStyle = grad;
    ctx.shadowColor = '#00ffaa';
    ctx.shadowBlur = hit ? 22 : 12;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.shadowBlur = 0;
    ctx.fillStyle = hit ? '#ffffff' : '#00ffcc';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('▶▶ BOOST', b.x + b.w / 2, b.y + 11);
  }

  function drawSegment(ctx, seg) {
    ctx.beginPath();
    ctx.moveTo(seg.x1, seg.y1);
    ctx.lineTo(seg.x2, seg.y2);
    ctx.strokeStyle = SEGMENT_COLORS[seg.type] || 'rgba(0,200,255,0.6)';
    ctx.lineWidth = seg.type === 'finish' ? 4 : 2.5;
    ctx.shadowColor = seg.type === 'finish' ? '#ffdd00' : '#00aaff';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function drawPeg(ctx, p) {
    const hit = isRecentlyHit(p);
    const pr = (p.big ? 7 : 5) + (hit ? 3 : 0);
    ctx.beginPath();
    ctx.arc(p.x, p.y, pr, 0, Math.PI * 2);
    ctx.fillStyle = hit ? '#ffffff' : '#00ccff';
    ctx.shadowColor = hit ? '#ffffff' : '#00aaff';
    ctx.shadowBlur = hit ? 22 : 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawFunnel(ctx, f) {
    const hit = isRecentlyHit(f);
    ctx.beginPath();
    ctx.moveTo(f.x - f.topW / 2, f.y - f.h / 2);
    ctx.lineTo(f.x - f.botW / 2, f.y + f.h / 2);
    ctx.lineTo(f.x + f.botW / 2, f.y + f.h / 2);
    ctx.lineTo(f.x + f.topW / 2, f.y - f.h / 2);
    ctx.closePath();
    ctx.fillStyle = hit ? 'rgba(0,200,255,0.16)' : 'rgba(0,150,255,0.08)';
    ctx.strokeStyle = hit ? 'rgba(120,230,255,0.9)' : 'rgba(0,200,255,0.4)';
    ctx.lineWidth = hit ? 2.5 : 1.5;
    if (hit) {
      ctx.shadowColor = '#00ddff';
      ctx.shadowBlur = 14;
    }
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function drawDome(ctx, d) {
    const hit = isRecentlyHit(d);
    ctx.beginPath();
    ctx.ellipse(d.cx, d.cy, d.rx, d.ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = hit ? 'rgba(130,30,255,0.13)' : 'rgba(100,0,255,0.07)';
    ctx.strokeStyle = hit ? 'rgba(200,120,255,0.85)' : 'rgba(150,50,255,0.5)';
    ctx.lineWidth = hit ? 3 : 2;
    if (hit) {
      ctx.shadowColor = '#cc66ff';
      ctx.shadowBlur = 16;
    }
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    drawDomeHole(ctx, d, hit);
  }

  function drawDomeHole(ctx, d, hit) {
    ctx.beginPath();
    ctx.arc(d.cx, d.cy, hit ? 19 : 16, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeStyle = hit ? 'rgba(230,170,255,1)' : 'rgba(200,100,255,0.8)';
    ctx.lineWidth = hit ? 3 : 2;
    if (hit) {
      ctx.shadowColor = '#dd99ff';
      ctx.shadowBlur = 12;
    }
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function drawLoop(ctx, l) {
    const hit = isRecentlyHit(l);
    ctx.beginPath();
    ctx.arc(l.cx, l.cy, l.r, 0, Math.PI * 2);
    ctx.fillStyle = hit ? 'rgba(0,255,180,0.12)' : 'rgba(0,255,150,0.05)';
    ctx.strokeStyle = hit ? 'rgba(120,255,220,0.95)' : 'rgba(0,255,180,0.5)';
    ctx.lineWidth = hit ? 3.5 : 2;
    if (hit) {
      ctx.shadowColor = '#33ffcc';
      ctx.shadowBlur = 16;
    }
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function drawFinishLabel(ctx) {
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffdd00';
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 15;
    ctx.fillText('⚑  FINISH  ⚑', W / 2, 2390);
    ctx.shadowBlur = 0;
  }

  function drawTrail(ctx, m) {
    if (!m.trail) return;
    m.trail.forEach((pt, ti) => {
      const alpha = (ti / m.trail.length) * 0.5;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, R * (ti / m.trail.length), 0, Math.PI * 2);
      ctx.fillStyle = m.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.fill();
    });
  }

  function drawMarbleBody(ctx, m) {
    const grad = ctx.createRadialGradient(m.x - 3, m.y - 3, 2, m.x, m.y, R);
    grad.addColorStop(0, '#ffffff88');
    grad.addColorStop(0.4, m.color);
    grad.addColorStop(1, '#00000088');
    ctx.beginPath();
    ctx.arc(m.x, m.y, R, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.shadowColor = m.color;
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawRankBadge(ctx, marblesArr, m) {
    const rank = marblesArr.filter(o => o.y > m.y).length + 1;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(rank, m.x, m.y - R - 3);
  }

  function drawTrackItems(ctx, trackData, vis) {
    trackData.boosts.filter(b => vis(b.y)).forEach(b => drawBoost(ctx, b));
    trackData.segments.filter(seg => vis((seg.y1 + seg.y2) / 2)).forEach(seg => drawSegment(ctx, seg));
    trackData.pegs.filter(p => vis(p.y)).forEach(p => drawPeg(ctx, p));
    trackData.funnels.filter(f => vis(f.y)).forEach(f => drawFunnel(ctx, f));
    trackData.domes.filter(d => vis(d.cy)).forEach(d => drawDome(ctx, d));
    trackData.loops.filter(l => vis(l.cy)).forEach(l => drawLoop(ctx, l));
    if (vis(2400)) drawFinishLabel(ctx);
  }

  function drawMarbles(ctx, marblesArr, vis) {
    marblesArr.filter(m => vis(m.y)).forEach(m => {
      drawTrail(ctx, m);
      drawMarbleBody(ctx, m);
      drawRankBadge(ctx, marblesArr, m);
    });
  }

  function draw(ctx, marblesArr, trackData, scrollY) {
    drawBackground(ctx);
    drawGrid(ctx);

    ctx.save();
    ctx.translate(0, -scrollY);
    const vis = y => y >= scrollY - 50 && y <= scrollY + VH + 50;
    drawTrackItems(ctx, trackData, vis);
    drawMarbles(ctx, marblesArr, vis);
    ctx.restore();
  }

  /* 
/* ═══════════════════════════════════════════════════════════════════════
     PHYSICS — Phase 4
  ═══════════════════════════════════════════════════════════════════════ */
  const GRAVITY   = 0.45;
  const MAX_VY    = 11;
  const MAX_VX    = 7;
  const BOUNCE    = 0.5;
  const FRICTION  = 0.995;
  const SUBSTEPS  = 2;

  function closestPointOnSegment(px,py,x1,y1,x2,y2){
    const dx=x2-x1, dy=y2-y1;
    const lenSq=dx*dx+dy*dy;
    let t = lenSq>0 ? ((px-x1)*dx+(py-y1)*dy)/lenSq : 0;
    t = Math.max(0, Math.min(1,t));
    return {x:x1+t*dx, y:y1+t*dy};
  }

  function resolveWallCollision(m,x1,y1,x2,y2,obj){
    const cp = closestPointOnSegment(m.x,m.y,x1,y1,x2,y2);
    const dx=m.x-cp.x, dy=m.y-cp.y;
    const dist=Math.hypot(dx,dy);
    if (dist<R && dist>0.001){
      const nx=dx/dist, ny=dy/dist;
      m.x += nx*(R-dist);
      m.y += ny*(R-dist);
      const dot=m.vx*nx+m.vy*ny;
      if (dot<0){
        m.vx -= (1+BOUNCE)*dot*nx;
        m.vy -= (1+BOUNCE)*dot*ny;
      }
      if (obj) obj.hitTime = performance.now();
    }
  }

  function resolveCircleObstacle(m,cx,cy,cr,obj){
    const dx=m.x-cx, dy=m.y-cy;
    const dist=Math.hypot(dx,dy);
    const minDist=cr+R;
    if (dist<minDist && dist>0.001){
      const nx=dx/dist, ny=dy/dist;
      m.x += nx*(minDist-dist);
      m.y += ny*(minDist-dist);
      const dot=m.vx*nx+m.vy*ny;
      if (dot<0){
        m.vx -= (1+BOUNCE)*dot*nx;
        m.vy -= (1+BOUNCE)*dot*ny;
      }
      m.vx += (randomUnit() - 0.5)*0.6;
      if (obj) obj.hitTime = performance.now();
    }
  }

  function resolveBoost(m,b){
    if (m.x>=b.x && m.x<=b.x+b.w && m.y>=b.y && m.y<=b.y+b.h){
      m.vy = Math.min(m.vy+0.9, MAX_VY+4);
      b.hitTime = performance.now();
    }
  }

  function resolveFunnel(m,f){
    const top=f.y-f.h/2, bot=f.y+f.h/2;
    if (m.y<top-R || m.y>bot+R) return;
    resolveWallCollision(m, f.x-f.topW/2, top, f.x-f.botW/2, bot, f);
    resolveWallCollision(m, f.x+f.topW/2, top, f.x+f.botW/2, bot, f);
  }

  function resolveDome(m,d){
    if (m.y<d.cy-d.ry-R || m.y>d.cy+d.ry+R) return;
    const u=(m.x-d.cx)/d.rx, v=(m.y-d.cy)/d.ry;
    const ellDist=Math.hypot(u,v);
    const rawDist=Math.hypot(m.x-d.cx, m.y-d.cy);
    if (ellDist<1 && rawDist>16+R){
      m.vx += (d.cx-m.x)*0.0025;
      d.hitTime = performance.now();
    }
  }

  function applyVelocity(m) {
    m.vy = Math.min(m.vy + GRAVITY, MAX_VY);
    m.vx = Math.max(-MAX_VX, Math.min(MAX_VX, m.vx * FRICTION));
    m.x += m.vx;
    m.y += m.vy;
  }

  function resolveSideWalls(m) {
    if (m.x < R + 20) {
      m.x = R + 20;
      m.vx = Math.abs(m.vx) * BOUNCE;
    }
    if (m.x > W - R - 20) {
      m.x = W - R - 20;
      m.vx = -Math.abs(m.vx) * BOUNCE;
    }
  }

  function resolveSegmentCollisions(m) {
    track.segments
      .filter(seg => seg.type !== 'floor' && seg.type !== 'finish')
      .forEach(seg => resolveWallCollision(m, seg.x1, seg.y1, seg.x2, seg.y2));
  }

  function resolveObstacleCollisions(m) {
    track.pegs.forEach(p => resolveCircleObstacle(m, p.x, p.y, p.big ? 7 : 5, p));
    track.boosts.forEach(b => resolveBoost(m, b));
    track.funnels.forEach(f => resolveFunnel(m, f));
    track.domes.forEach(d => resolveDome(m, d));
    track.loops.forEach(l => resolveCircleObstacle(m, l.cx, l.cy, l.r, l));
  }

  function updateTrail(m) {
    m.trail.push({ x: m.x, y: m.y });
    if (m.trail.length > 8) m.trail.shift();
  }

  function finishMarbleIfNeeded(m) {
    if (m.finished || m.y < FINISH_Y) return;
    m.finished = true;
    m.finishTime = performance.now();
    m.vy = 0;
    m.vx = 0;
  }

  function applyPhysics(m) {
    if (m.finished) return;
    applyVelocity(m);
    resolveSideWalls(m);
    resolveSegmentCollisions(m);
    resolveObstacleCollisions(m);
    updateTrail(m);
    finishMarbleIfNeeded(m);
  }

  function computeStandings(){
    positions = marbles.slice().sort((a,b)=>{
      if (a.finished && b.finished) return a.finishTime-b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.y-a.y;
    });
  }

  function updateRaceProgress(leader) {
    progress = Math.min(100, (leader.y / FINISH_Y) * 100);
  }

  function updateCamera(leader) {
    const targetCam = Math.max(0, Math.min(H - VH, leader.y - VH * 0.4));
    camY += (targetCam - camY) * 0.12;
  }

  function stepPhysics() {
    for (let s = 0; s < SUBSTEPS; s++) {
      marbles.forEach(applyPhysics);
    }
  }

  function gameLoop() {
    if (phase !== 'race') return;
    stepPhysics();
    computeStandings();

    const leader = positions[0];
    updateRaceProgress(leader);
    updateCamera(leader);

    draw(canvasEl.getContext('2d'), marbles, track, camY);
    updateHUD();

    if (marbles.every(m => m.finished)) {
      finishRace();
      return;
    }
    rafId = requestAnimationFrame(gameLoop);
  }

  function finishRace(){
    phase = 'result';
    cancelAnimationFrame(rafId);
    buildResultScreen();
  }

  /* ═══════════════════════════════════════════════════════════════════════
     RESULT SCREEN — Phase 5
  ═══════════════════════════════════════════════════════════════════════ */
  function resultBannerStyle(isWin) {
    const color = isWin ? '#00ffaa' : '#ff3366';
    return `color:${color};border-color:${color};`;
  }

  function tournamentBanner(tourneyOver, isChampion) {
    if (!tourneyOver) return '';
    const color = isChampion ? '#ffcc00' : '#ff3366';
    const text = isChampion
      ? '🏆 TOURNAMENT CHAMPION!'
      : `TOURNAMENT COMPLETE — ${tourneyWins}/${TOURNAMENT_ROUNDS}`;
    return `<div class="mr-result-banner" style="color:${color};border-color:${color};">${text}</div>`;
  }

  function roundLabel(inTourney) {
    if (!inTourney) return '';
    return `<div class="mr-section-label">ROUND ${tourneyRound} / ${TOURNAMENT_ROUNDS} — WINS: ${tourneyWins}</div>`;
  }

  function resultPayoutHtml(won, payout) {
    const color = won ? '#ffcc00' : '#ff6666';
    const amount = won ? `+${payout.toLocaleString()}` : `-${wager.toLocaleString()}`;
    return `<div class="mr-result-payout" style="color:${color};">${amount} credits</div>`;
  }

  function actionButtonHtml(inTourney, tourneyOver) {
    const nextRound = inTourney && !tourneyOver;
    const extraClass = nextRound ? ' mr-next-round-btn' : '';
    const label = nextRound ? '▶  NEXT ROUND' : '▶  PLAY AGAIN';
    return `<button class="mr-start-btn mr-play-again-btn${extraClass}">${label}</button>`;
  }

  function standingsHtml() {
    return positions.map((m, i) => {
      const current = m.id === selected ? 'mr-standing-mine' : '';
      const rowStyle = m.id === selected ? `border-color:${m.color};color:${m.color};` : '';
      return `
            <div class="mr-standing-row ${current}" style="${rowStyle}">
              <span class="mr-standing-rank">#${i + 1}</span>
              <span class="mr-standing-name">● ${m.name}</span>
            </div>
          `;
    }).join('');
  }

  function bindResultAction(inTourney, tourneyOver) {
    if (inTourney && !tourneyOver) {
      paneEl.querySelector('.mr-next-round-btn').addEventListener('click', launchRace);
      return;
    }
    paneEl.querySelector('.mr-play-again-btn').addEventListener('click', () => {
      phase    = 'pick';
      selected = null;
      buildPickScreen();
    });
  }

  function buildResultScreen() {
    const sel  = MARBLES.find(m => m.id === selected);
    const rank = positions.findIndex(p => p.id === selected) + 1;
    const won  = rank === 1;
    const payout = won ? wager * 3 : 0;

    if (won) {
      balance += payout;
      saveBalance();
    }

    const inTourney   = raceMode === 'tournament';
    if (inTourney && won) tourneyWins += 1;
    const tourneyOver  = inTourney && tourneyRound >= TOURNAMENT_ROUNDS;
    const isChampion   = tourneyOver && tourneyWins > TOURNAMENT_ROUNDS / 2;

    paneEl.innerHTML = `
      <div class="mr-wrap mr-wrap-result">

        ${roundLabel(inTourney)}
        <div class="mr-result-banner" style="${resultBannerStyle(won)}">
          ${won ? '🏆 YOU WIN!' : '✕ YOU LOSE'}
        </div>
        <div class="mr-result-sub" style="color:${sel.color};">
          ● ${sel.name.toUpperCase()} finished #${rank}
        </div>
        ${resultPayoutHtml(won, payout)}
        <div class="mr-balance">💎 ${balance.toLocaleString()} credits</div>
        ${tournamentBanner(tourneyOver, isChampion)}

        <div class="mr-section-label">FINAL STANDINGS</div>
        <div class="mr-standings">${standingsHtml()}</div>

        ${actionButtonHtml(inTourney, tourneyOver)}
      </div>
    `;

    bindResultAction(inTourney, tourneyOver);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     RACE SCREEN
  ═══════════════════════════════════════════════════════════════════════ */
  function positionChipStyle(m) {
    if (m.id !== selected) return '';
    return `background:${m.color}22;border-color:${m.color};color:${m.color};`;
  }

  function positionChipHtml(m) {
    const mineClass = m.id === selected ? 'mr-pos-mine' : '';
    return `
            <div class="mr-pos-chip ${mineClass}"
                 data-marble="${m.id}"
                 style="${positionChipStyle(m)}">
              #1 ${m.name}
            </div>
          `;
  }

  function buildRaceScreen() {
    const sel = MARBLES.find(m => m.id === selected);

    paneEl.innerHTML = `
      <div class="mr-wrap mr-wrap-race">

        <!-- HUD bar -->
        <div class="mr-hud">
          <div class="mr-hud-marble" style="border-color:${sel.color};color:${sel.color};">
            ● ${sel.name.toUpperCase()}
          </div>
          <div class="mr-progress-bar">
            <div class="mr-progress-fill" style="width:0%"></div>
          </div>
          <div class="mr-progress-pct">0%</div>
        </div>

        <!-- Position chips -->
        <div class="mr-positions">
          ${MARBLES.map(positionChipHtml).join('')}
        </div>

        <!-- Canvas viewport -->
        <div class="mr-canvas-wrap">
          <canvas class="mr-canvas" width="${W}" height="${VH}"></canvas>
          <div class="mr-live-badge">LIVE</div>
        </div>

      </div>
    `;

    canvasEl = paneEl.querySelector('.mr-canvas');
    draw(canvasEl.getContext('2d'), marbles, track, 0);
  }

  function updateHUD() {
    const fill = paneEl.querySelector('.mr-progress-fill');
    const pct  = paneEl.querySelector('.mr-progress-pct');
    if (fill) fill.style.width = `${progress}%`;
    if (pct)  pct.textContent  = `${Math.round(progress)}%`;

    // Update position chips
    positions.forEach((p, i) => {
      const chip = paneEl.querySelector(`.mr-pos-chip[data-marble="${p.id}"]`);
      if (chip) chip.textContent = `#${i+1} ${p.name}`;
    });
  }

  /* ── startRace — transitions pick → race, spawns static marbles ──────── */
 function raceStartX(i) {
    return W / 2 + (i - MARBLES.length / 2) * 22 + (randomUnit() - 0.5) * 8;
  }

  function createRaceMarble(cfg, i) {
    return {
      ...cfg,
      x: raceStartX(i),
      y: 60,
      vx: (randomUnit() - 0.5) * 1.2,
      vy: 0,
      finished: false,
      finishTime: null,
      trail: [],
    };
  }

  function resetRaceProgress() {
    camY = 0;
    progress = 0;
    positions = MARBLES.map(m => ({ id: m.id, name: m.name, color: m.color }));
  }

  function chargeRaceEntry() {
    balance -= wager;
    saveBalance();
  }

  function startRace() {
    if (selected === null || balance < wager) return;
    if (raceMode === 'tournament') tourneyRound += 1;

    chargeRaceEntry();
    marbles = MARBLES.map(createRaceMarble);
    resetRaceProgress();
    phase = 'race';
    buildRaceScreen();
  }

  function launchRace() {
    if (selected === null || balance < wager) return;
    startRace();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(gameLoop);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     PICK SCREEN
  ═══════════════════════════════════════════════════════════════════════ */
  function renderBalance() {
    const el = paneEl.querySelector('.mr-balance');
    if (el) el.textContent = `💎 ${balance.toLocaleString()} credits`;
  }

  function claimTestCredits() {
    balance += 500;
    saveBalance();
    renderBalance();
    renderStartBtn();
  }

  function cardBackground(m, selectedCard) {
    if (!selectedCard) return 'rgba(0,30,60,0.6)';
    return `radial-gradient(circle,${m.color}33,${m.color}11)`;
  }

  function renderMarbles() {
    MARBLES.forEach(m => {
      const card = paneEl.querySelector(`.mr-marble-card[data-id="${m.id}"]`);
      if (!card) return;
      const on = selected === m.id;
      card.style.borderColor = on ? m.color            : 'rgba(0,150,255,0.2)';
      card.style.boxShadow   = on ? `0 0 18px ${m.color}88` : 'none';
      card.style.background  = cardBackground(m, on);
      const label = card.querySelector('.mr-marble-name');
      if (label) label.style.color = on ? m.color : '#88aacc';
    });
  }

  function renderWager() {
    WAGER_OPTIONS.forEach(v => {
      const btn = paneEl.querySelector(`.mr-wager-btn[data-wager="${v}"]`);
      if (btn) btn.classList.toggle('mr-wager-active', wager === v);
    });
  }

  function renderMode() {
    paneEl.querySelectorAll('.mr-mode-btn').forEach(btn => {
      btn.classList.toggle('mr-wager-active', btn.dataset.mode === raceMode);
    });
  }

  function startButtonText(canStart) {
    if (selected === null) return '— PICK A MARBLE —';
    if (!canStart) return '— INSUFFICIENT CREDITS —';
    return '▶  START RACE';
  }

  function renderStartBtn() {
    const btn = paneEl.querySelector('.mr-start-btn');
    if (!btn) return;
    const canStart = selected !== null && balance >= wager;
    btn.disabled = !canStart;
    btn.classList.toggle('mr-start-ready', canStart);
    btn.textContent = startButtonText(canStart);
  }

  function raceModeButtonsHtml() {
    return `
          <button class="mr-wager-btn mr-mode-btn" data-mode="single">SINGLE RACE</button>
          <button class="mr-wager-btn mr-mode-btn" data-mode="tournament">TOURNAMENT (BO3)</button>
        `;
  }

  function marbleCardHtml(m) {
    return `
            <div class="mr-marble-card" data-id="${m.id}" style="border-color:rgba(0,150,255,0.2);">
              <div class="mr-marble-ball"
                   style="background:radial-gradient(circle at 35% 35%,#fff8,${m.color},#0008);
                          box-shadow:0 0 12px ${m.color};"></div>
              <div class="mr-marble-name" style="color:#88aacc;">${m.name.toUpperCase()}</div>
            </div>
          `;
  }

  function wagerButtonHtml(value) {
    return `<button class="mr-wager-btn" data-wager="${value}">${value}</button>`;
  }

  function pickScreenHtml() {
    return `
      <div class="mr-wrap">
        <div class="mr-header">
          <div class="mr-title">MARBLE RUN</div>
          <div class="mr-subtitle">HOLOGRAPHIC RACING LEAGUE</div>
          <div class="mr-balance">💎 ${balance.toLocaleString()} credits</div>
          <button class="mr-claim-btn" style="margin-top:4px;padding:3px 10px;background:#1a2a1a;border:1px solid var(--green);color:var(--green);font-family:var(--font);font-size:10px;border-radius:4px;cursor:pointer;">+500 TEST CREDITS</button>
        </div>
        <div class="mr-section-label">RACE MODE</div>
        <div class="mr-wager-row">${raceModeButtonsHtml()}</div>
        <div class="mr-section-label">SELECT YOUR MARBLE</div>
        <div class="mr-marble-grid">${MARBLES.map(marbleCardHtml).join('')}</div>
        <div class="mr-wager-box">
          <div class="mr-section-label">WAGER <span class="mr-wager-note">(3× on win)</span></div>
          <div class="mr-wager-row">${WAGER_OPTIONS.map(wagerButtonHtml).join('')}</div>
        </div>
        <button class="mr-start-btn" disabled>— PICK A MARBLE —</button>
      </div>
    `;
  }

  function bindMarbleSelection() {
    paneEl.querySelectorAll('.mr-marble-card').forEach(card => {
      card.addEventListener('click', () => {
        selected = Number.parseInt(card.dataset.id, 10);
        renderMarbles();
        renderStartBtn();
      });
    });
  }

  function bindWagerSelection() {
    paneEl.querySelectorAll('.mr-wager-btn[data-wager]').forEach(btn => {
      btn.addEventListener('click', () => {
        wager = Number.parseInt(btn.dataset.wager, 10);
        renderWager();
        renderStartBtn();
      });
    });
  }

  function bindModeSelection() {
    paneEl.querySelectorAll('.mr-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        raceMode = btn.dataset.mode;
        renderMode();
        renderStartBtn();
      });
    });
  }

  function bindPickScreenEvents() {
    paneEl.querySelector('.mr-claim-btn').addEventListener('click', claimTestCredits);
    paneEl.querySelector('.mr-start-btn').addEventListener('click', launchRace);
    bindMarbleSelection();
    bindWagerSelection();
    bindModeSelection();
  }

  function buildPickScreen() {
    tourneyRound = 0;
    tourneyWins = 0;
    paneEl.innerHTML = pickScreenHtml();
    bindPickScreenEvents();
    renderWager();
    renderMode();
    renderStartBtn();
  }

  /* ── init ────────────────────────────────────────────────────────────── */
  async function init(pane) {
    paneEl   = pane;
    await loadBalance();
    track    = buildTrack();
    phase    = 'pick';
    selected = null;
    wager    = 100;
    buildPickScreen();
  }

  /* ── Public API ──────────────────────────────────────────────────────── */
  return {
    init,
    onKey() {},
  };

})();
