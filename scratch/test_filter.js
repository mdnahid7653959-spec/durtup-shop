import fs from 'fs';

const all = JSON.parse(fs.readFileSync('scratch/all_api_products.json', 'utf8'));

function filterProductsByCategory(products, categorySlug, categoryName) {
  const targetSlug = categorySlug.toLowerCase().replace(/[^a-z0-9]/g, "");
  const targetName = (categoryName || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const filtered = products.filter(p => {
    if (!targetSlug || targetSlug === "all") return true;
    const prodCat = ((p.category || "").toLowerCase()).replace(/[^a-z0-9]/g, "");
    const prodName = (p.name || "").toLowerCase();

    // 1. Exact or partial category match
    if (prodCat && (prodCat.includes(targetSlug) || targetSlug.includes(prodCat))) return true;
    if (targetName && prodCat && (prodCat.includes(targetName) || targetName.includes(prodCat))) return true;

    // 2. Comprehensive keyword matching per category:
    // Fashion & Lifestyle
    if (targetSlug.includes("fashion") || targetSlug.includes("cloth") || targetSlug.includes("lifestyle") || targetSlug.includes("wear") || targetSlug.includes("dress")) {
      if (prodCat.includes("fashion") || prodCat.includes("winter") || prodCat.includes("cloth") || prodCat.includes("wear")) return true;
      if (prodName.includes("shirt") || prodName.includes("panjabi") || prodName.includes("polo") || prodName.includes("jersey") || prodName.includes("pant") || prodName.includes("gabardine") || prodName.includes("trouser") || prodName.includes("khimar") || prodName.includes("palazzo") || prodName.includes("shoe") || prodName.includes("t-shirt") || prodName.includes("jacket") || prodName.includes("sweater") || prodName.includes("hoodie") || prodName.includes("dress") || prodName.includes("bra") || prodName.includes("kurti") || prodName.includes("sharee") || prodName.includes("sari")) return true;
    }

    // Tech & Gadgets / Electronics
    if (targetSlug.includes("gadget") || targetSlug.includes("electronic") || targetSlug.includes("tech") || targetSlug.includes("phone")) {
      if (prodCat.includes("gadget") || prodCat.includes("elect") || prodCat.includes("tech") || prodCat.includes("watch") || prodCat.includes("phone")) return true;
      if (prodName.includes("watch") || prodName.includes("smartwatch") || prodName.includes("headphone") || prodName.includes("earphone") || prodName.includes("earbud") || prodName.includes("speaker") || prodName.includes("camera") || prodName.includes("mouse") || prodName.includes("keyboard") || prodName.includes("router") || prodName.includes("cable") || prodName.includes("charger") || prodName.includes("projector") || prodName.includes("fan") || prodName.includes("power bank") || prodName.includes("dispenser") || prodName.includes("sensor") || prodName.includes("bluetooth") || prodName.includes("adapter") || prodName.includes("tripod")) return true;
    }

    // Home & Living
    if (targetSlug.includes("home") || targetSlug.includes("living") || targetSlug.includes("kitchen") || targetSlug.includes("garden") || targetSlug.includes("decor")) {
      if (prodCat.includes("home") || prodCat.includes("living") || prodCat.includes("kitchen") || prodCat.includes("garden")) return true;
      if (prodName.includes("lamp") || prodName.includes("light") || prodName.includes("pillow") || prodName.includes("cushion") || prodName.includes("mug") || prodName.includes("bottle") || prodName.includes("flask") || prodName.includes("kitchen") || prodName.includes("dispenser") || prodName.includes("decor") || prodName.includes("mop") || prodName.includes("cleaner") || prodName.includes("bed") || prodName.includes("sofa") || prodName.includes("towel") || prodName.includes("rack") || prodName.includes("organizer") || prodName.includes("cutter") || prodName.includes("blender") || prodName.includes("pot") || prodName.includes("pan") || prodName.includes("knife")) return true;
    }

    // Beauty & Care
    if (targetSlug.includes("beauty") || targetSlug.includes("care") || targetSlug.includes("skin") || targetSlug.includes("health")) {
      if (prodCat.includes("beauty") || prodCat.includes("care") || prodCat.includes("skin") || prodCat.includes("health")) return true;
      if (prodName.includes("oil") || prodName.includes("cream") || prodName.includes("serum") || prodName.includes("lotion") || prodName.includes("soap") || prodName.includes("shampoo") || prodName.includes("dryer") || prodName.includes("hair") || prodName.includes("trimmer") || prodName.includes("shaving") || prodName.includes("skincare") || prodName.includes("lipstick") || prodName.includes("perfume") || prodName.includes("fragrance") || prodName.includes("facial") || prodName.includes("massage") || prodName.includes("face wash") || prodName.includes("sunscreen") || prodName.includes("gel")) return true;
    }

    // Toys & Kids
    if (targetSlug.includes("toy") || targetSlug.includes("kid") || targetSlug.includes("baby") || targetSlug.includes("hobby")) {
      if (prodCat.includes("kid") || prodCat.includes("toy") || prodCat.includes("baby")) return true;
      if (prodName.includes("toy") || prodName.includes("baby") || prodName.includes("kid") || prodName.includes("game") || prodName.includes("puzzle") || prodName.includes("doll") || prodName.includes("car toy") || prodName.includes("drone")) return true;
    }

    // Watches & Accessories
    if (targetSlug.includes("watch") || targetSlug.includes("time") || targetSlug.includes("accessory")) {
      if (prodCat.includes("watch") || prodCat.includes("jewel") || prodCat.includes("access")) return true;
      if (prodName.includes("watch") || prodName.includes("clock") || prodName.includes("bracelet") || prodName.includes("ring") || prodName.includes("necklace") || prodName.includes("wallet") || prodName.includes("belt") || prodName.includes("sunglass")) return true;
    }

    return false;
  });

  return filtered.length > 0 ? filtered : products.slice(0, 20);
}

console.log("API electronics count:", filterProductsByCategory(all, "electronics", "Electronics & Gadgets").length);
console.log("API fashion count:", filterProductsByCategory(all, "fashion", "Fashion & Clothing").length);
console.log("API home count:", filterProductsByCategory(all, "home", "Home & Kitchen").length);
console.log("API beauty count:", filterProductsByCategory(all, "beauty", "Health & Beauty").length);
console.log("API watches count:", filterProductsByCategory(all, "watches", "Watches & Accessories").length);
console.log("API kids count:", filterProductsByCategory(all, "kids", "Toys & Baby Care").length);
