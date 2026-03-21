/* ================================================================
   maze.js — Barney-Man
   Maze state, rendering, dot tracking and collision queries.
   ================================================================ */
'use strict';

// ── Live maze state (copied from template each new game/level) ────
let mazeGrid = [];   // 2D array, mutated when dots eaten
let dotsTotal  = 0;
let dotsEaten  = 0;

function initMaze() {
  mazeGrid = MAZE_TEMPLATE.map(row => [...row]);
  dotsTotal = 0; dotsEaten = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (mazeGrid[r][c] === 2 || mazeGrid[r][c] === 3) dotsTotal++;
}

function eatTile(col, row) {
  const v = mazeGrid[row][col];
  if (v === 2) { mazeGrid[row][col] = 0; dotsEaten++; return 'dot'; }
  if (v === 3) { mazeGrid[row][col] = 0; dotsEaten++; return 'power'; }
  return null;
}

function tileAt(col, row) {
  if (row < 0 || row >= ROWS) return 1; // treat out-of-bounds as wall
  // horizontal wrap for tunnel
  const c = ((col % COLS) + COLS) % COLS;
  return mazeGrid[row][c];
}

function isWall(col, row) {
  const v = tileAt(col, row);
  return v === 1 || v === 4; // wall or ghost-house door (impassable for Barney)
}

function isGhostWall(col, row) {
  return tileAt(col, row) === 1; // ghosts CAN pass through door (4) from inside
}

function allDotsEaten() { return dotsEaten >= dotsTotal; }

// ── Offset of maze within canvas (centred) ────────────────────────
let mazeOffX = 0, mazeOffY = 0, tileSize = TILE;

function setMazeLayout(canvasW, canvasH, hudH) {
  const availH = canvasH - hudH;
  const scaleX = Math.floor(canvasW / COLS);
  const scaleY = Math.floor(availH / ROWS);
  tileSize = Math.min(scaleX, scaleY, TILE * 2); // cap at 2× original
  tileSize = Math.max(tileSize, 8);              // minimum 8px
  mazeOffX = Math.floor((canvasW - tileSize * COLS) / 2);
  mazeOffY = hudH + Math.floor((availH - tileSize * ROWS) / 2);
}

// Pixel centre of a tile
function tileCentre(col, row) {
  return {
    x: mazeOffX + col * tileSize + tileSize / 2,
    y: mazeOffY + row * tileSize + tileSize / 2,
  };
}

// Nearest tile col/row from pixel position
function pixelToTile(px, py) {
  return {
    col: Math.floor((px - mazeOffX) / tileSize),
    row: Math.floor((py - mazeOffY) / tileSize),
  };
}

// ── Wall rendering — draw outline/fill style like classic Pac-Man ─
function drawMaze(ctx) {
  const ts = tileSize;
  // Background
  ctx.fillStyle = COL.bg;
  ctx.fillRect(mazeOffX, mazeOffY, COLS * ts, ROWS * ts);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = mazeGrid[r][c];
      const px = mazeOffX + c * ts;
      const py = mazeOffY + r * ts;

      if (v === 1) {
        // Wall fill
        ctx.fillStyle = '#000033';
        ctx.fillRect(px, py, ts, ts);
        // Wall border lines (classic blue outline)
        ctx.strokeStyle = COL.mazeWall;
        ctx.lineWidth = Math.max(1, ts * 0.12);
        _drawWallBorder(ctx, c, r, px, py, ts);

      } else if (v === 2) {
        // Small dot
        const dotR = Math.max(1.5, ts * 0.12);
        ctx.fillStyle = COL.mazeDot;
        ctx.beginPath();
        ctx.arc(px + ts / 2, py + ts / 2, dotR, 0, Math.PI * 2);
        ctx.fill();

      } else if (v === 3) {
        // Coffee power-up — draw sprite
        const sprScale = Math.max(1, Math.floor(ts / 10));
        drawSprite(ctx, S_COFFEE, px + 1, py + 1, sprScale);

      } else if (v === 4) {
        // Ghost-house door (pink horizontal bar)
        ctx.fillStyle = '#FFB8FF';
        ctx.fillRect(px, py + ts * 0.35, ts, ts * 0.3);

      } else if (v === 5) {
        // Ghost house interior floor
        ctx.fillStyle = '#111';
        ctx.fillRect(px, py, ts, ts);
      }
    }
  }
}

// Only draw border segments where the neighbour IS a wall
// This gives the classic rounded-wall look without thick fills
function _drawWallBorder(ctx, c, r, px, py, ts) {
  const top    = tileAt(c, r-1) === 1;
  const bottom = tileAt(c, r+1) === 1;
  const left   = tileAt(c-1, r) === 1;
  const right  = tileAt(c+1, r) === 1;
  const lw = ctx.lineWidth;
  const half = lw / 2;

  ctx.beginPath();
  // Top edge
  if (!top)    { ctx.moveTo(px, py + half); ctx.lineTo(px + ts, py + half); }
  // Bottom edge
  if (!bottom) { ctx.moveTo(px, py + ts - half); ctx.lineTo(px + ts, py + ts - half); }
  // Left edge
  if (!left)   { ctx.moveTo(px + half, py); ctx.lineTo(px + half, py + ts); }
  // Right edge
  if (!right)  { ctx.moveTo(px + ts - half, py); ctx.lineTo(px + ts - half, py + ts); }
  ctx.stroke();
}

// ── Flash maze (level complete effect) ────────────────────────────
let _flashTimer = 0;
let _flashOn    = false;
function startMazeFlash() { _flashTimer = 60; } // 1 second at 60fps

function updateMazeFlash() {
  if (_flashTimer > 0) {
    _flashTimer--;
    if (_flashTimer <= 0) {
      _flashOn = false;
      return false;
    }
    _flashOn = Math.floor(_flashTimer / 8) % 2 === 0;
    return true;
  }
  _flashOn = false;
  return false;
}

function drawMazeFlash(ctx, canvasW, canvasH) {
  if (!_flashOn) return;
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(0, 0, canvasW, canvasH);
}
