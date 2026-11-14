// Room layouts. Pure data: positions along the floor line, in metres from the left wall.
//
// Hiding spot types: 'locker' and 'cart' are containers you climb into with Up.
// 'dark' is a pitch-dark patch of floor: stand still inside it and you cannot be seen.
export const CELL_BLOCK = Object.freeze({
  id: 'cell-block',
  name: 'Cell Block',
  width: 34,
  playerStart: 2.5,
  bedX: 2.2,
  // Barred cell fronts along the back wall. Only for looks so far.
  cellXs: [6, 14, 21, 29],
  hideSpots: [
    { id: 'locker-1', type: 'locker', x: 10.5 },
    { id: 'dark-1', type: 'dark', x: 17.5, halfWidth: 1.4 },
    { id: 'cart-1', type: 'cart', x: 25 },
  ],
  guards: [
    { id: 'guard-1', patrol: [6, 16], startX: 12, facing: 1 },
    { id: 'guard-2', patrol: [19, 31], startX: 27, facing: 1 },
  ],
});
