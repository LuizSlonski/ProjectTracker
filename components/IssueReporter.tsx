
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Upload, X, Image as ImageIcon, Camera } from 'lucide-react';
import { IssueType, IssueRecord } from '../types';
import { ISSUE_TYPES } from '../constants';

const HOURLY_RATES: Partial<Record<IssueType, number>> = {
  [IssueType.ALMOXARIFADO]: 39.51,
  [IssueType.BASCULANTE]: 45.41,
  [IssueType.BASES]: 47.49,
  [IssueType.CARPINTARIA]: 49.69,
  [IssueType.CHAPEACAO]: 36.86,
  [IssueType.CORTE_DOBRA]: 44.51,
  [IssueType.ELETRICA_ABS_EBS]: 46.10,
  [IssueType.MECANICA]: 31.69,
  [IssueType.MECANICA_SOBRE_CHASSI]: 31.69,
  [IssueType.MECANICA_SR]: 31.69,
  [IssueType.MONTAGEM_CAIXA_CARGA]: 44.22,
  [IssueType.MONTAGEM_CHASSI]: 44.22,
  [IssueType.MONTAGEM_LONADO]: 37.46,
  [IssueType.MONTAGEM_TETO]: 44.22,
  [IssueType.OFICINA]: 39.18,
  [IssueType.OPERADOR_EMPILHADEIRA]: 39.31,
  [IssueType.PINTURA]: 36.57,
  [IssueType.PORTAS]: 39.54,
};

interface IssueReporterProps {
  onReport: (issue: IssueRecord) => void;
}

export const IssueReporter: React.FC<IssueReporterProps> = ({ onReport }) => {
  const [ns, setNs] = useState('');
  // Set default to Engenharia or the first item in the list
  const [type, setType] = useState<IssueType>(IssueType.ENGENHARIA);
  const [description, setDescription] = useState('');
  
  // Cost tracking states
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [hourlyRate, setHourlyRate] = useState<number>(HOURLY_RATES[IssueType.ENGENHARIA] || 0);
  const [materialCost, setMaterialCost] = useState<number>(0);
  const [peopleInvolved, setPeopleInvolved] = useState<number>(1);

  const handleTypeChange = (newType: IssueType) => {
    setType(newType);
    if (HOURLY_RATES[newType] !== undefined) {
      setHourlyRate(HOURLY_RATES[newType]!);
    } else {
      setHourlyRate(0); // Reset for manual input if no rate is mapped
    }
  };

  // Photo state
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const calculateTotal = () => {
    const laborCost = (timeSpent / 60) * hourlyRate * peopleInvolved;
    return laborCost + materialCost;
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
        setPhotos(prev => [...prev, ...results]);
        setIsUploading(false);
      });
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ns.trim() || !description.trim()) return;

    const newIssue: IssueRecord = {
      id: crypto.randomUUID(),
      projectNs: ns,
      type,
      description,
      date: new Date().toISOString(),
      timeSpent,
      hourlyRate,
      materialCost,
      peopleInvolved,
      totalCost: calculateTotal(),
      photos
    };

    try {
      await onReport(newIssue);
      setNs('');
      setDescription('');
      setTimeSpent(0);
      setHourlyRate(0);
      setMaterialCost(0);
      setPeopleInvolved(1);
      setPhotos([]);
    } catch (error: any) {
      console.error("Error reporting issue:", error);
      if (error.message?.includes('column') || error.message?.includes('does not exist')) {
          alert('Erro: Colunas ausentes no banco de dados. Por favor, execute o script de atualização SQL no Supabase.');
      } else {
          alert(`Erro ao salvar ocorrência: ${error.message || 'Erro desconhecido'}`);
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
      <h2 className="text-xl font-bold mb-4 flex items-center text-red-600">
        <AlertTriangle className="w-6 h-6 mr-2" />
        Reportar Problema de Qualidade
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Setor / Origem da Falha</label>
            <select 
                value={type}
                onChange={e => handleTypeChange(e.target.value as IssueType)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none bg-white"
            >
                {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            </div>
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

        {/* Image Upload Section */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Evidências (Fotos)</label>
            <div className="flex flex-wrap gap-4 mb-2">
                {photos.map((photo, index) => (
                    <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 group">
                        <img src={photo} alt="Evidência" className="w-full h-full object-cover" />
                        <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
                <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <Camera className="w-6 h-6 text-gray-400" />
                    <span className="text-[10px] text-gray-500 mt-1 text-center leading-tight">Tirar<br/>Foto</span>
                    <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        className="hidden" 
                        onChange={handleFileChange}
                    />
                </label>
                <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-[10px] text-gray-500 mt-1">Galeria</span>
                    <input 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        className="hidden" 
                        onChange={handleFileChange}
                    />
                </label>
            </div>
            {isUploading && <p className="text-xs text-blue-500">Processando imagens...</p>}
        </div>

        {/* Cost Calculation Section */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Custo do Retrabalho</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Tempo Gasto (minutos)</label>
                    <input 
                        type="number" 
                        min="0"
                        value={timeSpent}
                        onChange={e => setTimeSpent(Number(e.target.value))}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                        placeholder="0"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Pessoas Envolvidas</label>
                    <input 
                        type="number" 
                        min="1"
                        value={peopleInvolved}
                        onChange={e => setPeopleInvolved(Number(e.target.value))}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                        placeholder="1"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Custo Hora (R$)</label>
                    <input 
                        type="number" 
                        min="0"
                        step="0.01"
                        value={hourlyRate}
                        onChange={e => setHourlyRate(Number(e.target.value))}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                        placeholder="0.00"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Custo Material (R$)</label>
                    <input 
                        type="number" 
                        min="0"
                        step="0.01"
                        value={materialCost}
                        onChange={e => setMaterialCost(Number(e.target.value))}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                        placeholder="0.00"
                    />
                </div>
            </div>
            <div className="mt-3 flex justify-end items-center border-t border-gray-200 pt-2">
                <span className="text-sm text-gray-500 mr-2">Custo Total Estimado:</span>
                <span className="text-lg font-bold text-red-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateTotal())}
                </span>
            </div>
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
