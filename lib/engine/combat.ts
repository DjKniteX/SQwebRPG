import { prisma } from "@/lib/db";
import { log } from "@/lib/engine/types";
import { systemMessage } from "@/lib/engine/chat";
import { completeDungeonForBoss } from "@/lib/engine/dungeons";
import { awardExperience } from "@/lib/engine/progression";
import { progressQuestObjective } from "@/lib/engine/quests";

export async function attackMonster(characterId: string, target: string, spellId?: string) {
  const character = await prisma.character.findUniqueOrThrow({
    where: { id: characterId },
    include: { room: true, spells: { include: { spell: true } } }
  });
  const spell = spellId
    ? character.spells.find((link) => link.spell.id === spellId || link.spell.name.toLowerCase().includes(spellId.toLowerCase()))?.spell
    : null;
  if (spell && character.mp < spell.mpCost) return { ok: false, logs: [log("danger", "You do not have enough MP.")] };
  if (spell?.type.toLowerCase() === "heal") return healFriendlyTarget(characterId, target, spell);
  if (spell?.type.toLowerCase() === "buff" || spell?.category.toLowerCase() === "support") return applyFriendlyEffect(characterId, target, spell);

  const roomMonster = await prisma.roomMonster.findFirst({
    where: {
      roomId: character.roomId,
      currentHp: { gt: 0 },
      OR: [{ monsterId: target }, { monster: { name: { contains: target } } }]
    },
    include: { monster: { include: { lootTable: { include: { drops: { include: { item: true } } } } } } }
  });
  if (!roomMonster) return { ok: false, logs: [log("danger", `No enemy named ${target} is here.`)] };

  const attackBonus = await activeStatBonus(characterId, "attack");
  const baseDamage = spell ? spell.power + Math.floor((character.attack + attackBonus) / 2) : character.attack + attackBonus;
  const damage = Math.max(1, baseDamage - Math.floor(roomMonster.monster.defense / 2));
  const monsterHp = Math.max(0, roomMonster.currentHp - damage);
  await prisma.roomMonster.update({ where: { id: roomMonster.id }, data: { currentHp: monsterHp } });
  if (spell) await prisma.character.update({ where: { id: characterId }, data: { mp: character.mp - spell.mpCost } });

  const logs = [log("combat", `${spell ? `You cast ${spell.name}` : "You attack"} for ${damage} damage. ${roomMonster.monster.name} HP: ${monsterHp}/${roomMonster.monster.maxHp}.`)];
  let currentMonsterHp = monsterHp;
  let currentPlayerHp = character.hp;

  if (currentMonsterHp > 0) {
    const companionTurn = await runCompanionTurns(characterId, roomMonster.id, roomMonster.monster, currentMonsterHp, currentPlayerHp, character.maxHp);
    logs.push(...companionTurn.logs);
    currentMonsterHp = companionTurn.monsterHp;
    currentPlayerHp = companionTurn.playerHp;
  }

  if (currentMonsterHp <= 0) {
    const rewards = await defeatMonster(characterId, roomMonster);
    logs.push(...rewards);
    logs.push(...(await progressQuestObjective(characterId, "Kill", roomMonster.monster.id)));
    logs.push(...(await completeDungeonForBoss(characterId, roomMonster.monster.id)));
  } else {
    logs.push(...(await monsterAttacksCharacter(characterId, roomMonster.monster, currentPlayerHp)));
  }

  await systemMessage(`${character.name} fights ${roomMonster.monster.name}.`, character.roomId);
  return { ok: true, logs };
}

async function healFriendlyTarget(characterId: string, target: string, spell: { name: string; mpCost: number; power: number }) {
  const character = await prisma.character.findUniqueOrThrow({
    where: { id: characterId },
    include: {
      partyMembers: { include: { party: { include: { members: { include: { character: true } }, npcs: { include: { recruitableNpc: true } } } } } }
    }
  });
  const party = character.partyMembers.find((entry) => entry.status === "ACTIVE")?.party;
  const targetName = target.trim().toLowerCase();
  const selfRequested = !targetName || targetName === "self" || targetName === "me";
  const healAmount = spell.power + Math.floor(character.wisdom / 2);
  const playerTarget = party?.members
    ?.filter((entry) => entry.status === "ACTIVE")
    .find((entry) => selfRequested ? entry.characterId === characterId : entry.character.name.toLowerCase().includes(targetName)) ?? (selfRequested ? { characterId, character } : null);

  if (playerTarget) {
    const healedHp = Math.min(playerTarget.character.maxHp, playerTarget.character.hp + healAmount);
    await prisma.character.update({ where: { id: playerTarget.characterId }, data: { hp: healedHp } });
    await prisma.character.update({ where: { id: characterId }, data: { mp: character.mp - spell.mpCost } });
    return { ok: true, logs: [log("success", `You cast ${spell.name} on ${playerTarget.character.name}. HP ${healedHp}/${playerTarget.character.maxHp}.`)] };
  }

  const npcTarget = party?.npcs?.find((entry) => entry.recruitableNpc.name.toLowerCase().includes(targetName));
  if (npcTarget) {
    await prisma.character.update({ where: { id: characterId }, data: { mp: character.mp - spell.mpCost } });
    return { ok: true, logs: [log("success", `You cast ${spell.name} on ${npcTarget.recruitableNpc.name}. They steady themselves for the next exchange.`)] };
  }

  const healedHp = Math.min(character.maxHp, character.hp + healAmount);
  await prisma.character.update({ where: { id: characterId }, data: { hp: healedHp, mp: character.mp - spell.mpCost } });
  return { ok: true, logs: [log("success", `You cast ${spell.name}. HP ${healedHp}/${character.maxHp}.`)] };
}

async function applyFriendlyEffect(
  characterId: string,
  target: string,
  spell: { id: string; name: string; mpCost: number; durationSeconds: number; effectStat: string | null; effectAmount: number; tickHp: number }
) {
  const character = await prisma.character.findUniqueOrThrow({
    where: { id: characterId },
    include: {
      partyMembers: { include: { party: { include: { members: { include: { character: true } }, npcs: { include: { recruitableNpc: true } } } } } }
    }
  });
  const party = character.partyMembers.find((entry) => entry.status === "ACTIVE")?.party;
  const targetName = target.trim().toLowerCase();
  const selfRequested = !targetName || targetName === "self" || targetName === "me";
  const playerTarget = party?.members
    ?.filter((entry) => entry.status === "ACTIVE")
    .find((entry) => selfRequested ? entry.characterId === characterId : entry.character.name.toLowerCase().includes(targetName)) ?? (selfRequested ? { characterId, character } : null);
  const durationSeconds = Math.max(5, spell.durationSeconds || 30);

  if (playerTarget) {
    await prisma.characterStatusEffect.create({
      data: {
        characterId: playerTarget.characterId,
        spellId: spell.id,
        name: spell.name,
        effectStat: spell.effectStat,
        effectAmount: spell.effectAmount,
        tickHp: spell.tickHp,
        expiresAt: new Date(Date.now() + durationSeconds * 1000)
      }
    });
    await prisma.character.update({ where: { id: characterId }, data: { mp: character.mp - spell.mpCost } });
    return { ok: true, logs: [log("success", `${spell.name} affects ${playerTarget.character.name} for ${durationSeconds}s.`)] };
  }

  const npcTarget = party?.npcs?.find((entry) => entry.recruitableNpc.name.toLowerCase().includes(targetName));
  if (npcTarget) {
    await prisma.character.update({ where: { id: characterId }, data: { mp: character.mp - spell.mpCost } });
    return { ok: true, logs: [log("success", `${spell.name} steadies ${npcTarget.recruitableNpc.name} for ${durationSeconds}s.`)] };
  }

  return { ok: false, logs: [log("danger", `No friendly target named ${target || "self"} is available.`)] };
}

async function activeStatBonus(characterId: string, stat: string) {
  const effects = await prisma.characterStatusEffect.findMany({
    where: { characterId, effectStat: stat, expiresAt: { gt: new Date() } }
  });
  return effects.reduce((sum, effect) => sum + effect.effectAmount, 0);
}

export async function processStatusEffects(characterId: string) {
  const now = new Date();
  await prisma.characterStatusEffect.deleteMany({ where: { characterId, expiresAt: { lte: now } } });
  const character = await prisma.character.findUniqueOrThrow({ where: { id: characterId } });
  const effects = await prisma.characterStatusEffect.findMany({
    where: { characterId, tickHp: { gt: 0 }, expiresAt: { gt: now }, lastTickAt: { lt: new Date(Date.now() - 5000) } }
  });
  const logs = [];
  let hp = character.hp;
  for (const effect of effects) {
    const healed = Math.min(character.maxHp, hp + effect.tickHp);
    const amount = healed - hp;
    hp = healed;
    await prisma.characterStatusEffect.update({ where: { id: effect.id }, data: { lastTickAt: now } });
    if (amount > 0) logs.push(log("success", `${effect.name} restores ${amount} HP.`));
  }
  if (hp !== character.hp) await prisma.character.update({ where: { id: characterId }, data: { hp } });
  return logs;
}

export async function processIdleAggro(characterId: string) {
  const enabled = await prisma.gameSetting.findUnique({ where: { key: "idleAggroEnabled" } });
  if ((enabled?.value ?? "false").toLowerCase() !== "true") return [];

  const character = await prisma.character.findUniqueOrThrow({ where: { id: characterId }, include: { room: true } });
  if (character.room.safe || character.hp <= 0) return [];

  const secondsSetting = await prisma.gameSetting.findUnique({ where: { key: "idleAggroSeconds" } });
  const cooldownSeconds = Math.max(5, Number.parseInt(secondsSetting?.value ?? "15", 10) || 15);
  if (character.lastAggroAt && Date.now() - character.lastAggroAt.getTime() < cooldownSeconds * 1000) return [];

  const roomMonster = await prisma.roomMonster.findFirst({
    where: { roomId: character.roomId, currentHp: { gt: 0 }, monster: { aggressive: true } },
    include: { monster: true },
    orderBy: { id: "asc" }
  });
  if (!roomMonster) return [];

  await prisma.character.update({ where: { id: characterId }, data: { lastAggroAt: new Date() } });
  return [log("danger", `${roomMonster.monster.name} notices you lingering here.`), ...(await monsterAttacksCharacter(characterId, roomMonster.monster, character.hp))];
}

async function runCompanionTurns(characterId: string, roomMonsterId: string, monster: any, monsterHp: number, playerHp: number, playerMaxHp: number) {
  const leader = await prisma.character.findUnique({ where: { id: characterId }, select: { level: true } });
  const partyLink = await prisma.partyMember.findFirst({
    where: { characterId, status: "ACTIVE" },
    include: { party: { include: { npcs: { include: { recruitableNpc: true } } } } }
  });
  const logs = [];
  let nextMonsterHp = monsterHp;
  let nextPlayerHp = playerHp;

  for (const link of partyLink?.party.npcs ?? []) {
    if (nextMonsterHp <= 0) break;
    const npc = link.recruitableNpc;
    const behavior = npc.aiBehavior.toLowerCase();
    if ((behavior.includes("healer") || npc.role.toLowerCase().includes("healer")) && nextPlayerHp < Math.ceil(playerMaxHp * 0.55)) {
      const healed = Math.min(playerMaxHp, nextPlayerHp + 10 + npc.level * 4);
      const amount = healed - nextPlayerHp;
      nextPlayerHp = healed;
      await prisma.character.update({ where: { id: characterId }, data: { hp: nextPlayerHp } });
      logs.push(log("success", `${npc.name} uses ${npc.skill} and restores ${amount} HP.`));
      continue;
    }

    const scaledLevel = Math.max(npc.level, leader?.level ?? npc.level);
    const roleBonus = behavior.includes("damage") ? 3 : behavior.includes("tank") ? 1 : 2;
    const scaledAttack = npc.attack + Math.max(0, scaledLevel - npc.level) * 2;
    const damage = Math.max(1, scaledAttack + roleBonus - Math.floor(monster.defense / 2));
    nextMonsterHp = Math.max(0, nextMonsterHp - damage);
    await prisma.roomMonster.update({ where: { id: roomMonsterId }, data: { currentHp: nextMonsterHp } });
    logs.push(log("combat", `${npc.name} uses ${npc.skill} for ${damage} damage. ${monster.name} HP: ${nextMonsterHp}/${monster.maxHp}.`));
  }

  return { logs, monsterHp: nextMonsterHp, playerHp: nextPlayerHp };
}

async function monsterAttacksCharacter(characterId: string, monster: { name: string; attack: number }, currentHp: number) {
  const character = await prisma.character.findUniqueOrThrow({ where: { id: characterId }, include: { room: true } });
  const incoming = Math.max(1, monster.attack - character.defense);
  const playerHp = Math.max(0, currentHp - incoming);
  await prisma.character.update({ where: { id: characterId }, data: { hp: playerHp } });
  const logs = [log("combat", `${monster.name} hits you for ${incoming}. HP: ${playerHp}/${character.maxHp}.`)];
  if (playerHp <= 0) {
    const safeRoom = await prisma.room.findFirst({ where: { safe: true } });
    await prisma.character.update({
      where: { id: characterId },
      data: { hp: Math.ceil(character.maxHp / 2), roomId: safeRoom?.id ?? character.roomId, gold: Math.max(0, character.gold - 5) }
    });
    logs.push(log("danger", "You fall in battle and wake at a safe room with half HP. You lost 5 gold."));
  }
  return logs;
}

async function defeatMonster(characterId: string, roomMonster: Awaited<ReturnType<typeof prisma.roomMonster.findFirstOrThrow>> & { monster: any }) {
  const monster = roomMonster.monster;
  const logs = [log("success", `${monster.name} is defeated. You gain ${monster.expReward} EXP and ${monster.goldReward} gold.`)];
  logs.push(...(await awardExperience(characterId, monster.expReward, monster.goldReward)));

  const drop = monster.lootTable?.drops?.find((candidate: { chance: number }) => candidate.chance >= Math.random());
  if (drop) {
    await prisma.inventoryItem.upsert({
      where: { characterId_itemId: { characterId, itemId: drop.itemId } },
      create: { characterId, itemId: drop.itemId, quantity: drop.minQty },
      update: { quantity: { increment: drop.minQty } }
    });
    logs.push(log("loot", `Loot: ${drop.item.name} x${drop.minQty}.`));
  }
  return logs;
}
