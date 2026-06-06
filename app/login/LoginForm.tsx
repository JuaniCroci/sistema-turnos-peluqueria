'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/Button/Button';
import { FormField } from '@/components/FormField/FormField';
import { Input } from '@/components/Input/Input';
import { loginAction, type LoginState } from './actions';
import styles from '../auth.module.css';

const INITIAL_STATE: LoginState = { error: null };

export const LoginForm = () => {
  const searchParams = useSearchParams();
  const [state, formAction, isPending] = useActionState(loginAction, INITIAL_STATE);

  const registered = searchParams.get('registered') === '1';
  const callbackUrl = searchParams.get('callbackUrl');
  const registerHref = callbackUrl
    ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : '/register';

  return (
    <form action={formAction} className={styles.form} noValidate>
      {registered ? (
        <div className={styles.success}>
          <CheckCircle2 size={16} className={styles.errorIcon} aria-hidden="true" />
          <span>Cuenta creada. Iniciá sesión para continuar.</span>
        </div>
      ) : null}

      {state.error ? (
        <div className={styles.error} role="alert">
          <AlertCircle size={16} className={styles.errorIcon} aria-hidden="true" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <FormField label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@email.com"
        />
      </FormField>

      <FormField label="Contraseña" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          placeholder="••••••••"
        />
      </FormField>

      <Button type="submit" variant="primary" fullWidth loading={isPending}>
        {isPending ? 'Ingresando…' : 'Ingresar'}
      </Button>

      <p className={styles.footer}>
        ¿No tenés cuenta?{' '}
        <Link href={registerHref} className={styles.footerLink}>
          Registrate
        </Link>
      </p>
    </form>
  );
};
