import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fingerprint, Lock, Mail, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import api from '../lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Real-time validation states
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  
  const navigate = useNavigate();

  // Real-time Email Validation
  useEffect(() => {
    if (email.length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setEmailError('Please enter a valid email address.');
      } else {
        setEmailError(null);
      }
    } else {
      setEmailError(null);
    }
  }, [email]);

  // Real-time Password Validation
  useEffect(() => {
    if (password.length > 0 && password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
    } else {
      setPasswordError(null);
    }
  }, [password]);

  const isFormValid = email.length > 0 && password.length >= 6 && !emailError && !passwordError;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    
    if (!isFormValid) return;
    
    setIsLoading(true);
    
    try {
      const response = await api.post('/login', {
        email,
        password,
      });

      // Save token and navigate based on role
      const role = response.data.user.role;
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('role', role);
      if (response.data.user.name) {
        localStorage.setItem('userName', response.data.user.name);
      }
      if (response.data.user.department) {
        localStorage.setItem('department', response.data.user.department);
      } else {
        localStorage.removeItem('department');
      }
      if (role === 'SUPER_ADMIN' || role === 'HOD') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 422) {
        setServerError('Invalid credentials. Please verify your email and password.');
      } else {
        setServerError('Unable to connect to the server. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="split-screen">
      {/* Left Side - Visuals */}
      <div className="split-left">
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(10, 47, 69, 0.7)' }}></div>
        
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px' }} className="animate-fade-in">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <Fingerprint size={48} color="var(--accent-color)" />
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>CountMe</h1>
          </div>
          
          <h2 className="hero-title" style={{ fontSize: '3.5rem', fontWeight: 700, lineHeight: 1.1, marginBottom: '1.5rem' }}>
            The future of <br/>
            <span style={{ color: 'var(--accent-color)' }}>attendance tracking.</span>
          </h2>
          
          <p className="hero-subtitle" style={{ fontSize: '1.25rem', color: '#E2E8F0', opacity: 0.9, lineHeight: 1.6, maxWidth: '500px' }}>
            Secure geolocation, dynamic QR validation, and hardware-level identity binding ensuring unparalleled academic integrity.
          </p>

          <div className="glass-dark animate-fade-in animate-delay-2 feature-card" style={{ marginTop: '3rem', padding: '1.5rem', borderRadius: '16px', display: 'inline-block' }}>
            <div style={{ display: 'flex', gap: '2rem' }}>
              <div>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'var(--font-data)' }}>99.9%</p>
                <p style={{ fontSize: '0.875rem', color: '#94A3B8' }}>Accuracy</p>
              </div>
              <div>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'var(--font-data)' }}>&lt; 2s</p>
                <p style={{ fontSize: '0.875rem', color: '#94A3B8' }}>Scan Time</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="split-right">
        <div style={{ width: '100%', maxWidth: '440px' }} className="animate-fade-in animate-delay-1 mobile-glass-form">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-color)', marginBottom: '0.5rem' }}>Welcome Back</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Sign in to your academic portal</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {serverError && (
              <div style={{ padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 500 }}>
                {serverError}
              </div>
            )}

            <div>
              <label className="input-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: emailError ? 'var(--error-color)' : 'var(--text-secondary)' }}>
                  <Mail size={20} />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  style={{ 
                    paddingLeft: '3rem', 
                    borderColor: emailError ? 'var(--error-color)' : undefined 
                  }}
                  required
                  autoFocus
                  placeholder="admin@countme.edu"
                />
              </div>
              {emailError && (
                <p style={{ color: 'var(--error-color)', fontSize: '0.8rem', marginTop: '0.25rem', fontWeight: 500 }}>
                  {emailError}
                </p>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                <label className="input-label" style={{ marginBottom: 0 }}>Password</label>
                <a href="#" style={{ fontSize: '0.875rem', color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 600 }}>Forgot?</a>
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: passwordError ? 'var(--error-color)' : 'var(--text-secondary)' }}>
                  <Lock size={20} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  style={{ 
                    paddingLeft: '3rem', 
                    paddingRight: '3rem',
                    borderColor: passwordError ? 'var(--error-color)' : undefined 
                  }}
                  required
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ 
                    position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', 
                    color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0
                  }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {passwordError && (
                <p style={{ color: 'var(--error-color)', fontSize: '0.8rem', marginTop: '0.25rem', fontWeight: 500 }}>
                  {passwordError}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input 
                type="checkbox" 
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: '1rem', height: '1rem', cursor: 'pointer', accentColor: 'var(--primary-color)' }}
              />
              <label htmlFor="remember" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                Remember me for 30 days
              </label>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem', width: '100%', padding: '1rem', opacity: isLoading || !isFormValid ? 0.7 : 1 }}
              disabled={isLoading || !isFormValid}
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" /> Authenticating...
                </>
              ) : (
                <>
                  Sign In Securely <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '2.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Protected by CountMe Layered Verification®
          </p>
        </div>
      </div>
    </div>
  );
}
