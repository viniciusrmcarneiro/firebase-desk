const iconPaths = {
  arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  arrowRight: '<path d="m12 5 7 7-7 7"/><path d="M5 12h14"/>',
  auth: '<path d="M16 11a4 4 0 1 0-8 0v3h8v-3Z"/><path d="M7 14h10v7H7z"/>',
  braces: '<path d="M8 4c-2 0-3 1-3 3v2c0 1-1 2-2 2 1 0 2 1 2 2v2c0 2 1 3 3 3"/><path d="M16 4c2 0 3 1 3 3v2c0 1 1 2 2 2-1 0-2 1-2 2v2c0 2-1 3-3 3"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  code: '<path d="m8 9-4 3 4 3"/><path d="m16 9 4 3-4 3"/><path d="m14 5-4 14"/>',
  database: '<ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5"/><path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5"/>',
  folder: '<path d="M3 6h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  refresh: '<path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M19 11a7 7 0 0 0-12-4l-3 3"/><path d="M5 13a7 7 0 0 0 12 4l3-3"/>',
  save: '<path d="M5 3h12l2 2v16H5z"/><path d="M8 3v6h8"/><path d="M8 21v-7h8v7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.4 3a7 7 0 0 0-1.7 1L5 6 3 9.4 5 11a7 7 0 0 0 0 2l-2 1.6L5 18l2.4-1a7 7 0 0 0 1.7 1l.4 3h5l.4-3a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6c.1-.3.1-.7.1-1Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.9 4.9 6.3 6.3"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m4.9 19.1 1.4-1.4"/><path d="m17.7 6.3 1.4-1.4"/>',
  table: '<path d="M4 5h16v14H4z"/><path d="M4 10h16"/><path d="M10 5v14"/><path d="M15 5v14"/>',
  trash: '<path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 14h10l1-14"/><path d="M9 7V4h6v3"/>',
  users: '<path d="M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 20v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
  x: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
};

const accounts = [
  { id: 'prod', name: 'Acme Prod', projectId: 'acme-prod', target: 'production', badge: 'prod' },
  { id: 'stage', name: 'Acme Staging', projectId: 'acme-stage', target: 'staging', badge: 'stage' },
  { id: 'emu', name: 'Local Emulator', projectId: 'demo-local', target: 'emulator', badge: 'emu' },
];

const collections = [
  {
    name: 'orders',
    docs: [
      {
        id: 'ord_1024',
        data: {
          status: 'paid',
          total: 129.4,
          customer: 'Ada Lovelace',
          updatedAt: timestamp('2026-04-24T09:30:12.058Z'),
          deliveryLocation: geoPoint(-36.8485, 174.7633),
          customerRef: reference('customers/cus_ada'),
          items: [
            { sku: 'sku_keyboard', quantity: 1, price: 149 },
            { sku: 'sku_mouse', quantity: 2, price: 79 },
          ],
          labels: ['priority', 'gift'],
          audit: { createdBy: 'u_ada', source: 'web-checkout', flags: { reviewed: true, exported: false } },
          channel: 'web',
        },
        subcollections: [
          {
            name: 'events',
            docs: [
              {
                id: 'evt_created',
                data: {
                  kind: 'created',
                  at: timestamp('2026-04-24T09:30:12.058Z'),
                  changes: { status: 'created', fields: ['status', 'total', 'items'] },
                },
                subcollections: [
                  {
                    name: 'deliveryAttempts',
                    docs: [
                      {
                        id: 'attempt_001',
                        data: { carrier: 'DHL', checkpoints: ['picked_up', 'in_transit'], metadata: { scanCount: 2, delayed: false } },
                        subcollections: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            name: 'payments',
            docs: [{ id: 'pay_001', data: { provider: 'stripe', amount: 129.4, captures: [{ amount: 129.4, status: 'captured' }] }, subcollections: [] }],
          },
        ],
      },
      {
        id: 'ord_1025',
        data: {
          status: 'pending',
          total: 86.1,
          customer: 'Grace Hopper',
          updatedAt: timestamp('2026-04-25T21:12:00.000Z'),
          deliveryLocation: geoPoint(-41.2865, 174.7762),
          customerRef: reference('customers/cus_grace'),
          items: [{ sku: 'sku_keyboard', quantity: 1, price: 149 }],
          fulfillment: { warehouse: 'WLG', pickList: ['sku_keyboard'], giftWrap: false },
          channel: 'mobile',
        },
        subcollections: [{ name: 'events', docs: [{ id: 'evt_pending', data: { kind: 'queued', at: timestamp('2026-04-25T21:13:00.000Z') }, subcollections: [] }] }],
      },
      {
        id: 'ord_1026',
        data: {
          status: 'refunded',
          total: 42,
          customer: 'Katherine Johnson',
          updatedAt: timestamp('2026-04-26T02:00:00.000Z'),
          refund: { reason: 'duplicate', approvedBy: 'u_grace' },
          labels: ['support-reviewed'],
          channel: 'api',
        },
        subcollections: [],
      },
    ],
  },
  {
    name: 'customers',
    docs: [
      {
        id: 'cus_ada',
        data: {
          email: 'ada@example.com',
          tier: 'gold',
          orders: 18,
          active: true,
          preferences: { marketing: true, channels: ['email', 'sms'] },
          createdAt: timestamp('2026-01-08T19:20:00.000Z'),
        },
        subcollections: [{ name: 'addresses', docs: [{ id: 'addr_home', data: { city: 'Auckland', lines: ['1 Queen Street'], primary: true }, subcollections: [] }] }],
      },
      {
        id: 'cus_grace',
        data: { email: 'grace@example.com', tier: 'standard', orders: 7, active: true, createdAt: timestamp('2026-02-14T10:45:00.000Z') },
        subcollections: [],
      },
    ],
  },
  {
    name: 'products',
    docs: [
      { id: 'sku_keyboard', data: { name: 'Keyboard', price: 149, stock: 38, enabled: true }, subcollections: [] },
      { id: 'sku_mouse', data: { name: 'Mouse', price: 79, stock: 102, enabled: true }, subcollections: [] },
    ],
  },
];

const baseUsers = [
  { uid: 'u_ada', email: 'ada@example.com', displayName: 'Ada Lovelace', provider: 'password', disabled: false, claims: { role: 'admin', beta: true } },
  { uid: 'u_grace', email: 'grace@example.com', displayName: 'Grace Hopper', provider: 'google.com', disabled: false, claims: { role: 'support' } },
  { uid: 'u_katherine', email: 'katherine@example.com', displayName: 'Katherine Johnson', provider: 'password', disabled: true, claims: { role: 'viewer' } },
];

const RESULT_PAGE_SIZE = 2;

const state = {
  theme: localStorage.getItem('firebase-explorer-wireframe-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  expandedAccounts: {},
  accountToolStatus: {},
  accountLoadAttempts: {},
  expandedFirestore: {},
  loadedCollections: {},
  treeFilter: '',
  selectedTreeKey: 'prod:collection:orders',
  status: 'Ready',
  tabs: [
    { id: 'tab_1', key: 'query:prod:orders:', type: 'query', accountId: 'prod', collection: 'orders', resultView: 'table', filters: 1 },
    { id: 'tab_2', key: 'auth:emu::', type: 'auth', accountId: 'emu', userSearch: '', selectedUserId: 'emu_u_ada' },
    { id: 'tab_3', key: 'script:stage::', type: 'script', accountId: 'stage', outputTab: 'logs', scriptState: 'logs' },
  ],
  activeTabId: 'tab_1',
  documentModal: null,
  confirmModal: null,
  contextMenu: null,
  draggingTabId: null,
  sidebarCollapsed: false,
  sidebarDrawerOpen: false,
  sidebarWidth: 280,
  inspectorWidth: 360,
  hotkeyHelpOpen: false,
  history: [],
  historyIndex: -1,
  restoringHistory: false,
};

const els = {
  tree: document.getElementById('tree'),
  sidebarRail: document.getElementById('sidebarRail'),
  tabs: document.getElementById('tabs'),
  toolbar: document.getElementById('tabToolbar'),
  content: document.getElementById('content'),
  statusbar: document.getElementById('statusbar'),
  accountModal: document.getElementById('accountModal'),
  documentModal: document.getElementById('documentModal'),
  confirmModal: document.getElementById('confirmModal'),
  hotkeyHelpModal: document.getElementById('hotkeyHelpModal'),
  contextMenu: document.getElementById('contextMenu'),
  treeFilter: document.getElementById('treeFilter'),
};

let selectionRenderTimer = null;
let treeOpenTimer = null;

function icon(name) {
  return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (iconPaths[name] || iconPaths.file) + '</svg>';
}

function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((node) => {
    const name = node.getAttribute('data-icon');
    if (node.getAttribute('data-rendered-icon') === name) return;
    node.innerHTML = icon(name);
    node.setAttribute('data-rendered-icon', name);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);
}

const templateCache = new Map();

function renderTemplate(name, values = {}) {
  if (!templateCache.has(name)) {
    const node = document.getElementById('template-' + name);
    templateCache.set(name, node ? node.innerHTML.trim() : '');
  }

  const source = templateCache.get(name);
  return source.replace(/\{\{\{\s*([\w-]+)\s*\}\}\}/g, (_, key) => values[key] ?? '').replace(/\{\{\s*([\w-]+)\s*\}\}/g, (_, key) => escapeHtml(values[key] ?? ''));
}

function accountById(id) {
  return accounts.find((account) => account.id === id) || accounts[0];
}

function collectionByName(name) {
  return collections.find((collection) => collection.name === name) || collections[0];
}

function docsFor(collectionName, accountId) {
  const prefix = accountId === 'prod' ? '' : accountId + '_';
  const collection = collectionByName(collectionName);
  if (!collection) return [];
  return collection.docs.map((doc) => ({
    ...doc,
    accountProjectId: accountById(accountId).projectId,
    id: prefix + doc.id,
    data: { ...doc.data },
  }));
}

function usersFor(accountId) {
  return baseUsers.map((user) => ({
    ...user,
    uid: accountId + '_' + user.uid,
    claims: { ...user.claims, project: accountById(accountId).projectId },
  }));
}

function activeTab() {
  return state.tabs.find((tab) => tab.id === state.activeTabId) || state.tabs[0];
}

function isCompactShell() {
  return matchMedia('(max-width: 860px)').matches;
}

function closeSidebarDrawer() {
  if (isCompactShell()) state.sidebarDrawerOpen = false;
}

function tabTitle(tab) {
  if (tab.type === 'project') return 'Project Overview';
  if (tab.type === 'query') return tab.path || tab.collection;
  if (tab.type === 'document') return tab.documentId;
  if (tab.type === 'auth') return 'Authentication';
  if (tab.type === 'script') return 'JS Query';
  if (tab.type === 'settings') return 'Settings';
  return 'Tab';
}

function tabIcon(tab) {
  if (tab.type === 'project') return 'database';
  if (tab.type === 'query') return 'folder';
  if (tab.type === 'document') return 'file';
  if (tab.type === 'auth') return 'users';
  if (tab.type === 'script') return 'code';
  if (tab.type === 'settings') return 'settings';
  return 'file';
}

function treeMatches(text) {
  return !state.treeFilter || text.toLowerCase().includes(state.treeFilter.toLowerCase());
}

function targetBadge(account) {
  return '<span class="badge ' + account.badge + '">' + escapeHtml(account.target) + '</span>';
}

function timestamp(value) {
  return { __type__: 'timestamp', value };
}

function geoPoint(latitude, longitude) {
  return { __type__: 'geoPoint', latitude, longitude };
}

function reference(path) {
  return { __type__: 'reference', path };
}

function normalizePath(path) {
  return (
    String(path || 'orders')
      .trim()
      .replace(/^\/+|\/+$/g, '') || 'orders'
  );
}

function pathParts(path) {
  return normalizePath(path).split('/').filter(Boolean);
}

function isCollectionNameQuery(tab) {
  return pathParts(tab.path || tab.collection).length === 1;
}

function rowsForQueryPath(path, accountId) {
  const parts = pathParts(path);
  if (parts.length === 1) return docsFor(parts[0], accountId);
  if (parts.length >= 3 && parts.length % 2 === 1) return subcollectionRowsFor(parts, accountId);
  const collection = parts[0];
  const documentId = parts[1];
  return docsFor(collection, accountId).filter((doc) => doc.id === documentId || doc.id.endsWith(documentId));
}

function normalizeSubcollection(subcollection) {
  if (typeof subcollection === 'string') return { name: subcollection, docs: [] };
  return { name: subcollection.name, docs: subcollection.docs || [] };
}

function subcollectionName(subcollection) {
  return normalizeSubcollection(subcollection).name;
}

function docsInSubcollection(row, subcollectionNameValue) {
  const subcollection = (row.subcollections || []).map(normalizeSubcollection).find((item) => item.name === subcollectionNameValue);
  if (!subcollection) return [];
  return subcollection.docs.map((doc) => ({
    ...doc,
    accountProjectId: row.accountProjectId,
    data: {
      ...doc.data,
    },
    subcollections: doc.subcollections || [],
  }));
}

function subcollectionRowsFor(parts, accountId) {
  let currentDoc = docsFor(parts[0], accountId).find((doc) => doc.id === parts[1] || doc.id.endsWith(parts[1]));
  if (!currentDoc) return [];

  for (let partIndex = 2; partIndex < parts.length; partIndex += 2) {
    const nestedRows = docsInSubcollection(currentDoc, parts[partIndex]);
    if (partIndex === parts.length - 1) return nestedRows;
    currentDoc = nestedRows.find((doc) => doc.id === parts[partIndex + 1] || doc.id.endsWith(parts[partIndex + 1]));
    if (!currentDoc) return [];
  }

  return [];
}

function selectedRowFor(tab, rows) {
  return rows.find((row) => row.id === tab.selectedDocumentId) || rows[0];
}

function loadedResultCount(tab, total) {
  const requested = tab.loadedResultCount || RESULT_PAGE_SIZE;
  return Math.min(total, requested);
}

function resultPageFor(tab, rows) {
  const loadedCount = loadedResultCount(tab, rows.length);
  return {
    rows: rows.slice(0, loadedCount),
    loadedCount,
    totalCount: rows.length,
    hasMore: loadedCount < rows.length,
  };
}

function valueType(value) {
  if (value && typeof value === 'object' && value.__type__) return value.__type__;
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

function displayValue(value) {
  if (value && typeof value === 'object' && value.__type__ === 'timestamp') return value.value;
  if (value && typeof value === 'object' && value.__type__ === 'geoPoint') return value.latitude + ', ' + value.longitude;
  if (value && typeof value === 'object' && value.__type__ === 'reference') return value.path;
  if (value && typeof value === 'object' && value.__type__ === 'bytes') return value.base64;
  if (Array.isArray(value)) return 'Array(' + value.length + ')';
  if (value && typeof value === 'object') return 'Object';
  if (value === '') return '(empty)';
  return String(value ?? 'null');
}

function toEditableJson(value) {
  if (Array.isArray(value)) return value.map(toEditableJson);
  if (value && typeof value === 'object') {
    if (value.__type__) return { ...value };
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toEditableJson(item)]));
  }
  return value;
}

function editableDocument(row) {
  return toEditableJson(row.data);
}

function resultDocument(row, path) {
  return {
    id: row.id,
    path,
    data: toEditableJson(row.data),
  };
}

function inspectorSectionOpen(tab, section, defaultOpen = true) {
  return tab.inspectorSections?.[section] ?? defaultOpen;
}

function documentPathForRow(queryPath, row) {
  const normalized = normalizePath(queryPath);
  return pathParts(normalized).length % 2 === 0 ? normalized : normalized + '/' + row.id;
}

function renderTree() {
  els.tree.innerHTML = accounts
    .map((account) => {
      const accountOpen = state.expandedAccounts[account.id];
      const accountKey = account.id + ':project';
      const accountVisible = treeMatches(account.name) || treeMatches(account.projectId) || state.treeFilter === '';
      if (!accountVisible) return '';
      const tools = accountOpen ? renderAccountChildren(account) : '';
      return renderTemplate('tree-account', {
        activeClass: state.selectedTreeKey === accountKey ? 'active' : '',
        accountId: account.id,
        openClass: accountOpen ? 'open' : '',
        name: account.name,
        projectId: account.projectId,
        tools,
      });
    })
    .join('');
}

function renderAccountChildren(account) {
  const toolStatus = state.accountToolStatus[account.id] || 'idle';
  if (toolStatus === 'error') {
    return renderTemplate('tree-load-error', { accountId: account.id, accountName: account.name });
  }
  if (toolStatus !== 'loaded') {
    return renderTemplate('tree-load-idle');
  }
  const firestoreOpen = Boolean(state.expandedFirestore[account.id]);
  const collectionsLoaded = Boolean(state.loadedCollections[account.id]);
  const collectionRows = firestoreOpen && collectionsLoaded ? collections.map((collection) => renderCollectionNode(account, collection)).join('') : '';
  const firestoreMeta = collectionsLoaded ? collections.length : 'load';
  return renderTemplate('tree-tools', {
    accountId: account.id,
    firestoreOpenClass: firestoreOpen ? 'open' : '',
    firestoreMeta,
    collectionRows,
    authActiveClass: activeClass(account.id + ':auth'),
    scriptActiveClass: activeClass(account.id + ':script'),
  });
}

function renderCollectionNode(account, collection) {
  const collectionKey = account.id + ':collection:' + collection.name;
  return renderTemplate('tree-collection', {
    activeClass: activeClass(collectionKey),
    accountId: account.id,
    collectionName: collection.name,
    count: collection.docs.length,
  });
}

function activeClass(key) {
  return state.selectedTreeKey === key ? 'active' : '';
}

function renderTabs() {
  els.tabs.innerHTML = state.tabs
    .map((tab) => {
      const account = accountById(tab.accountId);
      return renderTemplate('tab', {
        activeClass: tab.id === state.activeTabId ? 'active' : '',
        tabId: tab.id,
        icon: tabIcon(tab),
        title: tabTitle(tab),
        subtitle: account.name,
      });
    })
    .join('');
}

function renderToolbar() {
  const tab = activeTab();
  if (!tab) {
    els.toolbar.innerHTML = renderTemplate('toolbar-empty');
    return;
  }

  const account = accountById(tab.accountId);
  const accountOptions = accounts
    .map((option) => '<option value="' + option.id + '" ' + (option.id === tab.accountId ? 'selected' : '') + '>' + escapeHtml(option.name) + '</option>')
    .join('');

  els.toolbar.innerHTML = renderTemplate('toolbar', {
    icon: tabIcon(tab),
    title: tabTitle(tab),
    badge: targetBadge(account),
    tabId: tab.id,
    accountOptions,
  });
}

function renderContent() {
  const tab = activeTab();
  if (!tab) {
    els.content.innerHTML = emptyState('No tab open', 'Choose an item from the account tree.');
    return;
  }
  if (tab.type === 'project') els.content.innerHTML = renderProject(tab);
  if (tab.type === 'query') els.content.innerHTML = renderQuery(tab);
  if (tab.type === 'document') els.content.innerHTML = renderDocument(tab);
  if (tab.type === 'auth') els.content.innerHTML = renderAuth(tab);
  if (tab.type === 'script') els.content.innerHTML = renderScript(tab);
  if (tab.type === 'settings') els.content.innerHTML = renderSettings(tab);
}

function renderProject(tab) {
  const account = accountById(tab.accountId);
  return (
    '<div class="content-scroll stack">' +
    '<section class="panel"><div class="panel-head"><div class="panel-title"><span data-icon="database"></span>Project</div>' +
    targetBadge(account) +
    '</div>' +
    '<div class="panel-body detail-list">' +
    detail('Name', account.name) +
    detail('Project ID', account.projectId) +
    detail('Target', account.target) +
    detail('Tabs can switch account', 'Yes, per tab') +
    '</div></section>' +
    '<section class="panel"><div class="panel-head"><div class="panel-title"><span data-icon="folder"></span>Available tools</div></div>' +
    '<div class="panel-body"><div class="query-grid">' +
    '<button class="btn" data-action="open-query" data-account-id="' +
    account.id +
    '" data-collection="orders"><span data-icon="folder"></span>Firestore query</button>' +
    '<button class="btn" data-action="open-auth" data-account-id="' +
    account.id +
    '"><span data-icon="users"></span>Authentication</button>' +
    '<button class="btn" data-action="open-script" data-account-id="' +
    account.id +
    '"><span data-icon="code"></span>JS Query</button>' +
    '<button class="btn" data-action="show-add-account"><span data-icon="plus"></span>Add account</button>' +
    '</div></div></section>' +
    '</div>'
  );
}

function renderQuery(tab) {
  const queryPath = normalizePath(tab.path || tab.collection);
  const allRows = rowsForQueryPath(queryPath, tab.accountId);
  const resultPage = resultPageFor(tab, allRows);
  const rows = resultPage.rows;
  const selected = selectedRowFor(tab, rows);
  const showQueryControls = isCollectionNameQuery({ ...tab, path: queryPath });
  return (
    '<div class="content-scroll split query-layout ' +
    (tab.inspectorCollapsed ? 'inspector-collapsed' : '') +
    '" style="--inspector-width: ' +
    Math.max(280, Math.min(720, state.inspectorWidth || 360)) +
    'px">' +
    '<div class="stack">' +
    '<section class="panel"><div class="panel-head"><div class="panel-title"><span data-icon="folder"></span>Query target</div><span class="badge mock">' +
    (showQueryControls ? 'collection' : 'path') +
    '</span></div>' +
    '<div class="panel-body stack">' +
    '<div class="path-row"><input class="field-input" data-action="query-path" value="' +
    escapeHtml(queryPath) +
    '" placeholder="orders or orders/ord_1024">' +
    (showQueryControls ? '<input class="field-input limit-input" type="number" min="1" step="1" value="' + (tab.limit || 25) + '" aria-label="Limit">' : '<span></span>') +
    '<button class="btn primary" data-action="apply-query-path"><span data-icon="play"></span>Run</button><span class="muted small">Enter updates this tab</span></div>' +
    (showQueryControls
      ? filterRows(tab) +
        '<div class="query-grid"><input class="field-input" value="updatedAt"><select><option>desc</option><option>asc</option></select><input class="field-input" value="Sort field"><button class="btn" data-action="add-filter"><span data-icon="plus"></span>Filter</button></div>'
      : '<div class="muted small">Filter, sort, limit, and pagination are hidden for document/nested paths.</div>') +
    '</div></section>' +
    '<section class="panel"><div class="panel-head"><div class="panel-title"><span data-icon="table"></span>Results</div>' +
    viewToggle(tab) +
    '</div>' +
    '<div class="panel-body no-pad">' +
    renderResultView(rows, tab, queryPath, resultPage) +
    '</div></section>' +
    '</div>' +
    '<div class="splitter splitter-inspector" data-action="resize-inspector" role="separator" aria-orientation="vertical" title="Drag to resize result overview"></div>' +
    renderQueryInspector(tab, rows, selected, queryPath, resultPage.totalCount) +
    '</div>'
  );
}

function renderQueryInspector(tab, rows, selected, queryPath, totalCount) {
  const showSelectionPreview = tab.resultView !== 'tree' && tab.resultView !== 'json';
  const fieldCatalog = fieldCatalogForRows(rows);
  const collapsed = Boolean(tab.inspectorCollapsed);
  const toggleTitle = collapsed ? 'Expand result overview' : 'Collapse result overview';
  const toggleIcon = collapsed ? 'arrowLeft' : 'arrowRight';
  const editAction =
    showSelectionPreview && selected
      ? '<button class="btn" data-action="open-document-modal" data-account-id="' +
        tab.accountId +
        '" data-query-path="' +
        escapeHtml(queryPath) +
        '" data-document-id="' +
        selected.id +
        '">Edit JSON</button>'
      : '';
  const fieldSection = renderInspectorSection(tab, 'fields', 'Fields in results', 'table', fieldCatalog.length + ' fields', renderFieldCatalog(fieldCatalog, rows.length), true);
  const previewSection = showSelectionPreview
    ? renderInspectorSection(
        tab,
        'preview',
        'Selection preview',
        'file',
        selected ? selected.id : 'none',
        selected ? '<div class="json-tree">' + renderJson(editableDocument(selected)) + '</div>' : emptyState('No data to show', 'Run a collection or document path.'),
        true,
      )
    : '';
  return (
    '<aside class="panel query-inspector ' +
    (collapsed ? 'collapsed' : '') +
    '">' +
    (collapsed
      ? '<div class="inspector-strip">' +
        '<button class="icon-btn" data-action="toggle-query-inspector" title="Expand result overview (Cmd/Ctrl+\\)"><span data-icon="arrowLeft"></span></button>' +
        '<span data-icon="table"></span>' +
        '<span class="strip-badge">' +
        rows.length +
        '/' +
        totalCount +
        '</span>' +
        '<span class="strip-label">Result overview</span>' +
        '</div>'
      : '<div class="panel-head"><div class="panel-title"><span data-icon="table"></span><span>Result overview</span></div><div class="inspector-actions"><span class="badge mock">' +
        rows.length +
        '/' +
        totalCount +
        ' docs</span>' +
        editAction +
        '<button class="icon-btn inspector-toggle" data-action="toggle-query-inspector" title="' +
        toggleTitle +
        ' (Cmd/Ctrl+\\)"><span data-icon="' +
        toggleIcon +
        '"></span></button>' +
        '</div></div><div class="inspector-accordion">' +
        fieldSection +
        previewSection +
        '</div>') +
    '</aside>'
  );
}

function fieldCatalogForRows(rows) {
  const fields = new Map();
  rows.forEach((row) => {
    Object.entries(row.data).forEach(([key, value]) => {
      if (!fields.has(key)) fields.set(key, { name: key, types: new Set(), count: 0 });
      const field = fields.get(key);
      field.types.add(valueType(value));
      field.count += 1;
    });
  });
  return Array.from(fields.values()).sort((left, right) => left.name.localeCompare(right.name));
}

function renderInspectorSection(tab, section, title, iconName, meta, body, defaultOpen) {
  return (
    '<details class="inspector-section" data-inspector-section="' +
    section +
    '" ' +
    (inspectorSectionOpen(tab, section, defaultOpen) ? 'open' : '') +
    '><summary class="inspector-summary"><span class="chevron" data-icon="chevron"></span><span data-icon="' +
    iconName +
    '"></span><span>' +
    escapeHtml(title) +
    '</span><code>' +
    escapeHtml(meta) +
    '</code></summary><div class="inspector-body">' +
    body +
    '</div></details>'
  );
}

function renderFieldCatalog(fields, rowCount) {
  if (!fields.length) return emptyState('No fields', 'The current result has no first-level fields.');
  return (
    '<table class="field-catalog-table"><thead><tr><th>Field</th><th>Types</th><th>Docs</th></tr></thead><tbody>' +
    fields
      .map(
        (field) =>
          '<tr><td><code>' +
          escapeHtml(field.name) +
          '</code></td><td><code>' +
          escapeHtml(Array.from(field.types).sort().join(', ')) +
          '</code></td><td>' +
          field.count +
          '/' +
          rowCount +
          '</td></tr>',
      )
      .join('') +
    '</tbody></table>'
  );
}

function renderResultView(rows, tab, queryPath, resultPage) {
  if (!rows.length) return emptyState('No data to show', 'The current path did not return documents.');
  if (tab.resultView === 'tree') return renderTreeGrid(rows, tab, queryPath, resultPage);
  if (tab.resultView === 'json') return renderJsonText(rows, queryPath);
  return renderDocsTable(rows, tab, queryPath, resultPage);
}

function filterRows(tab) {
  const count = tab.filters || 1;
  return Array.from(
    { length: count },
    (_, index) =>
      '<div class="query-grid"><input class="field-input" value="status"><select><option>==</option><option>in</option><option>&gt;=</option></select><input class="field-input" value="' +
      (index === 0 ? 'paid' : 'pending') +
      '"><button class="icon-btn" title="Remove"><span data-icon="x"></span></button></div>',
  ).join('');
}

function viewToggle(tab) {
  return (
    '<div class="view-toggle">' +
    '<button class="' +
    (tab.resultView !== 'tree' && tab.resultView !== 'json' ? 'active' : '') +
    '" data-action="set-result-view" data-view="table"><span data-icon="table"></span>Table</button>' +
    '<button class="' +
    (tab.resultView === 'tree' ? 'active' : '') +
    '" data-action="set-result-view" data-view="tree"><span data-icon="folder"></span>Tree</button>' +
    '<button class="' +
    (tab.resultView === 'json' ? 'active' : '') +
    '" data-action="set-result-view" data-view="json"><span data-icon="braces"></span>JSON</button>' +
    '</div>'
  );
}

function renderDocsTable(rows, tab, queryPath, resultPage) {
  const loadMoreRow = resultPage?.hasMore
    ? '<tr class="load-more-row" data-action="load-more-results"><td colspan="6"><button class="btn" data-action="load-more-results"><span data-icon="plus"></span>Load more</button><span class="muted small">Showing ' +
      resultPage.loadedCount +
      ' of ' +
      resultPage.totalCount +
      ' documents</span></td></tr>'
    : '';
  return (
    '<table><thead><tr><th>Document ID</th><th>Status/name</th><th>Total/price</th><th>Updated</th><th>Subcollections</th><th>Account</th></tr></thead><tbody>' +
    rows
      .map((row, index) => {
        const documentPath = documentPathForRow(queryPath, row);
        return (
          '<tr class="doc-row ' +
          ((tab.selectedDocumentId ? row.id === tab.selectedDocumentId : index === 0) ? 'active' : '') +
          '" data-action="select-doc-row" data-account-id="' +
          tab.accountId +
          '" data-query-path="' +
          escapeHtml(queryPath) +
          '" data-document-id="' +
          row.id +
          '" data-context-kind="document" data-context-path="' +
          escapeHtml(documentPath) +
          '" data-context-account-id="' +
          tab.accountId +
          '">' +
          '<td><code>' +
          escapeHtml(row.id) +
          '</code></td>' +
          '<td contenteditable="true">' +
          escapeHtml(row.data.status || row.data.name || row.data.email || row.data.tier || row.data.kind || row.data.message || '-') +
          '</td>' +
          '<td contenteditable="true">' +
          escapeHtml(displayValue(row.data.total || row.data.price || row.data.orders || '-')) +
          '</td>' +
          '<td contenteditable="true">' +
          escapeHtml(displayValue(row.data.updatedAt || row.data.createdAt || '-')) +
          '</td>' +
          '<td>' +
          renderSubcollectionCell(row, tab, queryPath) +
          '</td>' +
          '<td>' +
          escapeHtml(row.accountProjectId) +
          '</td>' +
          '</tr>'
        );
      })
      .join('') +
    loadMoreRow +
    '</tbody></table>'
  );
}

function renderSubcollectionCell(row, tab, queryPath) {
  if (!row.subcollections || !row.subcollections.length) return '<span class="muted small">none</span>';
  return (
    '<span class="subcollection-cell">' +
    row.subcollections
      .map((subcollection) => {
        const name = subcollectionName(subcollection);
        return (
          '<button class="subcollection-btn" data-action="open-subcollection" data-account-id="' +
          tab.accountId +
          '" data-query-path="' +
          escapeHtml(queryPath) +
          '" data-document-id="' +
          row.id +
          '" data-subcollection="' +
          escapeHtml(name) +
          '" data-context-kind="subcollection" data-context-path="' +
          escapeHtml(documentPathForRow(queryPath, row) + '/' + name) +
          '" data-context-account-id="' +
          tab.accountId +
          '" title="Open subcollection"><span data-icon="folder"></span>' +
          escapeHtml(name) +
          '</button>'
        );
      })
      .join('') +
    '</span>'
  );
}

function renderTreeGrid(rows, tab, queryPath, resultPage) {
  const targetType = pathParts(queryPath).length % 2 === 0 ? 'Document' : 'Collection';
  const children = rows.map((row) => renderDocumentTreeNode(row, tab, queryPath, 1)).join('') + renderTreeLoadMoreNode(resultPage, 1);
  return (
    '<div class="result-tree" role="tree">' +
    renderResultTreeNode({
      label: queryPath,
      meta: targetType,
      icon: 'folder',
      level: 0,
      open: true,
      kind: targetType.toLowerCase(),
      path: queryPath,
      accountId: tab.accountId,
      children,
    }) +
    '</div>'
  );
}

function renderTreeLoadMoreNode(resultPage, level) {
  if (!resultPage?.hasMore) return '';
  return (
    '<div class="result-tree-row result-tree-leaf load-more-row" role="treeitem" style="--level:' +
    level +
    '"><span class="result-tree-spacer"></span><span data-icon="plus"></span><span class="result-tree-label"><button class="load-more-inline" data-action="load-more-results">Load more</button></span><span class="result-tree-value">Showing ' +
    resultPage.loadedCount +
    ' of ' +
    resultPage.totalCount +
    ' documents</span><code>More</code></div>'
  );
}

function renderDocumentTreeNode(row, tab, queryPath, level) {
  const documentPath = documentPathForRow(queryPath, row);
  const fields = Object.entries(row.data)
    .map(([key, value]) => renderValueTreeNode(key, value, level + 1))
    .join('');
  const subcollections = renderSubcollectionTreeNodes(row, tab, documentPath, level + 1);
  return renderResultTreeNode({
    label: row.id,
    meta: 'Document',
    icon: 'file',
    level,
    kind: 'document',
    path: documentPath,
    accountId: tab.accountId,
    children: fields + subcollections,
  });
}

function renderValueTreeNode(key, value, level) {
  if (value && typeof value === 'object' && !value.__type__) {
    const entries = Array.isArray(value) ? value.map((item, index) => ['[' + index + ']', item]) : Object.entries(value);
    return renderResultTreeNode({
      label: key,
      meta: valueType(value),
      icon: Array.isArray(value) ? 'braces' : 'folder',
      level,
      children: entries.map(([childKey, childValue]) => renderValueTreeNode(childKey, childValue, level + 1)).join(''),
    });
  }
  return renderResultTreeLeaf({ label: key, value: displayValue(value), meta: valueType(value), level });
}

function renderSubcollectionTreeNodes(row, tab, documentPath, level) {
  const subcollections = (row.subcollections || []).map(normalizeSubcollection);
  if (!subcollections.length) return '';
  return subcollections
    .map((subcollection) => {
      const subcollectionPath = documentPath + '/' + subcollection.name;
      const docs = docsInSubcollection(row, subcollection.name)
        .map((doc) => renderDocumentTreeNode(doc, tab, subcollectionPath, level + 1))
        .join('');
      return renderResultTreeNode({
        label: subcollection.name,
        meta: 'Subcollection',
        icon: 'folder',
        level,
        kind: 'subcollection',
        path: subcollectionPath,
        accountId: tab.accountId,
        actionPath: subcollectionPath,
        children: docs || renderResultTreeLeaf({ label: 'No documents', value: '', meta: 'Empty', level: level + 1 }),
      });
    })
    .join('');
}

function renderResultTreeNode({ label, meta, icon, level, children, open = false, kind, path, accountId, actionPath }) {
  const contextAttrs = path
    ? ' data-context-kind="' + escapeHtml(kind || 'node') + '" data-context-path="' + escapeHtml(path) + '" data-context-account-id="' + escapeHtml(accountId || '') + '"'
    : '';
  const action = actionPath
    ? '<button class="icon-btn result-tree-open" data-action="open-tree-path" data-account-id="' +
      escapeHtml(accountId) +
      '" data-path="' +
      escapeHtml(actionPath) +
      '" title="Open in new tab"><span data-icon="folder"></span></button>'
    : '';
  return (
    '<details class="result-tree-node" role="treeitem" ' +
    (open ? 'open' : '') +
    '><summary class="result-tree-row" style="--level:' +
    level +
    '"' +
    contextAttrs +
    '><span class="result-tree-chevron" data-icon="chevron"></span><span data-icon="' +
    icon +
    '"></span><span class="result-tree-label">' +
    escapeHtml(label) +
    '</span><span class="result-tree-value"></span><code>' +
    escapeHtml(meta) +
    '</code>' +
    action +
    '</summary><div role="group">' +
    children +
    '</div></details>'
  );
}

function renderResultTreeLeaf({ label, value, meta, level }) {
  return (
    '<div class="result-tree-row result-tree-leaf" role="treeitem" style="--level:' +
    level +
    '"><span class="result-tree-spacer"></span><span data-icon="file"></span><span class="result-tree-label">' +
    escapeHtml(label) +
    '</span><span class="result-tree-value">' +
    escapeHtml(value) +
    '</span><code>' +
    escapeHtml(meta) +
    '</code></div>'
  );
}

function renderJsonText(rows, queryPath) {
  const payload = {
    path: queryPath,
    documents: rows.map((row) => resultDocument(row, documentPathForRow(queryPath, row))),
  };
  return '<textarea class="editor json-textarea" spellcheck="false" readonly aria-readonly="true">' + escapeHtml(JSON.stringify(payload, null, 2)) + '</textarea>';
}

function renderDocument(tab) {
  const doc = docsFor(tab.collection, tab.accountId).find((item) => item.id === tab.documentId) || docsFor(tab.collection, tab.accountId)[0];
  const documentValue = editableDocument(doc);
  return (
    '<div class="content-scroll split split-even">' +
    '<section class="panel"><div class="panel-head"><div class="panel-title"><span data-icon="braces"></span>Whole document JSON</div><div><button class="btn" data-action="fake-save"><span data-icon="save"></span>Save</button> <button class="btn danger" data-action="fake-delete"><span data-icon="trash"></span>Delete</button></div></div>' +
    '<textarea class="editor">' +
    escapeHtml(JSON.stringify(documentValue, null, 2)) +
    '</textarea></section>' +
    '<section class="panel"><div class="panel-head"><div class="panel-title"><span data-icon="table"></span>Fields</div><button class="btn" data-action="fake-save"><span data-icon="plus"></span>Field</button></div>' +
    '<div class="panel-body no-pad"><table><thead><tr><th>Field</th><th>Value</th><th>Type</th></tr></thead><tbody>' +
    Object.entries(doc.data)
      .map(([key, value]) => '<tr><td><code>' + escapeHtml(key) + '</code></td><td>' + escapeHtml(displayValue(value)) + '</td><td>' + escapeHtml(valueType(value)) + '</td></tr>')
      .join('') +
    '</tbody></table></div></section>' +
    '</div>'
  );
}

function renderScript(tab) {
  const outputTab = tab.outputTab || 'results';
  const hasError = tab.scriptState === 'error';
  const isEmpty = tab.scriptState === 'empty';
  return (
    '<div class="content-scroll split split-even">' +
    '<section class="panel"><div class="panel-head"><div class="panel-title"><span data-icon="code"></span>JavaScript Query</div><div><button class="btn primary" data-action="run-script"><span data-icon="play"></span>Run</button> <button class="btn" data-action="simulate-empty">Empty</button> <button class="btn danger" data-action="simulate-error">Error</button></div></div>' +
    '<textarea class="editor script-editor">' +
    escapeHtml(sampleScript()) +
    '</textarea></section>' +
    '<section class="panel script-output-panel"><div class="panel-head"><div class="panel-title"><span data-icon="table"></span>Output</div>' +
    outputToggle(outputTab) +
    '</div>' +
    '<div class="panel-body no-pad">' +
    (outputTab === 'logs'
      ? renderLogs(tab)
      : outputTab === 'errors' || hasError
        ? renderErrors(hasError)
        : isEmpty
          ? emptyState('No data to show', 'The script returned undefined, null, or an unsupported value.')
          : renderScriptStream(tab)) +
    '</div></section>' +
    '</div>'
  );
}

function sampleScript() {
  return "const db = admin.firestore();\nconst snapshot = await db.collection('orders')\n  .where('status', '==', 'paid')\n  .limit(10)\n  .get();\n\nconsole.log('Fetched', snapshot.size, 'orders');\nyield snapshot.docs[0];\nyield db.collection('customers');\nyield snapshot;\nreturn snapshot;";
}

function outputToggle(active) {
  return (
    '<div class="view-toggle">' +
    '<button class="' +
    (active === 'results' ? 'active' : '') +
    '" data-action="set-output-tab" data-output-tab="results"><span data-icon="table"></span>Results</button>' +
    '<button class="' +
    (active === 'logs' ? 'active' : '') +
    '" data-action="set-output-tab" data-output-tab="logs"><span data-icon="file"></span>Logs</button>' +
    '<button class="' +
    (active === 'errors' ? 'active' : '') +
    '" data-action="set-output-tab" data-output-tab="errors"><span data-icon="auth"></span>Errors</button>' +
    '</div>'
  );
}

function renderLogs(tab) {
  return (
    '<div class="json-tree">' +
    renderJson([
      '[10:41:02] Firebase Admin SDK ready for ' + accountById(tab.accountId).projectId,
      '[10:41:03] Fetched 2 orders',
      '[10:41:03] Appended yield DocumentSnapshot to result stream',
      '[10:41:03] Appended yield QuerySnapshot to result stream',
      '[10:41:03] Appended return QuerySnapshot to result stream',
    ]) +
    '</div>'
  );
}

function renderScriptStream(tab) {
  const rows = docsFor('orders', tab.accountId).slice(0, 2);
  const customers = docsFor('customers', tab.accountId);
  return (
    '<div class="script-stream">' +
    '<details class="stream-item"><summary class="stream-head"><span>yield DocumentSnapshot</span><span class="badge mock">orders/' +
    escapeHtml(rows[0].id) +
    '</span></summary><div class="json-tree">' +
    renderJson(resultDocument(rows[0], 'orders/' + rows[0].id)) +
    '</div></details>' +
    '<details class="stream-item"><summary class="stream-head"><span>yield CollectionReference</span><span class="badge mock">customers</span></summary>' +
    renderDocsTable(customers, { ...tab, selectedDocumentId: customers[0]?.id }, 'customers') +
    '</details>' +
    '<details class="stream-item"><summary class="stream-head"><span>yield QuerySnapshot</span><span class="badge mock">orders where status == paid</span></summary>' +
    renderDocsTable(rows, { ...tab, selectedDocumentId: rows[0]?.id }, 'orders') +
    '</details>' +
    '<details class="stream-item"><summary class="stream-head"><span>return QuerySnapshot</span><span class="badge mock">final return</span></summary><div class="json-tree">' +
    renderJson(rows.map((row) => resultDocument(row, 'orders/' + row.id))) +
    '</div></details>' +
    '</div>'
  );
}

function renderErrors(hasError) {
  if (!hasError) return emptyState('No errors', 'Thrown script errors will appear here.');
  return '<div class="json-tree">' + renderJson({ name: 'FirebaseError', code: 'permission-denied', message: 'Mock script error preview' }) + '</div>';
}

function renderAuth(tab) {
  const users = usersFor(tab.accountId).filter((user) => !tab.userSearch || (user.email + user.displayName + user.uid).toLowerCase().includes(tab.userSearch.toLowerCase()));
  const selected = users.find((user) => user.uid === tab.selectedUserId) || users[0];
  return (
    '<div class="content-scroll split">' +
    '<section class="panel"><div class="panel-head"><div class="panel-title"><span data-icon="users"></span>Users</div><input class="field-input" style="max-width:260px" data-action="auth-search" placeholder="Filter users" value="' +
    escapeHtml(tab.userSearch || '') +
    '"></div>' +
    '<div class="panel-body no-pad"><table><thead><tr><th>UID</th><th>Email</th><th>Name</th><th>Provider</th><th>Status</th></tr></thead><tbody>' +
    users
      .map(
        (user) =>
          '<tr class="user-row ' +
          (selected && user.uid === selected.uid ? 'active' : '') +
          '" data-action="select-user" data-user-id="' +
          user.uid +
          '"><td><code>' +
          escapeHtml(user.uid) +
          '</code></td><td>' +
          escapeHtml(user.email) +
          '</td><td>' +
          escapeHtml(user.displayName) +
          '</td><td>' +
          escapeHtml(user.provider) +
          '</td><td>' +
          (user.disabled ? 'disabled' : 'active') +
          '</td></tr>',
      )
      .join('') +
    '</tbody></table></div></section>' +
    '<aside class="panel"><div class="panel-head"><div class="panel-title"><span data-icon="auth"></span>User detail</div><span class="badge mock">claims</span></div>' +
    '<div class="panel-body stack">' +
    (selected
      ? '<div class="detail-list">' +
        detail('UID', selected.uid) +
        detail('Email', selected.email) +
        detail('Name', selected.displayName) +
        detail('Provider', selected.provider) +
        detail('Disabled', selected.disabled ? 'Yes' : 'No') +
        '</div><div class="json-tree">' +
        renderJson(selected.claims) +
        '</div>'
      : emptyState('No user', 'No matching user selected.')) +
    '</div></aside>' +
    '</div>'
  );
}

function renderSettings() {
  return (
    '<div class="content-scroll stack">' +
    '<section class="panel"><div class="panel-head"><div class="panel-title"><span data-icon="settings"></span>Appearance</div></div><div class="panel-body detail-list">' +
    detail('Theme', 'Light and dark in this wireframe') +
    detail('Custom theme', 'Later') +
    detail('Icon style', 'Inline line icons, no external dependency') +
    '</div></section>' +
    '<section class="panel"><div class="panel-head"><div class="panel-title"><span data-icon="database"></span>Runtime targets</div></div><div class="panel-body detail-list">' +
    detail('Production', 'Service account JSON') +
    detail('Emulator', 'Firestore and Auth host/port profile') +
    detail('Wireframe', 'Mock repository data') +
    '</div></section>' +
    '</div>'
  );
}

function renderStatusbar() {
  const tab = activeTab();
  const account = tab ? accountById(tab.accountId) : accounts[0];
  els.statusbar.innerHTML = renderTemplate('statusbar', {
    status: state.status,
    selectedTreeKey: state.selectedTreeKey,
    accountName: account.name,
    tabCount: state.tabs.length,
    theme: state.theme,
  });
}

function renderDocumentModal() {
  if (!state.documentModal) {
    els.documentModal.classList.remove('open');
    els.documentModal.innerHTML = '';
    return;
  }

  const { accountId, queryPath, documentId } = state.documentModal;
  const rows = rowsForQueryPath(queryPath, accountId);
  const row = rows.find((item) => item.id === documentId) || rows[0];
  if (!row) {
    els.documentModal.classList.add('open');
    els.documentModal.innerHTML =
      '<div class="modal"><div class="modal-head"><strong>No document</strong><button class="icon-btn" data-action="close-document-modal" title="Close"><span data-icon="x"></span></button></div>' +
      emptyState('No data to show', 'The selected document was not found.') +
      '</div>';
    return;
  }

  const path = documentPathForRow(queryPath, row);
  els.documentModal.classList.add('open');
  els.documentModal.innerHTML =
    '<div class="modal large">' +
    '<div class="modal-head"><strong>Edit document JSON</strong><div><span class="badge mock">' +
    escapeHtml(accountById(accountId).name) +
    '</span> <button class="icon-btn" data-action="close-document-modal" title="Close"><span data-icon="x"></span></button></div></div>' +
    '<div class="modal-body"><div class="split split-even">' +
    '<section class="panel"><div class="panel-head"><div class="panel-title"><span data-icon="braces"></span>Document fields</div><span class="badge mock">' +
    escapeHtml(path) +
    '</span><div><button class="btn" data-action="fake-save"><span data-icon="save"></span>Save</button> <button class="btn danger" data-action="fake-delete"><span data-icon="trash"></span>Delete</button></div></div>' +
    '<textarea class="editor json-textarea" spellcheck="false">' +
    escapeHtml(JSON.stringify(editableDocument(row), null, 2)) +
    '</textarea></section>' +
    '<section class="panel"><div class="panel-head"><div class="panel-title"><span data-icon="table"></span>Fields</div></div>' +
    '<div class="panel-body no-pad"><table><thead><tr><th>Field</th><th>Value</th><th>Type</th></tr></thead><tbody>' +
    Object.entries(row.data)
      .map(
        ([key, value]) =>
          '<tr><td><code>' + escapeHtml(key) + '</code></td><td>' + escapeHtml(displayValue(value)) + '</td><td><code>' + escapeHtml(valueType(value)) + '</code></td></tr>',
      )
      .join('') +
    '</tbody></table></div></section>' +
    '</div></div>' +
    '<div class="modal-foot"><span class="muted small">Double-click table rows to open this editor. `__type__` values preserve Firestore-specific types.</span><button class="btn" data-action="close-document-modal">Done</button></div>' +
    '</div>';
}

function renderConfirmModal() {
  if (!state.confirmModal) {
    els.confirmModal.classList.remove('open');
    els.confirmModal.innerHTML = '';
    return;
  }

  els.confirmModal.classList.add('open');
  els.confirmModal.innerHTML = renderTemplate('confirm-modal', {
    title: state.confirmModal.title,
    message: state.confirmModal.message,
    confirmLabel: state.confirmModal.confirmLabel,
  });
}

function requestConfirmation({ title, message, confirmLabel, onConfirm }) {
  state.confirmModal = { title, message, confirmLabel, onConfirm };
  state.status = 'Confirmation required';
}

function requestRemoveAccount(accountId) {
  const account = accountById(accountId);
  if (accounts.length === 1) {
    state.status = 'Keep at least one account';
    return;
  }
  requestConfirmation({
    title: 'Remove account?',
    message: 'Remove ' + account.name + ' from this local workspace. Open tabs for this account will close.',
    confirmLabel: 'Remove',
    onConfirm: () => removeAccount(accountId),
  });
}

function requestDeleteDocument() {
  const tab = activeTab();
  requestConfirmation({
    title: 'Delete document?',
    message: 'Delete the selected mock document. The final app will require this confirmation before destructive writes.',
    confirmLabel: 'Delete',
    onConfirm: () => {
      state.documentModal = null;
      state.status = tab ? 'Deleted mock document from ' + tabTitle(tab) : 'Deleted mock document';
    },
  });
}

function renderContextMenu() {
  if (!state.contextMenu) {
    els.contextMenu.innerHTML = '';
    return;
  }

  els.contextMenu.innerHTML = renderTemplate('context-menu', { x: state.contextMenu.x, y: state.contextMenu.y, items: renderContextMenuItems(state.contextMenu) });
}

function renderContextMenuItems(context) {
  if (context.kind === 'tab') {
    return [
      contextMenuButton('tab-context-close', 'x', 'Close'),
      contextMenuButton('tab-context-close-others', 'x', 'Close Others'),
      contextMenuButton('tab-context-close-left', 'arrowLeft', 'Close Tabs to Left'),
      contextMenuButton('tab-context-close-right', 'arrowRight', 'Close Tabs to Right'),
      contextMenuButton('tab-context-sort-account', 'database', 'Sort by Account'),
      contextMenuButton('tab-context-close-all', 'trash', 'Close All'),
    ].join('');
  }
  return contextMenuButton('open-context-new-tab', 'folder', 'Open in new tab');
}

function contextMenuButton(action, iconName, label) {
  return '<button data-action="' + action + '"><span data-icon="' + iconName + '"></span>' + escapeHtml(label) + '</button>';
}

function renderJson(value) {
  if (value === null) return '<span class="json-null">null</span>';
  if (Array.isArray(value)) {
    return (
      '<details open><summary>Array(' +
      value.length +
      ')</summary>' +
      value.map((item, index) => '<div><span class="json-key">' + index + '</span>: ' + renderJson(item) + '</div>').join('') +
      '</details>'
    );
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    return (
      '<details open><summary>Object(' +
      entries.length +
      ')</summary>' +
      entries.map(([key, item]) => '<div><span class="json-key">' + escapeHtml(key) + '</span>: ' + renderJson(item) + '</div>').join('') +
      '</details>'
    );
  }
  if (typeof value === 'string') return '<span class="json-string">"' + escapeHtml(value) + '"</span>';
  if (typeof value === 'number') return '<span class="json-number">' + value + '</span>';
  if (typeof value === 'boolean') return '<span class="json-bool">' + value + '</span>';
  return escapeHtml(String(value));
}

function detail(label, value) {
  return renderTemplate('detail-item', { label, value });
}

function emptyState(title, message) {
  return renderTemplate('empty-state', { title, message });
}

function loadAccountTools(accountId) {
  state.accountLoadAttempts[accountId] = (state.accountLoadAttempts[accountId] || 0) + 1;
  if (accountId === 'stage' && state.accountLoadAttempts[accountId] === 1) {
    state.accountToolStatus[accountId] = 'error';
    state.status = 'Could not load tools for ' + accountById(accountId).name;
    return false;
  }
  state.accountToolStatus[accountId] = 'loaded';
  state.status = 'Loaded tools for ' + accountById(accountId).name;
  return true;
}

function removeAccount(accountId) {
  const account = accountById(accountId);
  const index = accounts.findIndex((item) => item.id === accountId);
  if (index === -1) return;
  if (accounts.length === 1) {
    state.status = 'Keep at least one account';
    return;
  }
  accounts.splice(index, 1);
  delete state.expandedAccounts[accountId];
  delete state.accountToolStatus[accountId];
  delete state.accountLoadAttempts[accountId];
  delete state.expandedFirestore[accountId];
  delete state.loadedCollections[accountId];
  state.tabs = state.tabs.filter((tab) => tab.accountId !== accountId);
  if (!state.tabs.find((tab) => tab.id === state.activeTabId)) {
    state.activeTabId = state.tabs[0]?.id || null;
  }
  state.selectedTreeKey = accounts[0] ? accounts[0].id + ':project' : '';
  state.status = 'Removed ' + account.name;
}

function scheduleTreeSingleOpen(callback) {
  clearTimeout(treeOpenTimer);
  treeOpenTimer = setTimeout(() => {
    treeOpenTimer = null;
    callback();
  }, 180);
}

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function navigationSnapshot(label) {
  const tab = activeTab();
  return {
    label,
    activeTabId: state.activeTabId,
    selectedTreeKey: state.selectedTreeKey,
    treeFilter: state.treeFilter,
    expandedAccounts: clonePlain(state.expandedAccounts),
    accountToolStatus: clonePlain(state.accountToolStatus),
    accountLoadAttempts: clonePlain(state.accountLoadAttempts),
    expandedFirestore: clonePlain(state.expandedFirestore),
    loadedCollections: clonePlain(state.loadedCollections),
    activeTab: tab ? clonePlain(tab) : null,
  };
}

function recordHistory(label) {
  if (state.restoringHistory) return;
  const entry = navigationSnapshot(label || 'Interaction');
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push(entry);
  if (state.history.length > 80) state.history.shift();
  state.historyIndex = state.history.length - 1;
}

function restoreHistory(delta) {
  const nextIndex = state.historyIndex + delta;
  if (nextIndex < 0 || nextIndex >= state.history.length) return;
  const entry = state.history[nextIndex];
  const targetTab = entry.activeTabId ? state.tabs.find((tab) => tab.id === entry.activeTabId) : null;
  state.historyIndex = nextIndex;
  if (entry.activeTabId && !targetTab) {
    updateHistoryControls();
    return;
  }
  state.restoringHistory = true;
  state.selectedTreeKey = entry.selectedTreeKey;
  state.treeFilter = entry.treeFilter;
  state.expandedAccounts = clonePlain(entry.expandedAccounts);
  state.accountToolStatus = clonePlain(entry.accountToolStatus);
  state.accountLoadAttempts = clonePlain(entry.accountLoadAttempts);
  state.expandedFirestore = clonePlain(entry.expandedFirestore);
  state.loadedCollections = clonePlain(entry.loadedCollections);
  if (targetTab && entry.activeTab) Object.assign(targetTab, entry.activeTab);
  state.activeTabId = entry.activeTabId;
  state.status = 'History: ' + entry.label;
  render();
  state.restoringHistory = false;
}

function updateHistoryControls() {
  const back = document.querySelector('[data-action="history-back"]');
  const forward = document.querySelector('[data-action="history-forward"]');
  if (back) back.disabled = state.historyIndex <= 0;
  if (forward) forward.disabled = state.historyIndex >= state.history.length - 1;
}

function actionLabel(action, target) {
  if (action === 'toggle-account') return 'Toggle ' + accountById(target.getAttribute('data-account-id')).name;
  if (action === 'toggle-firestore') return 'Toggle Firestore';
  if (action === 'refresh-firestore') return 'Refresh Firestore';
  if (action === 'set-result-view') return 'Show ' + target.getAttribute('data-view') + ' results';
  if (action === 'set-output-tab') return 'Show ' + target.getAttribute('data-output-tab') + ' output';
  if (action === 'set-theme') return 'Set ' + target.getAttribute('data-theme-value') + ' theme';
  return action.replace(/-/g, ' ');
}

function makeTabKey(type, accountId, payload = {}) {
  return type + ':' + accountId + ':' + (payload.path || payload.collection || '') + ':' + (payload.documentId || '');
}

function openTab(type, accountId, payload = {}, options = {}) {
  const key = makeTabKey(type, accountId, payload);
  let tab = options.alwaysNew ? null : state.tabs.find((item) => item.key === key);
  if (!tab) {
    tab = { id: 'tab_' + Math.random().toString(36).slice(2), key, type, accountId, resultView: 'table', outputTab: 'results', filters: 1, ...payload };
    state.tabs.push(tab);
  }
  state.activeTabId = tab.id;
  state.status = 'Opened ' + tabTitle(tab) + ' for ' + accountById(accountId).name;
  if (options.recordHistory !== false) recordHistory(options.historyLabel || state.status);
  render();
  return tab;
}

function openQueryPathInNewTab(accountId, path) {
  const parts = pathParts(path);
  const collection = parts.length % 2 === 1 ? parts[parts.length - 1] : parts[0];
  state.selectedTreeKey = accountId + ':collection:' + path;
  openTab('query', accountId, { collection, path }, { alwaysNew: true, historyLabel: 'Open ' + path });
}

function closeTab(tabId, options = {}) {
  const index = state.tabs.findIndex((tab) => tab.id === tabId);
  state.tabs = state.tabs.filter((tab) => tab.id !== tabId);
  if (state.activeTabId === tabId) {
    state.activeTabId = state.tabs[Math.max(0, index - 1)]?.id || state.tabs[0]?.id;
  }
  state.status = 'Closed tab';
  if (options.recordHistory !== false) recordHistory('Close tab');
  render();
}

function closeTabsByIds(tabIds, label) {
  const ids = new Set(tabIds);
  if (!ids.size) {
    state.status = 'No tabs to close';
    render();
    return;
  }
  state.tabs = state.tabs.filter((tab) => !ids.has(tab.id));
  if (!state.tabs.find((tab) => tab.id === state.activeTabId)) {
    state.activeTabId = state.tabs[0]?.id || null;
  }
  state.status = label;
  recordHistory(label);
  render();
}

function closeOtherTabs(tabId) {
  const target = state.tabs.find((tab) => tab.id === tabId);
  if (!target) return;
  state.tabs = [target];
  state.activeTabId = tabId;
  state.status = 'Closed other tabs';
  recordHistory('Close other tabs');
  render();
}

function closeTabsToSide(tabId, side) {
  const index = state.tabs.findIndex((tab) => tab.id === tabId);
  if (index === -1) return;
  const tabsToClose = side === 'left' ? state.tabs.slice(0, index) : state.tabs.slice(index + 1);
  closeTabsByIds(
    tabsToClose.map((tab) => tab.id),
    side === 'left' ? 'Closed tabs to left' : 'Closed tabs to right',
  );
}

function moveTab(sourceTabId, targetTabId, position) {
  if (!sourceTabId || !targetTabId || sourceTabId === targetTabId) return;
  const fromIndex = state.tabs.findIndex((tab) => tab.id === sourceTabId);
  if (fromIndex === -1) return;
  const [movedTab] = state.tabs.splice(fromIndex, 1);
  const targetIndex = state.tabs.findIndex((tab) => tab.id === targetTabId);
  if (targetIndex === -1) {
    state.tabs.splice(fromIndex, 0, movedTab);
    return;
  }
  state.tabs.splice(position === 'after' ? targetIndex + 1 : targetIndex, 0, movedTab);
  state.status = 'Moved tab ' + tabTitle(movedTab);
  recordHistory('Reorder tabs');
  render();
}

function sortTabsByAccount() {
  state.tabs = state.tabs
    .map((tab, index) => ({ tab, index }))
    .sort((left, right) => accountById(left.tab.accountId).name.localeCompare(accountById(right.tab.accountId).name) || left.index - right.index)
    .map((item) => item.tab);
  state.status = 'Sorted tabs by account';
  recordHistory('Sort tabs by account');
  render();
}

function loadMoreResults(tab) {
  if (!tab || tab.type !== 'query') return;
  const queryPath = normalizePath(tab.path || tab.collection);
  const total = rowsForQueryPath(queryPath, tab.accountId).length;
  const nextCount = Math.min(total, loadedResultCount(tab, total) + RESULT_PAGE_SIZE);
  tab.loadedResultCount = nextCount;
  state.status = nextCount < total ? 'Loaded ' + nextCount + ' of ' + total + ' documents' : 'Loaded all ' + total + ' documents';
  recordHistory('Load more results');
  render();
}

function clearTabDragClasses() {
  document.querySelectorAll('.tab.dragging, .tab.drag-over-left, .tab.drag-over-right').forEach((node) => {
    node.classList.remove('dragging', 'drag-over-left', 'drag-over-right');
  });
}

function render() {
  const compactShell = isCompactShell();
  const app = document.querySelector('.app');
  if (!compactShell) state.sidebarDrawerOpen = false;
  app.classList.toggle('sidebar-collapsed', state.sidebarCollapsed && !compactShell);
  app.classList.toggle('sidebar-drawer-open', state.sidebarDrawerOpen && compactShell);
  app.style.setProperty('--sidebar-width', clampSidebarWidth(state.sidebarWidth) + 'px');
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('firebase-explorer-wireframe-theme', state.theme);
  document.querySelectorAll('[data-action="set-theme"]').forEach((button) => {
    button.classList.toggle('active', button.getAttribute('data-theme-value') === state.theme);
  });
  renderTree();
  renderSidebarRail();
  renderTabs();
  renderToolbar();
  renderContent();
  renderStatusbar();
  renderDocumentModal();
  renderConfirmModal();
  renderHotkeyHelpModal();
  renderContextMenu();
  hydrateIcons();
  updateHistoryControls();
}

function clampSidebarWidth(value) {
  const v = Number(value) || 280;
  return Math.max(220, Math.min(520, v));
}

function clampInspectorWidth(value) {
  const v = Number(value) || 360;
  return Math.max(280, Math.min(720, v));
}

function renderSidebarRail() {
  if (!els.sidebarRail) return;
  const items = accounts
    .map((account) => {
      const expanded = state.expandedAccounts[account.id];
      const active = state.selectedTreeKey && state.selectedTreeKey.startsWith(account.id + ':');
      return (
        '<button class="rail-btn ' +
        (active ? 'active' : '') +
        '" data-action="rail-account" data-account-id="' +
        account.id +
        '" title="' +
        escapeHtml(account.name) +
        (expanded ? ' (expanded)' : '') +
        '"><span data-icon="database"></span></button>'
      );
    })
    .join('');
  els.sidebarRail.innerHTML =
    '<button class="rail-btn" data-action="toggle-sidebar" title="Expand workspace tree (Cmd/Ctrl+B)"><span data-icon="arrowRight"></span></button>' +
    '<div class="rail-divider"></div>' +
    items +
    '<div class="rail-spacer"></div>' +
    '<button class="rail-btn" data-action="show-add-account" title="Add account"><span data-icon="plus"></span></button>' +
    '<button class="rail-btn" data-action="show-hotkey-help" title="Keyboard shortcuts (?)"><span data-icon="settings"></span></button>';
}

function renderHotkeyHelpModal() {
  if (!els.hotkeyHelpModal) return;
  if (!state.hotkeyHelpOpen) {
    els.hotkeyHelpModal.classList.remove('open');
    els.hotkeyHelpModal.innerHTML = '';
    return;
  }
  const groups = hotkeyHelpGroups();
  const body = groups
    .map(
      (group) =>
        '<section class="panel"><div class="panel-head"><div class="panel-title"><span data-icon="' +
        group.icon +
        '"></span>' +
        escapeHtml(group.title) +
        '</div></div>' +
        '<div class="panel-body"><table class="field-catalog-table"><tbody>' +
        group.items.map((item) => '<tr><td><code>' + escapeHtml(item.keys) + '</code></td><td>' + escapeHtml(item.label) + '</td></tr>').join('') +
        '</tbody></table></div></section>',
    )
    .join('');
  els.hotkeyHelpModal.innerHTML =
    '<div class="modal"><div class="modal-head"><strong>Keyboard shortcuts</strong>' +
    '<button class="icon-btn" data-action="close-hotkey-help" title="Close"><span data-icon="x"></span></button></div>' +
    '<div class="modal-body"><div class="stack">' +
    body +
    '</div></div>' +
    '<div class="modal-foot"><span class="muted small">Wireframe defaults. Customizable in settings later.</span>' +
    '<button class="btn" data-action="close-hotkey-help">Done</button></div></div>';
  els.hotkeyHelpModal.classList.add('open');
}

function hotkeyHelpGroups() {
  const mod = isMac() ? '\u2318' : 'Ctrl';
  return [
    {
      title: 'Global',
      icon: 'settings',
      items: [
        { keys: mod + '+B', label: 'Toggle workspace tree (rail)' },
        { keys: mod + '+\\', label: 'Toggle result overview' },
        { keys: mod + '+K', label: 'Focus tree filter' },
        { keys: mod + '+T', label: 'Open new tab (duplicate active type)' },
        { keys: mod + '+W', label: 'Close active tab' },
        { keys: mod + '+1\u20269', label: 'Switch to tab N' },
        { keys: 'Alt+\u2190 / Alt+\u2192', label: 'History back / forward' },
        { keys: mod + '+,', label: 'Open settings' },
        { keys: '?', label: 'Show this shortcut help' },
        { keys: 'Esc', label: 'Close modal / menu / drawer' },
      ],
    },
    {
      title: 'Query tab',
      icon: 'folder',
      items: [
        { keys: mod + '+L', label: 'Focus query path' },
        { keys: mod + '+Enter', label: 'Run query' },
      ],
    },
    {
      title: 'JS Query tab',
      icon: 'code',
      items: [{ keys: mod + '+Enter', label: 'Run script' }],
    },
    {
      title: 'Auth tab',
      icon: 'users',
      items: [{ keys: '/', label: 'Focus user search' }],
    },
  ];
}

function isMac() {
  return navigator.platform.toUpperCase().includes('MAC');
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.getAttribute('data-action');
  if (action === 'query-path' || action === 'auth-search' || action === 'change-tab-account') return;
  const tab = activeTab();
  if (action === 'toggle-sidebar') {
    if (isCompactShell()) {
      state.sidebarDrawerOpen = !state.sidebarDrawerOpen;
      state.status = state.sidebarDrawerOpen ? 'Opened workspace tree' : 'Closed workspace tree';
    } else {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      state.sidebarDrawerOpen = false;
      state.status = state.sidebarCollapsed ? 'Collapsed workspace tree' : 'Expanded workspace tree';
    }
    render();
    return;
  }
  if (action === 'close-sidebar') {
    state.sidebarDrawerOpen = false;
    render();
    return;
  }
  if (action === 'rail-account') {
    const id = target.getAttribute('data-account-id');
    state.sidebarCollapsed = false;
    state.expandedAccounts[id] = true;
    if (state.accountToolStatus[id] !== 'loaded') loadAccountTools(id);
    state.selectedTreeKey = id + ':project';
    state.status = 'Expanded workspace tree';
    render();
    return;
  }
  if (action === 'show-hotkey-help') {
    state.hotkeyHelpOpen = true;
    render();
    return;
  }
  if (action === 'close-hotkey-help') {
    state.hotkeyHelpOpen = false;
    render();
    return;
  }
  if (action === 'toggle-query-inspector' && tab) {
    tab.inspectorCollapsed = !tab.inspectorCollapsed;
    state.status = tab.inspectorCollapsed ? 'Collapsed result overview' : 'Expanded result overview';
    render();
    return;
  }
  if (action === 'history-back') {
    restoreHistory(-1);
    return;
  }
  if (action === 'history-forward') {
    restoreHistory(1);
    return;
  }
  if (action === 'cancel-confirm') {
    state.confirmModal = null;
    state.status = 'Cancelled';
    render();
    return;
  }
  if (action === 'accept-confirm') {
    const confirmation = state.confirmModal;
    state.confirmModal = null;
    if (confirmation?.onConfirm) confirmation.onConfirm();
    recordHistory('Confirmed destructive action');
    render();
    return;
  }
  const context = state.contextMenu;
  if (!action.startsWith('tab-context-') && action !== 'open-context-new-tab') state.contextMenu = null;
  if (action === 'set-theme') state.theme = target.getAttribute('data-theme-value');
  if (action === 'open-context-new-tab') {
    if (context) {
      state.contextMenu = null;
      openQueryPathInNewTab(context.accountId, context.path);
    }
    return;
  }
  if (action === 'tab-context-close') {
    state.contextMenu = null;
    closeTab(context?.tabId);
    return;
  }
  if (action === 'tab-context-close-others') {
    state.contextMenu = null;
    closeOtherTabs(context?.tabId);
    return;
  }
  if (action === 'tab-context-close-left') {
    state.contextMenu = null;
    closeTabsToSide(context?.tabId, 'left');
    return;
  }
  if (action === 'tab-context-close-right') {
    state.contextMenu = null;
    closeTabsToSide(context?.tabId, 'right');
    return;
  }
  if (action === 'tab-context-sort-account') {
    state.contextMenu = null;
    sortTabsByAccount();
    return;
  }
  if (action === 'tab-context-close-all') {
    state.contextMenu = null;
    closeTabsByIds(
      state.tabs.map((item) => item.id),
      'Closed all tabs',
    );
    return;
  }
  if (action === 'toggle-account') {
    event.stopPropagation();
    const id = target.getAttribute('data-account-id');
    state.expandedAccounts[id] = !state.expandedAccounts[id];
    if (state.expandedAccounts[id] && state.accountToolStatus[id] !== 'loaded') loadAccountTools(id);
  }
  if (action === 'retry-account-load') {
    event.stopPropagation();
    const id = target.getAttribute('data-account-id');
    state.expandedAccounts[id] = true;
    loadAccountTools(id);
  }
  if (action === 'remove-account') {
    event.stopPropagation();
    requestRemoveAccount(target.getAttribute('data-account-id'));
  }
  if (action === 'toggle-firestore') {
    event.stopPropagation();
    const id = target.getAttribute('data-account-id');
    state.expandedFirestore[id] = !state.expandedFirestore[id];
    if (state.expandedFirestore[id] && !state.loadedCollections[id]) {
      state.loadedCollections[id] = true;
      state.status = 'Loaded collections for ' + accountById(id).name;
    }
  }
  if (action === 'refresh-firestore') {
    event.stopPropagation();
    const id = target.getAttribute('data-account-id');
    state.loadedCollections[id] = true;
    state.expandedFirestore[id] = true;
    state.status = 'Refreshed collections for ' + accountById(id).name;
  }
  if (action === 'open-project') {
    const accountId = target.getAttribute('data-account-id');
    state.selectedTreeKey = accountId + ':project';
    closeSidebarDrawer();
    openTab('project', accountId);
    return;
  }
  if (action === 'open-query') {
    const accountId = target.getAttribute('data-account-id');
    const collection = target.getAttribute('data-collection');
    scheduleTreeSingleOpen(() => {
      state.selectedTreeKey = accountId + ':collection:' + collection;
      closeSidebarDrawer();
      openTab('query', accountId, { collection, path: collection }, { historyLabel: 'Open ' + collection });
    });
    return;
  }
  if (action === 'open-subcollection') {
    event.stopPropagation();
    const accountId = target.getAttribute('data-account-id');
    const queryPath = normalizePath(target.getAttribute('data-query-path'));
    const documentId = target.getAttribute('data-document-id');
    const subcollection = target.getAttribute('data-subcollection');
    const path = documentPathForRow(queryPath, { id: documentId }) + '/' + subcollection;
    state.selectedTreeKey = accountId + ':collection:' + path;
    closeSidebarDrawer();
    openTab('query', accountId, { collection: subcollection, path }, { alwaysNew: true, historyLabel: 'Open ' + path });
    return;
  }
  if (action === 'open-tree-path') {
    event.stopPropagation();
    openQueryPathInNewTab(target.getAttribute('data-account-id'), target.getAttribute('data-path'));
    return;
  }
  if (action === 'load-more-results') {
    loadMoreResults(tab);
    return;
  }
  if (action === 'select-doc-row' && tab) {
    tab.selectedDocumentId = target.getAttribute('data-document-id');
    state.status = 'Selected ' + tab.selectedDocumentId;
    clearTimeout(selectionRenderTimer);
    selectionRenderTimer = setTimeout(() => {
      recordHistory('Select ' + tab.selectedDocumentId);
      if (!state.documentModal) render();
    }, 180);
    return;
  }
  if (action === 'open-document-modal') {
    state.documentModal = {
      accountId: target.getAttribute('data-account-id'),
      queryPath: normalizePath(target.getAttribute('data-query-path')),
      documentId: target.getAttribute('data-document-id'),
    };
  }
  if (action === 'close-document-modal') state.documentModal = null;
  if (action === 'apply-query-path' && tab) {
    const input = els.content.querySelector('[data-action="query-path"]');
    const path = normalizePath(input?.value || tab.path || tab.collection);
    tab.path = path;
    tab.collection = pathParts(path)[0];
    tab.key = makeTabKey(tab.type, tab.accountId, tab);
    tab.selectedDocumentId = null;
    tab.loadedResultCount = null;
    state.status = 'Updated query path to ' + path;
  }
  if (action === 'open-document') {
    const accountId = target.getAttribute('data-account-id');
    const collection = target.getAttribute('data-collection');
    const documentId = target.getAttribute('data-document-id');
    state.selectedTreeKey = accountId + ':document:' + collection + '/' + documentId;
    openTab('document', accountId, { collection, documentId });
    return;
  }
  if (action === 'open-auth') {
    const accountId = target.getAttribute('data-account-id');
    scheduleTreeSingleOpen(() => {
      state.selectedTreeKey = accountId + ':auth';
      closeSidebarDrawer();
      openTab('auth', accountId, { userSearch: '', selectedUserId: accountId + '_u_ada' }, { historyLabel: 'Open Authentication' });
    });
    return;
  }
  if (action === 'open-script') {
    const accountId = target.getAttribute('data-account-id');
    scheduleTreeSingleOpen(() => {
      state.selectedTreeKey = accountId + ':script';
      closeSidebarDrawer();
      openTab('script', accountId, { outputTab: 'logs', scriptState: 'logs' }, { historyLabel: 'Open JavaScript Query' });
    });
    return;
  }
  if (action === 'open-settings') {
    openTab('settings', tab?.accountId || 'prod');
    return;
  }
  if (action === 'activate-tab') state.activeTabId = target.getAttribute('data-tab-id');
  if (action === 'close-tab') {
    event.stopPropagation();
    closeTab(target.getAttribute('data-tab-id'));
    return;
  }
  if (action === 'set-result-view' && tab) tab.resultView = target.getAttribute('data-view');
  if (action === 'set-output-tab' && tab) tab.outputTab = target.getAttribute('data-output-tab');
  if (action === 'add-filter' && tab) tab.filters = Math.min((tab.filters || 1) + 1, 3);
  if (action === 'run-script' && tab) {
    tab.scriptState = 'results';
    tab.outputTab = 'results';
    state.status = 'Script ran against ' + accountById(tab.accountId).name;
  }
  if (action === 'simulate-empty' && tab) {
    tab.scriptState = 'empty';
    tab.outputTab = 'results';
    state.status = 'Script returned no data';
  }
  if (action === 'simulate-error' && tab) {
    tab.scriptState = 'error';
    tab.outputTab = 'errors';
    state.status = 'Script threw an error';
  }
  if (action === 'fake-save') state.status = 'Saved mock changes';
  if (action === 'fake-delete') requestDeleteDocument();
  if (action === 'show-add-account') els.accountModal.classList.add('open');
  if (action === 'hide-add-account') els.accountModal.classList.remove('open');
  if (action === 'add-mock-account') {
    const name = document.getElementById('projectName').value || 'New Client Dev';
    const id = 'mock_' + Math.random().toString(36).slice(2, 7);
    accounts.push({ id, name, projectId: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), target: 'mock', badge: 'mock' });
    state.expandedAccounts[id] = false;
    state.expandedFirestore[id] = false;
    state.loadedCollections[id] = false;
    els.accountModal.classList.remove('open');
    openTab('project', id);
    return;
  }
  recordHistory(actionLabel(action, target));
  render();
});

document.addEventListener('change', (event) => {
  const target = event.target.closest('[data-action="change-tab-account"]');
  if (!target) return;
  const tab = state.tabs.find((item) => item.id === target.getAttribute('data-tab-id'));
  if (!tab) return;
  tab.accountId = target.value;
  tab.key = makeTabKey(tab.type, tab.accountId, tab);
  if (tab.type === 'query') tab.loadedResultCount = null;
  state.status = 'Changed only this tab to ' + accountById(tab.accountId).name;
  recordHistory('Change tab account');
  render();
});

document.addEventListener('dragstart', (event) => {
  const tabTarget = event.target.closest('.tab[data-tab-id]');
  if (!tabTarget || event.target.closest('.tab-close')) return;
  const tabId = tabTarget.getAttribute('data-tab-id');
  state.draggingTabId = tabId;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', tabId);
  tabTarget.classList.add('dragging');
});

document.addEventListener('dragover', (event) => {
  const tabTarget = event.target.closest('.tab[data-tab-id]');
  if (!tabTarget || !state.draggingTabId || tabTarget.getAttribute('data-tab-id') === state.draggingTabId) return;
  event.preventDefault();
  const bounds = tabTarget.getBoundingClientRect();
  const position = event.clientX > bounds.left + bounds.width / 2 ? 'right' : 'left';
  document.querySelectorAll('.tab.drag-over-left, .tab.drag-over-right').forEach((node) => node.classList.remove('drag-over-left', 'drag-over-right'));
  tabTarget.classList.add(position === 'right' ? 'drag-over-right' : 'drag-over-left');
  event.dataTransfer.dropEffect = 'move';
});

document.addEventListener('drop', (event) => {
  const tabTarget = event.target.closest('.tab[data-tab-id]');
  if (!tabTarget || !state.draggingTabId) return;
  event.preventDefault();
  const bounds = tabTarget.getBoundingClientRect();
  const position = event.clientX > bounds.left + bounds.width / 2 ? 'after' : 'before';
  const sourceTabId = event.dataTransfer.getData('text/plain') || state.draggingTabId;
  const targetTabId = tabTarget.getAttribute('data-tab-id');
  state.draggingTabId = null;
  clearTabDragClasses();
  moveTab(sourceTabId, targetTabId, position);
});

document.addEventListener('dragend', () => {
  state.draggingTabId = null;
  clearTabDragClasses();
});

document.addEventListener('input', (event) => {
  if (event.target.id === 'treeFilter') {
    state.treeFilter = event.target.value;
    recordHistory('Filter tree');
    render();
  }
  if (event.target.getAttribute('data-action') === 'auth-search') {
    const tab = activeTab();
    if (tab) {
      tab.userSearch = event.target.value;
      recordHistory('Filter users');
      render();
    }
  }
});

document.addEventListener(
  'toggle',
  (event) => {
    const target = event.target.closest?.('[data-inspector-section]');
    const tab = activeTab();
    if (!target || !tab || tab.type !== 'query') return;
    tab.inspectorSections = { ...(tab.inspectorSections || {}), [target.getAttribute('data-inspector-section')]: target.open };
  },
  true,
);

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || event.target.getAttribute('data-action') !== 'query-path') return;
  const tab = activeTab();
  if (!tab) return;
  event.preventDefault();
  const path = normalizePath(event.target.value);
  tab.path = path;
  tab.collection = pathParts(path)[0];
  tab.key = makeTabKey(tab.type, tab.accountId, tab);
  tab.selectedDocumentId = null;
  tab.loadedResultCount = null;
  state.status = 'Updated query path to ' + path;
  recordHistory('Update query path');
  render();
});

document.addEventListener('dblclick', (event) => {
  const queryItem = event.target.closest('[data-action="open-query"]');
  if (queryItem) {
    clearTimeout(treeOpenTimer);
    treeOpenTimer = null;
    const accountId = queryItem.getAttribute('data-account-id');
    const collection = queryItem.getAttribute('data-collection');
    state.selectedTreeKey = accountId + ':collection:' + collection;
    openTab('query', accountId, { collection, path: collection }, { alwaysNew: true, recordHistory: false });
    return;
  }
  const scriptItem = event.target.closest('[data-action="open-script"]');
  if (scriptItem) {
    clearTimeout(treeOpenTimer);
    treeOpenTimer = null;
    const accountId = scriptItem.getAttribute('data-account-id');
    state.selectedTreeKey = accountId + ':script';
    openTab('script', accountId, { outputTab: 'logs', scriptState: 'logs' }, { alwaysNew: true, recordHistory: false });
    return;
  }
  const authItem = event.target.closest('[data-action="open-auth"]');
  if (authItem) {
    clearTimeout(treeOpenTimer);
    treeOpenTimer = null;
    const accountId = authItem.getAttribute('data-account-id');
    state.selectedTreeKey = accountId + ':auth';
    openTab('auth', accountId, { userSearch: '', selectedUserId: accountId + '_u_ada' }, { alwaysNew: true, recordHistory: false });
    return;
  }
  const row = event.target.closest('.doc-row[data-document-id]');
  if (!row) return;
  clearTimeout(selectionRenderTimer);
  selectionRenderTimer = null;
  state.documentModal = {
    accountId: row.getAttribute('data-account-id'),
    queryPath: normalizePath(row.getAttribute('data-query-path')),
    documentId: row.getAttribute('data-document-id'),
  };
  state.status = 'Opened editor for ' + state.documentModal.documentId;
  render();
});

document.addEventListener('contextmenu', (event) => {
  const tabTarget = event.target.closest('.tab[data-tab-id]');
  if (tabTarget) {
    event.preventDefault();
    state.contextMenu = {
      kind: 'tab',
      x: event.clientX,
      y: event.clientY,
      tabId: tabTarget.getAttribute('data-tab-id'),
    };
    render();
    return;
  }

  const target = event.target.closest('[data-context-path]');
  if (!target) return;
  event.preventDefault();
  state.contextMenu = {
    kind: 'result',
    x: event.clientX,
    y: event.clientY,
    path: normalizePath(target.getAttribute('data-context-path')),
    accountId: target.getAttribute('data-context-account-id') || activeTab()?.accountId || 'prod',
  };
  recordHistory('Open result context menu');
  render();
});

recordHistory('Initial workspace');
render();

// ----- Splitter drag handlers -----

document.addEventListener('mousedown', (event) => {
  const splitter = event.target.closest('.splitter[data-action]');
  if (!splitter) return;
  event.preventDefault();
  const action = splitter.getAttribute('data-action');
  splitter.classList.add('dragging');
  document.body.style.cursor = 'col-resize';
  const startX = event.clientX;

  let onMove;
  if (action === 'resize-sidebar') {
    const start = clampSidebarWidth(state.sidebarWidth);
    onMove = (e) => {
      const next = clampSidebarWidth(start + (e.clientX - startX));
      state.sidebarWidth = next;
      document.querySelector('.app').style.setProperty('--sidebar-width', next + 'px');
    };
  } else if (action === 'resize-inspector') {
    const start = clampInspectorWidth(state.inspectorWidth);
    const layout = splitter.closest('.query-layout');
    onMove = (e) => {
      // dragging right shrinks the inspector (it sits to the right).
      const next = clampInspectorWidth(start - (e.clientX - startX));
      state.inspectorWidth = next;
      if (layout) layout.style.setProperty('--inspector-width', next + 'px');
    };
  } else {
    splitter.classList.remove('dragging');
    document.body.style.cursor = '';
    return;
  }

  const onUp = () => {
    splitter.classList.remove('dragging');
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    recordHistory(action === 'resize-sidebar' ? 'Resize sidebar' : 'Resize result overview');
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
});

// ----- Hotkeys -----
//
// Wireframe uses vanilla keydown. The React app should adopt
// react-hotkeys-hook (or tinykeys) and route shortcuts through a
// central registry so users can rebind them in settings.

function isEditableTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return Boolean(target.isContentEditable);
}

function modKey(event) {
  return isMac() ? event.metaKey : event.ctrlKey;
}

function focusSelector(selector) {
  const node = els.content.querySelector(selector) || document.querySelector(selector);
  if (node) {
    node.focus();
    if (typeof node.select === 'function') node.select();
  }
}

function dispatchSyntheticAction(action) {
  const node = document.querySelector('[data-action="' + action + '"]');
  if (node) node.click();
}

document.addEventListener('keydown', (event) => {
  // Esc handling first (works even from inputs).
  if (event.key === 'Escape') {
    if (state.hotkeyHelpOpen) {
      state.hotkeyHelpOpen = false;
      render();
      return;
    }
    if (state.documentModal) {
      state.documentModal = null;
      render();
      return;
    }
    if (state.confirmModal) {
      state.confirmModal = null;
      render();
      return;
    }
    if (state.contextMenu) {
      state.contextMenu = null;
      render();
      return;
    }
    if (state.sidebarDrawerOpen) {
      state.sidebarDrawerOpen = false;
      render();
      return;
    }
    if (els.accountModal.classList.contains('open')) {
      els.accountModal.classList.remove('open');
      return;
    }
    return;
  }

  const editable = isEditableTarget(event.target);
  const tab = activeTab();

  // Cmd/Ctrl+Enter runs query/script even from inputs.
  if (modKey(event) && event.key === 'Enter') {
    if (tab?.type === 'query') {
      event.preventDefault();
      const input = els.content.querySelector('[data-action="query-path"]');
      const path = normalizePath(input?.value || tab.path || tab.collection);
      tab.path = path;
      tab.collection = pathParts(path)[0];
      tab.key = makeTabKey(tab.type, tab.accountId, tab);
      tab.selectedDocumentId = null;
      tab.loadedResultCount = null;
      state.status = 'Updated query path to ' + path;
      recordHistory('Run query');
      render();
      return;
    }
    if (tab?.type === 'script') {
      event.preventDefault();
      tab.scriptState = 'results';
      tab.outputTab = 'results';
      state.status = 'Script ran against ' + accountById(tab.accountId).name;
      recordHistory('Run script');
      render();
      return;
    }
  }

  // "?" toggles help overlay (works outside inputs only).
  if (!editable && event.key === '?') {
    event.preventDefault();
    state.hotkeyHelpOpen = !state.hotkeyHelpOpen;
    render();
    return;
  }

  // "/" focuses contextual search (auth) or tree filter.
  if (!editable && event.key === '/') {
    event.preventDefault();
    if (tab?.type === 'auth') focusSelector('[data-action="auth-search"]');
    else focusSelector('#treeFilter');
    return;
  }

  if (modKey(event) && !event.shiftKey && !event.altKey) {
    const key = event.key.toLowerCase();
    if (key === 'b') {
      event.preventDefault();
      dispatchSyntheticAction('toggle-sidebar');
      return;
    }
    if (event.key === '\\') {
      event.preventDefault();
      dispatchSyntheticAction('toggle-query-inspector');
      return;
    }
    if (key === 'k') {
      event.preventDefault();
      state.sidebarCollapsed = false;
      render();
      focusSelector('#treeFilter');
      return;
    }
    if (key === 'l' && tab?.type === 'query') {
      event.preventDefault();
      focusSelector('[data-action="query-path"]');
      return;
    }
    if (key === 'w') {
      event.preventDefault();
      if (tab) closeTab(tab.id);
      return;
    }
    if (key === 't') {
      event.preventDefault();
      if (tab) {
        const opts = { alwaysNew: true, recordHistory: false };
        if (tab.type === 'query') openTab('query', tab.accountId, { collection: tab.collection, path: tab.path || tab.collection }, opts);
        else if (tab.type === 'script') openTab('script', tab.accountId, { outputTab: 'logs', scriptState: 'logs' }, opts);
        else if (tab.type === 'auth') openTab('auth', tab.accountId, { userSearch: '', selectedUserId: tab.selectedUserId }, opts);
        else openTab('project', tab.accountId, {}, opts);
        recordHistory('Open new tab');
        render();
      }
      return;
    }
    if (key === ',') {
      event.preventDefault();
      openTab('settings', tab?.accountId || 'prod');
      recordHistory('Open settings');
      render();
      return;
    }
    if (event.key >= '1' && event.key <= '9') {
      event.preventDefault();
      const idx = Number(event.key) - 1;
      const target = state.tabs[idx];
      if (target) {
        state.activeTabId = target.id;
        recordHistory('Switch tab ' + (idx + 1));
        render();
      }
      return;
    }
  }

  if (event.altKey && !modKey(event) && !event.shiftKey) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      restoreHistory(-1);
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      restoreHistory(1);
      return;
    }
  }
});
