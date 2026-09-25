# AGENTS.md

## Stack

- Pure HTML5 Canvas + vanilla JS (ES6+). No dependencies, no bundler, no package manager, no build step.
- Do not add `package.json`, frameworks, or build tooling unless explicitly requested.

## Run

```bash
# No install needed — open directly:
open index.html
# or local server (any static server works):
npx serve .
# then http://localhost:3000
```

No test, lint, typecheck, or CI exists. `npx serve` is the only dev command (mentioned in `README.md:20`).

## Structure

```
index.html  # entrypoint — 800×600 canvas, loads game.js via <script>
game.js     # entire game — all classes + state + loop (~423 lines)
favicon.svg # static asset
```

- `index.html:24` is the only script inclusion — no modules/imports.
- `game.js` is single-file, global scope, `'use strict'`. Canvas context `ctx` and constants `W=800, H=600` are globals (`game.js:3-6`).

## Architecture (game.js)

- **Entrypoints:** `initGame()` → `requestAnimationFrame(loop)` at `game.js:422-423`. Loop is `loop(ts) -> update(dt) -> draw()`.
- **Entities (classes):** `Bullet` (TTL 1.1s, speed 520), `Asteroid` (sizes 1-3, radii/speeds/points in `RADII`/`SPEEDS`/`POINTS`), `Ship` (thrust/drag/rotation, blink invincibility), `Particle` (explosion streaks).
- **State machine:** `state = 'playing' | 'dead' | 'gameover'` (`game.js:241`). `dead` has 2s respawn timer (`deadTimer`); `gameover` waits for `Space` to restart. `level` increments in `nextLevel()` with `3 + level` asteroids.
- **Wrapping:** toroidal space via `wrap(v, max)` (`game.js:27`) — applies to ship, bullets, asteroids.
- **Input:** global `keys`/`justPressed` dicts keyed by `e.code` (`Space`, `ArrowUp/Left/Right`). `pressed()` consumes `justPressed` once.
- **Collision:** `dist()` check — bullet vs asteroid (`a.radius`), ship vs asteroid (`ship.radius + a.radius * 0.82`), safe spawn distance 130px from center.

## Conventions

- Language: UI and comments are Spanish (e.g., `NIVEL`, `PUNTAJE`, `GAME OVER` overlay). Keep new UI strings in Spanish.
- Canvas style: white stroke (`#fff`) on black (`#000`), monospace HUD. Follow existing `ctx.strokeStyle`/`lineWidth` patterns.
- No modules — add new code as classes/functions in `game.js` in the same section order (Utils → Entities → State → Update → Draw → Loop).
- Verify visually in browser — no automated tests to catch regressions.
