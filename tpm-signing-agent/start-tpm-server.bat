@echo off
REM TPM Signing Agent - Windows Deployment Script
REM This script can be packaged with Electron apps for easy TPM setup on Windows

setlocal

echo 🔐 TPM Signing Agent for Safe Desktop
echo =====================================
echo.

REM Set script directory as working directory
cd /d "%~dp0"

REM Check if this is first run
if not exist ".tpm-config" if not exist "tpm-signing-server.exe" (
    echo 🚀 First time setup - this will:
    echo    1. Check for WSL ^(Windows Subsystem for Linux^)
    echo    2. Install TPM tools in WSL
    echo    3. Build server binaries
    echo    4. Generate and seal crypto keys to TPM
    echo    5. Start the signing server
    echo.
    set /p "choice=Continue with setup? [Y/n]: "
    if /i "%choice%"=="n" (
        echo Setup cancelled.
        exit /b 0
    )
    
    REM Check for WSL
    wsl --list >nul 2>&1
    if errorlevel 1 (
        echo ❌ WSL is required but not installed.
        echo Please install WSL from Microsoft Store:
        echo    https://aka.ms/wslinstall
        echo.
        echo Then run this script again.
        pause
        exit /b 1
    )
    
    echo ✅ WSL detected, running setup...
    wsl bash -c "./setup-and-run.sh"
    
) else (
    echo ⚡ Quick start - TPM is already configured
    echo.
    
    REM Just start the server
    wsl bash -c "./setup-and-run.sh --start"
)

echo.
echo 🎉 TPM Signing Agent is now running!
echo     Your Electron app can now make requests to:
echo     • http://localhost:8081/address
echo     • http://localhost:8081/sign
echo.
echo 📖 To stop the server: start-tpm-server.bat stop
echo 📖 To check status:    start-tpm-server.bat status
echo.

if "%1"=="stop" (
    wsl bash -c "./setup-and-run.sh --stop"
    exit /b 0
)

if "%1"=="status" (
    wsl bash -c "./setup-and-run.sh --status"
    exit /b 0
)

pause
