import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getWeeklyAvailableSlots } from '@/lib/db/appointments';
import { errorResponse, zodDetails } from '@/lib/utils/api';
import { getMonday } from '@/lib/utils/datetime';
import {
  type TimeBlock,
  BUSINESS_NAME,
  BUSINESS_PHONE,
  BUSINESS_INSTAGRAM,
} from '@/lib/config/business';

const timeBlockSchema = z.object({
  apertura: z.string().regex(/^\d{2}:\d{2}$/),
  cierre: z.string().regex(/^\d{2}:\d{2}$/),
});

const querySchema = z.object({
  desde: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha invalido (YYYY-MM-DD)')
    .optional(),
  lunVie: z.string().optional(),
  sab: z.string().optional(),
});

function parseBlocks(raw: string | undefined): TimeBlock[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    const arr = z.array(timeBlockSchema).safeParse(parsed);
    return arr.success ? arr.data : undefined;
  } catch {
    return undefined;
  }
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
    const lunVieBlocks = parseBlocks(parsed.data.lunVie);
    const sabBlocks = parseBlocks(parsed.data.sab);

    const result = await getWeeklyAvailableSlots(
      monday,
      lunVieBlocks,
      sabBlocks,
    );

    return NextResponse.json({
      ...result,
      negocio: {
        nombre: BUSINESS_NAME,
        telefono: BUSINESS_PHONE,
        instagram: BUSINESS_INSTAGRAM,
      },
    });
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Error al obtener disponibilidad');
  }
}
