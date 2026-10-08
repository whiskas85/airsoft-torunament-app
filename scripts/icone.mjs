// Genera le icone PNG dell'app da un SVG (una volta sola: le PNG si versionano). node scripts/icone.mjs
import sharp from 'sharp';

const svg = (margine) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#141a12"/>
  <g transform="translate(256 256) scale(${1 - margine})">
    <circle r="150" fill="none" stroke="#b6d36b" stroke-width="34"/>
    <circle r="22" fill="#b6d36b"/>
    <path d="M0 -230 V-95 M0 95 V230 M-230 0 H-95 M95 0 H230" stroke="#b6d36b" stroke-width="34" stroke-linecap="round"/>
  </g>
</svg>`);

await sharp(svg(0.05)).resize(192).png().toFile('public/icona-192.png');
await sharp(svg(0.05)).resize(512).png().toFile('public/icona-512.png');
await sharp(svg(0.3)).resize(512).png().toFile('public/icona-mascherabile-512.png');
await sharp(svg(0.12)).resize(180).png().toFile('public/apple-touch-icon.png');
console.log('icone create');
