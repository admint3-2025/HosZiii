# Script para aplicar marcas de mantenimiento a Supabase
# Ejecutar: .\scripts\apply-brands-maintenance.ps1

Write-Host "====================================" -ForegroundColor Cyan
Write-Host " Aplicando Marcas de Mantenimiento" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Join-Path $PSScriptRoot ".." "supabase" "seed-brands-maintenance.sql"

if (!(Test-Path $scriptPath)) {
    Write-Host "❌ ERROR: No se encuentra el archivo seed-brands-maintenance.sql" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Archivo de migración: seed-brands-maintenance.sql" -ForegroundColor Green
Write-Host ""
Write-Host "Selecciona el método de aplicación:" -ForegroundColor Yellow
Write-Host "  1) SSH al servidor (root@192.168.31.240)" -ForegroundColor White
Write-Host "  2) Copiar SQL para Supabase Studio" -ForegroundColor White
Write-Host "  3) Salir" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Opción [1-3]"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🔌 Conectando al servidor via SSH..." -ForegroundColor Cyan
        
        $sshCommand = "cd /opt/helpdesk && docker exec -i supabase-db psql -U postgres -d postgres"
        
        Get-Content $scriptPath | ssh root@192.168.31.240 $sshCommand
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Marcas de mantenimiento aplicadas exitosamente" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "❌ Error al aplicar las marcas. Código de salida: $LASTEXITCODE" -ForegroundColor Red
            Write-Host ""
            Write-Host "Intenta con la opción 2 (Supabase Studio)" -ForegroundColor Yellow
        }
    }
    "2" {
        Write-Host ""
        Write-Host "📋 Contenido del SQL copiado al portapapeles" -ForegroundColor Green
        Write-Host ""
        Write-Host "Pasos:" -ForegroundColor Yellow
        Write-Host "  1. Abre Supabase Studio: http://192.168.31.240:8000" -ForegroundColor White
        Write-Host "  2. Ve a SQL Editor" -ForegroundColor White
        Write-Host "  3. Pega el contenido (Ctrl+V)" -ForegroundColor White
        Write-Host "  4. Click en 'Run'" -ForegroundColor White
        Write-Host ""
        
        # Copiar al portapapeles
        Get-Content $scriptPath | Set-Clipboard
        
        Write-Host "✅ SQL en el portapapeles listo para pegar" -ForegroundColor Green
    }
    "3" {
        Write-Host "Saliendo..." -ForegroundColor Gray
        exit 0
    }
    default {
        Write-Host "❌ Opción inválida" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Presiona Enter para continuar..."
Read-Host
