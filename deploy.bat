@echo off
setlocal

:: === CONFIGURATION ===
set PROJECT_DIR=%~dp0
set DIST_DIR=%PROJECT_DIR%dist\nade-helper\browser
set REMOTE_HOST=hetzner
set REMOTE_PATH=/var/www/nade-helper

:: === STEP 1: Build Angular App ===
echo.
echo 🔧 Building Angular app...
call ng build --configuration production
IF %ERRORLEVEL% NEQ 0 (
    echo ❌ Angular build failed!
    exit /b 1
)

:: === STEP 2: Deploy via SCP ===
echo.
echo 📦 Deploying files to %REMOTE_HOST%:%REMOTE_PATH% ...
scp -r "%DIST_DIR%\*" %REMOTE_HOST%:%REMOTE_PATH%
IF %ERRORLEVEL% NEQ 0 (
    echo ❌ SCP upload failed!
    exit /b 1
)

echo.
echo ✅ Deployment complete!
pause
