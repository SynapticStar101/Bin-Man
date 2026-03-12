/* ================================================================
   game.js — Barney-Man
   Main game loop, state machine, collision detection, scoring.
   ================================================================ */
'use strict';

// ── Canvas setup ──────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const HUD_H  = 40; // px for score/lives bar (logical, scaled)

let canvasW = 560, canvasH = 620; // logical size; scaled by CSS

function resizeCanvas() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const touchH = isTouchDevice() ? 160 : 0;
  const avail  = Math.min(vw, (vh - touchH) * (canvasW / canvasH));
  const scale  = avail / canvasW;
  canvas.width  = canvasW;
  canvas.height = canvasH;
  canvas.style.width  = Math.floor(canvasW * scale) + 'px';
  canvas.style.height = Math.floor(canvasH * scale) + 'px';
  setMazeLayout(canvasW, canvasH, HUD_H);
}

function isTouchDevice() {
  return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
}

// ── Game state ────────────────────────────────────────────────────
const STATE = { MENU:'menu', READY:'ready', PLAYING:'playing', DEAD:'dead', LEVELUP:'levelup', GAMEOVER:'gameover', HISCORE:'hiscore' };
let state      = STATE.MENU;
let score      = 0;
let hiScore    = 0;
let lives      = 3;
let level      = 1;
let frameCount = 0;
let stateTimer = 0;   // countdown for timed state transitions

// Ghost global mode cycling
let ghostModeIdx  = 0;
let ghostModeTimer= 0;
let globalGhostMode = 'scatter';

// Siren handle
let sirenStop = () => {};

// Score pop-ups
const popups = [];  // { x, y, text, life }

// ── Initialise ────────────────────────────────────────────────────
window.addEventListener('load', () => {
  resizeCanvas();
  initMaze();          // populate mazeGrid so draw() never crashes on first frame
  loadHiScore();
  bindInput();
  showTouchControls();
  loop();
});
window.addEventListener('resize', resizeCanvas);

// ── Input ─────────────────────────────────────────────────────────
function bindInput() {
  document.addEventListener('keydown', e => {
    switch (e.key) {
      case 'ArrowUp':    case 'w': case 'W': Barney.setDir(DIR.UP);    e.preventDefault(); break;
      case 'ArrowDown':  case 's': case 'S': Barney.setDir(DIR.DOWN);  e.preventDefault(); break;
      case 'ArrowLeft':  case 'a': case 'A': Barney.setDir(DIR.LEFT);  e.preventDefault(); break;
      case 'ArrowRight': case 'd': case 'D': Barney.setDir(DIR.RIGHT); e.preventDefault(); break;
      case 'Enter': case ' ':
        if (state === STATE.MENU || state === STATE.GAMEOVER) startGame();
        e.preventDefault(); break;
      case 'm': case 'M': toggleMute(); break;
    }
  });

  // Touch d-pad
  function bindBtn(id, dir) {
    const btn = document.getElementById(id);
    if (!btn) return;
    const handler = e => { e.preventDefault(); Barney.setDir(dir); };
    btn.addEventListener('touchstart', handler, { passive: false });
    btn.addEventListener('mousedown', handler);
  }
  bindBtn('btnUp',    DIR.UP);
  bindBtn('btnDown',  DIR.DOWN);
  bindBtn('btnLeft',  DIR.LEFT);
  bindBtn('btnRight', DIR.RIGHT);

  // Swipe support
  let tx0 = 0, ty0 = 0;
  canvas.addEventListener('touchstart', e => { tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY; }, { passive: true });
  canvas.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - tx0;
    const dy = e.changedTouches[0].clientY - ty0;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      if (state === STATE.MENU || state === STATE.GAMEOVER) startGame();
      return;
    }
    if (Math.abs(dx) > Math.abs(dy))
      Barney.setDir(dx > 0 ? DIR.RIGHT : DIR.LEFT);
    else
      Barney.setDir(dy > 0 ? DIR.DOWN : DIR.UP);
  }, { passive: true });
}

function showTouchControls() {
  if (isTouchDevice()) {
    document.getElementById('touchControls').style.display = 'block';
  }
}

// ── Game flow ─────────────────────────────────────────────────────
function startGame() {
  score = 0; lives = 3; level = 1;
  resetGameOverUI();
  beginLevel();
  sfxGameStart();
}

function beginLevel() {
  initMaze();
  resetAllEntities(level);
  ghostModeIdx = 0;
  ghostModeTimer = GHOST_TIMERS[0];
  globalGhostMode = 'scatter';
  sirenStop();
  sirenStop = startSiren(false);
  setState(STATE.READY, 180); // 3-second ready pause
}

function setState(s, timer) {
  state = s;
  stateTimer = timer || 0;
}

function addScore(pts, px, py) {
  score += pts;
  if (score > hiScore) hiScore = score;
  if (px !== undefined) popups.push({ x: px, y: py, text: pts, life: 60 });
}

function killBarney() {
  sirenStop();
  sirenStop = () => {};
  sfxDeath();
  setState(STATE.DEAD, 120); // show death for 2 seconds
  lives--;
}

// ── Ghost mode cycling ────────────────────────────────────────────
function updateGhostMode() {
  if (ghostModeIdx >= GHOST_TIMERS.length) return;
  if (globalGhostMode === 'fright') return; // fright managed per-ghost
  ghostModeTimer--;
  if (ghostModeTimer <= 0) {
    ghostModeIdx++;
    if (ghostModeIdx < GHOST_TIMERS.length) {
      globalGhostMode = ghostModeIdx % 2 === 0 ? 'scatter' : 'chase';
      ghostModeTimer  = GHOST_TIMERS[ghostModeIdx];
    } else {
      globalGhostMode = 'chase';
    }
    // Force direction reversal on mode switch
    ghosts.forEach(g => {
      if (g.mode !== GHOST_MODE.FRIGHT && g.mode !== GHOST_MODE.EATEN &&
          g.mode !== GHOST_MODE.HOUSE  && g.mode !== GHOST_MODE.EXIT) {
        g.mode = globalGhostMode === 'scatter' ? GHOST_MODE.SCATTER : GHOST_MODE.CHASE;
        g.dir = oppDir(g.dir);
      }
    });
  }
}

// ── Collision detection ───────────────────────────────────────────
const HIT_RADIUS = 6; // pixels — slightly forgiving like original

function checkCollisions() {
  // Dot / power-up
  const eaten = eatTile(Barney.col, Barney.row);
  if (eaten === 'dot') {
    addScore(SCORE.dot);
    sfxDot();
  } else if (eaten === 'power') {
    addScore(SCORE.powerUp);
    sfxCoffee();
    sirenStop();
    sirenStop = startSiren(true);
    ghosts.forEach(g => g.frighten(level));
    resetGhostCombo();
    setTimeout(() => {
      sirenStop();
      sirenStop = startSiren(false);
    }, FRIGHT_TIME[Math.min(level, FRIGHT_TIME.length - 1)] * (1000 / 60));
  }

  // Ghost collisions
  const ghostScores = [SCORE.ghost1, SCORE.ghost2, SCORE.ghost3, SCORE.ghost4];
  let comboIdx = 0;
  ghosts.forEach((g) => {
    if (g.mode === GHOST_MODE.HOUSE || g.mode === GHOST_MODE.EXIT) return;
    const dx = g.px - Barney.px, dy = g.py - Barney.py;
    if (Math.abs(dx) < HIT_RADIUS * tileSize / TILE && Math.abs(dy) < HIT_RADIUS * tileSize / TILE) {
      if (g.mode === GHOST_MODE.FRIGHT) {
        const pts = ghostScores[Math.min(comboIdx, 3)];
        addScore(pts, g.px, g.py);
        sfxGhostEaten();
        comboIdx++;
        g.eat();
      } else if (g.mode !== GHOST_MODE.EATEN) {
        killBarney();
      }
    }
  });
}

// ── Main update ───────────────────────────────────────────────────
function update() {
  frameCount++;

  if (state === STATE.READY) {
    stateTimer--;
    if (stateTimer <= 0) setState(STATE.PLAYING);
    return;
  }

  if (state === STATE.DEAD) {
    stateTimer--;
    if (stateTimer <= 0) {
      if (lives <= 0) {
        saveHiScore(score);
        setState(STATE.GAMEOVER, 300);
      } else {
        resetAllEntities(level);
        setState(STATE.READY, 120);
        sirenStop = startSiren(false);
      }
    }
    return;
  }

  if (state === STATE.LEVELUP) {
    if (!updateMazeFlash()) {
      level++;
      beginLevel();
    }
    return;
  }

  if (state === STATE.GAMEOVER) {
    stateTimer--;
    return;
  }

  if (state !== STATE.PLAYING) return;

  // Update ghost global mode
  updateGhostMode();

  // Update entities
  Barney.update();
  const gMode = globalGhostMode === 'scatter' ? GHOST_MODE.SCATTER : GHOST_MODE.CHASE;
  ghosts.forEach(g => g.update(gMode, level));

  // Collisions
  _ghostEatCount = 0;
  checkCollisions();

  // Popups age
  for (let i = popups.length - 1; i >= 0; i--) {
    popups[i].life--;
    popups[i].y -= 0.4;
    if (popups[i].life <= 0) popups.splice(i, 1);
  }

  // Level clear
  if (allDotsEaten()) {
    sirenStop();
    sirenStop = () => {};
    sfxLevelUp();
    startMazeFlash();
    setState(STATE.LEVELUP, 0);
  }
}

// ── Main draw ─────────────────────────────────────────────────────
function draw() {
  ctx.fillStyle = COL.bg;
  ctx.fillRect(0, 0, canvasW, canvasH);

  drawHUD();
  drawMaze(ctx);
  drawMazeFlash(ctx, canvasW, canvasH);

  if (state !== STATE.GAMEOVER && state !== STATE.MENU) {
    ghosts.forEach(g => g.draw(ctx));
    Barney.draw(ctx);
  }

  // Score popups
  popups.forEach(p => {
    ctx.fillStyle = '#FFD700';
    ctx.font = `bold ${Math.max(10, tileSize)}px 'Courier New'`;
    ctx.textAlign = 'center';
    ctx.fillText(p.text, p.x, p.y);
  });

  // Overlay screens
  if (state === STATE.MENU)     drawMenu(ctx, canvasW, canvasH, hiScore);
  if (state === STATE.READY)    drawReady(ctx, canvasW, canvasH);
  if (state === STATE.GAMEOVER) drawGameOver(ctx, canvasW, canvasH, score, hiScore);
}

// ── HUD ───────────────────────────────────────────────────────────
function drawHUD() {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvasW, HUD_H);

  // Score
  ctx.fillStyle = COL.uiGold;
  ctx.font = `bold ${HUD_H * 0.5}px 'Courier New'`;
  ctx.textAlign = 'left';
  ctx.fillText('SCORE: ' + String(score).padStart(7, '0'), 8, HUD_H * 0.7);

  // Hi-score
  ctx.textAlign = 'center';
  ctx.fillText('HI: ' + String(hiScore).padStart(7, '0'), canvasW / 2, HUD_H * 0.7);

  // Lives (small Barney heads using procedural draw)
  const lifeR = HUD_H * 0.36;
  for (let i = 0; i < Math.min(lives, 5); i++) {
    drawBarney(ctx, canvasW - 12 - (i * (lifeR * 2 + 4)), HUD_H / 2, lifeR, DIR.RIGHT, 0);
  }

  // Level indicator
  ctx.fillStyle = COL.uiGold;
  ctx.font = `${HUD_H * 0.38}px 'Courier New'`;
  ctx.textAlign = 'right';
  ctx.fillText('LV ' + level, canvasW - lives * 22 - 10, HUD_H * 0.7);
}

// ── Loop ──────────────────────────────────────────────────────────
function loop() {
  try { update(); } catch(e) { console.error('update error:', e); }
  try { draw();   } catch(e) { console.error('draw error:', e); }
  requestAnimationFrame(loop); // always re-queue — never let a JS error kill the loop
}

// ── Hi-score persistence ──────────────────────────────────────────
function loadHiScore() {
  const v = parseInt(localStorage.getItem('barneyman_hi') || '0', 10);
  hiScore = isNaN(v) ? 0 : v;
}

function saveHiScore(s) {
  if (s > hiScore) {
    hiScore = s;
    localStorage.setItem('barneyman_hi', String(s));
  }
}
