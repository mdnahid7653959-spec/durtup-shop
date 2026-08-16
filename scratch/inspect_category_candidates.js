import fs from 'fs';

const prods = JSON.parse(fs.readFileSync('scratch/all_api_products.json', 'utf8'));

// Filter products that have good clear square images
const valid = prods.filter(p => p.image && (p.image.endsWith('.jpg') || p.image.endsWith('.png') || p.image.endsWith('.webp')));

console.log("Total valid image products:", valid.length);

console.log("\n--- Top Smart Watches & Tech ---");
const watches = valid.filter(p => p.name.toLowerCase().includes("watch") || p.name.toLowerCase().includes("smart") || p.name.toLowerCase().includes("projector") || p.name.toLowerCase().includes("camera") || p.name.toLowerCase().includes("fan"));
watches.forEach(p => console.log(`[Tech] ID: ${p.id} | Name: ${p.name}\nImg: ${p.image}\n`));

console.log("\n--- Top Fashion ---");
const fashion = valid.filter(p => p.name.toLowerCase().includes("shirt") || p.name.toLowerCase().includes("jersey") || p.name.toLowerCase().includes("pant") || p.name.toLowerCase().includes("panjabi") || p.name.toLowerCase().includes("brazil") || p.name.toLowerCase().includes("argentina"));
fashion.forEach(p => console.log(`[Fashion] ID: ${p.id} | Name: ${p.name}\nImg: ${p.image}\n`));

console.log("\n--- Top Home Decor & Lifestyle ---");
const home = valid.filter(p => p.name.toLowerCase().includes("lamp") || p.name.toLowerCase().includes("light") || p.name.toLowerCase().includes("dispenser") || p.name.toLowerCase().includes("fan") || p.name.toLowerCase().includes("speaker") || p.name.toLowerCase().includes("cup") || p.name.toLowerCase().includes("bottle"));
home.forEach(p => console.log(`[Home] ID: ${p.id} | Name: ${p.name}\nImg: ${p.image}\n`));

console.log("\n--- Top Beauty & Grooming ---");
const beauty = valid.filter(p => p.name.toLowerCase().includes("dryer") || p.name.toLowerCase().includes("trimmer") || p.name.toLowerCase().includes("shaver") || p.name.toLowerCase().includes("skincare") || p.name.toLowerCase().includes("beauty") || p.name.toLowerCase().includes("cream"));
beauty.forEach(p => console.log(`[Beauty] ID: ${p.id} | Name: ${p.name}\nImg: ${p.image}\n`));
