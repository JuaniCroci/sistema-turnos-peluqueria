import Link from 'next/link';
import { Home } from 'lucide-react';
import { Card } from '@/components/Card/Card';
import styles from './StubPage.module.css';

interface StubPageProps {
  title: string;
  milestone: string;
  description: string;
}

export const StubPage = ({ title, milestone, description }: StubPageProps) => {
  return (
    <div className={styles.wrapper}>
      <Card padding="lg" className={styles.card}>
        <span className={styles.eyebrow}>{milestone}</span>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
        <Link href="/" className={styles.homeLink}>
          <span className={styles.button}>
            <Home size={16} aria-hidden="true" />
            Volver al inicio
          </span>
        </Link>
      </Card>
    </div>
  );
};
