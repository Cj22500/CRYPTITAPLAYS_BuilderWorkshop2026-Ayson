import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/cardGif.worker.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const settings = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/cardPhotoExport.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: settings });
const frames = [];
const draws = [];
let result;
let failCanvas = false;
let paletteCalls = 0;
const context = {
  fillRect() {},
  drawImage(...args) { draws.push(args); },
  getImageData() { return { data: new Uint8ClampedArray(4) }; },
};
const worker = { postMessage(value) { result = value; } };
vm.runInNewContext(code, {
  exports: {}, self: worker, Blob, Uint8Array,
  OffscreenCanvas: class {
    constructor(width) { this.width = width; }
    getContext() {
      if (failCanvas) return null;
      return this.width === 256 ? { ...context, drawImage() {} } : context;
    }
  },
  require(name) {
    if (name === './cardPhotoExport') return settings;
    return {
      quantize: (_pixels, _colors, options) => { paletteCalls++; assert.equal(options.format, 'rgb444'); return [[0, 0, 0]]; },
      applyPalette: (_pixels, _palette, format) => { assert.equal(format, 'rgb444'); return new Uint8Array(1); },
      GIFEncoder: () => ({ writeFrame: (...args) => frames.push(args), finish() {}, bytesView: () => new Uint8Array([71, 73, 70]) }),
    };
  },
});
let closed = 0;
const images = ['front', 'back', 'background'].map(name => ({ name, width: 1170, height: 750, close() { closed++; } }));
worker.onmessage({ data: images });
assert.equal(result.type, 'image/gif');
assert.equal(frames.length, 60);
assert.equal(paletteCalls, 1);
assert.ok(frames[0][3].palette);
assert.ok(frames.slice(1).every(([, , , options]) => options.palette === undefined));
assert.ok(frames.every(([, width, height, options]) => width === 1600 && height === 1600 && options.repeat === 0));
assert.equal(frames[0][3].delay, 800);
assert.equal(frames[30][3].delay, 800);
assert.equal(draws[1][0].name, 'front');
assert.equal(draws[30 * (Math.ceil(settings.EXPORT_CARD_WIDTH / 2) + 1) + 1][0].name, 'back');
assert.ok(draws.every(args => args.slice(1).every(Number.isFinite)));
assert.deepEqual(draws[0].slice(1), [0, 0, 1600, 1600]);
assert.ok(draws.filter(args => args[0].name !== 'background').every(args => args[1] + args[3] <= args[0].width + 0.001));
assert.equal(closed, 3);
failCanvas = true;
worker.onmessage({ data: images });
assert.ok(result.error);
assert.equal(closed, 6);
console.log('GIF worker checks passed: dimensions, looping, face sequence, pauses, finite projection, failure and cleanup.');

// Exercise the real encoder with full-size, varied-color frames; the mocks above cannot catch slow quantization.
const gifenc = createRequire(import.meta.url)('gifenc');
vm.runInNewContext(code, {
  exports: {}, self: worker, Blob, Uint8Array,
  OffscreenCanvas: class {
    constructor(width, height) {
      this.pixels = new Uint8ClampedArray(width * height * 4);
      for (let i = 0; i < width * height; i++) {
        this.pixels.set([i % 256, (i >> 4) % 256, (i >> 8) % 256, 255], i * 4);
      }
    }
    getContext() {
      return { fillRect() {}, drawImage() {}, getImageData: () => ({ data: this.pixels }) };
    }
  },
  require: name => name === './cardPhotoExport' ? settings : gifenc,
});
const started = performance.now();
worker.onmessage({ data: images });
assert.ok(result instanceof Blob, result?.error);
const bytes = new Uint8Array(await result.arrayBuffer());
assert.equal(new TextDecoder().decode(bytes.slice(0, 6)), 'GIF89a');
assert.equal(bytes[6] | bytes[7] << 8, 1600);
assert.equal(bytes[8] | bytes[9] << 8, 1600);
assert.equal(bytes.at(-1), 0x3b);
assert.ok(performance.now() - started < 120000, 'Encoding exceeded the export timeout');
console.log(`Real encoder: 60 full-size frames in ${((performance.now() - started) / 1000).toFixed(1)}s, ${(bytes.length / 1048576).toFixed(1)} MiB.`);
