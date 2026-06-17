import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getWeeklyAvailableSlots } from '@/lib/db/appointments';
import { errorResponse, zodDetails } from '@/lib/utils/api';

const querySchema = z.object({
  desde: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha invalido (YYYY-MM-DD)')
    .optional(),
  lunVieApertura: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  lunVieCierre: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  sabApertura: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  sabCierre: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
});

function getMonday(desde: string): string {
  const d = new Date(desde + 'T00:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return errorResponse('UNAUTHORIZED', 'No autenticado');
    }
    if (session.user.role !== 'admin') {
      return errorResponse('FORBIDDEN', 'Se requiere rol admin');
    }

    const { searchParams } = new URL(request.url);
    const raw: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      raw[key] = value;
    });

    const parsed = querySchema.safeParse(raw);
    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Parametros invalidos',
        zodDetails(parsed.error),
      );
    }

    const desde = parsed.data.desde ?? new Date().toISOString().slice(0, 10);
    const monday = getMonday(desde);

    const blocksLunVie =
      parsed.data.lunVieApertura && parsed.data.lunVieCierre
        ? [
            {
              apertura: parsed.data.lunVieApertura,
              cierre: parsed.data.lunVieCierre,
            },
          ]
        : undefined;

    const blocksSab =
      parsed.data.sabApertura && parsed.data.sabCierre
        ? [{ apertura: parsed.data.sabApertura, cierre: parsed.data.sabCierre }]
        : undefined;

    const result = await getWeeklyAvailableSlots(
      monday,
      blocksLunVie,
      blocksSab,
    );

    return NextResponse.json(result);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Error al obtener disponibilidad');
  }
}
