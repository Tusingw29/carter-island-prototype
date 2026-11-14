# Carter Island (prototype)

A 2.5D stealth prison-escape metroidvania for the browser: Metal Gear style sneaking plus
metroidvania backtracking. "Carter Island" is a placeholder name.

Lights out. You have 7 minutes on the headcount timer. Sneak out of your cell, steal the
keycard from the Guard Office, and be back in your bed before headcount. The timer never
stops, and getting spotted costs time.

This prototype exists to answer one question: **is the core loop fun?**

## Play

**https://tusingw29.github.io/carter-island-prototype/**

Runs in any current desktop browser. Keyboard or controller. No install.

## Controls

| Action | Keyboard | Controller |
| --- | --- | --- |
| Move | A / D | Left stick or D-pad |
| Crouch (silent, slow) | S | Down |
| Run (loud) | Shift | Right Trigger |
| Hide, use doors, stairs, and vents | W | Up |
| Creaky door: fast and loud / slow and quiet | tap W / hold W | tap Up / hold Up |
| Interact, pick up, sleep in bed | E | A (bottom face button) |
| Keycard: grab fast / lift quietly | tap E / hold E | tap A / hold A |
| Knock out from behind (unseen), drag body | Space | X (left face button) |
| Break free when grabbed | mash Space | mash X |
| Map | M | View / Select |
| Zoom the camera in or out | Z | Left Bumper |
| Pause | Esc | Start |
| Controls screen | C | Y (top face button) |
| Debug mode | F1 or ` | Right stick click |

## How to play

- A guard's flashlight is what he can see. Stay out of it.
- Walking is quiet, running is loud, crouching is silent.
- Press Up at lockers, laundry carts, tables, and shelves to hide. Stand still in a
  pitch-dark patch and nobody can see you.
- Three ways to do it: the front door (Mess Hall, then the Stairwell), the vents (find
  the screwdriver first), and a one-way drop that gets you home fast.
- A guard checks your bed when the timer reads 3:30. Be in it, or leave a dummy.
- Seen is not caught. A guard who spots you freezes for a moment, then chases, slower than
  your run. He has to wind up a lunge to grab you: run when he crouches. Stay out of his
  sight for two seconds and he loses you.
- Knocked-out guards wake up after 75 seconds. Every guard calls in on the radio once a
  minute, and a missed call brings another guard to look.
- The score screen gives you a rank: Ghost, Shadow, Inmate, or Caught.

## Run it locally

No install and no build step. You need Node 22 or newer for the tests and Python 3 for the
local server.

```sh
npm test       # run the tests
npm run dev    # then open http://localhost:4173
```

## Links for testing

Add these to the end of the play link.

| Link ending | What it does |
| --- | --- |
| `?debug` | Starts in debug mode: vision cones, noise ring, guard states, frame rate |
| `?room=stairwell&px=2` | Starts in that room at that spot |
| `?timer=30` | Starts with 30 seconds on the timer |
| `?room=gym` | The obstacle course: jump (K), dash (L), slide (S + K while moving). F1 shows tuning sliders |
| `?cam=close` | The close follow camera |
| `?cam=wide` | The same camera pulled back, showing twice as much floor |
| `?cam=room` | Shows the whole room if it fits; if not, follows you and stops at the walls |
| `?cam=smart` | Wide while you move; closes in when you hide, are grabbed, or a guard is near. The default |
| `?cues=off` | Turns off the PA announcements, wall clocks, and last-minute ticking |
| `?alarm` | Acts as if a camera saw you, so taking the keycard sets off the silent alarm |
| `?low` | Lowest picture quality, for very slow computers |

Room names: `cell-block`, `laundry`, `maintenance`, `mess-hall`, `stairwell`,
`guard-office`, `vent-duct`. In debug mode, `[` and `]` change the timer by 30 seconds.
Link endings combine with `&`, for example `?cam=room&debug`.

## More

- [docs/DESIGN.md](docs/DESIGN.md): the full design spec
- [docs/TASKS.md](docs/TASKS.md): the task board, with what to test for each step
- [CONTRIBUTING.md](CONTRIBUTING.md): code style and how the repo works
