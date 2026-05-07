@echo off
:: ══════════════════════════════════════════════════════════════════════════════
:: start-ngrok.bat — PureClean Development Launcher
:: ══════════════════════════════════════════════════════════════════════════════
:: Usage: Double-click this file OR run from PowerShell: .\start-ngrok.bat
::
:: What this script does:
::   1. Opens a new terminal for ngrok → Spring Boot (port 8080)
::   2. Opens a new terminal for ngrok → Vite dev server (port 5173)
::   3. Reminds you to copy the ngrok URLs and update .env
::
:: Prerequisites:
::   - ngrok installed (https://ngrok.com/download) and in PATH
::   - Spring Boot already running on port 8080
::   - Vite dev server already running on port 5173 (npm run dev)
:: ══════════════════════════════════════════════════════════════════════════════

title PureClean ngrok Launcher

echo.
echo  ██████╗ ██╗   ██╗██████╗ ███████╗ ██████╗██╗     ███████╗ █████╗ ███╗   ██╗
echo  ██╔══██╗██║   ██║██╔══██╗██╔════╝██╔════╝██║     ██╔════╝██╔══██╗████╗  ██║
echo  ██████╔╝██║   ██║██████╔╝█████╗  ██║     ██║     █████╗  ███████║██╔██╗ ██║
echo  ██╔═══╝ ██║   ██║██╔══██╗██╔══╝  ██║     ██║     ██╔══╝  ██╔══██║██║╚██╗██║
echo  ██║     ╚██████╔╝██║  ██║███████╗╚██████╗███████╗███████╗██║  ██║██║ ╚████║
echo  ╚═╝      ╚═════╝ ╚═╝  ╚═╝╚══════╝ ╚═════╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝
echo.
echo  ngrok Development Launcher
echo  ══════════════════════════════════════════════════════════════════════════════
echo.

:: ── Step 1: Verify ngrok is installed ─────────────────────────────────────────
where ngrok >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] ngrok not found in PATH!
    echo.
    echo  Install ngrok:
    echo    1. Go to https://ngrok.com/download
    echo    2. Download the Windows ZIP
    echo    3. Extract ngrok.exe to C:\Windows\System32 (or any folder in PATH)
    echo    4. Run: ngrok config add-authtoken YOUR_AUTH_TOKEN
    echo       (Get token from: https://dashboard.ngrok.com/get-started/your-authtoken)
    echo.
    pause
    exit /b 1
)

echo  [OK] ngrok found.
echo.

:: ── Step 2: Check ports ───────────────────────────────────────────────────────
echo  Checking if Spring Boot is running on port 8080...
netstat -an | find "8080" | find "LISTENING" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  [WARNING] Nothing detected on port 8080.
    echo  Make sure Spring Boot is running:
    echo    cd laundry-app
    echo    .\mvnw spring-boot:run
    echo.
) else (
    echo  [OK] Port 8080 is active.
)

echo  Checking if Vite is running on port 5173...
netstat -an | find "5173" | find "LISTENING" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  [WARNING] Nothing detected on port 5173.
    echo  Make sure Vite dev server is running:
    echo    cd laundry_front_V2
    echo    npm run dev
    echo.
) else (
    echo  [OK] Port 5173 is active.
)

echo.
echo  ══════════════════════════════════════════════════════════════════════════════
echo   STARTING NGROK TUNNELS...
echo  ══════════════════════════════════════════════════════════════════════════════
echo.

:: ── Step 3: Open ngrok for Spring Boot API (8080) ────────────────────────────
echo  Opening ngrok tunnel for Spring Boot API (port 8080)...
start "ngrok - Spring Boot API :8080" cmd /k "ngrok http 8080 --log=stdout"

:: Short pause to stagger the tunnel openings
timeout /t 2 /nobreak >nul

:: ── Step 4: Open ngrok for Vite frontend (5173) ──────────────────────────────
echo  Opening ngrok tunnel for Vite frontend (port 5173)...
start "ngrok - Vite Frontend :5173" cmd /k "ngrok http 5173 --log=stdout"

:: ── Step 5: Instructions ──────────────────────────────────────────────────────
echo.
echo  ══════════════════════════════════════════════════════════════════════════════
echo   TWO NGROK WINDOWS OPENED. FOLLOW THESE STEPS:
echo  ══════════════════════════════════════════════════════════════════════════════
echo.
echo   STEP 1 — In the "ngrok - Spring Boot API :8080" window:
echo     Look for: Forwarding  https://XXXX.ngrok-free.app -^> http://localhost:8080
echo     COPY the URL: https://XXXX.ngrok-free.app
echo.
echo   STEP 2 — Edit: laundry_front_V2\.env
echo     Change: VITE_API_URL=https://XXXX.ngrok-free.app
echo     (Comment out: # VITE_API_URL=http://localhost:8080)
echo.
echo   STEP 3 — Restart Vite dev server (Ctrl+C then npm run dev)
echo.
echo   STEP 4 — In the "ngrok - Vite Frontend :5173" window:
echo     Look for: Forwarding  https://YYYY.ngrok-free.app -^> http://localhost:5173
echo     COPY the URL: https://YYYY.ngrok-free.app
echo.
echo   STEP 5 — On your phone (Chrome):
echo     Open: https://YYYY.ngrok-free.app
echo     Click "Visit Site" on the ngrok warning page
echo     Login and test!
echo.
echo   STEP 6 — To install the PWA on your phone:
echo     Chrome menu (3 dots) -^> "Add to Home Screen"
echo     OR wait 3 seconds for the install banner to appear
echo.
echo  ══════════════════════════════════════════════════════════════════════════════
echo   IMPORTANT NOTES:
echo  ══════════════════════════════════════════════════════════════════════════════
echo.
echo   - Free ngrok URLs change every time you restart ngrok.
echo     Update .env and restart Vite each session.
echo.
echo   - If you see "ERR_NGROK_108" it means your auth token expired.
echo     Run: ngrok config add-authtoken YOUR_TOKEN
echo.
echo   - ngrok dashboard (live request log): http://localhost:4040
echo.
pause
