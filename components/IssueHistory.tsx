import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, AlertTriangle, Calendar, User as UserIcon, Trash2, X, Edit2, 
  Save, Upload, Clock, DollarSign, Users, Package, FileText, Wrench, 
  Target, CheckSquare, Square, ChevronLeft, ChevronRight, CheckCircle2, 
  RotateCcw, Image as ImageIcon, MoreVertical, Camera, Plus
} from 'lucide-react';
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
  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-outline)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>
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
  }
};

export const IssueHistory: React.FC<IssueHistoryProps> = ({ data, currentUser, onDelete, onUpdate }) => {
  // Helper to compare similar descriptions using fuzzy and Jaccard word-overlap metrics
  const isSimilarText = (str1: string, str2: string): boolean => {
    const clean = (s: string) => 
      s.toLowerCase()
       .normalize("NFD")
       .replace(/[\u0300-\u036f]/g, "") // remove accents
       .replace(/[^a-z0-9\s]/g, "")     // keep alphanumeric and spaces
       .trim();
    
    const n1 = clean(str1);
    const n2 = clean(str2);
    if (n1 === n2) return true;
    if (!n1 || !n2) return false;
    
    // Substring checks for reasonably long strings
    if (n1.length > 5 && n2.length > 5) {
      if (n1.includes(n2) || n2.includes(n1)) return true;
    }
    
    // Word overlap check (Jaccard similarity)
    const w1 = new Set(n1.split(/\s+/).filter(w => w.length > 2));
    const w2 = new Set(n2.split(/\s+/).filter(w => w.length > 2));
    if (w1.size === 0 || w2.size === 0) return false;
    
    let intersection = 0;
    w1.forEach(w => { if (w2.has(w)) intersection++; });
    const union = new Set([...w1, ...w2]).size;
    const jaccard = intersection / union;
    
    return jaccard >= 0.5; // 50% or more common significant words
  };

  // Helper to get all issues that represent a reincidence of the given issue
  const getReincidentIssues = (issue: IssueRecord, allIssues: IssueRecord[]) => {
    return allIssues.filter(i => 
      i.id !== issue.id && 
      i.projectNs.trim().toLowerCase() === issue.projectNs.trim().toLowerCase() &&
      i.type === issue.type &&
      isSimilarText(i.description || '', issue.description || '')
    );
  };

  // Helper for checking if an issue is a reincidence
  const isReincidencia = (issue: IssueRecord, allIssues: IssueRecord[]): boolean => {
    return getReincidentIssues(issue, allIssues).length > 0;
  };

  // Helper for checking if an issue has warning (rework or duplicate projectNs)
  const isWarningRow = (issue: IssueRecord) => {
    return isReincidencia(issue, data.issues);
  };

  const [workflowTab, setWorkflowTab] = useState<'ABERTA' | 'FINALIZADA'>('ABERTA');
  const [filterNs, setFilterNs] = useState('');
  const [filterType, setFilterType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [selectedIssueForModal, setSelectedIssueForModal] = useState<IssueRecord | null>(null);
  const [selectedIssueForDetail, setSelectedIssueForDetail] = useState<IssueRecord | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<IssueRecord>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showMobileDates, setShowMobileDates] = useState(false);
  const [activeMenuIssueId, setActiveMenuIssueId] = useState<string | null>(null);

  // Live timer & Quality control features state variables
  const [nowDate, setNowDate] = useState(new Date());
  const [filterReincident, setFilterReincident] = useState(false);
  const [resolvingIssue, setResolvingIssue] = useState<IssueRecord | null>(null);
  const [resolutionPhoto, setResolutionPhoto] = useState<string | null>(null);
  const [isUploadingResolutionPhoto, setIsUploadingResolutionPhoto] = useState(false);
  const [lightboxPhotoUrl, setLightboxPhotoUrl] = useState<string | null>(null);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  // Advanced feature state extensions
  const [selectedChip, setSelectedChip] = useState<'Todos' | 'Portas' | 'Pintura' | 'Montagem' | 'Reincidência'>('Todos');
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());
  const [photoSource, setPhotoSource] = useState<'camera' | 'gallery' | null>(null);
  const [sourceError, setSourceError] = useState(false);
  const [resolutionPhotos, setResolutionPhotos] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toggleCardExpand = (id: string) => {
    setExpandedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const siblings = useMemo(() => {
    if (!selectedIssueForDetail) return [];
    return getReincidentIssues(selectedIssueForDetail, data.issues);
  }, [selectedIssueForDetail, data.issues]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowDate(new Date());
    }, 60000); // updates every 1 minute
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuIssueId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchUsers().then(users => {
      setUsersMap(users.reduce((acc, u) => ({ ...acc, [u.id]: u.name }), {} as Record<string, string>));
    });
  }, []);

  useEffect(() => {
    if (!selectedIssueForModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const photos = selectedIssueForModal.photos || [];
      if (photos.length === 0) return;
      if (e.key === 'ArrowRight') {
        setActivePhotoIndex(prev => (prev + 1) % photos.length);
      } else if (e.key === 'ArrowLeft') {
        setActivePhotoIndex(prev => (prev - 1 + photos.length) % photos.length);
      } else if (e.key === 'Escape') {
        setSelectedIssueForModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIssueForModal]);

  const openCount = useMemo(() => data.issues.filter(i => (i.status || 'ABERTA') === 'ABERTA').length, [data.issues]);
  const closedCount = useMemo(() => data.issues.filter(i => i.status === 'FINALIZADA').length, [data.issues]);

  const reincidentCount = useMemo(() => {
    return data.issues.filter(i => (i.status || 'ABERTA') === workflowTab && isReincidencia(i, data.issues)).length;
  }, [data.issues, workflowTab]);

  // Calculate average resolution time
  const avgResolutionTimeStr = useMemo(() => {
    const resolvedIssues = data.issues.filter(i => i.status === 'FINALIZADA' && i.resolvedAt && i.date);
    if (resolvedIssues.length === 0) return '-';
    let totalMs = 0;
    resolvedIssues.forEach(i => {
      const start = new Date(i.date).getTime();
      const end = new Date(i.resolvedAt!).getTime();
      if (end > start) {
        totalMs += (end - start);
      }
    });
    const avgMs = totalMs / resolvedIssues.length;
    const avgMinutes = Math.floor(avgMs / 60000);
    const avgHours = Math.floor(avgMinutes / 60);
    const remMinutes = avgMinutes % 60;
    if (avgHours >= 24) {
      const days = Math.floor(avgHours / 24);
      const remHours = avgHours % 24;
      return `${days}d ${remHours}h`;
    } else if (avgHours > 0) {
      return `${avgHours}h ${remMinutes}m`;
    } else {
      return `${avgMinutes}m`;
    }
  }, [data.issues]);

  const renderResolutionTime = (issue: IssueRecord) => {
    if (issue.status === 'FINALIZADA') {
      if (!issue.resolvedAt || !issue.date) return <span style={{ color: '#8c909f' }}>-</span>;
      const start = new Date(issue.date).getTime();
      const end = new Date(issue.resolvedAt).getTime();
      const diffMs = end - start;
      const text = getFormattedDuration(diffMs);
      return (
        <span style={{ 
          color: '#8c909f', 
          fontSize: '0.8125rem', 
          fontWeight: 700,
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '3px 8px',
          borderRadius: '6px',
          fontFamily: "'JetBrains Mono', monospace",
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          transition: 'all 0.15s ease'
        }} title="Tempo total até a resolução (Finalizada)">
          <Clock style={{ width: '0.75rem', height: '0.75rem', color: '#8c909f', flexShrink: 0 }} />
          {text}
        </span>
      );
    } else {
      if (!issue.date) return <span style={{ color: '#22c55e' }}>-</span>;
      const start = new Date(issue.date).getTime();
      const diffMs = nowDate.getTime() - start;
      const hours = diffMs / 3600000;
      const text = getFormattedDuration(diffMs);
      
      let color = '#22c55e';
      let bgColor = 'rgba(34, 197, 94, 0.12)';
      let borderColor = 'rgba(34, 197, 94, 0.25)';
      if (hours >= 24) {
        color = '#ef4444';
        bgColor = 'rgba(239, 68, 68, 0.12)';
        borderColor = 'rgba(239, 68, 68, 0.25)';
      } else if (hours >= 4) {
        color = '#f0a500';
        bgColor = 'rgba(240, 165, 0, 0.12)';
        borderColor = 'rgba(240, 165, 0, 0.25)';
      }
      
      return (
        <span style={{ 
          color, 
          fontSize: '0.8125rem', 
          fontWeight: 700,
          background: bgColor,
          border: `1px solid ${borderColor}`,
          padding: '3px 8px',
          borderRadius: '6px',
          fontFamily: "'JetBrains Mono', monospace",
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          transition: 'all 0.15s ease'
        }} title="Tempo decorrido desde o registro (Em aberto)">
          <Clock style={{ width: '0.75rem', height: '0.75rem', color, flexShrink: 0 }} />
          {text}
        </span>
      );
    }
  };

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
      const matchStatus = (issue.status || 'ABERTA') === workflowTab;
      const matchNs = issue.projectNs.toLowerCase().includes(filterNs.toLowerCase());
      const matchType = filterType ? issue.type === filterType : true;
      let matchDate = true;
      if (startDate || endDate) {
        const d = new Date(issue.date).getTime();
        const s = startDate ? new Date(startDate).getTime() : 0;
        const e = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
        matchDate = d >= s && d <= e;
      }
      const matchReincident = filterReincident ? isReincidencia(issue, data.issues) : true;
      
      // selectedChip quick-filters
      let matchChip = true;
      if (selectedChip === 'Portas') {
        matchChip = issue.type === 'Portas';
      } else if (selectedChip === 'Pintura') {
        matchChip = issue.type === 'Pintura';
      } else if (selectedChip === 'Montagem') {
        matchChip = issue.type.toLowerCase().includes('montagem');
      } else if (selectedChip === 'Reincidência') {
        matchChip = isReincidencia(issue, data.issues);
      }

      return matchStatus && matchNs && matchType && matchDate && matchReincident && matchChip;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.issues, workflowTab, filterNs, filterType, startDate, endDate, filterReincident, selectedChip]);

  const handleStatusToggle = async (issue: IssueRecord) => {
    const nextStatus = (issue.status || 'ABERTA') === 'ABERTA' ? 'FINALIZADA' : 'ABERTA';
    if (nextStatus === 'FINALIZADA') {
      setResolvingIssue(issue);
      setResolutionPhoto(null);
    } else {
      try {
        if (navigator.vibrate) {
          navigator.vibrate(20);
        }
        const updated = { 
          ...issue, 
          status: 'ABERTA' as const, 
          resolvedAt: undefined, 
          resolvedPhoto: undefined 
        };
        await updateIssue(updated);
        
        // Update detail selection if currently open
        if (selectedIssueForDetail?.id === issue.id) {
          setSelectedIssueForDetail(updated);
        }
        
        onUpdate?.();
      } catch (e: any) {
        alert(`Erro ao reabrir ocorrência: ${e.message}`);
      }
    }
  };

  const getFormattedDuration = (ms: number): string => {
    if (ms <= 0) return '0m';
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remHours = hours % 24;
      return `${days} dias ${remHours}h`;
    } else if (hours > 0) {
      return `${hours}h ${remMinutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getMobileTimeDisplay = (issue: IssueRecord) => {
    if (issue.status === 'FINALIZADA') {
      if (!issue.resolvedAt || !issue.date) return { text: '-', color: '#8c909f' };
      const start = new Date(issue.date).getTime();
      const end = new Date(issue.resolvedAt).getTime();
      const diffMs = end - start;
      return { text: getFormattedDuration(diffMs), color: '#8c909f' };
    } else {
      if (!issue.date) return { text: '-', color: '#22c55e' };
      const start = new Date(issue.date).getTime();
      const diffMs = nowDate.getTime() - start;
      const hours = diffMs / 3600000;
      const text = getFormattedDuration(diffMs);
      
      let color = '#22c55e';
      if (hours >= 24) {
        color = '#ef4444';
      } else if (hours >= 4) {
        color = '#f0a500';
      }
      return { text, color };
    }
  };

  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);

  const handleResolutionPhotoAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      alert('Erro: O arquivo excede o limite de 5MB.');
      return;
    }
    setIsUploadingPhotos(true);
    try {
      const url = await uploadPhoto(file);
      setResolutionPhotos(prev => [...prev, url]);
    } catch {
      alert('Erro ao carregar imagem de resolução.');
    } finally {
      setIsUploadingPhotos(false);
      e.target.value = '';
    }
  };

  const removeResolutionPhoto = (index: number) => {
    setResolutionPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddClick = () => {
    if (!photoSource) {
      setSourceError(true);
      setTimeout(() => setSourceError(false), 1200);
      return;
    }
    if (photoSource === 'camera') {
      document.getElementById('resolution-camera-input')?.click();
    } else {
      document.getElementById('resolution-gallery-input')?.click();
    }
  };

  const confirmResolution = async () => {
    if (!resolvingIssue) return;
    try {
      const start = new Date(resolvingIssue.date).getTime();
      const end = new Date().getTime();
      const diffMs = end - start;
      const openTimeText = getFormattedDuration(diffMs);

      const updated = {
        ...resolvingIssue,
        status: 'FINALIZADA' as const,
        resolvedAt: new Date().toISOString(),
        resolvedBy: currentUser.name,
        resolvedPhoto: resolutionPhotos[0] || undefined,
        resolvedPhotos: resolutionPhotos,
        timeOpen: openTimeText
      };
      
      await updateIssue(updated);
      
      if (selectedIssueForDetail?.id === resolvingIssue.id) {
        setSelectedIssueForDetail(updated);
      }
      
      setResolvingIssue(null);
      setResolutionPhotos([]);
      setPhotoSource(null);
      
      setToastMessage('Ocorrência finalizada ✓');
      setTimeout(() => setToastMessage(null), 3000);
      
      setWorkflowTab('FINALIZADA');
      onUpdate?.();
    } catch (e: any) {
      alert(`Erro ao finalizar ocorrência: ${e.message}`);
    }
  };

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
      const urls = await Promise.all(Array.from(e.target.files).map(f => uploadPhoto(f as File)));
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
    padding: '0.6rem 0.875rem', minHeight: '48px', borderRadius: '0.75rem',
    background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(51,65,85,0.8)',
    color: 'white', fontSize: '0.875rem', outline: 'none',
  };

  const glassStyle: React.CSSProperties = {
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--r-lg)',
    padding: isMobile ? '1rem' : '1.5rem',
    backdropFilter: 'blur(var(--glass-blur))',
    WebkitBackdropFilter: 'blur(var(--glass-blur))',
    boxShadow: 'var(--glass-shadow)',
  };

  // (Helpers moved to the top of the component to prevent TDZ/initialization issues)

  // Helper for getting specific visual style for area badges
  const getAreaBadgeStyle = (type: string) => {
    const t = (type || '').toUpperCase();
    if (t.includes('PORTA')) {
      return { bg: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', text: '#60a5fa' };
    }
    if (t.includes('PINTURA')) {
      return { bg: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.25)', text: '#a78bfa' };
    }
    if (t.includes('MONTAGEM')) {
      return { bg: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.25)', text: '#f472b6' };
    }
    if (t.includes('CORTE') || t.includes('DOBRA')) {
      return { bg: 'rgba(20, 184, 166, 0.1)', border: '1px solid rgba(20, 184, 166, 0.25)', text: '#2dd4bf' };
    }
    if (t.includes('ALMOXARIFADO')) {
      return { bg: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', text: '#fbbf24' };
    }
    if (t.includes('QUALIDADE')) {
      return { bg: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', text: '#34d399' };
    }
    if (t.includes('ELETRICA')) {
      return { bg: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.25)', text: '#38bdf8' };
    }
    if (t.includes('ENGENHARIA')) {
      return { bg: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', text: '#f87171' };
    }
    return { bg: 'rgba(100, 116, 139, 0.1)', border: '1px solid rgba(100, 116, 139, 0.25)', text: '#cbd5e1' };
  };

  // Helper for getting specific visual style for root causes (6M)
  const getRootCauseStyle = (cause: string) => {
    const c = (cause || '').toUpperCase();
    if (c.includes('MÃO DE OBRA') || c.includes('MAO DE OBRA')) {
      return { bg: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', text: '#f87171' };
    }
    if (c.includes('MATERIAL')) {
      return { bg: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)', text: '#fbbf24' };
    }
    if (c.includes('MÉTODO') || c.includes('METODO')) {
      return { bg: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.25)', text: '#60a5fa' };
    }
    if (c.includes('MÁQUINA') || c.includes('MAQUINA')) {
      return { bg: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', text: '#34d399' };
    }
    if (c.includes('MEIO AMBIENTE')) {
      return { bg: 'rgba(20, 184, 166, 0.12)', border: '1px solid rgba(20, 184, 166, 0.25)', text: '#2dd4bf' };
    }
    return { bg: 'rgba(139, 92, 246, 0.12)', border: '1px solid rgba(139, 92, 246, 0.25)', text: '#a78bfa' };
  };

  const showCost = currentUser.role !== 'QUALIDADE';
  const isQualidade = currentUser.role === 'QUALIDADE';

  const globalStats = useMemo(() => {
    const open = data.issues.filter(i => (i.status || 'ABERTA') === 'ABERTA').length;
    const reinc = data.issues.filter(i => isReincidencia(i, data.issues)).length;
    const totalCost = data.issues.reduce((acc, curr) => acc + (curr.totalCost || 0), 0);
    return { open, reinc, totalCost };
  }, [data.issues]);

  const chipCounts = useMemo(() => {
    const issuesInTab = data.issues.filter(i => (i.status || 'ABERTA') === workflowTab);
    return {
      Todos: issuesInTab.length,
      Portas: issuesInTab.filter(i => i.type === 'Portas').length,
      Pintura: issuesInTab.filter(i => i.type === 'Pintura').length,
      Montagem: issuesInTab.filter(i => i.type.toLowerCase().includes('montagem')).length,
      Reincidencia: issuesInTab.filter(i => isReincidencia(i, data.issues)).length,
    };
  }, [data.issues, workflowTab]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── STYLE SHEET FOR ANIMATIONS ── */}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
      `}</style>

      {/* ── SUMMARY STATS GRID (2x2 on mobile) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile 
          ? 'repeat(2, 1fr)' 
          : (showCost ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)'),
        gap: '0.75rem',
        width: '100%',
        marginBottom: '0.25rem'
      }}>
        {/* Card 1: Em Aberto */}
        <div style={{
          background: 'rgba(22, 27, 34, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '0.75rem',
          padding: '0.625rem 0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#ef4444',
            boxShadow: '0 0 10px #ef4444',
            display: 'inline-block'
          }} className="status-dot" />
          <div>
            <div style={{ fontSize: '0.72rem', color: '#8c909f', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              🔴 Em Aberto
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', fontFamily: "'JetBrains Mono', monospace", marginTop: '2px' }}>
              {globalStats.open}
            </div>
          </div>
        </div>

        {/* Card 2: Reincidências */}
        <div style={{
          background: 'rgba(22, 27, 34, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '0.75rem',
          padding: '0.625rem 0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        }}>
          <AlertTriangle style={{ width: '1.25rem', height: '1.25rem', color: '#f0a500' }} />
          <div>
            <div style={{ fontSize: '0.72rem', color: '#8c909f', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              ⚠️ Reincidências
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f0a500', fontFamily: "'JetBrains Mono', monospace", marginTop: '2px' }}>
              {globalStats.reinc}
            </div>
          </div>
        </div>

        {/* Card 3: Tempo Médio de Resolução */}
        <div style={{
          background: 'rgba(22, 27, 34, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '0.75rem',
          padding: '0.625rem 0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          gridColumn: (isMobile && !showCost) ? 'span 2' : 'auto'
        }}>
          <Clock style={{ width: '1.25rem', height: '1.25rem', color: '#10b981' }} />
          <div>
            <div style={{ fontSize: '0.72rem', color: '#8c909f', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              ⏱ T. Médio Resolução
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981', fontFamily: "'JetBrains Mono', monospace", marginTop: '2px' }}>
              {avgResolutionTimeStr}
            </div>
          </div>
        </div>

        {/* Card 4: Custo Total (Hidden for QUALIDADE role) */}
        {showCost && (
          <div style={{
            background: 'rgba(22, 27, 34, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '0.75rem',
            padding: '0.625rem 0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            <DollarSign style={{ width: '1.25rem', height: '1.25rem', color: '#22c55e' }} />
            <div>
              <div style={{ fontSize: '0.72rem', color: '#8c909f', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                💰 Custo Total
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#22c55e', fontFamily: "'JetBrains Mono', monospace", marginTop: '2px' }}>
                {fmtCurrency(globalStats.totalCost)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── SEGMENTED WORKFLOW TABS ── */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '0.25rem' }}>
        <div style={{ 
          display: 'inline-flex', 
          background: 'rgba(10, 18, 35, 0.75)', 
          border: '1px solid rgba(255, 255, 255, 0.06)', 
          borderRadius: '9999px', 
          padding: '4px', 
          position: 'relative', 
          width: isMobile ? '100%' : '380px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
        }}>
          {/* Sliding blur active block */}
          <div style={{
            position: 'absolute',
            top: '4px',
            bottom: '4px',
            left: workflowTab === 'ABERTA' ? '4px' : 'calc(50% + 0px)',
            width: 'calc(50% - 4px)',
            background: workflowTab === 'ABERTA' 
              ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(234, 179, 8, 0.2) 100%)'
              : 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.2) 100%)',
            border: workflowTab === 'ABERTA' 
              ? '1px solid rgba(234, 179, 8, 0.35)' 
              : '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '9999px',
            transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
            zIndex: 1,
            pointerEvents: 'none',
            boxShadow: workflowTab === 'ABERTA' 
              ? '0 0 12px rgba(234, 179, 8, 0.12)' 
              : '0 0 12px rgba(16, 185, 129, 0.12)'
          }} />

          <button 
            onClick={() => setWorkflowTab('ABERTA')}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: '9999px',
              border: 'none',
              background: 'none',
              color: workflowTab === 'ABERTA' ? '#fde68a' : '#64748b',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'color 0.2s',
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              minHeight: '44px'
            }}
          >
            <span 
              style={{ 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                background: '#eab308', 
                boxShadow: '0 0 8px #eab308',
                display: 'inline-block' 
              }} 
            />
            Em Aberto
            <span style={{ 
              fontSize: '0.6875rem', 
              background: workflowTab === 'ABERTA' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255,255,255,0.05)', 
              color: workflowTab === 'ABERTA' ? '#fde68a' : '#64748b', 
              padding: '1px 7px', 
              borderRadius: '999px', 
              marginLeft: '4px',
              fontFamily: "'JetBrains Mono', monospace"
            }}>{openCount}</span>
          </button>

          <button 
            onClick={() => setWorkflowTab('FINALIZADA')}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: '9999px',
              border: 'none',
              background: 'none',
              color: workflowTab === 'FINALIZADA' ? '#a7f3d0' : '#64748b',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'color 0.2s',
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              minHeight: '44px'
            }}
          >
            <span style={{ 
              width: '6px', 
              height: '6px', 
              borderRadius: '50%', 
              background: '#10b981', 
              boxShadow: '0 0 8px #10b981',
              display: 'inline-block' 
            }} />
            Finalizadas
            <span style={{ 
              fontSize: '0.6875rem', 
              background: workflowTab === 'FINALIZADA' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)', 
              color: workflowTab === 'FINALIZADA' ? '#a7f3d0' : '#64748b', 
              padding: '1px 7px', 
              borderRadius: '999px', 
              marginLeft: '4px',
              fontFamily: "'JetBrains Mono', monospace"
            }}>{closedCount}</span>
          </button>
        </div>
      </div>

      {/* ── FILTER & TOOLS UTILITY PANEL ── */}
      <div style={glassStyle}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '0.75rem', marginBottom: (!isMobile || showMobileDates) ? '0.75rem' : '0' }}>
          {/* Search (Wider search input with a clear 'X' button) */}
          <div style={{ position: 'relative', flex: isMobile ? 'none' : '2 1 300px' }}>
            <Search style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', width: '0.9375rem', height: '0.9375rem', color: '#8c909f', pointerEvents: 'none' }} />
            <input
              type="text" placeholder="Buscar por NS do projeto..." value={filterNs}
              onChange={e => setFilterNs(e.target.value)}
              className="dark-input font-sans"
              style={{ ...inputStyle, paddingLeft: '2.5rem', paddingRight: filterNs ? '2.5rem' : '1rem' }}
            />
            {filterNs && (
              <button
                onClick={() => setFilterNs('')}
                style={{
                  position: 'absolute',
                  right: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#8c909f',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '44px',
                  minWidth: '44px'
                }}
              >
                <X style={{ width: '0.875rem', height: '0.875rem' }} />
              </button>
            )}
          </div>

          {/* Type / Area Select (desktop only) */}
          {!isMobile && (
            <div style={{ flex: '1 1 200px' }}>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="dark-input font-sans animate-fade-in"
                style={{ ...inputStyle }}
              >
                <option value="">Todas as áreas</option>
                {ISSUE_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}

          {/* Toggle Dates Button (mobile only) */}
          {isMobile && (
            <button
              onClick={() => setShowMobileDates(!showMobileDates)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                minHeight: '44px',
                borderRadius: '0.75rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Calendar style={{ width: '0.9375rem', height: '0.9375rem', color: '#2d8cff' }} />
              {showMobileDates ? 'Ocultar Filtros de Data' : 'Filtrar por Data'}
            </button>
          )}

          {/* Date range picker (always on desktop, toggleable on mobile) */}
          {(!isMobile || showMobileDates) && (
            <div style={{ display: 'flex', gap: '0.5rem', flex: isMobile ? '1 1 auto' : '1.5 1 300px' }}>
              <input
                type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="dark-input font-sans" style={{ ...inputStyle, flex: 1 }}
                title="Data inicial"
              />
              <span style={{ display: 'flex', alignItems: 'center', color: '#8c909f', fontSize: '0.8125rem' }}>até</span>
              <input
                type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="dark-input font-sans" style={{ ...inputStyle, flex: 1 }}
                title="Data final"
              />
            </div>
          )}
        </div>

        {/* Legend strip inside panel */}
        {(!isMobile || showMobileDates) && (
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '0.75rem',
            alignItems: isMobile ? 'flex-start' : 'center',
            marginTop: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-outline)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Legenda do Tempo (Aberto):
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {[
                { label: 'Normal (< 4h)', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.25)' },
                { label: 'Alerta (4h-24h)', color: '#f0a500', bg: 'rgba(240, 165, 0, 0.12)', border: 'rgba(240, 165, 0, 0.25)' },
                { label: 'Atrasado (> 24h)', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.25)' }
              ].map(({ label, color, bg, border }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: isMobile ? '1 1 120px' : 'none' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                  <span style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color,
                    background: bg,
                    border: `1px solid ${border}`,
                    padding: '1px 6px',
                    borderRadius: '4px'
                  }}>{label}</span>
                </div>
              ))}
              
              {/* Reset date filter link */}
              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  style={{ marginLeft: isMobile ? '0' : 'auto', marginTop: isMobile ? '0.25rem' : '0', fontSize: '0.75rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 0', fontWeight: 600 }}
                >
                  <X style={{ width: '0.75rem', height: '0.75rem' }} /> Limpar filtros de data
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── QUICK CHIPS FILTER ROW ── */}
      <div style={{
        display: 'flex',
        flexWrap: 'nowrap',
        overflowX: 'auto',
        gap: '0.5rem',
        padding: '0.25rem 0 0.5rem 0',
        width: '100%',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }} className="premium-scroll">
        {[
          { label: 'Todos', value: 'Todos', activeColor: '#60a5fa', activeBg: 'rgba(45, 140, 255, 0.15)', activeBorder: 'rgba(45, 140, 255, 0.4)', count: chipCounts.Todos },
          { label: 'Portas', value: 'Portas', activeColor: '#34d399', activeBg: 'rgba(52, 211, 153, 0.15)', activeBorder: 'rgba(52, 211, 153, 0.4)', count: chipCounts.Portas },
          { label: 'Pintura', value: 'Pintura', activeColor: '#a78bfa', activeBg: 'rgba(167, 139, 250, 0.15)', activeBorder: 'rgba(167, 139, 250, 0.4)', count: chipCounts.Pintura },
          { label: 'Montagem', value: 'Montagem', activeColor: '#f472b6', activeBg: 'rgba(244, 114, 182, 0.15)', activeBorder: 'rgba(244, 114, 182, 0.4)', count: chipCounts.Montagem },
          { label: '⚠ Reincid.', value: 'Reincidência', activeColor: '#f0a500', activeBg: 'rgba(240, 165, 0, 0.15)', activeBorder: 'rgba(240, 165, 0, 0.5)', count: chipCounts.Reincidencia, isWarning: true }
        ].map(chip => {
          const isSelected = selectedChip === chip.value;
          return (
            <button
              key={chip.value}
              onClick={() => setSelectedChip(chip.value as any)}
              style={{
                flexShrink: 0,
                padding: '0.5rem 1rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: isSelected 
                  ? `1px solid ${chip.activeBorder}` 
                  : (chip.isWarning ? '1px solid rgba(240, 165, 0, 0.2)' : '1px solid rgba(255,255,255,0.06)'),
                background: isSelected 
                  ? chip.activeBg 
                  : (chip.isWarning ? 'rgba(240, 165, 0, 0.05)' : 'rgba(22, 27, 34, 0.6)'),
                color: isSelected 
                  ? chip.activeColor 
                  : (chip.isWarning ? '#f0a500' : '#8c909f'),
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                minHeight: '44px'
              }}
            >
              <span>{chip.label}</span>
              <span style={{ 
                fontSize: '0.6875rem', 
                background: isSelected ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)', 
                color: isSelected ? 'white' : '#64748b', 
                padding: '1px 6px', 
                borderRadius: '999px',
                fontFamily: "'JetBrains Mono', monospace"
              }}>{chip.count}</span>
            </button>
          );
        })}
      </div>

      {/* ── TOOLBAR: SELECTION + ACTIONS ── */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        width: '100%',
        background: 'rgba(22, 27, 34, 0.4)',
        border: '1px solid rgba(255,255,255,0.03)',
        borderRadius: '0.75rem',
        padding: '0.5rem 1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <label style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: '#cbd5e1',
            cursor: 'pointer',
            userSelect: 'none',
            minHeight: '44px'
          }}>
            <button
              onClick={toggleSelectAll}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: selectedIssues.size === filteredIssues.length && filteredIssues.length > 0 ? '#2d8cff' : '#424754',
                display: 'flex',
                padding: 0,
                minHeight: '44px',
                minWidth: '44px',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {selectedIssues.size === filteredIssues.length && filteredIssues.length > 0
                ? <CheckSquare style={{ width: '1.125rem', height: '1.125rem' }} />
                : <Square style={{ width: '1.125rem', height: '1.125rem' }} />}
            </button>
            Selecionar Todos os {filteredIssues.length} itens
          </label>
        </div>

        {/* Generate PDF Report button (Hidden for QUALIDADE role) */}
        {!isQualidade && (
          <button
            onClick={() => generatePdfReport(selectedIssues.size > 0 ? filteredIssues.filter(i => selectedIssues.has(i.id)) : filteredIssues, usersMap)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1.25rem',
              minHeight: '44px',
              borderRadius: '0.5rem',
              fontSize: '0.8125rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.25) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.05)'
            }}
          >
            <FileText style={{ width: '0.9375rem', height: '0.9375rem' }} />
            Gerar Relatório PDF
            <span style={{
              background: 'rgba(239, 68, 68, 0.25)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              padding: '1px 6px',
              borderRadius: '999px',
              fontSize: '0.6875rem',
              fontWeight: 800,
              marginLeft: '4px',
              fontFamily: "'JetBrains Mono', monospace"
            }}>
              {selectedIssues.size > 0 ? selectedIssues.size : filteredIssues.length}
            </span>
          </button>
        )}
      </div>

      {/* ── DESKTOP VIEW — FULL-WIDTH PREMIUM DATA TABLE ── */}
      {!isMobile && (
        <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '0.625rem', WebkitOverflowScrolling: 'touch' }} className="premium-scroll">
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.5rem', 
            minWidth: showCost ? '1300px' : '1180px' 
          }}>
          {/* Header bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: showCost 
              ? '40px 150px 90px 130px 3fr 2fr 130px 120px 160px' 
              : '40px 150px 90px 130px 3fr 2fr 130px 160px',
            gap: '0.75rem',
            padding: '0.75rem 1.125rem',
            color: 'var(--color-outline)',
            fontSize: '0.8125rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            background: 'rgba(22, 27, 34, 0.75)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '0.75rem',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Sel.</div>
            <div>Tipo / Área</div>
            <div>NS</div>
            <div>Data / Tempo</div>
            <div>Descrição do Problema</div>
            <div>Causa Raiz & Ação</div>
            <div>Recursos</div>
            {showCost && <div style={{ textAlign: 'right' }}>Custo Total</div>}
            <div style={{ textAlign: 'center' }}>Ações</div>
          </div>

          {/* Issue rows */}
          {filteredIssues.length > 0 ? filteredIssues.map((issue, index) => {
            const isWarning = isReincidencia(issue, data.issues);
            const rowBorderColor = isWarning ? '#f0a500' : 'transparent';
            
            return (
              <div
                key={issue.id}
                onClick={() => setSelectedIssueForDetail(issue)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: showCost 
                    ? '40px 150px 90px 130px 3fr 2fr 130px 120px 160px' 
                    : '40px 150px 90px 130px 3fr 2fr 130px 160px',
                  gap: '0.75rem',
                  alignItems: 'center',
                  background: index % 2 === 0 ? 'rgba(22, 27, 34, 0.8)' : 'rgba(13, 15, 20, 0.8)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderLeft: `3px solid ${rowBorderColor}`,
                  borderRadius: '0.75rem',
                  padding: '0.875rem 1.125rem',
                  transition: 'all 150ms ease',
                  cursor: 'pointer',
                  animation: 'fade-up 0.3s cubic-bezier(0.16,1,0.3,1) both',
                  animationDelay: `${Math.min(index * 20, 200)}ms`,
                  position: 'relative',
                  zIndex: activeMenuIssueId === issue.id ? 30 : 1,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(22, 27, 34, 0.95)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.borderLeftColor = isWarning ? '#f0a500' : '#2d8cff';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = index % 2 === 0 ? 'rgba(22, 27, 34, 0.8)' : 'rgba(13, 15, 20, 0.8)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.borderLeftColor = rowBorderColor;
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Checkbox column */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <button
                    onClick={e => { e.stopPropagation(); toggleSelection(issue.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: selectedIssues.has(issue.id) ? '#2d8cff' : '#424754', display: 'inline-flex', padding: 0 }}
                  >
                    {selectedIssues.has(issue.id) ? <CheckSquare style={{ width: '1.125rem', height: '1.125rem' }} /> : <Square style={{ width: '1.125rem', height: '1.125rem' }} />}
                  </button>
                </div>

                {/* Tipo / Área Badge */}
                <div>
                  <span style={{
                    display: 'inline-block',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.8125rem',
                    fontWeight: 800,
                    background: getAreaBadgeStyle(issue.type).bg,
                    border: getAreaBadgeStyle(issue.type).border,
                    color: getAreaBadgeStyle(issue.type).text,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%',
                  }} title={issue.type}>{issue.type}</span>
                </div>

                {/* Project NS with Warning Icon & Legend Tooltip */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#f1f5f9', fontSize: '0.9375rem', letterSpacing: '0.02em' }}>
                    {issue.projectNs}
                  </span>
                  {isWarning && (
                    <div style={{ position: 'relative', display: 'inline-flex' }} className="group">
                      <AlertTriangle style={{ width: '0.875rem', height: '0.875rem', color: '#f0a500', cursor: 'help' }} />
                      <div style={{
                        visibility: 'hidden',
                        width: '240px',
                        background: '#0d0f14',
                        border: '1px solid rgba(240, 165, 0, 0.4)',
                        color: '#cbd5e1',
                        textAlign: 'center',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        position: 'absolute',
                        zIndex: 100,
                        bottom: '125%',
                        left: '50%',
                        marginLeft: '-120px',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        lineHeight: 1.3,
                        boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                        pointerEvents: 'none'
                      }} className="group-hover:visible group-hover:opacity-100">
                        ⚠️ Alerta: Esta ocorrência envolve retrabalho (reincidente).
                      </div>
                    </div>
                  )}
                </div>

                 {/* Date + Reporter */}
                <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#e2e8f0', fontWeight: 500 }}>
                    <Calendar style={{ width: '0.8125rem', height: '0.8125rem', color: '#2d8cff', flexShrink: 0 }} />
                    {fmtDate(issue.date).split(',')[0]}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {renderResolutionTime(issue)}
                    {issue.status === 'FINALIZADA' && (issue.resolvedPhoto || (issue.resolvedPhotos && issue.resolvedPhotos.length > 0)) && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setLightboxPhotoUrl(issue.resolvedPhoto || issue.resolvedPhotos?.[0] || null);
                        }}
                        style={{
                          background: 'rgba(34, 197, 94, 0.1)',
                          border: '1px solid rgba(34, 197, 94, 0.25)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#22c55e',
                          transition: 'transform 0.15s ease',
                          marginLeft: '4px'
                        }}
                        title="Ver foto de confirmação da resolução"
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <Camera style={{ width: '0.75rem', height: '0.75rem' }} />
                      </button>
                    )}
                  </div>
                  {issue.reportedBy && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#8c909f', fontSize: '0.8125rem', marginTop: '0.2rem' }}>
                      <UserIcon style={{ width: '0.6875rem', height: '0.6875rem', color: '#22c55e', flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }} title={usersMap[issue.reportedBy]}>
                        {usersMap[issue.reportedBy] || 'Operador'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Description column - 2 lines max with ellipsis, inline micro-attachments */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {isWarning && (
                    <span style={{
                      alignSelf: 'flex-start',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      background: 'rgba(240, 165, 0, 0.12)',
                      border: '1px solid rgba(240, 165, 0, 0.25)',
                      color: '#f0a500',
                      marginBottom: '4px'
                    }}>
                      ⚠️ Reincidência
                    </span>
                  )}
                  <div 
                    className="line-clamp-2 hover:line-clamp-none transition-all duration-150 cursor-pointer"
                    style={{
                      color: '#cbd5e1',
                      fontSize: '0.9375rem',
                      lineHeight: 1.45,
                      wordBreak: 'break-word'
                    }} 
                    title="Hover para expandir texto completo"
                  >
                    {issue.description}
                  </div>
                  {issue.photos && issue.photos.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                      {issue.photos.map((photo, pIdx) => (
                        <div
                          key={pIdx}
                          style={{ position: 'relative', cursor: 'pointer' }}
                          onClick={() => { setSelectedIssueForModal(issue); setActivePhotoIndex(pIdx); }}
                        >
                          <img
                            src={photo}
                            alt="Anexo de qualidade"
                            style={{
                              width: '28px',
                              height: '28px',
                              objectFit: 'cover',
                              borderRadius: '4px',
                              border: '1px solid rgba(255,255,255,0.08)',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.transform = 'scale(1.08)';
                              e.currentTarget.style.borderColor = '#2d8cff';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Causa Raiz & Ação Badges */}
                <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {issue.rootCause && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Target style={{ width: '0.8125rem', height: '0.8125rem', color: getRootCauseStyle(issue.rootCause).text, flexShrink: 0 }} />
                      <span style={{
                        fontSize: '0.8125rem',
                        color: getRootCauseStyle(issue.rootCause).text,
                        fontWeight: 700,
                        background: getRootCauseStyle(issue.rootCause).bg,
                        border: getRootCauseStyle(issue.rootCause).border,
                        padding: '0.25rem 0.625rem',
                        borderRadius: '0.25rem',
                        display: 'inline-block'
                      }}>{issue.rootCause}</span>
                    </div>
                  )}
                  {issue.correctiveAction && (
                    <div style={{ display: 'flex', gap: '0.375rem', color: '#a7f3d0', marginTop: '0.125rem' }}>
                      <Wrench style={{ width: '0.8125rem', height: '0.8125rem', color: '#22c55e', flexShrink: 0, marginTop: '0.125rem' }} />
                      <span style={{ fontSize: '0.875rem', lineHeight: 1.3, wordBreak: 'break-word', color: '#c2c6d6' }}>
                        {issue.correctiveAction}
                      </span>
                    </div>
                  )}
                  {!issue.rootCause && !issue.correctiveAction && (
                    <span style={{ color: '#424754', fontStyle: 'italic', fontSize: '0.875rem' }}>—</span>
                  )}
                </div>

                {/* Resources column - Split into side-by-side micro-badges */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    background: 'rgba(240, 165, 0, 0.1)',
                    border: '1px solid rgba(240, 165, 0, 0.2)',
                    color: '#f0a500',
                    fontFamily: "'JetBrains Mono', monospace"
                  }} title="Tempo de retrabalho">
                    ⏱ {issue.timeSpent || 0}m
                  </span>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    background: 'rgba(45, 140, 255, 0.1)',
                    border: '1px solid rgba(45, 140, 255, 0.2)',
                    color: '#2d8cff',
                    fontFamily: "'JetBrains Mono', monospace"
                  }} title="Operadores envolvidos">
                    👷 {issue.peopleInvolved || 1}
                  </span>
                </div>

                {/* Total Cost Right-aligned bold monospaced */}
                {showCost && (
                  <div style={{
                    textAlign: 'right',
                    fontWeight: 800,
                    color: (issue.totalCost || 0) === 0 ? '#22c55e' : '#f0a500',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '1.0625rem',
                  }}>
                    {fmtCurrency(issue.totalCost || 0)}
                  </div>
                )}

                {/* Actions column - direct Finalizar button + 3-dot dropdown menu */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', position: 'relative' }} onClick={e => e.stopPropagation()}>
                  {issue.status !== 'FINALIZADA' && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setResolvingIssue(issue);
                        setResolutionPhotos([]);
                        setPhotoSource(null);
                      }}
                      style={{
                        background: 'rgba(34, 197, 94, 0.12)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: '0.375rem',
                        padding: '0.375rem 0.625rem',
                        color: '#22c55e',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        transition: 'all 0.15s',
                        whiteSpace: 'nowrap',
                        minHeight: '32px'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.5)';
                        e.currentTarget.style.transform = 'scale(1.02)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(34, 197, 94, 0.12)';
                        e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.3)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                      title="Resolver esta ocorrência"
                    >
                      <CheckCircle2 style={{ width: '0.875rem', height: '0.875rem' }} />
                      Resolver
                    </button>
                  )}

                  {issue.status === 'FINALIZADA' && (
                    <div
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '0.375rem',
                        padding: '0.375rem 0.625rem',
                        color: '#8c909f',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}
                      title="Ocorrência Finalizada"
                    >
                      <CheckCircle2 style={{ width: '0.875rem', height: '0.875rem', color: '#8c909f' }} />
                      Finalizada
                    </div>
                  )}

                  {/* Dropdown Menu Trigger (Hidden for QUALIDADE role since they cannot edit/delete) */}
                  {!isQualidade && (
                    <>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setActiveMenuIssueId(activeMenuIssueId === issue.id ? null : issue.id);
                        }}
                        style={{
                          background: 'none',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '0.375rem',
                          padding: '0.375rem',
                          color: '#8c909f',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                          e.currentTarget.style.color = 'white';
                          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                          e.currentTarget.style.color = '#8c909f';
                          e.currentTarget.style.background = 'none';
                        }}
                        title="Mais Ações"
                      >
                        <MoreVertical style={{ width: '0.875rem', height: '0.875rem' }} />
                      </button>

                      {/* Dropdown Menu Overlay */}
                      {activeMenuIssueId === issue.id && (
                        <div style={{
                          position: 'absolute',
                          right: '0',
                          top: '105%',
                          background: '#161b22',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '0.5rem',
                          padding: '4px',
                          width: '160px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                          zIndex: 50,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}>
                          <button
                            onClick={() => { setActiveMenuIssueId(null); handleStatusToggle(issue); }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              width: '100%',
                              padding: '6px 8px',
                              border: 'none',
                              background: 'none',
                              color: issue.status === 'FINALIZADA' ? '#f0a500' : '#22c55e',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              textAlign: 'left',
                              cursor: 'pointer',
                              borderRadius: '4px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            {issue.status === 'FINALIZADA'
                              ? <RotateCcw style={{ width: '0.875rem', height: '0.875rem' }} />
                              : <CheckCircle2 style={{ width: '0.875rem', height: '0.875rem' }} />}
                            {issue.status === 'FINALIZADA' ? 'Reabrir Ocorrência' : 'Finalizar Ocorrência'}
                          </button>
                          
                          <button
                            onClick={() => { setActiveMenuIssueId(null); startEditing(issue); }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              width: '100%',
                              padding: '6px 8px',
                              border: 'none',
                              background: 'none',
                              color: '#adc6ff',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              textAlign: 'left',
                              cursor: 'pointer',
                              borderRadius: '4px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            <Edit2 style={{ width: '0.875rem', height: '0.875rem' }} />
                            Editar Registro
                          </button>

                          <button
                            onClick={() => { setActiveMenuIssueId(null); onDelete?.(issue.id); }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              width: '100%',
                              padding: '6px 8px',
                              border: 'none',
                              background: 'none',
                              color: '#f87171',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              textAlign: 'left',
                              cursor: 'pointer',
                              borderRadius: '4px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />
                            Excluir Registro
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          }) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-outline)' }}>
              <AlertTriangle style={{ width: '2rem', height: '2rem', margin: '0 auto 0.75rem', opacity: 0.4 }} />
              <p style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Nenhuma ocorrência encontrada</p>
              <p style={{ fontSize: '0.8125rem', marginTop: '0.375rem', opacity: 0.6 }}>Tente ajustar os filtros acima</p>
            </div>
          )}
          </div>
        </div>
      )}

      {/* ── MOBILE VIEW (CARDS LIST) ── */}
      {isMobile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {filteredIssues.length > 0 ? filteredIssues.map((issue, idx) => {
            const isReinc = isReincidencia(issue, data.issues);
            const cardLeftBorderColor = isReinc ? '#f0a500' : '#2d8cff';
            const isExpanded = expandedCardIds.has(issue.id);
            const timeInfo = getMobileTimeDisplay(issue);

            return (
              <div 
                key={issue.id} 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIssueForDetail(issue);
                }}
                style={{
                  background: '#161b22', 
                  border: '1px solid #21262d',
                  borderRadius: '1.25rem', 
                  padding: '1.125rem', 
                  backdropFilter: 'blur(8px)',
                  borderLeft: `2.5px solid ${cardLeftBorderColor}`, 
                  position: 'relative',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  minHeight: '44px'
                }}
              >
                {/* Top Row: [TIPO/ÁREA badge] [reincidência badge if applicable] — right-aligned [NS number] */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '0.375rem', 
                      fontSize: '11px', 
                      fontWeight: 800, 
                      background: getAreaBadgeStyle(issue.type).bg,
                      border: getAreaBadgeStyle(issue.type).border,
                      color: getAreaBadgeStyle(issue.type).text,
                      textTransform: 'uppercase', 
                      letterSpacing: '0.05em' 
                    }}>
                      {issue.type}
                    </span>
                    {isReinc && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.375rem',
                        fontSize: '10px',
                        fontWeight: 800,
                        background: 'rgba(240, 165, 0, 0.12)',
                        border: '1px solid rgba(240, 165, 0, 0.25)',
                        color: '#f0a500'
                      }}>
                        ⚠️ Reincidência
                      </span>
                    )}
                  </div>
                  <span style={{ 
                    fontFamily: "'JetBrains Mono', monospace", 
                    fontWeight: 800, 
                    color: 'white', 
                    fontSize: '16px' 
                  }}>
                    {issue.projectNs}
                  </span>
                </div>

                {/* Description text (2 lines max, full text on tap/expand) */}
                <p 
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: '#cbd5e1',
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: isExpanded ? 'unset' : 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {issue.description}
                </p>

                {/* Attachments preview if available on mobile */}
                {issue.photos && issue.photos.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.375rem', overflowX: 'auto', padding: '0.125rem 0' }} onClick={e => e.stopPropagation()}>
                    {issue.photos.map((photo, pIdx) => (
                      <img
                        key={pIdx}
                        src={photo}
                        alt="Anexo"
                        onClick={() => { setSelectedIssueForModal(issue); setActivePhotoIndex(pIdx); }}
                        style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '0.375rem', border: '1px solid rgba(255,255,255,0.08)' }}
                      />
                    ))}
                  </div>
                )}

                {/* 3-column meta row: Tempo Aberto | Recursos | Custo (hidden for QUALIDADE role) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: showCost ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
                  gap: '0.5rem',
                  padding: '0.625rem 0',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  fontSize: '12px',
                  color: '#8c909f'
                }}>
                  {/* Tempo Aberto / Resolution Time */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                      {issue.status === 'FINALIZADA' ? 'Resolução' : 'Tempo Aberto'}
                    </span>
                    <span style={{ 
                      color: timeInfo.color,
                      fontWeight: 700,
                      fontFamily: "'JetBrains Mono', monospace"
                    }}>
                      {timeInfo.text}
                    </span>
                  </div>

                  {/* Recursos */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Recursos</span>
                    <span style={{ color: 'white', fontWeight: 600 }}>
                      ⏱{issue.timeSpent || 0}m | 👷{issue.peopleInvolved || 1}
                    </span>
                  </div>

                  {/* Custo (Only visible if showCost is true) */}
                  {showCost && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Custo</span>
                      <span style={{ 
                        color: (issue.totalCost || 0) === 0 ? '#22c55e' : '#f0a500', 
                        fontWeight: 800,
                        fontFamily: "'JetBrains Mono', monospace"
                      }}>
                        {fmtCurrency(issue.totalCost || 0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer: left = causa badge, right = "Resolver" green button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                  {/* Left: Causa Raiz badge */}
                  <div>
                    {issue.rootCause ? (
                      <span style={{
                        fontSize: '11px',
                        color: getRootCauseStyle(issue.rootCause).text,
                        fontWeight: 700,
                        background: getRootCauseStyle(issue.rootCause).bg,
                        border: getRootCauseStyle(issue.rootCause).border,
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.375rem',
                        display: 'inline-block'
                      }}>{issue.rootCause}</span>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#424754', fontStyle: 'italic' }}>Sem causa raiz</span>
                    )}
                  </div>

                  {/* Right: Resolver button or Finalizada status badge */}
                  <div>
                    {issue.status !== 'FINALIZADA' ? (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setResolvingIssue(issue);
                          setResolutionPhotos([]);
                          setPhotoSource(null);
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
                          border: 'none',
                          color: 'white',
                          borderRadius: '0.5rem',
                          padding: '0.5rem 1rem',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          minWidth: '100px',
                          minHeight: '44px',
                          boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)'
                        }}
                      >
                        <CheckCircle2 style={{ width: '0.875rem', height: '0.875rem' }} />
                        Resolver
                      </button>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '0.5rem',
                        padding: '0.5rem 1rem',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#8c909f',
                        minHeight: '44px'
                      }}>
                        ✓ Finalizada
                      </span>
                    )}
                  </div>
                </div>

              </div>
            );
          }) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#161b22', border: '1px dashed #21262d', borderRadius: '1rem' }}>
              <AlertTriangle style={{ width: '1.75rem', height: '1.75rem', color: '#f0a500', margin: '0 auto 0.5rem' }} />
              <p style={{ color: '#8c909f', fontSize: '0.8125rem', margin: 0 }}>Nenhuma ocorrência encontrada nesta aba.</p>
            </div>
          )}
        </div>
      )}

      {/* ── EDIT MODE MODAL OVERLAY ── */}
      {editingIssueId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          padding: isMobile ? '0.5rem' : '1.5rem',
        }}>
          <div style={{
            background: '#0b1329', border: '1px solid rgba(30,41,59,0.9)',
            borderRadius: '1.25rem', padding: '1.5rem', width: '100%', maxWidth: '650px',
            maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            position: 'relative',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: 'white' }}>Editar Ocorrência</h3>
              <button onClick={cancelEditing} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '0.25rem' }}>
                <X style={{ width: '1.25rem', height: '1.25rem' }} />
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
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f87171', fontFamily: "'JetBrains Mono', monospace" }}>
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem', marginTop: '1.25rem' }}>
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
        </div>
      )}

      {/* ── HIGH FIDELITY MULTI-PHOTO ZOOM LIGHTBOX (CAROUSEL MODAL) ── */}
      {selectedIssueForModal && selectedIssueForModal.photos && selectedIssueForModal.photos.length > 0 && (
        <div 
          onClick={() => setSelectedIssueForModal(null)} 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 1100, 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            background: 'rgba(2, 6, 23, 0.94)', 
            backdropFilter: 'blur(16px)', 
            WebkitBackdropFilter: 'blur(16px)', 
            padding: '1.5rem',
            userSelect: 'none'
          }}
        >
          {/* Close button with high-contrast safe area overlay */}
          <button 
            onClick={() => setSelectedIssueForModal(null)} 
            style={{
              position: 'absolute',
              top: 'calc(1.5rem + env(safe-area-inset-top, 0px))',
              right: 'calc(1.5rem + env(safe-area-inset-right, 0px))',
              color: 'white',
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              width: '3rem',
              height: '3rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease',
              zIndex: 1120
            }}
            onMouseEnter={e => { 
              e.currentTarget.style.transform = 'scale(1.08)'; 
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.85)'; 
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)'; 
            }}
            onMouseLeave={e => { 
              e.currentTarget.style.transform = 'scale(1)'; 
              e.currentTarget.style.background = 'rgba(30, 41, 59, 0.7)'; 
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'; 
            }}
          >
            <X style={{ width: '1.5rem', height: '1.5rem' }} />
          </button>

          {/* Carousel container */}
          <div 
            onClick={e => e.stopPropagation()} 
            style={{ 
              position: 'relative', 
              width: '100%', 
              maxWidth: '900px', 
              height: '70vh', 
              maxHeight: '650px',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: '1.25rem',
              overflow: 'hidden'
            }}
          >
            {/* Left arrow trigger */}
            {selectedIssueForModal.photos.length > 1 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePhotoIndex(prev => (prev - 1 + selectedIssueForModal.photos.length) % selectedIssueForModal.photos.length);
                }} 
                style={{
                  position: 'absolute',
                  left: '1rem',
                  color: 'white',
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '50%',
                  width: '3.25rem',
                  height: '3.25rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  transition: 'all 0.2s ease',
                  zIndex: 1115
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.background = 'rgba(59, 130, 246, 0.8)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(15, 23, 42, 0.65)'; }}
              >
                <ChevronLeft style={{ width: '1.75rem', height: '1.75rem' }} />
              </button>
            )}

            {/* Carousel active image */}
            <img 
              src={selectedIssueForModal.photos[activePhotoIndex]} 
              alt={`Evidência ${activePhotoIndex + 1}`} 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '100%', 
                objectFit: 'contain', 
                borderRadius: '0.75rem', 
                boxShadow: '0 25px 60px rgba(0,0,0,0.85)'
              }} 
            />

            {/* Right arrow trigger */}
            {selectedIssueForModal.photos.length > 1 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePhotoIndex(prev => (prev + 1) % selectedIssueForModal.photos.length);
                }} 
                style={{
                  position: 'absolute',
                  right: '1rem',
                  color: 'white',
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '50%',
                  width: '3.25rem',
                  height: '3.25rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  transition: 'all 0.2s ease',
                  zIndex: 1115
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.background = 'rgba(59, 130, 246, 0.8)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(15, 23, 42, 0.65)'; }}
              >
                <ChevronRight style={{ width: '1.75rem', height: '1.75rem' }} />
              </button>
            )}
          </div>

          {/* Carousel footer stats and dots */}
          <div 
            onClick={e => e.stopPropagation()} 
            style={{ 
              marginTop: '1.5rem', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '0.75rem',
              zIndex: 1110
            }}
          >
            {/* Carousel badge info */}
            <span style={{ 
              fontSize: '0.75rem', 
              fontWeight: 700, 
              color: '#94a3b8', 
              background: 'rgba(30, 41, 59, 0.6)', 
              padding: '0.375rem 1rem', 
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.05em'
            }}>
              IMAGEM {activePhotoIndex + 1} DE {selectedIssueForModal.photos.length}
            </span>

            {/* Dots */}
            {selectedIssueForModal.photos.length > 1 && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {selectedIssueForModal.photos.map((_, idx) => {
                  const isActive = idx === activePhotoIndex;
                  return (
                    <button 
                      key={idx}
                      onClick={() => setActivePhotoIndex(idx)}
                      style={{
                        width: isActive ? '1.25rem' : '0.5rem',
                        height: '0.5rem',
                        borderRadius: '9999px',
                        border: 'none',
                        background: isActive ? '#3b82f6' : 'rgba(255, 255, 255, 0.25)',
                        boxShadow: isActive ? '0 0 10px rgba(59, 130, 246, 0.5)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        padding: 0
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DETAILED OCCURRENCE INSPECTOR DRAWER ── */}
      {selectedIssueForDetail && (
        <>
          {/* Backdrop blur overlay */}
          <div 
            className="inspector-backdrop"
            onClick={() => setSelectedIssueForDetail(null)}
          />

          {/* Drawer container panel */}
          <div className="inspector-panel premium-scroll" onClick={(e) => e.stopPropagation()}>
            
            {/* Header section */}
            <div className="inspector-header">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Ocorrência #{selectedIssueForDetail.projectNs}
                </span>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>
                  {selectedIssueForDetail.type}
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {/* Status indicator badge */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.375rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  background: selectedIssueForDetail.status === 'FINALIZADA' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                  border: `1px solid ${selectedIssueForDetail.status === 'FINALIZADA' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                  color: selectedIssueForDetail.status === 'FINALIZADA' ? '#10b981' : '#f59e0b'
                }}>
                  <span style={{
                    width: '0.5rem',
                    height: '0.5rem',
                    borderRadius: '50%',
                    background: selectedIssueForDetail.status === 'FINALIZADA' ? '#10b981' : '#f59e0b',
                    boxShadow: selectedIssueForDetail.status === 'FINALIZADA' ? '0 0 8px #10b981' : '0 0 8px #f59e0b',
                    display: 'inline-block'
                  }} />
                  {selectedIssueForDetail.status || 'ABERTA'}
                </div>

                <button 
                  onClick={() => setSelectedIssueForDetail(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#94a3b8',
                    width: '2.25rem',
                    height: '2.25rem',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.color = 'white'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = '#94a3b8'; }}
                >
                  <X style={{ width: '1.25rem', height: '1.25rem' }} />
                </button>
              </div>
            </div>

            {/* Scrollable body content */}
            <div className="inspector-body premium-scroll">
              
              {/* DESCRIPTION CARD */}
              <div>
                <div className="inspector-section-title">
                  <FileText style={{ width: '0.875rem', height: '0.875rem' }} />
                  Descrição da Ocorrência
                </div>
                <div className="inspector-card" style={{ background: 'rgba(15, 23, 42, 0.65)' }}>
                  <p style={{
                    margin: 0,
                    fontSize: '1.05rem',
                    lineHeight: '1.65',
                    color: '#cbd5e1',
                    fontWeight: 400,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {selectedIssueForDetail.description}
                  </p>
                </div>
              </div>

              {/* CORE METADATA GRID */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div className="inspector-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <Calendar style={{ width: '0.875rem', height: '0.875rem', color: '#64748b' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Data do Registro</span>
                  </div>
                  <span style={{ fontSize: '0.925rem', fontWeight: 700, color: '#f8fafc' }}>
                    {fmtDate(selectedIssueForDetail.date)}
                  </span>
                </div>

                <div className="inspector-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <UserIcon style={{ width: '0.875rem', height: '0.875rem', color: '#64748b' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Registrado Por</span>
                  </div>
                  <span style={{ fontSize: '0.925rem', fontWeight: 700, color: '#f8fafc' }}>
                    {usersMap[selectedIssueForDetail.reportedBy] || selectedIssueForDetail.reportedBy}
                  </span>
                </div>
              </div>

              {/* TIMING & RESOLUTION INFO */}
              <div>
                <div className="inspector-section-title">
                  <Clock style={{ width: '0.875rem', height: '0.875rem' }} />
                  Informações de Tempo & Resolução
                </div>
                <div className="inspector-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(15, 23, 42, 0.45)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Status / Tempo:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#cbd5e1' }}>
                        {selectedIssueForDetail.status === 'FINALIZADA' ? 'Resolvido em ' : '⏱ Aberto por '}
                      </span>
                      {renderResolutionTime(selectedIssueForDetail)}
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '0.125rem' }}>Aberto em</span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#cbd5e1' }}>
                        {fmtDate(selectedIssueForDetail.date)}
                      </span>
                    </div>
                    {selectedIssueForDetail.status === 'FINALIZADA' && selectedIssueForDetail.resolvedAt && (
                      <div>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '0.125rem' }}>Resolvido em</span>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#cbd5e1' }}>
                          {fmtDate(selectedIssueForDetail.resolvedAt)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Resolution photo if exists */}
                  {selectedIssueForDetail.status === 'FINALIZADA' && selectedIssueForDetail.resolvedPhoto && (
                    <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.75rem' }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Foto de Confirmação</span>
                      <div 
                        onClick={() => {
                          setLightboxPhotoUrl(selectedIssueForDetail.resolvedPhoto || null);
                        }}
                        style={{
                          width: '120px',
                          height: '90px',
                          borderRadius: '0.5rem',
                          overflow: 'hidden',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          cursor: 'zoom-in',
                          position: 'relative',
                          transition: 'transform 0.18s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <img 
                          src={selectedIssueForDetail.resolvedPhoto} 
                          alt="Foto de Confirmação"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0,0,0,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0,
                          transition: 'opacity 0.2s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                        onMouseLeave={e => e.currentTarget.style.opacity = 0}
                        >
                          <Camera style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* COLLAPSIBLE REINCIDENCIA HISTORY */}
              {siblings.length > 0 && (
                <div>
                  <div 
                    onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                    className="inspector-section-title"
                    style={{ 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertTriangle style={{ width: '0.875rem', height: '0.875rem', color: '#f0a500' }} />
                      <span>Histórico de Reincidências ({siblings.length})</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {isHistoryExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                  
                  {isHistoryExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                      {siblings.map((sib) => (
                        <div 
                          key={sib.id}
                          onClick={() => {
                            setSelectedIssueForDetail(sib);
                          }}
                          style={{
                            background: 'rgba(240, 165, 0, 0.03)',
                            border: '1px solid rgba(240, 165, 0, 0.15)',
                            borderRadius: '0.75rem',
                            padding: '0.875rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            position: 'relative'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(240, 165, 0, 0.08)';
                            e.currentTarget.style.borderColor = 'rgba(240, 165, 0, 0.35)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(240, 165, 0, 0.03)';
                            e.currentTarget.style.borderColor = 'rgba(240, 165, 0, 0.15)';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f0a500' }}>
                              Ocorrência #{sib.projectNs}
                            </span>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '9999px',
                              fontSize: '0.625rem',
                              fontWeight: 700,
                              background: sib.status === 'FINALIZADA' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                              border: `1px solid ${sib.status === 'FINALIZADA' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                              color: sib.status === 'FINALIZADA' ? '#10b981' : '#f59e0b'
                            }}>
                              {sib.status || 'ABERTA'}
                            </div>
                          </div>
                          <p style={{
                            margin: '0 0 0.5rem 0',
                            fontSize: '0.875rem',
                            color: '#cbd5e1',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {sib.description}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.6875rem', color: '#64748b' }}>
                            <span>Registrado em: {fmtDate(sib.date)}</span>
                            <span>Por: {usersMap[sib.reportedBy] || sib.reportedBy}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ISHIKAWA 6M ROOT CAUSE */}
              <div>
                <div className="inspector-section-title">
                  <Target style={{ width: '0.875rem', height: '0.875rem' }} />
                  Causa Raiz (Ishikawa 6M)
                </div>
                <div className="inspector-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    color: '#60a5fa',
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Wrench style={{ width: '1.25rem', height: '1.25rem' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Categoria do Desvio</span>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                      {selectedIssueForDetail.rootCause || 'Não categorizada'}
                    </span>
                  </div>
                </div>
              </div>

              {/* CORRECTIVE ACTION */}
              <div>
                <div className="inspector-section-title">
                  <CheckSquare style={{ width: '0.875rem', height: '0.875rem' }} />
                  Ação Corretiva Aplicada
                </div>
                <div className="inspector-card" style={{ background: 'rgba(16, 185, 129, 0.03)', borderColor: 'rgba(16, 185, 129, 0.1)' }}>
                  <p style={{
                    margin: 0,
                    fontSize: '1rem',
                    lineHeight: '1.6',
                    color: '#e2e8f0',
                    fontWeight: 400,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {selectedIssueForDetail.correctiveAction || 'Nenhuma ação corretiva registrada ainda.'}
                  </p>
                </div>
              </div>

              {/* REWORK RESOURCE ESTIMATION & COST GRID */}
              <div>
                <div className="inspector-section-title">
                  <DollarSign style={{ width: '0.875rem', height: '0.875rem' }} />
                  Recursos & Custos de Retrabalho
                </div>
                <div className="inspector-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Grid details */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Tempo Gasto</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#f8fafc', fontWeight: 700 }}>
                        <Clock style={{ width: '0.875rem', height: '0.875rem', color: '#94a3b8' }} />
                        <span>{selectedIssueForDetail.timeSpent || 0} min</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Envolvidos</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#f8fafc', fontWeight: 700 }}>
                        <Users style={{ width: '0.875rem', height: '0.875rem', color: '#94a3b8' }} />
                        <span>{selectedIssueForDetail.peopleInvolved || 1} colab.</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Custo Material</span>
                      <span style={{ color: '#f8fafc', fontWeight: 700 }}>
                        {fmtCurrency(selectedIssueForDetail.materialCost || 0)}
                      </span>
                    </div>

                  </div>

                  {/* Highlighted total cost */}
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.875rem 1.125rem',
                    borderRadius: '0.75rem',
                    background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%)',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Custo Total do Impacto</span>
                      <span style={{ fontSize: '0.625rem', color: '#64748b' }}>Tempo × Pessoas × Taxa + Material</span>
                    </div>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f87171', fontFamily: "'JetBrains Mono', monospace" }}>
                      {fmtCurrency(selectedIssueForDetail.totalCost || 0)}
                    </span>
                  </div>

                </div>
              </div>

              {/* PHOTO GALLERY EVIDENCE */}
              {selectedIssueForDetail.photos && selectedIssueForDetail.photos.length > 0 && (
                <div>
                  <div className="inspector-section-title">
                    <ImageIcon style={{ width: '0.875rem', height: '0.875rem' }} />
                    Evidências Fotográficas ({selectedIssueForDetail.photos.length})
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                    gap: '0.75rem'
                  }}>
                    {selectedIssueForDetail.photos.map((photoUrl, idx) => (
                      <div 
                        key={idx}
                        onClick={() => {
                          setSelectedIssueForModal(selectedIssueForDetail);
                          setActivePhotoIndex(idx);
                        }}
                        style={{
                          aspectRatio: '1',
                          borderRadius: '0.75rem',
                          overflow: 'hidden',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          cursor: 'zoom-in',
                          position: 'relative',
                          transition: 'transform 0.18s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <img 
                          src={photoUrl} 
                          alt={`Evidência ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0,0,0,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0,
                          transition: 'opacity 0.2s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                        onMouseLeave={e => e.currentTarget.style.opacity = 0}
                        >
                          <ImageIcon style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Sticky Actions Footer */}
            <div className="inspector-footer">
              {/* Quick status change for managers */}
              {isGestor && (
                <button
                  onClick={() => handleStatusToggle(selectedIssueForDetail)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.625rem 1.125rem',
                    borderRadius: '0.75rem',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: selectedIssueForDetail.status === 'FINALIZADA' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    border: `1px solid ${selectedIssueForDetail.status === 'FINALIZADA' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                    color: selectedIssueForDetail.status === 'FINALIZADA' ? '#eab308' : '#10b981',
                    marginRight: 'auto',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = selectedIssueForDetail.status === 'FINALIZADA' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(16, 185, 129, 0.2)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = selectedIssueForDetail.status === 'FINALIZADA' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(16, 185, 129, 0.1)';
                  }}
                >
                  {selectedIssueForDetail.status === 'FINALIZADA' ? (
                    <>
                      <RotateCcw style={{ width: '0.875rem', height: '0.875rem' }} />
                      Reabrir Ocorrência
                    </>
                  ) : (
                    <>
                      <CheckCircle2 style={{ width: '0.875rem', height: '0.875rem' }} />
                      Finalizar Ocorrência
                    </>
                  )}
                </button>
              )}

              {/* Standard actions (edit/delete) */}
              <button
                onClick={() => {
                  startEditing(selectedIssueForDetail);
                  setSelectedIssueForDetail(null);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.125rem',
                  borderRadius: '0.75rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#e2e8f0',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
              >
                <Edit2 style={{ width: '0.875rem', height: '0.875rem' }} />
                Editar
              </button>

              {isGestor && onDelete && (
                <button
                  onClick={() => {
                    if (confirm('Tem certeza que deseja excluir permanentemente esta ocorrência?')) {
                      onDelete(selectedIssueForDetail.id);
                      setSelectedIssueForDetail(null);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.625rem 1.125rem',
                    borderRadius: '0.75rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                    color: '#f87171',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                >
                  <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />
                  Excluir
                </button>
              )}
            </div>

          </div>
        </>
      )}

      {/* ── RESOLUTION CONFIRMATION MODAL ── */}
      {resolvingIssue && (() => {
        const start = new Date(resolvingIssue.date).getTime();
        const diffMs = nowDate.getTime() - start;
        const timeOpenText = getFormattedDuration(diffMs);

        return (
          <>
            <div 
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1050,
                background: 'rgba(2, 6, 23, 0.85)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)'
              }}
              onClick={() => {
                setResolvingIssue(null);
                setResolutionPhotos([]);
                setPhotoSource(null);
              }}
            />
            <div 
              style={isMobile ? {
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1060,
                width: '100%',
                maxWidth: '100%',
                background: '#0d1117',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                borderTopLeftRadius: '1.25rem',
                borderTopRightRadius: '1.25rem',
                padding: '1.5rem',
                boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                animation: 'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              } : {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 1060,
                width: '90%',
                maxWidth: '500px',
                background: '#0d1117',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '1rem',
                padding: '1.5rem',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                animation: 'fade-in-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 style={{ width: '1.25rem', height: '1.25rem', color: '#22c55e' }} />
                    Confirmar resolução
                  </h3>
                  <span style={{ fontSize: '0.8125rem', color: '#8c909f', fontWeight: 500 }}>
                    {resolvingIssue.description} — <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: 'white' }}>{resolvingIssue.projectNs}</span>
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    background: 'rgba(34, 197, 94, 0.12)',
                    color: '#22c55e',
                    border: '1px solid rgba(34, 197, 94, 0.25)',
                    padding: '3px 8px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace"
                  }}>
                    Aberto há {timeOpenText}
                  </span>
                  <button 
                    onClick={() => {
                      setResolvingIssue(null);
                      setResolutionPhotos([]);
                      setPhotoSource(null);
                    }}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X style={{ width: '1.25rem', height: '1.25rem' }} />
                  </button>
                </div>
              </div>

              {/* Photo Source Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Origem da Foto
                </span>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setPhotoSource('camera')}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      background: photoSource === 'camera' ? 'rgba(45, 140, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: sourceError 
                        ? '1px solid #ef4444' 
                        : (photoSource === 'camera' ? '1px solid #2d8cff' : '1px solid rgba(255, 255, 255, 0.08)'),
                      color: photoSource === 'camera' ? '#2d8cff' : '#94a3b8',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      minHeight: '44px',
                      animation: sourceError ? 'shake 0.3s ease-in-out' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Camera style={{ width: '1.25rem', height: '1.25rem' }} />
                    Câmera
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoSource('gallery')}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      background: photoSource === 'gallery' ? 'rgba(45, 140, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: sourceError 
                        ? '1px solid #ef4444' 
                        : (photoSource === 'gallery' ? '1px solid #2d8cff' : '1px solid rgba(255, 255, 255, 0.08)'),
                      color: photoSource === 'gallery' ? '#2d8cff' : '#94a3b8',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      minHeight: '44px',
                      animation: sourceError ? 'shake 0.3s ease-in-out' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <ImageIcon style={{ width: '1.25rem', height: '1.25rem' }} />
                    Galeria
                  </button>
                </div>
              </div>

              {/* Photo grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Fotos da Resolução ({resolutionPhotos.length}/5)
                </span>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '0.75rem', 
                  marginTop: '0.25rem' 
                }}>
                  {resolutionPhotos.map((photo, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        position: 'relative', 
                        aspectRatio: '1', 
                        borderRadius: '0.5rem', 
                        overflow: 'hidden', 
                        border: '1px solid rgba(255, 255, 255, 0.1)' 
                      }}
                    >
                      <img 
                        src={photo} 
                        alt={`Resolução ${idx + 1}`} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                      <button 
                        type="button"
                        onClick={() => removeResolutionPhoto(idx)}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          background: 'rgba(239, 68, 68, 0.85)',
                          border: 'none',
                          color: 'white',
                          borderRadius: '50%',
                          width: '1.5rem',
                          height: '1.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          minWidth: '24px',
                          minHeight: '24px',
                          zIndex: 10
                        }}
                      >
                        <X style={{ width: '0.875rem', height: '0.875rem' }} />
                      </button>
                    </div>
                  ))}
                  
                  {resolutionPhotos.length < 5 && (
                    <button
                      type="button"
                      onClick={handleAddClick}
                      disabled={isUploadingPhotos}
                      style={{
                        aspectRatio: '1',
                        borderRadius: '0.5rem',
                        border: sourceError ? '2px dashed #ef4444' : '2px dashed rgba(255, 255, 255, 0.1)',
                        background: 'rgba(255, 255, 255, 0.01)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem',
                        cursor: 'pointer',
                        color: '#64748b',
                        transition: 'all 0.15s ease',
                        animation: sourceError ? 'shake 0.3s ease-in-out' : 'none',
                        minHeight: '44px'
                      }}
                    >
                      {isUploadingPhotos ? (
                        <span style={{ fontSize: '0.75rem', color: '#2d8cff', fontWeight: 600 }}>Carregando...</span>
                      ) : (
                        <>
                          <Plus style={{ width: '1.5rem', height: '1.5rem' }} />
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Adicionar</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  {resolutionPhotos.length === 0 ? 'nenhuma foto adicionada' : `${resolutionPhotos.length} foto(s) adicionada(s)`}
                </span>
              </div>

              {/* Hidden File Inputs */}
              <input 
                type="file" 
                id="resolution-camera-input" 
                accept="image/*" 
                capture="environment"
                onChange={handleResolutionPhotoAdd}
                style={{ display: 'none' }}
              />
              <input 
                type="file" 
                id="resolution-gallery-input" 
                accept="image/*" 
                onChange={handleResolutionPhotoAdd}
                style={{ display: 'none' }}
              />

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setResolvingIssue(null);
                    setResolutionPhotos([]);
                    setPhotoSource(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#94a3b8',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    minHeight: '44px'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmResolution}
                  disabled={isUploadingPhotos}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
                    border: 'none',
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.25)',
                    opacity: isUploadingPhotos ? 0.6 : 1,
                    minHeight: '44px'
                  }}
                >
                  Resolver
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── RESOLVED PHOTO LIGHTBOX ── */}
      {lightboxPhotoUrl && (
        <div 
          onClick={() => setLightboxPhotoUrl(null)} 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 1200, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: 'rgba(2, 6, 23, 0.95)', 
            backdropFilter: 'blur(16px)', 
            WebkitBackdropFilter: 'blur(16px)', 
            padding: '1.5rem',
            userSelect: 'none'
          }}
        >
          <button 
            onClick={() => setLightboxPhotoUrl(null)} 
            style={{
              position: 'absolute',
              top: '1.5rem',
              right: '1.5rem',
              color: 'white',
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              width: '3rem',
              height: '3rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease'
            }}
          >
            <X style={{ width: '1.5rem', height: '1.5rem' }} />
          </button>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <img src={lightboxPhotoUrl} alt="Visualização da Resolução" style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} />
          </div>
        </div>
      )}

      {/* Floating success toast */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1100,
          background: '#22c55e',
          color: 'white',
          padding: '0.75rem 1.5rem',
          borderRadius: '50px',
          fontWeight: 700,
          fontSize: '0.9375rem',
          boxShadow: '0 10px 25px rgba(34, 197, 94, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          animation: 'fade-in-up 0.25s ease-out'
        }}>
          <CheckCircle2 style={{ width: '1.25rem', height: '1.25rem' }} />
          {toastMessage}
        </div>
      )}

    </div>
  );
};
