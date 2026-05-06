
import React, { useState, useMemo, useEffect } from 'react';
import { Search, AlertTriangle, Calendar, User as UserIcon, Trash2, X, Edit2, Save, Upload, Clock, DollarSign, Users, Package } from 'lucide-react';
import { AppState, IssueType, User, IssueRecord } from '../types';
import { ISSUE_TYPES } from '../constants';
import { fetchUsers, updateIssue, uploadPhoto, deletePhotoFromBucket } from '../services/storageService';

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

  useEffect(() => {
    fetchUsers().then(users => {
      setUsersMap(users.reduce((acc, u) => ({ ...acc, [u.id]: u.name }), {} as Record<string, string>));
    });
  }, []);

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
