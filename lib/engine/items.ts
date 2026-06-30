import { prisma } from "@/lib/db";
import { log } from "@/lib/engine/types";

export async function useItem(characterId: string, nameOrId: string) {
  const inventory = await prisma.inventoryItem.findFirst({
    where: {
      characterId,
      OR: [{ itemId: nameOrId }, { item: { name: { contains: nameOrId } } }],
      quantity: { gt: 0 }
    },
    include: { item: true, character: true }
  });
  if (!inventory) return { ok: false, logs: [log("danger", `You do not have ${nameOrId}.`)] };
  if (!inventory.item.usable) return { ok: false, logs: [log("danger", `${inventory.item.name} cannot be used.`)] };

  const hp = Math.min(inventory.character.maxHp, inventory.character.hp + inventory.item.hpRestore);
  const mp = Math.min(inventory.character.maxMp, inventory.character.mp + inventory.item.mpRestore);
  await prisma.character.update({ where: { id: characterId }, data: { hp, mp } });
  await prisma.inventoryItem.update({
    where: { id: inventory.id },
    data: { quantity: inventory.quantity - 1 }
  });
  return { ok: true, logs: [log("success", `You use ${inventory.item.name}. HP ${hp}/${inventory.character.maxHp}, MP ${mp}/${inventory.character.maxMp}.`)] };
}
