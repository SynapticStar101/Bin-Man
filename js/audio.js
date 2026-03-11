/* ================================================================
   audio.js — Barney-Man
   Web Audio API sound engine. All sounds synthesised in code —
   no external files needed.  Sounds match classic Pac-Man as
   closely as possible using oscillators and noise buffers.
   ================================================================ */
'use strict';

let _actx = null;
function getACtx() {
  if (!_actx) _actx = new (window.AudioContext || window.webkitAudioContext)();
  // Resume on user gesture (Safari / iOS)
  if (_actx.state === 'suspended') _actx.resume();
  return _actx;
}

// ── Master mute ───────────────────────────────────────────────────
let _muted = false;
function toggleMute() { _muted = !_muted; return _muted; }
function isMuted()    { return _muted; }

// ── Core helpers ──────────────────────────────────────────────────
function osc(type, freq, start, dur, gainVal, ctx, dest) {
  if (_muted) return;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gainVal, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  g.connect(dest || ctx.destination);
  const o = ctx.createOscillator();
  o.type = freq > 0 ? type : 'sine';
  o.frequency.setValueAtTime(Math.abs(freq), start);
  o.connect(g);
  o.start(start);
  o.stop(start + dur + 0.01);
}

function sweep(type, f0, f1, start, dur, gainVal, ctx, dest) {
  if (_muted) return;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gainVal, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  g.connect(dest || ctx.destination);
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, start);
  o.frequency.exponentialRampToValueAtTime(f1, start + dur);
  o.connect(g);
  o.start(start);
  o.stop(start + dur + 0.01);
}

// ── Pac-Man style sounds ───────────────────────────────────────────

// Waka-waka dot eat — alternating pitch each call
let _wakaToggle = false;
function sfxDot() {
  const ctx = getACtx();
  const t = ctx.currentTime;
  const f = _wakaToggle ? 220 : 180;
  _wakaToggle = !_wakaToggle;
  sweep('square', f * 2, f, t, 0.06, 0.18, ctx);
}

// Coffee power-up pickup — classic Pac-Man energiser ascending arpeggio
function sfxCoffee() {
  const ctx = getACtx();
  const t = ctx.currentTime;
  const notes = [349, 523, 698, 880, 1047];
  notes.forEach((f, i) => {
    sweep('square', f, f * 1.5, t + i * 0.06, 0.12, 0.25, ctx);
  });
}

// Ghost eaten — classic descending sweep + crunch
let _ghostEatCombo = 0;
function sfxGhostEaten() {
  const ctx = getACtx();
  const t = ctx.currentTime;
  // Score jingle pitch rises with combo
  const baseF = 600 + _ghostEatCombo * 200;
  sweep('square', baseF * 2, baseF * 0.5, t, 0.25, 0.3, ctx);
  osc('sawtooth', baseF * 0.8, t + 0.05, 0.15, 0.2, ctx);
  _ghostEatCombo = Math.min(_ghostEatCombo + 1, 3);
}
function resetGhostCombo() { _ghostEatCombo = 0; }

// Death — classic Pac-Man descending death tune
function sfxDeath() {
  const ctx = getACtx();
  const t = ctx.currentTime;
  // Classic Pac-Man death: rapid descending chromatic
  const freqs = [
    494, 466, 440, 415, 392, 370, 349, 330, 311, 294, 277, 262,
    247, 233, 220, 208, 196, 185, 175, 165,
  ];
  freqs.forEach((f, i) => {
    osc('square', f, t + i * 0.04, 0.05, 0.22, ctx);
  });
  // Final low thud
  sweep('sawtooth', 150, 40, t + freqs.length * 0.04, 0.3, 0.3, ctx);
}

// Level complete — classic intermission style ascending fanfare
function sfxLevelUp() {
  const ctx = getACtx();
  const t = ctx.currentTime;
  const melody = [
    [523,0.12],[659,0.12],[784,0.12],[1047,0.20],
    [784,0.10],[1047,0.35],
  ];
  let at = t;
  melody.forEach(([f, d]) => {
    osc('square', f, at, d, 0.28, ctx);
    at += d + 0.02;
  });
}

// Game start jingle — classic Pac-Man opening theme approximation
function sfxGameStart() {
  const ctx = getACtx();
  const t = ctx.currentTime;
  // Pac-Man intro: B4-B4-B4 G4 B4 D5-D5 G4 D5-D5
  const seq = [
    [494,0.12],[494,0.12],[494,0.12],[392,0.12],
    [494,0.24],[587,0.12],[587,0.12],
    [392,0.12],[587,0.36],
  ];
  let at = t;
  seq.forEach(([f, d]) => {
    osc('square', f, at, d, 0.25, ctx);
    // bass harmony
    osc('triangle', f * 0.5, at, d, 0.12, ctx);
    at += d + 0.01;
  });
}

// Extra life
function sfxExtraLife() {
  const ctx = getACtx();
  const t = ctx.currentTime;
  [523,659,784,1047,1319].forEach((f, i) => {
    osc('square', f, t + i * 0.07, 0.1, 0.22, ctx);
  });
}

// Siren (ghost chase) — looping background wail
// Returns a stop function
function startSiren(frightened) {
  if (_muted) return () => {};
  const ctx = getACtx();
  let running = true;
  let t = ctx.currentTime;
  const lo = frightened ? 180 : 340;
  const hi = frightened ? 260 : 480;

  function pulse() {
    if (!running || _muted) return;
    const now = ctx.currentTime;
    sweep('square', lo, hi, now, 0.18, 0.06, ctx);
    setTimeout(pulse, frightened ? 300 : 180);
  }
  pulse();
  return function stop() { running = false; };
}
