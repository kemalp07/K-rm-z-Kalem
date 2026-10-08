import { useMemo } from 'react';
import { BlurMask, Circle, FontWeight, Group, Path, Rect, Shadow } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';
import { hasArt, TintedArt } from '../art/ArtSlot';
import { getHelp } from '../content/loader';
import type { HelpId } from '../content/types';
import { Fade } from '../scene/Fade';
import { C } from '../scene/palette';
import { Para } from '../scene/Para';
import { roughRect, shakyLine } from '../scene/rough';
import { LAYOUT, WORLD } from '../scene/world';

export const HELP_IDS: HelpId[] = ['rules', 'pen', 'candle', 'magnifier', 'stamps', 'kettle'];

/**
 * A scrap left under a tool the clerk has not yet been shown. No name on it:
 * it is a note, and once it has been read it leaves the desk.
 */
export function HelpSlip({ id }: { id: HelpId }) {
  const r = LAYOUT.help[id];
  const shape = useMemo(() => roughRect(r, `help-${id}`, 0.7, true), [r, id]);
  return (
    <Group transform={[{ rotate: r.rot }]} origin={{ x: r.x + r.w / 2, y: r.y + r.h / 2 }}>
      <Path path={shape} color="#d9cdb4">
        <Shadow dx={-1} dy={2} blur={2} color="rgba(0,0,0,0.45)" />
      </Path>
      {[0, 1].map((i) => (
        <Path key={i} path={shakyLine(r.x + 8, r.y + 11 + i * 8, r.x + r.w - 10, r.y + 11 + i * 8, `hs${id}${i}`, 0.35)} style="stroke" strokeWidth={0.7} color="rgba(43,33,24,0.28)" />
      ))}
    </Group>
  );
}

/** The note opened up over the desk. Any touch puts it back. */
export function HelpSheetView({ id, opacity }: { id: HelpId; opacity: SharedValue<number> }) {
  const sheet = getHelp(id);
  const r = LAYOUT.helpSheet;
  const isRules = id === 'rules';
  const page = useMemo(() => roughRect(r, `help-sheet-${id}`, 1.1, !isRules), [r, id, isRules]);
  const rise = useDerivedValue(() => [{ translateY: (1 - opacity.value) * 16 }]);
  const pad = 34;
  const lineTop = r.y + (sheet.subtitle ? 92 : 74);
  const gap = isRules ? 48 : 58;
  return (
    <Fade opacity={opacity}>
      <Rect x={-400} y={-200} width={WORLD.w + 800} height={WORLD.h + 400} color="rgba(5,4,3,0.55)" />
      <Group transform={rise}>
        {hasArt('paper') ? (
          <TintedArt slot="paper" rect={r} tint={isRules ? '#efe5cc' : '#e8dcc0'} shadow />
        ) : (
          <Path path={page} color="#ece1c6">
            <Shadow dx={-6} dy={10} blur={12} color="rgba(0,0,0,0.6)" />
          </Path>
        )}
        <Para text={sheet.title} x={r.x} y={r.y + 30} width={r.w} family={isRules ? 'Cormorant' : 'Caveat'} size={isRules ? 24 : 28} color={C.ink} weight={FontWeight.Bold} letterSpacing={isRules ? 2 : 0} align="center" />
        {sheet.subtitle && <Para text={sheet.subtitle} x={r.x} y={r.y + 60} width={r.w} family="Cormorant" size={14} color={C.inkFaded} italic align="center" />}
        {sheet.lines.map((line, i) => (
          <Group key={i}>
            <Para text={isRules ? `${i + 1}.` : '—'} x={r.x + pad} y={lineTop + i * gap} width={24} family={isRules ? 'Cormorant' : 'Caveat'} size={isRules ? 16 : 18} color={isRules ? C.censor : C.inkFaded} weight={FontWeight.Bold} />
            <Para text={line} x={r.x + pad + 26} y={lineTop + i * gap} width={r.w - pad * 2 - 26} family={isRules ? 'Cormorant' : 'Caveat'} size={isRules ? 15.5 : 19} color={C.ink} lineHeight={isRules ? 1.05 : 1} weight={isRules ? FontWeight.SemiBold : FontWeight.Normal} />
          </Group>
        ))}
        {sheet.footer && <Para text={sheet.footer} x={r.x + pad} y={r.y + r.h - 48} width={r.w - pad * 2} family="Cormorant" size={13} color={C.inkFaded} italic align="center" />}
        {isRules && (
          // The Şube's stamp, slightly crooked, as on any order that came down the line.
          <Circle cx={r.x + r.w - 52} cy={r.y + r.h - 34} r={20} style="stroke" strokeWidth={2} color="rgba(91,46,74,0.55)">
            <BlurMask blur={0.4} style="solid" />
          </Circle>
        )}
      </Group>
    </Fade>
  );
}
