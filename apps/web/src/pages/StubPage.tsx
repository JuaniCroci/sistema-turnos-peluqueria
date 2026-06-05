import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Card } from '../components/Card/Card';
import { Button } from '../components/Button/Button';
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
        <Link to="/" className={styles.homeLink}>
          <Button variant="secondary" iconLeft={<Home size={16} />}>
            Volver al inicio
          </Button>
        </Link>
      </Card>
    </div>
  );
};
