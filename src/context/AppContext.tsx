import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { QRProject, AppUser, ScanEvent, ScanStatsSummary, Branding } from '../types';
import { requestJson as baseRequestJson, ApiError } from '../utils/api';

interface AppContextType {
  companyId:string|null;
  tenantRole:string;
  accountMode: boolean;
  branding: Branding;
  updateBranding: (data: Branding) => Promise<Branding>;
  projects: QRProject[];
  users: AppUser[];
  scans: ScanEvent[];
  isLoading: boolean;
  syncError: string | null;
  requiresPanelAccess: boolean;
  refreshData: () => Promise<void>;
  selectedProject: QRProject | null;
  setSelectedProject: (p: QRProject | null) => void;
  currentUser: AppUser | null;
  isAdmin: boolean;
  loginAsUser: (userId: string) => void;
  createProject: (data: Partial<QRProject>) => Promise<QRProject>;
  updateProject: (id: string, updates: Partial<QRProject>, changeReason?: string) => Promise<QRProject>;
  deleteProject: (id: string) => Promise<void>;
  updateOneDriveUrl: (id: string, url: string, reason: string) => Promise<QRProject>;
  createUser: (data: Partial<AppUser>) => Promise<AppUser>;
  updateUser: (id: string, updates: Partial<AppUser>) => Promise<AppUser>;
  deleteUser: (id: string) => Promise<void>;
  recordSimulatedScan: (shortCode: string, deviceType?: string, os?: string) => Promise<ScanEvent>;
  getStats: () => ScanStatsSummary;
  getDynamicUrl: (shortCode: string) => string;
  customBaseUrl: string;
  setCustomBaseUrl: (url: string) => void;
  isDevEnvironment: boolean;
  sharedAppUrl: string;
  resetDemo: () => Promise<void>;
}
interface ServerState { branding?: Branding; projects: QRProject[]; users: AppUser[]; scans: ScanEvent[] }
const AppContext = createContext<AppContextType | undefined>(undefined);
const PROFILE_KEY = 'qr_dynamic_current_user_v3';
const BASE_URL_KEY = 'qr_dynamic_base_url_v1';
function readPreference(key: string) {
  try { return localStorage.getItem(key) || ''; } catch { return ''; }
}
function savePreference(key: string, value: string) {
  try { if (value) localStorage.setItem(key, value); else localStorage.removeItem(key); } catch { /* Preferences are optional. */ }
}
export const AppProvider: React.FC<{ children: ReactNode; tenant?:{companyId:string;identityId:string;role:string} }> = ({ children,tenant }) => {
  const requestJson=useCallback(<T,>(url:string,init:RequestInit={})=>baseRequestJson<T>(tenant?'/api/account/companies/'+tenant.companyId+'/panel'+url.replace(/^\/api/,''):url,init),[tenant?.companyId]);
  const [branding, setBranding] = useState<Branding>({name:'QR Dinamic 4all',logoUrl:''});
  const [projects, setProjects] = useState<QRProject[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [scans, setScans] = useState<ScanEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [requiresPanelAccess, setRequiresPanelAccess] = useState(false);
  const [selectedProject, setSelectedProject] = useState<QRProject | null>(null);
  const [currentUserId, setCurrentUserId] = useState(() => readPreference(PROFILE_KEY));
  const [customBaseUrl, setCustomBaseUrlState] = useState(() => import.meta.env.VITE_QR_BASE_URL?.trim() || readPreference(BASE_URL_KEY));
  const revision = useRef(0);
  const pendingWrites = useRef(0);
  const currentUser = tenant ? users.find(u=>u.id===tenant.identityId)||null : users.find(u => u.id === currentUserId && u.active) || users.find(u => u.active) || null;
  const isAdmin = tenant ? ['owner','admin'].includes(tenant.role) : true;
  const applyState = (state: ServerState) => {
    if (state.branding) setBranding(state.branding);
    setProjects(state.projects); setUsers(state.users); setScans(state.scans);
  };
  const refreshData = useCallback(async () => {
    const startedAt = ++revision.current;
    try {
      const state = await requestJson<ServerState>('/api/state');
      if (startedAt !== revision.current || pendingWrites.current) return;
      applyState(state);
      setRequiresPanelAccess(false);
      setSyncError(null);
    } catch (error) {
      if (startedAt === revision.current) {
        if (error instanceof ApiError && error.status === 401) setRequiresPanelAccess(true);
        setSyncError(error instanceof Error ? error.message : 'No se pudo conectar con el servidor.');
      }
    } finally { setIsLoading(false); }
  }, [requestJson]);
  useEffect(() => {
    void requestJson<Branding>('/api/public-branding').then(setBranding).catch(() => undefined);
    void refreshData();
    const refresh = () => { if (!document.hidden) void refreshData(); };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { ++revision.current; window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [refreshData]);
  async function mutate<T>(path: string, method: string, data?: unknown): Promise<T> {
    ++revision.current; ++pendingWrites.current;
    try {
      const value = await requestJson<T>(path, { method, body: data === undefined ? undefined : JSON.stringify(data) });
      setSyncError(null);
      return value;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setRequiresPanelAccess(true);
      setSyncError(error instanceof Error ? error.message : 'No se pudo guardar el cambio.');
      throw error;
    } finally { ++revision.current; --pendingWrites.current; }
  }
  const updateBranding = async (data: Branding) => { const saved = await mutate<Branding>('/api/branding','PUT',data); setBranding(saved); return saved; };
  const loginAsUser = (id: string) => { if(tenant)return;setCurrentUserId(id); savePreference(PROFILE_KEY, id); };
  const setCustomBaseUrl = (url: string) => { const value = url.trim(); setCustomBaseUrlState(value); savePreference(BASE_URL_KEY, value); };
  const isDevEnvironment = window.location.hostname.includes('ais-dev-');
  const sharedAppUrl = isDevEnvironment ? `${window.location.protocol}//${window.location.hostname.replace('ais-dev-', 'ais-pre-')}${window.location.port ? ':' + window.location.port : ''}` : '';
  const getDynamicUrl = (shortCode: string) => `${((tenant?'':customBaseUrl) || window.location.origin).replace(/\/+$/, '')}/${tenant?'q':'r'}/${encodeURIComponent(shortCode)}`;
  const createProject = async (data: Partial<QRProject>) => {
    const saved = await mutate<QRProject>('/api/projects', 'POST', data);
    setProjects(prev => [saved, ...prev.filter(p => p.id !== saved.id)]);
    return saved;
  };
  const updateProject = async (id: string, updates: Partial<QRProject>, changeReason?: string) => {
    const saved = await mutate<QRProject>(`/api/projects/${encodeURIComponent(id)}`, 'PUT', { ...(tenant ? projects.find(p=>p.id===id) : {}), ...updates, changeReason, changedBy: currentUser?.name });
    setProjects(prev => prev.map(p => p.id === id ? saved : p));
    return saved;
  };
  const updateOneDriveUrl = (id: string, url: string, reason: string) => updateProject(id, { destinationUrl: url }, reason);
  const deleteProject = async (id: string) => {
    await mutate(`/api/projects/${encodeURIComponent(id)}`, 'DELETE');
    setProjects(prev => prev.filter(p => p.id !== id));
  };
  const createUser = async (data: Partial<AppUser>) => {
    const saved = await mutate<AppUser>('/api/users', 'POST', data);
    setUsers(prev => [...prev, saved]); return saved;
  };
  const updateUser = async (id: string, updates: Partial<AppUser>) => {
    const saved = await mutate<AppUser>(`/api/users/${encodeURIComponent(id)}`, 'PUT', updates);
    setUsers(prev => prev.map(u => u.id === id ? saved : u)); return saved;
  };
  const deleteUser = async (id: string) => {
    await mutate(`/api/users/${encodeURIComponent(id)}`, 'DELETE');
    setUsers(prev => prev.filter(u => u.id !== id));
  };
  const recordSimulatedScan = async (shortCode: string, deviceType = 'mobile', os = 'iOS') => {
    const saved = await mutate<ScanEvent>('/api/scans/record', 'POST', { shortCode, deviceType, os, browser: os === 'iOS' ? 'Safari' : 'Chrome' });
    setScans(prev => [saved, ...prev]);
    setProjects(prev => prev.map(p => p.id === saved.projectId ? { ...p, scanCount: p.scanCount + 1, lastScannedAt: saved.scannedAt } : p));
    return saved;
  };
  const getStats = (): ScanStatsSummary => {
    const totalScans = projects.reduce((acc, p) => acc + (p.scanCount || 0), 0);
    const uniqueProjectsScanned = projects.filter((p) => (p.scanCount || 0) > 0).length;

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const scansToday = scans.filter((s) => new Date(s.scannedAt) >= oneDayAgo).length;
    const scansThisWeek = scans.filter((s) => new Date(s.scannedAt) >= oneWeekAgo).length;

    const mobileCount = scans.filter((s) => s.deviceType === 'mobile' || s.deviceType === 'tablet').length;
    const mobilePercentage = scans.length > 0 ? Math.round((mobileCount / scans.length) * 100) : 0;

    // Device breakdown
    const devicesMap: Record<string, number> = {};
    scans.forEach((s) => {
      const type = s.deviceType === 'mobile' ? 'Móvil' : s.deviceType === 'tablet' ? 'Tablet' : 'Escritorio';
      devicesMap[type] = (devicesMap[type] || 0) + 1;
    });
    const deviceBreakdown = Object.entries(devicesMap).map(([name, value]) => ({ name, value }));


    // Scans over the last 7 days
    const daysMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const label = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
      daysMap[label] = 0;
    }
    scans.forEach((s) => {
      const d = new Date(s.scannedAt);
      const label = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
      if (daysMap[label] !== undefined) {
        daysMap[label]++;
      }
    });
    const scansOverTime = Object.entries(daysMap).map(([date, count]) => ({
      date,
      scans: count,
    }));

    // Top projects
    const topProjects = [...projects]
      .sort((a, b) => (b.scanCount || 0) - (a.scanCount || 0))
      .slice(0, 5)
      .map((p) => ({
        name: p.projectName,
        client: p.clientName,
        scans: p.scanCount || 0,
        shortCode: p.shortCode,
      }));

    return {
      totalScans,
      uniqueProjectsScanned,
      scansToday,
      scansThisWeek,
      mobilePercentage,
      deviceBreakdown,
      scansOverTime,
      topProjects,
    };
  };


  const resetDemo = async () => {
    const state = await mutate<ServerState>('/api/reset-demo', 'POST');
    applyState(state);
  };
  return <AppContext.Provider value={{ companyId:tenant?.companyId||null,tenantRole:tenant?.role||'',accountMode:!!tenant,branding, updateBranding, projects, users, scans, isLoading, syncError, requiresPanelAccess, refreshData, selectedProject, setSelectedProject, currentUser, isAdmin, loginAsUser, createProject, updateProject, deleteProject, updateOneDriveUrl, createUser, updateUser, deleteUser, recordSimulatedScan, getStats, getDynamicUrl, customBaseUrl, setCustomBaseUrl, isDevEnvironment, sharedAppUrl, resetDemo }}>{children}</AppContext.Provider>;
};
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
