
import React, { useState } from 'react';
import { AlertTriangle, Plus, X, Camera, Users, Clock, DollarSign, Package } from 'lucide-react';
import { IssueType, IssueRecord } from '../types';
import { ISSUE_TYPES } from '../constants';
import { uploadPhoto } from '../services/storageService';

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

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label style={{
    display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem',
  }}>{children}</label>
);

const NumberInput = ({ label, icon: Icon, value, onChange, min = 0, step = 1, placeholder = '0' }: {
  label: string; icon: any; value: number; onChange: (v: number) => void;
  min?: number; step?: number; placeholder?: string;
}) => (
  <div>
    <FieldLabel>{label}</FieldLabel>
    <div style={{ position: 'relative' }}>
      <Icon style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '0.875rem', height: '0.875rem', color: '#475569', pointerEvents: 'none' }} />
      <input
        type="number" min={min} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        placeholder={placeholder}
        className="dark-input"
        style={{ width: '100%', boxSizing: 'border-box', paddingLeft: '2.25rem', paddingRight: '0.75rem', paddingTop: '0.6rem', paddingBottom: '0.6rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontFamily: "'DM Mono', monospace" }}
      />
    </div>
  </div>
);

export const IssueReporter: React.FC<IssueReporterProps> = ({ onReport }) => {
  const [ns, setNs] = useState('');
  const [type, setType] = useState<IssueType>(IssueType.ENGENHARIA);
  const [description, setDescription] = useState('');
  const [timeSpent, setTimeSpent] = useState(0);
  const [hourlyRate, setHourlyRate] = useState<number>(HOURLY_RATES[IssueType.ENGENHARIA] || 0);
  const [materialCost, setMaterialCost] = useState(0);
  const [peopleInvolved, setPeopleInvolved] = useState(1);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleTypeChange = (newType: IssueType) => {
    setType(newType);
    setHourlyRate(HOURLY_RATES[newType] ?? 0);
  };

  const calculateTotal = () => (timeSpent / 60) * hourlyRate * peopleInvolved + materialCost;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsUploading(true);
    try {
      const urls = await Promise.all(Array.from(e.target.files).map(f => uploadPhoto(f)));
      setPhotos(prev => [...prev, ...urls]);
    } catch {
      alert('Erro ao fazer upload das imagens. Verifique o bucket "issues-photos".');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ns.trim() || !description.trim()) return;
    const newIssue: IssueRecord = {
      id: crypto.randomUUID(), projectNs: ns, type, description,
      date: new Date().toISOString(), timeSpent, hourlyRate,
      materialCost, peopleInvolved, totalCost: calculateTotal(), photos,
    };
    try {
      await onReport(newIssue);
      setNs(''); setDescription(''); setTimeSpent(0); setHourlyRate(0);
      setMaterialCost(0); setPeopleInvolved(1); setPhotos([]);
    } catch (error: any) {
      if (error.message?.includes('column') || error.message?.includes('does not exist')) {
        alert('Erro: Colunas ausentes no banco de dados. Execute o script de atualização SQL no Supabase.');
      } else {
        alert(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`);
      }
    }
  };

  const total = calculateTotal();

  return (
    <div style={{
      background: 'rgba(10,18,35,0.75)', border: '1px solid rgba(30,41,59,0.9)',
      borderRadius: '1.125rem', padding: '1.75rem', backdropFilter: 'blur(8px)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
        <div style={{ padding: '0.625rem', borderRadius: '0.75rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertTriangle style={{ width: '1.125rem', height: '1.125rem', color: '#ef4444' }} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 700, color: '#e2e8f0' }}>Reportar Problema de Qualidade</h2>
          <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>Registre ocorrências com custo de retrabalho</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* NS + Type */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <FieldLabel>NS do Produto Afetado</FieldLabel>
            <input
              type="text" value={ns} onChange={e => setNs(e.target.value)} required
              placeholder="Ex: 123456"
              className="dark-input"
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.65rem 0.875rem', borderRadius: '0.75rem', fontSize: '0.875rem' }}
            />
          </div>
          <div>
            <FieldLabel>Setor / Origem da Falha</FieldLabel>
            <select
              value={type} onChange={e => handleTypeChange(e.target.value as IssueType)}
              className="dark-select"
              style={{ width: '100%', padding: '0.65rem 0.875rem', borderRadius: '0.75rem', fontSize: '0.875rem' }}
            >
              {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '1.25rem' }}>
          <FieldLabel>Descrição Detalhada</FieldLabel>
          <textarea
            value={description} onChange={e => setDescription(e.target.value)} rows={3} required
            placeholder="Descreva o problema com detalhes..."
            className="dark-input"
            style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem 0.875rem', borderRadius: '0.75rem', fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        {/* Photos */}
        <div style={{ marginBottom: '1.25rem' }}>
          <FieldLabel>Evidências (Fotos)</FieldLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
            {photos.map((photo, i) => (
              <div key={i} style={{ position: 'relative', width: '5rem', height: '5rem', borderRadius: '0.625rem', overflow: 'hidden', border: '1px solid rgba(30,41,59,0.9)' }}>
                <img src={photo} alt="Evidência" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button type="button" onClick={() => setPhotos(p => p.filter((_, idx) => idx !== i))} style={{
                  position: 'absolute', top: '2px', right: '2px',
                  background: 'rgba(239,68,68,0.9)', border: 'none', borderRadius: '0.35rem',
                  color: 'white', width: '1.25rem', height: '1.25rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                }}>
                  <X style={{ width: '0.75rem', height: '0.75rem' }} />
                </button>
              </div>
            ))}
            <label style={{
              width: '5rem', height: '5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: '2px dashed rgba(51,65,85,0.9)', borderRadius: '0.625rem', cursor: 'pointer',
              color: '#475569', fontSize: '0.625rem', textAlign: 'center', gap: '0.25rem',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'; e.currentTarget.style.color = '#94a3b8'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(51,65,85,0.9)'; e.currentTarget.style.color = '#475569'; }}>
              <Camera style={{ width: '1.25rem', height: '1.25rem' }} />
              <span>Adicionar</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} style={{ display: 'none' }} />
            </label>
          </div>
          {isUploading && <p style={{ color: '#3b82f6', fontSize: '0.75rem', marginTop: '0.375rem' }}>Processando imagens...</p>}
        </div>

        {/* Cost section */}
        <div style={{
          background: 'rgba(2,6,23,0.6)', border: '1px solid rgba(30,41,59,0.9)',
          borderRadius: '0.875rem', padding: '1.25rem', marginBottom: '1.25rem',
        }}>
          <p style={{ margin: '0 0 1rem', fontSize: '0.6875rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
            Custo do Retrabalho
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.875rem' }}>
            <NumberInput label="Tempo (min)" icon={Clock} value={timeSpent} onChange={setTimeSpent} />
            <NumberInput label="Pessoas" icon={Users} value={peopleInvolved} onChange={setPeopleInvolved} min={1} />
            <NumberInput label="Custo/Hora (R$)" icon={DollarSign} value={hourlyRate} onChange={setHourlyRate} step={0.01} />
            <NumberInput label="Material (R$)" icon={Package} value={materialCost} onChange={setMaterialCost} step={0.01} />
          </div>

          {/* Total */}
          <div style={{
            marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(30,41,59,0.9)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>Custo Total Estimado</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem' }}>
              <span style={{
                fontSize: '1.625rem', fontWeight: 800, color: total > 0 ? '#f87171' : '#475569',
                fontFamily: "'DM Mono', monospace", letterSpacing: '-0.02em',
                transition: 'color 0.2s',
              }}>
                {fmtCurrency(total)}
              </span>
              {total > 0 && (
                <span style={{ fontSize: '0.6875rem', color: '#ef4444', fontWeight: 600, background: 'rgba(239,68,68,0.1)', padding: '0.125rem 0.375rem', borderRadius: '0.375rem' }}>
                  RETRABALHO
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Submit */}
        <button type="submit" style={{
          width: '100%', padding: '0.875rem', borderRadius: '0.875rem',
          background: 'linear-gradient(135deg, #b91c1c, #dc2626, #ef4444)',
          border: '1px solid rgba(239,68,68,0.35)', color: 'white', fontWeight: 700,
          fontSize: '0.9375rem', cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '0.5rem',
          boxShadow: '0 4px 20px rgba(220,38,38,0.3)', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(220,38,38,0.4)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(220,38,38,0.3)'; }}>
          <Plus style={{ width: '1.125rem', height: '1.125rem' }} />
          Registrar Problema
        </button>
      </form>
    </div>
  );
};
