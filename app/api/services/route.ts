import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { findServices, createService } from '@/lib/db/services';
import { findCategoryById } from '@/lib/db/categories';
import { errorResponse, zodDetails } from '@/lib/utils/api';

const listQuerySchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  includeInactive: z.coerce.number().pipe(z.literal(1)).optional(),
});

const createSchema = z.object({
  category_id: z.number().int().positive('La categoria es requerida'),
  name: z.string().min(1, 'El nombre es requerido').max(200),
  description: z.string().max(1000).optional(),
  duration_minutes: z.number().int().positive('La duracion debe ser mayor a 0'),
  price_cents: z.number().int().min(0, 'El precio no puede ser negativo'),
});

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const raw: Record<string, string> = {};
    searchParams.forEach((value, key) => { raw[key] = value; });

    const parsed = listQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Parametros de busqueda invalidos', zodDetails(parsed.error));
    }

    const session = await auth();
    const isAdmin = session?.user?.role === 'admin';
    const includeInactive = isAdmin && parsed.data.includeInactive === 1;

    const result = findServices({
      categorySlug: parsed.data.category,
      q: parsed.data.q,
      page: parsed.data.page,
      limit: parsed.data.limit,
      includeInactive,
    });

    return NextResponse.json(result);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Error al obtener servicios');
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return errorResponse('UNAUTHORIZED', 'No autenticado');
    }
    if (session.user.role !== 'admin') {
      return errorResponse('FORBIDDEN', 'Se requiere rol admin');
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

    const category = findCategoryById(parsed.data.category_id);
    if (!category) {
      return errorResponse('VALIDATION_ERROR', 'La categoria especificada no existe');
    }

    const service = createService(parsed.data);
    return NextResponse.json({ data: service }, { status: 201 });
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Error al crear servicio');
  }
}
