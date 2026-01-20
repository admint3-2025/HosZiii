#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Aplica la migración de notificaciones de inspecciones críticas en Supabase

.DESCRIPTION
  Este script aplica la migración que agrega:
  - Nuevo tipo de notificación 'inspection_critical' al enum
  - Función RPC get_admin_emails() para obtener emails de administradores

.EXAMPLE
  .\apply-inspections-notifications-migration.ps1
#>

param(
  [string]$ProjectRef = "",
  [string]$DbPassword = ""
)

$ErrorActionPreference = "Stop"

# Colores
$ColorInfo = "Cyan"
$ColorSuccess = "Green"
$ColorWarning = "Yellow"
$ColorError = "Red"

Write-Host "================================================" -ForegroundColor $ColorInfo
Write-Host "   Migración: Notificaciones de Inspecciones" -ForegroundColor $ColorInfo
Write-Host "================================================" -ForegroundColor $ColorInfo
Write-Host ""

# Validar que existe el archivo de migración
$MigrationFile = Join-Path $PSScriptRoot ".." "supabase" "migration-inspections-notifications.sql"
if (-not (Test-Path $MigrationFile)) {
  Write-Host "❌ No se encontró el archivo de migración: $MigrationFile" -ForegroundColor $ColorError
  exit 1
}

Write-Host "✓ Archivo de migración encontrado" -ForegroundColor $ColorSuccess
Write-Host ""

# Solicitar credenciales si no fueron provistas
if ([string]::IsNullOrWhiteSpace($ProjectRef)) {
  $ProjectRef = Read-Host "Ingresa el Project Reference de Supabase"
}

if ([string]::IsNullOrWhiteSpace($DbPassword)) {
  $DbPassword = Read-Host "Ingresa la contraseña de la base de datos" -AsSecureString
  $DbPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($DbPassword)
  )
}

Write-Host ""
Write-Host "📋 Configuración:" -ForegroundColor $ColorInfo
Write-Host "   Project: $ProjectRef" -ForegroundColor $ColorInfo
Write-Host "   Archivo: migration-inspections-notifications.sql" -ForegroundColor $ColorInfo
Write-Host ""

# Construir connection string
$DbHost = "aws-0-us-west-1.pooler.supabase.com"
$DbPort = "6543"
$DbName = "postgres"
$DbUser = "postgres.$ProjectRef"

$ConnectionString = "postgresql://${DbUser}:${DbPassword}@${DbHost}:${DbPort}/${DbName}?sslmode=require"

Write-Host "🔄 Aplicando migración..." -ForegroundColor $ColorInfo
Write-Host ""

# Ejecutar migración usando psql si está disponible, de lo contrario usar alternativa
try {
  $psqlExists = Get-Command psql -ErrorAction SilentlyContinue
  
  if ($psqlExists) {
    # Usar psql
    $env:PGPASSWORD = $DbPassword
    Get-Content $MigrationFile | psql $ConnectionString
    Remove-Item Env:\PGPASSWORD
  } else {
    Write-Host "⚠️  psql no está instalado. Mostrando SQL para ejecutar manualmente..." -ForegroundColor $ColorWarning
    Write-Host ""
    Write-Host "==== COPIA Y PEGA EL SIGUIENTE SQL EN SUPABASE SQL EDITOR ====" -ForegroundColor $ColorWarning
    Write-Host ""
    Get-Content $MigrationFile
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor $ColorWarning
    Write-Host ""
    Write-Host "URL del SQL Editor:" -ForegroundColor $ColorInfo
    Write-Host "https://supabase.com/dashboard/project/$ProjectRef/sql/new" -ForegroundColor $ColorInfo
  }
  
  Write-Host ""
  Write-Host "================================================" -ForegroundColor $ColorSuccess
  Write-Host "✅ Migración aplicada exitosamente" -ForegroundColor $ColorSuccess
  Write-Host "================================================" -ForegroundColor $ColorSuccess
  Write-Host ""
  Write-Host "Cambios aplicados:" -ForegroundColor $ColorInfo
  Write-Host "  ✓ Tipo de notificación 'inspection_critical' agregado" -ForegroundColor $ColorSuccess
  Write-Host "  ✓ Función RPC get_admin_emails() creada" -ForegroundColor $ColorSuccess
  Write-Host ""
  Write-Host "Ahora puedes:" -ForegroundColor $ColorInfo
  Write-Host "  1. Completar una inspección con ítems críticos (< 8/10)" -ForegroundColor $ColorInfo
  Write-Host "  2. Los administradores recibirán:" -ForegroundColor $ColorInfo
  Write-Host "     - Correo electrónico con detalles" -ForegroundColor $ColorInfo
  Write-Host "     - Notificación push en la app" -ForegroundColor $ColorInfo
  Write-Host ""
  
} catch {
  Write-Host ""
  Write-Host "================================================" -ForegroundColor $ColorError
  Write-Host "❌ Error al aplicar migración" -ForegroundColor $ColorError
  Write-Host "================================================" -ForegroundColor $ColorError
  Write-Host ""
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor $ColorError
  Write-Host ""
  Write-Host "Solución alternativa:" -ForegroundColor $ColorWarning
  Write-Host "1. Ve a: https://supabase.com/dashboard/project/$ProjectRef/sql/new" -ForegroundColor $ColorWarning
  Write-Host "2. Copia el contenido de: supabase/migration-inspections-notifications.sql" -ForegroundColor $ColorWarning
  Write-Host "3. Pégalo en el editor SQL y ejecuta" -ForegroundColor $ColorWarning
  Write-Host ""
  exit 1
}
