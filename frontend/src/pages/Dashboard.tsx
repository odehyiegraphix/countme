import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Fingerprint, 
  LayoutDashboard, 
  BookOpen, 
  History, 
  Settings, 
  LogOut,
  Users,
  CheckCircle,
  Clock,
  Play,
  X,
  RefreshCw,
  MapPin,
  BarChart2,
  Minus,
  Maximize2,
  Calendar,
  FileDown,
  FileSpreadsheet,
  ShieldAlert,
  Eye,
  Check,
  Search,
  Layers,
  Filter,
  GraduationCap
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../lib/api';
import AnalyticsPage from './AnalyticsPage';


export default function Dashboard() {
  const navigate = useNavigate();
  const [activeSession, setActiveSession] = useState<any>(null);
  const [qrToken, setQrToken] = useState<string>('');
  const [countdown, setCountdown] = useState(15);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  // Geofence states
  const [isConfiguringSession, setIsConfiguringSession] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [sessionConfig, setSessionConfig] = useState({ lat: 0, lng: 0, radius: 50 });
  const [isLocating, setIsLocating] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);

  // Settings state
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('countme_profile');
    if (saved) return JSON.parse(saved);
    const storedName = localStorage.getItem('userName') || 'Alan Smith';
    const parts = storedName.split(' ');
    return { firstName: parts[0] || 'Alan', lastName: parts.slice(1).join(' ') || 'Smith' };
  });
  const [draftProfile, setDraftProfile] = useState(profile);
  const [preferences, setPreferences] = useState(() => {
    const saved = localStorage.getItem('countme_preferences');
    return saved ? JSON.parse(saved) : { radius: 50, qrSpeed: 15 };
  });
  const [draftPreferences, setDraftPreferences] = useState(preferences);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await api.get('/courses');
        setCourses(response.data);
      } catch (error) {
        console.error('Failed to fetch courses', error);
      } finally {
        setIsLoadingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  // History & Records State & Helpers
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedSessionAttendance, setSelectedSessionAttendance] = useState<any | null>(null);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);

  // Search & Filter State
  const [searchStudent, setSearchStudent] = useState('');
  const [filterOfferingId, setFilterOfferingId] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [historyViewMode, setHistoryViewMode] = useState<'sessions' | 'records'>('sessions');
  const [studentRecords, setStudentRecords] = useState<any[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  const fetchFilteredHistory = async (customParams?: any) => {
    setIsLoadingHistory(true);
    try {
      const p = customParams !== undefined ? customParams : {
        date: filterDate,
        offering_id: filterOfferingId,
        level: filterLevel,
        semester: filterSemester,
      };
      const params: any = {};
      if (p.date) params.date = p.date;
      if (p.offering_id) params.offering_id = p.offering_id;
      if (p.level) params.level = p.level;
      if (p.semester) params.semester = p.semester;

      const res = await api.get('/sessions/history', { params });
      setHistorySessions(res.data);
    } catch (e) {
      console.error('Failed to load session history', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchFilteredRecords = async (customParams?: any) => {
    setIsLoadingRecords(true);
    try {
      const p = customParams !== undefined ? customParams : {
        search: searchStudent,
        date: filterDate,
        offering_id: filterOfferingId,
        level: filterLevel,
        semester: filterSemester,
      };
      const params: any = {};
      if (p.search) params.search = p.search;
      if (p.date) params.date = p.date;
      if (p.offering_id) params.offering_id = p.offering_id;
      if (p.level) params.level = p.level;
      if (p.semester) params.semester = p.semester;

      const res = await api.get('/sessions/records', { params });
      setStudentRecords(res.data);
    } catch (e) {
      console.error('Failed to load student attendance records', e);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const fetchHistory = () => {
    fetchFilteredHistory();
    fetchFilteredRecords();
  };

  const handleSearchAttendance = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchStudent.trim()) {
      setHistoryViewMode('records');
    }
    fetchFilteredHistory();
    fetchFilteredRecords();
  };

  const handleResetFilters = () => {
    setSearchStudent('');
    setFilterOfferingId('');
    setFilterLevel('');
    setFilterSemester('');
    setFilterDate('');
    fetchFilteredHistory({ date: '', offering_id: '', level: '', semester: '' });
    fetchFilteredRecords({ search: '', date: '', offering_id: '', level: '', semester: '' });
  };

  const exportFilteredRecordsCsv = () => {
    if (studentRecords.length === 0) {
      alert('No attendance records to export.');
      return;
    }
    const headers = ['Student Name', 'Index Number', 'Level', 'Semester', 'Course Code', 'Course Name', 'Session Date', 'Verification Method', 'Status', 'Recorded At'];
    const rows = studentRecords.map(r => [
      `"${r.student_name}"`,
      `"${r.index_number}"`,
      r.level || 100,
      r.semester ? `Semester ${r.semester}` : '—',
      `"${r.course_code}"`,
      `"${r.course_name}"`,
      `"${formatSessionDate(r.session_date)}"`,
      `"${r.method}"`,
      `"${r.status}"`,
      `"${r.checked_in_at ? new Date(r.checked_in_at).toLocaleTimeString() : '—'}"`,
    ].join(','));
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_records_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchFilteredHistory();
      fetchFilteredRecords();
    }
  }, [activeTab]);

  const viewSessionAttendance = async (sessionId: string) => {
    setIsLoadingAttendance(true);
    try {
      const res = await api.get(`/sessions/${sessionId}/attendance`);
      setSelectedSessionAttendance(res.data);
    } catch (e) {
      alert('Failed to load attendance records for this session.');
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  const exportCsv = (sessionInfo: any, records: any[]) => {
    if (!records || records.length === 0) {
      alert('No attendance records to export for this date.');
      return;
    }
    const headers = 'Student Name,Index Number,Status,Verification Method,Check-In Time\n';
    const rows = records.map(r => 
      `"${r.name}","${r.index_number}","${r.status}","${r.method}","${new Date(r.checked_in_at).toLocaleTimeString()}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${sessionInfo.course_code}_${new Date(sessionInfo.start_time).toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Semester Attendance Export State & Helpers
  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);
  const [semesterOfferingId, setSemesterOfferingId] = useState('');
  const [semesterData, setSemesterData] = useState<any>(null);
  const [isLoadingSemesterData, setIsLoadingSemesterData] = useState(false);

  const openSemesterExportModal = (offeringId?: string) => {
    setIsSemesterModalOpen(true);
    const targetId = offeringId || (courses.length > 0 ? courses[0].id : '');
    if (targetId) {
      loadSemesterReport(targetId);
    }
  };

  const loadSemesterReport = async (offeringId: string) => {
    if (!offeringId) return;
    setSemesterOfferingId(offeringId);
    setIsLoadingSemesterData(true);
    try {
      const res = await api.get(`/offerings/${offeringId}/attendance/semester`);
      setSemesterData(res.data);
    } catch (e) {
      alert('Failed to load semester attendance report.');
    } finally {
      setIsLoadingSemesterData(false);
    }
  };

  const downloadSemesterCsv = (customData?: any) => {
    const data = customData || semesterData;
    if (!data || !data.students || data.students.length === 0) {
      alert('No attendance data available to export.');
      return;
    }
    const course = data.course;
    const sessionDates = data.session_dates || [];

    const meta = [
      `CountMe Semester Attendance Broadsheet`,
      `Course Code: ${course.code},Course Name: "${course.name}",Academic Year: ${course.academic_year || '—'},Semester: ${course.semester || '—'},Total Sessions: ${data.total_sessions}`,
      '',
    ];

    const headers = [
      'Index Number',
      'Student Name',
      'Level',
      'Total Sessions Held',
      'Attended Sessions',
      'Attendance Rate (%)',
      'Exam Eligibility (>=75%)',
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
  };

  const formatSessionDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatSessionTime = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleLogout = async () => {
    try {
      await api.post('/logout');
    } catch(e) {}
    localStorage.removeItem('role');
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleSavePreferences = () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setTimeout(() => {
      // Save profile
      setProfile(draftProfile);
      localStorage.setItem('countme_profile', JSON.stringify(draftProfile));
      // Save preferences
      setPreferences(draftPreferences);
      localStorage.setItem('countme_preferences', JSON.stringify(draftPreferences));
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 500);
  };

  const startSession = (course: any) => {
    setActiveSession(course);
    setIsConfiguringSession(true);
    setSessionConfig({ lat: 5.5545, lng: -0.1902, radius: preferences.radius || 50 });
    // Attempt background live GPS refinement if browser permits
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setSessionConfig(prev => ({
            ...prev,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }));
        },
        () => {},
        { enableHighAccuracy: false, timeout: 4000 }
      );
    }
  };

  const getLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser. Campus default coordinates will be used.");
      setSessionConfig(prev => ({ ...prev, lat: 5.5545, lng: -0.1902 }));
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSessionConfig(prev => ({
          ...prev,
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }));
        setIsLocating(false);
      },
      (error) => {
        console.warn("Location error:", error);
        alert("Live device GPS not available or permission dismissed. Campus classroom coordinates are active.");
        setSessionConfig(prev => ({ ...prev, lat: 5.5545, lng: -0.1902 }));
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const launchQrCode = async () => {
    setIsStartingSession(true);
    try {
      const response = await api.post('/sessions/start', {
        course_offering_id: activeSession.id,
        latitude: sessionConfig.lat || 5.5545,
        longitude: sessionConfig.lng || -0.1902,
        allowed_radius: sessionConfig.radius || 50
      });
      
      // The backend returns { session: {...}, qr_token: {...} }
      setActiveSession({ ...activeSession, sessionId: response.data.session.id });
      setQrToken(response.data.qr_token.signature);
      setIsConfiguringSession(false);
      setCountdown(preferences.qrSpeed || 15);
    } catch (error: any) {
      console.error('Failed to start session', error);
      const msg = error.response?.data?.message || "Failed to start session. Please try again.";
      alert(msg);
    } finally {
      setIsStartingSession(false);
    }
  };

  const endSession = async () => {
    const endedSessionId = activeSession?.sessionId;
    if (endedSessionId) {
      try {
        await api.post(`/sessions/${endedSessionId}/end`);
      } catch (error) {
        console.error('Failed to end session remotely', error);
      }
    }
    setActiveSession(null);
    setIsConfiguringSession(false);
    setIsMinimized(false);
    setQrToken('');

    if (endedSessionId) {
      setActiveTab('history');
      viewSessionAttendance(endedSessionId);
    }
  };

  // QR Token Rotation via API
  useEffect(() => {
    let timer: any;
    if (activeSession && activeSession.sessionId && !isConfiguringSession) {
      timer = setInterval(async () => {
        setCountdown((prev) => {
          if (prev <= 1) {
            api.post(`/sessions/${activeSession.sessionId}/rotate-qr`).then(res => {
               setQrToken(res.data.qr_token.signature);
            }).catch(console.error);
            return preferences.qrSpeed;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeSession, isConfiguringSession]);

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--primary-color)' }}>
          <Fingerprint size={32} />
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>CountMe</h2>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Lecturer Portal
            </p>
            {localStorage.getItem('department') && (
              <p style={{ fontSize: '0.6rem', color: 'var(--accent-color)', fontWeight: 700, textTransform: 'uppercase', marginTop: '0.1rem' }}>
                {localStorage.getItem('department')} Dept
              </p>
            )}
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          <button className={`nav-item ${activeTab === 'courses' ? 'active' : ''}`} onClick={() => setActiveTab('courses')}>
            <BookOpen size={20} />
            <span>Courses</span>
          </button>
          <button className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
            <BarChart2 size={20} />
            <span>Analytics</span>
          </button>
          <button className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
            <History size={20} />
            <span>Attendance Records</span>
          </button>
          <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <Settings size={20} />
            <span>Settings</span>
          </button>
        </nav>

        <div className="sidebar-footer" style={{ marginTop: 'auto', borderTop: '1px solid #E2E8F0', paddingTop: '1.5rem' }}>
          <button className="nav-item nav-danger" onClick={handleLogout} style={{ width: '100%' }}>
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div className="header-greeting">
            <h1>{getGreeting()}, {profile.firstName} {profile.lastName}</h1>
            <p className="desktop-only">Here's your schedule for today.</p>
          </div>
          
          <div className="header-profile">
            <div className="header-profile-text desktop-only">
              <p className="profile-name">{profile.firstName} {profile.lastName}</p>
              <p className="profile-role">{localStorage.getItem('department') ? `${localStorage.getItem('department')} Dept` : 'Lecturer'}</p>
            </div>
            <div className="profile-avatar">{profile.firstName[0]}{profile.lastName[0]}</div>
            
            <button className="mobile-logout-btn" onClick={handleLogout} aria-label="Sign out">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <div className="content-body animate-fade-in">
          {activeTab === 'dashboard' && (
            <>
              {/* Quick Stats */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="stat-title">Total Students</span>
                    <Users size={20} color="var(--primary-color)" />
                  </div>
                  <span className="stat-value">299</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <CheckCircle size={14} /> Active Enrollments
                  </span>
                </div>
                
                <div className="stat-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="stat-title">Avg. Attendance</span>
                    <History size={20} color="var(--success-color)" />
                  </div>
                  <span className="stat-value">92.4%</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Across all courses</span>
                </div>

                <div className="stat-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="stat-title">Upcoming Class</span>
                    <Clock size={20} color="var(--accent-color)" />
                  </div>
                  <span className="stat-value" style={{ fontSize: '1.5rem' }}>CS 101</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Starts in 45 mins</span>
                </div>
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Your Active Courses</h3>
              
              {isLoadingCourses ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading courses...</div>
              ) : courses.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No courses assigned to you this semester.</div>
              ) : (
                <div className="courses-grid">
                  {courses.map(offering => (
                    <div key={offering.id} className="course-card">
                      <div className="course-header">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ backgroundColor: '#E0F2FE', color: 'var(--primary-color)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600 }}>
                              {offering.course.course_code}
                            </span>
                            <h4 style={{ marginTop: '0.75rem', fontSize: '1.125rem', fontWeight: 700 }}>{offering.course.course_name}</h4>
                          </div>
                        </div>
                      </div>
                      <div className="course-body">
                        <div>
                          <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            <Users size={16} /> 0 Enrolled
                          </p>
                          <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                            <Clock size={16} /> {offering.semester} {offering.academic_year}
                          </p>
                        </div>
                        <button 
                          onClick={() => startSession({ id: offering.id, code: offering.course.course_code })}
                          className="btn btn-primary" 
                          style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', borderRadius: 'var(--radius-full)' }}
                        >
                          <Play size={16} /> Start
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'analytics' && (
            <AnalyticsPage courses={courses} />
          )}

          {activeTab === 'courses' && (
            <div className="animate-fade-in" style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-lg)', border: '1px solid #E2E8F0' }}>
              <BookOpen size={48} color="var(--text-secondary)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>My Courses</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Course management coming soon.</p>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Attendance Records & History
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    Search and filter by student name, academic level, course, or date. Review sessions and individual check-ins.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => openSemesterExportModal(filterOfferingId || undefined)}
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', height: '38px', fontSize: '0.85rem' }}
                  >
                    <FileSpreadsheet size={16} />
                    Export Semester Attendance
                  </button>
                  <button
                    onClick={fetchHistory}
                    className="btn btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', height: '38px', fontSize: '0.85rem' }}
                  >
                    <RefreshCw size={15} className={isLoadingHistory || isLoadingRecords ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="card" style={{ marginBottom: '1.5rem', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '1.25rem 1.5rem' }}>
                <form onSubmit={handleSearchAttendance} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
                    
                    {/* Student Search */}
                    <div>
                      <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <Search size={13} color="var(--primary-color)" /> Student Name / Index
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. Kwame Mensah or TU..."
                        value={searchStudent}
                        onChange={(e) => setSearchStudent(e.target.value)}
                        style={{ backgroundColor: 'white' }}
                      />
                    </div>

                    {/* Course Filter */}
                    <div>
                      <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <BookOpen size={13} color="var(--primary-color)" /> Course
                      </label>
                      <select
                        className="input-field"
                        value={filterOfferingId}
                        onChange={(e) => setFilterOfferingId(e.target.value)}
                        style={{ backgroundColor: 'white' }}
                      >
                        <option value="">All Courses</option>
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.course?.course_code} — {c.course?.course_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Level Filter */}
                    <div>
                      <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <Layers size={13} color="var(--primary-color)" /> Academic Level
                      </label>
                      <select
                        className="input-field"
                        value={filterLevel}
                        onChange={(e) => setFilterLevel(e.target.value)}
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
                      <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <GraduationCap size={13} color="var(--primary-color)" /> Semester
                      </label>
                      <select
                        className="input-field"
                        value={filterSemester}
                        onChange={(e) => setFilterSemester(e.target.value)}
                        style={{ backgroundColor: 'white' }}
                      >
                        <option value="">All Semesters</option>
                        <option value="1">Semester 1</option>
                        <option value="2">Semester 2</option>
                      </select>
                    </div>

                    {/* Date Filter */}
                    <div>
                      <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <Calendar size={13} color="var(--primary-color)" /> Specific Date
                      </label>
                      <input
                        type="date"
                        className="input-field"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        style={{ backgroundColor: 'white' }}
                      />
                    </div>

                    {/* Submit & Reset */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ flex: 1, height: '42px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem' }}
                      >
                        <Search size={15} /> Search Records
                      </button>
                      {Boolean(searchStudent || filterOfferingId || filterLevel || filterSemester || filterDate) && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="btn btn-secondary"
                          style={{ height: '42px', padding: '0 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}
                          title="Clear filters"
                        >
                          <X size={15} /> Reset
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Active Filter Chips */}
                  {Boolean(searchStudent || filterOfferingId || filterLevel || filterSemester || filterDate) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px dashed #CBD5E1', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Active Filters:</span>
                      {searchStudent && (
                        <span style={{ backgroundColor: '#EFF6FF', color: 'var(--primary-color)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                          Student: "{searchStudent}"
                        </span>
                      )}
                      {filterOfferingId && (
                        <span style={{ backgroundColor: '#E0F2FE', color: 'var(--primary-color)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                          Course: {courses.find(c => c.id === filterOfferingId)?.course?.course_code || filterOfferingId}
                        </span>
                      )}
                      {filterLevel && (
                        <span style={{ backgroundColor: '#F0FDF4', color: '#166534', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                          Level {filterLevel}
                        </span>
                      )}
                      {filterSemester && (
                        <span style={{ backgroundColor: '#EDE9FE', color: '#6D28D9', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                          Semester {filterSemester}
                        </span>
                      )}
                      {filterDate && (
                        <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                          Date: {filterDate}
                        </span>
                      )}
                    </div>
                  )}
                </form>
              </div>

              {/* View Switcher & Action Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', backgroundColor: '#F1F5F9', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
                  <button
                    onClick={() => setHistoryViewMode('sessions')}
                    style={{
                      padding: '0.45rem 1rem',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.825rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      backgroundColor: historyViewMode === 'sessions' ? 'white' : 'transparent',
                      color: historyViewMode === 'sessions' ? 'var(--primary-color)' : 'var(--text-secondary)',
                      boxShadow: historyViewMode === 'sessions' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <Calendar size={14} /> Class Sessions ({historySessions.length})
                  </button>
                  <button
                    onClick={() => setHistoryViewMode('records')}
                    style={{
                      padding: '0.45rem 1rem',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.825rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      backgroundColor: historyViewMode === 'records' ? 'white' : 'transparent',
                      color: historyViewMode === 'records' ? 'var(--primary-color)' : 'var(--text-secondary)',
                      boxShadow: historyViewMode === 'records' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <Users size={14} /> Student Check-In Records ({studentRecords.length})
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {historyViewMode === 'records' && (
                    <button
                      onClick={exportFilteredRecordsCsv}
                      className="btn btn-secondary"
                      style={{ height: '36px', padding: '0 0.85rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <FileDown size={14} /> Export Check-in Records (CSV)
                    </button>
                  )}
                </div>
              </div>

              {/* View Content: Sessions or Records */}
              {historyViewMode === 'sessions' ? (
                isLoadingHistory ? (
                  <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
                    <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                    <p>Loading attendance sessions...</p>
                  </div>
                ) : historySessions.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <Calendar size={48} color="var(--text-secondary)" style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Sessions Found</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 1rem' }}>
                      {Boolean(filterOfferingId || filterLevel || filterSemester || filterDate) ? 'No class sessions match your selected filters. Try clearing or broadening your search.' : 'When you start a lecture session, it will be automatically recorded here.'}
                    </p>
                    {Boolean(filterOfferingId || filterLevel || filterSemester || filterDate) && (
                      <button onClick={handleResetFilters} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                        Reset Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                            <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Date & Day</th>
                            <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Course</th>
                            <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Level & Sem</th>
                            <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Time & Duration</th>
                            <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</th>
                            <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Attendance</th>
                            <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historySessions.map(s => {
                            const rate = s.enrolled > 0 ? Math.round((s.present / s.enrolled) * 100) : 0;
                            return (
                              <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '1rem 1.25rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Calendar size={16} color="var(--primary-color)" />
                                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                      {formatSessionDate(s.start_time)}
                                    </span>
                                  </div>
                                </td>
                                <td style={{ padding: '1rem 1.25rem' }}>
                                  <span style={{ backgroundColor: '#E0F2FE', color: 'var(--primary-color)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, marginRight: '0.5rem' }}>
                                    {s.course_code}
                                  </span>
                                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{s.course_name}</span>
                                </td>
                                <td style={{ padding: '1rem 1.25rem' }}>
                                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                    <span style={{ backgroundColor: '#F1F5F9', color: '#475569', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                                      L{s.level || 100}
                                    </span>
                                    <span style={{ backgroundColor: '#EDE9FE', color: '#6D28D9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                                      Sem {s.semester || 1}
                                    </span>
                                  </div>
                                </td>
                                <td style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <Clock size={14} />
                                    <span>{formatSessionTime(s.start_time)}</span>
                                    {s.end_time && <span>– {formatSessionTime(s.end_time)}</span>}
                                  </div>
                                  {s.duration_min !== null && (
                                    <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{s.duration_min} mins</span>
                                  )}
                                </td>
                                <td style={{ padding: '1rem 1.25rem' }}>
                                  {s.status === 'ACTIVE' ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#ECFDF5', color: '#059669', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700 }}>
                                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669', animation: 'pulse 1.5s infinite' }}></span>
                                      LIVE NOW
                                    </span>
                                  ) : (
                                    <span style={{ backgroundColor: '#F1F5F9', color: '#64748B', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
                                      Completed
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '1rem 1.25rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.present}</span>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>/ {s.enrolled || '—'} present</span>
                                    {s.enrolled > 0 && (
                                      <span style={{ fontSize: '0.75rem', color: rate >= 75 ? 'var(--success-color)' : 'var(--warning-color)', fontWeight: 700 }}>
                                        ({rate}%)
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                                    <button
                                      onClick={() => viewSessionAttendance(s.id)}
                                      className="btn btn-sm btn-secondary"
                                    >
                                      <Eye size={13} color="var(--primary-color)" /> View Roster
                                    </button>
                                    <button
                                      onClick={() => openSemesterExportModal(s.course_offering_id)}
                                      className="btn btn-sm btn-soft"
                                      title="Export complete semester broadsheet for this course"
                                    >
                                      <FileSpreadsheet size={13} /> Semester Sheet
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              ) : (
                /* Individual Student Check-In Records Table */
                isLoadingRecords ? (
                  <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
                    <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                    <p>Loading student attendance records...</p>
                  </div>
                ) : studentRecords.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <Users size={48} color="var(--text-secondary)" style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Attendance Records Found</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 1rem' }}>
                      No student check-in records matched your filters. Check spelling or try selecting another course, level, semester, or date.
                    </p>
                    {Boolean(searchStudent || filterOfferingId || filterLevel || filterSemester || filterDate) && (
                      <button onClick={handleResetFilters} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                        Reset Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                            <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Student</th>
                            <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Course</th>
                            <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Level & Sem</th>
                            <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Session Date</th>
                            <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Verification</th>
                            <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Check-In Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentRecords.map((r) => (
                            <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '0.875rem 1.25rem' }}>
                                <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{r.student_name}</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0', fontFamily: 'monospace' }}>{r.index_number}</p>
                              </td>
                              <td style={{ padding: '0.875rem 1.25rem' }}>
                                <span style={{ backgroundColor: '#E0F2FE', color: 'var(--primary-color)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, marginRight: '0.5rem' }}>
                                  {r.course_code}
                                </span>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{r.course_name}</span>
                              </td>
                              <td style={{ padding: '0.875rem 1.25rem' }}>
                                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                  <span style={{ backgroundColor: '#F1F5F9', color: '#475569', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                                    L{r.level || 100}
                                  </span>
                                  <span style={{ backgroundColor: '#EDE9FE', color: '#6D28D9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                                    Sem {r.semester || 1}
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding: '0.875rem 1.25rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                                {formatSessionDate(r.session_date)}
                              </td>
                              <td style={{ padding: '0.875rem 1.25rem' }}>
                                <span style={{ backgroundColor: '#ECFDF5', color: '#059669', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Check size={12} /> {r.method}
                                </span>
                              </td>
                              <td style={{ padding: '0.875rem 1.25rem', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                {r.checked_in_at ? new Date(r.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              )}

              {/* Attendance Roster Modal */}
              {selectedSessionAttendance && (
                <div style={{
                  position: 'fixed',
                  inset: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                  padding: '1rem'
                }}>
                  <div className="card" style={{
                    maxWidth: '750px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    padding: '2rem',
                    position: 'relative'
                  }}>
                    <button
                      onClick={() => setSelectedSessionAttendance(null)}
                      style={{
                        position: 'absolute',
                        top: '1.25rem',
                        right: '1.25rem',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#F8FAFC',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#64748B',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.color = '#0F172A'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.color = '#64748B'; }}
                      title="Close modal"
                    >
                      <X size={16} />
                    </button>

                    <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem' }}>
                      <span style={{ backgroundColor: '#E0F2FE', color: 'var(--primary-color)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                        {selectedSessionAttendance.session.course_code}
                      </span>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.5rem 0 0.25rem 0' }}>
                        {selectedSessionAttendance.session.course_name}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={14} />
                          {formatSessionDate(selectedSessionAttendance.session.start_time)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={14} />
                          {formatSessionTime(selectedSessionAttendance.session.start_time)}
                          {selectedSessionAttendance.session.end_time && ` – ${formatSessionTime(selectedSessionAttendance.session.end_time)}`}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Attended Students ({selectedSessionAttendance.records.length})
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          onClick={() => exportCsv(selectedSessionAttendance.session, selectedSessionAttendance.records)}
                          className="btn btn-sm btn-secondary"
                          title="Export this single day's attendance"
                        >
                          <FileDown size={14} /> Export Daily CSV
                        </button>
                        <button
                          onClick={() => {
                            const foundCourse = courses.find(c => c.course?.course_code === selectedSessionAttendance.session.course_code);
                            openSemesterExportModal(foundCourse?.id);
                          }}
                          className="btn btn-sm btn-primary"
                        >
                          <FileSpreadsheet size={14} /> Export Semester Broadsheet
                        </button>
                      </div>
                    </div>

                    {selectedSessionAttendance.records.length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>
                        No students checked in during this session.
                      </p>
                    ) : (
                      <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)' }}>#</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)' }}>Student Name</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)' }}>Index Number</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)' }}>Check-in Time</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-secondary)' }}>Verification</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedSessionAttendance.records.map((r: any, idx: number) => (
                              <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{idx + 1}</td>
                                <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{r.name}</td>
                                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{r.index_number}</td>
                                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                                  {new Date(r.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </td>
                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                  <span style={{ backgroundColor: '#ECFDF5', color: '#059669', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Check size={12} /> {r.method}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Semester Attendance Broadsheet Export Modal */}
              {isSemesterModalOpen && (
                <div style={{
                  position: 'fixed',
                  inset: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                  padding: '1rem'
                }}>
                  <div className="card" style={{
                    maxWidth: '850px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    padding: '2rem',
                    position: 'relative'
                  }}>
                    <button
                      onClick={() => setIsSemesterModalOpen(false)}
                      style={{
                        position: 'absolute',
                        top: '1.25rem',
                        right: '1.25rem',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#F8FAFC',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#64748B',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.color = '#0F172A'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.color = '#64748B'; }}
                      title="Close modal"
                    >
                      <X size={16} />
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                      <div style={{ padding: '0.5rem', backgroundColor: '#EFF6FF', borderRadius: 'var(--radius-md)' }}>
                        <FileSpreadsheet size={24} color="var(--primary-color)" />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Semester Attendance Broadsheet</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', margin: '0.2rem 0 0 0' }}>
                          Cumulative aggregate attendance reporting across all lecture sessions for the semester.
                        </p>
                      </div>
                    </div>

                    {/* Course Selection */}
                    <div style={{ marginBottom: '1.5rem', backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #E2E8F0' }}>
                      <label className="input-label" style={{ marginBottom: '0.4rem' }}>Select Course Offering</label>
                      <select
                        className="input-field"
                        value={semesterOfferingId}
                        onChange={(e) => loadSemesterReport(e.target.value)}
                      >
                        <option value="">— Choose a course offering —</option>
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.course?.course_code} — {c.course?.course_name} (Semester {c.semester})
                          </option>
                        ))}
                      </select>
                    </div>

                    {isLoadingSemesterData ? (
                      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                        <p>Compiling semester broadsheet and eligibility...</p>
                      </div>
                    ) : semesterData ? (
                      <div>
                        {/* Summary stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                          <div style={{ backgroundColor: '#F1F5F9', padding: '0.75rem 1rem', borderRadius: '8px', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Sessions Held</span>
                            <p style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary-color)', margin: '0.25rem 0 0 0' }}>{semesterData.total_sessions}</p>
                          </div>
                          <div style={{ backgroundColor: '#F1F5F9', padding: '0.75rem 1rem', borderRadius: '8px', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Students</span>
                            <p style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.25rem 0 0 0' }}>{semesterData.students.length}</p>
                          </div>
                          <div style={{ backgroundColor: '#F0FDF4', padding: '0.75rem 1rem', borderRadius: '8px', textAlign: 'center', border: '1px solid #BBF7D0' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Exam Eligible (≥75%)</span>
                            <p style={{ fontSize: '1.35rem', fontWeight: 800, color: '#166534', margin: '0.25rem 0 0 0' }}>
                              {semesterData.students.filter((s: any) => s.eligibility === 'ELIGIBLE').length}
                            </p>
                          </div>
                          <div style={{ backgroundColor: '#FEF2F2', padding: '0.75rem 1rem', borderRadius: '8px', textAlign: 'center', border: '1px solid #FECACA' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase' }}>At Risk (&lt;75%)</span>
                            <p style={{ fontSize: '1.35rem', fontWeight: 800, color: '#991B1B', margin: '0.25rem 0 0 0' }}>
                              {semesterData.students.filter((s: any) => s.eligibility !== 'ELIGIBLE').length}
                            </p>
                          </div>
                        </div>

                        {/* Action Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            Semester Attendance Records ({semesterData.students.length} students)
                          </span>
                          <button
                            onClick={() => downloadSemesterCsv()}
                            className="btn btn-sm btn-primary"
                          >
                            <FileDown size={14} /> Download Semester CSV (Broadsheet)
                          </button>
                        </div>

                        {/* Table Preview */}
                        <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px', maxHeight: '350px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#F8FAFC', zIndex: 10 }}>
                              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                                <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)' }}>#</th>
                                <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)' }}>Index No</th>
                                <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)' }}>Student Name</th>
                                <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)' }}>Attended</th>
                                <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)' }}>Attendance %</th>
                                <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-secondary)' }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {semesterData.students.map((s: any, idx: number) => {
                                const isAtRisk = s.eligibility !== 'ELIGIBLE';
                                return (
                                  <tr key={s.student_id} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: isAtRisk ? '#FFFBEB' : 'transparent' }}>
                                    <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-secondary)' }}>{idx + 1}</td>
                                    <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'monospace', fontWeight: 600 }}>{s.index_number}</td>
                                    <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>{s.name}</td>
                                    <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                                      {s.sessions_present} / {s.total_sessions}
                                    </td>
                                    <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: 700, color: isAtRisk ? 'var(--warning-color)' : 'var(--success-color)' }}>
                                      {s.attendance_rate}%
                                    </td>
                                    <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                                      {s.eligibility === 'ELIGIBLE' ? (
                                        <span style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.725rem', fontWeight: 700 }}>
                                          ELIGIBLE
                                        </span>
                                      ) : (
                                        <span style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.725rem', fontWeight: 700 }}>
                                          AT RISK (&lt;75%)
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                        Select a course offering above to preview the semester attendance broadsheet.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="animate-fade-in" style={{ maxWidth: '800px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Account Settings</h2>
              
              <div style={{ backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-lg)', border: '1px solid #E2E8F0', overflow: 'hidden', marginBottom: '2rem' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #E2E8F0' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Profile Information</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Update your profile details.</p>
                </div>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                      <label className="input-label">First Name</label>
                      <input
                        type="text"
                        className="input-field"
                        value={draftProfile.firstName}
                        onChange={(e) => setDraftProfile({ ...draftProfile, firstName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="input-label">Last Name</label>
                      <input
                        type="text"
                        className="input-field"
                        value={draftProfile.lastName}
                        onChange={(e) => setDraftProfile({ ...draftProfile, lastName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="input-label">Email Address</label>
                    <input type="email" className="input-field" defaultValue="admin@countme.edu" disabled style={{ backgroundColor: '#F1F5F9', color: '#94A3B8' }} />
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-lg)', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #E2E8F0' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Default Lecture Preferences</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Set defaults for new sessions.</p>
                </div>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <label className="input-label">Geofence Radius</label>
                    <select 
                      className="input-field" 
                      value={draftPreferences.radius}
                      onChange={(e) => setDraftPreferences({ ...draftPreferences, radius: parseInt(e.target.value) })}
                    >
                      <option value="15">15m - Small Classroom</option>
                      <option value="50">50m - Lecture Hall</option>
                      <option value="100">100m - Auditorium/Outdoor</option>
                    </select>
                  </div>
                  <div>
                    <label className="input-label">QR Refresh Rate</label>
                    <select 
                      className="input-field" 
                      value={draftPreferences.qrSpeed}
                      onChange={(e) => setDraftPreferences({ ...draftPreferences, qrSpeed: parseInt(e.target.value) })}
                    >
                      <option value="10">10 seconds</option>
                      <option value="15">15 seconds</option>
                      <option value="30">30 seconds</option>
                    </select>
                  </div>
                  <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button 
                      className="btn btn-primary" 
                      onClick={handleSavePreferences}
                      disabled={isSaving}
                      style={{ minWidth: '160px', opacity: isSaving ? 0.8 : 1 }}
                    >
                      {isSaving ? <><RefreshCw size={16} className="animate-spin" style={{ marginRight: '0.5rem' }} /> Saving...</> : 'Save Preferences'}
                    </button>
                    {saveSuccess && (
                      <span className="animate-fade-in" style={{ color: 'var(--success-color)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCircle size={16} /> Preferences updated!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Configuration & Active Session Modal */}
      {activeSession && (
        isMinimized ? (
          <div className="animate-fade-in" style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            backgroundColor: 'var(--surface-color)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            padding: '1.5rem',
            zIndex: 1000,
            border: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>{activeSession.code} Live</span>
              <button 
                onClick={() => setIsMinimized(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                title="Maximize"
              >
                <Maximize2 size={18} />
              </button>
            </div>
            
            <div style={{ padding: '0.5rem', backgroundColor: 'white', borderRadius: '12px' }}>
              <QRCodeSVG 
                value={`${window.location.origin}/check-in/${qrToken}`}
                size={100} 
                level="L"
                includeMargin={false}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <RefreshCw size={14} className="animate-spin" style={{ animationDuration: '3s' }} />
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-data)' }}>
                <strong style={{ color: countdown <= 3 ? 'var(--error-color)' : 'var(--primary-color)' }}>{countdown}s</strong>
              </span>
            </div>
          </div>
        ) : (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content">
            <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', gap: '1rem' }}>
              {!isConfiguringSession && (
                <button 
                  onClick={() => setIsMinimized(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                  title="Minimize"
                >
                  <Minus size={24} />
                </button>
              )}
              {isConfiguringSession && (
                <button 
                  onClick={() => {
                    setActiveSession(null);
                    setIsConfiguringSession(false);
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                >
                  <X size={24} />
                </button>
              )}
            </div>
            
            {isConfiguringSession ? (
              // STEP 1: Geolocation Configuration
              <>
                <div style={{ display: 'inline-flex', padding: '1rem', backgroundColor: '#E0F2FE', color: 'var(--primary-color)', borderRadius: '50%', marginBottom: '1.5rem' }}>
                  <MapPin size={32} />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--primary-color)' }}>
                  Set Lecture Location
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.875rem' }}>
                  Verify location to set the geofence. Students outside this radius cannot sign in.
                </p>

                <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
                  <label className="input-label">Geofence Radius</label>
                  <select 
                    className="input-field" 
                    value={sessionConfig.radius} 
                    onChange={(e) => setSessionConfig({...sessionConfig, radius: parseInt(e.target.value)})}
                  >
                    <option value="15">15 meters</option>
                    <option value="50">50 meters</option>
                    <option value="100">100 meters</option>
                  </select>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '1.5rem', marginBottom: '2rem', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ padding: '0.5rem', backgroundColor: 'white', borderRadius: 'var(--radius-sm)', border: '1px solid #E2E8F0' }}>
                      <MapPin size={20} color={sessionConfig.lat ? 'var(--success-color)' : 'var(--text-secondary)'} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>Lecturer Coordinates</p>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: 'var(--font-data)' }}>
                        {sessionConfig.lat ? `${sessionConfig.lat.toFixed(6)}, ${sessionConfig.lng.toFixed(6)}` : 'Location not acquired yet'}
                      </p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={getLocation}
                    className="btn btn-secondary" 
                    style={{ width: '100%' }}
                    disabled={isLocating}
                  >
                    {isLocating ? <><RefreshCw size={15} className="animate-spin" /> Acquiring GPS...</> : 'Fetch Current Location'}
                  </button>
                </div>

                <button 
                  onClick={launchQrCode}
                  className="btn btn-lg btn-primary" 
                  style={{ width: '100%' }}
                  disabled={isStartingSession}
                >
                  {isStartingSession ? (
                    <><RefreshCw size={18} className="animate-spin" /> Generating Secure QR Code...</>
                  ) : (
                    <><Play size={18} /> Generate Secure QR Code</>
                  )}
                </button>
              </>
            ) : (
              // STEP 2: Active QR Code Display
              <>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--primary-color)' }}>
                  {activeSession.code} is Live
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.875rem' }}>
                  Students scan this to sign in.
                </p>

                <div style={{ 
                  background: '#F8FAFC', 
                  padding: '2rem', 
                  borderRadius: '24px', 
                  display: 'inline-block',
                  border: '2px dashed #E2E8F0',
                  marginBottom: '2rem'
                }}>
                  <QRCodeSVG 
                    value={`${window.location.origin}/check-in/${qrToken}`}
                    size={240} 
                    level="Q"
                    includeMargin={true}
                    bgColor="#F8FAFC"
                    fgColor="var(--primary-color)"
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                    <RefreshCw size={18} className="animate-spin" style={{ animationDuration: '3s' }} />
                    <span style={{ fontSize: '0.875rem', fontFamily: 'var(--font-data)' }}>
                      Rotates in <strong style={{ color: countdown <= 3 ? 'var(--error-color)' : 'var(--primary-color)' }}>{countdown}s</strong>
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-color)' }}>
                    <MapPin size={18} />
                    <span style={{ fontSize: '0.875rem' }}>Geofence: <strong>Active ({sessionConfig.radius}m)</strong></span>
                  </div>
                </div>

                <button 
                  onClick={endSession}
                  className="btn btn-lg btn-danger" 
                  style={{ marginTop: '2.5rem', width: '100%' }}
                >
                  End Class Session
                </button>
              </>
            )}
          </div>
        </div>
        )
      )}
    </div>
  );
}
