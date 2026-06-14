'use server';

import { headers } from 'next/headers';
import { AuthError, CredentialsSignin } from 'next-auth';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { signIn } from '@/lib/auth';
import { createUser, findUserByEmail, findUserByUsername, countRecentRegistrationsByIp, MAX_REGISTRATIONS_PER_IP } from '@/lib/auth/users';
import { hashPassword } from '@/lib/utils/password';
import { zodDetails } from '@/lib/utils/api';
import { verifyRecaptchaToken, RECAPTCHA_THRESHOLD } from '@/lib/utils/recaptcha';

const registerSchema = z.object({
  email: z.string().email('Email inválido').max(120),
  username: z
    .string()
    .min(3, 'El usuario debe tener al menos 3 caracteres')
    .max(40, 'El usuario debe tener como maximo 40 caracteres')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Solo letras, numeros, guion, guion bajo y punto'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(200),
});

const callbackUrlPattern = z.string().startsWith('/').max(500);

export interface RegisterState {
  error: string | null;
  fieldErrors: Partial<Record<'email' | 'username' | 'password', string>>;
}

export const registerAction = async (
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> => {
  const parsed = registerSchema.safeParse({
    email: String(formData.get('email') ?? '').trim(),
    username: String(formData.get('username') ?? '').trim(),
    password: String(formData.get('password') ?? ''),
  });

  if (!parsed.success) {
    const details = zodDetails(parsed.error);
    const fieldErrors: RegisterState['fieldErrors'] = {};
    for (const d of details) {
      if (d.path === 'email' || d.path === 'username' || d.path === 'password') {
        fieldErrors[d.path] = d.message;
      }
    }
    return {
      error: 'Revisá los campos marcados',
      fieldErrors,
    };
  }

  const { email, username, password } = parsed.data;
  const rawCallbackUrl = String(formData.get('callbackUrl') ?? '').trim();
  const callbackUrl = callbackUrlPattern.safeParse(rawCallbackUrl).data;

  const recaptchaToken = String(formData.get('g-recaptcha-response') ?? '');
  if (recaptchaToken) {
    const result = await verifyRecaptchaToken(recaptchaToken);
    if (!result.success || result.score < RECAPTCHA_THRESHOLD) {
      return { error: 'No se pudo verificar que seas humano. Intentá de nuevo.', fieldErrors: {} };
    }
  }

  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') ?? headersList.get('x-real-ip') ?? 'unknown';

  if (await findUserByEmail(email)) {
    return { error: 'El email ya está registrado', fieldErrors: {} };
  }
  if (await findUserByUsername(username)) {
    return { error: 'El nombre de usuario ya está en uso', fieldErrors: {} };
  }

  const recentCount = await countRecentRegistrationsByIp(ip);
  if (recentCount >= MAX_REGISTRATIONS_PER_IP) {
    return { error: 'Demasiadas cuentas creadas desde esta IP. Intentá de nuevo más tarde.', fieldErrors: {} };
  }

  try {
    await createUser({
      email,
      username,
      passwordHash: hashPassword(password),
      role: 'client',
      ip_address: ip,
    });
  } catch {
    return { error: 'No se pudo crear la cuenta. Intentá de nuevo.', fieldErrors: {} };
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    redirect(callbackUrl ?? '/');
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      return {
        error: 'Cuenta creada, pero no se pudo iniciar sesión. Probá hacer login.',
        fieldErrors: {},
      };
    }
    if (error instanceof AuthError) {
      return {
        error: 'No se pudo iniciar sesion. Intentá de nuevo.',
        fieldErrors: {},
      };
    }
    throw error;
  }
};
