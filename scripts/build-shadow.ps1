param(
  [string]$Command = 'build'
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$Root = (Resolve-Path (Join-Path $ScriptDir '..')).Path
Set-Location $Root

$Shadow = Join-Path $env:TEMP 'ziii-helpdesk-build'
if (Test-Path $Shadow) { Remove-Item -Recurse -Force $Shadow }
New-Item -ItemType Directory -Path $Shadow | Out-Null

$excludes = @('node_modules','.next','.git')

# Build robocopy command
$src = (Get-Location).Path
try {
  & robocopy $src $Shadow /MIR /XD node_modules .next .git | Out-Null
} catch {
  Write-Host "robocopy no disponible, usando Copy-Item (más lento)" -ForegroundColor Yellow
  Get-ChildItem -Path $src -Force | Where-Object { $excludes -notcontains $_.Name } | Copy-Item -Destination $Shadow -Recurse -Force
}

# Asegurar archivos críticos estén presentes
foreach ($f in @('package.json','package-lock.json')) {
  $s = Join-Path $src $f
  if (Test-Path $s) { Copy-Item -Path $s -Destination (Join-Path $Shadow $f) -Force }
}

Set-Location $Shadow

Write-Host "Building in shadow dir: $Shadow"
if (Test-Path package-lock.json) {
  cmd /c "set \"NODE_OPTIONS=\" && npm ci"
} else {
  cmd /c "set \"NODE_OPTIONS=\" && npm install"
}

$env:NEXT_DISABLE_TURBOPACK = '1'
if ($Command -eq 'build') {
  cmd /c "set \"NODE_OPTIONS=\" && npx next build"
} elseif ($Command -eq 'dev') {
  cmd /c "set \"NODE_OPTIONS=\" && npx next dev"
} else {
  Write-Host "Comando no soportado: $Command"
  exit 2
}
