@echo off
rem Commits the deploy kit (this folder + .gitignore) and pushes the current branch to origin.
rem Only these paths are committed; secrets (production.env, server.txt, *.log) are gitignored.
rem The result is saved in git-push.log.
setlocal
cd /d "%~dp0.."
call :main > "%~dp0git-push.log" 2>&1
set "RC=%ERRORLEVEL%"
type "%~dp0git-push.log"
if /i not "%~1"=="nopause" pause
exit /b %RC%

:main
where git || (echo Git isn't installed. & exit /b 1)
git add -- deploy .gitignore || exit /b 1
git diff --cached --name-only | findstr /i /r /c:"production\.env$" /c:"server\.txt$" /c:"\.log$" && (echo STOPPED: a secret file was about to be committed. & git reset -q & exit /b 1)
git diff --cached --quiet && (echo Nothing new to commit.) && goto push
set "GITID="
for /f "delims=" %%e in ('git config user.email') do set "GITID=1"
if not defined GITID set "GITID=-c user.name=Adefemi -c user.email=oseni.adefemigreat@gmail.com"
if "%GITID%"=="1" set "GITID="
git %GITID% commit -q -m "deploy: Hostinger VPS deploy kit for the Go backend" -m "Production docker compose (API, worker, Postgres 17, Redis; no public db/redis ports), nginx site with Let's Encrypt for api.kuramobility.com, nightly pg_dump backups, rollback on failed health check, and Windows scripts to deploy and check status. Frontends stay on Vercel (kuramobility.com, admin.kuramobility.com)." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01XaXU4Mxfdpxvs53dFR8C3b" || exit /b 1
git log --oneline -1
:push
for /f "delims=" %%b in ('git branch --show-current') do set "BR=%%b"
git push origin %BR% || exit /b 1
echo Pushed %BR% to origin.
git status -sb | findstr /b "##"
exit /b 0
