import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Clock, AlertCircle, Timer, Hash, Truck, Maximize2 } from 'lucide-react';
import { ProjectType, ProjectSession, PauseRecord, ImplementType } from '../types';
import { PROJECT_TYPES, IMPLEMENT_TYPES } from '../constants';

// SUBSTITUA ISSO PELA SUA URL DO WEBHOOK DO TEAMS
// (Crie um no Teams: Canal -> Conectores -> Incoming Webhook)
const TEAMS_WEBHOOK_URL = "https://outlook.office.com/webhook/YOUR_WEBHOOK_URL_HERE";

interface ProjectTrackerProps {
  onSave: (project: ProjectSession) => void;
  isVisible: boolean;
  onNavigateBack: () => void;
}

export const ProjectTracker: React.FC<ProjectTrackerProps> = ({ onSave, isVisible, onNavigateBack }) => {
  const [status, setStatus] = useState<'IDLE' | 'RUNNING' | 'PAUSED'>('IDLE');
  
  // Form Data
  const [ns, setNs] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [type, setType] = useState<ProjectType>(ProjectType.RELEASE);
  const [implementType, setImplementType] = useState<ImplementType>(ImplementType.BASE);
  const [notes, setNotes] = useState('');

  // Timer Data
  const [startTime, setStartTime] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pauses, setPauses] = useState<PauseRecord[]>([]);

  // Pause Logic
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [tempPauseTime, setTempPauseTime] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === 'RUNNING') {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const handleStart = () => {
    if (!ns.trim()) {
      alert("Por favor, informe o NS do projeto antes de começar.");
      return;
    }
    setStartTime(new Date().toISOString());
    setStatus('RUNNING');
  };

  const initiatePause = () => {
    setStatus('PAUSED');
    setTempPauseTime(Date.now());
    // Immediate pause, no modal
  };

  const handleResume = () => {
    if (!pauseReason.trim()) return;

    const now = Date.now();
    const duration = tempPauseTime ? Math.floor((now - tempPauseTime) / 1000) : 0;
    
    setPauses(prev => [...prev, {
      reason: pauseReason,
      timestamp: new Date(tempPauseTime || now).toISOString(),
      durationSeconds: duration
    }]);

    setPauseReason('');
    setTempPauseTime(null);
    setShowPauseModal(false);
    setStatus('RUNNING');
  };

  const sendTeamsNotification = async (project: ProjectSession) => {
    // Basic validation to avoid sending if URL isn't set (or is the placeholder)
    if (!TEAMS_WEBHOOK_URL || TEAMS_WEBHOOK_URL.includes("YOUR_WEBHOOK_URL_HERE")) {
      console.warn("Teams Webhook URL not configured in code.");
      return;
    }

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
          { "name": "Implemento:", "value": project.implementType || "N/A" },
          { "name": "Duração:", "value": duration },
          { "name": "Pausas:", "value": `${project.pauses.length}` }
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
      console.log("Notificação enviada para o Teams");
    } catch (error) {
      console.error("Erro ao enviar notificação para Teams (provável erro de CORS ou URL inválida):", error);
    }
  };

  const handleFinish = async () => {
    if (!startTime) return;

    const newProject: ProjectSession = {
      id: crypto.randomUUID(),
      ns,
      projectCode,
      type,
      implementType,
      startTime,
      endTime: new Date().toISOString(),
      totalActiveSeconds: elapsedSeconds,
      pauses,
      status: 'COMPLETED',
      notes
    };

    // Save locally
    onSave(newProject);
    
    // Send to Teams (Fire and forget, don't await blocking UI)
    sendTeamsNotification(newProject);

    resetForm();
  };

  const resetForm = () => {
    setStatus('IDLE');
    setNs('');
    setProjectCode('');
    setNotes('');
    setElapsedSeconds(0);
    setStartTime(null);
    setPauses([]);
    setPauseReason('');
    setShowPauseModal(false);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 relative">
        <h2 className="text-xl font-bold mb-4 flex items-center text-gray-800">
          <Clock className="w-6 h-6 mr-2 text-blue-600" />
          Rastreador de Liberação
        </h2>

        {status === 'IDLE' ? (
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
              onClick={handleStart}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center transition-colors"
            >
              <Play className="w-5 h-5 mr-2" />
              Começar Projeto
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center bg-gray-50 p-6 rounded-xl border border-gray-200">
              <span className="text-sm text-gray-500 font-medium tracking-wider uppercase mb-1">{status === 'PAUSED' ? 'PROJETO PAUSADO' : 'EM ANDAMENTO'}</span>
              <div className={`text-6xl font-mono font-bold ${status === 'PAUSED' ? 'text-yellow-600' : 'text-blue-600'}`}>
                {formatTime(elapsedSeconds)}
              </div>
              <div className="text-gray-600 mt-2 font-medium flex gap-2 flex-wrap justify-center">
                <span>NS: {ns}</span>
                {projectCode && <span className="text-gray-400">• Cód: {projectCode}</span>}
                <span className="text-gray-400">• {type}</span>
                <span className="text-gray-400">• {implementType}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {status === 'RUNNING' && (
                <button 
                  onClick={initiatePause}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 rounded-lg flex items-center justify-center transition-colors"
                >
                  <Pause className="w-5 h-5 mr-2" />
                  Pausar
                </button>
              )}

              {status === 'PAUSED' && (
                <button 
                onClick={() => setShowPauseModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg flex items-center justify-center transition-colors"
              >
                <Play className="w-5 h-5 mr-2" />
                Retomar
              </button>
              )}

              <button 
                onClick={handleFinish}
                disabled={status === 'PAUSED'}
                className={`font-bold py-3 rounded-lg flex items-center justify-center transition-colors text-white ${status === 'PAUSED' ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
              >
                <Square className="w-5 h-5 mr-2 fill-current" />
                Finalizar
              </button>
            </div>
          </div>
        )}

        {/* Resume Modal */}
        {showPauseModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
              <h3 className="text-lg font-bold mb-4 flex items-center text-blue-600">
                <Play className="w-5 h-5 mr-2" />
                Retomar Projeto
              </h3>
              
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4 flex items-center justify-between">
                <div className="flex items-center text-blue-800">
                  <Timer className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">Tempo Trabalhado:</span>
                </div>
                <span className="text-xl font-mono font-bold text-blue-700">
                  {formatTime(elapsedSeconds)}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-2">Informe o motivo da pausa para continuar:</p>
              <input 
                type="text" 
                autoFocus
                value={pauseReason}
                onChange={e => setPauseReason(e.target.value)}
                placeholder="Ex: Ir a fabrica, Reunião, Almoço..."
                className="w-full p-3 border rounded-lg mb-6 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              
              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => setShowPauseModal(false)}
                  className="text-gray-500 px-4 py-2 rounded-lg font-medium hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleResume}
                  disabled={!pauseReason.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  Salvar e Retomar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Timer Pop-up (Visible only when tracker is hidden and running) */}
      {!isVisible && status === 'RUNNING' && (
        <div 
          onClick={onNavigateBack}
          className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white p-4 rounded-xl shadow-2xl cursor-pointer hover:bg-gray-800 transition-all transform hover:scale-105 group border border-gray-700"
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
          <div className="text-xs text-gray-400">
            NS: {ns} • {implementType}
          </div>
        </div>
      )}
    </>
  );
};