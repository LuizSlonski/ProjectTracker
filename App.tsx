
import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, PenTool, AlertOctagon, Menu, X, History, Users, LogOut, Lightbulb, Shield, Activity, Eye, MoreHorizontal } from 'lucide-react';
import { ProjectTracker } from './components/ProjectTracker';
import { IssueReporter } from './components/IssueReporter';
import { IssueHistory } from './components/IssueHistory';
import { Dashboard } from './components/Dashboard';
import { ProjectHistory } from './components/ProjectHistory';
import { UserManagement } from './components/UserManagement';
import InnovationManager from './components/InnovationManager';
import { Login } from './components/Login';
import { ForcePasswordChange } from './components/ForcePasswordChange';
import { 
  fetchAppState, 
  addProject, 
  updateProject, 
  deleteProject,
  addIssue, 
  deleteIssue,
  addInnovation, 
  updateInnovationStatus,
  deleteInnovation
} from './services/storageService';
import { AppState, ProjectSession, IssueRecord, User, InnovationRecord } from './types';
import logoImg from './src/assets/logo.png';
const COMPANY_LOGO_URL = logoImg;

interface ModernLoaderProps {
  logoUrl: string;
}

const ModernLoader: React.FC<ModernLoaderProps> = ({ logoUrl }) => {
  const [statusText, setStatusText] = useState("Iniciando sistema de monitoramento...");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Elegant smooth progress calculation that glides from 0 to 100%
    const steps = [
      { text: "Iniciando sistema de monitoramento...", start: 0, end: 15 },
      { text: "Estabelecendo conexão segura com banco de dados...", start: 15, end: 35 },
      { text: "Sincronizando registros com Supabase...", start: 35, end: 55 },
      { text: "Calculando SLAs e tempos de resolução...", start: 55, end: 75 },
      { text: "Estruturando painel operacional de qualidade...", start: 75, end: 92 },
      { text: "Ambiente operacional pronto!", start: 92, end: 100 }
    ];

    let currentProgress = 0;

    const interval = setInterval(() => {
      // Smooth non-linear progress increments (simulates modern smart loading)
      const diff = Math.random() * 4 + 1; // 1% to 5% increments
      currentProgress = Math.min(100, currentProgress + diff);
      setProgress(currentProgress);

      // Find the appropriate status text matching current progress
      const activeStep = steps.find(s => currentProgress >= s.start && currentProgress <= s.end) 
                      || steps[steps.length - 1];
      setStatusText(activeStep.text);

      if (currentProgress >= 100) {
        clearInterval(interval);
      }
    }, 120);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      zIndex: 1000, 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'rgba(2, 4, 12, 0.85)', 
      backdropFilter: 'blur(16px)', 
      WebkitBackdropFilter: 'blur(16px)',
      transition: 'all 0.4s ease',
      fontFamily: "'Sora', sans-serif"
    }}>
      {/* Floating high-end organic gradient glows in background */}
      <div style={{
        position: 'absolute',
        top: '25%',
        left: '25%',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
        zIndex: -1,
        animation: 'float-slow-1 12s ease-in-out infinite'
      }} />

      <div style={{
        position: 'absolute',
        bottom: '25%',
        right: '25%',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(249, 115, 22, 0.08) 0%, transparent 70%)',
        filter: 'blur(50px)',
        pointerEvents: 'none',
        zIndex: -1,
        animation: 'float-slow-2 15s ease-in-out infinite'
      }} />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float-slow-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, 20px) scale(1.06); }
        }
        @keyframes float-slow-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, -20px) scale(1.08); }
        }
        @keyframes spin-gradient {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes logo-breathe {
          0%, 100% { transform: scale(1); opacity: 0.95; }
          50% { transform: scale(1.06); opacity: 1; filter: drop-shadow(0 0 12px rgba(59, 130, 246, 0.35)); }
        }
        @keyframes text-slide-up-fade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes line-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes card-appear {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}} />

      {/* Main minimalist premium card */}
      <div style={{
        background: 'rgba(8, 12, 28, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '2rem', 
        padding: '3rem 2.5rem',
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '1.75rem',
        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 0 40px rgba(59, 130, 246, 0.04)',
        position: 'relative',
        overflow: 'hidden',
        width: '25rem',
        maxWidth: '90%',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        animation: 'card-appear 0.5s cubic-bezier(0.16, 1, 0.3, 1) both'
      }}>
        
        {/* Luminous orbiting gradient ring */}
        <div style={{ position: 'relative', width: '6.5rem', height: '6.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)', animation: 'spin-gradient 1.4s cubic-bezier(0.5, 0.15, 0.3, 0.85) infinite' }} viewBox="0 0 100 100">
            <defs>
              <linearGradient id="loader-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
                <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f97316" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            {/* Background track circle */}
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="2.5" />
            {/* Active sweep circle */}
            <circle 
              cx="50" 
              cy="50" 
              r="44" 
              fill="none" 
              stroke="url(#loader-ring-gradient)" 
              strokeWidth="3" 
              strokeLinecap="round"
              strokeDasharray="276"
              strokeDashoffset="80"
            />
          </svg>

          {/* Central Logo Container */}
          <div style={{
            position: 'absolute',
            inset: '12px',
            borderRadius: '50%',
            background: 'rgba(3, 7, 18, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.8), 0 0 15px rgba(59, 130, 246, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'logo-breathe 2.8s ease-in-out infinite'
          }}>
            <img 
              src={logoUrl} 
              alt="Logo" 
              style={{ 
                width: '52%', 
                height: '52%', 
                objectFit: 'contain', 
                filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.3))' 
              }} 
            />
          </div>
        </div>

        {/* Heading Brand Name */}
        <div style={{ textAlign: 'center' }}>
          <span style={{ 
            fontSize: '1.375rem', 
            fontWeight: 800, 
            color: 'white', 
            display: 'block',
            letterSpacing: '-0.02em',
            fontFamily: "'Outfit', sans-serif",
            lineHeight: 1
          }}>
            Quality<span style={{ color: '#60a5fa', textShadow: '0 0 15px rgba(59, 130, 246, 0.3)' }}>Tracker</span>
          </span>
          <span style={{ 
            fontSize: '0.5625rem', 
            color: 'rgba(140, 144, 159, 0.6)', 
            fontFamily: "'JetBrains Mono', monospace", 
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            fontWeight: 700,
            marginTop: '0.45rem',
            display: 'block'
          }}>
            Joinville Implementos
          </span>
        </div>

        {/* Dynamic Transitioning Status Copy */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%', zIndex: 5 }}>
          
          <div style={{ minHeight: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span 
              key={statusText} 
              style={{ 
                fontSize: '0.8125rem', 
                color: '#94a3b8', 
                fontFamily: "var(--font-sans)", 
                fontWeight: 500, 
                textAlign: 'center',
                animation: 'text-slide-up-fade 0.35s cubic-bezier(0.16, 1, 0.3, 1) both'
              }}
            >
              {statusText}
            </span>
          </div>

          {/* Minimalist Progress Meter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', width: '100%' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.625rem', fontFamily: "'JetBrains Mono', monospace", color: '#475569', letterSpacing: '0.08em' }}>
              <span style={{ color: 'rgba(96, 165, 250, 0.5)' }}>PROCESSAMENTO DE TELEMETRIA</span>
              <span style={{ color: '#60a5fa', fontWeight: 700 }}>[ {Math.round(progress)}% ]</span>
            </div>
            
            <div style={{ 
              width: '100%', 
              height: '3px', 
              background: 'rgba(255,255,255,0.015)', 
              borderRadius: '99px', 
              overflow: 'hidden', 
              position: 'relative',
              border: '1px solid rgba(255,255,255,0.005)'
            }}>
              {/* Glowing Linear Progress Fill */}
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #2563eb 0%, #06b6d4 50%, #f97316 100%)',
                borderRadius: '99px',
                transition: 'width 0.15s ease-out',
                boxShadow: '0 0 10px rgba(6, 182, 212, 0.35)',
                position: 'relative'
              }}>
                {/* Micro reflection shimmer */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent)',
                  backgroundSize: '200% 100%',
                  animation: 'line-shimmer 2s infinite linear'
                }} />
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

const App: React.FC = () => {
  // Responsive padding
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const sessionStr = localStorage.getItem('qt_session');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        if (session.expiresAt && session.expiresAt > Date.now() && session.user) {
          return session.user;
        } else {
          localStorage.removeItem('qt_session');
          localStorage.removeItem('qt_active_tab');
        }
      } catch (e) {
        localStorage.removeItem('qt_session');
        localStorage.removeItem('qt_active_tab');
      }
    }
    return null;
  });

  // App State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'issues' | 'team'>(() => {
    const lastTab = localStorage.getItem('qt_active_tab');
    const sessionStr = localStorage.getItem('qt_session');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        if (session.expiresAt && session.expiresAt > Date.now() && session.user) {
          const user = session.user;
          const isQualidade = user.role === 'QUALIDADE';
          const isGestorCeo = ['GESTOR', 'CEO', 'GESTOR_QUALIDADE'].includes(user.role);
          
          if (lastTab) {
            let validTab = lastTab as any;
            if (isQualidade && lastTab !== 'issues') {
              validTab = 'issues';
            } else if (!isGestorCeo && lastTab === 'team') {
              validTab = 'issues';
            } else if (validTab === 'tracker' || validTab === 'history' || validTab === 'innovations') {
              validTab = isQualidade ? 'issues' : 'dashboard';
            }
            return validTab;
          }
          if (isQualidade) return 'issues';
          return 'dashboard';
        }
      } catch (e) {}
    }
    return 'issues';
  });
  const [issueTab, setIssueTab] = useState<'new' | 'history'>('new');
  const [data, setData] = useState<AppState>({ projects: [], issues: [], innovations: [] });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load data when user logs in or mounts
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const appData = await fetchAppState();
      setData(appData);
      setIsLoading(false);
    };
    load();
  }, [currentUser]); 

  // Save active tab to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('qt_active_tab', activeTab);
    }
  }, [activeTab, currentUser]);

  // Auto-redirect based on role logic
  useEffect(() => {
      if (currentUser) {
          const role = currentUser.role;
          const isQualidade = role === 'QUALIDADE';
          const isGestorCeo = ['GESTOR', 'CEO', 'GESTOR_QUALIDADE'].includes(role);

          if (isQualidade && activeTab !== 'issues') {
              setActiveTab('issues');
          } else if (!isGestorCeo && activeTab === 'team') {
              setActiveTab(isQualidade ? 'issues' : 'dashboard');
          }
      }
  }, [currentUser, activeTab]);

  // --- PERMISSIONS LOGIC ---
  
  // Who can see ALL project history?
  const canSeeAllHistory = useMemo(() => {
      if (!currentUser) return false;
      return ['GESTOR', 'CEO'].includes(currentUser.role);
  }, [currentUser]);

  const canUseTracker = useMemo(() => {
      if (!currentUser) return false;
      // Quality, Process CANNOT use tracker or see history, but CEO can see everything
      return ['PROJETISTA', 'GESTOR', 'CEO'].includes(currentUser.role);
  }, [currentUser]);

  // Who can manage Innovations? 
  const canSeeInnovations = useMemo(() => {
      if (!currentUser) return false;
      return ['GESTOR', 'PROCESSOS', 'PROJETISTA', 'CEO'].includes(currentUser.role);
  }, [currentUser]);
  
  // Who can see Dashboard? (Everyone)
  // Who can see Team? (Manager, CEO)

  // Filter Data based on User Role
  const displayData = useMemo(() => {
    if (!currentUser) return { projects: [], issues: [], innovations: [] };

    const role = currentUser.role;

    // "Super Viewers" - See everything in DB
    if (['GESTOR', 'PROCESSOS', 'CEO', 'GESTOR_QUALIDADE'].includes(role)) {
      return data;
    }

    // QUALITY - Sees all Issues (to analyze), All Projects (for context in charts), No Innovations
    if (role === 'QUALIDADE') {
        return {
            projects: data.projects, // Needed for charts context
            issues: data.issues,
            innovations: [] // Not relevant
        };
    }

    // PROJETISTA - Sees own data + All Innovations (usually shared knowledge)
    return {
      projects: data.projects.filter(p => p.userId === currentUser.id),
      issues: data.issues.filter(i => i.reportedBy === currentUser.id),
      innovations: data.innovations
    };
  }, [data, currentUser]);

  // --- HANDLERS ---

  const handleProjectCreate = async (project: ProjectSession) => {
    const projectWithUser = { ...project, userId: currentUser?.id };
    setData(prev => ({
      ...prev,
      projects: [projectWithUser, ...prev.projects]
    }));
    try {
      const updatedData = await addProject(projectWithUser);
      setData(updatedData);
    } catch (e) {
      alert("Erro ao criar projeto.");
    }
  };

  const handleProjectUpdate = async (project: ProjectSession) => {
    setData(prev => ({
        ...prev,
        projects: prev.projects.map(p => p.id === project.id ? project : p)
    }));
    try {
        const updatedData = await updateProject(project);
        setData(updatedData);
        if (project.status === 'COMPLETED') {
             // Optional alert
        }
    } catch (e) {
        alert("Erro ao atualizar projeto.");
    }
  };

  const handleProjectDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja apagar este projeto? Essa ação não pode ser desfeita.")) return;
    
    setIsLoading(true);
    try {
      const updatedData = await deleteProject(id);
      setData(updatedData);
    } catch (e) {
      alert("Erro ao apagar projeto.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleIssueReport = async (issue: IssueRecord) => {
    setIsLoading(true);
    const issueWithUser = { ...issue, reportedBy: currentUser?.id };
     setData(prev => ({
      ...prev,
      issues: [issueWithUser, ...prev.issues]
    }));
    try {
      const updatedData = await addIssue(issueWithUser);
      setData(updatedData);
      alert('Problema registrado com sucesso.');
      setIssueTab('history');
    } catch (e) {
      // Re-throw to let child component handle specific error messages
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const handleIssueDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja apagar esta ocorrência?")) return;
    setIsLoading(true);
    try {
      const updatedData = await deleteIssue(id);
      setData(updatedData);
    } catch (e) {
      alert("Erro ao apagar ocorrência.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleIssueUpdate = async () => {
    setIsLoading(true);
    try {
      const updatedData = await fetchAppState();
      setData(updatedData);
    } catch (e) {
      console.error("Failed to refresh data after update", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInnovationAdd = async (innovation: InnovationRecord) => {
    setIsLoading(true);
    // Optimistic Update
    setData(prev => ({
      ...prev,
      innovations: [innovation, ...prev.innovations]
    }));

    try {
      const updatedData = await addInnovation(innovation);
      setData(updatedData);
      alert('Inovação registrada com sucesso!');
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar inovação.");
      const revertedData = await fetchAppState();
      setData(revertedData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInnovationStatusChange = async (id: string, status: string) => {
    setIsLoading(true);
    try {
        const updatedData = await updateInnovationStatus(id, status);
        setData(updatedData);
    } catch(e) {
        alert("Erro ao atualizar status.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleInnovationDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta inovação?")) return;
    setIsLoading(true);
    try {
      const updatedData = await deleteInnovation(id);
      setData(updatedData);
    } catch (e) {
      alert("Erro ao excluir inovação.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (user: User) => {
    const expiresAt = Date.now() + 8 * 60 * 60 * 1000; // 8 hours duration
    const token = 'qt_' + Math.random().toString(36).substring(2);
    localStorage.setItem('qt_session', JSON.stringify({
      token,
      user,
      role: user.role,
      expiresAt
    }));
    setCurrentUser(user);

    // Dynamic initial page redirect
    const lastTab = localStorage.getItem('qt_active_tab');
    if (lastTab) {
      const role = user.role;
      const isQualidade = role === 'QUALIDADE';
      const isGestorCeo = ['GESTOR', 'CEO', 'GESTOR_QUALIDADE'].includes(role);

      let validTab = lastTab as any;
      if (isQualidade && lastTab !== 'issues') {
        validTab = 'issues';
      } else if (!isGestorCeo && lastTab === 'team') {
        validTab = 'issues';
      } else if (validTab === 'tracker' || validTab === 'history' || validTab === 'innovations') {
        validTab = isQualidade ? 'issues' : 'dashboard';
      }
      setActiveTab(validTab);
    } else {
      if (user.role === 'QUALIDADE') {
        setActiveTab('issues');
      } else if (['CEO', 'GESTOR', 'GESTOR_QUALIDADE'].includes(user.role)) {
        setActiveTab('dashboard');
      } else {
        setActiveTab('issues');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('qt_session');
    localStorage.removeItem('qt_active_tab');
    setCurrentUser(null);
    setActiveTab('tracker');
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  if (currentUser.needsPasswordChange) {
    return <ForcePasswordChange user={currentUser} onSuccess={handleLogin} />;
  }

  const triggerVibration = () => {
    if (navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  const NavItem = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => {
    const active = activeTab === id;
    return (
      <button
        onClick={() => setActiveTab(id)}
        style={{
          display: 'flex', alignItems: 'center',
          padding: '0.625rem 1rem', textAlign: 'left', cursor: 'pointer',
          margin: '0.125rem 0.5rem', width: 'calc(100% - 1rem)',
          borderRadius: '0.5rem',
          background: active ? 'rgba(59,130,246,0.1)' : 'transparent',
          border: active ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent',
          borderLeft: `3px solid ${active ? '#3b82f6' : 'transparent'}`,
          color: active ? '#93c5fd' : '#8c909f',
          fontWeight: active ? 600 : 400, fontSize: '0.9375rem',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#e1e2ec'; } }}
        onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8c909f'; } }}
      >
        <Icon style={{ width: '1.125rem', height: '1.125rem', marginRight: '0.75rem', flexShrink: 0 }} />
        {label}
      </button>
    );
  };

  // Tabs available for mobile bottom nav
  const mobileNavItems = [
    ...(currentUser.role !== 'QUALIDADE' ? [{ id: 'dashboard' as const, label: 'Gráficos', icon: LayoutDashboard }] : []),
    { id: 'issues' as const, label: 'Qualidade', icon: AlertOctagon },
    ...(['GESTOR', 'CEO', 'GESTOR_QUALIDADE'].includes(currentUser.role) ? [{ id: 'team' as const, label: 'Equipe', icon: Users }] : []),
  ];

  const hasOverflow = mobileNavItems.length > 5;
  const visibleMobileItems = hasOverflow ? mobileNavItems.slice(0, 4) : mobileNavItems;
  const isMoreActive = hasOverflow && !visibleMobileItems.some(item => item.id === activeTab);

  return (
    <div className="flex min-h-screen" style={{ background: '#020617' }}>
      {/* ── Sidebar — Industrial Precision design ── */}
      <aside className="hidden md:flex flex-col w-64 fixed h-full z-10" style={{
        background: 'rgba(10, 13, 21, 0.97)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
      }}>
        {/* Logo */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.25rem' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.625rem', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img src={COMPANY_LOGO_URL} alt="Logo" style={{ height: '1.75rem', width: 'auto', objectFit: 'contain' }} />
            </div>
            <div>
              <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', display: 'block', lineHeight: 1.2 }}>
                Quality<span style={{ color: '#60a5fa' }}>Tracker</span>
              </span>
              <span style={{ fontSize: '0.6875rem', color: '#424754', fontWeight: 500, letterSpacing: '0.04em' }}>Joinville Implementos</span>
            </div>
          </div>
          {/* User badge */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '0.75rem', padding: '0.75rem' }}>
            <p style={{ fontSize: '0.6875rem', color: '#424754', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>Usuário Ativo</p>
            <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#e1e2ec', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.name}</p>
            <span style={{ display: 'inline-flex', marginTop: '0.375rem', alignItems: 'center', gap: '0.25rem', fontSize: '0.625rem', fontWeight: 700, color: '#adc6ff', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', padding: '0.15rem 0.5rem', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <span style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
              {currentUser.role}
            </span>
          </div>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0' }}>
          {currentUser.role !== 'QUALIDADE' && <NavItem id="dashboard" label="Painel & Gráficos" icon={LayoutDashboard} />}
          <NavItem id="issues" label="Qualidade" icon={AlertOctagon} />
          {['GESTOR', 'CEO', 'GESTOR_QUALIDADE'].includes(currentUser.role) && <NavItem id="team" label="Gestão de Equipe" icon={Users} />}
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.625rem 0.875rem',
            borderRadius: '0.5rem', color: '#f87171',
            background: 'transparent', border: '1px solid transparent', cursor: 'pointer',
            fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}>
            <LogOut style={{ width: '1rem', height: '1rem' }} />
            Sair da Conta
          </button>
          <div style={{ textAlign: 'center', marginTop: '0.625rem', paddingBottom: '0.25rem' }}>
            <span style={{ color: '#3b82f6', fontWeight: 800, fontSize: '0.75rem' }}>JIMP</span>
            <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: '0.75rem' }}>NEXUS</span>
            <span style={{ color: '#424754', fontSize: '0.6875rem', marginLeft: '0.25rem' }}>&copy; 2026</span>
          </div>
        </div>
      </aside>


      {/* Mobile Bottom Nav */}
      <div className="mobile-bottom-nav md:hidden">
        <div style={{ display: 'flex', justifyContent: 'space-around', padding: '0.5rem 0.25rem' }}>
          {visibleMobileItems.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button 
                key={id} 
                onClick={() => {
                  triggerVibration();
                  setActiveTab(id);
                  setShowMoreMenu(false);
                }} 
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
                  padding: '0.375rem 0.625rem', borderRadius: '0.625rem', border: 'none', cursor: 'pointer',
                  background: 'none',
                  color: active ? '#60a5fa' : '#475569', transition: 'all 0.15s', flex: 1,
                }}
              >
                <div className="nav-pill">
                  {active && <div className="nav-active-bg" />}
                  <Icon style={{ width: '1.25rem', height: '1.25rem', zIndex: 1, transform: active ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.2s' }} />
                </div>
                <span style={{ fontSize: '0.5625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', zIndex: 1 }}>{label}</span>
              </button>
            );
          })}
          
          {hasOverflow && (
            <button 
              onClick={() => {
                triggerVibration();
                setShowMoreMenu(!showMoreMenu);
              }} 
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
                padding: '0.375rem 0.625rem', borderRadius: '0.625rem', border: 'none', cursor: 'pointer',
                background: 'none',
                color: isMoreActive || showMoreMenu ? '#60a5fa' : '#475569', transition: 'all 0.15s', flex: 1,
              }}
            >
              <div className="nav-pill">
                {(isMoreActive || showMoreMenu) && <div className="nav-active-bg" />}
                <MoreHorizontal style={{ width: '1.25rem', height: '1.25rem', zIndex: 1, transform: showMoreMenu ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>
              <span style={{ fontSize: '0.5625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', zIndex: 1 }}>
                {showMoreMenu ? 'Fechar' : 'Mais'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Elegant Glassmorphic Bottom Sheet Drawer for mobile overflow */}
      {showMoreMenu && hasOverflow && (
        <div 
          className="animate-fade-in"
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(2,6,23,0.75)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={() => setShowMoreMenu(false)}
        >
          <div 
            className="animate-slide-up"
            style={{
              width: '100%', maxWidth: '500px',
              background: 'rgba(15,23,42,0.98)', borderTop: '1px solid rgba(255,255,255,0.08)',
              borderTopLeftRadius: '1.5rem', borderTopRightRadius: '1.5rem',
              padding: '1.25rem 1.5rem calc(1.5rem + env(safe-area-inset-bottom, 0px))',
              boxShadow: '0 -20px 40px rgba(0,0,0,0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer drag handle */}
            <div style={{ width: '40px', height: '4px', background: '#334155', borderRadius: '2px', margin: '0 auto 1.25rem' }} />
            
            <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
              Mais Opções do Menu
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {mobileNavItems.slice(4).map(({ id, label, icon: Icon }) => {
                const active = activeTab === id;
                return (
                  <button 
                    key={id} 
                    onClick={() => {
                      triggerVibration();
                      setActiveTab(id);
                      setShowMoreMenu(false);
                    }} 
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                      padding: '1rem 0.5rem', borderRadius: '0.75rem', border: 'none', cursor: 'pointer',
                      background: active ? 'rgba(59,130,246,0.15)' : 'rgba(30,41,59,0.3)',
                      color: active ? '#60a5fa' : '#94a3b8', transition: 'all 0.15s',
                    }}
                  >
                    <Icon style={{ width: '1.375rem', height: '1.375rem' }} />
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, textAlign: 'center' }}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}



      {/* Sticky Mobile Header */}
      {!isDesktop && (
        <header 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0,
            height: 'calc(3.75rem + env(safe-area-inset-top, 0px))', zIndex: 999,
            background: '#020617', borderBottom: '1px solid rgba(30, 41, 59, 0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 1rem', paddingTop: 'env(safe-area-inset-top, 0px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src={COMPANY_LOGO_URL} alt="Logo" style={{ height: '2rem', width: 'auto', objectFit: 'contain' }} />
            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>
              Quality<span style={{ color: '#60a5fa' }}>Tracker</span>
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0', margin: 0, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser.name.split(' ')[0]}
              </p>
              <p style={{ fontSize: '0.5625rem', fontWeight: 600, color: '#60a5fa', margin: 0, textTransform: 'uppercase' }}>
                {currentUser.role}
              </p>
            </div>
            <button 
              onClick={handleLogout} 
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '2rem', height: '2rem', borderRadius: '0.5rem',
                color: '#f87171', background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <LogOut style={{ width: '0.875rem', height: '0.875rem' }} />
            </button>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main
        className="flex-1 md:ml-64 min-h-screen"
        style={{
          background: '#020617',
          padding: '1.5rem',
          paddingTop: isDesktop ? '1.5rem' : 'calc(4.5rem + env(safe-area-inset-top, 0px))',
          paddingBottom: isDesktop ? '1.5rem' : 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {isLoading && <ModernLoader logoUrl={COMPANY_LOGO_URL} />}

        <div style={{ maxWidth: '1650px', margin: '0 auto', width: '100%' }}>

          {/* Page header helper */}
          {(() => {
            const PageHeader = ({ title, subtitle, extra }: { title: React.ReactNode; subtitle: string; extra?: React.ReactNode }) => (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.75rem' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: '#e1e2ec', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{title}</h2>
                  <p style={{ margin: '0.375rem 0 0', fontSize: '0.9375rem', color: '#8c909f', fontWeight: 400 }}>{subtitle}</p>
                </div>
                {extra}
              </div>
            );

            const issueTabToggle = (
              <div style={{ display: 'flex', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(30,41,59,0.9)', borderRadius: '0.75rem', padding: '0.25rem', gap: '0.25rem' }}>
                {[{ id: 'new', label: 'Novo Registro' }, { id: 'history', label: 'Histórico' }].map(t => (
                  <button key={t.id} onClick={() => setIssueTab(t.id as any)} style={{
                    padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.8125rem', fontWeight: 600,
                    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                    background: issueTab === t.id ? 'rgba(59,130,246,0.2)' : 'none',
                    color: issueTab === t.id ? '#60a5fa' : '#475569',
                  }}>{t.label}</button>
                ))}
              </div>
            );

            return (
              <>
                {/* Tracker removed */}
                {/* History removed */}

                {/* Dashboard */}
                {activeTab === 'dashboard' && (
                  <div>
                    <PageHeader
                      title="Painel de Desempenho"
                      subtitle={canSeeAllHistory ? 'Indicadores globais da equipe.' : 'Seus indicadores de produtividade.'}
                    />
                    <Dashboard data={displayData} currentUser={currentUser} />
                  </div>
                )}

                {/* Issues */}
                {activeTab === 'issues' && (
                  <div>
                    <PageHeader
                      title="Gestão de Qualidade"
                      subtitle="Reporte e analise os problemas ocorridos."
                    />
                    {/* Tab toggle — linha separada, sempre visível */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                      {[{ id: 'new', label: 'Novo Registro' }, { id: 'history', label: 'Histórico de Problemas' }].map(t => (
                        <button key={t.id} onClick={() => setIssueTab(t.id as any)} style={{
                          flex: 1, minWidth: '140px', minHeight: '48px',
                          padding: '0.6rem 1.25rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600,
                          border: issueTab === t.id ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(30,41,59,0.9)',
                          cursor: 'pointer', transition: 'all 0.15s',
                          background: issueTab === t.id ? 'rgba(59,130,246,0.18)' : 'rgba(10,18,35,0.75)',
                          color: issueTab === t.id ? '#60a5fa' : '#475569',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>{t.label}</button>
                      ))}
                    </div>
                    {issueTab === 'new'
                      ? <IssueReporter onReport={handleIssueReport} />
                      : <IssueHistory data={displayData} currentUser={currentUser} onDelete={handleIssueDelete} onUpdate={handleIssueUpdate} />
                    }
                  </div>
                )}
              </>
            );
          })()}

          {/* Innovations removed */}

          {activeTab === 'team' && ['GESTOR', 'CEO'].includes(currentUser.role) && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>Gestão de Equipe</h2>
                  <p style={{ margin: '0.125rem 0 0', fontSize: '0.8125rem', color: '#475569' }}>Adicione membros e gerencie permissões.</p>
                </div>
              </div>
              <UserManagement />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
