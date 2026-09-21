import { readFileSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const source = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8')
  .replace(/fill:color\(display-p3 [^)]+\);?/g, '');
const inner = source.match(/^<svg[^>]*>([\s\S]*)<\/svg>\s*$/)?.[1];
if (!inner) throw new Error('Unable to read the LoopPocket SVG logo');

for (const [name, size, scale] of [
  ['icon-192.png', 192, 0.68],
  ['icon-512.png', 512, 0.68],
  ['icon-maskable-512.png', 512, 0.55],
  ['apple-touch-icon.png', 180, 0.68],
]) {
  const factor = size * scale / 48;
  const x = (size - 48 * factor) / 2;
  const y = (size - 46 * factor) / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="#0E0F13"/>
    <g transform="translate(${x} ${y}) scale(${factor})">${inner}</g>
  </svg>`;
  const image = new Resvg(svg).render().asPng();
  writeFileSync(new URL(`../public/${name}`, import.meta.url), image);
  process.stdout.write(`${name}: ${image.length} bytes\n`);
}
