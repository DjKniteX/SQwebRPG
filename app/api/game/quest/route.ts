import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { acceptQuest, completeQuest } from "@/lib/engine/quests";

const schema = z.object({ characterId: z.string().min(1), action: z.enum(["accept", "complete"]), quest: z.string().min(1) });

export async function POST(request: Request) {
  await requireUser();
  const input = schema.parse(await request.json());
  return NextResponse.json(input.action === "accept" ? await acceptQuest(input.characterId, input.quest) : await completeQuest(input.characterId, input.quest));
}
