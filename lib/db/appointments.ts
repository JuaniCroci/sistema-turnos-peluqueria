import { cache } from 'react';
import { getDb } from './connection';
import { flattenRow } from './flatten';
import type { Appointment, AppointmentStatus } from '@/lib/types';

export interface AppointmentRow extends Appointment {
  service_name: string;
  service_duration_minutes: number;
  service_price_cents: number;
  category_name: string | null;
}

export interface AppointmentAdminRow extends AppointmentRow {
  user_email: string;
  user_username: string;
}

export interface AppointmentListOptions {
  userId?: number;
  status?: AppointmentStatus;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}

export interface AppointmentListResult {
  data: AppointmentAdminRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

const APPOINTMENT_SELECT = `
  id, user_id, service_id, appointment_at, status, notes, created_at,
  services:service_id (
    name, duration_minutes, price_cents,
    categories:category_id (name)
  ),
  users:user_id (email, username)
`;

const LIST_APPOINTMENT_SELECT = `
  id, user_id, service_id, appointment_at, status, notes, created_at,
  services:service_id (
    name, duration_minutes, price_cents,
    categories:category_id (name)
  )
`;

export const findAppointments = cache(async (options: AppointmentListOptions): Promise<AppointmentListResult> => {
  const db = getDb();

  let countQuery = db.from('appointments').select('*', { count: 'exact', head: true });
  let dataQuery = db.from('appointments').select(LIST_APPOINTMENT_SELECT, { count: 'exact' });

  if (options.userId !== undefined) {
    countQuery = countQuery.eq('user_id', options.userId);
    dataQuery = dataQuery.eq('user_id', options.userId);
  }

  if (options.status) {
    countQuery = countQuery.eq('status', options.status);
    dataQuery = dataQuery.eq('status', options.status);
  }

  if (options.from) {
    countQuery = countQuery.gte('appointment_at', options.from);
    dataQuery = dataQuery.gte('appointment_at', options.from);
  }

  if (options.to) {
    countQuery = countQuery.lte('appointment_at', options.to);
    dataQuery = dataQuery.lte('appointment_at', options.to);
  }

  const { count, error: countErr } = await countQuery;
  if (countErr) throw countErr;

  const total = count ?? 0;
  const offset = (options.page - 1) * options.limit;

  const { data, error } = await dataQuery
    .order('appointment_at', { ascending: false })
    .range(offset, offset + options.limit - 1);

  if (error) throw error;

  const rows = (data ?? []).map((row) => flattenRow<AppointmentRow>(row as Record<string, unknown>));

  const userIds = [...new Set(rows.map(a => a.user_id).filter((id): id is number => id !== null))];
  const userMap = new Map<number, { email: string; username: string }>();

  if (userIds.length > 0) {
    const { data: users } = await db.from('users').select('id, email, username').in('id', userIds);
    for (const u of (users ?? [])) {
      userMap.set(u.id, u);
    }
  }

  const result = rows.map(a => ({
    ...a,
    user_email: a.user_id ? userMap.get(a.user_id)?.email ?? '' : '',
    user_username: a.user_id ? userMap.get(a.user_id)?.username ?? '' : '',
  }));

  return {
    data: result as AppointmentAdminRow[],
    pagination: { page: options.page, limit: options.limit, total },
  };
});

export const findAppointmentById = cache(async (id: number): Promise<AppointmentAdminRow | undefined> => {
  const db = getDb();
  const { data, error } = await db
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return undefined;
  return flattenRow<AppointmentAdminRow>(data as Record<string, unknown>);
});

export interface CreateAppointmentInput {
  user_id: number | null;
  service_id: number;
  appointment_at: string;
  notes?: string;
  client_name?: string | null;
  skipPastCheck?: boolean;
}

export const hasActiveAppointmentAt = async (appointmentAt: string, excludeId?: number): Promise<boolean> => {
  const db = getDb();
  let query = db
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('appointment_at', appointmentAt)
    .in('status', ['pending', 'confirmed']);

  if (excludeId !== undefined) {
    query = query.neq('id', excludeId);
  }

  const { count, error } = await query;
  if (error) throw error;
  return (count ?? 0) > 0;
};

export const createAppointment = async (input: CreateAppointmentInput): Promise<Appointment> => {
  const appointmentAt = input.appointment_at;
  if (!input.skipPastCheck && new Date(appointmentAt) <= new Date()) {
    throw new Error('No se puede reservar un turno en el pasado');
  }

  if (await hasActiveAppointmentAt(appointmentAt)) {
    throw new Error('Ya existe un turno confirmado o pendiente en ese horario');
  }

  const db = getDb();

  const insertData: Record<string, unknown> = {
    user_id: input.user_id,
    service_id: input.service_id,
    appointment_at: appointmentAt,
    notes: input.notes ?? null,
    status: 'pending',
  };
  if (input.client_name) {
    insertData.client_name = input.client_name;
  }

  const { data, error } = await db
    .from('appointments')
    .insert(insertData)
    .select('*')
    .single();

  if (error) throw error;
  return data as Appointment;
};

export const getOccupiedSlots = async (date: string): Promise<string[]> => {
  const db = getDb();

  const { data, error } = await db
    .from('appointments')
    .select(`
      appointment_at,
      services:service_id (duration_minutes)
    `)
    .gte('appointment_at', `${date}T00:00:00`)
    .lt('appointment_at', `${date}T23:59:59`)
    .in('status', ['pending', 'confirmed']);

  if (error) throw error;

  const occupied = new Set<string>();

  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    const aptAt = r.appointment_at as string;
    const svc = r.services as { duration_minutes: number } | null;

    const aptDate = new Date(aptAt);
    const startMinutes = aptDate.getHours() * 60 + aptDate.getMinutes();
    const duration = svc?.duration_minutes ?? 60;
    const endMinutes = startMinutes + duration;

    for (let m = startMinutes; m < endMinutes; m += 30) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      occupied.add(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    }
  }

  return [...occupied].sort();
};

export const updateAppointmentStatus = async (id: number, status: AppointmentStatus): Promise<void> => {
  const db = getDb();
  const { error } = await db.from('appointments').update({ status }).eq('id', id);
  if (error) throw error;
};
