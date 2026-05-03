import { StatusBadge } from '@firebase-desk/ui';

export type TargetMode = 'production' | 'emulator';

export interface TargetModeBadgeProps {
  readonly mode: TargetMode;
}

export function TargetModeBadge({ mode }: TargetModeBadgeProps) {
  if (mode === 'production') return null;
  return <StatusBadge status='emulator' />;
}
