export default function BandDashboardLoading() {
  return (
    <div className="band-dashboard theme-dark">
      <div className="dashboard-gradient gradient-primary" aria-hidden="true" />
      <div className="dashboard-gradient gradient-accent" aria-hidden="true" />
      <div className="dashboard-container container" style={{ paddingTop: '8rem' }}>
        <div className="dash-header hero-panel" style={{ minHeight: 180 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ width: 220, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ width: 300, height: 18, borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />
          </div>
        </div>
        <div className="stats-grid" style={{ marginTop: '1.5rem' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="stat-card" style={{ minHeight: 80 }}>
              <div style={{ width: '100%', height: '100%', borderRadius: 12, background: 'rgba(255,255,255,0.03)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
