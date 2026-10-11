import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Text, useWindowDimensions, View } from 'react-native';
import { t } from '../src/content/strings';
import { C } from '../src/scene/palette';
import { useGame } from '../src/state/store';

export default function Index() {
  const hydrated = useGame((g) => g.hydrated);
  const { width, height } = useWindowDimensions();
  // Skia's web build reads CanvasKit the moment its module is imported. The router
  // evaluates this file before that wasm exists, so the desk and its fonts load after.
  const [desk, setDesk] = useState<ReactNode>(null);
  useEffect(() => {
    let live = true;
    Promise.all([import('../src/scene/fonts'), import('../src/scene/DeskScreen')]).then(([fonts, screen]) => {
      if (!live) return;
      const { FontsProvider } = fonts;
      const { DeskScreen } = screen;
      setDesk(
        <FontsProvider fallback={<View style={{ flex: 1, backgroundColor: C.night }} />}>
          <DeskScreen />
        </FontsProvider>,
      );
    });
    return () => {
      live = false;
    };
  }, []);
  const dark = <View style={{ flex: 1, backgroundColor: C.night }} />;
  // The app locks landscape; a phone browser can't, so ask instead.
  if (Platform.OS === 'web' && height > width) {
    return (
      <View style={{ flex: 1, backgroundColor: C.night, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#c9b88f', fontSize: 20, fontStyle: 'italic' }}>{t('web.rotate')}</Text>
      </View>
    );
  }
  if (!hydrated || !desk) return dark;
  return desk;
}
