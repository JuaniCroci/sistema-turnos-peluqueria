import Link from 'next/link';
import { Home } from 'lucide-react';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <div className={styles.root}>
      <div className={styles.inner}>
        <span className={styles.code}>404</span>
        <h1 className={styles.title}>No encontramos esa ruta</h1>
        <p className={styles.text}>
          La página que buscás no existe o fue movida.
        </p>
        <Link href="/" className={styles.action}>
          <Home size={16} aria-hidden="true" />
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
