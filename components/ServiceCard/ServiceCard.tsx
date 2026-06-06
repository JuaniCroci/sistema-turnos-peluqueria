import Link from 'next/link';
import { Clock, ArrowRight } from 'lucide-react';
import { Card } from '@/components/Card/Card';
import { Badge } from '@/components/Badge/Badge';
import { formatDuration, formatPrice } from '@/lib/utils/format';
import type { Service } from '@/lib/types';
import styles from './ServiceCard.module.css';

interface ServiceCardProps {
  service: Service;
}

export const ServiceCard = ({ service }: ServiceCardProps) => {
  return (
    <Link href={`/servicios/${service.id}`} className={styles.link}>
      <Card hoverable className={styles.card}>
        <div className={styles.body}>
          <h3 className={styles.name}>{service.name}</h3>
          {service.description ? (
            <p className={styles.description}>{service.description}</p>
          ) : null}
          <div className={styles.meta}>
            <span className={styles.metaItem}>
              <Clock size={14} aria-hidden="true" />
              {formatDuration(service.duration_minutes)}
            </span>
            <Badge tone="accent" size="sm">
              {formatPrice(service.price_cents)}
            </Badge>
          </div>
        </div>
        <span className={styles.cta}>
          Ver detalle
          <ArrowRight size={14} aria-hidden="true" />
        </span>
      </Card>
    </Link>
  );
};
