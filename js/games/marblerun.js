/* ═══════════════════════════════════════════════════════════════════════════
   MARBLE RUN  —  Holographic Racing League
   Phase 8.4: long-course timeout and pacing refinement.
   Exports: GameMarbleRun  (consumed by popup.js)
═══════════════════════════════════════════════════════════════════════════ */
const GameMarbleRun = (() => {

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
  const TRACK_RECIPE_KEY = 'mr_track_recipe_v1';
  const TRACK_SELECTION_MODE_KEY = 'mr_track_selection_mode_v1';
  const TRACK_SEED_KEY = 'mr_track_seed_v1';
  const CAMERA_PRESET_KEY = 'mr_camera_preset_v1';
  const FAVOURITE_SEEDS_KEY = 'mr_favourite_seeds_v1';
  const COURSE_LENGTH_KEY = 'mr_course_length_v1';
  const OBSTACLE_FREQUENCY_KEY = 'mr_obstacle_frequency_v1';
  const MAX_FAVOURITE_SEEDS = 30;
  const START_AUDIT_KEY = 'mr_start_audit_v5_late_mixer';
  const START_AUDIT_LIMIT = 100;
  const START_BALANCE = 1000;
  const TOURNAMENT_ROUNDS = 3;

  // One immutable profile is shared by every colour. Marble definitions above
  // contain cosmetic identity only; no colour can override these values.
  const PHYSICS_PROFILE = Object.freeze({
    radius:11,
    gravity:0.45,
    maxVy:11,
    maxVx:7,
    boundaryBounce:0.5,
    wallRestitution:0.62,
    pegRestitution:0.88,
    pegSideKick:0.85,
    minEscapeVy:1.35,
    friction:0.995,
    substeps:2,
    progressCheckFrames:90,
    minProgressPerCheck:6,
    stuckWarnChecks:1,
    stuckRecoverChecks:2,
    maxRecoveryAttempts:3,
  });

  const PROGRESS_CHECK_FRAMES = PHYSICS_PROFILE.progressCheckFrames;
  const MIN_PROGRESS_PER_CHECK = PHYSICS_PROFILE.minProgressPerCheck;
  const STUCK_WARN_CHECKS = PHYSICS_PROFILE.stuckWarnChecks;
  const STUCK_RECOVER_CHECKS = PHYSICS_PROFILE.stuckRecoverChecks;
  const MAX_RECOVERY_ATTEMPTS = PHYSICS_PROFILE.maxRecoveryAttempts;
  const BASE_FINISH_GRACE_MS = 10000;
  const BASE_RACE_TIMEOUT_MS = 120000;
  const MIN_RACE_TIMEOUT_MS = 90000;
  const MAX_RACE_TIMEOUT_MS = 360000;
  const MAX_FINISH_GRACE_MS = 24000;
  const MIN_PACE_EXTENSION_MS = 12000;
  const MAX_PACE_EXTENSION_MS = 45000;
  const PACE_PROGRESS_DELTA = 24;

  const W        = 400;   // canvas width (fitted to 420px popup)
  const R        = PHYSICS_PROFILE.radius;
  const VH       = 560;   // visible canvas height (viewport)
  // Keep the same current 3200px world while making future course height
  // derive from the assembled section/object bounds.
  const WORLD_BOTTOM_PADDING = VH + 220;
  const MIN_WORLD_HEIGHT = VH;
  const CAMERA_MODES = Object.freeze(['mine','leader','overview']);
  const PREVIEW_W = 380;
  const PREVIEW_H = 220;

  /* ── Track section definition format (Milestone 5.1) ─────────────────── */
  // This manifest describes the existing fixed course only. It is metadata;
  // buildTrack() still creates the same obstacles at the same coordinates.
  // Later Milestone 5 tasks can use builderKey and connection data without
  // having to infer section boundaries from hard-coded obstacle arrays.
  function freezeTrackSection(definition) {
    return Object.freeze({
      ...definition,
      entry:Object.freeze({...definition.entry}),
      exit:Object.freeze({...definition.exit}),
      componentIds:Object.freeze([...definition.componentIds]),
    });
  }

  const TRACK_SECTION_DEFINITIONS = Object.freeze([
    {
      id:'start-chute', label:'START CHUTE', type:'start', builderKey:'startChute',
      startY:40, endY:360,
      entry:{x:W/2, y:40, width:120},
      exit:{x:W/2, y:360, width:280},
      repeatable:false, mixingStrength:'none', difficulty:'intro',
      componentIds:['chute-walls','opening-ramps'],
    },
    {
      id:'speed-zone', label:'SPEED ZONE', type:'speed', builderKey:'speedZone',
      startY:360, endY:480,
      entry:{x:W/2, y:360, width:280},
      exit:{x:W/2, y:480, width:340},
      repeatable:true, mixingStrength:'low', difficulty:'easy',
      componentIds:['boost-pads','speed-floor'],
    },
    {
      id:'early-mixer', label:'EARLY MIXER', type:'mixer', builderKey:'earlyMixer',
      startY:490, endY:720,
      entry:{x:W/2, y:490, width:344},
      exit:{x:W/2, y:714, width:36},
      repeatable:true, mixingStrength:'high', difficulty:'medium',
      componentIds:['early-vortex','mixer-floor'],
    },
    {
      id:'funnel-1', label:'FUNNEL 1', type:'transition', builderKey:'funnel1',
      startY:720, endY:820,
      entry:{x:W/2, y:720, width:300},
      exit:{x:W/2, y:820, width:55},
      repeatable:true, mixingStrength:'medium', difficulty:'easy',
      componentIds:['funnel-1'],
    },
    {
      id:'funnel-pinpoint', label:'PINPOINT FUNNEL', type:'transition', builderKey:'funnelPinpoint',
      startY:720, endY:860,
      entry:{x:W/2, y:720, width:320},
      exit:{x:W/2, y:860, width:34},
      repeatable:true, requiredInFixedCourse:false,
      mixingStrength:'high', difficulty:'medium',
      componentIds:['funnel-pinpoint'],
    },
    {
      id:'funnel-twin', label:'TWIN FUNNEL', type:'transition', builderKey:'funnelTwin',
      startY:1280, endY:1420,
      entry:{x:W/2, y:1280, width:340},
      exit:{x:W/2, y:1420, width:260},
      repeatable:true, requiredInFixedCourse:false,
      mixingStrength:'high', difficulty:'medium',
      componentIds:['twin-splitter-peg','funnel-twin-left','funnel-twin-right'],
    },
    {
      id:'dome-gravity', label:'GRAVITY DOME', type:'mixer', builderKey:'domeGravity',
      startY:1080, endY:1300,
      entry:{x:W/2, y:1080, width:344},
      exit:{x:W/2, y:1290, width:40},
      repeatable:true, requiredInFixedCourse:false,
      mixingStrength:'high', difficulty:'medium',
      componentIds:['gravity-dome-shell','gravity-dome-core'],
    },
    {
      id:'dome-orbit', label:'ORBIT DOME', type:'mixer', builderKey:'domeOrbit',
      startY:1620, endY:1840,
      entry:{x:W/2, y:1620, width:352},
      exit:{x:W/2, y:1830, width:42},
      repeatable:true, requiredInFixedCourse:false,
      mixingStrength:'high', difficulty:'hard',
      componentIds:['orbit-dome-shell','orbit-dome-core'],
    },
    {
      id:'plinko-1', label:'PLINKO 1', type:'plinko', builderKey:'plinko1',
      startY:820, endY:1080,
      entry:{x:W/2, y:820, width:300},
      exit:{x:W/2, y:1080, width:340},
      repeatable:true, mixingStrength:'high', difficulty:'medium',
      componentIds:['plinko-1-pegs','plinko-1-floor'],
    },
    {
      id:'plinko-zigzag', label:'ZIGZAG PLINKO', type:'plinko', builderKey:'plinkoZigzag',
      startY:820, endY:1060,
      entry:{x:W/2, y:820, width:300},
      exit:{x:W/2, y:1060, width:340},
      repeatable:true, requiredInFixedCourse:false,
      mixingStrength:'high', difficulty:'medium',
      componentIds:['plinko-zigzag-pegs','plinko-zigzag-floor'],
    },
    {
      id:'plinko-diamond', label:'DIAMOND PLINKO', type:'plinko', builderKey:'plinkoDiamond',
      startY:820, endY:1040,
      entry:{x:W/2, y:820, width:300},
      exit:{x:W/2, y:1040, width:340},
      repeatable:true, requiredInFixedCourse:false,
      mixingStrength:'high', difficulty:'medium',
      componentIds:['plinko-diamond-pegs','plinko-diamond-floor'],
    },
    {
      id:'mid-mixer', label:'MID MIXER', type:'mixer', builderKey:'midMixer',
      startY:1080, endY:1280,
      entry:{x:W/2, y:1080, width:344},
      exit:{x:W/2, y:1270, width:34},
      repeatable:true, mixingStrength:'high', difficulty:'medium',
      componentIds:['mid-vortex'],
    },
    {
      id:'funnel-2', label:'FUNNEL 2', type:'transition', builderKey:'funnel2',
      startY:1280, endY:1380,
      entry:{x:W/2, y:1280, width:260},
      exit:{x:W/2, y:1380, width:70},
      repeatable:true, mixingStrength:'medium', difficulty:'easy',
      componentIds:['funnel-2'],
    },
    {
      id:'loop-section', label:'LOOP SECTION', type:'loop', builderKey:'loopSection',
      startY:1380, endY:1620,
      entry:{x:W/2, y:1380, width:260},
      exit:{x:W/2, y:1620, width:340},
      repeatable:true, mixingStrength:'medium', difficulty:'hard',
      componentIds:['loop-left','loop-right','loop-floor'],
    },
    {
      id:'loop-cascade', label:'CASCADE LOOPS', type:'loop', builderKey:'loopCascade',
      startY:1380, endY:1680,
      entry:{x:W/2, y:1380, width:260},
      exit:{x:W/2, y:1680, width:340},
      repeatable:true, requiredInFixedCourse:false,
      mixingStrength:'high', difficulty:'hard',
      componentIds:['cascade-loop-left','cascade-loop-centre','cascade-loop-right','cascade-loop-floor'],
    },
    {
      id:'loop-slalom', label:'SLALOM LOOPS', type:'loop', builderKey:'loopSlalom',
      startY:1380, endY:1680,
      entry:{x:W/2, y:1380, width:260},
      exit:{x:W/2, y:1680, width:340},
      repeatable:true, requiredInFixedCourse:false,
      mixingStrength:'high', difficulty:'hard',
      componentIds:['slalom-centre-gate-left','slalom-centre-gate-right','slalom-loop-1','slalom-loop-2','slalom-loop-3','slalom-loop-floor'],
    },
    {
      id:'balance-beam', label:'BALANCE BEAM', type:'beam', builderKey:'balanceBeam',
      startY:1380, endY:1640,
      entry:{x:W/2, y:1380, width:260},
      exit:{x:W/2, y:1640, width:340},
      repeatable:true, requiredInFixedCourse:false,
      mixingStrength:'medium', difficulty:'hard',
      componentIds:['balance-guide-left','balance-guide-right','balance-beam-main','balance-beam-floor'],
    },
    {
      id:'bounce-chamber', label:'BOUNCE CHAMBER', type:'bounce', builderKey:'bounceChamber',
      startY:1380, endY:1660,
      entry:{x:W/2, y:1380, width:260},
      exit:{x:W/2, y:1660, width:340},
      repeatable:true, requiredInFixedCourse:false,
      mixingStrength:'high', difficulty:'hard',
      componentIds:['bounce-entry-left','bounce-entry-right','bounce-wall-left','bounce-wall-right','bounce-bumpers','bounce-chamber-floor'],
    },
    {
      id:'split-gate', label:'SPLIT GATE', type:'gate', builderKey:'splitGate',
      startY:1380, endY:1640,
      entry:{x:W/2, y:1380, width:260},
      exit:{x:W/2, y:1640, width:340},
      repeatable:true, requiredInFixedCourse:false,
      mixingStrength:'high', difficulty:'hard',
      componentIds:['split-entry-left','split-entry-right','split-gate-main','split-exit-left','split-exit-right','split-gate-floor'],
    },
    {
      id:'drop-tower', label:'DROP TOWER', type:'transition', builderKey:'dropTower',
      startY:1380, endY:1700,
      entry:{x:W/2, y:1380, width:260},
      exit:{x:W/2, y:1700, width:340},
      repeatable:true, requiredInFixedCourse:false,
      mixingStrength:'high', difficulty:'hard',
      componentIds:['tower-entry-left','tower-entry-right','tower-wall-left','tower-wall-right','tower-shelf-1','tower-shelf-2','tower-shelf-3','tower-floor'],
    },
    {
      id:'spiral-bowl', label:'SPIRAL BOWL', type:'mixer', builderKey:'spiralBowl',
      startY:1620, endY:1860,
      entry:{x:W/2, y:1620, width:352},
      exit:{x:W/2, y:1850, width:42},
      repeatable:true, requiredInFixedCourse:false,
      mixingStrength:'high', difficulty:'hard',
      componentIds:['spiral-bowl-shell','spiral-bowl-core'],
    },
    {
      id:'late-mixer', label:'LATE OVERTAKE', type:'mixer', builderKey:'lateMixer',
      startY:1620, endY:1800,
      entry:{x:W/2, y:1620, width:352},
      exit:{x:W/2, y:1792, width:36},
      repeatable:true, mixingStrength:'high', difficulty:'medium',
      componentIds:['late-vortex'],
    },
    {
      id:'plinko-2', label:'PLINKO 2', type:'plinko', builderKey:'plinko2',
      startY:1800, endY:1960,
      entry:{x:W/2, y:1800, width:340},
      exit:{x:W/2, y:1960, width:340},
      repeatable:true, mixingStrength:'high', difficulty:'medium',
      componentIds:['plinko-2-pegs','plinko-2-floor'],
    },
    {
      id:'funnel-3', label:'FUNNEL 3', type:'transition', builderKey:'funnel3',
      startY:1960, endY:2060,
      entry:{x:W/2, y:1960, width:320},
      exit:{x:W/2, y:2060, width:90},
      repeatable:true, mixingStrength:'medium', difficulty:'easy',
      componentIds:['funnel-3'],
    },
    {
      id:'final-sprint', label:'FINISH FUNNEL', type:'sprint', builderKey:'finalSprint',
      startY:2060, endY:2380,
      entry:{x:W/2, y:2060, width:360},
      exit:{x:W/2, y:2380, width:48},
      repeatable:false, mixingStrength:'low', difficulty:'easy',
      componentIds:[
        'finish-funnel-left',
        'finish-funnel-right',
        'finish-chute-left',
        'finish-chute-right',
      ],
    },
    {
      id:'finish', label:'FINISH', type:'finish', builderKey:'finishLine',
      startY:2380, endY:2420,
      entry:{x:W/2, y:2380, width:48},
      exit:{x:W/2, y:2400, width:340},
      repeatable:false, mixingStrength:'none', difficulty:'finish',
      componentIds:['finish-line'],
    },
  ].map(freezeTrackSection));

  function createTrackSectionManifest() {
    return TRACK_SECTION_DEFINITIONS.map(section => ({
      ...section,
      entry:{...section.entry},
      exit:{...section.exit},
      componentIds:[...section.componentIds],
    }));
  }

  /* ── Controlled track recipe catalogue (Roadmap 6.2) ───────────────── */
  // The recipe is now the authoritative order for the current course. It is
  // deliberately fixed: randomisation, duplication and omission remain out of
  // scope until the complete modular framework has passed validation.
  function freezeTrackRecipe(recipe) {
    return Object.freeze({
      ...recipe,
      sectionIds:Object.freeze([...recipe.sectionIds]),
      tuning:Object.freeze({...recipe.tuning}),
    });
  }

  const FIXED_SECTION_ORDER = Object.freeze([
    'start-chute',
    'speed-zone',
    'early-mixer',
    'funnel-1',
    'plinko-1',
    'mid-mixer',
    'funnel-2',
    'loop-section',
    'late-mixer',
    'plinko-2',
    'funnel-3',
    'final-sprint',
    'finish',
  ]);

  const CLASSIC_TRACK_RECIPE = freezeTrackRecipe({
    id:'classic-fixed-v1',
    shortLabel:'CLASSIC',
    label:'CLASSIC FIXED COURSE',
    description:'Original validated timing and release behaviour.',
    version:1,
    randomised:false,
    allowDuplicates:false,
    sectionIds:FIXED_SECTION_ORDER,
    tuning:{
      id:'classic',
      label:'STANDARD MIX',
      orbitScale:1,
      angularSpeedScale:1,
      releaseSpreadScale:1,
      releaseVelocityScale:1,
    },
  });

  const RAPID_TRACK_RECIPE = freezeTrackRecipe({
    id:'rapid-mix-v1',
    shortLabel:'RAPID',
    label:'RAPID MIX COURSE',
    description:'Shorter, quicker vortex cycles for a faster race.',
    version:1,
    randomised:false,
    allowDuplicates:false,
    sectionIds:FIXED_SECTION_ORDER,
    tuning:{
      id:'rapid',
      label:'RAPID MIX',
      orbitScale:0.72,
      angularSpeedScale:1.1,
      releaseSpreadScale:0.85,
      releaseVelocityScale:1.08,
    },
  });

  const DEEP_TRACK_RECIPE = freezeTrackRecipe({
    id:'deep-mix-v1',
    shortLabel:'DEEP',
    label:'DEEP MIX COURSE',
    description:'Longer vortex cycles and wider releases for extra reshuffling.',
    version:1,
    randomised:false,
    allowDuplicates:false,
    sectionIds:FIXED_SECTION_ORDER,
    tuning:{
      id:'deep',
      label:'DEEP MIX',
      orbitScale:1.2,
      angularSpeedScale:0.95,
      releaseSpreadScale:1.15,
      releaseVelocityScale:0.98,
    },
  });

  const TRACK_RECIPE_VARIANTS = Object.freeze([
    CLASSIC_TRACK_RECIPE,
    RAPID_TRACK_RECIPE,
    DEEP_TRACK_RECIPE,
  ]);

  function getTrackRecipeById(recipeId) {
    return TRACK_RECIPE_VARIANTS.find(recipe => recipe.id === recipeId) ??
      CLASSIC_TRACK_RECIPE;
  }

  // Seeded selection chooses among the already validated recipes only. It does
  // not reorder, duplicate or remove sections, and it does not seed physics.
  function normalizeTrackSeed(rawSeed) {
    return String(rawSeed ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g,'-')
      .replace(/^-+|-+$/g,'')
      .slice(0,32);
  }

  function hashTrackSeed(seed) {
    let hash = 0x811c9dc5;
    for (let i=0;i<seed.length;i++) {
      hash ^= seed.charCodeAt(i);
      hash = Math.imul(hash,0x01000193);
    }
    return hash >>> 0;
  }

  function getTrackRecipeForSeed(rawSeed) {
    const seed = normalizeTrackSeed(rawSeed);
    if (!seed) return CLASSIC_TRACK_RECIPE;
    return TRACK_RECIPE_VARIANTS[hashTrackSeed(seed) % TRACK_RECIPE_VARIANTS.length];
  }


  /* ── Controlled generated-course catalogue (Roadmap 6.6) ───────────── */
  // Generated courses use only existing validated section builders. The seed
  // selects one safe structural pattern and one validated mixer profile. The
  // same normalized seed therefore reproduces the same course every time.
  // Seed 1 is reserved as an evolving full-library regression course. The
  // showcase list is explicit so every future obstacle phase must add its new
  // section here; the showcase audit fails if a registered obstacle is absent.
  const OBSTACLE_SHOWCASE_SEED_ALIASES = Object.freeze(['1','seed-1','course-1']);
  const OBSTACLE_SHOWCASE_SECTION_IDS = Object.freeze([
    'start-chute','speed-zone',
    'early-mixer','funnel-1','plinko-1','mid-mixer',
    'funnel-pinpoint','plinko-zigzag','dome-gravity','funnel-2',
    'loop-section','late-mixer','funnel-twin','plinko-diamond',
    'dome-orbit','loop-cascade','funnel-3','plinko-2',
    'spiral-bowl','loop-slalom','balance-beam','bounce-chamber','split-gate',
    'drop-tower','final-sprint','finish',
  ]);

  const GENERATED_COURSE_PATTERNS = Object.freeze([
    Object.freeze({
      id:'switchback',
      label:'SWITCHBACK MIX',
      description:'Swaps the two Plinko fields while preserving all three mixers.',
      sectionIds:Object.freeze([
        'start-chute','speed-zone','early-mixer','funnel-1','plinko-2',
        'mid-mixer','funnel-2','loop-section','late-mixer','plinko-1',
        'funnel-3','final-sprint','finish',
      ]),
    }),
    Object.freeze({
      id:'short-circuit',
      label:'SHORT CIRCUIT',
      description:'Removes the loop section for a shorter three-mixer course.',
      sectionIds:Object.freeze([
        'start-chute','speed-zone','early-mixer','funnel-1','plinko-1',
        'mid-mixer','funnel-2','plinko-2','late-mixer','funnel-3',
        'final-sprint','finish',
      ]),
    }),
    Object.freeze({
      id:'double-drop',
      label:'DOUBLE DROP',
      description:'Repeats the Mid Mixer and Funnel 2 for an extended course.',
      sectionIds:Object.freeze([
        'start-chute','speed-zone','early-mixer','funnel-1','plinko-1',
        'mid-mixer','funnel-2','loop-section','late-mixer','funnel-3',
        'plinko-2','mid-mixer','funnel-2','final-sprint','finish',
      ]),
    }),
    Object.freeze({
      id:'overtake-gauntlet',
      label:'OVERTAKE GAUNTLET',
      description:'Repeats the Late Mixer and Funnel 3 after both Plinko fields.',
      sectionIds:Object.freeze([
        'start-chute','speed-zone','early-mixer','funnel-1','plinko-2',
        'late-mixer','funnel-3','loop-section','mid-mixer','funnel-2',
        'plinko-1','late-mixer','funnel-3','final-sprint','finish',
      ]),
    }),
    Object.freeze({
      id:'zigzag-rush',
      label:'ZIGZAG RUSH',
      description:'Uses the new Zigzag Plinko before the Mid Mixer for shifting side-to-side lanes.',
      sectionIds:Object.freeze([
        'start-chute','speed-zone','early-mixer','funnel-1','plinko-zigzag',
        'mid-mixer','funnel-2','loop-section','late-mixer','plinko-2',
        'funnel-3','final-sprint','finish',
      ]),
    }),
    Object.freeze({
      id:'diamond-drop',
      label:'DIAMOND DROP',
      description:'Uses the new Diamond Plinko after the Mid Mixer for a compact central split.',
      sectionIds:Object.freeze([
        'start-chute','speed-zone','early-mixer','funnel-1','plinko-1',
        'mid-mixer','funnel-2','plinko-diamond','late-mixer','funnel-3',
        'final-sprint','finish',
      ]),
    }),
    Object.freeze({
      id:'pinpoint-plunge',
      label:'PINPOINT PLUNGE',
      description:'Compresses the pack through the new narrow Pinpoint Funnel before Zigzag Plinko.',
      sectionIds:Object.freeze([
        'start-chute','speed-zone','early-mixer','funnel-pinpoint','plinko-zigzag',
        'mid-mixer','funnel-2','loop-section','late-mixer','plinko-2',
        'funnel-3','final-sprint','finish',
      ]),
    }),
    Object.freeze({
      id:'twin-channel',
      label:'TWIN CHANNEL',
      description:'Splits the pack into two funnel lanes after the Mid Mixer before recombining.',
      sectionIds:Object.freeze([
        'start-chute','speed-zone','early-mixer','funnel-1','plinko-diamond',
        'mid-mixer','funnel-twin','loop-section','late-mixer','plinko-1',
        'funnel-3','final-sprint','finish',
      ]),
    }),
    Object.freeze({
      id:'gravity-well',
      label:'GRAVITY WELL',
      description:'Adds a wide centre-hole Gravity Dome between the Loop and second Plinko field.',
      sectionIds:Object.freeze([
        'start-chute','speed-zone','early-mixer','funnel-1','plinko-1',
        'mid-mixer','funnel-2','loop-section','dome-gravity','plinko-2',
        'late-mixer','funnel-3','final-sprint','finish',
      ]),
    }),
    Object.freeze({
      id:'orbit-bowl',
      label:'ORBIT BOWL',
      description:'Routes the pack through a deeper Orbit Dome before Diamond Plinko and the late overtake.',
      sectionIds:Object.freeze([
        'start-chute','speed-zone','early-mixer','funnel-pinpoint','plinko-zigzag',
        'mid-mixer','funnel-2','dome-orbit','plinko-diamond','late-mixer',
        'funnel-3','final-sprint','finish',
      ]),
    }),
    Object.freeze({
      id:'cascade-climb',
      label:'CASCADE CLIMB',
      description:'Uses three staggered Loop obstacles to split and recombine the pack before the late overtake.',
      sectionIds:Object.freeze([
        'start-chute','speed-zone','early-mixer','funnel-1','plinko-1',
        'mid-mixer','funnel-2','loop-cascade','late-mixer','plinko-2',
        'funnel-3','final-sprint','finish',
      ]),
    }),
    Object.freeze({
      id:'slalom-circuit',
      label:'SLALOM CIRCUIT',
      description:'Alternates three Loop obstacles from side to side between the Twin Funnel and late mixer.',
      sectionIds:Object.freeze([
        'start-chute','speed-zone','early-mixer','funnel-pinpoint','plinko-diamond',
        'mid-mixer','funnel-twin','loop-slalom','late-mixer','plinko-zigzag',
        'funnel-3','final-sprint','finish',
      ]),
    }),
    Object.freeze({
      id:'spiral-descent',
      label:'SPIRAL DESCENT',
      description:'Adds a long inward Spiral Bowl after the original Loop Section before the second Plinko field.',
      sectionIds:Object.freeze([
        'start-chute','speed-zone','early-mixer','funnel-1','plinko-1',
        'mid-mixer','funnel-2','loop-section','spiral-bowl','plinko-2',
        'late-mixer','funnel-3','final-sprint','finish',
      ]),
    }),
    Object.freeze({
      id:'obstacle-showcase',
      label:'OBSTACLE SHOWCASE',
      description:'Reserved seed-1 regression course containing every registered obstacle section at least once.',
      showcase:true,
      sectionIds:OBSTACLE_SHOWCASE_SECTION_IDS,
    }),
    Object.freeze({
      id:'balance-trial',
      label:'BALANCE TRIAL',
      description:'Replaces the Loop Section with a live tilting Balance Beam before the late overtake.',
      sectionIds:Object.freeze([
        'start-chute','speed-zone','early-mixer','funnel-1','plinko-1',
        'mid-mixer','funnel-2','balance-beam','late-mixer','plinko-2',
        'funnel-3','final-sprint','finish',
      ]),
    }),
    Object.freeze({
      id:'bumper-blitz',
      label:'BUMPER BLITZ',
      description:'Routes the pack through a high-energy Bounce Chamber before the late overtake mixer.',
      sectionIds:Object.freeze([
        'start-chute','speed-zone','early-mixer','funnel-1','plinko-diamond',
        'mid-mixer','funnel-2','bounce-chamber','late-mixer','plinko-zigzag',
        'funnel-3','final-sprint','finish',
      ]),
    }),
    Object.freeze({
      id:'split-decision',
      label:'SPLIT DECISION',
      description:'A swinging centre gate changes direction and routes the pack into alternating left and right lanes.',
      sectionIds:Object.freeze([
        'start-chute','speed-zone','early-mixer','funnel-1','plinko-diamond',
        'mid-mixer','funnel-2','split-gate','late-mixer','plinko-zigzag',
        'funnel-3','final-sprint','finish',
      ]),
    }),
    Object.freeze({
      id:'tower-plunge',
      label:'TOWER PLUNGE',
      description:'Drops the pack through three alternating tower shelves before the late overtake mixer.',
      sectionIds:Object.freeze([
        'start-chute','speed-zone','early-mixer','funnel-pinpoint','plinko-diamond',
        'mid-mixer','drop-tower','late-mixer','plinko-zigzag','funnel-3',
        'final-sprint','finish',
      ]),
    }),
  ]);


  /* ── Player generation controls (Phase 8.3) ─────────────────────────── */
  const COURSE_LENGTH_PRESETS = Object.freeze({
    short:Object.freeze({
      id:'short',
      label:'SHORT',
      description:'Compact 12–13 section races.',
      minSections:12,
      maxSections:13,
    }),
    standard:Object.freeze({
      id:'standard',
      label:'STANDARD',
      description:'Original 12–15 section generated-course range.',
      minSections:12,
      maxSections:15,
    }),
    long:Object.freeze({
      id:'long',
      label:'LONG',
      description:'Extended 16–17 section races.',
      minSections:16,
      maxSections:17,
    }),
  });

  const OBSTACLE_FREQUENCY_PRESETS = Object.freeze({
    light:Object.freeze({
      id:'light',
      label:'LIGHT',
      description:'Favours simpler original obstacles and fewer specialist sections.',
    }),
    balanced:Object.freeze({
      id:'balanced',
      label:'BALANCED',
      description:'Uses the full validated pattern catalogue at normal weighting.',
    }),
    heavy:Object.freeze({
      id:'heavy',
      label:'HEAVY',
      description:'Favours specialist and live obstacle sections.',
    }),
  });

  const ADVANCED_OBSTACLE_SECTION_IDS = new Set([
    'funnel-pinpoint',
    'funnel-twin',
    'plinko-zigzag',
    'plinko-diamond',
    'dome-gravity',
    'dome-orbit',
    'loop-cascade',
    'loop-slalom',
    'balance-beam',
    'spiral-bowl',
    'bounce-chamber',
    'split-gate',
    'drop-tower',
  ]);

  const LONG_COURSE_EXTENSION_CHAINS = Object.freeze({
    light:Object.freeze([
      Object.freeze(['balance-beam']),
      Object.freeze(['split-gate']),
      Object.freeze(['bounce-chamber']),
    ]),
    balanced:Object.freeze([
      Object.freeze(['balance-beam']),
      Object.freeze(['split-gate']),
      Object.freeze(['bounce-chamber']),
      Object.freeze(['balance-beam','split-gate']),
      Object.freeze(['split-gate','bounce-chamber']),
    ]),
    heavy:Object.freeze([
      Object.freeze(['balance-beam','bounce-chamber']),
      Object.freeze(['split-gate','balance-beam']),
      Object.freeze(['bounce-chamber','split-gate']),
      Object.freeze(['split-gate','bounce-chamber','balance-beam']),
    ]),
  });

  function normalizeCourseLength(value) {
    return Object.prototype.hasOwnProperty.call(COURSE_LENGTH_PRESETS,value)
      ? value
      : 'standard';
  }

  function normalizeObstacleFrequency(value) {
    return Object.prototype.hasOwnProperty.call(OBSTACLE_FREQUENCY_PRESETS,value)
      ? value
      : 'balanced';
  }

  function getAdvancedObstacleCount(sectionIds) {
    return sectionIds.reduce(
      (count,sectionId) =>
        count + (ADVANCED_OBSTACLE_SECTION_IDS.has(sectionId) ? 1 : 0),
      0
    );
  }

  function patternMatchesCourseLength(pattern,courseLength) {
    const count = pattern.sectionIds.length;
    if (courseLength === 'short') {
      return count <= COURSE_LENGTH_PRESETS.short.maxSections;
    }
    if (courseLength === 'long') return count >= 14;
    return true;
  }

  function getPatternsForGenerationControls(
    patterns,
    courseLength,
    obstacleFrequency
  ) {
    const lengthMatches = patterns.filter(pattern =>
      patternMatchesCourseLength(pattern,courseLength)
    );
    const lengthPool = lengthMatches.length ? lengthMatches : patterns;

    if (obstacleFrequency === 'balanced') return lengthPool;

    const ordered = lengthPool
      .map(pattern => ({
        pattern,
        score:getAdvancedObstacleCount(pattern.sectionIds),
      }))
      .sort((a,b) => a.score - b.score);
    const sliceSize = Math.max(1,Math.ceil(ordered.length * 0.42));

    return obstacleFrequency === 'light'
      ? ordered.slice(0,sliceSize).map(item => item.pattern)
      : ordered.slice(-sliceSize).map(item => item.pattern);
  }

  function insertSectionsBeforeFinish(sectionIds,extraSectionIds) {
    const next = [...sectionIds];
    const finalSprintIndex = next.lastIndexOf('final-sprint');
    if (finalSprintIndex < 0) return next;
    next.splice(finalSprintIndex,0,...extraSectionIds);
    return next;
  }

  function extendGeneratedSections(
    sectionIds,
    random,
    courseLength,
    obstacleFrequency
  ) {
    const preset = COURSE_LENGTH_PRESETS[courseLength];
    const shouldExtendLong = courseLength === 'long';
    const shouldAddHeavyStandard =
      courseLength === 'standard' &&
      obstacleFrequency === 'heavy' &&
      sectionIds.length < preset.maxSections;

    if (!shouldExtendLong && !shouldAddHeavyStandard) return [...sectionIds];

    const maximumSections = shouldExtendLong
      ? COURSE_LENGTH_PRESETS.long.maxSections
      : COURSE_LENGTH_PRESETS.standard.maxSections;
    const minimumSections = shouldExtendLong
      ? COURSE_LENGTH_PRESETS.long.minSections
      : Math.min(maximumSections,sectionIds.length + 1);
    const chains = LONG_COURSE_EXTENSION_CHAINS[obstacleFrequency];
    let extended = [...sectionIds];
    let guard = 0;

    while (extended.length < minimumSections && guard < 12) {
      guard += 1;
      const validCandidates = chains
        .map(chain => insertSectionsBeforeFinish(extended,chain))
        .filter(candidate => {
          if (candidate.length > maximumSections) return false;
          return validateTrackRecipeCompatibility({
            id:'course-control-preview',
            sectionIds:candidate,
            showcase:false,
          }).pass;
        });

      if (!validCandidates.length) break;
      extended = validCandidates[Math.floor(random() * validCandidates.length)];
    }

    return extended;
  }

  function createSeededRandom(seed) {
    let state = hashTrackSeed(seed) || 0x6d2b79f5;
    return () => {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  function generateControlledTrackRecipe(
    rawSeed,
    {
      courseLength=activeCourseLength,
      obstacleFrequency=activeObstacleFrequency,
    }={}
  ) {
    const seed = normalizeTrackSeed(rawSeed) || 'marble-run';
    const normalizedLength = normalizeCourseLength(courseLength);
    const normalizedFrequency = normalizeObstacleFrequency(obstacleFrequency);
    const showcase = OBSTACLE_SHOWCASE_SEED_ALIASES.includes(seed);
    const defaultControls =
      normalizedLength === 'standard' &&
      normalizedFrequency === 'balanced';

    // Preserve every pre-8.3 generated seed when the default controls are used.
    const selectionSeed = defaultControls
      ? seed
      : `${seed}|${normalizedLength}|${normalizedFrequency}`;
    const random = createSeededRandom(selectionSeed);
    const normalPatterns = GENERATED_COURSE_PATTERNS.filter(
      pattern => !pattern.showcase
    );
    const eligiblePatterns = getPatternsForGenerationControls(
      normalPatterns,
      normalizedLength,
      normalizedFrequency
    );
    const pattern = showcase
      ? GENERATED_COURSE_PATTERNS.find(
          item => item.id === 'obstacle-showcase'
        )
      : eligiblePatterns[Math.floor(random() * eligiblePatterns.length)];
    const profile = showcase
      ? CLASSIC_TRACK_RECIPE
      : TRACK_RECIPE_VARIANTS[
          Math.floor(random() * TRACK_RECIPE_VARIANTS.length)
        ];
    const sectionIds = showcase
      ? pattern.sectionIds
      : extendGeneratedSections(
          pattern.sectionIds,
          random,
          normalizedLength,
          normalizedFrequency
        );
    const hashLabel = hashTrackSeed(selectionSeed)
      .toString(16)
      .padStart(8,'0');
    const lengthLabel = COURSE_LENGTH_PRESETS[normalizedLength].label;
    const frequencyLabel =
      OBSTACLE_FREQUENCY_PRESETS[normalizedFrequency].label;
    const settingsDescription = showcase
      ? 'Showcase ignores player length and obstacle controls.'
      : `${lengthLabel} length / ${frequencyLabel} obstacle rate.`;

    return freezeTrackRecipe({
      id:`generated-${hashLabel}-v2`,
      shortLabel:showcase ? 'SHOWCASE' : 'GENERATED',
      label:`${pattern.label} COURSE`,
      description:
        `${pattern.description} ${profile.tuning.label} timing. ` +
        settingsDescription,
      version:2,
      randomised:true,
      generated:true,
      dynamicLayout:true,
      requiresAllSections:false,
      allowDuplicates:true,
      seed,
      patternId:pattern.id,
      showcase:Boolean(pattern.showcase),
      obstacleLibraryVersion:9,
      courseLength:showcase ? 'showcase' : normalizedLength,
      obstacleFrequency:showcase ? 'showcase' : normalizedFrequency,
      advancedObstacleCount:getAdvancedObstacleCount(sectionIds),
      sectionIds,
      tuning:{
        ...profile.tuning,
        id:`generated-${profile.tuning.id}`,
        label:`${profile.tuning.label} / SEEDED`,
      },
    });
  }


  /* ── Section compatibility rules (Roadmap 6.4) ─────────────────────── */
  // These rules describe which validated section types may sit beside one
  // another and how often a section may appear in a future generated recipe.
  // They validate recipes only; the live 13-section course is not changed.
  function freezeCompatibilityRule(rule) {
    return Object.freeze({
      ...rule,
      allowedPreviousTypes:Object.freeze([...(rule.allowedPreviousTypes ?? [])]),
      allowedNextTypes:Object.freeze([...(rule.allowedNextTypes ?? [])]),
    });
  }

  const SECTION_TYPE_COMPATIBILITY = Object.freeze({
    start:freezeCompatibilityRule({
      maxInRecipe:1,
      allowSameTypeAdjacent:false,
      allowedPreviousTypes:[],
      allowedNextTypes:['speed'],
    }),
    speed:freezeCompatibilityRule({
      maxInRecipe:2,
      allowSameTypeAdjacent:false,
      allowedPreviousTypes:['start','transition','mixer','beam','bounce','gate'],
      allowedNextTypes:['mixer','transition','plinko','beam','bounce','gate'],
    }),
    mixer:freezeCompatibilityRule({
      maxInRecipe:4,
      allowSameTypeAdjacent:false,
      allowedPreviousTypes:['speed','transition','plinko','loop','beam','bounce','gate'],
      allowedNextTypes:['transition','plinko','loop','beam','bounce','gate'],
    }),
    transition:freezeCompatibilityRule({
      maxInRecipe:5,
      allowSameTypeAdjacent:false,
      allowedPreviousTypes:['speed','mixer','plinko','loop','beam','bounce','gate'],
      allowedNextTypes:['plinko','loop','mixer','sprint','beam','bounce','gate'],
    }),
    plinko:freezeCompatibilityRule({
      maxInRecipe:3,
      allowSameTypeAdjacent:false,
      allowedPreviousTypes:['speed','transition','mixer','beam','bounce','gate'],
      allowedNextTypes:['mixer','transition','loop','beam','bounce','gate'],
    }),
    loop:freezeCompatibilityRule({
      maxInRecipe:2,
      allowSameTypeAdjacent:false,
      allowedPreviousTypes:['transition','plinko','mixer','beam','bounce','gate'],
      allowedNextTypes:['mixer','transition','plinko','beam','bounce','gate'],
    }),
    beam:freezeCompatibilityRule({
      maxInRecipe:2,
      allowSameTypeAdjacent:false,
      allowedPreviousTypes:['transition','mixer','plinko','loop','bounce','gate'],
      allowedNextTypes:['mixer','transition','plinko','loop','sprint','bounce','gate'],
    }),
    bounce:freezeCompatibilityRule({
      maxInRecipe:2,
      allowSameTypeAdjacent:false,
      allowedPreviousTypes:['transition','mixer','plinko','loop','beam','gate'],
      allowedNextTypes:['mixer','transition','plinko','loop','beam','sprint','gate'],
    }),
    gate:freezeCompatibilityRule({
      maxInRecipe:2,
      allowSameTypeAdjacent:false,
      allowedPreviousTypes:['speed','transition','mixer','plinko','loop','beam','bounce'],
      allowedNextTypes:['mixer','transition','plinko','loop','beam','bounce','sprint'],
    }),
    sprint:freezeCompatibilityRule({
      maxInRecipe:1,
      allowSameTypeAdjacent:false,
      allowedPreviousTypes:['transition','mixer','plinko','loop','beam','bounce','gate'],
      allowedNextTypes:['finish'],
    }),
    finish:freezeCompatibilityRule({
      maxInRecipe:1,
      allowSameTypeAdjacent:false,
      allowedPreviousTypes:['sprint'],
      allowedNextTypes:[],
    }),
  });

  const SECTION_REPETITION_LIMITS = Object.freeze({
    'start-chute':Object.freeze({maxOccurrences:1,allowAdjacentDuplicate:false}),
    'speed-zone':Object.freeze({maxOccurrences:2,allowAdjacentDuplicate:false}),
    'early-mixer':Object.freeze({maxOccurrences:2,allowAdjacentDuplicate:false}),
    'dome-gravity':Object.freeze({maxOccurrences:2,allowAdjacentDuplicate:false}),
    'dome-orbit':Object.freeze({maxOccurrences:2,allowAdjacentDuplicate:false}),
    'funnel-1':Object.freeze({maxOccurrences:3,allowAdjacentDuplicate:false}),
    'funnel-pinpoint':Object.freeze({maxOccurrences:2,allowAdjacentDuplicate:false}),
    'funnel-twin':Object.freeze({maxOccurrences:2,allowAdjacentDuplicate:false}),
    'plinko-1':Object.freeze({maxOccurrences:2,allowAdjacentDuplicate:false}),
    'plinko-zigzag':Object.freeze({maxOccurrences:2,allowAdjacentDuplicate:false}),
    'plinko-diamond':Object.freeze({maxOccurrences:2,allowAdjacentDuplicate:false}),
    'mid-mixer':Object.freeze({maxOccurrences:2,allowAdjacentDuplicate:false}),
    'funnel-2':Object.freeze({maxOccurrences:3,allowAdjacentDuplicate:false}),
    'loop-section':Object.freeze({maxOccurrences:2,allowAdjacentDuplicate:false}),
    'loop-cascade':Object.freeze({maxOccurrences:2,allowAdjacentDuplicate:false}),
    'loop-slalom':Object.freeze({maxOccurrences:2,allowAdjacentDuplicate:false}),
    'balance-beam':Object.freeze({maxOccurrences:2,allowAdjacentDuplicate:false}),
    'bounce-chamber':Object.freeze({maxOccurrences:2,allowAdjacentDuplicate:false}),
    'split-gate':Object.freeze({maxOccurrences:2,allowAdjacentDuplicate:false}),
    'drop-tower':Object.freeze({maxOccurrences:2,allowAdjacentDuplicate:false}),
    'spiral-bowl':Object.freeze({maxOccurrences:2,allowAdjacentDuplicate:false}),
    'late-mixer':Object.freeze({maxOccurrences:2,allowAdjacentDuplicate:false}),
    'plinko-2':Object.freeze({maxOccurrences:2,allowAdjacentDuplicate:false}),
    'funnel-3':Object.freeze({maxOccurrences:3,allowAdjacentDuplicate:false}),
    'final-sprint':Object.freeze({maxOccurrences:1,allowAdjacentDuplicate:false}),
    finish:Object.freeze({maxOccurrences:1,allowAdjacentDuplicate:false}),
  });

  function validateTrackRecipeCompatibility(recipe) {
    const definitions = new Map(
      TRACK_SECTION_DEFINITIONS.map(section => [section.id,section])
    );
    const issues = [];
    const countsById = new Map();
    const countsByType = new Map();
    const resolved = recipe.sectionIds.map(sectionId => definitions.get(sectionId));

    recipe.sectionIds.forEach(sectionId => {
      countsById.set(sectionId,(countsById.get(sectionId) ?? 0) + 1);
      const section = definitions.get(sectionId);
      if (!section) {
        issues.push(`Unknown section ${sectionId}.`);
        return;
      }
      countsByType.set(section.type,(countsByType.get(section.type) ?? 0) + 1);
    });

    countsById.forEach((count,sectionId) => {
      const section = definitions.get(sectionId);
      const limit = SECTION_REPETITION_LIMITS[sectionId];
      if (!section || !limit) {
        issues.push(`No repetition rule exists for ${sectionId}.`);
        return;
      }
      if (!section.repeatable && count > 1) {
        issues.push(`${sectionId} is not repeatable.`);
      }
      if (count > limit.maxOccurrences) {
        issues.push(`${sectionId} appears ${count} times; maximum is ${limit.maxOccurrences}.`);
      }
    });

    countsByType.forEach((count,type) => {
      const rule = SECTION_TYPE_COMPATIBILITY[type];
      if (!rule) {
        issues.push(`No compatibility rule exists for section type ${type}.`);
      } else if (!recipe.showcase && count > rule.maxInRecipe) {
        issues.push(`Section type ${type} appears ${count} times; maximum is ${rule.maxInRecipe}.`);
      }
    });

    for (let index=0; index<resolved.length-1; index++) {
      const from = resolved[index];
      const to = resolved[index+1];
      if (!from || !to) continue;

      const fromRule = SECTION_TYPE_COMPATIBILITY[from.type];
      const toRule = SECTION_TYPE_COMPATIBILITY[to.type];
      if (!fromRule || !toRule) continue;

      if (!fromRule.allowedNextTypes.includes(to.type)) {
        issues.push(`${from.id} (${from.type}) cannot be followed by ${to.id} (${to.type}).`);
      }
      if (!toRule.allowedPreviousTypes.includes(from.type)) {
        issues.push(`${to.id} (${to.type}) cannot follow ${from.id} (${from.type}).`);
      }
      if (
        from.type === to.type &&
        (!fromRule.allowSameTypeAdjacent || !toRule.allowSameTypeAdjacent)
      ) {
        issues.push(`Adjacent ${from.type} sections are not permitted (${from.id} -> ${to.id}).`);
      }
      if (
        from.id === to.id &&
        !SECTION_REPETITION_LIMITS[from.id]?.allowAdjacentDuplicate
      ) {
        issues.push(`Adjacent duplicate section ${from.id} is not permitted.`);
      }
    }

    if (resolved[0]?.type !== 'start') {
      issues.push('Compatibility rules require a unique Start section first.');
    }
    if (resolved.at(-1)?.type !== 'finish') {
      issues.push('Compatibility rules require a unique Finish section last.');
    }
    if ((countsByType.get('start') ?? 0) !== 1) {
      issues.push('Recipe must contain exactly one Start section.');
    }
    if ((countsByType.get('finish') ?? 0) !== 1) {
      issues.push('Recipe must contain exactly one Finish section.');
    }

    return {
      recipeId:recipe.id,
      pass:issues.length === 0,
      issues,
      sectionCount:recipe.sectionIds.length,
      repeatableSectionUses:[...countsById.entries()]
        .filter(([sectionId,count]) => count > 1 && definitions.get(sectionId)?.repeatable)
        .reduce((total,[,count]) => total + count,0),
      signature:recipe.sectionIds.join('>'),
    };
  }

  function getSectionCompatibilityReport() {
    const activeRecipe = getActiveTrackRecipe();
    const recipes = [...TRACK_RECIPE_VARIANTS];
    if (activeRecipe?.generated && !recipes.some(recipe => recipe.id === activeRecipe.id)) {
      recipes.push(activeRecipe);
    }
    const recipeReports = recipes.map(validateTrackRecipeCompatibility);
    const issues = recipeReports.flatMap(report =>
      report.issues.map(issue => `${report.recipeId}: ${issue}`)
    );
    return {
      pass:issues.length === 0,
      issues,
      recipes:recipeReports.length,
      passingRecipes:recipeReports.filter(report => report.pass).length,
      typeRules:Object.keys(SECTION_TYPE_COMPATIBILITY).length,
      sectionRules:Object.keys(SECTION_REPETITION_LIMITS).length,
      repeatableSections:TRACK_SECTION_DEFINITIONS.filter(section => section.repeatable).length,
      signature:recipeReports.map(report =>
        `${report.recipeId}:${report.pass ? 'pass' : 'review'}:${report.signature}`
      ).join('|'),
    };
  }

  function buildSectionCompatibilityPanel() {
    const report = getSectionCompatibilityReport();
    const statusColor = report.pass ? '#00ffaa' : '#ff5566';
    const detail = report.pass
      ? `${report.passingRecipes}/${report.recipes} controlled recipes satisfy adjacency and repetition rules.`
      : report.issues.join(' · ');

    return `<div style="width:100%;padding:7px 8px;border:1px solid ${statusColor}55;border-radius:5px;background:rgba(0,30,45,0.5);font-size:9px;line-height:1.5;color:#9ab7c8;">
      <div style="color:${statusColor};font-weight:700;letter-spacing:.08em;">SECTION COMPATIBILITY: ${report.pass ? 'PASS' : 'REVIEW'}</div>
      <div>${detail}</div>
      <div style="opacity:.75;">${report.sectionRules} section limits · ${report.typeRules} type rules · ${report.repeatableSections} reusable sections</div>
    </div>`;
  }

  function cloneTrackSection(section) {
    return {
      ...section,
      templateId:section.templateId ?? section.id,
      entry:{...section.entry},
      exit:{...section.exit},
      componentIds:[...section.componentIds],
    };
  }

  function translateTrackSection(section,offsetY) {
    return {
      ...section,
      sourceStartY:section.startY,
      sourceEndY:section.endY,
      yOffset:offsetY,
      startY:section.startY + offsetY,
      endY:section.endY + offsetY,
      entry:{...section.entry,y:section.entry.y + offsetY},
      exit:{...section.exit,y:section.exit.y + offsetY},
      componentIds:[...section.componentIds],
    };
  }

  function layoutGeneratedTrackSections(sections) {
    let previous = null;
    return sections.map(section => {
      const targetEntryY = previous ? previous.exit.y : section.entry.y;
      const laidOut = translateTrackSection(section,targetEntryY - section.entry.y);
      previous = laidOut;
      return laidOut;
    });
  }

  function assembleTrackRecipe(recipe=CLASSIC_TRACK_RECIPE) {
    const definitions = new Map(
      TRACK_SECTION_DEFINITIONS.map(section => [section.id,section])
    );
    let sections = [];
    const issues = [];
    const seen = new Set();
    const occurrences = new Map();

    recipe.sectionIds.forEach((templateId,index) => {
      const definition = definitions.get(templateId);
      if (!definition) {
        issues.push(`Recipe position ${index + 1} references unknown section ${templateId}.`);
        return;
      }
      const occurrence = (occurrences.get(templateId) ?? 0) + 1;
      occurrences.set(templateId,occurrence);
      if (!recipe.allowDuplicates && seen.has(templateId)) {
        issues.push(`Recipe repeats ${templateId}, but duplicates are disabled.`);
        return;
      }
      seen.add(templateId);
      const section = cloneTrackSection(definition);
      section.templateId = templateId;
      section.occurrence = occurrence;
      section.id = recipe.dynamicLayout ? `${templateId}--${occurrence}` : templateId;
      sections.push(section);
    });

    if (recipe.requiresAllSections !== false) {
      const requiredIds = TRACK_SECTION_DEFINITIONS
        .filter(section => section.requiredInFixedCourse !== false)
        .map(section => section.id);
      const missingIds = requiredIds.filter(sectionId => !seen.has(sectionId));
      if (missingIds.length) {
        issues.push(`Recipe omits required sections: ${missingIds.join(', ')}.`);
      }
    }
    if (sections[0]?.type !== 'start') {
      issues.push('Recipe must begin with a start section.');
    }
    if (sections.at(-1)?.type !== 'finish') {
      issues.push('Recipe must end with a finish section.');
    }

    if (recipe.dynamicLayout) {
      sections = layoutGeneratedTrackSections(sections);
    }

    return {
      recipe:{
        id:recipe.id,
        shortLabel:recipe.shortLabel,
        label:recipe.label,
        description:recipe.description,
        version:recipe.version,
        randomised:recipe.randomised,
        generated:Boolean(recipe.generated),
        dynamicLayout:Boolean(recipe.dynamicLayout),
        requiresAllSections:recipe.requiresAllSections !== false,
        allowDuplicates:recipe.allowDuplicates,
        seed:recipe.seed ?? '',
        patternId:recipe.patternId ?? '',
        showcase:Boolean(recipe.showcase),
        obstacleLibraryVersion:recipe.obstacleLibraryVersion ?? 0,
        sectionIds:[...recipe.sectionIds],
        tuning:{...recipe.tuning},
      },
      sections,
      pass:issues.length === 0,
      issues,
      signature:sections.map(section => `${section.id}@${section.startY}-${section.endY}`).join('>'),
    };
  }

  /* ── Section connection system (Milestone 5.2) ──────────────────────── */
  // Connections are derived from adjacent section exit/entry metadata. They
  // describe the fixed course only; no coordinates or obstacles are moved.
  const TRACK_CONNECTION_RULES = Object.freeze({
    maxVerticalGap:12,
    minOverlapRatio:0.5,
  });

  function horizontalConnectionOverlap(exit, entry) {
    const exitLeft = exit.x - exit.width / 2;
    const exitRight = exit.x + exit.width / 2;
    const entryLeft = entry.x - entry.width / 2;
    const entryRight = entry.x + entry.width / 2;
    return Math.max(0, Math.min(exitRight,entryRight) - Math.max(exitLeft,entryLeft));
  }

  function createSectionConnection(fromSection,toSection,index) {
    const deltaX = toSection.entry.x - fromSection.exit.x;
    const deltaY = toSection.entry.y - fromSection.exit.y;
    const overlapWidth = horizontalConnectionOverlap(fromSection.exit,toSection.entry);
    const narrowerWidth = Math.min(fromSection.exit.width,toSection.entry.width);
    const overlapRatio = narrowerWidth > 0 ? overlapWidth / narrowerWidth : 0;
    const issues = [];

    if (deltaY < 0) {
      issues.push(`Vertical overlap/backtrack of ${Math.abs(deltaY)}px.`);
    } else if (deltaY > TRACK_CONNECTION_RULES.maxVerticalGap) {
      issues.push(`Vertical gap ${deltaY}px exceeds ${TRACK_CONNECTION_RULES.maxVerticalGap}px.`);
    }
    if (overlapRatio < TRACK_CONNECTION_RULES.minOverlapRatio) {
      issues.push(`Horizontal overlap ${(overlapRatio*100).toFixed(0)}% is below ${(TRACK_CONNECTION_RULES.minOverlapRatio*100).toFixed(0)}%.`);
    }

    const connectionType = deltaY === 0
      ? 'direct'
      : deltaY > 0 && deltaY <= TRACK_CONNECTION_RULES.maxVerticalGap
        ? 'short-drop'
        : deltaY < 0
          ? 'overlap'
          : 'gap';

    return {
      id:`${fromSection.id}--${toSection.id}`,
      order:index + 1,
      fromSectionId:fromSection.id,
      toSectionId:toSection.id,
      from:{...fromSection.exit},
      to:{...toSection.entry},
      deltaX,
      deltaY,
      overlapWidth,
      overlapRatio,
      connectionType,
      pass:issues.length === 0,
      issues,
    };
  }

  function createTrackSectionConnections(sections) {
    const connections = [];
    for (let i=0; i<sections.length-1; i++) {
      const connection = createSectionConnection(sections[i],sections[i+1],i);
      connections.push(connection);
      sections[i].outgoingConnectionId = connection.id;
      sections[i+1].incomingConnectionId = connection.id;
    }
    return connections;
  }

  function getTrackConnectionReport(trackData=track) {
    const sections = trackData?.sections ?? [];
    const connections = trackData?.connections ?? [];
    const expectedConnections = Math.max(0,sections.length-1);
    const issues = [];

    if (connections.length !== expectedConnections) {
      issues.push(`Expected ${expectedConnections} connection records; found ${connections.length}.`);
    }
    connections.forEach(connection => {
      if (!connection.pass) {
        issues.push(`${connection.id}: ${connection.issues.join(' ')}`);
      }
    });

    return {
      pass:issues.length === 0,
      issues,
      sections:sections.length,
      connected:connections.filter(connection => connection.pass).length,
      expectedConnections,
      direct:connections.filter(connection => connection.connectionType === 'direct').length,
      shortDrops:connections.filter(connection => connection.connectionType === 'short-drop').length,
      signature:connections.map(connection =>
        `${connection.fromSectionId}>${connection.toSectionId}:${connection.connectionType}:${connection.deltaY}`
      ).join('|'),
    };
  }

  function buildTrackConnectionPanel() {
    const report = getTrackConnectionReport();
    const statusColor = report.pass ? '#00ffaa' : '#ff5566';
    const detail = report.pass
      ? `${report.connected}/${report.expectedConnections} adjacent joins validated across ${report.sections} sections.`
      : report.issues.join(' · ');

    return `<div style="width:100%;padding:7px 8px;border:1px solid ${statusColor}55;border-radius:5px;background:rgba(0,30,45,0.5);font-size:9px;line-height:1.5;color:#9ab7c8;">
      <div style="color:${statusColor};font-weight:700;letter-spacing:.08em;">TRACK CONNECTIONS: ${report.pass ? 'PASS' : 'REVIEW'}</div>
      <div>${detail}</div>
      <div style="opacity:.75;">${report.direct} direct joins · ${report.shortDrops} controlled short drops · max gap ${TRACK_CONNECTION_RULES.maxVerticalGap}px</div>
    </div>`;
  }


  /* ── Section builder system (Milestone 5.3) ─────────────────────────── */
  // Every existing obstacle block now has one named builder. The registry is
  // keyed by the builderKey already stored in the 5.1 section manifest. The
  // builders below reproduce the original coordinates and fixed order exactly.
  const TRACK_BUILD_EXPECTED_COUNTS = Object.freeze({
    segments:14,
    pegs:55,
    boosts:3,
    funnels:3,
    loops:2,
    domes:0,
    mixers:3,
    beams:0,
    gates:0,
  });

  function createTrackBuildContext() {
    const context = {
      segments:[],
      pegs:[],
      boosts:[],
      funnels:[],
      loops:[],
      domes:[],
      mixers:[],
      beams:[],
      gates:[],
      sectionBuilds:[],
      activeBuild:null,
    };

    function beginSection(section,index) {
      if (context.activeBuild) {
        throw new Error(`Section builder ${context.activeBuild.builderKey} was not closed.`);
      }
      context.activeBuild = {
        order:index + 1,
        sectionId:section.id,
        templateId:section.templateId ?? section.id,
        occurrence:section.occurrence ?? 1,
        yOffset:section.yOffset ?? 0,
        builderKey:section.builderKey,
        componentIds:[],
        itemCounts:{},
      };
      context.sectionBuilds.push(context.activeBuild);
    }

    function endSection() {
      if (!context.activeBuild) throw new Error('No active section builder to close.');
      context.activeBuild = null;
    }

    function translateBuiltItem(collectionName,item,build) {
      const offsetY = build.yOffset ?? 0;
      const translated = {...item};
      if (collectionName === 'segments') {
        translated.y1 += offsetY;
        translated.y2 += offsetY;
      } else if (collectionName === 'pegs' || collectionName === 'boosts' || collectionName === 'funnels') {
        translated.y += offsetY;
        if (collectionName === 'pegs' && translated.id) {
          translated.basePegId = translated.id;
          if (build.sectionId !== build.templateId || build.occurrence > 1) {
            translated.id = `${translated.id}--${build.sectionId}`;
          }
        }
      } else if (collectionName === 'loops' || collectionName === 'domes') {
        translated.cy += offsetY;
        if (translated.id) {
          if (collectionName === 'loops') translated.baseLoopId = translated.id;
          else translated.baseDomeId = translated.id;
          if (build.sectionId !== build.templateId || build.occurrence > 1) {
            translated.id = `${translated.id}--${build.sectionId}`;
          }
        }
      } else if (collectionName === 'mixers') {
        translated.cy += offsetY;
        translated.releaseY += offsetY;
        translated.baseMixerId = translated.id;
        if (build.sectionId !== build.templateId || build.occurrence > 1) {
          translated.id = `${translated.id}--${build.sectionId}`;
        }
      } else if (collectionName === 'beams') {
        translated.cy += offsetY;
        translated.baseBeamId = translated.id;
        if (build.sectionId !== build.templateId || build.occurrence > 1) {
          translated.id = `${translated.id}--${build.sectionId}`;
        }
      } else if (collectionName === 'gates') {
        translated.cy += offsetY;
        translated.baseGateId = translated.id;
        if (build.sectionId !== build.templateId || build.occurrence > 1) {
          translated.id = `${translated.id}--${build.sectionId}`;
        }
      }
      return translated;
    }

    function addItem(collectionName,componentId,item) {
      if (!context.activeBuild) {
        throw new Error(`Cannot add ${componentId}; no section builder is active.`);
      }
      if (!context.activeBuild.componentIds.includes(componentId)) {
        context.activeBuild.componentIds.push(componentId);
      }
      context.activeBuild.itemCounts[collectionName] =
        (context.activeBuild.itemCounts[collectionName] ?? 0) + 1;
      context[collectionName].push({
        ...translateBuiltItem(collectionName,item,context.activeBuild),
        sectionId:context.activeBuild.sectionId,
        templateSectionId:context.activeBuild.templateId,
        componentId,
      });
    }

    context.beginSection = beginSection;
    context.endSection = endSection;
    context.segment = (componentId,x1,y1,x2,y2,type='wall') =>
      addItem('segments',componentId,{x1,y1,x2,y2,type});
    context.peg = (componentId,peg) => addItem('pegs',componentId,peg);
    context.boost = (componentId,boost) => addItem('boosts',componentId,boost);
    context.funnel = (componentId,funnel) => addItem('funnels',componentId,funnel);
    context.loop = (componentId,loop) => addItem('loops',componentId,loop);
    context.dome = (componentId,dome) => addItem('domes',componentId,dome);
    context.mixer = (componentId,mixer) => addItem('mixers',componentId,mixer);
    context.beam = (componentId,beam) => addItem('beams',componentId,beam);
    context.gate = (componentId,gate) => addItem('gates',componentId,gate);
    return context;
  }

  function buildStartChuteSection(ctx) {
    ctx.segment('chute-walls',W/2-60,40,W/2-60,200);
    ctx.segment('chute-walls',W/2+60,40,W/2+60,200);
    ctx.segment('opening-ramps',W/2-60,200,60,360,'ramp');
    ctx.segment('opening-ramps',W/2+60,200,W-60,360,'ramp');
  }

  function buildSpeedZoneSection(ctx) {
    for (let i=0; i<3; i++) {
      ctx.boost('boost-pads',{x:60+i*100,y:375,w:70,h:16,label:'BOOST'});
    }
    ctx.segment('speed-floor',30,480,W-30,480,'floor');
  }

  function buildEarlyMixerSection(ctx) {
    ctx.mixer('early-vortex',{
      id:'early-vortex',label:'EARLY MIXER',kind:'early',
      cx:W/2,cy:600,rx:165,ry:105,holeR:18,captureHalfW:172,
      releaseY:714,angularSpeedMin:0.075,angularSpeedRange:0.035,
      orbitMinTurns:0.9,orbitTurnRange:1.15,shrinkAmount:0.88,
      releaseSpread:18,releaseVxRange:2.8,releaseVyMin:4.8,
      releaseVyRange:1.4,
    });
    ctx.segment('mixer-floor',30,720,W-30,720,'floor');
  }

  function buildFunnel1Section(ctx) {
    ctx.funnel('funnel-1',{x:W/2,y:770,topW:300,botW:55,h:100});
  }

  function buildFunnelPinpointSection(ctx) {
    ctx.funnel('funnel-pinpoint',{
      x:W/2,y:790,topW:320,botW:34,h:140,
    });
  }

  function buildFunnelTwinSection(ctx) {
    // The centre peg directs the pack into two independent narrowing lanes.
    ctx.peg('twin-splitter-peg',{x:W/2,y:1304,big:true});
    ctx.funnel('funnel-twin-left',{
      x:112,y:1360,topW:154,botW:46,h:120,
    });
    ctx.funnel('funnel-twin-right',{
      x:288,y:1360,topW:154,botW:46,h:120,
    });
  }

  function buildPlinko1Section(ctx) {
    for (let row=0; row<7; row++) {
      const cols = row%2===0 ? 5 : 4;
      const offsetX = row%2===0 ? 0 : 28;
      for (let c=0; c<cols; c++) {
        ctx.peg('plinko-1-pegs',{x:55+offsetX+c*58,y:840+row*36});
      }
    }
    ctx.segment('plinko-1-floor',30,1080,W-30,1080,'floor');
  }

  function buildPlinkoZigzagSection(ctx) {
    const rows = [
      [52,116,180,244,308],
      [84,148,212,276,340],
      [52,116,180,244,308],
      [84,148,212,276,340],
      [52,116,180,244,308],
      [84,148,212,276,340],
    ];
    rows.forEach((xs,row) => {
      xs.forEach((x,column) => {
        ctx.peg('plinko-zigzag-pegs',{
          x,
          y:842 + row * 34,
          big:(row + column) % 4 === 0,
        });
      });
    });
    ctx.segment('plinko-zigzag-floor',30,1060,W-30,1060,'floor');
  }

  function buildPlinkoDiamondSection(ctx) {
    const rowCounts = [3,4,5,4,3,2];
    rowCounts.forEach((count,row) => {
      const spacing = 62;
      const startX = W / 2 - ((count - 1) * spacing) / 2;
      for (let column=0; column<count; column++) {
        ctx.peg('plinko-diamond-pegs',{
          x:startX + column * spacing,
          y:842 + row * 34,
          big:row === 2 || (row === 4 && column === 1),
        });
      }
    });
    ctx.segment('plinko-diamond-floor',30,1040,W-30,1040,'floor');
  }

  function buildGravityDomeSection(ctx) {
    ctx.dome('gravity-dome-shell',{
      id:'gravity-dome-shell',label:'GRAVITY DOME',kind:'gravity',
      cx:W/2,cy:1180,rx:162,ry:92,holeR:20,
    });
    // The shell is visual; this hidden mandatory core guarantees every marble
    // circles inward and exits through the centre hole rather than passing
    // behind the graphic.
    ctx.mixer('gravity-dome-core',{
      id:'gravity-dome-core',label:'GRAVITY DOME',kind:'dome-gravity',visual:'hidden',
      cx:W/2,cy:1180,rx:158,ry:88,holeR:20,captureHalfW:170,
      releaseY:1290,angularSpeedMin:0.055,angularSpeedRange:0.025,
      orbitMinTurns:0.55,orbitTurnRange:0.65,shrinkAmount:0.92,
      releaseSpread:14,releaseVxRange:2.3,releaseVyMin:4.7,
      releaseVyRange:1.2,
    });
  }

  function buildOrbitDomeSection(ctx) {
    ctx.dome('orbit-dome-shell',{
      id:'orbit-dome-shell',label:'ORBIT DOME',kind:'orbit',
      cx:W/2,cy:1720,rx:168,ry:96,holeR:22,
    });
    ctx.mixer('orbit-dome-core',{
      id:'orbit-dome-core',label:'ORBIT DOME',kind:'dome-orbit',visual:'hidden',
      cx:W/2,cy:1720,rx:164,ry:92,holeR:22,captureHalfW:176,
      releaseY:1830,angularSpeedMin:0.072,angularSpeedRange:0.035,
      orbitMinTurns:1.15,orbitTurnRange:1.1,shrinkAmount:0.9,
      releaseSpread:24,releaseVxRange:3.6,releaseVyMin:5,
      releaseVyRange:1.6,
    });
  }

  function buildMidMixerSection(ctx) {
    ctx.mixer('mid-vortex',{
      id:'mid-vortex',label:'MID MIXER',kind:'mid',
      cx:W/2,cy:1175,rx:140,ry:82,holeR:17,captureHalfW:172,
      releaseY:1270,angularSpeedMin:0.065,angularSpeedRange:0.04,
      orbitMinTurns:0.8,orbitTurnRange:1.45,shrinkAmount:0.9,
      releaseSpread:22,releaseVxRange:3.2,releaseVyMin:5,
      releaseVyRange:1.5,
    });
  }

  function buildFunnel2Section(ctx) {
    ctx.funnel('funnel-2',{x:W/2,y:1330,topW:260,botW:70,h:100});
  }

  function buildLoopSection(ctx) {
    ctx.loop('loop-left',{id:'loop-left',label:'LEFT LOOP',kind:'classic',cx:W/2-65,cy:1470,r:70});
    ctx.loop('loop-right',{id:'loop-right',label:'RIGHT LOOP',kind:'classic',cx:W/2+80,cy:1530,r:60});
    ctx.segment('loop-floor',30,1620,W-30,1620,'floor');
  }

  function buildLoopCascadeSection(ctx) {
    // Three separated circles form a triangular cascade without overlapping,
    // leaving multiple safe routes for the pack to split and recombine.
    ctx.loop('cascade-loop-left',{
      id:'cascade-loop-left',label:'CASCADE L',kind:'cascade',cx:90,cy:1450,r:48,
    });
    ctx.loop('cascade-loop-centre',{
      id:'cascade-loop-centre',label:'CASCADE C',kind:'cascade',cx:W/2,cy:1540,r:58,
    });
    ctx.loop('cascade-loop-right',{
      id:'cascade-loop-right',label:'CASCADE R',kind:'cascade',cx:310,cy:1450,r:48,
    });
    ctx.segment('cascade-loop-floor',30,1680,W-30,1680,'floor');
  }

  function buildLoopSlalomSection(ctx) {
    // A compact centre chevron catches the direct drop from the Spiral Bowl
    // and sends each marble into the left or right slalom route. The previous
    // open centre lane allowed some marbles to miss all three Loop obstacles.
    ctx.segment('slalom-centre-gate-left',W/2,1385,175,1415,'curve');
    ctx.segment('slalom-centre-gate-right',W/2,1385,225,1415,'curve');
    // Alternating left/right circles create a descending slalom corridor.
    ctx.loop('slalom-loop-1',{
      id:'slalom-loop-1',label:'SLALOM 1',kind:'slalom',cx:110,cy:1450,r:48,
    });
    ctx.loop('slalom-loop-2',{
      id:'slalom-loop-2',label:'SLALOM 2',kind:'slalom',cx:290,cy:1530,r:48,
    });
    ctx.loop('slalom-loop-3',{
      id:'slalom-loop-3',label:'SLALOM 3',kind:'slalom',cx:110,cy:1610,r:48,
    });
    ctx.segment('slalom-loop-floor',30,1680,W-30,1680,'floor');
  }

  function buildBalanceBeamSection(ctx) {
    // Two short guide ramps direct the pack onto a live pivoting beam. The
    // beam tilts under marble load, springs gently back toward level and has
    // limited rotation so it cannot overturn or trap the field permanently.
    ctx.segment('balance-guide-left',30,1400,88,1460,'ramp');
    ctx.segment('balance-guide-right',W-30,1400,W-88,1460,'ramp');
    ctx.beam('balance-beam-main',{
      id:'balance-beam-main',label:'BALANCE BEAM',kind:'balance',
      cx:W/2,cy:1510,length:250,thickness:10,
      angle:0,angularVelocity:0,restAngle:0,
      minAngle:-0.32,maxAngle:0.32,
      spring:0.012,damping:0.965,torqueScale:0.00019,
      maxAngularVelocity:0.035,restitution:0.5,
    });
    ctx.segment('balance-beam-floor',30,1640,W-30,1640,'floor');
  }

  function buildBounceChamberSection(ctx) {
    // Angled entry rails feed marbles into seven high-energy bumpers. The
    // bumper response permits a brief upward rebound while retaining a small
    // downward bias so the pack continues toward the exit.
    ctx.segment('bounce-entry-left',30,1400,92,1450,'bounce');
    ctx.segment('bounce-entry-right',W-30,1400,W-92,1450,'bounce');
    ctx.segment('bounce-wall-left',52,1448,38,1638,'bounce');
    ctx.segment('bounce-wall-right',W-52,1448,W-38,1638,'bounce');
    [
      {id:'bounce-bumper-1',x:125,y:1478,radius:13},
      {id:'bounce-bumper-2',x:275,y:1478,radius:13},
      {id:'bounce-bumper-3',x:200,y:1525,radius:15},
      {id:'bounce-bumper-4',x:95,y:1572,radius:13},
      {id:'bounce-bumper-5',x:305,y:1572,radius:13},
      {id:'bounce-bumper-6',x:155,y:1620,radius:12},
      {id:'bounce-bumper-7',x:245,y:1620,radius:12},
    ].forEach(bumper => ctx.peg('bounce-bumpers',{
      ...bumper,kind:'bumper',big:true,
      restitution:1.08,sideKick:1.05,verticalKickScale:0.52,
      upwardVelocityLimit:-4.4,downwardBias:0.32,
    }));
    ctx.segment('bounce-chamber-floor',30,1660,W-30,1660,'floor');
  }

  function buildSplitGateSection(ctx) {
    // Entry rails compress the pack toward one live swinging paddle. The
    // paddle changes target direction at controlled intervals, then the lower
    // chevron guarantees that no marble can continue through the centre lane.
    ctx.segment('split-entry-left',30,1400,145,1460,'gate');
    ctx.segment('split-entry-right',W-30,1400,255,1460,'gate');
    ctx.gate('split-gate-main',{
      id:'split-gate-main',label:'SPLIT GATE',kind:'split',
      cx:W/2,cy:1455,length:118,thickness:11,
      angle:-0.45,targetAngle:0.45,angularVelocity:0,
      minAngle:-0.55,maxAngle:0.55,
      spring:0.022,damping:0.91,maxAngularVelocity:0.055,
      restitution:0.58,sidePush:0.95,downwardBias:1.4,
      switchCountdown:48,switchMinFrames:38,switchFrameRange:34,
      direction:1,
    });
    ctx.segment('split-exit-left',W/2,1572,135,1620,'gate');
    ctx.segment('split-exit-right',W/2,1572,265,1620,'gate');
    ctx.segment('split-gate-floor',30,1640,W-30,1640,'floor');
  }

  function buildDropTowerSection(ctx) {
    // A narrow vertical shaft forces the pack across three alternating shelves.
    // Every shelf crosses the centre line, so a marble cannot fall straight
    // through the tower without changing lanes at least once.
    ctx.segment('tower-entry-left',30,1400,76,1440,'tower');
    ctx.segment('tower-entry-right',W-30,1400,W-76,1440,'tower');
    ctx.segment('tower-wall-left',48,1438,48,1680,'tower');
    ctx.segment('tower-wall-right',W-48,1438,W-48,1680,'tower');
    ctx.segment('tower-shelf-1',48,1480,282,1518,'tower');
    ctx.segment('tower-shelf-2',W-48,1560,118,1598,'tower');
    ctx.segment('tower-shelf-3',48,1640,282,1678,'tower');
    ctx.segment('tower-floor',30,1700,W-30,1700,'floor');
  }

  function buildSpiralBowlSection(ctx) {
    // A visible spiral shell is paired with a mandatory hidden core. Every
    // entering marble follows a long inward orbit and exits through the centre.
    ctx.dome('spiral-bowl-shell',{
      id:'spiral-bowl-shell',label:'SPIRAL BOWL',kind:'spiral',
      cx:W/2,cy:1735,rx:168,ry:105,holeR:21,
    });
    ctx.mixer('spiral-bowl-core',{
      id:'spiral-bowl-core',label:'SPIRAL BOWL',kind:'spiral-bowl',visual:'hidden',
      cx:W/2,cy:1735,rx:164,ry:101,holeR:21,captureHalfW:176,
      releaseY:1850,angularSpeedMin:0.068,angularSpeedRange:0.026,
      orbitMinTurns:1.75,orbitTurnRange:1.05,shrinkAmount:0.92,
      releaseSpread:20,releaseVxRange:3.1,releaseVyMin:5.1,
      releaseVyRange:1.5,
    });
  }

  function buildLateMixerSection(ctx) {
    ctx.mixer('late-vortex',{
      id:'late-vortex',label:'LATE OVERTAKE',kind:'late',
      cx:W/2,cy:1710,rx:150,ry:88,holeR:18,captureHalfW:176,
      releaseY:1792,angularSpeedMin:0.07,angularSpeedRange:0.045,
      orbitMinTurns:0.55,orbitTurnRange:1.85,shrinkAmount:0.91,
      releaseSpread:34,releaseVxRange:4,releaseVyMin:5.2,
      releaseVyRange:1.8,
    });
  }

  function buildPlinko2Section(ctx) {
    for (let row=0; row<5; row++) {
      const cols = row%2===0 ? 5 : 4;
      const offsetX = row%2===0 ? 0 : 28;
      for (let c=0; c<cols; c++) {
        ctx.peg('plinko-2-pegs',{x:40+offsetX+c*68,y:1820+row*32,big:true});
      }
    }
    ctx.segment('plinko-2-floor',30,1960,W-30,1960,'floor');
  }

  function buildFunnel3Section(ctx) {
    ctx.funnel('funnel-3',{x:W/2,y:2010,topW:320,botW:90,h:100});
  }

  function buildFinalSprintSection(ctx) {
    // Physical full-width funnel: every legal marble x-position meets either
    // a funnel rail or the narrow centre chute. This replaces the former
    // decorative-looking zigzag and removes its side/centre bypass routes.
    ctx.segment('finish-funnel-left',20,2060,176,2220,'ramp');
    ctx.segment('finish-funnel-right',W-20,2060,224,2220,'ramp');
    ctx.segment('finish-chute-left',176,2220,176,2380,'wall');
    ctx.segment('finish-chute-right',224,2220,224,2380,'wall');
  }

  function buildFinishLineSection(ctx,section) {
    // Builders emit template-local geometry; the build context applies the
    // section instance's vertical offset exactly once.
    const finishY = section.exit.y - (section.yOffset ?? 0);
    const halfWidth = section.exit.width / 2;
    ctx.segment(
      'finish-line',
      section.exit.x - halfWidth,
      finishY,
      section.exit.x + halfWidth,
      finishY,
      'finish'
    );
  }

  const TRACK_SECTION_BUILDERS = Object.freeze({
    startChute:buildStartChuteSection,
    speedZone:buildSpeedZoneSection,
    earlyMixer:buildEarlyMixerSection,
    funnel1:buildFunnel1Section,
    funnelPinpoint:buildFunnelPinpointSection,
    funnelTwin:buildFunnelTwinSection,
    domeGravity:buildGravityDomeSection,
    domeOrbit:buildOrbitDomeSection,
    plinko1:buildPlinko1Section,
    plinkoZigzag:buildPlinkoZigzagSection,
    plinkoDiamond:buildPlinkoDiamondSection,
    midMixer:buildMidMixerSection,
    funnel2:buildFunnel2Section,
    loopSection:buildLoopSection,
    loopCascade:buildLoopCascadeSection,
    loopSlalom:buildLoopSlalomSection,
    balanceBeam:buildBalanceBeamSection,
    bounceChamber:buildBounceChamberSection,
    splitGate:buildSplitGateSection,
    dropTower:buildDropTowerSection,
    spiralBowl:buildSpiralBowlSection,
    lateMixer:buildLateMixerSection,
    plinko2:buildPlinko2Section,
    funnel3:buildFunnel3Section,
    finalSprint:buildFinalSprintSection,
    finishLine:buildFinishLineSection,
  });

  const TRACK_SECTION_EXPECTED_COUNTS = Object.freeze({
    startChute:Object.freeze({segments:4}),
    speedZone:Object.freeze({segments:1,boosts:3}),
    earlyMixer:Object.freeze({segments:1,mixers:1}),
    funnel1:Object.freeze({funnels:1}),
    funnelPinpoint:Object.freeze({funnels:1}),
    funnelTwin:Object.freeze({funnels:2,pegs:1}),
    domeGravity:Object.freeze({domes:1,mixers:1}),
    domeOrbit:Object.freeze({domes:1,mixers:1}),
    plinko1:Object.freeze({segments:1,pegs:32}),
    plinkoZigzag:Object.freeze({segments:1,pegs:30}),
    plinkoDiamond:Object.freeze({segments:1,pegs:21}),
    midMixer:Object.freeze({mixers:1}),
    funnel2:Object.freeze({funnels:1}),
    loopSection:Object.freeze({segments:1,loops:2}),
    loopCascade:Object.freeze({segments:1,loops:3}),
    loopSlalom:Object.freeze({segments:3,loops:3}),
    balanceBeam:Object.freeze({segments:3,beams:1}),
    bounceChamber:Object.freeze({segments:5,pegs:7}),
    splitGate:Object.freeze({segments:5,gates:1}),
    dropTower:Object.freeze({segments:8}),
    spiralBowl:Object.freeze({domes:1,mixers:1}),
    lateMixer:Object.freeze({mixers:1}),
    plinko2:Object.freeze({segments:1,pegs:23}),
    funnel3:Object.freeze({funnels:1}),
    finalSprint:Object.freeze({segments:4}),
    finishLine:Object.freeze({segments:1}),
  });

  function getTrackBuilderReport(trackData=track) {
    const sections = trackData?.sections ?? [];
    const builds = trackData?.sectionBuilds ?? [];
    const issues = [];

    if (builds.length !== sections.length) {
      issues.push(`Expected ${sections.length} section builds; found ${builds.length}.`);
    }

    sections.forEach((section,index) => {
      const builder = TRACK_SECTION_BUILDERS[section.builderKey];
      const build = builds[index];
      if (typeof builder !== 'function') {
        issues.push(`${section.id} has no registered builder for ${section.builderKey}.`);
      }
      if (!build || build.sectionId !== section.id || build.builderKey !== section.builderKey) {
        issues.push(`${section.id} was not built in the declared assembled order.`);
        return;
      }
      const missing = section.componentIds.filter(id => !build.componentIds.includes(id));
      const unexpected = build.componentIds.filter(id => !section.componentIds.includes(id));
      if (missing.length) issues.push(`${section.id} missing components: ${missing.join(', ')}.`);
      if (unexpected.length) issues.push(`${section.id} built unexpected components: ${unexpected.join(', ')}.`);

      const expectedCounts = TRACK_SECTION_EXPECTED_COUNTS[section.builderKey] ?? {};
      const countNames = new Set([...Object.keys(expectedCounts),...Object.keys(build.itemCounts)]);
      countNames.forEach(collectionName => {
        const expected = expectedCounts[collectionName] ?? 0;
        const actual = build.itemCounts[collectionName] ?? 0;
        if (actual !== expected) {
          issues.push(`${section.id} ${collectionName} count changed: expected ${expected}, found ${actual}.`);
        }
      });
    });

    const counts = Object.fromEntries(
      Object.keys(TRACK_BUILD_EXPECTED_COUNTS).map(name => [name,trackData?.[name]?.length ?? 0])
    );

    if (!trackData?.recipe?.generated) {
      Object.entries(TRACK_BUILD_EXPECTED_COUNTS).forEach(([collectionName,expected]) => {
        const actual = counts[collectionName];
        if (actual !== expected) {
          issues.push(`${collectionName} count changed: expected ${expected}, found ${actual}.`);
        }
      });
    }

    return {
      pass:issues.length === 0,
      issues,
      generated:Boolean(trackData?.recipe?.generated),
      sections:sections.length,
      builds:builds.length,
      counts,
      signature:builds.map(build =>
        `${build.order}:${build.sectionId}:${build.builderKey}:${build.componentIds.join('+')}`
      ).join('|'),
    };
  }

  function buildTrackBuilderPanel() {
    const report = getTrackBuilderReport();
    const statusColor = report.pass ? '#00ffaa' : '#ff5566';
    const detail = report.pass
      ? `${report.builds}/${report.sections} named builders reproduced the assembled course.`
      : report.issues.join(' · ');
    const counts = report.counts;

    return `<div style="width:100%;padding:7px 8px;border:1px solid ${statusColor}55;border-radius:5px;background:rgba(0,30,45,0.5);font-size:9px;line-height:1.5;color:#9ab7c8;">
      <div style="color:${statusColor};font-weight:700;letter-spacing:.08em;">SECTION BUILDERS: ${report.pass ? 'PASS' : 'REVIEW'}</div>
      <div>${detail}</div>
      <div style="opacity:.75;">${counts.segments} segments · ${counts.pegs} pegs · ${counts.mixers} mixers · ${counts.funnels} funnels</div>
    </div>`;
  }

  /* ── Obstacle library audit (Phase 7.1) ─────────────────────────────── */
  const PLINKO_LIBRARY_IDS = Object.freeze([
    'plinko-1',
    'plinko-2',
    'plinko-zigzag',
    'plinko-diamond',
  ]);
  const NEW_PLINKO_VARIANT_IDS = Object.freeze([
    'plinko-zigzag',
    'plinko-diamond',
  ]);

  function getObstacleLibraryReport(trackData=track) {
    const definitions = new Map(
      TRACK_SECTION_DEFINITIONS.map(section => [section.id,section])
    );
    const issues = [];
    const patternUsage = Object.fromEntries(
      NEW_PLINKO_VARIANT_IDS.map(sectionId => [
        sectionId,
        GENERATED_COURSE_PATTERNS.filter(pattern => pattern.sectionIds.includes(sectionId)).length,
      ])
    );

    PLINKO_LIBRARY_IDS.forEach(sectionId => {
      const section = definitions.get(sectionId);
      if (!section) {
        issues.push(`Missing Plinko library section ${sectionId}.`);
        return;
      }
      if (section.type !== 'plinko') {
        issues.push(`${sectionId} is not registered as a Plinko section.`);
      }
      if (typeof TRACK_SECTION_BUILDERS[section.builderKey] !== 'function') {
        issues.push(`${sectionId} has no registered builder.`);
      }
      const expected = TRACK_SECTION_EXPECTED_COUNTS[section.builderKey];
      if (!expected || expected.pegs < 1 || expected.segments !== 1) {
        issues.push(`${sectionId} has invalid expected builder counts.`);
      }
      if (!SECTION_REPETITION_LIMITS[sectionId]) {
        issues.push(`${sectionId} has no repetition rule.`);
      }
    });

    NEW_PLINKO_VARIANT_IDS.forEach(sectionId => {
      const section = definitions.get(sectionId);
      if (section?.requiredInFixedCourse !== false) {
        issues.push(`${sectionId} must remain optional for the fixed course.`);
      }
      if (!patternUsage[sectionId]) {
        issues.push(`${sectionId} is not used by any generated pattern.`);
      }
    });

    const activeVariantSections = (trackData?.sections ?? []).filter(section =>
      NEW_PLINKO_VARIANT_IDS.includes(section.templateId ?? section.id)
    );
    activeVariantSections.forEach(section => {
      const build = (trackData.sectionBuilds ?? []).find(item => item.sectionId === section.id);
      const expected = TRACK_SECTION_EXPECTED_COUNTS[section.builderKey] ?? {};
      if (!build) {
        issues.push(`${section.id} has no runtime build record.`);
        return;
      }
      if ((build.itemCounts.pegs ?? 0) !== (expected.pegs ?? 0)) {
        issues.push(`${section.id} produced ${build.itemCounts.pegs ?? 0} pegs; expected ${expected.pegs ?? 0}.`);
      }
    });

    return {
      pass:issues.length === 0,
      issues,
      totalPlinkoSections:PLINKO_LIBRARY_IDS.length,
      newVariants:NEW_PLINKO_VARIANT_IDS.length,
      generatedPatterns:GENERATED_COURSE_PATTERNS.length,
      patternUsage,
      activeVariants:activeVariantSections.length,
      signature:PLINKO_LIBRARY_IDS.map(sectionId => {
        const section = definitions.get(sectionId);
        const counts = TRACK_SECTION_EXPECTED_COUNTS[section?.builderKey] ?? {};
        return `${sectionId}:${counts.pegs ?? 0}`;
      }).join('|'),
    };
  }

  function buildObstacleLibraryPanel() {
    const report = getObstacleLibraryReport();
    const statusColor = report.pass ? '#00ffaa' : '#ff5566';
    const usage = NEW_PLINKO_VARIANT_IDS
      .map(sectionId => `${sectionId.replace('plinko-','')}: ${report.patternUsage[sectionId]} pattern`)
      .join(' · ');
    const detail = report.pass
      ? `${report.totalPlinkoSections} validated Plinko sections, including ${report.newVariants} new variants.`
      : report.issues.join(' · ');

    return `<div style="width:100%;padding:7px 8px;border:1px solid ${statusColor}55;border-radius:5px;background:rgba(0,30,45,0.5);font-size:9px;line-height:1.5;color:#9ab7c8;">
      <div style="color:${statusColor};font-weight:700;letter-spacing:.08em;">OBSTACLE LIBRARY: ${report.pass ? 'PASS' : 'REVIEW'}</div>
      <div>${detail}</div>
      <div style="opacity:.75;">${usage} · ${report.generatedPatterns} generated patterns</div>
    </div>`;
  }


  /* ── Funnel obstacle library audit (Phase 7.2) ─────────────────────── */
  const FUNNEL_LIBRARY_IDS = Object.freeze([
    'funnel-1',
    'funnel-2',
    'funnel-3',
    'funnel-pinpoint',
    'funnel-twin',
  ]);
  const NEW_FUNNEL_VARIANT_IDS = Object.freeze([
    'funnel-pinpoint',
    'funnel-twin',
  ]);

  function getFunnelLibraryReport(trackData=track) {
    const definitions = new Map(
      TRACK_SECTION_DEFINITIONS.map(section => [section.id,section])
    );
    const issues = [];
    const patternUsage = Object.fromEntries(
      NEW_FUNNEL_VARIANT_IDS.map(sectionId => [
        sectionId,
        GENERATED_COURSE_PATTERNS.filter(pattern => pattern.sectionIds.includes(sectionId)).length,
      ])
    );

    FUNNEL_LIBRARY_IDS.forEach(sectionId => {
      const section = definitions.get(sectionId);
      if (!section) {
        issues.push(`Missing Funnel library section ${sectionId}.`);
        return;
      }
      if (section.type !== 'transition') {
        issues.push(`${sectionId} is not registered as a transition section.`);
      }
      if (typeof TRACK_SECTION_BUILDERS[section.builderKey] !== 'function') {
        issues.push(`${sectionId} has no registered builder.`);
      }
      const expected = TRACK_SECTION_EXPECTED_COUNTS[section.builderKey];
      if (!expected || (expected.funnels ?? 0) < 1) {
        issues.push(`${sectionId} has invalid expected funnel counts.`);
      }
      if (!SECTION_REPETITION_LIMITS[sectionId]) {
        issues.push(`${sectionId} has no repetition rule.`);
      }
    });

    NEW_FUNNEL_VARIANT_IDS.forEach(sectionId => {
      const section = definitions.get(sectionId);
      if (section?.requiredInFixedCourse !== false) {
        issues.push(`${sectionId} must remain optional for the fixed course.`);
      }
      if (!patternUsage[sectionId]) {
        issues.push(`${sectionId} is not used by any generated pattern.`);
      }
    });

    const activeVariantSections = (trackData?.sections ?? []).filter(section =>
      NEW_FUNNEL_VARIANT_IDS.includes(section.templateId ?? section.id)
    );
    activeVariantSections.forEach(section => {
      const build = (trackData.sectionBuilds ?? []).find(item => item.sectionId === section.id);
      const expected = TRACK_SECTION_EXPECTED_COUNTS[section.builderKey] ?? {};
      if (!build) {
        issues.push(`${section.id} has no runtime build record.`);
        return;
      }
      if ((build.itemCounts.funnels ?? 0) !== (expected.funnels ?? 0)) {
        issues.push(`${section.id} produced ${build.itemCounts.funnels ?? 0} funnels; expected ${expected.funnels ?? 0}.`);
      }
      if ((build.itemCounts.pegs ?? 0) !== (expected.pegs ?? 0)) {
        issues.push(`${section.id} produced ${build.itemCounts.pegs ?? 0} pegs; expected ${expected.pegs ?? 0}.`);
      }
    });

    return {
      pass:issues.length === 0,
      issues,
      totalFunnelSections:FUNNEL_LIBRARY_IDS.length,
      newVariants:NEW_FUNNEL_VARIANT_IDS.length,
      generatedPatterns:GENERATED_COURSE_PATTERNS.length,
      patternUsage,
      activeVariants:activeVariantSections.length,
      signature:FUNNEL_LIBRARY_IDS.map(sectionId => {
        const section = definitions.get(sectionId);
        const counts = TRACK_SECTION_EXPECTED_COUNTS[section?.builderKey] ?? {};
        return `${sectionId}:${counts.funnels ?? 0}/${counts.pegs ?? 0}`;
      }).join('|'),
    };
  }

  function buildFunnelLibraryPanel() {
    const report = getFunnelLibraryReport();
    const statusColor = report.pass ? '#00ffaa' : '#ff5566';
    const usage = NEW_FUNNEL_VARIANT_IDS
      .map(sectionId => `${sectionId.replace('funnel-','')}: ${report.patternUsage[sectionId]} pattern`)
      .join(' · ');
    const detail = report.pass
      ? `${report.totalFunnelSections} validated Funnel sections, including ${report.newVariants} new variants.`
      : report.issues.join(' · ');

    return `<div style="width:100%;padding:7px 8px;border:1px solid ${statusColor}55;border-radius:5px;background:rgba(0,30,45,0.5);font-size:9px;line-height:1.5;color:#9ab7c8;">
      <div style="color:${statusColor};font-weight:700;letter-spacing:.08em;">FUNNEL LIBRARY: ${report.pass ? 'PASS' : 'REVIEW'}</div>
      <div>${detail}</div>
      <div style="opacity:.75;">${usage} · ${report.generatedPatterns} generated patterns</div>
    </div>`;
  }


  /* ── Dome and centre-hole obstacle library audit (Phase 7.3) ───────── */
  const DOME_LIBRARY_IDS = Object.freeze([
    'dome-gravity',
    'dome-orbit',
  ]);

  function getDomeLibraryReport(trackData=track) {
    const definitions = new Map(
      TRACK_SECTION_DEFINITIONS.map(section => [section.id,section])
    );
    const issues = [];
    const patternUsage = Object.fromEntries(
      DOME_LIBRARY_IDS.map(sectionId => [
        sectionId,
        GENERATED_COURSE_PATTERNS.filter(pattern => pattern.sectionIds.includes(sectionId)).length,
      ])
    );

    DOME_LIBRARY_IDS.forEach(sectionId => {
      const section = definitions.get(sectionId);
      if (!section) {
        issues.push(`Missing Dome library section ${sectionId}.`);
        return;
      }
      if (section.type !== 'mixer') {
        issues.push(`${sectionId} is not registered as a mandatory centre-hole mixer section.`);
      }
      if (section.requiredInFixedCourse !== false) {
        issues.push(`${sectionId} must remain optional for the fixed course.`);
      }
      if (typeof TRACK_SECTION_BUILDERS[section.builderKey] !== 'function') {
        issues.push(`${sectionId} has no registered builder.`);
      }
      const expected = TRACK_SECTION_EXPECTED_COUNTS[section.builderKey];
      if (!expected || expected.domes !== 1 || expected.mixers !== 1) {
        issues.push(`${sectionId} must build one visual dome and one mandatory centre-hole core.`);
      }
      if (!SECTION_REPETITION_LIMITS[sectionId]) {
        issues.push(`${sectionId} has no repetition rule.`);
      }
      if (!patternUsage[sectionId]) {
        issues.push(`${sectionId} is not used by any generated pattern.`);
      }
    });

    const activeSections = (trackData?.sections ?? []).filter(section =>
      DOME_LIBRARY_IDS.includes(section.templateId ?? section.id)
    );
    activeSections.forEach(section => {
      const build = (trackData.sectionBuilds ?? []).find(item => item.sectionId === section.id);
      if (!build) {
        issues.push(`${section.id} has no runtime build record.`);
        return;
      }
      if ((build.itemCounts.domes ?? 0) !== 1 || (build.itemCounts.mixers ?? 0) !== 1) {
        issues.push(`${section.id} did not build one dome shell and one centre-hole core.`);
      }
      const dome = (trackData.domes ?? []).find(item => item.sectionId === section.id);
      const core = (trackData.mixers ?? []).find(item => item.sectionId === section.id);
      if (!dome || !core) {
        issues.push(`${section.id} is missing its visual shell or mandatory core.`);
        return;
      }
      if (!isFiniteTrackNumber(dome.holeR) || dome.holeR <= 0 || dome.holeR >= Math.min(dome.rx,dome.ry)) {
        issues.push(`${section.id} has invalid centre-hole geometry.`);
      }
      if (core.visual !== 'hidden') {
        issues.push(`${section.id} centre-hole core must remain hidden behind the dome shell.`);
      }
      if (core.releaseY <= dome.cy) {
        issues.push(`${section.id} does not release below its centre hole.`);
      }
    });

    const domeIds = (trackData?.domes ?? []).map(dome => dome.id).filter(Boolean);
    if (new Set(domeIds).size !== domeIds.length) {
      issues.push('Runtime Dome IDs are not unique.');
    }

    return {
      pass:issues.length === 0,
      issues,
      totalVariants:DOME_LIBRARY_IDS.length,
      generatedPatterns:GENERATED_COURSE_PATTERNS.length,
      patternUsage,
      activeVariants:activeSections.length,
      signature:DOME_LIBRARY_IDS.map(sectionId => {
        const section = definitions.get(sectionId);
        const counts = TRACK_SECTION_EXPECTED_COUNTS[section?.builderKey] ?? {};
        return `${sectionId}:${counts.domes ?? 0}/${counts.mixers ?? 0}`;
      }).join('|'),
    };
  }

  function buildDomeLibraryPanel() {
    const report = getDomeLibraryReport();
    const statusColor = report.pass ? '#00ffaa' : '#ff5566';
    const usage = DOME_LIBRARY_IDS
      .map(sectionId => `${sectionId.replace('dome-','')}: ${report.patternUsage[sectionId]} pattern`)
      .join(' · ');
    const detail = report.pass
      ? `${report.totalVariants} validated centre-hole Dome variants with mandatory capture and release.`
      : report.issues.join(' · ');

    return `<div style="width:100%;padding:7px 8px;border:1px solid ${statusColor}55;border-radius:5px;background:rgba(0,30,45,0.5);font-size:9px;line-height:1.5;color:#9ab7c8;">
      <div style="color:${statusColor};font-weight:700;letter-spacing:.08em;">DOME LIBRARY: ${report.pass ? 'PASS' : 'REVIEW'}</div>
      <div>${detail}</div>
      <div style="opacity:.75;">${usage} · ${report.generatedPatterns} generated patterns</div>
    </div>`;
  }


  /* ── Loop obstacle library audit (Phase 7.4) ────────────────────────── */
  const LOOP_LIBRARY_IDS = Object.freeze([
    'loop-section',
    'loop-cascade',
    'loop-slalom',
  ]);
  const NEW_LOOP_VARIANT_IDS = Object.freeze([
    'loop-cascade',
    'loop-slalom',
  ]);

  function getLoopLibraryReport(trackData=track) {
    const definitions = new Map(
      TRACK_SECTION_DEFINITIONS.map(section => [section.id,section])
    );
    const issues = [];
    const patternUsage = Object.fromEntries(
      NEW_LOOP_VARIANT_IDS.map(sectionId => [
        sectionId,
        GENERATED_COURSE_PATTERNS.filter(pattern => pattern.sectionIds.includes(sectionId)).length,
      ])
    );

    LOOP_LIBRARY_IDS.forEach(sectionId => {
      const section = definitions.get(sectionId);
      if (!section) {
        issues.push(`Missing Loop library section ${sectionId}.`);
        return;
      }
      if (section.type !== 'loop') {
        issues.push(`${sectionId} is not registered as a Loop section.`);
      }
      if (typeof TRACK_SECTION_BUILDERS[section.builderKey] !== 'function') {
        issues.push(`${sectionId} has no registered builder.`);
      }
      const expected = TRACK_SECTION_EXPECTED_COUNTS[section.builderKey];
      if (!expected || (expected.loops ?? 0) < 2 || (expected.segments ?? 0) < 1) {
        issues.push(`${sectionId} has invalid expected Loop or segment counts.`);
      }
      if (!SECTION_REPETITION_LIMITS[sectionId]) {
        issues.push(`${sectionId} has no repetition rule.`);
      }
    });

    NEW_LOOP_VARIANT_IDS.forEach(sectionId => {
      const section = definitions.get(sectionId);
      if (section?.requiredInFixedCourse !== false) {
        issues.push(`${sectionId} must remain optional for the fixed course.`);
      }
      if (!patternUsage[sectionId]) {
        issues.push(`${sectionId} is not used by any generated pattern.`);
      }
    });

    const activeSections = (trackData?.sections ?? []).filter(section =>
      LOOP_LIBRARY_IDS.includes(section.templateId ?? section.id)
    );
    activeSections.forEach(section => {
      const build = (trackData.sectionBuilds ?? []).find(item => item.sectionId === section.id);
      const expected = TRACK_SECTION_EXPECTED_COUNTS[section.builderKey] ?? {};
      if (!build) {
        issues.push(`${section.id} has no runtime build record.`);
        return;
      }
      if ((build.itemCounts.loops ?? 0) !== (expected.loops ?? 0)) {
        issues.push(`${section.id} produced ${build.itemCounts.loops ?? 0} loops; expected ${expected.loops ?? 0}.`);
      }
      if ((build.itemCounts.segments ?? 0) !== (expected.segments ?? 1)) {
        issues.push(`${section.id} produced ${build.itemCounts.segments ?? 0} segments; expected ${expected.segments ?? 1}.`);
      }

      const loops = (trackData.loops ?? []).filter(loop => loop.sectionId === section.id);
      loops.forEach(loop => {
        if (!loop.id) issues.push(`${section.id} contains a Loop without an ID.`);
        if (!isFiniteTrackNumber(loop.r) || loop.r < 35 || loop.r > 80) {
          issues.push(`${loop.id ?? section.id} has unsafe radius ${loop.r}.`);
        }
        if (loop.cx - loop.r < 20 || loop.cx + loop.r > W - 20) {
          issues.push(`${loop.id ?? section.id} leaves the safe horizontal course bounds.`);
        }
      });
      for (let first=0; first<loops.length; first++) {
        for (let second=first+1; second<loops.length; second++) {
          const a = loops[first];
          const b = loops[second];
          const distance = Math.hypot(a.cx-b.cx,a.cy-b.cy);
          if (distance <= a.r + b.r + R) {
            issues.push(`${a.id} and ${b.id} overlap or leave no safe marble clearance.`);
          }
        }
      }
    });

    const loopIds = (trackData?.loops ?? []).map(loop => loop.id).filter(Boolean);
    if (new Set(loopIds).size !== loopIds.length) {
      issues.push('Runtime Loop IDs are not unique.');
    }

    return {
      pass:issues.length === 0,
      issues,
      totalLoopSections:LOOP_LIBRARY_IDS.length,
      newVariants:NEW_LOOP_VARIANT_IDS.length,
      generatedPatterns:GENERATED_COURSE_PATTERNS.length,
      patternUsage,
      activeVariants:activeSections.filter(section =>
        NEW_LOOP_VARIANT_IDS.includes(section.templateId ?? section.id)
      ).length,
      signature:LOOP_LIBRARY_IDS.map(sectionId => {
        const section = definitions.get(sectionId);
        const counts = TRACK_SECTION_EXPECTED_COUNTS[section?.builderKey] ?? {};
        return `${sectionId}:${counts.loops ?? 0}/${counts.segments ?? 0}`;
      }).join('|'),
    };
  }

  function buildLoopLibraryPanel() {
    const report = getLoopLibraryReport();
    const statusColor = report.pass ? '#00ffaa' : '#ff5566';
    const usage = NEW_LOOP_VARIANT_IDS
      .map(sectionId => `${sectionId.replace('loop-','')}: ${report.patternUsage[sectionId]} pattern`)
      .join(' · ');
    const detail = report.pass
      ? `${report.totalLoopSections} validated Loop sections, including ${report.newVariants} new variants.`
      : report.issues.join(' · ');

    return `<div style="width:100%;padding:7px 8px;border:1px solid ${statusColor}55;border-radius:5px;background:rgba(0,30,45,0.5);font-size:9px;line-height:1.5;color:#9ab7c8;">
      <div style="color:${statusColor};font-weight:700;letter-spacing:.08em;">LOOP LIBRARY: ${report.pass ? 'PASS' : 'REVIEW'}</div>
      <div>${detail}</div>
      <div style="opacity:.75;">${usage} · ${report.generatedPatterns} generated patterns</div>
    </div>`;
  }

  /* ── Balance Beam obstacle audit (Phase 7.5) ───────────────────── */
  const BALANCE_BEAM_LIBRARY_IDS = Object.freeze(['balance-beam']);

  function getBalanceBeamLibraryReport(trackData=track) {
    const definitions = new Map(
      TRACK_SECTION_DEFINITIONS.map(section => [section.id,section])
    );
    const issues = [];
    const section = definitions.get('balance-beam');
    const patternUsage = GENERATED_COURSE_PATTERNS.filter(pattern =>
      pattern.sectionIds.includes('balance-beam')
    ).length;

    if (!section) {
      issues.push('Missing Balance Beam section definition.');
    } else {
      if (section.type !== 'beam') issues.push('Balance Beam is not registered as type beam.');
      if (section.requiredInFixedCourse !== false) issues.push('Balance Beam must remain optional for the fixed course.');
      if (typeof TRACK_SECTION_BUILDERS[section.builderKey] !== 'function') issues.push('Balance Beam builder is missing.');
      if (!SECTION_REPETITION_LIMITS[section.id]) issues.push('Balance Beam repetition rule is missing.');
      const expected = TRACK_SECTION_EXPECTED_COUNTS[section.builderKey] ?? {};
      if (expected.beams !== 1 || expected.segments !== 3) {
        issues.push('Balance Beam expected object counts are invalid.');
      }
    }
    if (patternUsage < 1) issues.push('Balance Beam is not used by a generated pattern.');

    const activeSections = (trackData?.sections ?? []).filter(item =>
      (item.templateId ?? item.id) === 'balance-beam'
    );
    activeSections.forEach(activeSection => {
      const build = (trackData.sectionBuilds ?? []).find(item => item.sectionId === activeSection.id);
      if (!build) {
        issues.push(`${activeSection.id} has no runtime build record.`);
        return;
      }
      if ((build.itemCounts.beams ?? 0) !== 1 || (build.itemCounts.segments ?? 0) !== 3) {
        issues.push(`${activeSection.id} did not build one beam and three guide/floor segments.`);
      }
      const beams = (trackData.beams ?? []).filter(beam => beam.sectionId === activeSection.id);
      beams.forEach(beam => {
        if (!beam.id) issues.push(`${activeSection.id} contains a beam without an ID.`);
        if (!isFiniteTrackNumber(beam.length) || beam.length < 180 || beam.length > 300) {
          issues.push(`${beam.id ?? activeSection.id} has unsafe length ${beam.length}.`);
        }
        if (!isFiniteTrackNumber(beam.thickness) || beam.thickness < 6 || beam.thickness > 16) {
          issues.push(`${beam.id ?? activeSection.id} has unsafe thickness ${beam.thickness}.`);
        }
        if (beam.minAngle > -0.15 || beam.maxAngle < 0.15 || beam.minAngle >= beam.maxAngle) {
          issues.push(`${beam.id ?? activeSection.id} has invalid tilt limits.`);
        }
        if (beam.angle < beam.minAngle-0.001 || beam.angle > beam.maxAngle+0.001) {
          issues.push(`${beam.id ?? activeSection.id} moved outside its tilt limits.`);
        }
      });
    });

    const ids = (trackData?.beams ?? []).map(beam => beam.id).filter(Boolean);
    if (new Set(ids).size !== ids.length) issues.push('Runtime Balance Beam IDs are not unique.');

    return {
      pass:issues.length === 0,
      issues,
      sections:BALANCE_BEAM_LIBRARY_IDS.length,
      patternUsage,
      active:activeSections.length,
      generatedPatterns:GENERATED_COURSE_PATTERNS.length,
      signature:`balance-beam:${patternUsage}:${activeSections.length}:${ids.join('+')}`,
    };
  }

  function buildBalanceBeamLibraryPanel() {
    const report = getBalanceBeamLibraryReport();
    const statusColor = report.pass ? '#00ffaa' : '#ff5566';
    const detail = report.pass
      ? `Live tilting Balance Beam validated with spring return and bounded rotation.`
      : report.issues.join(' · ');
    return `<div style="width:100%;padding:7px 8px;border:1px solid ${statusColor}55;border-radius:5px;background:rgba(0,30,45,0.5);font-size:9px;line-height:1.5;color:#9ab7c8;">
      <div style="color:${statusColor};font-weight:700;letter-spacing:.08em;">BALANCE BEAM: ${report.pass ? 'PASS' : 'REVIEW'}</div>
      <div>${detail}</div>
      <div style="opacity:.75;">${report.patternUsage} generated pattern · ${report.generatedPatterns} total patterns</div>
    </div>`;
  }


  /* ── Spiral Bowl obstacle audit (Phase 7.6) ─────────────────────────── */
  const SPIRAL_BOWL_LIBRARY_IDS = Object.freeze(['spiral-bowl']);

  function getSpiralBowlLibraryReport(trackData=track) {
    const definitions = new Map(
      TRACK_SECTION_DEFINITIONS.map(section => [section.id,section])
    );
    const issues = [];
    const section = definitions.get('spiral-bowl');
    const patternUsage = GENERATED_COURSE_PATTERNS.filter(pattern =>
      pattern.sectionIds.includes('spiral-bowl')
    ).length;

    if (!section) {
      issues.push('Missing Spiral Bowl section definition.');
    } else {
      if (section.type !== 'mixer') issues.push('Spiral Bowl must use the mandatory mixer type.');
      if (section.requiredInFixedCourse !== false) issues.push('Spiral Bowl must remain optional for the fixed course.');
      if (typeof TRACK_SECTION_BUILDERS[section.builderKey] !== 'function') issues.push('Spiral Bowl builder is missing.');
      if (!SECTION_REPETITION_LIMITS[section.id]) issues.push('Spiral Bowl repetition rule is missing.');
      const expected = TRACK_SECTION_EXPECTED_COUNTS[section.builderKey] ?? {};
      if (expected.domes !== 1 || expected.mixers !== 1) {
        issues.push('Spiral Bowl must build one visible shell and one mandatory physics core.');
      }
    }
    if (patternUsage < 2) issues.push('Spiral Bowl must appear in Spiral Descent and Obstacle Showcase.');

    const activeSections = (trackData?.sections ?? []).filter(item =>
      (item.templateId ?? item.id) === 'spiral-bowl'
    );
    activeSections.forEach(activeSection => {
      const build = (trackData.sectionBuilds ?? []).find(item => item.sectionId === activeSection.id);
      if (!build || (build.itemCounts.domes ?? 0) !== 1 || (build.itemCounts.mixers ?? 0) !== 1) {
        issues.push(`${activeSection.id} did not build one shell and one core.`);
        return;
      }
      const shell = (trackData.domes ?? []).find(item => item.sectionId === activeSection.id);
      const core = (trackData.mixers ?? []).find(item => item.sectionId === activeSection.id);
      if (!shell || shell.kind !== 'spiral') issues.push(`${activeSection.id} is missing its spiral visual shell.`);
      if (!core || core.kind !== 'spiral-bowl' || core.visual !== 'hidden') {
        issues.push(`${activeSection.id} is missing its mandatory hidden spiral core.`);
      } else if (core.releaseY <= core.cy || core.orbitMinTurns < 1.5) {
        issues.push(`${activeSection.id} has unsafe spiral release/orbit settings.`);
      }
    });

    return {
      pass:issues.length === 0,
      issues,
      sections:SPIRAL_BOWL_LIBRARY_IDS.length,
      patternUsage,
      active:activeSections.length,
      generatedPatterns:GENERATED_COURSE_PATTERNS.length,
      signature:`spiral-bowl:${patternUsage}:${activeSections.length}`,
    };
  }

  function buildSpiralBowlLibraryPanel() {
    const report = getSpiralBowlLibraryReport();
    const statusColor = report.pass ? '#00ffaa' : '#ff5566';
    const detail = report.pass
      ? 'Mandatory Spiral Bowl capture, inward orbit and centre-hole release validated.'
      : report.issues.join(' · ');
    return `<div style="width:100%;padding:7px 8px;border:1px solid ${statusColor}55;border-radius:5px;background:rgba(0,30,45,0.5);font-size:9px;line-height:1.5;color:#9ab7c8;">
      <div style="color:${statusColor};font-weight:700;letter-spacing:.08em;">SPIRAL BOWL: ${report.pass ? 'PASS' : 'REVIEW'}</div>
      <div>${detail}</div>
      <div style="opacity:.75;">${report.patternUsage} generated patterns · ${report.generatedPatterns} total patterns</div>
    </div>`;
  }

  /* ── Bounce Chamber obstacle audit (Phase 7.7) ─────────────────────── */
  const BOUNCE_CHAMBER_LIBRARY_IDS = Object.freeze(['bounce-chamber']);

  function getBounceChamberLibraryReport(trackData=track) {
    const definitions = new Map(
      TRACK_SECTION_DEFINITIONS.map(section => [section.id,section])
    );
    const issues = [];
    const section = definitions.get('bounce-chamber');
    const patternUsage = GENERATED_COURSE_PATTERNS.filter(pattern =>
      pattern.sectionIds.includes('bounce-chamber')
    ).length;

    if (!section) {
      issues.push('Missing Bounce Chamber section definition.');
    } else {
      if (section.type !== 'bounce') issues.push('Bounce Chamber is not registered as type bounce.');
      if (section.requiredInFixedCourse !== false) issues.push('Bounce Chamber must remain optional for the fixed course.');
      if (typeof TRACK_SECTION_BUILDERS[section.builderKey] !== 'function') issues.push('Bounce Chamber builder is missing.');
      if (!SECTION_REPETITION_LIMITS[section.id]) issues.push('Bounce Chamber repetition rule is missing.');
      const expected = TRACK_SECTION_EXPECTED_COUNTS[section.builderKey];
      if (!expected || expected.pegs !== 7 || expected.segments !== 5) {
        issues.push('Bounce Chamber must build seven bumpers and five chamber segments.');
      }
    }
    if (patternUsage < 2) issues.push('Bounce Chamber must appear in Bumper Blitz and Obstacle Showcase.');

    const activeSections = (trackData?.sections ?? []).filter(item =>
      (item.templateId ?? item.id) === 'bounce-chamber'
    );
    const runtimeBumpers = (trackData?.pegs ?? []).filter(peg =>
      peg.templateSectionId === 'bounce-chamber'
    );
    const runtimeWalls = (trackData?.segments ?? []).filter(segment =>
      segment.templateSectionId === 'bounce-chamber'
    );

    activeSections.forEach(activeSection => {
      const bumpers = runtimeBumpers.filter(peg => peg.sectionId === activeSection.id);
      const walls = runtimeWalls.filter(segment => segment.sectionId === activeSection.id);
      if (bumpers.length !== 7) issues.push(`${activeSection.id} built ${bumpers.length}/7 bumpers.`);
      if (walls.length !== 5) issues.push(`${activeSection.id} built ${walls.length}/5 chamber segments.`);
      bumpers.forEach((bumper,index) => {
        const radius = bumper.radius ?? (bumper.big ? 7 : 5);
        if (bumper.kind !== 'bumper') issues.push(`${activeSection.id} bumper ${index+1} is missing bumper physics.`);
        if (!Number.isFinite(radius) || radius < 10 || radius > 18) issues.push(`${activeSection.id} bumper ${index+1} has unsafe radius.`);
        if (!Number.isFinite(bumper.restitution) || bumper.restitution < 0.95 || bumper.restitution > 1.2) {
          issues.push(`${activeSection.id} bumper ${index+1} has unsafe restitution.`);
        }
        if (!Number.isFinite(bumper.downwardBias) || bumper.downwardBias <= 0) {
          issues.push(`${activeSection.id} bumper ${index+1} lacks downward escape bias.`);
        }
      });
    });

    const ids = runtimeBumpers.map(peg => peg.id).filter(Boolean);
    if (new Set(ids).size !== ids.length) issues.push('Runtime Bounce Chamber bumper IDs are not unique.');

    return {
      pass:issues.length === 0,
      issues,
      variants:BOUNCE_CHAMBER_LIBRARY_IDS.length,
      patternUsage,
      generatedPatterns:GENERATED_COURSE_PATTERNS.length,
      activeSections:activeSections.length,
      bumpers:runtimeBumpers.length,
      signature:`bounce-chamber:${patternUsage}:${activeSections.length}:${runtimeBumpers.length}`,
    };
  }

  function buildBounceChamberLibraryPanel() {
    const report = getBounceChamberLibraryReport();
    const statusColor = report.pass ? '#00ffaa' : '#ff5566';
    const detail = report.pass
      ? 'Seven high-energy bumpers validated with bounded rebound and downward escape bias.'
      : report.issues.join(' · ');
    return `<div style="width:100%;padding:7px 8px;border:1px solid ${statusColor}55;border-radius:5px;background:rgba(0,30,45,0.5);font-size:9px;line-height:1.5;color:#9ab7c8;">
      <div style="color:${statusColor};font-weight:700;letter-spacing:.08em;">BOUNCE CHAMBER: ${report.pass ? 'PASS' : 'REVIEW'}</div>
      <div>${detail}</div>
      <div style="opacity:.75;">${report.patternUsage} generated patterns · ${report.generatedPatterns} total patterns</div>
    </div>`;
  }

  /* ── Split Gate obstacle audit (Phase 7.8) ─────────────────────────── */
  const SPLIT_GATE_LIBRARY_IDS = Object.freeze(['split-gate']);

  function getSplitGateLibraryReport(trackData=track) {
    const definitions = new Map(
      TRACK_SECTION_DEFINITIONS.map(section => [section.id,section])
    );
    const issues = [];
    const section = definitions.get('split-gate');
    const patternUsage = GENERATED_COURSE_PATTERNS.filter(pattern =>
      pattern.sectionIds.includes('split-gate')
    ).length;

    if (!section) {
      issues.push('Missing Split Gate section definition.');
    } else {
      if (section.type !== 'gate') issues.push('Split Gate is not registered as type gate.');
      if (section.requiredInFixedCourse !== false) issues.push('Split Gate must remain optional for the fixed course.');
      if (typeof TRACK_SECTION_BUILDERS[section.builderKey] !== 'function') issues.push('Split Gate builder is missing.');
      if (!SECTION_REPETITION_LIMITS[section.id]) issues.push('Split Gate repetition rule is missing.');
      const expected = TRACK_SECTION_EXPECTED_COUNTS[section.builderKey];
      if (!expected || expected.gates !== 1 || expected.segments !== 5) {
        issues.push('Split Gate must build one moving gate and five guide/floor segments.');
      }
    }
    if (patternUsage < 2) issues.push('Split Gate must appear in Split Decision and Obstacle Showcase.');

    const activeSections = (trackData?.sections ?? []).filter(item =>
      (item.templateId ?? item.id) === 'split-gate'
    );
    const runtimeGates = (trackData?.gates ?? []).filter(gate =>
      gate.templateSectionId === 'split-gate'
    );
    const runtimeSegments = (trackData?.segments ?? []).filter(segment =>
      segment.templateSectionId === 'split-gate'
    );

    activeSections.forEach(activeSection => {
      const gates = runtimeGates.filter(gate => gate.sectionId === activeSection.id);
      const segments = runtimeSegments.filter(segment => segment.sectionId === activeSection.id);
      if (gates.length !== 1) issues.push(`${activeSection.id} built ${gates.length}/1 moving gates.`);
      if (segments.length !== 5) issues.push(`${activeSection.id} built ${segments.length}/5 guide/floor segments.`);
      gates.forEach(gate => {
        if (![gate.cx,gate.cy,gate.length,gate.thickness,gate.minAngle,gate.maxAngle,
              gate.spring,gate.damping,gate.maxAngularVelocity,gate.sidePush,gate.downwardBias]
              .every(Number.isFinite)) {
          issues.push(`${activeSection.id} contains non-numeric gate physics.`);
        }
        if (gate.length < 80 || gate.length > 150) issues.push(`${activeSection.id} gate length is outside safe limits.`);
        if (gate.thickness < 6 || gate.thickness > 18) issues.push(`${activeSection.id} gate thickness is outside safe limits.`);
        if (gate.minAngle >= -0.2 || gate.maxAngle <= 0.2 || gate.minAngle >= gate.maxAngle) {
          issues.push(`${activeSection.id} gate has invalid switching angles.`);
        }
        if (gate.maxAngularVelocity <= 0 || gate.maxAngularVelocity > 0.08) {
          issues.push(`${activeSection.id} gate angular velocity limit is unsafe.`);
        }
        if (gate.downwardBias <= 0) issues.push(`${activeSection.id} gate lacks downward escape bias.`);
      });
    });

    const ids = runtimeGates.map(gate => gate.id).filter(Boolean);
    if (new Set(ids).size !== ids.length) issues.push('Runtime Split Gate IDs are not unique.');

    return {
      pass:issues.length === 0,
      issues,
      variants:SPLIT_GATE_LIBRARY_IDS.length,
      patternUsage,
      generatedPatterns:GENERATED_COURSE_PATTERNS.length,
      activeSections:activeSections.length,
      gates:runtimeGates.length,
      signature:`split-gate:${patternUsage}:${activeSections.length}:${runtimeGates.length}`,
    };
  }

  function buildSplitGateLibraryPanel() {
    const report = getSplitGateLibraryReport();
    const statusColor = report.pass ? '#00ffaa' : '#ff5566';
    const detail = report.pass
      ? 'Swinging gate, lane guides and centre-blocking exit chevron validated.'
      : report.issues.join(' · ');
    return `<div style="width:100%;padding:7px 8px;border:1px solid ${statusColor}55;border-radius:5px;background:rgba(0,30,45,0.5);font-size:9px;line-height:1.5;color:#9ab7c8;">
      <div style="color:${statusColor};font-weight:700;letter-spacing:.08em;">SPLIT GATE: ${report.pass ? 'PASS' : 'REVIEW'}</div>
      <div>${detail}</div>
      <div style="opacity:.75;">${report.patternUsage} generated patterns · ${report.generatedPatterns} total patterns</div>
    </div>`;
  }

  /* ── Drop Tower obstacle audit (Phase 7.9) ─────────────────────────── */
  const DROP_TOWER_LIBRARY_IDS = Object.freeze(['drop-tower']);

  function getDropTowerLibraryReport(trackData=track) {
    const issues = [];
    const definitions = new Map(
      TRACK_SECTION_DEFINITIONS.map(section => [section.id,section])
    );
    const section = definitions.get('drop-tower');
    const patternUsage = GENERATED_COURSE_PATTERNS.filter(pattern =>
      pattern.sectionIds.includes('drop-tower')
    ).length;

    if (!section) {
      issues.push('Missing Drop Tower section definition.');
    } else {
      if (section.type !== 'transition') issues.push('Drop Tower must be registered as a transition section.');
      if (section.requiredInFixedCourse !== false) issues.push('Drop Tower must remain optional for the fixed course.');
      if (typeof TRACK_SECTION_BUILDERS[section.builderKey] !== 'function') issues.push('Drop Tower builder is missing.');
      if (!SECTION_REPETITION_LIMITS[section.id]) issues.push('Drop Tower repetition rule is missing.');
      const expected = TRACK_SECTION_EXPECTED_COUNTS[section.builderKey];
      if (!expected || expected.segments !== 8) {
        issues.push('Drop Tower must build eight guide, wall, shelf and floor segments.');
      }
    }
    if (patternUsage < 2) issues.push('Drop Tower must appear in Tower Plunge and Obstacle Showcase.');

    const activeSections = (trackData?.sections ?? []).filter(item =>
      (item.templateId ?? item.id) === 'drop-tower'
    );
    const runtimeSegments = (trackData?.segments ?? []).filter(segment =>
      segment.templateSectionId === 'drop-tower'
    );

    activeSections.forEach(activeSection => {
      const segments = runtimeSegments.filter(segment => segment.sectionId === activeSection.id);
      if (segments.length !== 8) issues.push(`${activeSection.id} built ${segments.length}/8 Drop Tower segments.`);
      const shelves = segments.filter(segment => /^tower-shelf-/.test(segment.componentId));
      if (shelves.length !== 3) issues.push(`${activeSection.id} must contain three alternating shelves.`);
      shelves.forEach((shelf,index) => {
        const minX = Math.min(shelf.x1,shelf.x2);
        const maxX = Math.max(shelf.x1,shelf.x2);
        if (!(minX < W/2-R && maxX > W/2+R)) {
          issues.push(`${activeSection.id} shelf ${index + 1} does not block the centre fall line.`);
        }
      });
      const walls = segments.filter(segment =>
        segment.componentId === 'tower-wall-left' || segment.componentId === 'tower-wall-right'
      );
      if (walls.length !== 2) issues.push(`${activeSection.id} must contain two tower walls.`);
      segments.forEach(segment => {
        if (![segment.x1,segment.x2,segment.y1,segment.y2].every(Number.isFinite)) {
          issues.push(`${activeSection.id} contains invalid segment geometry.`);
        }
        if (Math.min(segment.x1,segment.x2) < 20 || Math.max(segment.x1,segment.x2) > W-20) {
          issues.push(`${activeSection.id} extends beyond safe horizontal bounds.`);
        }
      });
    });

    return {
      pass:issues.length === 0,
      issues,
      variants:DROP_TOWER_LIBRARY_IDS.length,
      patternUsage,
      generatedPatterns:GENERATED_COURSE_PATTERNS.length,
      activeSections:activeSections.length,
      segments:runtimeSegments.length,
      signature:`drop-tower:${patternUsage}:${activeSections.length}:${runtimeSegments.length}`,
    };
  }

  function buildDropTowerLibraryPanel() {
    const report = getDropTowerLibraryReport();
    const statusColor = report.pass ? '#00ffaa' : '#ff5566';
    const detail = report.pass
      ? 'Three alternating shelves block the centre line and force lane changes.'
      : report.issues.join(' · ');
    return `<div style="width:100%;padding:7px 8px;border:1px solid ${statusColor}55;border-radius:5px;background:rgba(0,30,45,0.5);font-size:9px;line-height:1.5;color:#9ab7c8;">
      <div style="color:${statusColor};font-weight:700;letter-spacing:.08em;">DROP TOWER: ${report.pass ? 'PASS' : 'REVIEW'}</div>
      <div>${detail}</div>
      <div style="opacity:.75;">${report.patternUsage} generated patterns · ${report.generatedPatterns} total patterns</div>
    </div>`;
  }

  /* ── Evolving all-obstacle showcase audit ───────────────────────────── */
  const SHOWCASE_NON_OBSTACLE_IDS = Object.freeze([
    'start-chute','speed-zone','final-sprint','finish',
  ]);

  function getObstacleShowcaseReport(trackData=track) {
    const issues = [];
    const pattern = GENERATED_COURSE_PATTERNS.find(item => item.id === 'obstacle-showcase');
    const requiredIds = TRACK_SECTION_DEFINITIONS
      .map(section => section.id)
      .filter(sectionId => !SHOWCASE_NON_OBSTACLE_IDS.includes(sectionId));

    if (!pattern) {
      issues.push('Obstacle Showcase pattern is missing.');
    } else {
      const missing = requiredIds.filter(sectionId => !pattern.sectionIds.includes(sectionId));
      const unknown = pattern.sectionIds.filter(sectionId =>
        !TRACK_SECTION_DEFINITIONS.some(section => section.id === sectionId)
      );
      if (missing.length) issues.push(`Showcase is missing registered obstacles: ${missing.join(', ')}.`);
      if (unknown.length) issues.push(`Showcase references unknown sections: ${unknown.join(', ')}.`);
      if (new Set(pattern.sectionIds).size !== pattern.sectionIds.length) {
        issues.push('Showcase contains duplicate section IDs.');
      }
    }

    OBSTACLE_SHOWCASE_SEED_ALIASES.forEach(seed => {
      const recipe = generateControlledTrackRecipe(seed);
      if (recipe.patternId !== 'obstacle-showcase' || !recipe.showcase) {
        issues.push(`Reserved showcase seed ${seed} does not resolve to Obstacle Showcase.`);
      }
    });

    const active = trackData?.recipe?.patternId === 'obstacle-showcase';
    if (active) {
      const activeTemplates = (trackData.sections ?? []).map(section => section.templateId ?? section.id);
      const missingRuntime = requiredIds.filter(sectionId => !activeTemplates.includes(sectionId));
      if (missingRuntime.length) issues.push(`Active showcase failed to build: ${missingRuntime.join(', ')}.`);
    }

    return {
      pass:issues.length === 0,
      issues,
      required:requiredIds.length,
      included:pattern ? requiredIds.filter(id => pattern.sectionIds.includes(id)).length : 0,
      active,
      aliases:OBSTACLE_SHOWCASE_SEED_ALIASES.length,
      signature:`showcase:${requiredIds.join('+')}`,
    };
  }

  function buildObstacleShowcasePanel() {
    const report = getObstacleShowcaseReport();
    const statusColor = report.pass ? '#00ffaa' : '#ff5566';
    const detail = report.pass
      ? `Seed-1 showcase contains ${report.included}/${report.required} registered obstacle sections.`
      : report.issues.join(' · ');
    return `<div style="width:100%;padding:7px 8px;border:1px solid ${statusColor}55;border-radius:5px;background:rgba(0,30,45,0.5);font-size:9px;line-height:1.5;color:#9ab7c8;">
      <div style="color:${statusColor};font-weight:700;letter-spacing:.08em;">OBSTACLE SHOWCASE: ${report.pass ? 'PASS' : 'REVIEW'}</div>
      <div>${detail}</div>
      <div style="opacity:.75;">reserved aliases: 1 · seed-1 · course-1${report.active ? ' · active now' : ''}</div>
    </div>`;
  }

  function getTrackAssemblyReport(trackData=track) {
    const assembly = trackData?.assembly;
    const sections = trackData?.sections ?? [];
    const issues = [];
    const expectedRecipe = assembly?.recipe?.generated
      ? assembly.recipe
      : getTrackRecipeById(assembly?.recipe?.id);

    if (!assembly) {
      issues.push('Track has no assembly record.');
    } else {
      if (!assembly.pass) issues.push(...assembly.issues);
      if (!assembly.recipe.generated && !TRACK_RECIPE_VARIANTS.some(recipe => recipe.id === assembly.recipe.id)) {
        issues.push(`Unknown controlled recipe ${assembly.recipe.id}.`);
      }
      if (assembly.recipe.generated && !assembly.recipe.randomised) {
        issues.push('Generated recipe is not marked randomised.');
      }
      if (assembly.recipe.generated && !assembly.recipe.dynamicLayout) {
        issues.push('Generated recipe is missing dynamic layout.');
      }
      if (sections.length !== expectedRecipe.sectionIds.length) {
        issues.push(`Expected ${expectedRecipe.sectionIds.length} assembled sections; found ${sections.length}.`);
      }

      const actualTemplateIds = sections.map(section => section.templateId ?? section.id);
      expectedRecipe.sectionIds.forEach((expectedId,index) => {
        if (actualTemplateIds[index] !== expectedId) {
          issues.push(`Recipe position ${index + 1} expected ${expectedId}; found ${actualTemplateIds[index] ?? 'nothing'}.`);
        }
      });

      const tuning = assembly.recipe.tuning;
      ['orbitScale','angularSpeedScale','releaseSpreadScale','releaseVelocityScale'].forEach(key => {
        if (!Number.isFinite(tuning?.[key]) || tuning[key] <= 0) {
          issues.push(`Recipe tuning ${key} is invalid.`);
        }
      });
    }

    return {
      pass:issues.length === 0,
      issues,
      generated:Boolean(assembly?.recipe?.generated),
      recipeId:assembly?.recipe?.id ?? 'missing',
      label:assembly?.recipe?.label ?? 'NO RECIPE',
      shortLabel:assembly?.recipe?.shortLabel ?? 'NONE',
      tuningLabel:assembly?.recipe?.tuning?.label ?? 'NO PROFILE',
      sections:sections.length,
      expectedSections:expectedRecipe?.sectionIds?.length ?? 0,
      variants:TRACK_RECIPE_VARIANTS.length,
      signature:assembly?.signature ?? '',
    };
  }

  function buildTrackAssemblyPanel() {
    const report = getTrackAssemblyReport();
    const statusColor = report.pass ? '#00ffaa' : '#ff5566';
    const detail = report.pass
      ? `${report.sections}/${report.expectedSections} sections assembled from ${report.label}.`
      : report.issues.join(' · ');

    return `<div style="width:100%;padding:7px 8px;border:1px solid ${statusColor}55;border-radius:5px;background:rgba(0,30,45,0.5);font-size:9px;line-height:1.5;color:#9ab7c8;">
      <div style="color:${statusColor};font-weight:700;letter-spacing:.08em;">TRACK ASSEMBLY: ${report.pass ? 'PASS' : 'REVIEW'}</div>
      <div>${detail}</div>
      <div style="opacity:.75;">${report.generated ? 'seeded generated course' : `${report.variants} controlled profiles`} · ${report.tuningLabel}</div>
    </div>`;
  }


  /* ── Full track validation (Milestone 5.5) ───────────────────────────── */
  // This is the final fixed-course framework gate. It combines the existing
  // recipe/connection/builder audits with structural, bounds, finish and
  // mixer checks. It reports problems only; it does not move any geometry.
  const TRACK_VALIDATION_RULES = Object.freeze({
    requiredMixerKinds:Object.freeze(['early','mid','late']),
    minimumHighMixingSections:3,
  });

  function isFiniteTrackNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function objectVerticalExtent(collectionName,item) {
    if (collectionName === 'segments') return [Math.min(item.y1,item.y2),Math.max(item.y1,item.y2)];
    if (collectionName === 'pegs') {
      const radius = item.radius ?? (item.big ? 7 : 5);
      return [item.y-radius,item.y+radius];
    }
    if (collectionName === 'boosts') return [item.y,item.y+item.h];
    if (collectionName === 'funnels') return [item.y-item.h/2,item.y+item.h/2];
    if (collectionName === 'loops') return [item.cy-item.r,item.cy+item.r];
    if (collectionName === 'domes') return [item.cy-item.ry,item.cy+item.ry];
    if (collectionName === 'mixers') {
      return [Math.min(item.cy-item.ry,item.releaseY),Math.max(item.cy+item.ry,item.releaseY)];
    }
    if (collectionName === 'beams') {
      const reach = item.length/2 + item.thickness/2;
      return [item.cy-reach,item.cy+reach];
    }
    if (collectionName === 'gates') {
      const reach = item.length + item.thickness/2;
      return [item.cy-item.thickness/2,item.cy+reach];
    }
    return [0,0];
  }


  /* ── Dynamic assembled-course geometry (Roadmap 6.5) ───────────────── */
  // Geometry is derived from the current assembled section manifest and the
  // objects actually produced by its builders. Runtime systems no longer
  // depend on fixed world-height or finish-position constants.
  function deriveTrackGeometry(trackData) {
    const sections = trackData?.sections ?? [];
    const collections = ['segments','pegs','boosts','funnels','loops','domes','mixers','beams','gates'];

    let contentMinY = Infinity;
    let contentMaxY = -Infinity;
    collections.forEach(collectionName => {
      (trackData?.[collectionName] ?? []).forEach(item => {
        const [minY,maxY] = objectVerticalExtent(collectionName,item);
        if (isFiniteTrackNumber(minY)) contentMinY = Math.min(contentMinY,minY);
        if (isFiniteTrackNumber(maxY)) contentMaxY = Math.max(contentMaxY,maxY);
      });
    });

    const finishSection = sections.find(section => section.type === 'finish');
    const finishSegment = (trackData?.segments ?? []).find(segment => segment.type === 'finish');
    const finishY = isFiniteTrackNumber(finishSegment?.y1)
      ? finishSegment.y1
      : isFiniteTrackNumber(finishSection?.exit?.y)
        ? finishSection.exit.y
        : 0;

    const declaredStartY = sections.length
      ? Math.min(...sections.map(section => section.startY))
      : 0;
    const declaredEndY = sections.length
      ? Math.max(...sections.map(section => section.endY))
      : Math.max(0,finishY);

    const normalizedContentMinY = Number.isFinite(contentMinY) ? contentMinY : declaredStartY;
    const normalizedContentMaxY = Number.isFinite(contentMaxY) ? contentMaxY : declaredEndY;
    const courseStartY = Math.min(declaredStartY,normalizedContentMinY);
    const courseEndY = Math.max(declaredEndY,normalizedContentMaxY,finishY);
    const worldHeight = Math.ceil(Math.max(
      MIN_WORLD_HEIGHT,
      courseEndY + WORLD_BOTTOM_PADDING
    ));

    return Object.freeze({
      courseStartY,
      courseEndY,
      declaredStartY,
      declaredEndY,
      contentMinY:normalizedContentMinY,
      contentMaxY:normalizedContentMaxY,
      finishY,
      worldHeight,
      cameraMaxY:Math.max(0,worldHeight - VH),
      viewportHeight:VH,
      bottomPadding:worldHeight - courseEndY,
      signature:`S${courseStartY}|F${finishY}|E${courseEndY}|W${worldHeight}|C${Math.max(0,worldHeight-VH)}`,
    });
  }

  function getTrackGeometry(trackData=track) {
    if (trackData?.geometry) return trackData.geometry;
    return deriveTrackGeometry(trackData ?? {});
  }

  function getDynamicGeometryReport(trackData=track) {
    if (!trackData) {
      return {
        pass:false,
        issues:['Track has not been built.'],
        finishY:0,courseEndY:0,worldHeight:0,cameraMaxY:0,bottomPadding:0,
        signature:'missing',
      };
    }

    const issues = [];
    const geometry = getTrackGeometry(trackData);
    const finishSection = (trackData.sections ?? []).find(section => section.type === 'finish');
    const finishSegments = (trackData.segments ?? []).filter(segment => segment.type === 'finish');

    if (!isFiniteTrackNumber(geometry.finishY) || geometry.finishY <= 0) {
      issues.push('Derived finish position is invalid.');
    }
    if (finishSegments.length !== 1) {
      issues.push(`Expected one finish segment; found ${finishSegments.length}.`);
    } else if (
      finishSegments[0].y1 !== geometry.finishY ||
      finishSegments[0].y2 !== geometry.finishY
    ) {
      issues.push('Finish segment does not match the derived finish position.');
    }
    if (
      !finishSection ||
      geometry.finishY < finishSection.startY ||
      geometry.finishY > finishSection.endY
    ) {
      issues.push('Derived finish position is outside the Finish section.');
    }
    if (geometry.courseEndY < geometry.finishY) {
      issues.push('Course end is above the finish line.');
    }
    if (geometry.worldHeight < geometry.courseEndY) {
      issues.push('Derived world height does not contain the course.');
    }
    if (geometry.cameraMaxY !== Math.max(0,geometry.worldHeight - VH)) {
      issues.push('Derived camera limit does not match world and viewport height.');
    }
    if (geometry.bottomPadding < VH) {
      issues.push('Derived world does not leave enough lower camera padding.');
    }

    return {
      pass:issues.length === 0,
      issues,
      ...geometry,
    };
  }

  function getGeneratedCourseReport(trackData=track) {
    const recipe = trackData?.recipe;
    if (!recipe?.generated) {
      return {
        pass:true,
        issues:[],
        active:false,
        label:'Controlled profile selected; generated-course validation is idle.',
        sections:trackData?.sections?.length ?? 0,
        patternId:'none',
        seed:'',
      };
    }

    const compatibility = validateTrackRecipeCompatibility(recipe);
    const assembly = getTrackAssemblyReport(trackData);
    const validation = getTrackValidationReport(trackData);
    const issues = [];
    if (!compatibility.pass) issues.push(...compatibility.issues);
    if (!assembly.pass) issues.push(...assembly.issues);
    if (!validation.pass) issues.push(...validation.issues);
    if (!recipe.seed) issues.push('Generated course is missing its reproducible seed.');
    if (!GENERATED_COURSE_PATTERNS.some(pattern => pattern.id === recipe.patternId)) {
      issues.push(`Unknown generated pattern ${recipe.patternId}.`);
    }

    return {
      pass:issues.length === 0,
      issues,
      active:true,
      label:recipe.label,
      sections:trackData.sections.length,
      patternId:recipe.patternId,
      seed:recipe.seed,
      finishY:trackData.geometry?.finishY ?? 0,
      worldHeight:trackData.geometry?.worldHeight ?? 0,
    };
  }


  /* ── Generated-course balance audit (Phase 8.1) ─────────────────────── */
  // This audit is intentionally read-only. It does not change pattern order,
  // seed hashing or recipe selection, so existing saved seeds remain stable.
  const COURSE_BALANCE_AUDIT_RULES = Object.freeze({
    sampleSeeds:4096,
    maximumPatternDeviation:0.15,
    maximumProfileDeviation:0.12,
    minimumPatternSections:10,
    maximumPatternSections:16,
  });

  const COURSE_BALANCE_CORE_SECTIONS = Object.freeze([
    'start-chute','speed-zone','early-mixer','mid-mixer','late-mixer',
    'final-sprint','finish',
  ]);

  const COURSE_BALANCE_VARIANT_SECTIONS = Object.freeze([
    'plinko-zigzag','plinko-diamond',
    'funnel-pinpoint','funnel-twin',
    'dome-gravity','dome-orbit',
    'loop-cascade','loop-slalom',
    'balance-beam','spiral-bowl','bounce-chamber','split-gate','drop-tower',
  ]);

  let courseBalanceAuditCache = null;

  function getGeneratedCourseBalanceReport() {
    if (courseBalanceAuditCache) return courseBalanceAuditCache;

    const normalPatterns = GENERATED_COURSE_PATTERNS.filter(pattern => !pattern.showcase);
    const definitions = new Map(TRACK_SECTION_DEFINITIONS.map(section => [section.id,section]));
    const issues = [];
    const patternCounts = new Map(normalPatterns.map(pattern => [pattern.id,0]));
    const profileCounts = new Map(TRACK_RECIPE_VARIANTS.map(recipe => [recipe.tuning.id,0]));
    const sectionCoverage = new Map();
    const patternLengths = [];

    normalPatterns.forEach(pattern => {
      patternLengths.push(pattern.sectionIds.length);
      const uniqueIds = new Set(pattern.sectionIds);
      uniqueIds.forEach(sectionId => {
        sectionCoverage.set(sectionId,(sectionCoverage.get(sectionId) ?? 0) + 1);
      });

      if (pattern.sectionIds.length < COURSE_BALANCE_AUDIT_RULES.minimumPatternSections ||
          pattern.sectionIds.length > COURSE_BALANCE_AUDIT_RULES.maximumPatternSections) {
        issues.push(`${pattern.id} has ${pattern.sectionIds.length} sections; expected ${COURSE_BALANCE_AUDIT_RULES.minimumPatternSections}-${COURSE_BALANCE_AUDIT_RULES.maximumPatternSections}.`);
      }
      if (pattern.sectionIds[0] !== 'start-chute' || pattern.sectionIds.at(-1) !== 'finish') {
        issues.push(`${pattern.id} does not preserve Start/Finish boundaries.`);
      }

      const highMixing = pattern.sectionIds.filter(sectionId =>
        definitions.get(sectionId)?.mixingStrength === 'high'
      ).length;
      if (highMixing < TRACK_VALIDATION_RULES.minimumHighMixingSections) {
        issues.push(`${pattern.id} contains only ${highMixing} high-mixing sections.`);
      }
    });

    COURSE_BALANCE_CORE_SECTIONS.forEach(sectionId => {
      const count = sectionCoverage.get(sectionId) ?? 0;
      if (count !== normalPatterns.length) {
        issues.push(`Core section ${sectionId} appears in ${count}/${normalPatterns.length} normal patterns.`);
      }
    });

    COURSE_BALANCE_VARIANT_SECTIONS.forEach(sectionId => {
      const count = sectionCoverage.get(sectionId) ?? 0;
      if (count < 1) issues.push(`Variant section ${sectionId} is absent from normal generated courses.`);
      if (count > Math.ceil(normalPatterns.length / 2)) {
        issues.push(`Variant section ${sectionId} is overrepresented in ${count}/${normalPatterns.length} normal patterns.`);
      }
    });

    for (let index=0; index<COURSE_BALANCE_AUDIT_RULES.sampleSeeds; index++) {
      const seed = `balance-audit-${index}`;
      const random = createSeededRandom(seed);
      const pattern = normalPatterns[Math.floor(random() * normalPatterns.length)];
      const profile = TRACK_RECIPE_VARIANTS[Math.floor(random() * TRACK_RECIPE_VARIANTS.length)];
      patternCounts.set(pattern.id,(patternCounts.get(pattern.id) ?? 0) + 1);
      profileCounts.set(profile.tuning.id,(profileCounts.get(profile.tuning.id) ?? 0) + 1);
    }

    const expectedPattern = COURSE_BALANCE_AUDIT_RULES.sampleSeeds / normalPatterns.length;
    const expectedProfile = COURSE_BALANCE_AUDIT_RULES.sampleSeeds / TRACK_RECIPE_VARIANTS.length;
    const patternDeviation = Math.max(...[...patternCounts.values()].map(count =>
      Math.abs(count - expectedPattern) / expectedPattern
    ));
    const profileDeviation = Math.max(...[...profileCounts.values()].map(count =>
      Math.abs(count - expectedProfile) / expectedProfile
    ));

    if (patternDeviation > COURSE_BALANCE_AUDIT_RULES.maximumPatternDeviation) {
      issues.push(`Seeded pattern distribution deviates by ${(patternDeviation*100).toFixed(1)}%; limit is ${(COURSE_BALANCE_AUDIT_RULES.maximumPatternDeviation*100).toFixed(0)}%.`);
    }
    if (profileDeviation > COURSE_BALANCE_AUDIT_RULES.maximumProfileDeviation) {
      issues.push(`Seeded profile distribution deviates by ${(profileDeviation*100).toFixed(1)}%; limit is ${(COURSE_BALANCE_AUDIT_RULES.maximumProfileDeviation*100).toFixed(0)}%.`);
    }

    const optionalCoverage = COURSE_BALANCE_VARIANT_SECTIONS.map(sectionId => ({
      sectionId,
      patterns:sectionCoverage.get(sectionId) ?? 0,
    }));
    const leastUsed = Math.min(...optionalCoverage.map(item => item.patterns));
    const mostUsed = Math.max(...optionalCoverage.map(item => item.patterns));
    const averageSections = patternLengths.reduce((sum,value) => sum + value,0) / patternLengths.length;

    courseBalanceAuditCache = {
      pass:issues.length === 0,
      issues,
      normalPatterns:normalPatterns.length,
      sampleSeeds:COURSE_BALANCE_AUDIT_RULES.sampleSeeds,
      variantSections:COURSE_BALANCE_VARIANT_SECTIONS.length,
      leastUsed,
      mostUsed,
      minimumSections:Math.min(...patternLengths),
      maximumSections:Math.max(...patternLengths),
      averageSections,
      patternDeviation,
      profileDeviation,
      patternCounts:Object.fromEntries(patternCounts),
      profileCounts:Object.fromEntries(profileCounts),
      optionalCoverage,
      signature:[
        `P${normalPatterns.length}`,
        `S${COURSE_BALANCE_AUDIT_RULES.sampleSeeds}`,
        `V${COURSE_BALANCE_VARIANT_SECTIONS.length}`,
        `L${Math.min(...patternLengths)}-${Math.max(...patternLengths)}`,
        `D${patternDeviation.toFixed(4)}/${profileDeviation.toFixed(4)}`,
      ].join('|'),
    };
    return courseBalanceAuditCache;
  }

  function buildGeneratedCourseBalancePanel() {
    const report = getGeneratedCourseBalanceReport();
    const statusColor = report.pass ? '#00ffaa' : '#ff5566';
    const detail = report.pass
      ? `${report.normalPatterns} normal patterns and ${report.variantSections} library variants are represented safely.`
      : report.issues.join(' · ');

    return `<div style="width:100%;padding:7px 8px;border:1px solid ${statusColor}55;border-radius:5px;background:rgba(0,30,45,0.5);font-size:9px;line-height:1.5;color:#9ab7c8;">
      <div style="color:${statusColor};font-weight:700;letter-spacing:.08em;">COURSE BALANCE: ${report.pass ? 'PASS' : 'REVIEW'}</div>
      <div>${detail}</div>
      <div style="opacity:.75;">${report.sampleSeeds} seed sample · ${report.minimumSections}-${report.maximumSections} sections · pattern dev ${(report.patternDeviation*100).toFixed(1)}% · profile dev ${(report.profileDeviation*100).toFixed(1)}%</div>
    </div>`;
  }

  function buildGeneratedCoursePanel() {
    const report = getGeneratedCourseReport();
    const statusColor = report.pass ? '#00ffaa' : '#ff5566';
    const detail = report.active
      ? `${report.label} generated reproducibly from seed ${report.seed}.`
      : report.label;
    return `<div style="width:100%;padding:7px 8px;border:1px solid ${statusColor}55;border-radius:5px;background:rgba(0,30,45,0.5);font-size:9px;line-height:1.5;color:#9ab7c8;">
      <div style="color:${statusColor};font-weight:700;letter-spacing:.08em;">GENERATED COURSE: ${report.pass ? 'PASS' : 'REVIEW'}</div>
      <div>${report.pass ? detail : report.issues.join(' · ')}</div>
      <div style="opacity:.75;">${report.active ? `${report.sections} sections · pattern ${report.patternId} · finish ${report.finishY}px · world ${report.worldHeight}px` : `${GENERATED_COURSE_PATTERNS.length} safe patterns available`}</div>
    </div>`;
  }

  function buildDynamicGeometryPanel() {
    const report = getDynamicGeometryReport();
    const statusColor = report.pass ? '#00ffaa' : '#ff5566';
    const detail = report.pass
      ? `Finish, progress and camera limits derive from the assembled course.`
      : report.issues.join(' · ');

    return `<div style="width:100%;padding:7px 8px;border:1px solid ${statusColor}55;border-radius:5px;background:rgba(0,30,45,0.5);font-size:9px;line-height:1.5;color:#9ab7c8;">
      <div style="color:${statusColor};font-weight:700;letter-spacing:.08em;">DYNAMIC GEOMETRY: ${report.pass ? 'PASS' : 'REVIEW'}</div>
      <div>${detail}</div>
      <div style="opacity:.75;">finish ${report.finishY}px · course ${report.courseEndY}px · world ${report.worldHeight}px · camera max ${report.cameraMaxY}px</div>
    </div>`;
  }

  function validateTrackObjectBounds(collectionName,item,index,issues,worldHeight) {
    const label = `${collectionName}[${index}]`;
    const fail = message => issues.push(`${label}: ${message}`);
    const withinX = value => isFiniteTrackNumber(value) && value >= 0 && value <= W;
    const withinY = value => isFiniteTrackNumber(value) && value >= 0 && value <= worldHeight;

    if (collectionName === 'segments') {
      if (![item.x1,item.x2].every(withinX) || ![item.y1,item.y2].every(withinY)) {
        fail('segment endpoint is outside the world bounds.');
      }
    } else if (collectionName === 'pegs') {
      const radius = item.radius ?? (item.big ? 7 : 5);
      if (!isFiniteTrackNumber(item.x) || !isFiniteTrackNumber(item.y) ||
          item.x-radius < 0 || item.x+radius > W || item.y-radius < 0 || item.y+radius > worldHeight) {
        fail('peg radius extends outside the world bounds.');
      }
    } else if (collectionName === 'boosts') {
      if (![item.x,item.y,item.w,item.h].every(isFiniteTrackNumber) || item.w <= 0 || item.h <= 0 ||
          item.x < 0 || item.x+item.w > W || item.y < 0 || item.y+item.h > worldHeight) {
        fail('boost rectangle is invalid or outside the world bounds.');
      }
    } else if (collectionName === 'funnels') {
      if (![item.x,item.y,item.topW,item.botW,item.h].every(isFiniteTrackNumber) ||
          item.topW <= 0 || item.botW <= 0 || item.h <= 0 ||
          item.x-item.topW/2 < 0 || item.x+item.topW/2 > W ||
          item.y-item.h/2 < 0 || item.y+item.h/2 > worldHeight) {
        fail('funnel geometry is invalid or outside the world bounds.');
      }
    } else if (collectionName === 'loops') {
      if (![item.cx,item.cy,item.r].every(isFiniteTrackNumber) || item.r <= 0 ||
          item.cx-item.r < 0 || item.cx+item.r > W || item.cy-item.r < 0 || item.cy+item.r > worldHeight) {
        fail('loop radius extends outside the world bounds.');
      }
    } else if (collectionName === 'domes') {
      const holeR = item.holeR ?? 16;
      if (![item.cx,item.cy,item.rx,item.ry,holeR].every(isFiniteTrackNumber) ||
          item.rx <= 0 || item.ry <= 0 || holeR <= 0 || holeR >= Math.min(item.rx,item.ry) ||
          item.cx-item.rx < 0 || item.cx+item.rx > W || item.cy-item.ry < 0 || item.cy+item.ry > worldHeight) {
        fail('dome or centre-hole geometry is invalid or outside the world bounds.');
      }
    } else if (collectionName === 'mixers') {
      if (![item.cx,item.cy,item.rx,item.ry,item.holeR,item.captureHalfW,item.releaseY]
            .every(isFiniteTrackNumber) || item.rx <= 0 || item.ry <= 0 || item.holeR <= 0 ||
          item.holeR >= Math.min(item.rx,item.ry) || item.captureHalfW <= 0 ||
          item.cx-item.rx < 0 || item.cx+item.rx > W ||
          item.cy-item.ry < 0 || item.cy+item.ry > worldHeight || !withinY(item.releaseY)) {
        fail('mixer geometry is invalid or outside the world bounds.');
      }
    } else if (collectionName === 'beams') {
      const reach = item.length/2 + item.thickness/2;
      if (![item.cx,item.cy,item.length,item.thickness,item.angle,item.minAngle,item.maxAngle]
            .every(isFiniteTrackNumber) || item.length <= 0 || item.thickness <= 0 ||
          item.minAngle >= item.maxAngle || item.cx-reach < 0 || item.cx+reach > W ||
          item.cy-reach < 0 || item.cy+reach > worldHeight ||
          item.angle < item.minAngle-0.001 || item.angle > item.maxAngle+0.001) {
        fail('balance-beam geometry is invalid or outside the world bounds.');
      }
    } else if (collectionName === 'gates') {
      const reach = item.length + item.thickness/2;
      if (![item.cx,item.cy,item.length,item.thickness,item.angle,item.targetAngle,
            item.minAngle,item.maxAngle,item.spring,item.damping,item.maxAngularVelocity]
            .every(isFiniteTrackNumber) || item.length <= 0 || item.thickness <= 0 ||
          item.minAngle >= item.maxAngle || item.cx-reach < 0 || item.cx+reach > W ||
          item.cy-item.thickness/2 < 0 || item.cy+reach > worldHeight ||
          item.angle < item.minAngle-0.001 || item.angle > item.maxAngle+0.001 ||
          item.targetAngle < item.minAngle-0.001 || item.targetAngle > item.maxAngle+0.001) {
        fail('split-gate geometry is invalid or outside the world bounds.');
      }
    }
  }

  function getTrackValidationReport(trackData=track) {
    const issues = [];
    if (!trackData) {
      return {
        pass:false,issues:['Track has not been built.'],sections:0,connections:0,
        objectsChecked:0,mixers:0,requiredMixers:TRACK_VALIDATION_RULES.requiredMixerKinds.length,
        finishSegments:0,finishY:0,declaredEndY:0,contentMaxY:0,
        worldHeight:0,cameraMaxY:0,signature:'missing',
      };
    }

    const geometry = getTrackGeometry(trackData);
    const assemblyReport = getTrackAssemblyReport(trackData);
    const connectionReport = getTrackConnectionReport(trackData);
    const builderReport = getTrackBuilderReport(trackData);
    if (!assemblyReport.pass) issues.push(`Assembly: ${assemblyReport.issues.join(' ')}`);
    if (!connectionReport.pass) issues.push(`Connections: ${connectionReport.issues.join(' ')}`);
    if (!builderReport.pass) issues.push(`Builders: ${builderReport.issues.join(' ')}`);

    const sections = trackData.sections ?? [];
    const sectionIds = sections.map(section => section.id);
    const uniqueSectionIds = new Set(sectionIds);
    if (uniqueSectionIds.size !== sectionIds.length) issues.push('Section IDs are not unique.');
    if (sections.filter(section => section.type === 'start').length !== 1) issues.push('Track must contain exactly one start section.');
    if (sections.filter(section => section.type === 'finish').length !== 1) issues.push('Track must contain exactly one finish section.');
    if (sections[0]?.type !== 'start') issues.push('First assembled section is not the start.');
    if (sections.at(-1)?.type !== 'finish') issues.push('Last assembled section is not the finish.');

    const sectionMap = new Map(sections.map(section => [section.id,section]));
    sections.forEach((section,index) => {
      const label = section.id || `section-${index + 1}`;
      if (!label || !section.builderKey) issues.push(`Section ${index + 1} is missing an ID or builder key.`);
      if (typeof TRACK_SECTION_BUILDERS[section.builderKey] !== 'function') {
        issues.push(`${label} has no registered builder ${section.builderKey}.`);
      }
      if (![section.startY,section.endY,section.entry?.x,section.entry?.y,section.entry?.width,
            section.exit?.x,section.exit?.y,section.exit?.width].every(isFiniteTrackNumber)) {
        issues.push(`${label} contains non-numeric section or connection geometry.`);
      } else {
        if (section.startY < 0 || section.endY > geometry.worldHeight || section.startY >= section.endY) {
          issues.push(`${label} has invalid vertical bounds ${section.startY}-${section.endY}.`);
        }
        if (section.entry.width <= 0 || section.exit.width <= 0 ||
            section.entry.x-section.entry.width/2 < 0 || section.entry.x+section.entry.width/2 > W ||
            section.exit.x-section.exit.width/2 < 0 || section.exit.x+section.exit.width/2 > W) {
          issues.push(`${label} has invalid entry/exit width or horizontal bounds.`);
        }
        if (section.entry.y < section.startY || section.entry.y > section.endY ||
            section.exit.y < section.startY || section.exit.y > section.endY) {
          issues.push(`${label} entry/exit Y is outside its declared section bounds.`);
        }
      }
    });

    const collections = ['segments','pegs','boosts','funnels','loops','domes','mixers','beams','gates'];
    let objectsChecked = 0;
    let contentMinY = Infinity;
    let contentMaxY = -Infinity;
    collections.forEach(collectionName => {
      const items = trackData[collectionName] ?? [];
      items.forEach((item,index) => {
        objectsChecked += 1;
        validateTrackObjectBounds(collectionName,item,index,issues,geometry.worldHeight);
        const section = sectionMap.get(item.sectionId);
        if (!section) {
          issues.push(`${collectionName}[${index}] references unknown section ${item.sectionId ?? 'missing'}.`);
        } else if (!section.componentIds.includes(item.componentId)) {
          issues.push(`${collectionName}[${index}] uses undeclared component ${item.componentId ?? 'missing'} in ${section.id}.`);
        }
        const [minY,maxY] = objectVerticalExtent(collectionName,item);
        contentMinY = Math.min(contentMinY,minY);
        contentMaxY = Math.max(contentMaxY,maxY);
      });
    });

    const mixers = trackData.mixers ?? [];
    const mixerIds = new Set(mixers.map(mixer => mixer.id));
    const mixerKinds = new Set(mixers.map(mixer => mixer.kind));
    TRACK_VALIDATION_RULES.requiredMixerKinds.forEach(kind => {
      if (!mixerKinds.has(kind)) issues.push(`Required ${kind} mixer is missing.`);
    });
    if (mixers.length !== mixerIds.size) issues.push('Mixer IDs are not unique.');
    const highMixingSections = sections.filter(section => section.mixingStrength === 'high').length;
    if (highMixingSections < TRACK_VALIDATION_RULES.minimumHighMixingSections) {
      issues.push(`Only ${highMixingSections} high-mixing sections; expected at least ${TRACK_VALIDATION_RULES.minimumHighMixingSections}.`);
    }

    const finishSegments = (trackData.segments ?? []).filter(segment => segment.type === 'finish');
    if (finishSegments.length !== 1) issues.push(`Expected exactly one finish segment; found ${finishSegments.length}.`);
    finishSegments.forEach(segment => {
      if (segment.y1 !== geometry.finishY || segment.y2 !== geometry.finishY) {
        issues.push(`Finish segment does not align with derived finish Y ${geometry.finishY}.`);
      }
      if (sectionMap.get(segment.sectionId)?.type !== 'finish') issues.push('Finish segment is not owned by a finish section.');
    });
    const finishSection = sections.find(section => section.type === 'finish');
    if (
      !finishSection ||
      geometry.finishY < finishSection.startY ||
      geometry.finishY > finishSection.endY
    ) {
      issues.push(`Derived finish Y ${geometry.finishY} is outside the finish section bounds.`);
    }

    const declaredEndY = geometry.declaredEndY;
    if (declaredEndY > geometry.worldHeight) {
      issues.push(`Declared course end ${declaredEndY}px exceeds derived world height ${geometry.worldHeight}px.`);
    }
    if (geometry.finishY > geometry.worldHeight) {
      issues.push(`Derived finish Y ${geometry.finishY}px exceeds world height ${geometry.worldHeight}px.`);
    }
    if (Number.isFinite(contentMinY) && contentMinY < 0) {
      issues.push(`Track content begins above world Y=0 (${contentMinY}px).`);
    }
    if (Number.isFinite(contentMaxY) && contentMaxY > geometry.worldHeight) {
      issues.push(`Track content extends below world height (${contentMaxY}px).`);
    }

    return {
      pass:issues.length === 0,
      issues,
      sections:sections.length,
      connections:(trackData.connections ?? []).length,
      objectsChecked,
      mixers:mixers.length,
      requiredMixers:TRACK_VALIDATION_RULES.requiredMixerKinds.length,
      finishSegments:finishSegments.length,
      highMixingSections,
      finishY:geometry.finishY,
      declaredEndY,
      courseEndY:geometry.courseEndY,
      contentMinY:Number.isFinite(contentMinY) ? contentMinY : 0,
      contentMaxY:Number.isFinite(contentMaxY) ? contentMaxY : 0,
      worldHeight:geometry.worldHeight,
      cameraMaxY:geometry.cameraMaxY,
      signature:[
        assemblyReport.signature,
        connectionReport.signature,
        builderReport.signature,
        `O${objectsChecked}`,
        `M${mixers.length}`,
        `F${finishSegments.length}@${geometry.finishY}`,
        `Y${declaredEndY}/${geometry.worldHeight}`,
        geometry.signature,
      ].join('||'),
    };
  }

  function buildTrackValidationPanel() {
    const report = getTrackValidationReport();
    const statusColor = report.pass ? '#00ffaa' : '#ff5566';
    const detail = report.pass
      ? `${report.sections} sections · ${report.connections} joins · ${report.objectsChecked} track objects validated.`
      : report.issues.join(' · ');

    return `<div style="width:100%;padding:7px 8px;border:1px solid ${statusColor}55;border-radius:5px;background:rgba(0,30,45,0.5);font-size:9px;line-height:1.5;color:#9ab7c8;">
      <div style="color:${statusColor};font-weight:700;letter-spacing:.08em;">TRACK VALIDATION: ${report.pass ? 'PASS' : 'REVIEW'}</div>
      <div>${detail}</div>
      <div style="opacity:.75;">${report.mixers}/${report.requiredMixers} required mixers · finish ${report.finishY}px · course ${report.declaredEndY}px · world ${report.worldHeight}px</div>
    </div>`;
  }

  /* ── Course-control audit (Phase 8.3) ───────────────────────────── */
  let courseControlsAuditCache = null;

  function getCourseControlsReport() {
    if (courseControlsAuditCache) return courseControlsAuditCache;

    const issues = [];
    const combinations = [];
    const samplesPerCombination = 48;
    const lengths = Object.keys(COURSE_LENGTH_PRESETS);
    const frequencies = Object.keys(OBSTACLE_FREQUENCY_PRESETS);

    lengths.forEach(courseLength => {
      frequencies.forEach(obstacleFrequency => {
        let minimum = Infinity;
        let maximum = -Infinity;
        let advancedTotal = 0;

        for (let index=0; index<samplesPerCombination; index++) {
          const seed =
            `control-${courseLength}-${obstacleFrequency}-${index}`;
          const recipe = generateControlledTrackRecipe(seed,{
            courseLength,
            obstacleFrequency,
          });
          const repeated = generateControlledTrackRecipe(seed,{
            courseLength,
            obstacleFrequency,
          });

          if (
            recipe.sectionIds.join('>') !==
              repeated.sectionIds.join('>') ||
            recipe.tuning.id !== repeated.tuning.id
          ) {
            issues.push(
              `${courseLength}/${obstacleFrequency} is not deterministic.`
            );
          }

          const compatibility = validateTrackRecipeCompatibility(recipe);
          if (!compatibility.pass) {
            issues.push(
              `${courseLength}/${obstacleFrequency}: ` +
              compatibility.issues.join(' ')
            );
          }

          const count = recipe.sectionIds.length;
          minimum = Math.min(minimum,count);
          maximum = Math.max(maximum,count);
          advancedTotal += recipe.advancedObstacleCount;

          const preset = COURSE_LENGTH_PRESETS[courseLength];
          if (
            count < preset.minSections ||
            count > preset.maxSections
          ) {
            issues.push(
              `${courseLength}/${obstacleFrequency} produced ` +
              `${count} sections; expected ` +
              `${preset.minSections}-${preset.maxSections}.`
            );
          }
        }

        combinations.push({
          courseLength,
          obstacleFrequency,
          minimum,
          maximum,
          averageAdvanced:
            advancedTotal / samplesPerCombination,
        });
      });
    });

    OBSTACLE_SHOWCASE_SEED_ALIASES.forEach(seed => {
      lengths.forEach(courseLength => {
        frequencies.forEach(obstacleFrequency => {
          const recipe = generateControlledTrackRecipe(seed,{
            courseLength,
            obstacleFrequency,
          });
          if (
            !recipe.showcase ||
            recipe.patternId !== 'obstacle-showcase'
          ) {
            issues.push(
              `Showcase seed ${seed} changed under ` +
              `${courseLength}/${obstacleFrequency}.`
            );
          }
        });
      });
    });

    // Standard/Balanced must preserve the exact original two random draws.
    const regressionSeed = 'phase-8-default-regression';
    const legacyRandom = createSeededRandom(regressionSeed);
    const normalPatterns = GENERATED_COURSE_PATTERNS.filter(
      pattern => !pattern.showcase
    );
    const legacyPattern = normalPatterns[
      Math.floor(legacyRandom() * normalPatterns.length)
    ];
    const legacyProfile = TRACK_RECIPE_VARIANTS[
      Math.floor(legacyRandom() * TRACK_RECIPE_VARIANTS.length)
    ];
    const defaultRecipe = generateControlledTrackRecipe(
      regressionSeed,
      {
        courseLength:'standard',
        obstacleFrequency:'balanced',
      }
    );
    if (
      defaultRecipe.patternId !== legacyPattern.id ||
      !defaultRecipe.tuning.id.includes(legacyProfile.tuning.id)
    ) {
      issues.push(
        'Standard/Balanced changed the original seed mapping.'
      );
    }

    courseControlsAuditCache = {
      pass:issues.length === 0,
      issues,
      combinations:combinations.length,
      samples:combinations.length * samplesPerCombination,
      lengths:lengths.length,
      frequencies:frequencies.length,
      combinationsDetail:combinations,
    };
    return courseControlsAuditCache;
  }

  function buildCourseControlsPanel() {
    const report = getCourseControlsReport();
    const statusColor = report.pass ? '#00ffaa' : '#ff5566';
    const activeRecipe = getActiveTrackRecipe();
    const activeText = activeRecipe.showcase
      ? 'Seed-1 showcase ignores player generation controls.'
      : `${COURSE_LENGTH_PRESETS[activeCourseLength].label} length · ${OBSTACLE_FREQUENCY_PRESETS[activeObstacleFrequency].label} obstacle rate.`;
    const detail = report.pass
      ? `${report.combinations}/${report.combinations} length/frequency combinations validated.`
      : report.issues.join(' · ');

    return `<div style="width:100%;padding:7px 8px;border:1px solid ${statusColor}55;border-radius:5px;background:rgba(0,30,45,0.5);font-size:9px;line-height:1.5;color:#9ab7c8;">
      <div style="color:${statusColor};font-weight:700;letter-spacing:.08em;">COURSE CONTROLS: ${report.pass ? 'PASS' : 'REVIEW'}</div>
      <div>${detail}</div>
      <div style="opacity:.75;">${activeText} · ${report.samples} deterministic samples</div>
    </div>`;
  }

  /* ── Long-course pacing audit (Phase 8.4) ───────────────────────── */
  let racePacingAuditCache = null;

  function getRacePacingReport() {
    if (racePacingAuditCache) return racePacingAuditCache;

    const issues = [];
    const lengths = ['short','standard','long'];
    const frequencies = ['light','balanced','heavy'];
    const samples = [];
    const testSeed = 'pacing-audit';

    frequencies.forEach(obstacleFrequency => {
      const profiles = {};
      lengths.forEach(courseLength => {
        const recipe = generateControlledTrackRecipe(testSeed,{
          courseLength,
          obstacleFrequency,
        });
        const testTrack = buildTrack(recipe);
        const profile = getRacePacingProfile(testTrack,8);
        profiles[courseLength] = profile;
        samples.push(profile);

        if (
          profile.timeoutMs < MIN_RACE_TIMEOUT_MS ||
          profile.timeoutMs > MAX_RACE_TIMEOUT_MS
        ) {
          issues.push(
            `${courseLength}/${obstacleFrequency} timeout is outside safe limits.`
          );
        }
        if (
          profile.finishGraceMs < 8000 ||
          profile.finishGraceMs > MAX_FINISH_GRACE_MS
        ) {
          issues.push(
            `${courseLength}/${obstacleFrequency} finish grace is outside safe limits.`
          );
        }
        if (
          profile.extensionMs < MIN_PACE_EXTENSION_MS ||
          profile.extensionMs > MAX_PACE_EXTENSION_MS
        ) {
          issues.push(
            `${courseLength}/${obstacleFrequency} reserve time is outside safe limits.`
          );
        }
      });

      if (
        profiles.long.timeoutMs <= profiles.short.timeoutMs ||
        profiles.long.finishGraceMs < profiles.short.finishGraceMs
      ) {
        issues.push(
          `${obstacleFrequency} pacing does not scale from Short to Long.`
        );
      }
    });

    const showcaseRecipe = generateControlledTrackRecipe('seed-1',{
      courseLength:'short',
      obstacleFrequency:'light',
    });
    const showcaseTrack = buildTrack(showcaseRecipe);
    const showcaseProfile = getRacePacingProfile(showcaseTrack,8);
    if (
      !showcaseRecipe.showcase ||
      showcaseProfile.timeoutMs <= BASE_RACE_TIMEOUT_MS
    ) {
      issues.push('Obstacle Showcase did not receive extended pacing.');
    }

    const classicTrack = buildTrack(CLASSIC_TRACK_RECIPE);
    const classicProfile = getRacePacingProfile(classicTrack,8);
    if (
      classicProfile.timeoutMs < 115000 ||
      classicProfile.timeoutMs > 130000
    ) {
      issues.push('Classic course moved too far from its original timeout.');
    }

    racePacingAuditCache = {
      pass:issues.length === 0,
      issues,
      combinations:samples.length,
      classicTimeoutMs:classicProfile.timeoutMs,
      showcaseTimeoutMs:showcaseProfile.timeoutMs,
      showcaseGraceMs:showcaseProfile.finishGraceMs,
      showcaseExtensionMs:showcaseProfile.extensionMs,
      minimumTimeoutMs:Math.min(...samples.map(item => item.timeoutMs)),
      maximumTimeoutMs:Math.max(
        showcaseProfile.timeoutMs,
        ...samples.map(item => item.timeoutMs)
      ),
      signature:[
        `N${samples.length}`,
        `C${classicProfile.timeoutMs}`,
        `S${showcaseProfile.timeoutMs}`,
        `G${showcaseProfile.finishGraceMs}`,
        `E${showcaseProfile.extensionMs}`,
      ].join('|'),
    };
    return racePacingAuditCache;
  }

  function buildRacePacingPanel() {
    const report = getRacePacingReport();
    const statusColor = report.pass ? '#00ffaa' : '#ff5566';
    const activeProfile = racePacingProfile ??
      getRacePacingProfile(track,marbles.length || 8);
    const detail = report.pass
      ? `${report.combinations}/9 generated pacing combinations validated.`
      : report.issues.join(' · ');

    return `<div style="width:100%;padding:7px 8px;border:1px solid ${statusColor}55;border-radius:5px;background:rgba(0,30,45,0.5);font-size:9px;line-height:1.5;color:#9ab7c8;">
      <div style="color:${statusColor};font-weight:700;letter-spacing:.08em;">RACE PACING: ${report.pass ? 'PASS' : 'REVIEW'}</div>
      <div>${detail}</div>
      <div style="opacity:.75;">active ${activeProfile.label} · limit ${formatRaceClock(activeProfile.timeoutMs)} · finish grace ${Math.round(activeProfile.finishGraceMs/1000)}s · reserve ${Math.round(activeProfile.extensionMs/1000)}s</div>
    </div>`;
  }

  /* ── Compact developer checks drawer (Milestone 6.1) ────────────── */
  // All validation systems remain active, but the large development cards are
  // hidden by default so they do not consume the normal player viewport.
  function getDeveloperChecksSummary() {
    const reports = [
      getPhysicsFairnessReport(),
      getTrackConnectionReport(),
      getTrackBuilderReport(),
      getTrackAssemblyReport(),
      getTrackValidationReport(),
      getSectionCompatibilityReport(),
      getDynamicGeometryReport(),
      getGeneratedCourseReport(),
      getGeneratedCourseBalanceReport(),
      getCameraPreviewReport(),
      getObstacleLibraryReport(),
      getFunnelLibraryReport(),
      getDomeLibraryReport(),
      getLoopLibraryReport(),
      getBalanceBeamLibraryReport(),
      getSpiralBowlLibraryReport(),
      getBounceChamberLibraryReport(),
      getSplitGateLibraryReport(),
      getDropTowerLibraryReport(),
      getObstacleShowcaseReport(),
      getFavouriteSeedsReport(),
      getCourseControlsReport(),
      getRacePacingReport(),
    ];
    const passed = reports.filter(report => report.pass).length;
    return {
      pass:passed === reports.length,
      passed,
      total:reports.length,
      issues:reports.flatMap(report => report.issues ?? []),
    };
  }

  function buildDeveloperChecksDrawer(extraContent='') {
    const summary = getDeveloperChecksSummary();
    const statusColor = summary.pass ? '#00ffaa' : '#ff5566';
    const statusText = summary.pass ? 'PASS' : 'REVIEW';

    return `<div class="mr-dev-checks-shell" style="width:100%;">
      <button type="button" class="mr-dev-checks-toggle" aria-expanded="${developerChecksOpen}"
              style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:5px 8px;background:rgba(0,30,45,0.55);border:1px solid ${statusColor}66;border-radius:5px;color:${statusColor};font-family:var(--font);font-size:9px;font-weight:700;letter-spacing:.07em;cursor:pointer;">
        <span>DEV CHECKS: ${summary.passed}/${summary.total} ${statusText}</span>
        <span class="mr-dev-checks-icon" aria-hidden="true">${developerChecksOpen ? '▲' : '▼'}</span>
      </button>
      <div class="mr-dev-checks-drawer"
           style="display:${developerChecksOpen ? 'flex' : 'none'};flex-direction:column;gap:6px;margin-top:6px;">
        ${extraContent}
        ${buildPhysicsAuditPanel()}
        ${buildTrackConnectionPanel()}
        ${buildTrackBuilderPanel()}
        ${buildTrackAssemblyPanel()}
        ${buildTrackValidationPanel()}
        ${buildSectionCompatibilityPanel()}
        ${buildDynamicGeometryPanel()}
        ${buildGeneratedCoursePanel()}
        ${buildGeneratedCourseBalancePanel()}
        ${buildCameraPreviewPanel()}
        ${buildObstacleLibraryPanel()}
        ${buildFunnelLibraryPanel()}
        ${buildDomeLibraryPanel()}
        ${buildLoopLibraryPanel()}
        ${buildBalanceBeamLibraryPanel()}
        ${buildSpiralBowlLibraryPanel()}
        ${buildBounceChamberLibraryPanel()}
        ${buildSplitGateLibraryPanel()}
        ${buildDropTowerLibraryPanel()}
        ${buildObstacleShowcasePanel()}
        ${buildFavouriteSeedsPanel()}
        ${buildCourseControlsPanel()}
        ${buildRacePacingPanel()}
      </div>
    </div>`;
  }

  function wireDeveloperChecksDrawer() {
    const toggle = paneEl?.querySelector('.mr-dev-checks-toggle');
    const drawer = paneEl?.querySelector('.mr-dev-checks-drawer');
    const icon = paneEl?.querySelector('.mr-dev-checks-icon');
    if (!toggle || !drawer) return;

    toggle.addEventListener('click', () => {
      developerChecksOpen = !developerChecksOpen;
      drawer.style.display = developerChecksOpen ? 'flex' : 'none';
      toggle.setAttribute('aria-expanded', String(developerChecksOpen));
      if (icon) icon.textContent = developerChecksOpen ? '▲' : '▼';
    });
  }

  /* ── State ───────────────────────────────────────────────────────────── */
  let paneEl   = null;
  let balance  = START_BALANCE;
  let selected = null;
  let wager    = 100;
  let phase    = 'pick';   // pick | race | result
  let raceMode    = 'single';  // single | duel | tournament
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
  let cameraMode = 'mine';      // active race camera
  let cameraPreset = 'mine';    // persisted starting camera
  let trackPreviewOpen = false;
  let raceStartedAt = 0;
  let raceResolved = false;
  let timeoutResolved = false;
  let firstFinishAt = 0;
  let racePacingProfile = null;
  let raceBaseDeadlineAt = 0;
  let raceDeadlineAt = 0;
  let raceExtensionUsed = false;
  let lastLeaderProgressY = 0;
  let lastLeaderProgressAt = 0;
  let wagerSettled = false;
  let selectedWon = false;
  let developerChecksOpen = false;
  let activeTrackRecipeId = CLASSIC_TRACK_RECIPE.id;
  let trackSelectionMode = 'manual'; // manual | seeded | generated
  let activeTrackSeed = '';
  let activeGeneratedRecipe = null;
  let activeCourseLength = 'standard';
  let activeObstacleFrequency = 'balanced';
  let favouriteSeeds = [];
  let favouriteSeedMenuOpen = false;
  let startAudit = [];
  let currentAuditRecorded = false;

  const COSMETIC_MARBLE_KEYS = new Set(['id','name','color','glow']);
  const FORBIDDEN_MARBLE_PHYSICS_KEYS = [
    'mass','radius','gravity','friction','drag','bounce','restitution',
    'maxVx','maxVy','maxSpeed','acceleration','pegRestitution',
    'wallRestitution','sideKick','physicsProfile',
  ];

  function getPhysicsFairnessReport() {
    const issues = [];
    const descriptorKeys = new Set();

    MARBLES.forEach(marble => {
      Object.keys(marble).forEach(key => descriptorKeys.add(key));
      const unexpected = Object.keys(marble).filter(key => !COSMETIC_MARBLE_KEYS.has(key));
      if (unexpected.length) {
        issues.push(`${marble.name} has non-cosmetic definition keys: ${unexpected.join(', ')}`);
      }
      const overrides = FORBIDDEN_MARBLE_PHYSICS_KEYS.filter(key =>
        Object.prototype.hasOwnProperty.call(marble,key)
      );
      if (overrides.length) {
        issues.push(`${marble.name} overrides shared physics: ${overrides.join(', ')}`);
      }
    });

    const activeOverrides = marbles.flatMap(marble =>
      FORBIDDEN_MARBLE_PHYSICS_KEYS
        .filter(key => Object.prototype.hasOwnProperty.call(marble,key))
        .map(key => `${marble.name}.${key}`)
    );
    if (activeOverrides.length) {
      issues.push(`Active racers contain physics overrides: ${activeOverrides.join(', ')}`);
    }

    if (!Object.isFrozen(PHYSICS_PROFILE)) {
      issues.push('Shared physics profile is not immutable.');
    }

    const requiredPositive = [
      'radius','gravity','maxVy','maxVx','boundaryBounce','wallRestitution',
      'pegRestitution','pegSideKick','minEscapeVy','friction','substeps',
      'progressCheckFrames','minProgressPerCheck','stuckWarnChecks',
      'stuckRecoverChecks','maxRecoveryAttempts',
    ];
    requiredPositive.forEach(key => {
      const value = PHYSICS_PROFILE[key];
      if (!Number.isFinite(value) || value <= 0) {
        issues.push(`Invalid shared physics value: ${key}=${value}`);
      }
    });

    const mixerIdentityKeys = track?.mixers?.flatMap(mx =>
      ['marbleId','selectedId','color','name'].filter(key =>
        Object.prototype.hasOwnProperty.call(mx,key)
      ).map(key => `${mx.id}.${key}`)
    ) ?? [];
    if (mixerIdentityKeys.length) {
      issues.push(`Mixer contains identity-specific rules: ${mixerIdentityKeys.join(', ')}`);
    }

    const signature = [
      `R${PHYSICS_PROFILE.radius}`,
      `G${PHYSICS_PROFILE.gravity}`,
      `VX${PHYSICS_PROFILE.maxVx}`,
      `VY${PHYSICS_PROFILE.maxVy}`,
      `F${PHYSICS_PROFILE.friction}`,
      `WR${PHYSICS_PROFILE.wallRestitution}`,
      `PR${PHYSICS_PROFILE.pegRestitution}`,
      `S${PHYSICS_PROFILE.substeps}`,
    ].join('|');

    return {
      pass:issues.length === 0,
      issues,
      signature,
      descriptorKeys:[...descriptorKeys].sort(),
      colours:MARBLES.length,
      activeRacers:marbles.length,
    };
  }

  function buildPhysicsAuditPanel() {
    const report = getPhysicsFairnessReport();
    const statusColor = report.pass ? '#00ffaa' : '#ff5566';
    const detail = report.pass
      ? `${report.colours}/${report.colours} colours use one immutable profile. Colour, name and glow are cosmetic only.`
      : report.issues.join(' · ');

    return `<div style="width:100%;padding:7px 8px;border:1px solid ${statusColor}55;border-radius:5px;background:rgba(0,30,45,0.5);font-size:9px;line-height:1.5;color:#9ab7c8;">
      <div style="color:${statusColor};font-weight:700;letter-spacing:.08em;">PHYSICS FAIRNESS: ${report.pass ? 'PASS' : 'REVIEW'}</div>
      <div>${detail}</div>
      <div style="opacity:.75;">Shared profile ${report.signature}</div>
    </div>`;
  }

  /* ── Storage ─────────────────────────────────────────────────────────── */
  async function loadBalance() {
    const saved = await Storage.load(BALANCE_KEY);
    balance = (saved !== null && Number.isFinite(saved)) ? saved : START_BALANCE;
  }
  function saveBalance() { Storage.saveLazy(BALANCE_KEY, balance); }

  async function loadCameraPreset() {
    const saved = await Storage.load(CAMERA_PRESET_KEY);
    cameraPreset = CAMERA_MODES.includes(saved) ? saved : 'mine';
    cameraMode = cameraPreset;
  }

  function saveCameraPreset() {
    Storage.saveLazy(CAMERA_PRESET_KEY,cameraPreset);
  }

  function setCameraPreference(mode,{applyToRace=true}={}) {
    if (!CAMERA_MODES.includes(mode)) return;
    cameraPreset = mode;
    if (applyToRace) cameraMode = mode;
    saveCameraPreset();
  }

  async function loadCourseGenerationControls() {
    const [savedLength,savedFrequency] = await Promise.all([
      Storage.load(COURSE_LENGTH_KEY),
      Storage.load(OBSTACLE_FREQUENCY_KEY),
    ]);
    activeCourseLength = normalizeCourseLength(savedLength);
    activeObstacleFrequency = normalizeObstacleFrequency(savedFrequency);
  }

  function saveCourseGenerationControls() {
    Storage.saveLazy(COURSE_LENGTH_KEY,activeCourseLength);
    Storage.saveLazy(
      OBSTACLE_FREQUENCY_KEY,
      activeObstacleFrequency
    );
  }

  function setCourseGenerationControls({
    courseLength,
    obstacleFrequency,
  }) {
    activeCourseLength = normalizeCourseLength(
      courseLength ?? activeCourseLength
    );
    activeObstacleFrequency = normalizeObstacleFrequency(
      obstacleFrequency ?? activeObstacleFrequency
    );
    saveCourseGenerationControls();
    courseControlsAuditCache = null;

    if (
      phase === 'pick' &&
      trackSelectionMode === 'generated' &&
      activeTrackSeed
    ) {
      activeGeneratedRecipe = generateControlledTrackRecipe(activeTrackSeed);
      activeTrackRecipeId = activeGeneratedRecipe.id;
      saveTrackRecipeSelection();
      rebuildSelectedTrack(activeGeneratedRecipe);
      buildPickScreen();
    }
  }

  async function loadTrackRecipeSelection() {
    const [savedRecipeId,savedMode,savedSeed] = await Promise.all([
      Storage.load(TRACK_RECIPE_KEY),
      Storage.load(TRACK_SELECTION_MODE_KEY),
      Storage.load(TRACK_SEED_KEY),
    ]);

    activeTrackSeed = normalizeTrackSeed(savedSeed);
    trackSelectionMode = ['seeded','generated'].includes(savedMode) && activeTrackSeed
      ? savedMode
      : 'manual';

    if (trackSelectionMode === 'generated') {
      activeGeneratedRecipe = generateControlledTrackRecipe(activeTrackSeed);
      activeTrackRecipeId = activeGeneratedRecipe.id;
    } else if (trackSelectionMode === 'seeded') {
      activeGeneratedRecipe = null;
      activeTrackRecipeId = getTrackRecipeForSeed(activeTrackSeed).id;
    } else {
      activeGeneratedRecipe = null;
      activeTrackRecipeId = TRACK_RECIPE_VARIANTS.some(recipe => recipe.id === savedRecipeId)
        ? savedRecipeId
        : CLASSIC_TRACK_RECIPE.id;
    }
  }

  function saveTrackRecipeSelection() {
    Storage.saveLazy(TRACK_RECIPE_KEY, activeTrackRecipeId);
    Storage.saveLazy(TRACK_SELECTION_MODE_KEY, trackSelectionMode);
    Storage.saveLazy(TRACK_SEED_KEY, activeTrackSeed);
  }

  function getActiveTrackRecipe() {
    if (trackSelectionMode === 'generated') {
      activeGeneratedRecipe = activeGeneratedRecipe ?? generateControlledTrackRecipe(activeTrackSeed);
      return activeGeneratedRecipe;
    }
    return getTrackRecipeById(activeTrackRecipeId);
  }

  function escapeSeedUI(value) {
    return String(value ?? '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function normaliseFavouriteName(rawName,fallbackSeed) {
    const cleaned = String(rawName ?? '')
      .replace(/[\u0000-\u001f\u007f]+/g,' ')
      .replace(/\s+/g,' ')
      .trim()
      .slice(0,40);
    return cleaned || fallbackSeed;
  }

  function favouriteSeedKey(
    seed,
    mode,
    courseLength=activeCourseLength,
    obstacleFrequency=activeObstacleFrequency
  ) {
    if (mode === 'seeded') return `${mode}:${seed}`;
    return [
      mode,
      seed,
      normalizeCourseLength(courseLength),
      normalizeObstacleFrequency(obstacleFrequency),
    ].join(':');
  }

  function createRandomTrackSeed() {
    let randomValue = Math.floor(Math.random() * 0xffffffff);
    if (globalThis.crypto?.getRandomValues) {
      const values = new Uint32Array(1);
      globalThis.crypto.getRandomValues(values);
      randomValue = values[0];
    }
    return normalizeTrackSeed(
      `run-${Date.now().toString(36)}-${randomValue.toString(36)}`
    );
  }

  async function loadFavouriteSeeds() {
    const saved = await Storage.load(FAVOURITE_SEEDS_KEY);
    const seen = new Set();
    favouriteSeeds = (Array.isArray(saved) ? saved : [])
      .map(entry => {
        const seed = normalizeTrackSeed(entry?.seed);
        const mode = entry?.mode === 'seeded' ? 'seeded' : 'generated';
        const courseLength = mode === 'generated'
          ? normalizeCourseLength(entry?.courseLength)
          : 'standard';
        const obstacleFrequency = mode === 'generated'
          ? normalizeObstacleFrequency(entry?.obstacleFrequency)
          : 'balanced';
        if (!seed) return null;
        const key = favouriteSeedKey(
          seed,
          mode,
          courseLength,
          obstacleFrequency
        );
        if (seen.has(key)) return null;
        seen.add(key);
        return {
          seed,
          mode,
          courseLength,
          obstacleFrequency,
          name:normaliseFavouriteName(entry?.name,seed),
          recipeLabel:String(entry?.recipeLabel ?? '').slice(0,60),
          savedAt:Number.isFinite(entry?.savedAt) ? entry.savedAt : Date.now(),
          lastUsedAt:Number.isFinite(entry?.lastUsedAt) ? entry.lastUsedAt : 0,
        };
      })
      .filter(Boolean)
      .slice(0,MAX_FAVOURITE_SEEDS);
  }

  async function persistFavouriteSeeds() {
    favouriteSeeds = favouriteSeeds.slice(0,MAX_FAVOURITE_SEEDS);
    await Storage.save(FAVOURITE_SEEDS_KEY,favouriteSeeds);
  }

  function getFavouriteSeedEntry(
    seed=activeTrackSeed,
    mode=trackSelectionMode,
    courseLength=activeCourseLength,
    obstacleFrequency=activeObstacleFrequency
  ) {
    const normalizedSeed = normalizeTrackSeed(seed);
    const normalizedMode = mode === 'seeded' ? 'seeded' : 'generated';
    const key = favouriteSeedKey(
      normalizedSeed,
      normalizedMode,
      courseLength,
      obstacleFrequency
    );
    return favouriteSeeds.find(entry =>
      favouriteSeedKey(
        entry.seed,
        entry.mode,
        entry.courseLength,
        entry.obstacleFrequency
      ) === key
    ) ?? null;
  }

  function currentSeedCanBeSaved() {
    return Boolean(
      activeTrackSeed &&
      (trackSelectionMode === 'generated' || trackSelectionMode === 'seeded')
    );
  }

  async function saveCurrentSeedAsFavourite() {
    if (!currentSeedCanBeSaved()) return null;

    const seed = normalizeTrackSeed(activeTrackSeed);
    const mode = trackSelectionMode === 'seeded' ? 'seeded' : 'generated';
    const recipe = getActiveTrackRecipe();
    const courseLength =
      mode === 'generated' ? activeCourseLength : 'standard';
    const obstacleFrequency =
      mode === 'generated' ? activeObstacleFrequency : 'balanced';
    const existing = getFavouriteSeedEntry(
      seed,
      mode,
      courseLength,
      obstacleFrequency
    );
    const now = Date.now();

    if (existing) {
      existing.courseLength = courseLength;
      existing.obstacleFrequency = obstacleFrequency;
      existing.recipeLabel = recipe.label;
      existing.lastUsedAt = now;
      favouriteSeeds = [
        existing,
        ...favouriteSeeds.filter(entry => entry !== existing),
      ];
      await persistFavouriteSeeds();
      return existing;
    }

    const entry = {
      seed,
      mode,
      courseLength,
      obstacleFrequency,
      name:seed,
      recipeLabel:recipe.label,
      savedAt:now,
      lastUsedAt:now,
    };
    favouriteSeeds = [entry,...favouriteSeeds].slice(0,MAX_FAVOURITE_SEEDS);
    await persistFavouriteSeeds();
    return entry;
  }

  async function renameFavouriteSeed(key) {
    const entry = favouriteSeeds.find(item =>
      favouriteSeedKey(item.seed,item.mode,item.courseLength,item.obstacleFrequency) === key
    );
    if (!entry) return;

    const nextName = globalThis.prompt?.(
      'Rename saved Marble Run seed:',
      entry.name
    );
    if (nextName === null || nextName === undefined) return;
    entry.name = normaliseFavouriteName(nextName,entry.seed);
    await persistFavouriteSeeds();
    favouriteSeedMenuOpen = true;
    if (phase === 'pick') buildPickScreen();
  }

  async function removeFavouriteSeed(key) {
    const entry = favouriteSeeds.find(item =>
      favouriteSeedKey(item.seed,item.mode,item.courseLength,item.obstacleFrequency) === key
    );
    if (!entry) return;

    const approved = globalThis.confirm
      ? globalThis.confirm(`Remove saved seed "${entry.name}"?`)
      : true;
    if (!approved) return;

    favouriteSeeds = favouriteSeeds.filter(item => item !== entry);
    await persistFavouriteSeeds();
    favouriteSeedMenuOpen = true;
    if (phase === 'pick') buildPickScreen();
  }

  function loadFavouriteSeed(key) {
    if (phase !== 'pick') return;
    const entry = favouriteSeeds.find(item =>
      favouriteSeedKey(item.seed,item.mode,item.courseLength,item.obstacleFrequency) === key
    );
    if (!entry) return;

    entry.lastUsedAt = Date.now();
    persistFavouriteSeeds();
    favouriteSeedMenuOpen = false;
    if (entry.mode === 'seeded') {
      applySeededTrackRecipe(entry.seed);
    } else {
      activeCourseLength = normalizeCourseLength(entry.courseLength);
      activeObstacleFrequency = normalizeObstacleFrequency(
        entry.obstacleFrequency
      );
      saveCourseGenerationControls();
      applyGeneratedTrackRecipe(entry.seed);
    }
  }

  function getFavouriteSeedsReport() {
    const issues = [];
    const seen = new Set();
    favouriteSeeds.forEach((entry,index) => {
      const seed = normalizeTrackSeed(entry.seed);
      const mode = entry.mode === 'seeded' ? 'seeded' : 'generated';
      const key = favouriteSeedKey(
        seed,
        mode,
        entry.courseLength,
        entry.obstacleFrequency
      );
      if (!seed) issues.push(`Saved entry ${index + 1} has no valid seed.`);
      if (seen.has(key)) issues.push(`Duplicate saved seed ${key}.`);
      seen.add(key);
      if (!entry.name) issues.push(`Saved seed ${seed} has no display name.`);
    });
    if (favouriteSeeds.length > MAX_FAVOURITE_SEEDS) {
      issues.push(`Saved seed count exceeds ${MAX_FAVOURITE_SEEDS}.`);
    }
    return {
      pass:issues.length === 0,
      issues,
      saved:favouriteSeeds.length,
      generated:favouriteSeeds.filter(entry => entry.mode === 'generated').length,
      profile:favouriteSeeds.filter(entry => entry.mode === 'seeded').length,
      limit:MAX_FAVOURITE_SEEDS,
    };
  }

  function buildFavouriteSeedsPanel() {
    const report = getFavouriteSeedsReport();
    const statusColor = report.pass ? '#00ffaa' : '#ff5566';
    const detail = report.pass
      ? `${report.saved} saved seed${report.saved === 1 ? '' : 's'} ready in the compact picker.`
      : report.issues.join(' · ');
    return `<div style="width:100%;padding:7px 8px;border:1px solid ${statusColor}55;border-radius:5px;background:rgba(0,30,45,0.5);font-size:9px;line-height:1.5;color:#9ab7c8;">
      <div style="color:${statusColor};font-weight:700;letter-spacing:.08em;">FAVOURITE SEEDS: ${report.pass ? 'PASS' : 'REVIEW'}</div>
      <div>${detail}</div>
      <div style="opacity:.75;">${report.generated} generated · ${report.profile} profile · maximum ${report.limit}</div>
    </div>`;
  }

  function buildFavouriteSeedMenu() {
    const entries = [...favouriteSeeds].sort((a,b) =>
      (b.lastUsedAt || b.savedAt) - (a.lastUsedAt || a.savedAt)
    );

    if (!entries.length) {
      return `<div style="padding:9px;color:#6f8b9e;font-size:9px;text-align:center;">
        No saved seeds yet. Complete a seeded race and select SAVE SEED.
      </div>`;
    }

    return entries.map(entry => {
      const key = favouriteSeedKey(
        entry.seed,
        entry.mode,
        entry.courseLength,
        entry.obstacleFrequency
      );
      const modeLabel = entry.mode === 'seeded' ? 'PROFILE' : 'COURSE';
      const settingsLabel = entry.mode === 'generated'
        ? ` · ${COURSE_LENGTH_PRESETS[entry.courseLength].label}/${OBSTACLE_FREQUENCY_PRESETS[entry.obstacleFrequency].label}`
        : '';
      return `<div class="mr-favourite-seed-row"
                   style="display:grid;grid-template-columns:minmax(0,1fr) 28px 28px;gap:3px;align-items:stretch;padding:3px;border-bottom:1px solid rgba(80,130,160,.18);">
        <button type="button" class="mr-favourite-load-btn" data-favourite-key="${escapeSeedUI(key)}"
                style="min-width:0;text-align:left;padding:4px 6px;background:rgba(0,35,55,.72);border:1px solid rgba(0,170,230,.2);border-radius:4px;color:#b9ddf2;font-family:var(--font);cursor:pointer;">
          <span style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px;font-weight:700;color:#8edfff;">${escapeSeedUI(entry.name)}</span>
          <span style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:8px;color:#6f91a6;">${modeLabel}${settingsLabel} · ${escapeSeedUI(entry.seed)}${entry.recipeLabel ? ` · ${escapeSeedUI(entry.recipeLabel)}` : ''}</span>
        </button>
        <button type="button" class="mr-favourite-rename-btn" data-favourite-key="${escapeSeedUI(key)}"
                title="Rename saved seed"
                style="background:#15222c;border:1px solid #31506a;border-radius:4px;color:#8edfff;font-family:var(--font);font-size:11px;cursor:pointer;">✎</button>
        <button type="button" class="mr-favourite-remove-btn" data-favourite-key="${escapeSeedUI(key)}"
                title="Remove saved seed"
                style="background:#25171d;border:1px solid #603344;border-radius:4px;color:#ff7799;font-family:var(--font);font-size:12px;cursor:pointer;">×</button>
      </div>`;
    }).join('');
  }

  async function loadStartAudit() {
    const saved = await Storage.load(START_AUDIT_KEY);
    startAudit = Array.isArray(saved) ? saved.slice(-START_AUDIT_LIMIT) : [];
  }

  function saveStartAudit() {
    startAudit = startAudit.slice(-START_AUDIT_LIMIT);
    Storage.saveLazy(START_AUDIT_KEY, startAudit);
  }

  async function clearStartAudit() {
    startAudit = [];
    await Storage.remove(START_AUDIT_KEY);
  }

  function getStartAuditSummary(recipeId=activeTrackRecipeId) {
    const samples = startAudit.filter(r =>
      r &&
      r.participants === 8 &&
      Array.isArray(r.slotResults) &&
      (
        r.recipeId === recipeId ||
        (!r.recipeId && recipeId === CLASSIC_TRACK_RECIPE.id)
      )
    );

    const slots = Array.from({length:8}, (_, index) => ({
      slot:index + 1,
      races:0,
      wins:0,
      rankTotal:0,
    }));

    samples.forEach(sample => {
      sample.slotResults.forEach(result => {
        const entry = slots[result.slot - 1];
        if (!entry) return;
        entry.races += 1;
        entry.rankTotal += result.rank;
        if (result.rank === 1) entry.wins += 1;
      });
    });

    return {
      samples:samples.length,
      slots:slots.map(entry => ({
        ...entry,
        avgRank:entry.races ? entry.rankTotal / entry.races : 0,
      })),
    };
  }

  function recordStartAudit() {
    if (
      currentAuditRecorded ||
      raceMode === 'duel' ||
      marbles.length !== 8 ||
      !positions.length
    ) {
      return;
    }

    const selectedMarble = marbles.find(m => m.id === selected);
    const selectedRank = positions.findIndex(m => m.id === selected) + 1;
    const winner = positions[0];

    startAudit.push({
      timestamp:Date.now(),
      mode:raceMode,
      recipeId:track?.recipe?.id ?? activeTrackRecipeId,
      selectionMode:trackSelectionMode,
      seed:['seeded','generated'].includes(trackSelectionMode) ? activeTrackSeed : '',
      participants:marbles.length,
      durationMs:Math.max(0, Math.round(performance.now() - raceStartedAt)),
      selectedId:selected,
      selectedSlot:selectedMarble?.startSlot ?? null,
      selectedRank,
      winnerId:winner?.id ?? null,
      winnerSlot:winner?.startSlot ?? null,
      dnfCount:positions.filter(m => m.dnf || m.retired || m.timedOut).length,
      slotResults:positions.map((m, index) => ({
        slot:m.startSlot,
        rank:index + 1,
        id:m.id,
        status:m.retired ? 'retired' : m.timedOut ? 'timeout' : m.dnf ? 'dnf' : 'finished',
      })),
    });

    currentAuditRecorded = true;
    saveStartAudit();
  }

  function applyTrackRecipeTuning(trackData,recipe) {
    const tuning = recipe.tuning ?? CLASSIC_TRACK_RECIPE.tuning;

    trackData.mixers.forEach(mixer => {
      mixer.orbitMinTurns *= tuning.orbitScale;
      mixer.orbitTurnRange *= tuning.orbitScale;
      mixer.angularSpeedMin *= tuning.angularSpeedScale;
      mixer.angularSpeedRange *= tuning.angularSpeedScale;
      mixer.releaseSpread *= tuning.releaseSpreadScale;
      mixer.releaseVxRange *= tuning.releaseSpreadScale;
      mixer.releaseVyMin *= tuning.releaseVelocityScale;
      mixer.releaseVyRange *= tuning.releaseVelocityScale;
      mixer.recipeProfile = tuning.id;
    });

    trackData.recipeTuning = {
      ...tuning,
      recipeId:recipe.id,
    };
  }

  /* ═══════════════════════════════════════════════════════════════════════
     TRACK ASSEMBLY — Roadmap 5.4 explicit fixed recipe
  ═══════════════════════════════════════════════════════════════════════ */
  function buildTrack(recipe=getActiveTrackRecipe()) {
    const compatibility = validateTrackRecipeCompatibility(recipe);
    if (!compatibility.pass) {
      throw new Error(`Incompatible Marble Run track recipe: ${compatibility.issues.join(' ')}`);
    }

    const assembly = assembleTrackRecipe(recipe);
    if (!assembly.pass) {
      throw new Error(`Invalid Marble Run track recipe: ${assembly.issues.join(' ')}`);
    }

    const sections = assembly.sections;
    const connections = createTrackSectionConnections(sections);
    const buildContext = createTrackBuildContext();

    sections.forEach((section,index) => {
      const builder = TRACK_SECTION_BUILDERS[section.builderKey];
      if (typeof builder !== 'function') {
        throw new Error(`Missing Marble Run section builder: ${section.builderKey}`);
      }
      buildContext.beginSection(section,index);
      builder(buildContext,section);
      buildContext.endSection();
    });

    const trackData = {
      segments:buildContext.segments,
      pegs:buildContext.pegs,
      boosts:buildContext.boosts,
      funnels:buildContext.funnels,
      loops:buildContext.loops,
      domes:buildContext.domes,
      mixers:buildContext.mixers,
      beams:buildContext.beams,
      gates:buildContext.gates,
      sectionBuilds:buildContext.sectionBuilds,
      sections,
      connections,
      assembly,
      compatibility,
      recipe:assembly.recipe,
    };
    applyTrackRecipeTuning(trackData,recipe);
    trackData.geometry = deriveTrackGeometry(trackData);
    trackData.validation = getTrackValidationReport(trackData);
    return trackData;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     DRAW — ported verbatim from MarbleRun.jsx, dimensions adjusted for W=400
  ═══════════════════════════════════════════════════════════════════════ */
  function draw(ctx, marblesArr, trackData, scrollY) {
    ctx.clearRect(0, 0, W, VH);

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, VH);
    bg.addColorStop(0, '#050818');
    bg.addColorStop(1, '#0a0f2e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, VH);

    // Grid
    ctx.strokeStyle = 'rgba(0,200,255,0.05)';
    ctx.lineWidth = 1;
    for (let x=0; x<W; x+=40)  { ctx.beginPath(); ctx.moveTo(x,0);   ctx.lineTo(x,VH); ctx.stroke(); }
    for (let y=0; y<VH; y+=40) { ctx.beginPath(); ctx.moveTo(0,y);   ctx.lineTo(W,y);  ctx.stroke(); }

    ctx.save();
    ctx.translate(0, -scrollY);

    const vis = y => y >= scrollY-50 && y <= scrollY+VH+50;

    // Boosts
    trackData.boosts.forEach(b => {
      if (!vis(b.y)) return;
      const hit = b.hitTime && (performance.now() - b.hitTime < 180);
      const grad = ctx.createLinearGradient(b.x, b.y, b.x+b.w, b.y+b.h);
      grad.addColorStop(0, hit ? 'rgba(150,255,220,0.95)' : 'rgba(0,255,150,0.7)');
      grad.addColorStop(1, hit ? 'rgba(150,230,255,0.95)' : 'rgba(0,200,255,0.7)');
      ctx.fillStyle = grad;
      ctx.shadowColor = '#00ffaa'; ctx.shadowBlur = hit ? 22 : 12;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.shadowBlur = 0;
      ctx.fillStyle = hit ? '#ffffff' : '#00ffcc';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('▶▶ BOOST', b.x+b.w/2, b.y+11);
    });

    // Segments
    const segColors = {
      wall:   'rgba(0,200,255,0.7)',
      ramp:   'rgba(100,180,255,0.6)',
      curve:  'rgba(0,255,200,0.6)',
      floor:  'rgba(0,180,255,0.5)',
      finish: 'rgba(255,220,0,0.9)',
      bounce: 'rgba(255,90,205,0.82)',
      gate:   'rgba(255,190,55,0.88)',
      tower:  'rgba(170,110,255,0.9)',
    };
    trackData.segments.forEach(seg => {
      if (!vis((seg.y1+seg.y2)/2)) return;
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.strokeStyle = segColors[seg.type] || 'rgba(0,200,255,0.6)';
      ctx.lineWidth   = seg.type === 'finish' ? 4 : 2.5;
      ctx.shadowColor = seg.type === 'finish' ? '#ffdd00' : '#00aaff';
      ctx.shadowBlur  = 8;
      ctx.stroke();
      ctx.shadowBlur  = 0;
    });

    // Pegs
    trackData.pegs.forEach(p => {
      if (!vis(p.y)) return;
      const hit = p.hitTime && (performance.now() - p.hitTime < 180);
      const bumper = p.kind === 'bumper';
      const baseRadius = p.radius ?? (p.big ? 7 : 5);
      const pr = baseRadius + (hit ? (bumper ? 4 : 3) : 0);
      ctx.beginPath();
      ctx.arc(p.x, p.y, pr, 0, Math.PI*2);
      ctx.fillStyle = hit ? '#ffffff' : bumper ? '#ff4fc8' : '#00ccff';
      ctx.strokeStyle = bumper ? (hit ? '#fff4aa' : '#ffcc44') : 'transparent';
      ctx.lineWidth = bumper ? 2.5 : 0;
      ctx.shadowColor = hit ? '#ffffff' : bumper ? '#ff55cc' : '#00aaff';
      ctx.shadowBlur = hit ? 24 : bumper ? 15 : 10;
      ctx.fill();
      if (bumper) ctx.stroke();
      ctx.shadowBlur = 0;
      if (bumper) {
        ctx.beginPath();
        ctx.arc(p.x,p.y,Math.max(3,baseRadius*0.38),0,Math.PI*2);
        ctx.fillStyle = hit ? '#ffdd66' : '#36104a';
        ctx.fill();
      }
    });

    // Funnels
    trackData.funnels.forEach(f => {
      if (!vis(f.y)) return;
      const hit = f.hitTime && (performance.now() - f.hitTime < 180);
      ctx.beginPath();
      ctx.moveTo(f.x-f.topW/2, f.y-f.h/2);
      ctx.lineTo(f.x-f.botW/2, f.y+f.h/2);
      ctx.lineTo(f.x+f.botW/2, f.y+f.h/2);
      ctx.lineTo(f.x+f.topW/2, f.y-f.h/2);
      ctx.closePath();
      ctx.fillStyle   = hit ? 'rgba(0,200,255,0.16)' : 'rgba(0,150,255,0.08)';
      ctx.strokeStyle = hit ? 'rgba(120,230,255,0.9)' : 'rgba(0,200,255,0.4)';
      ctx.lineWidth   = hit ? 2.5 : 1.5;
      if (hit) { ctx.shadowColor = '#00ddff'; ctx.shadowBlur = 14; }
      ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // Mandatory vortex pack mixers
    trackData.mixers.forEach(mx => {
      if (mx.visual === 'hidden') return;
      if (!vis(mx.cy)) return;
      const active = marblesArr.some(m => m.mixerState?.active && m.mixerState.mixerId === mx.id);
      const mixerStyle = mx.kind === 'mid'
        ? {
            idleFill:'rgba(50,40,210,0.22)',
            activeFill:'rgba(60,200,255,0.28)',
            idleStroke:'rgba(100,140,255,0.78)',
            activeStroke:'rgba(120,235,255,0.98)',
            glow:'#44ccff',
            ringRgb:'100,200,255',
            labelColor:'#88e8ff',
            edgeFill:'rgba(0,20,80,0.18)',
          }
        : mx.kind === 'late'
          ? {
              idleFill:'rgba(190,90,10,0.22)',
              activeFill:'rgba(255,220,70,0.3)',
              idleStroke:'rgba(255,150,50,0.82)',
              activeStroke:'rgba(255,245,140,1)',
              glow:'#ffbb22',
              ringRgb:'255,190,70',
              labelColor:'#ffdd77',
              edgeFill:'rgba(90,30,0,0.18)',
            }
          : {
              idleFill:'rgba(120,30,220,0.22)',
              activeFill:'rgba(255,80,210,0.28)',
              idleStroke:'rgba(190,80,255,0.72)',
              activeStroke:'rgba(255,120,230,0.95)',
              glow:'#ff55dd',
              ringRgb:'255,110,220',
              labelColor:'#ff99ee',
              edgeFill:'rgba(20,0,70,0.16)',
            };

      const {
        idleFill,
        activeFill,
        idleStroke,
        activeStroke,
        glow,
        ringRgb,
        labelColor,
        edgeFill,
      } = mixerStyle;

      const bowlGrad = ctx.createRadialGradient(mx.cx, mx.cy, mx.holeR, mx.cx, mx.cy, mx.rx);
      bowlGrad.addColorStop(0, 'rgba(0,0,0,0.9)');
      bowlGrad.addColorStop(0.18, active ? activeFill : idleFill);
      bowlGrad.addColorStop(1, edgeFill);

      ctx.beginPath();
      ctx.ellipse(mx.cx, mx.cy, mx.rx, mx.ry, 0, 0, Math.PI*2);
      ctx.fillStyle = bowlGrad;
      ctx.strokeStyle = active ? activeStroke : idleStroke;
      ctx.lineWidth = active ? 3 : 2;
      ctx.shadowColor = glow;
      ctx.shadowBlur = active ? 18 : 10;
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Concentric rings make the inward route and real centre hole obvious.
      for (const scale of [0.78, 0.56, 0.35]) {
        ctx.beginPath();
        ctx.ellipse(mx.cx, mx.cy, mx.rx*scale, mx.ry*scale, 0, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(${ringRgb},${0.18 + (1-scale)*0.25})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(mx.cx, mx.cy, mx.holeR, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(0,0,0,0.96)';
      ctx.strokeStyle = active ? '#ffffff' : labelColor;
      ctx.lineWidth = active ? 3 : 2;
      ctx.shadowColor = glow;
      ctx.shadowBlur = active ? 16 : 8;
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = labelColor;
      ctx.fillText(mx.label || 'PACK MIXER', mx.cx, mx.cy-mx.ry-10);
    });

    // Dome and centre-hole obstacles. Their hidden mixer cores handle
    // mandatory capture; these shells provide a clear interactive bowl visual.
    trackData.domes.forEach(d => {
      if (!vis(d.cy)) return;
      const hit = d.hitTime && (performance.now() - d.hitTime < 180);
      const orbit = d.kind === 'orbit';
      const spiral = d.kind === 'spiral';
      const fill = spiral
        ? (hit ? 'rgba(0,255,190,0.18)' : 'rgba(0,150,130,0.09)')
        : orbit
          ? (hit ? 'rgba(255,60,180,0.18)' : 'rgba(180,20,150,0.09)')
          : (hit ? 'rgba(130,60,255,0.17)' : 'rgba(90,20,220,0.08)');
      const stroke = spiral
        ? (hit ? 'rgba(190,255,235,1)' : 'rgba(55,255,200,0.78)')
        : orbit
          ? (hit ? 'rgba(255,190,235,1)' : 'rgba(255,90,200,0.72)')
          : (hit ? 'rgba(220,190,255,1)' : 'rgba(165,105,255,0.68)');
      const glow = spiral ? '#00ffbb' : orbit ? '#ff66cc' : '#aa77ff';
      ctx.beginPath();
      ctx.ellipse(d.cx, d.cy, d.rx, d.ry, 0, 0, Math.PI*2);
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = hit ? 3 : 2;
      if (hit) { ctx.shadowColor = glow; ctx.shadowBlur = 18; }
      ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;

      // Spiral Bowl draws its actual inward route; Dome variants retain
      // concentric guides toward their mandatory centre holes.
      if (spiral) {
        ctx.beginPath();
        for (let step=0; step<=72; step++) {
          const t = step / 72;
          const angle = t * Math.PI * 5.5;
          const scale = 0.92 - t * 0.72;
          const x = d.cx + Math.cos(angle) * d.rx * scale;
          const y = d.cy + Math.sin(angle) * d.ry * scale;
          if (step === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.strokeStyle = hit ? 'rgba(210,255,242,0.9)' : 'rgba(70,255,205,0.48)';
        ctx.lineWidth = hit ? 2.2 : 1.5;
        ctx.stroke();
      } else {
        [0.72,0.46].forEach(scale => {
          ctx.beginPath();
          ctx.ellipse(d.cx,d.cy,d.rx*scale,d.ry*scale,0,0,Math.PI*2);
          ctx.strokeStyle = orbit ? 'rgba(255,120,210,0.28)' : 'rgba(185,140,255,0.26)';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      }

      const holeR = d.holeR ?? 16;
      ctx.beginPath();
      ctx.arc(d.cx, d.cy, hit ? holeR + 3 : holeR, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(0,0,0,0.78)';
      ctx.strokeStyle = stroke;
      ctx.lineWidth = hit ? 3 : 2;
      if (hit) { ctx.shadowColor = glow; ctx.shadowBlur = 14; }
      ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = orbit ? '#ff9bdc' : '#c7a8ff';
      ctx.fillText(d.label ?? 'CENTRE HOLE',d.cx,d.cy-d.ry-8);
    });

    // Loops
    trackData.loops.forEach(l => {
      if (!vis(l.cy)) return;
      const hit = l.hitTime && (performance.now() - l.hitTime < 180);
      ctx.beginPath();
      ctx.arc(l.cx, l.cy, l.r, 0, Math.PI*2);
      ctx.fillStyle   = hit ? 'rgba(0,255,180,0.12)' : 'rgba(0,255,150,0.05)';
      ctx.strokeStyle = hit ? 'rgba(120,255,220,0.95)' : 'rgba(0,255,180,0.5)';
      ctx.lineWidth   = hit ? 3.5 : 2;
      if (hit) { ctx.shadowColor = '#33ffcc'; ctx.shadowBlur = 16; }
      ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // Live Balance Beam obstacles.
    trackData.beams.forEach(beam => {
      if (!vis(beam.cy)) return;
      const {x1,y1,x2,y2} = getBalanceBeamEndpoints(beam);
      const hit = beam.hitTime && (performance.now() - beam.hitTime < 180);
      ctx.beginPath();
      ctx.moveTo(x1,y1);
      ctx.lineTo(x2,y2);
      ctx.strokeStyle = hit ? 'rgba(255,245,170,1)' : 'rgba(255,190,70,0.88)';
      ctx.lineWidth = beam.thickness;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#ffbb33';
      ctx.shadowBlur = hit ? 18 : 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.lineCap = 'butt';

      ctx.beginPath();
      ctx.arc(beam.cx,beam.cy,12,0,Math.PI*2);
      ctx.fillStyle = 'rgba(20,25,45,0.95)';
      ctx.strokeStyle = hit ? '#fff4aa' : '#ffcc55';
      ctx.lineWidth = 3;
      ctx.fill(); ctx.stroke();

      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd477';
      ctx.fillText(beam.label ?? 'BALANCE BEAM',beam.cx,beam.cy-24);
    });

    // Live Split Gate obstacles.
    trackData.gates.forEach(gate => {
      const endpoints = getSplitGateEndpoints(gate);
      if (!vis((endpoints.y1+endpoints.y2)/2)) return;
      const hit = gate.hitTime && (performance.now() - gate.hitTime < 180);
      ctx.beginPath();
      ctx.moveTo(endpoints.x1,endpoints.y1);
      ctx.lineTo(endpoints.x2,endpoints.y2);
      ctx.strokeStyle = hit ? 'rgba(255,250,170,1)' : 'rgba(255,185,45,0.95)';
      ctx.lineWidth = gate.thickness;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#ffbb22';
      ctx.shadowBlur = hit ? 20 : 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.lineCap = 'butt';

      ctx.beginPath();
      ctx.arc(gate.cx,gate.cy,10,0,Math.PI*2);
      ctx.fillStyle = 'rgba(35,25,10,0.96)';
      ctx.strokeStyle = hit ? '#fff7aa' : '#ffcc44';
      ctx.lineWidth = 3;
      ctx.fill(); ctx.stroke();

      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd566';
      ctx.fillText(gate.label ?? 'SPLIT GATE',gate.cx,gate.cy-20);
    });

    // Finish label follows the generated finish segment.
    const finishSegment = trackData.segments.find(segment => segment.type === 'finish');
    const finishY = trackData.geometry?.finishY ?? finishSegment?.y1;
    if (isFiniteTrackNumber(finishY) && vis(finishY)) {
      const finishX = finishSegment
        ? (finishSegment.x1 + finishSegment.x2) / 2
        : W / 2;
      ctx.font        = 'bold 14px monospace';
      ctx.textAlign   = 'center';
      ctx.fillStyle   = '#ffdd00';
      ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 15;
      ctx.fillText('⚑  FINISH  ⚑', finishX, finishY - 10);
      ctx.shadowBlur  = 0;
    }

    // Trails + Marbles
    marblesArr.forEach(m => {
      if (!vis(m.y)) return;
      // trail
      if (m.trail) {
        m.trail.forEach((pt, ti) => {
          const alpha = (ti / m.trail.length) * 0.5;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, R*(ti/m.trail.length), 0, Math.PI*2);
          ctx.fillStyle = m.color + Math.floor(alpha*255).toString(16).padStart(2,'0');
          ctx.fill();
        });
      }
      // marble body
      const grad = ctx.createRadialGradient(m.x-3, m.y-3, 2, m.x, m.y, R);
      grad.addColorStop(0,   '#ffffff88');
      grad.addColorStop(0.4, m.color);
      grad.addColorStop(1,   '#00000088');
      ctx.beginPath();
      ctx.arc(m.x, m.y, R, 0, Math.PI*2);
      ctx.fillStyle   = grad;
      ctx.shadowColor = m.color; ctx.shadowBlur = 16;
      ctx.fill();
      ctx.shadowBlur  = 0;
      // Use the official live standings so queued finishers retain their
      // genuine first-to-last rank after being staged below the finish line.
      const officialRank = positions.findIndex(item => item.id === m.id);
      const rank = officialRank >= 0
        ? officialRank + 1
        : marblesArr.filter(o => o.y > m.y).length + 1;
      ctx.font      = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(rank, m.x, m.y - R - 3);

      if (m.stuck && !m.finished) {
        const pulse = 4 + Math.sin(performance.now() / 140) * 2;
        ctx.beginPath();
        ctx.arc(m.x, m.y, R + 7 + pulse, 0, Math.PI * 2);
        ctx.strokeStyle = '#ff3355';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ff0033';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = '#ff6680';
        ctx.fillText('STUCK', m.x, m.y + R + 18);
      }
    });

    ctx.restore();
  }


  /* ═══════════════════════════════════════════════════════════════════════
     FULL-COURSE MAP — Roadmap 6.7
  ═══════════════════════════════════════════════════════════════════════ */
  function getCourseMapTransform(trackData,width,height,padding=14) {
    const geometry = getTrackGeometry(trackData);
    const spanY = Math.max(1,geometry.courseEndY - geometry.courseStartY);
    const scaleX = (width - padding*2) / W;
    const scaleY = (height - padding*2) / spanY;
    return {
      geometry,
      scaleX,
      scaleY,
      x:value => padding + value*scaleX,
      y:value => padding + (value-geometry.courseStartY)*scaleY,
    };
  }

  function drawCourseMap(ctx,trackData,marblesArr=[],options={}) {
    if (!ctx || !trackData) return;
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const preview = Boolean(options.preview);
    const tf = getCourseMapTransform(trackData,width,height,preview ? 12 : 16);

    const bg = ctx.createLinearGradient(0,0,0,height);
    bg.addColorStop(0,'#050818');
    bg.addColorStop(1,'#0a0f2e');
    ctx.clearRect(0,0,width,height);
    ctx.fillStyle = bg;
    ctx.fillRect(0,0,width,height);

    ctx.strokeStyle = 'rgba(0,200,255,0.07)';
    ctx.lineWidth = 1;
    for (let x=20; x<width; x+=40) {
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,height); ctx.stroke();
    }
    for (let y=20; y<height; y+=40) {
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(width,y); ctx.stroke();
    }

    const segColors = {
      wall:'rgba(0,200,255,0.9)', ramp:'rgba(100,180,255,0.8)',
      curve:'rgba(0,255,200,0.8)', floor:'rgba(0,180,255,0.65)',
      finish:'rgba(255,220,0,1)', bounce:'rgba(255,90,205,0.9)',
      gate:'rgba(255,190,55,0.95)', tower:'rgba(180,120,255,0.95)',
    };
    trackData.segments.forEach(seg => {
      ctx.beginPath();
      ctx.moveTo(tf.x(seg.x1),tf.y(seg.y1));
      ctx.lineTo(tf.x(seg.x2),tf.y(seg.y2));
      ctx.strokeStyle = segColors[seg.type] ?? 'rgba(0,200,255,0.75)';
      ctx.lineWidth = seg.type === 'finish' ? 2.5 : 1.25;
      ctx.stroke();
    });

    trackData.boosts.forEach(boost => {
      ctx.fillStyle = 'rgba(0,255,170,0.75)';
      ctx.fillRect(
        tf.x(boost.x),tf.y(boost.y),
        Math.max(2,boost.w*tf.scaleX),Math.max(1.5,boost.h*tf.scaleY)
      );
    });

    trackData.funnels.forEach(funnel => {
      const top = funnel.y-funnel.h/2;
      const bottom = funnel.y+funnel.h/2;
      ctx.beginPath();
      ctx.moveTo(tf.x(funnel.x-funnel.topW/2),tf.y(top));
      ctx.lineTo(tf.x(funnel.x-funnel.botW/2),tf.y(bottom));
      ctx.lineTo(tf.x(funnel.x+funnel.botW/2),tf.y(bottom));
      ctx.lineTo(tf.x(funnel.x+funnel.topW/2),tf.y(top));
      ctx.closePath();
      ctx.fillStyle = 'rgba(0,150,255,0.12)';
      ctx.strokeStyle = 'rgba(0,210,255,0.75)';
      ctx.lineWidth = 1;
      ctx.fill(); ctx.stroke();
    });

    trackData.pegs.forEach(peg => {
      const bumper = peg.kind === 'bumper';
      const radius = bumper ? (preview ? 2.8 : 4) : peg.big ? 2.2 : 1.6;
      ctx.beginPath();
      ctx.arc(tf.x(peg.x),tf.y(peg.y),radius,0,Math.PI*2);
      ctx.fillStyle = bumper ? '#ff4fc8' : '#00ccff';
      ctx.fill();
      if (bumper) {
        ctx.strokeStyle = '#ffcc44';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    });

    trackData.loops.forEach(loop => {
      ctx.beginPath();
      ctx.ellipse(
        tf.x(loop.cx),tf.y(loop.cy),
        Math.max(3,loop.r*tf.scaleX),Math.max(2,loop.r*tf.scaleY),
        0,0,Math.PI*2
      );
      ctx.strokeStyle = 'rgba(0,255,180,0.85)';
      ctx.lineWidth = 1.25;
      ctx.stroke();
    });

    trackData.domes.forEach(dome => {
      const colour = dome.kind === 'spiral' ? '#00ffbb' : dome.kind === 'orbit' ? '#ff66cc' : '#aa77ff';
      ctx.beginPath();
      ctx.ellipse(
        tf.x(dome.cx),tf.y(dome.cy),
        Math.max(5,dome.rx*tf.scaleX),Math.max(3,dome.ry*tf.scaleY),
        0,0,Math.PI*2
      );
      ctx.fillStyle = `${colour}24`;
      ctx.strokeStyle = colour;
      ctx.lineWidth = 1.3;
      ctx.fill(); ctx.stroke();
      if (dome.kind === 'spiral') {
        ctx.beginPath();
        for (let step=0; step<=32; step++) {
          const t = step / 32;
          const angle = t * Math.PI * 4.5;
          const scale = 0.88 - t * 0.68;
          const x = tf.x(dome.cx + Math.cos(angle) * dome.rx * scale);
          const y = tf.y(dome.cy + Math.sin(angle) * dome.ry * scale);
          if (step === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.strokeStyle = colour;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(tf.x(dome.cx),tf.y(dome.cy),preview ? 2.2 : 3.2,0,Math.PI*2);
      ctx.fillStyle = '#02040a';
      ctx.strokeStyle = colour;
      ctx.lineWidth = 1;
      ctx.fill(); ctx.stroke();
    });

    trackData.mixers.forEach(mixer => {
      if (mixer.visual === 'hidden') return;
      const colour = mixer.kind === 'late' ? '#ffbb33' : mixer.kind === 'mid' ? '#66ccff' : '#bb66ff';
      ctx.beginPath();
      ctx.ellipse(
        tf.x(mixer.cx),tf.y(mixer.cy),
        Math.max(5,mixer.rx*tf.scaleX),Math.max(3,mixer.ry*tf.scaleY),
        0,0,Math.PI*2
      );
      ctx.fillStyle = `${colour}24`;
      ctx.strokeStyle = colour;
      ctx.lineWidth = 1.3;
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.arc(tf.x(mixer.cx),tf.y(mixer.cy),preview ? 2 : 3,0,Math.PI*2);
      ctx.fillStyle = '#02040a';
      ctx.fill();
    });

    trackData.beams.forEach(beam => {
      const {x1,y1,x2,y2} = getBalanceBeamEndpoints(beam);
      ctx.beginPath();
      ctx.moveTo(tf.x(x1),tf.y(y1));
      ctx.lineTo(tf.x(x2),tf.y(y2));
      ctx.strokeStyle = '#ffbf46';
      ctx.lineWidth = preview ? 2.2 : 3;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.arc(tf.x(beam.cx),tf.y(beam.cy),preview ? 1.8 : 2.6,0,Math.PI*2);
      ctx.fillStyle = '#ffdd77';
      ctx.fill();
    });

    trackData.gates.forEach(gate => {
      const endpoints = getSplitGateEndpoints(gate);
      ctx.beginPath();
      ctx.moveTo(tf.x(endpoints.x1),tf.y(endpoints.y1));
      ctx.lineTo(tf.x(endpoints.x2),tf.y(endpoints.y2));
      ctx.strokeStyle = '#ffbf38';
      ctx.lineWidth = preview ? 2.2 : 3;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.arc(tf.x(gate.cx),tf.y(gate.cy),preview ? 1.8 : 2.6,0,Math.PI*2);
      ctx.fillStyle = '#ffe37a';
      ctx.fill();
    });

    marblesArr.forEach(marble => {
      const mx = tf.x(marble.x);
      const my = tf.y(marble.y);
      const radius = marble.id === selected ? 5 : 3.5;
      ctx.beginPath();
      ctx.arc(mx,my,radius,0,Math.PI*2);
      ctx.fillStyle = marble.color;
      ctx.shadowColor = marble.color;
      ctx.shadowBlur = marble.id === selected ? 10 : 5;
      ctx.fill();
      ctx.shadowBlur = 0;
      if (marble.id === selected) {
        ctx.beginPath();
        ctx.arc(mx,my,radius+3,0,Math.PI*2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    ctx.font = preview ? 'bold 9px monospace' : 'bold 10px monospace';
    ctx.fillStyle = '#88dfff';
    ctx.textAlign = 'left';
    ctx.fillText('START',6,12);
    ctx.fillStyle = '#ffdd44';
    ctx.fillText(`FINISH ${Math.round(tf.geometry.finishY)}px`,6,height-6);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#8ba9bd';
    ctx.fillText(`${trackData.sections.length} SECTIONS`,width-6,12);
  }

  function getCameraPreviewReport(trackData=track) {
    const issues = [];
    const geometry = getTrackGeometry(trackData);
    if (!CAMERA_MODES.includes(cameraPreset)) issues.push('Stored camera preset is invalid.');
    if (!CAMERA_MODES.includes(cameraMode)) issues.push('Active race camera is invalid.');
    if (!trackData || !geometry.finishY || !geometry.courseEndY) issues.push('Track geometry is unavailable for preview.');
    if (PREVIEW_W > W || PREVIEW_W <= 0 || PREVIEW_H <= 0) issues.push('Preview canvas dimensions are invalid.');
    return {
      pass:issues.length === 0,
      issues,
      preset:cameraPreset,
      active:cameraMode,
      sections:trackData?.sections?.length ?? 0,
      finishY:geometry.finishY ?? 0,
      worldHeight:geometry.worldHeight ?? 0,
    };
  }

  function buildCameraPreviewPanel() {
    const report = getCameraPreviewReport();
    const statusColor = report.pass ? '#00ffaa' : '#ff5566';
    const detail = report.pass
      ? `Pick-screen preset ${report.preset.toUpperCase()} and full-course map are available.`
      : report.issues.join(' · ');
    return `<div style="width:100%;padding:7px 8px;border:1px solid ${statusColor}55;border-radius:5px;background:rgba(0,30,45,0.5);font-size:9px;line-height:1.5;color:#9ab7c8;">
      <div style="color:${statusColor};font-weight:700;letter-spacing:.08em;">CAMERA PREVIEW: ${report.pass ? 'PASS' : 'REVIEW'}</div>
      <div>${detail}</div>
      <div style="opacity:.75;">${report.sections} sections · finish ${report.finishY}px · world ${report.worldHeight}px</div>
    </div>`;
  }

  /* 
/* ═══════════════════════════════════════════════════════════════════════
     PHYSICS — Phase 4
  ═══════════════════════════════════════════════════════════════════════ */
  const GRAVITY   = PHYSICS_PROFILE.gravity;
  const MAX_VY    = PHYSICS_PROFILE.maxVy;
  const MAX_VX    = PHYSICS_PROFILE.maxVx;
  const BOUNCE    = PHYSICS_PROFILE.boundaryBounce;
  const WALL_RESTITUTION = PHYSICS_PROFILE.wallRestitution;
  const PEG_RESTITUTION  = PHYSICS_PROFILE.pegRestitution;
  const PEG_SIDE_KICK    = PHYSICS_PROFILE.pegSideKick;
  const MIN_ESCAPE_VY    = PHYSICS_PROFILE.minEscapeVy;
  const FRICTION  = PHYSICS_PROFILE.friction;
  const SUBSTEPS  = PHYSICS_PROFILE.substeps;

  function closestPointOnSegment(px,py,x1,y1,x2,y2){
    const dx=x2-x1, dy=y2-y1;
    const lenSq=dx*dx+dy*dy;
    let t = lenSq>0 ? ((px-x1)*dx+(py-y1)*dy)/lenSq : 0;
    t = Math.max(0, Math.min(1,t));
    return {x:x1+t*dx, y:y1+t*dy};
  }

  function resolveWallCollision(m,x1,y1,x2,y2,obj){
    const cp = closestPointOnSegment(m.x,m.y,x1,y1,x2,y2);
    let dx=m.x-cp.x, dy=m.y-cp.y;
    let dist=Math.hypot(dx,dy);
    if (dist>=R) return;

    // A perfectly centred contact has no usable normal. Give it a stable
    // sideways normal instead of leaving the marble embedded in the wall.
    if (dist<=0.001){
      const sx=x2-x1, sy=y2-y1;
      const sl=Math.hypot(sx,sy)||1;
      dx=-sy/sl; dy=sx/sl; dist=1;
    }

    const nx=dx/dist, ny=dy/dist;
    m.x += nx*(R-dist+0.35);
    m.y += ny*(R-dist+0.35);

    const normalSpeed=m.vx*nx+m.vy*ny;
    if (normalSpeed<0){
      m.vx -= (1+WALL_RESTITUTION)*normalSpeed*nx;
      m.vy -= (1+WALL_RESTITUTION)*normalSpeed*ny;
    }

    // Low-energy ramp contacts previously allowed marbles to balance in
    // place. A tiny tangent/down-track impulse keeps them rolling naturally.
    const tx=-ny, ty=nx;
    const tangentSpeed=m.vx*tx+m.vy*ty;
    if (Math.hypot(m.vx,m.vy)<1.15){
      const tangentDir=tangentSpeed===0 ? (Math.random()<0.5?-1:1) : Math.sign(tangentSpeed);
      m.vx += tx*0.45*tangentDir;
      m.vy += ty*0.45*tangentDir;
      m.vy=Math.max(m.vy,0.75);
    }

    if (obj) obj.hitTime = performance.now();
  }

  function getSplitGateEndpoints(gate) {
    const sin = Math.sin(gate.angle);
    const cos = Math.cos(gate.angle);
    return {
      x1:gate.cx,
      y1:gate.cy,
      x2:gate.cx + sin * gate.length,
      y2:gate.cy + cos * gate.length,
      sin,
      cos,
    };
  }

  function updateSplitGates() {
    (track?.gates ?? []).forEach(gate => {
      gate.switchCountdown -= 1;
      if (gate.switchCountdown <= 0) {
        // Alternate the preferred exit, with a small random interval so a
        // close pack can be divided rather than always following one lane.
        gate.direction = gate.direction >= 0 ? -1 : 1;
        gate.targetAngle = gate.direction * Math.max(0.3,Math.min(0.5,0.38 + Math.random()*0.1));
        gate.switchCountdown = gate.switchMinFrames + Math.floor(Math.random()*gate.switchFrameRange);
      }
      const springForce = (gate.targetAngle - gate.angle) * gate.spring;
      gate.angularVelocity = (gate.angularVelocity + springForce) * gate.damping;
      gate.angularVelocity = Math.max(
        -gate.maxAngularVelocity,
        Math.min(gate.maxAngularVelocity,gate.angularVelocity)
      );
      gate.angle += gate.angularVelocity;
      if (gate.angle < gate.minAngle) {
        gate.angle = gate.minAngle;
        gate.angularVelocity = Math.abs(gate.angularVelocity) * 0.2;
      } else if (gate.angle > gate.maxAngle) {
        gate.angle = gate.maxAngle;
        gate.angularVelocity = -Math.abs(gate.angularVelocity) * 0.2;
      }
    });
  }

  function resolveSplitGate(m,gate) {
    const endpoints = getSplitGateEndpoints(gate);
    const cp = closestPointOnSegment(m.x,m.y,endpoints.x1,endpoints.y1,endpoints.x2,endpoints.y2);
    let dx = m.x-cp.x;
    let dy = m.y-cp.y;
    let dist = Math.hypot(dx,dy);
    const minDist = R + gate.thickness/2;
    if (dist >= minDist) return false;

    if (dist <= 0.001) {
      dx = endpoints.cos;
      dy = -endpoints.sin;
      dist = 1;
    }
    const nx = dx/dist;
    const ny = dy/dist;
    m.x += nx*(minDist-dist+0.5);
    m.y += ny*(minDist-dist+0.5);

    const normalSpeed = m.vx*nx + m.vy*ny;
    if (normalSpeed < 0) {
      m.vx -= (1+gate.restitution)*normalSpeed*nx;
      m.vy -= (1+gate.restitution)*normalSpeed*ny;
    }

    const routeDirection = Math.sign(gate.targetAngle || gate.angle || gate.direction || 1);
    m.vx += routeDirection * gate.sidePush;
    m.vy = Math.max(m.vy,gate.downwardBias);
    m.vx = Math.max(-MAX_VX,Math.min(MAX_VX,m.vx));
    gate.hitTime = performance.now();
    return true;
  }

  function getBalanceBeamEndpoints(beam) {
    const half = beam.length / 2;
    const cos = Math.cos(beam.angle);
    const sin = Math.sin(beam.angle);
    return {
      x1:beam.cx-cos*half,
      y1:beam.cy-sin*half,
      x2:beam.cx+cos*half,
      y2:beam.cy+sin*half,
      cos,
      sin,
    };
  }

  function updateBalanceBeams() {
    (track?.beams ?? []).forEach(beam => {
      const springForce = (beam.restAngle - beam.angle) * beam.spring;
      beam.angularVelocity = (beam.angularVelocity + springForce) * beam.damping;
      beam.angularVelocity = Math.max(
        -beam.maxAngularVelocity,
        Math.min(beam.maxAngularVelocity,beam.angularVelocity)
      );
      beam.angle += beam.angularVelocity;
      if (beam.angle < beam.minAngle) {
        beam.angle = beam.minAngle;
        beam.angularVelocity = Math.abs(beam.angularVelocity) * 0.3;
      } else if (beam.angle > beam.maxAngle) {
        beam.angle = beam.maxAngle;
        beam.angularVelocity = -Math.abs(beam.angularVelocity) * 0.3;
      }
    });
  }

  function resolveBalanceBeam(m,beam) {
    const endpoints = getBalanceBeamEndpoints(beam);
    const cp = closestPointOnSegment(m.x,m.y,endpoints.x1,endpoints.y1,endpoints.x2,endpoints.y2);
    let dx = m.x-cp.x;
    let dy = m.y-cp.y;
    let dist = Math.hypot(dx,dy);
    const minDist = R + beam.thickness/2;
    if (dist >= minDist) return false;

    if (dist <= 0.001) {
      dx = -endpoints.sin;
      dy = endpoints.cos;
      dist = 1;
    }
    const nx = dx/dist;
    const ny = dy/dist;
    m.x += nx*(minDist-dist+0.4);
    m.y += ny*(minDist-dist+0.4);

    const lever = (cp.x-beam.cx)*endpoints.cos + (cp.y-beam.cy)*endpoints.sin;
    const pointVx = -endpoints.sin * lever * beam.angularVelocity;
    const pointVy = endpoints.cos * lever * beam.angularVelocity;
    const relativeNormal = (m.vx-pointVx)*nx + (m.vy-pointVy)*ny;
    if (relativeNormal < 0) {
      const impulse = -(1+beam.restitution)*relativeNormal;
      m.vx += impulse*nx;
      m.vy += impulse*ny;
      const appliedLoad = Math.min(12,Math.abs(relativeNormal)+Math.max(0,m.vy));
      beam.angularVelocity += Math.max(
        -0.02,
        Math.min(0.02,lever*appliedLoad*beam.torqueScale)
      );
    }

    // A tiny downhill nudge prevents a marble from balancing forever exactly
    // over the pivot while preserving the beam's load-driven direction.
    if (Math.hypot(m.vx,m.vy) < 1.1) {
      const downhill = Math.sin(beam.angle) >= 0 ? 1 : -1;
      m.vx += downhill*0.35;
      m.vy = Math.max(m.vy,0.9);
    }
    m.vx = Math.max(-MAX_VX,Math.min(MAX_VX,m.vx));
    beam.hitTime = performance.now();
    return true;
  }

  function resolveCircleObstacle(m,cx,cy,cr,obj){
    let dx=m.x-cx, dy=m.y-cy;
    let dist=Math.hypot(dx,dy);
    const minDist=cr+R;
    if (dist>=minDist) return;

    if (dist<=0.001){
      const angle=Math.random()*Math.PI*2;
      dx=Math.cos(angle); dy=Math.sin(angle); dist=1;
    }

    const nx=dx/dist, ny=dy/dist;
    m.x += nx*(minDist-dist+0.5);
    m.y += ny*(minDist-dist+0.5);

    const bumper = obj?.kind === 'bumper';
    const restitution = Number.isFinite(obj?.restitution) ? obj.restitution : PEG_RESTITUTION;
    const sideKick = Number.isFinite(obj?.sideKick) ? obj.sideKick : PEG_SIDE_KICK;
    const verticalKickScale = Number.isFinite(obj?.verticalKickScale) ? obj.verticalKickScale : 0.35;
    const normalSpeed=m.vx*nx+m.vy*ny;
    if (normalSpeed<0){
      m.vx -= (1+restitution)*normalSpeed*nx;
      m.vy -= (1+restitution)*normalSpeed*ny;
    }

    // Standard pegs retain the controlled downward escape response. Bounce
    // Chamber bumpers allow a short upward rebound, then add a small downward
    // bias so repeated impacts cannot suspend a marble indefinitely.
    const tx=-ny, ty=nx;
    const kick=(Math.random()<0.5?-1:1)*sideKick;
    m.vx += tx*kick;
    m.vy += ty*kick*verticalKickScale;
    if (bumper) {
      const upwardLimit = Number.isFinite(obj?.upwardVelocityLimit) ? obj.upwardVelocityLimit : -4;
      m.vy = Math.max(upwardLimit,m.vy);
      m.vy += Number.isFinite(obj?.downwardBias) ? obj.downwardBias : 0.25;
    } else {
      m.vy=Math.max(m.vy,MIN_ESCAPE_VY);
    }
    m.vx=Math.max(-MAX_VX,Math.min(MAX_VX,m.vx));

    if (obj) obj.hitTime = performance.now();
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

  function resolvePackMixer(m,mx){
    const state = m.mixerState;
    const linkedDome = mx.visual === 'hidden'
      ? track.domes.find(dome => dome.sectionId === mx.sectionId)
      : null;

    if (state?.active) {
      state.angle += state.direction * state.angularSpeed;
      state.remainingAngle -= state.angularSpeed;

      const orbitProgress = Math.min(1, 1 - state.remainingAngle / state.totalAngle);
      const radiusScale = Math.max(
        mx.holeR / Math.min(mx.rx, mx.ry),
        state.startRadius * (1 - orbitProgress * (mx.shrinkAmount ?? 0.88))
      );

      const oldX = m.x;
      const oldY = m.y;
      m.x = mx.cx + Math.cos(state.angle) * mx.rx * radiusScale;
      m.y = mx.cy + Math.sin(state.angle) * mx.ry * radiusScale;
      m.vx = m.x - oldX;
      m.vy = m.y - oldY;
      m.stuck = false;
      m.stuckChecks = 0;
      m.progressCheckFrames = 0;
      m.progressCheckY = m.y;
      mx.hitTime = performance.now();
      if (linkedDome) linkedDome.hitTime = mx.hitTime;

      m.trail.push({x:m.x, y:m.y});
      if (m.trail.length > 8) m.trail.shift();

      if (state.remainingAngle <= 0 || radiusScale <= 0.2) {
        m.mixerState = null;
        if (!Array.isArray(m.completedMixers)) m.completedMixers = [];
        if (!m.completedMixers.includes(mx.id)) m.completedMixers.push(mx.id);
        m.x = mx.cx + (Math.random()-0.5)*(mx.releaseSpread ?? 18);
        m.y = mx.releaseY;
        m.vx = (Math.random()-0.5)*(mx.releaseVxRange ?? 2.8);
        m.vy = (mx.releaseVyMin ?? 4.8) + Math.random()*(mx.releaseVyRange ?? 1.4);
        m.progressCheckY = m.y;
      }
      return true;
    }

    if (Array.isArray(m.completedMixers) && m.completedMixers.includes(mx.id)) return false;

    const top = mx.cy - mx.ry - R;
    const bottom = mx.cy + mx.ry;
    const withinX = Math.abs(m.x - mx.cx) <= (mx.captureHalfW ?? mx.rx + R);
    if (!withinX || m.y < top || m.y > bottom) return false;

    const normalizedX = (m.x - mx.cx) / mx.rx;
    const normalizedY = (m.y - mx.cy) / mx.ry;
    const startRadius = Math.max(0.72, Math.min(1, Math.hypot(normalizedX, normalizedY)));
    const angle = Math.atan2(normalizedY, normalizedX);
    const angularSpeed = (mx.angularSpeedMin ?? 0.075) + Math.random()*(mx.angularSpeedRange ?? 0.035);
    const totalAngle = Math.PI*2*((mx.orbitMinTurns ?? 0.9) + Math.random()*(mx.orbitTurnRange ?? 1.15));

    m.mixerState = {
      active:true,
      mixerId:mx.id,
      angle,
      direction:Math.random()<0.5 ? -1 : 1,
      angularSpeed,
      totalAngle,
      remainingAngle:totalAngle,
      startRadius,
    };

    // Update immediately so a fast marble cannot skip through the capture zone.
    return resolvePackMixer(m,mx);
  }

  function resolveDome(m,d){
    if (m.y<d.cy-d.ry-R || m.y>d.cy+d.ry+R) return;
    const u=(m.x-d.cx)/d.rx, v=(m.y-d.cy)/d.ry;
    const ellDist=Math.hypot(u,v);
    const rawDist=Math.hypot(m.x-d.cx, m.y-d.cy);
    if (ellDist<1 && rawDist>(d.holeR ?? 16)+R){
      m.vx += (d.cx-m.x)*0.0025;
      d.hitTime = performance.now();
    }
  }

  function clampPacingValue(value,minimum,maximum) {
    return Math.max(minimum,Math.min(maximum,value));
  }

  function getTrackPacingComplexity(trackData=track) {
    if (!trackData) return 0;

    const bumperCount = (trackData.pegs ?? []).filter(
      peg => peg.kind === 'bumper'
    ).length;
    const extraMixers = Math.max(0,(trackData.mixers?.length ?? 0) - 3);
    const extraLoops = Math.max(0,(trackData.loops?.length ?? 0) - 2);
    const advancedSections = Number.isFinite(
      trackData.recipe?.advancedObstacleCount
    )
      ? trackData.recipe.advancedObstacleCount
      : 0;

    return (
      advancedSections * 1.8 +
      (trackData.domes?.length ?? 0) * 2.5 +
      (trackData.beams?.length ?? 0) * 3.5 +
      (trackData.gates?.length ?? 0) * 3.5 +
      bumperCount * 0.5 +
      extraMixers * 2 +
      extraLoops * 0.8
    );
  }

  function getRacePacingProfile(trackData=track,rosterSize=marbles.length || 8) {
    const geometry = getTrackGeometry(trackData);
    const sectionCount = trackData?.sections?.length ?? 13;
    const finishY = geometry.finishY || 2400;
    const extraSections = sectionCount - 13;
    const complexity = getTrackPacingComplexity(trackData);

    // The original 13-section / 2400px course remains centred on 120 seconds.
    // Longer distance, extra sections and specialist obstacles add time.
    const distanceDeltaMs = ((finishY - 2400) / 28) * 1000;
    const sectionDeltaMs = extraSections * 3500;
    const complexityDeltaMs = complexity * 1000;
    const rosterDeltaMs = Math.max(0,rosterSize - 2) * 350;

    const timeoutMs = Math.round(clampPacingValue(
      BASE_RACE_TIMEOUT_MS +
        distanceDeltaMs +
        sectionDeltaMs +
        complexityDeltaMs +
        rosterDeltaMs,
      MIN_RACE_TIMEOUT_MS,
      MAX_RACE_TIMEOUT_MS
    ));

    const finishGraceMs = Math.round(clampPacingValue(
      BASE_FINISH_GRACE_MS +
        Math.max(0,extraSections) * 600 +
        complexity * 220,
      8000,
      MAX_FINISH_GRACE_MS
    ));

    const extensionMs = Math.round(clampPacingValue(
      MIN_PACE_EXTENSION_MS +
        Math.max(0,extraSections) * 1500 +
        complexity * 550,
      MIN_PACE_EXTENSION_MS,
      MAX_PACE_EXTENSION_MS
    ));

    const recentProgressWindowMs = Math.round(clampPacingValue(
      9000 + Math.max(0,extraSections) * 350,
      9000,
      18000
    ));

    const courseLength = trackData?.recipe?.courseLength;
    const label = trackData?.recipe?.showcase
      ? 'SHOWCASE'
      : courseLength === 'long'
        ? 'LONG'
        : courseLength === 'short'
          ? 'SHORT'
          : 'STANDARD';

    return Object.freeze({
      label,
      sectionCount,
      finishY,
      complexity,
      timeoutMs,
      finishGraceMs,
      extensionMs,
      recentProgressWindowMs,
      rosterSize,
      signature:[
        label,
        `S${sectionCount}`,
        `F${Math.round(finishY)}`,
        `C${complexity.toFixed(1)}`,
        `T${timeoutMs}`,
        `G${finishGraceMs}`,
        `E${extensionMs}`,
      ].join('|'),
    });
  }

  function getRaceTimeoutMs(trackData=track) {
    if (trackData === track && racePacingProfile) {
      return racePacingProfile.timeoutMs;
    }
    return getRacePacingProfile(trackData).timeoutMs;
  }

  function getFinishGraceMs(trackData=track) {
    if (trackData === track && racePacingProfile) {
      return racePacingProfile.finishGraceMs;
    }
    return getRacePacingProfile(trackData).finishGraceMs;
  }

  function formatRaceClock(milliseconds) {
    const seconds = Math.max(0,Math.ceil(milliseconds / 1000));
    const minutes = Math.floor(seconds / 60);
    const remaining = String(seconds % 60).padStart(2,'0');
    return `${minutes}:${remaining}`;
  }

  function initialiseRacePacing(now,raceTrack=track,rosterSize=marbles.length || 8) {
    racePacingProfile = getRacePacingProfile(raceTrack,rosterSize);
    raceBaseDeadlineAt = now + racePacingProfile.timeoutMs;
    raceDeadlineAt = raceBaseDeadlineAt;
    raceExtensionUsed = false;
    const geometry = getTrackGeometry(raceTrack);
    lastLeaderProgressY = geometry.courseStartY;
    lastLeaderProgressAt = now;
  }

  function resetRacePacing() {
    racePacingProfile = null;
    raceBaseDeadlineAt = 0;
    raceDeadlineAt = 0;
    raceExtensionUsed = false;
    lastLeaderProgressY = 0;
    lastLeaderProgressAt = 0;
  }

  function updateRacePacing(now,leader) {
    if (!racePacingProfile) {
      initialiseRacePacing(
        raceStartedAt || now,
        track,
        marbles.length || 8
      );
    }

    if (
      leader &&
      !leader.finished &&
      leader.y >= lastLeaderProgressY + PACE_PROGRESS_DELTA
    ) {
      lastLeaderProgressY = leader.y;
      lastLeaderProgressAt = now;
    }

    if (now < raceDeadlineAt) return false;

    const leaderStillRacing = Boolean(leader && !leader.finished);
    const progressIsRecent =
      now - lastLeaderProgressAt <=
      racePacingProfile.recentProgressWindowMs;

    // One reserve extension is granted only when the leading pack is still
    // moving. A genuinely stalled race still resolves at its deadline.
    if (!raceExtensionUsed && leaderStillRacing && progressIsRecent) {
      raceExtensionUsed = true;
      raceDeadlineAt = now + racePacingProfile.extensionMs;
      return false;
    }

    return true;
  }

  function getRaceTimeRemainingMs(now=performance.now()) {
    if (!raceDeadlineAt) return getRaceTimeoutMs();
    return Math.max(0,raceDeadlineAt - now);
  }

  function applyPhysics(m){
    if (m.finished) return;

    // Captured marbles are advanced by their active vortex rather than normal
    // gravity/collision physics until they drop through the centre hole.
    if (m.mixerState?.active) {
      const mx = track.mixers.find(item => item.id === m.mixerState.mixerId);
      if (mx && resolvePackMixer(m,mx)) return;
      m.mixerState = null;
    }

    m.vy = Math.min(m.vy+GRAVITY, MAX_VY);
    m.vx = Math.max(-MAX_VX, Math.min(MAX_VX, m.vx*FRICTION));
    m.x += m.vx;
    m.y += m.vy;

    if (m.x<R+20){ m.x=R+20; m.vx=Math.abs(m.vx)*BOUNCE; }
    if (m.x>W-R-20){ m.x=W-R-20; m.vx=-Math.abs(m.vx)*BOUNCE; }

    track.segments.forEach(seg=>{
      if (seg.type==='floor' || seg.type==='finish') return;
      resolveWallCollision(m, seg.x1, seg.y1, seg.x2, seg.y2);
    });

    // Every configured bowl is mandatory: a marble entering its capture zone is
    // mixed and released through the centre instead of passing behind it.
    if (track.mixers.some(mx => resolvePackMixer(m,mx))) return;

    track.beams.forEach(beam=>resolveBalanceBeam(m,beam));
    track.gates.forEach(gate=>resolveSplitGate(m,gate));
    track.pegs.forEach(p=>resolveCircleObstacle(m,p.x,p.y,p.radius ?? (p.big?7:5),p));
    track.boosts.forEach(b=>resolveBoost(m,b));
    track.funnels.forEach(f=>resolveFunnel(m,f));
    track.domes.forEach(d=>resolveDome(m,d));
    track.loops.forEach(l=>resolveCircleObstacle(m,l.cx,l.cy,l.r,l));

    m.trail.push({x:m.x, y:m.y});
    if (m.trail.length>8) m.trail.shift();

    // Detect lack of real downward progress rather than relying on velocity.
    // A marble wedged between pegs can still jitter with non-zero velocity,
    // which previously reset the stuck timer forever.
    m.progressCheckFrames += 1;
    if (m.progressCheckFrames >= PROGRESS_CHECK_FRAMES) {
      const downwardProgress = m.y - m.progressCheckY;
      if (downwardProgress < MIN_PROGRESS_PER_CHECK) m.stuckChecks += 1;
      else { m.stuckChecks = 0; m.stuck = false; }
      m.progressCheckFrames = 0;
      m.progressCheckY = m.y;
    }

    m.stuck = m.stuckChecks >= STUCK_WARN_CHECKS;
    if (m.stuckChecks >= STUCK_RECOVER_CHECKS) {
      m.recoveryAttempts += 1;
      m.stuckChecks = 0;
      m.stuck = false;

      if (m.recoveryAttempts <= MAX_RECOVERY_ATTEMPTS) {
        // Move clearly below the current obstacle cluster and relaunch with a
        // controlled downward impulse. This avoids landing on the same peg.
        m.y += 58;
        m.x = Math.max(R + 28, Math.min(W - R - 28, W / 2 + (Math.random() - 0.5) * 150));
        m.vx = (Math.random() - 0.5) * 3;
        m.vy = 5;
        m.progressCheckY = m.y;
      } else {
        m.finished = true;
        m.retired = true;
        m.finishTime = performance.now() + 100000 + m.id;
        m.vx = 0; m.vy = 0;
      }
    }

    const finishY = getTrackGeometry().finishY;
    if (!m.finished && m.y>=finishY){
      const now = performance.now();
      m.finished = true;
      m.crossedFinish = true;
      m.stuck = false;
      m.finishTime = now;
      m.vy = 0; m.vx = 0;

      // Move genuine finishers into a visible single-file queue. Their
      // finishTime remains unchanged and continues to determine standings.
      stageFinishedMarbles();

      if (!firstFinishAt) {
        firstFinishAt = now;
        // If somebody else wins, the selected marble has already lost.
        if (m.id !== selected) settleSelectedOutcome(false);
      }

      // If the selected marble is the first finisher, award immediately and
      // persist before the popup can be closed.
      if (m.id === selected && !wagerSettled) {
        const anyEarlierFinisher = marbles.some(o => o.id !== m.id && o.finished && o.finishTime < m.finishTime);
        settleSelectedOutcome(!anyEarlierFinisher);
      }
    }
  }

  function stageFinishedMarbles() {
    const finishY = getTrackGeometry().finishY;
    const finishedQueue = marbles
      .filter(marble => marble.crossedFinish)
      .sort((a,b) => a.finishTime - b.finishTime);

    const queueStartY = finishY + 28;
    const queueSpacing = R * 2 + 8;

    finishedQueue.forEach((marble,index) => {
      marble.x = W / 2;
      marble.y = queueStartY + index * queueSpacing;
      marble.vx = 0;
      marble.vy = 0;
      marble.trail = [];
    });
  }

  function computeStandings(){
    positions = marbles.slice().sort((a,b)=>{
      // Genuine finish-line crossings always outrank DNF/retired marbles.
      if (a.crossedFinish && b.crossedFinish) return a.finishTime-b.finishTime;
      if (a.crossedFinish) return -1;
      if (b.crossedFinish) return 1;

      // While the race is live, an active marble outranks one already retired.
      if (a.finished && b.finished) return a.finishTime-b.finishTime;
      if (a.finished) return 1;
      if (b.finished) return -1;
      return b.y-a.y;
    });
  }

  function settleSelectedOutcome(won) {
    if (wagerSettled) return;
    wagerSettled = true;
    selectedWon = won;
    if (won) {
      balance += wager * 3;
      // Save immediately, not lazily, so closing the popup cannot lose payout.
      Storage.save(BALANCE_KEY, balance);
    }
  }

  function settleFromCurrentStandings() {
    if (wagerSettled) return;
    computeStandings();
    settleSelectedOutcome(positions[0]?.id === selected);
  }

  function resolveFinishGrace() {
    computeStandings();
    const syntheticTime = performance.now();
    positions.forEach((m, index) => {
      if (!m.finished) {
        m.finished = true;
        m.dnf = true;
        m.stuck = false;
        m.finishTime = syntheticTime + 1000 + index;
        m.vx = 0;
        m.vy = 0;
      }
    });
    computeStandings();
  }

  function cameraTargetY() {
    const geometry = getTrackGeometry();
    if (cameraMode === 'overview') {
      const active = marbles.filter(m => !m.finished);
      if (!active.length) return Math.max(0,Math.min(geometry.cameraMaxY,geometry.finishY - VH));
      const minY = Math.min(...active.map(m => m.y));
      const maxY = Math.max(...active.map(m => m.y));
      return Math.max(
        0,
        Math.min(geometry.cameraMaxY,((minY + maxY) / 2) - VH / 2)
      );
    }
    const target = cameraMode === 'mine'
      ? marbles.find(m => m.id === selected)
      : positions[0];
    const y = target ? target.y : geometry.courseStartY;
    return Math.max(0,Math.min(geometry.cameraMaxY,y - VH * 0.4));
  }

  function resolveRaceTimeout() {
    timeoutResolved = true;
    computeStandings();
    let syntheticTime = performance.now();
    positions.forEach((m, index) => {
      if (!m.finished) {
        m.finished = true;
        m.timedOut = true;
        m.stuck = false;
        m.finishTime = syntheticTime + index;
        m.vx = 0; m.vy = 0;
      }
    });
    computeStandings();
  }

  function gameLoop(){
    if (phase!=='race' || raceResolved) return;
    for (let s=0; s<SUBSTEPS; s++) {
      updateBalanceBeams();
      updateSplitGates();
      marbles.forEach(applyPhysics);
    }
    computeStandings();

    const leader = positions[0];
    const geometry = getTrackGeometry();
    progress = leader && geometry.finishY > 0
      ? Math.min(100,(leader.y / geometry.finishY) * 100)
      : 0;
    const targetCam = cameraTargetY();
    camY += (targetCam-camY)*0.12;

    const raceCtx = canvasEl.getContext('2d');
    if (cameraMode === 'overview') drawCourseMap(raceCtx,track,marbles);
    else draw(raceCtx,marbles,track,camY);
    updateHUD();

    const now = performance.now();
    if (
      firstFinishAt &&
      now - firstFinishAt >= getFinishGraceMs()
    ) {
      resolveFinishGrace();
    }
    if (updateRacePacing(now,leader)) resolveRaceTimeout();
    if (marbles.every(m=>m.finished)){
      finishRace();
      return;
    }
    rafId = requestAnimationFrame(gameLoop);
  }

  function finishRace(){
    if (raceResolved) return;
    raceResolved = true;
    phase = 'result';
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    computeStandings();
    settleFromCurrentStandings();
    recordStartAudit();
    buildResultScreen();
  }

  /* ═══════════════════════════════════════════════════════════════════════
     RESULT SCREEN — Phase 5
  ═══════════════════════════════════════════════════════════════════════ */
  function buildResultScreen() {
    const sel  = MARBLES.find(m => m.id === selected);
    const rank = positions.findIndex(p => p.id === selected) + 1;
    const won  = wagerSettled ? selectedWon : rank === 1;
    const payout = won ? wager * 3 : 0;
    const selectedRunner = marbles.find(m => m.id === selected);
    const auditSummary = getStartAuditSummary();
    const auditPanel = raceMode !== 'duel'
      ? `<div style="width:100%;padding:7px 8px;border:1px solid rgba(0,200,255,0.25);border-radius:5px;background:rgba(0,30,60,0.45);font-size:9px;line-height:1.55;color:#88aacc;">
           <div style="color:#00ccff;font-weight:700;letter-spacing:.08em;">${track?.recipe?.shortLabel ?? getActiveTrackRecipe().shortLabel} RECIPE AUDIT</div>
           <div>This race: selected slot ${selectedRunner?.startSlot ?? '—'} → #${rank}; winner started slot ${positions[0]?.startSlot ?? '—'}.</div>
           <div>${auditSummary.samples} recorded 8-marble race${auditSummary.samples === 1 ? '' : 's'}.</div>
           <div>${auditSummary.samples
             ? auditSummary.slots.map(s => `S${s.slot}: ${s.wins}W / avg #${s.avgRank.toFixed(1)}`).join(' · ')
             : 'Run more Single or Tournament races to build a fairness sample.'}</div>
         </div>`
      : '';

    const inTourney   = raceMode === 'tournament';
    if (inTourney && won) tourneyWins += 1;
    const tourneyOver  = inTourney && tourneyRound >= TOURNAMENT_ROUNDS;
    const isChampion   = tourneyOver && tourneyWins > TOURNAMENT_ROUNDS / 2;

    const roundLabel = inTourney
      ? `<div class="mr-section-label">ROUND ${tourneyRound} / ${TOURNAMENT_ROUNDS} — WINS: ${tourneyWins}</div>`
      : '';

    const champBanner = tourneyOver
      ? `<div class="mr-result-banner" style="color:${isChampion ? '#ffcc00' : '#ff3366'};border-color:${isChampion ? '#ffcc00' : '#ff3366'};">
           ${isChampion ? '🏆 TOURNAMENT CHAMPION!' : `TOURNAMENT COMPLETE — ${tourneyWins}/${TOURNAMENT_ROUNDS}`}
         </div>`
      : '';

    const actionBtn = (inTourney && !tourneyOver)
      ? `<button class="mr-start-btn mr-play-again-btn mr-next-round-btn" style="margin:0;">▶ NEXT ROUND</button>`
      : `<button class="mr-start-btn mr-play-again-btn" style="margin:0;">▶ PLAY AGAIN</button>`;

    const savedFavourite = currentSeedCanBeSaved()
      ? getFavouriteSeedEntry(activeTrackSeed,trackSelectionMode)
      : null;
    const saveSeedBtn = currentSeedCanBeSaved()
      ? `<button type="button" class="mr-wager-btn mr-save-result-seed-btn"
                 style="width:100%;min-height:34px;border-color:${savedFavourite ? '#00aa77' : '#31506a'};color:${savedFavourite ? '#00ffaa' : '#8edfff'};">
           ${savedFavourite ? '✓ SEED SAVED' : '☆ SAVE SEED'}
         </button>`
      : '';

    paneEl.innerHTML = `
      <div class="mr-wrap mr-wrap-result">

        ${roundLabel}
        <div class="mr-result-banner" style="color:${won ? '#00ffaa' : '#ff3366'};border-color:${won ? '#00ffaa' : '#ff3366'};">
          ${won ? '🏆 YOU WIN!' : '✕ YOU LOSE'}
        </div>
        <div class="mr-result-sub" style="color:${sel.color};">
          ● ${sel.name.toUpperCase()} finished #${rank}
        </div>
        <div class="mr-result-payout" style="color:${won ? '#ffcc00' : '#ff6666'};">
          ${won ? `+${payout.toLocaleString()}` : `-${wager.toLocaleString()}`} credits
        </div>
        <div class="mr-balance">💎 ${balance.toLocaleString()} credits</div>
        ${champBanner}
        <div class="mr-section-label">
          COURSE: ${track?.recipe?.label ?? getActiveTrackRecipe().label}
          · ${track?.recipe?.tuning?.label ?? getActiveTrackRecipe().tuning.label}
          · ${trackSelectionMode === 'generated' ? `GENERATED ${activeTrackSeed}` : trackSelectionMode === 'seeded' ? `SEED ${activeTrackSeed}` : 'MANUAL'}
          · ${racePacingProfile?.label ?? 'STANDARD'} ${formatRaceClock(racePacingProfile?.timeoutMs ?? getRaceTimeoutMs())}
        </div>
        ${buildDeveloperChecksDrawer(auditPanel)}

        <div class="mr-section-label">FINAL STANDINGS</div>
        <div class="mr-standings">
          ${positions.map((p,i) => `
            <div class="mr-standing-row ${p.id === selected ? 'mr-standing-mine' : ''}"
                 style="${p.id === selected ? `border-color:${p.color};color:${p.color};` : ''}">
              <span class="mr-standing-rank">#${i+1}</span>
              <span class="mr-standing-name">● ${p.name}${p.retired ? ' (OUT)' : p.timedOut ? ' (TIME)' : p.dnf ? ' (DNF)' : ''}</span>
            </div>
          `).join('')}
        </div>

        <div class="mr-result-actions"
             style="display:grid;grid-template-columns:${currentSeedCanBeSaved() ? 'minmax(110px,.75fr) minmax(165px,1.25fr)' : '1fr'};gap:5px;width:100%;">
          ${saveSeedBtn}
          ${actionBtn}
        </div>
      </div>
    `;

    wireDeveloperChecksDrawer();

    const saveSeedResultBtn = paneEl.querySelector('.mr-save-result-seed-btn');
    if (saveSeedResultBtn) {
      saveSeedResultBtn.addEventListener('click', async () => {
        saveSeedResultBtn.disabled = true;
        const saved = await saveCurrentSeedAsFavourite();
        if (saved) {
          saveSeedResultBtn.textContent = '✓ SEED SAVED';
          saveSeedResultBtn.style.color = '#00ffaa';
          saveSeedResultBtn.style.borderColor = '#00aa77';
        } else {
          saveSeedResultBtn.textContent = 'NO SEED TO SAVE';
        }
      });
    }

    if (inTourney && !tourneyOver) {
      paneEl.querySelector('.mr-next-round-btn').addEventListener('click', launchRace);
    } else {
      paneEl.querySelector('.mr-play-again-btn').addEventListener('click', () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        raceResolved = false;
        timeoutResolved = false;
        raceStartedAt = 0;
        firstFinishAt = 0;
        resetRacePacing();
        wagerSettled = false;
        selectedWon = false;
        currentAuditRecorded = false;
        marbles = [];
        positions = [];
        progress = 0;
        camY = 0;
        phase = 'pick';
        selected = null;
        buildPickScreen();
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     RACE SCREEN
  ═══════════════════════════════════════════════════════════════════════ */
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

        <div class="mr-wager-row" style="margin-bottom:4px;">
          <button class="mr-wager-btn mr-camera-btn" data-camera="mine">MINE</button>
          <button class="mr-wager-btn mr-camera-btn" data-camera="leader">LEADER</button>
          <button class="mr-wager-btn mr-camera-btn" data-camera="overview">OVERVIEW</button>
        </div>

        <!-- Position chips -->
        <div class="mr-positions">
          ${marbles.map((m,i) => `
            <div class="mr-pos-chip ${m.id === selected ? 'mr-pos-mine' : ''}"
                 data-marble="${m.id}"
                 style="${m.id === selected
                   ? `background:${m.color}22;border-color:${m.color};color:${m.color};`
                   : ''}">
              #1 ${m.name}
            </div>
          `).join('')}
        </div>

        <!-- Canvas viewport -->
        <div class="mr-canvas-wrap">
          <canvas class="mr-canvas" width="${W}" height="${VH}"></canvas>
          <div class="mr-live-badge">LIVE · --:--</div>
        </div>

      </div>
    `;

    canvasEl = paneEl.querySelector('.mr-canvas');
    paneEl.querySelectorAll('.mr-camera-btn').forEach(btn => {
      btn.classList.toggle('mr-wager-active', btn.dataset.camera === cameraMode);
      btn.addEventListener('click', () => {
        setCameraPreference(btn.dataset.camera);
        paneEl.querySelectorAll('.mr-camera-btn').forEach(b =>
          b.classList.toggle('mr-wager-active', b.dataset.camera === cameraMode));
      });
    });

    // Draw static opening frame using the selected starting camera.
    const ctx = canvasEl.getContext('2d');
    if (cameraMode === 'overview') drawCourseMap(ctx,track,marbles);
    else draw(ctx,marbles,track,0);
  }

  function updateHUD() {
    const fill = paneEl.querySelector('.mr-progress-fill');
    const pct  = paneEl.querySelector('.mr-progress-pct');
    if (fill) fill.style.width = `${progress}%`;
    if (pct)  pct.textContent  = `${Math.round(progress)}%`;

    const liveBadge = paneEl.querySelector('.mr-live-badge');
    if (liveBadge) {
      const clockLabel = raceExtensionUsed ? 'EXT' : 'LIVE';
      liveBadge.textContent =
        `${clockLabel} · ${formatRaceClock(getRaceTimeRemainingMs())}`;
    }

    // Update position chips
    positions.forEach((p, i) => {
      const chip = paneEl.querySelector(`.mr-pos-chip[data-marble="${p.id}"]`);
      if (chip) {
        const warning = p.stuck ? ' ⚠' : '';
        const status = p.retired ? ' OUT' : p.timedOut ? ' TIME' : p.dnf ? ' DNF' : '';
        chip.textContent = `#${i+1} ${p.name}${warning}${status}`;
      }
    });
  }

  /* ── startRace — transitions pick → race, spawns static marbles ──────── */
 function startRace() {
    if (selected === null || balance < wager) return;

    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    track = buildTrack(getActiveTrackRecipe());
    raceResolved = false;
    timeoutResolved = false;
    firstFinishAt = 0;
    wagerSettled = false;
    selectedWon = false;
    currentAuditRecorded = false;
    raceStartedAt = performance.now();

    if (raceMode === 'tournament') tourneyRound += 1;

    balance -= wager;
    saveBalance();

    let roster = [...MARBLES];
    if (raceMode === 'duel') {
      const opponents = MARBLES.filter(m => m.id !== selected);
      const opponent = opponents[Math.floor(Math.random() * opponents.length)];
      roster = [MARBLES.find(m => m.id === selected), opponent];
    }

    // Shuffle which colour receives each physical start slot. The selected
    // marble therefore no longer starts in the same lane every race.
    for (let i=roster.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [roster[i],roster[j]]=[roster[j],roster[i]];
    }

    // Balanced launch layout V2.
    // The previous two-row grid gave the lower-right slots a large head start
    // and a favourable approach angle. All eight marbles now launch from the
    // same vertical line, with mirrored centre-seeking velocity so edge slots
    // do not receive a permanent left/right advantage.
    const startOffsets = [-49,-35,-21,-7,7,21,35,49];
    const startSlots = roster.length===2
      ? [{x:W/2-24,y:62},{x:W/2+24,y:62}]
      : startOffsets.map(offset => ({x:W/2+offset,y:64}));

    marbles = roster.map((cfg, i) => {
      const slot = startSlots[i];
      const offsetFromCentre = slot.x - W/2;
      const centreSeekingVx = roster.length===2
        ? (Math.random()-0.5)*1.2
        : -offsetFromCentre*0.025 + (Math.random()-0.5)*0.35;

      return {
      ...cfg,
      startSlot:i + 1,
      x: slot.x,
      y: slot.y + (Math.random()-0.5)*0.8,
      vx: centreSeekingVx,
      vy: 0.35+Math.random()*0.12,
      finished: false,
      crossedFinish: false,
      finishTime: null,
      trail: [],
      stuckFrames: 0,
      stuck: false,
      progressCheckFrames: 0,
      progressCheckY: slot.y,
      stuckChecks: 0,
      recoveryAttempts: 0,
      retired: false,
      timedOut: false,
      completedMixers: [],
      mixerState: null,
      };
    });

    initialiseRacePacing(
      raceStartedAt,
      track,
      marbles.length
    );

    camY = 0;
    cameraMode = cameraPreset;
    progress = 0;
    positions = marbles.slice();

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

  function renderMarbles() {
    MARBLES.forEach(m => {
      const card = paneEl.querySelector(`.mr-marble-card[data-id="${m.id}"]`);
      if (!card) return;
      const on = selected === m.id;
      card.style.borderColor = on ? m.color            : 'rgba(0,150,255,0.2)';
      card.style.boxShadow   = on ? `0 0 18px ${m.color}88` : 'none';
      card.style.background  = on
        ? `radial-gradient(circle,${m.color}33,${m.color}11)`
        : 'rgba(0,30,60,0.6)';
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

  function renderTrackRecipe() {
    const activeRecipe = getActiveTrackRecipe();

    paneEl.querySelectorAll('.mr-recipe-btn').forEach(btn => {
      btn.classList.toggle('mr-wager-active', trackSelectionMode !== 'generated' && btn.dataset.recipe === activeRecipe.id);
    });

    const seedButton = paneEl.querySelector('.mr-seed-apply-btn');
    if (seedButton) {
      seedButton.classList.toggle('mr-wager-active', trackSelectionMode === 'seeded');
    }

    const manualButton = paneEl.querySelector('.mr-manual-mode-btn');
    if (manualButton) {
      manualButton.classList.toggle('mr-wager-active', trackSelectionMode === 'manual');
    }


    const generatedButton = paneEl.querySelector('.mr-generate-course-btn');
    if (generatedButton) {
      generatedButton.classList.toggle('mr-wager-active', trackSelectionMode === 'generated');
    }

    const seedInput = paneEl.querySelector('.mr-seed-input');
    if (seedInput && document.activeElement !== seedInput) {
      seedInput.value = activeTrackSeed;
    }

    const note = paneEl.querySelector('.mr-recipe-note');
    if (note) {
      note.textContent = trackSelectionMode === 'generated'
        ? `GENERATED ${activeTrackSeed} · ${COURSE_LENGTH_PRESETS[activeCourseLength].label}/${OBSTACLE_FREQUENCY_PRESETS[activeObstacleFrequency].label} → ${activeRecipe.label}: ${activeRecipe.description}`
        : trackSelectionMode === 'seeded'
          ? `SEED ${activeTrackSeed} → ${activeRecipe.label}: ${activeRecipe.description}`
          : `MANUAL → ${activeRecipe.label}: ${activeRecipe.description}`;
    }
  }

  function rebuildSelectedTrack(recipe) {
    track = buildTrack(recipe);
    const validation = getTrackValidationReport(track);
    if (!validation.pass) {
      console.warn('[Marble Run] Selected recipe needs review:', validation.issues);
    }
  }

  function selectTrackRecipe(recipeId) {
    if (phase !== 'pick') return;

    const recipe = getTrackRecipeById(recipeId);
    activeGeneratedRecipe = null;
    activeTrackRecipeId = recipe.id;
    trackSelectionMode = 'manual';
    activeGeneratedRecipe = null;
    saveTrackRecipeSelection();
    rebuildSelectedTrack(recipe);
    buildPickScreen();
  }

  function applySeededTrackRecipe(rawSeed) {
    if (phase !== 'pick') return;

    const normalizedSeed = normalizeTrackSeed(rawSeed);
    const status = paneEl.querySelector('.mr-seed-status');
    if (!normalizedSeed) {
      if (status) status.textContent = 'Enter a seed using letters, numbers, - or _.';
      return;
    }

    activeTrackSeed = normalizedSeed;
    activeGeneratedRecipe = null;
    trackSelectionMode = 'seeded';
    const recipe = getTrackRecipeForSeed(activeTrackSeed);
    activeTrackRecipeId = recipe.id;
    saveTrackRecipeSelection();
    rebuildSelectedTrack(recipe);
    buildPickScreen();
  }

  function applyGeneratedTrackRecipe(rawSeed) {
    if (phase !== 'pick') return;

    const enteredSeed = normalizeTrackSeed(rawSeed);
    const normalizedSeed = enteredSeed || createRandomTrackSeed();

    activeTrackSeed = normalizedSeed;
    trackSelectionMode = 'generated';
    activeGeneratedRecipe = generateControlledTrackRecipe(activeTrackSeed);
    activeTrackRecipeId = activeGeneratedRecipe.id;
    saveTrackRecipeSelection();
    rebuildSelectedTrack(activeGeneratedRecipe);
    buildPickScreen();
  }

  function returnToManualTrackSelection() {
    if (phase !== 'pick') return;
    trackSelectionMode = 'manual';
    saveTrackRecipeSelection();
    rebuildSelectedTrack(getActiveTrackRecipe());
    buildPickScreen();
  }

  function renderMode() {
    paneEl.querySelectorAll('.mr-mode-btn').forEach(btn => {
      btn.classList.toggle('mr-wager-active', btn.dataset.mode === raceMode);
    });
  }

  function renderStartBtn() {
    const btn = paneEl.querySelector('.mr-start-btn');
    if (!btn) return;
    const canStart = selected !== null && balance >= wager;
    btn.disabled = !canStart;
    btn.classList.toggle('mr-start-ready', canStart);
    btn.textContent = selected === null
      ? '— PICK A MARBLE —'
      : balance < wager
        ? '— INSUFFICIENT CREDITS —'
        : '▶  START RACE';
  }


  function renderCameraPreset() {
    paneEl?.querySelectorAll('.mr-camera-preset-btn').forEach(btn => {
      btn.classList.toggle('mr-wager-active',btn.dataset.cameraPreset === cameraPreset);
    });
  }

  function drawPickTrackPreview() {
    const canvas = paneEl?.querySelector('.mr-track-preview');
    if (!canvas || !trackPreviewOpen) return;
    drawCourseMap(canvas.getContext('2d'),track,[],{preview:true});
  }

  function wirePickTrackPreview() {
    const toggle = paneEl?.querySelector('.mr-track-preview-toggle');
    const body = paneEl?.querySelector('.mr-track-preview-body');
    const icon = paneEl?.querySelector('.mr-track-preview-icon');
    if (!toggle || !body) return;
    toggle.addEventListener('click',() => {
      trackPreviewOpen = !trackPreviewOpen;
      body.style.display = trackPreviewOpen ? 'block' : 'none';
      toggle.setAttribute('aria-expanded',String(trackPreviewOpen));
      if (icon) icon.textContent = trackPreviewOpen ? '▲' : '▼';
      drawPickTrackPreview();
    });
    drawPickTrackPreview();
  }

  function buildPickScreen() {
    tourneyRound = 0;
    tourneyWins  = 0;
    const activeRecipe = getActiveTrackRecipe();
    const setupNote = trackSelectionMode === 'generated'
      ? `GENERATED ${activeTrackSeed} · ${COURSE_LENGTH_PRESETS[activeCourseLength].label}/${OBSTACLE_FREQUENCY_PRESETS[activeObstacleFrequency].label} → ${activeRecipe.label}: ${activeRecipe.description}`
      : trackSelectionMode === 'seeded'
        ? `PROFILE ${activeTrackSeed} → ${activeRecipe.label}: ${activeRecipe.description}`
        : `MANUAL → ${activeRecipe.label}: ${activeRecipe.description}`;

    paneEl.innerHTML = `
      <div class="mr-wrap" style="gap:5px;">
        <div class="mr-header"
             style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;width:100%;">
          <div style="min-width:0;">
            <div class="mr-title" style="text-align:left;">MARBLE RUN</div>
            <div class="mr-subtitle" style="text-align:left;">HOLOGRAPHIC RACING LEAGUE</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;">
            <div class="mr-balance">💎 ${balance.toLocaleString()} credits</div>
            <button class="mr-claim-btn"
                    style="padding:2px 8px;background:#1a2a1a;border:1px solid var(--green);color:var(--green);font-family:var(--font);font-size:9px;border-radius:4px;cursor:pointer;">+500 TEST</button>
          </div>
        </div>

        <div class="mr-course-control-panel"
             style="width:100%;padding:6px;background:rgba(0,25,42,.55);border:1px solid rgba(0,160,220,.22);border-radius:6px;">
          <div style="display:grid;grid-template-columns:minmax(0,1fr) 1px minmax(0,1fr);gap:6px;align-items:end;">
            <div style="min-width:0;">
              <div class="mr-section-label" style="margin-bottom:3px;">PROFILE</div>
              <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:3px;">
                ${TRACK_RECIPE_VARIANTS.map(recipe => `
                  <button class="mr-wager-btn mr-recipe-btn" data-recipe="${recipe.id}"
                          style="min-width:0;padding:4px 2px;font-size:9px;">
                    ${recipe.shortLabel}
                  </button>
                `).join('')}
              </div>
            </div>
            <div aria-hidden="true" style="height:38px;background:rgba(100,160,190,.3);"></div>
            <div style="min-width:0;">
              <div class="mr-section-label" style="margin-bottom:3px;">START CAMERA</div>
              <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:3px;">
                <button class="mr-wager-btn mr-camera-preset-btn" data-camera-preset="mine" style="min-width:0;padding:4px 2px;font-size:9px;">MINE</button>
                <button class="mr-wager-btn mr-camera-preset-btn" data-camera-preset="leader" style="min-width:0;padding:4px 2px;font-size:9px;">LEADER</button>
                <button class="mr-wager-btn mr-camera-preset-btn" data-camera-preset="overview" style="min-width:0;padding:4px 2px;font-size:9px;">OVERVIEW</button>
              </div>
            </div>
          </div>

          <div class="mr-seed-combo" style="position:relative;margin-top:6px;width:100%;">
            <div style="display:grid;grid-template-columns:minmax(0,1fr) 30px;gap:3px;">
              <input class="mr-seed-input" maxlength="32" value="${escapeSeedUI(activeTrackSeed)}"
                     placeholder="COURSE SEED · BLANK = RANDOM"
                     style="min-width:0;width:100%;padding:5px 7px;background:#07131d;border:1px solid #31506a;border-radius:4px;color:#b9ddf2;font-family:var(--font);font-size:10px;outline:none;" />
              <button type="button" class="mr-favourite-seed-toggle"
                      aria-expanded="${favouriteSeedMenuOpen}"
                      title="Open saved seeds"
                      style="background:#102331;border:1px solid #31506a;border-radius:4px;color:#8edfff;font-family:var(--font);font-size:12px;cursor:pointer;">
                ${favouriteSeedMenuOpen ? '▲' : '▼'}
              </button>
            </div>
            <div class="mr-favourite-seed-menu"
                 style="display:${favouriteSeedMenuOpen ? 'block' : 'none'};position:absolute;z-index:60;top:31px;left:0;right:0;max-height:190px;overflow:auto;background:#07131d;border:1px solid #31506a;border-radius:5px;box-shadow:0 10px 24px rgba(0,0,0,.65);">
              ${buildFavouriteSeedMenu()}
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:3px;margin-top:4px;">
            <button class="mr-wager-btn mr-seed-apply-btn" style="min-width:0;padding:4px 2px;font-size:9px;">PROFILE SEED</button>
            <button class="mr-wager-btn mr-generate-course-btn" style="min-width:0;padding:4px 2px;font-size:9px;">GENERATE</button>
            <button class="mr-wager-btn mr-manual-mode-btn" style="min-width:0;padding:4px 2px;font-size:9px;">MANUAL</button>
          </div>

          <div class="mr-generation-controls"
               style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px;margin-top:4px;">
            <label style="display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px;align-items:center;color:#6f91a6;font-size:8px;">
              <span>LENGTH</span>
              <select class="mr-course-length-select"
                      style="min-width:0;width:100%;padding:3px 4px;background:#0b1822;border:1px solid #31506a;border-radius:4px;color:#8edfff;font-family:var(--font);font-size:9px;">
                ${Object.values(COURSE_LENGTH_PRESETS).map(option => `
                  <option value="${option.id}" ${option.id === activeCourseLength ? 'selected' : ''}>${option.label}</option>
                `).join('')}
              </select>
            </label>
            <label style="display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px;align-items:center;color:#6f91a6;font-size:8px;">
              <span>OBSTACLES</span>
              <select class="mr-obstacle-frequency-select"
                      style="min-width:0;width:100%;padding:3px 4px;background:#0b1822;border:1px solid #31506a;border-radius:4px;color:#8edfff;font-family:var(--font);font-size:9px;">
                ${Object.values(OBSTACLE_FREQUENCY_PRESETS).map(option => `
                  <option value="${option.id}" ${option.id === activeObstacleFrequency ? 'selected' : ''}>${option.label}</option>
                `).join('')}
              </select>
            </label>
          </div>

          <div class="mr-seed-status game-hint" style="display:none;"></div>
          <div class="mr-recipe-note game-hint"
               title="${escapeSeedUI(setupNote)}"
               style="margin-top:4px;min-height:11px;width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;">
            ${escapeSeedUI(setupNote)}
          </div>
        </div>

        <div class="mr-track-preview-shell" style="width:100%;">
          <button type="button" class="mr-track-preview-toggle" aria-expanded="${trackPreviewOpen}"
                  style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:5px 8px;background:rgba(0,30,60,0.5);border:1px solid rgba(0,200,255,0.35);border-radius:5px;color:#8edfff;font-family:var(--font);font-size:9px;font-weight:700;letter-spacing:.07em;cursor:pointer;">
            <span>COURSE PREVIEW · ${track.sections.length} SECTIONS · FINISH ${Math.round(getTrackGeometry().finishY)}px</span>
            <span class="mr-track-preview-icon">${trackPreviewOpen ? '▲' : '▼'}</span>
          </button>
          <div class="mr-track-preview-body" style="display:${trackPreviewOpen ? 'block' : 'none'};margin-top:5px;">
            <canvas class="mr-track-preview" width="${PREVIEW_W}" height="${PREVIEW_H}"
                    style="display:block;width:100%;height:auto;border:1px solid rgba(0,180,255,.3);border-radius:5px;background:#050818;"></canvas>
            <div class="game-hint">${activeRecipe.label} · ${activeRecipe.tuning.label} · ${trackSelectionMode.toUpperCase()}${trackSelectionMode === 'generated' && !activeRecipe.showcase ? ` · ${COURSE_LENGTH_PRESETS[activeCourseLength].label}/${OBSTACLE_FREQUENCY_PRESETS[activeObstacleFrequency].label}` : ''}</div>
          </div>
        </div>
        ${buildDeveloperChecksDrawer(`
          <div style="width:100%;padding:7px 8px;border:1px solid rgba(0,200,255,0.25);border-radius:5px;background:rgba(0,30,60,0.45);font-size:9px;line-height:1.55;color:#88aacc;">
            <div style="color:#00ccff;font-weight:700;letter-spacing:.08em;">${activeRecipe.shortLabel} RECIPE AUDIT</div>
            <div class="mr-audit-pick-summary">${getStartAuditSummary().samples
              ? `${getStartAuditSummary().samples} recorded 8-marble race${getStartAuditSummary().samples === 1 ? '' : 's'}`
              : 'No 8-marble races recorded yet'}</div>
            <button class="mr-audit-clear-btn" style="margin-top:4px;padding:2px 8px;background:transparent;border:1px solid #334455;color:#88aacc;font-family:var(--font);font-size:9px;border-radius:4px;cursor:pointer;">RESET MIXER AUDIT</button>
          </div>
        `)}
        <div class="mr-section-label">RACE MODE</div>
        <div class="mr-wager-row">
          <button class="mr-wager-btn mr-mode-btn" data-mode="single">SINGLE RACE</button>
          <button class="mr-wager-btn mr-mode-btn" data-mode="duel">1v1 DUEL</button>
          <button class="mr-wager-btn mr-mode-btn" data-mode="tournament">TOURNAMENT (BO3)</button>
        </div>
        <div class="mr-section-label">SELECT YOUR MARBLE</div>
        <div class="mr-marble-grid">
          ${MARBLES.map(m => `
            <div class="mr-marble-card" data-id="${m.id}" style="border-color:rgba(0,150,255,0.2);">
              <div class="mr-marble-ball"
                   style="background:radial-gradient(circle at 35% 35%,#fff8,${m.color},#0008);
                          box-shadow:0 0 12px ${m.color};"></div>
              <div class="mr-marble-name" style="color:#88aacc;">${m.name.toUpperCase()}</div>
            </div>
          `).join('')}
        </div>
        <div class="mr-wager-box">
          <div class="mr-section-label">WAGER <span class="mr-wager-note">(3× on win)</span></div>
          <div class="mr-wager-row">
            ${WAGER_OPTIONS.map(v => `
              <button class="mr-wager-btn" data-wager="${v}">${v}</button>
            `).join('')}
          </div>
        </div>
        <button class="mr-start-btn" disabled>— PICK A MARBLE —</button>
      </div>
    `;

    wireDeveloperChecksDrawer();
    wirePickTrackPreview();

    const favouriteToggle = paneEl.querySelector('.mr-favourite-seed-toggle');
    const favouriteMenu = paneEl.querySelector('.mr-favourite-seed-menu');
    if (favouriteToggle && favouriteMenu) {
      favouriteToggle.addEventListener('click',event => {
        event.stopPropagation();
        favouriteSeedMenuOpen = !favouriteSeedMenuOpen;
        favouriteMenu.style.display = favouriteSeedMenuOpen ? 'block' : 'none';
        favouriteToggle.textContent = favouriteSeedMenuOpen ? '▲' : '▼';
        favouriteToggle.setAttribute('aria-expanded',String(favouriteSeedMenuOpen));
      });
    }

    paneEl.querySelectorAll('.mr-favourite-load-btn').forEach(btn => {
      btn.addEventListener('click',() => loadFavouriteSeed(btn.dataset.favouriteKey));
    });
    paneEl.querySelectorAll('.mr-favourite-rename-btn').forEach(btn => {
      btn.addEventListener('click',event => {
        event.stopPropagation();
        renameFavouriteSeed(btn.dataset.favouriteKey);
      });
    });
    paneEl.querySelectorAll('.mr-favourite-remove-btn').forEach(btn => {
      btn.addEventListener('click',event => {
        event.stopPropagation();
        removeFavouriteSeed(btn.dataset.favouriteKey);
      });
    });

    paneEl.addEventListener('click',event => {
      if (!event.target.closest('.mr-seed-combo') && favouriteSeedMenuOpen) {
        favouriteSeedMenuOpen = false;
        if (favouriteMenu) favouriteMenu.style.display = 'none';
        if (favouriteToggle) {
          favouriteToggle.textContent = '▼';
          favouriteToggle.setAttribute('aria-expanded','false');
        }
      }
    });

    paneEl.querySelectorAll('.mr-camera-preset-btn').forEach(btn => {
      btn.addEventListener('click',() => {
        setCameraPreference(btn.dataset.cameraPreset,{applyToRace:false});
        renderCameraPreset();
      });
    });
    paneEl.querySelectorAll('.mr-recipe-btn').forEach(btn => {
      btn.addEventListener('click', () => selectTrackRecipe(btn.dataset.recipe));
    });
    const seedInput = paneEl.querySelector('.mr-seed-input');
    const seedApplyBtn = paneEl.querySelector('.mr-seed-apply-btn');
    const generatedBtn = paneEl.querySelector('.mr-generate-course-btn');
    const manualModeBtn = paneEl.querySelector('.mr-manual-mode-btn');
    if (seedApplyBtn && seedInput) {
      seedApplyBtn.addEventListener('click', () => applySeededTrackRecipe(seedInput.value));
      seedInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          applySeededTrackRecipe(seedInput.value);
        }
      });
    }
    if (generatedBtn && seedInput) {
      generatedBtn.addEventListener('click', () => applyGeneratedTrackRecipe(seedInput.value));
    }
    if (manualModeBtn) {
      manualModeBtn.addEventListener('click', returnToManualTrackSelection);
    }

    const courseLengthSelect =
      paneEl.querySelector('.mr-course-length-select');
    const obstacleFrequencySelect =
      paneEl.querySelector('.mr-obstacle-frequency-select');

    if (courseLengthSelect) {
      courseLengthSelect.addEventListener('change',() => {
        setCourseGenerationControls({
          courseLength:courseLengthSelect.value,
        });
      });
    }
    if (obstacleFrequencySelect) {
      obstacleFrequencySelect.addEventListener('change',() => {
        setCourseGenerationControls({
          obstacleFrequency:obstacleFrequencySelect.value,
        });
      });
    }

    paneEl.querySelector('.mr-claim-btn').addEventListener('click', claimTestCredits);
    const auditClearBtn = paneEl.querySelector('.mr-audit-clear-btn');
    if (auditClearBtn) {
      auditClearBtn.addEventListener('click', async () => {
        await clearStartAudit();
        const summary = paneEl.querySelector('.mr-audit-pick-summary');
        if (summary) summary.textContent = 'No 8-marble races recorded yet';
      });
    }

    paneEl.querySelectorAll('.mr-marble-card').forEach(card => {
      card.addEventListener('click', () => {
        selected = Number.parseInt(card.dataset.id, 10);
        renderMarbles();
        renderStartBtn();
      });
    });
    paneEl.querySelectorAll('.mr-wager-btn[data-wager]').forEach(btn => {
      btn.addEventListener('click', () => {
        wager = Number.parseInt(btn.dataset.wager, 10);
        renderWager();
        renderStartBtn();
      });
    });
    paneEl.querySelector('.mr-start-btn').addEventListener('click', launchRace);

    paneEl.querySelectorAll('.mr-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        raceMode = btn.dataset.mode;
        renderMode();
      });
    });

    renderTrackRecipe();
    renderCameraPreset();
    renderMarbles();
    renderWager();
    renderMode();
    renderStartBtn();
  }

  /* ── init ────────────────────────────────────────────────────────────── */
  async function init(pane) {
    paneEl   = pane;
    await loadBalance();
    await loadCameraPreset();
    await loadCourseGenerationControls();
    await loadTrackRecipeSelection();
    await loadFavouriteSeeds();
    await loadStartAudit();
    track    = buildTrack(getActiveTrackRecipe());
    const physicsAudit = getPhysicsFairnessReport();
    if (!physicsAudit.pass) {
      console.warn('[Marble Run] Physics fairness audit needs review:', physicsAudit.issues);
    }
    const connectionAudit = getTrackConnectionReport();
    if (!connectionAudit.pass) {
      console.warn('[Marble Run] Track connection audit needs review:', connectionAudit.issues);
    }
    const builderAudit = getTrackBuilderReport();
    if (!builderAudit.pass) {
      console.warn('[Marble Run] Section builder audit needs review:', builderAudit.issues);
    }
    const assemblyAudit = getTrackAssemblyReport();
    if (!assemblyAudit.pass) {
      console.warn('[Marble Run] Track assembly audit needs review:', assemblyAudit.issues);
    }
    const validationAudit = getTrackValidationReport();
    if (!validationAudit.pass) {
      console.warn('[Marble Run] Full track validation needs review:', validationAudit.issues);
    }
    const compatibilityAudit = getSectionCompatibilityReport();
    if (!compatibilityAudit.pass) {
      console.warn('[Marble Run] Section compatibility rules need review:', compatibilityAudit.issues);
    }
    const geometryAudit = getDynamicGeometryReport();
    if (!geometryAudit.pass) {
      console.warn('[Marble Run] Dynamic course geometry needs review:', geometryAudit.issues);
    }
    const generatedAudit = getGeneratedCourseReport();
    if (!generatedAudit.pass) {
      console.warn('[Marble Run] Generated course needs review:', generatedAudit.issues);
    }
    const courseBalanceAudit = getGeneratedCourseBalanceReport();
    if (!courseBalanceAudit.pass) {
      console.warn('[Marble Run] Generated-course balance needs review:', courseBalanceAudit.issues);
    }
    const cameraAudit = getCameraPreviewReport();
    if (!cameraAudit.pass) {
      console.warn('[Marble Run] Camera preview needs review:', cameraAudit.issues);
    }
    const obstacleLibraryAudit = getObstacleLibraryReport();
    if (!obstacleLibraryAudit.pass) {
      console.warn('[Marble Run] Obstacle library needs review:', obstacleLibraryAudit.issues);
    }
    const funnelLibraryAudit = getFunnelLibraryReport();
    if (!funnelLibraryAudit.pass) {
      console.warn('[Marble Run] Funnel library needs review:', funnelLibraryAudit.issues);
    }
    const domeLibraryAudit = getDomeLibraryReport();
    if (!domeLibraryAudit.pass) {
      console.warn('[Marble Run] Dome library needs review:', domeLibraryAudit.issues);
    }
    const loopLibraryAudit = getLoopLibraryReport();
    if (!loopLibraryAudit.pass) {
      console.warn('[Marble Run] Loop library needs review:', loopLibraryAudit.issues);
    }
    const balanceBeamAudit = getBalanceBeamLibraryReport();
    if (!balanceBeamAudit.pass) {
      console.warn('[Marble Run] Balance Beam library needs review:', balanceBeamAudit.issues);
    }
    const spiralBowlAudit = getSpiralBowlLibraryReport();
    if (!spiralBowlAudit.pass) {
      console.warn('[Marble Run] Spiral Bowl library needs review:', spiralBowlAudit.issues);
    }
    const bounceChamberAudit = getBounceChamberLibraryReport();
    if (!bounceChamberAudit.pass) {
      console.warn('[Marble Run] Bounce Chamber library needs review:', bounceChamberAudit.issues);
    }
    const splitGateAudit = getSplitGateLibraryReport();
    if (!splitGateAudit.pass) {
      console.warn('[Marble Run] Split Gate library needs review:', splitGateAudit.issues);
    }
    const dropTowerAudit = getDropTowerLibraryReport();
    if (!dropTowerAudit.pass) {
      console.warn('[Marble Run] Drop Tower library needs review:', dropTowerAudit.issues);
    }
    const obstacleShowcaseAudit = getObstacleShowcaseReport();
    if (!obstacleShowcaseAudit.pass) {
      console.warn('[Marble Run] Obstacle Showcase needs review:', obstacleShowcaseAudit.issues);
    }
    const favouriteSeedsAudit = getFavouriteSeedsReport();
    if (!favouriteSeedsAudit.pass) {
      console.warn('[Marble Run] Favourite seed storage needs review:', favouriteSeedsAudit.issues);
    }
    courseControlsAuditCache = null;
    const courseControlsAudit = getCourseControlsReport();
    if (!courseControlsAudit.pass) {
      console.warn('[Marble Run] Course generation controls need review:', courseControlsAudit.issues);
    }
    racePacingAuditCache = null;
    const racePacingAudit = getRacePacingReport();
    if (!racePacingAudit.pass) {
      console.warn('[Marble Run] Race pacing needs review:', racePacingAudit.issues);
    }
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
