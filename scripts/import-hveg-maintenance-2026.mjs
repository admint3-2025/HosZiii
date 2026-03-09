import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

function parseEnvFile(filePath) {
  const envVars = {}
  const content = fs.readFileSync(filePath, 'utf8')

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) continue

    const key = line.slice(0, separatorIndex).trim()
    let value = line.slice(separatorIndex + 1).trim()

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    envVars[key] = value
  }

  return envVars
}

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

function getFrequencyDefinition(months) {
  if (months.length === 12) {
    return { frecuencia_tipo: 'monthly', frecuencia_intervalo: 1, custom_interval_days: null, dia_del_mes: 15 }
  }

  if (months.length > 1) {
    const gaps = months.slice(1).map((month, index) => month - months[index])
    const allEqual = gaps.every((gap) => gap === gaps[0])

    if (allEqual && gaps[0] === 1) {
      return { frecuencia_tipo: 'monthly', frecuencia_intervalo: 1, custom_interval_days: null, dia_del_mes: 15 }
    }

    if (allEqual && gaps[0] === 2) {
      return { frecuencia_tipo: 'monthly', frecuencia_intervalo: 2, custom_interval_days: null, dia_del_mes: 15 }
    }

    if (allEqual && gaps[0] === 3) {
      return { frecuencia_tipo: 'quarterly', frecuencia_intervalo: 1, custom_interval_days: null, dia_del_mes: 15 }
    }

    if (allEqual && gaps[0] >= 5) {
      return { frecuencia_tipo: 'custom_days', frecuencia_intervalo: 1, custom_interval_days: gaps[0] * 30, dia_del_mes: 15 }
    }
  }

  return { frecuencia_tipo: 'custom_days', frecuencia_intervalo: 1, custom_interval_days: 30, dia_del_mes: 15 }
}

function buildDueDate(month) {
  return `2026-${String(month).padStart(2, '0')}-15`
}

const rows = [
  { name: 'Elevadores', months: [[1, 19008], [2, 19008], [3, 19008], [4, 19008], [5, 19008], [6, 19008], [7, 19008], [8, 19008], [9, 19008], [10, 19008], [11, 19008], [12, 19008]] },
  { name: 'Sistema contraincendios', months: [[1, 12100], [6, 12100]] },
  { name: 'Camaras de congelacion', months: [[3, 7000], [4, 20000], [7, 7000], [11, 7000]] },
  { name: 'Carcamo y desague principal mto a dos bombas', months: [[12, 30000]] },
  { name: 'Lavado de cisternas', months: [[6, 15000]] },
  { name: 'Planta de luz', months: [[1, 6000], [3, 6000], [5, 6000], [7, 6000], [9, 6000], [11, 6000]] },
  { name: 'Limpieza de cristales edificio', months: [[5, 16000]] },
  { name: 'Campana, extractor, ductos y trampa de grasa', months: [[1, 8800], [3, 8800], [5, 8800], [7, 8800], [9, 8800], [11, 8800]] },
  { name: 'Calentadores de agua', months: [[4, 15000], [6, 30000], [9, 15000]] },
  { name: 'Equipos de aires acondicionados habs y pb', months: [[3, 150570]] },
  { name: 'Equipo de gimnasio', months: [[1, 7400], [10, 7400]] },
  { name: 'Lavadoras y secadoras', months: [[3, 14200], [8, 14200]] },
  { name: 'Puerta automatica', months: [[3, 5000], [8, 5000]] },
  { name: 'Tierra fisica y pararrayos', months: [[2, 35000]] },
  { name: 'Pulido y encerado de bistro y lobby', months: [[2, 9720], [3, 11880], [6, 9720], [7, 11880], [10, 9720], [11, 11880]] },
  { name: 'Sistema de bombas de cisternas 4 bombas', months: [[7, 26000]] },
  { name: 'Subestacion electrica, transformador, registro y tableros electricos', months: [[9, 58000]] },
  { name: 'Mantenimiento horno', months: [[3, 4000], [9, 4000]] },
  { name: 'Extintores', months: [[3, 12000], [11, 12000]] },
  { name: 'Sistema de alarma contra incendios', months: [[5, 38000]] },
  { name: 'Alfombras', months: [[4, 19440], [6, 19440], [8, 19440], [10, 19440], [12, 19440]] },
  { name: 'Alucobond fachada (sellada o retirada)', months: [[1, 110200]] },
  { name: 'Asfalto estacionamiento', months: [[2, 190000]] },
]

if (!fs.existsSync('.env.local')) {
  console.error('No existe .env.local en el root del proyecto.')
  process.exit(1)
}

const envVars = parseEnvFile('.env.local')
const supabaseUrl = envVars.SUPABASE_URL_INTERNAL ?? envVars.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

const { data: location } = await supabase
  .from('locations')
  .select('id, code, name')
  .eq('code', 'HVEG')
  .maybeSingle()

if (!location) {
  const { data: availableLocations, error: availableLocationsError } = await supabase
    .from('locations')
    .select('code, name')
    .order('code', { ascending: true })

  console.error('No existe la sede HVEG en locations. Carga abortada para evitar que no aparezca en filtros.')
  if (!availableLocationsError && availableLocations?.length) {
    console.error('Sedes disponibles en la base:')
    for (const availableLocation of availableLocations) {
      console.error(`- ${availableLocation.code} | ${availableLocation.name}`)
    }
  }
  process.exit(1)
}

const providerCode = 'HVEG-MTTO-IMPORT-001'
const { data: provider, error: providerError } = await supabase
  .schema('ops')
  .from('responsables_proveedores')
  .upsert({
    codigo: providerCode,
    nombre: 'Proveedor demo mantenimiento HVEG',
    tipo: 'externo',
    departamento: 'MANTENIMIENTO',
    email: 'hveg-mantenimiento-demo@local.test',
    metadata: { import_source: 'image_hveg_maintenance_2026' },
  }, { onConflict: 'codigo' })
  .select()
  .single()

if (providerError) {
  console.error('Error creando proveedor base:', providerError.message)
  process.exit(1)
}

let importedPlans = 0
let importedAgendaItems = 0
let importedAmount = 0

for (let index = 0; index < rows.length; index += 1) {
  const row = rows[index]
  const sequence = String(index + 1).padStart(3, '0')
  const codeStem = slugify(row.name)
  const entityCode = `HVEG-MTTO-ENT-${sequence}`
  const planCode = `HVEG-MTTO-2026-${sequence}`
  const totalAmount = row.months.reduce((sum, current) => sum + current[1], 0)
  const monthNumbers = row.months.map((current) => current[0])
  const frequency = getFrequencyDefinition(monthNumbers)

  const { data: entity, error: entityError } = await supabase
    .schema('ops')
    .from('entidades_objetivo')
    .upsert({
      codigo: entityCode,
      nombre: row.name,
      tipo_entidad: 'CONCEPTO_MTTO',
      categoria: 'Carga prueba HVEG 2026',
      departamento: 'MANTENIMIENTO',
      centro_costo: 'HVEG',
      responsable_proveedor_id: provider.id,
      metadata: { import_source: 'image_hveg_maintenance_2026', code_stem: codeStem },
    }, { onConflict: 'codigo' })
    .select()
    .single()

  if (entityError) {
    console.error(`Error creando entidad ${row.name}:`, entityError.message)
    process.exit(1)
  }

  const { data: plan, error: planError } = await supabase
    .schema('ops')
    .from('planes_maestros')
    .upsert({
      codigo_plan: planCode,
      nombre: row.name,
      descripcion: `Carga de prueba HVEG 2026 importada desde tabla visual de mantenimiento para validar la matriz anual.`,
      departamento_dueno: 'MANTENIMIENTO',
      centro_costo: 'HVEG',
      moneda: 'MXN',
      entidad_objetivo_id: entity.id,
      responsable_proveedor_id: provider.id,
      fecha_inicio: '2026-01-01',
      fecha_fin: '2026-12-31',
      frecuencia_tipo: frequency.frecuencia_tipo,
      frecuencia_intervalo: frequency.frecuencia_intervalo,
      custom_interval_days: frequency.custom_interval_days,
      dia_del_mes: frequency.dia_del_mes,
      monto_total_planeado: totalAmount,
      esfuerzo_total_planeado: row.months.length,
      estado: 'activo',
      metadata: {
        import_source: 'image_hveg_maintenance_2026',
        imported_from_visual: true,
        site: 'HVEG',
      },
    }, { onConflict: 'codigo_plan' })
    .select()
    .single()

  if (planError) {
    console.error(`Error creando plan ${row.name}:`, planError.message)
    process.exit(1)
  }

  const { error: deleteAgendaError } = await supabase
    .schema('ops')
    .from('agenda_operativa')
    .delete()
    .eq('plan_maestro_id', plan.id)

  if (deleteAgendaError) {
    console.error(`Error limpiando agenda previa de ${row.name}:`, deleteAgendaError.message)
    process.exit(1)
  }

  const agendaRows = row.months.map(([month, amount], occurrenceIndex) => ({
    plan_maestro_id: plan.id,
    ocurrencia_nro: occurrenceIndex + 1,
    due_date: buildDueDate(month),
    monto_estimado: amount,
    esfuerzo_estimado: 1,
    estado: 'pendiente',
    prioridad: amount >= 100000 ? 'alta' : amount >= 30000 ? 'media' : 'baja',
    notas: 'Carga de prueba HVEG 2026 desde imagen de mantenimiento',
    metadata: { import_source: 'image_hveg_maintenance_2026', month },
  }))

  const { error: agendaError } = await supabase
    .schema('ops')
    .from('agenda_operativa')
    .insert(agendaRows)

  if (agendaError) {
    console.error(`Error cargando agenda de ${row.name}:`, agendaError.message)
    process.exit(1)
  }

  importedPlans += 1
  importedAgendaItems += agendaRows.length
  importedAmount += totalAmount
}

console.log('Carga completada correctamente.')
console.log(`Sede validada: ${location.code} - ${location.name}`)
console.log(`Planes importados: ${importedPlans}`)
console.log(`Eventos de agenda importados: ${importedAgendaItems}`)
console.log(`Monto anual total importado: ${importedAmount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}`)
console.log('Filtro sugerido en planificacion: departamento MANTENIMIENTO, sede HVEG, ejercicio 2026.')