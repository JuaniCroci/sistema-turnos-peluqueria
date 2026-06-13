'use server';

import { AuthError, CredentialsSignin } from 'next-auth';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { signIn } from '@/lib/auth';

export interface LoginState {
  error: string | null;
}

const callbackUrlPattern = z.string().startsWith('/').max(500);

export const loginAction = async (
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> => {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const rawCallbackUrl = String(formData.get('callbackUrl') ?? '').trim();

  if (!email || !password) {
    return { error: 'Email y contraseña son obligatorios' };
  }

  const callbackUrl = callbackUrlPattern.safeParse(rawCallbackUrl).data;

  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    redirect(callbackUrl ?? '/');
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      return { error: 'Email o contraseña incorrectos' };
    }
    if (error instanceof AuthError) {
      return { error: 'No se pudo iniciar sesion' };
    }
    throw error;
  }
};
