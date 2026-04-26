export function AppShell() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'var(--sidebar-width) 1fr var(--inspector-width)',
        height: '100%',
      }}
    >
      <aside style={{ background: '#f7f7f8', borderRight: '1px solid #e5e5e7' }}>
        <h2 style={{ padding: 12 }}>Firebase Desk</h2>
      </aside>
      <main style={{ padding: 16 }}>
        <p>Phase 2 desktop shell. Wireframe-driven UI lands in Phase 3.</p>
      </main>
      <aside style={{ background: '#f7f7f8', borderLeft: '1px solid #e5e5e7' }}>
        <p style={{ padding: 12 }}>Inspector</p>
      </aside>
    </div>
  );
}
