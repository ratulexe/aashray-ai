-- HOPE core schema. See docs/DATA_MODEL.md.
-- Plain SQL so it runs unchanged on PostgreSQL 16 + PostGIS and on PGlite.
-- Status-like columns use text + CHECK (portable across drivers) rather than enum types.

CREATE EXTENSION IF NOT EXISTS postgis;

-- ── Runtime state (demo clock, etc.) ──────────────────────────────────────
CREATE TABLE app_state (
  key   text PRIMARY KEY,
  value jsonb NOT NULL
);

-- ── Geography ─────────────────────────────────────────────────────────────
CREATE TABLE admin_areas (
  id        serial PRIMARY KEY,
  lgd_code  text UNIQUE,
  level     text NOT NULL CHECK (level IN ('state','district','subdivision','block','municipality','gram_panchayat','ward')),
  parent_id int REFERENCES admin_areas(id),
  name      jsonb NOT NULL,
  geom      geometry(MultiPolygon, 4326) NOT NULL
);
CREATE INDEX admin_areas_geom_idx ON admin_areas USING gist (geom);
CREATE INDEX admin_areas_parent_idx ON admin_areas (parent_id);

-- ── Citizens ──────────────────────────────────────────────────────────────
CREATE TABLE citizens (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone             text UNIQUE NOT NULL,
  phone_verified_at timestamptz,
  lang              text NOT NULL DEFAULT 'bn' CHECK (lang IN ('bn','en','hi')),
  channel           text NOT NULL DEFAULT 'sms' CHECK (channel IN ('sms','whatsapp','pwa')),
  display_name      text,
  home_area_id      int REFERENCES admin_areas(id),
  home_point        geography(Point, 4326),
  landmark          text,
  consent_at        timestamptz NOT NULL,
  consent_version   text NOT NULL,
  registered_via    text NOT NULL,
  registered_by     uuid,
  opted_out_at      timestamptz,
  demo_persona      text UNIQUE,
  is_synthetic      boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX citizens_area_idx ON citizens (home_area_id) WHERE opted_out_at IS NULL;
CREATE INDEX citizens_point_idx ON citizens USING gist (home_point);

CREATE TABLE households (
  citizen_id          uuid PRIMARY KEY REFERENCES citizens(id) ON DELETE CASCADE,
  adults              int NOT NULL DEFAULT 1 CHECK (adults >= 0),
  children            int NOT NULL DEFAULT 0 CHECK (children >= 0),
  elderly             int NOT NULL DEFAULT 0 CHECK (elderly >= 0),
  pregnant            int NOT NULL DEFAULT 0 CHECK (pregnant >= 0),
  disabled            int NOT NULL DEFAULT 0 CHECK (disabled >= 0),
  needs_mobility_help boolean NOT NULL DEFAULT false,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (adults + children + elderly > 0)
);

CREATE TABLE citizen_sessions (
  token_hash text PRIMARY KEY,
  citizen_id uuid NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);

CREATE TABLE otp_codes (
  phone      text PRIMARY KEY,
  code_hash  text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts   int NOT NULL DEFAULT 0
);

-- ── Staff ─────────────────────────────────────────────────────────────────
CREATE TABLE staff (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE staff_roles (
  id         serial PRIMARY KEY,
  staff_id   uuid NOT NULL REFERENCES staff(id),
  role       text NOT NULL CHECK (role IN ('admin','coordinator','approver','shelter_operator','rescue_desk','volunteer')),
  area_id    int REFERENCES admin_areas(id),
  shelter_id uuid
);

CREATE TABLE staff_sessions (
  token_hash text PRIMARY KEY,
  staff_id   uuid NOT NULL REFERENCES staff(id),
  expires_at timestamptz NOT NULL
);

-- ── Shelters ──────────────────────────────────────────────────────────────
CREATE TABLE shelters (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text UNIQUE NOT NULL,
  name          jsonb NOT NULL,
  kind          text NOT NULL CHECK (kind IN ('cyclone_shelter','school','community_hall','other')),
  area_id       int NOT NULL REFERENCES admin_areas(id),
  location      geography(Point, 4326) NOT NULL,
  address       text,
  capacity      int NOT NULL CHECK (capacity > 0),
  safe_for      text[] NOT NULL,
  safety_score  int NOT NULL DEFAULT 70 CHECK (safety_score BETWEEN 0 AND 100),
  accessible    boolean NOT NULL DEFAULT false,
  facilities    jsonb NOT NULL DEFAULT '{}',
  contact_phone text,
  active        boolean NOT NULL DEFAULT true
);
CREATE INDEX shelters_location_idx ON shelters USING gist (location);

ALTER TABLE staff_roles ADD CONSTRAINT staff_roles_shelter_fk FOREIGN KEY (shelter_id) REFERENCES shelters(id);

-- ── Incidents & alerts ────────────────────────────────────────────────────
CREATE TABLE incidents (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard     text NOT NULL CHECK (hazard IN ('cyclone','flood','landslide','lightning','heatwave','other')),
  title      text NOT NULL,
  status     text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','resolved','cancelled')),
  source     text NOT NULL,
  source_ref text NOT NULL CHECK (length(source_ref) > 0),
  summary    text,
  is_drill   boolean NOT NULL DEFAULT false,
  starts_at  timestamptz,
  ends_at    timestamptz,
  created_by uuid NOT NULL REFERENCES staff(id),
  created_at timestamptz NOT NULL
);

CREATE TABLE incident_zones (
  id          serial PRIMARY KEY,
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  level       text NOT NULL CHECK (level IN ('watch','warning','evacuate')),
  area_id     int REFERENCES admin_areas(id),
  geom        geometry(MultiPolygon, 4326) NOT NULL,
  UNIQUE (incident_id, area_id)
);
CREATE INDEX incident_zones_geom_idx ON incident_zones USING gist (geom);

CREATE TABLE alerts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('warning','evacuate','update','correction','all_clear','test')),
  level       text NOT NULL CHECK (level IN ('watch','warning','evacuate')),
  body        jsonb NOT NULL DEFAULT '{}',
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','sending','sent','cancelled')),
  recipients  int,
  created_by  uuid NOT NULL REFERENCES staff(id),
  created_at  timestamptz NOT NULL,
  approved_by uuid REFERENCES staff(id),
  approved_at timestamptz,
  sent_at     timestamptz,
  CHECK (approved_by IS NULL OR approved_by <> created_by),
  CHECK (status IN ('draft','cancelled') OR approved_by IS NOT NULL)
);

CREATE TABLE deliveries (
  id              bigserial PRIMARY KEY,
  alert_id        uuid NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  citizen_id      uuid NOT NULL REFERENCES citizens(id),
  channel         text NOT NULL,
  level           text NOT NULL DEFAULT 'warning' CHECK (level IN ('watch','warning','evacuate')),
  provider        text,
  provider_msg_id text,
  status          text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','failed')),
  error           text,
  segments        int,
  est_cost_paise  int,
  priority        int NOT NULL DEFAULT 5,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (alert_id, citizen_id, channel)
);
CREATE INDEX deliveries_queue_idx ON deliveries (status, priority, id) WHERE status = 'queued';

-- ── Capacity & bookings ───────────────────────────────────────────────────
CREATE TABLE shelter_incident_capacity (
  shelter_id  uuid NOT NULL REFERENCES shelters(id),
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open','full','closed','unsafe')),
  capacity    int NOT NULL CHECK (capacity > 0),
  reserved    int NOT NULL DEFAULT 0,
  occupied    int NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (shelter_id, incident_id),
  CHECK (reserved >= 0 AND occupied >= 0),
  CHECK (reserved + occupied <= capacity)
);

CREATE TABLE bookings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text UNIQUE NOT NULL CHECK (code ~ '^[0-9A-HJKMNP-TV-Z]{6}$'),
  incident_id     uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  shelter_id      uuid NOT NULL REFERENCES shelters(id),
  citizen_id      uuid NOT NULL REFERENCES citizens(id),
  people          int NOT NULL CHECK (people > 0),
  household       jsonb NOT NULL,
  score           jsonb NOT NULL,
  status          text NOT NULL DEFAULT 'held' CHECK (status IN ('held','checked_in','expired','cancelled','moved')),
  channel         text NOT NULL,
  hold_expires_at timestamptz NOT NULL,
  reminded_at     timestamptz,
  checked_in_at   timestamptz,
  checked_in_by   uuid REFERENCES staff(id),
  created_at      timestamptz NOT NULL
);
CREATE UNIQUE INDEX bookings_one_active ON bookings (citizen_id, incident_id) WHERE status = 'held';
CREATE INDEX bookings_expiry_idx ON bookings (hold_expires_at) WHERE status = 'held';
CREATE INDEX bookings_shelter_idx ON bookings (shelter_id, incident_id, status);

CREATE TABLE walk_ins (
  id          bigserial PRIMARY KEY,
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  shelter_id  uuid NOT NULL REFERENCES shelters(id),
  people      int NOT NULL CHECK (people > 0),
  recorded_by uuid REFERENCES staff(id),
  created_at  timestamptz NOT NULL
);

-- ── Rescue ────────────────────────────────────────────────────────────────
CREATE TABLE rescue_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref         text UNIQUE NOT NULL,
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  citizen_id  uuid REFERENCES citizens(id),
  phone       text NOT NULL,
  area_id     int REFERENCES admin_areas(id),
  point       geography(Point, 4326),
  landmark    text,
  people      int CHECK (people > 0),
  vulnerable  jsonb NOT NULL DEFAULT '{}',
  priority    int NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  status      text NOT NULL DEFAULT 'new' CHECK (status IN ('new','triaged','assigned','rescued','closed')),
  assigned_to text,
  channel     text NOT NULL,
  created_at  timestamptz NOT NULL,
  updated_at  timestamptz NOT NULL
);
CREATE INDEX rescue_queue_idx ON rescue_requests (incident_id, status, priority, created_at);

-- ── Messaging ─────────────────────────────────────────────────────────────
CREATE TABLE conversations (
  phone      text NOT NULL,
  channel    text NOT NULL,
  state      text NOT NULL,
  context    jsonb NOT NULL DEFAULT '{}',
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (phone, channel)
);

CREATE TABLE inbound_messages (
  id          bigserial PRIMARY KEY,
  channel     text NOT NULL,
  provider_id text,
  phone       text NOT NULL,
  body        text NOT NULL,
  intent      text,
  received_at timestamptz NOT NULL,
  UNIQUE (channel, provider_id)
);
CREATE INDEX inbound_phone_idx ON inbound_messages (phone, id);

CREATE TABLE outbound_messages (
  id         bigserial PRIMARY KEY,
  channel    text NOT NULL,
  phone      text NOT NULL,
  body       text NOT NULL,
  kind       text NOT NULL,
  alert_id   uuid,
  segments   int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL
);
CREATE INDEX outbound_phone_idx ON outbound_messages (phone, id);

-- ── Audit ─────────────────────────────────────────────────────────────────
CREATE TABLE audit_log (
  id         bigserial PRIMARY KEY,
  actor_type text NOT NULL CHECK (actor_type IN ('staff','citizen','system')),
  actor_id   text,
  action     text NOT NULL,
  entity     text NOT NULL,
  entity_id  text,
  detail     jsonb,
  at         timestamptz NOT NULL
);
CREATE INDEX audit_entity_idx ON audit_log (entity, entity_id);
