# Security and privacy

A disaster-alert system can do serious harm if it is abused: a fake evacuation order causes panic, and a leaked list of elderly or disabled people living alone is dangerous. HOPE is designed around those risks.

## Roles and permissions

Roles are **scoped**: a role applies to one area (and everything inside it) or one shelter.

| Capability | admin | coordinator | approver | shelter_operator | rescue_desk | volunteer |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Manage staff & roles | ✅ | — | — | — | — | — |
| Manage shelters in scope | ✅ | ✅ | — | own shelter: status only | — | — |
| Create incident / zones | ✅ | ✅ | — | — | — | — |
| Draft alert | ✅ | ✅ | — | — | — | — |
| **Approve alert** | — | — | ✅ (not own draft) | — | — | — |
| Check in / walk-ins | — | — | — | ✅ | — | — |
| View rescue queue, assign | — | ✅ | — | — | ✅ | — |
| Register households | — | ✅ | — | — | — | ✅ |
| See citizen phone numbers | — | in scope | — | arriving bookings only | assigned requests only | own registrations only |
| Export data | ✅ (logged) | aggregates only | — | — | — | — |

Admins deliberately **cannot approve alerts**, so no single account can both control access and send alerts.

## Citizen app and staff console are separate

The authority / staff console must never be reachable by citizens.

| Layer | Separation |
|---|---|
| **Apps** | Two separate builds: `apps/citizen` and `apps/console`. Console code is never shipped in the citizen bundle; the citizen app has no links, routes or text pointing to the console |
| **Domains** | Separate origins, e.g. `hope.example` for citizens and `console.hope.example` for staff. Government deployments can put the console on an internal network or behind a VPN / IP allowlist |
| **Login wall** | Every console route except `/login` requires a staff session; nothing (not even the shell or menu) renders before login. No self sign-up: staff accounts are created only by an admin |
| **API** | Two route groups: `/v1/public/*` (citizen OTP sessions) and `/v1/staff/*` (staff session + 2FA + role and scope checks on every endpoint). A citizen token is rejected by staff routes, and the reverse |
| **Sessions** | Different cookie names, each scoped to its own domain, `HttpOnly`, `Secure`, `SameSite=Strict` for the console |
| **CORS** | `/v1/staff/*` accepts requests only from the console origin |
| **Discovery** | Console sends `X-Robots-Tag: noindex`, has a `Disallow: /` robots.txt, and isn't listed in the citizen app's sitemap or manifest |
| **Rate limits** | Strict limits and lockout on staff login; alerts to admins on repeated failures |

Demo mode follows the same rule: the presenter screen (console + phone simulators) is part of the console app and needs a demo login; only the citizen PWA is public.

## Alert safeguards

1. **Official source required:** every incident stores `source` and `source_ref`. The console shows the source bulletin next to the draft.
2. **Two-person rule:** the approver must be a different person, enforced by a database `CHECK`.
3. **Scope check:** you can only target zones inside your assigned area.
4. **Preview:** before approval, the console shows the recipient count, each language's text, and SMS segment count.
5. **Rate guard:** more than 2 `evacuate` alerts for the same area within an hour needs admin confirmation.
6. **Kill switch:** any coordinator or approver can pause a broadcast that is still sending.
7. **Drills are labelled:** drill incidents can't send without `[HOPE DRILL]` in the text.
8. **Correction flow:** a sent alert can be followed by a `correction` update to the same recipients.

## Authentication

- **Citizens:** phone number + OTP (6 digits, 5-minute expiry, max 3 tries, rate-limited per number and per IP). SMS/WhatsApp conversations are tied to the sender number.
- **Staff:** email + password (argon2id) + **mandatory TOTP 2FA** for coordinator, approver and admin. Sessions are HTTP-only, secure cookies; idle timeout 30 minutes on the console.
- **Shelter operators** can log in with a short-lived device link issued by a coordinator, for use on shared phones at a shelter.
- **Webhooks** from SMS / WhatsApp providers are verified by signature or shared secret, and de-duplicated.

## Data protection (India DPDP Act 2023)

| Principle | How HOPE applies it |
|---|---|
| Consent | Clear consent text in the citizen's language at registration; version stored; withdrawal by `STOP` |
| Purpose limitation | Data is used only for disaster alerts, shelter and rescue. No marketing, no sharing with third parties except emergency responders in scope |
| Data minimisation | Only phone, language, area, household counts and needs. No names required, no ID documents, no Aadhaar |
| Accuracy | Citizens can update details anytime by SMS / WhatsApp / PWA |
| Storage limitation | Retention rules in [DATA_MODEL.md](DATA_MODEL.md#retention), enforced by a scheduled job |
| Security | Encryption in transit (TLS) and at rest (disk + sensitive columns); least-privilege DB roles; backups encrypted |
| Rights | Access, correction and erasure requests through SMS keyword or PWA; handled within 30 days |
| Children | No accounts for children; children are only counted inside a household |
| Data location | Production data is stored in India |

**Sensitive data** — health and disability flags — is stored as counts and yes/no fields only, is visible only to roles that need it in their scope, and is never included in exports at an individual level.

## Audit

- Every staff action and every state change of incidents, alerts, bookings, rescue requests and capacity is written to `audit_log`.
- The application's database user can only `INSERT` into `audit_log`.
- Coordinators can view the audit trail for their area; admins for everything.

## Threat model (summary)

| Threat | Mitigation |
|---|---|
| Fake or mistaken alert | Official source, two-person approval, scope check, preview, kill switch, correction flow |
| Stolen staff account | 2FA, short sessions, scoped roles, alert approval needs a second account, audit log |
| Bulk booking to block shelters (abuse) | One active booking per citizen per incident; OTP-verified numbers; rate limits per number; coordinators can release bookings |
| Booking code guessing | 6-char base32 codes (~1 billion combinations), lookups rate-limited, code only valid at its shelter |
| SMS spoofing / webhook forgery | Signed webhooks; replies only change state for the sender's own number |
| Personal data leak | Minimal data, scoped visibility, no individual exports, encryption, retention deletion |
| Provider outage | Multiple adapters; WhatsApp ↔ SMS fallback; queued retries |
| Server outage during an event | Health checks, daily backups with point-in-time recovery, documented restore; PWA keeps last alert and booking offline |
| AI misreads a message | AI output is always confirmed back to the citizen; HOPE works with AI off |
| Dependency vulnerabilities | Lockfiles, automated dependency updates and audit in CI |

## Responsible AI

AI **may**: interpret free-text replies, suggest translations, summarise rescue requests for the desk.

AI **may not**: issue or approve alerts, choose shelters, change capacity, check people in, or decide rescue priority.

All AI outputs are logged with the input, and the system works fully without an AI provider.

## Reporting a vulnerability

Please do not open a public issue. Email the maintainers (address to be added) with details; we aim to respond within 72 hours.
