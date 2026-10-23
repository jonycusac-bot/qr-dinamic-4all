# Desarrollo y pruebas en Windows

La arquitectura elegida es Vercel + Neon + OneDrive/SharePoint. El PC se utiliza para desarrollar y probar; no necesita permanecer encendido para servir la web publicada en Vercel.

En `C:\Users\Usuario\Desktop\QR`:

```powershell
npm ci
# Configura .env.local con DATABASE_URL y DATABASE_URL_UNPOOLED de Neon.
npm run db:migrate
npm run db:check
npm test
npm run lint
npm run build
npm start
```

Abre http://localhost:3000. `iniciar.bat` arranca el servidor; `compilar.bat` instala las dependencias fijadas y compila. Después de subir cambios a GitHub, `actualizar-pc.bat` descarga mediante fast-forward, instala, prueba, comprueba TypeScript y compila. Si hay cambios locales de código, resuélvelos antes de actualizar.

El servidor necesita Internet para acceder a Neon. Sin base de datos no se guardan cambios en un JSON alternativo. Las credenciales solo se configuran en el servidor; `.env.local` no se publica.

Para probar desde un móvil en la misma red, abre `http://IP-DEL-PC:3000`. El QR debe contener esa dirección accesible o, para uso definitivo, el dominio HTTPS estable del despliegue Vercel. Los enlaces con localhost solo funcionan en el propio PC.

Consulta README.md para arquitectura, permisos, conservación de datos, publicación y pruebas de Neon.
