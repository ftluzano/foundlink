/**
 * Utility to process uploaded user images into exactly 500x500 Base64 strings
 * with center-crop aspect ratio fit and high quality.
 */
export async function resizeImageToBase64(
  file: File,
  targetWidth = 500,
  targetHeight = 500
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Unable to create canvas context.'));
          return;
        }

        // Calculate aspect fill / cover center-crop dimensions
        const sourceWidth = img.width;
        const sourceHeight = img.height;
        const targetRatio = targetWidth / targetHeight;
        const sourceRatio = sourceWidth / sourceHeight;

        let renderWidth = targetWidth;
        let renderHeight = targetHeight;
        let offsetX = 0;
        let offsetY = 0;

        if (sourceRatio > targetRatio) {
          // Source is wider than target
          renderHeight = targetHeight;
          renderWidth = targetHeight * sourceRatio;
          offsetX = (targetWidth - renderWidth) / 2;
        } else {
          // Source is taller than target
          renderWidth = targetWidth;
          renderHeight = targetWidth / sourceRatio;
          offsetY = (targetHeight - renderHeight) / 2;
        }

        // Enable high quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image centered and scaled
        ctx.drawImage(img, offsetX, offsetY, renderWidth, renderHeight);

        // Convert to high-quality JPEG Base64 string
        const base64Data = canvas.toDataURL('image/jpeg', 0.88);
        resolve(base64Data);
      };

      if (readerEvent.target?.result) {
        img.src = readerEvent.target.result as string;
      } else {
        reject(new Error('Empty file content.'));
      }
    };

    reader.readAsDataURL(file);
  });
}
