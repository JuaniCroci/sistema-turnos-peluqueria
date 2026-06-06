import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg' | 'none';
  hoverable?: boolean;
  children?: ReactNode;
}

export const Card = ({
  padding = 'md',
  hoverable = false,
  className,
  children,
  ...rest
}: CardProps) => {
  const classes = [
    styles.card,
    styles[`padding-${padding}`],
    hoverable ? styles.hoverable : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
};
