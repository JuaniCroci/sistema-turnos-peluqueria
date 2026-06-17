-- =============================================================
-- 002-remove-categories.sql — Migración: eliminar sistema de categorías
-- Ejecutar en Supabase SQL Editor después de deployar el código.
-- =============================================================

-- 1. Migrar datos: copiar category.name a services.category (texto libre)
ALTER TABLE services ADD COLUMN IF NOT EXISTS category TEXT;
UPDATE services SET category = c.name FROM categories c WHERE c.id = services.category_id;

-- 2. Eliminar FK e índice que referencian categories
DROP INDEX IF EXISTS idx_services_category;
ALTER TABLE services DROP CONSTRAINT IF EXISTS services_category_id_fkey;

-- 3. Eliminar columna category_id de services
ALTER TABLE services DROP COLUMN IF EXISTS category_id;

-- 4. Eliminar tabla categories
DROP TABLE IF EXISTS categories;

-- 5. Limpiar RLS (ya no hay tabla)
-- ALTER TABLE categories ENABLE ROW LEVEL SECURITY; -- ya no aplica
