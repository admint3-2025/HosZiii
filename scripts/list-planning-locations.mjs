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

const { data, error } = await supabase.from('locations').select('id, code, name').order('code', { ascending: true })

if (error) {
  console.error('Error consultando locations:', error.message)
  process.exit(1)
}

console.log(JSON.stringify(data ?? [], null, 2))