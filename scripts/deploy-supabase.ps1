# Deploy ZIII Helpdesk a Supabase
# Ejecutar: .\scripts\deploy-supabase.ps1

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  ZIII Helpdesk - Deploy a Supabase  " -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que existan las variables de entorno
if (-not $env:NEXT_PUBLIC_SUPABASE_URL) {
    Write-Host "ERROR: No se encontró NEXT_PUBLIC_SUPABASE_URL en .env.local" -ForegroundColor Red
    Write-Host "Asegúrate de tener el archivo .env.local configurado correctamente" -ForegroundColor Yellow
    exit 1
}

$SUPABASE_URL = $env:NEXT_PUBLIC_SUPABASE_URL
$SUPABASE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

Write-Host "✓ Variables de entorno cargadas" -ForegroundColor Green
Write-Host "  URL: $SUPABASE_URL" -ForegroundColor Gray
Write-Host ""

# Extraer el ID del proyecto de la URL
if ($SUPABASE_URL -match 'https://([^.]+)\.supabase\.co') {
    $PROJECT_ID = $Matches[1]
    Write-Host "✓ Proyecto detectado: $PROJECT_ID" -ForegroundColor Green
} else {
    Write-Host "ERROR: No se pudo extraer el ID del proyecto de la URL" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Yellow
Write-Host "  INSTRUCCIONES DE DEPLOY MANUAL     " -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Abre tu proyecto en Supabase Dashboard:" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard/project/$PROJECT_ID" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Ve a 'SQL Editor' en el menú lateral izquierdo" -ForegroundColor White
Write-Host ""
Write-Host "3. Crea una nueva query y copia/pega el contenido de:" -ForegroundColor White
Write-Host "   supabase\deploy-consolidated.sql" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Ejecuta el script (botón 'Run' o Ctrl+Enter)" -ForegroundColor White
Write-Host ""
Write-Host "5. Configura Storage manualmente:" -ForegroundColor White
Write-Host "   a) Ve a 'Storage' en el menú lateral" -ForegroundColor Gray
Write-Host "   b) Crea un bucket llamado: ticket-attachments" -ForegroundColor Gray
Write-Host "   c) Configuración:" -ForegroundColor Gray
Write-Host "      - Public: NO (privado)" -ForegroundColor Gray
Write-Host "      - File size limit: 10485760 (10MB)" -ForegroundColor Gray
Write-Host "   d) Copia/pega y ejecuta: supabase\storage-setup.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "6. Verifica la creación del usuario admin:" -ForegroundColor White
Write-Host "   Email: admin@integracional3.com.mx" -ForegroundColor Cyan
Write-Host "   Password: Admin2025!" -ForegroundColor Cyan
Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "  ARCHIVOS PREPARADOS PARA DEPLOY    " -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "✓ supabase\deploy-consolidated.sql" -ForegroundColor Green
Write-Host "  (Schema + Migraciones + Políticas + Seed)" -ForegroundColor Gray
Write-Host ""
Write-Host "✓ supabase\storage-setup.sql" -ForegroundColor Green
Write-Host "  (Configuración de Storage)" -ForegroundColor Gray
Write-Host ""

# Preguntar si desea abrir el dashboard
Write-Host ""
$response = Read-Host "¿Deseas abrir el Supabase Dashboard ahora? (s/n)"
if ($response -eq 's' -or $response -eq 'S' -or $response -eq 'si' -or $response -eq 'Si') {
    Start-Process "https://supabase.com/dashboard/project/$PROJECT_ID/editor"
    Write-Host "✓ Abriendo dashboard..." -ForegroundColor Green
}

Write-Host ""
Write-Host "Presiona cualquier tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
