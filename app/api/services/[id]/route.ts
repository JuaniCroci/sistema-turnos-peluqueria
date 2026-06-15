import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import {
  findServiceById,
  updateService,
  softDeleteService,
} from '@/lib/db/services';
import { findCategoryById } from '@/lib/db/categories';
import { errorResponse, zodDetails } from '@/lib/utils/api';

const updateSchema = z.object({
  category_id: z.number().int().positive().optional(),
  name: z.string().min(1, 'El nombre es requerido').max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  duration_minutes: z
    .number()
    .int()
    .positive('La duracion debe ser mayor a 0')
    .optional(),
  price_cents: z
    .number()
    .int()
    .min(0, 'El precio no puede ser negativo')
    .optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isFinite(id)) {
      return errorResponse('VALIDATION_ERROR', 'ID invalido');
    }

    const service = await findServiceById(id);
    if (!service) {
      return errorResponse('NOT_FOUND', 'Servicio no encontrado');
    }

    return NextResponse.json({ data: service });
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Error al obtener servicio');
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return errorResponse('UNAUTHORIZED', 'No autenticado');
    }
    if (session.user.role !== 'admin') {
      return errorResponse('FORBIDDEN', 'Se requiere rol admin');
    }

    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isFinite(id)) {
      return errorResponse('VALIDATION_ERROR', 'ID invalido');
    }

    const existing = await findServiceById(id);
    if (!existing) {
      return errorResponse('NOT_FOUND', 'Servicio no encontrado');
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse('VALIDATION_ERROR', 'Body JSON invalido');
    }

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Datos invalidos',
        zodDetails(parsed.error),
      );
    }

    if (parsed.data.category_id !== undefined) {
      const category = await findCategoryById(parsed.data.category_id);
      if (!category) {
        return errorResponse(
          'VALIDATION_ERROR',
          'La categoria especificada no existe',
        );
      }
    }

    const service = await updateService(id, parsed.data);
    return NextResponse.json({ data: service });
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Error al actualizar servicio');
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return errorResponse('UNAUTHORIZED', 'No autenticado');
    }
    if (session.user.role !== 'admin') {
      return errorResponse('FORBIDDEN', 'Se requiere rol admin');
    }

    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isFinite(id)) {
      return errorResponse('VALIDATION_ERROR', 'ID invalido');
    }

    const existing = await findServiceById(id);
    if (!existing) {
      return errorResponse('NOT_FOUND', 'Servicio no encontrado');
    }

    await softDeleteService(id);
    return NextResponse.json({}, { status: 200 });
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Error al eliminar servicio');
  }
}
