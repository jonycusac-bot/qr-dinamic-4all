@echo off
setlocal
cd /d "%~dp0"
echo Actualizando QR Dinamic 4all QR Generator desde GitHub...
git pull --ff-only
if errorlevel 1 goto :error
call npm ci
if errorlevel 1 goto :error
call npm test
if errorlevel 1 goto :error
call npm run lint
if errorlevel 1 goto :error
call npm run build
if errorlevel 1 goto :error
echo.
echo Actualizacion completada correctamente.
pause
exit /b 0

:error
echo.
echo La actualizacion no se ha completado. Revisa el mensaje anterior.
pause
exit /b 1
