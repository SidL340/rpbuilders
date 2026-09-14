@echo off
title R.P. Builders Pvt Ltd - Accounting Portal
color 0B

echo =======================================================
echo    R.P. BUILDERS PVT. LTD. - ACCOUNTING PORTAL
echo         Construction Company ERP System
echo =======================================================
echo.

echo [1/2] Starting Backend API Server (Port 5000)...
start "RP Builders Backend Server" cmd /k "cd rp-builders-server && npm start"

timeout /t 2 >nul

echo [2/2] Starting React Frontend (Port 5173)...
start "RP Builders Frontend Client" cmd /k "cd rp-builders-client && npm run dev"

echo.
echo =======================================================
echo   Portal is starting up!
echo   Open your browser at: http://localhost:5173
echo   Default Login: admin / password
echo =======================================================
echo.
pause
