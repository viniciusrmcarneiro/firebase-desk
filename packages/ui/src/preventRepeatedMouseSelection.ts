import type { MouseEvent } from 'react';

export function preventRepeatedMouseSelection(event: MouseEvent<HTMLElement>): void {
  if (event.detail > 1) event.preventDefault();
}
