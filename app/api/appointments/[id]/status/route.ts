import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { findAppointmentById, updateAppointmentStatus, hasActiveAppointmentAt } from '@/lib/db/appointments';
import { errorResponse, zodDetails } from '@/lib/utils/api';
import type { AppointmentStatus } from '@/lib/types';

const patchSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']),
});

const CLIENT_ALLOWED: AppointmentStatus[] = ['cancelled'];

const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  cancelled: ['pending'],
  completed: [],
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return errorResponse('UNAUTHORIZED', 'No autenticado');
    }

    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isFinite(id)) {
      return errorResponse('VALIDATION_ERROR', 'ID invalido');
    }

    const appointment = await findAppointmentById(id);
    if (!appointment) {
      return errorResponse('NOT_FOUND', 'Turno no encontrado');
    }

    const isAdmin = session.user.role === 'admin';

    if (!isAdmin && appointment.user_id !== Number(session.user.id)) {
      return errorResponse('FORBIDDEN', 'No puedes modificar este turno');
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse('VALIDATION_ERROR', 'Body JSON invalido');
    }

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Datos invalidos', zodDetails(parsed.error));
    }

    const newStatus = parsed.data.status;

    if (!isAdmin && !CLIENT_ALLOWED.includes(newStatus)) {
      return errorResponse('FORBIDDEN', 'Solo puedes cancelar tus turnos');
    }

    const allowedTransitions = ALLOWED_TRANSITIONS[appointment.status];
    if (!allowedTransitions.includes(newStatus)) {
      return errorResponse(
        'VALIDATION_ERROR',
        `No se puede cambiar de "${appointment.status}" a "${newStatus}"`,
      );
    }

    // Al reabrir un turno cancelado, verificar que el slot siga disponible
    if (newStatus === 'pending' && appointment.status === 'cancelled') {
      const slotTaken = await hasActiveAppointmentAt(appointment.appointment_at, id);
      if (slotTaken) {
        return errorResponse('CONFLICT', 'El horario ya fue ocupado por otro turno');
      }
    }

    await updateAppointmentStatus(id, newStatus);
    // No llamar a findAppointmentById de nuevo: React.cache() devuelve
    // el resultado memoizado de la llamada anterior (stale).
    const updated = { ...appointment, status: newStatus };

    return NextResponse.json({ data: updated });
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Error al actualizar turno');
  }
}
