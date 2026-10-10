import type { CapacitorConfig } from '@capacitor/cli';
import fs from 'node:fs';

// Optional local Firebase Android download; never commit project configuration.
let webClientId = process.env.GOOGLE_WEB_CLIENT_ID || '';
if (fs.existsSync('native/google-services.json')) {
  const firebase = JSON.parse(fs.readFileSync('native/google-services.json', 'utf8'));
  if (firebase.project_info?.project_id !== 'safe-havenai') throw new Error('Android Firebase project must match src/firebase.ts (safe-havenai).');
  const client = firebase.client?.find((entry: any) => entry.client_info?.android_client_info?.package_name === 'com.safehaven.ai');
  if (!client) throw new Error('Firebase Android download must register com.safehaven.ai.');
  webClientId = client.oauth_client?.find((entry: any) => entry.client_type === 3)?.client_id || webClientId;
  if (!webClientId) throw new Error('Enable Google sign-in, then download an updated google-services.json with a Web OAuth client.');
}

const emulatorPreview = process.env.SAFEHAVEN_EMULATOR_PREVIEW === '1';

const config: CapacitorConfig = {
  appId: 'com.safehaven.ai',
  appName: 'Meridian',
  webDir: 'dist',
  android: { allowMixedContent: false },
  plugins: { MeridianAuth: { webClientId } },
  ...(emulatorPreview ? { server: { url: 'http://10.0.2.2:5173', cleartext: true } } : {}),
};

export default config;
