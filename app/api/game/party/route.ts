import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { acceptParty, inviteToParty, leaveParty } from "@/lib/engine/parties";

const schema = z.object({
  characterId: z.string().min(1),
  action: z.enum(["invite", "accept", "leave"]),
  target: z.string().optional()
});

export async function POST(request: Request) {
  await requireUser();
  const input = schema.parse(await request.json());
  if (input.action === "invite") return NextResponse.json(await inviteToParty(input.characterId, input.target ?? ""));
  if (input.action === "accept") return NextResponse.json(await acceptParty(input.characterId));
  return NextResponse.json(await leaveParty(input.characterId));
}
