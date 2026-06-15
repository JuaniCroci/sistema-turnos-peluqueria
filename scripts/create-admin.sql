-- =============================================================
-- create-admin.sql — Crear el admin inicial
-- Ejecutar en Supabase SQL Editor DESPUES de init.sql.
--
-- IMPORTANTE: NO committear este archivo con un hash real.
-- Generá el hash localmente (ver README) y reemplazá
-- <PEGAR_HASH_BCRYPT> antes de ejecutar.
-- =============================================================

INSERT INTO users (email, username, password_hash, role)
VALUES ('CAMBIAR@dominio.real', 'admin', '<PEGAR_HASH_BCRYPT>', 'admin')
ON CONFLICT (email) DO NOTHING;
