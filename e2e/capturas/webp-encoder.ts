import type { Page } from '@playwright/test';

/**
 * Re-encodes a PNG as lossy WebP with the encoder of Chromium itself, so the screenshots of the README are small
 * without a native image library (RT-06): the page decodes the PNG and draws it on an `OffscreenCanvas`.
 * A UI screenshot has flat areas and sharp text: quality 0.9 keeps the text readable at a fraction of the PNG size.
 */
export async function encodeWebp(page: Page, png: Buffer, quality: number): Promise<Buffer> {
  const base64 = await page.evaluate(
    async ({ data, q }) => {
      const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
      const blob = await canvas.convertToBlob({ type: 'image/webp', quality: q });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return btoa(binary);
    },
    { data: png.toString('base64'), q: quality },
  );
  return Buffer.from(base64, 'base64');
}
