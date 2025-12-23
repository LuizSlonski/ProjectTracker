import React, { useState, useMemo, useEffect } from 'react';
import { Filter, Calendar, Search, Clock, Hash, User as UserIcon, Truck } from 'lucide-react';
import { AppState, ProjectType, User } from '../types';
import { PROJECT_TYPES } from '../constants';
import { fetchUsers } from '../services/storageService';

interface ProjectHistoryProps {
  data: AppState;
  currentUser: User;
}

export const ProjectHistory: React.FC<ProjectHistoryProps> = ({ data, currentUser }) => {
  const [filterNs, setFilterNs] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      const users = await fetchUsers();
      const map = users.reduce((acc, u) => ({ ...acc, [u.id]: u.name }), {} as Record<string, string>);
      setUsersMap(map);
    };
    load();
  }, []);

  const filteredProjects = useMemo(() => {
    return data.projects.filter(p => {
      const matchNs = p.ns.toLowerCase().includes(filterNs.toLowerCase());
      const matchType = filterType ? p.type === filterType : true;
      
      let matchDate = true;
      if (startDate || endDate) {
        const pDate = new Date(p.startTime).getTime();
        const start = startDate ? new Date(startDate).getTime() : 0;
        // End of the selected day
        const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
        matchDate = pDate >= start && pDate <= end;
      }

      return matchNs && matchType && matchDate;
    }).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [data.projects, filterNs, filterType, startDate, endDate]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const formatPauseDuration = (seconds: number) => {
     if (seconds < 60) return `${seconds}s`;
     const m = Math.floor(seconds / 60);
     return `${m}m`;
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isGestor = currentUser.role === 'GESTOR';

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center mb-4 text-gray-700 font-bold">
          <Filter className="w-5 h-5 mr-2 text-blue-600" />
          Filtros de Busca
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por NS..."
              value={filterNs}
              onChange={(e) => setFilterNs(e.target.value)}
              className="w-full pl-10 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Todos os Tipos</option>
            {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">De:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Até:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
              <tr>
                <th className="p-4">Status</th>
                {isGestor && <th className="p-4">Projetista</th>}
                <th className="p-4">NS</th>
                <th className="p-4">Código</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Implemento</th>
                <th className="p-4">Início</th>
                <th className="p-4">Fim</th>
                <th className="p-4">Duração Total</th>
                <th className="p-4">Motivos de Pausa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProjects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      project.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {project.status === 'COMPLETED' ? 'Concluído' : 'Em Andamento'}
                    </span>
                  </td>
                  {isGestor && (
                    <td className="p-4">
                      <div className="flex items-center text-gray-700 font-medium">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs mr-2">
                          <UserIcon className="w-3 h-3" />
                        </div>
                        {usersMap[project.userId || ''] || 'Desconhecido'}
                      </div>
                    </td>
                  )}
                  <td className="p-4 font-mono font-bold text-gray-800">{project.ns}</td>
                  <td className="p-4 text-gray-600 flex items-center">
                     {project.projectCode ? (
                       <>
                         <Hash className="w-3 h-3 mr-1 text-gray-400" />
                         {project.projectCode}
                       </>
                     ) : '-'}
                  </td>
                  <td className="p-4">
                     <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                      project.type === 'Variação' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' :
                      project.type === 'Liberação' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                      'bg-amber-50 border-amber-100 text-amber-700'
                    }`}>
                      {project.type}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600">
                    <div className="flex items-center">
                      <Truck className="w-3 h-3 mr-1 text-gray-400" />
                      {project.implementType || '-'}
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">{formatDate(project.startTime)}</td>
                  <td className="p-4 text-gray-600">{project.endTime ? formatDate(project.endTime) : '-'}</td>
                  <td className="p-4 font-medium text-gray-800 flex items-center">
                    <Clock className="w-4 h-4 mr-1 text-gray-400" />
                    {formatDuration(project.totalActiveSeconds)}
                  </td>
                  <td className="p-4 text-gray-500">
                    {project.pauses.length > 0 ? (
                      <div className="flex flex-col gap-1 max-w-[200px]">
                        {project.pauses.map((p, idx) => (
                           <div key={idx} className="text-xs bg-yellow-50 text-yellow-800 px-2 py-1 rounded border border-yellow-100 flex justify-between items-center">
                             <span className="truncate mr-2" title={p.reason}>{p.reason}</span>
                             <span className="font-mono text-yellow-600/70">{formatPauseDuration(p.durationSeconds)}</span>
                           </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={isGestor ? 10 : 9} className="p-12 text-center text-gray-400">
                    Nenhum projeto encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};