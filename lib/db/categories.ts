import { getDb } from './connection';
import type { Category } from '@/lib/types';

export const findAllCategories = (): Category[] => {
  const db = getDb();
  return db.prepare('SELECT id, name, slug, description FROM categories ORDER BY name').all() as Category[];
};

export const findCategoryBySlug = (slug: string): Category | undefined => {
  const db = getDb();
  return db.prepare('SELECT id, name, slug, description FROM categories WHERE slug = ?').get(slug) as Category | undefined;
};

export const findCategoryById = (id: number): Category | undefined => {
  const db = getDb();
  return db.prepare('SELECT id, name, slug, description FROM categories WHERE id = ?').get(id) as Category | undefined;
};

export const categoryHasServices = (id: number): boolean => {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM services WHERE category_id = ?').get(id) as { count: number };
  return row.count > 0;
};

export interface CreateCategoryInput {
  name: string;
  slug: string;
  description?: string;
}

export const createCategory = (input: CreateCategoryInput): Category => {
  const db = getDb();
  const result = db.prepare('INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)').run(
    input.name,
    input.slug,
    input.description ?? null,
  );
  const id = Number(result.lastInsertRowid);
  const category = findCategoryById(id);
  if (!category) {
    throw new Error('No se encontro la categoria recien creada');
  }
  return category;
};

export const deleteCategoryById = (id: number): void => {
  const db = getDb();
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
};
