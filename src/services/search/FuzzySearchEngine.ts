/**
 * Levenshtein distance algorithm for calculating edit distance between strings
 */
export function getEditDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculates string similarity ratio between 0.0 and 1.0
 */
export function getStringSimilarity(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  
  const maxLength = Math.max(s1.length, s2.length);
  if (maxLength === 0) return 1.0;
  
  const distance = getEditDistance(s1, s2);
  return 1.0 - distance / maxLength;
}

/**
 * Stop words that should not trigger broad substring matches
 */
export const SEARCH_STOP_WORDS = new Set([
  "a", "an", "the", "in", "on", "at", "to", "for", "of", "with", "by", "and", "or", "is", "it", "n", "s", "d"
]);

/**
 * Normalizes text for search (handles curly apostrophes, quotes, special characters, converts to lowercase)
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u2032\u2035\u0027\u0060\u00B4]/g, " ") // replace all curly/straight apostrophes and backticks with space
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036\u0022]/g, " ") // replace all curly/straight quotes with space
    .replace(/[^\w\s\u0980-\u09FF-]/g, " ") // allow word characters, space, hyphens, and Bengali
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tokenizes a string into array of normalized words with stop word filtering
 */
export function tokenizeText(text: string, filterStopWords = true): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  const tokens = normalized.split(" ").filter((t) => t.length > 0);
  if (!filterStopWords) return tokens;
  const filtered = tokens.filter((t) => !SEARCH_STOP_WORDS.has(t) || /^\d+$/.test(t));
  return filtered.length > 0 ? filtered : tokens;
}

/**
 * Evaluates whether query token fuzzy-matches a target string
 */
export function fuzzyMatchToken(queryToken: string, targetToken: string): { isMatch: boolean; score: number } {
  const q = queryToken.toLowerCase().trim();
  const t = targetToken.toLowerCase().trim();

  if (!q || !t) return { isMatch: false, score: 0 };
  if (q === t) return { isMatch: true, score: 100 };
  if (t.startsWith(q)) return { isMatch: true, score: 85 };

  // Only do substring inclusion if queryToken is at least 3 characters long
  if (q.length >= 3 && t.includes(q)) return { isMatch: true, score: 70 };

  // For words longer than 3 characters, calculate Levenshtein fuzzy distance
  if (q.length >= 4 && t.length >= 4) {
    const maxAllowedDistance = q.length <= 5 ? 1 : 2;
    const distance = getEditDistance(q, t);
    if (distance <= maxAllowedDistance) {
      const score = Math.max(40, 80 - distance * 20);
      return { isMatch: true, score };
    }
  }

  return { isMatch: false, score: 0 };
}
