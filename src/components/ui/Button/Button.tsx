import { forwardRef } from 'react';
import { cn } from '@utils/cn';
import type { ButtonProps } from '@/types/button';
import styles from './Button.module.css';

const variantStyles: Record<string, string> = {
  primary: styles.primary,
  secondary: styles.secondary,
  outline: styles.outline,
  ghost: styles.ghost,
  danger: styles.danger,
};

const sizeStyles: Record<string, string> = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className,
      ...rest
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          styles.button,
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && styles.fullWidth,
          isLoading && styles.loading,
          className,
        )}
        {...rest}
      >
        {isLoading && <span className={styles.spinner} aria-hidden="true" />}
        {!isLoading && leftIcon && <span className={styles.icon}>{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className={styles.icon}>{rightIcon}</span>}
      </button>
    );
  },
);

Button.displayName = 'Button';
