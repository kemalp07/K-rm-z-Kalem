/**
 * Phones report 3 device pixels per point; drawing the whole scene at that density
 * every frame is more than mobile browsers can fill. Two is visually the same for
 * painted art and draws well under half the pixels. Must run before Skia loads: it
 * reads the ratio once, when its module is evaluated.
 */
const MAX_RATIO = 2;
if (typeof window !== 'undefined' && window.devicePixelRatio > MAX_RATIO) {
  Object.defineProperty(window, 'devicePixelRatio', { get: () => MAX_RATIO, configurable: true });
}
export {};
