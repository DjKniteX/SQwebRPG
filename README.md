# SQwebRPG
# Powered by CODEX

SQwebRPG is a completed reusable Next.js framework for building multiplayer browser RPGs, PBBGs, dungeon crawlers, and MUD-style games.

It is not one fixed game. It is a foundation that developers can use to create their own worlds, rules, content, stories, and player experiences. You can use it as-is, modify it, reskin it, extend it, or build a completely different browser RPG on top of it.

It includes:

- A reusable engine layer in `lib/engine`
- SQLite persistence with Prisma
- Simple custom login/register
- A playable demo game: **Mirage Web RPG**
- A browser admin/database editor inspired by RPG Maker database windows
- XP-based leveling with assignable RPG stats
- Documentation for using and extending the SQwebRPG framework

The documentation in this repository explains how to use SQwebRPG itself. If you build your own game with this framework, your game should have its own player-facing documentation for its story, classes, commands, maps, house rules, and content.

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

Mirage Web RPG is a fantasy frontier demo near an ancient forest. It exists as a reference game so developers and players can explore how SQwebRPG systems fit together. It includes:

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

## Implemented Features

SQwebRPG currently includes:

- Browser-based old-school MUD/JRPG client
- Custom login, registration, logout, and character selection
- Character creation with configurable class limits
- Data-driven rooms, zones, exits, room images, room objects, NPCs, enemies, shops, quests, items, spells, skills, classes, and settings
- Admin dashboard for editing game content without touching engine code
- General settings for game name, version display, currency, EXP rates, party size, shop buyback, level caps, content limits, splash page content, and live mode
- Splash page flow for configured games and first-run world setup
- Mirage Web RPG demo world plus blank template setup
- Grid movement using commands, WASD, arrow keys, and clickable exits
- Minimap, world map modal, colored room tiles, and map grouping support
- Here/Object interaction panel with players, NPCs, enemies, objects, shops, companions, and party invite notices
- Command log with main and room tabs
- Global, room, party, and command-driven chat support
- Turn-based combat with enemy AI, companion AI, rewards, loot, EXP, and death handling
- Aggressive enemy behavior and monster respawn support
- Party system with player invites, accept/decline flow, party leader, kick/remove, promote player leader, NPC companions, shared party visibility, and party HP display
- Quest system with active and completed quest views, objective progress, non-repeatable quest handling, and NPC/board quest sources
- Leveling system with assignable stat points
- Inventory, usable items, stackable items, shops, item buying, item selling, and inn healing
- Spell and skill categories, support/damage behavior, healing friendly targets, and buff-style data fields
- Instanced dungeon flow with entry confirmation, level restrictions, party join prompts, completion return, and manual leave option
- Announcements with immediate send support
- Beginner-friendly source documentation and admin/editor guides

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

Start there if you want to understand what each folder does, what is safe to change, how commands flow through the engine, and how to build your own game with SQwebRPG.
