const fs = require('fs');
const path = require('path');

const repoDir = path.resolve(__dirname, 'durtup-admin-repo');
const srcDir = path.join(repoDir, 'src');
const pkg = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));

const allDeps = {
  ...pkg.dependencies,
  ...pkg.devDependencies
};

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

const files = getAllFiles(srcDir);
const importRegex = /(?:import|export)\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]/g;

const missingPkgs = new Set();
const foundPkgs = new Set();

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith('.') || importPath.startsWith('@/')) {
      continue;
    }

    // Extract package name (handles @org/pkg or simple-pkg or simple-pkg/subpath)
    let pkgName = importPath;
    if (importPath.startsWith('@')) {
      const parts = importPath.split('/');
      pkgName = parts[0] + '/' + parts[1];
    } else {
      pkgName = importPath.split('/')[0];
    }

    foundPkgs.add(pkgName);

    if (!allDeps[pkgName]) {
      missingPkgs.add(pkgName);
    }
  }
}

console.log('Total external packages found in code:', foundPkgs.size);
console.log('Missing packages from package.json:', Array.from(missingPkgs));
