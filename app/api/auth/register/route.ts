import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createUser,
  findUserByEmail,
  findUserByUsername,
  countRecentRegistrationsByIp,
  MAX_REGISTRATIONS_PER_IP,
} from '@/lib/auth/users';
import { hashPassword } from '@/lib/utils/password';
import { errorResponse, zodDetails } from '@/lib/utils/api';
import {
  verifyRecaptchaToken,
  RECAPTCHA_THRESHOLD,
} from '@/lib/utils/recaptcha';
import { getClientIp } from '@/lib/utils/clientIp';

const registerSchema = z.object({
  email: z.string().email('Email inválido').max(120, 'Email demasiado largo'),
  username: z
    .string()
    .min(3, 'El usuario debe tener al menos 3 caracteres')
    .max(40, 'El usuario debe tener como maximo 40 caracteres')
    .regex(
      /^[a-zA-Z0-9_.-]+$/,
      'Solo letras, numeros, guion, guion bajo y punto',
    ),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(200),
  recaptcha_token: z.string().optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('VALIDATION_ERROR', 'Body JSON inválido');
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Datos inválidos',
      zodDetails(parsed.error),
    );
  }

  const { email, username, password } = parsed.data;

  const isRecaptchaRequired = process.env.RECAPTCHA_REQUIRED === 'true';
  if (isRecaptchaRequired && !parsed.data.recaptcha_token) {
    return errorResponse(
      'VALIDATION_ERROR',
      'No se pudo verificar que seas humano',
    );
  }

  if (parsed.data.recaptcha_token) {
    const result = await verifyRecaptchaToken(parsed.data.recaptcha_token);
    if (!result.success || result.score < RECAPTCHA_THRESHOLD) {
      return errorResponse(
        'VALIDATION_ERROR',
        'No se pudo verificar que seas humano',
      );
    }
  }

  const ip = getClientIp(request.headers);

  if (await findUserByEmail(email)) {
    return errorResponse('CONFLICT', 'El email ya esta registrado');
  }
  if (await findUserByUsername(username)) {
    return errorResponse('CONFLICT', 'El nombre de usuario ya esta en uso');
  }

  const recentCount = await countRecentRegistrationsByIp(ip);
  if (recentCount >= MAX_REGISTRATIONS_PER_IP) {
    return errorResponse('RATE_LIMITED', 'Demasiadas cuentas desde esta IP');
  }

  const passwordHash = hashPassword(password);
  const user = await createUser({
    email,
    username,
    passwordHash,
    role: 'client',
    ip_address: ip,
  });

  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    },
    { status: 201 },
  );
}
