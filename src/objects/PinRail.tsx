import { useMemo } from 'react';
import { Circle, Group, Path } from '@shopify/react-native-skia';
import { t } from '../content/strings';
import { pinLabel, type Pin } from '../logic/pulse';
import { Para } from '../scene/Para';
import { C } from '../scene/palette';
import { roughRect } from '../scene/rough';
import { LAYOUT } from '../scene/world';

/** Scraps the clerk has actually ringed. An empty cork would only be explaining the game. */
export function PinRail({ pins, dossier }: { pins: Pin[]; dossier: number }) {
  const r = LAYOUT.pins;
  const shape = useMemo(() => roughRect(r, 'pin-rail', 1.2), [r]);
  const shown = pins.slice(-3);
  if (shown.length === 0 && dossier <= 0) return null;
  return (
    <Group>
      <Path path={shape} color="#5c3d26" />
      {dossier > 0 && (
        <Para text={t('pin.file', { n: dossier })} x={r.x + 8} y={r.y + 2} width={r.w - 16} family="Caveat" size={12} color="rgba(232,214,180,0.8)" align="right" />
      )}
      {shown.map((pin, i) => (
        <Group key={pin.id}>
          <Circle cx={r.x + 12} cy={r.y + 24 + i * 13} r={2} color={pin.wrong ? '#8a7b68' : C.censor} />
          <Para
            text={pinLabel(pin)}
            x={r.x + 18}
            y={r.y + 16 + i * 13}
            width={r.w - 26}
            family="Caveat"
            size={12}
            color={pin.wrong ? 'rgba(232,214,180,0.45)' : '#eadcc4'}
          />
        </Group>
      ))}
    </Group>
  );
}
