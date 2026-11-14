// Draws the player as two blocks: a body that shrinks when crouched, and a head.
import { Group } from '../../vendor/three.module.js';
import { playerHeight } from '../game/player.js';
import { block } from './blocks.js';
import { SEE_THROUGH_SPOTS } from './spot-views.js';

const HEAD = 0.36;
const LEANS = { run: -0.12, dash: -0.45, slide: 0.5 };
// How long the stretch after a jump, the squash after a landing, and a dust puff last.
const STRETCH_SECONDS = 0.14;
const SQUASH_SECONDS = 0.12;
const DUST_SECONDS = 0.3;

export function createPlayerView() {
  const group = new Group();
  const figure = new Group();
  // A little glow keeps the player readable in the dark.
  const body = block(0.6, 1, 0.5, 0xd98a3a, 0x4a2c0c);
  const head = block(HEAD, HEAD, HEAD, 0xe8c39a, 0x3a2c1c);
  const nose = block(0.12, 0.1, 0.2, 0x2a1c10);
  figure.add(body, head, nose);
  // A puff of dust left where a dash started. It is not attached to the player.
  const dust = block(0.5, 0.3, 0.4, 0xb8b0a0, 0x555048);
  dust.material.transparent = true;
  dust.visible = false;
  group.add(figure, dust);

  // hideSpot is the spot the player is inside, if any. now is the game clock.
  function update(player, hideSpot, now = 0) {
    // Under a table or behind the counter you stay on screen, crouched, so you can see where you are.
    const crawling = hideSpot && SEE_THROUGH_SPOTS.includes(hideSpot.type);
    figure.visible = !player.hiddenIn || crawling;
    const bodyHeight = (crawling ? 0.9 : playerHeight(player)) - HEAD;
    figure.position.set(player.x, player.y ?? 0, 0);
    figure.rotation.z = (LEANS[player.mode] ?? 0) * player.facing;
    body.scale.y = bodyHeight;
    body.position.y = bodyHeight / 2;
    head.position.y = bodyHeight + HEAD / 2;
    nose.position.set(player.facing * 0.22, bodyHeight + HEAD / 2, 0);

    // Squash and stretch: tall and thin leaving the ground, short and wide landing on it.
    const sinceJump = player.jumpedAt === null ? Infinity : now - player.jumpedAt;
    const sinceLand = player.landedAt === null ? Infinity : now - player.landedAt;
    let tall = 1;
    if (sinceJump < STRETCH_SECONDS) tall = 1 + 0.28 * (1 - sinceJump / STRETCH_SECONDS);
    else if (sinceLand < SQUASH_SECONDS) tall = 1 - 0.3 * (1 - sinceLand / SQUASH_SECONDS);
    figure.scale.set(1 / tall, tall, 1);

    const sinceDash = player.dashedAt === null ? Infinity : now - player.dashedAt;
    dust.visible = sinceDash < DUST_SECONDS;
    if (dust.visible) {
      const age = sinceDash / DUST_SECONDS;
      dust.position.set(player.dashFromX, 0.15 + age * 0.25, 0.3);
      dust.scale.setScalar(1 + age * 1.6);
      dust.material.opacity = 0.7 * (1 - age);
    }
  }
  return { group, update };
}
