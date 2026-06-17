import { cache } from 'react';
import { getDb } from './connection';
import type { Service } from '@/lib/types';

export interface ServiceListOptions {
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

export const findServices = cache(
  async (options: ServiceListOptions): Promise<ServiceListResult> => {
    const db = getDb();
    let query = db.from('services').select('*', { count: 'exact' });

    if (!options.includeInactive) {
      query = query.eq('active', true);
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
      pagination: {
        page: options.page,
        limit: options.limit,
        total: count ?? 0,
      },
    };
  },
);

export const findServiceById = cache(
  async (id: number): Promise<Service | undefined> => {
    const db = getDb();
    const { data, error } = await db
      .from('services')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as Service | undefined) ?? undefined;
  },
);

export interface CreateServiceInput {
  category?: string;
  name: string;
  description?: string;
  duration_minutes: number;
  price_cents: number;
}

export const createService = async (
  input: CreateServiceInput,
): Promise<Service> => {
  const db = getDb();
  const { data, error } = await db
    .from('services')
    .insert({
      category: input.category ?? null,
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
  category?: string;
  name?: string;
  description?: string | null;
  duration_minutes?: number;
  price_cents?: number;
}

export const updateService = async (
  id: number,
  input: UpdateServiceInput,
): Promise<Service> => {
  const db = getDb();
  const updates: Record<string, unknown> = {};
  if (input.category !== undefined) updates.category = input.category;
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.duration_minutes !== undefined)
    updates.duration_minutes = input.duration_minutes;
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
  const { error } = await db
    .from('services')
    .update({ active: false })
    .eq('id', id);
  if (error) throw error;
};
