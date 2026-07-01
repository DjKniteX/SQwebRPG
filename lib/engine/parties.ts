import { prisma } from "@/lib/db";
import { log } from "@/lib/engine/types";

export async function inviteToParty(characterId: string, playerName: string) {
  const target = await prisma.character.findFirst({ where: { name: { contains: playerName } } });
  if (!target) return { ok: false, logs: [log("danger", `No player named ${playerName} was found.`)] };
  const existing = await getOrCreateParty(characterId);
  const count = await countPartySlots(existing.id);
  const maxPartySize = await getMaxPartySize();
  if (count >= maxPartySize) return { ok: false, logs: [log("danger", `Party is full. Max size is ${maxPartySize} including NPC companions.`)] };
  await prisma.partyMember.upsert({
    where: { partyId_characterId: { partyId: existing.id, characterId: target.id } },
    create: { partyId: existing.id, characterId: target.id, status: "INVITED" },
    update: { status: "INVITED" }
  });
  await prisma.chatMessage.create({
    data: { channel: "SYSTEM", characterId: target.id, userId: target.userId, body: `Party invite from ${await characterName(characterId)}. Type "accept party" or click Accept in the notice.` }
  });
  return { ok: true, logs: [log("system", `Party invite sent to ${target.name}.`)] };
}

export async function acceptParty(characterId: string) {
  const invite = await prisma.partyMember.findFirst({ where: { characterId, status: "INVITED" } });
  if (!invite) return { ok: false, logs: [log("danger", "You have no pending party invite.")] };
  await prisma.partyMember.update({ where: { id: invite.id }, data: { status: "ACTIVE" } });
  return { ok: true, logs: [log("success", "You join the party.")] };
}

export async function leaveParty(characterId: string) {
  await prisma.partyMember.deleteMany({ where: { characterId } });
  return { ok: true, logs: [log("system", "You leave the party.")] };
}

export async function recruitNpc(characterId: string, npcName: string) {
  const character = await prisma.character.findUniqueOrThrow({ where: { id: characterId } });
  const npc = await prisma.recruitableNPC.findFirst({ where: { roomId: character.roomId, name: { contains: npcName } } });
  if (!npc) return { ok: false, logs: [log("danger", `No recruitable companion named ${npcName} is here.`)] };
  const existingRecruit = await prisma.nPCPartyMember.findUnique({
    where: { characterId_recruitableNpcId: { characterId, recruitableNpcId: npc.id } }
  });
  if (existingRecruit) return { ok: true, logs: [log("system", `${npc.name} is already in your party.`)] };
  if (character.gold < npc.cost) return { ok: false, logs: [log("danger", `${npc.name} requires ${npc.cost} gold.`)] };
  const party = await getOrCreateParty(characterId);
  const count = await countPartySlots(party.id);
  const maxPartySize = await getMaxPartySize();
  if (count >= maxPartySize) return { ok: false, logs: [log("danger", "Party is full. Dismiss someone first.")] };
  await prisma.nPCPartyMember.create({ data: { partyId: party.id, characterId, recruitableNpcId: npc.id, currentHp: npc.hp, currentMp: npc.mp } });
  await prisma.character.update({ where: { id: characterId }, data: { gold: character.gold - npc.cost } });
  return { ok: true, logs: [log("success", `${npc.name} joins your party as ${npc.role}.`)] };
}

export async function dismissNpc(characterId: string, npcName: string) {
  const link = await prisma.nPCPartyMember.findFirst({
    where: { characterId, recruitableNpc: { name: { contains: npcName } } },
    include: { recruitableNpc: true }
  });
  if (!link) return { ok: false, logs: [log("danger", `No companion named ${npcName} is in your party.`)] };
  await prisma.nPCPartyMember.delete({ where: { id: link.id } });
  return { ok: true, logs: [log("system", `${link.recruitableNpc.name} leaves your party.`)] };
}

export async function kickPartyMember(characterId: string, targetName: string) {
  const party = await getLedParty(characterId);
  if (!party) return { ok: false, logs: [log("danger", "Only the party leader can remove party members.")] };

  const npc = await prisma.nPCPartyMember.findFirst({
    where: { partyId: party.id, recruitableNpc: { name: { contains: targetName } } },
    include: { recruitableNpc: true }
  });
  if (npc) {
    await prisma.nPCPartyMember.delete({ where: { id: npc.id } });
    return { ok: true, logs: [log("system", `${npc.recruitableNpc.name} is removed from the party.`)] };
  }

  const member = await prisma.partyMember.findFirst({
    where: { partyId: party.id, character: { name: { contains: targetName } } },
    include: { character: true }
  });
  if (!member) return { ok: false, logs: [log("danger", `No party member named ${targetName} was found.`)] };
  if (member.characterId === characterId) return { ok: false, logs: [log("danger", "Use leave party if you want to leave.")] };
  await prisma.partyMember.delete({ where: { id: member.id } });
  return { ok: true, logs: [log("system", `${member.character.name} is removed from the party.`)] };
}

export async function promotePartyLeader(characterId: string, targetName: string) {
  const party = await getLedParty(characterId);
  if (!party) return { ok: false, logs: [log("danger", "Only the party leader can promote a new leader.")] };

  const member = await prisma.partyMember.findFirst({
    where: { partyId: party.id, status: "ACTIVE", character: { name: { contains: targetName } } },
    include: { character: true }
  });
  if (!member) return { ok: false, logs: [log("danger", "Only player characters can become party leader.")] };
  await prisma.party.update({ where: { id: party.id }, data: { leaderId: member.characterId } });
  return { ok: true, logs: [log("success", `${member.character.name} is now the party leader.`)] };
}

async function getOrCreateParty(characterId: string) {
  const existing = await prisma.partyMember.findFirst({ where: { characterId, status: "ACTIVE" }, include: { party: true } });
  if (existing) return existing.party;
  const party = await prisma.party.create({ data: { leaderId: characterId } });
  await prisma.partyMember.create({ data: { partyId: party.id, characterId, status: "ACTIVE" } });
  return party;
}

async function getLedParty(characterId: string) {
  return prisma.party.findFirst({ where: { leaderId: characterId } });
}

async function countPartySlots(partyId: string) {
  const [players, npcs] = await Promise.all([
    prisma.partyMember.count({ where: { partyId, status: "ACTIVE" } }),
    prisma.nPCPartyMember.count({ where: { partyId } })
  ]);
  return players + npcs;
}

async function getMaxPartySize() {
  const setting = await prisma.gameSetting.findUnique({ where: { key: "maxPartySize" } });
  const parsed = Number.parseInt(setting?.value ?? "4", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4;
}

async function characterName(characterId: string) {
  const character = await prisma.character.findUnique({ where: { id: characterId }, select: { name: true } });
  return character?.name ?? "A player";
}
