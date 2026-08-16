import fs from 'fs';
import path from 'path';

function findFunctionsInvoke(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findFunctionsInvoke(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('functions.invoke')) {
        console.log('Found functions.invoke in:', fullPath);
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes('functions.invoke')) {
            console.log(`  Line ${idx + 1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

findFunctionsInvoke('./src');
