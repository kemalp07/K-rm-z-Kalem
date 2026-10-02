import { useMemo } from 'react';
import { Paragraph } from '@shopify/react-native-skia';
import { makeParagraph, useSceneFonts, type TextSpec } from './fonts';

interface Props extends TextSpec {
  text: string;
  x: number;
  y: number;
  width: number;
}

/** A laid-out block of text at board coordinates. */
export function Para({ text, x, y, width, ...spec }: Props) {
  const { provider } = useSceneFonts();
  const key = JSON.stringify(spec);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const p = useMemo(() => makeParagraph(provider, text, spec, width), [provider, text, width, key]);
  return <Paragraph paragraph={p} x={x} y={y} width={width} />;
}
