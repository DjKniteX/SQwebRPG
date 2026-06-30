import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GameClient } from "@/components/game/GameClient";

export default async function PlayPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [characters, classes, characterLimitSetting, worldConfiguredSetting] = await Promise.all([
    prisma.character.findMany({ where: { userId: user.id }, include: { class: true, room: { include: { zone: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.class.findMany({ orderBy: { name: "asc" } }),
    prisma.gameSetting.findUnique({ where: { key: "characterLimit" } }),
    prisma.gameSetting.findUnique({ where: { key: "worldTemplateConfigured" } })
  ]);
  const characterLimit = Number.parseInt(characterLimitSetting?.value ?? "3", 10);

  return (
    <GameClient
      user={{ id: user.id, email: user.email, role: user.role }}
      initialCharacters={characters}
      classes={classes}
      characterLimit={Number.isFinite(characterLimit) ? characterLimit : 3}
      initialWorldConfigured={(worldConfiguredSetting?.value ?? "false").toLowerCase() === "true"}
    />
  );
}
