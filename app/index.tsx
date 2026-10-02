import { View } from 'react-native';
import { FontsProvider } from '../src/scene/fonts';
import { DeskScreen } from '../src/scene/DeskScreen';
import { C } from '../src/scene/palette';
import { useGame } from '../src/state/store';

export default function Index() {
  const hydrated = useGame((g) => g.hydrated);
  const dark = <View style={{ flex: 1, backgroundColor: C.night }} />;
  if (!hydrated) return dark;
  return (
    <FontsProvider fallback={dark}>
      <DeskScreen />
    </FontsProvider>
  );
}
