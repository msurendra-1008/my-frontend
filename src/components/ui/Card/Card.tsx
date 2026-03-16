import type { CardProps } from '@/types/card';
import { cn } from '@utils/cn';

export function Card({ title, description, children, footer, noPadding = false, className, ...rest }: CardProps) {
  return (
    <div
      className={cn('rounded-xl border bg-card text-card-foreground shadow-sm', className)}
      {...rest}
    >
      {(title || description) && (
        <div className="flex flex-col gap-1 border-b px-6 py-4">
          {title && <h3 className="text-base font-semibold leading-none">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      <div className={cn('px-6 py-4', noPadding && 'p-0')}>{children}</div>
      {footer && <div className="border-t px-6 py-4">{footer}</div>}
    </div>
  );
}
