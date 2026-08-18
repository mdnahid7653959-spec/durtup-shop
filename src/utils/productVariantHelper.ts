export interface ProductVariant {
  id: string | number;
  product_id: string | number;
  attribute: string;
  variant: string;
}

export const COLOR_HEX_MAP: Record<string, string> = {
  // English Common Colors
  black: "#111827",
  white: "#FFFFFF",
  red: "#EF4444",
  blue: "#3B82F6",
  navy: "#1E3A8A",
  "navy blue": "#1E3A8A",
  "royal blue": "#2563EB",
  "sky blue": "#38BDF8",
  "dark blue": "#0F172A",
  green: "#10B981",
  "dark green": "#064E3B",
  "light green": "#86EFAC",
  olive: "#556B2F",
  "olive green": "#556B2F",
  golden: "#D97706",
  gold: "#D97706",
  yellow: "#FBBF24",
  pink: "#EC4899",
  "light pink": "#FBCFE8",
  "baby pink": "#F472B6",
  purple: "#8B5CF6",
  violet: "#7C3AED",
  gray: "#6B7280",
  grey: "#6B7280",
  "dark gray": "#374151",
  "light gray": "#D1D5DB",
  ash: "#9CA3AF",
  charcoal: "#334155",
  maroon: "#800000",
  orange: "#F97316",
  beige: "#F5F5DC",
  brown: "#78350F",
  coffee: "#6F4E37",
  chocolate: "#4A2E18",
  cyan: "#06B6D4",
  teal: "#14B8A6",
  silver: "#9CA3AF",
  "off white": "#FAF9F6",
  "off-white": "#FAF9F6",
  cream: "#FFFDD0",
  khaki: "#C3B091",
  magenta: "#D946EF",
  lavender: "#E9D5FF",
  mustard: "#EAB308",
  peach: "#FDBA74",
  mint: "#6EE7B7",
  burgundy: "#800020",
  wine: "#722F37",
  camel: "#C19A6B",
  bronze: "#CD7F32",
  copper: "#B87333",
  "rose gold": "#B76E79",
  coral: "#FF7F50",
  turquoise: "#40E0D0",
  lime: "#84CC16",
  indigo: "#6366F1",

  // Bengali Color Names
  "কালো": "#111827",
  "সাদা": "#FFFFFF",
  "লাল": "#EF4444",
  "নীল": "#3B82F6",
  "নেভি ব্লু": "#1E3A8A",
  "রয়্যাল ব্লু": "#2563EB",
  "স্কাই ব্লু": "#38BDF8",
  "সবুজ": "#10B981",
  "গাঢ় সবুজ": "#064E3B",
  "অলিভ": "#556B2F",
  "অলিভ গ্রিন": "#556B2F",
  "হলুদ": "#FBBF24",
  "গোলাপি": "#EC4899",
  "বেগুনি": "#8B5CF6",
  "মেরুন": "#800000",
  "কমলা": "#F97316",
  "অ্যাশ": "#9CA3AF",
  "ধূসর": "#6B7280",
  "বাদামি": "#78350F",
  "কফি": "#6F4E37",
  "চকলেট": "#4A2E18",
  "সোনালী": "#D97706",
  "রূপালী": "#9CA3AF",
  "অফ হোয়াইট": "#FAF9F6",
  "খাকি": "#C3B091",
  "ক্রিম": "#FFFDD0"
};

export const getColorHex = (name: string): string | null => {
  if (!name) return null;
  const trimmed = name.trim();
  if (trimmed.startsWith("#") && (trimmed.length === 4 || trimmed.length === 7)) {
    return trimmed;
  }
  const n = trimmed.toLowerCase();
  if (COLOR_HEX_MAP[n]) return COLOR_HEX_MAP[n];
  for (const [key, hex] of Object.entries(COLOR_HEX_MAP)) {
    if (n.includes(key) || key.includes(n)) {
      return hex;
    }
  }
  return null;
};

const KNOWN_COLORS_LIST = Object.keys(COLOR_HEX_MAP);

const SIZE_ORDER: Record<string, number> = {
  "XXS": 1, "XS": 2, "S": 3, "M": 4, "L": 5, "XL": 6, "XXL": 7, "2XL": 7,
  "XXXL": 8, "3XL": 8, "4XL": 9, "5XL": 10, "FREE": 11, "FREE SIZE": 11, "FREE-SIZE": 11
};

export function sortVariantValues(attribute: string, values: string[]): string[] {
  const isSize = attribute.toLowerCase().includes("size");
  if (!isSize) return values;

  return [...values].sort((a, b) => {
    const aUpper = a.toUpperCase().trim();
    const bUpper = b.toUpperCase().trim();

    const aOrder = SIZE_ORDER[aUpper];
    const bOrder = SIZE_ORDER[bUpper];

    if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
    if (aOrder !== undefined) return -1;
    if (bOrder !== undefined) return 1;

    const aNum = parseFloat(a);
    const bNum = parseFloat(b);
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;

    return a.localeCompare(b);
  });
}

/**
 * Intelligent Multi-Source Variant Extractor
 * Extracts sizes, colors, choices, and options from:
 * 1. product_variants / variants arrays/objects
 * 2. choice_options (Active eCommerce / Laravel style)
 * 3. colors array / string / JSON
 * 4. root attributes (size, sizes, color, colors, options)
 * 5. Deep text scanner from name, details, description, specifications
 * 6. Category-aware standard apparel & footwear size defaults
 */
export function extractProductVariants(raw: any): ProductVariant[] {
  if (!raw) return [];
  const variants: ProductVariant[] = [];
  const added = new Set<string>();

  const pId = raw.id || 0;

  function addVariant(attribute: string, variant: string) {
    if (!variant) return;
    let cleanAttr = String(attribute || "Option").trim();
    if (!cleanAttr) cleanAttr = "Option";

    // Standardize attribute names
    const attrLower = cleanAttr.toLowerCase();
    if (attrLower === "colour" || attrLower === "colors" || attrLower === "colours" || attrLower === "কালার") {
      cleanAttr = "Color";
    } else if (attrLower === "sizes" || attrLower === "সাইজ") {
      cleanAttr = "Size";
    } else if (attrLower === "storage" || attrLower === "rom" || attrLower === "memory") {
      cleanAttr = "Storage";
    } else {
      cleanAttr = cleanAttr.charAt(0).toUpperCase() + cleanAttr.slice(1);
    }

    let cleanVal = String(variant).trim();
    // Clean up surrounding symbols, quotes, colons
    cleanVal = cleanVal.replace(/^[,\s:\-–|/"]+|[,\s:\-–|/"]+$/g, '');
    if (!cleanVal || cleanVal.length > 30) return;

    const key = `${cleanAttr.toLowerCase()}:::${cleanVal.toLowerCase()}`;
    if (!added.has(key)) {
      added.add(key);
      variants.push({
        id: `var-${pId}-${variants.length + 1}`,
        product_id: pId,
        attribute: cleanAttr,
        variant: cleanVal
      });
    }
  }

  // 1. Check raw.product_variants or raw.variants
  let rawVariants = raw.product_variants || raw.variants;
  if (typeof rawVariants === "string") {
    try {
      const parsed = JSON.parse(rawVariants);
      if (Array.isArray(parsed)) rawVariants = parsed;
    } catch {}
  }

  if (Array.isArray(rawVariants) && rawVariants.length > 0) {
    rawVariants.forEach((v: any) => {
      if (typeof v === "string") {
        if (v.includes(",")) {
          v.split(",").forEach(item => addVariant("Option", item));
        } else {
          addVariant("Option", v);
        }
      } else if (v && typeof v === "object") {
        const attr = v.attribute || (v.size ? "Size" : v.color ? "Color" : v.storage ? "Storage" : "Option");
        const val = v.variant || v.name || v.value || v.color || v.size || v.title || v.storage;
        if (val) {
          if (typeof val === "string" && val.includes(",") && !val.includes("{")) {
            val.split(",").forEach(item => addVariant(attr, item));
          } else {
            addVariant(attr, val);
          }
        }
      }
    });
  }

  // 2. Check choice_options (Active eCommerce format)
  let choiceOptions = raw.choice_options;
  if (typeof choiceOptions === "string") {
    try { choiceOptions = JSON.parse(choiceOptions); } catch {}
  }
  if (Array.isArray(choiceOptions)) {
    choiceOptions.forEach((opt: any) => {
      if (opt && typeof opt === "object") {
        const attrTitle = opt.title || opt.name || opt.attribute || "Option";
        const optionsList = Array.isArray(opt.options) ? opt.options : Array.isArray(opt.values) ? opt.values : [];
        optionsList.forEach((val: any) => addVariant(attrTitle, String(val)));
      }
    });
  }

  // 3. Check colors (Array, JSON string, or Comma-separated string)
  let rawColors = raw.colors;
  if (typeof rawColors === "string") {
    try {
      const parsed = JSON.parse(rawColors);
      if (Array.isArray(parsed)) rawColors = parsed;
    } catch {}
  }
  if (Array.isArray(rawColors)) {
    rawColors.forEach((c: any) => {
      if (typeof c === "string") addVariant("Color", c);
      else if (c && typeof c === "object") addVariant("Color", c.name || c.color || c.code);
    });
  } else if (typeof rawColors === "string" && rawColors.includes(",")) {
    rawColors.split(",").map(c => c.trim()).filter(Boolean).forEach(c => addVariant("Color", c));
  }

  // 4. Check root properties: color, size, sizes, options
  if (raw.color && typeof raw.color === "string" && raw.color.trim()) {
    raw.color.split(/[,/|]+/).forEach(c => addVariant("Color", c.trim()));
  }
  if (raw.size && typeof raw.size === "string" && raw.size.trim()) {
    raw.size.split(/[,/|]+/).forEach(s => addVariant("Size", s.trim()));
  }
  if (Array.isArray(raw.sizes)) {
    raw.sizes.forEach((s: any) => addVariant("Size", String(s)));
  }

  // 5. Deep text scanning from Name + Details + Description
  const fullText = `${raw.name || ''} ${raw.title || ''} ${raw.details || ''} ${raw.description || ''} ${raw.short_description || ''}`;

  const hasSize = variants.some(v => v.attribute.toLowerCase() === "size");
  const hasColor = variants.some(v => v.attribute.toLowerCase() === "color");

  // Extract Sizes if not present
  if (!hasSize && fullText.length > 5) {
    const extractedSizes = new Set<string>();

    // Strategy A: Explicit Size heading (e.g. Size: M, L, XL, XXL or Sizes: 28, 30, 32, 34)
    const sizeHeadings = fullText.matchAll(/(?:Available\s+Sizes?|Sizes?|সাইজ|সাইজঃ|সাইজ:)\s*[:\-–=]?\s*([A-Za-z0-9\s,/\+\-–|()]{1,70})/gi);
    for (const sh of sizeHeadings) {
      if (sh[1]) {
        const cut = sh[1].split(/(?:\n|\r|<|\.|\bFabric|\bChest|\bLength|\bColor|\bPrice|\bCode|\bWeight)/i)[0];
        const tokens = cut.replace(/[()]/g, ' ').split(/[\s,/\+\-|]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
        tokens.forEach(t => {
          if (/^(XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|5XL|FREE|FREE-SIZE|28|29|30|31|32|33|34|35|36|37|38|39|40|41|42|43|44|45|46|6|7|8|9|10|11|12)$/i.test(t)) {
            extractedSizes.add(t);
          }
        });
      }
    }

    // Strategy B: Size Breakdown patterns e.g. "M=Chest", "L=Chest", "M= Length", "XL=Length", "M (38)"
    const breakdownMatches = fullText.matchAll(/\b(XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|28|30|32|34|36|38|40|42|44|46)\s*[:=\-]/gi);
    for (const bm of breakdownMatches) {
      extractedSizes.add(bm[1].toUpperCase());
    }

    extractedSizes.forEach(sz => addVariant("Size", sz));
  }

  // Extract Colors if not present
  if (!hasColor && fullText.length > 5) {
    const extractedColors = new Set<string>();

    // Strategy A: Explicit Color heading (e.g. "Color: Black, White, Red", "কালার: লাল, নীল")
    const colorHeadings = fullText.matchAll(/(?:Available\s+Colors?|Colors?|Colours?|কালার|কালারঃ|কালার:)\s*[:\-–=]\s*([A-Za-z0-9\s,/\+\-–|&()^\u0980-\u09FF]{1,90})/gi);
    for (const ch of colorHeadings) {
      if (ch[1]) {
        const cut = ch[1].split(/(?:\n|\r|<|\.|\bFabric|\bSize|\bChest|\bLength|\bPrice|\bCode|\bGuaranteed|\bStock|\bQuality)/i)[0];
        const tokens = cut.split(/[,/|&]+|\band\b|\bএবং\b/).map(c => c.trim()).filter(Boolean);
        tokens.forEach(c => {
          const clean = c.replace(/^(available|only|all|best|pure|color|colour|colors)\s+/i, '').trim();
          if (clean.length >= 2 && clean.length <= 25) {
            const isMatch = KNOWN_COLORS_LIST.some(kc => kc === clean.toLowerCase() || clean.toLowerCase().includes(kc));
            if (isMatch || clean.length <= 15) {
              extractedColors.add(clean.charAt(0).toUpperCase() + clean.slice(1));
            }
          }
        });
      }
    }

    // Strategy B: Scan Title for direct color mention in parentheses e.g. "Men's Gabardine Pant (Black Color)"
    if (extractedColors.size === 0) {
      const title = String(raw.name || raw.title || '');
      KNOWN_COLORS_LIST.forEach(kc => {
        const regex = new RegExp(`\\b${kc}\\b`, 'i');
        if (regex.test(title)) {
          extractedColors.add(kc.charAt(0).toUpperCase() + kc.slice(1));
        }
      });
    }

    extractedColors.forEach(col => addVariant("Color", col));
  }

  // 6. Category Smart Defaults for fashion items if still no size
  const stillHasSize = variants.some(v => v.attribute.toLowerCase() === "size");
  if (!stillHasSize) {
    const combined = `${raw.name || ''} ${raw.category || ''} ${raw.category_id || ''}`.toLowerCase();
    const isPants = /pant|jeans|trouser|gabardine|chino|cargo|boxer|shorts|pajama/i.test(combined);
    const isShoes = /shoe|sneaker|loafer|sandal|boot|slipper|footwear/i.test(combined);
    const isPanjabi = /panjabi|punjabi|kabli/i.test(combined);
    const isTops = /shirt|t-shirt|polo|hoodie|jersey|jacket|sweater|tshirt|kurti|dress|blazer|clothing|fashion|winter/i.test(combined);

    if (isPants) {
      ['28', '30', '32', '34', '36', '38'].forEach(s => addVariant("Size", s));
    } else if (isShoes) {
      ['39', '40', '41', '42', '43', '44'].forEach(s => addVariant("Size", s));
    } else if (isPanjabi) {
      ['40', '42', '44', '46'].forEach(s => addVariant("Size", s));
    } else if (isTops) {
      ['M', 'L', 'XL', 'XXL'].forEach(s => addVariant("Size", s));
    }
  }

  return variants;
}
