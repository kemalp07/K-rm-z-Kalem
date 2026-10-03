import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

declare const process: { env: Record<string, string | undefined> };

/** Web: load CanvasKit; its wasm file is served next to the page. */
export async function prepareSkia(): Promise<void> {
  const base = process.env.EXPO_BASE_URL ?? '';
  await LoadSkiaWeb({ locateFile: (file: string) => `${base}/${file}` });
}
