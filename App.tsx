import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, PenTool, AlertOctagon, Menu, X, History, Users, LogOut, Lightbulb } from 'lucide-react';
import { ProjectTracker } from './components/ProjectTracker';
import { IssueReporter } from './components/IssueReporter';
import { IssueHistory } from './components/IssueHistory';
import { Dashboard } from './components/Dashboard';
import { ProjectHistory } from './components/ProjectHistory';
import { UserManagement } from './components/UserManagement';
import { InnovationManager } from './components/InnovationManager';
import { Login } from './components/Login';
import { fetchAppState, addProject, addIssue, addInnovation, updateInnovationStatus } from './services/storageService';
import { AppState, ProjectSession, IssueRecord, User, InnovationRecord } from './types';

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // App State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tracker' | 'issues' | 'history' | 'team' | 'innovations'>('tracker');
  const [issueTab, setIssueTab] = useState<'new' | 'history'>('new');
  const [data, setData] = useState<AppState>({ projects: [], issues: [], innovations: [] });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
  }, [currentUser]); // Reload if user changes (or initial load)

  // Filter Data based on User Role
  const displayData = useMemo(() => {
    if (!currentUser) return { projects: [], issues: [], innovations: [] };

    // GESTOR sees everything
    if (currentUser.role === 'GESTOR') {
      return data;
    }

    // PROJETISTA sees only their own items (mostly), but might see shared Innovations
    return {
      projects: data.projects.filter(p => p.userId === currentUser.id),
      issues: data.issues.filter(i => i.reportedBy === currentUser.id),
      // For innovations, usually it's good for everyone to see, but editing is restricted. 
      // For simplicity here, we show all so they can see colleagues' ideas, or filter if preferred.
      // Let's show all innovations for collaboration.
      innovations: data.innovations
    };
  }, [data, currentUser]);

  const handleProjectSave = async (project: ProjectSession) => {
    setIsLoading(true);
    // Inject current user ID into project
    const projectWithUser = { ...project, userId: currentUser?.id };
    
    // Optimistic update
    setData(prev => ({
      ...prev,
      projects: [projectWithUser, ...prev.projects]
    }));

    // Async save to DB and refresh
    try {
      const updatedData = await addProject(projectWithUser);
      setData(updatedData);
      alert(`Projeto NS ${project.ns} salvo com sucesso!`);
    } catch (e) {
      alert("Erro ao salvar no banco de dados.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleIssueReport = async (issue: IssueRecord) => {
    setIsLoading(true);
    // Inject current user ID into issue
    const issueWithUser = { ...issue, reportedBy: currentUser?.id };

     // Optimistic update
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
      alert("Erro ao salvar problema.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInnovationAdd = async (innovation: InnovationRecord) => {
    setIsLoading(true);
    // Optimistic update
    setData(prev => ({
      ...prev,
      innovations: [innovation, ...prev.innovations]
    }));

    try {
      const updatedData = await addInnovation(innovation);
      setData(updatedData);
      alert('Inovação registrada com sucesso!');
    } catch (e) {
      alert("Erro ao salvar inovação.");
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
  }

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('tracker');
  };

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  const NavItem = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        setIsMobileMenuOpen(false);
      }}
      className={`flex items-center w-full px-6 py-4 text-left transition-colors ${
        activeTab === id 
          ? 'bg-blue-50 border-r-4 border-blue-600 text-blue-700 font-medium' 
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon className={`w-5 h-5 mr-3 ${activeTab === id ? 'text-blue-600' : 'text-gray-400'}`} />
      {label}
    </button>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 fixed h-full z-10">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Project<span className="text-blue-600">Tracker</span></h1>
          <p className="text-xs text-gray-400 mt-1">Olá, {currentUser.name}</p>
          <span className="text-[10px] uppercase tracking-wider font-bold text-gray-300 border border-gray-100 px-2 py-0.5 rounded-full mt-2 inline-block">
            {currentUser.role}
          </span>
        </div>
        <nav className="flex-1 mt-6">
          <NavItem id="tracker" label="Projetar" icon={PenTool} />
          <NavItem id="history" label="Histórico" icon={History} />
          <NavItem id="dashboard" label="Painel & Gráficos" icon={LayoutDashboard} />
          <NavItem id="issues" label="Qualidade" icon={AlertOctagon} />
          <NavItem id="innovations" label="Inovações & Custos" icon={Lightbulb} />
          
          {currentUser.role === 'GESTOR' && (
            <NavItem id="team" label="Gestão de Equipe" icon={Users} />
          )}
        </nav>
        <div className="p-6 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="flex items-center text-sm text-red-600 hover:text-red-800 font-medium transition-colors w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair da Conta
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-white border-b border-gray-200 z-20 flex justify-between items-center p-4">
        <h1 className="text-xl font-bold text-gray-800">Project<span className="text-blue-600">Tracker</span></h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-white z-10 pt-20 md:hidden">
          <nav className="flex flex-col">
            <NavItem id="tracker" label="Projetar" icon={PenTool} />
            <NavItem id="history" label="Histórico" icon={History} />
            <NavItem id="dashboard" label="Painel & Gráficos" icon={LayoutDashboard} />
            <NavItem id="issues" label="Qualidade" icon={AlertOctagon} />
            <NavItem id="innovations" label="Inovações & Custos" icon={Lightbulb} />
            {currentUser.role === 'GESTOR' && (
               <NavItem id="team" label="Gestão de Equipe" icon={Users} />
            )}
            <button 
              onClick={handleLogout}
              className="flex items-center w-full px-6 py-4 text-left text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sair
            </button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-6 pt-24 md:pt-6 transition-all">
        {isLoading && (
          <div className="fixed top-0 left-0 w-full h-1 bg-blue-100 z-50">
            <div className="h-full bg-blue-600 animate-pulse w-full"></div>
          </div>
        )}
        <div className="max-w-5xl mx-auto">
          {/* Tracker Tab: Always rendered, hidden via CSS to preserve timer state */}
          <div className={activeTab === 'tracker' ? 'block space-y-6' : 'hidden'}>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Nova Liberação</h2>
              <p className="text-gray-500">Logado como: <span className="font-semibold text-blue-600">{currentUser.name}</span></p>
            </div>
            <ProjectTracker 
              onSave={handleProjectSave} 
              isVisible={activeTab === 'tracker'}
              onNavigateBack={() => setActiveTab('tracker')}
            />
          </div>

          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Histórico de Liberações</h2>
                <p className="text-gray-500">
                  {currentUser.role === 'GESTOR' 
                    ? "Visão geral de todas as liberações da equipe." 
                    : "Consulte suas liberações passadas."}
                </p>
              </div>
              <ProjectHistory data={displayData} currentUser={currentUser} />
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
               <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Painel de Desempenho</h2>
                <p className="text-gray-500">
                  {currentUser.role === 'GESTOR' ? "Indicadores globais da equipe." : "Seus indicadores de produtividade."}
                </p>
              </div>
              <Dashboard data={displayData} currentUser={currentUser} />
            </div>
          )}

          {activeTab === 'issues' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                   <h2 className="text-2xl font-bold text-gray-800">Gestão de Qualidade</h2>
                   <p className="text-gray-500">Reporte e analise os problemas ocorridos.</p>
                </div>
                <div className="bg-gray-200 p-1 rounded-lg inline-flex">
                  <button 
                    onClick={() => setIssueTab('new')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      issueTab === 'new' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Novo Registro
                  </button>
                  <button 
                    onClick={() => setIssueTab('history')}
                     className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      issueTab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Histórico de Problemas
                  </button>
                </div>
              </div>

              {issueTab === 'new' ? (
                <IssueReporter onReport={handleIssueReport} />
              ) : (
                <IssueHistory data={displayData} currentUser={currentUser} />
              )}
            </div>
          )}

          {activeTab === 'innovations' && (
             <InnovationManager 
                innovations={displayData.innovations} 
                onAdd={handleInnovationAdd}
                onStatusChange={handleInnovationStatusChange}
                currentUser={currentUser}
             />
          )}

          {activeTab === 'team' && currentUser.role === 'GESTOR' && (
             <div className="space-y-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Gestão de Equipe</h2>
                  <p className="text-gray-500">Adicione novos membros e gerencie permissões de acesso.</p>
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