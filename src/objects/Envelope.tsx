import { memo, useMemo } from "react";
import {
  BlurMask,
  Circle,
  FontWeight,
  Group,
  Line,
  Paragraph,
  Path,
  Rect,
  Shadow,
  vec,
} from "@shopify/react-native-skia";
import { makeParagraph, useSceneFonts } from "../scene/fonts";
import { ArtSlot } from "../art/ArtSlot";
import type { Letter, Postmark } from "../content/types";
import { MARK_R, RoundMark } from "./RoundMark";
import { t } from "../content/strings";
import { C } from "../scene/palette";
import { Para } from "../scene/Para";
import { between, rng } from "../scene/rand";
import { roughRect, shakyLine } from "../scene/rough";

export const ENVELOPE = { w: 168, h: 117 };
export const PACKAGE = { w: 176, h: 117 };

export const envelopeSize = (l: Letter) =>
  l.kind === "paket" ? PACKAGE : ENVELOPE;

/** Resting place of the i-th envelope in the stack (0 = top). Seeded, so the pile never reshuffles. */
export function stackPose(
  l: Letter,
  index: number,
  stack: { x: number; y: number },
) {
  const r = rng(`pose-${l.id}`);
  return {
    x: stack.x + 12 + between(r, -10, 10) + index * 2,
    y: stack.y + 40 - index * 11 + between(r, -4, 4),
    angle: between(r, -0.13, 0.13),
  };
}

const STAMP_COLORS = ["#6b3d2a", "#3e5a3a", "#5c4a7a", "#7a6430"];

/** Drawn with its top-left at (0,0); the caller positions and rotates it. */
function EnvelopeImpl({
  letter,
  postmark,
}: {
  letter: Letter;
  postmark?: Postmark;
}) {
  const { w, h } = envelopeSize(letter);
  const isPackage = letter.kind === "paket";
  const r = rng(`env-${letter.id}`);
  const body = useMemo(
    () =>
      roughRect(
        { x: 0, y: 0, w, h },
        `envb-${letter.id}`,
        isPackage ? 1.8 : 0.8,
      ),
    [w, h, letter.id, isPackage],
  );
  const stampColor = STAMP_COLORS[Math.floor(r() * STAMP_COLORS.length)]!;
  const fromFront = letter.direction === "cepheden";

  if (isPackage) {
    const label = roughRect(
      { x: 30, y: 30, w: 116, h: 54 },
      `lbl-${letter.id}`,
      0.8,
    );
    return (
      <ArtSlot slot="envelope_package" rect={{ x: 0, y: 0, w, h }} shadow>
        <Group>
          <Path path={body} color={C.paperBrown}>
            <Shadow dx={-4} dy={6} blur={6} color="rgba(0,0,0,0.6)" />
          </Path>
          {/* Wrapping folds */}
          <Path
            path={shakyLine(0, 18, w, 14, `pf1${letter.id}`, 1)}
            style="stroke"
            strokeWidth={1}
            color="rgba(60,40,20,0.35)"
          />
          <Path
            path={shakyLine(8, h, 22, 0, `pf2${letter.id}`, 1)}
            style="stroke"
            strokeWidth={1}
            color="rgba(60,40,20,0.25)"
          />
          <Path path={label} color="#e8dcc0" />
          {/* String, crossed, knotted off-centre */}
          <Path
            path={shakyLine(0, h * 0.55, w, h * 0.5, `ps1${letter.id}`, 0.8)}
            style="stroke"
            strokeWidth={2.2}
            color="#cbb68a"
          />
          <Path
            path={shakyLine(w * 0.38, 0, w * 0.42, h, `ps2${letter.id}`, 0.8)}
            style="stroke"
            strokeWidth={2.2}
            color="#cbb68a"
          />
          <Circle cx={w * 0.4} cy={h * 0.53} r={4} color="#b9a274" />
        </Group>
      </ArtSlot>
    );
  }

  const pmTilt = between(r, -0.3, 0.3);
  return (
    <>
      <ArtSlot slot="envelope" rect={{ x: 0, y: 0, w, h }} shadow>
        <Group>
          <Path path={body} color={fromFront ? "#d8cba8" : "#e7dcc2"}>
            <Shadow dx={-3} dy={5} blur={5} color="rgba(0,0,0,0.6)" />
          </Path>
          {/* Back flap seam glimpsed through the paper */}
          <Path
            path={shakyLine(0, 0, w / 2, h * 0.48, `fl1${letter.id}`, 0.5)}
            style="stroke"
            strokeWidth={0.8}
            color="rgba(90,70,40,0.25)"
          />
          <Path
            path={shakyLine(w / 2, h * 0.48, w, 0, `fl2${letter.id}`, 0.5)}
            style="stroke"
            strokeWidth={0.8}
            color="rgba(90,70,40,0.25)"
          />
          {/* Postage stamp with perforations; soldiers' letters from the front go free */}
          {!fromFront && (
            <Group
              transform={[{ rotate: between(r, -0.08, 0.08) }]}
              origin={{ x: w - 26, y: 24 }}
            >
              <Rect x={w - 42} y={8} width={30} height={34} color="#f0e6d0" />
              {Array.from({ length: 7 }, (_, i) => (
                <Group key={i}>
                  <Circle cx={w - 42 + i * 5} cy={8} r={1.2} color="#d8cba8" />
                  <Circle cx={w - 42 + i * 5} cy={42} r={1.2} color="#d8cba8" />
                </Group>
              ))}
              <Rect
                x={w - 39}
                y={11}
                width={24}
                height={28}
                color={stampColor}
                opacity={0.85}
              />
              <Circle
                cx={w - 27}
                cy={25}
                r={7}
                style="stroke"
                strokeWidth={1}
                color="rgba(240,230,210,0.6)"
              />
            </Group>
          )}
          {/* Cancellation: the postmark, and wavy bars across the stamp */}
          <Group opacity={0.55}>
            {!fromFront &&
              [0, 5, 10].map((dy) => (
                <Path
                  key={dy}
                  path={shakyLine(
                    w - 40,
                    22 + dy,
                    w - 4,
                    20 + dy,
                    `wav${dy}${letter.id}`,
                    1.4,
                  )}
                  style="stroke"
                  strokeWidth={1}
                  color="#2a2420"
                />
              ))}
          </Group>
          {fromFront && (
            // Field post: a triangle cut in the corner, as soldiers' letters were folded
            <Line
              p1={vec(0, 22)}
              p2={vec(22, 0)}
              strokeWidth={1}
              color="rgba(80,60,30,0.45)"
            />
          )}
        </Group>
      </ArtSlot>
      {/* The postmark goes on top of the illustration too, half over the stamp corner */}
      {postmark && (
        <RoundMark
          cx={w - 50}
          cy={34}
          scale={15 / MARK_R}
          rotate={pmTilt}
          color={postmark.color ?? "#1f1a17"}
          legend={`${postmark.office} ★`}
          center={postmark.date}
          opacity={0.72}
        />
      )}
    </>
  );
}

/** Address in the sender's hand. Separate so it can be skipped when art provides its own blank. */
function AddressImpl({ letter }: { letter: Letter }) {
  const { provider } = useSceneFonts();
  const { w, h } = envelopeSize(letter);
  const isPackage = letter.kind === "paket";
  const ink = letter.hand === "elegant" ? C.inkBlue : C.ink;
  const family = letter.hand === "clerical" ? "Cormorant" : "Caveat";
  const left = isPackage ? 36 : 18;
  const top = isPackage ? 34 : h * 0.4;
  const width = w - left - (isPackage ? 30 : 10);
  // Measure the name so the place line sits under it however many lines it took.
  const name = useMemo(
    () =>
      makeParagraph(
        provider,
        letter.recipient,
        {
          family,
          size: family === "Caveat" ? 17 : 13,
          color: ink,
          weight: FontWeight.Medium,
          lineHeight: 0.95,
        },
        width,
      ),
    [provider, letter.recipient, family, ink, width],
  );
  return (
    <Group>
      <Paragraph paragraph={name} x={left} y={top} width={width} />
      <Para
        text={letter.to}
        x={left + 10}
        y={top + name.getHeight() - 1}
        width={width - 10}
        family={family}
        size={family === "Caveat" ? 14 : 11}
        color={ink}
        italic={family === "Cormorant"}
      />
      {isPackage && (
        <Para
          text={t("envelope.package")}
          x={4}
          y={h - 18}
          width={60}
          family="Cormorant"
          size={10}
          color="rgba(40,25,10,0.7)"
          weight={FontWeight.Bold}
          letterSpacing={1.4}
        />
      )}
    </Group>
  );
}

/** The back of an opened envelope: torn flap, and the sender's name and address. */
function BackImpl({ letter }: { letter: Letter }) {
  const { w, h } = envelopeSize(letter);
  const body = useMemo(
    () => roughRect({ x: 0, y: 0, w, h }, `envk-${letter.id}`, 0.8),
    [w, h, letter.id],
  );
  const ink = letter.hand === "elegant" ? C.inkBlue : C.ink;
  const family = letter.hand === "clerical" ? "Cormorant" : "Caveat";
  const fromFront = letter.direction === "cepheden";
  return (
    <Group>
      <Path path={body} color={fromFront ? "#d3c6a2" : "#e2d7bc"}>
        <Shadow dx={-3} dy={5} blur={5} color="rgba(0,0,0,0.6)" />
      </Path>
      {/* The flap, slit open by the clerk's knife */}
      <Path
        path={shakyLine(0, 0, w / 2, h * 0.46, `bk1${letter.id}`, 0.6)}
        style="stroke"
        strokeWidth={1}
        color="rgba(90,70,40,0.45)"
      />
      <Path
        path={shakyLine(w / 2, h * 0.46, w, 0, `bk2${letter.id}`, 0.6)}
        style="stroke"
        strokeWidth={1}
        color="rgba(90,70,40,0.45)"
      />
      <Path
        path={shakyLine(2, 3, w - 2, 2, `bk3${letter.id}`, 1.6)}
        style="stroke"
        strokeWidth={1.4}
        color="rgba(60,40,20,0.5)"
      />
      <Para
        text={t("envelope.sender")}
        x={14}
        y={h * 0.52}
        width={60}
        family="Cormorant"
        size={9}
        color="rgba(40,25,10,0.7)"
        weight={FontWeight.Bold}
        letterSpacing={1}
      />
      <Para
        text={letter.sender}
        x={14}
        y={h * 0.6}
        width={w - 24}
        family={family}
        size={family === "Caveat" ? 15 : 12}
        color={ink}
        weight={FontWeight.Medium}
      />
      <Para
        text={
          letter.fromAddress ?? (fromFront ? t("envelope.field") : letter.from)
        }
        x={22}
        y={h * 0.6 + 17}
        width={w - 30}
        family={family}
        size={family === "Caveat" ? 13 : 10.5}
        color={ink}
        italic={family === "Cormorant"}
      />
    </Group>
  );
}

export const EnvelopeBody = memo(EnvelopeImpl);
export const EnvelopeBack = memo(BackImpl);
export const EnvelopeAddress = memo(AddressImpl);

/** Soft dark beneath an envelope being carried — lifted off the desk. */
export function LiftShadow({ w, h }: { w: number; h: number }) {
  return (
    <Rect x={-10} y={14} width={w} height={h} color="rgba(0,0,0,0.45)">
      <BlurMask blur={12} style="normal" />
    </Rect>
  );
}
