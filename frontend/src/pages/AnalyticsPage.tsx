import React, { useState, useRef } from 'react';
import {
  UploadCloud, AlertTriangle, CheckCircle, TrendingUp,
  Users, Award, BarChart2, X, FileText, RefreshCw, Activity, Download,
  FileSpreadsheet, Check, ShieldAlert, Sparkles, HelpCircle,
} from 'lucide-react';
import {
  Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, Line,
  ComposedChart, ReferenceLine,
} from 'recharts';
import api from '../lib/api';

const GRADE_COLORS: Record<string, string> = {
  A: '#2E7D32', B: '#1976D2', C: '#F2A900', D: '#ED6C02', F: '#D32F2F',
};

const STRENGTH_STYLES: Record<string, { bg: string; color: string }> = {
  Strong:     { bg: '#DCFCE7', color: '#166534' },
  Moderate:   { bg: '#DBEAFE', color: '#1E40AF' },
  Weak:       { bg: '#FEF9C3', color: '#854D0E' },
  Negligible: { bg: '#F1F5F9', color: '#475569' },
};

interface Props { courses: any[]; }

export default function AnalyticsPage({ courses }: Props) {
  const [selectedOffering, setSelectedOffering] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [isExportingSemester, setIsExportingSemester] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!selectedOffering) { setUploadStatus('error'); setUploadMessage('Please select a course first.'); return; }
    if (!file.name.endsWith('.csv')) { setUploadStatus('error'); setUploadMessage('Only CSV files are accepted.'); return; }
    setUploadStatus('uploading'); setUploadErrors([]);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post(`/offerings/${selectedOffering}/results/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploadStatus('success');
      setUploadMessage(res.data.message);
      setUploadErrors(res.data.errors || []);
      loadAnalytics(selectedOffering);
    } catch (err: any) {
      setUploadStatus('error');
      setUploadMessage(err.response?.data?.message || 'Upload failed.');
      setUploadErrors(err.response?.data?.errors || []);
    }
  };

  const loadAnalytics = async (id: string) => {
    setIsLoadingAnalytics(true);
    try { const res = await api.get(`/offerings/${id}/results/analytics`); setAnalytics(res.data); }
    catch { setAnalytics(null); }
    finally { setIsLoadingAnalytics(false); }
  };

  const handleOfferingChange = (id: string) => {
    setSelectedOffering(id); setAnalytics(null); setUploadStatus('idle');
    if (id) loadAnalytics(id);
  };

  const gradeBarData = analytics
    ? Object.entries(analytics.grade_distribution || {}).map(([grade, count]) => ({ grade, count }))
    : [];

  const gradeAttendanceData = analytics?.grade_attendance_comparison || [];

  const buildChartData = () => {
    if (!analytics) return { scatterPoints: [], regressionPoints: [] };
    const scatterPoints = analytics.scatter_data || [];
    const regressionPoints = analytics.correlation?.regression_line?.length === 2
      ? analytics.correlation.regression_line
      : [];
    return { scatterPoints, regressionPoints };
  };

  const { scatterPoints, regressionPoints } = buildChartData();
  const corr = analytics?.correlation;
  const quadrants = analytics?.quadrants;

  // Download Results CSV Template
  const downloadTemplate = () => {
    const rows = [
      ['student_id', 'student_name', 'score'],
      ['TU2026001', 'Kofi Mensah', '88'],
      ['TU2026002', 'Ama Boateng', '74'],
      ['TU2026003', 'Kwame Owusu', '91'],
      ['TU2026004', 'Akosua Agyeman', '63'],
      ['TU2026005', 'Yaw Donkor', '42'],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'countme_results_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export Full Semester Attendance Broadsheet (CSV)
  const exportSemesterAttendanceCsv = async () => {
    if (!selectedOffering) return;
    setIsExportingSemester(true);
    try {
      const res = await api.get(`/offerings/${selectedOffering}/attendance/semester`);
      const data = res.data;
      const course = data.course;
      const sessionDates = data.session_dates || [];

      // Metadata headers
      const meta = [
        `CountMe Semester Attendance Broadsheet`,
        `Course Code: ${course.code},Course Name: "${course.name}",Academic Year: ${course.academic_year || '—'},Semester: ${course.semester || '—'},Total Sessions: ${data.total_sessions}`,
        '',
      ];

      // Table columns
      const headers = [
        'Index Number',
        'Student Name',
        'Level',
        'Total Sessions',
        'Attended Sessions',
        'Attendance Rate (%)',
        'Exam Eligibility',
        ...sessionDates.map((d: string) => `"${d}"`),
      ];

      const rows = data.students.map((s: any) => {
        const sessionFlags = (s.sessions || []).map((sess: any) => sess.present ? 'Present' : 'Absent');
        return [
          `"${s.index_number}"`,
          `"${s.name}"`,
          s.level || 100,
          s.total_sessions,
          s.sessions_present,
          `${s.attendance_rate}%`,
          s.eligibility,
          ...sessionFlags,
        ].join(',');
      });

      const csvContent = [...meta, headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `semester_attendance_${course.code}_sem${course.semester || 1}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to export semester attendance. Please ensure sessions exist for this course.');
    } finally {
      setIsExportingSemester(false);
    }
  };

  // Export Merged Results & Attendance Analytics CSV
  const exportAnalyticsResultsCsv = () => {
    if (!analytics?.all_results) return;
    const selectedCourse = courses.find(c => c.id === selectedOffering);
    const courseCode = selectedCourse?.course?.course_code || 'course';

    const headers = [
      'Student ID',
      'Student Name',
      'Exam Score (%)',
      'Letter Grade',
      'Semester Attendance Rate (%)',
      'Eligibility Status',
    ];

    const rows = analytics.all_results.map((r: any) => [
      `"${r.student_id}"`,
      `"${r.student_name}"`,
      r.score,
      r.grade,
      r.attendance_rate !== null ? `${r.attendance_rate}%` : 'N/A',
      r.attendance_rate !== null ? (r.attendance_rate >= 75 ? 'ELIGIBLE' : 'AT_RISK') : 'NO_ATTENDANCE_RECORD',
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance_vs_attendance_${courseCode}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1150px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>Results & Attendance Analytics</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Visualise semester-wide attendance correlations with exam performance and export semester broadsheets.
          </p>
        </div>

        {selectedOffering && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={exportSemesterAttendanceCsv}
              disabled={isExportingSemester}
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}
              title="Export complete semester broadsheet with every session breakdown"
            >
              <FileSpreadsheet size={15} color="var(--primary-color)" />
              {isExportingSemester ? 'Exporting Sheet...' : 'Export Semester Attendance (CSV)'}
            </button>

            {analytics && (
              <button
                onClick={exportAnalyticsResultsCsv}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}
                title="Download combined exam performance and attendance dataset"
              >
                <Download size={15} />
                Export Analytics Dataset
              </button>
            )}
          </div>
        )}
      </div>

      {/* Course Selection & Upload Card */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>1. Select Course & Upload Results</h3>
        <div style={{ marginBottom: '1.5rem' }}>
          <label className="input-label">Select Course Offering</label>
          <select className="input-field" value={selectedOffering} onChange={(e) => handleOfferingChange(e.target.value)}>
            <option value="">— Choose a course offering —</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.course?.course_code} — {c.course?.course_name} (Sem {c.semester})</option>
            ))}
          </select>
        </div>

        <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.825rem', fontFamily: 'var(--font-data)', color: '#1E40AF' }}>
            <strong>Required columns:</strong>&nbsp; <code>student_id</code> (or index number), <code>student_name</code>, <code>score</code> (0–100)<br />
            <span style={{ opacity: 0.85 }}>Uploaded exam scores will automatically be correlated with cumulative semester attendance records.</span>
          </div>
          <button
            onClick={downloadTemplate}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: 'var(--radius-full)', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
          >
            <Download size={14} />
            Download Sample CSV
          </button>
        </div>

        {/* Drop Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
          style={{ border: `2px dashed ${dragOver ? 'var(--primary-color)' : '#CBD5E1'}`, borderRadius: 'var(--radius-lg)', padding: '2.5rem 2rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease', backgroundColor: dragOver ? '#EFF6FF' : '#F8FAFC' }}
        >
          <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ''; }} />
          {uploadStatus === 'uploading'
            ? <><RefreshCw size={36} className="animate-spin" style={{ color: 'var(--primary-color)', margin: '0 auto 0.75rem', display: 'block' }} /><p style={{ fontWeight: 600 }}>Calculating semester correlation and metrics...</p></>
            : <><UploadCloud size={36} style={{ color: 'var(--text-secondary)', margin: '0 auto 0.75rem', display: 'block' }} /><p style={{ fontWeight: 600 }}>Drop exam results CSV here, or click to browse</p><p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Max 2 MB · .csv only</p></>
          }
        </div>

        {uploadStatus === 'success' && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginTop: '1rem', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <CheckCircle size={20} style={{ color: 'var(--success-color)', flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 600, color: 'var(--success-color)' }}>{uploadMessage}</p>
              {uploadErrors.length > 0 && <p style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: 'var(--warning-color)' }}>{uploadErrors.length} row(s) skipped.</p>}
            </div>
          </div>
        )}
        {uploadStatus === 'error' && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginTop: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <X size={20} style={{ color: 'var(--error-color)', flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 600, color: 'var(--error-color)' }}>{uploadMessage}</p>
              {uploadErrors.map((e, i) => <p key={i} style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>{e}</p>)}
            </div>
          </div>
        )}
      </div>

      {isLoadingAnalytics && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 1rem', display: 'block' }} />
          <p>Processing semester analytics...</p>
        </div>
      )}

      {analytics && !isLoadingAnalytics && (
        <>
          {/* KPI Summary Cards */}
          <div className="stats-grid" style={{ marginBottom: '2rem' }}>
            {[
              { title: 'Enrolled Students', value: analytics.summary.total_students, icon: <Users size={20} color="var(--primary-color)" />, sub: 'Total cohort size' },
              { title: 'Cohort Avg Score', value: `${analytics.summary.avg_score}%`, icon: <Award size={20} color="var(--success-color)" />, sub: 'Mean exam mark' },
              { title: 'Exam Pass Rate', value: `${analytics.summary.pass_rate}%`, icon: <TrendingUp size={20} color="#1976D2" />, sub: 'Scored ≥ 50%' },
              { title: 'Semester Attendance', value: analytics.summary.avg_attendance ? `${analytics.summary.avg_attendance}%` : '—', icon: <BarChart2 size={20} color="var(--accent-color)" />, sub: 'Cohort mean presence' },
              { title: 'At-Risk Students', value: analytics.summary.at_risk, icon: <AlertTriangle size={20} color="var(--error-color)" />, sub: 'Attendance < 75%' },
            ].map((kpi) => (
              <div key={kpi.title} className="stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="stat-title">{kpi.title}</span>{kpi.icon}
                </div>
                <span className="stat-value" style={{ fontSize: '1.75rem' }}>{kpi.value}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{kpi.sub}</span>
              </div>
            ))}
          </div>

          {/* ── Correlation Analysis & Regression Panel ───────────────────────── */}
          {corr && (
            <div className="card" style={{ marginBottom: '2rem', border: '2px solid #DBEAFE' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.6rem', backgroundColor: '#EFF6FF', borderRadius: 'var(--radius-md)' }}>
                  <Activity size={24} color="var(--primary-color)" />
                </div>
                <div>
                  <h4 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                    Statistical Correlation: Attendance ↔ Academic Performance
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Linear regression analysis across {corr.sample_size} students with matched semester attendance and exam records.
                  </p>
                </div>
              </div>

              {/* Metric Statistics Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                  { label: 'Pearson r', value: corr.r, hint: 'Correlation coefficient (-1.0 to +1.0)' },
                  { label: 'R² (Variance Explained)', value: `${Math.round((corr.r_squared || 0) * 100)}%`, hint: 'Degree to which attendance predicts exam score' },
                  { label: 'Regression Slope', value: `${corr.slope > 0 ? '+' : ''}${corr.slope}`, hint: `Score change per 1% increase in attendance` },
                ].map(s => (
                  <div key={s.label} style={{ backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-md)', padding: '1rem', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{s.label}</p>
                    <p style={{ fontFamily: 'var(--font-data)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-color)' }}>{s.value}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{s.hint}</p>
                  </div>
                ))}
                <div style={{ backgroundColor: STRENGTH_STYLES[corr.strength]?.bg || '#F1F5F9', borderRadius: 'var(--radius-md)', padding: '1rem', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Correlation Strength</p>
                  <p style={{ fontSize: '1.35rem', fontWeight: 800, color: STRENGTH_STYLES[corr.strength]?.color }}>{corr.strength}</p>
                  <p style={{ fontSize: '0.7rem', marginTop: '0.25rem', color: STRENGTH_STYLES[corr.strength]?.color, textTransform: 'capitalize', fontWeight: 600 }}>{corr.direction} trajectory</p>
                </div>
              </div>

              {/* Dynamic Insight Box */}
              {corr.insight && (
                <div style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <Sparkles size={20} color="#0369A1" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                  <p style={{ fontSize: '0.875rem', color: '#0C4A6E', lineHeight: 1.6 }}>
                    <strong>Pedagogical Insight: </strong>{corr.insight}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Attendance-Performance 4-Quadrant Matrix ──────────────────────── */}
          {quadrants && (
            <div className="card" style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h4 style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    Student Distribution Matrix (Attendance vs Performance)
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Categorisation of students by 75% attendance threshold and 60% exam mark benchmark.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                {/* High Att, High Score */}
                <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>Consistent Achievers</span>
                    <span style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 800 }}>
                      {quadrants.high_att_high_score}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#14532D', marginBottom: '0.5rem' }}>
                    Attendance ≥ 75% & Score ≥ 60%
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#166534', opacity: 0.9 }}>
                    High lecture participation directly mirrored in high exam achievement.
                  </p>
                </div>

                {/* High Att, Low Score */}
                <div style={{ backgroundColor: '#FEFCE8', border: '1px solid #FEF08A', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#854D0E', textTransform: 'uppercase' }}>Needs Academic Support</span>
                    <span style={{ backgroundColor: '#FEF9C3', color: '#854D0E', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 800 }}>
                      {quadrants.high_att_low_score}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#713F12', marginBottom: '0.5rem' }}>
                    Attendance ≥ 75% & Score &lt; 60%
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#854D0E', opacity: 0.9 }}>
                    Attending class regularly but struggling on exams. Ideal candidates for tutorials.
                  </p>
                </div>

                {/* Low Att, High Score */}
                <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase' }}>Autonomous / Capable</span>
                    <span style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 800 }}>
                      {quadrants.low_att_high_score}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#1E3A8A', marginBottom: '0.5rem' }}>
                    Attendance &lt; 75% & Score ≥ 60%
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#1E40AF', opacity: 0.9 }}>
                    Scoring well despite missing lectures. May need attendance compliance reminders.
                  </p>
                </div>

                {/* Low Att, Low Score */}
                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase' }}>Critical Risk / Disengaged</span>
                    <span style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 800 }}>
                      {quadrants.low_att_low_score}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#7F1D1D', marginBottom: '0.5rem' }}>
                    Attendance &lt; 75% & Score &lt; 60%
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#991B1B', opacity: 0.9 }}>
                    Low lecture presence combined with failing marks. Requires immediate faculty intervention.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Visual Charts Grid ───────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Chart 1: Scatter Plot + Linear Regression Line */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h4 style={{ fontWeight: 800, fontSize: '0.95rem' }}>Attendance vs Exam Score</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Each point represents a student</p>
                </div>
                {corr?.r !== null && (
                  <span style={{ fontSize: '0.75rem', backgroundColor: '#EFF6FF', color: 'var(--primary-color)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontFamily: 'var(--font-data)', fontWeight: 800 }}>
                    r = {corr.r}
                  </span>
                )}
              </div>
              {scatterPoints.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart margin={{ bottom: 25, right: 15, left: -10, top: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis type="number" dataKey="attendance" name="Attendance" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} label={{ value: 'Semester Attendance Rate (%)', position: 'insideBottom', offset: -15, fontSize: 11, fill: '#64748B' }} />
                    <YAxis type="number" dataKey="score" name="Score" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} label={{ value: 'Exam Score (%)', angle: -90, position: 'insideLeft', offset: 15, fontSize: 11, fill: '#64748B' }} />
                    <Tooltip content={({ active, payload }) => {
                      if (active && payload?.length) {
                        const d = payload[0]?.payload;
                        if (!d?.name) return null;
                        return (
                          <div style={{ background: 'white', border: '1px solid #E2E8F0', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.8rem', boxShadow: '0 4px 6px -1px rgb(0 0 0/0.1)' }}>
                            <p style={{ fontWeight: 800, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>{d.name}</p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>ID: {d.studentId}</p>
                            <p>Exam Score: <strong>{d.score}%</strong></p>
                            <p>Semester Attendance: <strong>{d.attendance}%</strong></p>
                            <p>Grade: <strong style={{ color: GRADE_COLORS[d.grade] }}>{d.grade}</strong></p>
                          </div>
                        );
                      }
                      return null;
                    }} />
                    {/* Eligibility Reference Line at 75% */}
                    <ReferenceLine x={75} stroke="#ED6C02" strokeDasharray="4 4" label={{ value: '75% Req', position: 'insideTopRight', fill: '#ED6C02', fontSize: 10 }} />
                    {/* Pass Reference Line at 50% */}
                    <ReferenceLine y={50} stroke="#94A3B8" strokeDasharray="3 3" label={{ value: '50% Pass', position: 'insideTopLeft', fill: '#94A3B8', fontSize: 10 }} />
                    <Scatter name="Students" data={scatterPoints} fill="var(--primary-color)" opacity={0.8} />
                    {regressionPoints.length === 2 && (
                      <Line
                        data={regressionPoints}
                        type="linear"
                        dataKey="score"
                        stroke="#F2A900"
                        strokeWidth={2.5}
                        strokeDasharray="6 3"
                        dot={false}
                        name="Trend Line"
                        legendType="line"
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  No student data linked.
                </div>
              )}
              {regressionPoints.length === 2 && (
                <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid #F1F5F9', paddingTop: '0.5rem' }}>
                  <span>● <strong style={{ color: 'var(--primary-color)' }}>Student Coordinates</strong></span>
                  <span>--- <strong style={{ color: '#F2A900' }}>Regression Trend (y = {corr.slope}x + {corr.intercept})</strong></span>
                </div>
              )}
            </div>

            {/* Chart 2: Average Attendance by Grade */}
            <div className="card">
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontWeight: 800, fontSize: '0.95rem' }}>Average Attendance by Grade</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Comparing student lecture presence against resulting letter grades</p>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={gradeAttendanceData} margin={{ bottom: 25, right: 15, left: -10, top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="grade" tick={{ fontFamily: 'var(--font-data)', fontSize: 13, fontWeight: 700 }} label={{ value: 'Exam Letter Grade', position: 'insideBottom', offset: -15, fontSize: 11, fill: '#64748B' }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} label={{ value: 'Avg Attendance (%)', angle: -90, position: 'insideLeft', offset: 15, fontSize: 11, fill: '#64748B' }} />
                  <Tooltip content={({ active, payload }) => {
                    if (active && payload?.length) {
                      const d = payload[0]?.payload;
                      return (
                        <div style={{ background: 'white', border: '1px solid #E2E8F0', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.8rem', boxShadow: '0 4px 6px -1px rgb(0 0 0/0.1)' }}>
                          <p style={{ fontWeight: 800, color: GRADE_COLORS[d.grade] }}>Grade {d.grade}</p>
                          <p>Avg Attendance: <strong>{d.avg_attendance}%</strong></p>
                          <p>Avg Exam Score: <strong>{d.avg_score}%</strong></p>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Students: {d.count}</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <ReferenceLine y={75} stroke="#ED6C02" strokeDasharray="4 4" label={{ value: '75% Minimum', position: 'insideTopRight', fill: '#ED6C02', fontSize: 10 }} />
                  <Bar dataKey="avg_attendance" radius={[6, 6, 0, 0]} barSize={36}>
                    {gradeAttendanceData.map((e: any) => (
                      <Cell key={e.grade} fill={GRADE_COLORS[e.grade] || '#64748B'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid #F1F5F9', paddingTop: '0.5rem' }}>
                <span>--- <strong style={{ color: '#ED6C02' }}>75% Institutional Exam Eligibility Benchmark</strong></span>
              </div>
            </div>

            {/* Chart 3: Grade Distribution */}
            <div className="card">
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontWeight: 800, fontSize: '0.95rem' }}>Grade Distribution</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Frequency count of final marks awarded across cohort</p>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={gradeBarData} margin={{ bottom: 25, right: 15, left: -10, top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="grade" tick={{ fontFamily: 'var(--font-data)', fontSize: 13, fontWeight: 700 }} label={{ value: 'Letter Grade', position: 'insideBottom', offset: -15, fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} label={{ value: 'Students Count', angle: -90, position: 'insideLeft', offset: 15, fontSize: 11, fill: '#64748B' }} />
                  <Tooltip formatter={(v: any) => [`${v} students`, 'Count']} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={36}>
                    {gradeBarData.map((e: any) => <Cell key={e.grade} fill={GRADE_COLORS[e.grade] || '#64748B'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid #F1F5F9', paddingTop: '0.5rem' }}>
                <span>Total Graded: <strong>{analytics.summary.total_students} students</strong></span>
              </div>
            </div>
          </div>

          {/* Full Results & Attendance Broadsheet Table */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h4 style={{ fontWeight: 800, fontSize: '1.05rem' }}>
                  Cohort Attendance & Performance Broadsheet ({analytics.all_results.length})
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Merged record of exam scores, grades, and semester attendance percentages.
                </p>
              </div>
              <button
                onClick={exportAnalyticsResultsCsv}
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
              >
                <Download size={14} /> Download Table CSV
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-data)', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                    {['Student ID', 'Name', 'Exam Score', 'Grade', 'Semester Attendance', 'Exam Status'].map((h) => (
                      <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analytics.all_results.map((r: any) => {
                    const isAtRisk = r.attendance_rate !== null && r.attendance_rate < 75;
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: isAtRisk ? '#FFFBEB' : 'transparent' }}>
                        <td style={{ padding: '0.875rem 1rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{r.student_id}</td>
                        <td style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {isAtRisk && <AlertTriangle size={15} color="var(--warning-color)" />}
                            {r.student_name}
                          </div>
                        </td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ flex: 1, height: '6px', backgroundColor: '#E2E8F0', borderRadius: 3, minWidth: 60, maxWidth: 90 }}>
                              <div style={{ width: `${r.score}%`, height: '100%', backgroundColor: GRADE_COLORS[r.grade] || '#64748B', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontWeight: 700 }}>{r.score}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span style={{ backgroundColor: (GRADE_COLORS[r.grade] || '#64748B') + '22', color: GRADE_COLORS[r.grade] || '#64748B', padding: '0.2rem 0.65rem', borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '0.8rem' }}>
                            {r.grade}
                          </span>
                        </td>
                        <td style={{ padding: '0.875rem 1rem', color: isAtRisk ? 'var(--warning-color)' : 'var(--success-color)', fontWeight: 700 }}>
                          {r.attendance_rate !== null ? `${r.attendance_rate}%` : '—'}
                        </td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          {r.attendance_rate !== null ? (
                            r.attendance_rate >= 75 ? (
                              <span style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Check size={12} /> Eligible
                              </span>
                            ) : (
                              <span style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <ShieldAlert size={12} /> Barred (&lt;75%)
                              </span>
                            )
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Pending</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!analytics && !isLoadingAnalytics && selectedOffering && (
        <div style={{ textAlign: 'center', padding: '3.5rem 2rem', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-lg)', border: '1px solid #E2E8F0' }}>
          <FileText size={48} style={{ color: 'var(--text-secondary)', opacity: 0.35, margin: '0 auto 1rem', display: 'block' }} />
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>No results uploaded yet</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '450px', margin: '0 auto 1.5rem auto' }}>
            Upload your course exam scores CSV above to instantly view the correlation between lecture attendance and exam grades.
          </p>
          <button
            onClick={exportSemesterAttendanceCsv}
            disabled={isExportingSemester}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}
          >
            <FileSpreadsheet size={16} color="var(--primary-color)" />
            {isExportingSemester ? 'Generating Sheet...' : 'Export Semester Attendance Only (CSV)'}
          </button>
        </div>
      )}
    </div>
  );
}
