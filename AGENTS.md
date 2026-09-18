# AGENTS.md

Vanilla-JS/HTML/CSS Pac-Man clone. No build tooling, no package.json, no tests, no linter — verify by opening `src/index.html` in a browser. Comments and in-game UI text are in Spanish.

## Spec-driven development (core workflow)

This repo exists to practice spec-driven development. Do NOT write code before a spec exists and is approved. The `spec` and `spec-impl` skills are project-local (`.agents/skills/`); invoke them as `/spec <feature>` and `/spec-impl NN-slug`:

- `/spec` writes `specs/NN-slug.md` (zero-padded, e.g. `01-mvp`), state `Draft`. It never writes code.
- `/spec-impl` only proceeds when the spec state means "Approved"; it creates a `spec-NN-slug` branch and implements the plan step by step, pausing for diff review.
- Never commit on spec-impl branches (or anywhere) unless explicitly asked.
- Working tree must be clean before branch operations.
- Specs follow the template at `.agents/skills/spec/template.md`; match existing specs' language/format.

## Architecture

Plain `<script>` tags in `src/index.html:19-22`, load order is mandatory: `maze.js` → `game.js` → `render.js` → `main.js`. Modules must NOT replace globals — files expose shared state via `window.*` (`MAZE`, `createGame`, `update`, `DIRS`, `draw`). `main.js` calls `createGame/update/draw` as globals.

- `maze.js` — grid source: `MAZE_STR` strings parsed to a numeric matrix. Tile codes: `1` wall, `2` dot, `3` pen door (ghost-passable, pacman-blocked), `0` floor. `MAZE` is pristine; `createGame()` copies it per game with `row.slice()` (`game.js:19`) and removes dots that have been eaten from the copy, never from `MAZE`.
- `game.js` — rules/state. Movement is in fractions of a cell per frame (`PACMAN_SPEED = 0.125`, `GHOST_SPEED = 0.1`); stay on those sub-cell units and reuse `aligned()` when snapping.
- `render.js` — canvas drawing, `TILE = 20` (canvas is 560×620 = 28×31 cells).
- `main.js` — rAF loop, keyboard, overlays.

## Gotchas

- Don't change `MAZE_STR` 28-char row length (rows are visually aligned for the grid, 16 `-` in row 14).
- Tunnel row is `TUNNEL_ROW = 14`; wrapping happens only in that row.
- Keep the `window.*` global export pattern and script order; adding `type="module"` or `import` breaks it.