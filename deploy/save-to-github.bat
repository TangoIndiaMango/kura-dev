@echo off
rem Brings main up to date, commits the deploy kit (this folder + .gitignore) and pushes it.
rem Commits are made as the emicrafttech GitHub account: Vercel's Hobby plan only deploys
rem commits by the account owner, so this push also makes Vercel deploy the latest main.
rem With nothing new to commit it pushes an empty "deploy" commit for the same reason.
rem Secrets (production.env, server.txt, *.log) are gitignored. Result saved in git-push.log.
setlocal
cd /d "%~dp0.."
call :main > "%~dp0git-push.log" 2>&1
set "RC=%ERRORLEVEL%"
type "%~dp0git-push.log"
if /i not "%~1"=="nopause" pause
exit /b %RC%

:main
where git || (echo Git isn't installed. & exit /b 1)
set "AS=-c user.name=emicrafttech -c user.email=260626668+emicrafttech@users.noreply.github.com"
for /f "delims=" %%b in ('git branch --show-current') do set "BR=%%b"
git fetch origin || exit /b 1
rem files that differ from git only in line endings are reset, so they never block the update
for /f "delims=" %%f in ('git diff --name-only') do git diff --quiet --ignore-cr-at-eol -- "%%f" && git checkout -q -- "%%f"
git checkout -q HEAD -- deploy/README.md deploy/production.env.example
git status --short
git merge --ff-only origin/%BR% || (echo STOPPED: %BR% has local commits that are not on GitHub. & exit /b 1)
git add -- deploy .gitignore || exit /b 1
git diff --cached --name-only | findstr /i /r /c:"production\.env$" /c:"server\.txt$" /c:"\.log$" && (echo STOPPED: a secret file was about to be committed. & git reset -q & exit /b 1)
git diff --cached --quiet && goto empty
git %AS% commit -q -m "deploy: update the VPS deploy kit" -m "Domains: landing page at kuramobility.com, rider app at app.kuramobility.com, admin at admin.kuramobility.com, API at api.kuramobility.com. Adds update-from-github.bat." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01XaXU4Mxfdpxvs53dFR8C3b" || exit /b 1
goto push
:empty
git %AS% commit -q --allow-empty -m "chore: deploy latest main" -m "Empty commit by the Vercel account owner so the Hobby plan deploys it." || exit /b 1
:push
git log --oneline -3
git push origin %BR% || exit /b 1
echo Pushed %BR% to origin.
git status -sb | findstr /b "##"
echo PUSH-DONE
exit /b 0
