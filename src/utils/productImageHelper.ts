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
  watch: [
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=600&h=600&fit=crop",
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
  ],
  smartwatch: [
    "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&h=600&fit=crop",
  ],
  home: [
    "https://images.unsplash.com/photo-1585336261026-8f5786372966?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&h=600&fit=crop",
  ],
  shoes: [
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600&h=600&fit=crop",
  ]
};

// Generic gadget fallback patterns that were previously assigned randomly
const GENERIC_GADGET_FALLBACKS = [
  "photo-1590658268037", // Earbuds
  "photo-1546868871",    // Smartwatch
  "photo-1609091839311", // Router
  "photo-1618384887929", // Keyboard
  "photo-1585386959984", // Perfume
  "photo-1560472355",    // Shoes
  "photo-1523275335684", // Watch
  "photo-1507582020474"  // Camera
];

export function getSmartProductImage(
  name: string = "",
  currentImageUrl?: string,
  category: string = "",
  index: number = 0
): string {
  const text = `${name} ${category}`.toLowerCase();

  // Determine category key from product name
  let key: keyof typeof CATEGORY_IMAGES | null = null;
  if (text.match(/shirt|t-shirt|tshirt|polo|panjabi|pant|trouser|clothing|fashion|dress|jacket|suit|cloth|men's|mens|wear|sleeve|combo.*shirt/i)) {
    key = "shirt";
  } else if (text.match(/trimmer|clipper|shaver|grooming|hair.*beard|beard|at-1210|htc/i)) {
    key = "trimmer";
  } else if (text.match(/smart.*watch|fitness.*watch|apple.*watch/i)) {
    key = "smartwatch";
  } else if (text.match(/watch|clock|jewel|luxury|wrist|oliya/i)) {
    key = "watch";
  } else if (text.match(/earbud|airpod|headphone|earphone|headset|audio|bluetooth.*sound/i)) {
    key = "earbuds";
  } else if (text.match(/keyboard|mouse|gaming|pc|laptop|computer/i)) {
    key = "keyboard";
  } else if (text.match(/shoe|sneaker|footwear|sandal|boot/i)) {
    key = "shoes";
  } else if (text.match(/home|kitchen|mug|pump|fan|lamp|dispenser/i)) {
    key = "home";
  }

  // Check if currentImageUrl exists and is NOT a mismatched generic fallback for a different category
  if (currentImageUrl && typeof currentImageUrl === "string" && currentImageUrl.trim() !== "") {
    const isGenericFallback = GENERIC_GADGET_FALLBACKS.some(pattern => currentImageUrl.includes(pattern));
    
    // If it's a real uploaded/supplier image or matches category, keep it
    if (!isGenericFallback || !key || 
       (key === "earbuds" && currentImageUrl.includes("photo-1590658268037")) || 
       (key === "watch" && currentImageUrl.includes("photo-1523275335684"))) {
      if (currentImageUrl.startsWith("http") || currentImageUrl.startsWith("//") || currentImageUrl.startsWith("data:")) {
        return currentImageUrl;
      }
    }
  }

  // Return a relevant category-matched image
  if (key && CATEGORY_IMAGES[key]) {
    const images = CATEGORY_IMAGES[key];
    return images[index % images.length];
  }

  const defaultPool = CATEGORY_IMAGES.shirt;
  return defaultPool[index % defaultPool.length];
}
