/**
 * 🔥 GENIUS PROTECTION: Deobfuscation Utility
 *
 * Safety improvement: chapter content that merely *looks* like base64
 * (plain Latin text is valid base64 charset!) used to be force-decrypted
 * into garbage. We now verify the decrypted result looks like real text
 * (mostly printable / valid UTF-8) before accepting it; otherwise the
 * original content is returned untouched.
 */

const ZEUS_SECRET = "Z3uS_N0v3l_2026_S3cr3t_K3y";

/** Returns true when the string decodes to sensible text. */
function looksLikeRealText(result: string): boolean {
  if (!result) return false;
  let printable = 0;
  const sample = result.slice(0, 200);
  for (let i = 0; i < sample.length; i++) {
    const code = sample.charCodeAt(i);
    // Count real text characters: letters (any script), digits, punctuation, whitespace
    if (
      (code >= 0x20 && code <= 0x7e) || // ASCII printable
      (code >= 0x0600 && code <= 0x06ff) || // Arabic
      (code >= 0x0900 && code <= 0x097f) || // Devanagari
      (code >= 0x3000 && code <= 0x9fff) || // CJK
      (code >= 0x4e00 && code <= 0x9fff) ||
      code === 0x0a || code === 0x0d || code === 0x09
    ) {
      printable++;
    }
  }
  return printable / sample.length > 0.9;
}

export function deobfuscate(encoded: string): string {
  if (!encoded) return "";
  try {
    const cleanEncoded = encoded.trim().replace(/\s/g, '');

    // Quick reject: must be base64-ish and reasonably long to be our format
    if (cleanEncoded.length < 16) return encoded;
    if (!/^[A-Za-z0-9+/=_.-]+$/.test(cleanEncoded)) return encoded;
    if (cleanEncoded.length % 4 !== 0) return encoded;

    const text = atob(cleanEncoded);

    let result = "";
    for (let i = 0; i < text.length; i++) {
      let charCode = text.charCodeAt(i);
      // Reverse Layer 3: Rotation (3 positions)
      charCode = (charCode - 3 + 256) % 256;
      // Reverse Layer 2: Dynamic Offset
      const offset = (i * 7) % 13;
      charCode = (charCode - offset + 256) % 256;
      // Reverse Layer 1: XOR with secret
      charCode = charCode ^ ZEUS_SECRET.charCodeAt(i % ZEUS_SECRET.length);
      result += String.fromCharCode(charCode);
    }

    // Accept only when the result is genuinely readable text
    if (!looksLikeRealText(result)) return encoded;

    // Try to decode as URI component (for content)
    try {
      return decodeURIComponent(result);
    } catch (e) {
      return result;
    }
  } catch (e) {
    return encoded;
  }
}
