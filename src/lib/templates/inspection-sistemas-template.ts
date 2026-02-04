import type { InspectionRRHHArea } from '@/lib/services/inspections-rrhh.service'

/**
 * Template de inspección Sistemas (IT)
 * 
 * Áreas supervisadas:
 * - Infraestructura de red
 * - Equipos de cómputo
 * - Sistemas PMS/POS
 * - Telefonía
 * - Seguridad informática
 * - Soporte técnico
 * - Respaldos y documentación
 */
export function getSistemasInspectionTemplateAreas(): InspectionRRHHArea[] {
  return [
    {
      area_name: 'Infraestructura de Red - Cableado',
      area_order: 0,
      items: [
        {
          item_order: 0,
          descripcion: 'Racks organizados y etiquetados',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 1,
          descripcion: 'Cableado estructurado sin deterioro',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 2,
          descripcion: 'Patch panels organizados y documentados',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 3,
          descripcion: 'Switches funcionando sin alarmas',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 4,
          descripcion: 'Sistema de tierra física verificado',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        }
      ]
    },
    {
      area_name: 'Conectividad y WiFi',
      area_order: 1,
      items: [
        {
          item_order: 0,
          descripcion: 'Internet principal activo y estable',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 1,
          descripcion: 'Enlace de respaldo funcionando (si aplica)',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 2,
          descripcion: 'WiFi de huéspedes con cobertura adecuada',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 3,
          descripcion: 'WiFi corporativo funcionando',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 4,
          descripcion: 'Access points operando correctamente',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 5,
          descripcion: 'Velocidad de conexión según estándar',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        }
      ]
    },
    {
      area_name: 'Equipos de Cómputo - Recepción',
      area_order: 2,
      items: [
        {
          item_order: 0,
          descripcion: 'PCs operando sin lentitud',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 1,
          descripcion: 'Antivirus actualizado y activo',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 2,
          descripcion: 'Impresoras funcionando correctamente',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 3,
          descripcion: 'Lectores de tarjeta operando',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 4,
          descripcion: 'Scanner de documentos funcionando',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        }
      ]
    },
    {
      area_name: 'Sistemas Operativos (PMS/POS)',
      area_order: 3,
      items: [
        {
          item_order: 0,
          descripcion: 'PMS operando sin errores',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 1,
          descripcion: 'POS (restaurante/bar) funcionando',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 2,
          descripcion: 'Interfaz de pago (TPV) operativa',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 3,
          descripcion: 'Sistema de reservaciones activo',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 4,
          descripcion: 'Motor de reservaciones (Channel Manager) sincronizado',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 5,
          descripcion: 'Sistema de control de accesos funcionando',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        }
      ]
    },
    {
      area_name: 'Telefonía e Intercomunicación',
      area_order: 4,
      items: [
        {
          item_order: 0,
          descripcion: 'Central telefónica operando',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 1,
          descripcion: 'Teléfonos de habitaciones funcionando',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 2,
          descripcion: 'Intercomunicadores de áreas operativos',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 3,
          descripcion: 'Sistema de megafonía funcionando',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 4,
          descripcion: 'Radios de comunicación operativos',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        }
      ]
    },
    {
      area_name: 'Videovigilancia y Seguridad',
      area_order: 5,
      items: [
        {
          item_order: 0,
          descripcion: 'DVR/NVR grabando correctamente',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 1,
          descripcion: 'Cámaras de seguridad operando (100%)',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 2,
          descripcion: 'Imagen de cámaras con calidad adecuada',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 3,
          descripcion: 'Respaldo de grabaciones funcionando',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 4,
          descripcion: 'Monitor de vigilancia activo',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        }
      ]
    },
    {
      area_name: 'Seguridad Informática',
      area_order: 6,
      items: [
        {
          item_order: 0,
          descripcion: 'Firewall activo y actualizado',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 1,
          descripcion: 'Usuarios con contraseñas seguras',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 2,
          descripcion: 'Permisos de acceso correctamente asignados',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 3,
          descripcion: 'Política de respaldos aplicándose',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 4,
          descripcion: 'Logs de sistema revisados periódicamente',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        }
      ]
    },
    {
      area_name: 'Soporte Técnico y Tickets',
      area_order: 7,
      items: [
        {
          item_order: 0,
          descripcion: 'Tickets de soporte atendidos en SLA',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 1,
          descripcion: 'Bitácora de incidentes actualizada',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 2,
          descripcion: 'Inventario de equipos actualizado',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 3,
          descripcion: 'Documentación técnica disponible',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        },
        {
          item_order: 4,
          descripcion: 'Respaldos verificados (prueba de restauración)',
          tipo_dato: 'Fijo',
          cumplimiento_valor: '',
          cumplimiento_editable: true,
          calif_valor: 0,
          calif_editable: true,
          comentarios_valor: '',
          comentarios_libre: true
        }
      ]
    }
  ]
}
