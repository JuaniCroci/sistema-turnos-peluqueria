import { cache } from 'react';
import { getDb } from './connection';
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

const appointmentSelect = `
  a.id, a.user_id, a.service_id, a.appointment_at, a.status, a.notes, a.created_at,
  s.name AS service_name,
  s.duration_minutes AS service_duration_minutes,
  s.price_cents AS service_price_cents,
  c.name AS category_name
`;

const appointmentJoins = `
  FROM appointments a
  JOIN services s ON s.id = a.service_id
  LEFT JOIN categories c ON c.id = s.category_id
`;

export const findAppointments = cache((options: AppointmentListOptions): AppointmentListResult => {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options.userId !== undefined) {
    conditions.push('a.user_id = ?');
    params.push(options.userId);
  }

  if (options.status) {
    conditions.push('a.status = ?');
    params.push(options.status);
  }

  if (options.from) {
    conditions.push('a.appointment_at >= ?');
    params.push(options.from);
  }

  if (options.to) {
    conditions.push('a.appointment_at <= ?');
    params.push(options.to);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = db.prepare(`
    SELECT COUNT(*) as count
    ${appointmentJoins}
    ${whereClause}
  `).get(...params) as { count: number };

  const total = countRow.count;
  const offset = (options.page - 1) * options.limit;

  const data = db.prepare(`
    SELECT ${appointmentSelect}
    ${appointmentJoins}
    ${whereClause}
    ORDER BY a.appointment_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, options.limit, offset) as AppointmentAdminRow[];

  return { data, pagination: { page: options.page, limit: options.limit, total } };
});

export const findAppointmentById = cache((id: number): AppointmentAdminRow | undefined => {
  const db = getDb();
  return db.prepare(`
    SELECT ${appointmentSelect},
           u.email AS user_email,
           u.username AS user_username
    ${appointmentJoins}
    JOIN users u ON u.id = a.user_id
    WHERE a.id = ?
  `).get(id) as AppointmentAdminRow | undefined;
});

export interface CreateAppointmentInput {
  user_id: number;
  service_id: number;
  appointment_at: string;
  notes?: string;
}

export const hasActiveAppointmentAt = (appointmentAt: string, excludeId?: number): boolean => {
  const db = getDb();
  let sql = "SELECT COUNT(*) as count FROM appointments WHERE appointment_at = ? AND status IN ('pending', 'confirmed')";
  const params: unknown[] = [appointmentAt];

  if (excludeId !== undefined) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }

  const row = db.prepare(sql).get(...params) as { count: number };
  return row.count > 0;
};

export const createAppointment = (input: CreateAppointmentInput): Appointment => {
  const db = getDb();

  const appointmentAt = input.appointment_at;
  if (new Date(appointmentAt) <= new Date()) {
    throw new Error('No se puede reservar un turno en el pasado');
  }

  if (hasActiveAppointmentAt(appointmentAt)) {
    throw new Error('Ya existe un turno confirmado o pendiente en ese horario');
  }

  const result = db.prepare(`
    INSERT INTO appointments (user_id, service_id, appointment_at, notes, status)
    VALUES (?, ?, ?, ?, 'pending')
  `).run(
    input.user_id,
    input.service_id,
    appointmentAt,
    input.notes ?? null,
  );

  const id = Number(result.lastInsertRowid);
  const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id) as Appointment | undefined;
  if (!appointment) {
    throw new Error('No se encontro el turno recien creado');
  }
  return appointment;
};

export const updateAppointmentStatus = (id: number, status: AppointmentStatus): void => {
  const db = getDb();
  db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, id);
};
