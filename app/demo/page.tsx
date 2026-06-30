import { prisma } from "@/lib/db";

export default async function DemoPage() {
  const [rooms, enemies, quests, companions] = await Promise.all([
    prisma.room.count(),
    prisma.monster.count(),
    prisma.quest.count(),
    prisma.recruitableNPC.count()
  ]);

  return (
    <main className="page">
      <section className="shell">
        <header className="topbar">
          <div>
            <h1 className="brand">Mirage Web RPG</h1>
            <p className="muted">A fantasy frontier demo game built with SQwebRPG.</p>
          </div>
          <nav className="nav">
            <a className="btn primary" href="/login">Login and Play</a>
            <a className="btn" href="/docs">Docs</a>
          </nav>
        </header>
        <div className="grid cards" style={{ padding: 18 }}>
          <div className="panel"><h2>Rooms</h2><p>{rooms} seeded locations including town, forest, shrine, cave, and dungeon rooms.</p></div>
          <div className="panel"><h2>Enemies</h2><p>{enemies} enemies including the Goblin King boss.</p></div>
          <div className="panel"><h2>Quests</h2><p>{quests} quests from boards, NPCs, exploration, and dungeon objectives.</p></div>
          <div className="panel"><h2>Companions</h2><p>{companions} recruitable NPC allies: tank, healer, rogue damage, and magic damage.</p></div>
        </div>
      </section>
    </main>
  );
}
