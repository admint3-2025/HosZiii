#!/usr/bin/env pwsh
# Script para actualizar la vista BEO con attachments en Supabase
# Ejecutar: .\scripts\apply-beo-attachment-view.ps1

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Actualizar Vista BEO con Attachment" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que existe el archivo SQL
$sqlFile = "supabase/fix-beo-view-with-attachment.sql"
if (-not (Test-Path $sqlFile)) {
    Write-Host "Error: No se encontró $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "Archivo SQL encontrado: $sqlFile" -ForegroundColor Green
Write-Host ""

# Leer credenciales de Supabase
Write-Host "Ingrese los datos de conexión a Supabase:" -ForegroundColor Yellow
$projectRef = Read-Host "Project Reference (ej: abcdefghijk)"
$dbPassword = Read-Host "Database Password" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
)

Write-Host ""
Write-Host "Conectando a Supabase..." -ForegroundColor Yellow

# Construir connection string
$connectionString = "postgresql://postgres:$dbPasswordPlain@db.$projectRef.supabase.co:5432/postgres"

# Ejecutar SQL
Write-Host "Ejecutando migración..." -ForegroundColor Yellow
$env:PGPASSWORD = $dbPasswordPlain
psql $connectionString -f $sqlFile

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Migración ejecutada exitosamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "La vista beo_tickets_view ahora incluye el campo beo_attachment" -ForegroundColor Green
    Write-Host "que contiene la info del primer PDF adjunto del BEO." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "✗ Error al ejecutar la migración" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Nota: Si no tienes psql instalado, puedes copiar el contenido" -ForegroundColor Cyan
Write-Host "del archivo $sqlFile y ejecutarlo directamente" -ForegroundColor Cyan
Write-Host "en el SQL Editor de Supabase Dashboard." -ForegroundColor Cyan
