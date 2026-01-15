import fs from 'fs'
import https from 'https'
import http from 'http'

function parseEnvFile(filePath) {
  const envVars = {}
  const content = fs.readFileSync(filePath, 'utf8')
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const idx = line.indexOf('=')
    if (idx === -1) continue

    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()

    // Remove surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    envVars[key] = value
  }
  return envVars
}

function usage() {
  console.log('Uso: node scripts/apply-supabase-sql.mjs <ruta-al-archivo.sql>')
  console.log('Ejemplo: node scripts/apply-supabase-sql.mjs supabase/migration-add-ticket-service-area.sql')
}

const sqlFilePath = process.argv[2]
if (!sqlFilePath) {
  usage()
  process.exit(2)
}

if (!fs.existsSync(sqlFilePath)) {
  console.error(`❌ No existe el archivo SQL: ${sqlFilePath}`)
  process.exit(1)
}

if (!fs.existsSync('.env.local')) {
  console.error('❌ No existe .env.local en el directorio actual')
  console.error('   Tip: ejecuta esto desde el root del proyecto (o el workdir de ziii.sh)')
  process.exit(1)
}

const envVars = parseEnvFile('.env.local')
const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Variables de entorno no configuradas en .env.local')
  console.error('   Requiere: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sql = fs.readFileSync(sqlFilePath, 'utf8')

const protocol = SUPABASE_URL.startsWith('https') ? https : http
const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec`)

const postData = JSON.stringify({ query: sql })

const options = {
  hostname: url.hostname,
  port: url.port || (url.protocol === 'https:' ? 443 : 80),
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  },
}

console.log('================================================')
console.log('  APLICAR SQL A SUPABASE')
console.log('================================================')
console.log(`✓ URL: ${SUPABASE_URL}`)
console.log(`✓ Archivo: ${sqlFilePath}`)
console.log('\n🔄 Ejecutando SQL...\n')

const req = protocol.request(options, (res) => {
  let data = ''
  res.on('data', (chunk) => {
    data += chunk
  })

  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ SQL aplicado exitosamente')
      process.exit(0)
    }

    console.error('❌ Error aplicando SQL')
    console.error(`Status: ${res.statusCode}`)
    if (data) console.error(data)
    process.exit(1)
  })
})

req.on('error', (error) => {
  console.error('❌ Error de conexión:', error.message)
  process.exit(1)
})

req.write(postData)
req.end()
