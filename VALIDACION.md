# Validación 23 octubre 2026

- npm run lint: correcto.
- npm test: 4 pruebas, 4 correctas. Incluye protección y persistencia de marca.
- npm run build: compilación correcta.
- npm run db:migrate: esquema preparado.
- npm run test:neon: API, CRUD, cambio de redirección, historial y reinicio correctos en esquema temporal.
- Vercel: READY; https://qr-dinamic-4all.vercel.app
- Web, health y marca pública: HTTP 200. Panel sin clave: HTTP 401.
- Demo pública: https://qr-dinamic-4all.vercel.app/r/demo-dinamico conserva el enlace al cambiar destino A a B; ambos HTTP 302.

Advertencia de dependencia pg: sslmode=require se interpreta actualmente como verify-full; revisar antes de actualizar a pg 9. Ningún fallo en las pruebas.
