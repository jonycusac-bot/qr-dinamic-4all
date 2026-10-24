# Para continuar mañana — 23 octubre 2026

## Abrir el proyecto correcto

Carpeta: C:\Users\Usuario\Desktop\Qr Dinamic 4all
Repositorio privado: https://github.com/jonycusac-bot/qr-dinamic-4all
Rama de trabajo: feature/multiempresa-base

El proyecto Illusion de C:\Users\Usuario\Desktop\QR es independiente. La demo pública https://qr-dinamic-4all.vercel.app conserva todavía el acceso anterior; la nueva versión de cuentas se prueba localmente.

## Arrancar

Abrir PowerShell en esta carpeta y ejecutar:

```powershell
npm run dev:accounts
```

Abrir http://localhost:3001. Si ya funciona en ese puerto, usar la instancia existente. No hace falta reinstalar dependencias salvo que falten o cambien.

La cuenta ficticia de revisión y su contraseña están en .account-review.txt. Se conservan .env.local y .env.multiempresa.local en esta carpeta; no se suben a GitHub ni a Vercel. No compartirlos. No ejecutar git clean ni borrar archivos locales ignorados.

## Terminado y probado

- Base multiempresa: marcas, miembros, QR y escaneos separados; permisos por rol.
- Neon Auth habilitado solo en la rama de pruebas dev-multiempresa.
- Registro, acceso, sesión persistente y cierre con revocación comprobados.
- Una cuenta nueva queda pendiente de activación manual por el operador.
- Espacio privado y personalización del nombre/logo de empresa.
- Dos cuentas reales de prueba no pueden leer ni modificar la empresa ajena.
- Pruebas anteriores 4/4, integración de empresas y de cuentas correctas; TypeScript y ambas compilaciones correctas.
- Navegador: acceso, cambio a Marca de revisión y recarga conservando sesión comprobados.

## Siguiente trabajo

1. Conectar la gestión completa de QR al espacio de la empresa autenticada, con permisos en cada ruta.
2. Mantener las redirecciones públicas y preparar la migración sin cambiar los enlaces QR existentes.
3. Implementar invitaciones de usuarios y aceptación con identidad verificada.
4. Verificar recuperación de contraseña mediante un correo de prueba autorizado. El formulario existe, pero no se ha probado la entrega ni un cambio real por correo.
5. Probar el recorrido completo en ensayo antes de activar el modo de cuentas en producción. Para clientes reales: verificación de correo y configuración SMTP propia.
6. Suscripciones y pagos quedan para una fase posterior; activación inicial manual.

## Entorno temporal

Neon: proyecto old-cell-68983129, rama dev-multiempresa (br-flat-breeze-bam4xkkl).
Caduca el 30 octubre 2026 a las 22:00 de Madrid. Mañana seguirá dentro de ese plazo. Antes de esa fecha habrá que conservar o recrear el entorno si queremos seguir usándolo. GitHub mantiene el código independientemente de esta caducidad.

No se ha activado el modo de cuentas en producción ni se ha modificado Illusion. MULTIEMPRESA.md contiene los detalles técnicos, comandos y limitaciones. Existe un archivo .txt ajeno a estos cambios que ya estaba sin seguimiento: se conserva localmente y no se incluye en GitHub.

## Frase para retomar

Continuamos QR Dinamic 4all desde CONTINUAR_MANANA.md, rama feature/multiempresa-base. Conectemos la gestión de QR a las empresas autenticadas sin cambiar los enlaces existentes.


## 24 octubre: QR y administración local
QR por empresa conectados: crear, PNG, destino editable con enlace estable /q/, pausa, archivo y contador de accesos. Los enlaces localhost solo sirven en el propio ordenador. Las rutas anteriores /r/ de la demo no se han migrado.
Panel de clientes implementado con permisos en platform_administrators y activación desde web. Migración 003 aplicada solo en desarrollo. Asignación a jonaillusion@gmail.com pendiente de autorización explícita tras rechazo del revisor automático. Ningún permiso general asignado a cuentas reales.
Validado TypeScript, compilación de cuentas e integración de acceso, separación entre empresas, permisos y QR. Cambios locales, sin publicar ni subir a GitHub en esta etapa.


## Panel original conectado (24 octubre)
Acceso de administrador: http://localhost:3001/admin. Acceso de clientes: http://localhost:3001/. La identidad de jonaillusion@gmail.com tiene permiso general de desarrollo con autorización explícita del usuario.
La empresa autenticada usa el panel original App.tsx con instalaciones, diseño/pegatinas, estadísticas, marca y simulador. Las rutas panel están autorizadas por empresa. Migración 004 aplicada en desarrollo para detalles de proyectos y accesos. Equipo muestra miembros reales; invitaciones pendientes. Perfil del navegador no cambia la identidad autenticada. Eliminar archiva conservando los datos.
Verificado TypeScript, compilación e integración con empresas ficticias, diseño persistente, historial, enlaces estables, simulación, archivo y acceso entre empresas denegado. No publicado ni subido a GitHub.


## Consumo en administración (24 octubre)
/admin muestra resumen por empresa, QR totales/activos/pausados/archivados, accesos reales totales y del mes calendario Madrid, simulaciones separadas y detalle paginado de códigos. Límite inicial 100 QR creados acumulados, incluidos archivados; configurable por empresa, guardado en tenant_companies.qr_limit (migración 005 solo desarrollo). El exceso alerta para revisar cobro; no hay cargos ni bloqueo automático. Solo administradores generales acceden a estas rutas.


## Equipo con invitaciones (24 octubre)
Equipo permite crear invitaciones por correo y rol (técnico, consulta; solo propietario invita administradores). Se copia enlace personal de 7 días, sin envío automático de correo. Invitado abre enlace, entra o se registra con el correo indicado y acepta. Token en fragmento URL, solo hash en BD, uso único, revocación y reemplazo invalidan enlaces. No se concede administración general. Migración 006 aplicada solo en desarrollo. Localhost solo sirve en este ordenador; publicación y correo de invitación pendientes para uso remoto.


## Alta simplificada de equipo
Equipo > Añadir usuario: nombre, correo y rol; enlace de alta por 7 días sin envío de correo. Datos de alta obtenidos del servidor mediante token; nombre y correo preparados, nuevo usuario elige contraseña y entra directamente. Si ya tiene cuenta, puede iniciar sesión. Se mantiene el enlace al cambiar entre registro y acceso. Si hay una cuenta distinta abierta se informa y se ofrece cambiarla, sin intentar concederle el acceso. Migración 007 aplicada en desarrollo.
