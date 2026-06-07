import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'rect' | 'circle' | 'text';
  className?: string;
}

export const Skeleton = ({
  width,
  height,
  variant = 'rect',
  className = '',
}: SkeletonProps) => {
  const isCircle = variant === 'circle';
  const isText = variant === 'text';

  const customStyles = {
    width,
    height: isText ? '1em' : height,
    borderRadius: isCircle ? '50%' : isText ? 'var(--radius-sm)' : undefined,
  };

  return (
    <span
      className={`${styles.skeleton} ${className}`}
      style={customStyles}
      aria-hidden="true"
    />
  );
};
