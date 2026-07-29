/* ═══════════════════════════════════════════════════════════════════════════
   TRAFFIC JAM  –  115 levels, easy → challenging
   Exports: GameTrafficJam
   PATCH v2: drag movement · level validation + skip · localStorage save ·
             level-select screen · back-to-menu button
═══════════════════════════════════════════════════════════════════════════ */
const GameTrafficJam = (() => {

  const COLORS = [
    '#e53935','#1e88e5','#43a047','#fb8c00','#8e24aa',
    '#00acc1','#f4511e','#fdd835','#6d4c41','#546e7a',
    '#ec407a','#26a69a','#7cb342','#5e35b1','#039be5',
  ];

  const LEVELS = [
    // ── EASY (1-30) ──
    { cars:[[0,0,'h',2,2,2],[1,1,'v',1,0,2],[2,2,'v',4,5,2],[3,3,'h',4,3,2]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'v',0,3,2],[2,2,'h',0,0,2],[3,3,'h',4,0,3],[4,4,'v',3,5,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'h',0,2,3],[2,2,'v',1,5,2],[3,3,'h',3,1,2],[4,4,'v',4,0,2]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'v',0,0,3],[2,2,'h',1,1,2],[3,3,'h',3,3,2],[4,4,'v',4,5,2],[5,5,'h',5,0,3]] },
    { cars:[[0,0,'h',2,2,2],[1,1,'h',1,2,2],[2,2,'v',3,2,2],[3,3,'h',0,3,2]] },
    { cars:[[0,0,'h',2,2,2],[1,1,'v',0,1,2],[2,2,'h',0,2,2],[3,3,'v',3,4,3],[4,4,'h',5,0,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'h',1,2,3],[2,2,'v',0,5,3],[3,3,'h',3,0,2],[4,4,'h',4,3,2],[5,5,'v',4,0,2]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'v',0,0,2],[2,2,'h',0,1,3],[3,3,'v',2,4,2],[4,4,'h',4,0,3],[5,5,'v',3,5,3]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'h',0,0,3],[2,2,'v',1,3,2],[3,3,'h',1,4,2],[4,4,'v',3,1,2],[5,5,'h',5,2,2]] },
    { cars:[[0,0,'h',2,2,2],[1,1,'v',0,4,3],[2,2,'h',0,0,2],[3,3,'v',1,0,2],[4,4,'h',3,1,3],[5,5,'v',4,5,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',0,2,2],[2,2,'h',1,3,2],[3,3,'v',2,5,2],[4,4,'h',4,1,2],[5,5,'v',3,0,3]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'h',0,0,3],[2,2,'v',1,5,2],[3,3,'h',3,0,2],[4,4,'v',4,3,2],[5,5,'h',5,4,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',0,3,3],[2,2,'h',0,0,2],[3,3,'h',1,4,2],[4,4,'v',3,0,2],[5,5,'h',4,1,3]] },
    { cars:[[0,0,'h',2,2,2],[1,1,'h',5,0,2],[2,2,'h',3,1,2],[3,3,'v',1,1,2]] },
    { cars:[[0,0,'h',2,2,2],[1,1,'v',0,0,2],[2,2,'v',4,4,2],[3,3,'h',4,1,2]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'v',0,0,3],[2,2,'h',0,1,2],[3,3,'v',0,3,2],[4,4,'h',3,2,2],[5,5,'v',4,4,2],[6,6,'h',5,0,3]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'h',1,2,2],[2,2,'v',0,4,2],[3,3,'v',2,5,2],[4,4,'h',3,1,3],[5,5,'v',4,0,2]] },
    { cars:[[0,0,'h',2,2,2],[1,1,'v',0,1,2],[2,2,'h',0,2,3],[3,3,'v',1,5,2],[4,4,'h',3,0,2],[5,5,'v',4,3,2],[6,6,'h',5,4,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'h',0,1,3],[2,2,'v',0,4,2],[3,3,'h',1,0,2],[4,4,'v',3,5,2],[5,5,'h',4,1,2]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'v',0,3,2],[2,2,'h',0,4,2],[3,3,'v',1,0,2],[4,4,'h',3,0,3],[5,5,'v',4,5,2],[6,6,'h',5,2,2]] },
    { cars:[[0,0,'h',2,2,2],[1,1,'v',2,0,2],[2,2,'h',4,1,2],[3,3,'v',3,3,2]] },
    { cars:[[0,0,'h',2,2,2],[1,1,'h',0,0,2],[2,2,'v',0,2,2],[3,3,'v',1,4,2],[4,4,'h',3,1,2],[5,5,'v',3,0,2],[6,6,'h',5,3,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'h',0,2,2],[2,2,'v',0,4,3],[3,3,'h',1,0,2],[4,4,'v',3,2,2],[5,5,'h',4,3,2],[6,6,'v',4,5,2]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'h',5,0,2],[2,2,'v',0,5,2],[3,3,'v',4,4,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',0,3,2],[2,2,'h',0,4,2],[3,3,'h',1,0,2],[4,4,'v',2,5,2],[5,5,'h',3,1,3],[6,6,'v',4,0,2]] },
    { cars:[[0,0,'h',2,2,2],[1,1,'h',0,0,3],[2,2,'v',0,3,2],[3,3,'v',1,5,2],[4,4,'h',3,0,2],[5,5,'v',3,2,2],[6,6,'h',5,3,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',0,2,2],[2,2,'h',0,3,2],[3,3,'v',0,5,3],[4,4,'h',1,0,2],[5,5,'v',3,1,3],[6,6,'h',4,3,2]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'h',0,0,2],[2,2,'v',0,2,2],[3,3,'h',1,3,2],[4,4,'v',1,5,2],[5,5,'h',3,0,3],[6,6,'v',4,4,2],[7,7,'h',5,1,2]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'h',3,1,3],[2,2,'h',0,2,2],[3,3,'h',3,4,2]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'v',4,4,2],[2,2,'h',3,0,2],[3,3,'v',0,1,2]] },
    // ── MEDIUM (31-70) ──
    { cars:[[0,0,'h',2,0,2],[1,1,'h',5,3,2],[2,2,'h',1,1,2],[3,3,'h',0,4,2],[4,4,'v',3,4,2],[5,5,'v',1,5,3],[6,6,'h',0,0,3],[7,7,'h',5,0,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',1,5,2],[2,2,'h',1,1,2],[3,3,'h',0,3,2],[4,4,'v',0,0,2],[5,5,'v',3,3,2],[6,6,'h',4,4,2],[7,7,'v',2,2,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'h',0,4,2],[2,2,'h',0,0,2],[3,3,'v',1,5,2],[4,4,'h',4,3,2],[5,5,'v',4,2,2],[6,6,'h',3,1,2],[7,7,'h',3,3,2]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'v',0,2,2],[2,2,'h',5,1,3],[3,3,'h',1,3,3],[4,4,'v',0,1,2],[5,5,'h',3,0,3],[6,6,'v',2,3,2],[7,7,'v',2,4,2],[8,8,'h',4,1,3]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',3,5,2],[2,2,'h',5,3,2],[3,3,'h',0,4,2],[4,4,'h',1,2,2],[5,5,'h',0,2,2],[6,6,'v',2,3,3],[7,7,'v',0,0,2]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'v',0,0,3],[2,2,'h',0,1,2],[3,3,'v',0,3,2],[4,4,'h',1,4,2],[5,5,'v',2,5,3],[6,6,'h',3,2,2],[7,7,'v',4,1,2],[8,8,'h',5,3,3]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'h',0,1,3],[2,2,'v',0,4,2],[3,3,'h',1,0,2],[4,4,'v',1,5,2],[5,5,'h',3,2,3],[6,6,'v',3,1,2],[7,7,'h',4,4,2],[8,8,'v',4,0,2]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'v',1,0,2],[2,2,'v',2,4,2],[3,3,'v',0,5,2],[4,4,'h',5,3,3],[5,5,'v',2,5,2],[6,6,'h',4,3,2],[7,7,'h',4,0,2],[8,8,'h',5,1,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',3,4,2],[2,2,'v',0,3,2],[3,3,'v',2,3,3],[4,4,'v',0,5,2],[5,5,'h',5,1,2],[6,6,'v',1,2,2],[7,7,'h',0,0,2],[8,8,'h',4,1,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',1,2,2],[2,2,'h',5,0,2],[3,3,'h',4,1,2],[4,4,'h',0,2,3],[5,5,'v',0,0,2],[6,6,'h',1,4,2]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'v',2,5,2],[2,2,'h',0,3,2],[3,3,'h',0,0,2],[4,4,'v',1,4,2],[5,5,'v',3,1,2],[6,6,'h',4,3,2],[7,7,'h',5,2,2],[8,8,'h',1,0,2]] },
    { cars:[[0,0,'h',2,2,2],[1,1,'v',1,5,2],[2,2,'v',2,1,3],[3,3,'v',3,5,3],[4,4,'v',4,2,2],[5,5,'h',3,2,2],[6,6,'v',4,3,2],[7,7,'v',0,0,2],[8,8,'v',0,4,3]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'h',0,2,3],[2,2,'v',0,5,2],[3,3,'h',1,0,2],[4,4,'v',2,2,2],[5,5,'h',3,3,2],[6,6,'v',3,1,3],[7,7,'h',4,4,2],[8,8,'v',5,3,1]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'v',0,0,3],[2,2,'h',0,1,2],[3,3,'v',0,3,2],[4,4,'h',1,4,2],[5,5,'v',2,5,2],[6,6,'h',3,0,2],[7,7,'v',3,2,3],[8,8,'h',4,3,2],[9,9,'v',5,5,1]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'v',4,4,2],[2,2,'v',4,1,2],[3,3,'h',0,3,2],[4,4,'v',0,5,2],[5,5,'h',5,2,2],[6,6,'h',3,2,2],[7,7,'v',3,5,2],[8,8,'v',2,4,2]] },
    { cars:[[0,0,'h',2,2,2],[1,1,'h',0,0,3],[2,2,'v',0,3,2],[3,3,'h',0,4,2],[4,4,'v',1,0,2],[5,5,'h',1,1,2],[6,6,'v',2,1,2],[7,7,'h',3,3,2],[8,8,'v',4,5,2],[9,9,'h',5,0,2]] },
    { cars:[[0,0,'h',2,2,2],[1,1,'h',1,0,3],[2,2,'v',1,4,2],[3,3,'h',0,2,2],[4,4,'h',3,0,2],[5,5,'h',0,4,2],[6,6,'h',4,2,2],[7,7,'h',5,1,2],[8,8,'v',1,5,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'h',1,4,2],[2,2,'v',2,2,2],[3,3,'h',0,1,2],[4,4,'v',0,0,2],[5,5,'v',1,3,2],[6,6,'h',3,4,2],[7,7,'v',3,3,3]] },
    { cars:[[0,0,'h',2,2,2],[1,1,'h',3,3,2],[2,2,'v',0,3,2],[3,3,'v',4,1,2],[4,4,'h',2,0,2],[5,5,'v',0,5,3],[6,6,'v',4,0,2],[7,7,'v',1,4,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',3,0,3],[2,2,'v',0,0,2],[3,3,'h',1,2,2],[4,4,'h',5,1,3],[5,5,'h',4,2,2],[6,6,'h',3,1,2],[7,7,'v',2,3,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',4,1,2],[2,2,'h',4,2,3],[3,3,'h',0,2,3],[4,4,'v',1,2,2],[5,5,'h',1,4,2],[6,6,'h',3,3,2]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'v',1,3,2],[2,2,'h',0,4,2],[3,3,'h',0,1,2],[4,4,'h',3,3,2],[5,5,'v',1,5,3],[6,6,'v',3,2,2]] },
    { cars:[[0,0,'h',2,2,2],[1,1,'v',4,1,2],[2,2,'h',1,0,2],[3,3,'h',0,3,2],[4,4,'h',4,4,2],[5,5,'h',2,0,2],[6,6,'v',3,0,3],[7,7,'v',2,4,2],[8,8,'v',2,5,2]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'h',4,4,2],[2,2,'v',2,5,2],[3,3,'h',0,3,2],[4,4,'v',0,0,3],[5,5,'v',3,1,2],[6,6,'v',1,3,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',4,2,2],[2,2,'v',1,5,2],[3,3,'v',3,3,2],[4,4,'h',3,0,2],[5,5,'h',1,0,2],[6,6,'v',2,2,2],[7,7,'h',3,4,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',2,3,3],[2,2,'h',0,4,2],[3,3,'v',4,2,2],[4,4,'h',4,4,2],[5,5,'v',1,5,2],[6,6,'v',3,1,2],[7,7,'h',0,0,2]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'h',0,3,2],[2,2,'v',4,5,2],[3,3,'h',5,2,2],[4,4,'v',3,2,2],[5,5,'h',1,1,2],[6,6,'v',2,5,2],[7,7,'v',2,3,3],[8,8,'h',0,0,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'h',5,2,2],[2,2,'v',0,4,3],[3,3,'v',0,0,2],[4,4,'v',3,1,2],[5,5,'h',0,1,2],[6,6,'v',3,0,2],[7,7,'h',1,2,2],[8,8,'v',3,2,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'h',5,1,3],[2,2,'h',4,2,2],[3,3,'v',0,2,2],[4,4,'v',2,4,3],[5,5,'h',3,2,2],[6,6,'h',4,0,2],[7,7,'v',1,5,3]] },
    { cars:[[0,0,'h',2,2,2],[1,1,'h',5,4,2],[2,2,'v',1,1,2],[3,3,'h',5,0,2],[4,4,'v',1,0,2],[5,5,'v',2,5,3],[6,6,'v',3,0,2],[7,7,'v',2,4,3],[8,8,'v',4,2,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',2,5,2],[2,2,'v',0,3,2],[3,3,'v',2,4,3],[4,4,'h',3,2,2],[5,5,'v',3,0,3],[6,6,'h',5,3,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'h',4,0,3],[2,2,'h',1,2,3],[3,3,'h',5,0,2],[4,4,'h',1,0,2],[5,5,'v',3,3,2],[6,6,'h',0,4,2],[7,7,'v',2,2,2]] },
    { cars:[[0,0,'h',2,2,2],[1,1,'h',4,4,2],[2,2,'h',1,4,2],[3,3,'v',2,4,2],[4,4,'h',1,1,2],[5,5,'v',3,0,2],[6,6,'h',4,1,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'h',0,3,2],[2,2,'h',5,2,3],[3,3,'h',4,3,2],[4,4,'v',2,4,2],[5,5,'v',0,0,2],[6,6,'h',1,2,2],[7,7,'v',2,5,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',3,0,3],[2,2,'v',3,5,3],[3,3,'v',1,2,2],[4,4,'v',2,4,2],[5,5,'v',0,0,2],[6,6,'h',5,1,3],[7,7,'v',1,3,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'h',0,1,2],[2,2,'v',2,5,2],[3,3,'h',1,4,2],[4,4,'h',4,4,2],[5,5,'h',5,1,2],[6,6,'v',1,2,2],[7,7,'v',3,2,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'h',5,3,2],[2,2,'h',1,2,2],[3,3,'h',3,3,2],[4,4,'h',1,0,2],[5,5,'v',3,5,2],[6,6,'v',2,2,2],[7,7,'h',0,1,2],[8,8,'v',4,2,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'h',4,3,3],[2,2,'h',0,2,2],[3,3,'h',1,1,3],[4,4,'v',0,4,2],[5,5,'v',2,3,2],[6,6,'h',3,1,2]] },
    { cars:[[0,0,'h',2,2,2],[1,1,'v',2,4,2],[2,2,'h',3,0,2],[3,3,'v',3,2,2],[4,4,'v',0,5,3],[5,5,'v',4,0,2],[6,6,'h',2,0,2],[7,7,'h',4,4,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',3,2,2],[2,2,'h',0,2,2],[3,3,'v',2,5,2],[4,4,'v',1,3,2],[5,5,'v',3,0,3],[6,6,'h',4,4,2],[7,7,'v',0,5,2],[8,8,'h',5,2,2]] },
    // ── HARD (71-100) ──
    { cars:[[0,0,'h',2,0,2],[1,1,'v',3,1,2],[2,2,'v',1,3,2],[3,3,'h',5,1,2],[4,4,'h',0,1,2],[5,5,'h',0,3,2],[6,6,'h',3,3,2],[7,7,'v',0,5,2],[8,8,'v',4,3,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'h',3,2,2],[2,2,'h',1,3,2],[3,3,'v',0,0,2],[4,4,'h',0,1,3],[5,5,'h',4,0,2],[6,6,'v',0,5,3],[7,7,'h',4,3,2],[8,8,'h',3,4,2]] },
    { cars:[[0,0,'h',2,2,2],[1,1,'v',2,5,3],[2,2,'v',2,4,2],[3,3,'h',0,2,2],[4,4,'h',0,4,2],[5,5,'v',4,4,2],[6,6,'h',4,2,2],[7,7,'h',3,0,2],[8,8,'h',5,0,2]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'v',0,5,2],[2,2,'v',2,0,2],[3,3,'v',0,0,2],[4,4,'h',5,4,2],[5,5,'h',0,3,2],[6,6,'v',2,5,3],[7,7,'h',5,1,2],[8,8,'v',1,4,3]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',0,5,2],[2,2,'v',0,1,2],[3,3,'v',3,4,2],[4,4,'v',3,0,2],[5,5,'v',4,1,2],[6,6,'h',3,2,2],[7,7,'v',0,3,3],[8,8,'v',1,2,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'h',5,3,3],[2,2,'v',1,5,2],[3,3,'h',0,3,2],[4,4,'v',2,2,3],[5,5,'h',0,0,3],[6,6,'h',3,3,2],[7,7,'h',3,0,2],[8,8,'v',1,3,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',3,3,2],[2,2,'h',3,0,2],[3,3,'h',5,2,3],[4,4,'v',2,4,3],[5,5,'h',0,0,3],[6,6,'v',1,2,2],[7,7,'v',1,3,2],[8,8,'v',0,5,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',1,4,2],[2,2,'v',4,2,2],[3,3,'v',2,3,2],[4,4,'h',0,2,2],[5,5,'v',4,3,2],[6,6,'v',0,5,2],[7,7,'v',4,4,2],[8,8,'v',2,5,2]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'h',5,2,2],[2,2,'v',0,3,3],[3,3,'h',4,0,2],[4,4,'v',2,5,2],[5,5,'h',5,4,2],[6,6,'h',3,2,2],[7,7,'v',0,4,2],[8,8,'h',4,4,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',3,5,2],[2,2,'v',3,3,3],[3,3,'h',0,3,2],[4,4,'v',1,3,2],[5,5,'h',5,1,2],[6,6,'h',0,0,2],[7,7,'v',2,2,3],[8,8,'v',1,4,3]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',1,4,3],[2,2,'h',0,3,3],[3,3,'h',1,0,2],[4,4,'v',1,3,2],[5,5,'v',3,5,2],[6,6,'h',3,1,3],[7,7,'h',0,0,3],[8,8,'h',4,1,3]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'h',0,1,3],[2,2,'h',1,4,2],[3,3,'h',4,3,2],[4,4,'v',1,2,3],[5,5,'v',3,1,2],[6,6,'h',5,3,2],[7,7,'v',2,4,2],[8,8,'v',4,0,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',3,3,2],[2,2,'v',0,0,2],[3,3,'h',1,4,2],[4,4,'h',0,3,3],[5,5,'v',2,5,2],[6,6,'h',3,0,2],[7,7,'v',1,3,2],[8,8,'h',5,1,3]] },
    { cars:[[0,0,'h',2,2,2],[1,1,'v',0,4,3],[2,2,'v',3,1,2],[3,3,'h',4,2,3],[4,4,'h',1,1,3],[5,5,'h',5,4,2],[6,6,'h',3,3,2],[7,7,'h',0,1,2],[8,8,'v',3,5,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',0,1,2],[2,2,'v',1,3,2],[3,3,'h',4,3,3],[4,4,'v',2,2,2],[5,5,'v',3,1,2],[6,6,'v',0,0,2],[7,7,'v',1,5,3],[8,8,'v',3,0,2]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'v',3,5,2],[2,2,'v',3,2,2],[3,3,'v',1,4,2],[4,4,'v',4,1,2],[5,5,'v',3,0,3],[6,6,'h',0,2,2],[7,7,'v',1,3,3],[8,8,'h',4,3,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',2,2,2],[2,2,'v',2,3,2],[3,3,'v',1,4,3],[4,4,'v',1,5,2],[5,5,'h',1,2,2],[6,6,'h',1,0,2],[7,7,'h',0,2,3],[8,8,'h',5,4,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',1,3,3],[2,2,'h',3,4,2],[3,3,'h',5,1,2],[4,4,'v',1,2,2],[5,5,'h',4,2,3],[6,6,'h',5,4,2],[7,7,'v',1,5,2],[8,8,'h',0,4,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'h',0,1,3],[2,2,'h',5,2,2],[3,3,'h',4,0,2],[4,4,'h',3,3,2],[5,5,'v',0,4,3],[6,6,'v',3,2,2],[7,7,'v',0,0,2],[8,8,'v',0,5,2]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'h',5,2,2],[2,2,'v',2,4,2],[3,3,'v',1,3,3],[4,4,'v',2,5,2],[5,5,'v',3,0,2],[6,6,'h',4,2,3],[7,7,'h',3,1,2],[8,8,'h',0,1,2]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'v',4,0,2],[2,2,'h',5,2,2],[3,3,'h',0,4,2],[4,4,'h',3,2,2],[5,5,'v',0,2,2],[6,6,'h',4,3,3],[7,7,'v',1,4,2],[8,8,'h',3,4,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'h',1,0,2],[2,2,'h',0,4,2],[3,3,'v',1,5,3],[4,4,'h',0,1,2],[5,5,'h',1,2,2],[6,6,'v',2,2,3],[7,7,'h',5,1,3],[8,8,'v',4,0,2]] },
    { cars:[[0,0,'h',2,2,2],[1,1,'v',4,5,2],[2,2,'v',1,0,2],[3,3,'v',4,2,2],[4,4,'h',0,4,2],[5,5,'h',0,0,3],[6,6,'v',1,4,2],[7,7,'v',2,5,2],[8,8,'v',0,3,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',0,5,3],[2,2,'v',0,3,2],[3,3,'v',3,1,2],[4,4,'h',4,4,2],[5,5,'h',3,2,2],[6,6,'h',3,4,2],[7,7,'h',0,1,2],[8,8,'h',5,1,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',1,3,3],[2,2,'h',4,3,2],[3,3,'h',3,0,2],[4,4,'h',5,1,2],[5,5,'h',4,1,2],[6,6,'v',1,2,2],[7,7,'v',4,5,2],[8,8,'h',1,0,2]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'v',4,3,2],[2,2,'h',4,4,2],[3,3,'v',1,4,2],[4,4,'h',0,0,2],[5,5,'h',3,2,2],[6,6,'h',0,3,3],[7,7,'h',1,2,2],[8,8,'v',3,0,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'h',1,2,2],[2,2,'h',0,2,3],[3,3,'v',2,3,2],[4,4,'v',4,4,2],[5,5,'h',5,1,2],[6,6,'v',2,4,2],[7,7,'h',4,2,2],[8,8,'v',0,5,3]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'h',1,1,3],[2,2,'h',4,2,2],[3,3,'v',3,1,2],[4,4,'h',0,3,2],[5,5,'v',1,5,3],[6,6,'v',0,0,2],[7,7,'v',2,3,2],[8,8,'v',2,4,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'h',1,3,2],[2,2,'h',4,3,2],[3,3,'h',4,0,3],[4,4,'v',2,3,2],[5,5,'v',1,5,2],[6,6,'h',1,1,2],[7,7,'h',0,4,2],[8,8,'v',2,4,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',1,5,2],[2,2,'h',1,0,2],[3,3,'h',0,4,2],[4,4,'v',0,3,3],[5,5,'h',3,3,2],[6,6,'h',5,3,3],[7,7,'v',3,0,2],[8,8,'h',0,0,2]] },
    // ── EXPERT (101-115) ──
    { cars:[[0,0,'h',2,0,2],[1,1,'v',2,3,3],[2,2,'v',1,5,2],[3,3,'v',3,0,3],[4,4,'h',1,2,3],[5,5,'v',2,4,2],[6,6,'h',0,3,2],[7,7,'v',4,1,2],[8,8,'h',5,2,3],[9,9,'v',0,0,2],[10,10,'v',2,2,2],[11,11,'v',4,5,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',1,5,3],[2,2,'h',0,2,2],[3,3,'v',0,1,2],[4,4,'v',2,3,2],[5,5,'h',5,0,2],[6,6,'v',4,4,2],[7,7,'h',5,2,2],[8,8,'v',1,2,3],[9,9,'v',1,4,2],[10,10,'h',3,0,2],[11,11,'v',0,0,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',2,3,2],[2,2,'h',4,3,3],[3,3,'h',3,1,2],[4,4,'v',0,0,2],[5,5,'v',4,0,2],[6,6,'h',0,3,2],[7,7,'h',1,4,2],[8,8,'h',1,1,3],[9,9,'v',2,5,2],[10,10,'h',5,4,2],[11,11,'v',4,1,2]] },
    { cars:[[0,0,'h',2,2,2],[1,1,'v',1,4,2],[2,2,'h',0,0,2],[3,3,'v',4,2,2],[4,4,'v',2,1,2],[5,5,'v',4,4,2],[6,6,'h',0,4,2],[7,7,'h',3,3,2],[8,8,'v',0,3,2],[9,9,'v',3,5,2],[10,10,'h',1,1,2],[11,11,'v',4,0,2]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'h',1,2,2],[2,2,'h',3,1,2],[3,3,'v',3,3,2],[4,4,'h',5,4,2],[5,5,'v',0,4,3],[6,6,'v',1,0,2],[7,7,'h',5,2,2],[8,8,'v',2,5,3],[9,9,'v',3,0,3],[10,10,'h',4,1,2],[11,11,'v',0,1,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'h',0,3,3],[2,2,'v',1,2,2],[3,3,'h',3,1,3],[4,4,'v',2,5,2],[5,5,'h',5,4,2],[6,6,'h',4,1,2],[7,7,'h',0,0,3],[8,8,'h',1,0,2],[9,9,'h',1,4,2],[10,10,'h',4,3,2],[11,11,'h',5,1,3]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',4,1,2],[2,2,'v',1,5,2],[3,3,'h',5,3,2],[4,4,'h',1,2,2],[5,5,'v',2,3,2],[6,6,'v',3,0,2],[7,7,'v',4,5,2],[8,8,'v',2,4,2],[9,9,'h',0,4,2],[10,10,'h',4,3,2],[11,11,'v',0,0,2]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'h',3,3,2],[2,2,'h',5,0,2],[3,3,'v',1,3,2],[4,4,'v',4,5,2],[5,5,'v',1,4,2],[6,6,'v',4,4,2],[7,7,'v',2,5,2],[8,8,'h',3,0,2],[9,9,'h',4,2,2],[10,10,'h',0,4,2],[11,11,'h',0,1,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',3,3,2],[2,2,'h',3,0,2],[3,3,'v',0,5,2],[4,4,'h',5,1,2],[5,5,'v',2,5,2],[6,6,'v',4,4,2],[7,7,'h',1,3,2],[8,8,'v',1,2,3],[9,9,'h',0,0,2],[10,10,'v',2,4,2],[11,11,'v',4,0,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'h',1,2,3],[2,2,'h',4,1,2],[3,3,'h',4,4,2],[4,4,'v',0,0,2],[5,5,'v',1,5,2],[6,6,'h',0,1,2],[7,7,'h',5,3,2],[8,8,'h',0,3,2],[9,9,'h',3,0,3],[10,10,'v',2,3,3],[11,11,'v',2,4,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'v',3,2,3],[2,2,'h',1,2,2],[3,3,'h',0,3,2],[4,4,'v',2,4,3],[5,5,'v',0,5,2],[6,6,'v',4,0,2],[7,7,'v',0,1,2],[8,8,'v',3,1,2],[9,9,'v',2,5,2],[10,10,'v',2,3,2],[11,11,'h',5,3,2]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'v',3,2,2],[2,2,'h',4,3,3],[3,3,'h',5,0,2],[4,4,'v',1,3,2],[5,5,'v',0,4,2],[6,6,'v',2,4,2],[7,7,'h',5,4,2],[8,8,'v',2,0,2],[9,9,'v',2,5,2],[10,10,'v',0,1,2],[11,11,'v',0,5,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'h',1,4,2],[2,2,'v',2,4,2],[3,3,'h',5,4,2],[4,4,'v',0,1,2],[5,5,'h',4,0,2],[6,6,'v',2,2,2],[7,7,'h',4,3,2],[8,8,'v',2,5,2],[9,9,'h',0,2,2],[10,10,'h',1,2,2],[11,11,'h',5,1,2]] },
    { cars:[[0,0,'h',2,0,2],[1,1,'h',5,4,2],[2,2,'v',1,5,2],[3,3,'h',4,0,2],[4,4,'v',0,2,2],[5,5,'v',0,1,2],[6,6,'v',0,4,3],[7,7,'h',5,2,2],[8,8,'h',3,2,2],[9,9,'v',0,0,2],[10,10,'h',4,4,2],[11,11,'v',0,3,2]] },
    { cars:[[0,0,'h',2,1,2],[1,1,'h',4,2,2],[2,2,'v',2,4,2],[3,3,'h',0,4,2],[4,4,'v',3,1,3],[5,5,'h',5,4,2],[6,6,'v',0,3,3],[7,7,'h',0,1,2],[8,8,'v',4,0,2],[9,9,'h',3,2,2],[10,10,'v',1,0,2],[11,11,'h',1,1,2]] },
  ];

  const DIFF_LABELS = [
    'Easy','Easy','Easy','Easy','Easy','Easy','Easy','Easy','Easy','Easy',
    'Easy','Easy','Easy','Easy','Easy','Easy','Easy','Easy','Easy','Easy',
    'Easy','Easy','Easy','Easy','Easy','Easy','Easy','Easy','Easy','Easy',
    'Med','Med','Med','Med','Med','Med','Med','Med','Med','Med',
    'Med','Med','Med','Med','Med','Med','Med','Med','Med','Med',
    'Med','Med','Med','Med','Med','Med','Med','Med','Med','Med',
    'Med','Med','Med','Med','Med','Med','Med','Med','Med','Med',
    'Hard','Hard','Hard','Hard','Hard','Hard','Hard','Hard','Hard','Hard',
    'Hard','Hard','Hard','Hard','Hard','Hard','Hard','Hard','Hard','Hard',
    'Hard','Hard','Hard','Hard','Hard','Hard','Hard','Hard','Hard','Hard',
    'Expert','Expert','Expert','Expert','Expert','Expert','Expert','Expert','Expert','Expert',
    'Expert','Expert','Expert','Expert','Expert',
  ];

  const CELL = 54;
  const BOARD_SIZE = 6;
  const EXIT_ROW = 2;
  const EMPTY_CELL = -1;
  const SAVE_KEY = 'tj_save_v1';

  /* ── State ───────────────────────────────────────────────────────────── */
  let levelIdx    = 0;
  let cars        = [];
  let selected    = -1;
  let moveCount   = 0;
  let bestScores  = {};
  let unlockedUpTo = 0;
  let container   = null;
  let won         = false;
  let screen      = 'select'; // 'select' | 'game'

  /* ── Drag state ──────────────────────────────────────────────────────── */
  let drag = null;
  // drag = { carIdx, orient, startX, startY, startCol, startRow, moved }

  /* ══════════════════════════════════════════════════════════════════════
     SAVE / LOAD  (localStorage)
  ══════════════════════════════════════════════════════════════════════ */
  function saveProgress() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        currentLevel: levelIdx,
        unlockedUpTo,
        bestScores,
      }));
    } catch(e) { console.warn('[TrafficJam] Save failed', e); }
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (typeof data.currentLevel  === 'number') levelIdx     = data.currentLevel;
      if (typeof data.unlockedUpTo  === 'number') unlockedUpTo = data.unlockedUpTo;
      if (data?.bestScores && typeof data.bestScores === 'object') bestScores = data.bestScores;
    } catch(e) { console.warn('[TrafficJam] Saved progress could not be loaded', e); }
  }

  /* ══════════════════════════════════════════════════════════════════════
     VALIDATION
  ══════════════════════════════════════════════════════════════════════ */
  function isInLevelRange(idx) {
    return idx >= 0 && idx < LEVELS.length;
  }

  function hasValidRedCar(def) {
    const redDef = def.cars.find(c => c[0] === 0);
    return redDef?.[2] === 'h' && redDef?.[3] === EXIT_ROW;
  }

  function isSupportedCarDef(carDef) {
    const orient = carDef[2];
    const len = carDef[5];
    return (orient === 'h' || orient === 'v') && len > 0;
  }

  function cellForCarStep(carDef, step) {
    const orient = carDef[2];
    const row = carDef[3];
    const col = carDef[4];
    return {
      row: orient === 'h' ? row : row + step,
      col: orient === 'h' ? col + step : col,
    };
  }

  function isCellInBounds(cell) {
    return cell.row >= 0 && cell.row < BOARD_SIZE && cell.col >= 0 && cell.col < BOARD_SIZE;
  }

  function cellKey(cell) {
    return cell.row * BOARD_SIZE + cell.col;
  }

  function canOccupyCell(cell, seen) {
    const key = cellKey(cell);
    if (!isCellInBounds(cell) || seen.has(key)) return false;
    seen.add(key);
    return true;
  }

  function canPlaceCar(carDef, seen) {
    if (!isSupportedCarDef(carDef)) return false;
    for (let step = 0; step < carDef[5]; step++) {
      if (!canOccupyCell(cellForCarStep(carDef, step), seen)) return false;
    }
    return true;
  }

  function hasValidCarLayout(def) {
    const seen = new Set();
    return def.cars.every(carDef => canPlaceCar(carDef, seen));
  }

  function isValidLevel(idx) {
    if (!isInLevelRange(idx)) return false;
    const def = LEVELS[idx];
    return hasValidRedCar(def) && hasValidCarLayout(def);
  }

  function warnSkippedLevel(level) {
    console.warn(`[TrafficJam] Level ${level + 1} is invalid – skipping.`);
  }

  /* Find the next valid level at or after `start`. Returns -1 if none. */
  function findNextValid(start) {
    for (let level = start; level < LEVELS.length; level++) {
      if (isValidLevel(level)) return level;
      warnSkippedLevel(level);
    }
    return -1;
  }

  /* ══════════════════════════════════════════════════════════════════════
     LEVEL LOADING
  ══════════════════════════════════════════════════════════════════════ */
  function loadLevel(idx) {
    const validIdx = findNextValid(idx);
    if (validIdx === -1) {
      showError('No valid levels found from level ' + (idx + 1) + '. Cannot continue.');
      return;
    }
    levelIdx  = validIdx;
    const def = LEVELS[validIdx];
    cars      = def.cars.map(([id, ci, o, r, c, l]) => ({ id, colorIdx: ci, orient: o, row: r, col: c, len: l }));
    selected  = -1;
    moveCount = 0;
    won       = false;
    drag      = null;
    screen    = 'game';
    saveProgress();
    renderGame();
  }

  function showError(msg) {
    if (!container) return;
    container.innerHTML = `<div class="tj-error">${msg}</div>`;
  }

  /* ══════════════════════════════════════════════════════════════════════
     GRID / MOVEMENT  (unchanged logic, same function signatures)
  ══════════════════════════════════════════════════════════════════════ */
  function buildGrid() {
    const g = Array.from({ length: BOARD_SIZE }, () => new Array(BOARD_SIZE).fill(EMPTY_CELL));
    cars.forEach((car, i) => placeCarOnGrid(g, car, i));
    return g;
  }

  function occupiedCellForCar(car, step) {
    return {
      row: car.orient === 'h' ? car.row : car.row + step,
      col: car.orient === 'h' ? car.col + step : car.col,
    };
  }

  function placeCarOnGrid(grid, car, gridIndex) {
    for (let step = 0; step < car.len; step++) {
      const cell = occupiedCellForCar(car, step);
      if (isCellInBounds(cell)) grid[cell.row][cell.col] = gridIndex;
    }
  }

  function isGridCellEmpty(grid, row, col) {
    return grid[row][col] === EMPTY_CELL;
  }

  function canMoveLeft(car, grid) {
    const nextCol = car.col - 1;
    return nextCol >= 0 && isGridCellEmpty(grid, car.row, nextCol);
  }

  function canMoveRight(car, grid) {
    const nextCol = car.col + car.len;
    if (nextCol >= BOARD_SIZE) return car.id === 0;
    return isGridCellEmpty(grid, car.row, nextCol);
  }

  function canMoveUp(car, grid) {
    const nextRow = car.row - 1;
    return nextRow >= 0 && isGridCellEmpty(grid, nextRow, car.col);
  }

  function canMoveDown(car, grid) {
    const nextRow = car.row + car.len;
    return nextRow < BOARD_SIZE && isGridCellEmpty(grid, nextRow, car.col);
  }

  function canMoveHorizontal(car, dir, grid) {
    if (dir === 'left') return canMoveLeft(car, grid);
    if (dir === 'right') return canMoveRight(car, grid);
    return false;
  }

  function canMoveVertical(car, dir, grid) {
    if (dir === 'up') return canMoveUp(car, grid);
    if (dir === 'down') return canMoveDown(car, grid);
    return false;
  }

  function canMove(carIdx, dir) {
    const car = cars[carIdx];
    const grid = buildGrid();
    return car.orient === 'h'
      ? canMoveHorizontal(car, dir, grid)
      : canMoveVertical(car, dir, grid);
  }

  function applyHorizontalMove(car, dir) {
    if (dir === 'left') car.col--;
    if (dir === 'right') car.col++;
  }

  function applyVerticalMove(car, dir) {
    if (dir === 'up') car.row--;
    if (dir === 'down') car.row++;
  }

  function applyMove(car, dir) {
    if (car.orient === 'h') applyHorizontalMove(car, dir);
    else applyVerticalMove(car, dir);
    moveCount++;
  }

  function isExitMove(car, dir) {
    return car.id === 0 && dir === 'right' && car.col + car.len > BOARD_SIZE;
  }

  /* Move one tile in dir. Returns true if actually moved. */
  function moveCar(carIdx, dir) {
    const car = cars[carIdx];
    if (!canMove(carIdx, dir)) return false;
    applyMove(car, dir);
    if (isExitMove(car, dir)) onWin();
    return true;
  }

  function checkWin() {
    const red = cars.find(c => c.id === 0);
    if (red?.orient === 'h' && red.row === EXIT_ROW && red.col + red.len >= BOARD_SIZE) onWin();
  }

  function onWin() {
    if (won) return;
    won = true;
    if (!bestScores[levelIdx] || moveCount < bestScores[levelIdx]) bestScores[levelIdx] = moveCount;
    const next = findNextValid(levelIdx + 1);
    if (next !== -1 && next > unlockedUpTo) unlockedUpTo = next;
    saveProgress();
    renderGame();
  }

  /* ══════════════════════════════════════════════════════════════════════
     DRAG HANDLERS
  ══════════════════════════════════════════════════════════════════════ */
  function onCarPointerDown(e, carIdx) {
    if (won) return;
    e.preventDefault();
    selected = carIdx;
    const car  = cars[carIdx];
    drag = {
      carIdx,
      orient:   car.orient,
      startX:   e.clientX,
      startY:   e.clientY,
      startCol: car.col,
      startRow: car.row,
      lastCol:  car.col,
      lastRow:  car.row,
    };
    capturePointer(e);
    renderGame();
  }

  function capturePointer(e) {
    try {
      e.target.setPointerCapture(e.pointerId);
    } catch (err) {
      console.debug('[TrafficJam] Pointer capture failed', err);
    }
  }

  function moveTowardTarget(currentValue, targetValue, forwardDir, backwardDir) {
    while (currentValue() !== targetValue) {
      const dir = currentValue() < targetValue ? forwardDir : backwardDir;
      if (!moveCar(drag.carIdx, dir)) break;
    }
  }

  function clampCarPosition(value, carLength) {
    return Math.max(0, Math.min(BOARD_SIZE - carLength, value));
  }

  function updateHorizontalDrag(e, car) {
    const dx = e.clientX - drag.startX;
    const targetCol = drag.startCol + Math.round(dx / CELL);
    const clampedCol = clampCarPosition(targetCol, car.len);
    moveTowardTarget(() => car.col, clampedCol, 'right', 'left');
  }

  function updateVerticalDrag(e, car) {
    const dy = e.clientY - drag.startY;
    const targetRow = drag.startRow + Math.round(dy / CELL);
    const clampedRow = clampCarPosition(targetRow, car.len);
    moveTowardTarget(() => car.row, clampedRow, 'down', 'up');
  }

  function onGridPointerMove(e) {
    if (!drag || won) return;
    e.preventDefault();
    const car = cars[drag.carIdx];
    if (drag.orient === 'h') updateHorizontalDrag(e, car);
    else updateVerticalDrag(e, car);
    checkWin();
    renderGame();
  }

  function onGridPointerUp(e) {
    if (!drag) return;
    drag = null;
    renderGame();
  }

  /* ══════════════════════════════════════════════════════════════════════
     LEVEL SELECT SCREEN
  ══════════════════════════════════════════════════════════════════════ */
  function levelButtonClass(locked, done) {
    return 'tj-sel-btn' +
      (locked ? ' tj-sel-locked' : '') +
      (done ? ' tj-sel-done' : '');
  }

  function levelButtonTitle(i, locked, done) {
    if (locked) return 'Locked';
    const best = done ? ` · Best ${bestScores[i]}` : '';
    return `${DIFF_LABELS[i]}${best}`;
  }

  function createLevelButton(i) {
    const locked = i > unlockedUpTo;
    const done = bestScores[i] !== undefined;
    const btn = document.createElement('button');
    btn.className = levelButtonClass(locked, done);
    btn.textContent = i + 1;
    btn.title = levelButtonTitle(i, locked, done);
    btn.disabled = locked;
    if (!locked) btn.addEventListener('click', () => loadLevel(i));
    return btn;
  }

  function renderLevelSelect() {
    if (!container) return;
    const wrap = container.querySelector('.tj-select-wrap');
    if (!wrap) return;

    wrap.innerHTML = '';
    LEVELS.forEach((_, i) => wrap.appendChild(createLevelButton(i)));
  }

  function showLevelSelect() {
    screen   = 'select';
    selected = -1;
    drag     = null;
    if (!container) return;
    container.innerHTML = `
      <div class="tj-select-header">
        <span class="tj-select-title">Traffic Jam — Select Level</span>
      </div>
      <div class="tj-select-wrap"></div>
      <div class="tj-select-legend">
        <span class="tj-leg tj-leg-open">■</span> Open &nbsp;
        <span class="tj-leg tj-leg-done">■</span> Solved &nbsp;
        <span class="tj-leg tj-leg-locked">■</span> Locked
      </div>
    `;
    renderLevelSelect();
  }

  /* ══════════════════════════════════════════════════════════════════════
     GAME RENDER
  ══════════════════════════════════════════════════════════════════════ */
  function ensureGameBoard() {
    if (container.querySelector('.tj-board-wrap')) return;
    container.innerHTML = `
        <div class="tj-topbar">
          <button class="tj-btn tj-btn-sm" id="tj-menu-btn">☰ Levels</button>
          <span class="tj-status"></span>
          <button class="tj-btn tj-btn-sm" id="tj-restart">↺ Reset</button>
        </div>
        <div class="tj-board-wrap">
          <div class="tj-grid"></div>
        </div>
        <div class="game-hint">Drag a car to move it · get the red car to ▶ exit</div>
      `;
    container.querySelector('#tj-restart').addEventListener('click', () => loadLevel(levelIdx));
    container.querySelector('#tj-menu-btn').addEventListener('click', () => showLevelSelect());

    const grid = container.querySelector('.tj-grid');
    grid.addEventListener('pointermove',  onGridPointerMove, { passive: false });
    grid.addEventListener('pointerup',    onGridPointerUp);
    grid.addEventListener('pointercancel',onGridPointerUp);
  }

  function renderExitArrow(grid) {
    const arrow = document.createElement('div');
    arrow.className   = 'tj-exit-arrow';
    arrow.textContent = '▶';
    grid.appendChild(arrow);
  }

  function carClasses(car, i) {
    return 'tj-car' +
      (i === selected ? ' tj-selected' : '') +
      (car.id === 0 ? ' tj-red-car' : '');
  }

  function carMetrics(car) {
    const isHorizontal = car.orient === 'h';
    return {
      isHorizontal,
      width: isHorizontal ? car.len * CELL - 4 : CELL - 4,
      height: isHorizontal ? CELL - 4 : car.len * CELL - 4,
    };
  }

  function carStyle(car, metrics) {
    return `
        left:${car.col * CELL + 2}px; top:${car.row * CELL + 2}px;
        width:${metrics.width}px; height:${metrics.height}px;
        background:${COLORS[car.colorIdx]};
        transition: left 0.06s, top 0.06s;
      `;
  }

  function createCarHint(isHorizontal) {
    const hint = document.createElement('span');
    hint.className = 'tj-car-hint';
    hint.textContent = isHorizontal ? '◀▶' : '▲▼';
    return hint;
  }

  function renderCar(grid, car, i) {
    const metrics = carMetrics(car);
    const el = document.createElement('div');
    el.className = carClasses(car, i);
    el.style.cssText = carStyle(car, metrics);
    el.appendChild(createCarHint(metrics.isHorizontal));
    el.addEventListener('pointerdown', e => onCarPointerDown(e, i));
    grid.appendChild(el);
  }

  function renderCars(grid) {
    cars.forEach((car, i) => renderCar(grid, car, i));
  }

  function winMovesText() {
    const plural = moveCount !== 1 ? 's' : '';
    return `${moveCount} move${plural}`;
  }

  function bestScoreHtml() {
    if (!bestScores[levelIdx]) return '';
    return `<div class="tj-win-best">Best: ${bestScores[levelIdx]}</div>`;
  }

  function nextLevelHtml(isLast) {
    if (isLast) return '<div style="color:var(--yellow)">All 115 levels complete! 🏆</div>';
    return '<button class="tj-btn" id="tj-next-btn">Next Level ▶</button>';
  }

  function createWinOverlayElement(isLast) {
    const winEl = document.createElement('div');
    winEl.className = 'tj-win';
    winEl.innerHTML = `
        <div class="tj-win-box">
          <div class="tj-win-title">🎉 Solved!</div>
          <div class="tj-win-moves">${winMovesText()}</div>
          ${bestScoreHtml()}
          ${nextLevelHtml(isLast)}
          <button class="tj-btn tj-btn-ghost" id="tj-menu2-btn">☰ Level Select</button>
          <button class="tj-btn tj-btn-ghost" id="tj-replay-btn">↺ Replay</button>
        </div>
      `;
    return winEl;
  }

  function wireWinOverlayButtons(winEl) {
    winEl.querySelector('#tj-next-btn')?.addEventListener('click', () => loadLevel(levelIdx + 1));
    winEl.querySelector('#tj-replay-btn')?.addEventListener('click', () => loadLevel(levelIdx));
    winEl.querySelector('#tj-menu2-btn')?.addEventListener('click', () => showLevelSelect());
  }

  function renderWinOverlay() {
    container.querySelector('.tj-win')?.remove();
    if (!won) return;

    const isLast = findNextValid(levelIdx + 1) === -1;
    const winEl = createWinOverlayElement(isLast);
    container.querySelector('.tj-board-wrap').appendChild(winEl);
    wireWinOverlayButtons(winEl);
  }

  function renderStatus() {
    const status = container.querySelector('.tj-status');
    if (!status) return;
    const diff = DIFF_LABELS[levelIdx] || '';
    const best = bestScores[levelIdx] !== undefined ? ` · Best ${bestScores[levelIdx]}` : '';
    status.textContent = `Lvl ${levelIdx + 1}/115 · ${diff} · Moves: ${moveCount}${best}`;
  }

  function renderGame() {
    if (!container) return;
    ensureGameBoard();

    const grid = container.querySelector('.tj-grid');
    grid.innerHTML = '';
    renderExitArrow(grid);
    renderCars(grid);
    renderWinOverlay();
    renderStatus();
  }

  /* ══════════════════════════════════════════════════════════════════════
     INIT / PUBLIC API
  ══════════════════════════════════════════════════════════════════════ */
  function init(pane) {
    container = pane;
    loadProgress();
    // Validate saved level index
    if (levelIdx < 0 || levelIdx >= LEVELS.length) levelIdx = 0;
    showLevelSelect();
  }

  function dirMatchesCar(car, dir) {
    const horizontal = dir === 'left' || dir === 'right';
    return car.orient === 'h' ? horizontal : !horizontal;
  }

  function keyToDirection(key) {
    const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    return map[key];
  }

  function canUseKeyboardMove(dir) {
    return screen === 'game' && !won && selected >= 0 && dirMatchesCar(cars[selected], dir);
  }

  function moveSelectedCarWithKeyboard(dir) {
    moveCar(selected, dir);
    checkWin();
    renderGame();
  }

  function onKey(e) {
    const dir = keyToDirection(e.key);
    if (!dir || !canUseKeyboardMove(dir)) return;
    e.preventDefault();
    moveSelectedCarWithKeyboard(dir);
  }

  return { init, onKey };

})();
