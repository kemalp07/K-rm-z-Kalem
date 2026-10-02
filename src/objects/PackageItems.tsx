import { useMemo } from 'react';
import { Circle, Group, Path, Shadow, Skia } from '@shopify/react-native-skia';
import { ArtSlot } from '../art/ArtSlot';
import type { PackageItem } from '../content/types';
import { Para } from '../scene/Para';
import { blob, roughRect, shakyLine } from '../scene/rough';
import { between, rng } from '../scene/rand';
import { LAYOUT } from '../scene/world';

/** Whatever came out of the parcel, laid on the desk beside the letter. */
export function PackageItems({ items }: { items: PackageItem[] }) {
  const { x, y } = LAYOUT.items;
  return (
    <Group>
      {items.map((item, i) => {
        if (item.id === 'corap') return <Sock key={item.id} x={x + 2} y={y - 14} />;
        if (item.id === 'dut') return <MulberryPouch key={item.id} x={x - 44} y={y + 18} />;
        return <GenericBundle key={item.id} x={x - 60 + i * 40} y={y} seed={item.id} />;
      })}
      <ItemTag items={items} />
    </Group>
  );
}

function ItemTag({ items }: { items: PackageItem[] }) {
  const rect = { x: LAYOUT.items.x - 34, y: LAYOUT.items.y + 70, w: 140, h: 22 };
  const tag = useMemo(() => roughRect(rect, 'items-tag', 0.7), [rect.x, rect.y]);
  return (
    <Group transform={[{ rotate: 0.04 }]} origin={{ x: rect.x, y: rect.y }}>
      <Path path={tag} color="#e6d9bc">
        <Shadow dx={-2} dy={2} blur={2} color="rgba(0,0,0,0.5)" />
      </Path>
      <Para text={items.map((i) => i.name).join(' · ')} x={rect.x + 6} y={rect.y + 3} width={rect.w - 12} family="Caveat" size={14} color="#4a4038" />
    </Group>
  );
}

/** Hand-knit wool sock, rows of stitches shown as soft ridges. */
function Sock({ x, y }: { x: number; y: number }) {
  const parts = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    b.moveTo(x, y);
    b.lineTo(x + 30, y);
    b.lineTo(x + 32, y + 40);
    b.quadTo(x + 34, y + 52, x + 52, y + 54);
    b.lineTo(x + 78, y + 56);
    b.quadTo(x + 92, y + 62, x + 78, y + 74);
    b.lineTo(x + 30, y + 72);
    b.quadTo(x + 2, y + 70, x + 2, y + 44);
    b.close();
    const p = b.build();
    const rows = Array.from({ length: 12 }, (_, i) => shakyLine(x + 2, y + 6 + i * 5.5, x + 30, y + 6 + i * 5.5, `sock${i}`, 0.6));
    return { p, rows };
  }, [x, y]);
  return (
    <ArtSlot slot="item_corap" rect={{ x, y, w: 96, h: 76 }}>
      <Group>
        <Path path={parts.p} color="#8c7a64">
          <Shadow dx={-3} dy={4} blur={4} color="rgba(0,0,0,0.55)" />
        </Path>
        {parts.rows.map((r, i) => (
          <Path key={i} path={r} style="stroke" strokeWidth={1.4} color="rgba(60,48,36,0.35)" />
        ))}
        {/* Heel knit double, as the note says */}
        <Path path={blob(x + 22, y + 60, 10, 'heel', 0.15)} color="rgba(70,55,40,0.4)" />
        <Path path={shakyLine(x, y + 2, x + 30, y + 2, 'cuff', 0.4)} style="stroke" strokeWidth={3} color="#a39077" />
      </Group>
    </ArtSlot>
  );
}

function MulberryPouch({ x, y }: { x: number; y: number }) {
  const berries = useMemo(() => {
    const r = rng('mulberries');
    return Array.from({ length: 6 }, (_, i) => ({ k: i, cx: x + between(r, -14, 18), cy: y + between(r, 18, 30), r: between(r, 2.4, 3.4) }));
  }, [x, y]);
  return (
    <ArtSlot slot="item_dut" rect={{ x: x - 29, y: y - 26, w: 58, h: 52 }}>
      <Group>
        <Path path={blob(x, y, 20, 'pouch', 0.18)} color="#c8b896">
          <Shadow dx={-3} dy={4} blur={4} color="rgba(0,0,0,0.55)" />
        </Path>
        <Path path={shakyLine(x - 8, y - 14, x + 8, y - 16, 'tie', 0.5)} style="stroke" strokeWidth={2} color="#7a6a4a" />
        {berries.map((b) => (
          <Group key={b.k}>
            <Circle cx={b.cx} cy={b.cy} r={b.r} color="#6b4a3a" />
            <Circle cx={b.cx - 0.8} cy={b.cy - 0.8} r={b.r * 0.4} color="rgba(220,190,160,0.25)" />
          </Group>
        ))}
      </Group>
    </ArtSlot>
  );
}

function GenericBundle({ x, y, seed }: { x: number; y: number; seed: string }) {
  return <Path path={blob(x + 20, y + 20, 18, seed, 0.2)} color="#a89474" />;
}
