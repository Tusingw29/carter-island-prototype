# Contributing to Carter Island

These rules apply to everyone who touches the repo, people and coding agents alike.
`tests/repo-rules.test.mjs` checks the ones a machine can check.

Read docs/VISION.md for where the game is going. Every feature should serve at least one pillar.

## Code style

1. **Keep lines under 120 characters.** No giant one-line files. Vendored libraries in
   `site/vendor/` are the only exception.
2. **Small modules with one job each.** For example `player.js`, `guard.js`, `alert.js`,
   `noise.js`, `rooms.js`. If a file needs "and" to describe what it does, split it.
3. **Game logic must run without rendering.** Everything in `site/js/game/` has to load and
   run in plain Node, so it can be tested. That means no Three.js, no `document`, no `window`
   in that folder. Drawing code lives in `site/js/render/` and reads game state; it never
   decides game outcomes.
4. **Keep the repo light.** No large binary files in git. Files over 500 KB fail the tests.
   The look is blocks and flat colors, so there should be nothing big to commit anyway.

## How the project is set up

- Plain JavaScript ES modules. **No build step.** Open `site/` with any static server and play.
- Three.js is vendored in `site/vendor/` (r180). Never load it, or anything else, from a CDN.
- Tests use the Node built-in test runner. No dependencies to install.
- Tunable numbers go in `site/js/game/config.js`, not scattered through the code.
- Room layouts, guard patrols, and item positions are data in `site/js/game/rooms.js`.
- If you change a room, run `npm test`: the bot replays every route and fails if a clean run
  is no longer possible.
- Guard patrols and anything else players are meant to learn must be the same every run.
  Do not use `Math.random()` in game logic.

## Folders

| Folder | What goes there |
| --- | --- |
| `site/` | The playable game. This folder is what gets published. |
| `site/js/game/` | Game logic. Runs in Node. No rendering. |
| `site/js/render/` | Three.js drawing code. |
| `site/vendor/` | Vendored Three.js. Do not edit. |
| `tests/` | Node tests, one `*.test.mjs` file per system. |
| `tests/bot/` | A planning bot that plays clean runs, to prove the level can be beaten and to time routes. |
| `scripts/` | Release tooling run by CI. |
| `docs/` | `DESIGN.md` (the spec) and `TASKS.md` (the task board). |

## Everyday commands

```sh
npm test          # run all tests
npm run dev       # play locally at http://localhost:4173
```

## Workflow

1. Pick a task from `docs/TASKS.md` and set its status to "in progress".
2. Work on the branch named in the task. Add tests for new game logic.
3. Run `npm test`. Open a pull request; CI runs the tests again.
4. Set the task to "review, awaiting Adam's verdict". Adam playtests and decides.
5. Merging to `main` publishes the game, but only if the tests pass.

## Publishing and caching

Pushing to `main` runs `.github/workflows/pages.yml`: tests first, then deploy to GitHub Pages.
A failed test blocks the deploy. A newer push cancels an older run that is still going.

During the deploy, `scripts/prepare-release.mjs` copies `site/` to `_site/` and adds
`?build=<hash>` to every JS and CSS URL using an import map. Returning players therefore
never get a mix of old and new code. Two things keep this working:

- HTML pages stay at the top level of `site/`.
- Load modules with static `import` statements and relative paths.
