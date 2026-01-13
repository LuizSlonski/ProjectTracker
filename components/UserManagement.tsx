
import React, { useState, useEffect } from 'react';
import { UserPlus, Shield, User as UserIcon, CheckCircle, Loader2, Eye, Activity, Briefcase } from 'lucide-react';
import { User, UserRole } from '../types';
import { registerUser, fetchUsers } from '../services/storageService';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('PROJETISTA');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    loadList();
  }, []);

  const loadList = async () => {
    setLoadingList(true);
    const list = await fetchUsers();
    setUsers(list);
    setLoadingList(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsRegistering(true);

    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      username,
      password,
      role
    };

    const result = await registerUser(newUser);
    
    if (result.success) {
      setSuccessMsg(`Usuário ${name} criado com sucesso!`);
      await loadList(); // Refresh list
      // Reset form
      setName('');
      setUsername('');
      setPassword('');
    } else {
      // Show the specific error from the DB/Service
      setErrorMsg(result.message || 'Erro ao criar usuário.');
    }
    setIsRegistering(false);
  };

  const getRoleIcon = (role: UserRole) => {
      switch(role) {
          case 'GESTOR': return <Shield className="w-3 h-3 text-blue-600" />;
          case 'CEO': return <Briefcase className="w-3 h-3 text-yellow-600" />;
          case 'PROCESSOS': return <Activity className="w-3 h-3 text-purple-600" />;
          case 'QUALIDADE': return <Eye className="w-3 h-3 text-red-600" />;
          default: return <UserIcon className="w-3 h-3 text-gray-600" />;
      }
  };

  return (
    <div className="space-y-6">
      {/* Create User Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-6 flex items-center text-gray-800">
          <UserPlus className="w-6 h-6 mr-2 text-indigo-600" />
          Cadastrar Novo Usuário
        </h2>

        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" /> {successMsg}
          </div>
        )}
        
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
            <strong>Erro:</strong> {errorMsg}
            {errorMsg.includes('enum') || errorMsg.includes('check constraint') ? (
                <div className="mt-2 text-xs text-red-600">
                    Dica: O banco de dados não reconhece este cargo. Atualize o ENUM ou Constraint da tabela 'users' no Supabase.
                </div>
            ) : null}
          </div>
        )}

        <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome de Usuário (Login)</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input 
              type="text" // Visible for ease of creation
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Defina uma senha"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Função</label>
            <select 
              value={role}
              onChange={e => setRole(e.target.value as UserRole)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="PROJETISTA">Projetista</option>
              <option value="GESTOR">Gestor</option>
              <option value="CEO">CEO</option>
              <option value="PROCESSOS">Processos</option>
              <option value="QUALIDADE">Qualidade</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <button 
              type="submit"
              disabled={isRegistering}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center"
            >
              {isRegistering ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {isRegistering ? 'Cadastrando...' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
           <h3 className="font-bold text-gray-700">Membros da Equipe</h3>
           {loadingList && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium">
            <tr>
              <th className="p-4">Nome</th>
              <th className="p-4">Usuário</th>
              <th className="p-4">Função</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-800 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                    {u.name.charAt(0)}
                  </div>
                  {u.name}
                </td>
                <td className="p-4 text-gray-600">{u.username}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold flex items-center w-fit gap-1 bg-gray-100 text-gray-700`}>
                    {getRoleIcon(u.role)}
                    {u.role}
                  </span>
                </td>
              </tr>
            ))}
            {!loadingList && users.length === 0 && (
              <tr>
                <td colSpan={3} className="p-4 text-center text-gray-400">Nenhum usuário encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
