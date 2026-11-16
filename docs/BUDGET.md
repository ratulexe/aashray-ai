# Budget

HOPE has two budgets: what it costs **us to build** a complete, adoptable product, and what it would cost **an adopting organisation to run** it at scale.

## 1. Build budget (ours): about ₹1,000–3,000 in total

We do not run a live public alert service ourselves, so we don't pay for bulk messaging.

| Item | Choice | Cost |
|---|---|---|
| Development | Local Docker (Postgres + PostGIS) | ₹0 |
| Demo hosting | Oracle Cloud Always Free VM (runs the whole Docker stack), or Neon free Postgres + Render / Vercel free tiers | ₹0 |
| SMS in development | `fake` adapter + phone simulator | ₹0 |
| Real SMS for demos and drills | Android phone as SMS gateway, own SIM on an unlimited-SMS plan (≤ ~100 SMS/day) | ₹0 extra |
| WhatsApp | Meta Cloud API test number | ₹0 |
| Maps | MapLibre + OpenStreetMap | ₹0 |
| AI (optional) | Small model, low volume; HOPE works without it | ₹0–300 / month |
| Error monitoring | Sentry free tier | ₹0 |
| Domain (optional) | `.in` / `.org` | ~₹800–1,200 / year |
| **Total** | | **≈ ₹1,000–3,000** |

Not needed until someone adopts HOPE: DLT registration, bulk SMS, missed-call number, paid hosting, a legal entity.

## 2. Running cost for an adopter (for the pitch)

### Unit prices

Indicative, November 2026, from third-party sources — confirm with providers.

| Item | Price |
|---|---|
| Transactional SMS | ₹0.16–0.25 per 160-character segment + 18% GST |
| Bengali / Hindi SMS | Unicode, **70 characters per segment** → an alert is 2 segments ≈ **₹0.40–0.60 per person** |
| WhatsApp utility template (India) | ≈ ₹0.115–0.145 per delivered message + GST, any length |
| DLT registration | ≈ ₹5,900 per year |
| Hosting (VM + managed Postgres in India) | ≈ ₹3,000–5,000 / month for a block; ₹10,000–20,000 / month for a district |

### Scenarios

| Scale | Assumptions | Estimated cost |
|---|---|---|
| **One block** | 10,000 registered households; 3 events / year; 4 broadcasts per event; 20% book or ask for rescue | **≈ ₹1.5–2.5 lakh / year** (hosting ~₹50k, messaging ~₹75k–1L, DLT, monitoring) |
| **One district** | 2 lakh registered households | **≈ ₹2–6 lakh per event** (WhatsApp-heavy vs SMS-only) + ₹1.2–2.4 lakh / year hosting |
| **State government** | Mass alerts already go out via cell broadcast / SACHET | HOPE adds registration, booking, rescue and shelter operations; messaging cost limited to people who reply — far below the district figure |

### Ways an adopter keeps cost down

- Use WhatsApp for those who have it, SMS for everyone else.
- Keep alerts within 2 SMS segments (enforced by HOPE's template tests).
- Let government cell broadcast do mass alerting; use HOPE for the follow-up.
- Use an existing NGO or government DLT registration and SMS contract.

## Sources

- [MSG91 pricing (Pulse Signal)](https://getpulsesignal.com/pricing/msg91)
- [SMS OTP pricing in India (Message Central)](https://www.messagecentral.com/blog/sms-otp-pricing-india)
- [SMS API pricing India 2026](https://richautomate.in/blog/sms-api-pricing-india-2026)
- [WhatsApp pricing update, October 2026 (AiSensy)](https://m.aisensy.com/blog/whatsapp-pricing-update-october-2026/)
- [WhatsApp Business API pricing (TeleCRM)](https://telecrm.in/blog/whatsapp-business-api-pricing/)
- [DLT registration charges (SMSGatewayHub)](https://crm.smsgatewayhub.com/knowledge-base/article/dlt-registration-charges-cost-breakdown-in-india)
