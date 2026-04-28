import type { ScriptRunResult } from '@firebase-desk/repo-contracts';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScriptOutput } from './ScriptOutput.tsx';

const result: ScriptRunResult = {
  returnValue: { ok: true },
  stream: [],
  logs: [{ level: 'log', message: 'done', timestamp: '2026-04-28T01:02:03.000Z' }],
  errors: [],
  durationMs: 1_234,
};

describe('ScriptOutput', () => {
  it('formats completed duration and renders return value', () => {
    render(<ScriptOutput isRunning={false} result={result} />);

    expect(screen.getByText('1.234s').getAttribute('title')).toBe('1234ms');
    expect(screen.getByText(/"ok": true/)).toBeTruthy();
  });

  it('shows running elapsed state', () => {
    render(<ScriptOutput isRunning result={null} />);

    expect(screen.getByText(/elapsed/)).toBeTruthy();
  });

  it('uses the run start time for running elapsed state', () => {
    render(<ScriptOutput isRunning result={null} startedAt={Date.now() - 12_345} />);

    expect(screen.getByText(/12\.\d{3}s elapsed/)).toBeTruthy();
  });

  it('switches to errors when result has errors', () => {
    render(
      <ScriptOutput
        isRunning={false}
        result={{ ...result, errors: [{ code: 'permission-denied', message: 'no access' }] }}
      />,
    );

    expect(screen.getByText(/permission-denied/)).toBeTruthy();
  });

  it('keeps cancelled runs on logs', () => {
    render(
      <ScriptOutput
        isRunning={false}
        result={{ ...result, cancelled: true }}
      />,
    );

    expect(screen.getByText('cancelled')).toBeTruthy();
    expect(screen.getByText(/\[01:02:03\] done/)).toBeTruthy();
  });
});
