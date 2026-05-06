import React, { useState, useEffect } from 'react';
import { Lock, User as UserIcon, LogIn, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { authenticateUser } from '../services/storageService';
import { User } from '../types';
import logoImg from '../src/assets/logo.png';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => { setVisible(true); }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await authenticateUser(username, password);
      if (user) {
        onLogin(user);
      } else {
        setError('Usuário ou senha inválidos');
      }
    } catch {
      setError('Erro ao conectar ao servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #020617 0%, #0c1627 45%, #020617 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Grid */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(59,130,246,0.035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59,130,246,0.035) 1px, transparent 1px)
        `,
        backgroundSize: '52px 52px',
      }} />

      {/* Glow orbs */}
      <div className="login-orb-1" style={{
        position: 'absolute', top: '18%', left: '12%',
        width: '380px', height: '380px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.14) 0%, transparent 70%)',
        filter: 'blur(50px)', pointerEvents: 'none',
      }} />
      <div className="login-orb-2" style={{
        position: 'absolute', bottom: '15%', right: '10%',
        width: '420px', height: '420px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245,158,11,0.10) 0%, transparent 70%)',
        filter: 'blur(60px)', pointerEvents: 'none',
      }} />

      {/* Corner decorators */}
      {[
        { top: '1.5rem', left: '1.5rem', borderLeft: '2px solid rgba(59,130,246,0.35)', borderTop: '2px solid rgba(59,130,246,0.35)' },
        { top: '1.5rem', right: '1.5rem', borderRight: '2px solid rgba(59,130,246,0.35)', borderTop: '2px solid rgba(59,130,246,0.35)' },
        { bottom: '1.5rem', left: '1.5rem', borderLeft: '2px solid rgba(245,158,11,0.35)', borderBottom: '2px solid rgba(245,158,11,0.35)' },
        { bottom: '1.5rem', right: '1.5rem', borderRight: '2px solid rgba(245,158,11,0.35)', borderBottom: '2px solid rgba(245,158,11,0.35)' },
      ].map((s, i) => (
        <div key={i} style={{ position: 'absolute', width: '2.5rem', height: '2.5rem', pointerEvents: 'none', ...s }} />
      ))}

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: '420px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.98)',
        transition: 'opacity 0.65s cubic-bezier(0.16,1,0.3,1), transform 0.65s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{
          background: 'rgba(10, 18, 35, 0.88)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(30, 41, 59, 0.9)',
          borderRadius: '1.375rem',
          padding: '2.5rem',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 30px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.025) inset',
        }}>
          {/* Top shimmer line */}
          <div className="login-top-line" style={{
            position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.9), transparent)',
          }} />

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div className="login-logo" style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1.25rem',
            }}>
              <div style={{
                padding: '0.875rem',
                borderRadius: '1.25rem',
                border: '1px solid rgba(59,130,246,0.25)',
                background: 'rgba(59,130,246,0.06)',
                boxShadow: '0 0 40px rgba(59,130,246,0.18), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}>
                <img src={logoImg} alt="Logo" style={{ height: '4.5rem', width: 'auto', objectFit: 'contain' }} />
              </div>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'white', margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>
              Quality<span style={{ color: '#60a5fa' }}>Tracker</span>
            </h1>
            <p style={{ color: '#4b5e7a', fontSize: '0.8125rem', marginTop: '0.5rem', fontWeight: 400 }}>
              Controle de qualidade industrial
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              marginBottom: '1.25rem', padding: '0.75rem 1rem',
              background: 'rgba(127,29,29,0.25)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.625rem',
              color: '#fca5a5', fontSize: '0.875rem',
            }}>
              <AlertCircle style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            {/* Username */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block', fontSize: '0.6875rem', fontWeight: 600,
                color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '0.5rem',
              }}>Usuário</label>
              <div style={{ position: 'relative' }}>
                <UserIcon style={{
                  position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)',
                  width: '1rem', height: '1rem', color: '#475569', pointerEvents: 'none',
                }} />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  placeholder="Seu nome de usuário"
                  className="login-input"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    paddingLeft: '2.75rem', paddingRight: '1rem',
                    paddingTop: '0.8rem', paddingBottom: '0.8rem',
                    borderRadius: '0.875rem', fontSize: '0.9rem',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{
                display: 'block', fontSize: '0.6875rem', fontWeight: 600,
                color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '0.5rem',
              }}>Senha</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{
                  position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)',
                  width: '1rem', height: '1rem', color: '#475569', pointerEvents: 'none',
                }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Sua senha"
                  className="login-input"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    paddingLeft: '2.75rem', paddingRight: '2.75rem',
                    paddingTop: '0.8rem', paddingBottom: '0.8rem',
                    borderRadius: '0.875rem', fontSize: '0.9rem',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)',
                    color: '#475569', background: 'none', border: 'none', cursor: 'pointer',
                    padding: 0, display: 'flex', alignItems: 'center',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
                >
                  {showPassword
                    ? <EyeOff style={{ width: '1rem', height: '1rem' }} />
                    : <Eye style={{ width: '1rem', height: '1rem' }} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="login-btn"
              style={{
                width: '100%',
                padding: '0.9rem 1rem',
                borderRadius: '0.875rem',
                border: '1px solid rgba(59,130,246,0.35)',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.9375rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                opacity: loading ? 0.65 : 1,
                letterSpacing: '0.01em',
              }}
            >
              {loading ? (
                <><Loader2 style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} /> Autenticando...</>
              ) : (
                <><LogIn style={{ width: '1rem', height: '1rem' }} /> Acessar Sistema</>
              )}
            </button>
          </form>

          {/* Footer */}
          <div style={{
            marginTop: '2rem', paddingTop: '1.25rem',
            borderTop: '1px solid rgba(15, 23, 42, 1)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>
              <span style={{ color: '#3b82f6', fontWeight: 800, fontSize: '0.8125rem' }}>JIMP</span>
              <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: '0.8125rem' }}>NEXUS</span>
              <span style={{ color: '#334155', marginLeft: '0.3rem', fontSize: '0.75rem' }}>&copy; 2026</span>
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div className="status-dot" style={{
                width: '0.475rem', height: '0.475rem',
                background: '#22c55e', borderRadius: '50%',
              }} />
              <span style={{ fontSize: '0.6875rem', color: '#475569' }}>Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
