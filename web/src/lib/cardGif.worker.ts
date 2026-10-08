import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { EXPORT_WIDTH, EXPORT_HEIGHT, EXPORT_CARD_WIDTH } from './cardPhotoExport';

self.onmessage = ({ data: [front, back, background] }: MessageEvent<ImageBitmap[]>) => {
  try {
    const canvas = new OffscreenCanvas(EXPORT_WIDTH, EXPORT_HEIGHT);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas is unavailable.');
    const gif = GIFEncoder();
    const frames = 60;
    const cardHeight = EXPORT_CARD_WIDTH / 1.56;
    for (let frame = 0; frame < frames; frame++) {
      ctx.fillStyle = '#b245ef';
      ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
      // The artwork fills the square output without cropping or padding.
      ctx.drawImage(background, 0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
      const angle = frame / frames * Math.PI * 2;
      const cosine = Math.cos(angle);
      const face = cosine >= 0 ? front : back;
      // Project narrow vertical strips to give the turning card perspective.
      for (let x = 0; x < EXPORT_CARD_WIDTH; x += 2) {
        const project = (position: number) => {
          const local = position - EXPORT_CARD_WIDTH / 2;
          const depth = local * Math.sin(angle) * (cosine >= 0 ? 1 : -1);
          const perspective = EXPORT_CARD_WIDTH * (1600 / 780);
          const scale = perspective / (perspective + depth);
          return { x: EXPORT_WIDTH / 2 + local * Math.abs(cosine) * scale, scale };
        };
        const left = project(x);
        const stripWidth = Math.min(2, EXPORT_CARD_WIDTH - x);
        const right = project(x + stripWidth);
        const height = cardHeight * left.scale;
        ctx.drawImage(face, x / EXPORT_CARD_WIDTH * face.width, 0,
          stripWidth / EXPORT_CARD_WIDTH * face.width, face.height,
          left.x, (EXPORT_HEIGHT - height) / 2, Math.max(0.3, right.x - left.x + 0.4), height);
      }
      const pixels = ctx.getImageData(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT).data;
      const palette = quantize(pixels, 256);
      gif.writeFrame(applyPalette(pixels, palette), EXPORT_WIDTH, EXPORT_HEIGHT, {
        palette, delay: frame === 0 || frame === frames / 2 ? 800 : 70, repeat: 0,
      });
    }
    gif.finish();
    self.postMessage(new Blob([gif.bytesView()], { type: 'image/gif' }));
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'GIF encoding failed.' });
  } finally {
    front.close();
    back.close();
    background.close();
  }
};
