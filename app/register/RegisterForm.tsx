'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/Button/Button';
import { FormField } from '@/components/FormField/FormField';
import { Input } from '@/components/Input/Input';
import { registerAction, type RegisterState } from './actions';
import styles from '../auth.module.css';

const INITIAL_STATE: RegisterState = { error: null, fieldErrors: {} };

interface RegisterFormProps {
  callbackUrl?: string;
}

export const RegisterForm = ({ callbackUrl }: RegisterFormProps) => {
  const [state, formAction, isPending] = useActionState(registerAction, INITIAL_STATE);

  return (
    <form action={formAction} className={styles.form} noValidate>
      {callbackUrl && (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      )}
      {state.error ? (
        <div className={styles.error} role="alert">
          <AlertCircle size={16} className={styles.errorIcon} aria-hidden="true" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <FormField label="Email" htmlFor="email" error={state.fieldErrors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@email.com"
        />
      </FormField>

      <FormField
        label="Nombre de usuario"
        htmlFor="username"
        hint="3 a 40 caracteres. Letras, números, guion y guion bajo."
        error={state.fieldErrors.username}
      >
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          minLength={3}
          maxLength={40}
          placeholder="juani"
        />
      </FormField>

      <FormField label="Contraseña" htmlFor="password" error={state.fieldErrors.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          placeholder="••••••••"
        />
      </FormField>

      <Button type="submit" variant="primary" fullWidth loading={isPending}>
        {isPending ? 'Creando cuenta…' : 'Crear cuenta'}
      </Button>

      <div className={styles.divider}>
        <span>O</span>
      </div>

      <Button
        variant="outline"
        fullWidth
        onClick={() => signIn('google', { redirectTo: callbackUrl ?? '/' })}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Registrarse con Google
      </Button>

      <p className={styles.footer}>
        ¿Ya tenés cuenta?{' '}
        <Link href="/login" className={styles.footerLink}>
          Iniciar sesión
        </Link>
      </p>
    </form>
  );
};
