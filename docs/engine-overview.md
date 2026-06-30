# Engine Overview

The engine is intentionally separated from the demo game.

`lib/engine` contains reusable rules:

- Movement
- Room state
- Commands
- Chat
- Combat
- Items
- Quests
- Parties
- Recruitable NPCs

The database contains game content:

- Rooms
- Exits
- Monsters
- Items
- Spells
- Classes
- Dungeons
- Quests
- NPCs

The player UI and admin UI call API routes. The API routes call engine functions. Engine functions read and write database records.

Realtime behavior currently uses polling:

- `/api/game/state` refreshes room state, players, messages, monsters, NPCs, inventory, party, and quests.
- `/api/game/heartbeat` marks a character as online.
- Chat messages are stored and returned in room state.

`lib/socket.ts` defines the event shapes for a future Socket.IO/WebSocket transport.
