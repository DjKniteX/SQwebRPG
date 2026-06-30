import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { setSession, verifyPassword } from "@/lib/auth";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(request: Request) {
  const input = schema.parse(await request.json());
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 401 });
  }
  await setSession(user.id);
  return NextResponse.json({ ok: true, role: user.role });
}
