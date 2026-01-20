# Script para habilitar Realtime en notificaciones
# Ejecuta el archivo SQL en Supabase para arreglar las notificaciones push

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  FIX: Habilitar Realtime para Notificaciones Push" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

$sqlFile = Join-Path $PSScriptRoot "..\supabase\fix-notifications-realtime.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ Error: No se encontró el archivo SQL" -ForegroundColor Red
    Write-Host "   Ruta esperada: $sqlFile" -ForegroundColor Yellow
    exit 1
}

Write-Host "📄 Archivo SQL encontrado" -ForegroundColor Green
Write-Host "   $sqlFile" -ForegroundColor Gray
Write-Host ""

Write-Host "📋 INSTRUCCIONES:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Abre Supabase Dashboard" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard/project/YOUR_PROJECT" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Ve a SQL Editor (icono de base de datos)" -ForegroundColor White
Write-Host ""
Write-Host "3. Crea una nueva query" -ForegroundColor White
Write-Host ""
Write-Host "4. Copia y pega el contenido de:" -ForegroundColor White
Write-Host "   $sqlFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Ejecuta la query (RUN o F5)" -ForegroundColor White
Write-Host ""
Write-Host "6. Verifica que veas:" -ForegroundColor White
Write-Host "   ✅ Success. No rows returned" -ForegroundColor Green
Write-Host ""

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  ¿QUÉ HACE ESTE SCRIPT?" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Habilita Realtime en la tabla notifications" -ForegroundColor Green
Write-Host "   (ALTER PUBLICATION supabase_realtime ADD TABLE)" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Recrea las políticas RLS correctamente" -ForegroundColor Green
Write-Host "   - Users can view own notifications" -ForegroundColor Gray
Write-Host "   - Users can update own notifications" -ForegroundColor Gray
Write-Host "   - System can insert notifications" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Verifica que RLS esté habilitado" -ForegroundColor Green
Write-Host ""

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  DESPUÉS DE EJECUTAR" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Abre el dashboard como ADMIN" -ForegroundColor White
Write-Host ""
Write-Host "2. Completa una inspección con ítems < 8/10" -ForegroundColor White
Write-Host ""
Write-Host "3. Deberías ver:" -ForegroundColor White
Write-Host "   📬 Notificación push en tiempo real (🔔)" -ForegroundColor Cyan
Write-Host "   📧 Email en tu bandeja" -ForegroundColor Cyan
Write-Host ""

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Preguntar si quiere abrir el archivo
Write-Host "¿Deseas abrir el archivo SQL ahora? (S/N): " -NoNewline -ForegroundColor Yellow
$response = Read-Host

if ($response -eq "S" -or $response -eq "s") {
    Write-Host ""
    Write-Host "📂 Abriendo archivo..." -ForegroundColor Green
    Start-Process $sqlFile
}

Write-Host ""
Write-Host "✅ Listo. Ejecuta el SQL en Supabase y las notificaciones push funcionarán." -ForegroundColor Green
Write-Host ""
