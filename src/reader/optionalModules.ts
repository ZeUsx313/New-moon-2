// src/reader/optionalModules.ts
// Web stub for the app's optional native modules. Screen keep-awake uses the
// browser Screen Wake Lock API when available; otherwise it is a no-op.

let wakeLock: any = null;

export const KeepAwake = {
    async activateKeepAwakeAsync() {
        try {
            const nav: any = navigator as any;
            if (nav?.wakeLock?.request) {
                wakeLock = await nav.wakeLock.request('screen');
            }
        } catch {
            // unsupported / denied — silently disabled
        }
    },
    async deactivateKeepAwake() {
        try {
            await wakeLock?.release?.();
        } catch {
            // ignore
        }
        wakeLock = null;
    },
};
