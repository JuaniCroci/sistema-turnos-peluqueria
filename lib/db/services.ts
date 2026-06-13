import { cache } from 'react';
import { getDb } from './connection';
import type { Service } from '@/lib/types';

export interface ServiceListOptions {
  categorySlug?: string;
  q?: string;
  page: number;
  limit: number;
  includeInactive?: boolean;
}

export interface ServiceListResult {
  data: Service[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export const findServices = cache(async (options: ServiceListOptions): Promise<ServiceListResult> => {
  const db = getDb();
  let query = db.from('services').select('*', { count: 'exact' });

  if (!options.includeInactive) {
    query = query.eq('active', true);
  }

  if (options.categorySlug) {
    query = query.eq('category.slug', options.categorySlug);
  }

  if (options.q) {
    query = query.ilike('name', `%${options.q}%`);
  }

  const offset = (options.page - 1) * options.limit;
  const { data, count, error } = await query
    .order('name')
    .range(offset, offset + options.limit - 1);

  if (error) throw error;
  return {
    data: (data ?? []) as Service[],
    pagination: { page: options.page, limit: options.limit, total: count ?? 0 },
  };
});

export const findServiceById = cache(async (id: number): Promise<Service | undefined> => {
  const db = getDb();
  const { data, error } = await db.from('services').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Service | undefined) ?? undefined;
});

export interface CreateServiceInput {
  category_id: number;
  name: string;
  description?: string;
  duration_minutes: number;
  price_cents: number;
}

export const createService = async (input: CreateServiceInput): Promise<Service> => {
  const db = getDb();
  const { data, error } = await db
    .from('services')
    .insert({
      category_id: input.category_id,
      name: input.name,
      description: input.description ?? null,
      duration_minutes: input.duration_minutes,
      price_cents: input.price_cents,
      active: true,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as Service;
};

export interface UpdateServiceInput {
  category_id?: number;
  name?: string;
  description?: string | null;
  duration_minutes?: number;
  price_cents?: number;
}

export const updateService = async (id: number, input: UpdateServiceInput): Promise<Service> => {
  const db = getDb();
  const updates: Record<string, unknown> = {};
  if (input.category_id !== undefined) updates.category_id = input.category_id;
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.duration_minutes !== undefined) updates.duration_minutes = input.duration_minutes;
  if (input.price_cents !== undefined) updates.price_cents = input.price_cents;

  if (Object.keys(updates).length === 0) {
    const service = await findServiceById(id);
    if (!service) throw new Error('Servicio no encontrado');
    return service;
  }

  const { data, error } = await db
    .from('services')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as Service;
};

export const softDeleteService = async (id: number): Promise<void> => {
  const db = getDb();
  const { error } = await db.from('services').update({ active: false }).eq('id', id);
  if (error) throw error;
};

export const findAllActiveCategoriesWithCount = cache(async (): Promise<
  Array<{ id: number; name: string; slug: string; description: string | null; service_count: number }>
> => {
  const db = getDb();

  const { data: counts, error: countErr } = await db
    .from('services')
    .select('category_id')
    .eq('active', true);

  if (countErr) throw countErr;

  const countMap = new Map<number, number>();
  for (const row of counts ?? []) {
    countMap.set(row.category_id, (countMap.get(row.category_id) ?? 0) + 1);
  }

  const { data: categories, error: catErr } = await db
    .from('categories')
    .select('id, name, slug, description')
    .order('name');

  if (catErr) throw catErr;

  return (categories ?? []).map((cat) => ({
    ...cat,
    service_count: countMap.get(cat.id) ?? 0,
  }));
});
