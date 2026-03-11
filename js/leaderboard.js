/* ================================================================
   leaderboard.js — Barney-Man
   Universal high score board.

   Storage strategy (two-tier, no back-end cost):
   1. LOCAL  — localStorage always available, instant.
   2. GLOBAL — JSONBin.io (free tier, no auth needed to READ,
               free API key for WRITE — set JSONBIN_KEY below).
               Falls back gracefully if offline or key missing.

   To enable global scores:
   1. Sign up free at https://jsonbin.io
   2. Create a bin with initial content: { "scores": [] }
   3. Paste your Master Key and Bin ID below.
   ================================================================ */
'use strict';

// ── Config (fill these in to enable global board) ─────────────────
const JSONBIN_KEY = '';          // e.g. '$2a$10$YSA/goXajxiUpmsaEbKcce.au39jBu0vihJ/2fYq/Aex0QdsyFBHS'
const JSONBIN_BIN = '';          // e.g. '69b1faefb7ec241ddc5f1932'
const JSONBIN_BASE = 'https://api.jsonbin.io/v3/b';

const MAX_SCORES = 10;
const LS_KEY = 'barneyman_scores';

// ── Local leaderboard ─────────────────────────────────────────────
function getLocalScores() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function saveLocalScore(name, pts) {
  const scores = getLocalScores();
  scores.push({ name: name.substring(0, 12).toUpperCase(), score: pts, date: Date.now() });
  scores.sort((a, b) => b.score - a.score);
  scores.splice(MAX_SCORES);
  localStorage.setItem(LS_KEY, JSON.stringify(scores));
  return scores;
}

function isHighScore(pts) {
  const scores = getLocalScores();
  return scores.length < MAX_SCORES || pts > (scores[scores.length - 1]?.score ?? 0);
}

// ── Global leaderboard (JSONBin.io) ───────────────────────────────
async function fetchGlobalScores() {
  if (!JSONBIN_KEY || !JSONBIN_BIN) return null;
  try {
    const res = await fetch(`${JSONBIN_BASE}/${JSONBIN_BIN}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_KEY },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.record?.scores) ? data.record.scores : null;
  } catch { return null; }
}

async function pushGlobalScore(name, pts) {
  if (!JSONBIN_KEY || !JSONBIN_BIN) return;
  try {
    // Read current
    const current = await fetchGlobalScores() || [];
    current.push({ name: name.substring(0, 12).toUpperCase(), score: pts, date: Date.now() });
    current.sort((a, b) => b.score - a.score);
    current.splice(MAX_SCORES);

    await fetch(`${JSONBIN_BASE}/${JSONBIN_BIN}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_KEY,
      },
      body: JSON.stringify({ scores: current }),
    });
  } catch { /* silent fail — local score already saved */ }
}

// ── Name-entry UI ─────────────────────────────────────────────────
// Inject overlay HTML if not already present
function ensureNameOverlay() {
  if (document.getElementById('nameOverlay')) return;
  const div = document.createElement('div');
  div.id = 'nameOverlay';
  div.innerHTML = `
    <div id="nameBox">
      <h2>NEW HIGH SCORE!</h2>
      <p id="nameScoreDisplay" style="color:#FFD700;margin-bottom:12px;font-size:18px;"></p>
      <input id="nameInput" maxlength="12" placeholder="YOUR NAME" autocomplete="off" spellcheck="false">
      <button id="nameSubmit">SUBMIT</button>
    </div>`;
  document.body.appendChild(div);
}

function promptForName(pts, onDone) {
  ensureNameOverlay();
  const overlay = document.getElementById('nameOverlay');
  const input = document.getElementById('nameInput');
  const display = document.getElementById('nameScoreDisplay');
  const btn = document.getElementById('nameSubmit');

  display.textContent = 'SCORE: ' + pts;
  input.value = '';
  overlay.classList.add('show');
  input.focus();

  function submit() {
    const name = input.value.trim() || 'BARNEY';
    overlay.classList.remove('show');
    saveLocalScore(name, pts);
    pushGlobalScore(name, pts);
    onDone(name);
  }

  btn.onclick = submit;
  input.onkeydown = e => { if (e.key === 'Enter') submit(); };
}

// ── Merged leaderboard for display ────────────────────────────────
// Returns local scores immediately; async-fetches global and calls cb
function getDisplayScores(cb) {
  const local = getLocalScores();
  cb(local, false); // immediate local display

  fetchGlobalScores().then(global => {
    if (!global) return;
    // Merge: keep highest score per name
    const merged = [...local];
    global.forEach(g => {
      if (!merged.find(l => l.name === g.name && l.score === g.score)) {
        merged.push(g);
      }
    });
    merged.sort((a, b) => b.score - a.score);
    merged.splice(MAX_SCORES);
    cb(merged, true);
  });
}
