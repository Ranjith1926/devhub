/**
 * fix-icon.mjs
 * Makes the black background of icon.png transparent, then saves it
 * so tauri icon can regenerate proper .ico/.icns files.
 */

import { Jimp } from 'jimp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC  = join(__dirname, '../src-tauri/icons/icon.png');
const DEST = join(__dirname, '../src-tauri/icons/icon.png');

const img = await Jimp.read(SRC);
const { width, height } = img.bitmap;

// Replace near-black pixels (all channels < 30) with full transparency
img.scan(0, 0, width, height, function (x, y, idx) {
  const r = this.bitmap.data[idx + 0];
  const g = this.bitmap.data[idx + 1];
  const b = this.bitmap.data[idx + 2];
  if (r < 30 && g < 30 && b < 30) {
    this.bitmap.data[idx + 3] = 0;
  }
});

await img.write(DEST);
console.log('✓ Transparent icon saved to', DEST);
