import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { findAppointmentById, deleteAppointment } from '@/lib/db/appointments';
import { errorResponse } from '@/lib/utils/api';

export async function GET(
  _request: Request,
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
      return errorResponse('FORBIDDEN', 'No puedes ver este turno');
    }

    return NextResponse.json({ data: appointment });
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Error al obtener turno');
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return errorResponse('FORBIDDEN', 'Se requiere rol admin');
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
    if (appointment.status !== 'cancelled') {
      return errorResponse(
        'VALIDATION_ERROR',
        'Solo se pueden eliminar turnos cancelados',
      );
    }

    await deleteAppointment(id);
    return NextResponse.json({}, { status: 200 });
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Error al eliminar turno');
  }
}
