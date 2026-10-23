import React, { useState } from 'react';
import {
  Smartphone,
  Scan,
  FolderSync,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  X,
  QrCode,
  Info,
} from 'lucide-react';
import { QRProject } from '../types';
import { useApp } from '../context/AppContext';

interface ScanSimulatorModalProps {
  initialProject?: QRProject | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ScanSimulatorModal: React.FC<ScanSimulatorModalProps> = ({
  initialProject,
  isOpen,
  onClose,
}) => {
  const { projects, recordSimulatedScan, updateOneDriveUrl, getDynamicUrl } = useApp();

  const [selectedId, setSelectedId] = useState<string>(
    initialProject?.id || projects[0]?.id || ''
  );
  const [device, setDevice] = useState<'mobile' | 'tablet'>('mobile');
  const [os, setOs] = useState<'iOS' | 'Android'>('iOS');
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<{
    time: string;
    targetUrl: string;
    clientName: string;
    projectName: string;
  } | null>(null);

  // Quick live test change
  const [testUrlInput, setTestUrlInput] = useState('');
  const [isUpdatingUrl, setIsUpdatingUrl] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  React.useEffect(() => {
    if (initialProject) {
      setSelectedId(initialProject.id);
    }
  }, [initialProject]);

  const currentProject = projects.find((p) => p.id === selectedId) || projects[0];

  React.useEffect(() => {
    if (currentProject) {
      setTestUrlInput(currentProject.destinationUrl);
      setUpdateSuccess(false);
    }
  }, [currentProject]);

  if (!isOpen || !currentProject) return null;

  const dynamicUrl = getDynamicUrl(currentProject.shortCode);

  const handleSimulateScan = async () => {
    setIsScanning(true);
    try {
      await recordSimulatedScan(currentProject.shortCode, device, os);
      setLastResult({
        time: new Date().toLocaleTimeString('es-ES'),
        targetUrl: currentProject.destinationUrl,
        clientName: currentProject.clientName,
        projectName: currentProject.projectName,
      });
    } catch { /* Shared error banner: keep the previous result. */ } finally {
      setIsScanning(false);
    }
  };

  const handleApplyQuickChange = async () => {
    if (!testUrlInput.trim()) return;
    setIsUpdatingUrl(true);
    try {
      await updateOneDriveUrl(
        currentProject.id,
        testUrlInput.trim(),
        'Prueba de actualización dinámica en simulador'
      );
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch { /* Shared error banner: keep the previous result. */ } finally {
      setIsUpdatingUrl(false);
    }
  };

  const handleSetSampleRenamedFolder = () => {
    const timestamp = Date.now().toString().slice(-4);
    setTestUrlInput(
      `https://onedrive.live.com/?id=CARPETA_RENOMBRADA_${timestamp}&cid=EMPRESA_EXPEDIENTES_2024`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 my-6">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Simulador de Escaneo y Redirección en Vivo
              </h3>
              <p className="text-xs text-slate-400">
                Prueba cómo responde el código QR cuando un cliente lo escanea con su smartphone
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Selector & Settings (6 cols) */}
          <div className="md:col-span-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Selecciona la Instalación a Probar
              </label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.clientName} — {p.projectName}
                  </option>
                ))}
              </select>
            </div>

            {/* Device Settings */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dispositivo Móvil
                </label>
                <div className="flex bg-slate-100 p-1 rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => setDevice('mobile')}
                    className={`flex-1 py-1.5 rounded-lg font-medium transition ${
                      device === 'mobile' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    Móvil
                  </button>
                  <button
                    type="button"
                    onClick={() => setDevice('tablet')}
                    className={`flex-1 py-1.5 rounded-lg font-medium transition ${
                      device === 'tablet' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    Tablet
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sistema Operativo
                </label>
                <div className="flex bg-slate-100 p-1 rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => setOs('iOS')}
                    className={`flex-1 py-1.5 rounded-lg font-medium transition ${
                      os === 'iOS' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    iPhone (iOS)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOs('Android')}
                    className={`flex-1 py-1.5 rounded-lg font-medium transition ${
                      os === 'Android' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    Android
                  </button>
                </div>
              </div>
            </div>

            {/* Permanent URL info */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
              <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
                URL Dinámica Impresa en el QR Físico
              </span>
              <p className="font-mono text-sky-700 font-bold truncate">{dynamicUrl}</p>
              <p className="text-[11px] text-slate-500">
                Esta dirección nunca cambia en la pegatina colocada en la casa.
              </p>
            </div>

            {/* Live Scan Trigger */}
            <button
              onClick={handleSimulateScan}
              disabled={isScanning}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50"
            >
              <Scan className="w-4 h-4" />
              <span>
                {isScanning ? 'Simulando Escaneo...' : 'Simular Escaneo con la Cámara del Móvil'}
              </span>
            </button>

            {/* LIVE ONEDRIVE DESTINATION UPDATE TEST (Proves the user's primary feature) */}
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <FolderSync className="w-3.5 h-3.5 text-sky-600" />
                  <span>Simular Cambio de Carpeta OneDrive en Vivo</span>
                </span>
                <button
                  type="button"
                  onClick={handleSetSampleRenamedFolder}
                  className="text-[11px] text-sky-600 hover:text-sky-700 font-semibold cursor-pointer underline"
                >
                  Generar Carpeta Renombrada
                </button>
              </div>

              <input
                type="text"
                value={testUrlInput}
                onChange={(e) => setTestUrlInput(e.target.value)}
                placeholder="https://onedrive.live.com/..."
                className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleApplyQuickChange}
                  disabled={isUpdatingUrl || testUrlInput === currentProject.destinationUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isUpdatingUrl ? 'animate-spin' : ''}`} />
                  <span>Actualizar Destino en la Nube</span>
                </button>

                {updateSuccess && (
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ¡Actualizado! Prueba escanear ahora
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Virtual Smartphone Display (6 cols) */}
          <div className="md:col-span-6 flex flex-col items-center justify-center">
            {/* Phone Mockup Frame */}
            <div className="w-[280px] bg-slate-900 rounded-[38px] p-3 shadow-2xl border-4 border-slate-700 relative">
              {/* Dynamic Island / Speaker Notch */}
              <div className="w-20 h-4 bg-slate-800 rounded-full mx-auto mb-2 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-slate-900"></div>
              </div>

              {/* Screen Canvas */}
              <div className="bg-slate-950 rounded-[28px] overflow-hidden text-white min-h-[380px] flex flex-col p-4">
                {/* Status bar */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-3 px-1">
                  <span>9:41</span>
                  <span>5G • 100%</span>
                </div>

                {lastResult ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>

                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-sky-400 font-bold">
                        ¡Escaneo Detectado!
                      </span>
                      <h4 className="text-sm font-bold text-white mt-0.5">
                        {lastResult.clientName}
                      </h4>
                      <p className="text-[11px] text-slate-400">{lastResult.projectName}</p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl w-full text-left space-y-1">
                      <div className="text-[10px] text-slate-400">Redirigiendo a OneDrive:</div>
                      <div className="font-mono text-[10px] text-sky-400 truncate">
                        {lastResult.targetUrl}
                      </div>
                    </div>

                    <a
                      href={lastResult.targetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow transition"
                    >
                      <span>Abrir Carpeta OneDrive</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <span className="text-[9px] text-slate-500">
                      Escaneado a las {lastResult.time} ({os} {device})
                    </span>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 text-slate-400">
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                      <Scan className="w-8 h-8 text-sky-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">Cámara de Smartphone Lista</p>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
                        Pulsa el botón "Simular Escaneo" para registrar el acceso y verificar la redirección dinámica a OneDrive.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Home bar */}
              <div className="w-24 h-1 bg-slate-700 rounded-full mx-auto mt-2.5"></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Cada escaneo queda registrado en las estadísticas de campo y redirige en menos de 1 segundo.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
