# Aashray AI

> AI-assisted disaster evacuation and shelter coordination for faster, safer, and more accountable emergency response.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-000000?logo=vercel)](https://aashray-ai.vercel.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)

**Live prototype:** https://aashray-ai.vercel.app  
**Repository:** https://github.com/ratulexe/aashray-ai

---

## Overview

During cyclones, floods, and other disasters, citizens often struggle to answer three urgent questions:

1. **Am I actually inside the affected area?**
2. **Which shelter is safe and has enough capacity for my family?**
3. **How can a shelter operator verify my reservation and update capacity accurately?**

Aashray AI is a web-based emergency-response prototype that connects **citizens**, **shelter operators**, and **authorities** through a shared disaster and shelter data layer.

The system combines:

- location-aware emergency assessment,
- AI-assisted understanding of natural-language emergency descriptions,
- deterministic shelter allocation,
- transactional shelter reservations,
- live operator reservation queues,
- and arrival confirmation with capacity updates.

The goal is not to let AI make life-safety decisions. AI is used only to help structure information provided by the citizen; shelter selection remains rule-based, transparent, and deterministic.

---

## Problem Statement

Emergency evacuation is difficult when information is fragmented across alerts, shelters, and local response teams.

Common problems include:

- citizens not knowing whether an alert applies to their current location,
- incomplete or confusing emergency information,
- overcrowded shelters,
- inaccessible shelters being recommended to people who need mobility assistance,
- duplicate or unverifiable reservations,
- operators lacking a real-time view of incoming families,
- and shelter capacity becoming inaccurate after arrivals.

Aashray AI addresses these problems with a single coordinated workflow.

---

## Solution

Aashray AI provides three role-based experiences:

### Citizen

A citizen can:

- detect their current browser/device location,
- check whether they are inside the active disaster radius,
- use a clearly labelled **Demo Location** for prototype demonstration,
- describe their situation in natural language,
- let AI structure family/emergency details,
- manually review or correct incomplete AI output,
- receive a deterministic shelter recommendation,
- reserve shelter capacity,
- and receive an `ASH-XXXX` evacuation reservation code.

### Shelter Operator

A shelter operator can:

- select the shelter they are operating,
- view live capacity,
- see incoming `RESERVED` reservations,
- verify an `ASH-XXXX` code,
- detect when a citizen is at the wrong shelter,
- switch to the assigned shelter context,
- confirm arrival,
- and atomically move capacity from `reserved` to `occupied`.

### Authority

The Authority interface provides a prototype coordination view for disaster-response monitoring.

> The current authority metrics are demonstration data. The prototype does not expose unauthenticated disaster-state write controls.

---

## Key Features

### Location-aware emergency targeting

The Citizen flow uses browser geolocation and calculates the citizen's distance from the configured disaster center.

If the citizen is outside the configured radius, the application shows:

**Active Emergency Elsewhere**

If the citizen is inside the radius, the local critical evacuation experience becomes available.

The application does not claim to predict cyclones or disasters.

### Transparent Demo Location

For hackathon demonstrations, a citizen can switch to a clearly labelled simulated location inside the Diamond Harbour evacuation scenario.

Demo mode:

- is visibly labelled,
- never pretends to be real GPS,
- uses the same radius-assessment logic as a real location,
- and can be switched back to the device location.

### AI-assisted emergency understanding

Citizens can describe their situation naturally, for example:

```text
We are 4 people: 2 adults, 1 child and 1 elderly person.
One person needs mobility assistance.
```

The server-side AI endpoint extracts structured fields such as:

- incident type,
- total people,
- adults,
- children,
- elderly,
- mobility assistance,
- short summary,
- and whether human review is required.

Incomplete information is **not silently invented**. Unknown family categories remain unresolved and must be completed by the citizen before continuing.

### Deterministic shelter allocation

AI does **not** select the shelter.

Eligible shelters are filtered using operational constraints, then scored with a deterministic model:

| Factor | Weight |
|---|---:|
| Safety | 40% |
| Available capacity | 25% |
| Distance | 20% |
| Route accessibility | 10% |
| Facilities | 5% |

A shelter can be rejected when it is:

- unavailable,
- unsafe for the current disaster type,
- below required capacity,
- inaccessible for a mobility-assistance request,
- or reachable only through an inaccessible route.

Available capacity is computed as:

```text
availableCapacity = capacity - occupied - reserved
```

### Transactional reservations

Reservation creation uses a Firestore transaction.

The transaction:

1. re-reads the shelter,
2. verifies availability and capacity,
3. increments `reserved`,
4. creates the reservation,
5. stores its expiry time,
6. and returns an `ASH-XXXX` code.

This prevents a reservation from relying only on stale client-side capacity.

### Reservation expiry

Reservation validity is based on estimated travel time plus a safety buffer.

```text
validityMinutes = etaMinutes + 60
```

The prototype uses travel-speed assumptions and a minimum ETA to avoid unrealistically short reservation windows.

### Live operator queue

The Shelter Operator dashboard listens for reservations matching:

```text
shelterId == selectedShelterId
status == "RESERVED"
```

The incoming queue intentionally shows only operationally useful information such as:

- reservation code,
- family size,
- ETA,
- and status.

### Wrong-shelter protection

If an operator verifies a reservation assigned to another shelter, the system returns a wrong-shelter state rather than allowing check-in.

The operator can then switch to the assigned shelter context and verify the same code again.

### Atomic arrival confirmation

Arrival confirmation updates both the reservation and shelter in one Firestore transaction:

```text
reservation: RESERVED -> ARRIVED

shelter.reserved = shelter.reserved - peopleCount
shelter.occupied = shelter.occupied + peopleCount
```

Once arrived, the reservation naturally disappears from the live `RESERVED` queue.

---

## System Workflow

```text
                     ┌────────────────────┐
                     │   Active Disaster  │
                     │      Firestore     │
                     └─────────┬──────────┘
                               │
                               v
┌───────────────┐     ┌────────────────────┐
│ Citizen GPS / │ --> │ Radius Assessment  │
│ Demo Location │     └─────────┬──────────┘
└───────────────┘               │
                                v
                     ┌────────────────────┐
                     │ Local Evacuation?  │
                     └─────────┬──────────┘
                               │ Yes
                               v
                     ┌────────────────────┐
                     │ AI-assisted Family │
                     │ Detail Extraction  │
                     └─────────┬──────────┘
                               │
                       Human review/edit
                               │
                               v
                     ┌────────────────────┐
                     │ Deterministic      │
                     │ Shelter Allocation │
                     └─────────┬──────────┘
                               │
                               v
                     ┌────────────────────┐
                     │ Firestore          │
                     │ Reservation Txn    │
                     └─────────┬──────────┘
                               │
                          ASH-XXXX code
                               │
                               v
                     ┌────────────────────┐
                     │ Shelter Operator   │
                     │ Verification       │
                     └─────────┬──────────┘
                               │
                               v
                     ┌────────────────────┐
                     │ Arrival Txn        │
                     │ reserved ->        │
                     │ occupied           │
                     └────────────────────┘
```

---

## Architecture

```text
React + Vite Frontend
        |
        |-- Citizen UI
        |-- Shelter Operator UI
        |-- Authority Prototype UI
        |
        +---- Firebase Firestore
        |       |
        |       |-- disasters
        |       |-- shelters
        |       |-- reservations
        |       `-- roadIncidents
        |
        +---- /api/ai/understand-emergency
                |
                |-- Vercel Serverless Function
                |-- xAI Grok
                `-- Zod structured validation
```

The AI provider key is read only on the server through `XAI_API_KEY`. It is not exposed as a `VITE_*` frontend variable.

---

## Firestore Data Model

### `disasters/{disasterId}`

Representative fields:

```text
type
title
severity
affectedArea
latitude
longitude
radiusKm
expectedDurationHours
evacuationRequired
status
message
createdAt
```

### `shelters/{shelterId}`

Representative fields:

```text
name
location
latitude
longitude
capacity
occupied
reserved
cycloneSafe
floodSafe
safetyScore
accessible
routeAccessible
facilities
status
```

`distanceKm`, `availableCapacity`, suitability score, and score breakdown are calculated values and are not treated as permanent shelter capacity fields.

### `reservations/{ASH-XXXX}`

Representative fields:

```text
code
shelterId
shelterName
peopleCount
family
phone
status
distanceKm
etaMinutes
bufferMinutes
validityMinutes
createdAt
expiresAt
arrivedAt
```

Reservation states used by the prototype include:

```text
RESERVED
ARRIVED
CANCELLED
```

---

## Reservation Verification States

The operator verification flow handles cases including:

```text
VALID
INVALID_CODE
NOT_FOUND
EXPIRED
ALREADY_ARRIVED
CANCELLED
WRONG_SHELTER
INVALID_STATUS
INVALID_RESERVATION
SYSTEM_ERROR
```

This makes failure states explicit instead of treating every invalid code as the same problem.

---

## Tech Stack

### Frontend

- React 19
- Vite 8
- React Router
- Tailwind CSS
- Lucide React

### Backend / Data

- Firebase Firestore
- Firestore Security Rules
- Vercel Serverless Functions

### AI

- xAI Grok
- OpenAI-compatible Node SDK
- Zod structured-output validation

### Deployment

- Vercel
- Firebase Firestore

---

## Project Structure

```text
aashray-ai/
├── api/
│   └── ai/
│       └── understand-emergency.js
├── public/
├── src/
│   ├── components/
│   │   ├── citizen/
│   │   ├── shelter/
│   │   └── landing/
│   ├── data/
│   ├── lib/
│   │   ├── distance.js
│   │   ├── eta.js
│   │   └── shelterAllocation.js
│   ├── pages/
│   │   ├── Authority.jsx
│   │   ├── Citizen.jsx
│   │   ├── Landing.jsx
│   │   └── Shelter.jsx
│   ├── services/
│   │   ├── aiEmergencyService.js
│   │   ├── disasterService.js
│   │   ├── operatorReservationService.js
│   │   ├── reservationService.js
│   │   └── shelterService.js
│   ├── styles/
│   ├── App.jsx
│   └── main.jsx
├── firestore.rules
├── firebase.json
├── vercel.json
├── .env.example
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 22 recommended
- npm
- Firebase project with Firestore enabled
- xAI API key
- Vercel account for the serverless AI route / deployment

### 1. Clone the repository

```bash
git clone https://github.com/ratulexe/aashray-ai.git
cd aashray-ai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a local environment file based on `.env.example`.

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

XAI_API_KEY=your_xai_api_key_here
```

Important:

- Firebase `VITE_*` values are frontend Firebase web configuration.
- `XAI_API_KEY` must remain server-side.
- Never rename it to `VITE_XAI_API_KEY`.

### 4. Run the frontend

For frontend-only development:

```bash
npm run dev
```

### 5. Run with the AI serverless route

The `/api/ai/understand-emergency` route is a Vercel serverless function.

For the complete local experience, use:

```bash
npx vercel dev
```

---

## Firebase Rules

Deploy Firestore rules with:

```bash
npx firebase-tools deploy --only firestore:rules
```

The prototype rules are designed to constrain reservation and capacity transitions even though Firebase Authentication is not yet part of the Phase-1 prototype.

Shelter capacity changes are linked to the corresponding reservation write in the same atomic operation.

---

## Available Routes

| Route | Purpose |
|---|---|
| `/` | Landing page |
| `/citizen` | Citizen evacuation flow |
| `/shelter` | Shelter Operator dashboard |
| `/authority` | Authority prototype dashboard |

Vercel rewrites are configured so these SPA routes can be opened and refreshed directly.

---

## Build and Quality Checks

Run:

```bash
npm run lint
npm run build
```

The current prototype is expected to build successfully. A large JavaScript chunk warning may be reported by Vite; it is a performance optimization opportunity rather than a functional build failure.

---

## Responsible AI and Safety Principles

Aashray AI deliberately separates **language understanding** from **safety-critical allocation**.

### AI is allowed to

- interpret natural-language citizen descriptions,
- extract structured family details,
- summarize the situation,
- identify missing information.

### AI is not allowed to

- predict disasters,
- activate emergency alerts,
- choose shelters,
- override shelter capacity,
- bypass human review,
- confirm arrivals.

Shelter allocation and reservation capacity remain deterministic and transaction-backed.

---

## Security Notes

This is a hackathon prototype, not a production emergency service.

Implemented protections include:

- Firestore field and transition validation,
- atomic reservation creation,
- atomic arrival confirmation,
- shelter-capacity changes linked to reservation transitions,
- denied client deletes,
- server-only AI provider key,
- explicit input/schema validation for AI responses.

Known prototype limitations:

- Firebase Authentication and role-based authorization are not yet implemented.
- App Check is not yet enabled.
- Reservation lookup is intentionally accessible for the prototype operator workflow.
- The Authority dashboard is a demonstration coordination view.
- Official alert-source integration is not yet implemented.

These would be required before real-world deployment.

---

## Demo Scenario

The current prototype uses a Diamond Harbour, West Bengal cyclone scenario.

Suggested demonstration:

1. Open `/citizen`.
2. Allow device location.
3. Show that a user outside the evacuation radius receives **Active Emergency Elsewhere**.
4. Switch to the clearly labelled **Demo Location**.
5. Show the local critical evacuation alert.
6. Describe a family situation with the AI-assisted input.
7. Review the extracted family details.
8. Continue to deterministic shelter recommendation.
9. Reserve the shelter and record the `ASH-XXXX` code.
10. Open `/shelter`.
11. Verify the code at a wrong shelter to demonstrate `WRONG_SHELTER`.
12. Switch to the assigned shelter.
13. Verify the reservation successfully.
14. Confirm arrival.
15. Show the reservation leaving the live incoming queue and capacity moving from `reserved` to `occupied`.
16. Open `/authority` as the prototype coordination view.

---

## Current Prototype Scope

Implemented:

- location-aware disaster-radius checks,
- Demo Location mode,
- AI-assisted emergency/family understanding,
- human review for incomplete AI output,
- deterministic shelter ranking,
- Firestore-backed shelter data,
- reservation transactions,
- `ASH-XXXX` codes,
- expiry and ETA logic,
- shelter operator selection,
- live incoming reservation queue,
- wrong-shelter handling,
- arrival confirmation,
- live reserved/occupied capacity updates,
- responsive role-based web interfaces,
- Vercel production deployment.

---

## Future Scope

Potential next steps include:

- Firebase Authentication and role-based access control,
- Firebase App Check,
- trusted backend/admin workflows,
- integration with official emergency alert sources such as IMD/CWC/NDMA/SACHET,
- registered-user proactive SMS alerts,
- low-connectivity / offline-first emergency access,
- multilingual emergency guidance,
- route-condition integration,
- authority-side live disaster activation with authenticated permissions,
- historical disaster and shelter analytics,
- and deployment hardening for real-world emergency operations.

---

## Why Aashray AI?

Aashray AI is designed around a simple principle:

> **Use AI to understand people better, not to replace transparent safety rules.**

The prototype demonstrates how AI, geolocation, deterministic decision logic, and real-time shelter operations can work together in a public-good emergency-response system while keeping critical allocation decisions explainable and constrained.

---

## Disclaimer

Aashray AI is a prototype created for demonstration and hackathon evaluation.

It must not be treated as an official emergency-warning, evacuation, navigation, or shelter-management service. Real-world deployment would require authenticated authority integrations, verified shelter data, official disaster feeds, security hardening, operational testing, accessibility validation, and coordination with relevant public agencies.
