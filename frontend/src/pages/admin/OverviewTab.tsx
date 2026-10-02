import React from 'react';
import {
  Users, BookOpen, TrendingUp, AlertTriangle,
  Radio, Activity, ChevronRight, RefreshCw, Building2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Stats {
  total_students: number; total_lecturers: number; total_courses: number;
  total_depts: number; active_sessions: number; attendance_rate: number | null;
  at_risk_count: number; trend: { date: string; sessions: number }[];
}
interface LiveSession { id: string; course_code: string; course_name: string; lecturer: string; start_time: string; present: number; enrolled: number; }
interface AtRiskStudent { student_id: string; student_name: string; index_number?: string; course_code: string; attendance_rate: number; }

interface Props {
  stats: Stats | null;
  loadingStats: boolean;
  liveSessions: LiveSession[];
  atRisk: AtRiskStudent[];
  isSuperAdmin?: boolean;
  isHod?: boolean;
  departmentName?: string;
  onGoLive: () => void;
  onGoRisk: () => void;
}

function KpiCard({ title, value, sub, icon, accent }: { title: string; value: string | number; sub: string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className="stat-card" style={{ borderTop: accent ? '3px solid var(--primary-color)' : undefined }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="stat-title">{title}</span>{icon}
      </div>
      <span className="stat-value">{value}</span>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{sub}</span>
    </div>
  );
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export default function OverviewTab({ stats, loadingStats, liveSessions, atRisk, isSuperAdmin, isHod, departmentName, onGoLive, onGoRisk }: Props) {
  if (loadingStats) {
    return (
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="stat-card" style={{ opacity: 0.4 }}>
            <div style={{ height: 12, background: '#E2E8F0', borderRadius: 4, width: '60%', marginBottom: 12 }} />
            <div style={{ height: 32, background: '#E2E8F0', borderRadius: 4, width: '40%', marginBottom: 8 }} />
          </div>
        ))}
      </div>
    );
  }
  if (!stats) return <p style={{ color: 'var(--text-secondary)' }}>Unable to load statistics.</p>;

  const riskColor = (r: number) => r < 50 ? 'var(--error-color)' : r < 75 ? 'var(--warning-color)' : 'var(--success-color)';

  return (
    <>
      {isHod && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #F0FDFA 0%, #E6FFFA 100%)',
          border: '1px solid #99F6E4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(13, 148, 136, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#0D9488',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              flexShrink: 0
            }}>
              <Building2 size={22} color="white" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#134E4A', margin: 0 }}>
                  {departmentName || 'Tourism'} Department
                </h3>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  background: '#0D9488',
                  color: 'white',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  HOD Scope
                </span>
              </div>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#475569' }}>
                You are currently viewing data, sessions, lecturers, and courses for the <strong>{departmentName || 'Tourism'}</strong> Department.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <KpiCard accent title="Total Students"   value={stats.total_students}   sub="Active enrolments"        icon={<Users size={20} color="var(--primary-color)" />} />
        <KpiCard       title="Lecturers"         value={stats.total_lecturers}  sub="Active teaching staff"    icon={<Users size={20} color="var(--success-color)" />} />
        <KpiCard       title="Course Offerings"  value={stats.total_courses}    sub="This academic period"     icon={<BookOpen size={20} color="#1976D2" />} />
        {isSuperAdmin && <KpiCard title="Departments" value={stats.total_depts} sub="Active departments" icon={<Activity size={20} color="#7B1FA2" />} />}
        <KpiCard       title="Attendance Rate"   value={stats.attendance_rate !== null ? `${stats.attendance_rate}%` : '—'} sub="All-time average"   icon={<TrendingUp size={20} color="var(--accent-color)" />} />
        <KpiCard       title="At-Risk Students"  value={stats.at_risk_count}    sub="Below 75% attendance"     icon={<AlertTriangle size={20} color="var(--error-color)" />} />
      </div>

      {stats.trend.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Sessions Per Day <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>— last 30 days</span></h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.trend} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={fmt} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip labelFormatter={(l) => fmt(l as string)} formatter={(v: any) => [`${v} sessions`, 'Classes held']} />
              <Bar dataKey="sessions" radius={[4, 4, 0, 0]}>
                {stats.trend.map((_, i) => <Cell key={i} fill="var(--primary-color)" opacity={0.6 + 0.4 * (i / stats.trend.length)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ fontWeight: 700 }}>Live Sessions</h4>
            <button onClick={onGoLive} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>View all <ChevronRight size={14} /></button>
          </div>
          {liveSessions.length === 0 ? <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem 0' }}>No active sessions right now.</p>
            : liveSessions.slice(0, 3).map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #F1F5F9' }}>
                <div><p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{s.course_code}</p><p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.lecturer}</p></div>
                <span style={{ fontWeight: 700, color: 'var(--success-color)', fontFamily: 'var(--font-data)', fontSize: '0.875rem' }}>{s.present}/{s.enrolled}</span>
              </div>
            ))}
        </div>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ fontWeight: 700 }}>At-Risk Students</h4>
            <button onClick={onGoRisk} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>View all <ChevronRight size={14} /></button>
          </div>
          {atRisk.length === 0 ? <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem 0' }}>No at-risk students.</p>
            : atRisk.slice(0, 4).map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #F1F5F9' }}>
                <div><p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{s.student_name}</p><p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.course_code}</p></div>
                <span style={{ fontWeight: 700, color: riskColor(s.attendance_rate), fontFamily: 'var(--font-data)', fontSize: '0.875rem' }}>{s.attendance_rate}%</span>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
