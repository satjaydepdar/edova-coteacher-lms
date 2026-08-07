# start-all.ps1 - launch every Edova service with one command.
# Usage:  powershell -File start-all.ps1      (or:  .\start-all.ps1)
# Each service runs in its own minimized window; logs land in logs\.
# Services already running are skipped, so it is safe to re-run.

$root = $PSScriptRoot
$logs = Join-Path $root "logs"
New-Item -ItemType Directory -Force -Path $logs | Out-Null

$services = @(
  @{ Name = "edova-web (vite)      :5173"; Dir = "edova-web";       Cmd = "npm run dev";                              Port = 5173 },
  @{ Name = "ncert_rag (curriculum):8000"; Dir = "ncert_rag";       Cmd = "python -m uvicorn api.app:app --port 8000"; Port = 8000 },
  @{ Name = "clerk (gamification)  :8001"; Dir = "ncert_rag/clerk"; Cmd = "python -m uvicorn api:app --port 8001";     Port = 8001 },
  @{ Name = "edova-camel (AI)      :8002"; Dir = "edova-camel";     Cmd = "python -m uvicorn api:app --port 8002";     Port = 8002 },
  @{ Name = "edova-backend (auth)  :8003"; Dir = "edova-backend";   Cmd = "python -m uvicorn main:app --port 8003";    Port = 8003 }
)

foreach ($s in $services) {
  $listening = (Test-NetConnection -ComputerName localhost -Port $s.Port -WarningAction SilentlyContinue).TcpTestSucceeded
  if ($listening) {
    Write-Host ("SKIP   {0} - already running" -f $s.Name) -ForegroundColor DarkGray
    continue
  }
  $dir = Join-Path $root $s.Dir
  Start-Process cmd -ArgumentList "/k", "cd /d `"$dir`" && $($s.Cmd)" -WindowStyle Minimized
  Write-Host ("START  {0}" -f $s.Name) -ForegroundColor Green
}

Write-Host "`nWaiting for services to come up (this takes ~30s for the AI models)..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

Write-Host ""
foreach ($s in $services) {
  $up = (Test-NetConnection -ComputerName localhost -Port $s.Port -WarningAction SilentlyContinue).TcpTestSucceeded
  if ($up) { Write-Host ("UP     {0}" -f $s.Name) -ForegroundColor Green }
  else     { Write-Host ("DOWN   {0} - see logs\" -f $s.Name) -ForegroundColor Red }
}

Write-Host "`nApp: http://localhost:5173   (teacher@edova.co / teacher123!  -  student@edova.co / student123!)" -ForegroundColor Cyan
Write-Host "Stop everything:  .\stop-all.ps1"
