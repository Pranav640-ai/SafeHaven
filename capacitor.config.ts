import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.safehaven.ai',
  appName: 'SafeHaven AI',
  webDir: 'dist',
  android: { allowMixedContent: false },
};

export default config;
