import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, setSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({ email: z.string().email(), password: z.string().min(6) });

export async function POST(request: Request) {
  const input = schema.parse(await request.json());
  const user = await prisma.user.create({
    data: { email: input.email, passwordHash: hashPassword(input.password), role: "PLAYER" }
  });
  await setSession(user.id);
  return NextResponse.json({ ok: true, userId: user.id });
}
