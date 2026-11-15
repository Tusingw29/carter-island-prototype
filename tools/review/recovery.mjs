// Recovery route after an explicit capture fixture. No tools or keycard are granted.
import { writeFileSync } from 'node:fs';
import { createWorld, stepWorld } from '../../site/js/game/world.js';
import { emptyIntent } from '../../site/js/game/intent.js';
import { capture } from '../../site/js/game/solitary.js';
import { scoreRun } from '../../site/js/game/run.js';
import { leaveByDoor, pickUpItem, liftKeycard, goToBedAndSleep } from '../../tests/bot/routes.mjs';
const results = [];
for (const remaining of [240, 150, 100]) {
  const world = createWorld();
  for (let i = 0; i < (420 - remaining) * 120; i += 1) {
    stepWorld(world, emptyIntent(), 1 / 120);
    world.events.length = 0;
  }
  capture(world);
  stepWorld(world, { ...emptyIntent(), interact: true }, 1 / 120);
  stepWorld(world, emptyIntent(), 1 / 120);
  const log = [];
  let error = null;
  try {
    leaveByDoor(world, 'cb-stairs', log);
    pickUpItem(world, 'screwdriver', log);
    for (const id of ['la-door', 'ma-vent', 'vd-east']) leaveByDoor(world, id, log);
    liftKeycard(world, log);
    leaveByDoor(world, 'go-drop', log);
    goToBedAndSleep(world, log);
  } catch (e) { error = e.message; }
  results.push({ remainingAtCapture: remaining, error, ...scoreRun(world), log });
  console.log(remaining, world.over, world.timeLeft, error);
}
writeFileSync(new URL('recovery-results.json', import.meta.url), JSON.stringify(results, null, 2) + '\n');
