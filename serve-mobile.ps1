# Serve o jogo na rede local para abrir no celular (mesma Wi‑Fi).
# Uso: clique direito → Executar com PowerShell  OU:
#   powershell -ExecutionPolicy Bypass -File .\serve-mobile.ps1

$port = 8080
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

# Prefere Wi‑Fi (192.168.x) em vez de vEthernet/WSL
$ip = (
  Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object {
    $_.IPAddress -like '192.168.*' -and
    $_.InterfaceAlias -notlike '*vEthernet*' -and
    $_.InterfaceAlias -notlike '*WSL*'
  } |
  Select-Object -ExpandProperty IPAddress -First 1
)
if (-not $ip) {
  $ip = (
    Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -like '10.*' -and $_.InterfaceAlias -notlike '*vEthernet*' } |
    Select-Object -ExpandProperty IPAddress -First 1
  )
}
if (-not $ip) { $ip = "SEU_IP" }

Write-Host ""
Write-Host "DSNSC — servidor mobile" -ForegroundColor Cyan
Write-Host "No PC:      http://127.0.0.1:$port/"
Write-Host "No celular: http://${ip}:$port/" -ForegroundColor Green
Write-Host "Deixe o Docker/Supabase rodando: npx supabase start"
Write-Host "Ctrl+C para parar."
Write-Host ""

# Libera porta no firewall (melhor esforço)
try {
  $rule = "DSNSC-HTTP-$port"
  if (-not (Get-NetFirewallRule -DisplayName $rule -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $rule -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow | Out-Null
  }
  $ruleApi = "DSNSC-Supabase-54321"
  if (-not (Get-NetFirewallRule -DisplayName $ruleApi -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $ruleApi -Direction Inbound -Protocol TCP -LocalPort 54321 -Action Allow | Out-Null
  }
} catch {
  Write-Host "(Aviso) Não foi possível criar regra de firewall automaticamente. Rode como Administrador se o celular não conectar." -ForegroundColor Yellow
}

python -m http.server $port --bind 0.0.0.0
