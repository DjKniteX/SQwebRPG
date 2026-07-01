"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type AnyRecord = Record<string, any>;
type LogLine = { tone: string; text: string };
type Selection =
  | { type: "monster"; data: AnyRecord }
  | { type: "npc"; data: AnyRecord }
  | { type: "companion"; data: AnyRecord }
  | { type: "player"; data: AnyRecord }
  | { type: "object"; data: AnyRecord }
  | { type: "item"; data: AnyRecord }
  | { type: "quest"; data: AnyRecord }
  | null;
type MenuModal = "stats" | "items" | "training" | "quest" | "map" | null;

const allocatableStats = ["strength", "dexterity", "agility", "intellect", "wisdom", "stamina"];

function nextLevelExp(level: number) {
  return level * 100;
}

export function GameClient({
  user,
  initialCharacters,
  classes,
  characterLimit,
  initialWorldConfigured
}: {
  user: { id: string; email: string; role: string };
  initialCharacters: AnyRecord[];
  classes: AnyRecord[];
  characterLimit: number;
  initialWorldConfigured: boolean;
}) {
  const [characters, setCharacters] = useState(initialCharacters);
  const [worldConfigured, setWorldConfigured] = useState(initialWorldConfigured);
  const [setupBusy, setSetupBusy] = useState("");
  const [setupError, setSetupError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [state, setState] = useState<AnyRecord | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([{ tone: "system", text: "Welcome to Mirage Web RPG. Type help for commands." }]);
  const [command, setCommand] = useState("");
  const [newName, setNewName] = useState("");
  const [newClass, setNewClass] = useState(classes[0]?.id ?? "");
  const [createError, setCreateError] = useState("");
  const [selection, setSelection] = useState<Selection>(null);
  const [menuModal, setMenuModal] = useState<MenuModal>(null);

  const character = useMemo(() => state?.character ?? characters.find((entry) => entry.id === selectedId), [characters, selectedId, state]);
  const room = state?.room;
  const topRightMode = state?.settings?.topRightMode ?? "clock";

  async function refresh() {
    if (!selectedId) return;
    const response = await fetch("/api/game/state", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ characterId: selectedId })
    });
    const result = await response.json();
    if (result.ok) setState(result.state);
  }

  useEffect(() => {
    if (!selection) return;
    const ids = [
      ...(room?.roomMonsters ?? []).map((entry: AnyRecord) => entry.id),
      ...(room?.objects ?? []).map((entry: AnyRecord) => entry.id),
      ...(room?.npcs ?? []).map((entry: AnyRecord) => entry.id),
      ...(room?.recruitables ?? []).map((entry: AnyRecord) => entry.id),
      ...(state?.players ?? []).map((entry: AnyRecord) => entry.id),
      ...(character?.inventory ?? []).map((entry: AnyRecord) => entry.id),
      ...(character?.quests ?? []).map((entry: AnyRecord) => entry.id)
    ];
    if (!ids.includes(selection.data.id)) setSelection(null);
  }, [state, selection, room, character]);

  useEffect(() => {
    if (!state?.character) return;
    setCharacters((current) => current.map((entry) => (entry.id === state.character.id ? state.character : entry)));
  }, [state?.character]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 1800);
    return () => window.clearInterval(timer);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const timer = window.setInterval(() => {
      void fetch("/api/game/heartbeat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ characterId: selectedId })
      })
        .then((response) => response.json())
        .then((result) => {
          if (result.logs?.length) {
            setLogs((current) => [...current, ...result.logs].slice(-100));
            void refresh();
          }
        })
        .catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [selectedId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      const map: Record<string, string> = { ArrowUp: "north", ArrowDown: "south", ArrowLeft: "west", ArrowRight: "east", w: "north", a: "west", s: "south", d: "east" };
      const next = map[event.key];
      if (next) {
        event.preventDefault();
        void run(next);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  async function createCharacter(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/game/character", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newName, classId: newClass })
    });
    const result = await response.json();
    if (result.ok) {
      setCharacters((current) => [...current, result.character]);
      setSelectedId(result.character.id);
      setNewName("");
      setCreateError("");
    } else {
      setCreateError(result.error ?? "Could not create character.");
    }
  }

  async function run(raw: string) {
    if (!raw.trim() || !selectedId) return;
    setLogs((current) => [...current, { tone: "command", text: `> ${raw}` }].slice(-100));
    const response = await fetch("/api/game/command", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ characterId: selectedId, command: raw })
    });
    const result = await response.json();
    setLogs((current) => [...current, ...(result.logs ?? [])].slice(-100));
    setCommand("");
    await refresh();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  function switchCharacter() {
    setSelectedId("");
    setState(null);
    setSelection(null);
    setMenuModal(null);
    setLogs([{ tone: "system", text: "Choose another character to enter the world." }]);
  }

  async function chooseWorldTemplate(mode: "demo" | "blank") {
    setSetupBusy(mode);
    setSetupError("");
    const response = await fetch("/api/game/world-template", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode })
    });
    const result = await response.json();
    if (result.ok) {
      setWorldConfigured(true);
      window.location.reload();
      return;
    }
    setSetupError(result.error ?? "Could not configure the world.");
    setSetupBusy("");
  }

  if (!worldConfigured) return (
    <WorldSetupPanel
      busy={setupBusy}
      error={setupError}
      isAdmin={user.role === "ADMIN"}
      logout={logout}
      onChoose={chooseWorldTemplate}
      user={user}
    />
  );

  if (!selectedId) return (
    <CharacterLobby
      characters={characters}
      characterLimit={characterLimit}
      classes={classes}
      createCharacter={createCharacter}
      createError={createError}
      logout={logout}
      newClass={newClass}
      newName={newName}
      setNewClass={setNewClass}
      setNewName={setNewName}
      setSelectedId={setSelectedId}
      user={user}
    />
  );

  return (
    <main className="mud-page">
      <section className="mud-client">
        <header className="mud-titlebar">
          <div className="mud-logo">Mirage Web RPG</div>
          <div className="mud-location">{room?.name ?? "Loading..."}</div>
          <div className="mud-version-label">
            {topRightMode === "version" ? (state?.settings?.gameVersion ?? "v0.1") : <CentralClock />}
          </div>
        </header>

        <aside className="mud-left">
          <MiniMap rooms={state?.mapRooms ?? []} currentRoomId={room?.id} run={run} />
          <div className="mud-tabs">
            <button onClick={() => setMenuModal("stats")}>Stats</button>
            <button onClick={() => setMenuModal("items")}>Items</button>
            <button onClick={() => setMenuModal("training")}>Training</button>
            <button onClick={() => setMenuModal("quest")}>Quest</button>
            <button onClick={() => setMenuModal("map")}>Map</button>
          </div>
          <StatsPanel character={character} onOpen={() => setMenuModal("stats")} />
          <QuestPanel quests={character?.quests ?? []} selected={selection?.type === "quest" ? selection.data : null} onSelect={(entry) => setSelection({ type: "quest", data: entry })} run={run} />
        </aside>

        <section className="mud-view">
          <RoomPanel room={room} players={state?.players ?? []} run={run} />
        </section>

        <section className="mud-bars">
          <Meter label="HP" value={character?.hp ?? 0} max={character?.maxHp ?? 1} color="red" />
          <Meter label="MP" value={character?.mp ?? 0} max={character?.maxMp ?? 1} color="blue" />
          <Meter label="XP" value={character?.exp ?? 0} max={nextLevelExp(character?.level ?? 1)} color="green" />
        </section>

        <section className="mud-log-panel">
          <GameLog logs={logs} messages={state?.messages ?? []} />
          <CommandInput value={command} setValue={setCommand} run={run} />
        </section>

        <aside className="mud-right">
          <HerePanel notifications={state?.notifications ?? []} players={state?.players ?? []} room={room} selection={selection} setSelection={setSelection} run={run} />
          <ActionPanel activeDungeon={state?.activeDungeon} room={room} character={character} dungeonEntrances={state?.dungeonEntrances ?? []} party={state?.party} selection={selection} run={run} switchCharacter={switchCharacter} logout={logout} />
          <PlayerList character={character} maxPartySize={Number.parseInt(state?.settings?.maxPartySize ?? "4", 10) || 4} party={state?.party} run={run} />
        </aside>
        {menuModal ? (
          <GameMenuModal
            character={character}
            currentRoomId={room?.id}
            menu={menuModal}
            quests={character?.quests ?? []}
            rooms={menuModal === "map" ? state?.worldMapRooms ?? [] : state?.mapRooms ?? []}
            run={run}
            selected={selection}
            setMenu={setMenuModal}
            setSelection={setSelection}
          />
        ) : null}
      </section>
    </main>
  );
}

function WorldSetupPanel({
  busy,
  error,
  isAdmin,
  logout,
  onChoose,
  user
}: {
  busy: string;
  error: string;
  isAdmin: boolean;
  logout: () => void;
  onChoose: (mode: "demo" | "blank") => void;
  user: { email: string };
}) {
  return (
    <main className="page">
      <section className="shell character-lobby">
        <header className="topbar">
          <div>
            <h1 className="brand">World Setup</h1>
            <span className="muted">{user.email} | SQwebRPG Engine</span>
          </div>
          <button onClick={logout}>Logout</button>
        </header>
        <section className="panel setup-panel">
          <h2>Choose Starting Content</h2>
          {isAdmin ? (
            <>
              <p>Use the ready-made Mirage Web RPG demo, or start with a blank world template for engine development.</p>
              <div className="setup-actions">
                <button className="primary" disabled={!!busy} onClick={() => onChoose("demo")}>{busy === "demo" ? "Building..." : "Use Demo Game"}</button>
                <button disabled={!!busy} onClick={() => onChoose("blank")}>{busy === "blank" ? "Creating..." : "Start Blank Template"}</button>
              </div>
              {error ? <span className="tone-danger">{error}</span> : null}
            </>
          ) : (
            <p className="muted">An administrator needs to choose the world template before players enter.</p>
          )}
        </section>
      </section>
    </main>
  );
}

function CharacterLobby({
  characters,
  characterLimit,
  classes,
  createCharacter,
  createError,
  logout,
  newClass,
  newName,
  setNewClass,
  setNewName,
  setSelectedId,
  user
}: {
  characters: AnyRecord[];
  characterLimit: number;
  classes: AnyRecord[];
  createCharacter: (event: React.FormEvent) => void;
  createError: string;
  logout: () => void;
  newClass: string;
  newName: string;
  setNewClass: (value: string) => void;
  setNewName: (value: string) => void;
  setSelectedId: (value: string) => void;
  user: { email: string };
}) {
  const canCreate = characters.length < characterLimit;
  return (
    <main className="page">
      <section className="shell character-lobby">
        <header className="topbar">
          <div>
            <h1 className="brand">Choose Character</h1>
            <span className="muted">{user.email} | {characters.length}/{characterLimit} slots used</span>
          </div>
          <button onClick={logout}>Logout</button>
        </header>
        <div className="lobby-grid">
          <section className="panel">
            <h2>Characters</h2>
            <div className="character-slots">
              {characters.map((entry) => (
                <article className="character-card" key={entry.id}>
                  <b>{entry.name}</b>
                  <span>{entry.class?.name} | Level {entry.level}</span>
                  <span>{entry.room?.name ?? "Unknown Area"}{entry.room?.zone?.name ? ` | ${entry.room.zone.name}` : ""}</span>
                  <span>Last seen: {formatStableDate(entry.lastSeenAt)}</span>
                  <button className="primary" onClick={() => setSelectedId(entry.id)}>Enter World</button>
                </article>
              ))}
              {!characters.length ? <p className="muted">No characters yet. Create one to enter the world.</p> : null}
            </div>
          </section>
          <section className="panel">
            <h2>Create Character</h2>
            {canCreate ? (
              <form className="form" onSubmit={createCharacter}>
                <label className="field">Name<input value={newName} onChange={(event) => setNewName(event.target.value)} /></label>
                <label className="field">Class<select value={newClass} onChange={(event) => setNewClass(event.target.value)}>{classes.map((klass) => <option key={klass.id} value={klass.id}>{klass.name}</option>)}</select></label>
                <button className="primary">Create and Enter</button>
                {createError ? <span className="tone-danger">{createError}</span> : null}
              </form>
            ) : (
              <p className="muted">Character limit reached for this world.</p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function formatStableDate(value?: string | Date | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toISOString().slice(0, 10);
}

function MiniMap({ rooms, currentRoomId, run, cellSize = 13 }: { rooms: AnyRecord[]; currentRoomId?: string; run: (command: string) => void; cellSize?: number }) {
  if (!rooms.length) return <div className="mud-map">Loading map...</div>;
  const minX = Math.min(...rooms.map((room) => room.x));
  const minY = Math.min(...rooms.map((room) => room.y));
  const maxX = Math.max(...rooms.map((room) => room.x));
  const maxY = Math.max(...rooms.map((room) => room.y));
  const width = (maxX - minX + 1) * 2 - 1;
  const height = (maxY - minY + 1) * 2 - 1;
  const roomByCoord = new Map<string, AnyRecord>();
  const links = new Set<string>();

  for (const room of rooms) {
    const gx = (room.x - minX) * 2;
    const gy = (room.y - minY) * 2;
    roomByCoord.set(`${gx},${gy}`, room);
    for (const exit of room.exitsFrom ?? []) {
      const target = rooms.find((candidate) => candidate.id === exit.toRoomId);
      if (!target) continue;
      const tx = (target.x - minX) * 2;
      const ty = (target.y - minY) * 2;
      links.add(`${(gx + tx) / 2},${(gy + ty) / 2}`);
    }
  }

  const cells = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const room = roomByCoord.get(`${x},${y}`);
      const link = links.has(`${x},${y}`);
      cells.push(
        <button
          className={["map-cell", room ? "room" : "", room?.mapTileType ? `tile-${room.mapTileType}` : "", link ? "link" : "", room?.id === currentRoomId ? "current" : ""].join(" ")}
          disabled={!room && !link}
          key={`${x}-${y}`}
          style={{ width: cellSize, height: cellSize }}
          title={room?.name}
          onClick={() => {
            if (!room || room.id === currentRoomId) return;
            const current = rooms.find((candidate) => candidate.id === currentRoomId);
            const exit = current?.exitsFrom?.find((candidate: AnyRecord) => candidate.toRoomId === room.id);
            if (exit) void run(exit.direction);
          }}
        >
          {room?.mapIcon ? <span>{room.mapIcon}</span> : null}
        </button>
      );
    }
  }

  return (
    <div className="mud-map-wrap">
      <div className="mud-compass">✦</div>
      <div className="mud-map" style={{ gridTemplateColumns: `repeat(${width}, ${cellSize}px)`, gridTemplateRows: `repeat(${height}, ${cellSize}px)` }}>{cells}</div>
    </div>
  );
}

function RoomPanel({ room, players, run }: { room: AnyRecord; players: AnyRecord[]; run: (command: string) => void }) {
  if (!room) return <div className="viewport-text">Loading room...</div>;
  return (
    <div className="viewport-scene" style={room.imageUrl ? { backgroundImage: `url(${room.imageUrl})` } : undefined}>
      {room.imageUrl ? <div className="room-image-shade" /> : <div className="stone-hall" />}
      <div className="viewport-text">
        <h1>{room.name}</h1>
        <p>{room.description}</p>
        <div className="compact-line">Zone: {room.zone?.name} | Players: {players.length + 1} | Enemies: {room.roomMonsters?.length ?? 0}</div>
        <div className="exit-row">
          {room.exitsFrom?.map((exit: AnyRecord) => <button key={exit.id} onClick={() => run(exit.direction)}>{exit.direction}</button>)}
        </div>
      </div>
    </div>
  );
}

function CentralClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    function update() {
      setTime(`${formatter.format(new Date())} CT`);
    }
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <span suppressHydrationWarning>{time || "Central Time"}</span>;
}

function StatsPanel({ character, onOpen }: { character: AnyRecord; onOpen: () => void }) {
  if (!character) return <section className="mud-box">Loading...</section>;
  return (
    <button className="mud-box mud-stats stats-button" onClick={onOpen}>
      <div className="stat-name">{character.name}</div>
      <div>{character.class?.name} Lv {character.level} | Gold {character.gold}</div>
      <div>ATK {character.attack} DEF {character.defense} | Points {character.statPoints}</div>
      <div className="stat-grid">
        <span>STR {character.strength}</span>
        <span>DEX {character.dexterity}</span>
        <span>AGI {character.agility}</span>
        <span>INT {character.intellect}</span>
        <span>WIS {character.wisdom}</span>
        <span>STA {character.stamina}</span>
      </div>
    </button>
  );
}

function QuestPanel({
  quests,
  selected,
  onSelect,
  run
}: {
  quests: AnyRecord[];
  selected: AnyRecord | null;
  onSelect: (quest: AnyRecord) => void;
  run: (command: string) => void;
}) {
  const activeQuests = quests.filter((entry) => entry.status !== "COMPLETE");
  const activeSelected = selected?.status !== "COMPLETE" ? selected : null;
  const quest = activeSelected?.quest;
  const objective = quest?.objectives?.[0];
  return (
    <section className="mud-box compact-list">
      <strong>Quests</strong>
      {activeQuests.slice(0, 4).map((entry) => (
        <button className={activeSelected?.id === entry.id ? "selected-row" : "list-row"} key={entry.id} onClick={() => onSelect(entry)}>
          {entry.quest?.title}
        </button>
      ))}
      {!activeQuests.length ? <span className="muted">None active</span> : null}
      {quest ? (
        <div className="detail-card">
          <b>{quest.title}</b>
          <span>Status: {activeSelected.status}</span>
          <span>{quest.description}</span>
          {objective ? <span>Objective: {objective.description} ({activeSelected.progress}/{objective.targetCount})</span> : null}
          <span>Reward: {quest.rewardExp} XP, {quest.rewardGold} gold{quest.rewardItemId ? `, ${quest.rewardItemId}` : ""}</span>
          {activeSelected.status === "ACTIVE" ? <button onClick={() => run(`complete quest ${quest.title}`)}>Complete</button> : null}
        </div>
      ) : <span className="muted">Accept quests from NPCs and boards in Here.</span>}
    </section>
  );
}

function Meter({ label, value, max, color }: { label: string; value: number; max: number; color: "red" | "blue" | "green" }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className="meter">
      <span>{label}:</span>
      <div className="meter-track"><div className={`meter-fill ${color}`} style={{ width: `${pct}%` }} /></div>
      <b>{value}/{max}</b>
    </div>
  );
}

function PlayerList({ character, maxPartySize, party, run }: { character: AnyRecord; maxPartySize: number; party: AnyRecord | null; run: (command: string) => void }) {
  const isLeader = party?.leaderId === character?.id;
  const leaderLevel = party?.members?.find((entry: AnyRecord) => entry.characterId === party?.leaderId)?.character?.level ?? character?.level ?? 1;
  const playerMembers = party?.members
    ?.filter((entry: AnyRecord) => entry.status === "ACTIVE")
    .map((entry: AnyRecord) => ({
      id: entry.character.id,
      name: entry.character.name,
      level: entry.character.level,
      hp: entry.character.hp,
      maxHp: entry.character.maxHp,
      kind: entry.character.id === party?.leaderId ? "Leader" : "Player",
      player: true,
      self: entry.character.id === character?.id
    })) ?? [{ id: character?.id ?? "me", name: character?.name ?? "You", level: character?.level ?? 1, hp: character?.hp ?? 0, maxHp: character?.maxHp ?? 1, kind: "Solo" }];
  const npcMembers = party?.npcs?.map((entry: AnyRecord) => ({
    id: entry.id,
    name: entry.recruitableNpc.name,
    level: Math.max(entry.recruitableNpc.level, leaderLevel),
    hp: entry.currentHp ?? entry.recruitableNpc.hp,
    maxHp: entry.recruitableNpc.hp,
    kind: entry.recruitableNpc.role,
    player: false,
    self: false
  })) ?? [];
  const roster = [...playerMembers, ...npcMembers];
  return (
    <section className="mud-roster">
      <div className="roster-heading">Party {roster.length}/{maxPartySize}</div>
      {roster.slice(0, 8).map((player, index) => (
        <div className={`roster-row ${isLeader && !player.self ? "managed" : ""}`} key={player.id}>
          <span className="portrait">P{index + 1}</span>
          <span>{player.name}<small>{player.kind} | HP {player.hp}/{player.maxHp}</small><i className="party-hp"><i style={{ width: `${Math.max(0, Math.min(100, (player.hp / Math.max(1, player.maxHp)) * 100))}%` }} /></i></span>
          <b>Lv {player.level}</b>
          {isLeader && !player.self ? (
            <span className="party-tools">
              {player.player ? <button onClick={() => run(`promote ${player.name}`)}>Lead</button> : null}
              <button onClick={() => run(`kick ${player.name}`)}>Remove</button>
            </span>
          ) : null}
        </div>
      ))}
    </section>
  );
}

function HerePanel({
  notifications,
  players,
  room,
  selection,
  setSelection,
  run
}: {
  notifications: AnyRecord[];
  players: AnyRecord[];
  room: AnyRecord;
  selection: Selection;
  setSelection: (selection: Selection) => void;
  run: (command: string) => void;
}) {
  return (
    <section className="mud-here selectable-list">
      <strong>Here</strong>
      {notifications.map((notice) => (
        <div className="detail-card" key={notice.id}>
          <b>Notice</b>
          <span>{notice.text}</span>
          <button onClick={() => run(notice.acceptCommand)}>Accept</button>
          <button onClick={() => run(notice.declineCommand)}>Decline</button>
        </div>
      ))}
      {players.map((player: AnyRecord) => (
        <button className={selection?.data.id === player.id ? "selected-row" : "list-row"} key={player.id} onClick={() => setSelection({ type: "player", data: player })}>
          PC {player.name} Lv {player.level}
        </button>
      ))}
      {room?.roomMonsters?.map((entry: AnyRecord) => (
        <button className={selection?.data.id === entry.id ? "selected-row" : "list-row"} key={entry.id} onClick={() => setSelection({ type: "monster", data: entry })}>
          ATK {entry.monster.name} {entry.currentHp}/{entry.monster.maxHp}
        </button>
      ))}
      {room?.objects?.map((object: AnyRecord) => (
        <button className={selection?.data.id === object.id ? "selected-row" : "list-row"} key={object.id} onClick={() => setSelection({ type: "object", data: object })}>
          OBJ {object.name}{object.takeable ? " *" : ""}
        </button>
      ))}
      {room?.npcs?.map((npc: AnyRecord) => (
        <button className={selection?.data.id === npc.id ? "selected-row" : "list-row"} key={npc.id} onClick={() => setSelection({ type: "npc", data: npc })}>
          {isInspectableObject(npc) ? "OBJ" : "NPC"} {npc.name}
        </button>
      ))}
      {room?.recruitables?.map((npc: AnyRecord) => (
        <button className={selection?.data.id === npc.id ? "selected-row" : "list-row"} key={npc.id} onClick={() => setSelection({ type: "companion", data: npc })}>
          + {npc.name} ({npc.cost}g)
        </button>
      ))}
      {!players.length && !room?.roomMonsters?.length && !room?.objects?.length && !room?.npcs?.length && !room?.recruitables?.length ? <span className="muted">No one nearby.</span> : null}
      <SelectionDetails selection={selection} run={run} />
    </section>
  );
}

function ActionPanel({
  activeDungeon,
  room,
  character,
  dungeonEntrances,
  party,
  selection,
  run,
  switchCharacter,
  logout
}: {
  activeDungeon?: AnyRecord | null;
  room: AnyRecord;
  character: AnyRecord;
  dungeonEntrances: AnyRecord[];
  party: AnyRecord | null;
  selection: Selection;
  run: (command: string) => void;
  switchCharacter: () => void;
  logout: () => void;
}) {
  const [tab, setTab] = useState("Core");
  const selectedMonster = selection?.type === "monster" ? selection.data : room?.roomMonsters?.[0];
  const monster = selectedMonster?.monster;
  const usableItems = character?.inventory?.filter((entry: AnyRecord) => entry.item?.usable) ?? [];
  const physicalSkills = character?.spells?.filter((entry: AnyRecord) => entry.spell.type?.toLowerCase() !== "heal" && ["physical", "holy"].includes(entry.spell.element)) ?? [];
  const magic = character?.spells?.filter((entry: AnyRecord) => !["physical"].includes(entry.spell.element)) ?? [];
  const friendlyTargets = [
    { id: character?.id ?? "self", name: character?.name ?? "Self", label: "Self" },
    ...(party?.members ?? [])
      .filter((entry: AnyRecord) => entry.status === "ACTIVE" && entry.characterId !== character?.id)
      .map((entry: AnyRecord) => ({ id: entry.characterId, name: entry.character.name, label: entry.character.name })),
    ...(party?.npcs ?? []).map((entry: AnyRecord) => ({ id: entry.id, name: entry.recruitableNpc.name, label: entry.recruitableNpc.name }))
  ];

  return (
    <section className="mud-actions">
      <div className="category-tabs">
        {["Core", "Combat", "Magic", "Skills", "Items", "Misc"].map((name) => (
          <button className={tab === name ? "active" : ""} key={name} onClick={() => setTab(name)}>{name}</button>
        ))}
      </div>
      <div className="action-grid">
        {tab === "Core" ? (
          <>
            <button onClick={() => run("look")}>Look</button>
            <button onClick={() => run("search")}>Search</button>
            <button onClick={() => run("rest")}>Rest</button>
            {selection ? <button onClick={() => run(`inspect ${selectionLabel(selection)}`)}>Inspect</button> : null}
            {selection?.type === "npc" && !isInspectableObject(selection.data) ? <button onClick={() => run(`talk ${selection.data.name}`)}>Talk</button> : null}
            {selection?.type === "player" ? <button onClick={() => run(`invite ${selection.data.name}`)}>Invite</button> : null}
            {selection?.type === "monster" ? <button onClick={() => run(`talk ${selection.data.monster.name}`)}>Talk</button> : null}
            {selection?.type === "object" && selection.data.takeable ? <button onClick={() => run(`take ${selection.data.name}`)}>Take</button> : null}
            {selection?.type === "npc" && selection.data.shop ? <button onClick={() => run(`shop ${selection.data.name}`)}>Shop</button> : null}
            {selection?.type === "companion" ? <button onClick={() => run(`recruit ${selection.data.name}`)}>Recruit</button> : null}
            {dungeonEntrances[0] ? <button onClick={() => run(`enter dungeon ${dungeonEntrances[0].name}`)}>Enter Dungeon</button> : null}
            {activeDungeon ? <button onClick={() => run("leave dungeon")}>Leave Dungeon</button> : null}
            {activeDungeon ? <button onClick={() => run("complete dungeon")}>Complete Dungeon</button> : null}
          </>
        ) : null}

        {tab === "Combat" ? (
          <>
            {monster ? <button onClick={() => run(`attack ${monster.name}`)}>Attack {monster.name}</button> : <span className="muted">Select an enemy</span>}
            <button onClick={() => run("rest")}>Defend</button>
          </>
        ) : null}

        {tab === "Magic" ? magic.slice(0, 6).flatMap((entry: AnyRecord) => {
          const isSupport = ["heal", "buff"].includes(entry.spell.type?.toLowerCase()) || entry.spell.category?.toLowerCase() === "support";
          if (!isSupport) {
            return [<button key={entry.id} onClick={() => run(`cast ${entry.spell.name} at ${monster?.name ?? "monster"}`)}>{entry.spell.name}</button>];
          }
          return friendlyTargets.slice(0, 4).map((target) => (
            <button key={`${entry.id}-${target.id}`} onClick={() => run(`cast ${entry.spell.name} on ${target.name}`)}>{entry.spell.name} {target.label}</button>
          ));
        }) : null}

        {tab === "Skills" ? (
          <>
            {physicalSkills.slice(0, 4).map((entry: AnyRecord) => {
              const isSupport = ["heal", "buff"].includes(entry.spell.type?.toLowerCase()) || entry.spell.category?.toLowerCase() === "support";
              return <button key={entry.id} onClick={() => run(isSupport ? `cast ${entry.spell.name} on self` : `cast ${entry.spell.name} at ${monster?.name ?? "monster"}`)}>{entry.spell.name}</button>;
            })}
            {!physicalSkills.length ? <span className="muted">No skills learned</span> : null}
          </>
        ) : null}

        {tab === "Items" ? (
          <>
            {usableItems.slice(0, 6).map((entry: AnyRecord) => (
              <button key={entry.id} onClick={() => run(`use ${entry.item.name}`)}>{entry.item.name}</button>
            ))}
            {selection?.type === "npc" && selection.data.shop ? (
              <>
                <button onClick={() => run(`shop ${selection.data.name}`)}>Open Shop</button>
                {character?.inventory?.slice(0, 4).map((entry: AnyRecord) => (
                  <button key={`sell-${entry.id}`} onClick={() => run(`sell ${entry.item.name}`)}>Sell {entry.item.name}</button>
                ))}
              </>
            ) : null}
          </>
        ) : null}

        {tab === "Misc" ? (
          <>
            <button onClick={() => run("help")}>Help</button>
            <button onClick={switchCharacter}>Switch</button>
            <button onClick={logout}>Logout</button>
          </>
        ) : null}
      </div>
    </section>
  );
}

function InventoryPanel({ items, selected, onSelect }: { items: AnyRecord[]; selected: AnyRecord | null; onSelect: (item: AnyRecord) => void }) {
  return (
    <section className="mud-inventory selectable-list">
      <strong>Inventory</strong>
      {items.slice(0, 8).map((entry) => (
        <button className={selected?.id === entry.id ? "selected-row" : "list-row"} key={entry.id} onClick={() => onSelect(entry)}>
          {entry.item?.name} x{entry.quantity}
        </button>
      ))}
      {!items.length ? <span className="muted">Empty</span> : null}
      {selected ? (
        <div className="detail-card">
          <b>{selected.item?.name}</b>
          <span>{selected.item?.description}</span>
          <span>{selected.item?.type} | {selected.item?.rarity}</span>
          <span>Value {selected.item?.value}</span>
        </div>
      ) : null}
    </section>
  );
}

function selectionLabel(selection: Exclude<Selection, null>) {
  if (selection.type === "monster") return selection.data.monster.name;
  if (selection.type === "object") return selection.data.name;
  if (selection.type === "player") return selection.data.name;
  if (selection.type === "item") return selection.data.item?.name ?? selection.data.itemId;
  if (selection.type === "quest") return selection.data.quest?.title ?? selection.data.questId;
  return selection.data.name;
}

function isInspectableObject(entry: AnyRecord) {
  const text = `${entry?.name ?? ""} ${entry?.role ?? ""}`.toLowerCase();
  return text.includes("board") || text.includes("sign") || text.includes("notice") || text.includes("shrine");
}

function SelectionDetails({ selection, run }: { selection: Selection; run: (command: string) => void }) {
  if (!selection) return <span className="muted">Select something here.</span>;
  if (selection.type === "monster") {
    return (
      <div className="detail-card">
        <b>{selection.data.monster.name}</b>
        <span>{selection.data.monster.description}</span>
        <span>Level {selection.data.monster.level} | HP {selection.data.currentHp}/{selection.data.monster.maxHp}</span>
        <button onClick={() => run(`inspect ${selection.data.monster.name}`)}>Inspect</button>
        <button onClick={() => run(`talk ${selection.data.monster.name}`)}>Talk</button>
        <button onClick={() => run(`attack ${selection.data.monster.name}`)}>Attack</button>
      </div>
    );
  }
  if (selection.type === "player") {
    return (
      <div className="detail-card">
        <b>{selection.data.name}</b>
        <span>Player character | Level {selection.data.level}</span>
        <button onClick={() => run(`invite ${selection.data.name}`)}>Invite</button>
      </div>
    );
  }
  if (selection.type === "object") {
    return (
      <div className="detail-card">
        <b>{selection.data.name}</b>
        <span>{selection.data.description}</span>
        <button onClick={() => run(`inspect ${selection.data.name}`)}>Inspect</button>
        {selection.data.takeable ? <button onClick={() => run(`take ${selection.data.name}`)}>Take</button> : null}
      </div>
    );
  }
  if (selection.type === "npc") {
    const inspectable = isInspectableObject(selection.data);
    return (
      <div className="detail-card">
        <b>{selection.data.name}</b>
        <span>{selection.data.role}</span>
        <span>{selection.data.dialogue}</span>
        {selection.data.questSource?.map((quest: AnyRecord) => (
          <button key={quest.id} onClick={() => run(`accept quest ${quest.title}`)}>Accept: {quest.title}</button>
        ))}
        {selection.data.shop ? (
          <>
            <button onClick={() => run(`shop ${selection.data.name}`)}>Shop: {selection.data.shop.name}</button>
            {selection.data.shop.items?.slice(0, 4).map((entry: AnyRecord) => (
              <button key={entry.id} onClick={() => run(`buy ${entry.item.name}`)}>Buy {entry.item.name} ({entry.price}g)</button>
            ))}
          </>
        ) : null}
        <button onClick={() => run(`inspect ${selection.data.name}`)}>Inspect</button>
        {!inspectable ? <button onClick={() => run(`talk ${selection.data.name}`)}>Talk</button> : null}
      </div>
    );
  }
  if (selection.type === "companion") {
    return (
      <div className="detail-card">
        <b>{selection.data.name}</b>
        <span>{selection.data.role} Lv {selection.data.level}</span>
        <span>{selection.data.dialogue}</span>
        <span>Cost {selection.data.cost} gold | Skill {selection.data.skill}</span>
        <button onClick={() => run(`inspect ${selection.data.name}`)}>Inspect</button>
        <button onClick={() => run(`recruit ${selection.data.name}`)}>Recruit</button>
      </div>
    );
  }
  if (selection.type === "item") {
    return (
      <div className="detail-card">
        <b>{selection.data.item?.name}</b>
        <span>{selection.data.item?.description}</span>
        <button onClick={() => run(`inspect ${selection.data.item.name}`)}>Inspect</button>
        {selection.data.item?.usable ? <button onClick={() => run(`use ${selection.data.item.name}`)}>Use</button> : null}
      </div>
    );
  }
  if (selection.type === "quest") {
    const quest = selection.data.quest;
    const objective = quest?.objectives?.[0];
    return (
      <div className="detail-card">
        <b>{quest?.title}</b>
        <span>{quest?.description}</span>
        {objective ? <span>{objective.description} ({selection.data.progress}/{objective.targetCount})</span> : null}
      </div>
    );
  }
}

function GameMenuModal({
  character,
  currentRoomId,
  menu,
  quests,
  rooms,
  run,
  selected,
  setMenu,
  setSelection
}: {
  character: AnyRecord;
  currentRoomId?: string;
  menu: Exclude<MenuModal, null>;
  quests: AnyRecord[];
  rooms: AnyRecord[];
  run: (command: string) => void;
  selected: Selection;
  setMenu: (menu: MenuModal) => void;
  setSelection: (selection: Selection) => void;
}) {
  if (menu === "stats") return <StatsModal character={character} run={run} onClose={() => setMenu(null)} />;
  const title = { items: "Items", training: "Training", quest: "Quest Journal", map: "World Map" }[menu];
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className={`game-menu-modal ${menu === "map" ? "map-menu-modal" : ""}`}>
        <header>
          <h2>{title}</h2>
          <button onClick={() => setMenu(null)}>X</button>
        </header>
        {menu === "items" ? (
          <InventoryPanel items={character?.inventory ?? []} selected={selected?.type === "item" ? selected.data : null} onSelect={(entry) => setSelection({ type: "item", data: entry })} />
        ) : null}
        {menu === "training" ? <TrainingModalContent character={character} run={run} /> : null}
        {menu === "quest" ? <QuestBookContent quests={quests} selected={selected?.type === "quest" ? selected.data : null} onSelect={(entry) => setSelection({ type: "quest", data: entry })} run={run} /> : null}
        {menu === "map" ? (
          <div className="world-map-modal">
            <MiniMap rooms={rooms} currentRoomId={currentRoomId} run={run} cellSize={22} />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function TrainingModalContent({ character, run }: { character: AnyRecord; run: (command: string) => void }) {
  const spells = character?.spells ?? [];
  return (
    <div className="menu-list">
      <section className="detail-card">
        <b>Training</b>
        <span>Unspent stat points: {character?.statPoints ?? 0}</span>
        <div className="allocation-grid">
          {allocatableStats.map((stat) => (
            <button disabled={(character?.statPoints ?? 0) <= 0} key={stat} onClick={() => run(`train ${stat}`)}>
              + {stat} ({character?.[stat] ?? 0})
            </button>
          ))}
        </div>
      </section>
      <section className="detail-card">
        <b>Known Skills and Magic</b>
        {spells.map((entry: AnyRecord) => (
          <button key={entry.id} onClick={() => run(`cast ${entry.spell.name}`)}>
            {entry.spell.name} | {entry.spell.type} | MP {entry.spell.mpCost}
          </button>
        ))}
        {!spells.length ? <span className="muted">No skills learned.</span> : null}
      </section>
    </div>
  );
}

function QuestBookContent({
  quests,
  selected,
  onSelect,
  run
}: {
  quests: AnyRecord[];
  selected: AnyRecord | null;
  onSelect: (quest: AnyRecord) => void;
  run: (command: string) => void;
}) {
  const [tab, setTab] = useState<"active" | "completed">("active");
  const activeQuests = quests.filter((entry) => entry.status !== "COMPLETE");
  const completedQuests = quests.filter((entry) => entry.status === "COMPLETE");
  const visibleQuests = tab === "active" ? activeQuests : completedQuests;
  const selectedInTab = selected && visibleQuests.some((entry) => entry.id === selected.id) ? selected : null;
  const activeEntry = selectedInTab ?? visibleQuests[0];
  const quest = activeEntry?.quest;
  const objective = quest?.objectives?.[0];
  return (
    <div className="quest-book-grid">
      <div>
        <div className="quest-tabs">
          <button className={tab === "active" ? "active" : ""} onClick={() => setTab("active")}>Active</button>
          <button className={tab === "completed" ? "active" : ""} onClick={() => setTab("completed")}>Completed</button>
        </div>
        <div className="menu-list">
        {visibleQuests.map((entry) => (
          <button className={activeEntry?.id === entry.id ? "selected-row" : "list-row"} key={entry.id} onClick={() => onSelect(entry)}>
            {entry.quest?.title}
          </button>
        ))}
        {!visibleQuests.length ? <span className="muted">No {tab} quests.</span> : null}
        </div>
      </div>
      <div className="detail-card quest-detail">
        {quest ? (
          <>
            <b>{quest.title}</b>
            <span>{quest.category} | {quest.subType ?? quest.type} | {activeEntry.status}</span>
            <span>{quest.description}</span>
            {objective ? <span>Objective: {objective.description} ({activeEntry.progress}/{objective.targetCount})</span> : null}
            <span>Reward: {quest.rewardExp} XP, {quest.rewardGold} gold{quest.rewardItemId ? `, ${quest.rewardItemId}` : ""}</span>
            <span>{quest.completionText}</span>
            {tab === "active" && activeEntry.status === "ACTIVE" ? <button onClick={() => run(`complete quest ${quest.title}`)}>Complete Quest</button> : null}
          </>
        ) : (
          <span className="muted">Select a quest to read its details.</span>
        )}
      </div>
    </div>
  );
}

function StatsModal({ character, run, onClose }: { character: AnyRecord; run: (command: string) => void; onClose: () => void }) {
  if (!character) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="stats-modal">
        <header>
          <h2>{character.name} Stats</h2>
          <button onClick={onClose}>X</button>
        </header>
        <div className="stats-detail-grid">
          <span>Class</span><b>{character.class?.name}</b>
          <span>Level</span><b>{character.level}</b>
          <span>XP</span><b>{character.exp}/{nextLevelExp(character.level)}</b>
          <span>Gold</span><b>{character.gold}</b>
          <span>HP</span><b>{character.hp}/{character.maxHp}</b>
          <span>MP</span><b>{character.mp}/{character.maxMp}</b>
          <span>Attack</span><b>{character.attack}</b>
          <span>Defense</span><b>{character.defense}</b>
          <span>Strength</span><b>{character.strength}</b>
          <span>Dexterity</span><b>{character.dexterity}</b>
          <span>Agility</span><b>{character.agility}</b>
          <span>Intellect</span><b>{character.intellect}</b>
          <span>Wisdom</span><b>{character.wisdom}</b>
          <span>Stamina</span><b>{character.stamina}</b>
          <span>Unspent Points</span><b>{character.statPoints}</b>
        </div>
        <div className="allocation-grid">
          {allocatableStats.map((stat) => (
            <button disabled={character.statPoints <= 0} key={stat} onClick={() => run(`train ${stat}`)}>
              + {stat} ({character[stat]})
            </button>
          ))}
        </div>
        <p className="muted">Strength improves power. Dexterity improves precise attacks. Agility improves fast attacks. Intellect improves MP. Wisdom improves MP and defense. Stamina improves HP and defense.</p>
      </section>
    </div>
  );
}

function CommandInput({ value, setValue, run }: { value: string; setValue: (value: string) => void; run: (command: string) => void }) {
  return (
    <form className="mud-command" onSubmit={(event) => { event.preventDefault(); void run(value); }}>
      <input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Command..." />
      <button>Send</button>
    </form>
  );
}

function GameLog({ logs, messages }: { logs: LogLine[]; messages: AnyRecord[] }) {
  const logRef = useRef<HTMLDivElement | null>(null);
  const [tab, setTab] = useState<"main" | "room">("main");
  useEffect(() => {
    const node = logRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [logs.length, messages.length, tab]);
  const roomMessages = messages.filter((message) => message.channel === "ROOM");
  const mainMessages = messages.filter((message) => message.channel !== "ROOM");

  return (
    <section className="mud-log-wrap">
      <nav className="mud-log-tabs">
        <button className={tab === "main" ? "active" : ""} onClick={() => setTab("main")}>Main</button>
        <button className={tab === "room" ? "active" : ""} onClick={() => setTab("room")}>Room</button>
      </nav>
      <div className="mud-log" ref={logRef}>
        {tab === "main" ? (
          <>
            {mainMessages.slice(-10).map((message) => <div className="tone-chat" key={message.id}>[{message.channel}] {message.body}</div>)}
            {logs.slice(-24).map((entry, index) => <div className={`tone-${entry.tone}`} key={`${entry.text}-${index}`}>{entry.text}</div>)}
          </>
        ) : (
          <>
            {roomMessages.slice(-30).map((message) => <div className="tone-chat" key={message.id}>[{message.channel}] {message.body}</div>)}
            {!roomMessages.length ? <div className="muted">No room actions yet.</div> : null}
          </>
        )}
      </div>
    </section>
  );
}
