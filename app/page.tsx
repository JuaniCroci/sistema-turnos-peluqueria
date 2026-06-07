import Link from 'next/link';
import { Calendar, Clock, UserCheck } from 'lucide-react';
import { auth } from '@/lib/auth';
import styles from './page.module.css';

export default async function HomePage() {
  const session = await auth();
  const isLoggedIn = Boolean(session?.user);

  return (
    <main className={styles.root}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.title}>
            Reservá tu turno en segundos.
          </h1>
          <p className={styles.subtitle}>
            Elegí el servicio, la fecha y listo. Confirmación al instante.
          </p>
          <div className={styles.actions}>
            {isLoggedIn ? (
              <Link href="/mis-turnos/nuevo" className={styles.primaryAction}>
                Reservar turno
              </Link>
            ) : (
              <Link href="/register" className={styles.primaryAction}>
                Crear cuenta
              </Link>
            )}
            <Link href="/servicios" className={styles.ghostAction}>
              Ver servicios
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.howItWorks} aria-labelledby="how-title">
        <div className={styles.howInner}>
          <h2 id="how-title" className={styles.sectionTitle}>
            Cómo funciona
          </h2>
          <ol className={styles.steps}>
            <li className={styles.step}>
              <Calendar size={20} strokeWidth={1.5} aria-hidden="true" />
              <span>Elegí el servicio</span>
            </li>
            <li className={styles.step}>
              <Clock size={20} strokeWidth={1.5} aria-hidden="true" />
              <span>Seleccioná el horario</span>
            </li>
            <li className={styles.step}>
              <UserCheck size={20} strokeWidth={1.5} aria-hidden="true" />
              <span>Confirmá y listo</span>
            </li>
          </ol>
        </div>
      </section>
    </main>
  );
}
