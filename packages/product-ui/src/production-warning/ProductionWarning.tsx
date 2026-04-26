import { InlineAlert } from '@firebase-desk/ui';

export interface ProductionWarningProps {
  readonly actionLabel?: string;
}

export function ProductionWarning(
  { actionLabel = 'This action targets production data.' }: ProductionWarningProps,
) {
  return <InlineAlert variant='danger'>{actionLabel}</InlineAlert>;
}
