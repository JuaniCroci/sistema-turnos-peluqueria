import Link from 'next/link';
import { CalendarPlus, Scissors, Search, CalendarDays, CircleCheck, ArrowRight } from 'lucide-react';
import { Card } from '@/components/Card/Card';
import styles from './page.module.css';

const STEPS = [
  {
    icon: Search,
    title: 'Elegí el servicio',
    description: 'Corte, barba, coloración o tratamiento. Vés duración y precio antes de reservar.',
  },
  {
    icon: CalendarDays,
    title: 'Elegí día y hora',
    description: 'Reservás online en el horario que te quede cómodo, sin llamadas.',
  },
  {
    icon: CircleCheck,
    title: 'Te confirmamos',
    description: 'Te queda el turno agendado. Lo cancelás o reprogramás cuando quieras.',
  },
];

export default function HomePage() {
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>Sistema de turnos online</span>
          <h1 className={styles.title}>
            Tu peluquería,
            <br />
            <span className={styles.titleAccent}>a tu horario.</span>
          </h1>
          <p className={styles.subtitle}>
            Reservá tu turno en segundos. Sin llamadas, sin esperas. Corte, barba,
            coloración y más, en un solo lugar.
          </p>
          <div className={styles.heroActions}>
            <Link href="/mis-turnos/nuevo" className={styles.buttonPrimary}>
              <CalendarPlus size={18} aria-hidden="true" />
              <span>Reservá tu turno</span>
            </Link>
            <Link href="/servicios" className={styles.buttonSecondary}>
              <Scissors size={18} aria-hidden="true" />
              <span>Ver servicios</span>
            </Link>
          </div>
        </div>
        <div className={styles.heroGlow} aria-hidden="true" />
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Cómo funciona</h2>
        </header>
        <div className={styles.steps}>
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Card key={i} padding="lg" className={styles.step}>
                <span className={styles.stepNumber}>0{i + 1}</span>
                <span className={styles.stepIcon} aria-hidden="true">
                  <Icon size={24} />
                </span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDescription}>{step.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className={styles.ctaSection}>
        <Card padding="lg" className={styles.ctaCard}>
          <h2 className={styles.ctaTitle}>Listo para tu próximo turno</h2>
          <p className={styles.ctaText}>
            Mirá los servicios disponibles y elegí el que más te guste.
          </p>
          <Link href="/servicios" className={styles.buttonPrimary}>
            <span>Explorar servicios</span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </Card>
      </section>
    </>
  );
}
