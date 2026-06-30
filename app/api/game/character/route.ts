import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createCharacter } from "@/lib/engine/characters";

const createSchema = z.object({ name: z.string().min(2).max(32), classId: z.string().min(1) });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, user: null, characters: [], classes: [] });
  const [characters, classes] = await Promise.all([
    prisma.character.findMany({ where: { userId: user.id }, include: { class: true }, orderBy: { createdAt: "asc" } }),
    prisma.class.findMany({ orderBy: { name: "asc" } })
  ]);
  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, role: user.role }, characters, classes });
}

export async function POST(request: Request) {
  const user = await requireUser();
  const input = createSchema.parse(await request.json());
  try {
    const character = await createCharacter(user.id, input.name, input.classId);
    return NextResponse.json({ ok: true, character });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not create character." }, { status: 400 });
  }
}
