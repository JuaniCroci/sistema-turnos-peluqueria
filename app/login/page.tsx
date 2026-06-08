import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@/components/Card/Card';
import { Spinner } from '@/components/Spinner/Spinner';
import { auth } from '@/lib/auth';
import { LoginForm } from './LoginForm';
import styles from '../auth.module.css';

export const metadata = {
  title: 'Ingresar · Peluquería',
};

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { callbackUrl } = await searchParams;
  const session = await auth();
  if (session?.user) {
    redirect(callbackUrl && callbackUrl.startsWith('/') ? callbackUrl : '/');
  }

  return (
    <div className={styles.wrapper}>
      <Card padding="lg" className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>Iniciar sesión</h1>
          <p className={styles.subtitle}>
            Ingresá con tu email y contraseña para reservar turnos y ver tu historial.
          </p>
        </header>
        <Suspense fallback={<Spinner />}>
          <LoginForm />
        </Suspense>
      </Card>
    </div>
  );
}
