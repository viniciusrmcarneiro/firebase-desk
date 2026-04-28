import type { AuthUser } from '@firebase-desk/repo-contracts';
import {
  Badge,
  Button,
  DataTable,
  type DataTableColumn,
  EmptyState,
  InlineAlert,
  Input,
  Panel,
  PanelBody,
  PanelHeader,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@firebase-desk/ui';
import { ShieldCheck, UserRound, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export interface AuthUsersSurfaceProps {
  readonly errorMessage?: string | null;
  readonly filterValue: string;
  readonly hasMore: boolean;
  readonly isFetchingMore?: boolean;
  readonly isLoading?: boolean;
  readonly onFilterChange: (value: string) => void;
  readonly onLoadMore: () => void;
  readonly onSelectUser: (uid: string) => void;
  readonly selectedUser?: AuthUser | null;
  readonly selectedUserId?: string | null;
  readonly users: ReadonlyArray<AuthUser>;
}

export function AuthUsersSurface(
  {
    filterValue,
    errorMessage = null,
    hasMore,
    isFetchingMore = false,
    isLoading = false,
    onFilterChange,
    onLoadMore,
    onSelectUser,
    selectedUser = null,
    selectedUserId = null,
    users,
  }: AuthUsersSurfaceProps,
) {
  const filteredUsers = useMemo(() => filterUsers(users, filterValue), [filterValue, users]);
  const selectedVisibleUser = filteredUsers.find((user) => user.uid === selectedUserId)
    ?? filteredUsers[0]
    ?? selectedUser;
  const isWide = useMediaQuery('(min-width: 900px)');
  const direction = isWide ? 'horizontal' : 'vertical';

  return (
    <div className='h-full min-h-0 overflow-hidden p-2'>
      <ResizablePanelGroup
        key={direction}
        className='h-full min-h-0'
        direction={direction}
      >
        <ResizablePanel
          className='h-full'
          defaultSize={isWide ? '64%' : '58%'}
          minSize={isWide ? '460px' : '260px'}
        >
          <Panel className='grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]'>
            <PanelHeader
              actions={
                <Input
                  aria-label='Filter users'
                  className='max-w-65'
                  placeholder='Filter users'
                  value={filterValue}
                  onChange={(event) => onFilterChange(event.currentTarget.value)}
                />
              }
            >
              <span className='flex min-w-0 items-center gap-2'>
                <Users size={15} aria-hidden='true' />
                <span className='truncate'>Users</span>
                <Badge>{isLoading ? 'loading' : `${filteredUsers.length}`}</Badge>
              </span>
            </PanelHeader>
            <PanelBody className='min-h-0 p-0'>
              {errorMessage
                ? (
                  <div className='border-b border-border-subtle p-2'>
                    <InlineAlert variant='danger'>{errorMessage}</InlineAlert>
                  </div>
                )
                : null}
              <AuthUsersTable
                hasMore={hasMore}
                isFetchingMore={isFetchingMore}
                selectedUserId={selectedVisibleUser?.uid ?? null}
                users={filteredUsers}
                onLoadMore={onLoadMore}
                onSelectUser={onSelectUser}
              />
            </PanelBody>
          </Panel>
        </ResizablePanel>
        <ResizableHandle className={isWide ? 'mx-2 h-full w-px' : 'my-2 h-px w-full'} />
        <ResizablePanel
          className='h-full'
          defaultSize={isWide ? '36%' : '42%'}
          minSize={isWide ? '300px' : '220px'}
        >
          <AuthUserDetail user={selectedVisibleUser ?? null} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

interface AuthUsersTableProps {
  readonly hasMore: boolean;
  readonly isFetchingMore: boolean;
  readonly onLoadMore: () => void;
  readonly onSelectUser: (uid: string) => void;
  readonly selectedUserId: string | null;
  readonly users: ReadonlyArray<AuthUser>;
}

type AuthUsersTableRow = { readonly kind: 'user'; readonly user: AuthUser; };

function AuthUsersTable(
  { hasMore, isFetchingMore, onLoadMore, onSelectUser, selectedUserId, users }: AuthUsersTableProps,
) {
  if (!users.length) {
    return <EmptyState icon={<UserRound size={20} aria-hidden='true' />} title='No users' />;
  }

  const rows: ReadonlyArray<AuthUsersTableRow> = users.map((user) => ({
    kind: 'user',
    user,
  }));

  const columns: ReadonlyArray<DataTableColumn<AuthUsersTableRow>> = [
    {
      id: 'uid',
      header: 'UID',
      width: 150,
      cell: ({ row }) => <span className='font-mono text-xs'>{row.original.user.uid}</span>,
    },
    {
      id: 'email',
      header: 'Email',
      cell: ({ row }) => row.original.user.email ?? 'No email',
    },
    {
      id: 'name',
      header: 'Name',
      cell: ({ row }) => row.original.user.displayName ?? 'No name',
    },
    {
      id: 'provider',
      header: 'Provider',
      width: 140,
      cell: ({ row }) => row.original.user.provider,
    },
    {
      id: 'status',
      header: 'Status',
      width: 110,
      cell: ({ row }) =>
        row.original.user.disabled
          ? 'disabled'
          : 'active',
    },
  ];

  return (
    <div className='grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto]'>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.user.uid}
        rowClassName={(row) =>
          row.user.uid === selectedUserId
            ? 'bg-action-selected shadow-[inset_2px_0_0_var(--color-action-primary)]'
            : undefined}
        selectedRowId={selectedUserId}
        onRowClick={(row) => onSelectUser(row.user.uid)}
      />
      {hasMore
        ? (
          <div className='border-t border-border-subtle bg-bg-panel px-3 py-2'>
            <Button disabled={isFetchingMore} variant='secondary' onClick={onLoadMore}>
              {isFetchingMore ? 'Loading' : 'Load more'}
            </Button>
          </div>
        )
        : null}
    </div>
  );
}

function AuthUserDetail({ user }: { readonly user: AuthUser | null; }) {
  return (
    <Panel className='grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]'>
      <PanelHeader actions={user ? <Badge>claims</Badge> : null}>
        <span className='flex min-w-0 items-center gap-2'>
          <ShieldCheck size={15} aria-hidden='true' />
          <span className='truncate'>User detail</span>
        </span>
      </PanelHeader>
      <PanelBody className='min-h-0 overflow-auto'>
        {user
          ? (
            <div className='grid content-start gap-3'>
              <div className='grid gap-2'>
                <DetailItem label='UID' value={user.uid} />
                <DetailItem label='Email' value={user.email ?? 'No email'} />
                <DetailItem label='Name' value={user.displayName ?? 'No name'} />
                <DetailItem label='Provider' value={user.provider} />
                <DetailItem label='Disabled' value={user.disabled ? 'Yes' : 'No'} />
              </div>
              <JsonPreview value={user.customClaims} />
            </div>
          )
          : (
            <EmptyState
              icon={<UserRound size={20} aria-hidden='true' />}
              title='No user selected'
            />
          )}
      </PanelBody>
    </Panel>
  );
}

function DetailItem({ label, value }: { readonly label: string; readonly value: string; }) {
  return (
    <div className='grid grid-cols-[130px_minmax(0,1fr)] items-baseline gap-2 border-b border-dashed border-border-subtle py-1.5 last:border-b-0'>
      <span className='text-[11.5px] font-semibold uppercase tracking-normal text-text-muted'>
        {label}
      </span>
      <span className='min-w-0 overflow-hidden text-ellipsis break-words font-medium text-text-primary'>
        {value}
      </span>
    </div>
  );
}

function JsonPreview({ value }: { readonly value: unknown; }) {
  return (
    <pre className='overflow-auto rounded-md border border-border-subtle bg-bg-subtle p-3 font-mono text-xs leading-relaxed text-text-secondary'>
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function filterUsers(users: ReadonlyArray<AuthUser>, filterValue: string): ReadonlyArray<AuthUser> {
  const query = filterValue.trim().toLowerCase();
  if (!query) return users;
  return users.filter((user) =>
    user.uid.toLowerCase().includes(query)
    || user.email?.toLowerCase().includes(query)
    || user.displayName?.toLowerCase().includes(query)
    || user.provider.toLowerCase().includes(query)
  );
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
