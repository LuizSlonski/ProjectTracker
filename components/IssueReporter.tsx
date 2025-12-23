import React, { useState } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { IssueType, IssueRecord } from '../types';
import { ISSUE_TYPES } from '../constants';

interface IssueReporterProps {
  onReport: (issue: IssueRecord) => void;
}

export const IssueReporter: React.FC<IssueReporterProps> = ({ onReport }) => {
  const [ns, setNs] = useState('');
  const [type, setType] = useState<IssueType>(IssueType.ASSEMBLY_ERROR);
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ns.trim() || !description.trim()) return;

    const newIssue: IssueRecord = {
      id: crypto.randomUUID(),
      projectNs: ns,
      type,
      description,
      date: new Date().toISOString()
    };

    onReport(newIssue);
    setNs('');
    setDescription('');
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
      <h2 className="text-xl font-bold mb-4 flex items-center text-red-600">
        <AlertTriangle className="w-6 h-6 mr-2" />
        Reportar Problema
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">NS do Produto Afetado</label>
          <input 
            type="text" 
            value={ns}
            onChange={e => setNs(e.target.value)}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
            placeholder="Ex: 123456"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Erro</label>
          <select 
            value={type}
            onChange={e => setType(e.target.value as IssueType)}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
          >
            {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição Detalhada</label>
          <textarea 
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
            placeholder="Descreva o que aconteceu..."
            required
          />
        </div>

        <button 
          type="submit"
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg flex items-center justify-center transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Registrar Problema
        </button>
      </form>
    </div>
  );
};