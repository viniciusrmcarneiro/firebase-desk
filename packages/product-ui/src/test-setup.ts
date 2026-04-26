import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

class TestResizeObserver implements ResizeObserver {
  disconnect(): void {}
  observe(): void {}
  unobserve(): void {}
}

if (!globalThis.ResizeObserver) {
  Object.defineProperty(globalThis, 'ResizeObserver', { value: TestResizeObserver });
}

Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? function scrollIntoView() {};

afterEach(() => {
  cleanup();
});
