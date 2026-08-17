const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'all_api_products.json'), 'utf8'));

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[’'"“”()\-–\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findImage(productName) {
  const normTarget = normalize(productName);
  const targetTokens = normTarget.split(' ').filter(t => t.length > 2);
  
  let bestMatch = null;
  let maxScore = 0;

  for (const p of data) {
    const pName = normalize(p.name || p.title);
    if (pName === normTarget) {
      return p.image || p.image_url || (p.images && p.images[0]);
    }
    
    let score = 0;
    for (const token of targetTokens) {
      if (pName.includes(token)) score++;
    }
    if (score > maxScore && score >= 2) {
      maxScore = score;
      bestMatch = p;
    }
  }
  return bestMatch ? (bestMatch.image || bestMatch.image_url || (bestMatch.images && bestMatch.images[0])) : null;
}

console.log('Olevs image:', findImage("Olevs Luxury Men's Quartz Watch (Golden )"));
console.log('K10 image:', findImage("K10 SIM Suported Android Smart Watch"));
