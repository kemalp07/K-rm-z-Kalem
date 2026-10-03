import { Platform, Text, useWindowDimensions, View } from 'react-native';
import { t } from '../src/content/strings';
import { FontsProvider } from '../src/scene/fonts';
import { DeskScreen } from '../src/scene/DeskScreen';
import { C } from '../src/scene/palette';
import { useGame } from '../src/state/store';

export default function Index() {
  const hydrated = useGame((g) => g.hydrated);
  const { width, height } = useWindowDimensions();
  const dark = <View style={{ flex: 1, backgroundColor: C.night }} />;
  // The app locks landscape; a phone browser can't, so ask instead.
  if (Platform.OS === 'web' && height > width) {
    return (
      <View style={{ flex: 1, backgroundColor: C.night, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#c9b88f', fontSize: 20, fontStyle: 'italic' }}>{t('web.rotate')}</Text>
      </View>
    );
  }
  if (!hydrated) return dark;
  return (
    <FontsProvider fallback={dark}>
      <DeskScreen />
    </FontsProvider>
  );
}
