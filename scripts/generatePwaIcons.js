const path = require('path');
const sharp = require('sharp');

// one-off: builds the home screen icons from public/logo.png. Run again if the logo changes.
// node scripts/generatePwaIcons.js
const root = path.join(__dirname, '..');
const source = path.join(root, 'public', 'logo.png');
const white = { r: 255, g: 255, b: 255, alpha: 1 };

// scale = how much of the square the crest takes up. Maskable icons get cropped to a
// circle or squircle by Android, so the crest must sit inside the middle 80%.
const icons = [
    { out: 'public/icons/icon-192.png', size: 192, scale: 0.86 },
    { out: 'public/icons/icon-512.png', size: 512, scale: 0.86 },
    { out: 'public/icons/icon-maskable-512.png', size: 512, scale: 0.62 },
    { out: 'src/app/apple-icon.png', size: 180, scale: 0.8 },
];

const build = async ({ out, size, scale }) => {
    const inner = Math.round(size * scale);
    const crest = await sharp(source)
        .resize(inner, inner, { fit: 'contain', background: white })
        .flatten({ background: white })
        .toBuffer();

    await sharp({ create: { width: size, height: size, channels: 4, background: white } })
        .composite([{ input: crest, gravity: 'center' }])
        .flatten({ background: white })
        .png()
        .toFile(path.join(root, out));

    console.log('[PwaIcons] Wrote', out);
};

(async () => {
    require('fs').mkdirSync(path.join(root, 'public', 'icons'), { recursive: true });
    for (const icon of icons) {
        await build(icon);
    }
})();
