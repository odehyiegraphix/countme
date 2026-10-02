import React from 'react';

export default function SettingsTab() {
  return (
    <div className="card" style={{ maxWidth: '800px' }}>
      <h3 style={{ fontWeight: 700, marginBottom: '1.5rem', fontSize: '1.25rem' }}>System Settings</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Configure global institution settings and preferences.</p>
      
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <div style={{ border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
          <h4 style={{ fontWeight: 600, marginBottom: '1rem' }}>Academic Year</h4>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label className="input-label">Current Year</label>
              <input type="text" defaultValue="2026/2027" className="input-field" style={{ height: '40px' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="input-label">Current Semester</label>
              <select className="input-field" style={{ height: '40px', appearance: 'auto', cursor: 'pointer' }}>
                <option>Fall</option>
                <option>Spring</option>
                <option>Summer</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
          <h4 style={{ fontWeight: 600, marginBottom: '1rem' }}>Security</h4>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid #F1F5F9' }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>Require Location Services</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Students must have GPS enabled to mark attendance.</p>
            </div>
            <input type="checkbox" defaultChecked />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem' }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>Dynamic QR Refresh Rate</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>How often the class QR code rotates (seconds).</p>
            </div>
            <input type="number" defaultValue="5" className="input-field" style={{ width: '80px', height: '40px', textAlign: 'center', padding: '0' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
