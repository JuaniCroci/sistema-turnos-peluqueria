import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Card } from '../components/Card/Card';
import { Button } from '../components/Button/Button';
import styles from './NotFoundPage.module.css';

export const NotFoundPage = () => {
  return (
    <div className={styles.wrapper}>
      <Card padding="lg" className={styles.card}>
        <span className={styles.code}>404</span>
        <h1 className={styles.title}>No encontramos esa ruta</h1>
        <p className={styles.description}>
          La página que buscás no existe o fue movida.
        </p>
        <Link to="/" className={styles.homeLink}>
          <Button iconLeft={<Home size={16} />}>Volver al inicio</Button>
        </Link>
      </Card>
    </div>
  );
};
