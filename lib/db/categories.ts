import { cache } from 'react';
import { getDb } from './connection';
import type { Category } from '@/lib/types';

export const findAllCategories = cache(async (): Promise<Category[]> => {
  const db = getDb();
  const { data, error } = await db
    .from('categories')
    .select('id, name, slug, description')
    .order('name');
  if (error) throw error;
  return (data ?? []) as Category[];
});

export const findCategoryBySlug = cache(async (slug: string): Promise<Category | undefined> => {
  const db = getDb();
  const { data, error } = await db
    .from('categories')
    .select('id, name, slug, description')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return (data as Category | undefined) ?? undefined;
});

export const findCategoryById = cache(async (id: number): Promise<Category | undefined> => {
  const db = getDb();
  const { data, error } = await db
    .from('categories')
    .select('id, name, slug, description')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as Category | undefined) ?? undefined;
});

export const categoryHasServices = cache(async (id: number): Promise<boolean> => {
  const db = getDb();
  const { count, error } = await db
    .from('services')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', id);
  if (error) throw error;
  return (count ?? 0) > 0;
});

export interface CreateCategoryInput {
  name: string;
  slug: string;
  description?: string;
}

export const createCategory = async (input: CreateCategoryInput): Promise<Category> => {
  const db = getDb();
  const { data, error } = await db
    .from('categories')
    .insert({
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
    })
    .select('id, name, slug, description')
    .single();

  if (error) throw error;
  return data as Category;
};

export const deleteCategoryById = async (id: number): Promise<void> => {
  const db = getDb();
  const { error } = await db.from('categories').delete().eq('id', id);
  if (error) throw error;
};
