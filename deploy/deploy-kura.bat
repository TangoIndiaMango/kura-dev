@echo off
rem Puts Kura's API (Go backend + worker + PostgreSQL + Redis) on your Hostinger server, next to
rem your other projects, or updates it. Run it from this "deploy" folder; run again for every update.
rem Uses the same server and PC key as SocialSpot (no password needed). What it does on the server
rem is in kura-server.sh; it leaves your other projects alone. The result is saved in last-run.log.
setlocal
cd /d "%~dp0"
set "ROOT=%~dp0.."
set "KEYONLY=-o StrictHostKeyChecking=accept-new -o ConnectTimeout=20 -o PasswordAuthentication=no -o KbdInteractiveAuthentication=no"

if not exist server.txt if exist "%ROOT%\..\SocialSpot\deploy\server.txt" copy "%ROOT%\..\SocialSpot\deploy\server.txt" server.txt >nul
if not exist server.txt (echo No server.txt: put the server's IP address in deploy\server.txt. & pause & exit /b 1)
set /p IP=<server.txt
if not exist production.env (echo No production.env next to this file. & pause & exit /b 1)
if not exist deploy.conf (echo No deploy.conf next to this file. & pause & exit /b 1)

echo Packing the backend code...
set "PKG=%TEMP%\kura-src.tgz"
if exist "%PKG%" del "%PKG%"
tar -czf "%PKG%" -C "%ROOT%" --exclude=.env --exclude=*.env --exclude=tmp --exclude=bin backend || goto fail

echo Sending to %IP%...
ssh %KEYONLY% root@%IP% "rm -rf /tmp/kura-deploy && mkdir -m 700 /tmp/kura-deploy" || goto fail
scp -q %KEYONLY% "%PKG%" docker-compose.yml production.env deploy.conf nginx-kura-api.conf kura-server.sh root@%IP%:/tmp/kura-deploy/ || goto fail

echo Installing on the server (the first time takes a few minutes)...
ssh %KEYONLY% root@%IP% "bash /tmp/kura-deploy/kura-server.sh 2>&1 | tee /tmp/kura-deploy/run.log; exit ${PIPESTATUS[0]}"
set "RC=%ERRORLEVEL%"
scp -q %KEYONLY% root@%IP%:/tmp/kura-deploy/run.log last-run.log
ssh %KEYONLY% root@%IP% "rm -rf /tmp/kura-deploy"
del "%PKG%" 2>nul
echo.
if "%RC%"=="0" (echo Kura is deployed. Details in last-run.log.) else (echo Something stopped the deploy - see above or last-run.log. Your other projects were not touched.)
if /i not "%~1"=="nopause" pause
exit /b %RC%

:fail
echo Couldn't reach or send to the server (see above).
ssh %KEYONLY% root@%IP% "rm -rf /tmp/kura-deploy" 2>nul
if /i not "%~1"=="nopause" pause
exit /b 1
