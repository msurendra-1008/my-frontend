import { cn } from '@/utils/cn'
import type { NegotiationLog } from '@/types/tender.types'

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

interface Props {
  logs: NegotiationLog[]
}

export function NegotiationThread({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">
        No negotiation messages yet.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log.id} className="flex gap-2.5">
          {/* Avatar */}
          <div className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center',
            'text-[10px] font-semibold flex-shrink-0',
            log.actor_role === 'admin'
              ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300'
              : 'bg-teal-500/10 text-teal-700 dark:text-teal-300',
          )}>
            {log.actor_name.slice(0, 2).toUpperCase()}
          </div>

          {/* Bubble */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-foreground">
                {log.actor_role === 'admin' ? 'Admin' : log.actor_name}
              </span>
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                log.actor_role === 'admin'
                  ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300'
                  : 'bg-teal-500/10 text-teal-700 dark:text-teal-300',
              )}>
                {log.actor_role === 'admin' ? 'Admin' : 'Vendor'}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {formatDateTime(log.created_at)}
              </span>
            </div>
            <div className={cn(
              'rounded-lg px-3 py-2 text-xs leading-relaxed',
              log.actor_role === 'admin'
                ? 'bg-purple-500/10 border border-purple-400/40 text-purple-900 dark:text-purple-200'
                : 'bg-teal-500/10 border border-teal-400/40 text-teal-900 dark:text-teal-200',
            )}>
              {log.message}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
