import { useMemo } from 'react';
import { Circle, FontWeight, FractalNoise, Group, Line, Paint, Path, PathOp, Rect, Skia, TextPath, vec } from '@shopify/react-native-skia';
import { useSceneFonts } from '../scene/fonts';
import { Para } from '../scene/Para';

/** Every round impression is drawn at this radius and scaled to its real size. */
export const MARK_R = 32;

export type MarkSymbol = 'anchor' | 'wheat' | 'crescent' | 'star';

export function symbolPath(kind: MarkSymbol, cx: number, cy: number) {
  const p = Skia.PathBuilder.Make();
  if (kind === 'anchor') {
    p.addCircle(cx, cy - 9, 2.6);
    p.moveTo(cx, cy - 6).lineTo(cx, cy + 9);
    p.moveTo(cx - 6, cy - 3).lineTo(cx + 6, cy - 3);
    p.moveTo(cx - 9, cy + 2).quadTo(cx - 7, cy + 10, cx, cy + 10).quadTo(cx + 7, cy + 10, cx + 9, cy + 2);
  } else if (kind === 'wheat') {
    p.moveTo(cx, cy + 11).lineTo(cx, cy - 10);
    for (let i = 0; i < 4; i++) {
      const yy = cy - 7 + i * 4.5;
      p.addOval({ x: cx - 6.5, y: yy - 1.6, width: 6, height: 3.2 });
      p.addOval({ x: cx + 0.5, y: yy - 1.6, width: 6, height: 3.2 });
    }
  } else if (kind === 'crescent') {
    const moon = Skia.PathBuilder.Make().addCircle(cx - 2, cy, 8).build();
    const bite = Skia.PathBuilder.Make().addCircle(cx + 1.2, cy, 6.6).build();
    const crescent = Skia.Path.MakeFromOp(moon, bite, PathOp.Difference);
    if (crescent) p.addPath(crescent);
    p.addCircle(cx + 6.5, cy, 1.7);
  } else {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? 4 : 9;
      if (i === 0) p.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      else p.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    p.close();
  }
  return p.build();
}

interface Props {
  cx: number;
  cy: number;
  color: string;
  /** Pressed round the ring, centred over the top. */
  legend: string;
  symbol?: MarkSymbol;
  /** Straight text in the middle, as a postmark's date. */
  center?: string;
  /** A banner across the middle with this word, as the clerk's decision stamps have. */
  band?: string;
  /** Small line under the banner (the day's date). */
  foot?: string;
  double?: boolean;
  /** Cut the wrong way round: the impression reads in a mirror. */
  mirrored?: boolean;
  scale?: number;
  rotate?: number;
  /** Uneven pressure eats holes into the ink; seeded so it stays put. */
  worn?: number;
  opacity?: number;
}

/**
 * A round impression: company and village seals, postmarks, the clerk's decision stamps.
 * Drawn at MARK_R and scaled, so small ones keep their lettering for the magnifier.
 */
export function RoundMark({ cx, cy, color, legend, symbol, center, band, foot, double, mirrored, scale = 1, rotate = 0, worn, opacity = 0.85 }: Props) {
  const { sealFont } = useSceneFonts();
  const R = MARK_R;
  const text = `${legend} `;
  const ring = useMemo(() => {
    // Start the text so that it sits centred over the top of the ring.
    const tr = R - 8;
    const width = Math.min(sealFont.getTextWidth(text), 2 * Math.PI * tr - 4);
    const sweep = (width / tr) * (180 / Math.PI);
    return Skia.PathBuilder.Make()
      .addArc({ x: cx - tr, y: cy - tr, width: tr * 2, height: tr * 2 }, 270 - sweep / 2, 359.9)
      .build();
  }, [cx, cy, R, sealFont, text]);
  const sym = useMemo(() => (symbol && !band ? symbolPath(symbol, cx, cy) : null), [symbol, band, cx, cy]);
  const chord = Math.sqrt((R - 1) ** 2 - 9 ** 2);
  return (
    <Group layer={<Paint opacity={opacity} />} transform={[{ rotate }, { scale }, { scaleX: mirrored ? -1 : 1 }]} origin={{ x: cx, y: cy }}>
      <Circle cx={cx} cy={cy} r={R} style="stroke" strokeWidth={2.2} color={color} />
      {double && <Circle cx={cx} cy={cy} r={R - 2.6} style="stroke" strokeWidth={0.8} color={color} />}
      <TextPath path={ring} text={text} font={sealFont} color={color} />
      {band ? (
        <>
          <Line p1={vec(cx - chord, cy - 9)} p2={vec(cx + chord, cy - 9)} strokeWidth={1.2} color={color} />
          <Line p1={vec(cx - chord, cy + 9)} p2={vec(cx + chord, cy + 9)} strokeWidth={1.2} color={color} />
          <Para text={band} x={cx - R} y={cy - 7} width={R * 2} family="Cormorant" size={band.length > 7 ? 9 : 11} color={color} weight={FontWeight.Bold} align="center" letterSpacing={band.length > 7 ? 0 : 0.6} />
          {foot && <Para text={foot} x={cx - R} y={cy + 11} width={R * 2} family="Cormorant" size={6} color={color} weight={FontWeight.Bold} align="center" />}
        </>
      ) : (
        <>
          <Circle cx={cx} cy={cy} r={R - 14} style="stroke" strokeWidth={1} color={color} />
          {sym && <Path path={sym} style={symbol === 'anchor' || symbol === 'wheat' ? 'stroke' : 'fill'} strokeWidth={1.4} color={color} />}
          {center && <Para text={center} x={cx - 17} y={cy - 8} width={34} family="Cormorant" size={7.5} color={color} weight={FontWeight.Bold} align="center" lineHeight={0.9} />}
        </>
      )}
      {worn !== undefined && (
        <Rect x={cx - R - 4} y={cy - R - 4} width={R * 2 + 8} height={R * 2 + 8} blendMode="dstOut" opacity={0.55}>
          <FractalNoise freqX={0.09} freqY={0.09} octaves={2} seed={worn} />
        </Rect>
      )}
    </Group>
  );
}
