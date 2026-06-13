import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getOccupiedSlots } from '@/lib/db/appointments';
import { errorResponse, zodDetails } from '@/lib/utils/api';

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha invalido (YYYY-MM-DD)'),
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

    const parsed = querySchema.safeParse(raw);
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Parametros invalidos', zodDetails(parsed.error));
    }

    const slots = await getOccupiedSlots(parsed.data.date);

    return NextResponse.json({ slots });
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Error al obtener horarios ocupados');
  }
}
