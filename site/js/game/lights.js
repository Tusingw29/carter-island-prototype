// Lit areas: the pool of light under a lamp. A room lists them as lights: [{ id, x, halfWidth }].
// In one you are plain to see: a guard who has you in his beam is sure at once, however far off.
export function litAreaAt(room, player) {
  const feetY = player.y ?? 0;
  return (room.lights ?? []).find((light) => (
    Math.abs(light.x - player.x) <= light.halfWidth && feetY >= (light.y ?? 0) - 0.1 && feetY <= (light.y ?? 0) + 3
  )) ?? null;
}
