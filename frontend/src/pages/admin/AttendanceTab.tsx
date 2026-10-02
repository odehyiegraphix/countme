import React, { useState, useEffect } from 'react';
import { Download, Search, RefreshCw, X, Calendar, Layers, BookOpen, GraduationCap } from 'lucide-react';
import api from '../../lib/api';

interface Record {
  id: string;
  student_name: string;
  index_number: string;
  level: number;
  semester?: number;
  course_code: string;
  course_name: string;
  session_date: string;
  status: string;
  method: string;
  recorded_at: string;
}

const fmtDate = (iso: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function AttendanceTab() {
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [level, setLevel] = useState('');
  const [semester, setSemester] = useState('');

  const fetchRecords = async (customParams?: { search?: string; date?: string; level?: string; semester?: string }) => {
    setLoading(true);
    try {
      const p = customParams || { search, date, level, semester };
      const params: any = {};
      if (p.search) params.search = p.search;
      if (p.date) params.date = p.date;
      if (p.level) params.level = p.level;
      if (p.semester) params.semester = p.semester;

      const res = await api.get('/admin/attendance', { params });
      setRecords(res.data);
    } catch (e) {
      console.error('Failed to fetch attendance records', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecords({ search, date, level, semester });
  };

  const handleReset = () => {
    setSearch('');
    setDate('');
    setLevel('');
    setSemester('');
    fetchRecords({ search: '', date: '', level: '', semester: '' });
  };

  const hasActiveFilters = Boolean(search || date || level || semester);

  const exportCsv = () => {
    if (records.length === 0) {
      alert('No attendance records to export.');
      return;
    }
    const headers = ['Student Name', 'Index Number', 'Level', 'Semester', 'Course Code', 'Course Name', 'Session Date', 'Method', 'Status', 'Recorded At'];
    const rows = records.map(r => [
      `"${r.student_name}"`,
      `"${r.index_number}"`,
      r.level || 100,
      r.semester ? `Semester ${r.semester}` : '—',
      `"${r.course_code}"`,
      `"${r.course_name}"`,
      `"${fmtDate(r.session_date)}"`,
      `"${r.method}"`,
      `"${r.status}"`,
      `"${fmtDate(r.recorded_at)}"`,
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_records_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Search & Filter Header Card */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
            {/* Search Student */}
            <div>
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Search size={14} color="var(--primary-color)" /> Student Name or Index
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Kwame Mensah or TU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ backgroundColor: 'white' }}
              />
            </div>

            {/* Level Filter */}
            <div>
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Layers size={14} color="var(--primary-color)" /> Academic Level
              </label>
              <select
                className="input-field"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                style={{ backgroundColor: 'white' }}
              >
                <option value="">All Levels</option>
                <option value="100">Level 100</option>
                <option value="200">Level 200</option>
                <option value="300">Level 300</option>
                <option value="400">Level 400</option>
              </select>
            </div>

            {/* Semester Filter */}
            <div>
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <GraduationCap size={14} color="var(--primary-color)" /> Semester
              </label>
              <select
                className="input-field"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                style={{ backgroundColor: 'white' }}
              >
                <option value="">All Semesters</option>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
            </div>

            {/* Specific Date Filter */}
            <div>
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Calendar size={14} color="var(--primary-color)" /> Specific Date
              </label>
              <input
                type="date"
                className="input-field"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ backgroundColor: 'white' }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1, height: '42px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 700 }}
              >
                <Search size={16} /> Search
              </button>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn btn-secondary"
                  style={{ height: '42px', padding: '0 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  title="Reset filters"
                >
                  <X size={16} /> Reset
                </button>
              )}
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px dashed #CBD5E1', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Active Filters:</span>
              {search && (
                <span style={{ backgroundColor: '#EFF6FF', color: 'var(--primary-color)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                  Student: "{search}"
                </span>
              )}
              {level && (
                <span style={{ backgroundColor: '#F0FDF4', color: '#166534', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                  Level {level}
                </span>
              )}
              {semester && (
                <span style={{ backgroundColor: '#EDE9FE', color: '#6D28D9', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                  Semester {semester}
                </span>
              )}
              {date && (
                <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                  Date: {date}
                </span>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Results Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h4 style={{ fontWeight: 700, margin: 0 }}>Attendance Records ({records.length})</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
              Real-time student attendance check-ins across lecture sessions.
            </p>
          </div>
          <button
            onClick={exportCsv}
            className="btn btn-secondary"
            style={{ padding: '0 1.25rem', height: '38px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Download size={16} /> Export Filtered CSV
          </button>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                <th style={{ padding: '0.875rem 1.5rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Student</th>
                <th style={{ padding: '0.875rem 1.5rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Course</th>
                <th style={{ padding: '0.875rem 1.5rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Level & Sem</th>
                <th style={{ padding: '0.875rem 1.5rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Session Date</th>
                <th style={{ padding: '0.875rem 1.5rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Verification</th>
                <th style={{ padding: '0.875rem 1.5rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Check-In Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.5 }} />
                    Loading attendance records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>No attendance records matched your search criteria.</p>
                    <p style={{ fontSize: '0.8rem' }}>Try clearing filters or searching for another date, level, semester, or student name.</p>
                  </td>
                </tr>
              ) : (
                records.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{r.student_name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0', fontFamily: 'monospace' }}>{r.index_number}</p>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ backgroundColor: '#E0F2FE', color: 'var(--primary-color)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700 }}>
                        {r.course_code}
                      </span>
                      {r.course_name && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>{r.course_name}</p>}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <span style={{ backgroundColor: '#F1F5F9', color: '#475569', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                          Level {r.level || 100}
                        </span>
                        <span style={{ backgroundColor: '#EDE9FE', color: '#6D28D9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                          Sem {r.semester || 1}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {fmtDate(r.session_date)}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ backgroundColor: '#ECFDF5', color: '#059669', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                        {r.method}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {fmtDate(r.recorded_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
