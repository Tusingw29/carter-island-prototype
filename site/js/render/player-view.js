// Draws the player as two blocks: a body that shrinks when crouched, and a head.
import { Group } from '../../vendor/three.module.js';
import { playerHeight } from '../game/player.js';
import { block } from './blocks.js';

const HEAD = 0.36;

export function createPlayerView() {
  const group = new Group();
  // A little glow keeps the player readable in the dark.
  const body = block(0.6, 1, 0.5, 0xd98a3a, 0x4a2c0c);
  const head = block(HEAD, HEAD, HEAD, 0xe8c39a, 0x3a2c1c);
  const nose = block(0.12, 0.1, 0.2, 0x2a1c10);
  group.add(body, head, nose);

  function update(player) {
    group.visible = !player.hiddenIn;
    const bodyHeight = playerHeight(player) - HEAD;
    const lean = player.mode === 'run' ? -0.12 * player.facing : 0;
    group.position.set(player.x, 0, 0);
    group.rotation.z = lean;
    body.scale.y = bodyHeight;
    body.position.y = bodyHeight / 2;
    head.position.y = bodyHeight + HEAD / 2;
    nose.position.set(player.facing * 0.22, bodyHeight + HEAD / 2, 0);
  }
  return { group, update };
}
