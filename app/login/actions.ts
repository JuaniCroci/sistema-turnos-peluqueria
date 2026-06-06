'use server';

import { AuthError } from 'next-auth';
import { signIn } from '@/lib/auth';

export interface LoginState {
  error: string | null;
}

export const loginAction = async (
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> => {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Email y contraseña son obligatorios' };
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: '/',
    });
    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === 'CredentialsSignin') {
        return { error: 'Email o contraseña incorrectos' };
      }
      return { error: 'No se pudo iniciar sesion' };
    }
    throw error;
  }
};
