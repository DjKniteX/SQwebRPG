import { prisma } from "@/lib/db";
import { log } from "@/lib/engine/types";

export async function restAtInn(characterId: string, innkeeper = "") {
  const character = await prisma.character.findUniqueOrThrow({ where: { id: characterId } });
  const inn = await prisma.nPC.findFirst({
    where: {
      roomId: character.roomId,
      role: { contains: "Inn" },
      ...(innkeeper ? { OR: [{ id: innkeeper }, { name: { contains: innkeeper } }] } : {})
    }
  });
  if (!inn) return { ok: false, logs: [log("danger", "No innkeeper is here.")] };
  const setting = await prisma.gameSetting.findUnique({ where: { key: "innRestCost" } });
  const cost = Math.max(0, Number.parseInt(setting?.value ?? "10", 10) || 10);
  if (character.gold < cost) return { ok: false, logs: [log("danger", `${inn.name} charges ${cost} gold for a room.`)] };

  await prisma.character.update({
    where: { id: characterId },
    data: { gold: { decrement: cost }, hp: character.maxHp, mp: character.maxMp }
  });
  await prisma.nPCPartyMember.updateMany({
    where: { characterId },
    data: { currentHp: null, currentMp: null }
  });

  return { ok: true, logs: [log("success", `${inn.name} gives you a room. HP and MP restored for ${cost} gold.`)] };
}
