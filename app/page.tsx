import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settingsRows = await prisma.gameSetting.findMany({
    where: { key: { in: ["gameLive", "worldTemplateConfigured", "splashTitle", "splashTagline", "splashDescription", "splashFeatures"] } }
  });
  const settings = Object.fromEntries(settingsRows.map((entry) => [entry.key, entry.value]));
  if ((settings.gameLive ?? "false").toLowerCase() === "true") redirect("/play");
  if ((settings.worldTemplateConfigured ?? "false").toLowerCase() !== "true") redirect("/login");
  const features = (settings.splashFeatures ?? "Command-driven exploration|Turn-based combat|Data-driven content")
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return (
    <main className="page">
      <section className="shell">
        <header className="topbar">
          <h1 className="brand">{settings.splashTitle ?? "SQwebRPG"}</h1>
          <nav className="nav">
            <a className="btn primary" href="/login">Login</a>
            <a className="btn" href="/register">Register</a>
            <a className="btn" href="/docs">Read Documentation</a>
            <a className="btn" href="/admin">Admin</a>
          </nav>
        </header>
        <div className="grid cards" style={{ padding: 18 }}>
          <article className="panel">
            <h2>{settings.splashTagline ?? "A browser RPG powered by SQwebRPG."}</h2>
            <p>{settings.splashDescription ?? "Edit this splash page from General Settings in the admin database."}</p>
          </article>
          {features.slice(0, 3).map((feature) => (
            <article className="panel" key={feature}>
              <h2>{feature}</h2>
              <p>Configured from the admin database, ready for your world content.</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
