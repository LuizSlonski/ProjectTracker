import React, { useState, useMemo, useEffect } from 'react';
import { Lightbulb, Plus, TrendingDown, TrendingUp, DollarSign, Calendar, User as UserIcon, Check, X, PlayCircle } from 'lucide-react';
import { InnovationType, InnovationRecord, User, AppState } from '../types';
import { fetchUsers } from '../services/storageService';

interface InnovationManagerProps {
  innovations: InnovationRecord[];
  onAdd: (innovation: InnovationRecord) => void;
  onStatusChange: (id: string, status: string) => void;
  currentUser: User;
}

export const InnovationManager: React.FC<InnovationManagerProps> = ({ innovations, onAdd, onStatusChange, currentUser }) => {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<InnovationType>(InnovationType.PRODUCT_IMPROVEMENT);
  const [currentCost, setCurrentCost] = useState<string>('');
  const [projectedCost, setProjectedCost] = useState<string>('');
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      const users = await fetchUsers();
      const map = users.reduce((acc, u) => ({ ...acc, [u.id]: u.name }), {} as Record<string, string>);
      setUsersMap(map);
    };
    load();
  }, []);

  // Sort innovations by date descending
  const sortedInnovations = useMemo(() => {
    return [...innovations].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [innovations]);

  // Calculate totals
  const totalSavings = useMemo(() => {
    return innovations.reduce((acc, curr) => {
      // If difference is positive, it's a saving
      // Consider counting only APPROVED or IMPLEMENTED? For now, all.
      if (curr.costDifference > 0) return acc + curr.costDifference;
      return acc;
    }, 0);
  }, [innovations]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const curr = parseFloat(currentCost) || 0;
    const proj = parseFloat(projectedCost) || 0;
    
    // Logic: If Improvement: Savings = Current - Projected
    // Logic: If New Project: "Difference" might represent margin or saving vs competitor, 
    // but here we simply assume User inputs "Current" as baseline/0 if it's completely new.
    const difference = curr - proj;

    const newRecord: InnovationRecord = {
      id: crypto.randomUUID(),
      title,
      description,
      type,
      currentCost: curr,
      projectedCost: proj,
      costDifference: difference,
      status: 'PENDING',
      authorId: currentUser.id,
      createdAt: new Date().toISOString()
    };

    onAdd(newRecord);
    
    // Reset form
    setTitle('');
    setDescription('');
    setCurrentCost('');
    setProjectedCost('');
    setShowForm(false);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'APPROVED': return 'bg-blue-100 text-blue-700';
          case 'IMPLEMENTED': return 'bg-green-100 text-green-700';
          case 'REJECTED': return 'bg-red-100 text-red-700';
          default: return 'bg-gray-100 text-gray-700';
      }
  }

  const getStatusLabel = (status: string) => {
      switch(status) {
          case 'APPROVED': return 'Aprovado';
          case 'IMPLEMENTED': return 'Implementado';
          case 'REJECTED': return 'Rejeitado';
          default: return 'Pendente';
      }
  }

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Lightbulb className="w-6 h-6 mr-2 text-yellow-500" />
            Inovações e Custos
          </h2>
          <p className="text-gray-500 mt-1">Gerencie novas ideias e reduções de custo.</p>
        </div>
        
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-lg">
          <div className="text-emerald-100 text-sm font-medium mb-1 uppercase tracking-wider">Economia Total Projetada</div>
          <div className="text-4xl font-bold font-mono">{formatCurrency(totalSavings)}</div>
          <div className="text-emerald-100 text-xs mt-2 flex items-center">
            <TrendingDown className="w-4 h-4 mr-1" />
            Baseado em melhorias cadastradas
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-end">
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nova Ideia / Melhoria
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="font-bold text-lg mb-4 text-gray-700">Registrar Inovação</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Título do Projeto</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Novo sistema de fixação..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select 
                  value={type}
                  onChange={e => setType(e.target.value as InnovationType)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value={InnovationType.PRODUCT_IMPROVEMENT}>Melhoria de Produto</option>
                  <option value={InnovationType.NEW_PROJECT}>Novo Projeto</option>
                </select>
              </div>

              <div>
                {/* Spacer or additional field */}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custo Atual (R$)</label>
                <div className="relative">
                   <DollarSign className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                   <input 
                    type="number" 
                    step="0.01"
                    value={currentCost}
                    onChange={e => setCurrentCost(e.target.value)}
                    className="w-full pl-8 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Deixe 0 se for projeto totalmente novo.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custo Projetado (R$)</label>
                 <div className="relative">
                   <DollarSign className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                   <input 
                    type="number" 
                    step="0.01"
                    value={projectedCost}
                    onChange={e => setProjectedCost(e.target.value)}
                    className="w-full pl-8 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição / Detalhes</label>
                <textarea 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Descreva as mudanças e o impacto esperado..."
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
               <button 
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                >
                  Salvar
                </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
            <tr>
              <th className="p-4">Projeto / Inovação</th>
              <th className="p-4">Tipo</th>
              <th className="p-4">Status</th>
              <th className="p-4">Novo Custo</th>
              <th className="p-4 text-right">Impacto</th>
              {currentUser.role === 'GESTOR' && <th className="p-4 text-right">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedInnovations.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4">
                  <div className="font-bold text-gray-800">{inv.title}</div>
                  <div className="text-xs text-gray-500 mt-1 line-clamp-1">{inv.description}</div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <span className="flex items-center"><Calendar className="w-3 h-3 mr-1"/> {new Date(inv.createdAt).toLocaleDateString()}</span>
                    {inv.authorId && (
                      <span className="flex items-center"><UserIcon className="w-3 h-3 mr-1"/> {usersMap[inv.authorId] || '...'}</span>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    inv.type === InnovationType.NEW_PROJECT 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-blue-100 text-blue-700'
                  }`}>
                    {inv.type}
                  </span>
                </td>
                <td className="p-4">
                   <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${getStatusColor(inv.status)}`}>
                       {getStatusLabel(inv.status)}
                   </span>
                </td>
                <td className="p-4 font-medium text-gray-700">
                  {formatCurrency(inv.projectedCost)}
                </td>
                <td className="p-4 text-right">
                  <div className={`flex items-center justify-end font-bold ${
                    inv.costDifference > 0 ? 'text-green-600' : 
                    inv.costDifference < 0 ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {inv.costDifference > 0 ? (
                      <>
                        <TrendingDown className="w-4 h-4 mr-1" />
                        {formatCurrency(inv.costDifference)}
                      </>
                    ) : inv.costDifference < 0 ? (
                      <>
                        <TrendingUp className="w-4 h-4 mr-1" />
                        {formatCurrency(Math.abs(inv.costDifference))}
                      </>
                    ) : (
                      <span>-</span>
                    )}
                  </div>
                </td>
                {currentUser.role === 'GESTOR' && (
                    <td className="p-4 text-right">
                        {inv.status === 'PENDING' && (
                            <div className="flex justify-end gap-1">
                                <button 
                                    onClick={() => onStatusChange(inv.id, 'APPROVED')}
                                    title="Aprovar"
                                    className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100 transition"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => onStatusChange(inv.id, 'REJECTED')}
                                    title="Rejeitar"
                                    className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        {inv.status === 'APPROVED' && (
                             <button 
                                onClick={() => onStatusChange(inv.id, 'IMPLEMENTED')}
                                className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition flex items-center ml-auto"
                            >
                                <PlayCircle className="w-3 h-3 mr-1" />
                                Implementar
                            </button>
                        )}
                    </td>
                )}
              </tr>
            ))}
            {sortedInnovations.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  Nenhuma inovação registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};