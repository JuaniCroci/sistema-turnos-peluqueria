import type { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, CalendarPlus, Share2, Clock, UserCheck } from 'lucide-react';
import { auth } from '@/lib/auth';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Inicio · Sistema de Turnos — The Bunker',
  description: 'Reservá tu turno en The Bunker en segundos.',
};

export default async function HomePage() {
  const session = await auth();
  const isLoggedIn = Boolean(session?.user);
  const isAdmin = session?.user?.role === 'admin';

  if (isAdmin) {
    return (
      <main className={styles.root}>
        <section className={styles.adminDashboard}>
          <div className={styles.adminInner}>
            <h1 className={styles.adminTitle}>Panel de administración</h1>
            <p className={styles.adminSubtitle}>
              Gestioná turnos y servicios desde un solo lugar.
            </p>
            <div className={styles.adminGrid}>
              <Link href="/admin/turnos" className={styles.adminCard}>
                <Calendar size={24} aria-hidden="true" />
                <span className={styles.adminCardTitle}>Turnos agendados</span>
                <span className={styles.adminCardDesc}>
                  Ver y gestionar turnos
                </span>
              </Link>
              <Link href="/admin/turnos/nuevo" className={styles.adminCard}>
                <CalendarPlus size={24} aria-hidden="true" />
                <span className={styles.adminCardTitle}>Agendar turno</span>
                <span className={styles.adminCardDesc}>
                  Registrar turno manual
                </span>
              </Link>
              <Link href="/admin/exportar" className={styles.adminCard}>
                <Share2 size={24} aria-hidden="true" />
                <span className={styles.adminCardTitle}>Exportar turnos</span>
                <span className={styles.adminCardDesc}>
                  Generar PNG semanal para Stories
                </span>
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.root}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.title}>Reservá tu turno en segundos.</h1>
          <p className={styles.subtitle}>
            Elegí el servicio, la fecha y listo. Confirmación al instante.
          </p>
          <div className={styles.actions}>
            {isLoggedIn ? (
              <Link href="/mis-turnos/nuevo" className={styles.primaryAction}>
                Reservar turno
              </Link>
            ) : (
              <>
                <Link href="/login" className={styles.primaryAction}>
                  Iniciar sesión
                </Link>
                <Link href="/register" className={styles.ghostAction}>
                  Crear cuenta
                </Link>
              </>
            )}
          </div>
          {!isLoggedIn && (
            <Link href="/servicios" className={styles.secondaryLink}>
              Ver servicios
            </Link>
          )}
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
