'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader } from 'lucide-react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  children?: ReactNode;
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  iconLeft,
  iconRight,
  children,
  className,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) => {
  const classes = [
    styles.button,
    styles[`variant-${variant}`],
    styles[`size-${size}`],
    fullWidth ? styles.fullWidth : '',
    loading ? styles.loading : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <Loader className={styles.spinner} size={16} aria-hidden="true" />
      ) : iconLeft ? (
        <span className={styles.icon}>{iconLeft}</span>
      ) : null}
      {children && <span className={styles.label}>{children}</span>}
      {iconRight && !loading ? <span className={styles.icon}>{iconRight}</span> : null}
    </button>
  );
};
