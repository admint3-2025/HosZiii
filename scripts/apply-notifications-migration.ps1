# Script para aplicar la migracion de notificaciones
# Ejecutar: .\scripts\apply-notifications-migration.ps1

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Migracion: Sistema de Notificaciones  " -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que existan las variables de entorno
$envFile = ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: No se encontro .env.local" -ForegroundColor Red
    exit 1
}

# Cargar variables de entorno
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $name = $matches[1]
        $value = $matches[2]
        [System.Environment]::SetEnvironmentVariable($name, $value, [System.EnvironmentVariableTarget]::Process)
    }
}

$SUPABASE_URL = $env:NEXT_PUBLIC_SUPABASE_URL

Write-Host "OK Variables de entorno cargadas" -ForegroundColor Green
Write-Host ""

# Extraer el ID del proyecto de la URL
if ($SUPABASE_URL -match 'https://([^.]+)\.supabase\.co') {
    $PROJECT_ID = $Matches[1]
    Write-Host "OK Proyecto detectado: $PROJECT_ID" -ForegroundColor Green
}
else {
    Write-Host "ERROR: No se pudo extraer el ID del proyecto de la URL" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Yellow
Write-Host "  INSTRUCCIONES                     " -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Abre tu proyecto en Supabase Dashboard:" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard/project/$PROJECT_ID/editor" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Ve a 'SQL Editor' en el menu lateral izquierdo" -ForegroundColor White
Write-Host ""
Write-Host "3. Crea una nueva query y copia/pega el contenido de:" -ForegroundColor White
Write-Host "   supabase\migration-add-notifications.sql" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Ejecuta el script (boton 'Run' o Ctrl+Enter)" -ForegroundColor White
Write-Host ""
Write-Host "5. (Opcional) Si separas personal IT vs MAINTENANCE (profiles.asset_category)," -ForegroundColor White
Write-Host "   ejecuta despues el contenido de:" -ForegroundColor White
Write-Host "   supabase\migration-filter-notifications-by-asset-category.sql" -ForegroundColor Cyan
Write-Host ""
Write-Host "6. Verifica que no haya errores en la consola" -ForegroundColor White
Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "  CARACTERISTICAS                   " -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "OK Tabla 'notifications' creada" -ForegroundColor Gray
Write-Host "OK Triggers automaticos configurados:" -ForegroundColor Gray
Write-Host "  - Nuevo ticket creado" -ForegroundColor Gray
Write-Host "  - Ticket asignado" -ForegroundColor Gray
Write-Host "  - Estado cambiado" -ForegroundColor Gray
Write-Host "  - Nuevo comentario" -ForegroundColor Gray
Write-Host "OK Supabase Realtime habilitado" -ForegroundColor Gray
Write-Host "OK Politicas de seguridad (RLS) aplicadas" -ForegroundColor Gray
Write-Host ""
Write-Host "=====================================" -ForegroundColor Magenta
Write-Host "  SIGUIENTE PASO                    " -ForegroundColor Magenta
Write-Host "=====================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "Despues de ejecutar la migracion, reinicia el servidor de desarrollo:" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "El icono de campana aparecera en el header con notificaciones en tiempo real." -ForegroundColor Yellow
Write-Host ""
