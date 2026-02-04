import type { InspectionRRHHArea } from '@/lib/services/inspections-rrhh.service'

/**
 * Template de inspección Mantenimiento
 * 
 * Áreas supervisadas:
 * - Instalaciones eléctricas
 * - Plomería y agua
 * - Clima y ventilación
 * - Mobiliario y acabados
 * - Áreas exteriores
 * - Seguridad y prevención
 * - Herramientas y documentación
 */
export function getMantenimientoInspectionTemplateAreas(): InspectionRRHHArea[] {
  return [
    {
      area_name: 'Instalaciones Eléctricas - Habitaciones',
      area_order: 0,
      items: [
        {
          item_order: 0,
          descripcion: 'Interruptores funcionando correctamente',
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
          descripcion: 'Tomas de corriente fijadas y sin daños',
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
          descripcion: 'Lámparas funcionando (sin parpadeos)',
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
          descripcion: 'Televisión funcionando correctamente',
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
          descripcion: 'Tarjeta de energía funcionando',
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
          descripcion: 'Timbre de habitación funcionando',
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
      area_name: 'Instalaciones Eléctricas - Áreas Públicas',
      area_order: 1,
      items: [
        {
          item_order: 0,
          descripcion: 'Iluminación de pasillos al 100%',
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
          descripcion: 'Iluminación de lobby funcionando',
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
          descripcion: 'Señalética de salida iluminada',
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
          descripcion: 'Iluminación exterior funcionando',
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
      area_name: 'Plomería - Habitaciones',
      area_order: 2,
      items: [
        {
          item_order: 0,
          descripcion: 'Grifos sin fugas (lavabo, regadera, tina)',
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
          descripcion: 'Presión de agua adecuada',
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
          descripcion: 'Agua caliente funcionando correctamente',
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
          descripcion: 'Drenajes sin obstrucciones',
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
          descripcion: 'WC descargando correctamente',
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
          descripcion: 'Sin malos olores en baño',
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
      area_name: 'Clima y Ventilación',
      area_order: 3,
      items: [
        {
          item_order: 0,
          descripcion: 'Aire acondicionado enfriando correctamente',
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
          descripcion: 'Control de temperatura funcionando',
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
          descripcion: 'Sin ruidos anormales en unidad de A/C',
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
          descripcion: 'Rejillas de ventilación limpias',
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
          descripcion: 'Filtros de A/C en buen estado (según programa)',
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
          descripcion: 'Extractores de aire funcionando (baños)',
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
      area_name: 'Puertas y Cerraduras',
      area_order: 4,
      items: [
        {
          item_order: 0,
          descripcion: 'Cerradura electrónica funcionando',
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
          descripcion: 'Mirilla sin obstrucciones',
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
          descripcion: 'Cadena de seguridad funcionando',
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
          descripcion: 'Puerta cerrando correctamente (sin roce)',
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
          descripcion: 'Bisagras lubricadas (sin chirridos)',
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
      area_name: 'Mobiliario y Acabados',
      area_order: 5,
      items: [
        {
          item_order: 0,
          descripcion: 'Muebles sin daños visibles',
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
          descripcion: 'Cajones abriendo y cerrando correctamente',
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
          descripcion: 'Espejos fijados correctamente',
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
          descripcion: 'Pintura sin descarapelamientos',
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
          descripcion: 'Zócalos fijados correctamente',
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
          descripcion: 'Percheros y ganchos seguros',
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
      area_name: 'Seguridad y Prevención',
      area_order: 6,
      items: [
        {
          item_order: 0,
          descripcion: 'Detector de humo funcionando',
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
          descripcion: 'Rociadores contra incendio sin obstrucciones',
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
          descripcion: 'Extintores con presión correcta y accesibles',
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
          descripcion: 'Salidas de emergencia señalizadas',
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
          descripcion: 'Hidrantes revisados (según programa)',
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
      area_name: 'Áreas Exteriores y Jardines',
      area_order: 7,
      items: [
        {
          item_order: 0,
          descripcion: 'Jardines podados y con riego funcionando',
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
          descripcion: 'Banquetas sin grietas peligrosas',
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
          descripcion: 'Estacionamiento con señalización visible',
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
          descripcion: 'Mobiliario exterior en buen estado',
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
          descripcion: 'Drenaje pluvial sin obstrucciones',
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
      area_name: 'Documentación y Control',
      area_order: 8,
      items: [
        {
          item_order: 0,
          descripcion: 'Bitácora de mantenimiento actualizada',
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
          descripcion: 'Órdenes de trabajo cerradas en tiempo',
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
          descripcion: 'Inventario de herramientas actualizado',
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
          descripcion: 'Programa de mantenimiento preventivo vigente',
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
