# Script para aplicar migración de resolución obligatoria
# Ejecutar desde la raíz del proyecto: .\scripts\apply-resolution-migration.ps1

$ErrorActionPreference = "Stop"

Write-Host "🔧 Aplicando migración: Resolución obligatoria al cerrar tickets" -ForegroundColor Cyan
Write-Host ""

# Verificar que existe el archivo de migración
$migrationFile = "supabase\migration-add-resolution.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Error: No se encontró el archivo $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Archivo de migración encontrado: $migrationFile" -ForegroundColor Green
Write-Host ""

# Leer el contenido del archivo
$migrationSQL = Get-Content $migrationFile -Raw

Write-Host "📋 Contenido de la migración:" -ForegroundColor Yellow
Write-Host $migrationSQL
Write-Host ""

Write-Host "⚠️  INSTRUCCIONES PARA APLICAR LA MIGRACIÓN:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Abre el panel de Supabase: https://supabase.com/dashboard" -ForegroundColor White
Write-Host "2. Selecciona tu proyecto" -ForegroundColor White
Write-Host "3. Ve a 'SQL Editor' en el menú lateral" -ForegroundColor White
Write-Host "4. Crea una nueva query" -ForegroundColor White
Write-Host "5. Copia y pega el contenido del archivo migration-add-resolution.sql" -ForegroundColor White
Write-Host "6. Ejecuta la query (botón 'Run' o F5)" -ForegroundColor White
Write-Host ""
Write-Host "✅ Una vez aplicada la migración, podrás:" -ForegroundColor Green
Write-Host "   - Requerir una resolución obligatoria al cerrar tickets (mínimo 20 caracteres)" -ForegroundColor White
Write-Host "   - Ver la resolución en el detalle del ticket cerrado" -ForegroundColor White
Write-Host "   - Rastrear quién cerró el ticket y cuándo (closed_by, closed_at)" -ForegroundColor White
Write-Host ""
