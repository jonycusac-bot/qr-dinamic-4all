# Web de pruebas con cuentas

Clientes: https://qr-dinamic-4all-pruebas.vercel.app/
Administrador: https://qr-dinamic-4all-pruebas.vercel.app/admin

Proyecto Vercel separado: qr-dinamic-4all-pruebas. Configuración vercel.accounts.json.
Entorno de datos: rama Neon dev-multiempresa. Sus datos y cuentas son los mismos usados en las pruebas locales. Caducidad retirada y verificada el 24/10/2026: la rama ya no tiene eliminación programada.

Los clientes se registran en la raíz. El administrador activa la empresa en /admin. Los miembros añadidos por la empresa utilizan su enlace de alta personal. No se envían correos ni se cobran importes automáticamente.

Los nuevos QR creados desde la web publicada apuntan al dominio público. Los QR impresos antes con localhost siguen siendo locales: descargar nuevamente desde la web publicada.

La demo anterior y sus redirecciones /r no se han migrado a esta versión.

## Publicación verificada
Publicada el 24 de octubre de 2026 en el dominio indicado. Registro real de prueba, sesión, activación, QR y redirección, estadísticas, permisos y cierre de sesión comprobados desde Internet. Cuenta y empresa ficticias de verificación eliminadas al terminar.
La configuración de cuenta y la conexión de desarrollo se suministraron como variables privadas del despliegue; no están en GitHub ni en este documento. Para actualizar Vercel deben conservarse esas variables y usar vercel.accounts.json con VITE_ACCOUNT_MODE=true durante la compilación.

## Entorno asegurado antes del piloto
El 24/10/2026 se retiró la caducidad de dev-multiempresa. Punto de recuperación separado: respaldo-previo-piloto-20261024 (br-plain-wildflower-ba5e14uy), creado desde esa rama, sin compute adicional. Es una copia dentro del mismo proyecto, no una copia externa independiente. La recuperación histórica configurada es de seis horas. Pendiente antes de uso comercial: ensayo de restauración y política de copias independientes.
