import React, { useState, lazy, Suspense } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header, TabType } from './components/Header';
import { ProjectList } from './components/ProjectList';
import { ProjectForm } from './components/ProjectForm';
import { UserManagementView } from './components/UserManagementView';
import { OneDriveQuickModal } from './components/OneDriveQuickModal';
import { QRStickerModal } from './components/QRStickerModal';
import { ScanSimulatorModal } from './components/ScanSimulatorModal';
import { QRProject } from './types';
import { setPanelAccessKey } from './utils/api';
import {
  FolderSync,
  QrCode,
  ShieldCheck,
  Building2,
  HeartHandshake,
} from 'lucide-react';

const AnalyticsView = lazy(() => import('./components/AnalyticsView').then(module => ({ default: module.AnalyticsView })));

const AppContent: React.FC = () => {
  const { branding, syncError, refreshData, isLoading, requiresPanelAccess } = useApp();
  const [panelKey, setPanelKey] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [accessAttempted, setAccessAttempted] = useState(false);

  const [currentTab, setCurrentTab] = useState<TabType>('projects');
  const [editingProject, setEditingProject] = useState<QRProject | null>(null);

  // Modals
  const [quickOneDriveProject, setQuickOneDriveProject] = useState<QRProject | null>(null);
  const [isQuickOneDriveOpen, setIsQuickOneDriveOpen] = useState(false);

  const [stickerProject, setStickerProject] = useState<QRProject | null>(null);
  const [isStickerModalOpen, setIsStickerModalOpen] = useState(false);

  const [simulatorProject, setSimulatorProject] = useState<QRProject | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  const handleNewProject = () => {
    setEditingProject(null);
    setCurrentTab('new-project');
  };

  const handleEditProject = (project: QRProject) => {
    setEditingProject(project);
    setCurrentTab('new-project');
  };

  const handleOpenQuickOneDrive = (project: QRProject) => {
    setQuickOneDriveProject(project);
    setIsQuickOneDriveOpen(true);
  };

  const handleOpenSticker = (project: QRProject) => {
    setStickerProject(project);
    setIsStickerModalOpen(true);
  };

  const handleOpenSimulator = (project: QRProject) => {
    setSimulatorProject(project);
    setIsSimulatorOpen(true);
  };

  const handleSavedProject = (project: QRProject) => {
    setCurrentTab('projects');
    setEditingProject(null);
    // Show sticker modal for the newly created or updated project
    setStickerProject(project);
    setIsStickerModalOpen(true);
  };

  if (requiresPanelAccess) return <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
    <form className="bg-white rounded-2xl border border-slate-200 p-7 sm:p-9 max-w-md w-full space-y-6 shadow-sm" onSubmit={async event => {
      event.preventDefault(); setUnlocking(true); setPanelAccessKey(panelKey);
      try { await refreshData(); } finally { setUnlocking(false); setAccessAttempted(true); }
    }}>
      <div className="space-y-3 text-center">
        {branding.logoUrl && <img src={branding.logoUrl} alt={branding.name} className="h-16 w-auto max-w-full object-contain mx-auto mb-6" />}
        <h1 className="text-2xl font-bold text-slate-900">{branding.name}</h1>
        <p className="text-sm text-slate-600">Introduce tu clave para acceder al panel.</p>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="panel-key">Clave del panel</label>
        <input id="panel-key" type="password" autoComplete="current-password" required value={panelKey} onChange={event => { setPanelKey(event.target.value); setAccessAttempted(false); }} className="w-full border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500" />
      </div>
      {accessAttempted && syncError && <p role="alert" className="text-sm text-red-700">{syncError === 'Introduce la clave del panel para continuar.' ? 'La clave no es correcta. Inténtalo de nuevo.' : syncError}</p>}
      <button type="submit" disabled={unlocking} className="w-full rounded-xl bg-sky-700 text-white font-semibold p-3 disabled:opacity-50">{unlocking ? 'Comprobando…' : 'Entrar al panel'}</button>
    </form>
  </main>;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {syncError && <div role="alert" className="bg-red-50 text-red-900 border-b border-red-200 px-5 py-3 text-sm">
        {syncError} Los cambios que han fallado no se han guardado.
        <button className="ml-3 underline font-semibold" onClick={() => void refreshData()}>Reintentar conexión</button>
      </div>}
      {isLoading && <div role="status" className="px-5 py-2 text-sm text-slate-600">Cargando instalaciones del servidor…</div>}
      {/* Top Navigation */}
      <Header
        currentTab={currentTab}
        onTabChange={(tab) => {
          if (tab === 'simulator') {
            setIsSimulatorOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
        onNewProjectClick={handleNewProject}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'projects' && (
          <ProjectList
            onNewProject={handleNewProject}
            onEditProject={handleEditProject}
            onOpenQuickOneDrive={handleOpenQuickOneDrive}
            onOpenQRSticker={handleOpenSticker}
            onOpenSimulator={handleOpenSimulator}
          />
        )}

        {currentTab === 'new-project' && (
          <ProjectForm
            initialProject={editingProject}
            onCancel={() => {
              setEditingProject(null);
              setCurrentTab('projects');
            }}
            onSaved={handleSavedProject}
          />
        )}

        {currentTab === 'analytics' && <Suspense fallback={<p role="status">Cargando estadísticas…</p>}><AnalyticsView /></Suspense>}

        {currentTab === 'users' && <UserManagementView />}
      </main>

      {/* Global Modals */}
      <OneDriveQuickModal
        project={quickOneDriveProject}
        isOpen={isQuickOneDriveOpen}
        onClose={() => {
          setIsQuickOneDriveOpen(false);
          setQuickOneDriveProject(null);
        }}
      />

      <QRStickerModal
        project={stickerProject}
        isOpen={isStickerModalOpen}
        onClose={() => {
          setIsStickerModalOpen(false);
          setStickerProject(null);
        }}
      />

      <ScanSimulatorModal
        initialProject={simulatorProject}
        isOpen={isSimulatorOpen}
        onClose={() => {
          setIsSimulatorOpen(false);
          setSimulatorProject(null);
        }}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs">
              QR
            </div>
            <span>
              <strong>{branding.name}</strong> • Códigos QR y enlaces dinámicos
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Gestión de QR dinámicos
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
