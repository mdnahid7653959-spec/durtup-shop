import fs from 'fs';

const prods = JSON.parse(fs.readFileSync('scratch/all_api_products.json', 'utf8'));

console.log("=== TECH PRODUCTS ===");
const tech = prods.filter(p => {
  const n = (p.name || "").toLowerCase();
  return n.includes("watch") || n.includes("projector") || n.includes("camera") || n.includes("speaker") || n.includes("earphone") || n.includes("wireless") || n.includes("fan");
});
console.log(tech.slice(0, 10).map(p => ({ id: p.id, name: p.name, img: p.image })));

console.log("\n=== FASHION PRODUCTS ===");
const fashion = prods.filter(p => {
  const n = (p.name || "").toLowerCase();
  return n.includes("panjabi") || n.includes("shirt") || n.includes("jersey") || n.includes("pant") || n.includes("jacket") || n.includes("gabardine") || n.includes("polo");
});
console.log(fashion.slice(0, 10).map(p => ({ id: p.id, name: p.name, img: p.image })));

console.log("\n=== HOME PRODUCTS ===");
const home = prods.filter(p => {
  const n = (p.name || "").toLowerCase();
  return n.includes("lamp") || n.includes("light") || n.includes("bottle") || n.includes("flask") || n.includes("mug") || n.includes("kitchen") || n.includes("dispenser") || n.includes("pillow") || n.includes("cleaner") || n.includes("hanger") || n.includes("water");
});
console.log(home.slice(0, 10).map(p => ({ id: p.id, name: p.name, img: p.image })));

console.log("\n=== BEAUTY PRODUCTS ===");
const beauty = prods.filter(p => {
  const n = (p.name || "").toLowerCase();
  return n.includes("hair") || n.includes("dryer") || n.includes("trimmer") || n.includes("shaving") || n.includes("massage") || n.includes("skincare") || n.includes("facial") || n.includes("cream") || n.includes("serum");
});
console.log(beauty.slice(0, 10).map(p => ({ id: p.id, name: p.name, img: p.image })));
