import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function main() {
  await clearDatabase();

  await prisma.user.createMany({
    data: [
      { email: "admin@example.com", passwordHash: hashPassword("admin123"), role: "ADMIN" },
      { email: "player1@example.com", passwordHash: hashPassword("player123"), role: "PLAYER" },
      { email: "player2@example.com", passwordHash: hashPassword("player123"), role: "PLAYER" }
    ]
  });

  await prisma.class.createMany({
    data: [
      { id: "warrior", name: "Warrior", description: "Durable front-line fighter.", baseHp: 42, baseMp: 8, baseAttack: 9, baseDefense: 7 },
      { id: "rogue", name: "Rogue", description: "Fast damage dealer with dirty tricks.", baseHp: 32, baseMp: 12, baseAttack: 10, baseDefense: 4 },
      { id: "mage", name: "Mage", description: "Elemental spellcaster with fragile defenses.", baseHp: 26, baseMp: 28, baseAttack: 5, baseDefense: 3 },
      { id: "cleric", name: "Cleric", description: "Support caster with healing magic.", baseHp: 34, baseMp: 24, baseAttack: 6, baseDefense: 5 }
    ]
  });

  for (const klass of [
    ["warrior", 9, 5, 4, 2, 2, 8],
    ["rogue", 5, 10, 9, 3, 2, 5],
    ["mage", 2, 4, 4, 10, 4, 3],
    ["cleric", 4, 4, 3, 5, 9, 6]
  ] as const) {
    await prisma.statTemplate.create({ data: { id: `${klass[0]}-stats`, classId: klass[0], strength: klass[1], dexterity: klass[2], agility: klass[3], intellect: klass[4], wisdom: klass[5], stamina: klass[6] } });
  }

  await prisma.zone.createMany({
    data: [
      { id: "ironwood-frontier", name: "Ironwood Frontier", description: "A hard frontier town pressed against an ancient forest." },
      { id: "ironwood-forest", name: "Ancient Ironwood", description: "Old trees, buried ruins, and half-awake machines." },
      { id: "goblin-warrens", name: "The Goblin Warrens", description: "A cramped cave dungeon claimed by goblin raiders." },
      { id: "clockwork-depths", name: "Clockwork Depths", description: "A deeper machine dungeon for seasoned parties." }
    ]
  });

  await prisma.mapGroup.createMany({
    data: [
      { id: "ironwood-village", name: "Ironwood Village", description: "Town rooms, services, and social spaces.", category: "Village", zoneId: "ironwood-frontier" },
      { id: "blackroot-woods", name: "Blackroot Woods", description: "Outdoor forest and ruin rooms.", category: "Wilderness", zoneId: "ironwood-forest" },
      { id: "warrens-map-group", name: "Goblin Warrens", description: "Instanced dungeon rooms.", category: "Dungeon", zoneId: "goblin-warrens" },
      { id: "clockwork-map-group", name: "Clockwork Depths", description: "Higher-level instanced machine rooms.", category: "Dungeon", zoneId: "clockwork-depths" }
    ]
  });

  await prisma.room.createMany({
    data: [
      room("ironwood-town-square", "Ironwood Town Square", "A muddy square ringed by lanterns, job boards, and watch posts.", "ironwood-frontier", true, 0, 0, "town", "T", "Village", "Square", "ironwood-village", "/images/rooms/town.svg"),
      room("embers-tavern", "The Ember's Rest Tavern", "A warm tavern where adventurers trade rumors and recruit help.", "ironwood-frontier", true, 1, 0, "building", "H", "Village", "Inn", "ironwood-village", "/images/rooms/tavern.svg"),
      room("quest-board", "Quest Board", "A rain-stained board packed with monster bounties, escort notes, and forest warnings.", "ironwood-frontier", true, -1, 0, "building", "B", "Village", "Notice Board", "ironwood-village", "/images/rooms/town.svg"),
      room("blackroot-gate", "Blackroot Gate", "The north gate opens toward the ancient forest.", "ironwood-frontier", false, 0, -1, "road", "G", "Village", "Gate", "ironwood-village", "/images/rooms/gate.svg"),
      room("forest-path", "Forest Path", "Ironwood trees lean over the path like old judges.", "ironwood-forest", false, 0, -2, "grass", "F", "Wilderness", "Road", "blackroot-woods", "/images/rooms/forest.svg"),
      room("hunter-camp", "Hunter Camp", "A smoky camp with traps, wounded scouts, and rough maps of the woods.", "ironwood-forest", false, 1, -2, "building", "C", "Wilderness", "Camp", "blackroot-woods", "/images/rooms/camp.svg"),
      room("ruined-shrine", "Ruined Shrine", "Broken stones hum around a buried metal altar.", "ironwood-forest", false, 0, -3, "ruin", "R", "Wilderness", "Ruin", "blackroot-woods", "/images/rooms/shrine.svg"),
      room("machine-dig", "Buried Machine Dig", "Copper ribs and glass lenses protrude from the soil beneath the roots.", "ironwood-forest", false, -1, -3, "ruin", "M", "Wilderness", "Ruin", "blackroot-woods", "/images/rooms/ruins.svg"),
      room("cave-mouth", "Goblin Cave Mouth", "A low cave reeks of smoke, fungus, and stolen iron.", "ironwood-forest", false, 0, -4, "cave", "D", "Dungeon Entrance", "Cave", "blackroot-woods", "/images/rooms/cave.svg"),
      room("warrens-entrance", "Entrance Tunnel", "Scratch marks cover the walls. Small footprints vanish deeper in.", "goblin-warrens", false, 0, -5, "dungeon", "D", "Dungeon", "Floor", "warrens-map-group", "/images/rooms/dungeon.svg"),
      room("fungus-hall", "Fungus Hall", "Blue fungus lights a wet chamber full of chittering echoes.", "goblin-warrens", false, 1, -5, "dungeon", "D", "Dungeon", "Floor", "warrens-map-group", "/images/rooms/dungeon.svg"),
      room("broken-shrine", "Broken Shrine", "A stolen shrine bell hangs from a cracked stalagmite.", "goblin-warrens", false, 1, -6, "dungeon", "D", "Dungeon", "Puzzle", "warrens-map-group", "/images/rooms/shrine.svg"),
      room("goblin-king-den", "Goblin King's Den", "A crude throne of wagon wheels and bones faces a buried machine hatch.", "goblin-warrens", false, 0, -6, "dungeon", "D", "Dungeon", "Boss Room", "warrens-map-group", "/images/rooms/dungeon.svg"),
      room("clockwork-foyer", "Clockwork Foyer", "Bronze teeth grind behind the walls. A warning plate demands seasoned adventurers only.", "clockwork-depths", false, -2, -4, "dungeon", "5", "Dungeon", "Entrance", "clockwork-map-group", "/images/rooms/ruins.svg"),
      room("gear-bridge", "Gear Bridge", "A narrow bridge crosses a pit of turning gears.", "clockwork-depths", false, -2, -5, "dungeon", "D", "Dungeon", "Bridge", "clockwork-map-group", "/images/rooms/dungeon.svg"),
      room("steam-gallery", "Steam Gallery", "Hot pipes cough clouds across cracked stone.", "clockwork-depths", false, -1, -5, "dungeon", "D", "Dungeon", "Hazard", "clockwork-map-group", "/images/rooms/dungeon.svg"),
      room("battery-vault", "Battery Vault", "Blue coils hum behind iron cages.", "clockwork-depths", false, -1, -6, "dungeon", "D", "Dungeon", "Vault", "clockwork-map-group", "/images/rooms/ruins.svg"),
      room("assembly-floor", "Assembly Floor", "Broken constructs twitch on half-built frames.", "clockwork-depths", false, -2, -6, "dungeon", "D", "Dungeon", "Workshop", "clockwork-map-group", "/images/rooms/dungeon.svg"),
      room("overseer-core", "Overseer Core", "A huge brass heart beats inside a ring of black glass.", "clockwork-depths", false, -3, -6, "dungeon", "B", "Dungeon", "Boss Room", "clockwork-map-group", "/images/rooms/shrine.svg")
    ]
  });

  await exits([
    ["ironwood-town-square", "embers-tavern", "east"], ["embers-tavern", "ironwood-town-square", "west"],
    ["ironwood-town-square", "quest-board", "west"], ["quest-board", "ironwood-town-square", "east"],
    ["ironwood-town-square", "blackroot-gate", "north"], ["blackroot-gate", "ironwood-town-square", "south"],
    ["blackroot-gate", "forest-path", "north"], ["forest-path", "blackroot-gate", "south"],
    ["forest-path", "hunter-camp", "east"], ["hunter-camp", "forest-path", "west"],
    ["forest-path", "ruined-shrine", "north"], ["ruined-shrine", "forest-path", "south"],
    ["ruined-shrine", "machine-dig", "west"], ["machine-dig", "ruined-shrine", "east"],
    ["ruined-shrine", "cave-mouth", "north"], ["cave-mouth", "ruined-shrine", "south"],
    ["cave-mouth", "warrens-entrance", "north"], ["warrens-entrance", "cave-mouth", "south"],
    ["warrens-entrance", "fungus-hall", "east"], ["fungus-hall", "warrens-entrance", "west"],
    ["fungus-hall", "broken-shrine", "north"], ["broken-shrine", "fungus-hall", "south"],
    ["broken-shrine", "goblin-king-den", "west"], ["goblin-king-den", "broken-shrine", "east"],
    ["machine-dig", "clockwork-foyer", "west"], ["clockwork-foyer", "machine-dig", "east"],
    ["clockwork-foyer", "gear-bridge", "north"], ["gear-bridge", "clockwork-foyer", "south"],
    ["gear-bridge", "steam-gallery", "east"], ["steam-gallery", "gear-bridge", "west"],
    ["steam-gallery", "battery-vault", "north"], ["battery-vault", "steam-gallery", "south"],
    ["battery-vault", "assembly-floor", "west"], ["assembly-floor", "battery-vault", "east"],
    ["assembly-floor", "overseer-core", "west"], ["overseer-core", "assembly-floor", "east"]
  ]);

  await prisma.item.createMany({
    data: [
      item("minor-healing-potion", "Minor Healing Potion", "Potion", "common", 12, true, true, false, 20, 0, 0, 0),
      item("mana-draught", "Mana Draught", "Potion", "common", 16, true, true, false, 0, 14, 0, 0),
      item("ironwood-blade", "Ironwood Blade", "Weapon", "uncommon", 80, false, false, true, 0, 0, 4, 0),
      item("frontier-shield", "Frontier Shield", "Armor", "common", 55, false, false, true, 0, 0, 0, 3),
      item("goblin-ear", "Goblin Ear", "Material", "common", 3, true, false, false, 0, 0, 0, 0),
      item("ancient-cog", "Ancient Cog", "Quest", "rare", 0, true, false, false, 0, 0, 0, 0),
      item("wolf-pelt", "Wolf Pelt", "Material", "common", 9, true, false, false, 0, 0, 0, 0),
      item("cleric-charm", "Cleric Charm", "Accessory", "uncommon", 65, false, false, true, 0, 0, 0, 2),
      item("spark-crystal", "Spark Crystal", "Material", "rare", 35, true, false, false, 0, 0, 0, 0),
      item("king-crown-fragment", "Goblin Crown Fragment", "Quest", "rare", 0, false, false, false, 0, 0, 0, 0),
      item("overseer-core-shard", "Overseer Core Shard", "Quest", "rare", 0, false, false, false, 0, 0, 0, 0),
      item("clockwork-spring", "Clockwork Spring", "Material", "uncommon", 22, true, false, false, 0, 0, 0, 0)
    ]
  });

  await prisma.spell.createMany({
    data: [
      spell("firebolt", "Firebolt", "Damage", "fire", 5, 3, "enemy", 14, "intellect", "mage", 1),
      spell("ice-shard", "Ice Shard", "Damage", "ice", 6, 4, "enemy", 13, "intellect", "mage", 1),
      spell("heal", "Heal", "Heal", "holy", 6, 5, "ally", 18, "wisdom", "cleric", 2, "Support", "Heal", 0, null, 0, 0),
      spell("renew", "Renew", "Buff", "holy", 8, 8, "ally", 0, "wisdom", "cleric", 5, "Support", "Regeneration", 30, null, 0, 5),
      spell("guard-stance", "Guard Stance", "Buff", "physical", 3, 8, "self", 5, "stamina", "warrior", 1, "Support", "Defense Buff", 30, "defense", 2, 0),
      spell("battle-focus", "Battle Focus", "Buff", "physical", 5, 12, "self", 0, "strength", "warrior", 4, "Support", "Damage Buff", 30, "attack", 3, 0),
      spell("backstab", "Backstab", "Damage", "physical", 4, 4, "enemy", 15, "agility", "rogue", 1),
      spell("arcane-spark", "Arcane Spark", "Damage", "arcane", 3, 2, "enemy", 9, "intellect", null, 1)
    ]
  });

  await prisma.lootTable.createMany({ data: [{ id: "forest-loot", name: "Forest Loot" }, { id: "goblin-loot", name: "Goblin Loot" }, { id: "boss-loot", name: "Boss Loot" }, { id: "clockwork-loot", name: "Clockwork Loot" }, { id: "clockwork-boss-loot", name: "Clockwork Boss Loot" }] });
  await prisma.monster.createMany({
    data: [
      monster("bristle-wolf", "Bristle Wolf", 1, 24, 7, 2, 20, 8, false, true, "forest-loot"),
      monster("forest-spider", "Forest Spider", 1, 18, 6, 1, 18, 6, false, true, "forest-loot"),
      monster("rust-goblin", "Rust Goblin", 2, 30, 8, 3, 28, 12, false, true, "goblin-loot"),
      monster("fungus-crawler", "Fungus Crawler", 2, 34, 7, 4, 25, 10, false, false, "goblin-loot"),
      monster("shrine-wisp", "Shrine Wisp", 3, 26, 10, 2, 35, 14, false, false, "forest-loot"),
      monster("goblin-king", "Goblin King", 4, 80, 12, 5, 100, 60, true, true, "boss-loot"),
      monster("gear-rat", "Gear Rat", 5, 44, 13, 5, 55, 18, false, true, "clockwork-loot"),
      monster("steam-sentinel", "Steam Sentinel", 6, 64, 15, 8, 75, 24, false, true, "clockwork-loot"),
      monster("coil-wisp", "Coil Wisp", 6, 48, 17, 5, 80, 28, false, false, "clockwork-loot"),
      monster("brass-overseer", "Brass Overseer", 7, 150, 20, 10, 220, 120, true, true, "clockwork-boss-loot")
    ]
  });

  await prisma.lootDrop.createMany({
    data: [
      drop("forest-loot", "wolf-pelt", 0.75), drop("forest-loot", "minor-healing-potion", 0.25),
      drop("goblin-loot", "goblin-ear", 0.9), drop("goblin-loot", "mana-draught", 0.2),
      drop("boss-loot", "king-crown-fragment", 1), drop("boss-loot", "ironwood-blade", 0.6),
      drop("clockwork-loot", "clockwork-spring", 0.75), drop("clockwork-loot", "spark-crystal", 0.25),
      drop("clockwork-boss-loot", "overseer-core-shard", 1), drop("clockwork-boss-loot", "cleric-charm", 0.5)
    ]
  });

  await spawn("forest-path", "bristle-wolf", 24);
  await spawn("hunter-camp", "forest-spider", 18);
  await spawn("ruined-shrine", "shrine-wisp", 26);
  await spawn("warrens-entrance", "rust-goblin", 30);
  await spawn("fungus-hall", "fungus-crawler", 34);
  await spawn("broken-shrine", "rust-goblin", 30);
  await spawn("goblin-king-den", "goblin-king", 80);
  await spawn("clockwork-foyer", "gear-rat", 44);
  await spawn("gear-bridge", "gear-rat", 44);
  await spawn("gear-bridge", "steam-sentinel", 64);
  await spawn("steam-gallery", "steam-sentinel", 64);
  await spawn("steam-gallery", "coil-wisp", 48);
  await spawn("battery-vault", "coil-wisp", 48);
  await spawn("battery-vault", "steam-sentinel", 64);
  await spawn("assembly-floor", "gear-rat", 44);
  await spawn("assembly-floor", "steam-sentinel", 64);
  await spawn("overseer-core", "brass-overseer", 150);

  await prisma.nPC.createMany({
    data: [
      { id: "mayor-callow", name: "Mayor Callow", role: "Quest Giver", dialogue: "The forest is coughing up old iron again.", inspectText: "Mayor Callow wears a mud-spattered sash and keeps glancing toward the northern gate.", roomId: "ironwood-town-square" },
      { id: "quest-board-npc", name: "Quest Board", role: "Quest Board", dialogue: "Bounties and requests are pinned here.", inspectText: "The board is layered with fresh nails, torn parchment, and a large starter notice marked for new adventurers.", roomId: "quest-board" },
      { id: "old-scout", name: "Old Scout Renn", role: "Guide", dialogue: "Follow the fungus glow if you seek the warrens.", inspectText: "Renn's cloak is stitched with route marks. His map case has scratches from something with small claws.", roomId: "hunter-camp" },
      { id: "tavern-keeper-mara", name: "Tavern Keeper Mara", role: "Shopkeeper", dialogue: "Need supplies before the forest gets its teeth in you?", inspectText: "Mara keeps a tidy shelf of travel goods and counts coin with the speed of long practice.", roomId: "embers-tavern" },
      { id: "innkeeper-brom", name: "Innkeeper Brom", role: "Innkeeper", dialogue: "A warm room and clean bandages cost less than pride.", inspectText: "Brom keeps a ledger, a kettle, and several remarkably clean beds upstairs.", roomId: "embers-tavern" }
    ]
  });

  await prisma.roomObject.createMany({
    data: [
      object("town-fountain", "Old Fountain", "A cold stone fountain bubbles in the town square.", "The basin holds scratched copper coins and mossy wishes.", "ironwood-town-square"),
      object("gate-supply-crate", "Supply Crate", "A cracked crate sits beside the north gate.", "The lid is loose. Someone left a potion inside.", "blackroot-gate", "minor-healing-potion", 1, true),
      object("machine-warning-plate", "Warning Plate", "A brass plate is bolted beside the machine hatch.", "It reads: Clockwork Depths. Minimum level 5. Parties recommended.", "machine-dig"),
      object("clockwork-spring-loose", "Loose Spring", "A bright spring twitches between two stones.", "It is small enough to pocket and still hums with stored tension.", "clockwork-foyer", "clockwork-spring", 1, true)
    ]
  });

  await prisma.shop.create({
    data: {
      id: "mara-supply-shop",
      name: "Mara's Supply Shelf",
      description: "Potions and travel supplies for new adventurers.",
      npcId: "tavern-keeper-mara",
      buyRate: 1,
      sellRate: 0.5,
      items: {
        create: [
          { itemId: "minor-healing-potion", price: 12, stock: -1, sortOrder: 1 },
          { itemId: "mana-draught", price: 16, stock: -1, sortOrder: 2 },
          { itemId: "frontier-shield", price: 55, stock: 2, sortOrder: 3 }
        ]
      }
    }
  });

  await prisma.recruitableNPC.createMany({
    data: [
      companion("garrick", "Garrick the Shieldbearer", "Tank", 1, 52, 6, 7, 10, "Shield Wall", 20, "embers-tavern"),
      companion("lyra", "Lyra the Field Medic", "Healer", 1, 34, 24, 4, 5, "Patch Wounds", 25, "embers-tavern"),
      companion("vex", "Vex the Cutpurse", "Damage", 1, 32, 10, 10, 4, "Cheap Shot", 25, "quest-board"),
      companion("orin", "Orin the Sparkmage", "Damage", 1, 28, 28, 5, 3, "Sparkbolt", 30, "ruined-shrine")
    ]
  });

  await quests();

  await prisma.dungeonTemplate.create({
    data: {
      id: "goblin-warrens-dungeon",
      name: "The Goblin Warrens",
      description: "A small dungeon beneath the Ironwood where goblins guard a buried magical machine.",
      recommendedLevel: 2,
      requiredLevel: 1,
      entranceRoomId: "cave-mouth",
      entryRoomId: "warrens-entrance",
      bossMonsterId: "goblin-king",
      rewardTableId: "boss-loot",
      repeatable: true,
      cooldownMinutes: 30,
      maxPartySize: 4,
      instanced: true,
      confirmOnEntry: true,
      returnOnComplete: true,
      category: "Dungeon",
      subType: "Party Instance",
      rooms: {
        create: [
          { roomId: "warrens-entrance", order: 1 },
          { roomId: "fungus-hall", order: 2 },
          { roomId: "broken-shrine", order: 3 },
          { roomId: "goblin-king-den", order: 4 }
        ]
      }
    }
  });

  await prisma.dungeonTemplate.create({
    data: {
      id: "clockwork-depths-dungeon",
      name: "Clockwork Depths",
      description: "A larger level 5 machine dungeon with patrols, hazards, and the Brass Overseer.",
      recommendedLevel: 5,
      requiredLevel: 5,
      entranceRoomId: "machine-dig",
      entryRoomId: "clockwork-foyer",
      bossMonsterId: "brass-overseer",
      rewardTableId: "clockwork-boss-loot",
      repeatable: true,
      cooldownMinutes: 90,
      maxPartySize: 4,
      instanced: true,
      confirmOnEntry: true,
      returnOnComplete: true,
      category: "Dungeon",
      subType: "Level 5 Instance",
      rooms: {
        create: [
          { roomId: "clockwork-foyer", order: 1 },
          { roomId: "gear-bridge", order: 2 },
          { roomId: "steam-gallery", order: 3 },
          { roomId: "battery-vault", order: 4 },
          { roomId: "assembly-floor", order: 5 },
          { roomId: "overseer-core", order: 6 }
        ]
      }
    }
  });

  await prisma.gameSetting.createMany({
    data: [
      { id: "setting-start-room", key: "startRoomId", value: "ironwood-town-square" },
      { id: "setting-safe-room", key: "safeRoomId", value: "ironwood-town-square" },
      { id: "setting-character-limit", key: "characterLimit", value: "3" },
      { id: "setting-currency-name", key: "currencyName", value: "Gold" },
      { id: "setting-currency-abbreviation", key: "currencyAbbreviation", value: "g" },
      { id: "setting-exp-rate", key: "expRate", value: "1" },
      { id: "setting-max-level", key: "maxLevel", value: "50" },
      { id: "setting-max-items", key: "maxItems", value: "500" },
      { id: "setting-max-enemies", key: "maxEnemies", value: "500" },
      { id: "setting-max-rooms", key: "maxRooms", value: "1000" },
      { id: "setting-max-skills", key: "maxSkills", value: "250" },
      { id: "setting-max-party-size", key: "maxPartySize", value: "4" },
      { id: "setting-idle-aggro-enabled", key: "idleAggroEnabled", value: "true" },
      { id: "setting-idle-aggro-seconds", key: "idleAggroSeconds", value: "15" },
      { id: "setting-world-map-excluded-zones", key: "worldMapExcludedZoneIds", value: "goblin-warrens,clockwork-depths" },
      { id: "setting-world-template-configured", key: "worldTemplateConfigured", value: "false" },
      { id: "setting-world-template-mode", key: "worldTemplateMode", value: "demo" },
      { id: "setting-game-name", key: "gameName", value: "Mirage Web RPG" },
      { id: "setting-engine-name", key: "engineName", value: "SQwebRPG" },
      { id: "setting-game-version", key: "gameVersion", value: "v0.1" },
      { id: "setting-top-right-mode", key: "topRightMode", value: "clock" },
      { id: "setting-game-live", key: "gameLive", value: "false" },
      { id: "setting-global-buyback-rate", key: "globalBuybackRate", value: "0.5" },
      { id: "setting-inn-rest-cost", key: "innRestCost", value: "10" },
      { id: "setting-splash-title", key: "splashTitle", value: "Mirage Web RPG" },
      { id: "setting-splash-tagline", key: "splashTagline", value: "A frontier MUD/JRPG demo built on SQwebRPG." },
      { id: "setting-splash-description", key: "splashDescription", value: "Explore old-school rooms, recruit companions, crawl dungeons, and build your own world from the admin database." },
      { id: "setting-splash-features", key: "splashFeatures", value: "Command-driven exploration|Turn-based combat|Data-driven quests, shops, rooms, and enemies" }
    ]
  });

  const player1 = await prisma.user.findUniqueOrThrow({ where: { email: "player1@example.com" } });
  const player2 = await prisma.user.findUniqueOrThrow({ where: { email: "player2@example.com" } });
  await createDemoCharacter(player1.id, "Aric the Warrior", "warrior");
  await createDemoCharacter(player2.id, "Selene the Mage", "mage");

  await prisma.announcement.create({ data: { title: "Welcome to Mirage Web RPG", body: "The demo world is seeded and ready for play." } });
}

function room(id: string, name: string, description: string, zoneId: string, safe: boolean, x: number, y: number, mapTileType = "field", mapIcon: string | null = null, category = "Area", subType = "Room", mapGroupId: string | null = null, imageUrl: string | null = null) {
  return { id, name, description, zoneId, safe, requiredLevel: 1, x, y, mapTileType, mapIcon, imageUrl, category, subType, mapGroupId };
}

async function exits(rows: Array<[string, string, string]>) {
  for (const [fromRoomId, toRoomId, direction] of rows) {
    await prisma.roomExit.create({ data: { fromRoomId, toRoomId, direction } });
  }
}

function item(id: string, name: string, type: string, rarity: string, value: number, stackable: boolean, usable: boolean, equippable: boolean, hpRestore: number, mpRestore: number, attackBonus: number, defenseBonus: number) {
  return { id, name, description: `${name} used in Mirage Web RPG.`, type, category: type, subType: rarity, rarity, value, sellValue: value > 0 ? Math.max(1, Math.floor(value * 0.5)) : null, stackable, usable, equippable, hpRestore, mpRestore, attackBonus, defenseBonus };
}

function spell(id: string, name: string, type: string, element: string, mpCost: number, cooldownSeconds: number, targetType: string, power: number, scalingStat: string, requiredClassId: string | null, requiredLevel: number, category = type === "Damage" ? "Damage" : "Support", subType = element, durationSeconds = 0, effectStat: string | null = null, effectAmount = 0, tickHp = 0) {
  return { id, name, description: `${name} is a ${type.toLowerCase()} skill.`, type, category, subType, element, mpCost, cooldownSeconds, targetType, power, scalingStat, requiredClassId, requiredLevel, durationSeconds, effectStat, effectAmount, tickHp, statusEffect: durationSeconds > 0 ? subType : null };
}

function monster(id: string, name: string, level: number, maxHp: number, attack: number, defense: number, expReward: number, goldReward: number, boss: boolean, aggressive: boolean, lootTableId: string) {
  return {
    id,
    name,
    description: `${name} prowls the Ironwood demo.`,
    inspectText: `${name} leaves clear signs of its habits, wounds, and temper if you study it closely.`,
    dialogue: boss ? `${name} bellows a challenge.` : `${name} snarls and refuses anything like conversation.`,
    category: boss ? "Boss" : "Regular",
    subType: boss ? "Boss" : "Monster",
    level,
    maxHp,
    attack,
    defense,
    expReward,
    goldReward,
    boss,
    aggressive,
    lootTableId
  };
}

function drop(lootTableId: string, itemId: string, chance: number) {
  return { lootTableId, itemId, chance, minQty: 1, maxQty: 1 };
}

async function spawn(roomId: string, monsterId: string, currentHp: number, respawnSeconds = 60) {
  await prisma.roomMonster.create({ data: { roomId, monsterId, currentHp, respawnSeconds } });
}

function object(id: string, name: string, description: string, inspectText: string, roomId: string, itemId: string | null = null, quantity = 1, takeable = false) {
  return { id, name, description, inspectText, roomId, itemId, quantity, takeable, hidden: false, respawns: false, category: "Object", subType: takeable ? "Takeable" : "Scenery" };
}

function companion(id: string, name: string, role: string, level: number, hp: number, mp: number, attack: number, defense: number, skill: string, cost: number, roomId: string) {
  return { id, name, role, level, hp, mp, attack, defense, skill, cost, requirement: "None", dialogue: `${name} is willing to join your expedition.`, availability: "available", aiBehavior: role.toLowerCase(), roomId };
}

async function quests() {
  const created = [
    ["ironwood-errand", "Ironwood Errand", "Story", "Inspect", "Mayor Callow asks you to check the quest board.", "mayor-callow", "Inspect the quest board.", "quest-board-npc", 40, 15, "minor-healing-potion"],
    ["wolf-at-the-gate", "Wolves at the Gate", "Side", "Kill", "Cull bristle wolves along the forest path.", "quest-board-npc", "Defeat a Bristle Wolf.", "bristle-wolf", 60, 20, "wolf-pelt"],
    ["cogs-beneath-roots", "Cogs Beneath Roots", "Exploration", "Explore", "Recover an ancient cog from the buried machine dig.", "old-scout", "Explore the machine dig.", "machine-dig", 80, 25, "ancient-cog"],
    ["fungus-bounty", "Fungus Bounty", "Repeatable", "Kill", "Clear a fungus crawler in the warrens.", "quest-board-npc", "Defeat a Fungus Crawler.", "fungus-crawler", 70, 18, "mana-draught"],
    ["king-of-warrens", "King of the Warrens", "Dungeon", "Dungeon", "Defeat the Goblin King and recover proof.", "mayor-callow", "Defeat the Goblin King.", "goblin-king", 150, 75, "king-crown-fragment"]
  ] as const;

  for (const [id, title, category, type, description, sourceNpcId, objectiveText, targetId, rewardExp, rewardGold, rewardItemId] of created) {
    await prisma.quest.create({
      data: {
        id,
        title,
        category,
        type,
        description,
        sourceType: sourceNpcId === "quest-board-npc" ? "Quest Board" : "NPC",
        sourceNpcId,
        repeatable: category === "Repeatable",
        requiredLevel: 1,
        completionText: `${title} complete.`,
        rewardExp,
        rewardGold,
        rewardItemId,
        objectives: { create: [{ kind: type, targetId, targetCount: 1, description: objectiveText }] }
      }
    });
  }
}

async function createDemoCharacter(userId: string, name: string, classId: string) {
  const klass = await prisma.class.findUniqueOrThrow({ where: { id: classId }, include: { statTemplate: true } });
  const stats = klass.statTemplate ?? { strength: 4, dexterity: 4, agility: 4, intellect: 4, wisdom: 4, stamina: 4 };
  const character = await prisma.character.create({
    data: {
      userId,
      name,
      classId,
      level: 1,
      exp: 0,
      gold: 75,
      hp: klass.baseHp,
      mp: klass.baseMp,
      maxHp: klass.baseHp,
      maxMp: klass.baseMp,
      attack: klass.baseAttack,
      defense: klass.baseDefense,
      strength: stats.strength,
      dexterity: stats.dexterity,
      agility: stats.agility,
      intellect: stats.intellect,
      wisdom: stats.wisdom,
      stamina: stats.stamina,
      roomId: "ironwood-town-square"
    }
  });
  await prisma.inventoryItem.createMany({
    data: [
      { characterId: character.id, itemId: "minor-healing-potion", quantity: 3 },
      { characterId: character.id, itemId: "mana-draught", quantity: 1 }
    ]
  });
  const spells = await prisma.spell.findMany({ where: { OR: [{ requiredClassId: classId }, { requiredClassId: null }], requiredLevel: { lte: 1 } } });
  await prisma.characterSpell.createMany({ data: spells.map((spell) => ({ characterId: character.id, spellId: spell.id })) });
}

async function clearDatabase() {
  await prisma.chatMessage.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.gameSetting.deleteMany();
  await prisma.dungeonInstanceMember.deleteMany();
  await prisma.dungeonInstance.deleteMany();
  await prisma.characterStatusEffect.deleteMany();
  await prisma.dungeonRoom.deleteMany();
  await prisma.dungeonTemplate.deleteMany();
  await prisma.characterSpell.deleteMany();
  await prisma.spell.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.shopItem.deleteMany();
  await prisma.shop.deleteMany();
  await prisma.characterQuest.deleteMany();
  await prisma.questObjective.deleteMany();
  await prisma.quest.deleteMany();
  await prisma.nPCPartyMember.deleteMany();
  await prisma.partyMember.deleteMany();
  await prisma.party.deleteMany();
  await prisma.recruitableNPC.deleteMany();
  await prisma.nPC.deleteMany();
  await prisma.roomObject.deleteMany();
  await prisma.roomMonster.deleteMany();
  await prisma.monster.deleteMany();
  await prisma.lootDrop.deleteMany();
  await prisma.lootTable.deleteMany();
  await prisma.item.deleteMany();
  await prisma.character.deleteMany();
  await prisma.roomExit.deleteMany();
  await prisma.room.deleteMany();
  await prisma.mapGroup.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.statTemplate.deleteMany();
  await prisma.class.deleteMany();
  await prisma.user.deleteMany();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
