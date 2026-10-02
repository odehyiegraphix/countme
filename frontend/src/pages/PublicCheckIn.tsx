import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, CheckCircle, AlertCircle, Loader2, User } from 'lucide-react';
import api from '../lib/api';

interface Student {
  id: string;
  name: string;
  index_number: string;
}

interface SessionDetails {
  course_code: string;
  course_name: string;
}

// Generate or retrieve a persistent device ID
const getDeviceId = () => {
  let deviceId = localStorage.getItem('countme_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('countme_device_id', deviceId);
  }
  return deviceId;
};

export default function PublicCheckIn() {
  const { token } = useParams<{ token: string }>();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionDetails | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await api.get(`/public/session/${token}`);
        setSession(res.data.session);
        setStudents(res.data.students);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Invalid or expired QR code.');
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchSession();
  }, [token]);

  const handleCheckIn = () => {
    if (!selectedStudent) {
      setError('Please select your name first.');
      return;
    }
    
    setError(null);
    setIsSubmitting(true);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setIsSubmitting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await api.post('/public/check-in', {
            qr_signature: token,
            student_id: selectedStudent,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            device_identifier: getDeviceId(),
          });
          setSuccess(true);
        } catch (err: any) {
          setError(err.response?.data?.message || 'Failed to check in.');
        } finally {
          setIsSubmitting(false);
        }
      },
      (geoErr) => {
        setError('Location access denied or unavailable. Please enable GPS to check in.');
        setIsSubmitting(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-primary)' }}>
        <Loader2 size={40} className="animate-spin" color="var(--primary-color)" />
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-primary)', padding: '1rem' }}>
        <div className="card animate-scale-in" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 1.5rem auto' }}>
            <CheckCircle size={40} color="var(--success-color)" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Checked In Successfully!</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Your attendance for {session?.course_code} has been securely recorded.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-primary)', padding: '1rem', position: 'relative', overflow: 'hidden' }}>
      
      {/* Background gradients for premium feel */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, var(--primary-color) 0%, transparent 60%)', opacity: 0.05, filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, var(--accent-color) 0%, transparent 60%)', opacity: 0.05, filter: 'blur(60px)', pointerEvents: 'none' }} />

      <div className="card animate-fade-in" style={{ maxWidth: '450px', width: '100%', padding: '2.5rem', position: 'relative', zIndex: 1, boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', width: '56px', height: '56px', borderRadius: '16px', background: 'var(--primary-color)', color: 'white', marginBottom: '1rem', boxShadow: '0 10px 20px rgba(99, 102, 241, 0.3)' }}>
            <MapPin size={28} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>Secure Check-In</h1>
          {session ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{session.course_code}</span> — {session.course_name}
            </p>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>Invalid Session</p>
          )}
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-color)', padding: '1rem', borderRadius: '12px', fontSize: '0.875rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        {session && (
          <>
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Select Your Name</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
                  <User size={18} />
                </div>
                <select 
                  value={selectedStudent}
                  onChange={(e) => { setSelectedStudent(e.target.value); setError(null); }}
                  className="input-field"
                  style={{ paddingLeft: '2.5rem', appearance: 'none', backgroundColor: '#F8FAFC', border: '2px solid transparent', transition: 'all 0.2s', cursor: 'pointer', height: '52px', fontSize: '1rem' }}
                  disabled={isSubmitting}
                >
                  <option value="" disabled>Choose from enrolled students...</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.index_number})</option>
                  ))}
                </select>
                <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1.5 1.5L6 6L10.5 1.5" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', height: '52px', fontSize: '1rem', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', transition: 'transform 0.1s, box-shadow 0.2s' }}
              onClick={handleCheckIn}
              disabled={isSubmitting || !selectedStudent}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" /> Verifying Location...
                </>
              ) : (
                'Confirm Attendance'
              )}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
              Requires GPS location access. Your device will be securely bound to this attendance record.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
