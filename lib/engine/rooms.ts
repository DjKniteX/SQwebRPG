import { prisma } from "@/lib/db";
import { log, type Direction } from "@/lib/engine/types";
import { progressQuestObjective } from "@/lib/engine/quests";

const aliases: Record<string, Direction> = {
  n: "north",
  north: "north",
  s: "south",
  south: "south",
  e: "east",
  east: "east",
  w: "west",
  west: "west"
};

export function parseDirection(input: string) {
  return aliases[input.trim().toLowerCase()];
}

export async function getRoomState(characterId: string) {
  const character = await prisma.character.findUniqueOrThrow({
    where: { id: characterId },
    include: {
      class: true,
      room: {
        include: {
          zone: true,
          exitsFrom: { include: { toRoom: true }, orderBy: { direction: "asc" } },
          npcs: { include: { questSource: { include: { objectives: true } }, shop: { include: { items: { include: { item: true }, orderBy: { sortOrder: "asc" } } } } } },
          recruitables: true,
          roomMonsters: { include: { monster: true }, where: { currentHp: { gt: 0 } } }
        }
      },
      inventory: { include: { item: true } },
      spells: { include: { spell: true } },
      quests: { include: { quest: { include: { objectives: true } } } },
      partyMembers: { include: { party: { include: { members: { include: { character: true } }, npcs: { include: { recruitableNpc: true } } } } } }
    }
  });

  await prisma.character.update({ where: { id: characterId }, data: { lastSeenAt: new Date() } });

  const since = new Date(Date.now() - 20_000);
  const players = await prisma.character.findMany({
    where: { roomId: character.roomId, lastSeenAt: { gte: since }, id: { not: character.id } },
    select: { id: true, name: true, level: true }
  });

  const messages = await prisma.chatMessage.findMany({
    where: {
      OR: [{ channel: "GLOBAL" }, { channel: "ROOM", roomId: character.roomId }, { channel: "SYSTEM" }]
    },
    orderBy: { createdAt: "desc" },
    take: 30
  });
  const mapRooms = await prisma.room.findMany({
    where: { zoneId: character.room.zoneId },
    include: { exitsFrom: true },
    orderBy: [{ y: "asc" }, { x: "asc" }]
  });
  const excludedZonesSetting = await prisma.gameSetting.findUnique({ where: { key: "worldMapExcludedZoneIds" } });
  const excludedZoneIds = (excludedZonesSetting?.value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const worldMapRooms = await prisma.room.findMany({
    where: excludedZoneIds.length ? { zoneId: { notIn: excludedZoneIds } } : {},
    include: { exitsFrom: true, zone: true },
    orderBy: [{ y: "asc" }, { x: "asc" }]
  });
  const dungeonEntrances = await prisma.dungeonTemplate.findMany({
    where: { OR: [{ entranceRoomId: character.roomId }, { entryRoomId: character.roomId }] },
    orderBy: { name: "asc" }
  });
  const activeDungeon = await prisma.dungeonInstanceMember.findFirst({
    where: { characterId, status: "ACTIVE" },
    include: { dungeonInstance: { include: { dungeonTemplate: true } } }
  });
  const activePartyLink = await prisma.partyMember.findFirst({
    where: { characterId, status: "ACTIVE" },
    include: {
      party: {
        include: {
          members: { include: { character: { include: { class: true } } }, orderBy: { id: "asc" } },
          npcs: { include: { recruitableNpc: true }, orderBy: { id: "asc" } }
        }
      }
    }
  });
  const settingsRows = await prisma.gameSetting.findMany({
    where: { key: { in: ["maxPartySize", "currencyName", "currencyAbbreviation", "engineName", "gameVersion", "topRightMode"] } }
  });
  const settings = Object.fromEntries(settingsRows.map((entry) => [entry.key, entry.value]));

  return {
    character,
    party: activePartyLink?.party ?? null,
    room: character.room,
    players,
    messages: messages.reverse(),
    mapRooms,
    worldMapRooms,
    dungeonEntrances,
    activeDungeon,
    settings
  };
}

export async function moveCharacter(characterId: string, direction: Direction) {
  const character = await prisma.character.findUniqueOrThrow({
    where: { id: characterId },
    include: { room: { include: { exitsFrom: true } }, inventory: true }
  });
  const exit = character.room.exitsFrom.find((candidate) => candidate.direction === direction);

  if (!exit) return { ok: false, logs: [log("danger", `You cannot travel ${direction} from here.`)] };
  if (character.level < exit.requiredLevel) {
    return { ok: false, logs: [log("danger", `You must be level ${exit.requiredLevel} to go that way.`)] };
  }
  if (exit.requiredItemId && !character.inventory.some((item) => item.itemId === exit.requiredItemId)) {
    return { ok: false, logs: [log("danger", "A required key item blocks that path.")] };
  }
  const dungeon = await prisma.dungeonTemplate.findFirst({
    where: { entryRoomId: exit.toRoomId, confirmOnEntry: true }
  });
  if (dungeon) {
    return {
      ok: false,
      logs: [log("system", `${dungeon.name} is instanced. Type "enter dungeon ${dungeon.name}" to confirm entry.`)]
    };
  }

  const updated = await prisma.character.update({
    where: { id: characterId },
    data: { roomId: exit.toRoomId, lastSeenAt: new Date() },
    include: { room: true }
  });
  await prisma.chatMessage.create({
    data: { channel: "ROOM", characterId, roomId: updated.roomId, body: `${updated.name} arrives from the ${opposite(direction)}.` }
  });
  return {
    ok: true,
    logs: [log("system", `You travel ${direction} to ${updated.room.name}.`), ...(await progressQuestObjective(characterId, "Explore", updated.roomId))]
  };
}

function opposite(direction: Direction) {
  return { north: "south", south: "north", east: "west", west: "east" }[direction];
}
