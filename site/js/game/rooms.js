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
//   vent     press Up. needs: 'screwdriver' means the cover is screwed shut until you have one.
//            oneWay vents only go in the direction listed. exitOnly marks the far end of one:
//            you can come out of it but never go in. drop means you fall and land with a thud.
//            hidden keeps a vent off the map until you have walked up to it.
// Props are things on the back wall that are not ways out, like the welded vent and the camera panel.
// Snitches are inmates who yell if they see you. firstLook is the side they watch first.
// The trader swaps cigarettes for a hint.
// Grates (in the duct) let you look down into the room below.
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
  cellXs: [8, 15, 26],
  snitches: [
    { id: 'snitch-1', x: 15, firstLook: 1 },
    { id: 'snitch-2', x: 26, firstLook: -1, offset: 2 },
  ],
  trader: { id: 'trader', x: 8 },
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
    // Where the one-way drop from the Guard Office comes out. It lands you in the dark archway.
    { id: 'cb-drop', type: 'vent', exitOnly: true, high: true, hidden: true, x: 28.6, to: 'guard-office',
      toPortal: 'go-drop' },
  ],
  guards: [{ id: 'cb-guard', patrol: [9, 21.5], startX: 16, facing: 1, checksBed: true }],
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
    { id: 'la-cart-2', type: 'cart', x: 15 },
    { id: 'la-cart-3', type: 'cart', x: 21.5 },
  ],
  portals: [
    { id: 'la-stairs', type: 'stairs', dir: 'up', x: 2, to: 'cell-block', toPortal: 'cb-stairs' },
    { id: 'la-door', type: 'door', creaky: true, x: 26.5, to: 'maintenance', toPortal: 'ma-door' },
  ],
  items: [
    { id: 'bedsheets', type: 'bedsheets', x: 5.2 },
    { id: 'screwdriver', type: 'screwdriver', x: 23.8 },
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
    { id: 'ma-vent', type: 'vent', needs: 'screwdriver', hidden: true, x: 23, to: 'vent-duct', toPortal: 'vd-west' },
  ],
  // A teaser for later: this one cannot be opened in the prototype.
  props: [
    { id: 'ma-welded', type: 'welded-vent', x: 19.2 },
    { id: 'ma-panel', type: 'camera-panel', x: 21.1, controls: 'sw-camera' },
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
  // Hidden in the kitchen corner.
  items: [{ id: 'cigarettes', type: 'cigarettes', x: 34.6 }],
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
    // Where the duct comes out, in the ceiling. Too high to climb back into.
    { id: 'go-ceiling', type: 'vent', exitOnly: true, high: true, hidden: true, x: 17.5, to: 'vent-duct',
      toPortal: 'vd-east' },
    // The way home: latched on this side, so it opens without a tool, but only from in here.
    { id: 'go-drop', type: 'vent', oneWay: true, drop: true, floor: true, hidden: true, x: 19.5, to: 'cell-block',
      toPortal: 'cb-drop' },
  ],
  items: [{ id: 'keycard', type: 'keycard', x: 10.5 }],
  guards: [{ id: 'go-guard', patrol: [13.5, 13.5], facing: -1, sleeper: true }],
};

// The duct runs above the Cell Block and Mess Hall. No guards, no room to stand: you crawl.
const ventDuct = {
  id: 'vent-duct',
  name: 'Vent Duct',
  floor: 2,
  col: 0,
  span: 2,
  width: 30,
  wallColor: 0x4a5058,
  crawl: true,
  hideSpots: [],
  portals: [
    { id: 'vd-west', type: 'vent', hidden: true, x: 1.5, to: 'maintenance', toPortal: 'ma-vent' },
    { id: 'vd-east', type: 'vent', oneWay: true, drop: true, floor: true, hidden: true, x: 28.5, to: 'guard-office',
      toPortal: 'go-ceiling' },
  ],
  grates: [
    { id: 'vd-grate-1', x: 9, looksInto: 'mess-hall' },
    { id: 'vd-grate-2', x: 18, looksInto: 'mess-hall' },
    { id: 'vd-grate-3', x: 25.5, looksInto: 'guard-office' },
  ],
  guards: [],
};

export const ROOMS = Object.freeze({
  'vent-duct': ventDuct,
  'cell-block': cellBlock,
  laundry,
  maintenance,
  'mess-hall': messHall,
  stairwell,
  'guard-office': guardOffice,
});

export const PRISON = Object.freeze({ startRoom: 'cell-block', rooms: ROOMS });

// The gym: a practice room for jump, slide, and dash. It is not part of the prison and has no
// timer. Reached with ?room=gym.
//   solids are boxes to stand on or slide under: { x, halfWidth, bottom, top }.
//   pits are stretches with no floor: { from, to }.
//   bounds keep a guard on his own stretch of floor, so he never walks through a crate.
const gym = {
  id: 'gym',
  name: 'Gym (movement test)',
  floor: 0,
  col: 0,
  width: 62,
  wallColor: 0x3f4a44,
  playerStart: 3,
  moves: true,
  solids: [
    // Two crates as steps up to a ledge that runs over the first guard's head.
    { id: 'crate-1', kind: 'crate', x: 8, halfWidth: 0.8, bottom: 0, top: 1 },
    { id: 'crate-2', kind: 'crate', x: 9.9, halfWidth: 1.1, bottom: 0, top: 2 },
    { id: 'ledge', kind: 'ledge', x: 15, halfWidth: 3, bottom: 2.7, top: 3 },
    // A low gap: too low to crouch under, so it needs a slide.
    { id: 'low-gap', kind: 'wall', x: 27, halfWidth: 1.2, bottom: 0.75, top: 4.4 },
    // More crates at the far end.
    { id: 'crate-3', kind: 'crate', x: 57, halfWidth: 0.8, bottom: 0, top: 1 },
    { id: 'crate-4', kind: 'crate', x: 59.2, halfWidth: 1.2, bottom: 0, top: 2 },
  ],
  // Too wide to jump, even at a run. It needs a dash.
  pits: [{ from: 34, to: 40 }],
  hideSpots: [{ id: 'gym-dark', type: 'dark', x: 31.5, halfWidth: 1.2 }],
  portals: [],
  guards: [
    { id: 'gym-guard-1', patrol: [13, 23], startX: 18, facing: 1, bounds: [11.6, 25.2] },
    { id: 'gym-guard-2', patrol: [42.5, 53], startX: 46, facing: 1, bounds: [40.8, 55.6] },
  ],
};

export const GYM = Object.freeze({ startRoom: 'gym', practice: true, rooms: { gym } });
