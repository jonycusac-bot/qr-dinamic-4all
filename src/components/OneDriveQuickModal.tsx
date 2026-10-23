import React, { useState } from 'react';
import {
  FolderSync,
  ExternalLink,
  ShieldCheck,
  History,
  AlertCircle,
  Copy,
  Check,
  X,
  ArrowRight,
} from 'lucide-react';
import { QRProject } from '../types';
import { useApp } from '../context/AppContext';

interface OneDriveQuickModalProps {
  project: QRProject | null;
  isOpen: boolean;
  onClose: () => void;
}

export const OneDriveQuickModal: React.FC<OneDriveQuickModalProps> = ({
  project,
  isOpen,
  onClose,
}) => {
  const { updateOneDriveUrl, getDynamicUrl } = useApp();

  const [newUrl, setNewUrl] = useState('');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (project) {
      setNewUrl(project.destinationUrl);
      setReason('');
      setError(null);
    }
  }, [project]);

  if (!isOpen || !project) return null;

  const dynamicUrl = getDynamicUrl(project.shortCode);

  const handleCopyDynamic = () => {
    navigator.clipboard.writeText(dynamicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = newUrl.trim();
    if (!trimmed) {
      setError('Por favor introduce un enlace válido');
      return;
    }

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setError('El enlace debe comenzar por https:// o http://');
      return;
    }

    setIsSaving(true);
    try {
      await updateOneDriveUrl(
        project.id,
        trimmed,
        reason.trim() || 'Actualización de destino OneDrive'
      );
      setIsSaving(false);
      onClose();
    } catch (err) {
      setIsSaving(false);
      setError('Error al actualizar el enlace. Inténtalo de nuevo.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <FolderSync className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Actualizar Enlace de OneDrive</h3>
              <p className="text-xs text-slate-400">
                {project.clientName} • {project.projectCode}
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

        {/* Protection Banner */}
        <div className="bg-emerald-50 border-b border-emerald-100 p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900">
            <strong className="font-semibold block mb-0.5">
              Garantía de Enlace Dinámico Permanente
            </strong>
            El código QR físico pegado en la casa del cliente nunca cambia ni queda obsoleto.
            Cualquier persona que lo escanee irá de forma inmediata a la nueva dirección de OneDrive que indiques aquí.
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Static Dynamic QR Target Info */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Enlace Dinámico Permanente (Impreso en el QR)
            </label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <span className="font-mono text-xs text-sky-700 font-semibold truncate flex-1">
                {dynamicUrl}
              </span>
              <button
                type="button"
                onClick={handleCopyDynamic}
                className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-50 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
              <a
                href={dynamicUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded-lg hover:bg-slate-50 transition"
                title="Probar redirección"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* New OneDrive URL input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="onedrive-input" className="text-xs font-semibold text-slate-700">
                Nuevo Enlace de Carpeta en OneDrive / Cloud <span className="text-red-500">*</span>
              </label>
              {project.destinationUrl && (
                <a
                  href={project.destinationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1 font-medium"
                >
                  <span>Abrir enlace actual</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <textarea
              id="onedrive-input"
              rows={3}
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://1drv.ms/f/s!Am... o https://onedrive.live.com/..."
              className="w-full text-xs font-mono text-slate-800 bg-white border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Pega aquí el enlace compartido de OneDrive de la carpeta del cliente (p. ej. manuales, esquemas eléctricos, boletín de instalación).
            </p>
          </div>

          {/* Reason */}
          <div>
            <label htmlFor="reason-input" className="block text-xs font-semibold text-slate-700 mb-1">
              Motivo del cambio (para registro y auditoría)
            </label>
            <input
              id="reason-input"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Carpeta renombrada por cambio de año / Nueva versión de garantía"
              className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* History of changes */}
          {project.destinationHistory && project.destinationHistory.length > 0 && (
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
                <History className="w-3.5 h-3.5 text-slate-500" />
                <span>Historial de Enlaces Anteriores ({project.destinationHistory.length})</span>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                {project.destinationHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 bg-slate-50 border border-slate-200/80 rounded-lg text-[11px] text-slate-600"
                  >
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="font-medium text-slate-700">{item.changedBy}</span>
                      <span>{new Date(item.changedAt).toLocaleString('es-ES')}</span>
                    </div>
                    <div className="font-mono truncate text-slate-600 mb-1">{item.url}</div>
                    {item.reason && (
                      <div className="text-[10px] text-slate-500 italic">
                        Motivo: {item.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md shadow-sky-600/20 transition cursor-pointer"
            >
              <FolderSync className="w-4 h-4" />
              <span>{isSaving ? 'Actualizando...' : 'Guardar y Actualizar Destino'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
