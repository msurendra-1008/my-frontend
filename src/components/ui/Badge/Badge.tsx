import { cn } from '@utils/cn';
import styles from './Badge.module.css';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: styles.default,
  success: styles.success,
  warning: styles.warning,
  danger: styles.danger,
  info: styles.info,
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return <span className={cn(styles.badge, variantStyles[variant], className)}>{children}</span>;
}
