import { render, type MessageKey, type Vars } from "@hope/i18n";
import type { Channel, Lang } from "@hope/shared";
import type { App } from "../context";

export interface Recipient {
  phone: string;
  lang: Lang;
  channel: Channel;
}

/** Renders a catalogue message in the citizen's language and sends it on their channel. */
export async function sendMessage(app: App, to: Recipient, key: MessageKey, vars: Vars = {}, kind: "reply" | "otp" | "system" = "reply") {
  const body = render(key, to.lang, vars, app.prefix);
  return app.adapter.send({ channel: to.channel, phone: to.phone, body, kind });
}

export async function recipientForCitizen(app: App, citizenId: string): Promise<Recipient | null> {
  const [row] = await app.db.query<Recipient & { opted_out_at: Date | null }>(
    `SELECT phone, lang, channel, opted_out_at FROM citizens WHERE id = $1`,
    [citizenId],
  );
  if (!row || row.opted_out_at) return null;
  return { phone: row.phone, lang: row.lang, channel: row.channel };
}

export async function notifyCitizen(app: App, citizenId: string, key: MessageKey, vars: Vars = {}) {
  const to = await recipientForCitizen(app, citizenId);
  if (to) await sendMessage(app, to, key, vars, "system");
}
