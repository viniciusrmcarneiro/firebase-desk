import type { ProjectSummary } from '@firebase-desk/repo-contracts';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppStatusBar } from './AppStatusBar.tsx';

const project: ProjectSummary = {
  id: 'project-1',
  name: 'Very long project name that should not wrap inside the status bar',
  projectId: 'very-long-project-id-that-should-truncate',
  target: 'emulator',
  hasCredential: false,
  credentialEncrypted: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('AppStatusBar', () => {
  it('marks narrow-window status items as truncating single-line content', () => {
    render(
      <AppStatusBar
        activeProject={project}
        activeTabTitle='Very long active tab title'
        activityBadge={{ label: '1', variant: 'danger' }}
        activityButtonVariant='danger'
        activityOpen={false}
        lastAction='Very long last action that should stay on one line'
        jobsBadge={{ label: '1', variant: 'warning' }}
        jobsButtonVariant='warning'
        jobsOpen={false}
        selectedTreeItemId='very/long/tree/selection/path'
        onActivityToggle={vi.fn()}
        onJobsToggle={vi.fn()}
      />,
    );

    expect(screen.getByText(project.name).className).toContain('truncate');
    expect(screen.getByText(project.projectId).className).toContain('truncate');
    expect(screen.getByText('Very long active tab title').className).toContain('truncate');
    expect(screen.getByText('very/long/tree/selection/path').className).toContain('truncate');
    expect(screen.getByText('Very long last action that should stay on one line').className)
      .toContain(
        'truncate',
      );
    expect(screen.getByRole('button', { name: /jobs/i }).className).toContain('whitespace-nowrap');
    expect(screen.getByRole('button', { name: /activity/i }).className).toContain(
      'whitespace-nowrap',
    );
  });
});
