import { useCallback, useRef, useState } from 'react';
import CardGifWorker from '../lib/cardGif.worker.ts?worker';

const EXPORT_ERROR_BODY = "We couldn't export your animated Builder Card. Please try again.";

async function captureFaces(node: HTMLElement): Promise<ImageBitmap[]> {
  const { toCanvas } = await import('html-to-image');
  await document.fonts.ready;
  await Promise.all(Array.from(node.querySelectorAll('img')).map(image => image.decode()));
  const faces = Array.from(node.querySelectorAll<HTMLElement>('.builder-card-export__card-wrap'));
  if (faces.length !== 2) throw new Error('Export requires both card faces.');
  const bitmaps: ImageBitmap[] = [];
  const originalStyle = node.style.cssText;
  node.style.visibility = 'visible';
  node.style.left = '-10000px';
  try {
    for (const face of faces) {
      const canvas = await toCanvas(face, {
        width: 780, height: 500, pixelRatio: 1.5,
        style: { visibility: 'visible', transform: 'none', boxShadow: 'none' },
      });
      bitmaps.push(await createImageBitmap(canvas));
    }
    const response = await fetch('/assets/workshop-export.png');
    if (!response.ok) throw new Error('Workshop background could not be loaded.');
    bitmaps.push(await createImageBitmap(await response.blob()));
    return bitmaps;
  } catch (error) {
    bitmaps.forEach(bitmap => bitmap.close());
    throw error;
  } finally {
    node.style.cssText = originalStyle;
  }
}

export function useCardPhotoExport(builderName: string, canExport: boolean) {
  const captureRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportPhoto = useCallback(async () => {
    const node = captureRef.current;
    if (!node || !canExport || busyRef.current) return;
    busyRef.current = true;
    setIsGenerating(true);
    setExportError(null);
    let worker: Worker | undefined;
    let images: ImageBitmap[] = [];
    try {
      images = await captureFaces(node);
      worker = new CardGifWorker();
      const encoder = worker;
      const blob = await new Promise<Blob>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('GIF export timed out.')), 120000);
        encoder.onmessage = ({ data }: MessageEvent<Blob | { error: string }>) => {
          window.clearTimeout(timeout);
          if (data instanceof Blob) resolve(data);
          else reject(new Error(data.error));
        };
        encoder.onerror = () => {
          window.clearTimeout(timeout);
          reject(new Error('GIF encoder failed.'));
        };
        encoder.postMessage(images, images);
        images = [];
      });
      const slug = builderName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'builder';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `cryptita-builder-${slug}.gif`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      console.error('Could not generate BuilderCard GIF:', error);
      setExportError(EXPORT_ERROR_BODY);
    } finally {
      worker?.terminate();
      images.forEach(image => image.close());
      busyRef.current = false;
      setIsGenerating(false);
    }
  }, [builderName, canExport]);

  const clearExportError = useCallback(() => setExportError(null), []);
  return { captureRef, exportPhoto, isGenerating, exportError, clearExportError };
}
