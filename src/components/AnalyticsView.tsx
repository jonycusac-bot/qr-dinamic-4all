import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Smartphone,
  Calendar,
  Globe,
  TrendingUp,
  ArrowUpRight,
  Eye,
  Filter,
  CheckCircle2,
  ExternalLink,
  Laptop,
  Tablet,
  Search,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useApp } from '../context/AppContext';

const COLORS = ['#0284c7', '#6366f1', '#10b981', '#f59e0b', '#ec4899'];

export const AnalyticsView: React.FC = () => {
  const { scans, projects, getStats, recordSimulatedScan } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [deviceFilter, setDeviceFilter] = useState<string>('all');

  const stats = useMemo(() => getStats(), [getStats]);

  // Filtered scans feed
  const filteredScans = useMemo(() => {
    return scans.filter((s) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        s.clientName.toLowerCase().includes(q) ||
        s.projectName.toLowerCase().includes(q) ||
        s.browser.toLowerCase().includes(q) ||
        s.os.toLowerCase().includes(q);

      const matchesDevice = deviceFilter === 'all' || s.deviceType === deviceFilter;
      return matchesSearch && matchesDevice;
    });
  }, [scans, searchTerm, deviceFilter]);

  const handleSimulateQuickScan = async () => {
    if (projects.length === 0) return;
    const randomProject = projects[Math.floor(Math.random() * projects.length)];
    const devices = ['mobile', 'mobile', 'mobile', 'tablet', 'desktop'];
    const systems = ['iOS', 'Android', 'iOS', 'iPadOS', 'Windows'];
    const idx = Math.floor(Math.random() * devices.length);
    try { await recordSimulatedScan(randomProject.shortCode, devices[idx], systems[idx]); } catch { /* Shared error banner. */ }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Quick Simulation trigger */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 text-white border border-slate-700/80 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-400 border border-sky-500/30 mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            Métricas de Campo en Tiempo Real
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Estadísticas y Analíticas de Escaneo
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mt-1">
            Supervisa qué clientes y técnicos abren la documentación técnica en OneDrive al escanear los códigos QR físicos en las viviendas.
          </p>
        </div>

        <button
          onClick={handleSimulateQuickScan}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-900 font-bold text-xs rounded-xl shadow-lg transition cursor-pointer shrink-0"
        >
          <Smartphone className="w-4 h-4" />
          <span>Simular Nuevo Escaneo Móvil</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Escaneos Totales</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{stats.totalScans}</h3>
          <p className="text-xs text-slate-500 mt-1">
            En {stats.uniqueProjectsScanned} instalaciones distintas
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Últimas 24 Horas</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-emerald-600">+{stats.scansToday}</h3>
          <p className="text-xs text-slate-500 mt-1">
            +{stats.scansThisWeek} en los últimos 7 días
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Móviles y Tablets</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{stats.mobilePercentage}%</h3>
          <p className="text-xs text-slate-500 mt-1">
            Lectores de cámara de smartphones en vivienda
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Tasa de Redirección</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-purple-600">100%</h3>
          <p className="text-xs text-slate-500 mt-1">
            0 enlaces rotos gracias al QR dinámico
          </p>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scans Over Time Line/Area Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Evolución de Escaneos (7 Días)</h3>
              <p className="text-xs text-slate-500">Actividad de lectura por clientes y operarios</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
              <span>Escaneos diarios</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.scansOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    border: 'none',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="scans"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorScans)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device Breakdown Pie Chart (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="mb-4">
            <h3 className="font-bold text-sm text-slate-900">Dispositivos Utilizados</h3>
            <p className="text-xs text-slate-500">Tipo de aparato con el que se leyó el QR</p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.deviceBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {stats.deviceBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    border: 'none',
                  }}
                />
                <Legend
                  formatter={(value) => <span className="text-xs text-slate-700">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Most Scanned Installations Bar Chart (12 cols) */}
        <div className="lg:col-span-12 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="mb-4">
            <h3 className="font-bold text-sm text-slate-900">Instalaciones con Mayor Número de Consultas</h3>
            <p className="text-xs text-slate-500">Ranking de proyectos más escaneados por volumen</p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.topProjects}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  type="category"
                  dataKey="client"
                  width={140}
                  tick={{ fontSize: 11, fill: '#334155' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    border: 'none',
                  }}
                  formatter={(value: any, name: any, props: any) => [
                    `${value} escaneos (${props.payload.name})`,
                    'Escaneos',
                  ]}
                />
                <Bar dataKey="scans" fill="#0284c7" radius={[0, 8, 8, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Real-time Scan Event History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Registro en Tiempo Real de Escaneos</h3>
            <p className="text-xs text-slate-500">Auditoría detallada de cada acceso a la documentación</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar eventos..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <select
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700"
            >
              <option value="all">Todos los aparatos</option>
              <option value="mobile">Móvil</option>
              <option value="tablet">Tablet</option>
              <option value="desktop">Escritorio</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-4">Fecha y Hora</th>
                <th className="py-3 px-4">Cliente / Vivienda</th>
                <th className="py-3 px-4">Proyecto</th>
                <th className="py-3 px-4">Dispositivo y SO</th>
                <th className="py-3 px-4">Ubicación / IP</th>
                <th className="py-3 px-4">Enlace de Destino</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredScans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No hay registros de escaneo que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredScans.slice(0, 25).map((scan) => (
                  <tr key={scan.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {new Date(scan.scannedAt).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {scan.clientName}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                      {scan.projectName}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {scan.deviceType === 'mobile' ? (
                          <Smartphone className="w-3.5 h-3.5 text-sky-600" />
                        ) : scan.deviceType === 'tablet' ? (
                          <Tablet className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <Laptop className="w-3.5 h-3.5 text-slate-600" />
                        )}
                        <span className="font-medium text-slate-800">
                          {scan.os} ({scan.browser})
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-[11px] text-slate-500">
                      <span>{scan.city}, {scan.country}</span>
                      <span className="text-slate-400 ml-1 font-mono">({scan.ipMasked})</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <a
                        href={scan.redirectUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-sky-600 hover:text-sky-800 font-mono truncate max-w-xs"
                      >
                        <span className="truncate max-w-[140px]">{scan.redirectUrl}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
