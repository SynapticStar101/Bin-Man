# Devlog: Building Barney-Man — A Retro Arcade Game in Vanilla JavaScript

> **Part of our Retro Arcade Series** | Published March 2026

---

## What Is Barney-Man?

Barney-Man is our latest entry in the retro arcade series — a Pac-Man-style maze game built entirely in vanilla JavaScript, HTML5 Canvas, and CSS. No frameworks, no build tools, no dependencies. Just a browser and about 1,500 lines of hand-crafted code.

The twist: instead of a yellow ball eating dots in a maze, you play as **Barney** — a bin lorry driver navigating a rubbish-strewn estate, collecting dots while dodging coloured hazard barrels. Eat a coffee power-up and the barrels turn blue and run scared.

This post walks through the full development journey, every bug we hit, every design decision we made, and the lessons learned along the way. Whether you're learning JavaScript or just curious how a retro arcade game gets built from scratch, there's something here for you.

---

## The Architecture: Keeping It Simple

Before writing a single line of game logic, we made a deliberate choice: **no bundlers, no frameworks, no npm**. The entire game loads from a single `index.html` with eight script tags in dependency order:

```
config.js → sprites.js → audio.js → maze.js → entities.js → leaderboard.js → ui.js → game.js
```

Each file has a single clear responsibility. This is an old-school approach, and it has real advantages when learning:

- You can open DevTools and read everything directly
- There's no abstraction hiding what the browser is actually doing
- Load order is explicit — you can see the dependency graph just by reading the HTML

**Key lesson:** Constraints breed clarity. When you can't hide complexity behind a module bundler, you're forced to think carefully about what belongs where.

---

## The Game Loop

The heart of any real-time game is its loop. Ours uses `requestAnimationFrame`:

```javascript
function loop(now) {
  if (now - _prevTime >= 16) { // cap at ~60fps
    _prevTime = now;
    update();
    draw();
  }
  requestAnimationFrame(loop);
}
```

There's an important detail here: the **16ms delta cap**. Without it, the game runs at whatever refresh rate the monitor uses — 60Hz, 120Hz, 144Hz. On a 120Hz screen, `requestAnimationFrame` fires twice as often, and a naive loop would run the game at double speed. By checking the elapsed time and only updating when at least 16ms have passed, we get consistent 60fps gameplay on any display.

We also wrap both `update()` and `draw()` in try/catch blocks and always re-queue `requestAnimationFrame` — even if there's a JavaScript error. This means a bug in one frame won't kill the loop entirely. The game keeps running; you fix the bug in DevTools.

**Key lesson:** Never drive game speed from frame count alone. Always gate your logic on real elapsed time.

---

## The State Machine

Games live and die by their state machines. Ours has six states:

```javascript
const STATE = {
  MENU:     'menu',
  READY:    'ready',
  PLAYING:  'playing',
  DEAD:     'dead',
  LEVELUP:  'levelup',
  GAMEOVER: 'gameover',
};
```

The `update()` function checks the current state first and routes accordingly. Each state handles its own timer, transition logic, and what input it accepts. This keeps game logic clean — there are no `if (gameStarted && !dead && !paused)` chains littered through the code.

**Key lesson:** Model your game as a state machine from day one. Adding states later is easy; untangling interleaved flags is not.

---

## Building the Maze

The maze is a faithful 28×31 reproduction of the classic Pac-Man layout, stored as a 2D array of integers:

```
0 = empty path
1 = wall
2 = dot
3 = power-up (coffee mug)
4 = ghost-house door
5 = ghost-house interior
```

On each new level, `initMaze()` deep-copies the template so dots can be eaten without mutating the original. This is a simple but important pattern — never mutate your source data.

Wall rendering uses a border-based approach rather than filled squares. For each wall tile, we check its four neighbours and only draw the edge lines that face open space. This gives the classic rounded-wall look without needing separate corner sprites for every wall configuration.

```javascript
if (!top)    { ctx.moveTo(px, py + half); ctx.lineTo(px + ts, py + half); }
if (!bottom) { ctx.moveTo(px, py + ts - half); ctx.lineTo(px + ts, py + ts - half); }
// ...and so on for left/right
```

**Key lesson:** Check neighbour tiles to decide how to draw a tile. It's far cheaper than maintaining a separate edge/corner sprite atlas.

---

## Sprite System: Pixel Art in a Grid

Sprites are defined as 2D arrays of palette indices, with a separate colour map. Zero means transparent.

```javascript
const S_BARREL_FRIGHT = {
  pal: { 1: '#1E90FF', 2: '#003080', 3: '#5599FF', 4: '#FFFFFF', 5: '#FF4444' },
  d: [
    [0,1,1,1,1,1,1,0],
    [1,1,3,1,1,1,1,1],
    // ...
  ],
};
```

The `drawSprite()` function iterates the grid and calls `ctx.fillRect()` for each non-zero pixel, scaled by a multiplier so sprites look crisp at any tile size. It also supports horizontal flipping via a canvas transform — useful for making a sprite face left or right without needing two separate definitions.

This system has one big advantage over image files: sprites are pure data. You can read them, modify them, and understand exactly what every pixel does without opening an art tool.

**Key lesson:** Pixel-art sprites as data arrays are a great starting point. They're readable, version-controllable, and require zero external tooling.

---

## Barney: A Character Design Journey

Getting the player character right took several iterations, and it's one of the most instructive parts of the build.

### Attempt 1: Procedural Arc Head
The first Barney was drawn entirely in code — a Pac-Man-style chomping head made from arcs and bezier curves. It worked, but it was slow to iterate on (every tweak meant mentally mapping code to pixels) and the HUD rendering at small sizes looked like a blob.

### Attempt 2: Pixel-Art Side Profile
We switched to a pixel-art sprite: a 14×12 grid side-view head in a high-vis cap — think Pac-Man but clearly a construction worker. Three mouth states (open, half, closed) were defined separately and cycled based on a `chompTick` counter. Much more readable in code and much crisper on screen.

### Attempt 3: Top-Down Bin Lorry (Current)
The final design is a top-down bin wagon that rotates to face the direction of movement. The sprite is drawn procedurally (roads, cab, bins) and rotated using `ctx.save() / ctx.translate() / ctx.rotate() / ctx.restore()`. The HUD lives indicator uses a separate side-profile drawing so it reads clearly at small sizes.

**Key lesson:** Plan for iteration. Your first character design will probably not be your last. Keep the drawing code isolated so you can swap it out without touching game logic.

---

## Ghost AI: Four Personalities

The four ghost barrels follow the classic Pac-Man personality system:

| Ghost | Colour | Behaviour |
|-------|--------|-----------|
| Blinky | Red | Targets Barney's exact position — always chasing |
| Pinky | Blue | Targets 4 tiles ahead of Barney — tries to cut off |
| Inky | Orange | Targets a point based on both Barney and Blinky's position |
| Clyde | Green | Chases when far away, retreats to scatter corner when close |

Global mode alternates between **Scatter** (ghosts head to their corner) and **Chase** (full AI targeting) on a timer. Eating a coffee power-up triggers **Fright** mode — ghosts turn blue, slow down, and wander randomly. Eating a ghost in Fright mode sends it back to the house in **Eaten** mode.

All movement is tile-locked: a ghost commits to a direction when it reaches a tile centre and doesn't deviate until the next centre. This is what gives classic maze games their satisfying predictability — you can always read where a ghost is going.

**Key lesson:** Constraining movement to a grid makes collision detection trivial and AI targeting simple. Fight the urge to add free-form movement to a tile-based game.

---

## The Bugs We Fixed (And What They Taught Us)

This is where the real learning happens. Here's a chronological rundown of every significant bug and what caused it.

---

### Bug 1: The Game Crashed on Load
**Symptom:** White screen, console error on first frame.
**Cause:** `draw()` was called before `initMaze()`, so `mazeGrid` was empty and the rendering code crashed trying to iterate it.
**Fix:** Call `initMaze()` in the `window.addEventListener('load', ...)` handler before starting the loop.
**Lesson:** Always initialise your data before your render loop. Guard render functions against empty state.

---

### Bug 2: `ctx.roundRect` Crashed on Older Browsers
**Symptom:** Safari and some older Chrome builds threw "roundRect is not a function".
**Cause:** `ctx.roundRect()` is a relatively new Canvas API (Chrome 99+, Safari 15.4+).
**Fix:** Replaced with a manual `_roundRect()` helper using `moveTo`, `lineTo`, and `arcTo`.
**Lesson:** Check browser support before using new Canvas APIs. The manual bezier approach works everywhere and is only a dozen lines.

---

### Bug 3: Speed Formula Was Off by ×60
**Symptom:** Barney and ghosts moved impossibly fast — crossing the whole maze in under a second.
**Cause:** Speed values were tuned for pixels-per-frame but were being applied to positions that expected tiles-per-second. A `/60` division was missing.
**Fix:** Corrected the speed formula in the movement code.
**Lesson:** Always document the units your speed values are in. "Speed" means nothing without a unit.

---

### Bug 4: Entities Oscillating at Tile Centres
**Symptom:** Barney and all ghosts would vibrate in place, stuck oscillating back and forth at a tile centre instead of moving through it.
**Cause:** The snap-to-centre logic (which aligns an entity exactly to the grid when it's close enough) fired every frame. The entity would snap to centre, then on the next frame still be "near centre" and snap again — in the opposite direction.
**Fix:** Added a `_snapped` boolean flag. Once an entity snaps to a tile centre, the flag is set and the snap logic is skipped until the entity moves away from that centre.
**Lesson:** One-shot operations need a "have I done this?" guard. Snap logic, sound triggers, state transitions — anything that should happen once per crossing needs a flag.

---

### Bug 5: Barney Passing Through Walls
**Symptom:** After fixing Bug 4, Barney would sometimes walk straight through walls.
**Cause:** The wall collision check was inside the `!_snapped` block. Once `_snapped` was true, the wall check was completely skipped — so Barney could move into a wall tile freely on the next frame.
**Fix:** Moved the wall check outside the `_snapped` guard so it fires every frame near a tile centre.
**Lesson:** When you add a guard flag, carefully audit every piece of logic that was previously unguarded. A fix in one place can silently break something adjacent.

---

### Bug 6: Controls Becoming Unresponsive After Hitting a Wall
**Symptom:** After Barney hit a wall, controls would stop responding until the player pressed the key again.
**Cause:** When blocked by a wall, `_snapped` stayed `true`. The next-direction evaluation was inside the `!_snapped` block, so a queued direction change was never re-evaluated.
**Fix:** Reset `_snapped = false` when movement is blocked by a wall, forcing the direction logic to re-evaluate on the next frame.
**Lesson:** State flags need careful lifecycle management. Ask: "what resets this flag, and when?"

---

### Bug 7: Double Speed on 120Hz Monitors
**Symptom:** The game ran perfectly on a 60Hz screen but at double speed on a 120Hz monitor.
**Cause:** `requestAnimationFrame` fires at the monitor's refresh rate. On 120Hz, `update()` and `draw()` were being called 120 times per second instead of 60.
**Fix:** Added a timestamp delta check: only process a frame if at least 16ms have elapsed since the last one.
**Lesson:** `requestAnimationFrame` does not give you 60fps — it gives you a callback synced to the display. Always account for variable refresh rates.

---

### Bug 8: Ghost Collision Check Never Running
**Symptom:** Barney could walk through ghosts with no consequence.
**Cause:** The collision detection function referenced `_ghostEatCount`, a variable that had never been declared. JavaScript threw a ReferenceError silently (caught by our try/catch), killing the entire collision check every frame.
**Fix:** Removed the undeclared reference. Renamed the variable consistently throughout.
**Lesson:** Silent errors are the worst kind. Use strict mode (`'use strict'` at the top of every file) — it turns undeclared variable references into loud, immediate errors.

---

### Bug 9: Level 2 Had a Grey Hue
**Symptom:** After completing level 1, the screen had a washed-out grey/white tint for several seconds into level 2.
**Cause:** The maze flash effect (a white `rgba(255,255,255,0.25)` overlay that flashes during level completion) had an off-by-one in its final tick. When the flash timer decremented to exactly zero, `_flashOn` was set to `true` on that same frame — because `Math.floor(0/8) % 2 === 0` evaluates to `true`. The function then returned `false` to signal the transition was complete. But `_flashOn` was never cleared, and the flash overlay is drawn every frame regardless of game state. So for the entire 3-second READY screen on level 2, the white overlay sat on top of everything.
**Fix:**
```javascript
function updateMazeFlash() {
  if (_flashTimer > 0) {
    _flashTimer--;
    if (_flashTimer <= 0) {
      _flashOn = false;  // clear before returning
      return false;
    }
    _flashOn = Math.floor(_flashTimer / 8) % 2 === 0;
    return true;
  }
  _flashOn = false;
  return false;
}
```
**Lesson:** When a function both mutates state and returns a status value, make sure the state is correct *before* the return — not just after. Off-by-one errors on final ticks are a classic source of subtle visual bugs.

---

### Bug 10: Pressing Enter to Submit a High Score Started a New Game
**Symptom:** When a player got a high score and the name entry dialog appeared, pressing Enter to submit their name immediately dismissed the dialog and jumped straight into a new game.
**Cause:** Two event listeners were firing on the same keypress. The name input's `onkeydown` submitted the name, but the game's global `document.addEventListener('keydown', ...)` also saw the Enter key and called `startGame()` — both in the same event loop tick.
**Fix:** Add `e.stopPropagation()` to the name input's key handler so the event doesn't bubble to the document listener:
```javascript
input.onkeydown = e => {
  if (e.key === 'Enter') {
    e.stopPropagation(); // stop the game from also seeing this
    submit();
  }
};
```
**Lesson:** When you have both DOM UI (forms, buttons) and canvas game input sharing the same keyboard events, always stop propagation in the DOM handler. Otherwise the game sees every key the UI sees too.

---

## Mobile: Touch Controls and Responsive Layout

Getting the game playable on mobile required a few specific decisions.

**Touch D-Pad:** A four-button overlay is injected into the DOM and shown only on touch devices. Each button calls `Barney.setDir()` on both `touchstart` and `mousedown` so it works on both mobile and desktop.

**Swipe Support:** Canvas touch events detect swipe direction and map to movement, with a minimum distance threshold (10px) to avoid interpreting a tap as a swipe.

**Layout:** On mobile, `justify-content: flex-start` pushes the canvas to the top of the viewport so it fills as much screen as possible before the d-pad. The canvas is sized dynamically in JavaScript — scaled to fit the available viewport minus the d-pad reservation.

**What We Tried and Removed:** An early version had both portrait and landscape layout modes, which added significant complexity (switching flex direction, recalculating canvas size). We simplified to portrait-only — most mobile players hold their phone vertically for this type of game, and the simpler code was more reliable.

**Lesson:** Build for one orientation first. Add the second only if there's real demand. Responsive game layouts are harder than responsive web pages because the canvas coordinate system doesn't reflow.

---

## Audio: Web Audio API From Scratch

All sound effects are synthesised in code using the Web Audio API — no audio files to load or license.

```javascript
function sfxDot() {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  osc.start(); osc.stop(ctx.currentTime + 0.08);
}
```

Each effect creates its own oscillator and gain node, schedules the sound, and lets the node auto-dispose when it stops. The AudioContext is lazily created on first user interaction (required by browsers to prevent auto-playing audio).

Mute is a single `_muted` flag checked at the start of every sound function — simple and reliable.

We did build and then remove a continuous siren effect (like the original Pac-Man ghost alarm). It was technically correct but became irritating quickly in playtesting. Some authentic details aren't worth keeping.

**Lesson:** Procedural audio is a great skill. A 50-line Web Audio API setup can cover all the bleeps and sweeps you need for a retro game without a single audio file.

---

## The Leaderboard: Two-Tier Score Storage

Scores are stored in two places:

1. **Local:** `localStorage` — instant, always available, no server needed
2. **Global:** JSONBin.io — a free HTTP bin service that stores JSON, used as a zero-cost backend

The local board is always shown immediately. The global fetch is async and updates the display when it arrives. If the fetch fails (offline, API key missing), the local board is shown alone — graceful degradation.

Score submission uses a DOM overlay rather than canvas drawing — an `<input>` element is far easier to work with for text entry than reimplementing keyboard handling on canvas. The overlay uses `position: fixed; inset: 0` with a semi-transparent background and is shown/hidden with a CSS class toggle.

**Lesson:** Use the right tool for each job. Canvas is great for animated game rendering; HTML form elements are great for text input. Don't be afraid to mix them.

---

## File Structure

```
Bin-Man/
├── index.html          # Shell — just script tags and canvas
├── css/
│   └── style.css       # Layout, d-pad, overlays
└── js/
    ├── config.js       # Constants, colours, maze template, speed tables
    ├── sprites.js      # Pixel-art sprite definitions + drawSprite()
    ├── audio.js        # Web Audio API sound effects
    ├── maze.js         # Maze state, rendering, dot tracking, flash effect
    ├── entities.js     # Barney + Ghost classes, movement, AI
    ├── leaderboard.js  # Score storage (local + global), name entry UI
    ├── ui.js           # Menu, ready, game-over screen rendering
    └── game.js         # Main loop, state machine, input, collisions
```

Each file is independently readable. If you want to understand ghost AI, open `entities.js`. If you want to understand scoring, open `leaderboard.js`. No file imports from another — they communicate through shared globals declared in `config.js` and the DOM.

---

## What's Next

Barney-Man is complete as a 1.0, but there are natural extensions if you want to experiment:

- **Animated ghost eyes** that face the direction of movement
- **Bonus fruit** appearing mid-level for extra points
- **Cut scenes** between levels (the original had them)
- **Different maze layouts** per level instead of repeating the same one
- **A proper high score name** on the leaderboard entry using a custom on-canvas keyboard for mobile players

---

## Key Takeaways

If you're building your own retro arcade game, here are the principles that served us best:

1. **Start with a state machine.** Know what state your game is in at all times and make transitions explicit.
2. **Cap your frame rate.** Don't assume `requestAnimationFrame` gives 60fps.
3. **Use `'use strict'`** in every file. Undeclared variables should throw, not silently fail.
4. **One-shot operations need a flag.** Snap logic, sound triggers, state changes — use a boolean to prevent repeated firing.
5. **Audit your guards.** When you add a `_snapped` flag, check every piece of logic that was previously unguarded.
6. **State that mutates and returns a status at the same time needs extra care.** Make sure mutated state is correct *before* the return statement.
7. **Stop propagation at DOM boundaries.** If HTML inputs and canvas share a keyboard listener, the DOM handler must stop the event from reaching the game.
8. **Simplify ruthlessly.** We removed landscape mode, the siren, and a title screen animation. Every removal made the codebase easier to reason about.

---

*Barney-Man is part of our ongoing Retro Arcade Series — all games built in vanilla JavaScript, no frameworks, no build tools. Play it here and view the full source on GitHub.*
