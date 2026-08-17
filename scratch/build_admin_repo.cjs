const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..');
const outDir = path.resolve(__dirname, 'durtup-admin-repo');

console.log('Building standalone admin panel repo in:', outDir);

if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(outDir, { recursive: true });

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const items = fs.readdirSync(src);
    for (const item of items) {
      if (item === 'node_modules' || item === '.git' || item === 'dist' || item === 'scratch' || item === '.agents') continue;
      copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    const parentDir = path.dirname(dest);
    if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

// 1. Copy config files
const configFiles = [
  'tailwind.config.ts',
  'postcss.config.js',
  'tsconfig.json',
  'tsconfig.node.json',
  'components.json'
];

for (const cf of configFiles) {
  const p = path.join(srcDir, cf);
  if (fs.existsSync(p)) {
    fs.copyFileSync(p, path.join(outDir, cf));
  }
}

// Copy public assets
copyRecursive(path.join(srcDir, 'public'), path.join(outDir, 'public'));

// Copy src components needed
copyRecursive(path.join(srcDir, 'src', 'components', 'ui'), path.join(outDir, 'src', 'components', 'ui'));
copyRecursive(path.join(srcDir, 'src', 'components', 'admin'), path.join(outDir, 'src', 'components', 'admin'));
copyRecursive(path.join(srcDir, 'src', 'components', 'staff'), path.join(outDir, 'src', 'components', 'staff'));

const singleComponents = ['ErrorBoundary.tsx', 'NativeAppProvider.tsx'];
for (const sc of singleComponents) {
  const p = path.join(srcDir, 'src', 'components', sc);
  if (fs.existsSync(p)) {
    const parentDir = path.dirname(path.join(outDir, 'src', 'components', sc));
    if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
    fs.copyFileSync(p, path.join(outDir, 'src', 'components', sc));
  }
}

// Copy pages
copyRecursive(path.join(srcDir, 'src', 'pages', 'admin'), path.join(outDir, 'src', 'pages', 'admin'));
copyRecursive(path.join(srcDir, 'src', 'pages', 'staff'), path.join(outDir, 'src', 'pages', 'staff'));
if (fs.existsSync(path.join(srcDir, 'src', 'pages', 'NotFound.tsx'))) {
  const parentDir = path.join(outDir, 'src', 'pages');
  if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
  fs.copyFileSync(path.join(srcDir, 'src', 'pages', 'NotFound.tsx'), path.join(outDir, 'src', 'pages', 'NotFound.tsx'));
}

// Copy contexts, lib, services, hooks, integrations, utils
copyRecursive(path.join(srcDir, 'src', 'contexts'), path.join(outDir, 'src', 'contexts'));
copyRecursive(path.join(srcDir, 'src', 'lib'), path.join(outDir, 'src', 'lib'));
copyRecursive(path.join(srcDir, 'src', 'services'), path.join(outDir, 'src', 'services'));
copyRecursive(path.join(srcDir, 'src', 'hooks'), path.join(outDir, 'src', 'hooks'));
copyRecursive(path.join(srcDir, 'src', 'integrations'), path.join(outDir, 'src', 'integrations'));
copyRecursive(path.join(srcDir, 'src', 'utils'), path.join(outDir, 'src', 'utils'));
if (fs.existsSync(path.join(srcDir, 'src', 'types'))) {
  copyRecursive(path.join(srcDir, 'src', 'types'), path.join(outDir, 'src', 'types'));
}

// Copy index.css
if (fs.existsSync(path.join(srcDir, 'src', 'index.css'))) {
  fs.copyFileSync(path.join(srcDir, 'src', 'index.css'), path.join(outDir, 'src', 'index.css'));
}

console.log('Files copied successfully.');
