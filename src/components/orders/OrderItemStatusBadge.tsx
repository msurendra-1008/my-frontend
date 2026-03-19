import { Badge } from '@/components/ui/Badge/Badge';

type BadgeConfig = {
  variant: 'info' | 'success' | 'warning' | 'secondary' | 'danger';
  className?: string;
};

function getConfig(status: string): BadgeConfig {
  switch (status) {
    case 'delivered':
      return { variant: 'success' };
    case 'return_requested':
    case 'exchange_requested':
      return { variant: 'warning' };
    case 'return_approved':
    case 'exchange_approved':
      return {
        variant: 'secondary',
        className: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
      };
    case 'return_rejected':
    case 'exchange_rejected':
      return { variant: 'danger' };
    case 'refunded':
    case 'exchanged':
      return { variant: 'secondary' };
    default:
      // pending / confirmed / packed / shipped
      return { variant: 'info' };
  }
}

export function OrderItemStatusBadge({ status }: { status: string }) {
  const { variant, className } = getConfig(status);
  return (
    <Badge variant={variant} className={className}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}
