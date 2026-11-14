// Room layouts. Pure data: positions along the floor line, in metres from the left wall.
export const CELL_BLOCK = Object.freeze({
  id: 'cell-block',
  name: 'Cell Block',
  width: 26,
  playerStart: 2.5,
  bedX: 2.2,
  // Barred cell fronts along the back wall. Only for looks so far.
  cellXs: [6, 15, 19, 23],
  hideSpots: [{ id: 'locker-1', type: 'locker', x: 11 }],
  guards: [{ id: 'guard-1', patrol: [7, 22], startX: 15, facing: 1 }],
});
