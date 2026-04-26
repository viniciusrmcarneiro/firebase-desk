import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs.tsx';

describe('Tabs', () => {
  it('renders active tab content', () => {
    render(
      <Tabs defaultValue='firestore'>
        <TabsList>
          <TabsTrigger value='firestore'>Firestore</TabsTrigger>
        </TabsList>
        <TabsContent value='firestore'>Collections</TabsContent>
      </Tabs>,
    );
    expect(screen.getByRole('tab', { name: 'Firestore' }).getAttribute('data-state')).toBe(
      'active',
    );
    expect(screen.getByText('Collections')).toBeDefined();
  });
});
