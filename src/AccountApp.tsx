import React, { useEffect, useState } from 'react';
import { createAuthClient } from '@neondatabase/auth';
import { BetterAuthReactAdapter } from '@neondatabase/auth/react/adapters';
import { QrCode, LogOut, Building2, ShieldCheck } from 'lucide-react';

const auth=createAuthClient(window.location.origin+'/api/identity',{adapter:BetterAuthReactAdapter({fetchOptions:{credentials:'include'}})});
type Company={id:string;name:string;logo_url:string;role:string};
type Account={user:{id:string;name:string;email:string};companies:Company[]};
async function api<T>(url:string,method='GET',body?:unknown):Promise<T>{
 const response=await fetch(url,{method,credentials:'same-origin',headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(25000)});
 const data=await response.json();if(!response.ok)throw new Error(data.error||'No se pudo completar la operación.');return data;
}
export default function AccountApp(){
 const resetToken=new URLSearchParams(window.location.search).get('token');
 const [mode,setMode]=useState<'login'|'register'|'forgot'|'reset'>(resetToken?'reset':'login');
 const [account,setAccount]=useState<Account|null>(null);
 const [company,setCompany]=useState<Company|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[message,setMessage]=useState('');
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[personName,setPersonName]=useState('');
 const [brandName,setBrandName]=useState(''),[logo,setLogo]=useState('');
 async function refresh(){
   const result=await auth.getSession({query:{disableCookieCache:true}});
   if(result.error)throw new Error(result.error.message||'No se pudo comprobar tu sesión.');
   if(!result.data?.user){setAccount(null);setCompany(null);return;}
   const data=await api<Account>('/api/account/session');setAccount(data);
   setCompany(current=>data.companies.find(c=>c.id===current?.id)||data.companies[0]||null);
 }
 useEffect(()=>{void refresh().catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
 useEffect(()=>{setBrandName(company?.name||'');setLogo(company?.logo_url||'');},[company]);
 async function submit(event:React.FormEvent){
  event.preventDefault();setBusy(true);setError('');setMessage('');
  try{
   if(mode==='forgot'){
    const result=await auth.requestPasswordReset({email,redirectTo:window.location.origin+'/?view=reset'});
    if(result.error)throw new Error(result.error.message||'No se pudo solicitar la recuperación.');
    setMessage('Si existe una cuenta con ese correo, recibirás instrucciones para recuperar el acceso.');
   }else if(mode==='reset'){
    const result=await auth.resetPassword({newPassword:password,token:resetToken||''});
    if(result.error)throw new Error(result.error.message||'El enlace no es válido o ha caducado.');
    window.history.replaceState(null,'','/');setMode('login');setPassword('');setMessage('Contraseña actualizada. Ya puedes entrar.');
   }else{
    const result=mode==='register'?await auth.signUp.email({email,password,name:personName}):await auth.signIn.email({email,password});
    if(result.error)throw new Error(result.error.message||'No se pudo iniciar sesión.');
    setPassword('');await refresh();
   }
  }catch(e){setError(e instanceof Error?e.message:'No se pudo completar la operación.');}
  finally{setBusy(false);}
 }
 async function logout(){setBusy(true);setError('');try{const result=await auth.signOut({});if(result.error)throw new Error('No se pudo cerrar la sesión.');setAccount(null);setCompany(null);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function upload(file?:File){
  if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024){setError('Elige un logo PNG, JPG o WebP de hasta 5 MB.');return;}
  setBusy(true);setError('');try{const image=await createImageBitmap(file);const scale=Math.min(1,512/Math.max(image.width,image.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height);image.close();const value=canvas.toDataURL('image/png');if(value.length>1500000)throw new Error('El logo ocupa demasiado.');setLogo(value);}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 const field='mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 focus:outline-sky-600';
 const button='rounded-xl bg-sky-700 px-5 py-3 font-semibold text-white hover:bg-sky-800 disabled:opacity-50';
 if(loading)return <main className="min-h-screen grid place-items-center bg-slate-50"><p role="status">Comprobando tu acceso…</p></main>;
 return <main className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-8">
  <div className="mx-auto max-w-4xl">
   <header className="flex flex-wrap items-center justify-between gap-4 mb-8"><div className="flex items-center gap-3"><QrCode className="w-8 h-8 text-sky-700"/><span className="font-bold text-xl">QR Dinamic 4all</span></div>{account&&<button disabled={busy} onClick={()=>void logout()} className="flex gap-2 items-center text-sm"><LogOut className="w-4 h-4"/>Cerrar sesión</button>}</header>
   {error&&<p role="alert" className="mb-5 rounded-xl bg-red-50 border border-red-200 p-4 text-red-800">{error}</p>}
   {message&&<p role="status" className="mb-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">{message}</p>}
   {!account?<section className="mx-auto max-w-md rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm">
    <h1 className="text-2xl font-bold">{mode==='register'?'Crea tu cuenta':mode==='forgot'?'Recupera tu acceso':mode==='reset'?'Elige una contraseña nueva':'Accede a tu cuenta'}</h1>
    <p className="mt-3 text-slate-600">{mode==='register'?'Después de registrarte, activaremos el espacio de tu empresa.':'Tu marca, tu equipo y tus códigos QR en un espacio privado.'}</p>
    <form onSubmit={submit} className="mt-6 space-y-5">
     {mode==='register'&&<label className="block font-medium">Tu nombre<input className={field} required maxLength={100} value={personName} onChange={e=>setPersonName(e.target.value)} autoComplete="name"/></label>}
     {mode!=='reset'&&<label className="block font-medium">Correo electrónico<input className={field} type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>}
     {mode!=='forgot'&&<label className="block font-medium">Contraseña<input className={field} type="password" required minLength={8} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='login'?'current-password':'new-password'}/></label>}
     <button disabled={busy} className={button+' w-full'}>{busy?'Un momento…':mode==='register'?'Crear mi cuenta':mode==='forgot'?'Enviar instrucciones':mode==='reset'?'Guardar contraseña':'Entrar'}</button>
    </form>
    <div className="mt-6 flex flex-col gap-3 text-sm text-sky-800">{mode==='login'?<><button onClick={()=>{setMode('register');setError('');setMessage('');}}>Crear una cuenta</button><button onClick={()=>{setMode('forgot');setError('');setMessage('');}}>He olvidado mi contraseña</button></>:<button onClick={()=>{setMode('login');setError('');setMessage('');setPassword('');window.history.replaceState(null,'','/');}}>Volver al acceso</button>}</div>
   </section>:!company?<section className="rounded-2xl bg-white border p-8"><Building2 className="w-10 h-10 text-sky-700 mb-4"/><h1 className="text-2xl font-bold">Tu cuenta está creada</h1><p className="mt-3 text-slate-600">Hola, {account.user.name}. El espacio de tu empresa está pendiente de activación. Te daremos acceso cuando confirmemos tu compra.</p><p className="mt-3 text-sm text-slate-500">Cuenta: {account.user.email}</p><button disabled={busy} className={button+' mt-6'} onClick={()=>{setBusy(true);void refresh().catch(e=>setError(e.message)).finally(()=>setBusy(false));}}>Comprobar activación</button></section>:<>
    {account.companies.length>1&&<label className="block mb-6">Empresa<select className={field} value={company.id} onChange={e=>setCompany(account.companies.find(c=>c.id===e.target.value)||null)}>{account.companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
    <section className="rounded-2xl bg-white border p-6 sm:p-8"><div className="flex items-center gap-4">{company.logo_url&&<img src={company.logo_url} alt={company.name} className="h-16 max-w-40 object-contain"/>}<div><h1 className="text-2xl font-bold">{company.name}</h1><p className="text-slate-600 mt-1">{account.user.email}</p></div></div><p className="mt-5 flex items-center gap-2 text-sm text-emerald-800"><ShieldCheck className="w-4 h-4"/>Espacio privado de tu empresa</p></section>
    {['owner','admin'].includes(company.role)&&<section className="mt-6 rounded-2xl bg-white border p-6 sm:p-8"><h2 className="text-xl font-bold">Mi marca</h2><form className="mt-5 space-y-5" onSubmit={event=>{event.preventDefault();setBusy(true);setError('');setMessage('');void api('/api/account/companies/'+company.id+'/branding','PUT',{name:brandName,logoUrl:logo}).then(()=>refresh()).then(()=>setMessage('Marca guardada.')).catch(e=>setError(e.message)).finally(()=>setBusy(false));}}><label className="block font-medium">Nombre de tu empresa<input className={field} required maxLength={60} value={brandName} onChange={e=>setBrandName(e.target.value)}/></label><label className="block font-medium">Logo de tu empresa<input type="file" accept="image/png,image/jpeg,image/webp" className="mt-3 block text-sm max-w-full" onChange={e=>void upload(e.target.files?.[0])}/></label>{logo&&<div><img src={logo} alt="Vista previa" className="h-20 max-w-full object-contain"/><button type="button" className="text-sm underline mt-2" onClick={()=>setLogo('')}>Quitar logo</button></div>}<button disabled={busy} className={button}>{busy?'Guardando…':'Guardar mi marca'}</button></form></section>}
    <p className="mt-6 text-sm text-slate-500">Entorno de pruebas de cuentas. La gestión de QR y las invitaciones del equipo se conectarán en la siguiente etapa.</p>
   </>}
  </div>
 </main>;
}


