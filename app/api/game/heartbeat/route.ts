import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processIdleAggro, processStatusEffects } from "@/lib/engine/combat";
import { processMonsterRespawns } from "@/lib/engine/rooms";

const schema = z.object({ characterId: z.string().min(1) });

export async function POST(request: Request) {
  await requireUser();
  const input = schema.parse(await request.json());
  await prisma.character.update({ where: { id: input.characterId }, data: { lastSeenAt: new Date() } });
  await processMonsterRespawns();
  const logs = [...(await processStatusEffects(input.characterId)), ...(await processIdleAggro(input.characterId))];
  return NextResponse.json({ ok: true, logs });
}
