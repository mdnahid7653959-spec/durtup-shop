// Secure client-side credential encryption and decryption helper.
// Obfuscates and encrypts API secrets using a reversible salt key before DB storage.

const SECRET_KEY = "durtup-api-gateway-salt-secure-key-2026";

/**
 * Encrypts any object or string into a base64 encoded cipher string.
 */
export function encryptCredentials(data: any): string {
  if (data === null || data === undefined) return "";
  const plainText = typeof data === "string" ? data : JSON.stringify(data);
  let cipherText = "";
  for (let i = 0; i < plainText.length; i++) {
    const charCode = plainText.charCodeAt(i);
    const keyChar = SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
    const encrypted = charCode ^ keyChar;
    cipherText += String.fromCharCode(encrypted);
  }
  // Safe base64 encoding supporting Unicode characters
  return btoa(unescape(encodeURIComponent(cipherText)));
}

/**
 * Decrypts a base64 encoded cipher string back to its original object or string.
 */
export function decryptCredentials(encryptedBase64: string): any {
  if (!encryptedBase64) return null;
  try {
    const cipherText = decodeURIComponent(escape(atob(encryptedBase64)));
    let plainText = "";
    for (let i = 0; i < cipherText.length; i++) {
      const charCode = cipherText.charCodeAt(i);
      const keyChar = SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
      const decrypted = charCode ^ keyChar;
      plainText += String.fromCharCode(decrypted);
    }
    
    // Try parsing as JSON, fallback to plain string
    try {
      return JSON.parse(plainText);
    } catch {
      return plainText;
    }
  } catch (error) {
    console.error("Failed to decrypt credentials:", error);
    return null;
  }
}
