// The prison layout. Pure data: positions along each room's floor line, in metres from its left wall.
//
// Hiding spot types
//   locker, cart, bed   climb in with Up
//   table, counter, desk, shelf   climb under or behind with Up; wide ones let you crawl along inside
//   dark   a pitch-dark patch: stand still in it and you cannot be seen.
//          Every hall archway is dark, so you arrive in a room unseen and can watch before moving.
// Portal types
//   hall     an open archway at the left or right end of the room; walk into it
//   stairs   on the back wall; press Up
//   door     on the back wall; press Up. Creaky doors: tap = fast and loud, hold = slow and quiet
// Guards
//   patrol [a, b] walks back and forth. patrol [a, a] stands at a.
//   turnEvery makes a standing guard face the other way every so many seconds.
//   sleeper is asleep until something wakes him.
// Map: floor 0 is the basement. col and span place the room on the map screen.

const cellBlock = {
  id: 'cell-block',
  name: 'Cell Block',
  floor: 1,
  col: 0,
  width: 30,
  wallColor: 0x3b4452,
  playerStart: 4.5,
  startHiddenIn: 'bed',
  cellXs: [15, 25],
  hideSpots: [
    { id: 'bed', type: 'bed', x: 4.5 },
    { id: 'cb-locker-1', type: 'locker', x: 11.5 },
    { id: 'cb-dark', type: 'dark', x: 17.5, halfWidth: 1.3 },
    { id: 'cb-locker-2', type: 'locker', x: 24 },
    { id: 'cb-dark-east', type: 'dark', x: 29, halfWidth: 1.1 },
  ],
  portals: [
    { id: 'cb-stairs', type: 'stairs', dir: 'down', x: 1.3, to: 'laundry', toPortal: 'la-stairs' },
    { id: 'cb-east', type: 'hall', side: 'right', to: 'mess-hall', toPortal: 'mh-west' },
  ],
  guards: [{ id: 'cb-guard', patrol: [9, 21.5], startX: 16, facing: 1 }],
};

const laundry = {
  id: 'laundry',
  name: 'Laundry',
  floor: 0,
  col: 0,
  width: 28,
  wallColor: 0x45504a,
  hideSpots: [
    { id: 'la-cart-1', type: 'cart', x: 8 },
    { id: 'la-cart-2', type: 'cart', x: 22 },
  ],
  portals: [
    { id: 'la-stairs', type: 'stairs', dir: 'up', x: 2, to: 'cell-block', toPortal: 'cb-stairs' },
    { id: 'la-door', type: 'door', creaky: true, x: 26.5, to: 'maintenance', toPortal: 'ma-door' },
  ],
  guards: [{ id: 'la-guard', patrol: [10.5, 19], startX: 12, facing: 1 }],
};

const maintenance = {
  id: 'maintenance',
  name: 'Maintenance Hall',
  floor: 0,
  col: 1,
  width: 26,
  wallColor: 0x4a4640,
  hideSpots: [
    { id: 'ma-shelf-1', type: 'shelf', x: 6 },
    { id: 'ma-shelf-2', type: 'shelf', x: 12.5 },
  ],
  portals: [
    { id: 'ma-door', type: 'door', creaky: true, x: 1.5, to: 'laundry', toPortal: 'la-door' },
  ],
  guards: [],
  // No guards here, so this camera calls the Laundry guard to the connecting door.
  cameras: [{ id: 'ma-camera', min: 9.5, max: 16, halfWidth: 1.6, speed: 1.4, callsGuard: 'la-guard', callsTo: 26.5 }],
};

const messHall = {
  id: 'mess-hall',
  name: 'Mess Hall',
  floor: 1,
  col: 1,
  width: 38,
  wallColor: 0x4a4038,
  hideSpots: [
    { id: 'mh-dark-west', type: 'dark', x: 1, halfWidth: 1.1 },
    { id: 'mh-table-1', type: 'table', x: 8, halfWidth: 2.5 },
    { id: 'mh-table-2', type: 'table', x: 19, halfWidth: 2.5 },
    { id: 'mh-table-3', type: 'table', x: 30, halfWidth: 2.5 },
    { id: 'mh-dark-east', type: 'dark', x: 37, halfWidth: 1.1 },
  ],
  portals: [
    { id: 'mh-west', type: 'hall', side: 'left', to: 'cell-block', toPortal: 'cb-east' },
    { id: 'mh-east', type: 'hall', side: 'right', to: 'stairwell', toPortal: 'sw-west' },
  ],
  guards: [
    { id: 'mh-guard-1', patrol: [7, 18], startX: 11, facing: 1 },
    { id: 'mh-guard-2', patrol: [20, 31], startX: 24, facing: -1 },
  ],
};

const stairwell = {
  id: 'stairwell',
  name: 'Stairwell Checkpoint',
  floor: 1,
  col: 2,
  width: 26,
  wallColor: 0x3f4658,
  hideSpots: [
    { id: 'sw-dark', type: 'dark', x: 1, halfWidth: 1.1 },
    // The checkpoint counter: crawl behind it to get past the guard.
    { id: 'sw-counter', type: 'counter', x: 9, halfWidth: 2.2 },
    // The shadow under the stairs, in the middle of the camera's sweep.
    { id: 'sw-dark-stairs', type: 'dark', x: 18.8, halfWidth: 0.9 },
  ],
  portals: [
    { id: 'sw-west', type: 'hall', side: 'left', to: 'mess-hall', toPortal: 'mh-east' },
    { id: 'sw-door', type: 'door', creaky: true, x: 24, to: 'guard-office', toPortal: 'go-door' },
  ],
  guards: [{ id: 'sw-guard', patrol: [9, 9], facing: -1, turnEvery: 5 }],
  cameras: [{ id: 'sw-camera', min: 16.5, max: 21, halfWidth: 1.2, speed: 1.2 }],
};

const guardOffice = {
  id: 'guard-office',
  name: 'Guard Office',
  floor: 2,
  col: 2,
  width: 21,
  wallColor: 0x4c3f4a,
  hideSpots: [{ id: 'go-desk', type: 'desk', x: 10.5, halfWidth: 1.3 }],
  portals: [
    { id: 'go-door', type: 'door', creaky: true, x: 1.5, to: 'stairwell', toPortal: 'sw-door' },
  ],
  items: [{ id: 'keycard', type: 'keycard', x: 10.5 }],
  guards: [{ id: 'go-guard', patrol: [13.5, 13.5], facing: -1, sleeper: true }],
};

export const ROOMS = Object.freeze({
  'cell-block': cellBlock,
  laundry,
  maintenance,
  'mess-hall': messHall,
  stairwell,
  'guard-office': guardOffice,
});

export const PRISON = Object.freeze({ startRoom: 'cell-block', rooms: ROOMS });
