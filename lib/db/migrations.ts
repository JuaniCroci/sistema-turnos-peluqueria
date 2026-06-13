// Migraciones ejecutadas manualmente en Supabase SQL Editor.
// Ver: scripts/init.sql
//
// Este archivo se mantiene como referencia pero no se importa en runtime,
// ya que el schema se gestiona via Supabase (no via better-sqlite3).

export const MIGRATIONS_SQL = `
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
`;
