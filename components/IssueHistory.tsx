
import React, { useState, useMemo, useEffect } from 'react';
import { Search, AlertTriangle, Calendar, User as UserIcon, Trash2, X, Edit2, Save, Upload, Clock, DollarSign, Users, Package, FileText, Wrench, Target, CheckSquare, Square } from 'lucide-react';
import { AppState, IssueType, User, IssueRecord } from '../types';
import { ISSUE_TYPES, ROOT_CAUSES } from '../constants';
import { fetchUsers, updateIssue, uploadPhoto, deletePhotoFromBucket } from '../services/storageService';
import logoImage from '../src/assets/logo.png';

interface IssueHistoryProps {
  data: AppState;
  currentUser: User;
  onDelete?: (id: string) => void;
  onUpdate?: () => void;
}

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

const FL = ({ children }: { children: React.ReactNode }) => (
  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>
    {children}
  </label>
);

const generatePdfReport = async (issues: IssueRecord[], usersMap: Record<string, string>) => {
  let base64Logo = logoImage;
  try {
    const res = await fetch(logoImage);
    const blob = await res.blob();
    base64Logo = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Could not load logo as base64', e);
  }

  const totalCost = issues.reduce((a, c) => a + (c.totalCost || 0), 0);
  const totalTime = issues.reduce((a, c) => a + (c.timeSpent || 0), 0);
  const totalPeople = issues.reduce((a, c) => a + ((c.timeSpent || 0) * (c.peopleInvolved || 1)), 0) / 60;
  const now = new Date().toLocaleString('pt-BR');
  const dateRange = issues.length > 0
    ? `${new Date(issues[issues.length - 1].date).toLocaleDateString('pt-BR')} a ${new Date(issues[0].date).toLocaleDateString('pt-BR')}`
    : 'N/A';

  // Count by type
  const byType: Record<string, number> = {};
  const costByType: Record<string, number> = {};
  const byRootCause: Record<string, number> = {};
  issues.forEach(i => {
    byType[i.type] = (byType[i.type] || 0) + 1;
    costByType[i.type] = (costByType[i.type] || 0) + (i.totalCost || 0);
    if (i.rootCause) byRootCause[i.rootCause] = (byRootCause[i.rootCause] || 0) + 1;
  });

  const sortedTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  const sortedRootCauses = Object.entries(byRootCause).sort((a, b) => b[1] - a[1]);

  const issueRows = issues.map(i => `
    <tr>
      <td>${new Date(i.date).toLocaleDateString('pt-BR')}</td>
      <td><strong>${i.projectNs}</strong></td>
      <td>${i.type}</td>
      <td style="max-width:220px">${i.description}</td>
      <td>${i.rootCause || '-'}</td>
      <td style="max-width:180px">${i.correctiveAction || '-'}</td>
      <td style="text-align:center">${i.timeSpent || 0}m</td>
      <td style="text-align:center">${i.peopleInvolved || 1}</td>
      <td style="text-align:right;font-weight:600">${fmtCurrency(i.totalCost || 0)}</td>
      <td>${usersMap[i.reportedBy || ''] || i.reportedBy || '-'}</td>
    </tr>
  `).join('');

  const typeRows = sortedTypes.map(([type, count]) => `
    <tr>
      <td>${type}</td>
      <td style="text-align:center">${count}</td>
      <td style="text-align:center">${((count / issues.length) * 100).toFixed(1)}%</td>
      <td style="text-align:right">${fmtCurrency(costByType[type] || 0)}</td>
    </tr>
  `).join('');

  const rootCauseRows = sortedRootCauses.length > 0 ? sortedRootCauses.map(([cause, count]) => `
    <tr>
      <td>${cause}</td>
      <td style="text-align:center">${count}</td>
      <td style="text-align:center">${((count / issues.length) * 100).toFixed(1)}%</td>
    </tr>
  `).join('') : '<tr><td colspan="3" style="text-align:center;color:#999">Nenhuma causa raiz registrada</td></tr>';


  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório de Ocorrências - QualityTracker</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; font-size: 11px; line-height: 1.5; padding: 20px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; background-color: #0f172a; padding: 20px; border-radius: 8px; margin-bottom: 20px; color: #f8fafc; }
  .header h1 { font-size: 22px; color: #ffffff; font-weight: 800; margin-bottom: 2px; }
  .header .subtitle { font-size: 12px; color: #94a3b8; }
  .header .meta { text-align: right; font-size: 10px; color: #94a3b8; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .kpi { background: #f1f5f9; border-radius: 8px; padding: 12px; text-align: center; border: 1px solid #e2e8f0; }
  .kpi .value { font-size: 20px; font-weight: 800; color: #1e293b; }
  .kpi .label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.08em; margin-top: 2px; }
  .section-title { font-size: 13px; font-weight: 700; color: #1e293b; margin: 18px 0 8px; padding: 6px 10px; background: #e2e8f0; border-radius: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10px; }
  th { background: #1e293b; color: white; padding: 6px 8px; text-align: left; font-weight: 600; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  tr:nth-child(even) { background: #f8fafc; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .footer { margin-top: 24px; padding-top: 12px; border-top: 2px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; }
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
    @page { margin: 12mm; size: A4 landscape; }
  }
</style>
</head>
<body>
  <button class="no-print" onclick="window.print()" style="position:fixed;top:16px;right:16px;padding:10px 24px;background:#1e40af;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px;z-index:100">
    🖨️ Imprimir / Salvar PDF
  </button>

  <div class="header">
    <div style="display: flex; align-items: center; gap: 16px;">
      <img src="${base64Logo}" alt="Joinville Implementos" style="height: 48px; object-fit: contain;" />
      <div>
        <h1>📋 Relatório de Ocorrências de Qualidade</h1>
        <div class="subtitle">Período: ${dateRange} • Total: ${issues.length} ocorrência(s)</div>
      </div>
    </div>
    <div class="meta">
      <div>Gerado em: ${now}</div>
      <div>QualityTracker</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi"><div class="value">${issues.length}</div><div class="label">Total Ocorrências</div></div>
    <div class="kpi"><div class="value" style="color:#dc2626">${fmtCurrency(totalCost)}</div><div class="label">Custo Total de Retrabalho</div></div>
    <div class="kpi"><div class="value">${totalTime >= 60 ? Math.floor(totalTime / 60) + 'h ' + (totalTime % 60) + 'm' : totalTime + 'm'}</div><div class="label">Tempo Total de Retrabalho</div></div>
    <div class="kpi"><div class="value">${totalPeople.toFixed(1)}h</div><div class="label">Pessoas-Hora</div></div>
  </div>

  <div class="two-col">
    <div>
      <div class="section-title">📊 Ocorrências por Área</div>
      <table>
        <thead><tr><th>Área</th><th style="text-align:center">Qtde</th><th style="text-align:center">%</th><th style="text-align:right">Custo</th></tr></thead>
        <tbody>${typeRows}</tbody>
      </table>
    </div>
    <div>
      <div class="section-title">🎯 Análise de Causa Raiz (6M)</div>
      <table>
        <thead><tr><th>Causa</th><th style="text-align:center">Qtde</th><th style="text-align:center">%</th></tr></thead>
        <tbody>${rootCauseRows}</tbody>
      </table>
    </div>
  </div>

  <div class="section-title">📝 Detalhamento das Ocorrências</div>
  <table>
    <thead>
      <tr>
        <th>Data</th><th>NS</th><th>Área</th><th>Descrição</th><th>Causa Raiz</th><th>Ação Corretiva</th><th style="text-align:center">Tempo</th><th style="text-align:center">Pessoas</th><th style="text-align:right">Custo</th><th>Reportado por</th>
      </tr>
    </thead>
    <tbody>${issueRows}</tbody>
    <tfoot>
      <tr style="background:#1e293b;color:white;font-weight:700">
        <td colspan="6" style="border:none">TOTAL</td>
        <td style="text-align:center;border:none">${totalTime}m</td>
        <td style="border:none"></td>
        <td style="text-align:right;border:none">${fmtCurrency(totalCost)}</td>
        <td style="border:none"></td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">
    <span>Relatório gerado automaticamente pelo QualityTracker</span>
    <span>Página 1</span>
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    // Use a small timeout to ensure rendering is complete before print is fully ready
    setTimeout(() => {
      // We still rely on the user clicking the button to print, 
      // but this ensures everything is definitely parsed.
    }, 100);
  }
};

export const IssueHistory: React.FC<IssueHistoryProps> = ({ data, currentUser, onDelete, onUpdate }) => {
  const [filterNs, setFilterNs] = useState('');
  const [filterType, setFilterType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<IssueRecord>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUsers().then(users => {
      setUsersMap(users.reduce((acc, u) => ({ ...acc, [u.id]: u.name }), {} as Record<string, string>));
    });
  }, []);

  const toggleSelection = (id: string) => {
    setSelectedIssues(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIssues.size === filteredIssues.length && filteredIssues.length > 0) {
      setSelectedIssues(new Set());
    } else {
      setSelectedIssues(new Set(filteredIssues.map(i => i.id)));
    }
  };

  const filteredIssues = useMemo(() => {
    return data.issues.filter(issue => {
      const matchNs = issue.projectNs.toLowerCase().includes(filterNs.toLowerCase());
      const matchType = filterType ? issue.type === filterType : true;
      let matchDate = true;
      if (startDate || endDate) {
        const d = new Date(issue.date).getTime();
        const s = startDate ? new Date(startDate).getTime() : 0;
        const e = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
        matchDate = d >= s && d <= e;
      }
      return matchNs && matchType && matchDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.issues, filterNs, filterType, startDate, endDate]);

  const isGestor = ['GESTOR', 'GESTOR_QUALIDADE', 'CEO'].includes(currentUser.role);

  const startEditing = (issue: IssueRecord) => { setEditingIssueId(issue.id); setEditForm({ ...issue }); };
  const cancelEditing = () => { setEditingIssueId(null); setEditForm({}); };

  const handleEditChange = (field: keyof IssueRecord, value: any) => {
    setEditForm(prev => {
      const u = { ...prev, [field]: value };
      if (['timeSpent', 'hourlyRate', 'materialCost', 'peopleInvolved'].includes(field)) {
        u.totalCost = ((Number(u.timeSpent || 0) / 60) * Number(u.hourlyRate || 0) * Number(u.peopleInvolved || 1)) + Number(u.materialCost || 0);
      }
      return u;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsUploading(true);
    try {
      const urls = await Promise.all(Array.from(e.target.files).map(f => uploadPhoto(f)));
      setEditForm(prev => ({ ...prev, photos: [...(prev.photos || []), ...urls] }));
    } catch { alert('Erro ao fazer upload das imagens.'); }
    finally { setIsUploading(false); }
  };

  const removePhoto = (idx: number) =>
    setEditForm(prev => ({ ...prev, photos: (prev.photos || []).filter((_, i) => i !== idx) }));

  const saveEdit = async () => {
    if (!editForm.id || !editForm.projectNs || !editForm.description) return;
    setIsSaving(true);
    try {
      const original = data.issues.find(i => i.id === editForm.id);
      if (original?.photos) {
        const removed = original.photos.filter(p => !editForm.photos?.includes(p));
        await Promise.all(removed.filter(p => p.startsWith('http')).map(p => deletePhotoFromBucket(p)));
      }
      await updateIssue(editForm as IssueRecord);
      setEditingIssueId(null);
      setEditForm({});
      onUpdate?.();
    } catch (error: any) {
      alert(`Erro ao atualizar: ${error.message || 'Erro desconhecido'}`);
    } finally { setIsSaving(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '0.6rem 0.875rem', borderRadius: '0.75rem',
    background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(51,65,85,0.8)',
    color: 'white', fontSize: '0.875rem', outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Filters */}
      <div style={{ background: 'rgba(10,18,35,0.75)', border: '1px solid rgba(30,41,59,0.9)', borderRadius: '1rem', padding: '1.25rem', backdropFilter: 'blur(8px)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.875rem' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', width: '0.875rem', height: '0.875rem', color: '#475569', pointerEvents: 'none' }} />
            <input
              type="text" placeholder="Buscar por NS..." value={filterNs}
              onChange={e => setFilterNs(e.target.value)}
              className="dark-input"
              style={{ ...inputStyle, paddingLeft: '2.5rem' }}
            />
          </div>
          {/* Type filter */}
          <select
            value={filterType} onChange={e => setFilterType(e.target.value)}
            className="dark-select"
            style={{ ...inputStyle, flex: '1 1 180px', cursor: 'pointer' }}
          >
            <option value="">Todos os Tipos</option>
            {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Date filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', paddingTop: '0.875rem', borderTop: '1px solid rgba(30,41,59,0.9)' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Calendar style={{ width: '0.875rem', height: '0.875rem' }} /> Filtrar por data:
          </span>
          {[{ label: 'De', val: startDate, set: setStartDate }, { label: 'Até', val: endDate, set: setEndDate }].map(({ label, val, set }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600 }}>{label}</span>
              <input type="date" value={val} onChange={e => set(e.target.value)}
                className="dark-input"
                style={{ ...inputStyle, width: 'auto', padding: '0.5rem 0.75rem', fontSize: '0.8125rem' }}
              />
            </div>
          ))}
          {(filterNs || filterType || startDate || endDate) && (
            <button onClick={() => { setFilterNs(''); setFilterType(''); setStartDate(''); setEndDate(''); }}
              style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#475569', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <X style={{ width: '0.875rem', height: '0.875rem' }} /> Limpar
            </button>
          )}
        </div>
      </div>

      {/* PDF Export and Selection */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={toggleSelectAll} style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.6rem 1rem', borderRadius: '0.75rem', fontSize: '0.8125rem', fontWeight: 600,
          background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.35)',
          color: '#60a5fa', cursor: 'pointer', transition: 'all 0.15s',
        }}>
          {selectedIssues.size === filteredIssues.length && filteredIssues.length > 0 ? <CheckSquare style={{ width: '0.875rem', height: '0.875rem' }} /> : <Square style={{ width: '0.875rem', height: '0.875rem' }} />}
          {selectedIssues.size === filteredIssues.length && filteredIssues.length > 0 ? 'Desmarcar Todos' : 'Selecionar Todos'}
        </button>
        <button onClick={() => generatePdfReport(selectedIssues.size > 0 ? filteredIssues.filter(i => selectedIssues.has(i.id)) : filteredIssues, usersMap)} style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.6rem 1rem', borderRadius: '0.75rem', fontSize: '0.8125rem', fontWeight: 600,
          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)',
          color: '#f87171', cursor: 'pointer', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}>
          <FileText style={{ width: '0.875rem', height: '0.875rem' }} />
          Gerar Relatório PDF ({selectedIssues.size > 0 ? selectedIssues.size : filteredIssues.length})
        </button>
      </div>

      {/* Counter */}
      {filteredIssues.length > 0 && (
        <p style={{ fontSize: '0.75rem', color: '#475569', margin: 0, paddingLeft: '0.25rem' }}>
          {filteredIssues.length} ocorrência{filteredIssues.length !== 1 ? 's' : ''} encontrada{filteredIssues.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Issue cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filteredIssues.length > 0 ? filteredIssues.map((issue, idx) => (
          <div key={issue.id} className={`dash-card delay-${Math.min(idx + 1, 5)}`} style={{
            background: 'rgba(10,18,35,0.75)', border: '1px solid rgba(30,41,59,0.9)',
            borderRadius: '1rem', padding: '1.25rem', backdropFilter: 'blur(8px)',
            borderLeft: '3px solid rgba(239,68,68,0.5)', position: 'relative',
          }}>

            {/* Gestor actions */}
            {isGestor && editingIssueId !== issue.id && (
              <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.375rem', zIndex: 1 }}>
                <button onClick={() => startEditing(issue)} style={{ padding: '0.375rem', borderRadius: '0.5rem', background: 'none', border: '1px solid rgba(51,65,85,0.6)', color: '#64748b', cursor: 'pointer', display: 'flex', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#60a5fa'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'; e.currentTarget.style.background = 'rgba(59,130,246,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = 'rgba(51,65,85,0.6)'; e.currentTarget.style.background = 'none'; }}>
                  <Edit2 style={{ width: '0.875rem', height: '0.875rem' }} />
                </button>
                <button onClick={() => onDelete?.(issue.id)} style={{ padding: '0.375rem', borderRadius: '0.5rem', background: 'none', border: '1px solid rgba(51,65,85,0.6)', color: '#64748b', cursor: 'pointer', display: 'flex', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = 'rgba(51,65,85,0.6)'; e.currentTarget.style.background = 'none'; }}>
                  <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />
                </button>
              </div>
            )}

            {editingIssueId === issue.id ? (
              /* ── EDIT MODE ── */
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'white' }}>Editar Ocorrência</h3>
                  <button onClick={cancelEditing} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                    <X style={{ width: '1.125rem', height: '1.125rem' }} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.875rem' }}>
                  <div>
                    <FL>NS do Projeto</FL>
                    <input type="text" value={editForm.projectNs || ''} onChange={e => handleEditChange('projectNs', e.target.value)}
                      className="dark-input" style={inputStyle} />
                  </div>
                  <div>
                    <FL>Tipo de Erro</FL>
                    <select value={editForm.type || ''} onChange={e => handleEditChange('type', e.target.value)}
                      className="dark-select" style={inputStyle}>
                      {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <FL>Descrição</FL>
                    <textarea value={editForm.description || ''} onChange={e => handleEditChange('description', e.target.value)}
                      className="dark-input" style={{ ...inputStyle, height: '5rem', resize: 'vertical', fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <FL>Tempo (min)</FL>
                    <input type="number" value={editForm.timeSpent || 0} onChange={e => handleEditChange('timeSpent', Number(e.target.value))}
                      className="dark-input" style={inputStyle} />
                  </div>
                  <div>
                    <FL>Custo/Hora (R$)</FL>
                    <input type="number" value={editForm.hourlyRate || 0} onChange={e => handleEditChange('hourlyRate', Number(e.target.value))}
                      className="dark-input" style={inputStyle} />
                  </div>
                  <div>
                    <FL>Pessoas</FL>
                    <input type="number" min="1" value={editForm.peopleInvolved || 1} onChange={e => handleEditChange('peopleInvolved', Number(e.target.value))}
                      className="dark-input" style={inputStyle} />
                  </div>
                  <div>
                    <FL>Material (R$)</FL>
                    <input type="number" value={editForm.materialCost || 0} onChange={e => handleEditChange('materialCost', Number(e.target.value))}
                      className="dark-input" style={inputStyle} />
                  </div>
                  <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(2,6,23,0.6)', border: '1px solid rgba(30,41,59,0.9)', borderRadius: '0.75rem', padding: '0.875rem 1rem' }}>
                    <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Custo Total</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f87171', fontFamily: "'DM Mono', monospace" }}>
                      {fmtCurrency(editForm.totalCost || 0)}
                    </span>
                  </div>
                  <div>
                    <FL>Causa Raiz (6M)</FL>
                    <select value={editForm.rootCause || ''} onChange={e => handleEditChange('rootCause', e.target.value)}
                      className="dark-select" style={inputStyle}>
                      <option value="">Selecionar causa...</option>
                      {ROOT_CAUSES.map(rc => <option key={rc} value={rc}>{rc}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <FL>Ação Corretiva</FL>
                    <textarea value={editForm.correctiveAction || ''} onChange={e => handleEditChange('correctiveAction', e.target.value)}
                      placeholder="Descreva a ação corretiva..."
                      className="dark-input" style={{ ...inputStyle, height: '4rem', resize: 'vertical', fontFamily: 'inherit' }} />
                  </div>

                  {/* Photos */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <FL>Evidências</FL>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {editForm.photos?.map((photo, idx) => (
                        <div key={idx} style={{ position: 'relative', width: '4rem', height: '4rem', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid rgba(30,41,59,0.9)' }}>
                          <img src={photo} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button type="button" onClick={() => removePhoto(idx)} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(239,68,68,0.9)', border: 'none', borderRadius: '0.25rem', color: 'white', width: '1.125rem', height: '1.125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                            <X style={{ width: '0.625rem', height: '0.625rem' }} />
                          </button>
                        </div>
                      ))}
                      <label style={{ width: '4rem', height: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(51,65,85,0.9)', borderRadius: '0.5rem', cursor: 'pointer', color: '#475569', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'; e.currentTarget.style.color = '#60a5fa'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(51,65,85,0.9)'; e.currentTarget.style.color = '#475569'; }}>
                        <Upload style={{ width: '1rem', height: '1rem' }} />
                        <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileChange} disabled={isUploading} />
                      </label>
                    </div>
                    {isUploading && <p style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '0.375rem' }}>Processando...</p>}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem', marginTop: '1rem' }}>
                  <button onClick={cancelEditing} style={{ padding: '0.5rem 1rem', borderRadius: '0.625rem', background: 'none', border: '1px solid rgba(51,65,85,0.8)', color: '#94a3b8', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
                    Cancelar
                  </button>
                  <button onClick={saveEdit} disabled={isSaving} style={{ padding: '0.5rem 1rem', borderRadius: '0.625rem', background: isSaving ? 'rgba(30,41,59,0.5)' : 'rgba(37,99,235,0.9)', border: '1px solid rgba(59,130,246,0.4)', color: 'white', cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    {isSaving
                      ? <><div style={{ width: '0.875rem', height: '0.875rem', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Salvando...</>
                      : <><Save style={{ width: '0.875rem', height: '0.875rem' }} /> Salvar</>
                    }
                  </button>
                </div>
              </div>
            ) : (
              /* ── VIEW MODE ── */
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.875rem', paddingRight: isGestor ? '5rem' : '0' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={() => toggleSelection(issue.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: selectedIssues.has(issue.id) ? '#3b82f6' : '#64748b', display: 'flex', alignItems: 'center', marginRight: '0.25rem' }}>
                      {selectedIssues.has(issue.id) ? <CheckSquare style={{ width: '1.25rem', height: '1.25rem' }} /> : <Square style={{ width: '1.25rem', height: '1.25rem' }} />}
                    </button>
                    <span style={{ padding: '0.25rem 0.625rem', borderRadius: '0.375rem', fontSize: '0.6875rem', fontWeight: 700, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {issue.type}
                    </span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: 'white', fontSize: '0.875rem' }}>
                      NS: {issue.projectNs}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.125rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#475569', fontSize: '0.75rem' }}>
                      <Calendar style={{ width: '0.75rem', height: '0.75rem' }} />
                      {fmtDate(issue.date)}
                    </div>
                    {isGestor && issue.reportedBy && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#64748b', fontSize: '0.75rem' }}>
                        <UserIcon style={{ width: '0.75rem', height: '0.75rem' }} />
                        {usersMap[issue.reportedBy] || 'Desconhecido'}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ background: 'rgba(2,6,23,0.5)', border: '1px solid rgba(30,41,59,0.7)', borderRadius: '0.625rem', padding: '0.875rem', marginBottom: '0.875rem' }}>
                  <p style={{ margin: 0, fontSize: '0.8625rem', color: '#cbd5e1', lineHeight: 1.65 }}>{issue.description}</p>
                </div>

                {/* Cost row */}
                {((issue.totalCost ?? 0) > 0 || (issue.timeSpent ?? 0) > 0) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(30,41,59,0.7)' }}>
                    {[
                      { icon: Clock, label: 'Tempo', value: `${issue.timeSpent || 0} min` },
                      { icon: Users, label: 'Pessoas', value: String(issue.peopleInvolved || 1) },
                      { icon: Package, label: 'Material', value: fmtCurrency(issue.materialCost || 0) },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                        <span style={{ fontSize: '0.625rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Icon style={{ width: '0.625rem', height: '0.625rem' }} />{label}
                        </span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', fontFamily: "'DM Mono', monospace" }}>{value}</span>
                      </div>
                    ))}
                    <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.125rem' }}>
                      <span style={{ fontSize: '0.625rem', color: '#ef4444', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Custo Total</span>
                      <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#f87171', fontFamily: "'DM Mono', monospace" }}>
                        {fmtCurrency(issue.totalCost || 0)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Root Cause & Corrective Action */}
                {(issue.rootCause || issue.correctiveAction) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(30,41,59,0.7)' }}>
                    {issue.rootCause && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Target style={{ width: '0.75rem', height: '0.75rem', color: '#eab308', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.625rem', color: '#eab308', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Causa Raiz:</span>
                        <span style={{ fontSize: '0.8125rem', color: '#fde68a', fontWeight: 600, background: 'rgba(234,179,8,0.1)', padding: '0.125rem 0.5rem', borderRadius: '0.375rem', border: '1px solid rgba(234,179,8,0.2)' }}>{issue.rootCause}</span>
                      </div>
                    )}
                    {issue.correctiveAction && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Wrench style={{ width: '0.75rem', height: '0.75rem', color: '#22c55e', flexShrink: 0, marginTop: '0.125rem' }} />
                        <div>
                          <span style={{ fontSize: '0.625rem', color: '#22c55e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.125rem' }}>Ação Corretiva:</span>
                          <span style={{ fontSize: '0.8125rem', color: '#86efac', lineHeight: 1.5 }}>{issue.correctiveAction}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Photos */}
                {issue.photos && issue.photos.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingTop: '0.75rem', paddingBottom: '0.25rem' }}>
                    {issue.photos.map((photo, idx) => (
                      <img key={idx} src={photo} alt={`Evidência ${idx + 1}`}
                        onClick={() => setSelectedImage(photo)}
                        style={{ width: '4rem', height: '4rem', objectFit: 'cover', borderRadius: '0.5rem', border: '1px solid rgba(30,41,59,0.9)', cursor: 'pointer', flexShrink: 0, transition: 'opacity 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '0.75'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )) : (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'rgba(10,18,35,0.75)', border: '1px dashed rgba(30,41,59,0.9)', borderRadius: '1rem' }}>
            <AlertTriangle style={{ width: '2rem', height: '2rem', color: '#334155', margin: '0 auto 0.75rem' }} />
            <p style={{ color: '#475569', fontSize: '0.875rem', margin: 0 }}>Nenhum problema encontrado com os filtros atuais.</p>
          </div>
        )}
      </div>

      {/* Image modal */}
      {selectedImage && (
        <div onClick={() => setSelectedImage(null)} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.88)', padding: '1rem' }}>
          <button onClick={() => setSelectedImage(null)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color: 'white', background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(51,65,85,0.8)', borderRadius: '0.625rem', cursor: 'pointer', padding: '0.375rem', display: 'flex' }}>
            <X style={{ width: '1.25rem', height: '1.25rem' }} />
          </button>
          <img src={selectedImage} alt="Evidência" onClick={e => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '0.75rem', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }} />
        </div>
      )}
    </div>
  );
};
