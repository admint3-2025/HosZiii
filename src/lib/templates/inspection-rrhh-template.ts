import type { InspectionRRHHArea } from '@/lib/services/inspections-rrhh.service'

export function getRRHHInspectionTemplateAreas(): InspectionRRHHArea[] {
  return [
    {
      area_name: 'Planificación y control de plantilla',
      area_order: 0,
      items: [
        { item_order: 0, descripcion: 'Seguimiento vacantes actuales', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 1, descripcion: 'Uso de plataformas para posteo de vacantes', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 2, descripcion: '% Rotación actual de plantilla aceptable', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true }
      ]
    },
    {
      area_name: 'Plan de inducción a colaboradores',
      area_order: 1,
      items: [
        { item_order: 0, descripcion: 'Inducción de personal de nuevo ingreso', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 1, descripcion: 'Inducción al puesto (Formato espejo y líder)', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 2, descripcion: 'Salarios emocionales', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 3, descripcion: 'Conocimiento de Reglamento Interno', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 4, descripcion: 'Entrega de PIN Nuevo Ingreso', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true }
      ]
    },
    {
      area_name: 'Evaluación y gestión de desempeño',
      area_order: 2,
      items: [
        { item_order: 0, descripcion: 'Aplicación de evaluación de desempeño', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 1, descripcion: 'Seguimiento puntual de renovaciones', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true }
      ]
    },
    {
      area_name: 'Reconocimiento y recompensas',
      area_order: 3,
      items: [
        { item_order: 0, descripcion: 'Festejo Cumpleaños', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 1, descripcion: 'Celebración Colaborador del Mes', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 2, descripcion: 'Celebración aniversarios', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true }
      ]
    },
    {
      area_name: 'Prevención Social y laboral',
      area_order: 4,
      items: [
        { item_order: 0, descripcion: 'Integración de comisiones mixtas', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 1, descripcion: 'Tarjetas checadoras completas', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 2, descripcion: 'Recibos de nómina completos', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 3, descripcion: 'Papeletas de vacaciones', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 4, descripcion: 'Tiempo adicional autorizado', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true }
      ]
    },
    {
      area_name: 'Áreas comunes colaboradores',
      area_order: 5,
      items: [
        { item_order: 0, descripcion: 'Comedor de colaboradores', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 1, descripcion: 'Vestidores/Lockers', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 2, descripcion: 'Baños colaboradores', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 3, descripcion: 'Oficinas', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true }
      ]
    },
    {
      area_name: 'Calendario Actividades',
      area_order: 6,
      items: [
        { item_order: 0, descripcion: 'Actividad de mes', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 1, descripcion: 'Capacitaciones del mes', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true }
      ]
    },
    {
      area_name: 'Expedientes',
      area_order: 7,
      items: [
        { item_order: 0, descripcion: 'Documentación completa colaborador', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 1, descripcion: 'Retención Infonavit', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 2, descripcion: 'Retención Foncacot', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 3, descripcion: 'Aceptación Fondo de ahorro', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 4, descripcion: 'Anexo sindicato', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 5, descripcion: 'Política salarios emocionales', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 6, descripcion: 'Formato inducción', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 7, descripcion: 'Perfil de puesto', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 8, descripcion: 'Contratos determinado/indeterminado', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true }
      ]
    },
    {
      area_name: 'Imagen',
      area_order: 8,
      items: [
        { item_order: 0, descripcion: 'Higiene personal', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 1, descripcion: 'Uniforme completo (Conforme a la política)', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 2, descripcion: 'Uso de gafete/PIN nuevo ingreso', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 3, descripcion: 'Uso de Cubrebocas', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true }
      ]
    },
    {
      area_name: 'Vinculaciones y oferta académica',
      area_order: 9,
      items: [
        { item_order: 0, descripcion: 'Vinculaciones con dependencias gubernamentales', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 1, descripcion: 'Vinculaciones con Universidades Locales', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true },
        { item_order: 2, descripcion: 'Vinculaciones con dependencias no lucrativas', tipo_dato: 'Fijo', cumplimiento_valor: '', cumplimiento_editable: true, calif_valor: 0, calif_editable: true, comentarios_valor: '', comentarios_libre: true }
      ]
    }
  ]
}
