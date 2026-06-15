import Link from 'next/link';
import { Clock, ArrowRight } from 'lucide-react';
import { formatDuration, formatPrice } from '@/lib/utils/format';
import type { Service } from '@/lib/types';
import styles from './ServiceCard.module.css';

interface ServiceCardProps {
  service: Service;
}

export const ServiceCard = ({ service }: ServiceCardProps) => {
  return (
    <Link href={`/servicios/${service.id}`} className={styles.row}>
      <div className={styles.main}>
        <h3 className={styles.name}>{service.name}</h3>
        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <Clock size={14} aria-hidden="true" />
            {formatDuration(service.duration_minutes)}
          </span>
          <span className={styles.price}>
            {formatPrice(service.price_cents)}
          </span>
        </div>
      </div>
      <span className={styles.cta} aria-hidden="true">
        <ArrowRight size={16} />
      </span>
    </Link>
  );
};
