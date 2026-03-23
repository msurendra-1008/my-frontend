import type { ReturnRequestLog, ReturnLogAction } from '@/types/returns.types';
import { cn } from '@utils/cn';

// ── Action config ─────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<ReturnLogAction, { label: string; color: string; dot: string }> = {
  raised:         { label: 'Request Raised',      color: 'text-blue-700 dark:text-blue-400',    dot: 'bg-blue-500'    },
  re_raised:      { label: 'Request Re-raised',   color: 'text-blue-700 dark:text-blue-400',    dot: 'bg-blue-400'    },
  info_requested: { label: 'Admin Requested Info',color: 'text-amber-700 dark:text-amber-400',  dot: 'bg-amber-500'   },
  user_replied:   { label: 'User Replied',         color: 'text-purple-700 dark:text-purple-400',dot: 'bg-purple-500'  },
  approved:       { label: 'Approved',             color: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  rejected:       { label: 'Rejected',             color: 'text-red-700 dark:text-red-400',      dot: 'bg-red-500'     },
  rejected_final: { label: 'Rejected (Final)',     color: 'text-red-800 dark:text-red-300',      dot: 'bg-red-700'     },
  completed:      { label: 'Completed',            color: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-600' },
};

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

// ── Timeline entry ────────────────────────────────────────────────────────────

function TimelineEntry({ log, isLast }: { log: ReturnRequestLog; isLast: boolean }) {
  const cfg = ACTION_CONFIG[log.action] ?? {
    label: log.action, color: 'text-foreground', dot: 'bg-muted-foreground',
  };

  return (
    <div className="flex gap-3">
      {/* Line + dot */}
      <div className="flex flex-col items-center">
        <div className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', cfg.dot)} />
        {!isLast && <div className="mt-1 flex-1 w-px bg-border" />}
      </div>

      {/* Content */}
      <div className={cn('pb-4 flex-1 min-w-0', isLast && 'pb-0')}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-xs font-semibold', cfg.color)}>{cfg.label}</span>
          {log.actor_name && (
            <span className="text-[10px] text-muted-foreground">
              by {log.actor_name}
              {log.actor_role ? ` (${log.actor_role})` : ''}
            </span>
          )}
          <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
            {formatTime(log.created_at)}
          </span>
        </div>

        {log.notes && (
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{log.notes}</p>
        )}

        {/* Photos attached to this log entry */}
        {log.photos.length > 0 && (
          <div className="mt-2 flex gap-1.5 flex-wrap">
            {log.photos.map((p) => (
              <a key={p.id} href={p.photo_url ?? p.photo} target="_blank" rel="noreferrer">
                <img
                  src={p.photo_url ?? p.photo}
                  alt="evidence"
                  className="h-12 w-12 rounded object-cover border hover:opacity-80 transition-opacity"
                />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Timeline ──────────────────────────────────────────────────────────────────

interface Props {
  logs: ReturnRequestLog[];
  className?: string;
}

export function ReturnRequestTimeline({ logs, className }: Props) {
  if (!logs.length) return null;

  return (
    <div className={cn('space-y-0', className)}>
      {logs.map((log, i) => (
        <TimelineEntry key={log.id} log={log} isLast={i === logs.length - 1} />
      ))}
    </div>
  );
}
