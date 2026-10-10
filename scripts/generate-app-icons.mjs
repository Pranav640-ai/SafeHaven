import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

// Rasterize the licensed upstream symbol without changing any in-app artwork.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'native/icon-source/shield-check.svg'), 'utf8');
const paths = source.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>[\s\S]*$/, '');
const glyph = `<g fill="none" stroke="#f4f5e8" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</g>`;
const svg = (adaptive = false) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">${adaptive ? '' : '<rect width="108" height="108" rx="23" fill="#306b58"/>'}<g transform="translate(24 24) scale(2.5)">${glyph}</g></svg>`;
fs.writeFileSync(path.join(root, 'public/app-icon.svg'), svg());
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  const render = async (file, size, adaptive = false) => {
    const data = await page.evaluate(async ({ source, size }) => {
      const image = new Image();
      image.src = `data:image/svg+xml;base64,${btoa(source)}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      canvas.getContext('2d').drawImage(image, 0, 0, size, size);
      return canvas.toDataURL('image/png').split(',')[1];
    }, { source: svg(adaptive), size });
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, Buffer.from(data, 'base64'));
  };
  await render('public/app-icon-192.png', 192);
  await render('public/app-icon-512.png', 512);
  for (const [density, scale] of Object.entries({ mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 })) {
    const dir = `native/resources/mipmap-${density}`;
    await render(`${dir}/ic_launcher.png`, 48 * scale);
    await render(`${dir}/ic_launcher_round.png`, 48 * scale);
    await render(`${dir}/ic_launcher_foreground.png`, 108 * scale, true);
  }
} finally {
  await browser.close();
}
console.log('Generated web and Android app icons from the Lucide shield-check source.');
