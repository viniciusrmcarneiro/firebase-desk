import { StatusBadge } from '@firebase-desk/ui';

export type TargetMode = 'production' | 'emulator';

export interface TargetModeBadgeProps {
  readonly mode: TargetMode;
}

export function TargetModeBadge({ mode }: TargetModeBadgeProps) {
  return (
    <StatusBadge status={mode}>
      Target: {mode === 'production' ? 'Production' : 'Emulator'}
    </StatusBadge>
  );
}
