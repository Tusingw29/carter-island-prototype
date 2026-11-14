# Carter Island (prototype)

A 2.5D stealth prison-escape metroidvania for the browser: Metal Gear style sneaking plus
metroidvania backtracking. "Carter Island" is a placeholder name.

Lights out. You have 9 minutes on the headcount timer. Sneak out of your cell, steal the
keycard from the Guard Office, and be back in your bed before headcount. The timer never
stops, and getting spotted costs time.

This prototype exists to answer one question: **is the core loop fun?**

## Play

**https://tusingw29.github.io/carter-island-prototype/**

Right now this is a "coming soon" page. Gameplay arrives with Step 1 in
[docs/TASKS.md](docs/TASKS.md).

## Controls

Keyboard and controller both work.

| Action | Keyboard | Controller |
| --- | --- | --- |
| Move | A / D | Left stick |
| Enter locker, door, or vent; open door (tap fast, hold slow) | W | D-pad or stick Up |
| Crouch | S | Down |
| Run | Shift | Right Trigger |
| Interact, pick up, grab keycard (tap fast, hold slow) | E | A (bottom face button) |
| Knockout, drag body | Space | X (left face button) |
| Break free (mash) | Space | X |
| Map | M | Select / View |
| Pause | Esc | Start |
| Debug mode | F1 | |

## Run it locally

No install and no build step. You need Node 22 or newer for the tests and Python 3 for the
local server.

```sh
npm test       # run the tests
npm run dev    # then open http://localhost:4173
```

## More

- [docs/DESIGN.md](docs/DESIGN.md): the full design spec
- [docs/TASKS.md](docs/TASKS.md): the task board
- [CONTRIBUTING.md](CONTRIBUTING.md): code style and how the repo works
