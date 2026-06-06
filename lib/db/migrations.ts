export const MIGRATIONS: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    UNIQUE NOT NULL,
    username      TEXT    UNIQUE NOT NULL,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL CHECK(role IN ('client', 'admin')) DEFAULT 'client',
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );`,

  `CREATE TABLE IF NOT EXISTS categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    slug        TEXT    UNIQUE NOT NULL,
    description TEXT
  );`,

  `CREATE TABLE IF NOT EXISTS services (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id      INTEGER NOT NULL REFERENCES categories(id),
    name             TEXT    NOT NULL,
    description      TEXT,
    duration_minutes INTEGER NOT NULL CHECK(duration_minutes > 0),
    price_cents      INTEGER NOT NULL CHECK(price_cents >= 0),
    active           INTEGER NOT NULL DEFAULT 1,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
  );`,

  `CREATE TABLE IF NOT EXISTS appointments (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL REFERENCES users(id),
    service_id     INTEGER NOT NULL REFERENCES services(id),
    appointment_at TEXT    NOT NULL,
    status         TEXT    NOT NULL CHECK(status IN
                   ('pending', 'confirmed', 'cancelled', 'completed')) DEFAULT 'pending',
    notes          TEXT,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  );`,

  `CREATE INDEX IF NOT EXISTS idx_services_category   ON services(category_id);`,
  `CREATE INDEX IF NOT EXISTS idx_services_name       ON services(name);`,
  `CREATE INDEX IF NOT EXISTS idx_services_active     ON services(active);`,
  `CREATE INDEX IF NOT EXISTS idx_appointments_user   ON appointments(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_appointments_date   ON appointments(appointment_at);`,
  `CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);`,
];
