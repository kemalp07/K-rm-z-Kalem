import { useMemo } from 'react';
import { Circle, FontWeight, Group, Path, RadialGradient, Shadow, vec } from '@shopify/react-native-skia';
import { ArtSlot } from '../art/ArtSlot';
import type { Day } from '../content/types';
import { Para } from '../scene/Para';
import { roughRect } from '../scene/rough';
import { LAYOUT } from '../scene/world';

/** The clerk's own scrap of reckoning, with what is left in coin beside it. */
export function MoneyNote({ purse }: { purse: Day['purse'] }) {
  const r = LAYOUT.purse;
  const shape = useMemo(() => roughRect(r, 'purse-note', 1.1, true), [r]);
  // Coins: a mecidiye-sized silver and a few coppers. Count follows the purse loosely.
  const coins = useMemo(() => {
    const n = Math.min(5, Math.max(1, Math.round(purse.kurus / 10)));
    const spots = [
      { dx: -24, dy: 62, r: 13, silver: true },
      { dx: -2, dy: 84, r: 9, silver: false },
      { dx: 18, dy: 88, r: 9, silver: false },
      { dx: -22, dy: 86, r: 8, silver: false },
      { dx: 38, dy: 86, r: 8, silver: false },
    ];
    return spots.slice(0, n);
  }, [purse.kurus]);

  return (
    <Group>
      <Group transform={[{ rotate: 0.09 }]} origin={{ x: r.x + r.w / 2, y: r.y + r.h / 2 }}>
        <ArtSlot slot="purse_note" rect={r} shadow>
          <Path path={shape} color="#e4d6b6">
            <Shadow dx={-3} dy={3} blur={3} color="rgba(0,0,0,0.5)" />
          </Path>
        </ArtSlot>
        <Para text={purse.line} x={r.x + 16} y={r.y + 14} width={r.w - 26} family="Caveat" size={16} color="#3d3226" weight={FontWeight.Medium} lineHeight={0.95} />
      </Group>
      {coins.map((c, i) => (
        <ArtSlot key={i} slot={c.silver ? 'coin_silver' : 'coin'} shadow rect={{ x: r.x + c.dx - c.r * 1.2, y: r.y + c.dy - c.r * 1.2, w: c.r * 2.4, h: c.r * 2.4 }}>
          <Group>
            <Circle cx={r.x + c.dx} cy={r.y + c.dy} r={c.r}>
              <RadialGradient
                c={vec(r.x + c.dx + c.r * 0.35, r.y + c.dy - c.r * 0.4)}
                r={c.r * 1.4}
                colors={c.silver ? ['#d9d6cc', '#8e8a80', '#55524b'] : ['#c88a52', '#8a5228', '#4a2a12']}
              />
              <Shadow dx={-1.5} dy={2} blur={1.5} color="rgba(0,0,0,0.6)" />
            </Circle>
            <Circle cx={r.x + c.dx} cy={r.y + c.dy} r={c.r * 0.72} style="stroke" strokeWidth={0.7} color={c.silver ? 'rgba(60,58,50,0.5)' : 'rgba(50,25,10,0.5)'} />
          </Group>
        </ArtSlot>
      ))}
    </Group>
  );
}
