import { cn } from '@utils/cn';

interface CapacityBarProps {
  current: number;
  max: number; // 0 = unlimited
}

export function CapacityBar({ current, max }: CapacityBarProps) {
  if (max === 0) {
    return (
      <span className="text-sm text-muted-foreground">
        {current.toLocaleString()} units{' '}
        <span className="text-xs opacity-60">[No limit]</span>
      </span>
    );
  }

  const pct = Math.round((current / max) * 100);
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500';
  const textColor = pct >= 90
    ? 'text-red-600 dark:text-red-400'
    : pct >= 70
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-green-600 dark:text-green-400';

  return (
    <div className="flex flex-col gap-1 min-w-[120px]">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">
          {current.toLocaleString()} / {max.toLocaleString()}
        </span>
        <span className={cn('font-medium', textColor)}>{pct}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      {pct > 100 && (
        <span className="text-xs font-medium text-red-600 dark:text-red-400">
          Over capacity
        </span>
      )}
    </div>
  );
}
