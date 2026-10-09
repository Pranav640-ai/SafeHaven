import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'prompt',
    injectRegister: null,
    includeAssets: ['app-icon.svg'],
    manifest: {
      name: 'SafeHaven AI', short_name: 'SafeHaven', description: 'Travel planning and saved safety essentials',
      theme_color: '#306b58', background_color: '#eef1e6', display: 'standalone', start_url: '/',
      icons: [{src:'/app-icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}],
    },
    workbox: {globPatterns:['**/*.{js,css,html,svg,webp}'],navigateFallbackDenylist:[/^\/api/],cleanupOutdatedCaches:true},
  })],
  server: {proxy: {'/api': 'http://127.0.0.1:8000'}},
});
