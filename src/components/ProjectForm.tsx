import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Save,
  QrCode,
  FolderSync,
  Upload,
  Image as ImageIcon,
  Palette,
  Check,
  ExternalLink,
  ShieldCheck,
  User,
  FileText,
  Sun,
  Flame,
  Zap,
  Wrench,
  Shield,
  Download,
  Cloud,
} from 'lucide-react';
import { QRProject, QRDesignConfig } from '../types';
import { useApp } from '../context/AppContext';
import { renderQRToCanvas, exportCanvasAsImage } from '../utils/qrGenerator';

interface ProjectFormProps {
  initialProject?: QRProject | null;
  onCancel: () => void;
  onSaved: (project: QRProject) => void;
}

// Preset corporate sample logos
const PRESET_LOGOS = [
  {
    id: 'solar',
    name: 'Solar',
    icon: Sun,
    svgData:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%23eab308" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',
  },
  {
    id: 'hvac',
    name: 'Clima',
    icon: Flame,
    svgData:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%230284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
  },
  {
    id: 'electric',
    name: 'Eléctrico',
    icon: Zap,
    svgData:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%236366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  },
  {
    id: 'tools',
    name: 'Técnico',
    icon: Wrench,
    svgData:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%23334155" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  },
  {
    id: 'warranty',
    name: 'Garantía',
    icon: Shield,
    svgData:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%2310b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>',
  },
];

export const ProjectForm: React.FC<ProjectFormProps> = ({
  initialProject,
  onCancel,
  onSaved,
}) => {
  const { createProject, updateProject, users, currentUser, branding, getDynamicUrl } = useApp();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form states
  const [clientName, setClientName] = useState(initialProject?.clientName || '');
  const [projectName, setProjectName] = useState(initialProject?.projectName || '');
  const [shortCode, setShortCode] = useState(initialProject?.shortCode || '');
  const [destinationUrl, setDestinationUrl] = useState(
    initialProject?.destinationUrl || 'https://onedrive.live.com'
  );
  const [technician, setTechnician] = useState(
    initialProject?.technician || currentUser?.name || users[0]?.name || 'Mi equipo'
  );
  const [notes, setNotes] = useState(initialProject?.notes || '');
  const [status, setStatus] = useState<'active' | 'paused'>(initialProject?.status || 'active');
  const [qrTargetType, setQrTargetType] = useState<'dynamic' | 'direct'>(initialProject?.qrTargetType || 'dynamic');

  // QR Design config state - Brand-neutral black and white
  const [qrDesign, setQrDesign] = useState<QRDesignConfig>(
    initialProject?.qrDesign || {
      foregroundColor: '#000000',
      backgroundColor: '#ffffff',
      showWatermark: false,
      watermarkOpacity: 0,
      logoUrl: '',
      logoSize: 22,
      logoMargin: 5,
      errorCorrectionLevel: 'H',
      dotStyle: 'rounded',
      cornerSquareStyle: 'extra-rounded',
      includeFrame: true,
      frameText: 'USER MANUAL',
      frameColor: '#000000',
      includeClientLabel: false,
    }
  );

  const [activePresetLogo, setActivePresetLogo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-generate shortCode if creating new project
  useEffect(() => {
    if (!initialProject && clientName) {
      const generated = clientName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 16);
      const randSuffix = Math.random().toString(36).substring(2, 6);
      setShortCode(`${generated}-${randSuffix}`);
    }
  }, [clientName, initialProject]);

  // Redraw QR preview on canvas whenever parameters change
  useEffect(() => {
    if (!canvasRef.current) return;
    const testCode = shortCode.trim() || 'demo-preview';
    const targetUrl =
      qrTargetType === 'direct' && destinationUrl.trim()
        ? destinationUrl.trim()
        : getDynamicUrl(testCode);

    renderQRToCanvas(canvasRef.current, {
      url: targetUrl,
      brandName: branding.name, brandLogoUrl: branding.logoUrl,
      size: 280,
      design: qrDesign,
      clientName: clientName || 'Nombre del Cliente',
      projectName: projectName || 'Proyecto de Instalación',
    });
  }, [qrDesign, shortCode, clientName, projectName, getDynamicUrl, qrTargetType, destinationUrl, branding]);

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setErrorMessage('La imagen del logo no debe superar los 3MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setQrDesign((prev) => ({ ...prev, logoUrl: dataUrl }));
      setActivePresetLogo(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPresetLogo = (preset: typeof PRESET_LOGOS[0]) => {
    if (activePresetLogo === preset.id) {
      // Toggle off
      setActivePresetLogo(null);
      setQrDesign((prev) => ({ ...prev, logoUrl: '' }));
    } else {
      setActivePresetLogo(preset.id);
      setQrDesign((prev) => ({ ...prev, logoUrl: preset.svgData }));
    }
  };

  const handleRemoveLogo = () => {
    setActivePresetLogo(null);
    setQrDesign((prev) => ({ ...prev, logoUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!clientName.trim()) {
      setErrorMessage('Debes indicar el nombre del cliente');
      return;
    }

    if (!projectName.trim()) {
      setErrorMessage('Debes indicar el nombre del proyecto');
      return;
    }

    if (!destinationUrl.trim()) {
      setErrorMessage('Debes facilitar el enlace HTTP de OneDrive');
      return;
    }

    if (!destinationUrl.startsWith('http://') && !destinationUrl.startsWith('https://')) {
      setErrorMessage('El enlace de OneDrive debe empezar por https:// o http://');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalShortCode =
        shortCode.trim() ||
        (clientName
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .slice(0, 16) || 'qr') +
          '-' +
          Math.random().toString(36).substring(2, 6);

      const projectPayload: Partial<QRProject> = {
        clientName: clientName.trim(),
        projectName: projectName.trim(),
        shortCode: finalShortCode,
        destinationUrl: destinationUrl.trim(),
        technician,
        notes: notes.trim(),
        status,
        qrTargetType,
        qrDesign,
      };

      let result: QRProject;
      if (initialProject) {
        result = await updateProject(initialProject.id, projectPayload, 'Edición de proyecto y diseño QR');
      } else {
        result = await createProject(projectPayload);
      }

      setIsSubmitting(false);
      onSaved(result);
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage(err instanceof Error ? err.message : 'No se pudo guardar la instalación.');
    }
  };

  const handleDownloadPreviewPNG = () => {
    if (!canvasRef.current) return;
    const filename = `QR_${(clientName || 'cliente').replace(/\s+/g, '_')}_${(projectName || 'instalacion').replace(/\s+/g, '_')}.png`;
    exportCanvasAsImage(canvasRef.current, filename, 'image/png');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al listado</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 hidden sm:inline">
            {initialProject ? 'Editando instalación existente' : 'Nueva instalación en cliente'}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Project & Client Details (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Section 1: Client & Installation Details */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-sky-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  1. Datos del Cliente y la Vivienda
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Client Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre del Cliente / Titular <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ej: Familia Gómez Serrano / D. Antonio Beltrán"
                    className="w-full text-xs sm:text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Aparecerá impreso en la pegatina de la instalación.
                  </p>
                </div>

                {/* Project Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre del Proyecto / Tipo de Instalación <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Ej: Instalación Solar Fotovoltaica 6.5 kW con Batería LFP"
                    className="w-full text-xs sm:text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                    required
                  />
                </div>

                {/* Technician */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Técnico / Instalador Responsable
                  </label>
                  <select
                    value={technician}
                    onChange={(e) => setTechnician(e.target.value)}
                    className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name} ({u.role === 'admin' ? 'Administrador' : 'Técnico'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: OneDrive Destination Link */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderSync className="w-4 h-4 text-sky-600" />
                  <h3 className="font-bold text-sm text-slate-900">
                    2. Enlace de Destino OneDrive (Dinámico)
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                  Editable en cualquier momento
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Enlace HTTP de la Carpeta de OneDrive del Cliente <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    placeholder="https://1drv.ms/f/... o https://onedrive.live.com/?id=..."
                    className="w-full text-xs sm:text-sm font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                    required
                  />
                </div>
                <div className="mt-2 flex items-start gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>¿Qué pasa si cambias o renombras la carpeta en OneDrive?</strong> No hay problema: podrás actualizar este enlace desde el panel de control con 1 clic y el QR impreso en la casa seguirá funcionando sin tener que reimprimir nada.
                  </span>
                </div>
              </div>

              {/* QR Target Mode Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tipo de enlace codificado en el código QR
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQrTargetType('dynamic')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      qrTargetType === 'dynamic'
                        ? 'border-sky-500 bg-sky-50/70 ring-1 ring-sky-500'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <FolderSync className="w-3.5 h-3.5 text-sky-600" />
                        QR Dinámico QR Dinamic 4all
                      </span>
                      {qrTargetType === 'dynamic' && (
                        <span className="w-2 h-2 rounded-full bg-sky-600"></span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Pasa por el servidor QR Dinamic 4all. Permite cambiar la carpeta en el futuro sin despegar la pegatina física y contabilizar lecturas.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQrTargetType('direct')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      qrTargetType === 'direct'
                        ? 'border-blue-500 bg-blue-50/70 ring-1 ring-blue-500'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Cloud className="w-3.5 h-3.5 text-blue-600" />
                        Directo a OneDrive
                      </span>
                      {qrTargetType === 'direct' && (
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Abre directamente SharePoint/OneDrive al escanear con la cámara del móvil. Funciona de inmediato sin intermediarios.
                    </p>
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notas de Instalación / Documentos Incluidos
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Contiene planos , manual ,armario de controladores etc..."
                  className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Section 3: QR Customization Controls */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-slate-900" />
                  <h3 className="font-bold text-sm text-slate-900">
                    3. Estilo Oficial QR Dinamic 4all (Blanco y Negro de Alta Definición)
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                  Estilo Corporativo
                </span>
              </div>

              {/* QR Dinamic 4all Brand Badge Card */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-white px-3 py-1.5 rounded-xl flex items-center justify-center shadow-sm">
                    {branding.logoUrl ? <img src={branding.logoUrl} alt={branding.name} className="h-5 w-auto object-contain" /> : <span className="text-slate-900 font-bold text-xs">Tu marca</span>}
                  </div>
                  <div>
                    <span className="text-xs font-bold tracking-wide text-white block">
                      Esquema Oficial QR Dinamic 4all
                    </span>
                    <span className="text-[11px] text-slate-300">
                      Código QR en negro puro (#000000) • Fondo blanco puro de alto contraste
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold bg-white/10 text-slate-200 px-2.5 py-1 rounded-lg border border-white/10">
                    100% Escaneable
                  </span>
                </div>
              </div>

              {/* Module Style & Corner Style */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Forma de los Módulos
                  </label>
                  <select
                    value={qrDesign.dotStyle}
                    onChange={(e) =>
                      setQrDesign((prev) => ({ ...prev, dotStyle: e.target.value as any }))
                    }
                    className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  >
                    <option value="rounded">Módulos Redondeados</option>
                    <option value="dots">Puntos Circulares</option>
                    <option value="square">Cuadrados Clásicos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Esquinas de Detección
                  </label>
                  <select
                    value={qrDesign.cornerSquareStyle}
                    onChange={(e) =>
                      setQrDesign((prev) => ({
                        ...prev,
                        cornerSquareStyle: e.target.value as any,
                      }))
                    }
                    className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  >
                    <option value="extra-rounded">Extra Redondeadas</option>
                    <option value="rounded">Redondeadas</option>
                    <option value="square">Cuadradas</option>
                  </select>
                </div>
              </div>

              {/* Frame & Sticker Options */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">
                      Marco y Cabecera de Pegatina
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Crea un encabezado superior llamativo para la pegatina física
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={qrDesign.includeFrame}
                    onChange={(e) =>
                      setQrDesign((prev) => ({ ...prev, includeFrame: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 accent-sky-600"
                  />
                </div>

                {qrDesign.includeFrame && (
                  <input
                    type="text"
                    value={qrDesign.frameText}
                    onChange={(e) =>
                      setQrDesign((prev) => ({ ...prev, frameText: e.target.value }))
                    }
                    placeholder="Texto de cabecera (ej: USER MANUAL)"
                    className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />
                )}
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl">
                {errorMessage}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-sky-600/20 transition cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Guardando...' : initialProject ? 'Actualizar Proyecto' : 'Crear Código QR e Instalación'}</span>
              </button>
            </div>
          </div>

          {/* RIGHT: Live High-Resolution QR Preview Sticky Card (5 cols) */}
          <div className="lg:col-span-5 sticky top-24 space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-sky-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Previsualización en Directo
                  </h4>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Alta Resolución
                </span>
              </div>

              {/* Canvas Preview Container */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center shadow-inner">
                <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200/60 max-w-full">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-auto max-w-[260px] rounded-xl block mx-auto"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-3 text-center">
                  Esta es la pegatina física tal como se imprimirá y colocará en la vivienda del cliente.
                </p>
              </div>

              {/* Real-time details summary */}
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400">Cliente:</span>
                  <span className="font-semibold text-slate-900 truncate max-w-[200px]">
                    {clientName || 'Sin especificar'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400">Modo de Enlace:</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    qrTargetType === 'direct'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {qrTargetType === 'direct' ? 'Directo OneDrive' : 'Dinámico QR Dinamic 4all'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400">Codificado en QR:</span>
                  <span className="font-mono text-[11px] text-sky-700 font-semibold truncate max-w-[200px]">
                    {qrTargetType === 'direct'
                      ? (destinationUrl || 'https://onedrive.live.com')
                      : getDynamicUrl(shortCode || 'slug')}
                  </span>
                </div>
              </div>

              {/* Quick download button */}
              <button
                type="button"
                onClick={handleDownloadPreviewPNG}
                className="w-full mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Muestra PNG</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

