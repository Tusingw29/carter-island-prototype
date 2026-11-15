// Where to put a marker for something that may be off screen. Given its position on screen in
// pixels, returns where to draw it and, if it is outside the picture, which edge it is pinned
// to: 'left', 'right', 'up', or 'down'. edge is null when it is in view.
export function edgePlacement(x, y, width, height, margin = 26) {
  let edge = null;
  if (x < margin) edge = 'left';
  else if (x > width - margin) edge = 'right';
  else if (y < margin) edge = 'up';
  else if (y > height - margin) edge = 'down';
  return {
    edge,
    left: Math.max(margin, Math.min(width - margin, x)),
    top: Math.max(margin, Math.min(height - margin, y)),
  };
}

// What to draw for one awareness meter, given where it landed.
//   hidden: true means draw nothing here, because the guard's own big "!" is in view.
//   A full meter that is off screen stays as a red arrow at the edge: the guard is in his
//   reaction pause or chasing you, and you need to know from where.
export function meterMarker(meter, placement) {
  if (meter.kind === 'guard' && meter.full && !placement.edge) return { hidden: true, state: 'full', arrow: null };
  const state = meter.full ? 'full' : (meter.seeing ? 'filling' : 'draining');
  return { hidden: false, state, arrow: placement.edge };
}
