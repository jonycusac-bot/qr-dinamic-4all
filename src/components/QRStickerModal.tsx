import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  Printer,
  X,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  User,
  Wrench,
  Smartphone,
  FolderSync,
  Cloud,
  AlertTriangle,
  Globe,
  Settings2,
  Sparkles,
  Info,
} from 'lucide-react';
import { QRProject } from '../types';
import { useApp } from '../context/AppContext';
import { renderQRToCanvas, exportCanvasAsImage } from '../utils/qrGenerator';

interface QRStickerModalProps {
  project: QRProject | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QRStickerModal: React.FC<QRStickerModalProps> = ({
  project,
  isOpen,
  onClose,
}) => {
  const {
    branding,
    getDynamicUrl,
    isDevEnvironment,
    customBaseUrl,
    setCustomBaseUrl,
    sharedAppUrl,
  } = useApp();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [qrTargetMode, setQrTargetMode] = useState<'dynamic' | 'direct'>('dynamic');
  const [showDomainConfig, setShowDomainConfig] = useState(false);
  const [inputBaseUrl, setInputBaseUrl] = useState('');

  useEffect(() => {
    if (project?.qrTargetType) {
      setQrTargetMode(project.qrTargetType);
    } else {
      setQrTargetMode('dynamic');
    }
  }, [project]);

  const dynamicUrl = project ? getDynamicUrl(project.shortCode) : '';
  const activeUrl = qrTargetMode === 'direct' ? (project?.destinationUrl || '') : dynamicUrl;

  useEffect(() => {
    if (!isOpen || !project || !canvasRef.current) return;

    setIsRendering(true);

    renderQRToCanvas(canvasRef.current, {
      url: activeUrl,
      brandName: branding.name, brandLogoUrl: branding.logoUrl,
      size: 320,
      design: project.qrDesign,
      clientName: project.clientName,
      projectName: project.projectName,
    }).finally(() => {
      setIsRendering(false);
    });
  }, [isOpen, project, activeUrl, branding]);

  if (!isOpen || !project) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(activeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPNG = () => {
    if (!canvasRef.current) return;
    const modeLabel = qrTargetMode === 'direct' ? 'Directo_OneDrive' : 'Dinamico';
    const safeName = `QR_${project.clientName.replace(/\s+/g, '_')}_${modeLabel}.png`;
    exportCanvasAsImage(canvasRef.current, safeName, 'image/png');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveDomain = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomBaseUrl(inputBaseUrl);
    setShowDomainConfig(false);
  };

  const handleUseSharedUrl = () => {
    if (sharedAppUrl) {
      setCustomBaseUrl(sharedAppUrl);
      setInputBaseUrl(sharedAppUrl);
      setShowDomainConfig(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-sky-400 font-semibold">
                Etiqueta de Instalación
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                qrTargetMode === 'direct'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
              }`}>
                {qrTargetMode === 'direct' ? 'Enlace Directo a OneDrive' : 'Enlace Dinámico'}
              </span>
            </div>
            <h3 className="font-bold text-lg text-white mt-0.5">{project.clientName}</h3>
            <p className="text-xs text-slate-400">{project.projectName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Left: Canvas / Sticker preview */}
          <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200/80 rounded-2xl p-4 shadow-inner">
            <div className="bg-white p-2 rounded-2xl shadow-md border border-slate-200/60 max-w-full">
              <canvas
                ref={canvasRef}
                className="w-full h-auto max-w-[260px] rounded-xl block mx-auto"
              />
            </div>

            {/* Target mode pills */}
            <div className="w-full mt-3.5 bg-slate-200/70 p-1 rounded-xl flex gap-1 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setQrTargetMode('dynamic')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
                  qrTargetMode === 'dynamic'
                    ? 'bg-white text-sky-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FolderSync className="w-3.5 h-3.5" />
                <span>QR Dinámico</span>
              </button>

              <button
                type="button"
                onClick={() => setQrTargetMode('direct')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
                  qrTargetMode === 'direct'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>Directo OneDrive</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 mt-2 text-center leading-tight">
              {qrTargetMode === 'direct'
                ? 'El QR abre OneDrive de forma directa e inmediata en cualquier móvil sin pasar por el servidor.'
                : 'El QR pasa por el servidor QR Dinamic 4all para registrar visitas y permitir cambiar la carpeta en el futuro.'}
            </p>
          </div>

          {/* Right: Installation details & Action buttons */}
          <div className="space-y-3.5">
            {/* Dev mode alert if phone scan blocked by AI Studio cookies */}
            {isDevEnvironment && qrTargetMode === 'dynamic' && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>¿Escaneas desde un teléfono móvil?</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Google AI Studio protege el contenedor de desarrollo privado pidiendo cookies de sesión (mensaje <em>&quot;Action required to load your app&quot;</em>).
                </p>
                <div className="pt-1 flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => setQrTargetMode('direct')}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs transition shadow-sm cursor-pointer"
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Cambiar a Enlace Directo a OneDrive</span>
                  </button>
                  <p className="text-[10px] text-amber-700">
                    ✓ Funciona al 100% de forma instantánea en cualquier cámara de móvil sin intermediarios.
                  </p>
                </div>
              </div>
            )}

            {/* Mode badge card */}
            <div className={`border rounded-2xl p-3.5 ${
              qrTargetMode === 'direct'
                ? 'bg-blue-50/80 border-blue-100 text-blue-900'
                : 'bg-emerald-50/80 border-emerald-100 text-emerald-900'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 font-semibold text-xs">
                  {qrTargetMode === 'direct' ? (
                    <>
                      <Cloud className="w-4 h-4 text-blue-600" />
                      <span>Modo: OneDrive Directo</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Modo: Redirección Dinámica</span>
                    </>
                  )}
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 border border-current">
                  {qrTargetMode === 'direct' ? 'Apertura Inmediata' : 'Actualizable'}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {qrTargetMode === 'direct'
                  ? 'Abre directamente la carpeta compartida en SharePoint/OneDrive al escanear con la cámara.'
                  : 'Si cambias la carpeta en el futuro, el QR físico seguirá funcionando sin tener que despegar la pegatina.'}
              </p>
            </div>

            {/* Client & Tech Details */}
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-1.5 min-w-0">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <div className="truncate">
                  <span className="text-slate-400 block text-[10px]">Cliente</span>
                  <span className="font-semibold text-slate-800 truncate block">{project.clientName}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <div className="truncate">
                  <span className="text-slate-400 block text-[10px]">Técnico</span>
                  <span className="font-medium text-slate-800 truncate block">{project.technician}</span>
                </div>
              </div>
            </div>

            {/* Active Link Box */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <span>URL codificada en el QR:</span>
                <span className="text-emerald-600 font-medium text-[10px]">
                  {qrTargetMode === 'direct' ? 'OneDrive directo' : 'Dinámico activo'}
                </span>
              </div>
              <div className="font-mono text-xs text-sky-700 font-semibold truncate bg-white p-2 rounded-lg border border-slate-200/60 select-all">
                {activeUrl}
              </div>
            </div>

            {/* Custom Domain Settings accordion/trigger */}
            {qrTargetMode === 'dynamic' && (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setInputBaseUrl(customBaseUrl);
                    setShowDomainConfig(!showDomainConfig);
                  }}
                  className="text-[11px] font-semibold text-slate-500 hover:text-sky-600 flex items-center gap-1 transition cursor-pointer"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>Configurar Dominio Base de Redirección</span>
                </button>

                {showDomainConfig && (
                  <form onSubmit={handleSaveDomain} className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                    <p className="text-[11px] text-slate-600">
                      Define el dominio que lee el QR en producción (por ejemplo <code>https://qr.tudominio.com</code>):
                    </p>
                    <input
                      type="url"
                      value={inputBaseUrl}
                      onChange={(e) => setInputBaseUrl(e.target.value)}
                      placeholder="https://qr.tudominio.com"
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 font-mono"
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg text-xs cursor-pointer"
                      >
                        Guardar Dominio
                      </button>
                      {sharedAppUrl && (
                        <button
                          type="button"
                          onClick={handleUseSharedUrl}
                          className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] cursor-pointer"
                          title="Usar la URL pública compartida de AI Studio"
                        >
                          Usar URL Compartida AI Studio
                        </button>
                      )}
                      {customBaseUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomBaseUrl('');
                            setInputBaseUrl('');
                            setShowDomainConfig(false);
                          }}
                          className="px-2 py-1 text-red-600 hover:underline text-[11px] cursor-pointer"
                        >
                          Restablecer
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPNG}
                  disabled={isRendering}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar PNG</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl shadow transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Ficha</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-xl transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado' : 'Copiar URL'}</span>
                </button>

                <a
                  href={activeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-xl transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Probar Enlace</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-slate-400" />
            <span>Escaneable con cualquier smartphone iOS o Android</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
