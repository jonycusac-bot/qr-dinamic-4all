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
