/**
 * 🔥 GENIUS PROTECTION: Deobfuscation Utility
 */

const ZEUS_SECRET = "Z3uS_N0v3l_2026_S3cr3t_K3y";

export function deobfuscate(encoded: string): string {
    if (!encoded) return "";
    try {
        // Check if it's actually base64 (simple check)
        if (!/^[A-Za-z0-9+/=]+$/.test(encoded)) return encoded;

        const text = atob(encoded);
        let result = "";
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ ZEUS_SECRET.charCodeAt(i % ZEUS_SECRET.length));
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
