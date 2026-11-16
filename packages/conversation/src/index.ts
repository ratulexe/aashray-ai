/**
 * SMS / WhatsApp conversation engine.
 *
 * A pure function: (state, context, citizen, input) → decision.
 * It never touches the database. The API executes the returned effects
 * (book, cancel, rescue…) and renders their results, so the same rules
 * apply on every channel.
 */
import type { Lang } from "@hope/shared";
import { normalizeReply, parseCount, parseYesNo, type MessageKey, type Vars } from "@hope/i18n";

export type ConvState = "IDLE" | "BOOK_PEOPLE" | "BOOK_NEEDS" | "RESCUE_PEOPLE" | "RESCUE_LANDMARK";

export interface ConvContext {
  /** People count suggested from the registered household. */
  suggested?: number;
  people?: number;
  /** Consecutive replies we couldn't understand. */
  misses?: number;
}

export interface CitizenView {
  registered: boolean;
  optedOut: boolean;
  lang: Lang;
  householdSize: number | null;
  hasActiveIncident: boolean;
}

export type Effect =
  | { type: "book"; people: number; needsMobilityHelp: boolean }
  | { type: "cancel_booking" }
  | { type: "rescue"; people: number; landmark: string | null }
  | { type: "status" }
  | { type: "set_lang"; lang: Lang }
  | { type: "opt_out" }
  | { type: "opt_in" };

export interface Reply {
  key: MessageKey;
  vars?: Vars;
}

export interface Decision {
  state: ConvState;
  context: ConvContext;
  replies: Reply[];
  effects: Effect[];
  /** Short label for logs and the console ("book", "rescue", "menu"…). */
  intent: string;
}

const MAX_PEOPLE = 30;
const MAX_LANDMARK = 160;

const idle = (intent: string, replies: Reply[] = [], effects: Effect[] = []): Decision => ({
  state: "IDLE",
  context: {},
  replies,
  effects,
  intent,
});

export function decide(state: ConvState, context: ConvContext, citizen: CitizenView, rawInput: string): Decision {
  const input = normalizeReply(rawInput);
  const word = input.toUpperCase();

  // ── Global keywords, valid in any state ──
  if (word === "STOP") return idle("opt_out", [], [{ type: "opt_out" }]);
  if (word === "START") return idle("opt_in", [], [{ type: "opt_in" }]);

  if (!citizen.registered) return idle("not_registered", [{ key: "not_registered" }]);
  if (citizen.optedOut) return idle("ignored_opted_out");

  if (word === "BN" || word === "EN" || word === "HI") {
    return { ...stay(state, context, "set_lang"), effects: [{ type: "set_lang", lang: word.toLowerCase() as Lang }] };
  }
  if (["0", "MENU", "HELP"].includes(word)) return idle("menu", [{ key: "menu" }]);
  if (word === "STATUS") return idle("status", [], [{ type: "status" }]);
  if (word === "9" || word === "CANCEL") {
    // Inside a flow, 9 abandons the flow; otherwise it cancels the booking.
    if (state !== "IDLE") return idle("abandon_flow", [{ key: "menu" }]);
    return idle("cancel_booking", [], [{ type: "cancel_booking" }]);
  }

  switch (state) {
    case "IDLE":
      return fromIdle(input, context, citizen);

    case "BOOK_PEOPLE": {
      let people: number | null = null;
      if (context.suggested && input === "1") people = context.suggested;
      else people = parseCount(input, MAX_PEOPLE);
      if (people === null) return miss(state, context, "invalid_number");
      return { state: "BOOK_NEEDS", context: { people }, replies: [{ key: "book_needs" }], effects: [], intent: "book_people" };
    }

    case "BOOK_NEEDS": {
      const needs = parseYesNo(input);
      if (needs === null) return miss(state, context, "book_needs");
      return idle("book", [], [{ type: "book", people: context.people ?? 1, needsMobilityHelp: needs }]);
    }

    case "RESCUE_PEOPLE": {
      const people = parseCount(input, MAX_PEOPLE);
      if (people === null) return miss(state, context, "invalid_number");
      return { state: "RESCUE_LANDMARK", context: { people }, replies: [{ key: "rescue_landmark" }], effects: [], intent: "rescue_people" };
    }

    case "RESCUE_LANDMARK": {
      const landmark = input === "1" ? null : input.slice(0, MAX_LANDMARK);
      return idle("rescue", [], [{ type: "rescue", people: context.people ?? 1, landmark }]);
    }
  }
}

function fromIdle(input: string, context: ConvContext, citizen: CitizenView): Decision {
  if (input === "1") {
    if (!citizen.hasActiveIncident) return idle("no_incident", [{ key: "no_active_incident" }]);
    if (citizen.householdSize) {
      return {
        state: "BOOK_PEOPLE",
        context: { suggested: citizen.householdSize },
        replies: [{ key: "book_people_confirm", vars: { n: citizen.householdSize } }],
        effects: [],
        intent: "book_start",
      };
    }
    return { state: "BOOK_PEOPLE", context: {}, replies: [{ key: "book_people_ask" }], effects: [], intent: "book_start" };
  }
  if (input === "2") {
    return { state: "RESCUE_PEOPLE", context: {}, replies: [{ key: "rescue_people" }], effects: [], intent: "rescue_start" };
  }
  return miss("IDLE", context, "unknown");
}

function stay(state: ConvState, context: ConvContext, intent: string): Decision {
  return { state, context, replies: [], effects: [], intent };
}

/** One clarification; on the second miss in a row, show the menu and reset. */
function miss(state: ConvState, context: ConvContext, key: MessageKey): Decision {
  const misses = (context.misses ?? 0) + 1;
  if (misses >= 2) return idle("menu_after_misses", [{ key: "menu" }]);
  return { state, context: { ...context, misses }, replies: [{ key }], effects: [], intent: "clarify" };
}
