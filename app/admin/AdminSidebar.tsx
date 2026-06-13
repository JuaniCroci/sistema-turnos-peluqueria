'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, CalendarPlus, LayoutDashboard } from 'lucide-react';
import styles from './AdminSidebar.module.css';

const links = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/turnos', label: 'Ver turnos', icon: Calendar },
  { href: '/admin/turnos/nuevo', label: 'Agendar turno', icon: CalendarPlus },
];

const isActivePath = (pathname: string, href: string): boolean => {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
};

export const AdminSidebar = () => {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav} aria-label="Navegación admin">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = isActivePath(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={[styles.link, isActive ? styles.linkActive : ''].join(' ')}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
