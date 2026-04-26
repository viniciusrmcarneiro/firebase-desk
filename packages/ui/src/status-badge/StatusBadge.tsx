import { Badge, type BadgeProps } from '../badge/Badge.tsx';

export type StatusBadgeStatus = 'success' | 'warning' | 'danger' | 'production' | 'emulator';

const statusLabels: Record<StatusBadgeStatus, string> = {
  success: 'Success',
  warning: 'Warning',
  danger: 'Danger',
  production: 'Production',
  emulator: 'Emulator',
};

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  readonly status: StatusBadgeStatus;
}

export function StatusBadge({ children, status, ...props }: StatusBadgeProps) {
  return (
    <Badge variant={status} {...props}>
      {children ?? statusLabels[status]}
    </Badge>
  );
}
