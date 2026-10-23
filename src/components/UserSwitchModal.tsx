import React from 'react';
import { X, Users, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface UserSwitchModalProps { isOpen: boolean; onClose: () => void; }

export const UserSwitchModal: React.FC<UserSwitchModalProps> = ({ isOpen, onClose }) => {
  const { users, currentUser, loginAsUser } = useApp();
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="profile-title" className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <h3 id="profile-title" className="font-bold flex items-center gap-2"><Users className="w-5 h-5" />Perfil de trabajo</h3>
          <button onClick={onClose} aria-label="Cerrar" className="p-2"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-slate-500">Selecciona un perfil para las asignaciones y filtros. Todos los perfiles tienen acceso completo al panel.</p>
          {users.filter(u => u.active).map(user => (
            <button key={user.id} onClick={() => { loginAsUser(user.id); onClose(); }} className="w-full text-left p-3 rounded-xl border border-slate-200 hover:bg-sky-50 flex items-center justify-between">
              <span><span className="block font-semibold text-slate-800">{user.name}</span><span className="text-xs text-slate-500">{user.email}</span></span>
              {currentUser?.id === user.id && <CheckCircle2 className="w-5 h-5 text-sky-600" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
