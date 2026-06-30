import { prisma } from "@/lib/db";
import { log } from "@/lib/engine/types";
import { awardExperience } from "@/lib/engine/progression";

export async function acceptQuest(characterId: string, questIdOrName: string) {
  const character = await prisma.character.findUniqueOrThrow({ where: { id: characterId } });
  const quest = await prisma.quest.findFirst({
    where: { OR: [{ id: questIdOrName }, { title: { contains: questIdOrName } }] }
  });
  if (!quest) return { ok: false, logs: [log("danger", `Quest not found: ${questIdOrName}.`)] };
  if (quest.sourceNpcId) {
    const source = await prisma.nPC.findFirst({ where: { id: quest.sourceNpcId, roomId: character.roomId } });
    if (!source) return { ok: false, logs: [log("danger", `${quest.title} must be accepted from its source in the world.`)] };
  }

  const existing = await prisma.characterQuest.findUnique({
    where: { characterId_questId: { characterId, questId: quest.id } }
  });
  if (existing?.status === "ACTIVE") {
    return { ok: true, logs: [log("quest", `${quest.title} is already in your journal.`)] };
  }
  if (existing?.status === "COMPLETE" && !quest.repeatable) {
    return { ok: false, logs: [log("danger", `${quest.title} has already been completed.`)] };
  }

  if (existing) {
    await prisma.characterQuest.update({ where: { id: existing.id }, data: { status: "ACTIVE", progress: 0 } });
  } else {
    await prisma.characterQuest.create({ data: { characterId, questId: quest.id, status: "ACTIVE", progress: 0 } });
  }
  return { ok: true, logs: [log("quest", `Quest accepted: ${quest.title}.`)] };
}

export async function progressQuestObjective(characterId: string, kind: string, targetId: string) {
  const activeQuests = await prisma.characterQuest.findMany({
    where: { characterId, status: "ACTIVE" },
    include: { quest: { include: { objectives: true } } }
  });

  const logs = [];
  for (const active of activeQuests) {
    const objective = active.quest.objectives.find((candidate) => {
      const objectiveKind = candidate.kind.toLowerCase();
      const eventKind = kind.toLowerCase();
      const kindMatches = objectiveKind === eventKind || (objectiveKind === "dungeon" && eventKind === "kill");
      return kindMatches && candidate.targetId === targetId;
    });
    if (!objective || active.progress >= objective.targetCount) continue;

    const progress = Math.min(objective.targetCount, active.progress + 1);
    await prisma.characterQuest.update({ where: { id: active.id }, data: { progress } });
    logs.push(log("quest", `${active.quest.title}: ${objective.description} (${progress}/${objective.targetCount})`));
  }
  return logs;
}

export async function talkToNpc(characterId: string, npcNameOrId: string) {
  const character = await prisma.character.findUniqueOrThrow({ where: { id: characterId } });
  const npc = await prisma.nPC.findFirst({
    where: {
      roomId: character.roomId,
      OR: [{ id: npcNameOrId }, { name: { contains: npcNameOrId } }]
    }
  });

  if (npc) {
    return {
      ok: true,
      logs: [log("system", `${npc.name}: ${npc.dialogue}`), ...(await progressQuestObjective(characterId, "Talk", npc.id))]
    };
  }

  const companion = await prisma.recruitableNPC.findFirst({
    where: {
      roomId: character.roomId,
      OR: [{ id: npcNameOrId }, { name: { contains: npcNameOrId } }]
    }
  });
  if (companion) {
    return {
      ok: true,
      logs: [log("system", `${companion.name}: ${companion.dialogue} Recruitment cost: ${companion.cost} gold.`)]
    };
  }

  const roomMonster = await prisma.roomMonster.findFirst({
    where: {
      roomId: character.roomId,
      currentHp: { gt: 0 },
      OR: [{ monsterId: npcNameOrId }, { monster: { name: { contains: npcNameOrId } } }]
    },
    include: { monster: true }
  });
  if (roomMonster) {
    return {
      ok: true,
      logs: [log("system", `${roomMonster.monster.name}: ${roomMonster.monster.dialogue ?? "It watches you warily and gives no useful reply."}`)]
    };
  }

  return { ok: false, logs: [log("danger", `No NPC or enemy named ${npcNameOrId} is here.`)] };
}

export async function inspectTarget(characterId: string, targetNameOrId: string) {
  const character = await prisma.character.findUniqueOrThrow({
    where: { id: characterId },
    include: { room: { include: { zone: true } }, inventory: { include: { item: true } } }
  });
  const target = targetNameOrId.trim();
  if (!target || ["room", "area", "here"].includes(target.toLowerCase())) {
    return {
      ok: true,
      logs: [log("system", `${character.room.name}: ${character.room.description}`)]
    };
  }

  const [npc, companion, roomMonster, item] = await Promise.all([
    prisma.nPC.findFirst({
      where: { roomId: character.roomId, OR: [{ id: target }, { name: { contains: target } }] },
      include: { shop: { include: { items: { include: { item: true } } } }, questSource: true }
    }),
    prisma.recruitableNPC.findFirst({
      where: { roomId: character.roomId, OR: [{ id: target }, { name: { contains: target } }] }
    }),
    prisma.roomMonster.findFirst({
      where: {
        roomId: character.roomId,
        currentHp: { gt: 0 },
        OR: [{ monsterId: target }, { monster: { name: { contains: target } } }]
      },
      include: { monster: true }
    }),
    prisma.inventoryItem.findFirst({
      where: {
        characterId,
        OR: [{ itemId: target }, { item: { name: { contains: target } } }]
      },
      include: { item: true }
    })
  ]);

  if (npc) {
    const progress = await progressQuestObjective(characterId, "Inspect", npc.id);
    const services = [
      npc.questSource.length ? "Quest source" : null,
      npc.shop ? `Shopkeeper (${npc.shop.name})` : null,
      isInspectableObject(npc) ? "Inspectable object" : null
    ].filter(Boolean);
    return {
      ok: true,
      logs: [
        log("system", `${npc.name}: ${npc.role}. ${services.length ? `Services: ${services.join(", ")}.` : "No special services detected."}`),
        log("system", `Inspection: ${npc.inspectText ?? "Nothing unusual stands out beyond their role here."}`),
        ...progress
      ]
    };
  }
  if (companion) {
    return { ok: true, logs: [log("system", `${companion.name}: ${companion.role} companion. Base level ${companion.level}. Skill: ${companion.skill}. Recruitment cost ${companion.cost} gold.`)] };
  }
  if (roomMonster) {
    const warning = difficultyWarning(character.level, roomMonster.monster.level);
    return {
      ok: true,
      logs: [
        log("system", `${roomMonster.monster.name}: ${roomMonster.monster.inspectText ?? roomMonster.monster.description}`),
        log("system", `Level ${roomMonster.monster.level}. HP ${roomMonster.currentHp}/${roomMonster.monster.maxHp}. ${warning}`)
      ]
    };
  }
  if (item) {
    return {
      ok: true,
      logs: [
        log("system", `${item.item.name}: ${item.item.description}`),
        log("system", `${item.item.category}/${item.item.subType}. ${item.item.rarity}. Value ${item.item.value} gold. HP +${item.item.hpRestore}, MP +${item.item.mpRestore}, ATK +${item.item.attackBonus}, DEF +${item.item.defenseBonus}.`)
      ]
    };
  }

  return { ok: false, logs: [log("danger", `You do not see ${targetNameOrId} here.`)] };
}

function difficultyWarning(characterLevel: number, enemyLevel: number) {
  const gap = enemyLevel - characterLevel;
  if (gap <= -2) return "This creature should be no trouble.";
  if (gap <= 0) return "This creature looks manageable.";
  if (gap <= 2) return "This creature may be difficult to handle.";
  return "Warning: this creature looks extremely dangerous.";
}

function isInspectableObject(entry: { name?: string; role?: string }) {
  const text = `${entry?.name ?? ""} ${entry?.role ?? ""}`.toLowerCase();
  return text.includes("board") || text.includes("sign") || text.includes("notice") || text.includes("shrine");
}

export async function completeQuest(characterId: string, questIdOrName: string) {
  const active = await prisma.characterQuest.findFirst({
    where: {
      characterId,
      status: "ACTIVE",
      OR: [{ questId: questIdOrName }, { quest: { title: { contains: questIdOrName } } }]
    },
    include: { quest: { include: { objectives: true } }, character: true }
  });
  if (!active) return { ok: false, logs: [log("danger", `No active quest matches ${questIdOrName}.`)] };
  const objective = active.quest.objectives[0];
  if (objective && active.progress < objective.targetCount) {
    return {
      ok: false,
      logs: [log("danger", `Quest condition incomplete: ${objective.description} (${active.progress}/${objective.targetCount}).`)]
    };
  }

  await prisma.characterQuest.update({ where: { id: active.id }, data: { status: "COMPLETE", progress: objective?.targetCount ?? active.progress } });
  const levelLogs = await awardExperience(characterId, active.quest.rewardExp, active.quest.rewardGold);
  if (active.quest.rewardItemId) {
    await prisma.inventoryItem.upsert({
      where: { characterId_itemId: { characterId, itemId: active.quest.rewardItemId } },
      create: { characterId, itemId: active.quest.rewardItemId, quantity: 1 },
      update: { quantity: { increment: 1 } }
    });
  }
  return { ok: true, logs: [log("quest", `${active.quest.completionText} Reward: ${active.quest.rewardExp} EXP, ${active.quest.rewardGold} gold.`), ...levelLogs] };
}
