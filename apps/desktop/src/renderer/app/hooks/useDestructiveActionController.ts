import { useState } from 'react';

export interface DestructiveAction {
  readonly confirmLabel: string;
  readonly description: string;
  readonly onConfirm: () => void;
  readonly title: string;
}

export function useDestructiveActionController() {
  const [pendingAction, setPendingAction] = useState<DestructiveAction | null>(null);

  return {
    pendingAction,
    request: setPendingAction,
    setOpen: (open: boolean) => {
      if (!open) setPendingAction(null);
    },
  };
}
