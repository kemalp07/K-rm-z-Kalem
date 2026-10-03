import '../src/platform/capPixelRatio';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DebugOverlay } from '../src/platform/DebugOverlay';
import { prepareSkia } from '../src/platform/prepareSkia';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    prepareSkia()
      // Skia's module may only be evaluated once CanvasKit is loaded (web), hence the late import.
      .then(() => import('../src/art/preload'))
      .then((m) => m.preloadArt())
      .then(() => setReady(true));
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#141c2a' }}>
      <StatusBar hidden />
      {ready && <Stack screenOptions={{ headerShown: false, animation: 'none' }} />}
      <DebugOverlay />
    </GestureHandlerRootView>
  );
}
