// Adaptive perfect-information controls: each departure phase gets newly planned safe legs.
// Run: node tools/review/adaptive.mjs > tools/review/adaptive.log
import { registerHooks } from 'node:module';
import { writeFileSync } from 'node:fs';
import { scoreRun } from '../../site/js/game/run.js';
const bridge = new URL('record-bridge.mjs', import.meta.url).href;
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.includes('/tests/bot/') && specifier.endsWith('/game/world.js')) {
      return { url: bridge, shortCircuit: true };
    }
    return next(specifier, context);
  },
});
const routes = await import('../../tests/bot/routes.mjs');
const yard = await import('../../tests/bot/yard-routes.mjs');
const results = [];
for (let i = 0; i < 10; i += 1) {
  globalThis.reviewDelay = i * 2;
  for (const [type, play] of Object.entries({
    Ghost: routes.frontDoorThenDropRun,
    'Vent-first': routes.ventRun,
    'Yard roof route': yard.bootsThenRoofByHoopRun,
  })) {
    try {
      const { world, log } = play();
      results.push({ type, delay: globalThis.reviewDelay, seconds: world.time, ...scoreRun(world), log });
      console.log(type, globalThis.reviewDelay, world.over, world.time);
    } catch (error) {
      results.push({ type, delay: globalThis.reviewDelay, error: error.message });
      console.log(type, globalThis.reviewDelay, error.message);
    }
    writeFileSync(new URL('adaptive-results.json', import.meta.url), JSON.stringify(results, null, 2) + '\n');
  }
}
