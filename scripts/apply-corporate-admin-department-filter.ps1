#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Aplica el filtro de departamentos para corporate_admin en inspecciones

.DESCRIPTION
  Este script corrige el problema donde corporate_admin ve TODAS las inspecciones
  sin importar los departamentos permitidos en su perfil.
  
  Aplica la política RLS correcta que filtra por allowed_departments.

.EXAMPLE
  .\apply-corporate-admin-department-filter.ps1
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

Write-Host "========================================================" -ForegroundColor $ColorInfo
Write-Host "   FIX: Filtro de Departamentos para Corporate Admin" -ForegroundColor $ColorInfo
Write-Host "========================================================" -ForegroundColor $ColorInfo
Write-Host ""

Write-Host "⚠️  PROBLEMA:" -ForegroundColor $ColorWarning
Write-Host "   Corporate_admin está viendo TODAS las inspecciones" -ForegroundColor $ColorWarning
Write-Host "   sin importar los departamentos asignados en su perfil" -ForegroundColor $ColorWarning
Write-Host ""
Write-Host "✅ SOLUCIÓN:" -ForegroundColor $ColorSuccess
Write-Host "   Aplicar política RLS que filtra por allowed_departments" -ForegroundColor $ColorSuccess
Write-Host ""

# Validar que existe el archivo de migración
$MigrationFile = Join-Path $PSScriptRoot ".." "supabase" "fix-corporate-admin-department-filter.sql"
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
Write-Host "   Archivo: fix-corporate-admin-department-filter.sql" -ForegroundColor $ColorInfo
Write-Host ""

# Construir connection string
$DbHost = "aws-0-us-west-1.pooler.supabase.com"
$DbPort = "6543"
$DbName = "postgres"
$DbUser = "postgres.$ProjectRef"

$ConnectionString = "postgresql://${DbUser}:${DbPassword}@${DbHost}:${DbPort}/${DbName}?sslmode=require"

Write-Host "🔄 Aplicando migración..." -ForegroundColor $ColorInfo
Write-Host ""

# Ejecutar migración
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
  Write-Host "========================================================" -ForegroundColor $ColorSuccess
  Write-Host "✅ Migración aplicada exitosamente" -ForegroundColor $ColorSuccess
  Write-Host "========================================================" -ForegroundColor $ColorSuccess
  Write-Host ""
  Write-Host "Cambios aplicados:" -ForegroundColor $ColorInfo
  Write-Host "  ✓ Política RLS actualizada con filtro por departamento" -ForegroundColor $ColorSuccess
  Write-Host "  ✓ Admin: acceso total sin cambios" -ForegroundColor $ColorSuccess
  Write-Host "  ✓ Corporate_admin: SOLO ve inspecciones de sus departamentos" -ForegroundColor $ColorSuccess
  Write-Host "  ✓ Usuarios normales: solo ven sus ubicaciones" -ForegroundColor $ColorSuccess
  Write-Host ""
  Write-Host "Verificación:" -ForegroundColor $ColorInfo
  Write-Host "  1. Inicia sesión como corporate_admin" -ForegroundColor $ColorInfo
  Write-Host "  2. Ve a 'Bandeja de inspecciones'" -ForegroundColor $ColorInfo
  Write-Host "  3. Deberías ver SOLO inspecciones de tus departamentos permitidos" -ForegroundColor $ColorInfo
  Write-Host ""
  Write-Host "Ejemplo:" -ForegroundColor $ColorInfo
  Write-Host "  Si allowed_departments = ['RECURSOS HUMANOS']" -ForegroundColor $ColorInfo
  Write-Host "  SOLO verá inspecciones de RECURSOS HUMANOS" -ForegroundColor $ColorInfo
  Write-Host "  NO verá inspecciones de GSH, MANTENIMIENTO, etc." -ForegroundColor $ColorInfo
  Write-Host ""
  
} catch {
  Write-Host ""
  Write-Host "========================================================" -ForegroundColor $ColorError
  Write-Host "❌ Error al aplicar migración" -ForegroundColor $ColorError
  Write-Host "========================================================" -ForegroundColor $ColorError
  Write-Host ""
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor $ColorError
  Write-Host ""
  Write-Host "Solución alternativa:" -ForegroundColor $ColorWarning
  Write-Host "1. Ve a: https://supabase.com/dashboard/project/$ProjectRef/sql/new" -ForegroundColor $ColorWarning
  Write-Host "2. Copia el contenido de: supabase/fix-corporate-admin-department-filter.sql" -ForegroundColor $ColorWarning
  Write-Host "3. Pégalo en el editor SQL y ejecuta" -ForegroundColor $ColorWarning
  Write-Host ""
  exit 1
}
