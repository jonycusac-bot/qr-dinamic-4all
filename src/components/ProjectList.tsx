import React, { useState, useMemo } from 'react';
import {
  Search,
  FolderSync,
  QrCode,
  ExternalLink,
  User,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  PauseCircle,
  Smartphone,
  Filter,
  ArrowUpDown,
  History,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { QRProject, ProjectStatus } from '../types';
import { useApp } from '../context/AppContext';
import { ConfirmModal } from './ConfirmModal';

interface ProjectListProps {
  onNewProject: () => void;
  onEditProject: (project: QRProject) => void;
  onOpenQuickOneDrive: (project: QRProject) => void;
  onOpenQRSticker: (project: QRProject) => void;
  onOpenSimulator: (project: QRProject) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  onNewProject,
  onEditProject,
  onOpenQuickOneDrive,
  onOpenQRSticker,
  onOpenSimulator,
}) => {
  const { projects, deleteProject, updateProject, getDynamicUrl, currentUser, isAdmin } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');
  const [technicianFilter, setTechnicianFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'scans' | 'client'>('date');

  // Extract unique technicians
  const technicians = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.technician) set.add(p.technician);
    });
    return Array.from(set);
  }, [projects]);

  // Filter & Sort
  const filteredProjects = useMemo(() => {
    return projects
      .filter((project) => {
        const query = searchTerm.toLowerCase();
        const matchesQuery =
          project.clientName.toLowerCase().includes(query) ||
          project.projectName.toLowerCase().includes(query) ||
          project.shortCode.toLowerCase().includes(query);

        const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
        const matchesTech = technicianFilter === 'all' || project.technician === technicianFilter;

        return matchesQuery && matchesStatus && matchesTech;
      })
      .sort((a, b) => {
        if (sortBy === 'scans') return (b.scanCount || 0) - (a.scanCount || 0);
        if (sortBy === 'client') return a.clientName.localeCompare(b.clientName);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [projects, searchTerm, statusFilter, technicianFilter, sortBy]);

  const totalScans = useMemo(() => {
    return projects.reduce((sum, p) => sum + (p.scanCount || 0), 0);
  }, [projects]);

  const [projectToDelete, setProjectToDelete] = useState<QRProject | null>(null);

  const handleToggleStatus = async (project: QRProject) => {
    const nextStatus: ProjectStatus = project.status === 'active' ? 'paused' : 'active';
    try { await updateProject(project.id, { status: nextStatus }); } catch { /* Shared error banner. */ }
  };

  const handleDelete = (project: QRProject) => {
    setProjectToDelete(project);
  };

  const confirmDelete = async () => {
    if (projectToDelete) {
      try { await deleteProject(projectToDelete.id); setProjectToDelete(null); }
      catch { /* Shared error banner; leave the dialog open. */ }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Instalaciones</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{projects.length}</h3>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">
              {projects.filter((p) => p.status === 'active').length} códigos QR activos
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
            <QrCode className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Escaneos Totales</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalScans}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Por clientes y técnicos</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <Smartphone className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Destinos configurados</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{projects.filter(p => p.status === 'active' && !!p.destinationUrl).length}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Instalaciones activas con enlace</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <FolderSync className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Técnicos de Campo</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{technicians.length}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Asignados a viviendas</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
            <User className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, proyecto o enlace..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-800"
            />
          </div>

          {/* Filters & Sorting */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-medium text-slate-600">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                Todas ({projects.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  statusFilter === 'active' ? 'bg-white text-emerald-700 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                Activas ({projects.filter((p) => p.status === 'active').length})
              </button>
              <button
                onClick={() => setStatusFilter('paused')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  statusFilter === 'paused' ? 'bg-white text-amber-700 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                Pausadas ({projects.filter((p) => p.status === 'paused').length})
              </button>
            </div>

            {/* Quick My Installations filter button */}
            {currentUser?.name && (
              <button
                onClick={() => {
                  if (technicianFilter === currentUser.name) {
                    setTechnicianFilter('all');
                  } else {
                    setTechnicianFilter(currentUser.name);
                  }
                }}
                className={`text-xs px-3 py-1.5 rounded-xl border font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  technicianFilter === currentUser.name
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title="Filtrar instalaciones de las que soy responsable"
              >
                <User className="w-3.5 h-3.5" />
                <span>
                  Mis Obras ({projects.filter((p) => p.technician === currentUser.name).length})
                </span>
              </button>
            )}

            {/* Technician filter */}
            {technicians.length > 0 && (
              <select
                value={technicianFilter}
                onChange={(e) => setTechnicianFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="all">Todos los técnicos ({technicians.length})</option>
                {technicians.map((t) => (
                  <option key={t} value={t}>
                    {t} ({projects.filter((p) => p.technician === t).length})
                  </option>
                ))}
              </select>
            )}

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="date">Más recientes primero</option>
              <option value="scans">Más escaneados</option>
              <option value="client">Nombre del cliente (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects List */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-1">
            No se encontraron instalaciones
          </h3>
          <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto">
            {searchTerm
              ? 'Prueba a ajustar tu búsqueda o elimina los filtros aplicados.'
              : 'Empieza registrando tu primera instalación en casa de cliente con su código QR.'}
          </p>
          <button
            onClick={onNewProject}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Primera Instalación</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredProjects.map((project) => {
            const dynamicUrl = getDynamicUrl(project.shortCode);
            const historyCount = project.destinationHistory?.length || 0;

            return (
              <div
                key={project.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5"
              >
                {/* Left info: Client & Project details */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Clickable QR mini thumbnail */}
                  <div
                    onClick={() => onOpenQRSticker(project)}
                    className="w-16 h-16 shrink-0 bg-slate-50 border border-slate-200 rounded-xl p-1.5 flex flex-col items-center justify-center cursor-pointer hover:border-sky-400 transition group shadow-sm"
                    title="Clic para ver/imprimir pegatina QR"
                  >
                    <QrCode
                      className="w-9 h-9 text-slate-900 group-hover:scale-105 transition"
                    />
                    <span className="text-[9px] text-sky-600 font-semibold mt-0.5 group-hover:underline">
                      Ver QR
                    </span>
                  </div>

                  {/* Text details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {project.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          Pausado
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        <Smartphone className="w-3 h-3 text-slate-400" />
                        <strong>{project.scanCount || 0}</strong> escaneos
                      </span>

                      {project.qrTargetType === 'direct' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          Directo OneDrive
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          QR Dinámico
                        </span>
                      )}
                    </div>

                    {/* Client Name */}
                    <h3 className="text-base font-bold text-slate-900 tracking-tight truncate">
                      {project.clientName}
                    </h3>

                    {/* Project Name */}
                    <p className="text-xs text-slate-600 font-medium truncate mb-2">
                      {project.projectName}
                    </p>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Técnico: <strong className="text-slate-700">{project.technician}</strong></span>
                      </div>
                    </div>

                    {/* Current OneDrive destination display */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200/70 p-2 rounded-xl text-xs">
                      <div className="flex items-center gap-1 text-slate-500 font-semibold shrink-0">
                        <FolderSync className="w-3.5 h-3.5 text-sky-600" />
                        <span>Destino OneDrive:</span>
                      </div>
                      <span className="font-mono text-slate-700 truncate max-w-md flex-1 text-[11px]">
                        {project.destinationUrl}
                      </span>
                      {historyCount > 0 && (
                        <span
                          className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium flex items-center gap-1 cursor-pointer"
                          onClick={() => onOpenQuickOneDrive(project)}
                          title="Ver historial de cambios"
                        >
                          <History className="w-3 h-3" />
                          {historyCount} cambios
                        </span>
                      )}
                      <a
                        href={project.destinationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-600 hover:text-sky-800 text-[11px] font-semibold flex items-center gap-1 ml-auto"
                      >
                        <span>Abrir</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Right: Quick action buttons */}
                <div className="flex flex-wrap lg:flex-col items-center lg:items-end justify-end gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  {/* Primary requirement: update OneDrive destination in 1-click without losing QR */}
                  <button
                    onClick={() => onOpenQuickOneDrive(project)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm"
                    title="Actualizar la carpeta destino si ha cambiado o se ha renombrado"
                  >
                    <FolderSync className="w-3.5 h-3.5" />
                    <span>Cambiar OneDrive</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onOpenQRSticker(project)}
                      className="inline-flex items-center gap-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium transition cursor-pointer shadow-sm"
                      title="Ver e imprimir pegatina adhesiva para la vivienda"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Pegatina QR</span>
                    </button>

                    <button
                      onClick={() => onOpenSimulator(project)}
                      className="inline-flex items-center gap-1 px-2.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-medium transition cursor-pointer"
                      title="Probar escaneo como cliente móvil"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Probar</span>
                    </button>

                    <button
                      onClick={() => onEditProject(project)}
                      className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                      title="Editar datos y diseño"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleToggleStatus(project)}
                      className={`p-2 rounded-xl transition cursor-pointer ${
                        project.status === 'active'
                          ? 'text-emerald-600 hover:text-amber-600 hover:bg-amber-50'
                          : 'text-amber-600 hover:text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title={project.status === 'active' ? 'Pausar redirección' : 'Reanudar redirección'}
                    >
                      {project.status === 'active' ? (
                        <PauseCircle className="w-4 h-4" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={() => handleDelete(project)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                      title="Eliminar instalación"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(projectToDelete)}
        title="Eliminar Instalación"
        message={`¿Seguro que deseas eliminar la instalación de "${projectToDelete?.clientName || ''}"? El código QR dejará de redirigir y se perderán sus estadísticas.`}
        confirmText="Eliminar Instalación"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setProjectToDelete(null)}
      />
    </div>
  );
};
