@echo off
title Build R.P. Builders Desktop Installer (.exe)
color 0A

echo ================================================================
echo    BUILDING STANDALONE DESKTOP APPLICATION FOR CLIENT
echo                  R.P. Builders Pvt. Ltd.
echo ================================================================
echo.
echo [1/2] Compiling and bundling frontend & backend...
cd rp-builders-client
call npm run build

echo.
echo [2/2] Packaging into Windows Installer (.exe) with Electron Builder...
call npx electron-builder --win --x64

echo.
echo ================================================================
echo   BUILD COMPLETE!
echo   Your client-ready installer (.exe) is located in:
echo   rp-builders-client\release\
echo ================================================================
pause
