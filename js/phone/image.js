// Turns a camera-roll photo into a small square JPEG data URL before upload.
// Phone photos are several MB; data channels and 24 phones want ~20 KB.
import { PICTURE_SIZE, PICTURE_MAX_BYTES } from '../config.js';

/**
 * @param {File} file
 * @returns {Promise<string>} data:image/jpeg;base64,...
 */
export async function compressPicture(file, size = PICTURE_SIZE, maxBytes = PICTURE_MAX_BYTES) {
  const img = await loadImage(file);
  // Center-crop to a square, then scale down.
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

  // Step the quality down until it fits.
  for (const q of [0.82, 0.7, 0.58, 0.45, 0.32]) {
    const url = canvas.toDataURL('image/jpeg', q);
    if (url.length <= maxBytes) return url;
  }
  throw new Error('That picture is too detailed to shrink. Try another one.');
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    // Modern Safari/Chrome apply EXIF rotation to <img> automatically.
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that picture. Try a JPEG or PNG."));
    };
    img.src = url;
  });
}
