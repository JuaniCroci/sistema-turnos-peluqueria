-- =============================================================
-- init.sql — Esquema PostgreSQL para Supabase (sistema-turnos-peluqueria)
-- Ejecutar en Supabase SQL Editor.
-- =============================================================

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK(role IN ('client', 'admin')) DEFAULT 'client',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS services (
  id               SERIAL PRIMARY KEY,
  category_id      INTEGER NOT NULL REFERENCES categories(id),
  name             TEXT NOT NULL,
  description      TEXT,
  duration_minutes INTEGER NOT NULL CHECK(duration_minutes > 0),
  price_cents      INTEGER NOT NULL CHECK(price_cents >= 0),
  active           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER REFERENCES users(id),
  service_id     INTEGER NOT NULL REFERENCES services(id),
  appointment_at TIMESTAMPTZ NOT NULL,
  status         TEXT NOT NULL CHECK(status IN ('pending', 'confirmed', 'cancelled', 'completed')) DEFAULT 'pending',
  notes          TEXT,
  client_name    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- indices
CREATE INDEX IF NOT EXISTS idx_services_category   ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_name       ON services(name);
CREATE INDEX IF NOT EXISTS idx_services_active     ON services(active);
CREATE INDEX IF NOT EXISTS idx_appointments_user   ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date   ON appointments(appointment_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_client_name ON appointments(client_name);

-- Previene dos turnos activos (pending/confirmed) en el mismo horario
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_unique_active_slot
ON appointments (appointment_at)
WHERE status IN ('pending', 'confirmed');

-- =============================================================
-- seed
-- =============================================================

INSERT INTO users (email, username, password_hash, role)
VALUES
  ('admin@barberia.test', 'admin', '$2b$10$2f1x0MIXU8nW8a2SeYqwb.640NfcSezVNxBL.V7cTC3rwna3oP9mq', 'admin'),
  ('juani@test.com',      'juani', '$2b$10$IaiLUNkIj3n0jL2c5l8GdewXpzk0daJ8M53iE1oQqRVtaECQEZRdG', 'client')
ON CONFLICT (email) DO NOTHING;

INSERT INTO categories (name, slug, description)
VALUES
  ('Cabello',       'cabello',       'Cortes y peinados para todos.'),
  ('Barba',         'barba',         'Perfilado, diseño y cuidado de barba.'),
  ('Coloración',    'coloracion',    'Tintes, color completo y mechas.'),
  ('Tratamientos',  'tratamientos',  'Hidratación, keratina y más.')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (category_id, name, description, duration_minutes, price_cents, active)
SELECT c.id, s.name, s.description, s.duration_minutes, s.price_cents, true
FROM (VALUES
  ('cabello',      'Corte caballero',  'Corte clásico de caballero.',               30,  300000),
  ('cabello',      'Corte dama',       'Corte y lavado para dama.',                 45,  500000),
  ('cabello',      'Corte niño',       'Corte para niños hasta 12 años.',           20,  200000),
  ('barba',        'Perfilado de barba','Perfilado y diseño de barba.',               20,  200000),
  ('barba',        'Barba completa',   'Perfilado, toalla caliente y aceite.',       30,  350000),
  ('coloracion',   'Tinte de raíces',  'Cobertura de raíces y tono.',                60,  800000),
  ('coloracion',   'Color completo',   'Color completo en todo el cabello.',         90,  1200000),
  ('tratamientos', 'Hidratación',      'Hidratación profunda con ampolleta.',        40,  600000),
  ('tratamientos', 'Keratina',         'Alisado con keratina y sellado.',           120,  1800000)
) AS s(cat_slug, name, description, duration_minutes, price_cents)
JOIN categories c ON c.slug = s.cat_slug
WHERE NOT EXISTS (
  SELECT 1 FROM services WHERE name = s.name
);

-- =============================================================
-- Row Level Security
-- =============================================================
ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE services     ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
