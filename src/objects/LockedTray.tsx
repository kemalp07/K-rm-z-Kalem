import { useMemo } from 'react';
import { Circle, Group, Line, LinearGradient, Path, Rect, RoundedRect, Shadow, vec } from '@shopify/react-native-skia';
import { ArtSlot } from '../art/ArtSlot';
import { t } from '../content/strings';
import { Para } from '../scene/Para';
import { roughRect } from '../scene/rough';
import { LAYOUT } from '../scene/world';

const GHOST = 'rgba(150,130,100,0.16)';
const GHOST_EDGE = 'rgba(180,160,120,0.22)';

/** Tools not yet issued: grille, cipher disc, code book — outlines in a dark tray, out of reach. */
export function LockedTray() {
  const r = LAYOUT.tray;
  const tag = useMemo(() => roughRect({ x: r.x + 96, y: r.y + r.h - 22, w: 78, h: 17 }, 'tray-tag', 0.6), [r]);
  const disc = { cx: r.x + 118, cy: r.y + 44, r: 28 };
  return (
    <Group>
      <ArtSlot slot="tray" rect={r}>
        <RoundedRect x={r.x} y={r.y} width={r.w} height={r.h} r={5}>
          <LinearGradient start={vec(r.x, r.y)} end={vec(r.x, r.y + r.h)} colors={['#120c08', '#1b120b']} />
          <Shadow dx={-3} dy={4} blur={5} color="rgba(0,0,0,0.7)" />
          <Shadow dx={0} dy={2} blur={3} color="rgba(0,0,0,0.9)" inner />
        </RoundedRect>
        {/* felt lining */}
        <RoundedRect x={r.x + 6} y={r.y + 6} width={r.w - 12} height={r.h - 12} r={3} color="#1f1a17" />
      </ArtSlot>

      {/* Cardan grille: a card with irregular windows */}
      <Group>
        <Rect x={r.x + 14} y={r.y + 14} width={58} height={74} color={GHOST} />
        {[
          [20, 22, 18],
          [44, 30, 14],
          [24, 44, 22],
          [30, 60, 12],
          [48, 70, 16],
        ].map(([dx, dy, w], i) => (
          <Rect key={i} x={r.x + dx!} y={r.y + dy!} width={w!} height={4} color="rgba(10,8,6,0.8)" />
        ))}
      </Group>

      {/* Cipher disc */}
      <Group>
        <Circle cx={disc.cx} cy={disc.cy} r={disc.r} color={GHOST} />
        <Circle cx={disc.cx} cy={disc.cy} r={disc.r * 0.66} style="stroke" strokeWidth={1} color={GHOST_EDGE} />
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return (
            <Line
              key={i}
              p1={vec(disc.cx + Math.cos(a) * disc.r * 0.7, disc.cy + Math.sin(a) * disc.r * 0.7)}
              p2={vec(disc.cx + Math.cos(a) * disc.r * 0.95, disc.cy + Math.sin(a) * disc.r * 0.95)}
              strokeWidth={0.8}
              color={GHOST_EDGE}
            />
          );
        })}
        <Circle cx={disc.cx} cy={disc.cy} r={2} color={GHOST_EDGE} />
      </Group>

      {/* Code book, spine to the right */}
      <Group>
        <RoundedRect x={r.x + 152} y={r.y + 14} width={20} height={64} r={2} color={GHOST} />
        <Line p1={vec(r.x + 156, r.y + 18)} p2={vec(r.x + 156, r.y + 74)} strokeWidth={0.8} color={GHOST_EDGE} />
      </Group>

      <Path path={tag} color="rgba(200,185,150,0.28)" />
      <Para text={t('tray.locked')} x={r.x + 96} y={r.y + r.h - 21} width={78} family="Caveat" size={11} color="rgba(30,20,10,0.75)" align="center" />
    </Group>
  );
}
