// The prison layout. Pure data: positions along each room's floor line, in metres from its left wall.
//
// Hiding spot types
//   locker, cart, bed   climb in with Up
//   table, counter, desk, shelf   climb under or behind with Up; wide ones let you crawl along inside
//   dark   a pitch-dark patch: stand still in it and you cannot be seen.
//          Every hall archway is dark, so you arrive in a room unseen and can watch before moving.
// Portal types
//   window   on the back wall; press Up. The Guard Office window opens onto the Yard's roof ledge.
//   hatch    press Up. The way into the equipment shed, on its roof.
//   A portal with y is up on a ledge or a roof: you have to be standing up there to use it.
//   A door with locked is never the player's to open (the solitary cell).
//   A door with exitOnly is latched on the other side: you can come out of it but not go in.
//   hall     an open archway at the left or right end of the room; walk into it
//   stairs   on the back wall; press Up
//   door     on the back wall; press Up. Creaky doors: tap = fast and loud, hold = slow and quiet
//   vent     press Up. needs: 'screwdriver' means the cover is screwed shut until you have one.
//            oneWay vents only go in the direction listed. exitOnly marks the far end of one:
//            you can come out of it but never go in. drop means you fall and land with a thud.
//            hidden keeps a vent off the map until you have walked up to it.
// Items are things to pick up with Interact. Cups, mugs, soap, and cans are throwables (throwing.js).
// Lights are lamps: lights: [{ id, x, halfWidth }]. Standing in one you are plain to see
// (lights.js). They never overlap a dark patch.
// Props are things on the back wall that are not ways out, like the welded vent and the camera panel.
// Snitches are inmates who yell if they see you. firstLook is the side they watch first.
// The trader swaps cigarettes for a hint.
// Grates (in the duct) let you look down into the room below.
// Guards
//   patrol [a, b] walks back and forth. patrol [a, a] stands at a.
//   turnEvery makes a standing guard face the other way every so many seconds.
//   sleeper is asleep until something wakes him.
// Guards can have y (the height they stand at, for a tower), bounds (the stretch of floor they
// never leave), and a name for the radio.
//   talk is what a guard gives up when interrogated, on top of his radio code. One thing each,
//   the same every run: { type: 'patrols' } shows his room's patrols on the map for a while,
//   { type: 'secret', text, reveals, finds } says where something is and puts it on the map,
//   { type: 'story', text } is a line about the mine. Story lines only ever hint.
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
    // The way to the solitary cell. Only a guard opens it.
    { id: 'cb-solitary', type: 'door', locked: true, hidden: true, x: 19.9, to: 'solitary', toPortal: 'so-door' },
    { id: 'cb-drop', type: 'vent', exitOnly: true, high: true, hidden: true, x: 28.6, to: 'guard-office',
      toPortal: 'go-drop' },
  ],
  items: [{ id: 'cb-cup', type: 'cup', x: 21 }],
  guards: [{ id: 'cb-guard', patrol: [9, 21.5], startX: 16, facing: 1, checksBed: true,
    talk: { type: 'story', text: "Don't go near the deep shafts. Guys come back quiet." } }],
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
    { id: 'la-soap-1', type: 'soap', x: 11.6 },
    { id: 'la-soap-2', type: 'soap', x: 18.4 },
  ],
  // A work lamp between the carts.
  lights: [{ id: 'la-lamp', x: 11.6, halfWidth: 1.4 }],
  guards: [{ id: 'la-guard', patrol: [10.5, 19], startX: 12, facing: 1,
    talk: { type: 'story', text: 'They sealed Shaft Nine in a day. Nobody brought the crew up first.' } }],
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
  items: [{ id: 'ma-can', type: 'can', x: 9 }],
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
    // The side door to the Yard stands in shadow, like the archways, so you never arrive in view.
    { id: 'mh-dark-yard', type: 'dark', x: 33.2, halfWidth: 0.9 },
    { id: 'mh-dark-east', type: 'dark', x: 37, halfWidth: 1.1 },
  ],
  portals: [
    { id: 'mh-west', type: 'hall', side: 'left', to: 'cell-block', toPortal: 'cb-east' },
    { id: 'mh-east', type: 'hall', side: 'right', to: 'stairwell', toPortal: 'sw-west' },
    // The side door out to the Yard.
    { id: 'mh-yard', type: 'door', creaky: true, x: 33.2, to: 'yard', toPortal: 'yd-door' },
  ],
  guards: [
    { id: 'mh-guard-1', patrol: [7, 18], startX: 11, facing: 1,
    talk: { type: 'patrols' } },
    { id: 'mh-guard-2', patrol: [20, 31], startX: 24, facing: -1,
    talk: { type: 'story', text: 'Company calls it Ore Seven. Miners call it The Black. Nobody calls it safe.' } },
  ],
  // The kitchen light.
  lights: [{ id: 'mh-lamp', x: 34.9, halfWidth: 0.7 }],
  // Hidden in the kitchen corner.
  items: [
    { id: 'cigarettes', type: 'cigarettes', x: 34.6 },
    { id: 'mh-cup-1', type: 'cup', x: 4.2 },
    { id: 'mh-cup-2', type: 'cup', x: 13.5 },
    { id: 'mh-cup-3', type: 'cup', x: 24.5 },
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
  items: [{ id: 'sw-mug', type: 'mug', x: 4.5 }],
  // The lamp over the checkpoint counter.
  lights: [{ id: 'sw-lamp', x: 9, halfWidth: 1.8 }],
  guards: [{ id: 'sw-guard', patrol: [9, 9], facing: -1, turnEvery: 5,
    talk: {
      type: 'secret', finds: ['ma-panel'],
      text: 'The panel for that camera is down in the Maintenance Hall. Flip it and the eye goes blind.',
    } }],
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
    // Out onto the sill at the end of the Yard's roof ledge, and back in the same way.
    { id: 'go-window', type: 'window', hidden: true, x: 5.5, to: 'yard', toPortal: 'yd-window' },
    // Where the duct comes out, in the ceiling. Too high to climb back into.
    { id: 'go-ceiling', type: 'vent', exitOnly: true, high: true, hidden: true, x: 17.5, to: 'vent-duct',
      toPortal: 'vd-east' },
    // The way home: latched on this side, so it opens without a tool, but only from in here.
    { id: 'go-drop', type: 'vent', oneWay: true, drop: true, floor: true, hidden: true, x: 19.5, to: 'cell-block',
      toPortal: 'cb-drop' },
  ],
  // The desk lamp. The keycard lies in its light.
  lights: [{ id: 'go-lamp', x: 10.5, halfWidth: 1.6 }],
  items: [{ id: 'keycard', type: 'keycard', x: 10.5 }],
  guards: [{ id: 'go-guard', patrol: [13.5, 13.5], facing: -1, sleeper: true,
    talk: {
      type: 'secret', reveals: ['mh-yard', 'yd-hatch'],
      text: 'Work boots? Equipment shed, out in the Yard. Door is latched. The only way in is the roof hatch.',
    } }],
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


// The Yard: outside, at night. The first area built for jumping and climbing.
// Left to right: the Mess Hall side door, a low fence, the basketball court under the roof
// ledge, Tower 1, the bleachers, the tall fence, a stack of crates, the equipment shed,
// Tower 2, and the outer wall.
//   ladders: { x, bottom, top }. Hold Up or Down to climb.
//   solids with through: true are ledges: jump up through them, stand on them, and drop back
//   down with crouch + jump. climb: true makes a chain-link fence, which you can climb on
//   either side and see through. seeThrough ones cast no shadow.
//   cameras with kind: 'searchlight' are the tower lights (see camera.js).
//   towers and sheds only say what to draw.
const ROOF = 5.4;
const TOWER = 5.8;
const slab = (id, kind, from, to, top, extra = {}) => ({
  id, kind, x: (from + to) / 2, halfWidth: (to - from) / 2, bottom: top - 0.25, top, through: true, ...extra,
});
const box = (id, kind, from, to, top, bottom = 0) => ({
  id, kind, x: (from + to) / 2, halfWidth: (to - from) / 2, bottom, top,
});
const fence = (id, x, top) => ({
  id, kind: 'fence', x, halfWidth: 0.12, bottom: 0, top, climb: true, seeThrough: true,
});

const yard = {
  id: 'yard',
  name: 'Yard',
  floor: 1,
  col: 3,
  width: 82,
  wallColor: 0x2e343c,
  outdoor: true,
  wallHeight: 5.15,
  // The camera sits this much higher out here, to show the towers.
  viewLift: 1.4,
  hideSpots: [
    { id: 'yd-dark', type: 'dark', x: 1.6, halfWidth: 1.4 },
    // Under the bleachers: crawl along, like under a table.
    { id: 'yd-bleachers', type: 'bleachers', x: 43.5, halfWidth: 3.5 },
  ],
  portals: [
    { id: 'yd-door', type: 'door', creaky: true, x: 1.5, to: 'mess-hall', toPortal: 'mh-yard' },
    // Up on the sill at the end of the roof ledge. Works both ways.
    { id: 'yd-window', type: 'window', hidden: true, x: 3, y: ROOF, to: 'guard-office', toPortal: 'go-window',
      mapPart: 'yard-roof' },
    // On the shed roof. The boots are inside.
    { id: 'yd-hatch', type: 'hatch', x: 61, y: 4.2, to: 'shed', toPortal: 'sh-hatch' },
    // Under the west end of the shed roof, in its shadow from Tower 2's light.
    { id: 'yd-shed-door', type: 'door', exitOnly: true, x: 58.6, to: 'shed', toPortal: 'sh-door' },
  ],
  solids: [
    // The window sill and the roof ledge, with a gap between them that needs the dash.
    slab('sill', 'ledge', 1, 5, ROOF, { seeThrough: true }),
    slab('roof-ledge', 'ledge', 11, 31.5, ROOF, { seeThrough: true }),
    fence('low-fence', 8, 1.2),
    // The west hoop: bench, rim, backboard, and the light pole. A climb to the roof with jumps only.
    box('bench', 'bench', 12.6, 14, 1.1),
    slab('rim', 'hoop', 14.6, 15.6, 2.3, { seeThrough: true }),
    slab('backboard', 'hoop', 15.9, 16.5, 3.3, { seeThrough: true }),
    slab('pole-top', 'hoop', 18.1, 18.9, 4.3, { seeThrough: true }),
    // The scorer's table at the east end of the court: low cover from the guard and from the light.
    box('table', 'bench', 28.6, 29.8, 1.3),
    // Tower 1's platform. A jump from its west edge reaches the roof ledge.
    slab('tower-1', 'platform', 33.5, 37.5, TOWER),
    // The bleachers: three rows, rising toward the tall fence.
    slab('row-1', 'bleacher', 40, 47, 0.9),
    slab('row-2', 'bleacher', 42.4, 47, 1.8),
    slab('row-3', 'bleacher', 44.8, 47, 2.7),
    fence('tall-fence', 49.5, 3),
    // The crate stack, with a step on each side so it can be climbed from the ground.
    box('crate-1', 'crate', 51.5, 52.7, 1.2),
    box('crate-2', 'crate', 52.7, 55.3, 2.4),
    box('crate-3', 'crate', 53.4, 54.6, 3.3, 2.4),
    box('crate-4', 'crate', 55.3, 56.5, 1.2),
    // The shed roof. You can walk under it: the shed itself stands against the back wall.
    box('shed-roof', 'roof', 57.8, 64.3, 4.2, 3.9),
    slab('tower-2', 'platform', 69, 73, TOWER),
  ],
  ladders: [
    { id: 'ladder-1', x: 37, bottom: 0, top: TOWER },
    { id: 'ladder-2', x: 72.5, bottom: 0, top: TOWER },
  ],
  towers: [{ x: 35.5, top: TOWER, lampX: 33.2, lampY: 7.8 }, { x: 71, top: TOWER, lampX: 68.7, lampY: 7.8 }],
  sheds: [{ from: 57.8, to: 64.3, height: 3.9 }],
  hoops: [{ x: 16.4, facing: -1 }],
  items: [{ id: 'basketball', type: 'basketball', x: 22 }],
  // Like the welded vent: a teaser for later.
  props: [{ id: 'outer-wall', type: 'outer-wall', x: 81.5, reach: 1.6 }],
  guards: [
    // He walks between the east end of the court and the bleachers. The open court belongs to
    // Tower 1's searchlight.
    { id: 'yd-guard', name: 'Yard guard', patrol: [31.5, 39.5], startX: 34, facing: 1, bounds: [8.8, 48.5],
    talk: { type: 'patrols' } },
    { id: 'yd-tower-1', name: 'Tower 1 guard', patrol: [34.6, 34.6], facing: -1, y: TOWER, bounds: [33.8, 37.2],
    talk: { type: 'story', text: 'Lights flicker near the old wall. Every night. Same time.' } },
    { id: 'yd-tower-2', name: 'Tower 2 guard', patrol: [70.1, 70.1], facing: -1, y: TOWER, bounds: [69.3, 72.7],
    talk: { type: 'story', text: 'The dogs will not cross the Yard after dark. They never used to mind.' } },
  ],
  cameras: [
    { id: 'yd-light-1', kind: 'searchlight', min: 13, max: 25, halfWidth: 2.2, speed: 2.2, awaySeconds: 3,
      mountX: 33.2, mountY: 7.8, guardId: 'yd-tower-1' },
    { id: 'yd-light-2', kind: 'searchlight', min: 52, max: 66, halfWidth: 2.2, speed: 1.8, awaySeconds: 3,
      mountX: 68.7, mountY: 7.8, guardId: 'yd-tower-2' },
  ],
  // On the map the roof is its own box, next to the Guard Office, and shows once you get up there.
  mapParts: [
    { id: 'yard-roof', name: 'Roof ledge', floor: 2, col: 3, zone: { from: 0, to: 38, minY: 5 }, link: 'ladder' },
  ],
  mapMarks: ['Tower 1', 'Tower 2'],
};

// Inside the equipment shed. You get in through the roof hatch and out through the door, which
// is latched on the inside.
const shed = {
  id: 'shed',
  name: 'Equipment Shed',
  floor: 1,
  col: 4,
  width: 9,
  wallColor: 0x4a4436,
  hideSpots: [],
  portals: [
    { id: 'sh-hatch', type: 'hatch', x: 2, to: 'yard', toPortal: 'yd-hatch' },
    { id: 'sh-door', type: 'door', oneWay: true, x: 7, to: 'yard', toPortal: 'yd-shed-door' },
  ],
  items: [{ id: 'boots', type: 'boots', x: 4.5 }],
  guards: [],
};

// Where you wake up the first time you are caught. Nothing in it, and the door is not yours to open.
const solitary = {
  id: 'solitary',
  name: 'Solitary',
  floor: 1,
  col: -1,
  width: 8,
  wallColor: 0x2a2e36,
  playerStart: 3,
  hideSpots: [],
  portals: [
    { id: 'so-door', type: 'door', locked: true, hidden: true, x: 6.5, to: 'cell-block', toPortal: 'cb-solitary' },
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
  yard,
  shed,
  solitary,
});

export const PRISON = Object.freeze({ startRoom: 'cell-block', rooms: ROOMS });

// The gym: an obstacle course for jump, slide, and dash, left to right, with a sign over each
// part and a finish line. It is not part of the prison and has no headcount. Reached with ?room=gym.
//   solids are boxes to stand on or slide under: { x, halfWidth, bottom, top }. They block sight.
//   pits are stretches with no floor: { from, to }.
//   signs hang on the back wall: { x, text, hint }.
//   bounds keep a guard on his own stretch of floor, so he never walks through a crate.
const gym = {
  id: 'gym',
  name: 'Gym (obstacle course)',
  floor: 0,
  col: 0,
  width: 84,
  wallColor: 0x3f4a44,
  playerStart: 3,
  signs: [
    { x: 8, text: '1. JUMP (K / B)', hint: 'tap for a short hop' },
    { x: 17, text: '2. HOLD JUMP TO GO HIGHER', hint: 'let go early to cut it short' },
    { x: 27, text: '3. SLIDE (crouch + jump)', hint: 'S + K while moving' },
    { x: 37.5, text: '4. DASH (L / RB)', hint: 'hold dash and jump: a dash jump' },
    { x: 51, text: '5. AIR DASH', hint: 'jump, then dash in the air' },
    { x: 59.6, text: 'CUP ON THE TALL CRATE (E)', hint: 'hold F to aim, let go to throw', extra: true },
    { x: 66, text: '6. SNEAK PAST THE GUARD', hint: 'crates block his sight. Or lure him with the cup' },
    { x: 80, text: 'FINISH', hint: 'E to run it again' },
  ],
  solids: [
    // 1. A low crate: a tap of jump clears it.
    { id: 'hop', kind: 'crate', x: 9, halfWidth: 0.6, bottom: 0, top: 0.45 },
    // 2. A tall crate: needs the full jump.
    { id: 'high', kind: 'crate', x: 18.5, halfWidth: 1, bottom: 0, top: 1.15 },
    // 3. A low gap: too low to crouch under, so it needs a slide.
    { id: 'low-gap', kind: 'wall', x: 28, halfWidth: 1.2, bottom: 0.75, top: 4.4 },
    // 6. Two crates as steps up to a ledge that runs over the guard's head.
    { id: 'step-1', kind: 'crate', x: 60.5, halfWidth: 0.7, bottom: 0, top: 1 },
    { id: 'step-2', kind: 'crate', x: 62.3, halfWidth: 1, bottom: 0, top: 2 },
    { id: 'ledge', kind: 'ledge', x: 68.5, halfWidth: 4, bottom: 2.7, top: 3 },
    // Low cover past the end of his patrol: it only hides you if you crouch behind it.
    { id: 'low-cover', kind: 'crate', x: 77.4, halfWidth: 0.5, bottom: 0, top: 1 },
  ],
  pits: [
    // 4. Too wide for a running jump, even a late one. A dash jump clears it.
    { id: 'dash-gap', from: 39, to: 44.5 },
    // 5. Wider still. Jump, then dash in the air.
    { id: 'air-gap', from: 52, to: 58.5 },
  ],
  hideSpots: [{ id: 'gym-dark', type: 'dark', x: 70, halfWidth: 1.1 }],
  portals: [],
  // On top of the tall crate, where the course takes you anyway.
  items: [{ id: 'gym-cup', type: 'cup', x: 62.6, y: 2 }],
  guards: [{ id: 'gym-guard', patrol: [64.5, 75.5], startX: 68, facing: 1, bounds: [63.7, 76.6],
    talk: { type: 'story', text: 'My badge logs a door on sub-level four. There is no sub-level four.' } }],
  finish: { x: 80 },
};

export const GYM = Object.freeze({ startRoom: 'gym', practice: true, rooms: { gym } });
