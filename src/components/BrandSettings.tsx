import React, { useState } from 'react';
import { Palette, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function BrandSettings() {
  const { branding, updateBranding } = useApp();
  const [open,setOpen] = useState(false);
  const [name,setName] = useState('');
  const [logoUrl,setLogo] = useState('');
  const [error,setError] = useState('');
  const [saving,setSaving] = useState(false);
  const [loading,setLoading] = useState(false);
  async function upload(file?: File) {
    if (!file) return;
    if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size>5*1024*1024) { setError('Utiliza PNG, JPG o WebP de hasta 5 MB.'); return; }
    setLoading(true); setError('');
    try {
      const bitmap = await createImageBitmap(file);
      const ratio = Math.min(1,512/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement('canvas'); canvas.width=Math.max(1,Math.round(bitmap.width*ratio)); canvas.height=Math.max(1,Math.round(bitmap.height*ratio));
      canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height); bitmap.close();
      const data=canvas.toDataURL('image/png');
      if (data.length>1500000) throw new Error('El logo ocupa demasiado. Prueba con una imagen más sencilla.');
      setLogo(data);
    } catch (error) {setError(error instanceof Error ? error.message : 'No se pudo leer el logo.');}
    finally {setLoading(false);}
  }
  return <>
    <button type="button" title="Personalizar marca" aria-label="Personalizar marca" className="inline-flex items-center gap-2 rounded-xl border border-slate-600 p-2 text-slate-200 hover:bg-slate-800" onClick={()=>{setName(branding.name);setLogo(branding.logoUrl);setError('');setOpen(true);}}><Palette className="h-4 w-4"/><span className="hidden sm:inline text-xs font-semibold">Mi marca</span></button>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 text-slate-900"><form className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-5" onSubmit={async event=>{event.preventDefault();setSaving(true);setError('');try {await updateBranding({name:name.trim(),logoUrl});setOpen(false);}catch(error){setError(error instanceof Error ? error.message : 'No se pudo guardar la marca.');}finally{setSaving(false);}}}>
      <div className="flex justify-between items-center"><h2 className="text-xl font-bold">Personaliza tu marca</h2><button type="button" aria-label="Cerrar" onClick={()=>setOpen(false)}><X className="h-5 w-5"/></button></div>
      <label className="block text-sm font-medium">Nombre de tu marca<input required maxLength={60} value={name} onChange={event=>setName(event.target.value)} className="mt-2 w-full border rounded-xl p-3"/></label>
      <label className="block text-sm font-medium">Logo personalizado<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event=>void upload(event.target.files?.[0])} className="mt-2 block w-full text-sm"/></label>
      {logoUrl && <div className="rounded-xl border p-4"><img src={logoUrl} alt="Vista previa de tu logo" className="h-20 max-w-full object-contain mx-auto"/><button type="button" className="text-xs underline mt-3" onClick={()=>setLogo('')}>Quitar logo</button></div>}
      <p className="text-sm text-slate-600">El nombre y el logo se aplican a tu panel y a la cabecera de tus pegatinas QR.</p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button disabled={saving||loading} type="submit" className="w-full rounded-xl bg-sky-700 p-3 text-white font-semibold disabled:opacity-50">{saving ? 'Guardando…' : loading ? 'Preparando logo…' : 'Guardar mi marca'}</button>
    </form></div>}
  </>;
}
