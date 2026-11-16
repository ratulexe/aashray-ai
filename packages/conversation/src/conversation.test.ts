import { describe, expect, it } from "vitest";
import { decide, type CitizenView, type ConvContext, type ConvState, type Decision } from "./index";

const rina: CitizenView = { registered: true, optedOut: false, lang: "bn", householdSize: 4, hasActiveIncident: true };

/** Plays a sequence of replies and returns every decision. */
function play(citizen: CitizenView, inputs: string[]): Decision[] {
  let state: ConvState = "IDLE";
  let context: ConvContext = {};
  return inputs.map((input) => {
    const d = decide(state, context, citizen, input);
    state = d.state;
    context = d.context;
    return d;
  });
}

describe("booking flow", () => {
  it("books with the registered household size", () => {
    const [a, b, c] = play(rina, ["1", "1", "1"]);
    expect(a?.replies[0]).toEqual({ key: "book_people_confirm", vars: { n: 4 } });
    expect(b?.replies[0]?.key).toBe("book_needs");
    expect(c?.effects).toEqual([{ type: "book", people: 4, needsMobilityHelp: true }]);
    expect(c?.state).toBe("IDLE");
  });

  it("accepts a different number of people in Bengali digits", () => {
    const d = play(rina, ["১", "৬", "২"]).at(-1);
    expect(d?.effects).toEqual([{ type: "book", people: 6, needsMobilityHelp: false }]);
  });

  it("asks for the count when the household is unknown", () => {
    const [a] = play({ ...rina, householdSize: null }, ["1"]);
    expect(a?.replies[0]?.key).toBe("book_people_ask");
  });

  it("clarifies once, then falls back to the menu", () => {
    const [, b, c] = play(rina, ["1", "lots", "lots"]);
    expect(b?.replies[0]?.key).toBe("invalid_number");
    expect(b?.state).toBe("BOOK_PEOPLE");
    expect(c?.replies[0]?.key).toBe("menu");
    expect(c?.state).toBe("IDLE");
  });

  it("does not start a booking without an active incident", () => {
    const [a] = play({ ...rina, hasActiveIncident: false }, ["1"]);
    expect(a?.replies[0]?.key).toBe("no_active_incident");
  });
});

describe("rescue flow", () => {
  it("collects people and landmark", () => {
    const d = play(rina, ["2", "3", "Near the Kali temple"]).at(-1);
    expect(d?.effects).toEqual([{ type: "rescue", people: 3, landmark: "Near the Kali temple" }]);
  });

  it("uses the registered address when the citizen replies 1", () => {
    const d = play(rina, ["2", "3", "1"]).at(-1);
    expect(d?.effects).toEqual([{ type: "rescue", people: 3, landmark: null }]);
  });
});

describe("keywords", () => {
  it("9 abandons a flow, but cancels a booking from idle", () => {
    expect(play(rina, ["1", "9"])[1]?.intent).toBe("abandon_flow");
    expect(play(rina, ["9"])[0]?.effects).toEqual([{ type: "cancel_booking" }]);
  });

  it("changes language without losing the step", () => {
    const [, b] = play(rina, ["1", "en"]);
    expect(b?.effects).toEqual([{ type: "set_lang", lang: "en" }]);
    expect(b?.state).toBe("BOOK_PEOPLE");
  });

  it("STOP works even for unregistered numbers; other replies are explained", () => {
    const stranger = { ...rina, registered: false };
    expect(play(stranger, ["STOP"])[0]?.effects).toEqual([{ type: "opt_out" }]);
    expect(play(stranger, ["1"])[0]?.replies[0]?.key).toBe("not_registered");
  });

  it("ignores everything except START after opting out", () => {
    const out = { ...rina, optedOut: true };
    expect(play(out, ["1"])[0]?.replies).toEqual([]);
    expect(play(out, ["start"])[0]?.effects).toEqual([{ type: "opt_in" }]);
  });
});
