'use server';

import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
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
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      return { error: 'Email o contraseña incorrectos' };
    }

    redirect('/');
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'No se pudo iniciar sesion' };
    }
    throw error;
  }
};
