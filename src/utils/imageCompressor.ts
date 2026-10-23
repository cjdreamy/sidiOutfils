/**
 * Compresses and resizes uploaded image files on the client using an HTML5 Canvas
 * so that bulk mobile photo uploads fit comfortably inside Firestore document limits
 * (< 650,000 chars) while remaining sharp on Retina mobile & desktop screens.
 */
export async function compressImageFileToDataUri(
  file: File,
  maxDimension = 760,
  quality = 0.78
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image file.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        // Fill subtle warm stone backdrop in case of transparent PNGs
        ctx.fillStyle = '#F6F2EE';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (dataUrl.length > 580000) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.55);
        }
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function formatFilenameToProductTitle(filename: string, index: number): string {
  const withoutExt = filename.replace(/\.[^/.]+$/, '');
  const cleaned = withoutExt
    .replace(/[_-]+/g, ' ')
    .replace(/\b(IMG|DSC|PHOTO|WA|SCREENSHOT|IMAGE)\b/gi, '')
    .replace(/\d{4,}/g, '')
    .trim();

  if (!cleaned || cleaned.length < 2) {
    return `Sidi Signature Piece #${index + 1}`;
  }

  return cleaned
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .slice(0, 80);
}
