# Adoption: build it, then hand it over

HOPE is built to be **adopted**. We build and prove it; a government department or a large organisation runs it at scale with its own SMS contract and staff.

## The handover package

| Item | Why it matters to an adopter |
|---|---|
| Open-source code (Apache-2.0) | No licence fees or lock-in; their IT team can audit it |
| One-command deploy (`docker compose up`) | Runs on any Linux VM, a state data centre or government cloud |
| Open standards: CAP (alert format used by SACHET / IMD), LGD area codes | Plugs into systems they already use |
| Swappable providers | Use their existing SMS vendor and DLT registration |
| Seeded West Bengal data | Works on day one for a pilot block |
| Operations guide | District teams can run an incident without developers |
| Security & privacy documentation | Answers their security review and DPDP questions ([SECURITY_PRIVACY.md](SECURITY_PRIVACY.md)) |
| Cost model | They know what it will cost before they start ([BUDGET.md](BUDGET.md)) |
| Demo site, phone simulator, 3-minute video, pitch deck | Easy to evaluate in one meeting |
| Drill report | Proof it works with real people and real phones |

## Who to approach, in order

1. **A local partner for a drill:** an NGO, school, or gram panchayat in the Diamond Harbour subdivision (Namkhana, Sagar, Kakdwip). A small drill with ~100 people gives real evidence.
2. **Disaster-relief organisations** that already run relief camps: e.g. Indian Red Cross Society (West Bengal branch), Sphere India member NGOs, SEEDS.
3. **Government:**
   - District Disaster Management Office, South 24 Parganas
   - West Bengal Disaster Management & Civil Defence Department
   - For national visibility: NDMA and NIDM
4. **Support and recognition:**
   - Company CSR programmes (disaster management is an eligible CSR activity)
   - Digital Public Goods Alliance registration
   - Civic-tech and social-impact competitions, foundation grants

## What makes them say yes

- **It works end to end**, live, including a real basic phone receiving an SMS and booking.
- **It respects their authority:** it never predicts, requires an official source and two approvals for every alert.
- **It fits what they have:** SACHET / CAP, LGD codes, their SMS vendor, their servers.
- **It is cheap to try:** a one-block pilot is a small line item ([BUDGET.md](BUDGET.md)).
- **It is safe with data:** minimal data, India-hosted, DPDP-aligned.

## Pitch outline (5 slides)

1. **Problem** — people don't hear in time, can't reach help, wait. (From the original notes.)
2. **HOPE** — warning → reply 1 → booked shelter, on any phone. Live demo.
3. **For your teams** — coordinator map, approvals, shelter check-in, rescue desk.
4. **Safe & adoptable** — official sources, two-person rule, open source, CAP, India-hosted.
5. **Pilot ask** — one block, one season, estimated cost, what we provide.

## Pilot proposal template

- **Area:** one block (e.g. Namkhana), ~10,000 households
- **Duration:** one cyclone or monsoon season
- **Adopter provides:** shelter list, staff for coordinator / approver / operator roles, SMS / WhatsApp account, hosting (or uses ours for the pilot)
- **We provide:** deployment, training, data setup, support during the season, a final report
- **Success measures:** registration count, alert delivery rate, time from alert to booking, bookings that arrive, rescue requests handled, staff feedback

## After adoption

- The adopter owns their deployment and data.
- Improvements flow back to the open-source project.
- A short public case study helps the next district or state adopt it.
