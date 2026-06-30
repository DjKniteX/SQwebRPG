import { prisma } from "@/lib/db";
import { log } from "@/lib/engine/types";

export async function sendChat(characterId: string, rawChannel: string, body: string) {
  const character = await prisma.character.findUniqueOrThrow({ where: { id: characterId } });
  const channel = rawChannel.toUpperCase();
  const roomId = channel === "ROOM" ? character.roomId : undefined;
  const message = `${character.name}: ${body}`;
  await prisma.chatMessage.create({
    data: { channel, characterId, userId: character.userId, roomId, body: message }
  });
  return { ok: true, logs: [log("chat", `[${channel.toLowerCase()}] ${message}`)] };
}

export async function systemMessage(body: string, roomId?: string) {
  return prisma.chatMessage.create({ data: { channel: roomId ? "ROOM" : "SYSTEM", roomId, body } });
}
