/**
 * Channel adapters. Every way of reaching a citizen implements the same
 * interface, so a deployment switches providers by configuration only.
 *
 * Phase 0 ships the `fake` adapter (demo + development). Real adapters
 * (android-gw, whatsapp-cloud, msg91, gupshup) arrive in Phase 2.
 */
import { isDemoPhone, type Channel } from "@hope/shared";
import { smsSegments } from "@hope/i18n";

export interface OutboundMessage {
  channel: Channel;
  phone: string;
  body: string;
  /** What produced the message: alert, reply, otp, system. */
  kind: "alert" | "reply" | "otp" | "system";
  alertId?: string;
}

export interface SendResult {
  ok: boolean;
  providerMessageId: string | null;
  segments: number;
  costPaise: number;
  error?: string;
}

export interface ChannelAdapter {
  readonly name: string;
  readonly channels: readonly Channel[];
  /** Max messages per second the provider allows. */
  readonly perSecond: number;
  send(message: OutboundMessage): Promise<SendResult>;
}

export type MessageSink = (message: OutboundMessage & { segments: number }) => Promise<string>;

/**
 * Delivers to the in-app phone simulator by writing to a sink (the
 * `outbound_messages` table). It refuses any number outside the reserved
 * demo range, so a demo can never message a real person.
 */
export class FakeAdapter implements ChannelAdapter {
  readonly name = "fake";
  readonly channels = ["sms", "whatsapp", "pwa"] as const;
  readonly perSecond = 200;

  constructor(
    private readonly sink: MessageSink,
    private readonly options: { allowNonDemoNumbers?: boolean } = {},
  ) {}

  async send(message: OutboundMessage): Promise<SendResult> {
    if (!this.options.allowNonDemoNumbers && !isDemoPhone(message.phone)) {
      return { ok: false, providerMessageId: null, segments: 0, costPaise: 0, error: "NON_DEMO_NUMBER_BLOCKED" };
    }
    const segments = message.channel === "sms" ? smsSegments(message.body).segments : 1;
    const id = await this.sink({ ...message, segments });
    return { ok: true, providerMessageId: `fake-${id}`, segments, costPaise: 0 };
  }
}

/** Indicative production prices (paise), used to show estimated cost in the console. */
export const ESTIMATED_COST_PAISE = {
  smsPerSegment: 24, // ~₹0.20 + GST
  whatsappUtility: 15, // ~₹0.13 + GST
} as const;

export function estimateCostPaise(channel: Channel, body: string): number {
  if (channel === "sms") return smsSegments(body).segments * ESTIMATED_COST_PAISE.smsPerSegment;
  if (channel === "whatsapp") return ESTIMATED_COST_PAISE.whatsappUtility;
  return 0;
}
