import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { prepareSkia } from '../src/platform/prepareSkia';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    prepareSkia().then(() => setReady(true));
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#141c2a' }}>
      <StatusBar hidden />
      {ready && <Stack screenOptions={{ headerShown: false, animation: 'none' }} />}
    </GestureHandlerRootView>
  );
}
