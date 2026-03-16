import { Loader2 } from 'lucide-react';
import { cn } from '@utils/cn';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  label?: string;
}

const sizeClass: Record<SpinnerSize, string> = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-8',
};

export function Spinner({ size = 'md', className, label = 'Loading...' }: SpinnerProps) {
  return (
    <Loader2
      role="status"
      aria-label={label}
      className={cn('animate-spin text-muted-foreground', sizeClass[size], className)}
    />
  );
}
