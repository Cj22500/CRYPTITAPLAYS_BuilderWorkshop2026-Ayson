import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/cardGif.worker.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const settings = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/cardPhotoExport.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: settings });
const frames = [];
const draws = [];
let result;
let failCanvas = false;
const context = {
  fillRect() {},
  drawImage(...args) { draws.push(args); },
  getImageData() { return { data: new Uint8ClampedArray(4) }; },
};
const worker = { postMessage(value) { result = value; } };
vm.runInNewContext(code, {
  exports: {}, self: worker, Blob, Uint8Array,
  OffscreenCanvas: class { getContext() { return failCanvas ? null : context; } },
  require(name) {
    if (name === './cardPhotoExport') return settings;
    return {
      quantize: () => [[0, 0, 0]], applyPalette: () => new Uint8Array(1),
      GIFEncoder: () => ({ writeFrame: (...args) => frames.push(args), finish() {}, bytes: () => new Uint8Array([71, 73, 70]) }),
    };
  },
});
let closed = 0;
const images = ['front', 'back', 'background'].map(name => ({ name, width: 1170, height: 750, close() { closed++; } }));
worker.onmessage({ data: images });
assert.equal(result.type, 'image/gif');
assert.equal(frames.length, 60);
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
