import React, { useState, useEffect, useCallback } from 'react';
import { Radio, RefreshCw } from 'lucide-react';
import api from '../../lib/api';

interface LiveSession {
  id: string; course_code: string; course_name: string;
  lecturer: string; start_time: string; present: number; enrolled: number; radius: number;
}

const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function LiveSessionsTab() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/sessions/live');
      setSessions(res.data);
      setLastRefresh(new Date());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetch();
    const iv = setInterval(fetch, 30_000);
    return () => clearInterval(iv);
  }, [fetch]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: sessions.length > 0 ? 'var(--success-color)' : '#CBD5E1' }} />
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {sessions.length > 0 ? `${sessions.length} class${sessions.length > 1 ? 'es' : ''} in session — auto-refreshes every 30s` : 'No active sessions right now'}
          </span>
        </div>
        <button onClick={fetch} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: '1px solid #E2E8F0', borderRadius: 8, padding: '0.4rem 0.85rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'inherit' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <RefreshCw size={28} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.4 }} />Loading...
        </div>
      ) : sessions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Radio size={48} style={{ color: 'var(--text-secondary)', opacity: 0.25, margin: '0 auto 1rem', display: 'block' }} />
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No Active Sessions</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>When a lecturer starts a class, it will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sessions.map(s => {
            const pct = s.enrolled > 0 ? Math.round(s.present / s.enrolled * 100) : 0;
            return (
              <div key={s.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', borderLeft: '4px solid var(--success-color)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ backgroundColor: '#E0F2FE', color: 'var(--primary-color)', padding: '0.2rem 0.65rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700 }}>{s.course_code}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--success-color)', fontWeight: 600 }}>● LIVE</span>
                  </div>
                  <h4 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{s.course_name}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.lecturer} · Started {fmt(s.start_time)} · Radius {s.radius}m</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: 'var(--font-data)', fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>
                    {s.present}<span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 400 }}>/{s.enrolled}</span>
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>students checked in</p>
                  <div style={{ marginTop: '0.5rem', width: 120, height: 6, background: '#E2E8F0', borderRadius: 3, marginLeft: 'auto' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: pct >= 75 ? 'var(--success-color)' : pct >= 50 ? 'var(--warning-color)' : 'var(--error-color)', borderRadius: 3, transition: 'width 0.4s' }} />
                  </div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{pct}% present</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
