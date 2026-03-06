import { forwardRef, useId } from 'react';
import { cn } from '@utils/cn';
import type { InputProps } from '@/types/input';
import styles from './Input.module.css';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftAddon, rightAddon, fullWidth = false, className, id, ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className={cn(styles.wrapper, fullWidth && styles.fullWidth)}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        )}
        <div className={cn(styles.inputWrapper, error && styles.hasError)}>
          {leftAddon && <span className={styles.addon}>{leftAddon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={cn(styles.input, leftAddon && styles.hasLeftAddon, rightAddon && styles.hasRightAddon, className)}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...rest}
          />
          {rightAddon && <span className={styles.addon}>{rightAddon}</span>}
        </div>
        {error && (
          <p id={`${inputId}-error`} className={styles.error} role="alert">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${inputId}-hint`} className={styles.hint}>
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
