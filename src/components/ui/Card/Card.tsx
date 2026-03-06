import type { CardProps } from '@/types/card';
import { cn } from '@utils/cn';
import styles from './Card.module.css';

export function Card({ title, description, children, footer, noPadding = false, className, ...rest }: CardProps) {
  return (
    <div className={cn(styles.card, className)} {...rest}>
      {(title || description) && (
        <div className={styles.header}>
          {title && <h3 className={styles.title}>{title}</h3>}
          {description && <p className={styles.description}>{description}</p>}
        </div>
      )}
      <div className={cn(styles.body, noPadding && styles.noPadding)}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
}
