/** Native: Skia is linked into the app, nothing to wait for. */
export function prepareSkia(): Promise<void> {
  return Promise.resolve();
}
