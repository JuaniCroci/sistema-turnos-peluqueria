'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/Button/Button';
import { FormField } from '@/components/FormField/FormField';
import { Input } from '@/components/Input/Input';
import { registerAction, type RegisterState } from './actions';
import styles from '../auth.module.css';

const INITIAL_STATE: RegisterState = { error: null, fieldErrors: {} };

export const RegisterForm = () => {
  const [state, formAction, isPending] = useActionState(registerAction, INITIAL_STATE);

  return (
    <form action={formAction} className={styles.form} noValidate>
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

      <p className={styles.footer}>
        ¿Ya tenés cuenta?{' '}
        <Link href="/login" className={styles.footerLink}>
          Iniciar sesión
        </Link>
      </p>
    </form>
  );
};
