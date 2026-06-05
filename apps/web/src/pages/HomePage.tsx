import { useNavigate } from 'react-router-dom';
import {
  CalendarPlus,
  Scissors,
  Search,
  CalendarDays,
  CircleCheck,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../components/Button/Button';
import { ServiceCard } from '../components/ServiceCard/ServiceCard';
import { Spinner } from '../components/Spinner/Spinner';
import { Card } from '../components/Card/Card';
import { useFeaturedServices } from '../hooks/useServices';
import styles from './HomePage.module.css';

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

export const HomePage = () => {
  const navigate = useNavigate();
  const { data: services, isLoading, isError, refetch } = useFeaturedServices();

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
            <Button
              size="lg"
              iconLeft={<CalendarPlus size={18} />}
              onClick={() => navigate('/mis-turnos/nuevo')}
            >
              Reservá tu turno
            </Button>
            <Button
              variant="secondary"
              size="lg"
              iconLeft={<Scissors size={18} />}
              onClick={() => navigate('/servicios')}
            >
              Ver servicios
            </Button>
          </div>
        </div>
        <div className={styles.heroGlow} aria-hidden="true" />
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Servicios destacados</h2>
          <button
            type="button"
            className={styles.sectionLink}
            onClick={() => navigate('/servicios')}
          >
            Ver todos
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </header>

        {isLoading ? (
          <div className={styles.grid}>
            {[0, 1, 2, 3].map((i) => (
              <Card key={i} className={styles.skeleton}>
                <div className={styles.skeletonLine} />
                <div className={[styles.skeletonLine, styles.skeletonLineShort].join(' ')} />
                <div className={styles.skeletonFooter}>
                  <Spinner size="sm" />
                </div>
              </Card>
            ))}
          </div>
        ) : isError ? (
          <Card className={styles.errorCard}>
            <AlertCircle size={20} aria-hidden="true" />
            <span>No pudimos cargar los servicios.</span>
            <Button variant="secondary" size="sm" onClick={() => void refetch()}>
              Reintentar
            </Button>
          </Card>
        ) : services && services.length > 0 ? (
          <div className={styles.grid}>
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : null}
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
          <Button
            size="lg"
            iconRight={<ArrowRight size={18} />}
            onClick={() => navigate('/servicios')}
          >
            Explorar servicios
          </Button>
        </Card>
      </section>
    </>
  );
};
