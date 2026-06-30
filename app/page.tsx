import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const liveSetting = await prisma.gameSetting.findUnique({ where: { key: "gameLive" } });
  if ((liveSetting?.value ?? "false").toLowerCase() === "true") redirect("/play");

  return (
    <main className="page">
      <section className="shell">
        <header className="topbar">
          <h1 className="brand">SQwebRPG</h1>
          <nav className="nav">
            <a className="btn primary" href="/demo">Play Demo Game</a>
            <a className="btn" href="/admin">Admin Dashboard</a>
            <a className="btn" href="/docs">Read Documentation</a>
            <a className="btn" href="/login">Create Account / Login</a>
          </nav>
        </header>
        <div className="grid cards" style={{ padding: 18 }}>
          <article className="panel">
            <h2>Build Browser RPGs</h2>
            <p>SQwebRPG is a Next.js framework for multiplayer browser-based RPGs, PBBGs, dungeon crawlers, and MUD-style games.</p>
          </article>
          <article className="panel">
            <h2>Data-Driven Worlds</h2>
            <p>Create rooms, enemies, quests, items, classes, spells, dungeons, companions, and settings through the database and admin editor.</p>
          </article>
          <article className="panel">
            <h2>Working Demo</h2>
            <p>Visit the included demo game, Mirage Web RPG, to move through rooms, chat, recruit NPCs, fight enemies, and explore the admin workflow.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
