const fs = require('fs');

const typesTs = fs.readFileSync('src/integrations/supabase/types.ts', 'utf8');

const tablesRegex = /Tables:\s*{([\s\S]*?)}(?=\s*Views:|\s*Functions:|\s*Enums:)/;
const match = typesTs.match(tablesRegex);
if (!match) {
  console.log("Could not find Tables block");
  process.exit(1);
}

const tablesStr = match[1];
const tableBlocks = tablesStr.split(/^(?=\s{6}[a-zA-Z0-9_]+:\s*{)/m).filter(Boolean);

let gqlSchema = ``;

function mapType(tsType) {
  if (tsType.includes('string')) return 'String';
  if (tsType.includes('number')) return 'Float';
  if (tsType.includes('boolean')) return 'Boolean';
  if (tsType.includes('Json')) return 'Any';
  if (tsType.includes('string[]')) return '[String]';
  return 'String';
}

function toCamelCase(str) {
  return str.replace(/_([a-z0-9])/g, function (g) { return g[1].toUpperCase(); });
}

for (const block of tableBlocks) {
  const nameMatch = block.match(/^\s{6}([a-zA-Z0-9_]+):\s*{/);
  if (!nameMatch) continue;
  const tableName = nameMatch[1];
  
  const rowMatch = block.match(/Row:\s*{([\s\S]*?)\s{8}}/);
  if (!rowMatch) continue;
  
  const rowContent = rowMatch[1];
  const colLines = rowContent.split('\n').filter(l => l.trim().length > 0);
  
  const typeName = tableName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  
  let fields = '';
  for (const col of colLines) {
    const colMatch = col.trim().match(/^([a-zA-Z0-9_]+):\s*(.+)$/);
    if (!colMatch) continue;
    let colName = colMatch[1];
    let colTypeRaw = colMatch[2];
    
    const isNullable = colTypeRaw.includes('| null');
    const baseType = mapType(colTypeRaw);
    const gqlColType = isNullable ? baseType : `${baseType}!`;
    
    const camelColName = toCamelCase(colName);
    
    if (colName === 'id') {
      fields += `  id: UUID! @default(expr: "uuidV4()") @col(name: "id")\n`;
    } else {
      fields += `  ${camelColName}: ${gqlColType} @col(name: "${colName}")\n`;
    }
  }
  
  if (fields.length > 0) {
    gqlSchema += `type ${typeName} @table(name: "${tableName}") {\n${fields}}\n\n`;
  }
}

fs.mkdirSync('dataconnect/schema', { recursive: true });
fs.writeFileSync('dataconnect/schema/schema.gql', gqlSchema);
console.log("Generated dataconnect/schema/schema.gql");
