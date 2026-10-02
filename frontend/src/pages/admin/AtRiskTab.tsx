import React, { useState, useEffect } from 'react';
import { AlertTriangle, Activity, RefreshCw } from 'lucide-react';
import api from '../../lib/api';

interface AtRiskStudent {
  student_id: string; student_name: string; index_number?: string;
  course_code: string; course_name: string; attendance_rate: number;
  sessions_present: number; sessions_total: number;
}

const riskColor = (r: number) => r < 50 ? 'var(--error-color)' : r < 75 ? 'var(--warning-color)' : 'var(--success-color)';
const rowBg     = (r: number) => r < 50 ? '#FEF2F2' : r < 75 ? '#FFF7ED' : 'transparent';

export default function AtRiskTab() {
  const [atRisk, setAtRisk] = useState<AtRiskStudent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    try { const res = await api.get('/admin/students/at-risk'); setAtRisk(res.data); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  return (
    <div>
      <div style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem' }}>
        <AlertTriangle size={18} color="var(--warning-color)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
        <p style={{ fontSize: '0.875rem', color: '#92400E' }}>
          <strong>Threshold: below 75% attendance.</strong> These students may face academic penalties. Consider reaching out to them or their lecturers.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <RefreshCw size={28} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.4 }} />Analysing attendance data...
        </div>
      ) : atRisk.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Activity size={48} style={{ color: 'var(--success-color)', opacity: 0.4, margin: '0 auto 1rem', display: 'block' }} />
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>All Clear</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No students are currently below the 75% attendance threshold.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontWeight: 700 }}>At-Risk Students ({atRisk.length})</h4>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--error-color)', fontWeight: 600 }}>● &lt; 50% Critical</span>
              <span style={{ color: 'var(--warning-color)', fontWeight: 600 }}>● 50–74% Warning</span>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                  {['Student', 'Course', 'Sessions Attended', 'Attendance Rate'].map(h => (
                    <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {atRisk.map((s, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: rowBg(s.attendance_rate) }}>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ fontWeight: 700 }}>{s.student_name}</div>
                      {s.index_number && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: '0.15rem' }}>
                          {s.index_number}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span style={{ backgroundColor: '#E0F2FE', color: 'var(--primary-color)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700 }}>{s.course_code}</span>
                      <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{s.course_name}</span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-data)' }}>{s.sessions_present} / {s.sessions_total}</td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 80, height: 6, background: '#E2E8F0', borderRadius: 3 }}>
                          <div style={{ width: `${s.attendance_rate}%`, height: '100%', background: riskColor(s.attendance_rate), borderRadius: 3 }} />
                        </div>
                        <span style={{ fontWeight: 700, color: riskColor(s.attendance_rate), fontFamily: 'var(--font-data)' }}>{s.attendance_rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
