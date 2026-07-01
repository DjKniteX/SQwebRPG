"use client";

import { useState } from "react";

export function SetupForm() {
  const [mode, setMode] = useState<"blank" | "demo">("blank");
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/setup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(mode === "blank" ? { mode, email, password } : { mode })
    });
    const result = await response.json();
    if (!result.ok) {
      setError(result.error ?? "Setup failed.");
      setBusy(false);
      return;
    }
    window.location.href = "/admin";
  }

  return (
    <main className="page">
      <section className="setup shell">
        <header className="topbar">
          <div>
            <h1 className="brand">SQwebRPG First Run</h1>
            <p className="muted">Choose how this installation should start.</p>
          </div>
          <a className="btn" href="/docs">Docs</a>
        </header>
        <form className="form" onSubmit={submit} style={{ padding: 18 }}>
          <div className="grid cards">
            <label className={`panel setup-choice ${mode === "blank" ? "selected-row" : ""}`}>
              <input checked={mode === "blank"} name="setup-mode" onChange={() => setMode("blank")} type="radio" />
              <strong>Blank Template</strong>
              <span>Create a clean starter world and your first admin account so you can build your own game.</span>
            </label>
            <label className={`panel setup-choice ${mode === "demo" ? "selected-row" : ""}`}>
              <input checked={mode === "demo"} name="setup-mode" onChange={() => setMode("demo")} type="radio" />
              <strong>Mirage Demo</strong>
              <span>Seed Mirage Web RPG with demo rooms, items, enemies, quests, characters, and test accounts.</span>
            </label>
          </div>

          {mode === "blank" ? (
            <>
              <label className="field">
                Admin Email
                <input value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label className="field">
                Admin Password
                <input minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </label>
            </>
          ) : (
            <p className="muted">
              Demo setup creates admin@example.com / admin123 and player demo accounts. Change those credentials before sharing a public server.
            </p>
          )}

          {error ? <p className="tone-danger">{error}</p> : null}
          <button className="primary" disabled={busy}>{busy ? "Setting Up..." : "Start Setup"}</button>
        </form>
      </section>
    </main>
  );
}
