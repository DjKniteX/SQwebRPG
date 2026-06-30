import fs from "node:fs/promises";
import path from "node:path";

export default async function DocsPage() {
  const files = ["manual.md", "source-map.md", "getting-started.md", "creating-your-first-game.md", "admin-editor-guide.md", "engine-overview.md"];
  const docs = await Promise.all(
    files.map(async (file) => ({
      file,
      body: await fs.readFile(path.join(process.cwd(), "docs", file), "utf8").catch(() => "Documentation file missing.")
    }))
  );
  return (
    <main className="page">
      <section className="shell">
        <header className="topbar">
          <h1 className="brand">SQwebRPG Documentation</h1>
          <nav className="nav"><a className="btn" href="/">Home</a><a className="btn" href="/play">Play</a></nav>
        </header>
        <div style={{ padding: 18 }} className="grid">
          {docs.map((doc) => (
            <article className="panel" key={doc.file}>
              <h2>{doc.file}</h2>
              <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit" }}>{doc.body}</pre>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
