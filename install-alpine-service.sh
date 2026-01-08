#!/bin/sh
# Script de instalación del servicio Helpdesk en Alpine Linux
# Ejecutar como root

set -e

echo "=== Instalando servicio Helpdesk en Alpine Linux ==="

# 1. Crear usuario de servicio (si no existe)
if ! id -u node >/dev/null 2>&1; then
    echo "Creando usuario 'node'..."
    adduser -D -h /opt/helpdesk -s /sbin/nologin node
fi

# 2. Crear directorio de logs
echo "Creando directorio de logs..."
mkdir -p /var/log/helpdesk
chown node:node /var/log/helpdesk

# 3. Asignar permisos a la aplicación
echo "Configurando permisos de /opt/helpdesk..."
chown -R node:node /opt/helpdesk

# 4. Copiar script de servicio
echo "Instalando servicio OpenRC..."
cp /opt/helpdesk/helpdesk-openrc /etc/init.d/helpdesk
chmod +x /etc/init.d/helpdesk

# 5. Habilitar servicio en el arranque
echo "Habilitando servicio en el arranque..."
rc-update add helpdesk default

# 6. Iniciar servicio
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
