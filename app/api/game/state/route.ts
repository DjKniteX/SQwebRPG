import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getRoomState } from "@/lib/engine/rooms";

const schema = z.object({ characterId: z.string().min(1) });

export async function POST(request: Request) {
  await requireUser();
  const input = schema.parse(await request.json());
  const state = await getRoomState(input.characterId);
  return NextResponse.json({ ok: true, state });
}
