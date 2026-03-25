/**
 * 🔥 GENIUS PROTECTION: Deobfuscation Utility
 */

const ZEUS_SECRET = "Z3uS_N0v3l_2026_S3cr3t_K3y";

export function deobfuscate(encoded: string): string {
    if (!encoded) return "";
    try {
        const text = atob(encoded);
        let result = "";
        
        // REVERSE THE STRONG PROTECTION:
        // 1. Rotation
        // 2. Dynamic Offset
        // 3. XOR
        
        for (let i = 0; i < text.length; i++) {
            let charCode = text.charCodeAt(i);
            
            // Reverse Rotation (3 positions)
            charCode = (charCode - 3 + 256) % 256;
            
            // Reverse Dynamic Offset
            const offset = (i * 7) % 13;
            charCode = (charCode - offset + 256) % 256;
            
            // Reverse XOR
            charCode = charCode ^ ZEUS_SECRET.charCodeAt(i % ZEUS_SECRET.length);
            
            result += String.fromCharCode(charCode);
        }
        
        // Try to decode as URI component (for content)
        try {
            return decodeURIComponent(result);
        } catch (e) {
            // If it fails, it might be a raw URL or other string
            return result;
        }
    } catch (e) {
        return encoded;
    }
}
