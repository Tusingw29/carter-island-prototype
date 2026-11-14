// HTML text drawn over the 3D view: the hide prompt, guard labels, and the debug panel.
import { Vector3 } from '../../vendor/three.module.js';
import { nearestHideSpot } from '../game/hiding.js';

const point = new Vector3();

function pin(element, camera, x, y) {
  point.set(x, y, 0).project(camera);
  element.style.left = `${(point.x * 0.5 + 0.5) * window.innerWidth}px`;
  element.style.top = `${(-point.y * 0.5 + 0.5) * window.innerHeight}px`;
}

function yesNo(value) {
  return value ? 'yes' : 'no';
}

export function createOverlay(build) {
  const prompt = document.getElementById('hide-prompt');
  const guardLabel = document.getElementById('guard-label');
  const panel = document.getElementById('debug-panel');

  function update(world, camera, debug) {
    const { player } = world;
    const spot = nearestHideSpot(player, world.room.hideSpots);
    prompt.hidden = !spot;
    if (spot) {
      prompt.textContent = player.hiddenIn ? 'UP: come out' : 'UP: hide';
      pin(prompt, camera, spot.x, 2.75);
    }

    document.body.classList.toggle('debug', debug);
    if (!debug) return;
    const guard = world.guards[0];
    guardLabel.textContent = guard.seesPlayer ? 'SEES PLAYER' : 'CALM';
    pin(guardLabel, camera, guard.x, 2.95);
    panel.textContent = [
      `DEBUG  build ${build}`,
      `player   ${player.mode}  ${player.speed.toFixed(1)} m/s  x ${player.x.toFixed(1)}`,
      `noise    ${world.noiseRadius.toFixed(1)} m`,
      `hidden   ${yesNo(player.hiddenIn)}`,
      `guard    ${guardLabel.textContent}  x ${guard.x.toFixed(1)}`,
      `spotted  ${world.stats.timesSpotted} times`,
    ].join('\n');
  }
  return { update };
}
