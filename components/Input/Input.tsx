import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  iconLeft?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ iconLeft, className, ...rest }, ref) => {
    const classes = [
      styles.inputWrapper,
      iconLeft ? styles.hasIcon : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={classes}>
        {iconLeft ? <span className={styles.icon}>{iconLeft}</span> : null}
        <input ref={ref} className={styles.input} {...rest} />
      </div>
    );
  },
);

Input.displayName = 'Input';
