# Source Map Reference

This is a quick reference for what each important file does.

## App Routes

`app/page.tsx`

Engine welcome page.

`app/demo/page.tsx`

Demo game landing page. Reads database counts to show what the demo contains.

`app/login/page.tsx`

Login route. Renders `AuthForm`.

`app/register/page.tsx`

Register route. Renders `AuthForm`.

`app/play/page.tsx`

Protected game route. Loads the current user, that user's characters, and available classes.

`app/admin/page.tsx`

Protected admin route. Requires `User.role === "ADMIN"`.

`app/docs/page.tsx`

Reads markdown files from `docs/` and displays them.

`app/styles.css`

Global styles, old-school MUD client skin, admin styles, and responsive layout.

## API Routes

`app/api/auth/login/route.ts`

Checks email/password and sets a signed session cookie.

`app/api/auth/register/route.ts`

Creates a new user and logs them in.

`app/api/auth/logout/route.ts`

Clears the session cookie.

`app/api/game/character/route.ts`

Lists or creates characters.

`app/api/game/state/route.ts`

Returns character, room, map, inventory, spells, quests, party, players, and recent chat messages.

`app/api/game/command/route.ts`

Runs a typed MUD command through `lib/engine/commands.ts`.

`app/api/game/chat/route.ts`

Sends chat directly.

`app/api/game/heartbeat/route.ts`

Marks a character as recently online.

`app/api/game/party/route.ts`

Handles invite, accept, and leave party API calls.

`app/api/game/recruit/route.ts`

Handles recruit and dismiss companion API calls.

`app/api/game/quest/route.ts`

Handles accept and complete quest API calls.

`app/api/admin/[model]/route.ts`

Generic admin CRUD route for supported Prisma models.

## Components

`components/game/AuthForm.tsx`

Login/register form component.

`components/game/GameClient.tsx`

Main old-school MUD client. Contains minimap, room viewport, stat bars, log, command input, roster, actions, inventory, and quests.

`components/admin/AdminDashboard.tsx`

Generic database editor for admin users.

## Library Files

`lib/db.ts`

Creates and exports a shared Prisma client.

`lib/auth.ts`

Password hashing, session signing, cookie helpers, current-user helpers.

`lib/socket.ts`

Realtime event contract and notes for replacing polling with Socket.IO/WebSockets.

## Engine Files

`lib/engine/types.ts`

Shared engine types such as directions and log entries.

`lib/engine/characters.ts`

Creates characters, assigns starting room, starting stats, starting inventory, and starting spells.

`lib/engine/rooms.ts`

Loads room state, map nodes, visible players, messages, and movement logic.

`lib/engine/commands.ts`

Parses text commands and routes them to the correct engine system.

`lib/engine/chat.ts`

Creates chat messages and system messages.

`lib/engine/combat.ts`

Attack and spell combat, monster damage, player damage, loot, EXP, gold, and death behavior.

`lib/engine/items.ts`

Uses inventory items, currently potions.

`lib/engine/quests.ts`

Accepts and completes quests.

`lib/engine/parties.ts`

Creates parties, invites players, accepts invites, leaves parties, recruits companions, and dismisses companions.

`lib/engine/progression.ts`

Handles XP, level-ups, stat points, and stat allocation.

## Prisma

`prisma/schema.prisma`

Database schema.

`prisma/seed.ts`

Creates the Mirage Web RPG demo game and test accounts.

`prisma/init.sql`

Generated SQL used by the local setup command.

`prisma/dev.db`

Local SQLite database.
