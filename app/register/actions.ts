'use server';

import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { signIn } from '@/lib/auth';
import { createUser, findUserByEmail, findUserByUsername } from '@/lib/auth/users';
import { hashPassword } from '@/lib/utils/password';
import { zodDetails } from '@/lib/utils/api';

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

  if (findUserByEmail(email)) {
    return { error: 'El email ya está registrado', fieldErrors: {} };
  }
  if (findUserByUsername(username)) {
    return { error: 'El nombre de usuario ya está en uso', fieldErrors: {} };
  }

  try {
    createUser({
      email,
      username,
      passwordHash: hashPassword(password),
      role: 'client',
    });
  } catch {
    return { error: 'No se pudo crear la cuenta. Intentá de nuevo.', fieldErrors: {} };
  }

  try {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      return {
        error: 'Cuenta creada, pero no se pudo iniciar sesión. Probá hacer login.',
        fieldErrors: {},
      };
    }

    redirect(callbackUrl ?? '/');
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: 'Cuenta creada, pero no se pudo iniciar sesión. Probá hacer login.',
        fieldErrors: {},
      };
    }
    throw error;
  }
};
