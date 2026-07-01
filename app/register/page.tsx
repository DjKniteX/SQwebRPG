import { redirect } from "next/navigation";
import { AuthForm } from "@/components/game/AuthForm";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const [configuredSetting, userCount] = await Promise.all([
    prisma.gameSetting.findUnique({ where: { key: "worldTemplateConfigured" } }),
    prisma.user.count()
  ]);
  if ((configuredSetting?.value ?? "false").toLowerCase() !== "true" && userCount === 0) redirect("/setup");
  return <AuthForm mode="register" />;
}
