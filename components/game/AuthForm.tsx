"use client";

import { useState } from "react";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [email, setEmail] = useState(mode === "login" ? "player1@example.com" : "");
  const [password, setPassword] = useState(mode === "login" ? "player123" : "");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const result = await response.json();
    if (!result.ok) {
      setError(result.error ?? "Authentication failed.");
      return;
    }
    window.location.href = "/play";
  }

  return (
    <main className="page">
      <section className="auth shell">
        <header className="topbar">
          <h1>{mode === "login" ? "Login" : "Create Account"}</h1>
          <a className="btn" href={mode === "login" ? "/register" : "/login"}>
            {mode === "login" ? "Register" : "Login"}
          </a>
        </header>
        <form className="form" onSubmit={submit} style={{ padding: 18 }}>
          <label className="field">
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="field">
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error ? <p className="tone-danger">{error}</p> : null}
          <button className="primary">{mode === "login" ? "Login" : "Create Account"}</button>
          <p className="muted">Mirage demo accounts exist only when the demo template was selected during setup.</p>
        </form>
      </section>
    </main>
  );
}
