-- =============================================================
-- enable-rls.sql — Habilita RLS en todas las tablas
-- Ejecutar en Supabase SQL Editor (idempotente, se puede repetir).
-- =============================================================
-- La app usa el service-role key, que bypassa RLS, así que esto
-- NO cambia el comportamiento de la app: solo bloquea el acceso
-- directo vía anon/authenticated si el anon key se filtra.

ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE services     ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Sin políticas permisivas: deny-by-default para anon/authenticated.
-- (Opcional, futuro) lectura pública de catálogo:
-- CREATE POLICY "public read services" ON services FOR SELECT TO anon USING (active = true);
-- CREATE POLICY "public read categories" ON categories FOR SELECT TO anon USING (true);
