# SQwebRPG Manual

This manual explains what the project is, what each major part does, what you can safely change, and how the source code fits together.

SQwebRPG is a starter engine for browser-based RPGs, PBBGs, dungeon crawlers, and MUD-style games. It includes one demo game, **Mirage Web RPG**, but the code is meant to become a reusable framework rather than one fixed game.

## 1. Big Picture

The app has four main layers:

```text
Browser UI
  |
Next.js API routes
  |
Engine functions
  |
SQLite database through Prisma
```

In plain language:

- The player clicks buttons or types commands in `/play`.
- React sends requests to API routes under `app/api/game`.
- API routes call reusable engine functions in `lib/engine`.
- Engine functions read and write data with Prisma.
- Prisma saves everything in SQLite.

The demo game content is not hardcoded into the React screen. It is seeded into the database by `prisma/seed.ts`.

## 2. Important Routes

```text
/          Engine welcome page
/demo      Demo game landing page
/login     Login page
/register  Create account page
/play      Main game client
/admin     Database/admin editor
/docs      Documentation viewer
```

### `/`

The engine welcome page. This is not the game itself. It explains what Mirage is and links to the demo, admin dashboard, docs, and login.

File:

```text
app/page.tsx
```

### `/demo`

The public landing page for Mirage Web RPG. It shows seeded demo counts such as rooms, monsters, quests, items, and classes.

File:

```text
app/demo/page.tsx
```

### `/play`

The main game client. This is where players move, chat, fight, recruit companions, view the minimap, and use commands.

Files:

```text
app/play/page.tsx
components/game/GameClient.tsx
```

### `/admin`

The admin database editor. It is intentionally general-purpose: pick a content type, pick an entry, edit JSON, save.

Files:

```text
app/admin/page.tsx
components/admin/AdminDashboard.tsx
app/api/admin/[model]/route.ts
```

### `/docs`

Displays markdown files from the `docs/` folder.

File:

```text
app/docs/page.tsx
```

## 3. Folder Guide

```text
app/
```

Next.js pages and API routes. Use this folder for browser routes and server endpoints.

```text
components/
```

React components. Use this folder for UI pieces like the game client and admin dashboard.

```text
lib/
```

Shared backend logic. This is where database access, auth, realtime contracts, and engine systems live.

```text
lib/engine/
```

The reusable game engine layer. This is the most important folder if you want to change rules.

```text
prisma/
```

Database schema, generated SQL, local SQLite database, and seed script.

```text
docs/
```

Project documentation.

## 4. Database And Content

The database structure lives in:

```text
prisma/schema.prisma
```

The demo data is created by:

```text
prisma/seed.ts
```

The seed script creates:

- Users
- Characters
- Classes
- Stats
- Zones
- Rooms
- Room exits
- Items
- Spells
- Loot tables
- Monsters
- Monster spawns
- NPCs
- Recruitable companions
- Quests
- Dungeon template
- Game settings
- Announcements

If you want to create a new game world, start by editing or replacing `prisma/seed.ts`, then run:

```bash
npm run setup:demo
```

That resets and reseeds the local database.

## 5. What You Can Safely Change

### Easy content changes

These are good beginner changes:

- Room names and descriptions
- Room coordinates
- Exits between rooms
- Monster names and stats
- Item names and stats
- Spell names, costs, and power
- Quest titles and rewards
- NPC dialogue
- Recruitable companion stats
- Demo account names/passwords

Most of those are in:

```text
prisma/seed.ts
```

### UI changes

Change the main visual style in:

```text
app/styles.css
```

Change the game screen structure in:

```text
components/game/GameClient.tsx
```

Change the admin editor in:

```text
components/admin/AdminDashboard.tsx
```

### Engine rule changes

Change movement rules in:

```text
lib/engine/rooms.ts
```

Change command parsing in:

```text
lib/engine/commands.ts
```

Change combat in:

```text
lib/engine/combat.ts
```

Change quests in:

```text
lib/engine/quests.ts
```

Change item use in:

```text
lib/engine/items.ts
```

Change party and recruitable NPC rules in:

```text
lib/engine/parties.ts
```

## 6. Game Client Source Walkthrough

The main game client is:

```text
components/game/GameClient.tsx
```

It does several things:

1. Stores the selected character.
2. Polls `/api/game/state` to refresh room state.
3. Sends commands to `/api/game/command`.
4. Sends heartbeat updates so other players can see you.
5. Renders the old-school MUD interface.

Important pieces inside `GameClient.tsx`:

```text
MiniMap
```

Draws the clickable room map. It uses room `x` and `y` coordinates plus exits.

```text
RoomPanel
```

Shows the current room, description, exits, zone, players, and monster count.

```text
StatsPanel
```

Shows character level, class, attack, defense, assignable stats, stat points, XP, and gold.

```text
ActionPanel
```

Shows compact buttons. `Look` and `Search` are always visible. Other actions are grouped into categories: Core, Combat, Magic, Skills, Items, and Quests.

```text
GameLog
```

Shows chat and command feedback.

```text
CommandInput
```

Lets players type MUD commands.

## 7. Command System

Commands are routed in:

```text
lib/engine/commands.ts
```

Supported examples:

```text
north
south
east
west
n
s
e
w
look
search
say hello
global hello everyone
attack goblin
cast firebolt at goblin
use minor healing potion
accept quest ironwood
complete quest ironwood
invite Selene
accept party
leave party
recruit Garrick
dismiss Garrick
train strength
train agility
train intellect
train wisdom
train stamina
rest
stats
inventory
equipment
quests
help
```

Every command eventually calls an engine function. Clickable buttons call the same command system, which keeps mouse and text controls consistent.

To add a new command:

1. Open `lib/engine/commands.ts`.
2. Add a new `if` branch for the command.
3. Call an existing engine function or create a new one.
4. Add a button in `GameClient.tsx` if you want mouse support.

## 8. Movement And Map System

Movement lives in:

```text
lib/engine/rooms.ts
```

Rooms are database records. Exits are also database records.

Each room has:

- `id`
- `name`
- `description`
- `zoneId`
- `safe`
- `requiredLevel`
- `requiredItemId`
- `x`
- `y`

Each exit has:

- `fromRoomId`
- `toRoomId`
- `direction`
- `requiredLevel`
- `requiredItemId`

The minimap uses room coordinates:

```text
x: horizontal position
y: vertical position
```

Adjacent room exits are drawn as connecting map lines.

To add a room:

1. Add a `Room` in `prisma/seed.ts`.
2. Give it coordinates.
3. Add `RoomExit` records to connect it.
4. Run `npm run setup:demo`.

## 9. Combat System

Combat lives in:

```text
lib/engine/combat.ts
```

Current combat flow:

1. Player attacks or casts a spell.
2. Engine finds a living monster in the current room.
3. Damage is calculated.
4. Monster HP is reduced.
5. If the monster survives, it attacks back.
6. If the monster dies, player gets EXP, gold, and possible loot.
7. If player HP reaches zero, player is moved to a safe room with partial HP and loses a small amount of gold.

This is intentionally simple and easy to replace.

Good beginner changes:

- Increase monster damage.
- Change loot chance.
- Change death penalty.
- Add hit chance.
- Add critical hits.
- Add companion auto-attacks.

## 9.1 Leveling And Stat Points

Experience points are shown as `XP` in the game client. Gold is shown in the stats panel as `Gold`.

Current leveling rules live in:

```text
lib/engine/progression.ts
```

The current formula is:

```text
next level XP = current level * 100
```

When a character levels up:

- Level increases by 1.
- The player gains 3 stat points.
- Max HP increases.
- Max MP increases.
- HP and MP are partially increased along with those maximums.

Players can spend stat points on:

```text
Strength   Improves attack
Agility    Improves attack
Intellect  Improves MP
Wisdom     Improves MP and defense
Stamina    Improves HP and defense
```

The old-school client exposes stat allocation under the `Skills` action category.

Typed commands also work:

```text
train strength
train agility
train intellect
train wisdom
train stamina
```

This is inspired by classic tabletop and computer RPG stat allocation. The exact formulas are intentionally simple so they can be changed later.

## 10. Items And Inventory

Items are defined by the `Item` model in `prisma/schema.prisma`.

Item use lives in:

```text
lib/engine/items.ts
```

Current item support:

- Stackable inventory items
- Usable potions
- HP restore
- MP restore
- Equipment data model exists, but full equipment math is a roadmap item

To create a new potion:

1. Add an item in `prisma/seed.ts`.
2. Set `usable: true`.
3. Set `hpRestore` or `mpRestore`.
4. Add it to player inventory, a quest reward, or a loot table.

## 11. Quests

Quest rules live in:

```text
lib/engine/quests.ts
```

Quest data uses:

- `Quest`
- `QuestObjective`
- `CharacterQuest`

Current quest support:

- Accept quest
- Complete quest
- Reward EXP
- Reward gold
- Reward item

Quest objective automation is not complete yet. For now, quests can be completed through command/admin flow.

To add a quest:

1. Add a `Quest` in `prisma/seed.ts`.
2. Add at least one `QuestObjective`.
3. Add rewards.
4. Optional: assign `sourceNpcId`.
5. Run `npm run setup:demo`.

## 12. Parties And Recruitable NPCs

Party and companion rules live in:

```text
lib/engine/parties.ts
```

Current support:

- Create/get party automatically
- Invite another player
- Accept party invite
- Leave party
- Recruit NPC companion
- Dismiss NPC companion
- Max party size is enforced as 4 total slots

Recruitable NPCs count toward party size.

To add a recruitable companion:

1. Add a `RecruitableNPC` in `prisma/seed.ts`.
2. Set role, stats, cost, dialogue, AI behavior, and room.
3. Run `npm run setup:demo`.

## 13. Chat And Presence

Chat lives in:

```text
lib/engine/chat.ts
```

Presence is handled in:

```text
lib/engine/rooms.ts
app/api/game/heartbeat/route.ts
```

Current realtime approach:

- The game client polls `/api/game/state`.
- The client sends a heartbeat every few seconds.
- Characters with recent `lastSeenAt` values appear as present in the room.
- Chat messages are stored in the database and returned with state.

This is simple and reliable in normal Next.js dev mode.

Future upgrade:

- Add a Socket.IO server or WebSocket gateway.
- Emit the event shapes from `lib/socket.ts`.
- Keep engine functions unchanged.

## 14. Admin Editor

Admin UI:

```text
components/admin/AdminDashboard.tsx
```

Admin API:

```text
app/api/admin/[model]/route.ts
```

The admin editor is a database editor. It lets admins:

- Choose a model category
- Search entries
- Select an entry
- Edit JSON
- Save
- Duplicate
- Delete
- Create new entries

It is intentionally generic so new models can be added without designing a whole new page.

Current admin categories include:

- Classes
- Rooms
- Monsters
- NPCs
- Companions
- Quests
- Items
- Spells
- Dungeons
- Announcements
- Users
- Characters

To add a new admin category:

1. Add the Prisma model to `prisma/schema.prisma`.
2. Regenerate Prisma.
3. Add it to `modelMap` in `app/api/admin/[model]/route.ts`.
4. Add the category name to `models` in `components/admin/AdminDashboard.tsx`.

## 15. Authentication

Auth lives in:

```text
lib/auth.ts
```

Current auth is intentionally simple:

- Email/password accounts
- Scrypt password hashing
- Signed HTTP-only cookie session
- Admin role stored on `User.role`

This is good for a local/demo engine. For production, you may eventually replace it with NextAuth/Auth.js or a more complete auth system.

## 16. Generated Files

You may see:

```text
node_modules/
.next/
prisma/dev.db
prisma/init.sql
```

These are generated or local runtime files.

Do not hand-edit:

- `node_modules`
- `.next`

Usually do not hand-edit:

- `prisma/dev.db`
- `prisma/init.sql`

Edit these instead:

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `lib/engine/*`
- `components/*`
- `app/styles.css`

## 17. Common Workflows

### Run the app

```bash
npm run dev
```

### Reset and reseed the demo database

```bash
npm run setup:demo
```

### Check TypeScript

```bash
npm run typecheck
```

### Build for production

```bash
npm run build
```

### Add a new room

1. Edit `prisma/seed.ts`.
2. Add a `room(...)` entry.
3. Add exits in the `exits([...])` list.
4. Run `npm run setup:demo`.
5. Log in and move to the new room.

### Add a new spell

1. Edit `prisma/seed.ts`.
2. Add a `spell(...)` entry.
3. Assign it to a class or make it class-neutral.
4. Run `npm run setup:demo`.

### Change leveling rules

1. Open `lib/engine/progression.ts`.
2. Change `nextLevelExp`.
3. Change how many stat points are awarded in `awardExperience`.
4. Change `statEffects` in `allocateStat`.
5. Run `npm run typecheck`.

### Change the game UI

1. Open `components/game/GameClient.tsx`.
2. Find the small component for the panel you want.
3. Adjust layout or content.
4. Open `app/styles.css` for visual styling.

## 18. What To Build Next

Good next steps:

- Add true quest objective tracking.
- Add equipment stat calculations.
- Add structured admin forms instead of only JSON editing.
- Add Socket.IO realtime transport.
- Add dungeon instances.
- Add combat cooldowns.
- Add companion AI turns.
- Add map editor UI.
- Add export/import for game packages.

## 19. Mental Model

When you are unsure where to make a change, ask:

```text
Is this a page or API endpoint?       app/
Is this visual UI?                    components/
Is this a game rule?                  lib/engine/
Is this database shape?               prisma/schema.prisma
Is this demo content?                 prisma/seed.ts
Is this explanatory text?             docs/
```

That separation is the main design idea of Mirage.
