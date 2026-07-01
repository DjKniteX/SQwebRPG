import { prisma } from "@/lib/db";
import { log } from "@/lib/engine/types";

export async function enterDungeon(characterId: string, dungeonName = "") {
  const character = await prisma.character.findUniqueOrThrow({
    where: { id: characterId },
    include: {
      room: true,
      partyMembers: { include: { party: { include: { members: { include: { character: true } } } } } }
    }
  });
  const dungeon = await prisma.dungeonTemplate.findFirst({
    where: {
      OR: [{ entranceRoomId: character.roomId }, { entryRoomId: character.roomId }],
      ...(dungeonName ? { name: { contains: dungeonName } } : {})
    }
  });
  if (!dungeon) return { ok: false, logs: [log("danger", "No dungeon entrance is here.")] };
  if (character.level < dungeon.requiredLevel) return { ok: false, logs: [log("danger", `You must be level ${dungeon.requiredLevel} to enter ${dungeon.name}.`)] };
  await resetDungeonSpawns(dungeon.id);

  const party = character.partyMembers.find((entry) => entry.status === "ACTIVE")?.party;
  const eligibleMembers = (party?.members ?? [{ characterId, character }])
    .filter((entry: any) => entry.character.roomId === character.roomId)
    .slice(0, dungeon.maxPartySize);
  const awayMembers = (party?.members ?? []).filter((entry: any) => entry.character.roomId !== character.roomId);
  const instance = await prisma.dungeonInstance.create({
    data: {
      dungeonTemplateId: dungeon.id,
      currentRoomId: dungeon.entryRoomId,
      members: {
        create: eligibleMembers.map((entry: any) => ({
          characterId: entry.characterId,
          returnRoomId: entry.character.roomId,
          status: "ACTIVE"
        }))
      }
    }
  });

  await prisma.character.updateMany({
    where: { id: { in: eligibleMembers.map((entry: any) => entry.characterId) } },
    data: { roomId: dungeon.entryRoomId, lastSeenAt: new Date() }
  });
  for (const entry of awayMembers) {
    await prisma.chatMessage.create({
      data: {
        channel: "SYSTEM",
        characterId: entry.characterId,
        body: `${character.name} entered ${dungeon.name}. Travel to the entrance and use enter dungeon to join.`
      }
    });
  }

  return {
    ok: true,
    logs: [
      log("system", `Instance created: ${dungeon.name}.`),
      log("system", `${eligibleMembers.length} member(s) entered. Instance ${instance.id}.`)
    ]
  };
}

async function resetDungeonSpawns(dungeonTemplateId: string) {
  const spawns = await prisma.roomMonster.findMany({
    where: { room: { dungeonRooms: { some: { dungeonTemplateId } } } },
    include: { monster: true }
  });
  for (const spawn of spawns) {
    await prisma.roomMonster.update({
      where: { id: spawn.id },
      data: { currentHp: spawn.monster.maxHp, respawnAt: null }
    });
  }
}

export async function completeDungeon(characterId: string) {
  const membership = await prisma.dungeonInstanceMember.findFirst({
    where: { characterId, status: "ACTIVE" },
    include: { dungeonInstance: { include: { dungeonTemplate: true, members: true } } }
  });
  if (!membership) return { ok: false, logs: [log("danger", "You are not in an active dungeon instance.")] };

  const dungeon = membership.dungeonInstance.dungeonTemplate;
  const livingBoss = await prisma.roomMonster.findFirst({
    where: { monsterId: dungeon.bossMonsterId, currentHp: { gt: 0 }, room: { dungeonRooms: { some: { dungeonTemplateId: dungeon.id } } } }
  });
  if (livingBoss) return { ok: false, logs: [log("danger", `${dungeon.name} is not complete yet. Defeat the boss or use leave dungeon.`)] };
  await prisma.dungeonInstance.update({ where: { id: membership.dungeonInstanceId }, data: { status: "COMPLETE" } });
  await Promise.all(
    membership.dungeonInstance.members.map((member) =>
      prisma.character.update({
        where: { id: member.characterId },
        data: { roomId: dungeon.returnOnComplete ? member.returnRoomId ?? dungeon.entranceRoomId ?? dungeon.entryRoomId : dungeon.entryRoomId }
      })
    )
  );
  await prisma.dungeonInstanceMember.updateMany({ where: { dungeonInstanceId: membership.dungeonInstanceId }, data: { status: "COMPLETE" } });
  return { ok: true, logs: [log("success", `${dungeon.name} complete. Your party returns to the entrance point.`)] };
}

export async function leaveDungeon(characterId: string) {
  const membership = await prisma.dungeonInstanceMember.findFirst({
    where: { characterId, status: "ACTIVE" },
    include: { dungeonInstance: { include: { dungeonTemplate: true } } }
  });
  if (!membership) return { ok: false, logs: [log("danger", "You are not in an active dungeon instance.")] };
  const dungeon = membership.dungeonInstance.dungeonTemplate;
  await prisma.character.update({
    where: { id: characterId },
    data: { roomId: membership.returnRoomId ?? dungeon.entranceRoomId ?? dungeon.entryRoomId }
  });
  await prisma.dungeonInstanceMember.update({ where: { id: membership.id }, data: { status: "LEFT" } });
  const activeCount = await prisma.dungeonInstanceMember.count({ where: { dungeonInstanceId: membership.dungeonInstanceId, status: "ACTIVE" } });
  if (!activeCount) await prisma.dungeonInstance.update({ where: { id: membership.dungeonInstanceId }, data: { status: "ABANDONED" } });
  return { ok: true, logs: [log("system", `You leave ${dungeon.name} and return to safety.`)] };
}

export async function completeDungeonForBoss(characterId: string, bossMonsterId: string) {
  const membership = await prisma.dungeonInstanceMember.findFirst({
    where: { characterId, status: "ACTIVE", dungeonInstance: { dungeonTemplate: { bossMonsterId } } },
    include: { dungeonInstance: { include: { dungeonTemplate: true } } }
  });
  if (!membership) return [];
  const result = await completeDungeon(characterId);
  return result.logs;
}
