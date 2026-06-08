import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { findAllCategories, createCategory, findCategoryBySlug } from '@/lib/db/categories';
import { errorResponse, zodDetails } from '@/lib/utils/api';

const createSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  slug: z
    .string()
    .min(1, 'El slug es requerido')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Solo minusculas, numeros y guiones'),
  description: z.string().max(500).optional(),
});

export async function GET(): Promise<NextResponse> {
  try {
    const categories = await findAllCategories();
    return NextResponse.json({ data: categories });
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Error al obtener categorias');
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

    const existing = await findCategoryBySlug(parsed.data.slug);
    if (existing) {
      return errorResponse('CONFLICT', 'Ya existe una categoria con ese slug');
    }

    const category = await createCategory(parsed.data);
    return NextResponse.json({ data: category }, { status: 201 });
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Error al crear categoria');
  }
}
