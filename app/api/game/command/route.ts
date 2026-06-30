import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { runCommand } from "@/lib/engine/commands";

const schema = z.object({ characterId: z.string().min(1), command: z.string().min(1) });

export async function POST(request: Request) {
  await requireUser();
  const input = schema.parse(await request.json());
  const result = await runCommand(input.characterId, input.command);
  return NextResponse.json(result);
}
