# stop-all.ps1 — stop every Edova service started by start-all.ps1.
# Kills whatever is listening on the app ports.

$ports = 5173, 8000, 8001, 8002, 8003

foreach ($p in $ports) {
  $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $conns) {
    try {
      Stop-Process -Id $c.OwningProcess -Force -ErrorAction Stop
      Write-Host ("STOPPED port {0} (pid {1})" -f $p, $c.OwningProcess) -ForegroundColor Yellow
    } catch {
      Write-Host ("FAILED  port {0} (pid {1})" -f $p, $c.OwningProcess) -ForegroundColor Red
    }
  }
}
Write-Host "Done."
