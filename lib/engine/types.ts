export type Direction = "north" | "south" | "east" | "west";

export type EngineLog = {
  tone: "system" | "chat" | "combat" | "loot" | "quest" | "danger" | "success";
  text: string;
};

export type CommandResult = {
  ok: boolean;
  logs: EngineLog[];
};

export function log(tone: EngineLog["tone"], text: string): EngineLog {
  return { tone, text };
}
