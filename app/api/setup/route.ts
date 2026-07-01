import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, setSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createBlankWorld } from "@/app/api/game/world-template/route";
import { seedDemoWorld } from "@/prisma/seed";

const setupSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("blank"),
    email: z.string().email(),
    password: z.string().min(6)
  }),
  z.object({
    mode: z.literal("demo")
  })
]);

export async function POST(request: Request) {
  const [userCount, configuredSetting] = await Promise.all([
    prisma.user.count(),
    prisma.gameSetting.findUnique({ where: { key: "worldTemplateConfigured" } })
  ]);
  const configured = (configuredSetting?.value ?? "false").toLowerCase() === "true";
  if (configured || userCount > 0) {
    return NextResponse.json({ ok: false, error: "Setup has already been completed." }, { status: 409 });
  }

  const input = setupSchema.parse(await request.json());

  if (input.mode === "blank") {
    await createBlankWorld();
    const admin = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash: hashPassword(input.password),
        role: "ADMIN"
      }
    });
    await setSession(admin.id);
    return NextResponse.json({ ok: true, mode: "blank" });
  }

  await seedDemoWorld();
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@example.com" } });
  await setSession(admin.id);
  return NextResponse.json({ ok: true, mode: "demo" });
}
