import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { Sparkles, BarChart3, PieChart as PieIcon, Download, Clock, Filter, Truck, User as UserIcon, Lightbulb, TrendingDown } from 'lucide-react';
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

  // 1.5 Calculate Total Savings
  const totalSavings = useMemo(() => {
    return filteredInnovations.reduce((acc, curr) => {
        if(curr.costDifference > 0) return acc + curr.costDifference;
        return acc;
    }, 0);
  }, [filteredInnovations]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  // 2. Bar Chart Data: Releases per Month
  const barData = useMemo(() => {
    const releasesByMonth = filteredProjects
      .reduce((acc, curr) => {
        const date = new Date(curr.endTime!);
        const monthYear = date.toLocaleString('pt-BR', { month: 'short' });
        const key = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return Object.keys(releasesByMonth).map(key => ({
      name: key,
      liberacoes: releasesByMonth[key]
    }));
  }, [filteredProjects]);

  // 3. Pie Chart Data: Issue Type Distribution
  const pieData = useMemo(() => {
    const issuesByType = filteredIssues.reduce((acc, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(issuesByType).map(type => ({
      name: type,
      value: issuesByType[type]
    }));
  }, [filteredIssues]);

  // 4. Pie Chart: Implement Type Distribution
  const implementData = useMemo(() => {
    const counts = filteredProjects.reduce((acc, curr) => {
      const type = curr.implementType || 'Não Informado';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(counts).map(key => ({
      name: key,
      value: counts[key]
    }));
  }, [filteredProjects]);

  // 5. Bar Chart: Releases by Designer (Manager Only)
  const designerData = useMemo(() => {
    if (currentUser.role !== 'GESTOR') return [];

    const counts = filteredProjects.reduce((acc, curr) => {
      const name = usersMap[curr.userId || ''] || 'Desconhecido';
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(counts).map(key => ({
      name: key,
      liberacoes: counts[key]
    }));
  }, [filteredProjects, currentUser.role, usersMap]);

  // 6. Stacked Bar Chart: Innovations by Status and Type
  const innovationChartData = useMemo(() => {
    const statuses = ['PENDING', 'APPROVED', 'IMPLEMENTED', 'REJECTED'];
    const labelMap: Record<string, string> = {
        'PENDING': 'Pendente',
        'APPROVED': 'Aprovado',
        'IMPLEMENTED': 'Implementado',
        'REJECTED': 'Rejeitado'
    };

    return statuses.map(status => {
        const items = filteredInnovations.filter(i => i.status === status);
        const newProjects = items.filter(i => i.type === InnovationType.NEW_PROJECT).length;
        const improvements = items.filter(i => i.type === InnovationType.PRODUCT_IMPROVEMENT).length;
        
        return {
            name: labelMap[status],
            "Novo Projeto": newProjects,
            "Melhoria": improvements
        };
    });
  }, [filteredInnovations]);


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
        <div className="flex items-center text-gray-700 font-bold">
          <Filter className="w-5 h-5 mr-2 text-blue-600" />
          Período de Análise
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">De:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Até:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>
        </div>
        <button 
          onClick={handleExportCSV}
          className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-50 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors ml-auto md:ml-0"
        >
          <Download className="w-4 h-4 mr-2" />
          CSV
        </button>
      </div>

      {/* KPI Section */}
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
        {/* Innovation KPI */}
         <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Economia Total</p>
              <p className="text-xl font-bold text-emerald-800">{formatCurrency(totalSavings)}</p>
            </div>
            <div className="h-8 w-8 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
      </div>

      {/* AI Insights Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-indigo-900 flex items-center">
            <Sparkles className="w-5 h-5 mr-2 text-indigo-600" />
            Análise Inteligente (IA)
          </h3>
          <button 
            onClick={handleAiAnalysis}
            disabled={isLoadingAi}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isLoadingAi ? 'Analisando...' : 'Gerar Relatório'}
          </button>
        </div>
        
        {aiAnalysis ? (
          <div className="prose prose-sm max-w-none text-indigo-900 bg-white/50 p-4 rounded-lg">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{aiAnalysis}</pre>
          </div>
        ) : (
          <p className="text-indigo-600/70 text-sm">
            Clique em "Gerar Relatório" para que a IA analise o desempenho do período selecionado.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Releases per Month (Bar Chart) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[350px]">
          <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
            Liberações por Mês
          </h3>
          <div className="h-[250px] w-full">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: '#f3f4f6' }} />
                  <Bar dataKey="liberacoes" name="Liberações" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Sem dados para exibir.
              </div>
            )}
          </div>
        </div>

        {/* Innovations Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[350px]">
          <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center">
            <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
            Status de Inovações
          </h3>
           <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={innovationChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} style={{fontSize: '12px'}} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: '#f3f4f6' }} />
                    <Legend />
                    <Bar dataKey="Novo Projeto" stackId="a" fill="#8b5cf6" />
                    <Bar dataKey="Melhoria" stackId="a" fill="#3b82f6" />
                </BarChart>
            </ResponsiveContainer>
           </div>
        </div>

        {/* Implement Type (Pie Chart) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[350px]">
          <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center">
            <Truck className="w-5 h-5 mr-2 text-orange-500" />
            Distribuição por Implemento
          </h3>
          <div className="h-[250px] w-full">
            {implementData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={implementData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {implementData.map((entry, index) => (
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
                Sem dados para exibir.
              </div>
            )}
          </div>
        </div>

        {/* Issue Distribution (Pie Chart) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[350px]">
          <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center">
            <PieIcon className="w-5 h-5 mr-2 text-red-500" />
            Distribuição de Problemas
          </h3>
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

        {/* Manager Only: Releases by Designer */}
        {currentUser.role === 'GESTOR' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[350px]">
            <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center">
              <UserIcon className="w-5 h-5 mr-2 text-purple-600" />
              Liberações por Projetista
            </h3>
             <div className="h-[250px] w-full">
              {designerData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={designerData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" width={100} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: '#f3f4f6' }} />
                    <Bar dataKey="liberacoes" name="Projetos" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                  Sem dados para exibir.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};