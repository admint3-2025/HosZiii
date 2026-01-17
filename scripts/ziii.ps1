#!/usr/bin/env pwsh
param(
    [Parameter(Position=0)]
    [string]$Command = "help",
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$RemainingArgs
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location (Join-Path $ScriptDir "..")

function Exec-Next {
    param(
        [string]$SubCmd,
        [string[]]$Args
    )

    $localNext = Join-Path (Resolve-Path node_modules -ErrorAction SilentlyContinue) "next/dist/bin/next"
    if (Test-Path $localNext) {
        & node $localNext $SubCmd @Args
        exit $LASTEXITCODE
    }

    Write-Host "[ziii.ps1] 'next' no encontrado localmente, usando 'npx' como fallback" -ForegroundColor Yellow
    & npx next $SubCmd @Args
    exit $LASTEXITCODE
}

switch ($Command) {
    "" { Write-Host "Uso: .\scripts\ziii.ps1 <comando>"; exit 0 }
    "help" { Write-Host "Comandos: workdir, install, dev, build, start, lint, help"; exit 0 }
    "workdir" { Write-Output (Get-Location); exit 0 }
    "install" { & npm install @RemainingArgs; exit $LASTEXITCODE }
    "dev" { Exec-Next "dev" $RemainingArgs }
    "build" { Exec-Next "build" $RemainingArgs }
    "start" {
        if (-not (Test-Path ".next\server\webpack-runtime.js")) {
            Write-Host "[ziii.ps1] Build faltante; ejecutando 'build' antes de 'start'" -ForegroundColor Yellow
            Exec-Next "build" $RemainingArgs
        }
        Exec-Next "start" $RemainingArgs
    }
    "lint" { Exec-Next "lint" $RemainingArgs }
    default { Write-Host "Comando no reconocido: $Command" -ForegroundColor Red; exit 2 }
}
