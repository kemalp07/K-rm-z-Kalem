import { Group, LinearGradient, RoundedRect, Shadow, vec } from '@shopify/react-native-skia';
import { ArtSlot } from '../art/ArtSlot';
import { LAYOUT } from '../scene/world';

/** A shut drawer. What has not been issued is not shown. */
export function LockedTray() {
  const r = LAYOUT.tray;
  return (
    <Group>
      <ArtSlot slot="tray" rect={r} shadow>
        <RoundedRect x={r.x} y={r.y} width={r.w} height={r.h} r={5}>
          <LinearGradient start={vec(r.x, r.y)} end={vec(r.x, r.y + r.h)} colors={['#120c08', '#1b120b']} />
          <Shadow dx={-3} dy={4} blur={5} color="rgba(0,0,0,0.7)" />
          <Shadow dx={0} dy={2} blur={3} color="rgba(0,0,0,0.9)" inner />
        </RoundedRect>
        <RoundedRect x={r.x + 6} y={r.y + 6} width={r.w - 12} height={r.h - 12} r={3} color="#16110e" />
      </ArtSlot>
    </Group>
  );
}
