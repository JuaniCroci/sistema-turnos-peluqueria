import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  findCategoryBySlug,
  findCategoryById,
  categoryHasServices,
  deleteCategoryById,
} from '@/lib/db/categories';
import { errorResponse } from '@/lib/utils/api';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  try {
    const { slug } = await params;
    const category = await findCategoryBySlug(slug);
    if (!category) {
      return errorResponse('NOT_FOUND', 'Categoria no encontrada');
    }
    return NextResponse.json({ data: category });
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Error al obtener categoria');
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return errorResponse('UNAUTHORIZED', 'No autenticado');
    }
    if (session.user.role !== 'admin') {
      return errorResponse('FORBIDDEN', 'Se requiere rol admin');
    }

    const { slug } = await params;
    const id = Number(slug);
    const category = Number.isFinite(id)
      ? await findCategoryById(id)
      : await findCategoryBySlug(slug);
    if (!category) {
      return errorResponse('NOT_FOUND', 'Categoria no encontrada');
    }

    if (await categoryHasServices(category.id)) {
      return errorResponse(
        'CONFLICT',
        'No se puede eliminar una categoria con servicios asociados',
      );
    }

    await deleteCategoryById(category.id);
    return NextResponse.json({}, { status: 200 });
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Error al eliminar categoria');
  }
}
