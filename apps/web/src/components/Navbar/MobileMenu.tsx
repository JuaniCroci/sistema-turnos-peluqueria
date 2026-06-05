import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import { X, LogIn, UserPlus, Calendar, LayoutDashboard, CalendarPlus, LogOut } from 'lucide-react';
import styles from './MobileMenu.module.css';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  onLogout: () => void;
}

export const MobileMenu = ({ open, onClose, isAuthenticated, isAdmin, onLogout }: MobileMenuProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className={[styles.root, open ? styles.open : ''].join(' ')}
      aria-hidden={!open}
    >
      <button
        type="button"
        className={styles.backdrop}
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        aria-label="Cerrar menú"
      />
      <aside
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
      >
        <div className={styles.header}>
          <span className={styles.title}>Menú</span>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <nav className={styles.nav}>
          <NavLink to="/servicios" className={styles.link} onClick={onClose}>
            <ScissorsIcon /> Servicios
          </NavLink>
          {isAuthenticated ? (
            <>
              <NavLink to="/mis-turnos" className={styles.link} onClick={onClose}>
                <Calendar /> Mis turnos
              </NavLink>
              <NavLink to="/mis-turnos/nuevo" className={styles.link} onClick={onClose}>
                <CalendarPlus /> Reservar
              </NavLink>
              {isAdmin ? (
                <>
                  <NavLink to="/admin/servicios" className={styles.link} onClick={onClose}>
                    <LayoutDashboard /> Panel admin
                  </NavLink>
                </>
              ) : null}
              <button
                type="button"
                className={[styles.link, styles.linkButton].join(' ')}
                onClick={() => {
                  onLogout();
                  onClose();
                }}
              >
                <LogOut /> Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={styles.link} onClick={onClose}>
                <LogIn /> Ingresar
              </NavLink>
              <NavLink to="/register" className={styles.link} onClick={onClose}>
                <UserPlus /> Registrarse
              </NavLink>
            </>
          )}
        </nav>
      </aside>
    </div>,
    document.body,
  );
};

const ScissorsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="6" cy="6" r="3" />
    <path d="M8.12 8.12 12 12" />
    <path d="M20 4 8.12 15.88" />
    <circle cx="6" cy="18" r="3" />
    <path d="M14.8 14.8 20 20" />
  </svg>
);
