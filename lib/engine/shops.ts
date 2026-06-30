import { prisma } from "@/lib/db";
import { log } from "@/lib/engine/types";

export async function listShop(characterId: string, shopkeeper = "") {
  const character = await prisma.character.findUniqueOrThrow({ where: { id: characterId }, include: { room: true } });
  const shop = await findNearbyShop(character.roomId, shopkeeper);
  if (!shop) return { ok: false, logs: [log("danger", "No shopkeeper is here.")] };
  const lines = shop.items
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((entry) => `${entry.item.name}: ${entry.price} gold${entry.stock >= 0 ? ` (${entry.stock} left)` : ""}`);
  return { ok: true, logs: [log("system", `${shop.name}: ${shop.description}`), ...lines.map((line) => log("system", line))] };
}

export async function buyItem(characterId: string, itemName: string) {
  if (!itemName.trim()) return listShop(characterId);
  const character = await prisma.character.findUniqueOrThrow({ where: { id: characterId }, include: { room: true } });
  const shop = await findNearbyShop(character.roomId, "");
  if (!shop) return { ok: false, logs: [log("danger", "No shopkeeper is here.")] };
  const entry = shop.items.find((candidate) => candidate.itemId === itemName || candidate.item.name.toLowerCase().includes(itemName.toLowerCase()));
  if (!entry) return { ok: false, logs: [log("danger", `${shop.name} does not sell ${itemName}.`)] };
  if (entry.stock === 0) return { ok: false, logs: [log("danger", `${entry.item.name} is out of stock.`)] };
  if (character.gold < entry.price) return { ok: false, logs: [log("danger", `You need ${entry.price} gold to buy ${entry.item.name}.`)] };

  await prisma.$transaction([
    prisma.character.update({ where: { id: characterId }, data: { gold: { decrement: entry.price } } }),
    prisma.inventoryItem.upsert({
      where: { characterId_itemId: { characterId, itemId: entry.itemId } },
      create: { characterId, itemId: entry.itemId, quantity: 1 },
      update: { quantity: { increment: 1 } }
    }),
    ...(entry.stock > 0 ? [prisma.shopItem.update({ where: { id: entry.id }, data: { stock: { decrement: 1 } } })] : [])
  ]);
  return { ok: true, logs: [log("success", `Bought ${entry.item.name} for ${entry.price} gold.`)] };
}

export async function sellItem(characterId: string, itemName: string) {
  if (!itemName.trim()) return { ok: false, logs: [log("danger", "Sell what? Try sell Minor Healing Potion.")] };
  const character = await prisma.character.findUniqueOrThrow({ where: { id: characterId }, include: { room: true } });
  const shop = await findNearbyShop(character.roomId, "");
  if (!shop) return { ok: false, logs: [log("danger", "No shopkeeper is here.")] };
  const inventory = await prisma.inventoryItem.findFirst({
    where: { characterId, OR: [{ itemId: itemName }, { item: { name: { contains: itemName } } }] },
    include: { item: true }
  });
  if (!inventory) return { ok: false, logs: [log("danger", `You do not have ${itemName}.`)] };
  const stockedItem = shop.items.find((entry) => entry.itemId === inventory.itemId);
  const buybackRate = await getBuybackRate(shop.sellRate);
  const basePrice = stockedItem?.price ?? inventory.item.value;
  const price = inventory.item.sellValue ?? Math.max(1, Math.floor(basePrice * buybackRate));
  await prisma.$transaction([
    prisma.character.update({ where: { id: characterId }, data: { gold: { increment: price } } }),
    inventory.quantity > 1
      ? prisma.inventoryItem.update({ where: { id: inventory.id }, data: { quantity: { decrement: 1 } } })
      : prisma.inventoryItem.delete({ where: { id: inventory.id } })
  ]);
  return { ok: true, logs: [log("success", `Sold ${inventory.item.name} for ${price} gold.`)] };
}

async function getBuybackRate(fallback: number) {
  const setting = await prisma.gameSetting.findUnique({ where: { key: "globalBuybackRate" } });
  const parsed = Number.parseFloat(setting?.value ?? "");
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  return fallback;
}

async function findNearbyShop(roomId: string, shopkeeper: string) {
  return prisma.shop.findFirst({
    where: {
      npc: {
        roomId,
        ...(shopkeeper ? { OR: [{ id: shopkeeper }, { name: { contains: shopkeeper } }] } : {})
      }
    },
    include: { npc: true, items: { include: { item: true } } }
  });
}
