import { describe, expect, it } from 'vitest';
import { collectionLayoutKeyForPath } from './resultTableLayout.ts';

describe('result table layout keys', () => {
  it('removes document ids from nested collection paths', () => {
    expect(collectionLayoutKeyForPath('orders/ord_1/skiers/skier_1/results')).toBe(
      'orders/skiers/results',
    );
  });

  it('uses the root collection name for document paths', () => {
    expect(collectionLayoutKeyForPath('orders/ord_1')).toBe('orders');
  });
});
