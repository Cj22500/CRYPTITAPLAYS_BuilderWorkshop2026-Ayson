declare module 'gifenc' {
  export function quantize(pixels: Uint8Array | Uint8ClampedArray, maxColors: number, options?: { format: 'rgb444' }): number[][];
  export function applyPalette(pixels: Uint8Array | Uint8ClampedArray, palette: number[][], format?: 'rgb444'): Uint8Array;
  export function GIFEncoder(): {
    writeFrame(pixels: Uint8Array, width: number, height: number, options: {
      palette?: number[][]; delay: number; repeat: number;
    }): void;
    finish(): void;
    bytesView(): Uint8Array<ArrayBuffer>;
  };
}
