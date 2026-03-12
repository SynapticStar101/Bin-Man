/* ================================================================
   entities.js — Barney-Man
   Barney-Man player + Ghost Barrel AI.
   Movement uses tile-based centre-lock like classic Pac-Man:
   entities travel toward a tile centre, then choose next direction.
   ================================================================ */
'use strict';

const DIRS = [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT];

// ── Helpers ───────────────────────────────────────────────────────
function dist2(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}

function oppDir(d) {
  // Returns the opposite direction object
  const opp = [DIR.DOWN, DIR.UP, DIR.RIGHT, DIR.LEFT];
  const i = DIRS.indexOf(d);
  return i >= 0 ? opp[i] : DIR.NONE;
}

// ── Barney-Man ────────────────────────────────────────────────────
const Barney = {
  px: 0, py: 0,           // pixel position (centre of sprite)
  col: 0, row: 0,         // current tile
  dir: DIR.LEFT,          // current travel direction
  nextDir: DIR.LEFT,      // queued direction from input
  speed: 1.0,             // tiles per frame × tileSize
  chompTick: 0,
  alive: true,
  deathFrame: 0,
  _snapped: false,        // prevents re-snapping to same tile centre every frame

  reset(level) {
    const c = tileCentre(START_BARNEY.col, START_BARNEY.row);
    this.px = c.x; this.py = c.y;
    this.col = START_BARNEY.col;
    this.row = START_BARNEY.row;
    this.dir = DIR.LEFT;
    this.nextDir = DIR.LEFT;
    this.speed = BARNEY_SPEED[Math.min(level, BARNEY_SPEED.length - 1)];
    this.alive = true;
    this.chompTick = 0;
    this.deathFrame = 0;
    this._snapped = false;
  },

  setDir(d) { this.nextDir = d; },

  update() {
    if (!this.alive) return;
    const ts = tileSize;
    const spd = (ts / 10) * this.speed; // cross a tile in ~10 frames at speed 1.0

    // Try to switch to queued direction at tile centre
    const cx = tileCentre(this.col, this.row);
    const nearCentreX = Math.abs(this.px - cx.x) < spd + 0.5;
    const nearCentreY = Math.abs(this.py - cx.y) < spd + 0.5;

    if (nearCentreX && nearCentreY) {
      if (!this._snapped) {
        // Snap to centre (once per tile)
        this._snapped = true;
        this.px = cx.x; this.py = cx.y;

        // Try queued direction
        const nd = this.nextDir;
        const nc = { col: this.col + nd.x, row: this.row + nd.y };
        if (!isWall(nc.col, nc.row)) {
          this.dir = nd;
        }
      }
      // Always block movement into walls, even after snapping
      const fc = { col: this.col + this.dir.x, row: this.row + this.dir.y };
      if (isWall(fc.col, fc.row)) {
        this._snapped = false; // allow re-checking nextDir next frame
        return; // blocked — stay put
      }
    } else {
      this._snapped = false; // left the snap zone — allow snap at next tile
    }

    // Move
    this.px += this.dir.x * spd;
    this.py += this.dir.y * spd;

    // Tunnel wrap
    if (this.row === TUNNEL_ROW) {
      if (this.px < mazeOffX - ts) this.px = mazeOffX + COLS * ts;
      if (this.px > mazeOffX + COLS * ts) this.px = mazeOffX - ts;
    }

    // Update tile from pixel
    const t = pixelToTile(this.px, this.py);
    this.col = ((t.col % COLS) + COLS) % COLS;
    this.row = t.row;

    this.chompTick++;
  },

  draw(ctx) {
    if (!this.alive) return;
    drawBarney(ctx, this.px, this.py, tileSize * 0.48, this.dir, this.chompTick);
  },
};

// ── Ghost Barrel ─────────────────────────────────────────────────
const GHOST_MODE = { SCATTER: 'scatter', CHASE: 'chase', FRIGHT: 'fright', EATEN: 'eaten', HOUSE: 'house', EXIT: 'exit' };

class Ghost {
  constructor(id) {
    this.id = id;
    this.px = 0; this.py = 0;
    this.col = 0; this.row = 0;
    this.dir = DIR.UP;
    this.mode = GHOST_MODE.HOUSE;
    this.frightTimer = 0;
    this.flashPhase = false;
    this.speed = 1.0;
    this.dotCounter = 0;   // dots eaten before this ghost leaves house
    this.dotLimit = [0, 0, 30, 60][id]; // Blinky leaves immediately
    this.exitTimer = 0;
    this._snapped = false;
  }

  reset(level) {
    const s = GHOST_STARTS[this.id];
    const c = tileCentre(s.col, s.row);
    this.px = c.x; this.py = c.y;
    this.col = s.col; this.row = s.row;
    this.dir = this.id === 0 ? DIR.LEFT : (this.id % 2 === 0 ? DIR.UP : DIR.DOWN);
    this.mode = this.id === 0 ? GHOST_MODE.SCATTER : GHOST_MODE.HOUSE;
    this.frightTimer = 0;
    this.flashPhase = false;
    this.speed = GHOST_SPEED[Math.min(level, GHOST_SPEED.length - 1)];
    this.dotCounter = 0;
    this.exitTimer = (this.id === 0) ? 0 : 60 + this.id * 40; // staggered release
    this._snapped = false;
  }

  frighten(level) {
    if (this.mode === GHOST_MODE.EATEN) return;
    this.frightTimer = FRIGHT_TIME[Math.min(level, FRIGHT_TIME.length - 1)];
    if (this.frightTimer > 0) {
      const prevMode = this.mode;
      this.mode = GHOST_MODE.FRIGHT;
      // Reverse direction on fright start
      this.dir = oppDir(this.dir);
      this._prevMode = prevMode;
    }
  }

  eat() {
    this.mode = GHOST_MODE.EATEN;
    this.frightTimer = 0;
  }

  _chooseDir(targetCol, targetRow) {
    // Classic Pac-Man: at each intersection pick the tile closest to target,
    // never reversing, no look-ahead into walls.
    let bestD = null, bestDist = Infinity;
    const rev = oppDir(this.dir);
    for (const d of DIRS) {
      if (d === rev) continue; // no reversal (except on fright start)
      const nc = this.col + d.x;
      const nr = this.row + d.y;
      const wallCheck = this.mode === GHOST_MODE.EATEN ? isGhostWall : isGhostWall;
      if (wallCheck(nc, nr)) continue;
      // Ghosts can't go up into the ghost-house area from normal play
      if (d === DIR.UP && (this.row === 12 || this.row === 15) && (this.col >= 11 && this.col <= 16) && this.mode !== GHOST_MODE.EATEN) continue;
      const dd = dist2(nc, nr, targetCol, targetRow);
      if (dd < bestDist) { bestDist = dd; bestD = d; }
    }
    return bestD || this.dir;
  }

  _getTarget() {
    switch (this.mode) {
      case GHOST_MODE.SCATTER:
        return GHOST_STARTS[this.id].scatter;

      case GHOST_MODE.CHASE: {
        const B = Barney;
        if (this.id === 0) { // Blinky — direct chase
          return { col: B.col, row: B.row };
        }
        if (this.id === 1) { // Pinky — 4 tiles ahead of Barney
          return { col: B.col + B.dir.x * 4, row: B.row + B.dir.y * 4 };
        }
        if (this.id === 2) { // Inky — reflect Blinky through Barney+2
          const pivot = { col: B.col + B.dir.x * 2, row: B.row + B.dir.y * 2 };
          const bk = ghosts[0];
          return { col: pivot.col * 2 - bk.col, row: pivot.row * 2 - bk.row };
        }
        // Clyde — chase when far, scatter when near
        const d2 = dist2(this.col, this.row, B.col, B.row);
        if (d2 > 64) return { col: B.col, row: B.row };
        return GHOST_STARTS[3].scatter;
      }

      case GHOST_MODE.FRIGHT: {
        // Random wandering — pick random valid direction
        return {
          col: this.col + (Math.random() < 0.5 ? -1 : 1) * 5,
          row: this.row + (Math.random() < 0.5 ? -1 : 1) * 5,
        };
      }

      case GHOST_MODE.EATEN:
        return { col: GHOST_EXIT.col, row: GHOST_EXIT.row };

      default:
        return { col: this.col, row: this.row };
    }
  }

  update(globalMode, level) {
    const ts = tileSize;

    // House / exit logic
    if (this.mode === GHOST_MODE.HOUSE) {
      // Bob up and down inside house
      this.py += Math.sin(Date.now() * 0.004) * 0.3;
      this.exitTimer--;
      if (this.exitTimer <= 0) {
        this.mode = GHOST_MODE.EXIT;
        this.dir = DIR.UP;
      }
      return;
    }

    if (this.mode === GHOST_MODE.EXIT) {
      // Move toward exit tile
      const exitC = tileCentre(GHOST_EXIT.col, GHOST_EXIT.row);
      const dx = exitC.x - this.px, dy = exitC.y - this.py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const spd = (ts / 10) * this.speed;
      if (dist < spd) {
        this.px = exitC.x; this.py = exitC.y;
        this.col = GHOST_EXIT.col; this.row = GHOST_EXIT.row;
        this.mode = globalMode === GHOST_MODE.FRIGHT ? GHOST_MODE.FRIGHT : GHOST_MODE.SCATTER;
        this.dir = DIR.LEFT;
        this._snapped = false;
      } else {
        this.px += (dx / dist) * spd;
        this.py += (dy / dist) * spd;
      }
      return;
    }

    // Fright timer countdown
    if (this.mode === GHOST_MODE.FRIGHT) {
      this.frightTimer--;
      this.flashPhase = this.frightTimer < 120 && Math.floor(this.frightTimer / 15) % 2 === 0;
      if (this.frightTimer <= 0) {
        this.mode = globalMode;
        this.flashPhase = false;
      }
    }

    // Eaten — return to house quickly
    if (this.mode === GHOST_MODE.EATEN) {
      const ec = tileCentre(GHOST_EXIT.col, GHOST_EXIT.row);
      const dx = ec.x - this.px, dy = ec.y - this.py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const spd = (ts / 10) * this.speed * 2; // double speed when eaten
      if (dist < spd) {
        // Re-enter house
        this.px = ec.x; this.py = ec.y;
        this.col = GHOST_EXIT.col; this.row = GHOST_EXIT.row;
        this.mode = globalMode;
        this.dir = DIR.DOWN;
        this._snapped = false;
        return;
      }
      // Navigate directly toward exit (ignore normal pathfinding)
      this.px += (dx / dist) * spd;
      this.py += (dy / dist) * spd;
      const t = pixelToTile(this.px, this.py);
      this.col = ((t.col % COLS) + COLS) % COLS;
      this.row = t.row;
      return;
    }

    // Normal movement — tile-centre locked
    const spd = (ts / 10) * (this.mode === GHOST_MODE.FRIGHT ? FRIGHT_SPEED : this.speed);
    const cx = tileCentre(this.col, this.row);
    const nearX = Math.abs(this.px - cx.x) < spd + 0.5;
    const nearY = Math.abs(this.py - cx.y) < spd + 0.5;

    if (nearX && nearY) {
      if (!this._snapped) {
        this._snapped = true;
        this.px = cx.x; this.py = cx.y;
        // Choose next direction
        const target = this._getTarget();
        this.dir = this._chooseDir(target.col, target.row);
      }
    } else {
      this._snapped = false;
    }

    this.px += this.dir.x * spd;
    this.py += this.dir.y * spd;

    // Tunnel wrap
    if (this.row === TUNNEL_ROW) {
      if (this.px < mazeOffX - ts) this.px = mazeOffX + COLS * ts;
      if (this.px > mazeOffX + COLS * ts) this.px = mazeOffX - ts;
    }

    const t = pixelToTile(this.px, this.py);
    this.col = ((t.col % COLS) + COLS) % COLS;
    this.row = t.row;
  }

  draw(ctx) {
    if (this.mode === GHOST_MODE.HOUSE && this.id !== 0) {
      // Draw inside ghost house
    }
    const ts = tileSize;
    const sc = Math.max(1, Math.floor(ts / 8));
    const sprW = S_BARRELS[this.id].d[0].length * sc;
    const sprH = S_BARRELS[this.id].d.length * sc;

    let spr;
    if (this.mode === GHOST_MODE.FRIGHT) {
      spr = this.flashPhase ? S_BARREL_FLASH : S_BARREL_FRIGHT;
    } else if (this.mode === GHOST_MODE.EATEN) {
      // Just draw eyes (small dots)
      ctx.fillStyle = COL.barrelEyes;
      ctx.beginPath(); ctx.arc(this.px - sc, this.py - sc, sc * 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(this.px + sc, this.py - sc, sc * 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COL.barrelPupil;
      ctx.beginPath(); ctx.arc(this.px - sc + 1, this.py - sc + 1, sc * 0.7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(this.px + sc + 1, this.py - sc + 1, sc * 0.7, 0, Math.PI * 2); ctx.fill();
      return;
    } else {
      spr = S_BARRELS[this.id];
    }
    drawSprite(ctx, spr, this.px - sprW / 2, this.py - sprH / 2, sc);
  }
}

// ── Ghost array ───────────────────────────────────────────────────
const ghosts = [new Ghost(0), new Ghost(1), new Ghost(2), new Ghost(3)];

function resetAllEntities(level) {
  Barney.reset(level);
  ghosts.forEach(g => g.reset(level));
  resetGhostCombo();
}
