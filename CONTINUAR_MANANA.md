# Para retomar — estado al cierre del 24 de octubre de 2026

## Preferencia del usuario
Antes de hacer cambios, preguntar siempre si quiere añadir algo más al alcance. No volver a desplegar, solicitar correos ni cambiar contraseñas sin revisar primero el punto pendiente con él.

## Proyecto y accesos correctos
Carpeta: C:/Users/Usuario/Desktop/Qr Dinamic 4all
GitHub: https://github.com/jonycusac-bot/qr-dinamic-4all
Rama: feature/multiempresa-base
Clientes: https://qr-dinamic-4all-pruebas.vercel.app/
Registro: https://qr-dinamic-4all-pruebas.vercel.app/registro
Administrador: https://qr-dinamic-4all-pruebas.vercel.app/admin
Administrador general: jonaillusion@gmail.com. Su contraseña la conoce solo el usuario.
La URL qr-dinamic-4all.vercel.app es la demo ANTERIOR y puede mostrar Fantastic World/B&O y clave compartida. No usar para este piloto. El proyecto Illusion de Desktop/QR también es independiente.

## Terminado, guardado y publicado
- Cuentas reales, empresas aisladas y activación manual desde administración.
- Panel original por empresa: instalaciones, diseño/pegatinas QR, destinos editables, estadísticas y marca.
- QR nuevos en /q/:codigo. Los antiguos impresos con localhost se deben descargar de nuevo desde el dominio público.
- Equipo: alta por nombre, correo y rol; enlace personal de 7 días, contraseña propia y aceptación ligada al correo. No se envía correo de invitación. Caducidad, revocación y permisos probados.
- Accesos visualmente diferenciados con logo SVG de ejemplo; registro en /registro y administración violeta.
- Administración compacta: Resumen, Clientes, Registros pendientes, Códigos y consumo. Avisos dentro del portal con consulta cada 20 segundos mientras está visible. Todavía no hay correo ni push de nuevos registros.
- Baja reversible por empresa: suspende miembros y redirecciones, conserva datos y permite reactivar; probado con empresas ficticias.
- Consumo por empresa, detalle paginado, accesos reales separados de simulaciones y límite inicial de 100 QR creados, incluidos archivados. El exceso alerta para revisión; no cobra automáticamente. Revisar comercialmente si se facturará por activos en vez de creados.
- TypeScript, compilaciones e integración comprobados. Último código publicado: 824389f.

## Punto exacto pendiente: recuperación por correo
El usuario autorizó usar jonaillusion@gmail.com para probar la recuperación.
Se hizo UNA solicitud a /api/identity/request-password-reset de la web pública, con redirección a /?view=reset. Neon respondió HTTP 200 y status:true. Esto solo acredita aceptación de la solicitud, NO entrega del correo.
El usuario aún NO ha confirmado si llegó el mensaje, si abrió el enlace ni si cambió la contraseña. NO afirmar recuperación verificada ni reenviar automáticamente. Preguntar mañana si lo recibió (también Spam; remitente compartido posible auth@mail.myneon.app).
La contraseña no fue cambiada por el agente. No guardar ni pedir la contraseña o el enlace de recuperación; el usuario debe completar la elección y envío de la nueva contraseña. Si el enlace caducó, proponer solicitar uno nuevo.

## Próximos pasos acordados
1. Verificar recepción de correo, enlace, cambio de contraseña y acceso posterior con el usuario.
2. Configurar avisos por correo al gestor cuando se registre un cliente; requiere elegir y configurar proveedor/remitente. Aún no implementado.
3. Piloto juntos: cliente nuevo > activar empresa > primer QR impreso > escaneo móvil > cambio de destino > segundo usuario. PILOTO_CLIENTE.md es la lista de seguimiento; no marcar pasos de usuario no confirmados.

## Marca y dominio
Marca mantenida: QR Dinamic 4all.
Dominio elegido: qrdinamic4all.com, previsto registrar con Cloudflare MÁS ADELANTE. NO comprado, reservado ni conectado; disponibilidad puede cambiar. No contratar sin autorización.
Para pruebas se puede usar Gmail; correo profesional/autenticación de dominio pendiente.

## Entorno y respaldo
Neon: old-cell-68983129, rama dev-multiempresa (br-flat-breeze-bam4xkkl).
Se RETIRÓ y verificó la caducidad: ya NO caduca el 30 de octubre.
Punto de recuperación listo: respaldo-previo-piloto-20261024 (br-plain-wildflower-ba5e14uy), sin compute adicional, dentro del mismo proyecto. No es una copia externa independiente ni se ha ensayado restauración. Recuperación histórica configurada: 6 horas.
Antes de ofrecer comercialmente: restauración probada, copia independiente, recuperación de contraseñas, dominio, correo, condiciones y alojamiento compatible con actividad comercial. Vercel Hobby no permite uso comercial.

## Publicación y datos privados
Vercel: qr-dinamic-4all-pruebas, equipo jonaans-projects. Configuración vercel.accounts.json. VITE_ACCOUNT_MODE=true en compilación; ACCOUNT_MODE=true, ACCOUNT_APP_ORIGIN del dominio público, NEON_AUTH_BASE_URL y MULTITENANT_DATABASE_URL en servidor. Conservar esas variables al actualizar. No desplegar sin ellas ni reemplazar la demo antigua por accidente.
.env.local y .env.multiempresa.local contienen secretos y no están en GitHub. No imprimirlos ni subirlos. Las credenciales ficticias locales .account-review.txt y .demo-access.txt se conservan ignoradas. Hay un .txt ajeno sin seguimiento que se mantiene local y no se añade.
Arranque local, solo si hace falta: npm run dev:accounts en la carpeta correcta (puerto 3001). La web pública funciona con el ordenador apagado.

## Frase para retomar
Continuamos QR Dinamic 4all desde CONTINUAR_MANANA.md. Primero pregunta si llegó el correo de recuperación solicitado a jonaillusion@gmail.com y si quiero añadir algo más antes de hacer cambios.
