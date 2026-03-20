
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { Sparkles, BarChart3, PieChart as PieIcon, Download, Clock, Filter, Truck, User as UserIcon, Lightbulb, TrendingDown, AlertTriangle } from 'lucide-react';
import { AppState, User, InnovationType } from '../types';
import { analyzePerformance } from '../services/geminiService';
import { fetchUsers } from '../services/storageService';

interface DashboardProps {
  data: AppState;
  currentUser: User;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#ec4899'];

export const Dashboard: React.FC<DashboardProps> = ({ data, currentUser }) => {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});

  // Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const isRestrictedRole = currentUser.role === 'QUALIDADE' || currentUser.role === 'GESTOR_QUALIDADE' || currentUser.role === 'PROCESSOS' || currentUser.role === 'CEO';

  useEffect(() => {
    // Load users for the manager chart
    const load = async () => {
      const users = await fetchUsers();
      const map = users.reduce((acc, u) => ({ ...acc, [u.id]: u.name }), {} as Record<string, string>);
      setUsersMap(map);
    };
    load();
  }, []);

  // Filter Data Logic
  const filteredProjects = useMemo(() => {
    return data.projects.filter(p => {
      if (p.status !== 'COMPLETED') return false;
      
      let matchDate = true;
      if (startDate || endDate) {
        const pDate = new Date(p.endTime || p.startTime).getTime();
        const start = startDate ? new Date(startDate).getTime() : 0;
        const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
        matchDate = pDate >= start && pDate <= end;
      }
      return matchDate;
    });
  }, [data.projects, startDate, endDate]);

  const filteredIssues = useMemo(() => {
     return data.issues.filter(i => {
      let matchDate = true;
      if (startDate || endDate) {
        const iDate = new Date(i.date).getTime();
        const start = startDate ? new Date(startDate).getTime() : 0;
        const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
        matchDate = iDate >= start && iDate <= end;
      }
      return matchDate;
     });
  }, [data.issues, startDate, endDate]);

   const filteredInnovations = useMemo(() => {
    return data.innovations.filter(inv => {
      let matchDate = true;
      if (startDate || endDate) {
        const iDate = new Date(inv.createdAt).getTime();
        const start = startDate ? new Date(startDate).getTime() : 0;
        const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
        matchDate = iDate >= start && iDate <= end;
      }
      return matchDate;
    });
  }, [data.innovations, startDate, endDate]);


  // 1. Calculate Average Time per Project Type
  const averageTimes = useMemo(() => {
    const sums: Record<string, { total: number; count: number }> = {};
    
    filteredProjects.forEach(p => {
      if (!sums[p.type]) sums[p.type] = { total: 0, count: 0 };
      sums[p.type].total += p.totalActiveSeconds;
      sums[p.type].count += 1;
    });

    return Object.entries(sums).map(([type, stats]) => ({
      type,
      avgSeconds: Math.round(stats.total / stats.count)
    }));
  }, [filteredProjects]);

  // 1.5 Calculate Total Savings (ONLY APPROVED/IMPLEMENTED)
  const totalSavings = useMemo(() => {
    return filteredInnovations.reduce((acc, curr) => {
        // Only count if status is APPROVED or IMPLEMENTED
        if (curr.status === 'APPROVED' || curr.status === 'IMPLEMENTED') {
            return acc + (curr.totalAnnualSavings || 0);
        }
        return acc;
    }, 0);
  }, [filteredInnovations]);

  // 1.6 Calculate Total Rework Cost
  const totalReworkCost = useMemo(() => {
    return filteredIssues.reduce((acc, curr) => acc + (curr.totalCost || 0), 0);
  }, [filteredIssues]);

  // Individual Chart Filters
  const [costChartDate, setCostChartDate] = useState({ start: '', end: '' });
  const [issuePieDate, setIssuePieDate] = useState({ start: '', end: '' });

  // Helper to filter data by date range
  const filterByDate = (
    items: any[], 
    startStr: string, 
    endStr: string,
    dateField: string
  ) => {
    if (!startStr && !endStr) return items;
    const start = startStr ? new Date(startStr).getTime() : 0;
    const end = endStr ? new Date(endStr).setHours(23, 59, 59, 999) : Infinity;
    
    return items.filter(item => {
      const val = item[dateField];
      if (!val) return false;
      const d = new Date(String(val)).getTime();
      return d >= start && d <= end;
    });
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  // 1.7 Calculate Cost by Issue Type (Filtered)
  const costByTypeData = useMemo(() => {
    const filtered = filterByDate(data.issues, costChartDate.start, costChartDate.end, 'date');
    const costs = filtered.reduce((acc, curr) => {
        const typeKey = String(curr.type);
        acc[typeKey] = (acc[typeKey] || 0) + (curr.totalCost || 0);
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(costs)
        .map(([name, value]) => ({ name, value: Number(value) }))
        .sort((a, b) => a.value - b.value ? b.value - a.value : 0)
        .slice(0, 5);
  }, [data.issues, costChartDate]);

  // 3. Pie Chart Data: Issue Type Distribution (Filtered)
  const pieData = useMemo(() => {
    const filtered = filterByDate(data.issues, issuePieDate.start, issuePieDate.end, 'date');
    const issuesByType = filtered.reduce((acc, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(issuesByType).map(type => ({
      name: type,
      value: issuesByType[type]
    }));
  }, [data.issues, issuePieDate]);

  // Date Filter Component
  const DateFilter = ({ value, onChange }: { value: { start: string, end: string }, onChange: (v: { start: string, end: string }) => void }) => (
    <div className="flex flex-col sm:flex-row gap-2 mb-4 justify-end w-full sm:w-auto">
        <input 
            type="date" 
            className="text-xs border rounded p-1 w-full sm:w-auto" 
            value={value.start} 
            onChange={e => onChange({ ...value, start: e.target.value })} 
        />
        <span className="text-gray-400 hidden sm:inline">-</span>
        <input 
            type="date" 
            className="text-xs border rounded p-1 w-full sm:w-auto" 
            value={value.end} 
            onChange={e => onChange({ ...value, end: e.target.value })} 
        />
    </div>
  );


  const handleAiAnalysis = async () => {
    setIsLoadingAi(true);
    const result = await analyzePerformance(filteredProjects, filteredIssues);
    setAiAnalysis(result);
    setIsLoadingAi(false);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'NS', 'Codigo', 'Tipo', 'Implemento', 'Inicio', 'Fim', 'Tempo Total(s)', 'Status', 'Notas'];
    const rows = filteredProjects.map(p => [
      p.id,
      p.ns,
      p.projectCode || '',
      p.type,
      p.implementType || '',
      p.startTime,
      p.endTime || '',
      p.totalActiveSeconds,
      p.status,
      `"${(p.notes || '').replace(/"/g, '""')}"`
    ].join(','));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `design_track_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Date Filter Section */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center text-gray-700 font-bold w-full md:w-auto">
          <Filter className="w-5 h-5 mr-2 text-blue-600" />
          Período de Análise
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-gray-500 w-8 sm:w-auto">De:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm flex-1 sm:flex-none w-full sm:w-auto"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-gray-500 w-8 sm:w-auto">Até:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm flex-1 sm:flex-none w-full sm:w-auto"
            />
          </div>
        </div>
        {!isRestrictedRole && (
          <button 
            onClick={handleExportCSV}
            className="flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-50 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors w-full md:w-auto"
          >
            <Download className="w-4 h-4 mr-2" />
            CSV
          </button>
        )}
      </div>

      {/* KPI Section */}
      {!isRestrictedRole && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {averageTimes.length > 0 && averageTimes.map((stat) => (
            <div key={stat.type} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Média {stat.type}</p>
                <p className="text-xl font-bold text-gray-800">{formatDuration(stat.avgSeconds)}</p>
              </div>
              <div className="h-8 w-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
          ))}
            
            {/* Rework Cost KPI */}
            <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Custo de Retrabalho</p>
                <p className="text-xl font-bold text-red-800">{formatCurrency(totalReworkCost)}</p>
              </div>
              <div className="h-8 w-8 bg-red-50 rounded-full flex items-center justify-center text-red-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Cost by Issue Type (Bar Chart) - NEW */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[350px]">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-700 flex items-center">
                    <TrendingDown className="w-5 h-5 mr-2 text-red-500" />
                    Custo por Tipo de Erro (Top 5)
                </h3>
            </div>
            <DateFilter value={costChartDate} onChange={setCostChartDate} />
            <div className="h-[250px] w-full">
                {costByTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={costByTypeData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" tickFormatter={(val) => `R$${val}`} tickLine={false} axisLine={false} style={{fontSize: '10px'}} />
                        <YAxis dataKey="name" type="category" width={120} tickLine={false} axisLine={false} style={{fontSize: '11px'}} />
                        <Tooltip formatter={(val: number) => formatCurrency(val)} cursor={{ fill: '#f3f4f6' }} />
                        <Bar dataKey="value" name="Custo" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
                ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    Sem dados de custo para exibir.
                </div>
                )}
            </div>
        </div>

        {/* Issue Distribution (Pie Chart) - VISIBLE TO EVERYONE */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[350px] col-span-1 md:col-span-2 lg:col-span-1">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold text-gray-700 flex items-center">
                <PieIcon className="w-5 h-5 mr-2 text-red-500" />
                Distribuição de Problemas
            </h3>
          </div>
          <DateFilter value={issuePieDate} onChange={setIssuePieDate} />
          <div className="h-[250px] w-full">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Nenhum problema registrado no período.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
