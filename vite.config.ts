import { defineConfig,loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode})=>{
  const env=loadEnv(mode,process.cwd(),'VITE_');
  const apiBase=(process.env.VITE_API_BASE_URL||env.VITE_API_BASE_URL||'').replace(/\/+$/,'');
  return {
  plugins: [react(), tailwindcss(), {name:'safehaven-push-config',generateBundle(){this.emitFile({type:'asset',fileName:'push-config.js',source:`self.SAFEHAVEN_API_BASE=${JSON.stringify(apiBase)};`})}}, VitePWA({
    registerType: 'prompt',
    injectRegister: null,
    includeAssets: ['app-icon.svg','app-icon-192.png','app-icon-512.png'],
    manifest: {
      name: 'Meridian', short_name: 'Meridian', description: 'Travel planning and saved safety essentials',
      theme_color: '#306b58', background_color: '#eef1e6', display: 'standalone', start_url: '/',
      icons: [{src:'/app-icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/app-icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'/app-icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}],
    },
    workbox: {importScripts:['push-config.js','push-worker.js'],globPatterns:['**/*.{js,css,html,svg,webp}'],navigateFallbackDenylist:[/^\/api/],cleanupOutdatedCaches:true},
  })],
  server: {proxy: {'/api': 'http://127.0.0.1:8000'}},
};});
