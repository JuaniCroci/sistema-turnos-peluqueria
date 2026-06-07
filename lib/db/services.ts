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

export const findServices = (options: ServiceListOptions): ServiceListResult => {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (!options.includeInactive) {
    conditions.push('s.active = 1');
  }

  if (options.categorySlug) {
    conditions.push('c.slug = ?');
    params.push(options.categorySlug);
  }

  if (options.q) {
    conditions.push('s.name LIKE ?');
    params.push(`%${options.q}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = db.prepare(`
    SELECT COUNT(*) as count
    FROM services s
    LEFT JOIN categories c ON c.id = s.category_id
    ${whereClause}
  `).get(...params) as { count: number };

  const total = countRow.count;
  const offset = (options.page - 1) * options.limit;

  const data = db.prepare(`
    SELECT s.*
    FROM services s
    LEFT JOIN categories c ON c.id = s.category_id
    ${whereClause}
    ORDER BY s.name
    LIMIT ? OFFSET ?
  `).all(...params, options.limit, offset) as Service[];

  return { data, pagination: { page: options.page, limit: options.limit, total } };
};

export const findServiceById = (id: number): Service | undefined => {
  const db = getDb();
  return db.prepare('SELECT * FROM services WHERE id = ?').get(id) as Service | undefined;
};

export interface CreateServiceInput {
  category_id: number;
  name: string;
  description?: string;
  duration_minutes: number;
  price_cents: number;
}

export const createService = (input: CreateServiceInput): Service => {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO services (category_id, name, description, duration_minutes, price_cents, active)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(
    input.category_id,
    input.name,
    input.description ?? null,
    input.duration_minutes,
    input.price_cents,
  );
  const id = Number(result.lastInsertRowid);
  const service = findServiceById(id);
  if (!service) {
    throw new Error('No se encontro el servicio recien creado');
  }
  return service;
};

export interface UpdateServiceInput {
  category_id?: number;
  name?: string;
  description?: string | null;
  duration_minutes?: number;
  price_cents?: number;
}

export const updateService = (id: number, input: UpdateServiceInput): Service => {
  const db = getDb();
  const sets: string[] = [];
  const params: unknown[] = [];

  if (input.category_id !== undefined) {
    sets.push('category_id = ?');
    params.push(input.category_id);
  }
  if (input.name !== undefined) {
    sets.push('name = ?');
    params.push(input.name);
  }
  if (input.description !== undefined) {
    sets.push('description = ?');
    params.push(input.description);
  }
  if (input.duration_minutes !== undefined) {
    sets.push('duration_minutes = ?');
    params.push(input.duration_minutes);
  }
  if (input.price_cents !== undefined) {
    sets.push('price_cents = ?');
    params.push(input.price_cents);
  }

  if (sets.length === 0) {
    const service = findServiceById(id);
    if (!service) {
      throw new Error('Servicio no encontrado');
    }
    return service;
  }

  params.push(id);
  db.prepare(`UPDATE services SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  const service = findServiceById(id);
  if (!service) {
    throw new Error('Servicio no encontrado despues de actualizar');
  }
  return service;
};

export const softDeleteService = (id: number): void => {
  const db = getDb();
  db.prepare('UPDATE services SET active = 0 WHERE id = ?').run(id);
};

export const findAllActiveCategoriesWithCount = (): Array<{ id: number; name: string; slug: string; description: string | null; service_count: number }> => {
  const db = getDb();
  return db.prepare(`
    SELECT c.id, c.name, c.slug, c.description,
           (SELECT COUNT(*) FROM services s WHERE s.category_id = c.id AND s.active = 1) AS service_count
    FROM categories c
    ORDER BY c.name
  `).all() as Array<{ id: number; name: string; slug: string; description: string | null; service_count: number }>;
};
