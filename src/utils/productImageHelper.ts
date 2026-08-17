// Smart Product Image Matcher & Resolver Utility
// Ensures every product displays a real, relevant image matching its name & category.

const CATEGORY_IMAGES = {
  shirt: [
    "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600&h=600&fit=crop",
  ],
  women_fashion: [
    "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&h=600&fit=crop",
  ],
  watch: [
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&h=600&fit=crop",
  ],
  smartwatch: [
    "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&h=600&fit=crop",
  ],
  trimmer: [
    "https://images.unsplash.com/photo-1621607512214-68297480165e?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&h=600&fit=crop",
  ],
  earbuds: [
    "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&h=600&fit=crop",
  ],
  keyboard: [
    "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&h=600&fit=crop",
  ],
  home: [
    "https://images.unsplash.com/photo-1585336261026-8f5786372966?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1618944847828-82e943c3beb9?w=600&h=600&fit=crop",
  ],
  shoes: [
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600&h=600&fit=crop",
  ],
  bags: [
    "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=600&h=600&fit=crop",
  ],
  beauty: [
    "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=600&fit=crop",
  ]
};

// Known Unsplash generic fallback patterns that were previously assigned in random places
const GENERIC_GADGET_FALLBACKS = [
  "photo-1590658268037", // Earbuds
  "photo-1546868871",    // Smartwatch
  "photo-1609091839311", // Router
  "photo-1618384887929", // Keyboard
  "photo-1585386959984", // Perfume
  "photo-1560472355",    // Shoes
  "photo-1523275335684", // Watch
  "photo-1507582020474", // Camera
  "photo-1596755094514", // Shirt
];

export function getSmartProductImage(
  name: string = "",
  currentImageUrl?: string,
  category: string = "",
  index: number = 0
): string {
  const text = `${name} ${category}`.toLowerCase();

  // Determine category key from product name & category
  let key: keyof typeof CATEGORY_IMAGES | null = null;
  
  if (text.match(/smart.*watch|fitness.*watch|apple.*watch|ultra.*watch|t800|t900|d20|hw8|hw9|fitness.*band|smart.*band/i)) {
    key = "smartwatch";
  } else if (text.match(/watch|clock|jewel|luxury|wrist|oliya|olevs|skmei|binbond|curren|naviforce|casio|quartz|chronograph|dial|butter.*fly.*lock|butterfly|leather.*strap|mesh.*strap|analog/i)) {
    key = "watch";
  } else if (text.match(/trimmer|clipper|shaver|grooming|hair.*beard|beard|at-1210|htc|vintage.*t9|kemei|vgr|nova|shaving|hair.*cut/i)) {
    key = "trimmer";
  } else if (text.match(/earbud|airpod|headphone|earphone|headset|audio|bluetooth.*sound|wireless.*audio|tws|pro.*4|m10|f9|anc|soundbar/i)) {
    key = "earbuds";
  } else if (text.match(/keyboard|mouse|gaming|pc|laptop|computer|router|wifi/i)) {
    key = "keyboard";
  } else if (text.match(/shoe|sneaker|footwear|sandal|boot|loafer|slipper/i)) {
    key = "shoes";
  } else if (text.match(/bag|backpack|wallet|purse|handbag|travel.*bag|crossbody/i)) {
    key = "bags";
  } else if (text.match(/perfume|attar|body.*spray|fragrance|lotion|cream|serum|shampoo|face.*wash|skin.*care|lipstick|makeup/i)) {
    key = "beauty";
  } else if (text.match(/saree|sharee|kurti|abaya|borkha|burqa|khimar|hijab|three.*piece|salwar|kameez|palazzo|lehenga|dress|ladies/i)) {
    key = "women_fashion";
  } else if (text.match(/shirt|t-shirt|tshirt|polo|panjabi|punjabi|pant|trouser|clothing|fashion|jacket|suit|cloth|men's|mens|wear|sleeve|combo.*shirt|denim|jeans|hoodie/i)) {
    key = "shirt";
  } else if (text.match(/home|kitchen|mug|pump|fan|lamp|dispenser|blender|grinder|bottle|flask|pillow|cushion|shelf|rack|mop/i)) {
    key = "home";
  }

  // Check if currentImageUrl is a genuine uploaded/supplier image URL (not a generic Unsplash placeholder)
  if (currentImageUrl && typeof currentImageUrl === "string" && currentImageUrl.trim() !== "") {
    const trimmed = currentImageUrl.trim();
    const isUnsplashGeneric = GENERIC_GADGET_FALLBACKS.some(pattern => trimmed.includes(pattern));

    // If it is a real image from Mohasagor, Supabase, Cloudinary, or valid external host (not an Unsplash generic fallback)
    if (!isUnsplashGeneric) {
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("//") || trimmed.startsWith("data:")) {
        return trimmed;
      }
    } else if (key) {
      // If it's a generic Unsplash image, only keep it if it actually matches the detected category
      if (
        (key === "earbuds" && trimmed.includes("photo-1590658268037")) ||
        (key === "watch" && trimmed.includes("photo-1523275335684")) ||
        (key === "smartwatch" && trimmed.includes("photo-1546868871")) ||
        (key === "keyboard" && trimmed.includes("photo-1618384887929")) ||
        (key === "shoes" && trimmed.includes("photo-1560472355")) ||
        (key === "shirt" && trimmed.includes("photo-1596755094514"))
      ) {
        return trimmed;
      }
    }
  }

  // Return a relevant category-matched high-res image
  if (key && CATEGORY_IMAGES[key]) {
    const images = CATEGORY_IMAGES[key];
    return images[index % images.length];
  }

  const defaultPool = CATEGORY_IMAGES.watch;
  return defaultPool[index % defaultPool.length];
}
