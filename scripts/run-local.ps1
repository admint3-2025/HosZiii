Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host "== ZIII Helpdesk (local) ==" -ForegroundColor Cyan

function Require-Command($name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "No se encontró '$name' en PATH. Instala Node.js 20+ y reinicia tu terminal." 
  }
}

Require-Command "node"
Require-Command "npm"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path ".env.local")) {
  Copy-Item ".env.example" ".env.local" -Force
  Write-Host "Se creó .env.local desde .env.example. Debes completar las variables de Supabase." -ForegroundColor Yellow
}

$envContent = Get-Content ".env.local" -Raw
if ($envContent -match "NEXT_PUBLIC_SUPABASE_URL=\s*$" -or $envContent -match "NEXT_PUBLIC_SUPABASE_ANON_KEY=\s*$") {
  Write-Host "Faltan credenciales de Supabase en .env.local" -ForegroundColor Yellow
  Write-Host "- Abre Supabase -> Project Settings -> API" -ForegroundColor Yellow
  Write-Host "- Pega NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor Yellow
  Write-Host "Luego vuelve a ejecutar: ./scripts/run-local.ps1" -ForegroundColor Yellow
  exit 1
}

if ($envContent -notmatch "NEXT_PUBLIC_SUPABASE_URL=https?://") {
  Write-Host "NEXT_PUBLIC_SUPABASE_URL no parece una URL HTTP/HTTPS (¿están invertidas las variables?)." -ForegroundColor Yellow
  Write-Host "Ejemplo: NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co" -ForegroundColor Yellow
  exit 1
}

if (-not (Test-Path "node_modules")) {
  Write-Host "Instalando dependencias (npm install)…" -ForegroundColor Cyan
  npm install
}

Write-Host "Iniciando servidor de desarrollo (npm run dev)…" -ForegroundColor Cyan
Write-Host "Abrir: http://localhost:3000" -ForegroundColor Green
npm run dev
