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
