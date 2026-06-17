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

CREATE TABLE IF NOT EXISTS services (
  id               SERIAL PRIMARY KEY,
  category         TEXT,
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

INSERT INTO services (category, name, description, duration_minutes, price_cents, active)
VALUES
  ('Cabello',       'Corte caballero',  'Corte clásico de caballero.',               30,  300000, true),
  ('Cabello',       'Corte dama',       'Corte y lavado para dama.',                 45,  500000, true),
  ('Cabello',       'Corte niño',       'Corte para niños hasta 12 años.',           20,  200000, true),
  ('Barba',         'Perfilado de barba','Perfilado y diseño de barba.',               20,  200000, true),
  ('Barba',         'Barba completa',   'Perfilado, toalla caliente y aceite.',       30,  350000, true),
  ('Coloración',    'Tinte de raíces',  'Cobertura de raíces y tono.',                60,  800000, true),
  ('Coloración',    'Color completo',   'Color completo en todo el cabello.',         90,  1200000, true),
  ('Tratamientos',  'Hidratación',      'Hidratación profunda con ampolleta.',        40,  600000, true),
  ('Tratamientos',  'Keratina',         'Alisado con keratina y sellado.',           120,  1800000, true)
ON CONFLICT DO NOTHING;

-- =============================================================
-- Row Level Security
-- =============================================================
ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE services     ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
