import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Clock, AlertCircle, Timer, Hash, Truck, Maximize2, Briefcase, ChevronRight } from 'lucide-react';
import { ProjectType, ProjectSession, PauseRecord, ImplementType } from '../types';
import { PROJECT_TYPES, IMPLEMENT_TYPES } from '../constants';

// SUBSTITUA ISSO PELA SUA URL DO WEBHOOK DO TEAMS
// (Crie um no Teams: Canal -> Conectores -> Incoming Webhook)
const TEAMS_WEBHOOK_URL = "https://outlook.office.com/webhook/YOUR_WEBHOOK_URL_HERE";

interface ProjectTrackerProps {
  existingProjects: ProjectSession[];
  onCreate: (project: ProjectSession) => void;
  onUpdate: (project: ProjectSession) => void;
  isVisible: boolean;
  onNavigateBack: () => void;
}

export const ProjectTracker: React.FC<ProjectTrackerProps> = ({ existingProjects, onCreate, onUpdate, isVisible, onNavigateBack }) => {
  // We determine the "active" project as the one currently being tracked in the UI
  const [activeProject, setActiveProject] = useState<ProjectSession | null>(null);
  
  // Timer Display State
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Form Data (For new project)
  const [ns, setNs] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [type, setType] = useState<ProjectType>(ProjectType.RELEASE);
  const [implementType, setImplementType] = useState<ImplementType>(ImplementType.BASE);
  const [notes, setNotes] = useState('');

  // Pause Logic
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReason, setPauseReason] = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Filter projects that are IN_PROGRESS
  const pendingProjects = existingProjects.filter(p => p.status === 'IN_PROGRESS');
  
  // Check if the current active project is effectively paused (has an open pause record)
  const isPaused = activeProject && 
                   activeProject.pauses.length > 0 && 
                   activeProject.pauses[activeProject.pauses.length - 1].durationSeconds === 0 &&
                   // It's an open pause if the duration is 0 (we use this as a flag for "ongoing pause" temporarily, 
                   // or better, we check if the timestamp is recent and duration is undefined/0 in a special way. 
                   // Actually, a robust way: we will store a flag or inferred state).
                   // Let's rely on the PauseRecord structure. If we are "Paused", we added a record.
                   // When we resume, we update that record.
                   // For this logic, let's treat "Paused" as: The project is active in UI, but timer is stopped.
                   false; // We will use a derived state below.

  // --- TIMER LOGIC USING SYSTEM DATE ---
  useEffect(() => {
    const updateTimer = () => {
      if (!activeProject) {
        setElapsedSeconds(0);
        return;
      }

      // 1. Calculate Total Time since Start
      const now = Date.now();
      const start = new Date(activeProject.startTime).getTime();
      const diffTotal = Math.floor((now - start) / 1000);

      // 2. Calculate Total Paused Time
      // If the project is currently PAUSED (meaning the last pause entry is "open"),
      // we need to handle that. 
      // Our logic: When we hit "Pause", we save to DB. When we hit "Resume", we calculate duration.
      // So, if we are in a "Paused" state in the UI, we don't increment the timer.
      // If we are "Running", we calculate `now - start - total_closed_pauses`.

      const totalClosedPauses = activeProject.pauses.reduce((acc, p) => acc + p.durationSeconds, 0);
      
      // Determine if currently paused based on our local UI state or if we just loaded it
      // For simplicity: If the UI knows we are running, show live time.
      
      setElapsedSeconds(Math.max(0, diffTotal - totalClosedPauses));
    };

    // If we have an active project, we need to know if it's logically "Running" or "Paused"
    // We can infer this: If the user selected a project, it's generally "Running" 
    // UNLESS we explicitly put it in a pause state in the UI.
    
    // However, to support "Background" tabs, we need to run this interval
    if (activeProject && !showPauseModal) {
      // Immediate update
      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeProject, showPauseModal]);


  const handleStartNew = () => {
    if (!ns.trim()) {
      alert("Por favor, informe o NS do projeto antes de começar.");
      return;
    }

    const newProject: ProjectSession = {
      id: crypto.randomUUID(),
      ns,
      projectCode,
      type,
      implementType,
      startTime: new Date().toISOString(),
      totalActiveSeconds: 0,
      pauses: [],
      status: 'IN_PROGRESS', // Starts in progress immediately
      notes
    };

    onCreate(newProject);
    setActiveProject(newProject);
    
    // Reset form fields
    setNs('');
    setProjectCode('');
    setNotes('');
  };

  const handleResumeExisting = (project: ProjectSession) => {
    // When resuming an existing project from the list:
    // 1. It might have been left "running" (user closed tab).
    // 2. It might have been "paused" (user clicked pause, then closed tab).
    
    // For now, we assume if it's in the list, we are just picking it up.
    // If the user officially "Paused" it before, there is a pause record.
    // If the user just closed the browser, there isn't a pause record, so the timer kept "running" (calculating from start date).
    // This is the desired behavior for "I forgot to close".
    
    // However, if the user wants to officially Resume a project that was Paused:
    // We need to check if the last pause was "closed". 
    // Our logic below ensures that when we click "Pause", we add a record.
    // When we click "Resume" (in the modal), we close it.
    
    // If we are picking up a project that was left "Paused" (via UI modal interaction previously),
    // we need to detect that. But currently, `onUpdate` saves the pause. 
    // Since we don't have an explicit "IS_PAUSED" status in DB (only IN_PROGRESS), 
    // we rely on the flow: 
    // - User clicks Pause -> Modal opens -> User types reason -> Click Confirm -> 
    //   Real logic: We Add a pause record with `timestamp` = NOW. `duration` = 0? 
    //   NO. We need to know when the pause STARTED.
    
    // REVISED PAUSE LOGIC:
    // 1. Click Pause Button: Store `tempPauseStart = Date.now()`. UI shows Modal.
    // 2. Click Confirm Pause: `duration = Date.now() - tempPauseStart`. Add record. Save to DB. Project remains IN_PROGRESS.
    //    Wait, the user said "Pause for more time... return next day".
    //    This means the "Pause" duration is the time between "Clicking Pause" and "Clicking Resume (Next Day)".
    
    // CORRECTED LOGIC FOR PERSISTENT PAUSE:
    // 1. Click "Pausar" -> Adds a Pause Record: { timestamp: NOW, reason: '...', durationSeconds: 0 (placeholder) }. Save DB.
    //    UI: Clears `activeProject`. Project goes back to "Pending List".
    // 2. Click "Retomar" (from list) -> Finds the last pause (duration 0). 
    //    Calculates `pauseDuration = NOW - pause.timestamp`.
    //    Updates the pause record. Saves DB.
    //    Sets `activeProject`.
    
    const lastPause = project.pauses.length > 0 ? project.pauses[project.pauses.length - 1] : null;
    
    // Check if there is an "Open" pause (heuristic: duration is 0 or undefined, assuming we set it so)
    // Actually, let's use a specific flag or just assume if we are resuming from the list, checking if we need to close a pause.
    // But since we didn't implement the "Open Pause" saving yet, let's just set it as active for now.
    
    // To support the "Pause for a day" feature:
    // We need to know if it was paused. 
    // Let's look at the last pause. If we implement the logic below, we can check.
    
    setActiveProject(project);
    // If the project was "Paused" (saved with an open pause), we would handle it here.
    // For simplicity in this version, "Resuming" just brings it back to the active Tracker.
    // If the user had paused it, they would have to hit "Play" in the UI if we kept it loaded.
    // But the user wants to "Exit" the project and come back.
  };

  const handlePauseProject = () => {
    // User wants to pause the project and potentially do something else
    setShowPauseModal(true);
  };

  const confirmPauseAndExit = () => {
    if (!activeProject) return;

    // Create a pause record that marks the START of the pause
    // We will assume that any pause with durationSeconds = -1 is an "Open" pause
    const newPause: PauseRecord = {
      reason: pauseReason || 'Pausa',
      timestamp: new Date().toISOString(),
      durationSeconds: -1 // Flag for "Open/Ongoing" pause
    };

    const updatedProject = {
      ...activeProject,
      pauses: [...activeProject.pauses, newPause]
    };

    onUpdate(updatedProject);
    setActiveProject(null); // Remove from active view
    setShowPauseModal(false);
    setPauseReason('');
  };

  const handleResumeFromList = (project: ProjectSession) => {
    // Check if this project has an open pause (duration = -1)
    const lastPauseIndex = project.pauses.length - 1;
    if (lastPauseIndex >= 0 && project.pauses[lastPauseIndex].durationSeconds === -1) {
       // It was paused! We need to close it.
       const pauseStart = new Date(project.pauses[lastPauseIndex].timestamp).getTime();
       const now = Date.now();
       const duration = Math.floor((now - pauseStart) / 1000);

       const updatedPauses = [...project.pauses];
       updatedPauses[lastPauseIndex] = {
         ...updatedPauses[lastPauseIndex],
         durationSeconds: duration
       };

       const updatedProject = {
         ...project,
         pauses: updatedPauses
       };
       
       onUpdate(updatedProject);
       setActiveProject(updatedProject);
    } else {
       // It wasn't explicitly paused (maybe browser crash or just closed tab without pausing)
       // So the timer just kept running naturally.
       setActiveProject(project);
    }
  };

  const handleFinish = async () => {
    if (!activeProject) return;

    // Calculate final seconds one last time
    const now = Date.now();
    const start = new Date(activeProject.startTime).getTime();
    const totalClosedPauses = activeProject.pauses.reduce((acc, p) => acc + (p.durationSeconds > 0 ? p.durationSeconds : 0), 0);
    const finalSeconds = Math.floor((now - start) / 1000) - totalClosedPauses;

    const finishedProject: ProjectSession = {
      ...activeProject,
      endTime: new Date().toISOString(),
      totalActiveSeconds: finalSeconds,
      status: 'COMPLETED'
    };

    onUpdate(finishedProject);
    
    // Send to Teams (Fire and forget)
    sendTeamsNotification(finishedProject);

    setActiveProject(null);
  };

  const sendTeamsNotification = async (project: ProjectSession) => {
    if (!TEAMS_WEBHOOK_URL || TEAMS_WEBHOOK_URL.includes("YOUR_WEBHOOK_URL_HERE")) return;

    const duration = formatTime(project.totalActiveSeconds);
    
    const message = {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      "themeColor": "0076D7",
      "summary": "Projeto Finalizado",
      "sections": [{
        "activityTitle": "✅ Projeto Finalizado",
        "activitySubtitle": `DesignTrack Pro`,
        "facts": [
          { "name": "NS:", "value": project.ns },
          { "name": "Código:", "value": project.projectCode || "N/A" },
          { "name": "Tipo:", "value": project.type },
          { "name": "Duração:", "value": duration }
        ],
        "markdown": true
      }]
    };

    try {
      await fetch(TEAMS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
    } catch (error) {
      console.error("Erro Teams", error);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* 1. SE NENHUM PROJETO ATIVO: MOSTRAR LISTA DE PENDENTES + FORMULÁRIO DE NOVO */}
      {!activeProject && (
        <div className="space-y-8">
          
          {/* Active / Pending Projects List */}
          {pendingProjects.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
               <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                 <Briefcase className="w-5 h-5 mr-2 text-blue-600" />
                 Projetos em Andamento / Pausados
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {pendingProjects.map(p => {
                    const isPaused = p.pauses.length > 0 && p.pauses[p.pauses.length - 1].durationSeconds === -1;
                    return (
                     <div key={p.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-all bg-gray-50 group">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-bold text-gray-800 text-lg">{p.ns}</div>
                            <div className="text-sm text-gray-500">{p.type} • {p.implementType}</div>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${isPaused ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                             {isPaused ? 'PAUSADO' : 'ABERTO'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mb-4 flex items-center">
                           <Clock className="w-3 h-3 mr-1" />
                           Iniciado em: {new Date(p.startTime).toLocaleDateString()}
                        </div>
                        <button 
                          onClick={() => handleResumeFromList(p)}
                          className="w-full bg-white border border-blue-200 text-blue-600 font-bold py-2 rounded hover:bg-blue-50 transition-colors flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white shadow-sm"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          {isPaused ? 'Retomar Timer' : 'Continuar'}
                        </button>
                     </div>
                   );
                 })}
               </div>
            </div>
          )}

          {/* New Project Form */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
            <h2 className="text-xl font-bold mb-4 flex items-center text-gray-800">
              <Clock className="w-6 h-6 mr-2 text-blue-600" />
              Iniciar Novo Projeto
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NS do Produto</label>
                  <input 
                    type="text" 
                    value={ns}
                    onChange={e => setNs(e.target.value)}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ex: 123456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cód. Projeto</label>
                  <div className="relative">
                    <Hash className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      value={projectCode}
                      onChange={e => setProjectCode(e.target.value)}
                      className="w-full pl-8 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Ex: PRJ-001"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Projeto</label>
                  <select 
                    value={type}
                    onChange={e => setType(e.target.value as ProjectType)}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Implemento</label>
                  <div className="relative">
                    <Truck className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                    <select 
                      value={implementType}
                      onChange={e => setImplementType(e.target.value as ImplementType)}
                      className="w-full pl-8 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {IMPLEMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <button 
                onClick={handleStartNew}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center transition-colors"
              >
                <Play className="w-5 h-5 mr-2" />
                Começar Cronômetro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. SE PROJETO ATIVO: MOSTRAR CRONÔMETRO E CONTROLES */}
      {activeProject && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 relative">
           <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold flex items-center text-gray-800">
                <Clock className="w-6 h-6 mr-2 text-blue-600" />
                Rastreador Ativo
              </h2>
              <div className="text-right">
                 <div className="font-bold text-lg text-gray-700">{activeProject.ns}</div>
                 <div className="text-xs text-gray-500">{activeProject.implementType}</div>
              </div>
           </div>

           <div className="flex flex-col items-center justify-center bg-gray-50 p-8 rounded-xl border border-gray-200 mb-6">
              <span className="text-sm text-gray-500 font-medium tracking-wider uppercase mb-2 flex items-center animate-pulse">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                Executando
              </span>
              <div className="text-7xl font-mono font-bold text-blue-600 tracking-tight">
                {formatTime(elapsedSeconds)}
              </div>
              <div className="mt-4 flex gap-4 text-sm text-gray-500">
                 <span>Início: {new Date(activeProject.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={handlePauseProject}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 rounded-lg flex items-center justify-center transition-colors shadow-sm"
              >
                <Pause className="w-5 h-5 mr-2" />
                Pausar / Trocar Projeto
              </button>

              <button 
                onClick={handleFinish}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg flex items-center justify-center transition-colors shadow-sm"
              >
                <Square className="w-5 h-5 mr-2 fill-current" />
                Finalizar Projeto
              </button>
           </div>
        </div>
      )}

      {/* Pause Modal */}
      {showPauseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold mb-4 flex items-center text-yellow-600">
              <Pause className="w-5 h-5 mr-2" />
              Pausar Projeto
            </h3>
            
            <p className="text-gray-600 text-sm mb-4">
              Isso irá parar o cronômetro e salvar o projeto na lista de "Em Andamento". Você poderá retomá-lo a qualquer momento (hoje ou outro dia).
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo da Pausa</label>
            <input 
              type="text" 
              autoFocus
              value={pauseReason}
              onChange={e => setPauseReason(e.target.value)}
              placeholder="Ex: Almoço, Reunião, Fim do expediente..."
              className="w-full p-3 border rounded-lg mb-6 focus:ring-2 focus:ring-yellow-500 outline-none"
            />
            
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowPauseModal(false)}
                className="text-gray-500 px-4 py-2 rounded-lg font-medium hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmPauseAndExit}
                className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-600"
              >
                Confirmar Pausa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Timer Pop-up (Visible only when tracker is hidden and running) */}
      {!isVisible && activeProject && (
        <div 
          onClick={onNavigateBack}
          className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white p-4 rounded-xl shadow-2xl cursor-pointer hover:bg-slate-800 transition-all transform hover:scale-105 group border border-slate-700 ring-2 ring-blue-500/50"
        >
          <div className="flex items-center justify-between mb-2 gap-4">
            <div className="flex items-center text-green-400 text-xs font-bold uppercase tracking-wider animate-pulse">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              Em Andamento
            </div>
            <Maximize2 className="w-4 h-4 text-gray-400 group-hover:text-white" />
          </div>
          <div className="font-mono text-3xl font-bold mb-1">
            {formatTime(elapsedSeconds)}
          </div>
          <div className="text-xs text-gray-400 mb-1">
            NS: {activeProject.ns}
          </div>
          <div className="text-xs text-blue-400 font-medium mt-2 border-t border-slate-700 pt-2">
            Clique para retornar
          </div>
        </div>
      )}
    </>
  );
};