#!/bin/sh
# Script de instalación del servicio Helpdesk en Alpine Linux
# Ejecutar como root

set -e

echo "=== Instalando servicio Helpdesk en Alpine Linux ==="

# Directorio de la app (permite instalar desde cualquier ruta)
APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")" && pwd)}"

# 1. Crear usuario de servicio (si no existe)
if ! id -u node >/dev/null 2>&1; then
    echo "Creando usuario 'node'..."
    adduser -D -h "$APP_DIR" -s /sbin/nologin node
fi

# 2. Crear directorio de logs
echo "Creando directorio de logs..."
mkdir -p /var/log/helpdesk
chown node:node /var/log/helpdesk

# 3. Asignar permisos a la aplicación
echo "Configurando permisos de $APP_DIR..."
chown -R node:node "$APP_DIR"

# 4. Configurar /etc/conf.d/helpdesk para evitar rutas hardcodeadas
echo "Configurando /etc/conf.d/helpdesk..."
cat > /etc/conf.d/helpdesk <<EOF
# Ruta donde vive la app Next.js (cámbiala aquí si se mueve el directorio)
directory="$APP_DIR"

# Puerto del servicio
command_args="node_modules/next/dist/bin/next start -p 32123"

# Usuario del servicio
command_user="node"
EOF

# 5. Copiar script de servicio
echo "Instalando servicio OpenRC..."
cp "$APP_DIR/helpdesk-openrc" /etc/init.d/helpdesk
chmod +x /etc/init.d/helpdesk

# 6. Habilitar servicio en el arranque
echo "Habilitando servicio en el arranque..."
rc-update add helpdesk default

# 7. Iniciar servicio
echo "Iniciando servicio..."
rc-service helpdesk start

echo ""
echo "=== Instalación completada ==="
echo "El servicio está corriendo en http://localhost:32123"
echo ""
echo "Comandos útiles:"
echo "  rc-service helpdesk start    # Iniciar"
echo "  rc-service helpdesk stop     # Detener"
echo "  rc-service helpdesk restart  # Reiniciar"
echo "  rc-service helpdesk status   # Ver estado"
echo "  tail -f /var/log/helpdesk/output.log  # Ver logs"
