@echo off
rem Shows how Kura is doing on the server (containers, health, last log lines). Changes nothing.
setlocal
cd /d "%~dp0"
set "KEYONLY=-o StrictHostKeyChecking=accept-new -o ConnectTimeout=20 -o PasswordAuthentication=no -o KbdInteractiveAuthentication=no"
if not exist server.txt (echo Run deploy-kura.bat first. & pause & exit /b 1)
set /p IP=<server.txt
ssh %KEYONLY% root@%IP% "cd /opt/kura && docker compose --env-file production.env ps --format 'table {{.Name}}\t{{.Status}}'; echo; curl -fsS --max-time 5 http://127.0.0.1:$(grep -m1 '^API_PORT=' production.env | cut -d= -f2)/readyz && echo; echo; docker compose --env-file production.env logs --tail 25 api worker; ls -1 backups | tail -3" > status.log 2>&1
type status.log
if /i not "%~1"=="nopause" pause
