import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { dismissNpc, recruitNpc } from "@/lib/engine/parties";

const schema = z.object({ characterId: z.string().min(1), action: z.enum(["recruit", "dismiss"]), npc: z.string().min(1) });

export async function POST(request: Request) {
  await requireUser();
  const input = schema.parse(await request.json());
  return NextResponse.json(input.action === "recruit" ? await recruitNpc(input.characterId, input.npc) : await dismissNpc(input.characterId, input.npc));
}
