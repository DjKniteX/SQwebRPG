# SQwebRPG

SQwebRPG is a reusable Next.js framework for building multiplayer browser RPGs, PBBGs, dungeon crawlers, and MUD-style games.

It includes:

- A reusable engine layer in `lib/engine`
- SQLite persistence with Prisma
- Simple custom login/register
- A playable demo game: **Mirage Web RPG**
- A browser admin/database editor inspired by RPG Maker database windows
- XP-based leveling with assignable RPG stats
- Documentation for creating your own game content

## Technologies And Why They Are Used

### Next.js App Router

Next.js provides pages, layouts, API routes, server-side data loading, and production builds in one project. SQwebRPG uses it for the welcome page, demo page, play client, admin dashboard, docs, and backend APIs.

### React

React powers the interactive browser client. The room panel, stats panel, chat panel, command input, inventory, quests, party panel, combat panel, and admin editor are React components.

### TypeScript

TypeScript helps catch mistakes while building. RPG engines connect many systems, so types reduce errors when moving data between rooms, characters, quests, items, spells, and combat.

### Prisma ORM

Prisma is the database toolkit. It defines the SQLite schema in `prisma/schema.prisma` and gives typed database access in the app.

### SQLite

SQLite is used for local development because it is simple and file-based. You can run the whole engine without installing a separate database server.

### Zod

Zod validates API input, such as login forms, commands, character creation, and admin requests.

### Socket.IO / WebSocket Support

The project includes `socket.io` dependencies and a realtime event contract in `lib/socket.ts`. The current MVP uses short-polling API routes for presence/chat because it works inside the standard Next.js dev server. The transport can be upgraded to Socket.IO or WebSockets without rewriting engine logic.

## Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run setup:demo
npm run dev
```

Open:

```text
http://localhost:3000
```

If port 3000 is busy, Next.js will print another localhost URL.

## Demo Accounts

Admin:

```text
email: admin@example.com
password: admin123
```

Players:

```text
email: player1@example.com
password: player123

email: player2@example.com
password: player123
```

Demo characters:

- Aric the Warrior
- Selene the Mage

## Routes

```text
/          Engine welcome page
/demo      Mirage Web RPG demo landing page
/login     Login
/register  Create account
/play      Playable game client
/admin     RPG Maker-style database editor
/docs      Documentation viewer
```

## Demo Game

Mirage Web RPG is a fantasy frontier demo near an ancient forest. It includes:

- Starter town
- Tavern
- Quest board
- Forest path
- Ruined shrine
- Goblin cave
- The Goblin Warrens dungeon
- 13 rooms
- 6 monsters
- 4 recruitable NPC companions
- 5 quests
- 10 items
- 6 spells/skills
- 4 classes

## Folder Structure

```text
app/          Next.js pages and API routes
components/   Game and admin React components
lib/          Database, auth, socket contracts, and engine logic
lib/engine/   Reusable RPG systems
prisma/       Database schema and demo seed
docs/         Beginner documentation
public/       Static assets
```

## Engine Systems

```text
lib/engine/characters.ts   Character creation
lib/engine/rooms.ts        Room state, movement, presence
lib/engine/commands.ts     Typed MUD command router
lib/engine/chat.ts         Global/room/party chat helpers
lib/engine/combat.ts       Basic combat, rewards, loot, death behavior
lib/engine/items.ts        Item usage
lib/engine/quests.ts       Quest accept/complete
lib/engine/parties.ts      Player parties and recruitable NPCs
lib/engine/progression.ts  XP, level-ups, and stat allocation
```

## Useful Commands

```bash
npm run typecheck
npm run build
npm run prisma:push
npm run seed
npm run setup:demo
```

## Manual

The full source manual is available in:

```text
docs/manual.md
```

You can also read it in the browser at:

```text
/docs
```

Start there if you want to understand what each folder does, what is safe to change, how commands flow through the engine, and how to extend the demo into your own game.

## Roadmap

- Replace short polling with Socket.IO gateway
- Add true dungeon instancing
- Add cooldown timers and combat ticks
- Add structured admin forms on top of JSON editor mode
- Add equipment calculations
- Add quest objective automation
- Add permissions and audit logs
- Add content export/import for standalone game packages
