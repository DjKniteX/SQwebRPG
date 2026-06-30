"use client";

import { useEffect, useMemo, useState } from "react";

const adminSections = [
  { id: "world", label: "World", models: ["rooms", "mapGroups", "dungeons"] },
  { id: "actors", label: "Actors", models: ["npcs", "companions", "enemies"] },
  { id: "shops", label: "Shops", models: ["shops", "shopItems", "items"] },
  { id: "progression", label: "Progression", models: ["classes", "spells", "quests"] },
  { id: "system", label: "System", models: ["settings", "announcements", "users", "characters"] }
];

const modelLabels: Record<string, string> = {
  settings: "General Settings",
  mapGroups: "Map Groups",
  enemies: "Enemies",
  npcs: "NPCs",
  companions: "NPC Companions",
  shopItems: "Shop Stock",
  spells: "Spells / Skills"
};

const starterJson: Record<string, Record<string, any>> = {
  settings: { id: "setting-new", key: "newSetting", value: "" },
  mapGroups: { id: "new-map-group", name: "New Area", description: "", category: "Village", zoneId: null },
  rooms: { id: "new-room", name: "New Room", description: "", zoneId: "", safe: false, x: 0, y: 0, mapTileType: "town", mapIcon: null, imageUrl: "/images/rooms/town.svg", category: "Area", subType: "Room", mapGroupId: null },
  npcs: { id: "new-npc", name: "New NPC", role: "Villager", dialogue: "Hello there.", inspectText: "A local person with their own story.", roomId: "" },
  enemies: { id: "new-enemy", name: "New Enemy", description: "", inspectText: "Studying this enemy reveals its threat and behavior.", dialogue: "The enemy growls.", category: "Regular", subType: "Monster", level: 1, maxHp: 10, attack: 1, defense: 0, expReward: 1, goldReward: 0, boss: false, aggressive: false, lootTableId: null },
  shops: { id: "new-shop", name: "New Shop", description: "", npcId: "", buyRate: 1, sellRate: 0.5 },
  shopItems: { shopId: "", itemId: "", price: 1, stock: -1, sortOrder: 0 },
  quests: { id: "new-quest", title: "New Quest", description: "", category: "Side", type: "Kill", subType: "General", sourceType: "NPC", repeatable: false, requiredLevel: 1, completionText: "Quest complete.", rewardExp: 0, rewardGold: 0 },
  items: { id: "new-item", name: "New Item", description: "", type: "Consumable", category: "Potion", subType: "Healing", rarity: "common", value: 0, sellValue: null, stackable: true, usable: false, equippable: false },
  spells: { id: "new-skill", name: "New Skill", description: "", type: "Damage", category: "Damage", subType: "Fire", element: "fire", mpCost: 0, cooldownSeconds: 0, targetType: "enemy", power: 1, scalingStat: "intellect", requiredClassId: null, requiredLevel: 1, durationSeconds: 0, effectStat: null, effectAmount: 0, tickHp: 0 },
  dungeons: { id: "new-dungeon", name: "New Dungeon", description: "", recommendedLevel: 1, requiredLevel: 1, entranceRoomId: null, entryRoomId: "", bossMonsterId: "", repeatable: true, cooldownMinutes: 60, maxPartySize: 4, instanced: true, confirmOnEntry: true, returnOnComplete: true, category: "Dungeon", subType: "Instance" },
  announcements: { title: "Announcement", body: "", active: true, sendNow: false }
};

export function AdminDashboard() {
  const [section, setSection] = useState("world");
  const [model, setModel] = useState("rooms");
  const [entries, setEntries] = useState<Record<string, any>[]>([]);
  const [selected, setSelected] = useState<Record<string, any> | null>(null);
  const [json, setJson] = useState("{}");
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState("Ready.");

  async function load(nextModel = model) {
    const response = await fetch(`/api/admin/${nextModel}`);
    const result = await response.json();
    setEntries(result.entries ?? []);
    const first = result.entries?.[0] ?? null;
    setSelected(first);
    setJson(JSON.stringify(first ?? { id: "" }, null, 2));
  }

  useEffect(() => {
    void load(model);
  }, [model]);

  const visible = useMemo(
    () => entries.filter((entry) => JSON.stringify(entry).toLowerCase().includes(filter.toLowerCase())),
    [entries, filter]
  );
  const groups = useMemo(() => [...new Set(entries.map((entry) => entry.category ?? entry.type ?? entry.key?.split(/(?=[A-Z])/)[0]).filter(Boolean))], [entries]);

  async function save() {
    try {
      const body = JSON.parse(json);
      const response = await fetch(`/api/admin/${model}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const result = await response.json();
      setMessage(result.ok ? "Saved." : result.error ?? "Save failed.");
      await load(model);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invalid JSON.");
    }
  }

  async function remove() {
    if (!selected?.id) return;
    await fetch(`/api/admin/${model}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: selected.id })
    });
    setMessage("Deleted.");
    await load(model);
  }

  async function sendNow() {
    let body: Record<string, any>;
    try {
      body = JSON.parse(json);
    } catch {
      setMessage("Invalid JSON.");
      return;
    }
    const response = await fetch(`/api/admin/${model}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, id: body.id ?? selected?.id, _action: "sendNow" })
    });
    const result = await response.json();
    setMessage(result.message ?? (result.ok ? "Sent." : "Send failed."));
    await load(model);
  }

  function displayName(entry: Record<string, any>) {
    const base = entry.name ?? entry.title ?? entry.email ?? entry.key ?? entry.itemId ?? entry.id;
    const meta = [entry.category, entry.subType, entry.level ? `Lv ${entry.level}` : null].filter(Boolean).join(" | ");
    return meta ? `${base} - ${meta}` : base;
  }

  return (
    <main className="page">
      <section className="shell">
        <header className="topbar">
          <h1 style={{ margin: 0, color: "var(--gold)" }}>SQwebRPG Admin Database</h1>
          <nav className="nav"><a className="btn" href="/play">Play</a><a className="btn" href="/docs">Docs</a></nav>
        </header>
        <nav className="admin-section-tabs">
          {adminSections.map((entry) => (
            <button
              className={section === entry.id ? "active" : ""}
              key={entry.id}
              onClick={() => {
                setSection(entry.id);
                setModel(entry.models[0]);
                setFilter("");
              }}
            >
              {entry.label}
            </button>
          ))}
        </nav>
        <div className="admin-layout">
          <aside className="sidebar">
            <h2>{adminSections.find((entry) => entry.id === section)?.label}</h2>
            {adminSections.find((entry) => entry.id === section)?.models.map((entry) => (
              <button className={model === entry ? "active" : ""} key={entry} style={{ width: "100%", marginBottom: 6 }} onClick={() => setModel(entry)}>{modelLabels[entry] ?? entry}</button>
            ))}
            <p className="muted admin-hint">
              Related tools are grouped here to keep world building focused.
            </p>
          </aside>
          <section className="list">
            <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search entries" />
            {groups.length ? (
              <div className="admin-chips">
                {groups.slice(0, 8).map((group) => <button key={group} onClick={() => setFilter(String(group))}>{String(group)}</button>)}
              </div>
            ) : null}
            {visible.map((entry) => (
              <button
                key={entry.id}
                style={{ width: "100%", marginTop: 6, textAlign: "left" }}
                onClick={() => { setSelected(entry); setJson(JSON.stringify(entry, null, 2)); }}
              >
                {displayName(entry)}
              </button>
            ))}
          </section>
          <section className="editor">
            <div className="nav" style={{ marginBottom: 10 }}>
              <button onClick={() => { setSelected(null); setJson(JSON.stringify(starterJson[model] ?? { id: "new-id" }, null, 2)); }}>New</button>
              <button onClick={() => { const copy = selected ? { ...selected, id: `${selected.id}-copy` } : {}; setJson(JSON.stringify(copy, null, 2)); }}>Duplicate</button>
              <button onClick={save}>Save</button>
              <button onClick={remove}>Delete</button>
              {model === "announcements" ? <button onClick={sendNow}>Send Now</button> : null}
            </div>
            <p className="muted">Editing {modelLabels[model] ?? model}. Use category/subType fields to make database lists easier to filter.</p>
            <textarea value={json} onChange={(event) => setJson(event.target.value)} style={{ width: "100%", minHeight: 520, fontFamily: "monospace" }} />
            <p className="muted">{message}</p>
          </section>
        </div>
      </section>
    </main>
  );
}
