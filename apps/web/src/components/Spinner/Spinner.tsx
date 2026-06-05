import { Loader } from 'lucide-react';
import styles from './Spinner.module.css';

export type SpinnerSize = 'sm' | 'md' | 'lg';

interface SpinnerProps {
  size?: SpinnerSize;
  label?: string;
}

const SIZE_MAP: Record<SpinnerSize, number> = {
  sm: 14,
  md: 20,
  lg: 32,
};

export const Spinner = ({ size = 'md', label = 'Cargando' }: SpinnerProps) => {
  return (
    <span className={[styles.spinner, styles[`size-${size}`]].join(' ')} role="status">
      <Loader size={SIZE_MAP[size]} className={styles.icon} aria-hidden="true" />
      <span className={styles.srOnly}>{label}</span>
    </span>
  );
};
