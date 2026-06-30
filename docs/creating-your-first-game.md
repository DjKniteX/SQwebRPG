# Creating Your First Game

Mirage is designed so game content lives in the database instead of hardcoded engine files.

To make a new game:

1. Create zones.
2. Create rooms inside those zones.
3. Create exits between rooms.
4. Create classes.
5. Create items.
6. Create spells.
7. Create monsters and loot tables.
8. Place monsters in rooms.
9. Create NPCs and recruitable companions.
10. Create quests and objectives.
11. Create dungeon templates.

Use `/admin` to inspect and edit seeded content.

The demo seed in `prisma/seed.ts` is a practical example of creating a complete starter game.
