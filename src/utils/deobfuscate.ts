/**
 * 🔥 GENIUS PROTECTION: Deobfuscation Utility
 */

const ZEUS_SECRET = "Z3uS_N0v3l_2026_S3cr3t_K3y";

export function deobfuscate(encoded: string): string {
    if (!encoded) return "";
    try {
        // 🔥 Robust Base64 Check: Trim and remove all whitespace
        const cleanEncoded = encoded.trim().replace(/\s/g, '');
        
        // Check if it's actually base64 (allow standard and URL-safe base64)
        if (!/^[A-Za-z0-9+/=_.-]+$/.test(cleanEncoded)) return encoded;

        // atob returns a binary string where each character is 0-255
        const text = atob(cleanEncoded);
        let result = "";
        
        // REVERSE THE STRONG PROTECTION:
        // 1. Rotation (charCode - 3)
        // 2. Dynamic Offset (charCode - offset)
        // 3. XOR (charCode ^ secret)
        
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
        
        // Try to decode as URI component (for content)
        try {
            return decodeURIComponent(result);
        } catch (e) {
            // If it fails, it might be a raw string
            return result;
        }
    } catch (e) {
        console.error("Deobfuscation error:", e);
        return encoded;
    }
}