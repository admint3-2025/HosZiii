import type { InspectionRRHHArea } from '@/lib/services/inspections-rrhh.service'

/**
 * Template de inspección Contabilidad
 * 
 * Áreas supervisadas:
 * - Control de efectivo y caja
 * - Cuentas por cobrar
 * - Cuentas por pagar
 * - Conciliaciones bancarias
 * - Auditoría y documentación
 * - Nómina
 * - Reportes financieros
 */
export function getContabilidadInspectionTemplateAreas(): InspectionRRHHArea[] {
  return [
    {
      area_name: 'Control de Efectivo - Caja General',
      area_order: 0,
      items: [
        {
          item_order: 0,
          descripcion: 'Arqueo de caja diario realizado',
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
          descripcion: 'Diferencias de caja justificadas y documentadas',
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
          descripcion: 'Fondo fijo conforme a política',
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
          descripcion: 'Depósitos bancarios realizados diariamente',
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
          descripcion: 'Fichas de depósito coinciden con reporte de ingresos',
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
          descripcion: 'Caja fuerte cerrada y con acceso restringido',
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
      area_name: 'POS y Terminales de Pago',
      area_order: 1,
      items: [
        {
          item_order: 0,
          descripcion: 'Corte diario de terminales realizado',
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
          descripcion: 'Vouchers de tarjeta organizados por fecha',
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
          descripcion: 'Conciliación POS vs depósitos bancarios',
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
          descripcion: 'Contracargos identificados y documentados',
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
          descripcion: 'Comisiones bancarias revisadas y verificadas',
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
      area_name: 'Cuentas por Cobrar',
      area_order: 2,
      items: [
        {
          item_order: 0,
          descripcion: 'Folios de City Ledger actualizados',
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
          descripcion: 'Facturas emitidas dentro de plazo fiscal',
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
          descripcion: 'Seguimiento de cuentas vencidas',
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
          descripcion: 'Antigüedad de saldos actualizada',
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
          descripcion: 'Créditos corporativos con contratos vigentes',
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
          descripcion: 'Cobranza realizada según política',
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
      area_name: 'Cuentas por Pagar',
      area_order: 3,
      items: [
        {
          item_order: 0,
          descripcion: 'Facturas de proveedores registradas correctamente',
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
          descripcion: 'Facturas XML validadas en SAT',
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
          descripcion: 'Autorización de pagos conforme a política',
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
          descripcion: 'Pagos realizados en tiempo (evitar recargos)',
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
          descripcion: 'Comprobantes de pago archivados correctamente',
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
          descripcion: 'Conciliación de saldos con proveedores',
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
      area_name: 'Conciliaciones Bancarias',
      area_order: 4,
      items: [
        {
          item_order: 0,
          descripcion: 'Conciliación bancaria mensual completada',
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
          descripcion: 'Partidas en tránsito identificadas',
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
          descripcion: 'Cheques pendientes de cobro identificados',
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
          descripcion: 'Movimientos no reconocidos investigados',
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
          descripcion: 'Estados de cuenta archivados',
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
      area_name: 'Nómina',
      area_order: 5,
      items: [
        {
          item_order: 0,
          descripcion: 'Nómina procesada antes de fecha límite',
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
          descripcion: 'Incidencias (faltas, permisos) capturadas',
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
          descripcion: 'Dispersión bancaria realizada correctamente',
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
          descripcion: 'Timbrado de nómina dentro de plazo fiscal',
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
          descripcion: 'CFDI de nómina entregados a empleados',
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
          descripcion: 'Provisiones de nómina correctamente calculadas',
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
      area_name: 'Impuestos y Obligaciones Fiscales',
      area_order: 6,
      items: [
        {
          item_order: 0,
          descripcion: 'Declaraciones mensuales presentadas a tiempo',
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
          descripcion: 'IVA calculado correctamente',
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
          descripcion: 'ISR retenido conforme a ley',
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
          descripcion: 'DIOT presentada mensualmente',
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
          descripcion: 'ISN/ISAN (si aplica) calculado y pagado',
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
          descripcion: 'Sin multas ni recargos fiscales',
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
      area_name: 'Auditoría y Control Interno',
      area_order: 7,
      items: [
        {
          item_order: 0,
          descripcion: 'Pólizas contables completas y autorizadas',
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
          descripcion: 'Documentación soporte adjunta a pólizas',
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
          descripcion: 'Segregación de funciones aplicada',
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
          descripcion: 'Respaldos de información contable realizados',
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
          descripcion: 'Auditorías internas programadas y ejecutadas',
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
          descripcion: 'Hallazgos de auditoría con plan de acción',
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
      area_name: 'Reportes Financieros',
      area_order: 8,
      items: [
        {
          item_order: 0,
          descripcion: 'Estado de resultados mensual generado',
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
          descripcion: 'Balance general actualizado',
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
          descripcion: 'Flujo de efectivo monitoreado',
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
          descripcion: 'KPIs financieros calculados (ADR, RevPAR, etc.)',
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
          descripcion: 'Reporte de costos por departamento',
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
          descripcion: 'Análisis de variaciones vs presupuesto',
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
          descripcion: 'Reportes entregados a dirección a tiempo',
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
