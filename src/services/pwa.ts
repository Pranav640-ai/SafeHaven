import { Capacitor } from '@capacitor/core';
import { registerSW } from 'virtual:pwa-register';
export let offlineReady = false;
export let updateAvailable = false;
export let updateApp: () => Promise<void> = async () => { };
if (!Capacitor.isNativePlatform()) {
    const update = registerSW({
        onOfflineReady() { offlineReady = true; window.dispatchEvent(new Event('safehaven:pwa')); },
        onNeedRefresh() { updateAvailable = true; window.dispatchEvent(new Event('safehaven:pwa')); },
    });
    updateApp = () => update(true);
}
