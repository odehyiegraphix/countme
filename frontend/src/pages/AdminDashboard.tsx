import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Fingerprint, LayoutDashboard, Users, BookOpen,
  AlertTriangle, LogOut, RefreshCw, Radio,
  ChevronRight, Shield, Activity, Settings, Clock, ClipboardList,
  Building2
} from 'lucide-react';
import api from '../lib/api';

// Tab Components
import OverviewTab from './admin/OverviewTab';
import LiveSessionsTab from './admin/LiveSessionsTab';
import AtRiskTab from './admin/AtRiskTab';
import UsersTab from './admin/UsersTab';
import DepartmentsTab from './admin/DepartmentsTab';
import CoursesTab from './admin/CoursesTab';
import SessionHistoryTab from './admin/SessionHistoryTab';
import AttendanceTab from './admin/AttendanceTab';
import SettingsTab from './admin/SettingsTab';

import StudentsTab from './admin/StudentsTab';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Stats {
  total_students: number;
  total_lecturers: number;
  total_courses: number;
  total_depts: number;
  active_sessions: number;
  attendance_rate: number | null;
  at_risk_count: number;
  trend: { date: string; sessions: number }[];
}

interface LiveSession {
  id: string;
  course_code: string;
  course_name: string;
  lecturer: string;
  start_time: string;
  present: number;
  enrolled: number;
  radius: number;
}

interface AtRiskStudent {
  student_id: string;
  student_name: string;
  index_number?: string;
  course_code: string;
  course_name: string;
  attendance_rate: number;
  sessions_present: number;
  sessions_total: number;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [liveSessionsPreview, setLiveSessionsPreview] = useState<LiveSession[]>([]);
  const [atRiskPreview, setAtRiskPreview] = useState<AtRiskStudent[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const userRole = localStorage.getItem('role');
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isHod = userRole === 'HOD';
  const [departmentName, setDepartmentName] = useState<string>(localStorage.getItem('department') || '');

  // Synchronize department name from API if not yet present in localStorage
  useEffect(() => {
    const syncUser = async () => {
      try {
        const res = await api.get('/me');
        if (res.data?.department?.name) {
          setDepartmentName(res.data.department.name);
          localStorage.setItem('department', res.data.department.name);
        }
      } catch (err) {
        // silent
      }
    };
    if (isHod && !departmentName) {
      syncUser();
    }
  }, [isHod, departmentName]);

  const fetchOverview = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [statsRes, liveRes, riskRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/sessions/live'),
        api.get('/admin/students/at-risk'),
      ]);
      setStats(statsRes.data);
      setLiveSessionsPreview(liveRes.data);
      setAtRiskPreview(riskRes.data);
      setLastRefresh(new Date());
    } catch {
      // Handled internally by components or silent fail for preview
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    if (!isSuperAdmin && !isHod) {
      navigate('/');
      return;
    }
    
    // Only fetch overview data if we are on the dashboard tab
    if (activeTab === 'dashboard') {
      fetchOverview();
    }
  }, [activeTab, fetchOverview, navigate, isSuperAdmin, isHod]);

  const handleLogout = async () => {
    try { await api.post('/logout'); } catch { /* silent */ }
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/');
  };

  const HOD_NAV = [
    {
      label: 'Main',
      items: [
        { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={20} /> },
        { id: 'live',      label: 'Live Sessions', icon: <Radio size={20} /> },
        { id: 'risk',      label: 'At-Risk Students', icon: <AlertTriangle size={20} /> },
      ]
    },
    {
      label: 'Management',
      items: [
        { id: 'students',    label: 'Students', icon: <Users size={20} /> },
        { id: 'users',       label: 'Lecturers', icon: <Users size={20} /> },
        { id: 'courses',     label: 'Courses & Offerings', icon: <BookOpen size={20} /> },
      ]
    },
    {
      label: 'Records',
      items: [
        { id: 'history',    label: 'Session History', icon: <Clock size={20} /> },
        { id: 'attendance', label: 'Attendance Records', icon: <ClipboardList size={20} /> },
      ]
    },
    {
      label: 'System',
      items: [
        { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
      ]
    }
  ];

  const SUPER_ADMIN_NAV = [
    {
      label: 'System Management',
      items: [
        { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={20} /> },
        { id: 'departments', label: 'Departments', icon: <Activity size={20} /> },
        { id: 'users',       label: 'Users & HODs', icon: <Users size={20} /> },
      ]
    }
  ];

  const NAV_GROUPS = isSuperAdmin ? SUPER_ADMIN_NAV : HOD_NAV;

  const getPageTitle = () => {
    switch(activeTab) {
      case 'dashboard': return 'Institutional Overview';
      case 'live': return 'Live Class Sessions';
      case 'risk': return 'At-Risk Students';
      case 'users': return isSuperAdmin ? 'User Management' : 'Lecturers';
      case 'students': return 'Students Management';
      case 'departments': return 'Departments';
      case 'courses': return 'Courses & Offerings';
      case 'history': return 'Session History';
      case 'attendance': return 'Attendance Records';
      case 'settings': return 'System Settings';
      default: return 'Portal';
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--primary-color)' }}>
          <Fingerprint size={32} />
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>CountMe</h2>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {isSuperAdmin ? 'Admin Portal' : 'HOD Portal'}
            </p>
            {isHod && (
              <div style={{
                marginTop: '0.35rem',
                padding: '0.2rem 0.55rem',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <Building2 size={12} color="#059669" />
                <span style={{ fontSize: '0.68rem', color: '#065F46', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {departmentName || 'Tourism'} Dept
                </span>
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', marginRight: '-0.5rem' }}>
          {NAV_GROUPS.map((group, idx) => (
            <div key={idx} style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', paddingLeft: '0.75rem' }}>{group.label}</h4>
              <nav className="sidebar-nav">
                {group.items.map(n => (
                  <button
                    key={n.id}
                    className={`nav-item ${activeTab === n.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(n.id)}
                  >
                    {n.icon}
                    <span>{n.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          ))}
        </div>

        <div className="sidebar-footer" style={{ marginTop: 'auto', borderTop: '1px solid #E2E8F0', paddingTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', marginBottom: '0.5rem' }}>
            <Shield size={16} color="var(--primary-color)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{userRole}</span>
          </div>
          <button className="nav-item nav-danger" onClick={handleLogout} style={{ width: '100%' }}>
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="header-greeting">
            <h1>{getPageTitle()}</h1>
            {activeTab === 'dashboard' && (
              <p className="desktop-only" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                Last refreshed at {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                &nbsp;·&nbsp;
                <button
                  onClick={fetchOverview}
                  style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', fontFamily: 'inherit' }}
                >
                  <RefreshCw size={12} style={{ verticalAlign: 'middle', marginRight: '0.2rem' }} />
                  Refresh
                </button>
              </p>
            )}
          </div>

          {/* Prominent Department Indicator */}
          {isHod && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              backgroundColor: '#F0FDFA',
              border: '1.5px solid #5EEAD4',
              boxShadow: '0 2px 4px rgba(13, 148, 136, 0.08)',
              padding: '0.45rem 1rem',
              borderRadius: '9999px',
            }}>
              <Building2 size={18} color="#0D9488" />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#0D9488', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  HOD Dept:
                </span>
                <span style={{ fontSize: '0.92rem', color: '#134E4A', fontWeight: 800 }}>
                  {departmentName || 'Tourism'}
                </span>
              </div>
            </div>
          )}
        </header>

        <div className="content-body animate-fade-in">
          {activeTab === 'dashboard' && (
            <OverviewTab 
              stats={stats} 
              loadingStats={loadingStats} 
              liveSessions={liveSessionsPreview} 
              atRisk={atRiskPreview} 
              isSuperAdmin={isSuperAdmin}
              isHod={isHod}
              departmentName={departmentName}
              onGoLive={() => setActiveTab('live')}
              onGoRisk={() => setActiveTab('risk')}
            />
          )}
          {activeTab === 'live' && <LiveSessionsTab />}
          {activeTab === 'risk' && <AtRiskTab />}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'students' && <StudentsTab />}
          {activeTab === 'departments' && <DepartmentsTab />}
          {activeTab === 'courses' && <CoursesTab />}
          {activeTab === 'history' && <SessionHistoryTab />}
          {activeTab === 'attendance' && <AttendanceTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </main>
    </div>
  );
}
