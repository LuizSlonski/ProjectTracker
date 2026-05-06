
import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Sparkles, BarChart3, PieChart as PieIcon, Download, Clock, Filter, TrendingDown, AlertTriangle, Lightbulb, ChevronDown, Bot } from 'lucide-react';
import { AppState, User } from '../types';
import { analyzePerformance } from '../services/geminiService';
import { fetchUsers } from '../services/storageService';

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
    background: 'rgba(15,23,42,0.7)',
    border: '1px solid rgba(30,41,59,0.9)',
    borderRadius: '1rem',
    padding: '1.5rem',
    backdropFilter: 'blur(8px)',
  } as React.CSSProperties,
  label: { fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.08em' },
  sectionTitle: { fontSize: '0.9375rem', fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' },
};

export const Dashboard: React.FC<DashboardProps> = ({ data, currentUser }) => {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [costChartDate, setCostChartDate] = useState({ start: '', end: '' });
  const [issuePieDate, setIssuePieDate] = useState({ start: '', end: '' });

  const isRestrictedRole = ['QUALIDADE', 'GESTOR_QUALIDADE', 'PROCESSOS'].includes(currentUser.role);

  const filterByDate = (items: any[], startStr: string, endStr: string, field: string) => {
    if (!startStr && !endStr) return items;
    const s = startStr ? new Date(startStr).getTime() : 0;
    const e = endStr ? new Date(endStr).setHours(23, 59, 59, 999) : Infinity;
    return items.filter(item => {
      const d = new Date(String(item[field])).getTime();
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

  const totalSavings = useMemo(() =>
    filteredInnovations.filter(i => i.status === 'APPROVED' || i.status === 'IMPLEMENTED')
      .reduce((a, c) => a + (c.totalAnnualSavings || 0), 0),
    [filteredInnovations]);

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

  const DatePicker = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: '130px' }}>
      <span style={S.label}>{label}</span>
      <input
        type="date" value={value} onChange={e => onChange(e.target.value)}
        className="dark-input"
        style={{ padding: '0.5rem 0.75rem', borderRadius: '0.625rem', fontSize: '0.8125rem', width: '100%' }}
      />
    </div>
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
      <div className="dash-card" style={{ ...S.card, padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontWeight: 600, fontSize: '0.875rem' }}>
            <Filter style={{ width: '1rem', height: '1rem', color: '#3b82f6' }} />
            Período de Análise
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', flex: 1, maxWidth: '500px' }}>
            <DatePicker value={startDate} onChange={setStartDate} label="De" />
            <DatePicker value={endDate} onChange={setEndDate} label="Até" />
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
          ...S.card, border: '1px solid rgba(139,92,246,0.35)',
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

      {/* KPIs */}
      {!isRestrictedRole && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.875rem' }}>
          {averageTimes.map((stat, i) => (
            <div key={stat.type} className={`dash-card delay-${i + 1}`} style={{
              ...S.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderLeft: '3px solid rgba(59,130,246,0.6)',
            }}>
              <div>
                <p style={S.label}>Média {stat.type}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: '0.25rem 0 0', fontFamily: "'DM Mono', monospace" }}>
                  {formatDuration(stat.avgSeconds)}
                </p>
              </div>
              <div style={{ padding: '0.625rem', borderRadius: '0.75rem', background: 'rgba(59,130,246,0.12)' }}>
                <Clock style={{ width: '1.125rem', height: '1.125rem', color: '#60a5fa' }} />
              </div>
            </div>
          ))}

          {/* Rework cost */}
          <div className="dash-card" style={{
            ...S.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderLeft: '3px solid rgba(239,68,68,0.6)',
          }}>
            <div>
              <p style={{ ...S.label, color: '#f87171' }}>Custo de Retrabalho</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fca5a5', margin: '0.25rem 0 0', fontFamily: "'DM Mono', monospace" }}>
                {formatCurrency(totalReworkCost)}
              </p>
            </div>
            <div style={{ padding: '0.625rem', borderRadius: '0.75rem', background: 'rgba(239,68,68,0.12)' }}>
              <AlertTriangle style={{ width: '1.125rem', height: '1.125rem', color: '#ef4444' }} />
            </div>
          </div>

          {/* Savings */}
          <div className="dash-card" style={{
            ...S.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderLeft: '3px solid rgba(34,197,94,0.6)',
          }}>
            <div>
              <p style={{ ...S.label, color: '#4ade80' }}>Economia Aprovada</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#86efac', margin: '0.25rem 0 0', fontFamily: "'DM Mono', monospace" }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>

        {/* Cost by type – bar chart */}
        <div className="dash-card delay-3" style={{ ...S.card, minHeight: '360px' }}>
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
          <div style={{ height: '260px', width: '100%' }}>
            {costByTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costByTypeData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(30,41,59,0.8)" />
                  <XAxis type="number" tickFormatter={v => `R$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} tickLine={false} axisLine={false} style={{ fontSize: '10px', fill: '#64748b' }} />
                  <YAxis dataKey="name" type="category" width={110} tickLine={false} axisLine={false} style={{ fontSize: '10px', fill: '#94a3b8' }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(30,41,59,0.5)' }} />
                  <Bar dataKey="value" name="Custo" fill="#ef4444" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState label="Sem dados de custo para exibir." />
            )}
          </div>
        </div>

        {/* Pie – issue distribution */}
        <div className="dash-card delay-4" style={{ ...S.card, minHeight: '360px' }}>
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
          <div style={{ height: '260px', width: '100%' }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="45%" cy="50%" labelLine={false} outerRadius={90} dataKey="value">
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    layout="vertical" verticalAlign="middle" align="right"
                    formatter={(val) => <span style={{ color: '#94a3b8', fontSize: '11px' }}>{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState label="Nenhum problema registrado no período." />
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
