# Data model

HOPE uses **PostgreSQL 16 with PostGIS**. The database is the single source of truth and enforces the most important rules itself (capacity limits, one active booking per household, two-person alert approval), so a bug in application code can't break them.

Conventions:
- IDs are `uuid` for entities exposed outside, `bigserial` for internal / high-volume rows.
- All times are `timestamptz` (UTC); displayed in IST.
- Geometry uses SRID 4326. Areas are `geometry(MultiPolygon)`; points are `geography(Point)` for distance in metres.
- Phone numbers are stored in E.164 format (`+91…`).

> **As built (Phase 0):** the schema lives in [`packages/db/migrations/001_init.sql`](../packages/db/migrations/001_init.sql) and is the source of truth. Differences from the sketch below: status-like columns are `text` + `CHECK` instead of enum types (portable across drivers); `deliveries` stores the recipient's zone `level` (each household gets the wording for its own area) and is not partitioned yet; extra tables `app_state` (demo clock), `staff_sessions`, `citizen_sessions`, `otp_codes`, `walk_ins` and `outbound_messages`; `shelters.safety_score` holds the survey rating used by allocation.

## Entity overview

```
admin_areas ─┬─< citizens ──1:1── households
             ├─< shelters ──< shelter_incident_capacity >── incidents ──< incident_zones
             │                                                 │
             │                                                 ├──< alerts ──< deliveries
             │                                                 ├──< bookings  (citizen, shelter)
             │                                                 └──< rescue_requests
staff ──< staff_roles (scoped to area or shelter)
conversations · inbound_messages · audit_log
```

## Enums

```sql
CREATE TYPE area_level      AS ENUM ('state','district','subdivision','block','municipality','gram_panchayat','ward');
CREATE TYPE hazard_type     AS ENUM ('cyclone','flood','landslide','lightning','heatwave','other');
CREATE TYPE severity        AS ENUM ('watch','warning','evacuate');
CREATE TYPE incident_status AS ENUM ('draft','active','resolved','cancelled');
CREATE TYPE alert_kind      AS ENUM ('warning','evacuate','update','correction','all_clear','test');
CREATE TYPE alert_status    AS ENUM ('draft','approved','sending','sent','cancelled');
CREATE TYPE booking_status  AS ENUM ('held','checked_in','expired','cancelled','moved');
CREATE TYPE rescue_status   AS ENUM ('new','triaged','assigned','rescued','closed');
CREATE TYPE staff_role      AS ENUM ('admin','coordinator','approver','shelter_operator','rescue_desk','volunteer');
```

## Tables

### Geography

```sql
CREATE TABLE admin_areas (
  id         bigserial PRIMARY KEY,
  lgd_code   text UNIQUE,
  level      area_level NOT NULL,
  parent_id  bigint REFERENCES admin_areas(id),
  name       jsonb NOT NULL,                 -- {"en": "Namkhana", "bn": "...", "hi": "..."}
  geom       geometry(MultiPolygon, 4326) NOT NULL
);
CREATE INDEX admin_areas_geom_idx ON admin_areas USING gist (geom);
CREATE INDEX admin_areas_parent_idx ON admin_areas (parent_id);
```

### Citizens and households

```sql
CREATE TABLE citizens (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone             text UNIQUE NOT NULL,
  phone_verified_at timestamptz,
  lang              text NOT NULL DEFAULT 'bn' CHECK (lang IN ('bn','en','hi')),
  channels          text[] NOT NULL DEFAULT '{sms}',     -- sms, whatsapp, push
  home_area_id      bigint REFERENCES admin_areas(id),   -- village / GP / ward
  home_point        geography(Point, 4326),              -- optional
  landmark          text,
  consent_at        timestamptz NOT NULL,
  consent_version   text NOT NULL,
  registered_via    text NOT NULL,                       -- missed_call|sms|whatsapp|web|volunteer
  registered_by     uuid,                                -- staff id for assisted registration
  opted_out_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX citizens_area_idx  ON citizens (home_area_id) WHERE opted_out_at IS NULL;
CREATE INDEX citizens_point_idx ON citizens USING gist (home_point);

CREATE TABLE households (
  citizen_id          uuid PRIMARY KEY REFERENCES citizens(id) ON DELETE CASCADE,
  adults              int NOT NULL DEFAULT 1 CHECK (adults   >= 0),
  children            int NOT NULL DEFAULT 0 CHECK (children >= 0),
  elderly             int NOT NULL DEFAULT 0 CHECK (elderly  >= 0),
  pregnant            int NOT NULL DEFAULT 0 CHECK (pregnant >= 0),
  disabled            int NOT NULL DEFAULT 0 CHECK (disabled >= 0),
  needs_mobility_help boolean NOT NULL DEFAULT false,
  livestock           boolean NOT NULL DEFAULT false,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (adults + children + elderly > 0)
);
```

### Staff

```sql
CREATE TABLE staff (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  email         text UNIQUE NOT NULL,
  phone         text,
  password_hash text NOT NULL,
  totp_secret   text,                      -- encrypted at rest
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE staff_roles (
  id         bigserial PRIMARY KEY,
  staff_id   uuid NOT NULL REFERENCES staff(id),
  role       staff_role NOT NULL,
  area_id    bigint REFERENCES admin_areas(id),   -- scope: this area and below
  shelter_id uuid REFERENCES shelters(id),        -- scope for shelter operators
  UNIQUE (staff_id, role, area_id, shelter_id)
);
```

### Incidents and alerts

```sql
CREATE TABLE incidents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard      hazard_type NOT NULL,
  title       text NOT NULL,
  status      incident_status NOT NULL DEFAULT 'draft',
  source      text NOT NULL,                -- sachet|imd|cwc|district_admin|drill
  source_ref  text NOT NULL,                -- bulletin id or URL — required
  is_drill    boolean NOT NULL DEFAULT false,
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_by  uuid NOT NULL REFERENCES staff(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE incident_zones (
  id          bigserial PRIMARY KEY,
  incident_id uuid NOT NULL REFERENCES incidents(id),
  level       severity NOT NULL,
  area_id     bigint REFERENCES admin_areas(id),       -- when built from areas
  geom        geometry(MultiPolygon, 4326) NOT NULL
);
CREATE INDEX incident_zones_geom_idx ON incident_zones USING gist (geom);

CREATE TABLE alerts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id  uuid NOT NULL REFERENCES incidents(id),
  kind         alert_kind NOT NULL,
  body         jsonb NOT NULL,                 -- {"bn": "...", "en": "...", "hi": "..."}
  min_level    severity NOT NULL,              -- which zones receive it
  status       alert_status NOT NULL DEFAULT 'draft',
  created_by   uuid NOT NULL REFERENCES staff(id),
  approved_by  uuid REFERENCES staff(id),
  approved_at  timestamptz,
  sent_at      timestamptz,
  CHECK (approved_by IS NULL OR approved_by <> created_by),           -- two-person rule
  CHECK (status IN ('draft','cancelled') OR approved_by IS NOT NULL)
);

CREATE TABLE deliveries (
  id              bigserial,
  alert_id        uuid NOT NULL,
  citizen_id      uuid NOT NULL,
  channel         text NOT NULL,
  provider        text NOT NULL,
  provider_msg_id text,
  status          text NOT NULL DEFAULT 'queued',   -- queued|sent|delivered|failed
  error           text,
  segments        int,
  cost_paise      int,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at),
  UNIQUE (alert_id, citizen_id, channel, created_at)
) PARTITION BY RANGE (created_at);                   -- monthly partitions
```

### Shelters and capacity

```sql
CREATE TABLE shelters (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text UNIQUE NOT NULL,
  name          jsonb NOT NULL,
  kind          text NOT NULL,              -- cyclone_shelter|school|community_hall|other
  area_id       bigint NOT NULL REFERENCES admin_areas(id),
  location      geography(Point, 4326) NOT NULL,
  address       text,
  capacity      int NOT NULL CHECK (capacity > 0),
  safe_for      hazard_type[] NOT NULL,
  accessible    boolean NOT NULL DEFAULT false,
  facilities    jsonb NOT NULL DEFAULT '{}', -- {"water":true,"toilets":4,"power":"generator","medical":false,"womens_space":true}
  contact_phone text,
  active        boolean NOT NULL DEFAULT true
);
CREATE INDEX shelters_location_idx ON shelters USING gist (location);

-- Live counters, one row per shelter per incident
CREATE TABLE shelter_incident_capacity (
  shelter_id  uuid NOT NULL REFERENCES shelters(id),
  incident_id uuid NOT NULL REFERENCES incidents(id),
  status      text NOT NULL DEFAULT 'open',      -- open|full|closed|unsafe
  capacity    int  NOT NULL CHECK (capacity > 0), -- may differ from nominal
  reserved    int  NOT NULL DEFAULT 0,
  occupied    int  NOT NULL DEFAULT 0,           -- checked-in + walk-ins
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (shelter_id, incident_id),
  CHECK (reserved >= 0 AND occupied >= 0),
  CHECK (reserved + occupied <= capacity)
);
```

> Walk-ins may push `occupied` up to capacity; when a shelter is physically over capacity the operator marks it `full` and raises its capacity only with a coordinator's approval. Real people are never turned away by the database — that is an operator decision.

### Bookings

```sql
CREATE TABLE bookings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text UNIQUE NOT NULL,         -- 6 chars, Crockford base32, shown as K7Q-M3P
  incident_id     uuid NOT NULL REFERENCES incidents(id),
  shelter_id      uuid NOT NULL REFERENCES shelters(id),
  citizen_id      uuid NOT NULL REFERENCES citizens(id),
  people          int  NOT NULL CHECK (people > 0),
  household       jsonb NOT NULL,               -- snapshot at booking time
  score           jsonb NOT NULL,               -- allocation breakdown
  status          booking_status NOT NULL DEFAULT 'held',
  channel         text NOT NULL,
  hold_expires_at timestamptz NOT NULL,
  checked_in_at   timestamptz,
  checked_in_by   uuid REFERENCES staff(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX bookings_one_active
  ON bookings (citizen_id, incident_id) WHERE status = 'held';
CREATE INDEX bookings_expiry_idx
  ON bookings (hold_expires_at) WHERE status = 'held';
```

### Rescue

```sql
CREATE TABLE rescue_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents(id),
  citizen_id  uuid REFERENCES citizens(id),
  phone       text NOT NULL,
  area_id     bigint REFERENCES admin_areas(id),
  point       geography(Point, 4326),
  landmark    text,
  people      int CHECK (people > 0),
  vulnerable  jsonb NOT NULL DEFAULT '{}',
  message     text,
  priority    int NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),  -- 1 = most urgent
  status      rescue_status NOT NULL DEFAULT 'new',
  assigned_to text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

### Conversations and audit

```sql
CREATE TABLE conversations (
  phone      text NOT NULL,
  channel    text NOT NULL,
  state      text NOT NULL,                 -- see CHANNELS.md state machine
  context    jsonb NOT NULL DEFAULT '{}',
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (phone, channel)
);

CREATE TABLE inbound_messages (
  id           bigserial PRIMARY KEY,
  channel      text NOT NULL,
  provider_id  text,
  phone        text NOT NULL,
  body         text NOT NULL,
  intent       text,
  received_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, provider_id)               -- webhook retries are idempotent
);

CREATE TABLE audit_log (
  id          bigserial PRIMARY KEY,
  actor_type  text NOT NULL,                  -- staff|citizen|system
  actor_id    text,
  action      text NOT NULL,
  entity      text NOT NULL,
  entity_id   text,
  before      jsonb,
  after       jsonb,
  at          timestamptz NOT NULL DEFAULT now()
);
-- The application role has INSERT but not UPDATE/DELETE on audit_log.
```

## Core operations

### Who receives an alert

```sql
SELECT DISTINCT c.id, c.phone, c.lang, c.channels
FROM citizens c
JOIN incident_zones z ON z.incident_id = $1 AND z.level >= $2
LEFT JOIN admin_areas a ON a.id = c.home_area_id
WHERE c.opted_out_at IS NULL
  AND c.phone_verified_at IS NOT NULL
  AND (
        (c.home_point IS NOT NULL AND ST_Intersects(c.home_point::geometry, z.geom))
     OR (a.id IS NOT NULL AND ST_Intersects(a.geom, z.geom))
  );
```

### Create a booking (one transaction)

```sql
BEGIN;
SELECT capacity, reserved, occupied, status
  FROM shelter_incident_capacity
 WHERE shelter_id = $shelter AND incident_id = $incident
 FOR UPDATE;
-- application: abort unless status = 'open' AND capacity - reserved - occupied >= $people
INSERT INTO bookings (...) VALUES (...);          -- unique index blocks a 2nd active booking
UPDATE shelter_incident_capacity
   SET reserved = reserved + $people, updated_at = now()
 WHERE shelter_id = $shelter AND incident_id = $incident;
INSERT INTO audit_log (...) VALUES (...);
COMMIT;
```

### Expire holds (worker, every minute)

```sql
WITH expired AS (
  UPDATE bookings SET status = 'expired'
   WHERE status = 'held' AND hold_expires_at < now()
  RETURNING shelter_id, incident_id, people
), totals AS (
  SELECT shelter_id, incident_id, sum(people) AS n FROM expired GROUP BY 1, 2
)
UPDATE shelter_incident_capacity c
   SET reserved = c.reserved - t.n, updated_at = now()
  FROM totals t
 WHERE c.shelter_id = t.shelter_id AND c.incident_id = t.incident_id;
```

### Check in

```sql
BEGIN;
SELECT * FROM bookings WHERE code = $code FOR UPDATE;
-- application: verify shelter, incident, status = 'held', not expired
UPDATE bookings SET status = 'checked_in', checked_in_at = now(), checked_in_by = $staff WHERE id = $id;
UPDATE shelter_incident_capacity
   SET reserved = reserved - $people, occupied = occupied + $people, updated_at = now()
 WHERE shelter_id = $shelter AND incident_id = $incident;
COMMIT;
```

## Hold duration

`hold_expires_at = now() + travel_estimate + 60 min buffer`, with a minimum of 90 minutes and a maximum of 6 hours. Coordinators can extend all holds in an incident (e.g. when roads are blocked).

## Retention

| Data | Kept for |
|---|---|
| Citizens, households | Until the person opts out, or 2 years without activity |
| Bookings, rescue requests, conversations, inbound messages | 90 days after the incident is resolved, then anonymised |
| Deliveries | 1 year (aggregates kept longer) |
| Audit log | 3 years |

## Seed data

- West Bengal boundaries down to gram panchayat / ward for the pilot district, with LGD codes.
- Sample shelters for the pilot block, flagged `demo`.
- A drill incident and test staff accounts for local development.
