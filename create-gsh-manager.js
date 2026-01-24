const fs = require('fs');
const path = require('path');

const sourceFile = 'src/app/(app)/inspections/ui/RRHHInspectionManager.tsx';
const targetFile = 'src/app/(app)/inspections/ui/GSHInspectionManager.tsx';

let content = fs.readFileSync(sourceFile, 'utf8');

// Reemplazos globales
content = content
  .replace(/InspectionsRRHHService/g, 'InspectionsGSHService')
  .replace(/InspectionRRHHArea/g, 'InspectionGSHArea')
  .replace(/InspectionRRHHItem/g, 'InspectionGSHItem')
  .replace(/InspectionRRHH([^A-Za-z])/g, 'InspectionGSH$1')
  .replace(/RRHHInspectionManager/g, 'GSHInspectionManager')
  .replace(/RRHH_TEMPLATE/g, 'GSH_TEMPLATE')
  .replace(/InspectionRRHHPDFGenerator/g, 'InspectionGSHPDFGenerator')
  .replace(/isRRHH/g, 'isGSH')
  .replace(/\/inspections\/rrhh\//g, '/inspections/gsh/')
  .replace(/'RECURSOS HUMANOS'/g, "'GSH'");

// Eliminar el template RRHH completo (desde const RRHH_TEMPLATE hasta el ]  cierre)
const templateStart = content.indexOf('// Datos de template inicial');
const templateEnd = content.indexOf(']\n\nexport default function', templateStart);
if (templateStart !== -1 && templateEnd !== -1) {
  content = content.substring(0, templateStart) + 
    '// Template de GSH (importado desde template)\nconst GSH_TEMPLATE: InspectionGSHArea[] = getGSHInspectionTemplate().areas\n\n' +
    content.substring(templateEnd + 2);
}

// Agregar import del template
const userImport = content.indexOf("import type { User } from '@supabase/supabase-js'");
if (userImport !== -1) {
  const afterUserImport = content.indexOf('\n', userImport);
  content = content.substring(0, afterUserImport) + 
    "\nimport { getGSHInspectionTemplate } from '@/lib/templates/inspection-gsh-template'" +
    content.substring(afterUserImport);
}

fs.writeFileSync(targetFile, content, 'utf8');
console.log('✓ GSHInspectionManager.tsx creado exitosamente');
