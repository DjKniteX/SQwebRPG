import { prisma } from "@/lib/db";

const DEFAULT_CHARACTER_LIMIT = 3;

export async function getCharacterLimit() {
  const setting = await prisma.gameSetting.findUnique({ where: { key: "characterLimit" } });
  const parsed = Number.parseInt(setting?.value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CHARACTER_LIMIT;
}

export async function createCharacter(userId: string, name: string, classId: string) {
  const [limit, existingCount] = await Promise.all([
    getCharacterLimit(),
    prisma.character.count({ where: { userId } })
  ]);
  if (existingCount >= limit) {
    throw new Error(`Character limit reached. This world allows ${limit} characters per account.`);
  }

  const klass = await prisma.class.findUniqueOrThrow({ where: { id: classId }, include: { statTemplate: true } });
  const startRoom = await prisma.gameSetting.findUnique({ where: { key: "startRoomId" } });
  const stats = klass.statTemplate ?? { strength: 4, dexterity: 4, agility: 4, intellect: 4, wisdom: 4, stamina: 4 };
  const character = await prisma.character.create({
    data: {
      userId,
      name,
      classId,
      level: 1,
      exp: 0,
      gold: 50,
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
      roomId: startRoom?.value ?? "ironwood-town-square",
      lastSeenAt: new Date()
    }
  });

  const spells = await prisma.spell.findMany({
    where: { OR: [{ requiredClassId: classId }, { requiredClassId: null }], requiredLevel: { lte: 1 } }
  });
  await prisma.characterSpell.createMany({
    data: spells.map((spell) => ({ characterId: character.id, spellId: spell.id }))
  });
  const starterItems = await prisma.item.findMany({ where: { id: { in: ["minor-healing-potion"] } } });
  if (starterItems.length) {
    await prisma.inventoryItem.createMany({
      data: starterItems.map((item) => ({ characterId: character.id, itemId: item.id, quantity: item.id === "minor-healing-potion" ? 3 : 1 }))
    });
  }
  return character;
}
