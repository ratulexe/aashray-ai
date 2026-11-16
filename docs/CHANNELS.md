# Channels and conversation design

HOPE must work for someone holding a basic phone, in the dark, with one bar of signal. So **SMS is the baseline**: every citizen action can be done by replying with a number. WhatsApp, the PWA and (later) voice add convenience on top of the same flows.

## Channel matrix

| Action | SMS | WhatsApp | Missed call | PWA | Volunteer (console) |
|---|:-:|:-:|:-:|:-:|:-:|
| Register | ✅ | ✅ | ✅ starts it | ✅ | ✅ |
| Receive alert | ✅ | ✅ | — | ✅ push | — |
| Book shelter | ✅ | ✅ buttons | — | ✅ | ✅ on behalf |
| Cancel booking | ✅ | ✅ | — | ✅ | ✅ |
| Ask for rescue | ✅ | ✅ + location pin | — | ✅ + GPS | ✅ |
| Change language | ✅ | ✅ | — | ✅ | ✅ |
| Opt out | ✅ | ✅ | — | ✅ | ✅ |

## Design rules for messages

1. **Short.** Bengali and Hindi SMS use Unicode: **70 characters per segment** (67 when split). Alerts must fit in **2 segments**; replies in 1 where possible. A build-time test checks every template's length.
2. **Source first.** Every alert names the official source: `(source: IMD)`.
3. **One action per message.** Ask one question at a time.
4. **Numbers, not words.** Replies are digits. Accept Western (`1`), Bengali (`১`) and Devanagari (`१`) digits, and common words (`yes`, `ha`, `হ্যাঁ`, `हाँ`).
5. **Always a way out.** `0` = menu, `9` = cancel, `STOP` = opt out.
6. **Same meaning in every language.** Copy is written in English, translated, then **reviewed by native speakers** before any drill.

## Global keywords

Work in any state:

| Reply | Meaning |
|---|---|
| `0` / `MENU` / `HELP` | Show menu |
| `9` / `CANCEL` | Cancel current booking or step |
| `STATUS` | Show current booking or rescue status |
| `BN` / `EN` / `HI` | Change language |
| `STOP` | Opt out of all messages (confirmed by one final SMS) |
| `START` | Opt back in |

## Conversation state machine

```
                ┌──────────────────────── IDLE ─────────────────────────┐
                │ (unregistered number)          (registered number)     │
                v                                                        v
        REG_LANGUAGE ──> REG_AREA ──> REG_AREA_CONFIRM ──> REG_HOUSEHOLD ──> REGISTERED
                                                                         │
                     ┌────────── alert received / "1" / "2" ─────────────┘
                     v                               v
             BOOK_PEOPLE ──> BOOK_NEEDS ──> BOOKED            RESCUE_PEOPLE ──> RESCUE_LANDMARK ──> RESCUE_OPEN
                     │               (no space)
                     └─────────────> BOOK_WAITLIST / BOOK_ALTERNATIVE
```

- State is stored per `(phone, channel)` in the `conversations` table and expires after 30 minutes of silence (back to `IDLE`, nothing lost).
- Steps already known from registration are skipped (e.g. household size → just confirm it).
- Unknown replies get one clarification; a second unknown reply shows the menu.
- If the optional AI parser is enabled, free text (e.g. "we are 5 people, my mother can't walk") is turned into structured answers, **always confirmed back** to the citizen before acting.

## Flows and copy

Placeholders are in `{braces}`. Bengali (bn) and Hindi (hi) are first drafts for native-speaker review.

### Registration

**Start**: missed call to the HOPE number → free callback SMS; or SMS `HOPE` / WhatsApp `Hi`; or the PWA form; or a volunteer.

| Step | English |
|---|---|
| Language | `HOPE disaster alerts. Choose language: 1 বাংলা 2 English 3 हिन्दी` |
| Area | `Reply with your village or ward name.` |
| Area confirm | `Is this your area? {area}, {block}. 1 Yes 2 No` (if several match: numbered list of up to 4) |
| Household | `How many people live with you? Reply a number, e.g. 4` |
| Needs | `Anyone elderly, disabled or unable to walk far? 1 Yes 2 No` |
| Consent + done | `Registered for {area}. We'll message you only for official disaster warnings. Reply STOP anytime.` |

Consent text is shown **before** saving data on every channel; the version agreed to is stored.

### Alert

| Lang | Copy |
|---|---|
| en | `[HOPE] {hazard} warning (source: {source}). Your area: {area}. Reply 1 to book shelter, 2 if you need rescue.` |
| bn | `[HOPE] {hazard} সতর্কতা (সূত্র: {source})। এলাকা: {area}। আশ্রয় চাইলে 1, উদ্ধার চাইলে 2 পাঠান।` |
| hi | `[HOPE] {hazard} चेतावनी (स्रोत: {source})। क्षेत्र: {area}। आश्रय के लिए 1, बचाव के लिए 2 भेजें।` |

One alert covers every affected area; each household receives the **level of its own area** (`EVACUATE NOW` on the coast, `warning` inland). Evacuation order variant adds: `Leave by {time}.` Test alerts during drills always start with `[HOPE DRILL]`; in demo mode every message starts with `[HOPE DEMO]`.

### Booking

| Step | English |
|---|---|
| People | `Book for {n} people? 1 Yes, or reply the number of people.` |
| Needs | `Anyone who needs help walking? 1 Yes 2 No` |
| Booked | `Booked: {shelter}, {n} people. Code {code}. Reach by {time}. Reply 9 to cancel.` |
| No space nearby | `Nearby shelters are full. Nearest with space: {shelter}, {km} km. 1 Book it 2 Ask for rescue` |
| Reminder (30 min before expiry) | `Your place at {shelter} is held until {time}. Reply 1 if you are on the way.` |
| Expired | `Your booking {code} expired. Reply 1 to book again.` |
| Checked in | `Welcome to {shelter}. Stay safe.` |

bn — booked:
`[HOPE] বুকিং হয়েছে: {shelter}, {n} জন। কোড {code}। {time} এর মধ্যে পৌঁছান। বাতিল করতে 9 পাঠান।`

hi — booked:
`[HOPE] बुकिंग हो गई: {shelter}, {n} लोग। कोड {code}। {time} तक पहुँचें। रद्द करने के लिए 9 भेजें।`

### Rescue

| Step | English |
|---|---|
| People | `How many people need rescue? Reply a number.` |
| Landmark | `Reply a nearby landmark (temple, school, shop), or 1 to use your registered address.` |
| Received | `Rescue request received ({ref}). Stay on high ground. We'll update you here.` |
| Assigned | `A rescue team is assigned to you. Keep your phone on.` |

### All clear

`[HOPE] All clear for {area} (source: {source}). Follow local officials before returning home.`

## Adapters

| Adapter | Use | Cost to us | Notes |
|---|---|---|---|
| `fake` | Local dev, tests, demos | ₹0 | Messages appear in the **phone simulator** in the console: a feature-phone screen where you can type replies as a citizen |
| `android-gw` | Real SMS for demos and drills | ₹0 extra | An Android phone running an open-source SMS gateway app, with its SIM on an unlimited plan. Inbound replies are forwarded to the HOPE webhook. Carrier limits (often ~100 SMS/day) mean **≤ 100 people**; not for production |
| `whatsapp-cloud` | WhatsApp | Free test number in dev | Meta Cloud API directly. Alerts use pre-approved utility templates; replies use interactive buttons. Citizens can share a location pin for rescue |
| `msg91` / `gupshup` | Production SMS (adopter) | Adopter pays | Requires DLT registration: entity, `HOPE` sender header, and **every template pre-registered** with `{#var#}` placeholders. Templates in `packages/i18n` are written to match DLT format from day one |
| `missed-call` | Registration trigger | Adopter pays | Provider webhook with caller number → HOPE sends registration SMS |
| `ivr` (later) | Voice alerts for people who can't read | Adopter pays | Pre-recorded Bengali/Hindi messages with keypad replies |

### Sending rules

- **Throttling** per adapter (`limits.perSecond`, `perDay`). The worker spreads a broadcast across the allowed rate and orders it by **vulnerable households first**, then nearest to the hazard.
- **Channel preference:** WhatsApp first for those who use it (cheaper and richer), SMS fallback if not delivered within 5 minutes.
- **Retries:** up to 3 with backoff for transient failures; permanent failures are shown to the coordinator.
- **Idempotency:** a delivery is unique per `(alert, citizen, channel)`; inbound webhooks are de-duplicated by provider id.
- **Quiet hours:** none for warnings. Non-urgent messages (registration reminders) only 08:00–20:00 IST.

## Citizen PWA

- Bengali-first UI, large text and buttons, works on a 5-year-old Android phone.
- Offline: caches the last alert, the booking code (as QR), and nearby shelters with directions.
- Login by phone OTP; the same account as SMS/WhatsApp.
- No animations or 3D; total JS target under 150 KB.

## Testing

- Every template has a unit test for segment count in each language.
- Conversation engine has table-driven tests: `(state, input) → (new state, reply)`.
- The simulator runs full end-to-end drills locally with hundreds of fake citizens.
