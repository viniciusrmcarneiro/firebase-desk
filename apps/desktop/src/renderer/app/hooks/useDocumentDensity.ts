import type { DensityName } from '@firebase-desk/design-tokens';
import { useEffect } from 'react';

export function useDocumentDensity(density: DensityName): void {
  useEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);
}
