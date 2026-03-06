import { cn } from '@utils/cn';
import styles from './Spinner.module.css';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  label?: string;
}

const sizeStyles: Record<SpinnerSize, string> = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
};

export function Spinner({ size = 'md', className, label = 'Loading...' }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className={cn(styles.spinner, sizeStyles[size], className)} />
  );
}
