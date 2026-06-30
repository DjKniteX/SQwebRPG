export type RealtimeEvent =
  | { type: "presence"; roomId: string; characterIds: string[] }
  | { type: "chat"; channel: string; roomId?: string; body: string }
  | { type: "movement"; characterId: string; fromRoomId: string; toRoomId: string }
  | { type: "combat"; roomId: string; monsterId: string; hp: number }
  | { type: "party"; partyId: string; message: string };

export const realtimeNotes = {
  currentTransport: "short-polling API routes",
  upgradePath: "Attach Socket.IO to a custom Next server or separate gateway and emit these RealtimeEvent payloads."
} as const;
