import { useMemo } from 'react';
import { Circle, FontWeight, Group, Line, Path, vec } from '@shopify/react-native-skia';
import { t } from '../content/strings';
import { pinLabel, type Pin } from '../logic/pulse';
import { Para } from '../scene/Para';
import { C } from '../scene/palette';
import { roughRect } from '../scene/rough';
import { LAYOUT } from '../scene/world';

/** A cork and a string: each red ring becomes a scrap the clerk can look back at. */
export function PinRail({ pins, dossier }: { pins: Pin[]; dossier: number }) {
  const r = LAYOUT.pins;
  const shape = useMemo(() => roughRect(r, 'pin-rail', 1.2), [r]);
  const shown = pins.slice(-3);
  return (
    <Group>
      <Path path={shape} color="#6e4a2e" />
      <Line p1={vec(r.x + 10, r.y + 16)} p2={vec(r.x + r.w - 10, r.y + 16)} strokeWidth={1} color="rgba(40,24,12,0.7)" />
      <Para text={t('pin.title')} x={r.x + 8} y={r.y + 2} width={70} family="Cormorant" size={11} color="#f0e2c4" weight={FontWeight.Bold} letterSpacing={1.4} />
      {dossier > 0 && (
        <Para text={t('pin.file', { n: dossier })} x={r.x + r.w - 78} y={r.y + 2} width={70} family="Caveat" size={12} color="#f0d090" align="right" />
      )}
      {shown.length === 0 ? (
        <Para text={t('pin.empty')} x={r.x + 8} y={r.y + 24} width={r.w - 16} family="Caveat" size={12} color="rgba(240,226,196,0.7)" />
      ) : (
        shown.map((pin, i) => (
          <Group key={pin.id}>
            <Circle cx={r.x + 12} cy={r.y + 30 + i * 12} r={2.2} color={pin.wrong ? '#c4b49a' : C.censor} />
            <Para
              text={pinLabel(pin)}
              x={r.x + 18}
              y={r.y + 22 + i * 12}
              width={r.w - 26}
              family="Caveat"
              size={12}
              color={pin.wrong ? 'rgba(240,226,196,0.55)' : '#f4e7cc'}
            />
          </Group>
        ))
      )}
    </Group>
  );
}
