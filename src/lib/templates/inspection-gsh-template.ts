import type { InspectionGSH } from '@/lib/services/inspections-gsh.service'

/**
 * Template de inspección GSH (Guest Service Handler)
 * Basado en las 6 secciones principales del checklist GSH
 */
export function getGSHInspectionTemplate(): Omit<InspectionGSH, 'id' | 'location_id' | 'inspector_user_id' | 'inspector_name' | 'inspection_date' | 'property_code' | 'property_name'> {
  return {
    department: 'GSH',
    status: 'draft',
    general_comments: '',
    areas: [
      {
        area_name: 'Auditoría y Procedimientos Financieros',
        area_order: 1,
        items: [
          {
            item_order: 1,
            descripcion: 'Arqueo de cajas y vales',
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
            descripcion: 'Procedimiento de cobro a tarjetas',
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
            descripcion: 'Procedimiento de manejo de efectivo, uso de misceláneos y aplicación en sistema',
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
            descripcion: 'Revisión de ajustes',
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
            descripcion: 'Revisión de registros vs información ingresada en el sistema (Arqueo de PIT)',
            tipo_dato: 'Fijo',
            cumplimiento_valor: '',
            cumplimiento_editable: true,
            calif_valor: 0,
            calif_editable: true,
            comentarios_valor: '',
            comentarios_libre: true
          },
          {
            item_order: 6,
            descripcion: 'Revisión de transferencias de cargos (Userlog Transfers)',
            tipo_dato: 'Fijo',
            cumplimiento_valor: '',
            cumplimiento_editable: true,
            calif_valor: 0,
            calif_editable: true,
            comentarios_valor: '',
            comentarios_libre: true
          },
          {
            item_order: 7,
            descripcion: 'Verificación de saldos de AR´s',
            tipo_dato: 'Fijo',
            cumplimiento_valor: '',
            cumplimiento_editable: true,
            calif_valor: 0,
            calif_editable: true,
            comentarios_valor: '',
            comentarios_libre: true
          },
          {
            item_order: 8,
            descripcion: 'Revisión y seguimiento de saldos de PM´s',
            tipo_dato: 'Fijo',
            cumplimiento_valor: '',
            cumplimiento_editable: true,
            calif_valor: 0,
            calif_editable: true,
            comentarios_valor: '',
            comentarios_libre: true
          },
          {
            item_order: 9,
            descripcion: 'Seguimiento de facturación',
            tipo_dato: 'Fijo',
            cumplimiento_valor: '',
            cumplimiento_editable: true,
            calif_valor: 0,
            calif_editable: true,
            comentarios_valor: '',
            comentarios_libre: true
          },
          {
            item_order: 10,
            descripcion: 'Manejo de discrepancias',
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
        area_name: 'Procedimientos Operacionales de Front Desk',
        area_order: 2,
        items: [
          {
            item_order: 1,
            descripcion: 'Procedimiento de no show y cargos',
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
            descripcion: 'Procedimiento y fraseología del check in',
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
            descripcion: 'Procedimiento y fraseología del check out',
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
            descripcion: 'Revisión de reservas canceladas y No Shows',
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
            descripcion: 'Revisión de saldos de huéspedes en casa',
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
        area_name: 'Estándares de Servicio y Marca (Wyndham)',
        area_order: 3,
        items: [
          {
            item_order: 1,
            descripcion: 'Conocimiento del Programa Wyndham Rewards',
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
            descripcion: 'Cumplimiento de objetivos de enrollment',
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
            descripcion: 'Fraseología y etiqueta telefónica',
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
            descripcion: 'Revisión de calificaciones en Medallia',
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
            descripcion: 'Preparación para QA de Wyndham',
            tipo_dato: 'Fijo',
            cumplimiento_valor: '',
            cumplimiento_editable: true,
            calif_valor: 0,
            calif_editable: true,
            comentarios_valor: '',
            comentarios_libre: true
          },
          {
            item_order: 6,
            descripcion: 'Manejo de Wyndham Green',
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
        area_name: 'Control de Personal y Documentación',
        area_order: 4,
        items: [
          {
            item_order: 1,
            descripcion: 'Cumplimiento de reportes a corporativo (Mensuales y semanales)',
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
            descripcion: 'Revisión de atributos de claves ejecutivos atención al huésped, GSH y Auditor Nocturno',
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
            descripcion: 'Revisión de bitácora de pendientes',
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
            descripcion: 'Revisión de Check list de GSH, auditor nocturno y ejecutivos de atención al huésped',
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
            descripcion: 'Revisión de estándares de presentación del staff',
            tipo_dato: 'Fijo',
            cumplimiento_valor: '',
            cumplimiento_editable: true,
            calif_valor: 0,
            calif_editable: true,
            comentarios_valor: '',
            comentarios_libre: true
          },
          {
            item_order: 6,
            descripcion: 'Revisión de papelería',
            tipo_dato: 'Fijo',
            cumplimiento_valor: '',
            cumplimiento_editable: true,
            calif_valor: 0,
            calif_editable: true,
            comentarios_valor: '',
            comentarios_libre: true
          },
          {
            item_order: 7,
            descripcion: 'Revisión física de movimientos de ejecutivos de atención al huésped',
            tipo_dato: 'Fijo',
            cumplimiento_valor: '',
            cumplimiento_editable: true,
            calif_valor: 0,
            calif_editable: true,
            comentarios_valor: '',
            comentarios_libre: true
          },
          {
            item_order: 8,
            descripcion: 'Revisión y seguimiento de Bitácora de quejas y solicitudes, llaves maestras, olvidados',
            tipo_dato: 'Fijo',
            cumplimiento_valor: '',
            cumplimiento_editable: true,
            calif_valor: 0,
            calif_editable: true,
            comentarios_valor: '',
            comentarios_libre: true
          },
          {
            item_order: 9,
            descripcion: 'Cursos del staff',
            tipo_dato: 'Fijo',
            cumplimiento_valor: '',
            cumplimiento_editable: true,
            calif_valor: 0,
            calif_editable: true,
            comentarios_valor: '',
            comentarios_libre: true
          },
          {
            item_order: 10,
            descripcion: 'Depuración de usuarios',
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
        area_name: 'Auditoría Nocturna',
        area_order: 5,
        items: [
          {
            item_order: 1,
            descripcion: 'Revisión de cambios de tarifa (rate change report)',
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
            descripcion: 'Proceso de auditoría nocturna',
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
            descripcion: 'Reportes de auditoría nocturna',
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
        area_name: 'Mantenimiento y Equipamiento',
        area_order: 6,
        items: [
          {
            item_order: 1,
            descripcion: 'Control e inventario de llaves maestras',
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
            descripcion: 'Orden y limpieza de Check Room',
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
            descripcion: 'Orden y limpieza del Front',
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
            descripcion: 'Revisión de equipos, funcionamiento y desempeño',
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
            descripcion: 'Uso de radio y chicharo',
            tipo_dato: 'Fijo',
            cumplimiento_valor: '',
            cumplimiento_editable: true,
            calif_valor: 0,
            calif_editable: true,
            comentarios_valor: '',
            comentarios_libre: true
          },
          {
            item_order: 6,
            descripcion: 'Seguimiento de guardado de reportes de emergencia',
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
}
