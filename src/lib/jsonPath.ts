/**
 * Utility to extract nested values from a JSON object using dot notation and array index paths.
 * Supports expressions like "data.products[0].variants[0].price"
 */
export function getNestedValue(obj: any, path: string): any {
  if (!path || !obj) return undefined;
  
  const parts = path.trim().split(".");
  let current = obj;

  for (const part of parts) {
    if (current === undefined || current === null) return undefined;

    // Check if the part includes an array index like "items[0]"
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      current = current[key];
      if (Array.isArray(current)) {
        current = current[parseInt(index, 10)];
      } else {
        return undefined;
      }
    } else {
      current = current[part];
    }
  }

  return current;
}

/**
 * Extracts a list of values from an array of objects based on a property path.
 * E.g., getArrayValues(response, "data.images", "url") -> ["img1.jpg", "img2.jpg"]
 */
export function getArrayValues(obj: any, arrayPath: string, valueSubPath?: string): any[] {
  const arr = getNestedValue(obj, arrayPath);
  if (!Array.isArray(arr)) return [];
  
  if (!valueSubPath) return arr;
  
  return arr
    .map(item => getNestedValue(item, valueSubPath))
    .filter(val => val !== undefined && val !== null);
}
