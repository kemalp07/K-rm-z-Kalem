import { useMemo } from 'react';
import { BlurMask, Circle, FontWeight, Group, Path, Rect, Shadow } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';
import { hasArt, TintedArt } from '../art/ArtSlot';
import { getHelp } from '../content/loader';
import { t } from '../content/strings';
import type { HelpId } from '../content/types';
import { Fade } from '../scene/Fade';
import { C } from '../scene/palette';
import { Para } from '../scene/Para';
import { roughRect, shakyLine } from '../scene/rough';
import { LAYOUT, WORLD } from '../scene/world';

export const HELP_IDS: HelpId[] = ['rules', 'pen', 'candle', 'magnifier', 'stamps', 'kettle'];

/**
 * A folded note on the desk. The Şube's rules are a proper printed sheet; the tool notes
 * are scraps in the clerk's pencil, half under the tool they explain. Unread ones carry
 * a red pin so a new player can see there is something to read.
 */
export function HelpSlip({ id, unread }: { id: HelpId; unread: boolean }) {
  const r = LAYOUT.help[id];
  const sheet = getHelp(id);
  const isRules = id === 'rules';
  const shape = useMemo(() => roughRect(r, `help-${id}`, 0.8, !isRules), [r, id, isRules]);
  return (
    <Group transform={[{ rotate: r.rot }]} origin={{ x: r.x + r.w / 2, y: r.y + r.h / 2 }}>
      {isRules && hasArt('paper') ? (
        <TintedArt slot="paper" rect={r} tint="#e9dfc6" shadow />
      ) : (
        <Path path={shape} color={isRules ? '#eadfc4' : '#e4d8bb'}>
          <Shadow dx={-2} dy={3} blur={3} color="rgba(0,0,0,0.5)" />
        </Path>
      )}
      {isRules ? (
        <>
          <Para text={sheet.title} x={r.x} y={r.y + 10} width={r.w} family="Cormorant" size={10.5} color={C.ink} weight={FontWeight.Bold} letterSpacing={1} align="center" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Path key={i} path={shakyLine(r.x + 10, r.y + 34 + i * 10, r.x + r.w - 10 - (i % 3) * 8, r.y + 34 + i * 10, `rl${i}`, 0.4)} style="stroke" strokeWidth={1.4} color="rgba(43,33,24,0.35)" />
          ))}
          <Circle cx={r.x + r.w - 16} cy={r.y + r.h - 16} r={9} style="stroke" strokeWidth={1.2} color="rgba(91,46,74,0.5)" />
        </>
      ) : (
        <Para text={sheet.tag} x={r.x} y={r.y + 6} width={r.w} family="Caveat" size={15} color="#3d3226" weight={FontWeight.Medium} align="center" />
      )}
      {unread && (
        <Group>
          <Circle cx={r.x + 6} cy={r.y + 5} r={3.4} color={C.censor}>
            <Shadow dx={-1} dy={1.5} blur={1} color="rgba(0,0,0,0.5)" />
          </Circle>
          <Circle cx={r.x + 5} cy={r.y + 4} r={1} color="rgba(255,220,200,0.6)" />
        </Group>
      )}
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
        {sheet.footer && <Para text={sheet.footer} x={r.x + pad} y={r.y + r.h - 64} width={r.w - pad * 2} family="Cormorant" size={13} color={C.inkFaded} italic align="center" />}
        <Para text={t('help.close')} x={r.x} y={r.y + r.h - 34} width={r.w} family="Caveat" size={14} color="rgba(60,45,30,0.55)" align="center" />
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
