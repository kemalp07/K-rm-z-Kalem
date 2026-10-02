# Görsel üretim prompt'ları (Gemini vb.)

Bu dosya, oyunun art slot'larını dolduracak görselleri bir görsel üretim aracıyla
hazırlamak için yazıldı. Prompt'lar İngilizce; araçlar İngilizcede daha tutarlı sonuç veriyor.

## Nasıl kullanılır

1. **Önce "Üslup" bloğunu sabitle.** Her prompt'un başına aynen yapıştır. Tutarlılığın
   anahtarı bu blok; kelimesini değiştirme.
2. **Eşyaları sayfa sayfa ürettir** (aşağıdaki Sayfa 1–3). Aynı sayfadaki eşyalar aynı
   üslupta çıkar; ben sonra tek tek kesip boyutlandırırım.
3. İlk beğendiğin sayfadan sonra diğerlerini **aynı sohbette** iste ve şunu ekle:
   *"Use exactly the same style, palette and line quality as the previous image."*
4. Mümkün olan en yüksek çözünürlükte indir. Dosya adı önemli değil, ben düzenlerim.
5. Görselleri bu sohbete ekle ya da depoda `assets/art/incoming/` klasörüne yükle.

### Reddetme listesi — bunlardan biri varsa yeniden ürettir
- Üstünde **yazı, harf, sayı** var (uydurma Türkçe, anlamsız işaretler).
- Sert **gölge** ya da parlak ışık lekesi var (oyun ışığı kendisi ekliyor).
- Eşyalar **birbirine değiyor ya da üst üste** (kesmesi zorlaşır).
- **Alev** var (oyun alevi kendisi çizip titretiyor).
- Bakış açısı yanlış (aşağıdaki tabloya bak).

---

## Üslup (her prompt'un başına)

```
Style: hand-drawn game asset illustration for a quiet historical drama set in 1915.
Fine dark-brown ink linework with muted, slightly faded watercolour washes,
like an illustration in an old Ottoman-era book. Warm, worn, real objects with
small imperfections (scratches, tarnish, wear). Muted palette: dark walnut wood,
aged cream paper (#efe2c4), dark brown-black ink (#2b2118), dull brass (#a8843f),
a deep censor red (#a3241b). Flat, soft, even lighting with no cast shadows and no
highlights from a light source. Plain flat light-grey background (#d0d0d0).
No text, no letters, no numbers, no logos, no watermark, no flames.
```

---

## Sayfa 1 — Aletler

```
[Üslup bloğu]

A single sheet of separate objects, evenly spaced on the background, none touching:
1. A brass oil lamp with a tall clear glass chimney, seen from a slight three-quarter
   view from above, the base at the bottom. The chimney is empty, no flame inside.
2. A small brass chamberstick (saucer candle holder with a finger ring) holding a short
   ivory tallow candle with a few wax drips, three-quarter view from above, no flame.
3. A long red hexagonal censor's pencil, sharpened, lying flat, seen straight from above,
   point at the bottom.
4. A magnifying glass with a brass rim and a turned walnut handle, seen straight from
   above, the glass completely clear and empty, the handle pointing down-right.
5. Four wooden rubber stamps with round knob handles, seen straight from above, the
   rubber face hidden underneath.
```

## Sayfa 2 — Masadaki bilgi eşyaları

```
[Üslup bloğu]

A single sheet of separate objects, evenly spaced on the background, none touching:
1. A single torn-off wall calendar page, blank, with a ragged top edge and two small
   binding holes, seen straight from above.
2. A small torn scrap of paper, blank, seen straight from above.
3. Five old coins of different sizes: one larger silver coin and four worn copper coins,
   each with a blank worn face (no writing, no portraits), seen straight from above.
4. A blank rectangular brass desk name plate with two small screws, slightly tarnished,
   seen straight from above.
5. A dark, empty wooden tray lined with worn dark felt, seen straight from above.
```

## Sayfa 3 — Zarflar ve paket

```
[Üslup bloğu]

A single sheet of separate objects, evenly spaced on the background, none touching:
1. A plain old paper envelope, front side, blank address area, a small postage stamp
   with a plain coloured pattern (no text) in the top right corner, slightly creased
   and soiled, seen straight from above.
2. A small parcel wrapped in brown paper and tied crosswise with thin string, with a
   blank paper label, seen straight from above.
3. A hand-knitted grey-brown wool sock, lying flat, seen straight from above.
4. A small cloth drawstring pouch with a few dried mulberries spilling out,
   seen straight from above.
```

## Tekil görseller (her biri ayrı ürettirilir)

**Masa yüzeyi** — en-boy oranı olabildiğince geniş (en az 3:1)
```
[Üslup bloğu — son cümledeki "Plain flat light-grey background" kısmını SİL]

A wide, seamless dark walnut desk top seen straight from above, filling the whole
image edge to edge: four long horizontal planks, visible grain, a few old scratches,
a faint ring stain and a small old ink stain. Nothing lying on it. Evenly lit, no
lamp glow, no vignette.
```

**Pencere** — dikey (yaklaşık 2:3)
```
[Üslup bloğu — arka plan cümlesini SİL]

A small old wooden window frame with four panes, seen from the front, at night:
deep blue night sky, a thin crescent moon, a few stars, a dark distant shoreline
across calm water, one tiny far-off light. The frame is dark, worn painted wood.
The image is cropped to the frame.
```

**Mektup kâğıdı** — dikey (yaklaşık 7:8)
```
[Üslup bloğu]

A single sheet of old blank writing paper, aged cream, slightly uneven edges, two
faint horizontal fold creases, a little foxing near the edges, seen straight from
above. Completely blank, no writing, no lines.
```

**Gün sonu defteri** — yataya yakın (yaklaşık 10:9)
```
[Üslup bloğu]

One page of an old bound office register, seen straight from above: aged paper,
faint blue ruled lines and a thin red margin line on the left, completely empty,
no writing.
```

---

## Hangi görsel nereye gider (ben yerleştireceğim)

| Görsel | Slot | Bakış | Not |
|---|---|---|---|
| Gaz lambası | `lamp` | 3/4, taban altta | Alev ve şişe içi ışığı oyun çiziyor |
| Şamdanlı mum | `candle` | 3/4 | Alevi oyun çiziyor |
| Kırmızı kalem | `pen` | Tepeden, uç aşağıda | |
| Büyüteç | `magnifier` | Tepeden, sap sağ-aşağı | Cam tamamen boş olmalı; büyütmeyi oyun yapıyor |
| Lastik mühürler | `stamp` | Tepeden | Gelince mühür sırasını bu görselle yeniden kuracağım |
| Takvim yaprağı | `calendar` | Tepeden | Tarihi oyun yazıyor |
| Kâğıt parçası | `purse_note` | Tepeden | Para yazısını oyun yazıyor |
| Madeni para | `coin` | Tepeden | Birini kullanırım, oyun çoğaltıp döndürür |
| Pirinç levha | `brass_plate` | Tepeden | Yazıyı oyun kazıyor |
| Tepsi | `tray` | Tepeden | Kilitli alet siluetlerini oyun çiziyor |
| Zarf | `envelope` | Tepeden | Adresi oyun yazıyor |
| Paket | `envelope_package` | Tepeden | |
| Çorap | `item_corap` | Tepeden | |
| Dut kesesi | `item_dut` | Tepeden | |
| Masa | `desk` | Tepeden | |
| Pencere | `window` | Önden | |
| Mektup kâğıdı | `paper` | Tepeden | El yazısını oyun yazıyor |
| Defter sayfası | `ledger` | Tepeden | |

Ölçüler `README.md`'deki tabloda. Görsel tam o oranda gelmezse ben kırpar ve ölçeklerim.
