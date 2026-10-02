import { useMemo } from 'react';
import { BlurMask, Circle, Group, LinearGradient, Path, Rect, Skia, vec } from '@shopify/react-native-skia';
import { ArtSlot } from '../art/ArtSlot';
import { C } from './palette';
import { between, rng } from './rand';
import { shakyLine } from './rough';
import { LAYOUT } from './world';

/** Night window on the left: sky, the strait, one far light across the water. */
export function NightWindow() {
  const { x, y, w, h } = LAYOUT.window;
  const frame = 9;
  const inner = { x: x + frame, y: y + frame, w: w - frame * 2 - 4, h: h - frame * 2 - 14 };
  const parts = useMemo(() => {
    const r = rng('window-stars');
    const stars = Array.from({ length: 16 }, (_, i) => ({
      k: i,
      cx: between(r, inner.x + 4, inner.x + inner.w - 4),
      cy: between(r, inner.y + 4, inner.y + inner.h * 0.62),
      r: between(r, 0.4, 1.2),
      a: between(r, 0.25, 0.8),
    }));
    // Far shore: a low ridge line above the water.
    const rb = Skia.PathBuilder.Make();
    const horizon = inner.y + inner.h * 0.7;
    rb.moveTo(inner.x, horizon);
    for (let i = 0; i <= 12; i++) {
      const px = inner.x + (inner.w * i) / 12;
      rb.lineTo(px, horizon - 6 - Math.sin(i * 0.9) * 4 - between(r, 0, 4));
    }
    rb.lineTo(inner.x + inner.w, horizon + 2);
    rb.lineTo(inner.x, horizon + 2);
    rb.close();
    const ridge = rb.build();
    const ripples = Array.from({ length: 5 }, (_, i) =>
      shakyLine(inner.x + 10 + i * 9, horizon + 10 + i * 9, inner.x + 34 + i * 14, horizon + 10 + i * 9, `rip${i}`, 0.3),
    );
    return { stars, ridge, horizon, ripples };
  }, [inner.x, inner.y, inner.w, inner.h]);

  const midX = inner.x + inner.w / 2;
  const midY = inner.y + inner.h * 0.48;

  return (
    <ArtSlot slot="window" rect={LAYOUT.window}>
      <Group>
        {/* Wall and recess; the wall runs on past the board for wide screens */}
        <Rect x={x - 340} y={y} width={w + 340} height={h} color="#120b07" />
        <Rect x={inner.x} y={inner.y} width={inner.w} height={inner.h}>
          <LinearGradient start={vec(0, inner.y)} end={vec(0, inner.y + inner.h)} colors={['#101a2e', '#1b2a44', '#2a3b58']} />
        </Rect>
        {parts.stars.map((s) => (
          <Circle key={s.k} cx={s.cx} cy={s.cy} r={s.r} color={`rgba(220,228,255,${s.a})`} />
        ))}
        {/* Thin moon, low and to the side */}
        <Group>
          <Circle cx={inner.x + inner.w - 26} cy={inner.y + 28} r={9} color="rgba(232,236,220,0.85)">
            <BlurMask blur={1} style="solid" />
          </Circle>
          <Circle cx={inner.x + inner.w - 22} cy={inner.y + 25} r={8.6} color={C.nightDeep} />
        </Group>
        <Path path={parts.ridge} color="#070a10" />
        <Rect x={inner.x} y={parts.horizon + 2} width={inner.w} height={inner.y + inner.h - parts.horizon - 2} color="#142035" />
        {parts.ripples.map((p, i) => (
          <Path key={i} path={p} style="stroke" strokeWidth={0.6} color="rgba(190,205,235,0.18)" />
        ))}
        {/* One light on the far shore: a lantern, or something else. */}
        <Circle cx={inner.x + 34} cy={parts.horizon - 3} r={1.4} color="#ffcf7a">
          <BlurMask blur={2.5} style="solid" />
        </Circle>

        {/* Frame and mullions, painted wood gone dark */}
        <Group color="#3b2516">
          <Rect x={x} y={y} width={w - 4} height={frame} />
          <Rect x={x} y={y} width={frame} height={h - 14} />
          <Rect x={x + w - frame - 4} y={y} width={frame} height={h - 14} />
          <Rect x={midX - 3} y={inner.y} width={6} height={inner.h} />
          <Rect x={inner.x} y={midY - 3} width={inner.w} height={6} />
        </Group>
        {/* Sill — catches a little lamplight on its front edge */}
        <Rect x={x - 340} y={y + h - 16} width={w + 342} height={14} color="#4a2f1b" />
        <Rect x={x - 340} y={y + h - 4} width={w + 342} height={2} color="rgba(255,210,140,0.18)" />
        <Path path={shakyLine(x - 340, y + h - 2, x + w + 2, y + h - 2, 'sillshadow', 0.4)} style="stroke" strokeWidth={4} color="rgba(0,0,0,0.5)">
          <BlurMask blur={3} style="normal" />
        </Path>
      </Group>
    </ArtSlot>
  );
}
