import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface CustomDatePickerProps {
  value: string; // Formato YYYY-MM-DD
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'DD/MM/AAAA',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calendário interno
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date());

  // Sincroniza o value externo com o estado interno do input de texto
  useEffect(() => {
    if (value) {
      const [year, month, day] = value.split('-');
      if (year && month && day) {
        setInputValue(`${day}/${month}/${year}`);
        const parsed = new Date(Number(year), Number(month) - 1, Number(day));
        if (!isNaN(parsed.getTime())) {
          setViewDate(parsed);
        }
      }
    } else {
      setInputValue('');
      setViewDate(new Date());
    }
  }, [value]);

  // Listener para fechar o popover ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Formata o input de texto com máscara DD/MM/AAAA conforme digita
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, ''); // Apenas números
    if (raw.length > 8) raw = raw.slice(0, 8);

    let formatted = '';
    if (raw.length > 0) {
      formatted += raw.slice(0, 2);
    }
    if (raw.length > 2) {
      formatted += '/' + raw.slice(2, 4);
    }
    if (raw.length > 4) {
      formatted += '/' + raw.slice(4, 8);
    }

    setInputValue(formatted);

    // Se a data estiver completa (10 caracteres: DD/MM/AAAA)
    if (formatted.length === 10) {
      const [dayStr, monthStr, yearStr] = formatted.split('/');
      const d = Number(dayStr);
      const m = Number(monthStr);
      const y = Number(yearStr);

      // Validação básica da data
      if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        const testDate = new Date(y, m - 1, d);
        // Garante que o dia existe no mês (ex. evita 31/04/2026)
        if (testDate.getFullYear() === y && testDate.getMonth() === m - 1 && testDate.getDate() === d) {
          const isoDate = `${yearStr}-${monthStr.padStart(2, '0')}-${dayStr.padStart(2, '0')}`;
          onChange(isoDate);
          setViewDate(testDate);
          return;
        }
      }
    } else if (formatted.length === 0) {
      onChange('');
    }
  };

  const handleInputBlur = () => {
    // Se o usuário digitou algo incompleto ou inválido, restaura para a data externa válida ou limpa
    if (inputValue.length > 0 && inputValue.length < 10) {
      if (value) {
        const [year, month, day] = value.split('-');
        setInputValue(`${day}/${month}/${year}`);
      } else {
        setInputValue('');
      }
    }
  };

  // Funções auxiliares do calendário
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthsBr = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month); // 0 = Domingo, 1 = Segunda, etc.

  // Dias do mês anterior para preencher o grid inicial
  const prevMonthIndex = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonthIndex);

  const gridCells: { day: number; isCurrentMonth: boolean; date: Date }[] = [];

  // Preenche células do mês anterior
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    gridCells.push({
      day: d,
      isCurrentMonth: false,
      date: new Date(prevYear, prevMonthIndex, d)
    });
  }

  // Preenche células do mês atual
  for (let d = 1; d <= daysInMonth; d++) {
    gridCells.push({
      day: d,
      isCurrentMonth: true,
      date: new Date(year, month, d)
    });
  }

  // Preenche células do mês seguinte para completar o grid (geralmente múltiplo de 7, total 42 células)
  const remainingCells = 42 - gridCells.length;
  const nextMonthIndex = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  for (let d = 1; d <= remainingCells; d++) {
    gridCells.push({
      day: d,
      isCurrentMonth: false,
      date: new Date(nextYear, nextMonthIndex, d)
    });
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(viewDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setViewDate(newDate);
  };

  const selectDate = (date: Date) => {
    const dStr = String(date.getDate()).padStart(2, '0');
    const mStr = String(date.getMonth() + 1).padStart(2, '0');
    const yStr = String(date.getFullYear());
    
    onChange(`${yStr}-${mStr}-${dStr}`);
    setIsPopoverOpen(false);
  };

  const handleToday = () => {
    selectDate(today);
  };

  const handleClear = () => {
    onChange('');
    setInputValue('');
    setIsPopoverOpen(false);
  };

  // Verifica se o dia renderizado é a data selecionada atualmente
  const isSelected = (date: Date) => {
    if (!value) return false;
    const [y, m, d] = value.split('-');
    return date.getDate() === Number(d) &&
           (date.getMonth() + 1) === Number(m) &&
           date.getFullYear() === Number(y);
  };

  // Verifica se o dia é hoje
  const isToday = (date: Date) => {
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, position: 'relative' }}>
      {label && (
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8c909f', fontFamily: 'Sora, sans-serif' }}>
          {label}
        </span>
      )}
      
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          className="dark-input font-sans"
          style={{
            padding: '0.5rem 2.25rem 0.5rem 0.75rem',
            borderRadius: '0.625rem',
            fontSize: '0.8125rem',
            width: '100%',
            background: 'rgba(8, 12, 28, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#cbd5e1',
            minHeight: '40px',
            fontFamily: 'Sora, sans-serif'
          }}
        />
        
        {/* Botão de abrir calendário (Super Visível) */}
        <button
          type="button"
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          style={{
            position: 'absolute',
            right: '0.625rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isPopoverOpen ? '#60a5fa' : '#94a3b8',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => {
            if (!isPopoverOpen) e.currentTarget.style.color = '#cbd5e1';
          }}
          onMouseLeave={e => {
            if (!isPopoverOpen) e.currentTarget.style.color = '#94a3b8';
          }}
          title="Abrir calendário"
        >
          <Calendar style={{ width: '1.05rem', height: '1.05rem' }} />
        </button>

        {/* Botão de limpar rápido (se houver valor digitado) */}
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: '2.1rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
            onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
            title="Limpar data"
          >
            <X style={{ width: '0.85rem', height: '0.85rem' }} />
          </button>
        )}
      </div>

      {/* Popover do Calendário Customizado (Premium Glassmorphism) */}
      {isPopoverOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 1000,
            width: '280px',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '0.75rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
            padding: '1rem',
            animation: 'fadeInUp 0.15s ease-out',
            fontFamily: 'Sora, sans-serif',
            userSelect: 'none'
          }}
        >
          {/* Header do Calendário */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f1f5f9' }}>
              {monthsBr[month]} de {year}
            </span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                type="button"
                onClick={() => navigateMonth('prev')}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  color: '#94a3b8',
                  borderRadius: '0.375rem',
                  padding: '4px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#cbd5e1'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; e.currentTarget.style.color = '#94a3b8'; }}
              >
                <ChevronLeft style={{ width: '1rem', height: '1rem' }} />
              </button>
              <button
                type="button"
                onClick={() => navigateMonth('next')}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  color: '#94a3b8',
                  borderRadius: '0.375rem',
                  padding: '4px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#cbd5e1'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; e.currentTarget.style.color = '#94a3b8'; }}
              >
                <ChevronRight style={{ width: '1rem', height: '1rem' }} />
              </button>
            </div>
          </div>

          {/* Cabeçalho de Dias da Semana (D, S, T, ...) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px', textAlign: 'center' }}>
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
              <span key={i} style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', padding: '4px 0' }}>
                {d}
              </span>
            ))}
          </div>

          {/* Grid de Dias */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
            {gridCells.map((cell, idx) => {
              const active = isSelected(cell.date);
              const current = cell.isCurrentMonth;
              const todayMark = isToday(cell.date);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectDate(cell.date)}
                  style={{
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.75rem',
                    fontWeight: active ? '700' : '500',
                    fontFamily: 'JetBrains Mono, monospace',
                    height: '30px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.1s ease',
                    background: active
                      ? '#2563eb'
                      : todayMark
                      ? 'rgba(96, 165, 250, 0.15)'
                      : 'transparent',
                    color: active
                      ? '#ffffff'
                      : current
                      ? todayMark
                        ? '#60a5fa'
                        : '#cbd5e1'
                      : '#475569',
                    borderStyle: todayMark && !active ? 'solid' : 'none',
                    borderWidth: '1px',
                    borderColor: 'rgba(96, 165, 250, 0.4)'
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      if (!todayMark) e.currentTarget.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.background = todayMark ? 'rgba(96, 165, 250, 0.15)' : 'transparent';
                      if (!todayMark) e.currentTarget.style.color = current ? '#cbd5e1' : '#475569';
                    }
                  }}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Footer do Calendário com Ações */}
          <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
            <button
              type="button"
              onClick={handleToday}
              style={{
                flex: 1,
                padding: '5px 0',
                borderRadius: '0.375rem',
                background: 'rgba(96, 165, 250, 0.1)',
                border: '1px solid rgba(96, 165, 250, 0.2)',
                color: '#60a5fa',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(96, 165, 250, 0.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(96, 165, 250, 0.1)'; }}
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={handleClear}
              style={{
                flex: 1,
                padding: '5px 0',
                borderRadius: '0.375rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
            >
              Limpar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
