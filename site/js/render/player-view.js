// Draws the player as two blocks: a body that shrinks when crouched, and a head.
import { Group } from '../../vendor/three.module.js';
import { playerHeight } from '../game/player.js';
import { block } from './blocks.js';
import { SEE_THROUGH_SPOTS } from './spot-views.js';

const HEAD = 0.36;

export function createPlayerView() {
  const group = new Group();
  // A little glow keeps the player readable in the dark.
  const body = block(0.6, 1, 0.5, 0xd98a3a, 0x4a2c0c);
  const head = block(HEAD, HEAD, HEAD, 0xe8c39a, 0x3a2c1c);
  const nose = block(0.12, 0.1, 0.2, 0x2a1c10);
  group.add(body, head, nose);

  // hideSpot is the spot the player is inside, if any.
  function update(player, hideSpot) {
    // Under a table or behind the counter you stay on screen, crouched, so you can see where you are.
    const crawling = hideSpot && SEE_THROUGH_SPOTS.includes(hideSpot.type);
    group.visible = !player.hiddenIn || crawling;
    const bodyHeight = (crawling ? 0.9 : playerHeight(player)) - HEAD;
    const LEANS = { run: -0.12, dash: -0.45, slide: 0.5 };
    const lean = (LEANS[player.mode] ?? 0) * player.facing;
    group.position.set(player.x, player.y ?? 0, 0);
    group.rotation.z = lean;
    body.scale.y = bodyHeight;
    body.position.y = bodyHeight / 2;
    head.position.y = bodyHeight + HEAD / 2;
    nose.position.set(player.facing * 0.22, bodyHeight + HEAD / 2, 0);
  }
  return { group, update };
}
