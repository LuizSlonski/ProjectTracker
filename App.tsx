
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

const App: React.FC = () => {
  // Responsive padding
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // App State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tracker' | 'issues' | 'history' | 'team' | 'innovations'>('tracker');
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

  // Auto-redirect based on role logic
  useEffect(() => {
      if (currentUser) {
          if (currentUser.role === 'QUALIDADE' || currentUser.role === 'GESTOR_QUALIDADE') {
              setActiveTab('issues');
          } else if (currentUser.role === 'PROCESSOS') {
              setActiveTab('innovations');
          } else if (currentUser.role === 'CEO') {
              setActiveTab('dashboard'); // CEO defaults to dashboard
          } else {
              // GESTOR, PROJETISTA default to tracker
              setActiveTab('tracker');
          }
      }
  }, [currentUser]);

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
    if (['GESTOR', 'PROCESSOS', 'CEO'].includes(role)) {
      return data;
    }

    // QUALITY - Sees all Issues (to analyze), All Projects (for context in charts), No Innovations
    if (role === 'QUALIDADE' || role === 'GESTOR_QUALIDADE') {
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

  const handleLogout = () => {
    setCurrentUser(null);
    // Reset to tracker but effective login will handle redirection
    setActiveTab('tracker');
  };

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  if (currentUser.needsPasswordChange) {
    return <ForcePasswordChange user={currentUser} onSuccess={setCurrentUser} />;
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
          display: 'flex', alignItems: 'center', width: '100%',
          padding: '0.75rem 1.25rem', textAlign: 'left', border: 'none', cursor: 'pointer',
          borderLeft: `3px solid ${active ? '#3b82f6' : 'transparent'}`,
          background: active ? 'rgba(59,130,246,0.1)' : 'none',
          color: active ? '#60a5fa' : '#475569',
          fontWeight: active ? 600 : 400, fontSize: '0.875rem',
          transition: 'all 0.15s', margin: '0.125rem 0',
        }}
        onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(30,41,59,0.6)'; e.currentTarget.style.color = '#94a3b8'; } }}
        onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#475569'; } }}
      >
        <Icon style={{ width: '1rem', height: '1rem', marginRight: '0.75rem', flexShrink: 0 }} />
        {label}
      </button>
    );
  };

  // Tabs available for mobile bottom nav
  const mobileNavItems = [
    ...(canUseTracker ? [{ id: 'tracker' as const, label: 'Projetar', icon: PenTool }] : []),
    ...(canUseTracker ? [{ id: 'history' as const, label: 'Histórico', icon: History }] : []),
    { id: 'dashboard' as const, label: 'Gráficos', icon: LayoutDashboard },
    { id: 'issues' as const, label: 'Qualidade', icon: AlertOctagon },
    ...(canSeeInnovations ? [{ id: 'innovations' as const, label: 'Inovações', icon: Lightbulb }] : []),
    ...(['GESTOR', 'CEO'].includes(currentUser.role) ? [{ id: 'team' as const, label: 'Equipe', icon: Users }] : []),
  ];

  const hasOverflow = mobileNavItems.length > 5;
  const visibleMobileItems = hasOverflow ? mobileNavItems.slice(0, 4) : mobileNavItems;
  const isMoreActive = hasOverflow && !visibleMobileItems.some(item => item.id === activeTab);

  return (
    <div className="flex min-h-screen" style={{ background: '#020617' }}>
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 fixed h-full z-10 text-white" style={{ background: 'rgba(8,15,30,0.97)', borderRight: '1px solid rgba(20,30,50,0.9)' }}>
        {/* Logo area */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(20,30,50,0.9)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <img src={COMPANY_LOGO_URL} alt="Logo" style={{ height: '2.5rem', width: 'auto', maxWidth: '2.5rem', objectFit: 'contain' }} />
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>
              Quality<span style={{ color: '#60a5fa' }}>Tracker</span>
            </span>
          </div>
          <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(30,41,59,0.8)', borderRadius: '0.75rem', padding: '0.75rem' }}>
            <p style={{ fontSize: '0.6875rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>Usuário Ativo</p>
            <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e2e8f0', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.name}</p>
            <span style={{ display: 'inline-block', marginTop: '0.375rem', fontSize: '0.6rem', fontWeight: 700, color: '#60a5fa', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', padding: '0.125rem 0.5rem', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {currentUser.role}
            </span>
          </div>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0' }}>
          {canUseTracker && <NavItem id="tracker" label="Projetar" icon={PenTool} />}
          {canUseTracker && <NavItem id="history" label="Histórico" icon={History} />}
          <NavItem id="dashboard" label="Painel & Gráficos" icon={LayoutDashboard} />
          <NavItem id="issues" label="Qualidade" icon={AlertOctagon} />
          {canSeeInnovations && <NavItem id="innovations" label="Inovações & Custos" icon={Lightbulb} />}
          {['GESTOR', 'CEO'].includes(currentUser.role) && <NavItem id="team" label="Gestão de Equipe" icon={Users} />}
        </nav>

        <div style={{ padding: '1.25rem 1rem', borderTop: '1px solid rgba(20,30,50,0.9)' }}>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.625rem 0.75rem',
            borderRadius: '0.625rem', color: '#f87171', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.875rem', fontWeight: 600, transition: 'background 0.15s', textAlign: 'left',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
            <LogOut style={{ width: '1rem', height: '1rem' }} />
            Sair da Conta
          </button>
          <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
            <span style={{ color: '#3b82f6', fontWeight: 800, fontSize: '0.8125rem' }}>JIMP</span>
            <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: '0.8125rem' }}>NEXUS</span>
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
      <header 
        className="md:hidden"
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
        {isLoading && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,6,23,0.8)', backdropFilter: 'blur(12px)' }}>
            <div style={{ background: 'rgba(10,18,35,0.95)', border: '1px solid rgba(30,41,59,0.9)', borderRadius: '1.25rem', padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
              <div style={{ position: 'relative', width: '3.5rem', height: '3.5rem' }}>
                <div style={{ position: 'absolute', inset: 0, border: '3px solid rgba(59,130,246,0.15)', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', inset: 0, border: '3px solid transparent', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <img src={COMPANY_LOGO_URL} alt="" style={{ position: 'absolute', inset: '0.5rem', objectFit: 'contain' }} />
              </div>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>
                Quality<span style={{ color: '#60a5fa' }}>Tracker</span>
              </span>
              <span style={{ fontSize: '0.8125rem', color: '#475569', animation: 'pulse 2s ease-in-out infinite' }}>Processando...</span>
            </div>
          </div>
        )}

        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

          {/* Page header helper */}
          {(() => {
            const PageHeader = ({ title, subtitle, extra }: { title: React.ReactNode; subtitle: string; extra?: React.ReactNode }) => (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <img src={COMPANY_LOGO_URL} alt="Logo" style={{ height: '2.25rem', width: 'auto', objectFit: 'contain', opacity: 0.9 }} />
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>{title}</h2>
                    <p style={{ margin: '0.125rem 0 0', fontSize: '0.8125rem', color: '#475569' }}>{subtitle}</p>
                  </div>
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
                {/* Tracker */}
                <div className={activeTab === 'tracker' && canUseTracker ? 'block' : 'hidden'}>
                  <PageHeader
                    title="Área de Projeto"
                    subtitle={`Bem-vindo, ${currentUser.name}`}
                  />
                  <ProjectTracker
                    existingProjects={displayData.projects}
                    onCreate={handleProjectCreate}
                    onUpdate={handleProjectUpdate}
                    isVisible={activeTab === 'tracker'}
                    onNavigateBack={() => setActiveTab('tracker')}
                  />
                </div>

                {/* History */}
                {activeTab === 'history' && canUseTracker && (
                  <div>
                    <PageHeader
                      title="Histórico de Liberações"
                      subtitle={canSeeAllHistory ? 'Visão geral de todas as liberações da equipe.' : 'Suas liberações passadas.'}
                    />
                    <ProjectHistory data={displayData} currentUser={currentUser} onDelete={handleProjectDelete} />
                  </div>
                )}

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

          {activeTab === 'innovations' && canSeeInnovations && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.5rem' }}>
                <img src={COMPANY_LOGO_URL} alt="Logo" style={{ height: '2.25rem', width: 'auto', objectFit: 'contain', opacity: 0.9 }} />
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>Inovações & Custos</h2>
                  <p style={{ margin: '0.125rem 0 0', fontSize: '0.8125rem', color: '#475569' }}>Gerencie propostas e economias aprovadas.</p>
                </div>
              </div>
              <InnovationManager
                innovations={displayData.innovations}
                onAdd={handleInnovationAdd}
                onStatusChange={handleInnovationStatusChange}
                onDelete={handleInnovationDelete}
                currentUser={currentUser}
              />
            </div>
          )}

          {activeTab === 'team' && ['GESTOR', 'CEO'].includes(currentUser.role) && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.5rem' }}>
                <img src={COMPANY_LOGO_URL} alt="Logo" style={{ height: '2.25rem', width: 'auto', objectFit: 'contain', opacity: 0.9 }} />
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
