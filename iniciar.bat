@echo off
title QR Dinamic 4all QR - Servidor Local
echo ========================================================
echo Iniciando servidor QR Dinamic 4all QR en http://localhost:3000
echo ========================================================
cd /d "%~dp0"
call npm start
pause
