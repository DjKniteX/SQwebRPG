import { sendChat } from "@/lib/engine/chat";
import { attackMonster } from "@/lib/engine/combat";
import { completeDungeon, enterDungeon, leaveDungeon } from "@/lib/engine/dungeons";
import { useItem } from "@/lib/engine/items";
import { acceptParty, dismissNpc, inviteToParty, kickPartyMember, leaveParty, promotePartyLeader, recruitNpc } from "@/lib/engine/parties";
import { acceptQuest, completeQuest, inspectTarget, talkToNpc } from "@/lib/engine/quests";
import { moveCharacter, parseDirection } from "@/lib/engine/rooms";
import { buyItem, listShop, sellItem } from "@/lib/engine/shops";
import { log, type CommandResult } from "@/lib/engine/types";
import { allocateStat } from "@/lib/engine/progression";

export async function runCommand(characterId: string, raw: string): Promise<CommandResult> {
  const command = raw.trim();
  const lower = command.toLowerCase();
  const [verb, ...restParts] = lower.split(/\s+/);
  const rest = restParts.join(" ");
  const direction = parseDirection(lower);
  if (direction) return moveCharacter(characterId, direction);

  if (verb === "look") return { ok: true, logs: [log("system", "You take in the room again. The panels have refreshed.")] };
  if (verb === "search") return { ok: true, logs: [log("system", "You search the area. Dust, footprints, and old scratches mark the room's recent history.")] };
  if (verb === "inspect" || verb === "examine") return inspectTarget(characterId, rest);
  if (verb === "talk") return talkToNpc(characterId, rest);
  if (verb === "say") return sendChat(characterId, "ROOM", command.slice(4));
  if (verb === "global" || lower.startsWith("/global ")) return sendChat(characterId, "GLOBAL", command.replace(/^\/?global\s+/i, ""));
  if (verb === "party" || lower.startsWith("/party ")) return sendChat(characterId, "PARTY", command.replace(/^\/?party\s+/i, ""));
  if (verb === "room" || lower.startsWith("/room ")) return sendChat(characterId, "ROOM", command.replace(/^\/?room\s+/i, ""));
  if (verb === "attack") return attackMonster(characterId, rest);
  if (verb === "shop") return listShop(characterId, rest);
  if (verb === "buy") return buyItem(characterId, rest);
  if (verb === "sell") return sellItem(characterId, rest);
  if (verb === "enter" && restParts[0] === "dungeon") return enterDungeon(characterId, restParts.slice(1).join(" "));
  if (verb === "complete" && restParts[0] === "dungeon") return completeDungeon(characterId);
  if (verb === "leave" && restParts[0] === "dungeon") return leaveDungeon(characterId);
  if (verb === "cast") {
    const targetIndex = restParts.findIndex((part) => part === "on" || part === "at");
    const spell = targetIndex >= 0 ? restParts.slice(0, targetIndex).join(" ") : restParts[0] ?? "";
    const target = targetIndex >= 0 ? restParts.slice(targetIndex + 1).join(" ") : restParts.slice(1).join(" ");
    return attackMonster(characterId, target || (spell.includes("heal") ? "" : "monster"), spell);
  }
  if (verb === "use") return useItem(characterId, rest);
  if ((verb === "allocate" || verb === "train") && rest) return allocateStat(characterId, restParts[0]);
  if (verb === "accept" && restParts[0] === "quest") return acceptQuest(characterId, restParts.slice(1).join(" "));
  if (verb === "complete" && restParts[0] === "quest") return completeQuest(characterId, restParts.slice(1).join(" "));
  if (verb === "invite") return inviteToParty(characterId, rest);
  if (verb === "kick") return kickPartyMember(characterId, rest);
  if (verb === "promote") return promotePartyLeader(characterId, rest);
  if (verb === "accept" && restParts[0] === "party") return acceptParty(characterId);
  if (verb === "decline" && restParts[0] === "party") return leaveParty(characterId);
  if (verb === "leave" && restParts[0] === "party") return leaveParty(characterId);
  if (verb === "recruit") return recruitNpc(characterId, rest);
  if (verb === "dismiss") return dismissNpc(characterId, rest);
  if (verb === "rest") return { ok: true, logs: [log("success", "You rest for a moment. Use a potion for now; full rest rules are engine-configurable.")] };
  if (["stats", "inventory", "equipment", "quests"].includes(verb)) {
    return { ok: true, logs: [log("system", `${verb} are visible in the side panels.`)] };
  }
  if (verb === "help") {
    return {
      ok: true,
      logs: [
        log("system", "Commands: look, search, inspect, north/south/east/west, talk, shop, buy, sell, say, global, attack, cast, use, train strength/dexterity/agility/intellect/wisdom/stamina, accept quest, complete quest, enter dungeon, leave dungeon, complete dungeon, invite, kick, promote, accept party, recruit, dismiss, rest.")
      ]
    };
  }
  return { ok: false, logs: [log("danger", `Unknown command: ${raw}. Type help.`)] };
}
