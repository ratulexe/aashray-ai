import { decide, type ConvContext, type ConvState, type Effect } from "@hope/conversation";
import type { MessageKey, Vars } from "@hope/i18n";
import { formatBookingCode, householdSize, pickLang, type Channel, type Lang, type LocalizedText } from "@hope/shared";
import { audit, formatTime, type App } from "../context";
import { book, bookingReply, cancelBooking } from "./bookings";
import { sendMessage, type Recipient } from "./messaging";
import { createRescue, rescueStatusText } from "./rescue";

const CONVERSATION_TTL_MS = 30 * 60_000;

interface CitizenRow {
  id: string;
  lang: Lang;
  channel: Channel;
  opted_out_at: Date | null;
  adults: number | null;
  children: number | null;
  elderly: number | null;
}

/**
 * Handles one incoming SMS / WhatsApp message: runs the conversation engine,
 * executes its effects and sends the replies on the same channel.
 */
export async function handleInbound(app: App, channel: "sms" | "whatsapp", phone: string, body: string, providerId?: string) {
  const now = app.clock.now();
  const [citizen] = await app.db.query<CitizenRow>(
    `SELECT c.id, c.lang, c.channel, c.opted_out_at, h.adults, h.children, h.elderly
       FROM citizens c LEFT JOIN households h ON h.citizen_id = c.id WHERE c.phone = $1`,
    [phone],
  );
  const [conv] = await app.db.query<{ state: ConvState; context: ConvContext; expires_at: Date }>(
    `SELECT state, context, expires_at FROM conversations WHERE phone = $1 AND channel = $2`,
    [phone, channel],
  );
  const live = conv && conv.expires_at.getTime() > now.getTime();
  const state: ConvState = live ? conv.state : "IDLE";
  const context: ConvContext = live ? conv.context : {};

  const [incident] = await app.db.query<{ id: string }>(`SELECT id FROM incidents WHERE status = 'active' LIMIT 1`);
  const decision = decide(state, context, {
    registered: Boolean(citizen),
    optedOut: Boolean(citizen?.opted_out_at),
    lang: citizen?.lang ?? "bn",
    householdSize: citizen?.adults != null ? householdSize({ adults: citizen.adults, children: citizen.children ?? 0, elderly: citizen.elderly ?? 0 }) : null,
    hasActiveIncident: Boolean(incident),
  }, body);

  await app.db.query(
    `INSERT INTO inbound_messages (channel, provider_id, phone, body, intent, received_at) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (channel, provider_id) DO NOTHING`,
    [channel, providerId ?? null, phone, body, decision.intent, now],
  );
  await app.db.query(
    `INSERT INTO conversations (phone, channel, state, context, expires_at) VALUES ($1, $2, $3, $4::jsonb, $5)
     ON CONFLICT (phone, channel) DO UPDATE SET state = EXCLUDED.state, context = EXCLUDED.context, expires_at = EXCLUDED.expires_at`,
    [phone, channel, decision.state, JSON.stringify(decision.context), new Date(now.getTime() + CONVERSATION_TTL_MS)],
  );

  // Replies go back on the channel the citizen wrote from.
  const to: Recipient = { phone, lang: citizen?.lang ?? "bn", channel };
  const replies: { key: MessageKey; vars?: Vars }[] = [...decision.replies];

  for (const effect of decision.effects) {
    const out = citizen ? await runEffect(app, citizen, channel, effect, to) : null;
    if (out) replies.push(out);
  }
  // A language change applies to this reply too.
  for (const reply of replies) await sendMessage(app, to, reply.key, reply.vars);

  return { intent: decision.intent, state: decision.state };
}

async function runEffect(app: App, citizen: CitizenRow, channel: Channel, effect: Effect, to: Recipient): Promise<{ key: MessageKey; vars?: Vars } | null> {
  const now = app.clock.now();
  switch (effect.type) {
    case "book": {
      const outcome = await book(app, { citizenId: citizen.id, people: effect.people, needsMobilityHelp: effect.needsMobilityHelp, channel });
      if (outcome.status === "booked" && effect.needsMobilityHelp) {
        await app.db.query(`UPDATE households SET needs_mobility_help = true, updated_at = $2 WHERE citizen_id = $1`, [citizen.id, now]);
      }
      return bookingReply(outcome, to.lang);
    }
    case "cancel_booking": {
      const cancelled = await cancelBooking(app, citizen.id);
      return cancelled ? { key: "cancelled", vars: { code: formatBookingCode(cancelled.code) } } : { key: "nothing_to_cancel" };
    }
    case "rescue": {
      const r = await createRescue(app, { citizenId: citizen.id, people: effect.people, landmark: effect.landmark, channel });
      return { key: "rescue_received", vars: { ref: r.ref } };
    }
    case "status": {
      const [b] = await app.db.query<{ code: string; name: LocalizedText; hold_expires_at: Date }>(
        `SELECT b.code, s.name, b.hold_expires_at FROM bookings b JOIN shelters s ON s.id = b.shelter_id
          WHERE b.citizen_id = $1 AND b.status = 'held' LIMIT 1`,
        [citizen.id],
      );
      if (b) return { key: "already_booked", vars: { shelter: pickLang(b.name, to.lang), code: formatBookingCode(b.code), time: formatTime(b.hold_expires_at) } };
      const rescue = await rescueStatusText(app.db, citizen.id, to.lang);
      if (rescue) return { key: "rescue_open", vars: rescue };
      return { key: "status_none" };
    }
    case "set_lang": {
      await app.db.query(`UPDATE citizens SET lang = $2 WHERE id = $1`, [citizen.id, effect.lang]);
      to.lang = effect.lang;
      return { key: "lang_changed" };
    }
    case "opt_out": {
      await app.db.query(`UPDATE citizens SET opted_out_at = $2 WHERE id = $1`, [citizen.id, now]);
      await audit(app.db, now, { type: "citizen", id: citizen.id }, "citizen.opt_out", "citizen", citizen.id);
      return { key: "opted_out" };
    }
    case "opt_in": {
      await app.db.query(`UPDATE citizens SET opted_out_at = NULL WHERE id = $1`, [citizen.id]);
      await audit(app.db, now, { type: "citizen", id: citizen.id }, "citizen.opt_in", "citizen", citizen.id);
      return { key: "opted_in" };
    }
  }
}
