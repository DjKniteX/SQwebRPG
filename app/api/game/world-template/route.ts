import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const setupSchema = z.object({ mode: z.enum(["demo", "blank"]) });

export async function POST(request: Request) {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Only admins can configure the world template." }, { status: 403 });
  }

  const input = setupSchema.parse(await request.json());
  if (input.mode === "blank") {
    await createBlankWorld();
  } else {
    await upsertSetting("worldTemplateConfigured", "true", "setting-world-template-configured");
    await upsertSetting("worldTemplateMode", "demo", "setting-world-template-mode");
    await upsertSetting("gameName", "Mirage Web RPG", "setting-game-name");
    await upsertSetting("engineName", "SQwebRPG", "setting-engine-name");
    await upsertSetting("gameVersion", "v0.1", "setting-game-version");
    await upsertSetting("topRightMode", "clock", "setting-top-right-mode");
    await upsertSetting("gameLive", "false", "setting-game-live");
    await upsertSetting("globalBuybackRate", "0.5", "setting-global-buyback-rate");
    await upsertSetting("innRestCost", "10", "setting-inn-rest-cost");
    await upsertSetting("splashTitle", "Mirage Web RPG", "setting-splash-title");
    await upsertSetting("splashTagline", "A frontier MUD/JRPG demo built on SQwebRPG.", "setting-splash-tagline");
    await upsertSetting("splashDescription", "Explore old-school rooms, recruit companions, crawl dungeons, and build your own world from the admin database.", "setting-splash-description");
    await upsertSetting("splashFeatures", "Command-driven exploration|Turn-based combat|Data-driven quests, shops, rooms, and enemies", "setting-splash-features");
  }

  return NextResponse.json({ ok: true, mode: input.mode });
}

async function createBlankWorld() {
  await prisma.$transaction(async (tx) => {
    await tx.chatMessage.deleteMany();
    await tx.announcement.deleteMany();
    await tx.dungeonInstanceMember.deleteMany();
    await tx.dungeonInstance.deleteMany();
    await tx.characterStatusEffect.deleteMany();
    await tx.characterSpell.deleteMany();
    await tx.equipment.deleteMany();
    await tx.inventoryItem.deleteMany();
    await tx.shopItem.deleteMany();
    await tx.shop.deleteMany();
    await tx.characterQuest.deleteMany();
    await tx.nPCPartyMember.deleteMany();
    await tx.partyMember.deleteMany();
    await tx.party.deleteMany();
    await tx.character.deleteMany();
    await tx.dungeonRoom.deleteMany();
    await tx.dungeonTemplate.deleteMany();
    await tx.questObjective.deleteMany();
    await tx.quest.deleteMany();
    await tx.recruitableNPC.deleteMany();
    await tx.nPC.deleteMany();
    await tx.roomObject.deleteMany();
    await tx.roomMonster.deleteMany();
    await tx.monster.deleteMany();
    await tx.lootDrop.deleteMany();
    await tx.lootTable.deleteMany();
    await tx.item.deleteMany();
    await tx.roomExit.deleteMany();
    await tx.room.deleteMany();
    await tx.mapGroup.deleteMany();
    await tx.zone.deleteMany();

    await tx.zone.create({
      data: {
        id: "blank-world",
        name: "Blank World",
        description: "A clean starter area for a new SQwebRPG project."
      }
    });
    await tx.mapGroup.create({
      data: {
        id: "blank-start-area",
        name: "Blank Start Area",
        description: "Starter map group for a new world.",
        category: "Village",
        zoneId: "blank-world"
      }
    });
    await tx.room.create({
      data: {
        id: "blank-start-room",
        name: "New World Start",
        description: "A quiet starting room. Add exits, NPCs, enemies, quests, and items from the admin tools.",
        zoneId: "blank-world",
        safe: true,
        x: 0,
        y: 0,
        category: "Area",
        subType: "Start",
        mapGroupId: "blank-start-area",
        mapTileType: "town",
        mapIcon: "S",
        imageUrl: "/images/rooms/town.svg"
      }
    });

    await tx.gameSetting.upsert({ where: { key: "startRoomId" }, create: { id: "setting-start-room", key: "startRoomId", value: "blank-start-room" }, update: { value: "blank-start-room" } });
    await tx.gameSetting.upsert({ where: { key: "safeRoomId" }, create: { id: "setting-safe-room", key: "safeRoomId", value: "blank-start-room" }, update: { value: "blank-start-room" } });
    await tx.gameSetting.upsert({ where: { key: "worldMapExcludedZoneIds" }, create: { id: "setting-world-map-excluded-zones", key: "worldMapExcludedZoneIds", value: "" }, update: { value: "" } });
    await tx.gameSetting.upsert({ where: { key: "currencyName" }, create: { id: "setting-currency-name", key: "currencyName", value: "Gold" }, update: { value: "Gold" } });
    await tx.gameSetting.upsert({ where: { key: "expRate" }, create: { id: "setting-exp-rate", key: "expRate", value: "1" }, update: { value: "1" } });
    await tx.gameSetting.upsert({ where: { key: "maxLevel" }, create: { id: "setting-max-level", key: "maxLevel", value: "50" }, update: { value: "50" } });
    await tx.gameSetting.upsert({ where: { key: "gameName" }, create: { id: "setting-game-name", key: "gameName", value: "Untitled SQwebRPG World" }, update: { value: "Untitled SQwebRPG World" } });
    await tx.gameSetting.upsert({ where: { key: "engineName" }, create: { id: "setting-engine-name", key: "engineName", value: "SQwebRPG" }, update: { value: "SQwebRPG" } });
    await tx.gameSetting.upsert({ where: { key: "gameVersion" }, create: { id: "setting-game-version", key: "gameVersion", value: "v0.1" }, update: { value: "v0.1" } });
    await tx.gameSetting.upsert({ where: { key: "topRightMode" }, create: { id: "setting-top-right-mode", key: "topRightMode", value: "clock" }, update: { value: "clock" } });
    await tx.gameSetting.upsert({ where: { key: "gameLive" }, create: { id: "setting-game-live", key: "gameLive", value: "false" }, update: { value: "false" } });
    await tx.gameSetting.upsert({ where: { key: "globalBuybackRate" }, create: { id: "setting-global-buyback-rate", key: "globalBuybackRate", value: "0.5" }, update: { value: "0.5" } });
    await tx.gameSetting.upsert({ where: { key: "innRestCost" }, create: { id: "setting-inn-rest-cost", key: "innRestCost", value: "10" }, update: { value: "10" } });
    await tx.gameSetting.upsert({ where: { key: "splashTitle" }, create: { id: "setting-splash-title", key: "splashTitle", value: "Untitled SQwebRPG World" }, update: { value: "Untitled SQwebRPG World" } });
    await tx.gameSetting.upsert({ where: { key: "splashTagline" }, create: { id: "setting-splash-tagline", key: "splashTagline", value: "A new browser RPG is being prepared." }, update: { value: "A new browser RPG is being prepared." } });
    await tx.gameSetting.upsert({ where: { key: "splashDescription" }, create: { id: "setting-splash-description", key: "splashDescription", value: "Edit this splash page from General Settings in the admin database." }, update: { value: "Edit this splash page from General Settings in the admin database." } });
    await tx.gameSetting.upsert({ where: { key: "splashFeatures" }, create: { id: "setting-splash-features", key: "splashFeatures", value: "Create maps|Add enemies|Publish your world" }, update: { value: "Create maps|Add enemies|Publish your world" } });
    await tx.gameSetting.upsert({ where: { key: "worldTemplateConfigured" }, create: { id: "setting-world-template-configured", key: "worldTemplateConfigured", value: "true" }, update: { value: "true" } });
    await tx.gameSetting.upsert({ where: { key: "worldTemplateMode" }, create: { id: "setting-world-template-mode", key: "worldTemplateMode", value: "blank" }, update: { value: "blank" } });
  });
}

async function upsertSetting(key: string, value: string, id: string) {
  await prisma.gameSetting.upsert({
    where: { key },
    create: { id, key, value },
    update: { value }
  });
}
