import type { InspectionRRHHArea } from '@/lib/services/inspections-rrhh.service'

/**
 * Template de inspección División Cuartos
 * 
 * Áreas supervisadas:
 * - Uniformes y presentación del personal
 * - Limpieza de habitaciones
 * - Amenidades y suministros
 * - Áreas públicas
 * - Control de inventarios
 * - Reportes y documentación
 */
export function getDivisionCuartosInspectionTemplateAreas(): InspectionRRHHArea[] {
  return [
    {
      area_name: 'Uniformes y Presentación del Personal',
      area_order: 0,
      items: [
        {
          item_order: 0,
          descripcion: 'Personal porta uniforme completo y en buen estado',
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
          descripcion: 'Gafete de identificación visible y en buen estado',
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
          descripcion: 'Higiene personal adecuada (cabello recogido, uñas limpias)',
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
          descripcion: 'Zapatos cerrados, limpios y en buen estado',
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
      area_name: 'Habitaciones - Área de Dormitorio',
      area_order: 1,
      items: [
        {
          item_order: 0,
          descripcion: 'Cama tendida correctamente (sábanas estiradas, sin arrugas)',
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
          descripcion: 'Almohadas ordenadas y fundas limpias',
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
          descripcion: 'Colcha o edredón sin manchas ni daños',
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
          descripcion: 'Buró libre de polvo y con artículos ordenados',
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
          descripcion: 'Lámpara de buró funcionando correctamente',
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
          descripcion: 'Carpeta de bienvenida / información del hotel presente',
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
          descripcion: 'Control remoto TV limpio y funcionando',
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
          descripcion: 'Ventanas limpias (cristales sin manchas)',
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
          descripcion: 'Cortinas sin polvo y funcionando correctamente',
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
          descripcion: 'Piso aspirado/trapeado sin manchas',
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
          descripcion: 'Zócalos limpios (sin polvo ni manchas)',
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
      area_name: 'Habitaciones - Baño',
      area_order: 2,
      items: [
        {
          item_order: 0,
          descripcion: 'Espejo sin manchas ni polvo',
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
          descripcion: 'Lavabo limpio y sin residuos de jabón',
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
          descripcion: 'WC limpio (interior, exterior, tapa y asiento)',
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
          descripcion: 'Regadera limpia (cabezal sin sarro, paredes sin moho)',
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
          descripcion: 'Tina limpia (si aplica)',
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
          descripcion: 'Cortina de baño limpia y sin moho',
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
          descripcion: 'Toallas limpias, dobladas y cantidad completa',
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
          descripcion: 'Amenidades completas (jabón, shampoo, acondicionador)',
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
          descripcion: 'Papel higiénico suficiente y presentación adecuada',
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
          descripcion: 'Piso del baño limpio y seco',
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
          descripcion: 'Cesto de basura vacío y con bolsa limpia',
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
      area_name: 'Habitaciones - Closet y Área de Trabajo',
      area_order: 3,
      items: [
        {
          item_order: 0,
          descripcion: 'Closet limpio y con ganchos suficientes',
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
          descripcion: 'Caja fuerte limpia y funcionando',
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
          descripcion: 'Plancha y burro de planchar limpios (si aplica)',
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
          descripcion: 'Escritorio limpio y ordenado',
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
          descripcion: 'Silla o sillón limpio y en buen estado',
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
          descripcion: 'Papelería presente (hoja membretada, sobre, pluma)',
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
      area_name: 'Minibar y Amenidades (si aplica)',
      area_order: 4,
      items: [
        {
          item_order: 0,
          descripcion: 'Minibar limpio interior y exterior',
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
          descripcion: 'Productos del minibar completos y vigentes',
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
          descripcion: 'Cafetera limpia y con suministros (café, azúcar, crema)',
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
          descripcion: 'Vasos/tazas limpios y sin daños',
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
          descripcion: 'Botellas de agua de cortesía (cantidad según estándar)',
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
      area_name: 'Áreas Públicas - Pasillos',
      area_order: 5,
      items: [
        {
          item_order: 0,
          descripcion: 'Pisos limpios y sin manchas',
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
          descripcion: 'Paredes sin manchas ni rayaduras',
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
          descripcion: 'Puertas limpias y sin daños',
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
          descripcion: 'Iluminación funcionando correctamente',
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
          descripcion: 'Carros de limpieza ordenados y fuera de vista del huésped',
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
      area_name: 'Control de Inventarios y Documentación',
      area_order: 6,
      items: [
        {
          item_order: 0,
          descripcion: 'Bitácora de limpieza actualizada',
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
          descripcion: 'Reporte de habitaciones listas en tiempo',
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
          descripcion: 'Control de llaves adecuado',
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
          descripcion: 'Inventario de blancos actualizado',
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
          descripcion: 'Reporte de objetos olvidados documentado',
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
