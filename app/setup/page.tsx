import { redirect } from "next/navigation";
import { SetupForm } from "@/components/game/SetupForm";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const [userCount, configuredSetting] = await Promise.all([
    prisma.user.count(),
    prisma.gameSetting.findUnique({ where: { key: "worldTemplateConfigured" } })
  ]);
  const configured = (configuredSetting?.value ?? "false").toLowerCase() === "true";
  if (configured) redirect("/");
  if (userCount > 0) redirect("/login");
  return <SetupForm />;
}
