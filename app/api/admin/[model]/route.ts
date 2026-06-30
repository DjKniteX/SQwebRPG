import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const modelMap = {
  classes: prisma.class,
  rooms: prisma.room,
  enemies: prisma.monster,
  monsters: prisma.monster,
  npcs: prisma.nPC,
  companions: prisma.recruitableNPC,
  shops: prisma.shop,
  shopItems: prisma.shopItem,
  quests: prisma.quest,
  items: prisma.item,
  spells: prisma.spell,
  dungeons: prisma.dungeonTemplate,
  mapGroups: prisma.mapGroup,
  settings: prisma.gameSetting,
  announcements: prisma.announcement,
  users: prisma.user,
  characters: prisma.character
} as const;

type ModelName = keyof typeof modelMap;

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export async function GET(_request: Request, context: { params: Promise<{ model: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false, error: "Admin required." }, { status: 403 });
  const { model } = await context.params;
  const delegate = modelMap[model as ModelName] as any;
  if (!delegate) return NextResponse.json({ ok: false, error: "Unknown admin model." }, { status: 404 });
  const entries = await delegate.findMany({ take: 200, orderBy: orderFor(model as ModelName) });
  return NextResponse.json({ ok: true, entries });
}

export async function POST(request: Request, context: { params: Promise<{ model: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false, error: "Admin required." }, { status: 403 });
  const { model } = await context.params;
  const delegate = modelMap[model as ModelName] as any;
  if (!delegate) return NextResponse.json({ ok: false, error: "Unknown admin model." }, { status: 404 });
  const body = await request.json();
  if (model === "announcements" && body._action === "sendNow") {
    const { _action, ...announcementBody } = body;
    const announcement = announcementBody.id
      ? await prisma.announcement.upsert({
          where: { id: announcementBody.id },
          create: { ...announcementBody, active: true, sendNow: true, sentAt: new Date() },
          update: { ...announcementBody, active: true, sendNow: true, sentAt: new Date() }
        })
      : await prisma.announcement.create({
          data: {
            title: announcementBody.title ?? "Announcement",
            body: announcementBody.body ?? "",
            active: true,
            sendNow: true,
            sentAt: new Date()
          }
        });
    await prisma.chatMessage.create({
      data: { channel: "SYSTEM", body: `[Announcement] ${announcement.title}: ${announcement.body}` }
    });
    return NextResponse.json({ ok: true, entry: announcement, message: "Announcement sent." });
  }
  delete body._action;
  const existing = body.id ? await delegate.findUnique({ where: { id: body.id } }) : null;
  if (!existing) {
    const capError = await capCheck(model as ModelName);
    if (capError) return NextResponse.json({ ok: false, error: capError }, { status: 400 });
  }
  const entry = body.id
    ? await delegate.upsert({ where: { id: body.id }, create: body, update: body })
    : await delegate.create({ data: body });
  return NextResponse.json({ ok: true, entry });
}

export async function DELETE(request: Request, context: { params: Promise<{ model: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false, error: "Admin required." }, { status: 403 });
  const { model } = await context.params;
  const delegate = modelMap[model as ModelName] as any;
  if (!delegate) return NextResponse.json({ ok: false, error: "Unknown admin model." }, { status: 404 });
  const { id } = await request.json();
  await delegate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

function orderFor(model: ModelName) {
  if (model === "settings") return { key: "asc" };
  if (model === "users") return { email: "asc" };
  if (model === "announcements") return { createdAt: "desc" };
  if (model === "characters") return { name: "asc" };
  if (model === "quests") return { category: "asc" };
  if (model === "shopItems") return [{ shopId: "asc" }, { sortOrder: "asc" }];
  if (model === "rooms") return [{ mapGroupId: "asc" }, { y: "asc" }, { x: "asc" }];
  if (model === "enemies" || model === "monsters") return [{ category: "asc" }, { level: "asc" }];
  return { name: "asc" };
}

async function capCheck(model: ModelName) {
  const capKeys: Partial<Record<ModelName, string>> = {
    rooms: "maxRooms",
    enemies: "maxEnemies",
    monsters: "maxEnemies",
    items: "maxItems",
    spells: "maxSkills"
  };
  const key = capKeys[model];
  if (!key) return "";
  const setting = await prisma.gameSetting.findUnique({ where: { key } });
  const cap = Number.parseInt(setting?.value ?? "", 10);
  if (!Number.isFinite(cap) || cap <= 0) return "";
  const delegate = modelMap[model] as any;
  const count = await delegate.count();
  return count >= cap ? `${model} limit reached (${cap}). Adjust ${key} in General Settings.` : "";
}
