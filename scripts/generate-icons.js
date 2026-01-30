const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgContent = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="96" fill="#0f172a"/>
  <circle cx="256" cy="256" r="140" fill="none" stroke="#ffffff" stroke-width="28"/>
  <path d="M176 256L224 304L336 176" stroke="#ffffff" stroke-width="28" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

const sizes = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
];

async function generateIcons() {
  const iconsDir = path.join(__dirname, '..', 'public', 'icons');
  const publicDir = path.join(__dirname, '..', 'public');

  // Ensure directories exist
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  for (const { size, name } of sizes) {
    const outputPath = name === 'apple-touch-icon.png'
      ? path.join(publicDir, name)
      : path.join(iconsDir, name);

    await sharp(Buffer.from(svgContent))
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`Generated ${name} (${size}x${size})`);
  }

  // Generate favicon.ico (32x32)
  await sharp(Buffer.from(svgContent))
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('Generated favicon.png (32x32)');

  console.log('\nDone! Icons generated in public/icons/');
}

generateIcons().catch(console.error);
