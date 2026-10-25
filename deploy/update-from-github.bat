@echo off
rem Brings this copy of kura-dev up to date with GitHub (origin, and upstream if it is set).
rem Only fast-forwards: it never merges or discards local work. Result saved in git-pull.log.
setlocal
cd /d "%~dp0.."
call :main > "%~dp0git-pull.log" 2>&1
set "RC=%ERRORLEVEL%"
type "%~dp0git-pull.log"
if /i not "%~1"=="nopause" pause
exit /b %RC%

:main
git remote -v
git fetch --all --prune || exit /b 1
for /f "delims=" %%b in ('git branch --show-current') do set "BR=%%b"
echo Before:
git log --oneline -1
git merge --ff-only origin/%BR% || (echo STOPPED: could not fast-forward %BR%. & exit /b 1)
echo After:
git log --oneline -15
git status -sb | findstr /b "##"
echo PULL-DONE
exit /b 0
