import type { CapacitorConfig } from '@capacitor/cli';

const emulatorPreview = process.env.SAFEHAVEN_EMULATOR_PREVIEW === '1';

const config: CapacitorConfig = {
  appId: 'com.safehaven.ai',
  appName: 'SafeHaven AI',
  webDir: 'dist',
  android: { allowMixedContent: false },
  ...(emulatorPreview ? { server: { url: 'http://10.0.2.2:5173', cleartext: true } } : {}),
};

export default config;
