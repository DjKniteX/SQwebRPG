import { prisma } from "@/lib/db";
import { log } from "@/lib/engine/types";

export async function takeRoomObject(characterId: string, targetNameOrId: string) {
  const target = targetNameOrId.trim();
  if (!target) return { ok: false, logs: [log("danger", "Take what?")] };
  const character = await prisma.character.findUniqueOrThrow({ where: { id: characterId } });
  const object = await prisma.roomObject.findFirst({
    where: {
      roomId: character.roomId,
      hidden: false,
      OR: [{ id: target }, { name: { contains: target } }]
    },
    include: { item: true }
  });
  if (!object) return { ok: false, logs: [log("danger", `You do not see ${targetNameOrId} here.`)] };
  if (!object.takeable || !object.itemId) return { ok: false, logs: [log("danger", `${object.name} cannot be taken.`)] };

  await prisma.$transaction([
    prisma.inventoryItem.upsert({
      where: { characterId_itemId: { characterId, itemId: object.itemId } },
      create: { characterId, itemId: object.itemId, quantity: object.quantity },
      update: { quantity: { increment: object.quantity } }
    }),
    object.respawns
      ? prisma.roomObject.update({ where: { id: object.id }, data: { hidden: true } })
      : prisma.roomObject.delete({ where: { id: object.id } })
  ]);

  return { ok: true, logs: [log("loot", `You take ${object.item?.name ?? object.name} x${object.quantity}.`)] };
}

export async function inspectRoomObject(characterId: string, targetNameOrId: string) {
  const target = targetNameOrId.trim();
  if (!target) return null;
  const character = await prisma.character.findUniqueOrThrow({ where: { id: characterId } });
  const object = await prisma.roomObject.findFirst({
    where: {
      roomId: character.roomId,
      hidden: false,
      OR: [{ id: target }, { name: { contains: target } }]
    },
    include: { item: true }
  });
  if (!object) return null;
  return {
    ok: true,
    logs: [
      log("system", `${object.name}: ${object.inspectText ?? object.description}`),
      object.takeable && object.item ? log("system", `It can be taken as ${object.item.name} x${object.quantity}.`) : log("system", "It appears to be part of this place.")
    ]
  };
}
