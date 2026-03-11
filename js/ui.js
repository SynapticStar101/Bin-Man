/* ================================================================
   ui.js — Barney-Man
   Menu, ready screen, game-over, level-up overlays.
   All drawn onto the existing canvas (no DOM overlays except
   the name-entry box which lives in the CSS overlay).
   ================================================================ */
'use strict';

// ── Shared helpers ────────────────────────────────────────────────
function uiText(ctx, text, x, y, size, colour, align) {
  ctx.font      = `bold ${size}px 'Courier New', monospace`;
  ctx.fillStyle = colour || COL.uiGold;
  ctx.textAlign = align || 'center';
  ctx.fillText(text, x, y);
}

// Compatible rounded-rect (ctx.roundRect missing in older browsers / Safari < 15.4)
function _roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r || 8, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x,     y + h, x,     y + h - r, r);
  ctx.lineTo(x,     y + r);
  ctx.arcTo(x,     y,     x + r, y,         r);
  ctx.closePath();
}

function uiPanel(ctx, x, y, w, h, r) {
  ctx.fillStyle = COL.uiPanel;
  _roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.strokeStyle = COL.uiGold;
  ctx.lineWidth = 2;
  ctx.stroke();
}

// Flashing text (returns true on visible frames)
function flashText(ctx, text, x, y, size, colour, frameCount, rate) {
  if (Math.floor(frameCount / (rate || 30)) % 2 === 0) {
    uiText(ctx, text, x, y, size, colour);
    return true;
  }
  return false;
}

// ── Menu screen ───────────────────────────────────────────────────
let _menuScroll = 0;
let _menuScores = [];
let _menuScoresFetched = false;

function drawMenu(ctx, W, H, hiScore) {
  _menuScroll += 0.5;

  // Animated background — scrolling dots
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, W, H);

  // Draw a few animated barrels drifting across
  const t = Date.now() * 0.001;
  [0, 1, 2, 3].forEach((i) => {
    const bx = ((t * 30 + i * 140) % (W + 60)) - 30;
    const by = 80 + i * 60 + Math.sin(t + i) * 12;
    const sc = Math.max(1, Math.floor(tileSize / 10));
    drawSprite(ctx, S_BARRELS[i], bx, by, sc);
  });

  // Title
  const panelW = Math.min(W - 40, 380);
  const panelX = (W - panelW) / 2;
  uiPanel(ctx, panelX, 40, panelW, 80, 12);
  uiText(ctx, 'BARNEY-MAN', W / 2, 90, Math.min(36, panelW * 0.09), COL.uiGold);

  // Tagline
  uiText(ctx, 'THE RUBBISH ARCADE', W / 2, 112, 14, '#FF8C00');

  // Barney-Man logo (animated chomp)
  const logoSc = Math.max(2, Math.floor(tileSize / 6));
  const frame  = getBarneyFrame(Math.floor(_menuScroll * 2));
  const sprW   = frame.d[0].length * logoSc;
  const sprH   = frame.d.length * logoSc;
  drawSprite(ctx, frame, W / 2 - sprW / 2, 130, logoSc);

  // Controls
  uiPanel(ctx, panelX, 200, panelW, 95, 8);
  uiText(ctx, 'HOW TO PLAY', W / 2, 222, 13, COL.uiGold);
  uiText(ctx, 'ARROWS / WASD / SWIPE to move', W / 2, 244, 11, '#CCC');
  uiText(ctx, 'EAT ALL THE DOTS TO LEVEL UP', W / 2, 260, 11, '#CCC');
  uiText(ctx, 'COFFEE = POWER UP!', W / 2, 276, 11, COL.hivOrg);
  uiText(ctx, '[ M ] MUTE / UNMUTE', W / 2, 292, 10, '#888');

  // Leaderboard
  if (!_menuScoresFetched) {
    _menuScoresFetched = true;
    getDisplayScores((scores, isGlobal) => { _menuScores = scores; });
  }
  const lbTop = 310;
  uiPanel(ctx, panelX, lbTop, panelW, 180, 8);
  uiText(ctx, 'HIGH SCORES', W / 2, lbTop + 22, 13, COL.uiGold);
  _menuScores.slice(0, 8).forEach((s, i) => {
    const y = lbTop + 40 + i * 17;
    const rank  = String(i + 1).padStart(2, ' ');
    const name  = (s.name || 'BARNEY').padEnd(12, ' ');
    const pts   = String(s.score).padStart(7, '0');
    uiText(ctx, `${rank}. ${name} ${pts}`, W / 2, y, 10,
      i === 0 ? '#FFD700' : i < 3 ? '#C0C0C0' : '#AAA');
  });
  if (_menuScores.length === 0) {
    uiText(ctx, 'NO SCORES YET - BE FIRST!', W / 2, lbTop + 55, 11, '#666');
  }

  // Hi-score
  uiText(ctx, 'BEST: ' + String(hiScore).padStart(7, '0'), W / 2, lbTop + 170, 11, '#FFD700');

  // Start prompt
  flashText(ctx, 'PRESS ENTER OR TAP TO START', W / 2, H - 24, 13, COL.uiGold, _menuScroll * 2, 25);
}

// ── Ready screen ──────────────────────────────────────────────────
function drawReady(ctx, W, H) {
  uiPanel(ctx, W / 2 - 90, H / 2 - 22, 180, 44, 8);
  uiText(ctx, 'READY!', W / 2, H / 2 + 8, 22, COL.uiGold);
}

// ── Game-over screen ──────────────────────────────────────────────
let _goFrame = 0;
let _goScoresShown = false;
let _goScores = [];
let _goNameDone = false;

function drawGameOver(ctx, W, H, score, hiScore) {
  _goFrame++;

  // Semi-transparent overlay over maze
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, H);

  const panelW = Math.min(W - 32, 360);
  const panelX = (W - panelW) / 2;

  uiPanel(ctx, panelX, 60, panelW, 300, 12);

  uiText(ctx, 'GAME OVER', W / 2, 100, 28, COL.uiRed);
  uiText(ctx, 'SCORE: ' + String(score).padStart(7, '0'), W / 2, 135, 16, COL.uiGold);
  uiText(ctx, 'BEST:  ' + String(hiScore).padStart(7, '0'), W / 2, 158, 16, '#CCC');

  // High score table
  uiText(ctx, '── TOP SCORES ──', W / 2, 190, 12, COL.uiGold);
  _goScores.slice(0, 7).forEach((s, i) => {
    const y = 208 + i * 16;
    uiText(ctx, `${i + 1}. ${(s.name||'BARNEY').padEnd(10,' ')} ${String(s.score).padStart(7,'0')}`,
      W / 2, y, 10, i === 0 ? '#FFD700' : '#AAA');
  });

  flashText(ctx, 'PRESS ENTER TO PLAY AGAIN', W / 2, H - 40, 13, COL.uiGold, _goFrame, 30);

  // Trigger name entry once, non-blocking
  if (!_goNameDone && isHighScore(score) && score > 0) {
    _goNameDone = true;
    promptForName(score, (name) => {
      getDisplayScores((scores) => { _goScores = scores; });
    });
  }
  if (!_goScoresShown) {
    _goScoresShown = true;
    _goFrame = 0;
    _goNameDone = false;
    getDisplayScores((scores) => { _goScores = scores; });
  }
}

// Reset game-over state when a new game starts (called from game.js)
function resetGameOverUI() {
  _goFrame = 0;
  _goScoresShown = false;
  _goNameDone = false;
  _goScores = [];
  _menuScoresFetched = false;
}
