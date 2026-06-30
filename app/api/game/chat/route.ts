import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { sendChat } from "@/lib/engine/chat";

const schema = z.object({ characterId: z.string().min(1), channel: z.string().default("ROOM"), body: z.string().min(1) });

export async function POST(request: Request) {
  await requireUser();
  const input = schema.parse(await request.json());
  return NextResponse.json(await sendChat(input.characterId, input.channel, input.body));
}
