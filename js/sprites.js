/* ================================================================
   sprites.js — Barney-Man
   Pixel art sprite definitions.
   Grid numbers map to palette colours; 0 = transparent.
   Each sprite pixel renders at TILE/2 = 8px (scaled by drawSprite).
   ================================================================ */
'use strict';

// ── Utility: draw a sprite grid onto a canvas context ─────────────
// spr  = { pal:{1:'#hex',...}, d:[[row],[row],...] }
// scale = pixel size multiplier (default 1 → raw pixel)
function drawSprite(ctx, spr, x, y, scale, flipX) {
  const sc = scale || 1;
  const rows = spr.d, pal = spr.pal;
  const W = rows[0].length;
  ctx.save();
  if (flipX) {
    ctx.translate(x + W * sc, y);
    ctx.scale(-1, 1);
    x = 0; y = 0;
  }
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const v = rows[r][c];
      if (!v) continue;
      ctx.fillStyle = pal[v];
      ctx.fillRect(
        (flipX ? 0 : x) + c * sc,
        (flipX ? 0 : y) + r * sc,
        sc, sc
      );
    }
  }
  ctx.restore();
}

// ── Barney-Man (side-view head, 14 wide × 12 tall pixels) ─────────
// Viewed from the right — mouth opens/closes like Pac-Man.
// We draw 3 mouth states: closed (chomp A), wide open (chomp B), half (chomp C)
const PAL_BARNEY = {
  1: COL.skin,       // face skin
  2: COL.skinDk,     // shadow/jaw
  3: COL.hair,       // dark hair
  4: COL.hairMd,     // mid hair
  5: COL.hivis,      // hi-vis cap brim
  6: COL.hivOrg,     // cap body
  7: COL.eyeWhite,   // eye white
  8: COL.eye,        // iris
  9: COL.pupil,      // pupil
  A: COL.mouthInner, // mouth cavity  (hex A = 10)
  B: COL.teeth,      // teeth
};
// alias numeric key for 10 (A) since JS object keys are strings anyway
PAL_BARNEY[10] = COL.mouthInner;
PAL_BARNEY[11] = COL.teeth;

// Chomp WIDE OPEN — facing RIGHT
const S_BARNEY_OPEN_R = { pal: PAL_BARNEY, d: [
  [0,0,3,3,3,4,4,4,3,3,0,0,0,0],
  [0,3,4,4,4,5,5,5,5,4,3,0,0,0],
  [3,4,1,1,1,6,6,6,6,1,1,0,0,0],
  [1,1,7,7,1,1,1,1,1,1,1,1,0,0],
  [1,1,8,9,1,1,1,1,1,1,1,1,10,0],
  [1,1,7,7,1,1,1,1,1,1,1,10,10,0],
  [2,1,1,1,1,1,1,1,1,1,10,10,0,0],
  [2,2,1,1,1,1,1,1,1,10,10,0,0,0],
  [0,2,2,1,1,1,1,11,11,0,0,0,0,0],
  [0,0,2,2,2,2,2,2,0,0,0,0,0,0],
  [0,0,0,2,2,2,2,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
]};

// Chomp HALF OPEN — facing RIGHT
const S_BARNEY_HALF_R = { pal: PAL_BARNEY, d: [
  [0,0,3,3,3,4,4,4,3,3,0,0,0,0],
  [0,3,4,4,4,5,5,5,5,4,3,0,0,0],
  [3,4,1,1,1,6,6,6,6,1,1,1,0,0],
  [1,1,7,7,1,1,1,1,1,1,1,1,0,0],
  [1,1,8,9,1,1,1,1,1,1,1,1,10,0],
  [1,1,7,7,1,1,1,1,1,1,1,1,10,0],
  [2,1,1,1,1,1,1,1,1,1,1,11,0,0],
  [2,2,1,1,1,1,1,1,1,1,11,0,0,0],
  [0,2,2,2,1,1,1,1,2,2,0,0,0,0],
  [0,0,2,2,2,2,2,2,0,0,0,0,0,0],
  [0,0,0,2,2,2,2,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
]};

// Chomp CLOSED — facing RIGHT
const S_BARNEY_CLOSED_R = { pal: PAL_BARNEY, d: [
  [0,0,3,3,3,4,4,4,3,3,0,0,0,0],
  [0,3,4,4,4,5,5,5,5,4,3,0,0,0],
  [3,4,1,1,1,6,6,6,6,1,1,1,0,0],
  [1,1,7,7,1,1,1,1,1,1,1,1,1,0],
  [1,1,8,9,1,1,1,1,1,1,1,1,1,0],
  [1,1,7,7,1,1,1,1,1,1,1,1,1,0],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [2,2,1,1,1,1,1,1,1,1,11,11,0,0],
  [0,2,2,2,2,1,1,11,11,2,2,0,0,0],
  [0,0,2,2,2,2,2,2,0,0,0,0,0,0],
  [0,0,0,2,2,2,2,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
]};

// Death spin frames (round head shrinking — 4 frames)
const S_BARNEY_DEAD = [S_BARNEY_CLOSED_R, S_BARNEY_HALF_R, S_BARNEY_OPEN_R, S_BARNEY_HALF_R];

// ── Ghost Barrel sprites (8×10 per barrel, colour swapped per ghost) ──
// Base shape — colour 1 = barrel body, 2 = barrel dark band, 3 = highlight
// Googly eyes: 4 = white, 5 = pupil.  Legs/skirt: 6 = wavy bottom
function makeBarrelSprite(bodyCol, bandCol, hlCol) {
  return {
    pal: {
      1: bodyCol,
      2: bandCol,
      3: hlCol,
      4: COL.barrelEyes,
      5: COL.barrelPupil,
      6: bandCol,
    },
    d: [
      [0,1,1,1,1,1,1,0],
      [1,1,3,1,1,1,1,1],
      [1,1,1,1,1,1,1,1],
      [1,4,4,1,1,4,4,1],
      [1,4,5,1,1,4,5,1],
      [1,4,4,1,1,4,4,1],
      [2,2,2,2,2,2,2,2],
      [1,1,1,1,1,1,1,1],
      [1,2,1,2,1,2,1,2],  // wavy skirt
      [0,1,0,1,0,1,0,0],
    ],
  };
}

// Frightened barrel (flashing blue / white)
const S_BARREL_FRIGHT = {
  pal: { 1: COL.barrelFright, 2: '#003080', 3: '#5599FF', 4: '#FFFFFF', 5: '#FF4444', 6: '#003080' },
  d: [
    [0,1,1,1,1,1,1,0],
    [1,1,3,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [1,4,4,1,1,4,4,1],
    [1,4,5,1,1,4,5,1],
    [1,4,4,1,1,4,4,1],
    [2,2,2,2,2,2,2,2],
    [1,1,1,1,1,1,1,1],
    [1,2,1,2,1,2,1,2],
    [0,1,0,1,0,1,0,0],
  ],
};
const S_BARREL_FLASH = {
  pal: { 1: '#FFFFFF', 2: '#AAAAAA', 3: '#EEEEEE', 4: '#FFFFFF', 5: '#0000AA', 6: '#AAAAAA' },
  d: S_BARREL_FRIGHT.d,
};

// Four ghost barrels
const S_BARRELS = [
  makeBarrelSprite(COL.barrel1, '#AA0000', '#FF8888'), // Red
  makeBarrelSprite(COL.barrel2, '#005599', '#88CCFF'), // Blue
  makeBarrelSprite(COL.barrel3, '#AA5500', '#FFCC66'), // Orange
  makeBarrelSprite(COL.barrel4, '#006600', '#66EE66'), // Green
];

// ── Coffee power-up (8×10 pixels) ─────────────────────────────────
const S_COFFEE = {
  pal: {
    1: COL.coffeeMug,
    2: '#8B4513',
    3: COL.coffeeAmt,
    4: '#FFF8DC',
    5: COL.coffeeSteam,
    6: '#FFFFFF',
  },
  d: [
    [0,5,0,5,0,5,0,0],
    [0,5,5,5,5,0,0,0],
    [1,1,1,1,1,1,6,0],
    [1,3,3,3,3,1,6,0],
    [1,3,4,3,3,1,6,0],
    [1,3,3,3,3,1,0,0],
    [1,2,2,2,2,1,0,0],
    [0,1,1,1,1,1,0,0],
    [0,2,1,1,1,2,0,0],
    [0,0,2,2,2,0,0,0],
  ],
};

// ── Small dot (2×2 px drawn directly, no sprite needed) ───────────
// ── getBarneyFrame kept for HUD menu sprite fallback ──────────────
function getBarneyFrame(chompTick) {
  return S_BARNEY_CLOSED_R; // used only on menu/hud pixel sprites
}

// ── drawBarney — procedural arc-based drawing ─────────────────────
// Looks like a side-view of Barney's head with Pac-Man style chomping mouth.
// cx,cy = centre pixel, radius = half the tile size, dir = DIR.*, chompTick = frame counter
function drawBarney(ctx, cx, cy, radius, dir, chompTick) {
  // Mouth angle oscillates: wide open → closed → wide open (16-frame cycle)
  const t = chompTick % 16;
  let mouthFrac; // 0 = closed, 1 = wide open
  if (t < 4)       mouthFrac = t / 4;            // opening
  else if (t < 8)  mouthFrac = 1 - (t - 4) / 4; // closing
  else if (t < 12) mouthFrac = 0;                // closed
  else             mouthFrac = (t - 12) / 4;     // opening again
  const mouthAngle = mouthFrac * 0.28 * Math.PI; // max ~50° opening

  // Rotation so mouth always faces travel direction
  let rot = 0;
  if (dir === DIR.LEFT)  rot = Math.PI;
  if (dir === DIR.UP)    rot = -Math.PI / 2;
  if (dir === DIR.DOWN)  rot = Math.PI / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);

  const r = radius;

  // ── Face (skin) — Pac-Man arc with mouth wedge cut out ──
  ctx.fillStyle = COL.skin;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, r, mouthAngle, Math.PI * 2 - mouthAngle);
  ctx.closePath();
  ctx.fill();

  // ── Darker chin/jaw lower half ──
  ctx.fillStyle = COL.skinDk;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, r, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.closePath();
  ctx.fill();

  // Redraw upper face over the chin tint
  ctx.fillStyle = COL.skin;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, r, -Math.PI, 0);
  ctx.closePath();
  ctx.fill();

  // Re-apply mouth cut so it shows through
  if (mouthAngle > 0.01) {
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r + 1, -mouthAngle, mouthAngle);
    ctx.closePath();
    ctx.fill();
  }

  // ── Hi-vis cap — arc across the top of the head ──
  ctx.fillStyle = COL.hivis;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, r, -Math.PI * 0.85, -Math.PI * 0.15);
  ctx.closePath();
  ctx.fill();

  // Cap peak / brim (small rectangle poking forward at -top-right)
  ctx.fillStyle = COL.hivOrg;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.18, -Math.PI * 0.22, -Math.PI * 0.08);
  ctx.lineTo(r * 0.9, -r * 0.05);
  ctx.closePath();
  ctx.fill();

  // Dark hair peeking below cap brim
  ctx.fillStyle = COL.hair;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.92, -Math.PI * 0.84, -Math.PI * 0.16);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  // ── Eye (white + iris + pupil) ──
  const ex = r * 0.22, ey = -r * 0.28;
  ctx.fillStyle = COL.eyeWhite;
  ctx.beginPath();
  ctx.arc(ex, ey, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COL.eye;
  ctx.beginPath();
  ctx.arc(ex + r * 0.06, ey, r * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COL.pupil;
  ctx.beginPath();
  ctx.arc(ex + r * 0.08, ey, r * 0.06, 0, Math.PI * 2);
  ctx.fill();

  // ── Mouth interior (red) when open ──
  if (mouthAngle > 0.04) {
    ctx.fillStyle = COL.mouthInner;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r * 0.92, -mouthAngle * 0.8, mouthAngle * 0.8);
    ctx.closePath();
    ctx.fill();
    // Teeth (white strip at mouth edge)
    ctx.fillStyle = COL.teeth;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.88, -mouthAngle * 0.3, mouthAngle * 0.3);
    ctx.lineTo(r * 0.5, 0);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}
