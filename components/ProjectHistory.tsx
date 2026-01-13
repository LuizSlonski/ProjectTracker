
import React, { useState, useMemo, useEffect } from 'react';
import { Filter, Calendar, Search, Clock, Hash, User as UserIcon, Truck, Trash2, Layers, Box, Eye, X, FileCheck, FileX } from 'lucide-react';
import { AppState, ProjectType, User, VariationRecord, ProjectSession } from '../types';
import { PROJECT_TYPES } from '../constants';
import { fetchUsers } from '../services/storageService';

interface ProjectHistoryProps {
  data: AppState;
  currentUser: User;
  onDelete?: (id: string) => void;
}

export const ProjectHistory: React.FC<ProjectHistoryProps> = ({ data, currentUser, onDelete }) => {
  const [filterNs, setFilterNs] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});

  // State for the Variations Modal
  const [selectedProject, setSelectedProject] = useState<ProjectSession | null>(null);

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

  const getVariationCounts = (variations: VariationRecord[]) => {
      if (!variations) return { parts: 0, assemblies: 0 };
      const parts = variations.filter(v => v.type === 'Peça').length;
      const assemblies = variations.filter(v => v.type === 'Montagem').length;
      return { parts, assemblies };
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
                <th className="p-4">Projetista</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">NS / Cód.</th>
                <th className="p-4">Variações (Total)</th>
                <th className="p-4">Tipo / Impl.</th>
                <th className="p-4">Início / Fim</th>
                <th className="p-4">Duração</th>
                {isGestor && <th className="p-4 text-center">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProjects.map((project) => {
                const { parts, assemblies } = getVariationCounts(project.variations);
                const totalVariations = (project.variations || []).length;
                
                return (
                <tr key={project.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      project.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {project.status === 'COMPLETED' ? 'Concluído' : 'Em And.'}
                    </span>
                  </td>
                  
                  {/* Projetista */}
                  <td className="p-4">
                    <div className="flex items-center text-gray-700 font-medium">
                        <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs mr-2 font-bold border border-blue-100">
                        {(usersMap[project.userId || ''] || '?').charAt(0)}
                        </div>
                        <span className="truncate max-w-[120px]" title={usersMap[project.userId || '']}>
                            {usersMap[project.userId || ''] || 'Desconhecido'}
                        </span>
                    </div>
                  </td>

                  {/* Cliente */}
                  <td className="p-4 text-gray-600 font-medium truncate max-w-[150px]" title={project.clientName}>
                    {project.clientName || '-'}
                  </td>

                  {/* NS e Código */}
                  <td className="p-4">
                     <div className="font-mono font-bold text-gray-800">{project.ns}</div>
                     {project.projectCode && (
                         <div className="text-xs text-blue-600 font-mono mt-0.5">{project.projectCode}</div>
                     )}
                  </td>

                  {/* Variações Count Simplificado + Botão */}
                  <td className="p-4">
                    {totalVariations === 0 ? (
                        <span className="text-gray-400 text-xs">-</span>
                    ) : (
                        <div>
                            <div className="text-sm font-bold text-gray-800 flex items-center">
                                {totalVariations} <span className="text-xs font-normal text-gray-500 ml-1">Cód. Criados</span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                                <div className="text-[10px] text-gray-500 flex items-center gap-2">
                                    <span className={parts > 0 ? "text-blue-600 font-medium" : ""}>{parts} Pç</span>
                                    <span className="text-gray-300">|</span>
                                    <span className={assemblies > 0 ? "text-orange-600 font-medium" : ""}>{assemblies} Mont</span>
                                </div>
                                <button 
                                    onClick={() => setSelectedProject(project)}
                                    className="ml-2 p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Ver lista de variações"
                                >
                                    <Eye className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                  </td>

                  {/* Tipo e Implemento */}
                  <td className="p-4">
                     <div className="text-xs font-bold text-gray-700">{project.type}</div>
                     <div className="flex items-center text-xs text-gray-500 mt-1">
                      <Truck className="w-3 h-3 mr-1" />
                      {project.implementType || '-'}
                    </div>
                  </td>

                  {/* Datas */}
                  <td className="p-4 text-xs text-gray-500">
                      <div><span className="font-semibold">I:</span> {formatDate(project.startTime)}</div>
                      {project.endTime && <div><span className="font-semibold">F:</span> {formatDate(project.endTime)}</div>}
                  </td>

                  <td className="p-4 font-medium text-gray-800">
                    <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1 text-gray-400" />
                        {formatDuration(project.totalActiveSeconds)}
                    </div>
                  </td>

                  {isGestor && (
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => onDelete && onDelete(project.id)}
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition"
                        title="Excluir Projeto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              )})}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-gray-400">
                    Nenhum projeto encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Variations Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Detalhes das Variações</h3>
                        <p className="text-sm text-gray-500">NS: <span className="font-mono font-bold text-gray-700">{selectedProject.ns}</span> • Cliente: {selectedProject.clientName || 'N/A'}</p>
                    </div>
                    <button 
                        onClick={() => setSelectedProject(null)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="p-0 overflow-y-auto flex-1">
                    <table className="w-full text-sm text-left">
                         <thead className="bg-white text-gray-600 font-semibold border-b border-gray-200 sticky top-0 shadow-sm">
                             <tr>
                                 <th className="p-4">Código Antigo</th>
                                 <th className="p-4">Descrição</th>
                                 <th className="p-4">Código Novo</th>
                                 <th className="p-4">Tipo</th>
                                 <th className="p-4 text-center">Arquivos</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                             {selectedProject.variations.map((v) => (
                                 <tr key={v.id} className="hover:bg-gray-50">
                                     <td className="p-4 font-mono text-gray-500">{v.oldCode || '-'}</td>
                                     <td className="p-4 text-gray-800 font-medium">{v.description}</td>
                                     <td className="p-4 font-mono text-blue-600 font-bold">{v.newCode || '-'}</td>
                                     <td className="p-4">
                                         <span className={`px-2 py-0.5 rounded text-xs ${v.type === 'Montagem' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-700'}`}>
                                             {v.type}
                                         </span>
                                     </td>
                                     <td className="p-4 text-center">
                                        {v.filesGenerated ? (
                                            <span className="inline-flex items-center text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100">
                                                <FileCheck className="w-3 h-3 mr-1" /> OK
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center text-xs font-bold text-red-400 bg-red-50 px-2 py-1 rounded border border-red-100">
                                                <FileX className="w-3 h-3 mr-1" /> Pendente
                                            </span>
                                        )}
                                     </td>
                                 </tr>
                             ))}
                             {selectedProject.variations.length === 0 && (
                                 <tr>
                                     <td colSpan={5} className="p-8 text-center text-gray-400 italic">
                                         Nenhuma variação registrada neste projeto.
                                     </td>
                                 </tr>
                             )}
                         </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 text-right">
                    <button 
                        onClick={() => setSelectedProject(null)}
                        className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
