#!/usr/bin/env node
/**
 * Script para replicar módulos de inspección
 * Uso: node scripts/replicate-inspection-module.js <source> <target>
 * Ejemplo: node scripts/replicate-inspection-module.js RRHH GSH
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Uso: node replicate-inspection-module.js <source> <target>');
  console.error('Ejemplo: node replicate-inspection-module.js RRHH GSH');
  process.exit(1);
}

const [source, target] = args;
const sourceUpper = source.toUpperCase();
const targetUpper = target.toUpperCase();
const sourceLower = source.toLowerCase();
const targetLower = target.toLowerCase();

console.log(`\n📋 Replicando módulo de inspección: ${sourceUpper} → ${targetUpper}\n`);

// Ruta base
const base = path.join(__dirname, '..');
const srcBase = path.join(base, 'src');

try {
  // 1. Copiar y adaptar Manager component
  console.log('1️⃣  Copiando componente Manager...');
  const managerPath = path.join(srcBase, 'app', '(app)', 'inspections', 'ui', `${sourceUpper}InspectionManager.tsx`);
  let managerContent = fs.readFileSync(managerPath, 'utf8');
  
  // Reemplazos en Manager
  managerContent = managerContent
    // Reemplazar imports de servicios primero (más específico)
    .replace(new RegExp(`@/lib/services/inspections-${sourceLower}\\.service`, 'g'), `@/lib/services/inspections-${targetLower}.service`)
    .replace(new RegExp(`@/lib/services/inspections-${sourceLower}-pdf\\.service`, 'g'), `@/lib/services/inspections-${targetLower}-pdf.service`)
    // Luego reemplazar nombres de tipos y clases
    .replace(new RegExp(`Inspections${sourceUpper}Service`, 'g'), `Inspections${targetUpper}Service`)
    .replace(new RegExp(`Inspection${sourceUpper}Area`, 'g'), `Inspection${targetUpper}Area`)
    .replace(new RegExp(`Inspection${sourceUpper}([^A-Za-z])`, 'g'), `Inspection${targetUpper}$1`)
    .replace(new RegExp(`${sourceUpper}InspectionManager`, 'g'), `${targetUpper}InspectionManager`)
    .replace(new RegExp(`${sourceUpper}_TEMPLATE`, 'g'), `${targetUpper}_TEMPLATE`)
    .replace(new RegExp(`Inspection${sourceUpper}PDFGenerator`, 'g'), `Inspection${targetUpper}PDFGenerator`)
    .replace(new RegExp(`is${sourceUpper}`, 'g'), `is${targetUpper}`)
    .replace(new RegExp(`/inspections/${sourceLower}/`, 'g'), `/inspections/${targetLower}/`)
    // Reemplazar inspectionType en llamadas API
    .replace(
      /body: JSON\.stringify\(\{ inspectionId: inspection\.id \}\)/g,
      `body: JSON.stringify({ inspectionId: inspection.id, inspectionType: '${targetLower}' })`
    );
  
  // Eliminar template hardcodeado y usar import
  const templateRegex = /\/\/ Datos de template inicial.*?\nconst [A-Z_]+_TEMPLATE[^=]+=\s*\[[\s\S]*?\n\]\n/m;
  managerContent = managerContent.replace(templateRegex, '');
  
  // Agregar import del template
  if (!managerContent.includes(`get${targetUpper}InspectionTemplate`)) {
    managerContent = managerContent.replace(
      /(import type \{ User \}.*?\n)/,
      `$1import { get${targetUpper}InspectionTemplate } from '@/lib/templates/inspection-${targetLower}-template'\n`
    );
  }
  
  // Agregar constante de template
  managerContent = managerContent.replace(
    /(function cloneTemplate[\s\S]*?\n\}\n)/,
    `$1\n// Template de ${targetUpper} (importado desde archivo de template)\nconst ${targetUpper}_TEMPLATE: Inspection${targetUpper}Area[] = get${targetUpper}InspectionTemplate().areas\n`
  );
  
  const targetManagerPath = path.join(srcBase, 'app', '(app)', 'inspections', 'ui', `${targetUpper}InspectionManager.tsx`);
  fs.writeFileSync(targetManagerPath, managerContent, 'utf8');
  console.log(`✅ Manager creado: ${targetManagerPath}`);
  
  // 2. Copiar y adaptar página [id]
  console.log('\n2️⃣  Copiando página de detalle...');
  const pageDir = path.join(srcBase, 'app', '(app)', 'inspections', targetLower, '[id]');
  if (!fs.existsSync(pageDir)) {
    fs.mkdirSync(pageDir, { recursive: true });
  }
  
  const sourcePagePath = path.join(srcBase, 'app', '(app)', 'inspections', sourceLower, '[id]', 'page.tsx');
  let pageContent = fs.readFileSync(sourcePagePath, 'utf8');
  
  pageContent = pageContent
    // Reemplazar imports de servicios primero
    .replace(new RegExp(`@/lib/services/inspections-${sourceLower}\\.service`, 'g'), `@/lib/services/inspections-${targetLower}.service`)
    // Luego reemplazar nombres
    .replace(new RegExp(`Inspections${sourceUpper}Service`, 'g'), `Inspections${targetUpper}Service`)
    .replace(new RegExp(`Inspection${sourceUpper}`, 'g'), `Inspection${targetUpper}`)
    .replace(new RegExp(`${sourceUpper}InspectionManager`, 'g'), `${targetUpper}InspectionManager`)
    .replace(new RegExp(`${sourceUpper}InspectionByIdPage`, 'g'), `${targetUpper}InspectionByIdPage`)
    .replace(new RegExp(`'${sourceUpper}'`, 'g'), `'${targetUpper}'`);
  
  const targetPagePath = path.join(pageDir, 'page.tsx');
  fs.writeFileSync(targetPagePath, pageContent, 'utf8');
  console.log(`✅ Página creada: ${targetPagePath}`);
  
  console.log(`\n✨ Módulo ${targetUpper} replicado exitosamente!`);
  console.log(`\n📝 Archivos creados:`);
  console.log(`   - ${targetManagerPath}`);
  console.log(`   - ${targetPagePath}`);
  console.log(`\n⚠️  Recuerda:`);
  console.log(`   1. Crear el servicio: src/lib/services/inspections-${targetLower}.service.ts`);
  console.log(`   2. Crear el servicio PDF: src/lib/services/inspections-${targetLower}-pdf.service.ts`);
  console.log(`   3. Crear el template: src/lib/templates/inspection-${targetLower}-template.ts`);
  console.log(`   4. Crear la migración SQL para las tablas`);
  
} catch (error) {
  console.error(`\n❌ Error: ${error.message}`);
  process.exit(1);
}
