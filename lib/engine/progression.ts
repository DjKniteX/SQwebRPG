import { prisma } from "@/lib/db";
import { log, type EngineLog } from "@/lib/engine/types";

export type AllocatableStat = "strength" | "dexterity" | "agility" | "intellect" | "wisdom" | "stamina";

export const allocatableStats: AllocatableStat[] = ["strength", "dexterity", "agility", "intellect", "wisdom", "stamina"];

export function nextLevelExp(level: number) {
  return level * 100;
}

export async function awardExperience(characterId: string, exp: number, gold = 0) {
  const character = await prisma.character.findUniqueOrThrow({ where: { id: characterId } });
  const [expRateSetting, maxLevelSetting] = await Promise.all([
    prisma.gameSetting.findUnique({ where: { key: "expRate" } }),
    prisma.gameSetting.findUnique({ where: { key: "maxLevel" } })
  ]);
  const expRate = Math.max(0, Number.parseFloat(expRateSetting?.value ?? "1") || 1);
  const maxLevel = Math.max(1, Number.parseInt(maxLevelSetting?.value ?? "50", 10) || 50);
  let nextExp = character.exp + Math.floor(exp * expRate);
  let level = character.level;
  let statPoints = character.statPoints;
  let hpGain = 0;
  let mpGain = 0;
  const logs: EngineLog[] = [];

  while (level < maxLevel && nextExp >= nextLevelExp(level)) {
    nextExp -= nextLevelExp(level);
    level += 1;
    statPoints += 3;
    hpGain += 6 + Math.floor(character.stamina / 2);
    mpGain += 2 + Math.floor(Math.max(character.intellect, character.wisdom) / 3);
    logs.push(log("success", `Level up! You are now level ${level}. You gained 3 stat points.`));
  }
  if (level >= maxLevel) nextExp = Math.min(nextExp, nextLevelExp(maxLevel) - 1);

  await prisma.character.update({
    where: { id: characterId },
    data: {
      exp: nextExp,
      gold: character.gold + gold,
      level,
      statPoints,
      maxHp: character.maxHp + hpGain,
      hp: character.hp + hpGain,
      maxMp: character.maxMp + mpGain,
      mp: character.mp + mpGain
    }
  });

  if (level > character.level) {
    const newSpells = await prisma.spell.findMany({
      where: {
        requiredLevel: { lte: level, gt: character.level },
        OR: [{ requiredClassId: character.classId }, { requiredClassId: null }],
        characters: { none: { characterId } }
      }
    });
    if (newSpells.length) {
      await prisma.characterSpell.createMany({
        data: newSpells.map((spell) => ({ characterId, spellId: spell.id }))
      });
      logs.push(...newSpells.map((spell) => log("success", `Learned ${spell.name}.`)));
    }
  }

  return logs;
}

export async function allocateStat(characterId: string, stat: string) {
  if (!allocatableStats.includes(stat as AllocatableStat)) {
    return { ok: false, logs: [log("danger", "Choose strength, dexterity, agility, intellect, wisdom, or stamina.")] };
  }

  const key = stat as AllocatableStat;
  const character = await prisma.character.findUniqueOrThrow({ where: { id: characterId } });
  if (character.statPoints <= 0) {
    return { ok: false, logs: [log("danger", "You do not have any unspent stat points.")] };
  }

  const statEffects: Record<AllocatableStat, Record<string, number>> = {
    strength: { attack: 1 },
    dexterity: { attack: 1 },
    agility: { attack: 1 },
    intellect: { maxMp: 3, mp: 3 },
    wisdom: { maxMp: 2, mp: 2, defense: 1 },
    stamina: { maxHp: 5, hp: 5, defense: 1 }
  };

  await prisma.character.update({
    where: { id: characterId },
    data: {
      [key]: { increment: 1 },
      statPoints: { decrement: 1 },
      ...Object.fromEntries(Object.entries(statEffects[key]).map(([field, value]) => [field, { increment: value }]))
    }
  });

  return { ok: true, logs: [log("success", `${labelStat(key)} increased. ${character.statPoints - 1} stat points remain.`)] };
}

export function labelStat(stat: AllocatableStat) {
  return stat.charAt(0).toUpperCase() + stat.slice(1);
}
