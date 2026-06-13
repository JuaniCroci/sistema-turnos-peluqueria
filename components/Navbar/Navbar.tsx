'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { LogoutButton } from './LogoutButton';
import styles from './Navbar.module.css';

const MobileMenu = dynamic(() => import('./MobileMenu').then((m) => m.MobileMenu), {
  ssr: false,
});

export type NavRole = 'client' | 'admin';

export interface NavUser {
  role: NavRole;
}

interface NavbarProps {
  user: NavUser | null;
}

const isActivePath = (pathname: string, href: string): boolean => {
  if (href === '/') {
    return pathname === '/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
};

export const Navbar = ({ user }: NavbarProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const isAuthenticated = user !== null;
  const isAdmin = user?.role === 'admin';

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandText}>Peluquería</span>
        </Link>

        <nav className={styles.desktopNav} aria-label="Navegación principal">
          <Link
            href="/servicios"
            className={[
              styles.navLink,
              isActivePath(pathname, '/servicios') ? styles.navLinkActive : '',
            ].join(' ')}
          >
            Servicios
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                href="/mis-turnos"
                className={[
                  styles.navLink,
                  isActivePath(pathname, '/mis-turnos') ? styles.navLinkActive : '',
                ].join(' ')}
              >
                Mis turnos
              </Link>
              <Link
                href="/mis-turnos/nuevo"
                className={[
                  styles.navLink,
                  isActivePath(pathname, '/mis-turnos/nuevo') ? styles.navLinkActive : '',
                ].join(' ')}
              >
                Reservar
              </Link>
              {isAdmin ? (
                <Link
                  href="/admin/servicios"
                  className={[
                    styles.navLink,
                    isActivePath(pathname, '/admin') ? styles.navLinkActive : '',
                  ].join(' ')}
                >
                  Panel admin
                </Link>
              ) : null}
              <LogoutButton variant="desktop" />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={[
                  styles.navLink,
                  isActivePath(pathname, '/login') ? styles.navLinkActive : '',
                ].join(' ')}
              >
                Ingresar
              </Link>
              <Link href="/register" className={styles.cta}>
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
        user={user}
      />
    </header>
  );
};
