/* ================================================================
   config.js — Barney-Man
   All constants, colours, tile definitions and maze blueprints.
   ================================================================ */
'use strict';

// ── Canvas / tile dimensions ──────────────────────────────────────
const TILE   = 16;      // px per maze tile (logical)
const COLS   = 28;      // classic Pac-Man maze width in tiles
const ROWS   = 31;      // classic Pac-Man maze height in tiles

// ── Colour palette (matches Barney universe) ──────────────────────
const COL = {
  // Maze
  mazeWall:   '#1565C0',   // classic blue wall
  mazeDot:    '#FFB8AE',   // small pellet
  bg:         '#000000',

  // Barney-Man (side-view head, open mouth = pac-man arc)
  skin:       '#FFCC99',
  skinDk:     '#E0A070',
  hair:       '#5C3317',
  hairMd:     '#8B5E3C',
  hivis:      '#FFD700',
  hivOrg:     '#FF8C00',
  eye:        '#1565C0',
  eyeWhite:   '#FFFFFF',
  pupil:      '#000000',
  mouthInner: '#CC2200',
  teeth:      '#FFFFF0',

  // Ghost barrels (primary colours)
  barrel1:    '#FF3333',   // Red barrel  – Blinky equivalent
  barrel2:    '#33AAFF',   // Blue barrel – Pinky equivalent
  barrel3:    '#FF9900',   // Orange barrel – Inky equivalent
  barrel4:    '#33CC33',   // Green barrel – Clyde equivalent
  barrelFright:'#1E90FF',  // frightened flash blue
  barrelFlash: '#FFFFFF',  // frightened flash white
  barrelEyes:  '#FFFFFF',  // googly eye whites
  barrelPupil: '#000000',

  // Coffee power-up
  coffeeMug:  '#6D3B2E',
  coffeeAmt:  '#C07028',
  coffeeSteam:'#CCCCCC',

  // UI
  uiGold:  '#FFD700',
  uiRed:   '#F44336',
  uiGreen: '#4CAF50',
  uiBlue:  '#2196F3',
  uiPanel: 'rgba(0,0,0,0.85)',
  uiText:  '#FFFFFF',
};

// ── Scoring ────────────────────────────────────────────────────────
const SCORE = {
  dot:        10,
  powerUp:    50,
  ghost1:     200,
  ghost2:     400,
  ghost3:     800,
  ghost4:    1600,   // combo multiplier for consecutive ghost eats
};

// ── Ghost speed profiles per level ────────────────────────────────
// fraction of tile-per-frame
const GHOST_SPEED = [0, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.80, 0.80, 0.80];
const BARNEY_SPEED= [0, 0.60, 0.65, 0.67, 0.70, 0.72, 0.75, 0.75, 0.75, 0.75];
const FRIGHT_TIME = [0,  360,  300,  240,  180,  120,   60,    5,    5,    5]; // frames
const FRIGHT_SPEED= 0.50;  // ghost speed when frightened

// ── Ghost behaviour timers (frames) scatter / chase alternating ───
// pattern: [scatter, chase, scatter, chase, scatter, chase, scatter, chase(∞)]
const GHOST_TIMERS = [
  7*60, 20*60,
  7*60, 20*60,
  5*60, 20*60,
  5*60, Infinity,
];

// ── Ghost names (for AI targeting) ────────────────────────────────
const GHOST_ID = { BLINKY:0, PINKY:1, INKY:2, CLYDE:3 };

// ── Directions ────────────────────────────────────────────────────
const DIR = {
  NONE:  { x:  0, y:  0, idx: -1 },
  UP:    { x:  0, y: -1, idx:  0 },
  DOWN:  { x:  0, y:  1, idx:  1 },
  LEFT:  { x: -1, y:  0, idx:  2 },
  RIGHT: { x:  1, y:  0, idx:  3 },
};
const DIR_OPPOSITE = [1, 0, 3, 2]; // UP↔DOWN, LEFT↔RIGHT

// ── Maze blueprint ─────────────────────────────────────────────────
// 0=empty path, 1=wall, 2=dot, 3=power-up(coffee), 4=ghost-house door, 5=ghost-house interior
// Classic 28×31 Pac-Man layout (faithful reproduction)
const MAZE_TEMPLATE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,3,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,3,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
  [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,1,1,5,5,1,1,1,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,5,5,5,5,5,5,1,0,1,1,2,1,1,1,1,1,1],
  [0,0,0,0,0,0,2,0,0,0,1,5,5,5,5,5,5,1,0,0,0,2,0,0,0,0,0,0],
  [1,1,1,1,1,1,2,1,1,0,1,5,5,5,5,5,5,1,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,1,1,4,4,1,1,1,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
  [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,3,2,2,1,1,2,2,2,2,2,2,2,0,0,2,2,2,2,2,2,2,1,1,2,2,3,1],
  [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
  [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
  [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
  [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// Starting positions (tile col, tile row)
const START_BARNEY = { col: 14, row: 23, dir: DIR.LEFT };
const GHOST_STARTS = [
  { col: 14, row: 11, scatter: { col: 25, row: 0  } }, // Blinky (red)
  { col: 13, row: 14, scatter: { col:  2, row: 0  } }, // Pinky (blue)
  { col: 14, row: 14, scatter: { col: 27, row: 30 } }, // Inky  (orange)
  { col: 15, row: 14, scatter: { col:  0, row: 30 } }, // Clyde (green)
];
// Tile where ghosts exit the house
const GHOST_EXIT = { col: 14, row: 11 };

// Tunnel (wrap-around) rows
const TUNNEL_ROW = 14;
