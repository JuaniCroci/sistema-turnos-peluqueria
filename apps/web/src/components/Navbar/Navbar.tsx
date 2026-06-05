import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, Scissors } from 'lucide-react';
import { MobileMenu } from './MobileMenu';
import styles from './Navbar.module.css';

export const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  // M5-a: el estado de auth es mock. M5-b lo reemplaza con useAuth().
  const isAuthenticated = false;
  const isAdmin = false;
  const onLogout = () => {
    // M5-b: limpia localStorage y redirige a /
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          <span className={styles.brandIcon} aria-hidden="true">
            <Scissors size={18} />
          </span>
          <span className={styles.brandText}>Peluquería</span>
        </Link>

        <nav className={styles.desktopNav} aria-label="Navegación principal">
          <NavLink
            to="/servicios"
            className={({ isActive }) =>
              [styles.navLink, isActive ? styles.navLinkActive : ''].join(' ')
            }
          >
            Servicios
          </NavLink>
          {isAuthenticated ? (
            <>
              <NavLink
                to="/mis-turnos"
                className={({ isActive }) =>
                  [styles.navLink, isActive ? styles.navLinkActive : ''].join(' ')
                }
              >
                Mis turnos
              </NavLink>
              <NavLink
                to="/mis-turnos/nuevo"
                className={({ isActive }) =>
                  [styles.navLink, isActive ? styles.navLinkActive : ''].join(' ')
                }
              >
                Reservar
              </NavLink>
              {isAdmin ? (
                <NavLink
                  to="/admin/servicios"
                  className={({ isActive }) =>
                    [styles.navLink, isActive ? styles.navLinkActive : ''].join(' ')
                  }
                >
                  Panel admin
                </NavLink>
              ) : null}
              <button type="button" className={styles.navLink} onClick={onLogout}>
                Salir
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  [styles.navLink, isActive ? styles.navLinkActive : ''].join(' ')
                }
              >
                Ingresar
              </NavLink>
              <Link to="/register" className={styles.cta}>
                Registrarse
              </Link>
            </>
          )}
        </nav>

        <button
          type="button"
          className={styles.menuButton}
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={menuOpen}
        >
          <Menu size={22} aria-hidden="true" />
        </button>
      </div>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        isAuthenticated={isAuthenticated}
        isAdmin={isAdmin}
        onLogout={onLogout}
      />
    </header>
  );
};
