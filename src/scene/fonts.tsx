import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  FontSlant,
  FontWeight,
  Skia,
  TextAlign,
  useFont,
  useFonts,
  type SkFont,
  type SkParagraph,
  type SkTypefaceFontProvider,
} from '@shopify/react-native-skia';

/** Caveat is every human hand on the desk; Cormorant is print, brass and rubber. */
export type Family = 'Caveat' | 'Cormorant';

export interface TextSpec {
  family: Family;
  size: number;
  color: string;
  weight?: FontWeight;
  italic?: boolean;
  letterSpacing?: number;
  align?: 'left' | 'center' | 'right';
  lineHeight?: number;
}

export interface Fonts {
  provider: SkTypefaceFontProvider;
  /** A plain SkFont for text drawn along paths (seal rings). */
  sealFont: SkFont;
}

const FontCtx = createContext<Fonts | null>(null);

// Native bundles give asset ids; web bundles give URL strings, which Skia wants as { uri }.
type FontModule = number | string;
const src = (m: FontModule) => (typeof m === 'string' ? { uri: m } : m) as unknown as number;

// Built once. Font sources must keep their identity between renders: Skia reloads a
// font whenever its source object changes, and a fresh { uri } on every render would
// reload forever (each reload re-rendering the whole desk).
const FONT_SOURCES = {
  Caveat: [
    src(require('@expo-google-fonts/caveat/400Regular/Caveat_400Regular.ttf')),
    src(require('@expo-google-fonts/caveat/500Medium/Caveat_500Medium.ttf')),
    src(require('@expo-google-fonts/caveat/600SemiBold/Caveat_600SemiBold.ttf')),
    src(require('@expo-google-fonts/caveat/700Bold/Caveat_700Bold.ttf')),
  ],
  Cormorant: [
    src(require('@expo-google-fonts/cormorant-garamond/400Regular/CormorantGaramond_400Regular.ttf')),
    src(require('@expo-google-fonts/cormorant-garamond/400Regular_Italic/CormorantGaramond_400Regular_Italic.ttf')),
    src(require('@expo-google-fonts/cormorant-garamond/600SemiBold/CormorantGaramond_600SemiBold.ttf')),
    src(require('@expo-google-fonts/cormorant-garamond/700Bold/CormorantGaramond_700Bold.ttf')),
  ],
};
const SEAL_FONT = src(require('@expo-google-fonts/cormorant-garamond/700Bold/CormorantGaramond_700Bold.ttf'));

export function FontsProvider({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const provider = useFonts(FONT_SOURCES);
  const sealFont = useFont(SEAL_FONT, 9);
  const value = useMemo(() => (provider && sealFont ? { provider, sealFont } : null), [provider, sealFont]);
  if (!value) return <>{fallback ?? null}</>;
  return <FontCtx.Provider value={value}>{children}</FontCtx.Provider>;
}

/** Skia's Canvas renders in its own reconciler; React context must be handed across. */
export function FontsBridge({ fonts, children }: { fonts: Fonts; children: ReactNode }) {
  return <FontCtx.Provider value={fonts}>{children}</FontCtx.Provider>;
}

export function useSceneFonts(): Fonts {
  const f = useContext(FontCtx);
  if (!f) throw new Error('useSceneFonts outside FontsProvider');
  return f;
}

const ALIGN = { left: TextAlign.Left, center: TextAlign.Center, right: TextAlign.Right } as const;

export function makeParagraph(provider: SkTypefaceFontProvider, text: string, spec: TextSpec, width: number): SkParagraph {
  const builder = Skia.ParagraphBuilder.Make({ textAlign: ALIGN[spec.align ?? 'left'] }, provider);
  builder
    .pushStyle({
      fontFamilies: [spec.family],
      fontSize: spec.size,
      color: Skia.Color(spec.color),
      letterSpacing: spec.letterSpacing ?? 0,
      heightMultiplier: spec.lineHeight,
      fontStyle: {
        weight: spec.weight ?? FontWeight.Normal,
        slant: spec.italic ? FontSlant.Italic : FontSlant.Upright,
      },
    })
    .addText(text)
    .pop();
  const p = builder.build();
  p.layout(width);
  return p;
}
