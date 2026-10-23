@echo off
title QR Dinamic 4all QR - Compilacion
echo ========================================================
echo [1/2] Instalando dependencias necesarias...
echo ========================================================
cd /d "%~dp0"
call npm ci
if errorlevel 1 goto :error

echo.
echo ========================================================
echo [2/2] Compilando la aplicacion para produccion...
echo ========================================================
call npm run build
if errorlevel 1 goto :error

echo.
echo ========================================================
echo COMPILACION COMPLETADA CORRECTAMENTE
echo Ahora puedes ejecutar 'iniciar.bat' o usar PM2.
echo ========================================================
pause
exit /b 0

:error
echo La compilacion ha fallado. Revisa el error anterior.
pause
exit /b 1
