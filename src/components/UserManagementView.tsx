import {TeamAccess} from '../TeamAccess';
import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Wrench,
  Eye,
  Mail,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  X,
  Layers,
  AlertCircle,
  Lock,
  Check,
} from 'lucide-react';
import { AppUser, UserRole } from '../types';
import { useApp } from '../context/AppContext';
import { ConfirmModal } from './ConfirmModal';

export const UserManagementView: React.FC = () => {
  const { accountMode, users, createUser, updateUser, deleteUser, projects, currentUser, isAdmin } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('technician');
  const [error, setError] = useState<string | null>(null);

  if(accountMode)return <TeamAccess/>;
  const handleOpenCreate = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setRole('technician');
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: AppUser) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Introduce un correo electrónico válido');
      return;
    }

    try {
      if (editingUser) {
        await updateUser(editingUser.id, {
          name: name.trim(),
          email: email.trim(),
          role,
        });
      } else {
        await createUser({
          name: name.trim(),
          email: email.trim(),
          role,
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      setError('Error al guardar el usuario.');
    }
  };

  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);

  const handleToggleStatus = async (user: AppUser) => {
    if (!isAdmin) return;
    try { await updateUser(user.id, { active: !user.active }); } catch { /* Shared error banner. */ }
  };

  const handleDelete = (user: AppUser) => {
    if (!isAdmin) return;
    if (user.id === 'user-1') {
      return;
    }
    setUserToDelete(user);
  };

  const confirmDeleteUser = async () => {
    if (userToDelete) {
      try { await deleteUser(userToDelete.id); setUserToDelete(null); }
      catch { /* Shared error banner; leave the dialog open. */ }
    }
  };

  // Count installations assigned to each technician
  const getInstallationsCount = (techName: string) => {
    return projects.filter((p) => p.technician.toLowerCase() === techName.toLowerCase()).length;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Gestión de Usuarios y Equipo Técnico
            </h2>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            Equipo de técnicos instaladores autorizados para registrar viviendas, crear códigos QR y gestionar enlaces de documentación.
          </p>
        </div>

        {isAdmin ? (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-xl shadow-md transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Añadir Nuevo Usuario</span>
            </button>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 text-slate-600 text-xs font-medium rounded-xl border border-slate-200 shrink-0">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Gestión reservada al Administrador</span>
          </div>
        )}
      </div>

      {!isAdmin && (
        <div className="bg-sky-50/80 border border-sky-200 p-4 rounded-2xl flex items-center gap-3 text-xs text-sky-800">
          <Shield className="w-4 h-4 text-sky-600 shrink-0" />
          <p>
            Has entrado como <strong>{currentUser?.name || 'Técnico'}</strong> ({currentUser?.role === 'technician' ? 'Técnico Instalador' : 'Usuario'}). Las altas, bajas y cambios de permisos de usuarios están centralizados por <strong>el administrador</strong>.
          </p>
        </div>
      )}

      {/* Role explanation cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Administrador</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              el administrador. Control total: creación, edición y borrado de proyectos, gestión de usuarios del equipo y configuración global.
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Técnico Instalador</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              Compañeros instaladores. Creación de instalaciones, vinculación de carpetas OneDrive y generación directa de pegatinas QR.
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Visualizador / Consulta</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              Acceso para consulta rápida de documentación técnica, histórico de escaneos y estado de viviendas.
            </p>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">
            Miembros del Equipo ({users.length})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-4">Usuario</th>
                <th className="py-3 px-4">Rol en la Empresa</th>
                <th className="py-3 px-4">Correo Electrónico</th>
                <th className="py-3 px-4">Instalaciones Asignadas</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => {
                const assignedCount = getInstallationsCount(user.name);
                const isCurrent = currentUser?.id === user.id;

                return (
                  <tr key={user.id} className={`hover:bg-slate-50/80 transition ${isCurrent ? 'bg-sky-50/30' : ''}`}>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                          {user.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900">{user.name}</p>
                            {isCurrent && (
                              <span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.2 rounded font-semibold">Tú</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">Alta: {user.createdAt}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {user.role === 'admin' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
                          <Shield className="w-3 h-3 text-sky-600" />
                          Administrador
                        </span>
                      )}
                      {user.role === 'technician' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <Wrench className="w-3 h-3 text-emerald-600" />
                          Técnico Instalador
                        </span>
                      )}
                      {user.role === 'viewer' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                          <Eye className="w-3 h-3 text-slate-500" />
                          Visualizador
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{user.email}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <Layers className="w-3 h-3 text-slate-500" />
                        {assignedCount} viviendas
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        disabled={!isAdmin}
                        className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full transition ${
                          isAdmin ? 'cursor-pointer' : 'cursor-default'
                        } ${
                          user.active
                            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
                            : 'text-slate-500 bg-slate-100 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {user.active ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>Activo</span>
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            <span>Inactivo</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-right space-x-1">
                      {isAdmin ? (
                        <>
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Editar usuario"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {user.id !== 'user-1' && (
                            <button
                              onClick={() => handleDelete(user)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              title="Eliminar usuario"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-300 text-[11px] italic">Solo lectura</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-base text-white">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario / Técnico'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Nicolas Ariño"
                  className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo Electrónico <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@empresa.com"
                  className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Puedes especificar el correo exacto de cada compañero para notificaciones.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rol y Permisos
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                >
                  <option value="technician">Técnico Instalador (Crea instalaciones y pegatinas)</option>
                  <option value="admin">Administrador (Control total del sistema)</option>
                  <option value="viewer">Visualizador (Solo lectura)</option>
                </select>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl shadow-md transition cursor-pointer"
                >
                  {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(userToDelete)}
        title="Eliminar Usuario"
        message={`¿Seguro que deseas eliminar al usuario "${userToDelete?.name || ''}"? Perderá el acceso para registrar instalaciones.`}
        confirmText="Eliminar Usuario"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={confirmDeleteUser}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
};
