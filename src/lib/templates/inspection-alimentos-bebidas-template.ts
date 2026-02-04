import type { InspectionRRHHArea } from '@/lib/services/inspections-rrhh.service'

/**
 * Template de inspección Alimentos y Bebidas (A&B)
 * 
 * Áreas supervisadas:
 * - Cocina y preparación
 * - Higiene y sanidad
 * - Almacenamiento
 * - Servicio de restaurante
 * - Bar
 * - Room Service
 * - Banquetes y eventos
 */
export function getAlimentosBebidasInspectionTemplateAreas(): InspectionRRHHArea[] {
  return [
    {
      area_name: 'Cocina - Higiene y Sanidad',
      area_order: 0,
      items: [
        {
          item_order: 0,
          descripcion: 'Personal con uniforme completo y limpio',
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
          descripcion: 'Uso de cofia/redecilla obligatorio',
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
          descripcion: 'Manos limpias y uñas cortas (sin esmalte)',
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
          descripcion: 'Sin joyas ni accesorios',
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
          descripcion: 'Lavado de manos frecuente (registrado)',
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
          descripcion: 'Certificado de salud vigente',
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
      area_name: 'Cocina - Área de Preparación',
      area_order: 1,
      items: [
        {
          item_order: 0,
          descripcion: 'Superficies de trabajo limpias y desinfectadas',
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
          descripcion: 'Tablas de corte por colores (separación crudo/cocido)',
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
          descripcion: 'Cuchillos y utensilios limpios',
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
          descripcion: 'Campana extractora funcionando y limpia',
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
          descripcion: 'Estufas y parrillas limpias',
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
          descripcion: 'Hornos funcionando y calibrados',
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
          descripcion: 'Freidoras limpias y con aceite adecuado',
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
          descripcion: 'Pisos limpios y sin grasa (antiderrapantes)',
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
          descripcion: 'Trampas de grasa limpias',
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
      area_name: 'Almacenamiento y Refrigeración',
      area_order: 2,
      items: [
        {
          item_order: 0,
          descripcion: 'Refrigeradores a temperatura correcta (0-4°C)',
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
          descripcion: 'Congeladores a temperatura correcta (-18°C)',
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
          descripcion: 'Alimentos etiquetados con fecha de entrada/caducidad',
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
          descripcion: 'Sistema PEPS aplicado (Primeras Entradas, Primeras Salidas)',
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
          descripcion: 'Alimentos cubiertos y en recipientes adecuados',
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
          descripcion: 'Secos almacenados a 15cm del piso',
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
          descripcion: 'Sin productos vencidos',
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
          descripcion: 'Productos químicos separados de alimentos',
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
          descripcion: 'Almacén ordenado y limpio',
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
      area_name: 'Área de Lavado (Steward)',
      area_order: 3,
      items: [
        {
          item_order: 0,
          descripcion: 'Máquina lavavajillas funcionando',
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
          descripcion: 'Temperatura de lavado adecuada (60-82°C)',
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
          descripcion: 'Vajilla sin residuos ni manchas',
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
          descripcion: 'Cristalería limpia y sin quebraduras',
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
          descripcion: 'Cubiertos limpios y sin oxidación',
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
          descripcion: 'Área organizada (sucio/limpio separado)',
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
      area_name: 'Restaurante - Servicio y Montaje',
      area_order: 4,
      items: [
        {
          item_order: 0,
          descripcion: 'Mesas montadas según estándar',
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
          descripcion: 'Mantelería limpia y planchada',
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
          descripcion: 'Cubiertos pulidos y ordenados',
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
          descripcion: 'Cristalería sin manchas ni huellas',
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
          descripcion: 'Menú presente y en buen estado',
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
          descripcion: 'Saleros/pimenteros limpios y llenos',
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
          descripcion: 'Personal con uniforme completo',
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
          descripcion: 'Estaciones de servicio abastecidas',
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
      area_name: 'Buffet (si aplica)',
      area_order: 5,
      items: [
        {
          item_order: 0,
          descripcion: 'Alimentos calientes a temperatura correcta (>60°C)',
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
          descripcion: 'Alimentos fríos refrigerados (<4°C)',
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
          descripcion: 'Alimentos cubiertos o protegidos',
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
          descripcion: 'Tarjetas identificando platillos',
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
          descripcion: 'Utensilios de servicio para cada platillo',
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
          descripcion: 'Reposición constante de alimentos',
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
          descripcion: 'Área limpia y ordenada',
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
      area_name: 'Bar',
      area_order: 6,
      items: [
        {
          item_order: 0,
          descripcion: 'Barra limpia y organizada',
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
          descripcion: 'Cristalería pulida sin manchas',
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
          descripcion: 'Hielo limpio y suficiente',
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
          descripcion: 'Guarniciones frescas y refrigeradas',
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
          descripcion: 'Botellería completa y organizada',
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
          descripcion: 'Máquina de cerveza funcionando',
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
          descripcion: 'Carta de cocteles disponible',
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
          descripcion: 'Control de inventario actualizado',
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
      area_name: 'Room Service',
      area_order: 7,
      items: [
        {
          item_order: 0,
          descripcion: 'Termos limpios y funcionando',
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
          descripcion: 'Carros de servicio limpios',
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
          descripcion: 'Montaje de charolas según estándar',
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
          descripcion: 'Tiempo de entrega dentro de estándar',
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
          descripcion: 'Control de órdenes documentado',
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
      area_name: 'Control de Plagas',
      area_order: 8,
      items: [
        {
          item_order: 0,
          descripcion: 'Sin evidencia de plagas (roedores, cucarachas)',
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
          descripcion: 'Trampas de plagas ubicadas y revisadas',
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
          descripcion: 'Fumigación según programa establecido',
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
          descripcion: 'Bitácora de control de plagas actualizada',
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
      area_name: 'Documentación y Cumplimiento',
      area_order: 9,
      items: [
        {
          item_order: 0,
          descripcion: 'Temperaturas registradas (refrigeradores/congeladores)',
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
          descripcion: 'Recetas estándar disponibles',
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
          descripcion: 'Inventarios actualizados',
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
          descripcion: 'Mermas registradas y justificadas',
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
          descripcion: 'Personal certificado en manejo de alimentos',
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
