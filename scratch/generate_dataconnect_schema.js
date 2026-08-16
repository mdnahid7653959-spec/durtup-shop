const fs = require('fs');

const typesTs = fs.readFileSync('src/integrations/supabase/types.ts', 'utf8');

// A simple parser to extract table schemas from types.ts
// Format:
//       tablename: {
//         Row: {
//           column1: string | null
//           column2: number
//           ...

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
  return 'String';
}

for (const block of tableBlocks) {
  const nameMatch = block.match(/^\s{6}([a-zA-Z0-9_]+):\s*{/);
  if (!nameMatch) continue;
  const tableName = nameMatch[1];
  
  const rowMatch = block.match(/Row:\s*{([\s\S]*?)}/);
  if (!rowMatch) continue;
  
  const rowContent = rowMatch[1];
  const colLines = rowContent.split('\n').filter(l => l.trim().length > 0);
  
  // Convert table name to PascalCase for the GraphQL type name
  const typeName = tableName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  
  let fields = '';
  for (const col of colLines) {
    const colMatch = col.match(/^\s+([a-zA-Z0-9_]+):\s*(.+)$/);
    if (!colMatch) continue;
    let colName = colMatch[1];
    let colTypeRaw = colMatch[2];
    
    // Check if nullable
    const isNullable = colTypeRaw.includes('| null');
    const baseType = mapType(colTypeRaw);
    
    // GraphQL type
    const gqlColType = isNullable ? baseType : `${baseType}!`;
    
    if (colName === 'id') {
      fields += `  id: UUID! @default(expr: "uuidV4()")\n`;
    } else {
      fields += `  ${colName}: ${gqlColType}\n`;
    }
  }
  
  gqlSchema += `type ${typeName} @table(name: "${tableName}") {\n${fields}}\n\n`;
}

fs.mkdirSync('dataconnect/schema', { recursive: true });
fs.writeFileSync('dataconnect/schema/schema.gql', gqlSchema);
console.log("Generated dataconnect/schema/schema.gql");

fs.mkdirSync('dataconnect/connector', { recursive: true });
const connectorYaml = `connectorId: eshop-connector
generate:
  javascriptSdk:
    outputDir: "../../src/integrations/firebase/dataconnect"
    package: "@eshop/dataconnect"
`;
fs.writeFileSync('dataconnect/connector/connector.yaml', connectorYaml);

const dataconnectYaml = `specVersion: "v1alpha"
serviceId: "eshop-data-connect"
location: "us-central1"
schema:
  source: "./schema"
  datasource:
    postgresql:
      database: "eshopapp6119d"
      cloudSql:
        instanceId: "eshop-app-6119d-instance"
connectorDirs: ["./connector"]
`;
fs.writeFileSync('dataconnect/dataconnect.yaml', dataconnectYaml);

console.log("Generated config files.");
