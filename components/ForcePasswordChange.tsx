import React, { useState } from 'react';
import { User } from '../types';
import { updateUserPassword } from '../services/storageService';
import { Shield, Save } from 'lucide-react';

interface Props {
  user: User;
  onSuccess: (updatedUser: User) => void;
}

export const ForcePasswordChange: React.FC<Props> = ({ user, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const success = await updateUserPassword(user.id, password);
    setLoading(false);

    if (success) {
      onSuccess({ ...user, needsPasswordChange: false });
    } else {
      setError('Erro ao atualizar senha. Tente novamente.');
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#020617', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '400px', background: 'rgba(10,18,35,0.75)', border: '1px solid rgba(30,41,59,0.9)', borderRadius: '1rem', padding: '2rem', backdropFilter: 'blur(10px)', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <div style={{ background: 'rgba(59,130,246,0.1)', padding: '1rem', borderRadius: '50%', color: '#60a5fa' }}>
            <Shield size={32} />
          </div>
        </div>
        <h2 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Bem-vindo(a), {user.name}!</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Por questões de segurança, você precisa alterar a senha padrão criada pelo administrador antes de acessar o sistema.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
          {error && <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.5rem', fontSize: '0.875rem', textAlign: 'center' }}>{error}</div>}
          
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600 }}>Nova Senha</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              className="dark-input"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(51,65,85,0.8)', color: 'white', outline: 'none', fontSize: '0.875rem' }}
              placeholder="Mínimo de 6 caracteres"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600 }}>Confirmar Nova Senha</label>
            <input 
              type="password" 
              value={confirm} 
              onChange={e => setConfirm(e.target.value)}
              className="dark-input"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(51,65,85,0.8)', color: 'white', outline: 'none', fontSize: '0.875rem' }}
              placeholder="Digite a senha novamente"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.875rem', borderRadius: '0.5rem', background: loading ? '#475569' : '#3b82f6', color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, transition: 'background 0.2s', fontSize: '0.875rem' }}
          >
            {loading ? 'Salvando...' : <><Save size={18} /> Salvar Nova Senha</>}
          </button>
        </form>
      </div>
    </div>
  );
};
