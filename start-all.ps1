# start-all.ps1 - launch every edova service in its own window.
#
#   Right-click > Run with PowerShell, or from a terminal:  ./start-all.ps1
#
# Each service opens in a separate PowerShell window that stays open so you can
# read its logs and press Ctrl+C to stop just that one. Close a window to stop
# that service; run ./stop-all.ps1 (or close all windows) to stop everything.

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$ragPython = "C:\Users\pvsat\venvs\edova-rag\Scripts\python.exe"

# name, working directory, command to run in the new window
$services = @(
  @{ Name = "RAG (Ask-the-Textbook) 8000"; Dir = "$root\ncert_rag\edova-coteacher-rag";
     Cmd = "& '$ragPython' -m uvicorn api:app --port 8000" },
  @{ Name = "Clerk (records + uploads) 8001"; Dir = "$root\ncert_rag\clerk";
     Cmd = "`$env:AWS_PROFILE='admin'; python -m uvicorn api:app --port 8001" },
  @{ Name = "CAMEL (lesson planner) 8002"; Dir = "$root\edova-camel";
     Cmd = "python -m uvicorn api:app --port 8002" },
  @{ Name = "edova-web (teacher app) 5173"; Dir = "$root\edova-web";
     Cmd = "npm run dev" }
)

Write-Host "Starting edova services..." -ForegroundColor Cyan
foreach ($s in $services) {
  if (-not (Test-Path $s.Dir)) {
    Write-Host ("  ! skipped {0} - folder not found: {1}" -f $s.Name, $s.Dir) -ForegroundColor Yellow
    continue
  }
  # Title the window, cd into the service, then run it (window stays open on -NoExit).
  $inner = "`$host.UI.RawUI.WindowTitle = 'edova - $($s.Name)'; Set-Location '$($s.Dir)'; $($s.Cmd)"
  Start-Process powershell -ArgumentList "-NoExit", "-Command", $inner | Out-Null
  Write-Host ("  started {0}" -f $s.Name) -ForegroundColor Green
  Start-Sleep -Milliseconds 700
}

Write-Host ""
Write-Host "All four windows launched. Give them ~15s to boot, then open:" -ForegroundColor Cyan
Write-Host "    http://localhost:5173" -ForegroundColor White
Write-Host "(RAG needs its venv at $ragPython; the Clerk needs the 'admin' AWS profile.)" -ForegroundColor DarkGray
