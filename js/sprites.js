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

// ── drawBarneyHUD — side-view lorry for HUD lives indicator ──────
// Drawn as a clear side-profile so it reads well at small sizes.
function drawBarneyHUD(ctx, cx, cy, r) {
  const w = r * 2.0;   // total length
  const h = r * 1.15;  // total height (body above axle)
  const wr = r * 0.24; // wheel radius

  // Bin body (dark green, rear 60%)
  ctx.fillStyle = '#1B5E20';
  ctx.fillRect(cx - w * 0.5, cy - h * 0.5, w * 0.60, h);

  // Hi-vis stripe
  ctx.fillStyle = COL.hivis;
  ctx.fillRect(cx - w * 0.5, cy - h * 0.08, w * 0.60, h * 0.18);

  // Cab (lighter green, front 40%)
  ctx.fillStyle = '#2E7D32';
  ctx.fillRect(cx + w * 0.10, cy - h * 0.5, w * 0.40, h);

  // Windscreen (blue)
  ctx.fillStyle = '#42A5F5';
  ctx.fillRect(cx + w * 0.16, cy - h * 0.44, w * 0.20, h * 0.50);

  // Front bumper (grey)
  ctx.fillStyle = '#546E7A';
  ctx.fillRect(cx + w * 0.46, cy - h * 0.18, w * 0.04, h * 0.38);

  // Wheels (circles, below body)
  ctx.fillStyle = '#1A1A1A';
  ctx.beginPath(); ctx.arc(cx - w * 0.25, cy + h * 0.5 - wr * 0.4, wr, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + w * 0.28, cy + h * 0.5 - wr * 0.4, wr, 0, Math.PI * 2); ctx.fill();
  // Hubcaps
  ctx.fillStyle = '#777';
  ctx.beginPath(); ctx.arc(cx - w * 0.25, cy + h * 0.5 - wr * 0.4, wr * 0.45, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + w * 0.28, cy + h * 0.5 - wr * 0.4, wr * 0.45, 0, Math.PI * 2); ctx.fill();
}

// ── drawBarney — top-down bin wagon ──────────────────────────────
// Overhead view of a bin lorry facing RIGHT at rot=0.
// Rotated to match travel direction so it looks correct in all 4 dirs.
// r = radius (half tile size used as scale reference)
function drawBarney(ctx, cx, cy, r, dir, _chompTick) {
  let rot = 0;
  if (dir === DIR.LEFT)  rot = Math.PI;
  if (dir === DIR.UP)    rot = -Math.PI / 2;
  if (dir === DIR.DOWN)  rot = Math.PI / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);

  const w = r * 2.0;  // wagon length (x-axis when facing right)
  const h = r * 1.1;  // wagon width  (y-axis)
  const tw = r * 0.28; // tyre block length
  const th = r * 0.18; // tyre block thickness (how far they poke out)

  // Tyres — dark rectangles poking beyond the body sides
  ctx.fillStyle = '#111';
  ctx.fillRect(-w * 0.38, -h * 0.5 - th, tw, th); // rear-left
  ctx.fillRect(-w * 0.38,  h * 0.5,      tw, th); // rear-right
  ctx.fillRect( w * 0.10, -h * 0.5 - th, tw, th); // front-left
  ctx.fillRect( w * 0.10,  h * 0.5,      tw, th); // front-right

  // Bin body (dark green, rear 60%)
  ctx.fillStyle = '#1B5E20';
  ctx.fillRect(-w * 0.5, -h * 0.5, w * 0.60, h);

  // Hi-vis yellow stripe across bin body
  ctx.fillStyle = COL.hivis;
  ctx.fillRect(-w * 0.5, -h * 0.10, w * 0.60, h * 0.20);

  // Cab (lighter green, front 40%)
  ctx.fillStyle = '#2E7D32';
  ctx.fillRect(w * 0.10, -h * 0.5, w * 0.40, h);

  // Windscreen (blue, sits inside cab area)
  ctx.fillStyle = '#42A5F5';
  ctx.fillRect(w * 0.22, -h * 0.36, w * 0.18, h * 0.72);

  // Front bumper (grey strip at nose)
  ctx.fillStyle = '#546E7A';
  ctx.fillRect(w * 0.45, -h * 0.22, w * 0.05, h * 0.44);

  ctx.restore();
}
