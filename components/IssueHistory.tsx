
import React, { useState, useMemo, useEffect } from 'react';
import { Search, AlertTriangle, Calendar, User as UserIcon, Trash2, X, Edit2, Save, Upload, ImageIcon } from 'lucide-react';
import { AppState, IssueType, User, IssueRecord } from '../types';
import { ISSUE_TYPES } from '../constants';
import { fetchUsers, updateIssue } from '../services/storageService';

interface IssueHistoryProps {
  data: AppState;
  currentUser: User;
  onDelete?: (id: string) => void;
  onUpdate?: () => void; // Callback to refresh data after update
}

export const IssueHistory: React.FC<IssueHistoryProps> = ({ data, currentUser, onDelete, onUpdate }) => {
  const [filterNs, setFilterNs] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Edit State
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<IssueRecord>>({});
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const users = await fetchUsers();
      const map = users.reduce((acc, u) => ({ ...acc, [u.id]: u.name }), {} as Record<string, string>);
      setUsersMap(map);
    };
    load();
  }, []);

  const filteredIssues = useMemo(() => {
    return data.issues.filter(issue => {
      const matchNs = issue.projectNs.toLowerCase().includes(filterNs.toLowerCase());
      const matchType = filterType ? issue.type === filterType : true;
      
      let matchDate = true;
      if (startDate || endDate) {
        const iDate = new Date(issue.date).getTime();
        const start = startDate ? new Date(startDate).getTime() : 0;
        const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
        matchDate = iDate >= start && iDate <= end;
      }

      return matchNs && matchType && matchDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.issues, filterNs, filterType, startDate, endDate]);

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isGestor = currentUser.role === 'GESTOR' || currentUser.role === 'GESTOR_QUALIDADE';

  // Edit Handlers
  const startEditing = (issue: IssueRecord) => {
    setEditingIssueId(issue.id);
    setEditForm({ ...issue });
  };

  const cancelEditing = () => {
    setEditingIssueId(null);
    setEditForm({});
  };

  const handleEditChange = (field: keyof IssueRecord, value: any) => {
    setEditForm(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate total cost if relevant fields change
      if (['timeSpent', 'hourlyRate', 'materialCost', 'peopleInvolved'].includes(field)) {
        const time = Number(updated.timeSpent || 0);
        const rate = Number(updated.hourlyRate || 0);
        const material = Number(updated.materialCost || 0);
        const people = Number(updated.peopleInvolved || 1);
        
        updated.totalCost = ((time / 60) * rate * people) + material;
      }
      
      return updated;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      const files = Array.from(e.target.files);
      
      const readers = files.map((file: any) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readers).then(results => {
        setEditForm(prev => ({
          ...prev,
          photos: [...(prev.photos || []), ...results]
        }));
        setIsUploading(false);
      });
    }
  };

  const removePhoto = (index: number) => {
    setEditForm(prev => ({
      ...prev,
      photos: (prev.photos || []).filter((_, i) => i !== index)
    }));
  };

  const [isSaving, setIsSaving] = useState(false);

  const saveEdit = async () => {
    if (!editForm.id || !editForm.projectNs || !editForm.description) return;
    
    setIsSaving(true);
    try {
      await updateIssue(editForm as IssueRecord);
      setEditingIssueId(null);
      setEditForm({});
      if (onUpdate) onUpdate();
    } catch (error: any) {
      console.error("Error updating issue:", error);
      if (error.message?.includes('column') || error.message?.includes('does not exist')) {
          alert('Erro: Colunas ausentes no banco de dados. Por favor, execute o script de atualização SQL no Supabase.');
      } else {
          alert(`Erro ao atualizar ocorrência: ${error.message || 'Erro desconhecido'}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar erro por NS..."
              value={filterNs}
              onChange={(e) => setFilterNs(e.target.value)}
              className="w-full pl-10 p-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
          >
            <option value="">Todos os Tipos de Erro</option>
            {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        
        <div className="flex items-center gap-4 justify-end border-t pt-4">
            <span className="text-sm font-medium text-gray-600 flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Filtrar por Data:
            </span>
            <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">De:</span>
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="p-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
                />
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Até:</span>
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="p-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
                />
            </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {filteredIssues.length > 0 ? (
          filteredIssues.map((issue) => (
            <div key={issue.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative group">
              
              {/* Actions */}
              {isGestor && editingIssueId !== issue.id && (
                <div className="absolute top-4 right-4 flex gap-2">
                  <button 
                    onClick={() => startEditing(issue)}
                    className="text-gray-300 hover:text-blue-500 hover:bg-blue-50 p-2 rounded transition"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onDelete && onDelete(issue.id)}
                    className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded transition"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {editingIssueId === issue.id ? (
                // EDIT MODE
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Editar Ocorrência</h3>
                    <button onClick={cancelEditing} className="text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">NS do Projeto</label>
                      <input
                        type="text"
                        value={editForm.projectNs || ''}
                        onChange={(e) => handleEditChange('projectNs', e.target.value)}
                        className="w-full p-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Erro</label>
                      <select
                        value={editForm.type || ''}
                        onChange={(e) => handleEditChange('type', e.target.value)}
                        className="w-full p-2 border rounded-lg text-sm"
                      >
                        {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Descrição</label>
                      <textarea
                        value={editForm.description || ''}
                        onChange={(e) => handleEditChange('description', e.target.value)}
                        className="w-full p-2 border rounded-lg text-sm h-24"
                      />
                    </div>
                    
                    {/* Cost Fields */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Tempo Gasto (min)</label>
                      <input
                        type="number"
                        value={editForm.timeSpent || 0}
                        onChange={(e) => handleEditChange('timeSpent', Number(e.target.value))}
                        className="w-full p-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Custo Hora (R$)</label>
                      <input
                        type="number"
                        value={editForm.hourlyRate || 0}
                        onChange={(e) => handleEditChange('hourlyRate', Number(e.target.value))}
                        className="w-full p-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Pessoas Envolvidas</label>
                      <input
                        type="number"
                        value={editForm.peopleInvolved || 1}
                        onChange={(e) => handleEditChange('peopleInvolved', Number(e.target.value))}
                        className="w-full p-2 border rounded-lg text-sm"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Custo Material (R$)</label>
                      <input
                        type="number"
                        value={editForm.materialCost || 0}
                        onChange={(e) => handleEditChange('materialCost', Number(e.target.value))}
                        className="w-full p-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div className="col-span-2 bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">Custo Total Calculado:</span>
                        <span className="text-lg font-bold text-red-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(editForm.totalCost || 0)}
                        </span>
                    </div>

                    {/* Photos Upload */}
                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-2">Evidências (Fotos)</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {editForm.photos?.map((photo, idx) => (
                                <div key={idx} className="relative group">
                                    <img src={photo} alt="preview" className="w-16 h-16 object-cover rounded-lg border" />
                                    <button
                                        type="button"
                                        onClick={() => removePhoto(idx)}
                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            <label className="w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                                <Upload className="w-5 h-5 text-gray-400" />
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    multiple 
                                    className="hidden" 
                                    onChange={handleFileChange}
                                    disabled={isUploading}
                                />
                            </label>
                        </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={cancelEditing}
                      className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={isSaving}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Salvar Alterações
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                // VIEW MODE
                <>
                  <div className="flex justify-between items-start mb-2 pr-16">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold bg-red-50 text-red-700 border border-red-100`}>
                        {issue.type}
                      </span>
                      <span className="font-mono font-bold text-gray-800">NS: {issue.projectNs}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center text-xs text-gray-400">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(issue.date)}
                      </div>
                      {isGestor && issue.reportedBy && (
                        <div className="flex items-center text-xs text-gray-500 font-medium">
                          <UserIcon className="w-3 h-3 mr-1" />
                          Reportado por: {usersMap[issue.reportedBy] || 'Desconhecido'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">O que aconteceu:</h4>
                    <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                      {issue.description}
                    </p>
                  </div>
                  
                  {/* Cost Details */}
                  {(issue.totalCost > 0 || issue.timeSpent > 0 || issue.materialCost > 0 || (issue.peopleInvolved && issue.peopleInvolved > 1)) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-4 text-xs">
                        <div className="flex flex-col">
                            <span className="text-gray-400">Tempo Gasto</span>
                            <span className="font-semibold text-gray-700">{issue.timeSpent || 0} min</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-gray-400">Pessoas</span>
                            <span className="font-semibold text-gray-700">{issue.peopleInvolved || 1}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-gray-400">Custo Material</span>
                            <span className="font-semibold text-gray-700">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(issue.materialCost || 0)}
                            </span>
                        </div>
                        <div className="flex flex-col ml-auto text-right">
                            <span className="text-gray-400">Custo Total</span>
                            <span className="font-bold text-red-600 text-sm">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(issue.totalCost || 0)}
                            </span>
                        </div>
                    </div>
                  )}

                  {/* Photos */}
                  {issue.photos && issue.photos.length > 0 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                      {issue.photos.map((photo, idx) => (
                        <img 
                          key={idx} 
                          src={photo} 
                          alt={`Evidência ${idx + 1}`} 
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedImage(photo)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
            <AlertTriangle className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">Nenhum problema encontrado com os filtros atuais.</p>
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setSelectedImage(null)}
        >
            <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
                <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2"
                >
                    <X className="w-8 h-8" />
                </button>
                <img 
                    src={selectedImage} 
                    alt="Evidência Ampliada" 
                    className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                    onClick={(e) => e.stopPropagation()} 
                />
            </div>
        </div>
      )}
    </div>
  );
};
