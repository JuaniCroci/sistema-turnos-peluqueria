'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import type { MouseEvent } from 'react';
import styles from './Navbar.module.css';
import mobileStyles from './MobileMenu.module.css';

interface LogoutButtonProps {
  variant: 'desktop' | 'mobile';
}

export const LogoutButton = ({ variant }: LogoutButtonProps) => {
  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    await signOut({ callbackUrl: '/' });
  };

  if (variant === 'mobile') {
    return (
      <button
        type="button"
        className={[mobileStyles.link, mobileStyles.linkButton].join(' ')}
        onClick={handleClick}
      >
        <LogOut /> Cerrar sesión
      </button>
    );
  }

  return (
    <button
      type="button"
      className={[styles.navLink, styles.navLinkButton].join(' ')}
      onClick={handleClick}
    >
      Salir
    </button>
  );
};
