import type { ReactNode } from 'react';
import styles from './Badge.module.css';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  tone?: BadgeTone;
  size?: BadgeSize;
  children: ReactNode;
}

export const Badge = ({ tone = 'neutral', size = 'sm', children }: BadgeProps) => {
  return (
    <span
      className={[styles.badge, styles[`tone-${tone}`], styles[`size-${size}`]].join(' ')}
    >
      {children}
    </span>
  );
};
