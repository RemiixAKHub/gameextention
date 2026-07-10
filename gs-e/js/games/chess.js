// chess.js — Full Chess implementation
// Click piece to select, click destination to move.
// Includes: legal move generation, check/checkmate/stalemate, castling, en passant, pawn promotion.
// Plays against a minimax AI (depth 3).

const GameChess = (() => {

  function randomUnit() {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] / 0x100000000;
  }

  function randomInt(max) {
    return Math.floor(randomUnit() * max);
  }

  const STORAGE_KEY = 'game_chess';
  const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  let board = [];
  let turn = 'w';
  let castling = '';
  let enPassant = null;
  let selected = null;
  let legalMoves = [];
  // STATUS: '' | 'check' | 'checkmate' | 'stalemate'
  // IMPORTANT: 'check' must NOT prevent the AI from moving — only 'checkmate'/'stalemate' end the game
  let status = '';
  let moveHistory = [];
  let promotionPending = null;
  let container = null;
  let thinking = false;
  let aiTimer = null;

  const PIECE_UNICODE = {
    K:'♔', Q:'♕', R:'♖', B:'♗', N:'♘', P:'♙',
    k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟',
  };

  const PIECE_VALUES = { p:100, n:320, b:330, r:500, q:900, k:20000 };
  const KNIGHT_DELTAS = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  const KING_DELTAS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  const DIAGONAL_DIRS = [[-1,-1],[-1,1],[1,-1],[1,1]];
  const ORTHOGONAL_DIRS = [[-1,0],[1,0],[0,-1],[0,1]];

  // ── Helpers ───────────────────────────────────────────────────────────────
  function color(p)       { return p ? (p === p.toUpperCase() ? 'w' : 'b') : null; }
  function isWhite(p)     { return p && p === p.toUpperCase(); }
  function enemy(p, side) { return p && color(p) !== side; }
  function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
  function isGameOver()   { return status === 'checkmate' || status === 'stalemate'; }
  function opponent(side) { return side === 'w' ? 'b' : 'w'; }

  // ── State ─────────────────────────────────────────────────────────────────
  function serialize() {
    return { board, turn, castling, enPassant, status, moveHistory };
  }

  async function saveState() {
    Storage.saveLazy(STORAGE_KEY, serialize());
  }

  async function loadState() {
    const s = await Storage.load(STORAGE_KEY);
    if (s?.board) {
      board = s.board;
      turn = s.turn;
      castling = s.castling;
      enPassant = s.enPassant;
      status = s.status || '';
      moveHistory = s.moveHistory || [];
      return true;
    }
    return false;
  }

  // ── FEN parsing ───────────────────────────────────────────────────────────
  function parseFenRow(row) {
    const parsed = [];
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < Number.parseInt(ch, 10); i++) parsed.push('');
      } else {
        parsed.push(ch);
      }
    }
    return parsed;
  }

  function parseFen(fen) {
    const parts = fen.split(' ');
    board = parts[0].split('/').map(parseFenRow);
    turn = parts[1] || 'w';
    castling = parts[2] || '';
    enPassant = parseEnPassant(parts[3]);
  }

  function parseEnPassant(value) {
    return (value && value !== '-') ? algebraicToRC(value) : null;
  }

  function algebraicToRC(sq) {
    return [8 - Number.parseInt(sq[1], 10), sq.codePointAt(0) - 97];
  }

  // ── Move generation ───────────────────────────────────────────────────────
  function pushMove(moves, r, c, tr, tc, special = '') {
    if (inBounds(tr, tc)) moves.push({ from:[r,c], to:[tr,tc], special });
  }

  function addPawnForwardMoves(ctx) {
    const { b, r, c, side, moves, dir } = ctx;
    const nextRow = r + dir;
    if (!inBounds(nextRow, c) || b[nextRow][c]) return;

    pushMove(moves, r, c, nextRow, c);
    const startRow = side === 'w' ? 6 : 1;
    const doubleRow = r + 2 * dir;
    if (r === startRow && !b[doubleRow][c]) pushMove(moves, r, c, doubleRow, c, 'double');
  }

  function addPawnCaptureMoves(ctx) {
    const { b, r, c, side, moves, dir, ep } = ctx;
    for (const dc of [-1, 1]) {
      const tr = r + dir;
      const tc = c + dc;
      if (!inBounds(tr, tc)) continue;
      if (enemy(b[tr][tc], side)) pushMove(moves, r, c, tr, tc);
      if (ep && ep[0] === tr && ep[1] === tc) pushMove(moves, r, c, tr, tc, 'ep');
    }
  }

  function addPawnMoves(ctx) {
    addPawnForwardMoves(ctx);
    addPawnCaptureMoves(ctx);
  }

  function addJumpMoves(ctx, deltas) {
    const { b, r, c, side, moves } = ctx;
    for (const [dr, dc] of deltas) {
      const tr = r + dr;
      const tc = c + dc;
      if (inBounds(tr, tc) && color(b[tr][tc]) !== side) pushMove(moves, r, c, tr, tc);
    }
  }

  function addKnightMoves(ctx) {
    addJumpMoves(ctx, KNIGHT_DELTAS);
  }

  function addSlidingMoves(ctx, dirs) {
    const { b, r, c, side, moves } = ctx;
    for (const [dr, dc] of dirs) {
      addSlidingRay({ b, r, c, side, moves, dr, dc });
    }
  }

  function addSlidingRay({ b, r, c, side, moves, dr, dc }) {
    let tr = r + dr;
    let tc = c + dc;
    while (inBounds(tr, tc)) {
      if (!b[tr][tc]) {
        pushMove(moves, r, c, tr, tc);
      } else {
        if (enemy(b[tr][tc], side)) pushMove(moves, r, c, tr, tc);
        break;
      }
      tr += dr;
      tc += dc;
    }
  }

  function slidingDirsForPiece(pt) {
    if (pt === 'b') return DIAGONAL_DIRS;
    if (pt === 'r') return ORTHOGONAL_DIRS;
    return [...DIAGONAL_DIRS, ...ORTHOGONAL_DIRS];
  }

  function addBishopMoves(ctx) {
    addSlidingMoves(ctx, slidingDirsForPiece('b'));
  }

  function addRookMoves(ctx) {
    addSlidingMoves(ctx, slidingDirsForPiece('r'));
  }

  function addQueenMoves(ctx) {
    addSlidingMoves(ctx, slidingDirsForPiece('q'));
  }

  function addKingMoves(ctx) {
    addJumpMoves(ctx, KING_DELTAS);
    addCastlingMoves(ctx);
  }

  function addCastlingMoves(ctx) {
    const { b, r, c, side, moves, cas } = ctx;
    if (!cas) return;
    if (side === 'w' && r === 7 && c === 4) addWhiteCastlingMoves(b, moves, cas);
    if (side === 'b' && r === 0 && c === 4) addBlackCastlingMoves(b, moves, cas);
  }

  function addWhiteCastlingMoves(b, moves, cas) {
    if (castlingPathClear(b, cas, 'K')) pushMove(moves, 7, 4, 7, 6, 'castle-k');
    if (castlingPathClear(b, cas, 'Q')) pushMove(moves, 7, 4, 7, 2, 'castle-q');
  }

  function addBlackCastlingMoves(b, moves, cas) {
    if (castlingPathClear(b, cas, 'k')) pushMove(moves, 0, 4, 0, 6, 'castle-k');
    if (castlingPathClear(b, cas, 'q')) pushMove(moves, 0, 4, 0, 2, 'castle-q');
  }

  function castlingPathClear(b, cas, sideKey) {
    const white = sideKey === 'K' || sideKey === 'Q';
    const kingSide = sideKey === 'K' || sideKey === 'k';
    const r = white ? 7 : 0;
    const rook = white ? 'R' : 'r';
    if (!cas.includes(sideKey)) return false;
    if (kingSide) return !b[r][5] && !b[r][6] && b[r][7] === rook;
    return !b[r][3] && !b[r][2] && !b[r][1] && b[r][0] === rook;
  }

  const MOVE_BUILDERS = {
    p: addPawnMoves,
    n: addKnightMoves,
    b: addBishopMoves,
    r: addRookMoves,
    q: addQueenMoves,
    k: addKingMoves,
  };

  function rawMoves(b, r, c, side, ep, cas) {
    const p = b[r][c];
    if (!p || color(p) !== side) return [];

    const moves = [];
    const pt = p.toLowerCase();
    const builder = MOVE_BUILDERS[pt];
    if (!builder) return moves;

    builder({
      b,
      r,
      c,
      side,
      ep,
      cas,
      moves,
      dir: side === 'w' ? -1 : 1,
    });
    return moves;
  }

  function findKing(b, side) {
    const k = side === 'w' ? 'K' : 'k';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (b[r][c] === k) return [r,c];
      }
    }
    return null;
  }

  function moveTargetsSquare(move, r, c) {
    return move.to[0] === r && move.to[1] === c;
  }

  function squareAttackedByPiece(b, sr, sc, r, c, bySide) {
    if (color(b[sr][sc]) !== bySide) return false;
    return rawMoves(b, sr, sc, bySide, null, '').some(move => moveTargetsSquare(move, r, c));
  }

  function isAttacked(b, r, c, bySide) {
    for (let sr = 0; sr < 8; sr++) {
      for (let sc = 0; sc < 8; sc++) {
        if (squareAttackedByPiece(b, sr, sc, r, c, bySide)) return true;
      }
    }
    return false;
  }

  function inCheck(b, side) {
    const k = findKing(b, side);
    return k ? isAttacked(b, k[0], k[1], opponent(side)) : false;
  }

  function promotedPawn(piece, tr) {
    const shouldPromote = piece.toLowerCase() === 'p' && (tr === 0 || tr === 7);
    if (!shouldPromote) return piece;
    return piece === 'P' ? 'Q' : 'q';
  }

  function moveCastlingRook(nb, tr, tc, special) {
    if (special === 'castle-k') {
      nb[tr][tc - 1] = nb[tr][tc + 1];
      nb[tr][tc + 1] = '';
    }
    if (special === 'castle-q') {
      nb[tr][tc + 1] = nb[tr][tc - 2];
      nb[tr][tc - 2] = '';
    }
  }

  function removeCastlingFlag(cas, flag) {
    return cas.replace(flag, '');
  }

  function removeKingCastlingRights(cas, piece) {
    if (piece === 'K') return removeCastlingFlag(removeCastlingFlag(cas, 'K'), 'Q');
    if (piece === 'k') return removeCastlingFlag(removeCastlingFlag(cas, 'k'), 'q');
    return cas;
  }

  function removeRookCastlingRights(cas, fr, fc) {
    let updated = cas;
    if (fr === 7 && fc === 0) updated = removeCastlingFlag(updated, 'Q');
    if (fr === 7 && fc === 7) updated = removeCastlingFlag(updated, 'K');
    if (fr === 0 && fc === 0) updated = removeCastlingFlag(updated, 'q');
    if (fr === 0 && fc === 7) updated = removeCastlingFlag(updated, 'k');
    return updated;
  }

  function updateCastlingRights(cas, piece, fr, fc) {
    return removeRookCastlingRights(removeKingCastlingRights(cas, piece), fr, fc);
  }

  function getNewEnPassant(piece, fr, fc, tr) {
    return (piece.toLowerCase() === 'p' && Math.abs(tr - fr) === 2) ? [(fr + tr) / 2, fc] : null;
  }

  function applyMove(b, move, cas, ep) {
    const nb = b.map(row => [...row]);
    const { from:[fr,fc], to:[tr,tc], special } = move;
    let p = nb[fr][fc];

    nb[fr][fc] = '';
    p = promotedPawn(p, tr);
    nb[tr][tc] = p;

    if (special === 'ep') nb[fr][tc] = '';
    moveCastlingRook(nb, tr, tc, special);

    return {
      board: nb,
      castling: updateCastlingRights(cas, p, fr, fc),
      enPassant: getNewEnPassant(p, fr, fc, tr),
    };
  }

  function shouldSkipCastleMove(b, side, move) {
    if (!move.special?.startsWith('castle')) return false;
    if (inCheck(b, side)) return true;

    const midC = move.special === 'castle-k' ? 5 : 3;
    const kingR = side === 'w' ? 7 : 0;
    return isAttacked(b, kingR, midC, opponent(side));
  }

  function addLegalPieceMoves(b, side, ep, cas, moves, r, c) {
    if (color(b[r][c]) !== side) return;

    for (const move of rawMoves(b, r, c, side, ep, cas)) {
      if (shouldSkipCastleMove(b, side, move)) continue;
      const { board: nextBoard } = applyMove(b, move, cas, ep);
      if (!inCheck(nextBoard, side)) moves.push(move);
    }
  }

  function getLegalMoves(b, side, ep, cas) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        addLegalPieceMoves(b, side, ep, cas, moves, r, c);
      }
    }
    return moves;
  }

  // ── AI ─────────────────────────────────────────────────────────────────────

  // Piece-square tables for positional evaluation
  const PST = {
    p: [ 0, 0, 0, 0, 0, 0, 0, 0,
         50,50,50,50,50,50,50,50,
         10,10,20,30,30,20,10,10,
         5, 5,10,25,25,10, 5, 5,
         0, 0, 0,20,20, 0, 0, 0,
         5,-5,-10,0, 0,-10,-5,5,
         5,10,10,-20,-20,10,10,5,
         0, 0, 0, 0, 0, 0, 0, 0],
    n: [-50,-40,-30,-30,-30,-30,-40,-50,
        -40,-20,  0,  0,  0,  0,-20,-40,
        -30,  0, 10, 15, 15, 10,  0,-30,
        -30,  5, 15, 20, 20, 15,  5,-30,
        -30,  0, 15, 20, 20, 15,  0,-30,
        -30,  5, 10, 15, 15, 10,  5,-30,
        -40,-20,  0,  5,  5,  0,-20,-40,
        -50,-40,-30,-30,-30,-30,-40,-50],
    b: [-20,-10,-10,-10,-10,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5, 10, 10,  5,  0,-10,
        -10,  5,  5, 10, 10,  5,  5,-10,
        -10,  0, 10, 10, 10, 10,  0,-10,
        -10, 10, 10, 10, 10, 10, 10,-10,
        -10,  5,  0,  0,  0,  0,  5,-10,
        -20,-10,-10,-10,-10,-10,-20],
    r: [ 0, 0, 0, 0, 0, 0, 0, 0,
         5,10,10,10,10,10,10, 5,
        -5, 0, 0, 0, 0, 0, 0,-5,
        -5, 0, 0, 0, 0, 0, 0,-5,
        -5, 0, 0, 0, 0, 0, 0,-5,
        -5, 0, 0, 0, 0, 0, 0,-5,
        -5, 0, 0, 0, 0, 0, 0,-5,
         0, 0, 0, 5, 5, 0, 0, 0],
    q: [-20,-10,-10,-5,-5,-10,-10,-20,
        -10,  0,  0, 0, 0,  0,  0,-10,
        -10,  0,  5, 5, 5,  5,  0,-10,
         -5,  0,  5, 5, 5,  5,  0, -5,
          0,  0,  5, 5, 5,  5,  0, -5,
        -10,  5,  5, 5, 5,  5,  0,-10,
        -10,  0,  5, 0, 0,  0,  0,-10,
        -20,-10,-10,-5,-5,-10,-10,-20],
    k: [-30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -20,-30,-30,-40,-40,-30,-30,-20,
        -10,-20,-20,-20,-20,-20,-20,-10,
         20, 20,  0,  0,  0,  0, 20, 20,
         20, 30, 10,  0,  0, 10, 30, 20],
  };

  function pstIndex(piece, r, c) {
    return isWhite(piece) ? r * 8 + c : (7 - r) * 8 + c;
  }

  function pieceSquareValue(piece, r, c) {
    const pt = piece.toLowerCase();
    const table = PST[pt];
    return table ? table[pstIndex(piece, r, c)] : 0;
  }

  function pieceMaterialValue(piece) {
    return PIECE_VALUES[piece.toLowerCase()] || 0;
  }

  function evaluatedPieceValue(piece, r, c) {
    const value = pieceMaterialValue(piece) + pieceSquareValue(piece, r, c);
    return isWhite(piece) ? value : -value;
  }

  function evalBoard(b) {
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (p) score += evaluatedPieceValue(p, r, c);
      }
    }
    return score;
  }

  function shuffleMoves(moves) {
    for (let i = moves.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [moves[i], moves[j]] = [moves[j], moves[i]];
    }
  }

  function betterScore(score, best, maximizing) {
    return maximizing ? score > best : score < best;
  }

  function startingBestScore(maximizing) {
    return maximizing ? -Infinity : Infinity;
  }

  function updateAlphaBeta(alpha, beta, best, maximizing) {
    if (maximizing) return { alpha: Math.max(alpha, best), beta };
    return { alpha, beta: Math.min(beta, best) };
  }

  function minimaxSide(maximizing) {
    return maximizing ? 'w' : 'b';
  }

  function scoreCandidateMove(b, m, depth, alpha, beta, maximizing, ep, cas) {
    const { board: nextBoard, castling: nextCastling, enPassant: nextEnPassant } = applyMove(b, m, cas, ep);
    return aiMinimax(nextBoard, depth - 1, alpha, beta, !maximizing, nextEnPassant, nextCastling).score;
  }

  function aiMinimax(b, depth, alpha, beta, maximizing, ep, cas) {
    const side = minimaxSide(maximizing);
    const moves = getLegalMoves(b, side, ep, cas);
    if (depth === 0 || moves.length === 0) return { score: evalBoard(b) };

    shuffleMoves(moves);

    let best = startingBestScore(maximizing);
    let bestMove = moves[0];
    let currentAlpha = alpha;
    let currentBeta = beta;

    for (const move of moves) {
      const score = scoreCandidateMove(b, move, depth, currentAlpha, currentBeta, maximizing, ep, cas);
      if (betterScore(score, best, maximizing)) {
        best = score;
        bestMove = move;
      }

      const nextBounds = updateAlphaBeta(currentAlpha, currentBeta, best, maximizing);
      currentAlpha = nextBounds.alpha;
      currentBeta = nextBounds.beta;
      if (currentBeta <= currentAlpha) break;
    }
    return { score: best, move: bestMove };
  }

  function scheduleAI() {
    if (aiTimer) clearTimeout(aiTimer);
    aiTimer = setTimeout(() => {
      // ── KEY FIX: only skip if game is truly over (checkmate/stalemate)
      // 'check' is a valid game state where the AI must still move
      if (turn !== 'b' || isGameOver()) return;

      thinking = true;
      render();

      // Use another timeout to allow the render to flush before heavy computation
      setTimeout(() => {
        const { move } = aiMinimax(board, 3, -Infinity, Infinity, false, enPassant, castling);
        thinking = false;
        if (move) {
          executeMove(move);
        } else {
          // No moves — shouldn't happen but safety net
          render();
        }
      }, 20);
    }, 250);
  }

  // ── Move execution ─────────────────────────────────────────────────────────
  function isPromotionMove(piece, tr) {
    return piece.toLowerCase() === 'p' && (tr === 0 || tr === 7);
  }

  function applyPromotionChoice(piece, promoteTo) {
    if (promoteTo) return promoteTo;
    return piece === 'P' ? 'Q' : 'q';
  }

  function toggleTurn() {
    turn = opponent(turn);
  }

  function recomputeStatus() {
    const nextMoves = getLegalMoves(board, turn, enPassant, castling);
    if (nextMoves.length === 0) {
      status = inCheck(board, turn) ? 'checkmate' : 'stalemate';
      return;
    }
    status = inCheck(board, turn) ? 'check' : '';
  }

  function clearSelection() {
    selected = null;
    legalMoves = [];
  }

  function maybeScheduleNextAI() {
    if (turn === 'b' && !isGameOver()) scheduleAI();
  }

  function executeMove(move, promoteTo) {
    const { from:[fr,fc], to:[tr,tc] } = move;
    const p = board[fr][fc];
    const isPawnPromo = isPromotionMove(p, tr);

    const result = applyMove(board, move, castling, enPassant);
    board = result.board;
    castling = result.castling;
    enPassant = result.enPassant;

    if (isPawnPromo) board[tr][tc] = applyPromotionChoice(p, promoteTo);

    moveHistory.push({ from:[fr,fc], to:[tr,tc] });
    toggleTurn();
    recomputeStatus();
    clearSelection();
    saveState();
    render();
    maybeScheduleNextAI();
  }

  // ── Rendering ─────────────────────────────────────────────────────────────
  function squareBaseClass(r, c) {
    return 'ch-sq ' + ((r + c) % 2 === 0 ? 'ch-light' : 'ch-dark');
  }

  function sameSquare(a, r, c) {
    return a && a[0] === r && a[1] === c;
  }

  function isLastMoveSquare(lastMove, r, c) {
    if (!lastMove) return false;
    return sameSquare(lastMove.from, r, c) || sameSquare(lastMove.to, r, c);
  }

  function findLegalMoveTo(r, c) {
    return legalMoves.find(move => moveTargetsSquare(move, r, c));
  }

  function addPieceToSquare(sq, pieceCode) {
    if (!pieceCode) return;
    const piece = document.createElement('span');
    piece.className = 'ch-piece ' + (isWhite(pieceCode) ? 'ch-white' : 'ch-black');
    piece.textContent = PIECE_UNICODE[pieceCode] || pieceCode;
    sq.appendChild(piece);
  }

  function addSquareLabels(sq, r, c) {
    if (c === 0) addSquareLabel(sq, 'ch-rank', 8 - r);
    if (r === 7) addSquareLabel(sq, 'ch-file', 'abcdefgh'[c]);
  }

  function addSquareLabel(sq, className, text) {
    const label = document.createElement('span');
    label.className = className;
    label.textContent = text;
    sq.appendChild(label);
  }

  function markLegalSquare(sq, r, c) {
    if (!findLegalMoveTo(r, c)) return;
    sq.classList.add('ch-legal');
    if (board[r][c]) sq.classList.add('ch-capture');
  }

  function markCheckSquare(sq, r, c, inChk) {
    if (!inChk) return;
    const kingPiece = turn === 'w' ? 'K' : 'k';
    if (board[r][c] === kingPiece) sq.classList.add('ch-check');
  }

  function decorateSquare(sq, r, c, lastMove, inChk) {
    if (isLastMoveSquare(lastMove, r, c)) sq.classList.add('ch-last');
    if (sameSquare(selected, r, c)) sq.classList.add('ch-sel');
    markLegalSquare(sq, r, c);
    markCheckSquare(sq, r, c, inChk);
  }

  function createSquare(r, c, lastMove, inChk) {
    const sq = document.createElement('div');
    sq.className = squareBaseClass(r, c);
    decorateSquare(sq, r, c, lastMove, inChk);
    addPieceToSquare(sq, board[r][c]);
    addSquareLabels(sq, r, c);
    sq.addEventListener('click', () => onSquareClick(r, c));
    return sq;
  }

  function renderBoard(grid) {
    grid.innerHTML = '';
    const lastMove = moveHistory.at(-1);
    const inChk = inCheck(board, turn);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        grid.appendChild(createSquare(r, c, lastMove, inChk));
      }
    }
  }

  function currentStatusText() {
    if (status === 'checkmate') return `Checkmate! ${turn === 'w' ? 'Black' : 'White'} wins`;
    if (status === 'stalemate') return 'Stalemate — Draw';
    if (thinking) return 'AI thinking...';
    if (status === 'check') return `${turn === 'w' ? 'White' : 'Black'} is in Check`;
    return `${turn === 'w' ? 'White (You)' : 'Black (AI)'} to move`;
  }

  function renderInfo() {
    const info = container.querySelector('.ch-info');
    if (info) info.textContent = currentStatusText();
  }

  function renderPromotionOverlay() {
    const promoEl = container.querySelector('.ch-promo');
    if (promoEl) promoEl.style.display = promotionPending ? 'flex' : 'none';
  }

  function render() {
    if (!container) return;
    const grid = container.querySelector('.ch-board');
    if (!grid) return;
    renderBoard(grid);
    renderInfo();
    renderPromotionOverlay();
  }

  function canHandleUserClick() {
    return !promotionPending && !isGameOver() && !thinking && turn !== 'b';
  }

  function isSelectedMovePromotion(move, r) {
    const fromPiece = board[selected[0]][selected[1]];
    return move && fromPiece.toLowerCase() === 'p' && (r === 0 || r === 7);
  }

  function selectPiece(r, c) {
    selected = [r, c];
    legalMoves = getLegalMoves(board, turn, enPassant, castling)
      .filter(move => sameSquare(move.from, r, c));
    render();
  }

  function handleSelectedSquareClick(r, c) {
    const move = findLegalMoveTo(r, c);
    if (!move) return false;

    if (isSelectedMovePromotion(move, r)) {
      promotionPending = move;
      render();
      return true;
    }

    executeMove(move);
    return true;
  }

  function onSquareClick(r, c) {
    if (!canHandleUserClick()) return;

    const p = board[r][c];
    if (selected && handleSelectedSquareClick(r, c)) return;

    if (color(p) === turn) {
      selectPiece(r, c);
    } else {
      clearSelection();
      render();
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  async function init(el) {
    container = el;
    container.innerHTML = `
      <div class="ch-info"></div>
      <div class="ch-board-wrap">
        <div class="ch-board"></div>
        <div class="ch-promo" style="display:none">
          <span class="ch-promo-label">Promote to:</span>
          <div class="ch-promo-btns">
            <button class="ch-promo-btn" data-piece="Q">♕ Queen</button>
            <button class="ch-promo-btn" data-piece="R">♖ Rook</button>
            <button class="ch-promo-btn" data-piece="B">♗ Bishop</button>
            <button class="ch-promo-btn" data-piece="N">♘ Knight</button>
          </div>
        </div>
      </div>
      <button class="btn-reset" id="btn-reset-ch">New Game</button>
      <div class="game-hint">Click piece to select &nbsp;|&nbsp; Click square to move &nbsp;|&nbsp; You play White</div>
    `;

    container.querySelectorAll('.ch-promo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!promotionPending) return;
        const piece = turn === 'w' ? btn.dataset.piece : btn.dataset.piece.toLowerCase();
        const move = promotionPending;
        promotionPending = null;
        executeMove(move, piece);
      });
    });

    container.querySelector('#btn-reset-ch').addEventListener('click', reset);

    const resumed = await loadState();
    if (!resumed) startNew();
    render();

    // If it's the AI's turn on load (e.g. game resumed mid-AI-turn), trigger it
    if (turn === 'b' && !isGameOver()) scheduleAI();
  }

  function startNew() {
    if (aiTimer) clearTimeout(aiTimer);
    parseFen(START_FEN);
    clearSelection();
    status = '';
    moveHistory = [];
    promotionPending = null;
    thinking = false;
    aiTimer = null;
  }

  async function reset() {
    if (aiTimer) clearTimeout(aiTimer);
    await Storage.remove(STORAGE_KEY);
    startNew();
    render();
  }

  function onKey() {}

  return { init, onKey, reset };
})();
