import { redirect } from 'next/navigation';
import { Card } from '@/components/Card/Card';
import { auth } from '@/lib/auth';
import { RegisterForm } from './RegisterForm';
import styles from '../auth.module.css';

export const metadata = {
  title: 'Crear cuenta · Peluquería',
};

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) {
    redirect('/');
  }

  return (
    <div className={styles.wrapper}>
      <Card padding="lg" className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>Crear cuenta</h1>
          <p className={styles.subtitle}>
            Registrate para reservar turnos y ver tu historial. La cuenta se crea como cliente.
          </p>
        </header>
        <RegisterForm />
      </Card>
    </div>
  );
}
