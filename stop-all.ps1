# stop-all.ps1 — stop every edova service by freeing its port.
#
#   ./stop-all.ps1
#
# Frees ports 8000 (RAG), 8001 (Clerk), 8002 (CAMEL), 5173 (edova-web) by
# stopping whatever process is listening on each. Safe to run anytime.

$ports = 8000, 8001, 8002, 5173
foreach ($port in $ports) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if (-not $conns) {
    Write-Host ("  port {0}: nothing running" -f $port) -ForegroundColor DarkGray
    continue
  }
  $conns | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {
    try {
      $name = (Get-Process -Id $_ -ErrorAction Stop).ProcessName
      Stop-Process -Id $_ -Force
      Write-Host ("  port {0}: stopped {1} (pid {2})" -f $port, $name, $_) -ForegroundColor Green
    } catch {
      Write-Host ("  port {0}: could not stop pid {1}" -f $port, $_) -ForegroundColor Yellow
    }
  }
}
Write-Host "Done." -ForegroundColor Cyan
