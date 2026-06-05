import { Outlet } from 'react-router-dom';
import { Navbar } from '../Navbar/Navbar';
import styles from './Layout.module.css';

export const Layout = () => {
  return (
    <div className={styles.layout}>
      <Navbar />
      <main className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p className={styles.brand}>Peluquería · Sistema de Turnos</p>
          <p className={styles.contact}>
            Av. Siempre Viva 742 · Lunes a sábados de 9 a 20 hs
          </p>
        </div>
      </footer>
    </div>
  );
};
