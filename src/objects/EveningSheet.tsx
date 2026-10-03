import { useMemo } from 'react';
import { FontWeight, Group, Line, Path, Rect, Shadow, Skia, vec } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';
import type { AccountLine } from '../logic/account';
import type { Rect as Box } from '../logic/censor';
import { economy, eveningBill, purseOf, type DayState } from '../logic/dayFlow';
import { t } from '../content/strings';
import { Fade } from '../scene/Fade';
import { RESTART_RECT } from './ContinueCard';
import { C } from '../scene/palette';
import { Para } from '../scene/Para';
import { roughRect } from '../scene/rough';
import { LAYOUT, WORLD } from '../scene/world';

const T = economy.text;
const ROW = 21;

/** Where each choosable line and the closing button sit; shared by drawing and hit testing. */
export function eveningLayout(s: DayState) {
  const r = LAYOUT.ledger;
  const { expenses, shop } = eveningBill(s);
  const lines = s.account?.lines ?? [];
  // Account lines first, then the purse, then what can be paid.
  let y = r.y + 92 + lines.length * 17 + 34;
  const rows: { id: string; label: string; note?: string; cost: number; rect: Box; shop: boolean }[] = [];
  const headExpenses = y;
  y += 22;
  for (const e of expenses) {
    rows.push({ id: e.id, label: e.label, note: e.note, cost: e.cost, rect: { x: r.x + 60, y, w: r.w - 110, h: ROW }, shop: false });
    y += ROW + (e.note ? 12 : 2);
  }
  const headShop = shop.length ? y + 8 : null;
  if (shop.length) y += 30;
  for (const e of shop) {
    rows.push({ id: e.id, label: e.label, note: e.note, cost: e.cost, rect: { x: r.x + 60, y, w: r.w - 110, h: ROW }, shop: true });
    y += ROW + 14;
  }
  const button: Box = { x: r.x + r.w / 2 - 80, y: r.y + r.h - 58, w: 160, h: 34 };
  return { r, lines, rows, headExpenses, headShop, button };
}

const lineLabel = (l: AccountLine) => (l.kind === 'wage' ? T.wage! : economy.penalties[l.kind].label.replace('{who}', l.who ?? ''));
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

function tick(x: number, y: number) {
  return Skia.PathBuilder.Make().moveTo(x + 2, y + 7).quadTo(x + 5, y + 10, x + 6, y + 13).quadTo(x + 10, y + 3, x + 16, y - 2).build();
}

/** The evening at home, on paper: what the day earned and cost, and what to pay for. */
export function EveningSheet({ state, paid, opacity }: { state: DayState; paid: string[]; opacity: SharedValue<number> }) {
  const { r, lines, rows, headExpenses, headShop, button } = useMemo(() => eveningLayout(state), [state]);
  const page = useMemo(() => roughRect(r, 'evening', 0.7), [r]);
  const rise = useDerivedValue(() => [{ translateY: (1 - opacity.value) * 14 }]);
  const purse = purseOf(state);
  const cost = rows.filter((x) => paid.includes(x.id)).reduce((a, x) => a + x.cost, 0);
  const short = cost > purse;
  const L = r.x + 44;
  return (
    <Fade opacity={opacity}>
      <Rect x={-400} y={-200} width={WORLD.w + 800} height={WORLD.h + 400} color="rgba(5,4,3,0.45)" />
      <Group transform={rise}>
        <Path path={page} color="#ebe1c8">
          <Shadow dx={-6} dy={10} blur={12} color="rgba(0,0,0,0.65)" />
        </Path>
        <Para text={T.title!} x={L} y={r.y + 20} width={300} family="Cormorant" size={24} color={C.ink} weight={FontWeight.Bold} letterSpacing={1} />
        <Para text={T.today!} x={L} y={r.y + 64} width={300} family="Cormorant" size={13} color={C.inkFaded} italic />
        {lines.map((l, i) => (
          <Group key={i}>
            <Para text={`${lineLabel(l)}${l.warning ? ` · ${T.warning}` : ''}`} x={L + 8} y={r.y + 86 + i * 17} width={r.w - 150} family="Caveat" size={15} color={l.amount < 0 ? C.censor : C.ink} weight={FontWeight.Medium} />
            <Para text={signed(l.amount)} x={r.x + r.w - 110} y={r.y + 86 + i * 17} width={60} family="Caveat" size={15} color={l.amount < 0 ? C.censor : '#2f4a32'} weight={FontWeight.Bold} align="right" />
          </Group>
        ))}
        <Line p1={vec(L, r.y + 92 + lines.length * 17)} p2={vec(r.x + r.w - 46, r.y + 92 + lines.length * 17)} strokeWidth={0.8} color="rgba(43,33,24,0.4)" />
        <Para text={`${T.purse}: ${purse} kuruş`} x={L} y={r.y + 98 + lines.length * 17} width={r.w - 90} family="Cormorant" size={15} color={C.ink} weight={FontWeight.Bold} />

        <Para text={T.spend!} x={L} y={headExpenses} width={300} family="Cormorant" size={13} color={C.inkFaded} italic />
        {headShop !== null && <Para text={T.shop!} x={L} y={headShop} width={300} family="Cormorant" size={13} color={C.inkFaded} italic />}
        {rows.map((x) => (
          <Group key={x.id}>
            <Rect x={x.rect.x} y={x.rect.y + 4} width={13} height={13} style="stroke" strokeWidth={1} color="rgba(43,33,24,0.7)" />
            {paid.includes(x.id) && <Path path={tick(x.rect.x, x.rect.y + 4)} style="stroke" strokeWidth={2.2} strokeCap="round" color={C.censor} />}
            <Para text={x.label} x={x.rect.x + 22} y={x.rect.y + 1} width={x.rect.w - 80} family="Cormorant" size={14} color={C.ink} weight={FontWeight.SemiBold} />
            <Para text={`${x.cost} kuruş`} x={x.rect.x + x.rect.w - 70} y={x.rect.y + 1} width={70} family="Cormorant" size={14} color={C.ink} align="right" />
            {x.note && <Para text={x.note} x={x.rect.x + 22} y={x.rect.y + 18} width={x.rect.w - 22} family="Cormorant" size={11} color={C.inkFaded} italic />}
          </Group>
        ))}

        <Para text={short ? T.short! : `${purse - cost} kuruş kalır`} x={r.x} y={button.y - 24} width={r.w} family="Caveat" size={15} color={short ? C.censor : C.inkFaded} align="center" />
        <Rect x={button.x} y={button.y} width={button.w} height={button.h} style="stroke" strokeWidth={1.2} color={short ? 'rgba(43,33,24,0.3)' : 'rgba(43,33,24,0.75)'} />
        <Para text={T.done!} x={button.x} y={button.y + 7} width={button.w} family="Cormorant" size={16} color={short ? 'rgba(43,33,24,0.35)' : C.ink} weight={FontWeight.Bold} align="center" />
      </Group>
    </Fade>
  );
}

/** Shown instead of the evening when the third warning comes. */
export function DismissedCard({ opacity }: { opacity: SharedValue<number> }) {
  return (
    <Fade opacity={opacity}>
      <Rect x={-400} y={-400} width={WORLD.w + 800} height={WORLD.h + 800} color="#07080b" />
      <Para text={T.dismissedTitle!} x={0} y={WORLD.h / 2 - 70} width={WORLD.w} family="Cormorant" size={40} color="#c9b88f" align="center" weight={FontWeight.SemiBold} letterSpacing={3} />
      <Para text={T.dismissed!} x={WORLD.w / 2 - 260} y={WORLD.h / 2 - 10} width={520} family="Cormorant" size={18} color="#8a7b5e" align="center" italic />
      <Para text={t('continue.restart')} x={RESTART_RECT.x} y={RESTART_RECT.y + 6} width={RESTART_RECT.w} family="Caveat" size={17} color="#6b604c" align="center" />
    </Fade>
  );
}
