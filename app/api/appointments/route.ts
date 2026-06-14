import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { findAppointments, findAppointmentById, createAppointment, countActiveAppointments } from '@/lib/db/appointments';
import { findServiceById } from '@/lib/db/services';
import { errorResponse, zodDetails } from '@/lib/utils/api';

const listQuerySchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  user_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
});

const createSchema = z.object({
  service_id: z.number().int().positive('El servicio es requerido'),
  appointment_at: z.string().datetime({ message: 'Formato de fecha ISO inválido' }),
  user_id: z.coerce.number().int().positive().optional(),
  client_name: z.string().min(1).max(200).optional(),
  notes: z.string().max(500).optional(),
});

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return errorResponse('UNAUTHORIZED', 'No autenticado');
    }

    const { searchParams } = new URL(request.url);
    const raw: Record<string, string> = {};
    searchParams.forEach((value, key) => { raw[key] = value; });

    const parsed = listQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Parametros de busqueda invalidos', zodDetails(parsed.error));
    }

    const isAdmin = session.user.role === 'admin';

    if (!isAdmin && parsed.data.user_id !== undefined) {
      return errorResponse('FORBIDDEN', 'No puedes filtrar por usuario');
    }

    const userId = isAdmin ? parsed.data.user_id : Number(session.user.id);

    const result = await findAppointments({
      userId,
      status: parsed.data.status,
      from: parsed.data.from,
      to: parsed.data.to,
      page: parsed.data.page,
      limit: parsed.data.limit,
    });

    return NextResponse.json(result);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Error al obtener turnos');
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return errorResponse('UNAUTHORIZED', 'No autenticado');
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse('VALIDATION_ERROR', 'Body JSON invalido');
    }

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Datos invalidos', zodDetails(parsed.error));
    }

    const service = await findServiceById(parsed.data.service_id);
    if (!service) {
      return errorResponse('VALIDATION_ERROR', 'El servicio especificado no existe');
    }

    if (!service.active) {
      return errorResponse('VALIDATION_ERROR', 'El servicio no esta disponible');
    }

    const isAdmin = session.user.role === 'admin';

    if (!isAdmin) {
      const appointmentAt = parsed.data.appointment_at;
      if (new Date(appointmentAt) <= new Date()) {
        return errorResponse('VALIDATION_ERROR', 'No se puede reservar un turno en el pasado');
      }

      const activeCount = await countActiveAppointments(Number(session.user.id));
      if (activeCount >= 2) {
        return errorResponse('LIMIT_EXCEEDED', 'Ya alcanzaste el límite de 2 turnos activos. Cancelá uno para poder reservar otro.');
      }

      try {
        const appointment = await createAppointment({
          user_id: Number(session.user.id),
          service_id: parsed.data.service_id,
          appointment_at: appointmentAt,
          notes: parsed.data.notes,
        });
        return NextResponse.json({ data: appointment }, { status: 201 });
      } catch (e) {
        if (e instanceof Error && e.message.includes('Ya existe un turno')) {
          return errorResponse('CONFLICT', e.message);
        }
        throw e;
      }
    }

    // Admin: puede asignar a un usuario registrado (user_id) o walk-in (client_name)
    const targetUserId = parsed.data.user_id;
    const clientName = parsed.data.client_name;

    if (targetUserId !== undefined && clientName) {
      return errorResponse('VALIDATION_ERROR', 'Elegi cliente registrado O nombre, no ambos');
    }

    if (targetUserId === undefined && !clientName) {
      return errorResponse('VALIDATION_ERROR', 'Debes especificar un cliente registrado o un nombre');
    }

    const appointmentAt = parsed.data.appointment_at;

    try {
      const appointment = await createAppointment({
        user_id: targetUserId ?? null,
        service_id: parsed.data.service_id,
        appointment_at: appointmentAt,
        notes: parsed.data.notes,
        client_name: clientName ?? null,
        skipPastCheck: true,
      });
      return NextResponse.json({ data: appointment }, { status: 201 });
    } catch (e) {
      if (e instanceof Error && e.message.includes('Ya existe un turno')) {
        return errorResponse('CONFLICT', e.message);
      }
      throw e;
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('Ya existe un turno')) {
      return errorResponse('CONFLICT', 'Ya existe un turno en ese horario');
    }
    return errorResponse('INTERNAL_ERROR', 'Error al crear turno');
  }
}
