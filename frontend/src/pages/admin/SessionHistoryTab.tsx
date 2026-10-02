import React, { useState, useEffect } from 'react';
import { Filter } from 'lucide-react';
import api from '../../lib/api';

interface Session {
  id: string;
  course_code: string;
  course_name: string;
  lecturer: string;
  start_time: string;
  end_time: string | null;
  duration_min: number | null;
  status: string;
  present: number;
  enrolled: number;
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function SessionHistoryTab() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/sessions/history', { params: { status: statusFilter } });
      setSessions(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSessions(); }, [statusFilter]);

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h4 style={{ fontWeight: 700 }}>Class Session History</h4>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Filter size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
              style={{ padding: '0.4rem 1rem 0.4rem 2.5rem', height: '40px', fontSize: '0.875rem', cursor: 'pointer', appearance: 'auto', minWidth: '150px' }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ENDED">Ended</option>
            </select>
          </div>
        </div>
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
              <th style={{ padding: '0.875rem 1.5rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Course</th>
              <th style={{ padding: '0.875rem 1.5rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Lecturer</th>
              <th style={{ padding: '0.875rem 1.5rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Date & Time</th>
              <th style={{ padding: '0.875rem 1.5rem', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Duration</th>
              <th style={{ padding: '0.875rem 1.5rem', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Attendance</th>
              <th style={{ padding: '0.875rem 1.5rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Loading sessions...</td></tr>
            ) : sessions.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No sessions found.</td></tr>
            ) : (
              sessions.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <p style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.15rem' }}>{s.course_code}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.course_name}</p>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{s.lecturer}</td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>
                    {fmtDate(s.start_time)}<br/>
                    {fmtTime(s.start_time)}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {s.duration_min ? `${s.duration_min} min` : '—'}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-data)' }}>{s.present}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>/{s.enrolled}</span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    {s.status === 'ACTIVE' 
                      ? <span style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 700 }}>LIVE</span>
                      : <span style={{ backgroundColor: '#F1F5F9', color: '#475569', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 600 }}>ENDED</span>
                    }
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
