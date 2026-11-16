@echo off
setlocal
cd /d "%~dp0"
if errorlevel 1 exit /b 1

py -3 -c "import sys; sys.exit(sys.version_info < (3, 8))" >nul 2>&1
if not errorlevel 1 (
    py -3 start.py
    goto finished
)

python -c "import sys; sys.exit(sys.version_info < (3, 8))" >nul 2>&1
if not errorlevel 1 (
    python start.py
    goto finished
)

echo Python 3 was not found.
echo Install Python from https://www.python.org/downloads/windows/ and try again.
pause
exit /b 1

:finished
if errorlevel 1 pause
endlocal
