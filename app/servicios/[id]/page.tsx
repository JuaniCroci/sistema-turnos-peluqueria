import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock, Tag, ArrowLeft, Calendar } from 'lucide-react';
import { findServiceById } from '@/lib/db/services';
import { findCategoryById } from '@/lib/db/categories';
import { formatDuration, formatPrice } from '@/lib/utils/format';
import { auth } from '@/lib/auth';
import styles from './ServiceDetail.module.css';

export async function generateMetadata({ params }: ServiceDetailPageProps): Promise<Metadata> {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return { title: 'Servicio no encontrado' };

  const service = await findServiceById(id);
  if (!service || !service.active) return { title: 'Servicio no encontrado' };

  return {
    title: `${service.name} · Sistema de Turnos — Peluquería`,
    description: service.description ?? `Servicio de ${service.name} en nuestra peluquería.`,
  };
}

interface ServiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    notFound();
  }

  const service = await findServiceById(id);
  if (!service || !service.active) {
    notFound();
  }

  const [category, session] = await Promise.all([
    findCategoryById(service.category_id),
    auth(),
  ]);
  const isLoggedIn = Boolean(session?.user);

  const reserveHref = isLoggedIn
    ? `/mis-turnos/nuevo?servicio=${service.id}`
    : `/login?callbackUrl=/mis-turnos/nuevo?servicio=${service.id}`;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/servicios" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          Volver a servicios
        </Link>

        <div className={styles.card}>
          <div className={styles.header}>
            <div>
              {category && (
                <span className={styles.categoryBadge}>
                  <Tag size={12} aria-hidden="true" />
                  {category.name}
                </span>
              )}
              <h1 className={styles.title}>{service.name}</h1>
            </div>
          </div>

          {service.description && (
            <p className={styles.description}>{service.description}</p>
          )}

          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <Clock size={18} aria-hidden="true" />
              <div>
                <span className={styles.metaLabel}>Duracion</span>
                <span className={styles.metaValue}>{formatDuration(service.duration_minutes)}</span>
              </div>
            </div>

            <div className={styles.metaItem}>
              <Tag size={18} aria-hidden="true" />
              <div>
                <span className={styles.metaLabel}>Precio</span>
                <span className={styles.metaValuePrice}>{formatPrice(service.price_cents)}</span>
              </div>
            </div>
          </div>

          <Link href={reserveHref} className={styles.reserveBtn}>
            <Calendar size={18} aria-hidden="true" />
            {isLoggedIn ? 'Reservar turno' : 'Iniciar sesion para reservar'}
          </Link>
        </div>
      </div>
    </div>
  );
}
