
import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, ComposedChart, Area
} from 'recharts';
import { Sparkles, BarChart3, PieChart as PieIcon, Download, Clock, Filter, TrendingDown, AlertTriangle, Lightbulb, ChevronDown, Bot, Timer, Percent, DollarSign, Users, Hash, TrendingUp, Repeat, User as UserIcon } from 'lucide-react';
import { AppState, User, IssueRecord } from '../types';
import { analyzePerformance } from '../services/geminiService';
import { fetchUsers } from '../services/storageService';
import { CustomDatePicker } from './CustomDatePicker';

interface DashboardProps {
  data: AppState;
  currentUser: User;
}

const CHART_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);


const S = {
  card: {
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--r-lg)',
    padding: '1.5rem',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    boxShadow: 'var(--glass-shadow)',
    transition: 'transform 0.2s ease, border-color 0.2s ease',
  } as React.CSSProperties,
  label: { fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-outline)', textTransform: 'uppercase' as const, letterSpacing: '0.08em' },
  sectionTitle: { fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-on-surface)', display: 'flex', alignItems: 'center', gap: '0.5rem' },
};


export const Dashboard: React.FC<DashboardProps> = ({ data, currentUser }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const truncateText = (text: string, length = 12) => {
    if (!text) return '';
    if (text.length <= length) return text;
    return `${text.slice(0, length)}...`;
  };

  const cardStyle = useMemo(() => ({
    ...S.card,
    padding: isMobile ? '1rem' : '1.5rem',
  }), [isMobile]);

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [costChartDate, setCostChartDate] = useState({ start: '', end: '' });
  const [issuePieDate, setIssuePieDate] = useState({ start: '', end: '' });
  const [reworkTimeByAreaDate, setReworkTimeByAreaDate] = useState({ start: '', end: '' });
  const [users, setUsers] = useState<User[]>([]);

  const usersMap = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach(u => {
      map[u.id] = u.name;
      if (u.username) {
        map[u.username] = u.name;
      }
    });
    return map;
  }, [users]);

  // Sincroniza todos os sub-filtros de gráficos ao alterar o filtro principal de datas
  useEffect(() => {
    setCostChartDate({ start: startDate, end: endDate });
    setIssuePieDate({ start: startDate, end: endDate });
    setReworkTimeByAreaDate({ start: startDate, end: endDate });
  }, [startDate, endDate]);

  useEffect(() => {
    fetchUsers().then(setUsers);
  }, []);

  const isRestrictedRole = ['QUALIDADE', 'PROCESSOS'].includes(currentUser.role);

  const filterByDate = (items: any[], startStr: string, endStr: string, field: string) => {
    if (!startStr && !endStr) return items;
    const s = startStr ? new Date(startStr + 'T00:00:00').getTime() : 0;
    const e = endStr ? new Date(endStr + 'T23:59:59.999').getTime() : Infinity;
    return items.filter(item => {
      const val = item[field];
      if (!val) return false;
      const d = new Date(String(val)).getTime();
      return d >= s && d <= e;
    });
  };

  const filteredProjects = useMemo(() => filterByDate(
    data.projects.filter(p => p.status === 'COMPLETED'), startDate, endDate, 'endTime'
  ), [data.projects, startDate, endDate]);

  const filteredIssues = useMemo(() => filterByDate(data.issues, startDate, endDate, 'date'), [data.issues, startDate, endDate]);

  const filteredInnovations = useMemo(() => filterByDate(data.innovations, startDate, endDate, 'createdAt'), [data.innovations, startDate, endDate]);

  const averageTimes = useMemo(() => {
    const sums: Record<string, { total: number; count: number }> = {};
    filteredProjects.forEach(p => {
      if (!sums[p.type]) sums[p.type] = { total: 0, count: 0 };
      sums[p.type].total += p.totalActiveSeconds;
      sums[p.type].count += 1;
    });
    return Object.entries(sums).map(([type, s]) => ({ type, avgSeconds: Math.round(s.total / s.count) }));
  }, [filteredProjects]);

  const totalReworkCost = useMemo(() => filteredIssues.reduce((a, c) => a + (c.totalCost || 0), 0), [filteredIssues]);

  const totalReworkMinutes = useMemo(() => filteredIssues.reduce((a, c) => a + (c.timeSpent || 0), 0), [filteredIssues]);

  const reworkTimeByAreaData = useMemo(() => {
    const filtered = filterByDate(data.issues, reworkTimeByAreaDate.start, reworkTimeByAreaDate.end, 'date');
    const byArea = filtered.reduce((acc, curr) => {
      if (curr.timeSpent && curr.timeSpent > 0) {
        acc[curr.type] = (acc[curr.type] || 0) + curr.timeSpent;
      }
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(byArea)
      .map(([name, value]) => ({ name, value: Number(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [data.issues, reworkTimeByAreaDate]);

  const totalSavings = useMemo(() =>
    filteredInnovations.filter(i => i.status === 'APPROVED' || i.status === 'IMPLEMENTED')
      .reduce((a, c) => a + (c.totalAnnualSavings || 0), 0),
    [filteredInnovations]);

  // New quality KPIs
  const reworkRate = useMemo(() => {
    if (filteredProjects.length === 0) return 0;
    const projectsWithIssues = new Set(filteredIssues.map(i => i.projectNs)).size;
    return Math.round((projectsWithIssues / filteredProjects.length) * 100);
  }, [filteredProjects, filteredIssues]);

  const avgReworkCost = useMemo(() => {
    const withCost = filteredIssues.filter(i => i.totalCost && i.totalCost > 0);
    return withCost.length > 0 ? withCost.reduce((a, c) => a + (c.totalCost || 0), 0) / withCost.length : 0;
  }, [filteredIssues]);

  const avgReworkTime = useMemo(() => {
    const withTime = filteredIssues.filter(i => i.timeSpent && i.timeSpent > 0);
    return withTime.length > 0 ? Math.round(withTime.reduce((a, c) => a + (c.timeSpent || 0), 0) / withTime.length) : 0;
  }, [filteredIssues]);



  const totalIssueCount = filteredIssues.length;

  // Monthly trend data
  const monthlyTrendData = useMemo(() => {
    const byMonth: Record<string, number> = {};
    filteredIssues.forEach(i => {
      const d = new Date(i.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] || 0) + 1;
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));
  }, [filteredIssues]);

  // Monthly cost trend
  const monthlyCostData = useMemo(() => {
    const byMonth: Record<string, number> = {};
    filteredIssues.forEach(i => {
      const d = new Date(i.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] || 0) + (i.totalCost || 0);
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, cost]) => ({ month, cost }));
  }, [filteredIssues]);

  // Pareto data
  const paretoData = useMemo(() => {
    const byType: Record<string, number> = {};
    filteredIssues.forEach(i => { byType[i.type] = (byType[i.type] || 0) + 1; });
    const sorted = Object.entries(byType)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const total = sorted.reduce((a, c) => a + c.value, 0);
    let cumulative = 0;
    return sorted.map(item => {
      cumulative += item.value;
      return { ...item, cumPercent: total > 0 ? Math.round((cumulative / total) * 100) : 0 };
    });
  }, [filteredIssues]);

  // Top NS reincidentes
  const topNsData = useMemo(() => {
    const byNs: Record<string, number> = {};
    filteredIssues.forEach(i => { byNs[i.projectNs] = (byNs[i.projectNs] || 0) + 1; });
    return Object.entries(byNs)
      .map(([name, value]) => ({ name: `NS ${name}`, value }))
      .sort((a, b) => b.value - a.value)
      .filter(i => i.value > 1)
      .slice(0, 8);
  }, [filteredIssues]);

  // Issues by reporter
  const issuesByReporterData = useMemo(() => {
    const userMap: Record<string, string> = {};
    users.forEach(u => { userMap[u.id] = u.name; userMap[u.username] = u.name; });
    const byReporter: Record<string, number> = {};
    filteredIssues.forEach(i => {
      const reporterId = i.reportedBy || 'Não informado';
      const reporterName = userMap[reporterId] || reporterId;
      byReporter[reporterName] = (byReporter[reporterName] || 0) + 1;
    });
    return Object.entries(byReporter)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredIssues, users]);

  const costByTypeData = useMemo(() => {
    const filtered = filterByDate(data.issues, costChartDate.start, costChartDate.end, 'date');
    const costs = filtered.reduce((acc, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + (curr.totalCost || 0);
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(costs)
      .map(([name, value]) => ({ name, value: Number(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [data.issues, costChartDate]);

  const pieData = useMemo(() => {
    const filtered = filterByDate(data.issues, issuePieDate.start, issuePieDate.end, 'date');
    const byType = filtered.reduce((acc, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(byType).map(([name, value]) => ({ name, value }));
  }, [data.issues, issuePieDate]);

  const handleAiAnalysis = async () => {
    setIsLoadingAi(true);
    const result = await analyzePerformance(filteredProjects, filteredIssues);
    setAiAnalysis(result);
    setIsLoadingAi(false);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'NS', 'Codigo', 'Tipo', 'Implemento', 'Inicio', 'Fim', 'Tempo(s)', 'Status', 'Notas'];
    const rows = filteredProjects.map(p =>
      [p.id, p.ns, p.projectCode || '', p.type, p.implementType || '', p.startTime, p.endTime || '', p.totalActiveSeconds, p.status, `"${(p.notes || '').replace(/"/g, '""')}"`].join(',')
    );
    const csv = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const a = document.createElement('a');
    a.setAttribute('href', encodeURI(csv));
    a.setAttribute('download', `qualitytracker_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const isSimilarText = (str1: string, str2: string): boolean => {
    const clean = (s: string) => 
      s.toLowerCase()
       .normalize("NFD")
       .replace(/[\u0300-\u036f]/g, "")
       .replace(/[^a-z0-9\s]/g, "")
       .trim();
    
    const n1 = clean(str1);
    const n2 = clean(str2);
    if (n1 === n2) return true;
    if (!n1 || !n2) return false;
    
    if (n1.length > 5 && n2.length > 5) {
      if (n1.includes(n2) || n2.includes(n1)) return true;
    }
    
    const w1 = new Set(n1.split(/\s+/).filter(w => w.length > 2));
    const w2 = new Set(n2.split(/\s+/).filter(w => w.length > 2));
    if (w1.size === 0 || w2.size === 0) return false;
    
    let intersection = 0;
    w1.forEach(w => { if (w2.has(w)) intersection++; });
    const union = new Set([...w1, ...w2]).size;
    const jaccard = intersection / union;
    
    return jaccard >= 0.5;
  };

  const getReincidentIssues = (issue: IssueRecord, allIssues: IssueRecord[]) => {
    return allIssues.filter(i => 
      i.id !== issue.id && 
      i.projectNs.trim().toLowerCase() === issue.projectNs.trim().toLowerCase() &&
      i.type === issue.type &&
      isSimilarText(i.description || '', issue.description || '')
    );
  };

  const isReincidencia = (issue: IssueRecord, allIssues: IssueRecord[]): boolean => {
    return getReincidentIssues(issue, allIssues).length > 0;
  };

  const exportIssuesToExcel = (
    issues: IssueRecord[],
    currentUsersMap: Record<string, string>,
    startStr: string = '',
    endStr: string = ''
  ) => {
    const headers = [
      'Nº Ocorrência (NS)',
      'Área / Setor',
      'Descrição',
      'Causa Raiz',
      'Ação Corretiva',
      'Status',
      'Criado Por',
      'Resolvido Por',
      'Custo Total (R$)',
      'Tempo Gasto (Minutos)',
      'Data de Abertura',
      'Fotos de Abertura',
      'Data de Resolução',
      'Fotos de Resolução',
      'É Reincidência?'
    ];

    const rows = issues.map(issue => {
      const sanitize = (val: any) => {
        if (val === undefined || val === null) return '';
        return String(val)
          .replace(/;/g, ',')
          .replace(/\r?\n|\r/g, ' ')
          .trim();
      };

      const costStr = issue.totalCost !== undefined ? String(issue.totalCost).replace('.', ',') : '';
      
      const formatExcelDate = (isoString?: string) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleString('pt-BR');
      };

      const formatExcelPhotos = (photoList?: string[]) => {
        if (!photoList || photoList.length === 0) return '';
        if (photoList.length === 1) {
          return `=HYPERLINK("${photoList[0]}"; "Ver Foto")`;
        }
        return photoList.join(', ');
      };

      const reinc = isReincidencia(issue, data.issues) ? 'Sim' : 'Não';
      const openingPhotos = issue.photos || [];
      const resPhotos = issue.resolvedPhotos || (issue.resolvedPhoto ? [issue.resolvedPhoto] : []);

      return [
        sanitize(issue.projectNs),
        sanitize(issue.type),
        sanitize(issue.description),
        sanitize(issue.rootCause),
        sanitize(issue.correctiveAction),
        sanitize(issue.status || 'ABERTA'),
        sanitize(currentUsersMap[issue.reportedBy || ''] || issue.reportedBy || ''),
        sanitize(currentUsersMap[issue.resolvedBy || ''] || issue.resolvedBy || ''),
        costStr,
        issue.timeSpent || '',
        formatExcelDate(issue.date),
        formatExcelPhotos(openingPhotos),
        issue.status === 'FINALIZADA' ? formatExcelDate(issue.resolvedAt || issue.date) : '',
        formatExcelPhotos(resPhotos),
        reinc
      ].join(';');
    });

    const pad = ';'.repeat(headers.length - 1);
    const titleRow = `QualityTracker - Relatório de Ocorrências de Qualidade${pad}`;
    
    const dateStartStr = startStr ? new Date(startStr + 'T00:00:00').toLocaleDateString('pt-BR') : '';
    const dateEndStr = endStr ? new Date(endStr + 'T23:59:59').toLocaleDateString('pt-BR') : '';
    const periodText = (dateStartStr || dateEndStr)
      ? `Período: ${dateStartStr || 'Início'} até ${dateEndStr || 'Hoje'}`
      : 'Período: Histórico Completo';
    const periodRow = `${periodText}${pad}`;
    
    const emissionRow = `Data de Emissão: ${new Date().toLocaleString('pt-BR')}${pad}`;
    const totalRowText = `Total de Ocorrências Filtradas: ${issues.length}${pad}`;
    const emptyRow = pad;

    const csvContent = '\uFEFF' + [
      titleRow,
      periodRow,
      emissionRow,
      totalRowText,
      emptyRow,
      headers.join(';'),
      ...rows
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_ocorrencias_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const DatePicker = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
    <CustomDatePicker value={value} onChange={onChange} label={label} />
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: 'rgba(2,6,23,0.95)', border: '1px solid rgba(30,41,59,0.9)',
        borderRadius: '0.625rem', padding: '0.625rem 0.875rem', fontSize: '0.8125rem', color: '#e2e8f0',
      }}>
        <p style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#94a3b8' }}>{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>{p.name}: <strong>{typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}</strong></p>
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Date filter bar */}
      <div className="dash-card" style={{ ...cardStyle, padding: '1.25rem 1.5rem', position: 'relative', zIndex: 50 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontWeight: 600, fontSize: '0.875rem' }}>
            <Filter style={{ width: '1rem', height: '1rem', color: '#3b82f6' }} />
            Período de Análise
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, maxWidth: '500px' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <DatePicker value={startDate} onChange={setStartDate} label="De" />
              <DatePicker value={endDate} onChange={setEndDate} label="Até" />
            </div>
            
            {/* Presets */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {[
                { label: 'Últimos 30 dias', value: '30days' },
                { label: 'Mês Atual', value: 'current' },
                { label: 'Mês Passado', value: 'last' },
                { label: 'Limpar', value: 'clear' }
              ].map(preset => {
                const toLocalDateString = (d: Date) => {
                  const year = d.getFullYear();
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  return `${year}-${month}-${day}`;
                };

                const applyPreset = () => {
                  if (preset.value === 'clear') {
                    setStartDate('');
                    setEndDate('');
                    return;
                  }
                  const today = new Date();
                  if (preset.value === '30days') {
                    const past30 = new Date();
                    past30.setDate(today.getDate() - 30);
                    setStartDate(toLocalDateString(past30));
                    setEndDate(toLocalDateString(today));
                  } else if (preset.value === 'current') {
                    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    setStartDate(toLocalDateString(firstDay));
                    setEndDate(toLocalDateString(lastDay));
                  } else if (preset.value === 'last') {
                    const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                    setStartDate(toLocalDateString(firstDayLastMonth));
                    setEndDate(toLocalDateString(lastDayLastMonth));
                  }
                };

                // Check if this preset matches active filters to highlight it
                let isActive = false;
                const today = new Date();
                if (preset.value === '30days' && startDate && endDate) {
                  const past30 = new Date();
                  past30.setDate(today.getDate() - 30);
                  isActive = startDate === toLocalDateString(past30) && endDate === toLocalDateString(today);
                } else if (preset.value === 'current' && startDate && endDate) {
                  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                  isActive = startDate === toLocalDateString(firstDay) && endDate === toLocalDateString(lastDay);
                } else if (preset.value === 'last' && startDate && endDate) {
                  const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                  const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                  isActive = startDate === toLocalDateString(firstDayLastMonth) && endDate === toLocalDateString(lastDayLastMonth);
                } else if (preset.value === 'clear') {
                  isActive = !startDate && !endDate;
                }

                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={applyPreset}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: isActive ? '1px solid rgba(45, 140, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                      background: isActive ? 'rgba(45, 140, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: isActive ? '#60a5fa' : '#8c909f',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      minHeight: '28px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.color = '#cbd5e1';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                        e.currentTarget.style.color = '#8c909f';
                      }
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {!isRestrictedRole && (
              <button onClick={handleExportCSV} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.5rem 0.875rem', borderRadius: '0.625rem', fontSize: '0.8125rem', fontWeight: 600,
                background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(51,65,85,0.8)',
                color: '#94a3b8', cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'rgba(100,116,139,0.8)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(51,65,85,0.8)'; }}>
                <Download style={{ width: '0.875rem', height: '0.875rem' }} /> CSV
              </button>
            )}
            <button
              onClick={() => exportIssuesToExcel(filteredIssues, usersMap, startDate, endDate)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '0.625rem',
                fontSize: '0.8125rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.25) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34d399',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.05)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.35) 100%)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.25) 100%)'; }}
            >
              <Download style={{ width: '0.875rem', height: '0.875rem' }} />
              Exportar Excel
              <span style={{
                background: 'rgba(16, 185, 129, 0.25)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#a7f3d0',
                padding: '1px 6px',
                borderRadius: '999px',
                fontSize: '0.6875rem',
                fontWeight: 800,
                marginLeft: '4px',
                fontFamily: "'JetBrains Mono', monospace"
              }}>
                {filteredIssues.length}
              </span>
            </button>
            <button onClick={handleAiAnalysis} disabled={isLoadingAi} style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.5rem 0.875rem', borderRadius: '0.625rem', fontSize: '0.8125rem', fontWeight: 600,
              background: isLoadingAi ? 'rgba(30,41,59,0.5)' : 'rgba(139,92,246,0.15)',
              border: '1px solid rgba(139,92,246,0.4)', color: '#a78bfa', cursor: isLoadingAi ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s', opacity: isLoadingAi ? 0.7 : 1,
            }}
            onMouseEnter={e => { if (!isLoadingAi) e.currentTarget.style.background = 'rgba(139,92,246,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = isLoadingAi ? 'rgba(30,41,59,0.5)' : 'rgba(139,92,246,0.15)'; }}>
              <Bot style={{ width: '0.875rem', height: '0.875rem' }} />
              {isLoadingAi ? 'Analisando...' : 'Análise IA'}
            </button>
          </div>
        </div>
      </div>

      {/* AI Analysis */}
      {aiAnalysis && (
        <div className="dash-card" style={{
          ...cardStyle, border: '1px solid rgba(139,92,246,0.35)',
          background: 'rgba(88,28,235,0.07)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
            <div style={{ padding: '0.375rem', borderRadius: '0.5rem', background: 'rgba(139,92,246,0.2)' }}>
              <Sparkles style={{ width: '1rem', height: '1rem', color: '#a78bfa' }} />
            </div>
            <span style={{ ...S.sectionTitle, color: '#c4b5fd' }}>Análise de Desempenho (IA)</span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{aiAnalysis}</p>
        </div>
      )}

      {/* Quality KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.875rem' }}>
        {/* Rework cost */}
        <div className="dash-card kpi-card kpi-danger delay-1" style={{ ...cardStyle }}>
          <div>
            <p className="kpi-label" style={{ color: 'var(--color-danger)' }}>Custo de Retrabalho</p>
            <p className="kpi-value" style={{ color: '#fca5a5' }}>
              {formatCurrency(totalReworkCost)}
            </p>
          </div>
          <div className="kpi-icon" style={{ background: 'var(--color-danger-dim)' }}>
            <AlertTriangle style={{ width: '1.125rem', height: '1.125rem', color: 'var(--color-danger)' }} />
          </div>
        </div>

        {/* Rework time */}
        <div className="dash-card kpi-card kpi-orange delay-2" style={{ ...cardStyle }}>
          <div>
            <p className="kpi-label" style={{ color: '#fb923c' }}>Tempo de Retrabalho</p>
            <p className="kpi-value" style={{ color: '#fdba74' }}>
              {totalReworkMinutes >= 60
                ? `${Math.floor(totalReworkMinutes / 60)}h ${totalReworkMinutes % 60}m`
                : `${totalReworkMinutes}m`}
            </p>
          </div>
          <div className="kpi-icon" style={{ background: 'rgba(251,146,60,0.12)' }}>
            <Timer style={{ width: '1.125rem', height: '1.125rem', color: '#f97316' }} />
          </div>
        </div>

        {/* Rework Rate */}
        <div className="dash-card kpi-card kpi-purple delay-3" style={{ ...cardStyle }}>
          <div>
            <p className="kpi-label" style={{ color: '#c084fc' }}>Taxa de Retrabalho</p>
            <p className="kpi-value" style={{ color: '#d8b4fe' }}>
              {reworkRate}%
            </p>
          </div>
          <div className="kpi-icon" style={{ background: 'rgba(168,85,247,0.12)' }}>
            <Percent style={{ width: '1.125rem', height: '1.125rem', color: '#a855f7' }} />
          </div>
        </div>

        {/* Avg Rework Cost */}
        <div className="dash-card kpi-card kpi-pink delay-4" style={{ ...cardStyle }}>
          <div>
            <p className="kpi-label" style={{ color: '#f472b6' }}>Custo Médio / Ocorrência</p>
            <p className="kpi-value" style={{ color: '#f9a8d4' }}>
              {formatCurrency(avgReworkCost)}
            </p>
          </div>
          <div className="kpi-icon" style={{ background: 'rgba(236,72,153,0.12)' }}>
            <DollarSign style={{ width: '1.125rem', height: '1.125rem', color: '#ec4899' }} />
          </div>
        </div>

        {/* MTTR */}
        <div className="dash-card kpi-card kpi-cyan delay-5" style={{ ...cardStyle }}>
          <div>
            <p className="kpi-label" style={{ color: '#22d3ee' }}>Tempo Médio (MTTR)</p>
            <p className="kpi-value" style={{ color: '#67e8f9' }}>
              {avgReworkTime >= 60 ? `${Math.floor(avgReworkTime / 60)}h ${avgReworkTime % 60}m` : `${avgReworkTime}m`}
            </p>
          </div>
          <div className="kpi-icon" style={{ background: 'rgba(6,182,212,0.12)' }}>
            <Clock style={{ width: '1.125rem', height: '1.125rem', color: '#06b6d4' }} />
          </div>
        </div>

        {/* Total Issues */}
        <div className="dash-card kpi-card kpi-indigo delay-6" style={{ ...cardStyle }}>
          <div>
            <p className="kpi-label" style={{ color: '#818cf8' }}>Total Ocorrências</p>
            <p className="kpi-value" style={{ color: '#a5b4fc' }}>
              {totalIssueCount}
            </p>
          </div>
          <div className="kpi-icon" style={{ background: 'rgba(99,102,241,0.12)' }}>
            <Hash style={{ width: '1.125rem', height: '1.125rem', color: '#6366f1' }} />
          </div>
        </div>
      </div>

      {/* Other KPIs – restricted */}
      {!isRestrictedRole && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.875rem' }}>
          {averageTimes.map((stat, i) => (
            <div key={stat.type} className={`dash-card delay-${i + 1}`} style={{
              ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderLeft: '3px solid rgba(59,130,246,0.6)',
            }}>
              <div>
                <p style={S.label}>Média {stat.type}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: '0.25rem 0 0', fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatDuration(stat.avgSeconds)}
                </p>
              </div>
              <div style={{ padding: '0.625rem', borderRadius: '0.75rem', background: 'rgba(59,130,246,0.12)' }}>
                <Clock style={{ width: '1.125rem', height: '1.125rem', color: '#60a5fa' }} />
              </div>
            </div>
          ))}

          {/* Savings */}
          <div className="dash-card" style={{
            ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderLeft: '3px solid rgba(34,197,94,0.6)',
          }}>
            <div>
              <p style={{ ...S.label, color: '#4ade80' }}>Economia Aprovada</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#86efac', margin: '0.25rem 0 0', fontFamily: "'JetBrains Mono', monospace" }}>
                {formatCurrency(totalSavings)}
              </p>
            </div>
            <div style={{ padding: '0.625rem', borderRadius: '0.75rem', background: 'rgba(34,197,94,0.12)' }}>
              <Lightbulb style={{ width: '1.125rem', height: '1.125rem', color: '#22c55e' }} />
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Rework time by area – bar chart */}
        <div className="dash-card delay-2" style={{ ...cardStyle, minHeight: isMobile ? '450px' : '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={S.sectionTitle}>
              <Timer style={{ width: '1rem', height: '1rem', color: '#f97316' }} />
              Tempo de Retrabalho por Área (min)
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <DatePicker value={reworkTimeByAreaDate.start} onChange={v => setReworkTimeByAreaDate(p => ({ ...p, start: v }))} label="De" />
              <DatePicker value={reworkTimeByAreaDate.end} onChange={v => setReworkTimeByAreaDate(p => ({ ...p, end: v }))} label="Até" />
            </div>
          </div>
          <div style={{ height: isMobile ? '350px' : '300px', width: '100%' }}>
            {reworkTimeByAreaData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={reworkTimeByAreaData} 
                  layout={isMobile ? "horizontal" : "vertical"} 
                  margin={isMobile ? { top: 15, right: 10, left: -20, bottom: 25 } : { left: 8, right: 24, top: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={!isMobile} vertical={isMobile} stroke="rgba(30,41,59,0.8)" />
                  {isMobile ? (
                    <>
                      <XAxis
                        dataKey="name"
                        tickFormatter={(v) => truncateText(v, 8)}
                        angle={-30}
                        textAnchor="end"
                        interval={0}
                        style={{ fontSize: '9px', fill: '#94a3b8' }}
                        tickLine={false}
                      />
                      <YAxis
                        type="number"
                        tickFormatter={(v) => `${v}m`}
                        style={{ fontSize: '9px', fill: '#64748b' }}
                        tickLine={false}
                        axisLine={false}
                      />
                    </>
                  ) : (
                    <>
                      <XAxis
                        type="number"
                        tickFormatter={v => `${v}m`}
                        tickLine={false} axisLine={false}
                        style={{ fontSize: '10px', fill: '#64748b' }}
                      />
                      <YAxis
                        dataKey="name" type="category" width={130}
                        tickLine={false} axisLine={false}
                        style={{ fontSize: '10px', fill: '#94a3b8' }}
                      />
                    </>
                  )}
                  <Tooltip
                    trigger="click"
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload?.length) return null;
                      const mins = payload[0].value as number;
                      const display = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
                      return (
                        <div style={{
                          background: 'rgba(2,6,23,0.95)', border: '1px solid rgba(30,41,59,0.9)',
                          borderRadius: '0.625rem', padding: '0.625rem 0.875rem', fontSize: '0.8125rem', color: '#e2e8f0',
                        }}>
                          <p style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#94a3b8' }}>{label}</p>
                          <p style={{ color: '#fb923c' }}>Tempo: <strong>{display}</strong></p>
                        </div>
                      );
                    }}
                    cursor={{ fill: 'rgba(30,41,59,0.5)' }}
                  />
                  <Bar dataKey="value" name="Tempo (min)" radius={isMobile ? [4, 4, 0, 0] : [0, 6, 6, 0]} barSize={isMobile ? 18 : 20}>
                    {reworkTimeByAreaData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState label="Nenhum tempo de retrabalho registrado no período." />
            )}
          </div>
        </div>

        {/* Cost by type – bar chart */}
        <div className="dash-card delay-3" style={{ ...cardStyle, minHeight: isMobile ? '450px' : '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={S.sectionTitle}>
              <TrendingDown style={{ width: '1rem', height: '1rem', color: '#ef4444' }} />
              Custo por Tipo de Erro (Top 5)
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <DatePicker value={costChartDate.start} onChange={v => setCostChartDate(p => ({ ...p, start: v }))} label="De" />
              <DatePicker value={costChartDate.end} onChange={v => setCostChartDate(p => ({ ...p, end: v }))} label="Até" />
            </div>
          </div>
          <div style={{ height: isMobile ? '350px' : '300px', width: '100%' }}>
            {costByTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={costByTypeData} 
                  layout={isMobile ? "horizontal" : "vertical"} 
                  margin={isMobile ? { top: 15, right: 10, left: -20, bottom: 25 } : { left: 8, right: 24, top: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={!isMobile} vertical={isMobile} stroke="rgba(30,41,59,0.8)" />
                  {isMobile ? (
                    <>
                      <XAxis
                        dataKey="name"
                        tickFormatter={(v) => truncateText(v, 8)}
                        angle={-30}
                        textAnchor="end"
                        interval={0}
                        style={{ fontSize: '9px', fill: '#94a3b8' }}
                        tickLine={false}
                      />
                      <YAxis
                        type="number"
                        tickFormatter={v => `R$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
                        style={{ fontSize: '9px', fill: '#64748b' }}
                        tickLine={false}
                        axisLine={false}
                      />
                    </>
                  ) : (
                    <>
                      <XAxis
                        type="number"
                        tickFormatter={v => `R$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
                        tickLine={false} axisLine={false}
                        style={{ fontSize: '10px', fill: '#64748b' }}
                      />
                      <YAxis
                        dataKey="name" type="category" width={130}
                        tickLine={false} axisLine={false}
                        style={{ fontSize: '10px', fill: '#94a3b8' }}
                      />
                    </>
                  )}
                  <Tooltip
                    trigger="click"
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload?.length) return null;
                      const val = payload[0].value as number;
                      return (
                        <div style={{
                          background: 'rgba(2,6,23,0.95)', border: '1px solid rgba(30,41,59,0.9)',
                          borderRadius: '0.625rem', padding: '0.625rem 0.875rem', fontSize: '0.8125rem', color: '#e2e8f0',
                        }}>
                          <p style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#94a3b8' }}>{label}</p>
                          <p style={{ color: '#f87171' }}>Custo: <strong>{formatCurrency(val)}</strong></p>
                        </div>
                      );
                    }}
                    cursor={{ fill: 'rgba(30,41,59,0.5)' }}
                  />
                  <Bar dataKey="value" name="Custo" radius={isMobile ? [4, 4, 0, 0] : [0, 6, 6, 0]} barSize={isMobile ? 18 : 20}>
                    {costByTypeData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState label="Sem dados de custo para exibir." />
            )}
          </div>
        </div>

        {/* Pie – issue distribution */}
        <div className="dash-card delay-4" style={{ ...cardStyle, minHeight: isMobile ? '450px' : '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={S.sectionTitle}>
              <PieIcon style={{ width: '1rem', height: '1rem', color: '#3b82f6' }} />
              Distribuição de Problemas
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <DatePicker value={issuePieDate.start} onChange={v => setIssuePieDate(p => ({ ...p, start: v }))} label="De" />
              <DatePicker value={issuePieDate.end} onChange={v => setIssuePieDate(p => ({ ...p, end: v }))} label="Até" />
            </div>
          </div>
          <div style={{ height: isMobile ? '350px' : '300px', width: '100%' }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={isMobile ? { bottom: 20 } : undefined}>
                  <Pie 
                    data={pieData} 
                    cx={isMobile ? "50%" : "45%"} 
                    cy={isMobile ? "40%" : "50%"} 
                    labelLine={false} 
                    outerRadius={isMobile ? 85 : 110} 
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    trigger="click"
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      const entry = payload[0];
                      return (
                        <div style={{
                          background: 'rgba(2,6,23,0.95)', border: '1px solid rgba(30,41,59,0.9)',
                          borderRadius: '0.625rem', padding: '0.625rem 0.875rem', fontSize: '0.8125rem', color: '#e2e8f0',
                        }}>
                          <p style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#94a3b8' }}>{entry.name}</p>
                          <p style={{ color: entry.payload?.fill || '#3b82f6' }}>Ocorrências: <strong>{entry.value}</strong></p>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    layout={isMobile ? "horizontal" : "vertical"} 
                    verticalAlign={isMobile ? "bottom" : "middle"} 
                    align={isMobile ? "center" : "right"}
                    formatter={(val) => <span style={{ color: '#94a3b8', fontSize: isMobile ? '10px' : '11px' }}>{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState label="Nenhum problema registrado no período." />
            )}
          </div>
        </div>

        {/* Monthly Issue Trend – line chart */}
        <div className="dash-card delay-5" style={{ ...cardStyle, minHeight: isMobile ? '450px' : '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={S.sectionTitle}>
              <TrendingUp style={{ width: '1rem', height: '1rem', color: '#22c55e' }} />
              Tendência Mensal de Ocorrências
            </span>
          </div>
          <div style={{ height: isMobile ? '350px' : '300px', width: '100%' }}>
            {monthlyTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={monthlyTrendData} 
                  margin={isMobile ? { left: -20, right: 10, top: 15, bottom: 15 } : { left: 8, right: 24, top: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,41,59,0.8)" />
                  <XAxis 
                    dataKey="month" 
                    tickLine={false} 
                    axisLine={false} 
                    style={{ fontSize: isMobile ? '8px' : '10px', fill: '#94a3b8' }} 
                    angle={isMobile ? -25 : 0}
                    textAnchor={isMobile ? "end" : "middle"}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    style={{ fontSize: isMobile ? '8px' : '10px', fill: '#64748b' }} 
                    allowDecimals={false} 
                  />
                  <Tooltip
                    trigger="click"
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div style={{ background: 'rgba(2,6,23,0.95)', border: '1px solid rgba(30,41,59,0.9)', borderRadius: '0.625rem', padding: '0.625rem 0.875rem', fontSize: '0.8125rem', color: '#e2e8f0' }}>
                          <p style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#94a3b8' }}>{label}</p>
                          <p style={{ color: '#4ade80' }}>Ocorrências: <strong>{payload[0].value}</strong></p>
                        </div>
                      );
                    }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#22c55e', r: 4 }} activeDot={{ r: 6, fill: '#4ade80' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState label="Sem dados mensais para exibir." />
            )}
          </div>
        </div>

        {/* Monthly Cost Trend – bar chart */}
        <div className="dash-card delay-5" style={{ ...cardStyle, minHeight: isMobile ? '450px' : '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={S.sectionTitle}>
              <DollarSign style={{ width: '1rem', height: '1rem', color: '#ef4444' }} />
              Custo de Retrabalho por Mês
            </span>
          </div>
          <div style={{ height: isMobile ? '350px' : '300px', width: '100%' }}>
            {monthlyCostData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={monthlyCostData} 
                  margin={isMobile ? { left: -20, right: 10, top: 15, bottom: 15 } : { left: 8, right: 24, top: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,41,59,0.8)" />
                  <XAxis 
                    dataKey="month" 
                    tickLine={false} 
                    axisLine={false} 
                    style={{ fontSize: isMobile ? '8px' : '10px', fill: '#94a3b8' }} 
                    angle={isMobile ? -25 : 0}
                    textAnchor={isMobile ? "end" : "middle"}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={v => `R$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} 
                    style={{ fontSize: isMobile ? '8px' : '10px', fill: '#64748b' }} 
                  />
                  <Tooltip
                    trigger="click"
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div style={{ background: 'rgba(2,6,23,0.95)', border: '1px solid rgba(30,41,59,0.9)', borderRadius: '0.625rem', padding: '0.625rem 0.875rem', fontSize: '0.8125rem', color: '#e2e8f0' }}>
                          <p style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#94a3b8' }}>{label}</p>
                          <p style={{ color: '#f87171' }}>Custo: <strong>{formatCurrency(payload[0].value)}</strong></p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="cost" name="Custo" radius={[6, 6, 0, 0]} barSize={isMobile ? 18 : 32}>
                    {monthlyCostData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState label="Sem dados de custo mensal." />
            )}
          </div>
        </div>

        {/* Pareto Analysis – composed chart */}
        <div className="dash-card delay-5" style={{ ...cardStyle, minHeight: isMobile ? '450px' : '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={S.sectionTitle}>
              <TrendingDown style={{ width: '1rem', height: '1rem', color: '#eab308' }} />
              Análise de Pareto
            </span>
          </div>
          <div style={{ height: isMobile ? '350px' : '300px', width: '100%' }}>
            {paretoData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart 
                  data={paretoData} 
                  margin={isMobile ? { left: -20, right: 10, top: 15, bottom: 65 } : { left: 8, right: 24, top: 8, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,41,59,0.8)" />
                  <XAxis 
                    dataKey="name" 
                    tickLine={false} 
                    axisLine={false} 
                    style={{ fontSize: isMobile ? '8px' : '9px', fill: '#94a3b8' }} 
                    angle={isMobile ? -30 : -35} 
                    textAnchor="end" 
                    interval={0} 
                    tickFormatter={(v) => truncateText(v, isMobile ? 8 : 15)}
                  />
                  <YAxis yAxisId="left" tickLine={false} axisLine={false} style={{ fontSize: isMobile ? '8px' : '10px', fill: '#64748b' }} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} style={{ fontSize: isMobile ? '8px' : '10px', fill: '#64748b' }} />
                  <Tooltip
                    trigger="click"
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div style={{ background: 'rgba(2,6,23,0.95)', border: '1px solid rgba(30,41,59,0.9)', borderRadius: '0.625rem', padding: '0.625rem 0.875rem', fontSize: '0.8125rem', color: '#e2e8f0' }}>
                          <p style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#94a3b8' }}>{label}</p>
                          <p style={{ color: '#3b82f6' }}>Qtde: <strong>{payload[0]?.value}</strong></p>
                          <p style={{ color: '#eab308' }}>Acumulado: <strong>{payload[1]?.value}%</strong></p>
                        </div>
                      );
                    }}
                  />
                  <Bar yAxisId="left" dataKey="value" name="Ocorrências" radius={[6, 6, 0, 0]} barSize={isMobile ? 18 : 28}>
                    {paretoData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="cumPercent" name="% Acumulado" stroke="#eab308" strokeWidth={2.5} dot={{ fill: '#eab308', r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState label="Sem dados para análise de Pareto." />
            )}
          </div>
        </div>

        {/* Top NS Reincidentes – bar chart */}
        <div className="dash-card delay-5" style={{ ...cardStyle, minHeight: isMobile ? '450px' : '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={S.sectionTitle}>
              <Repeat style={{ width: '1rem', height: '1rem', color: '#f97316' }} />
              Top NS Reincidentes
            </span>
          </div>
          <div style={{ height: isMobile ? '350px' : '300px', width: '100%' }}>
            {topNsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={topNsData} 
                  layout={isMobile ? "horizontal" : "vertical"} 
                  margin={isMobile ? { top: 15, right: 10, left: -20, bottom: 25 } : { left: 8, right: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={!isMobile} vertical={isMobile} stroke="rgba(30,41,59,0.8)" />
                  {isMobile ? (
                    <>
                      <XAxis
                        dataKey="name"
                        tickFormatter={(v) => truncateText(v, 8)}
                        angle={-30}
                        textAnchor="end"
                        interval={0}
                        style={{ fontSize: '9px', fill: '#94a3b8' }}
                        tickLine={false}
                      />
                      <YAxis
                        type="number"
                        style={{ fontSize: '9px', fill: '#64748b' }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                    </>
                  ) : (
                    <>
                      <XAxis type="number" tickLine={false} axisLine={false} style={{ fontSize: '10px', fill: '#64748b' }} allowDecimals={false} />
                      <YAxis dataKey="name" type="category" width={130} tickLine={false} axisLine={false} style={{ fontSize: '10px', fill: '#94a3b8' }} />
                    </>
                  )}
                  <Tooltip
                    trigger="click"
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div style={{ background: 'rgba(2,6,23,0.95)', border: '1px solid rgba(30,41,59,0.9)', borderRadius: '0.625rem', padding: '0.625rem 0.875rem', fontSize: '0.8125rem', color: '#e2e8f0' }}>
                          <p style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#94a3b8' }}>{label}</p>
                          <p style={{ color: '#fb923c' }}>Ocorrências: <strong>{payload[0].value}</strong></p>
                        </div>
                      );
                    }}
                    cursor={{ fill: 'rgba(30,41,59,0.5)' }}
                  />
                  <Bar dataKey="value" name="Ocorrências" radius={isMobile ? [4, 4, 0, 0] : [0, 6, 6, 0]} barSize={isMobile ? 18 : 20}>
                    {topNsData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState label="Nenhum NS com reincidência encontrado." />
            )}
          </div>
        </div>

        {/* Issues by Reporter – bar chart */}
        <div className="dash-card delay-5" style={{ ...cardStyle, minHeight: isMobile ? '450px' : '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={S.sectionTitle}>
              <UserIcon style={{ width: '1rem', height: '1rem', color: '#8b5cf6' }} />
              Ocorrências por Reportador
            </span>
          </div>
          <div style={{ height: isMobile ? '350px' : '300px', width: '100%' }}>
            {issuesByReporterData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={issuesByReporterData} 
                  layout={isMobile ? "horizontal" : "vertical"} 
                  margin={isMobile ? { top: 15, right: 10, left: -20, bottom: 25 } : { left: 8, right: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={!isMobile} vertical={isMobile} stroke="rgba(30,41,59,0.8)" />
                  {isMobile ? (
                    <>
                      <XAxis
                        dataKey="name"
                        tickFormatter={(v) => truncateText(v, 8)}
                        angle={-30}
                        textAnchor="end"
                        interval={0}
                        style={{ fontSize: '9px', fill: '#94a3b8' }}
                        tickLine={false}
                      />
                      <YAxis
                        type="number"
                        style={{ fontSize: '9px', fill: '#64748b' }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                    </>
                  ) : (
                    <>
                      <XAxis type="number" tickLine={false} axisLine={false} style={{ fontSize: '10px', fill: '#64748b' }} allowDecimals={false} />
                      <YAxis dataKey="name" type="category" width={130} tickLine={false} axisLine={false} style={{ fontSize: '10px', fill: '#94a3b8' }} />
                    </>
                  )}
                  <Tooltip
                    trigger="click"
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div style={{ background: 'rgba(2,6,23,0.95)', border: '1px solid rgba(30,41,59,0.9)', borderRadius: '0.625rem', padding: '0.625rem 0.875rem', fontSize: '0.8125rem', color: '#e2e8f0' }}>
                          <p style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#94a3b8' }}>{label}</p>
                          <p style={{ color: '#a78bfa' }}>Reportados: <strong>{payload[0].value}</strong></p>
                        </div>
                      );
                    }}
                    cursor={{ fill: 'rgba(30,41,59,0.5)' }}
                  />
                  <Bar dataKey="value" name="Reportados" radius={isMobile ? [4, 4, 0, 0] : [0, 6, 6, 0]} barSize={isMobile ? 18 : 20}>
                    {issuesByReporterData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState label="Sem dados de reportadores." />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({ label }: { label: string }) => (
  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#334155' }}>
    <BarChart3 style={{ width: '2rem', height: '2rem', opacity: 0.4 }} />
    <span style={{ fontSize: '0.8125rem' }}>{label}</span>
  </div>
);
