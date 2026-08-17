const fs = require('fs');
const path = require('path');

const repoDir = path.resolve(__dirname, 'durtup-admin-repo');
const srcDir = path.join(repoDir, 'src');

function getAllFiles(dir, extList = ['.ts', '.tsx', '.js', '.jsx']) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        results = results.concat(getAllFiles(filePath, extList));
      }
    } else {
      if (extList.includes(path.extname(file))) {
        results.push(filePath);
      }
    }
  }
  return results;
}

// Function to check if a path exists with EXACT CASE on disk
function checkExactCase(targetPath) {
  const parts = path.resolve(targetPath).split(path.sep);
  let current = parts[0] + path.sep; // e.g. "D:\"
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (!fs.existsSync(current)) return { exists: false, reason: `Directory ${current} not found` };
    const children = fs.readdirSync(current);
    const match = children.find(c => c === part);
    if (!match) {
      const caseInsensitiveMatch = children.find(c => c.toLowerCase() === part.toLowerCase());
      if (caseInsensitiveMatch) {
        return { exists: true, caseMismatch: true, expected: caseInsensitiveMatch, actual: part, dir: current };
      }
      return { exists: false, reason: `Child ${part} not found in ${current}` };
    }
    current = path.join(current, part);
  }
  return { exists: true, caseMismatch: false };
}

const files = getAllFiles(srcDir);
console.log(`Checking ${files.length} files for imports...`);

const importRegex = /(?:import|export)\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]/g;

let errors = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    
    // Ignore external packages like react, @tanstack/react-query, lucide-react, etc.
    if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
      continue;
    }

    let resolvedPath = '';
    if (importPath.startsWith('@/')) {
      resolvedPath = path.join(srcDir, importPath.slice(2));
    } else {
      resolvedPath = path.resolve(path.dirname(file), importPath);
    }

    // Try extensions
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.json', '/index.ts', '/index.tsx', '/index.js'];
    let found = false;
    let bestMismatch = null;

    for (const ext of extensions) {
      const testPath = resolvedPath + ext;
      if (fs.existsSync(testPath)) {
        found = true;
        const caseCheck = checkExactCase(testPath);
        if (caseCheck.caseMismatch) {
          bestMismatch = {
            file: path.relative(repoDir, file),
            importPath,
            actual: caseCheck.actual,
            expected: caseCheck.expected,
            fullTestPath: testPath
          };
        } else {
          bestMismatch = null;
        }
        break;
      }
    }

    if (!found) {
      errors.push({
        type: 'MISSING',
        file: path.relative(repoDir, file),
        importPath,
        resolvedPath
      });
    } else if (bestMismatch) {
      errors.push({
        type: 'CASE_MISMATCH',
        file: bestMismatch.file,
        importPath: bestMismatch.importPath,
        actual: bestMismatch.actual,
        expected: bestMismatch.expected
      });
    }
  }
}

console.log('--- SCAN RESULTS ---');
console.log(`Total errors found: ${errors.length}`);
for (const err of errors) {
  console.log(JSON.stringify(err, null, 2));
}
