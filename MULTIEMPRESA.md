# Multiempresa — etapa 1 (23 octubre 2026)

## Resultado

Base de datos y repositorio de acceso para empresas privadas, probados con dos empresas ficticias en una rama de desarrollo. Esta etapa NO habilita todavía cuentas de clientes ni sustituye la clave compartida de la demo.

- Git: feature/multiempresa-base.
- Neon de desarrollo: dev-multiempresa, br-flat-breeze-bam4xkkl, proyecto old-cell-68983129.
- Caducidad del entorno Neon: 30 octubre 2026, 22:00 Europe/Madrid. El código permanece guardado en GitHub aunque caduque esta rama de pruebas.
- Credenciales de desarrollo: .env.multiempresa.local, ignorado por Git y Vercel. .env.local sigue apuntando a la demo original.
- No se han cambiado Illusion, el servidor público ni la base principal.

## Implementado

Tablas tenant_companies, tenant_memberships, tenant_qr_projects y tenant_scan_events. Cada registro lleva empresa. Los códigos cortos son únicos globalmente para evitar que dos empresas compartan una URL de QR. Los escaneos usan una clave foránea compuesta que impide asociarlos al QR de otra empresa.

server/tenants.ts verifica pertenencia y estado de empresa en cada operación, dentro de una transacción. Roles: owner, admin, member y viewer. Solo owner/admin modifican marca y gestionan miembros; solo owner puede añadir administradores. Los colaboradores editan QR; los lectores consultan. No hay endpoints públicos nuevos.

IMPORTANTE: el identificador de usuario de este repositorio debe proceder de una sesión verificada en servidor. Todavía no hay integración con un proveedor de identidad. No confiar en una empresa o usuario enviados por el navegador. Las tablas de membresía son permisos de la aplicación, no cuentas de contraseña. La futura autenticación almacenará y gestionará esas credenciales; no se crean contraseñas propias en estas tablas.

La función provisionCompany es de administración interna; no exponerla como registro libre sin comprobar la autorización/activación comercial. addMember es una operación interna, no un sistema de invitaciones terminado.

## Comandos

npm run db:migrate:tenants
npm run test:tenants
npm run lint
npm test
npm run build

Los dos primeros comandos solo admiten el endpoint de desarrollo conocido. No recurren a DATABASE_URL ni ejecutan la migración multiempresa en la demo. La migración 002 es aditiva e idempotente. El ejecutor original sigue aplicando únicamente 001 para impedir un cambio accidental en producción.

## Verificación realizada

- TypeScript: correcto.
- Compilación: correcta.
- Tests existentes: 4/4 correctos.
- Integración real Neon: empresas nuevas vacías; marca independiente; lectura/escritura de otra empresa denegadas; permisos por rol; duplicados de código rechazados; escaneos entre empresas rechazados por SQL; persistencia; suspensión y retirada de acceso. Todos PASS.
- Hash del estado de la demo copiada antes/después de las pruebas: idéntico. Los registros de prueba se limpian al terminar.
- La cuenta Neon rechazó personalizar el tiempo de suspensión; se creó la rama con el valor permitido por el plan, sin ampliar cuota.

## Siguientes etapas

2. Habilitar Neon Auth solo en desarrollo y conectar registro, acceso, recuperación, cierre de sesión y validación de identidad en servidor. Activación inicial de empresas por el administrador; sin registro comercial automático.
3. Conectar el panel y las rutas a los datos de la empresa autenticada. Migrar la demo preservando los enlaces QR públicos existentes y su historial. Retirar la clave compartida y la selección ficticia de perfiles al activar el modo multiempresa.
4. Invitaciones de equipo, aceptación con identidad verificada y permisos aplicados en todos los endpoints. Verificar dos usuarios reales de empresas distintas también desde el navegador.
5. Prueba completa en un despliegue de ensayo y publicación del nuevo acceso. Revisar correo SMTP propio antes de clientes reales.
6. Más adelante: compra, suscripciones y límites de planes.

Neon Auth Organization está marcado Partial/Beta en la guía instalada; confirmar el soporte de invitaciones antes de decidir si se usa su plugin o las membresías locales. No habilitar dos sistemas de permisos contradictorios. La activación de Auth no debe sustituir por sí sola las comprobaciones de empresa en el servidor.
## Etapa 2 — cuentas conectadas (23 octubre 2026)

Implementada y comprobada en desarrollo. Abrir http://localhost:3001 con `npm run dev:accounts`.

- Registro por nombre, correo y contraseña en Neon Auth, sin contraseñas guardadas por nuestra aplicación.
- Acceso, sesión persistente al recargar y cierre de sesión con revocación comprobada en servidor.
- Un registro nuevo queda pendiente de activación y no puede crear empresas ni asignarse permisos.
- Activación manual interna: `npm run account:activate -- --email comprador@example.com --company "Nombre de empresa"`. Solo desarrollo; busca la identidad ya registrada en Neon Auth y crea su empresa vacía.
- El espacio muestra su marca y permite cambiar nombre/logo al propietario/administrador.
- Las rutas de empresas comprueban la sesión real de Neon en cada petición y la pertenencia a la empresa. El navegador no elige su identidad. La clave antigua no concede acceso.
- Proxy de identidad en el mismo dominio, con cookies HttpOnly, Secure y protección de origen en escrituras. Evita depender de cookies de terceros en Safari/móviles.
- Modo de cuentas aislado mediante ACCOUNT_MODE y VITE_ACCOUNT_MODE. Las rutas antiguas no están disponibles en ese modo. La demo publicada conserva su configuración anterior.
- No se ha conectado todavía el CRUD de QR ni las invitaciones al equipo a esta pantalla. La nueva pantalla lo indica expresamente.

### Configuración y revisión

Neon Auth habilitado solo en dev-multiempresa. Su URL está en .env.multiempresa.local. `neon.ts` declara Auth según ACCOUNT_MODE; no ejecutar despliegues contra main con el entorno de cuentas mientras no se complete la migración.

La cuenta ficticia de revisión y su contraseña están en .account-review.txt, ignorado por Git y Vercel. La empresa se llama Marca de revisión después de la prueba de personalización. Solo contiene datos ficticios. No reutilizar esas credenciales para clientes reales.

La rama Neon de desarrollo caduca el 30/10/2026 a las 22:00 de Madrid; también caducarán estas cuentas de prueba junto con ese entorno. El código permanece en GitHub. El comando de activación NO está disponible desde la web y no modifica la rama principal.

### Pruebas de la etapa

- `npm run lint`: correcto.
- `npm test`: 4/4 anteriores correctas.
- `npm run test:tenants`: todos los casos PASS.
- `npm run test:accounts`: dos registros REALES en Neon Auth; acceso denegado sin sesión; identidad inventada y clave antigua rechazadas; empresas distintas aisladas en HTTP; marca/logo privado; contraseña incorrecta; acceso; restauración; cierre de sesión invalida la cookie anterior. Todos PASS. Las identidades ficticias de estas pruebas automatizadas se eliminan al terminar.
- `npm run build` y `npm run build:accounts`: correctos.
- `npm ci --dry-run --ignore-scripts`: resolución del lockfile correcta; hay avisos de dependencias peer del SDK beta de Neon y comentarios PURE de zod. No han impedido las pruebas ni compilaciones.
- Navegador: entrada con la cuenta de revisión, guardado del nombre, recarga conservando sesión y marca comprobados. Captura guardada en la carpeta de visualizaciones del chat.

Recuperación: formulario y ruta de cambio mediante token conectados al SDK; token inválido probado y rechazado. NO se ha verificado la entrega de un correo ni un cambio real de contraseña por correo. Hace falta una dirección de prueba autorizada. El proveedor usa SMTP compartido para desarrollo; verificar correo y SMTP propio antes de clientes reales. La verificación de correo no es obligatoria en esta configuración de pruebas y no se ha enviado correo a direcciones ficticias.

### Continuación

Siguiente: conectar el panel completo de QR a estas sesiones y espacios, mantener las redirecciones públicas existentes y después implementar invitaciones verificadas del equipo. No publicar el modo de cuentas en producción hasta tener ambos recorridos comprobados y la migración de la demo preparada.
