# assets/art — illüstrasyon slotları

Sahnedeki her nesne bir **art slot** üzerinden çizilir. Bu klasörde slotun adıyla bir
görsel varsa o kullanılır; yoksa Skia ile çizilen yer tutucu görünür.

## Görsel eklemek

1. Dosyayı slot adıyla bu klasöre koy (ör. `lamp.png`). PNG tercih edilir, saydamlık korunur.
2. `npm run assets` çalıştır: `manifest.ts` yeniden üretilir.
3. Uygulamayı yenile.

## Bir sayfadan (sheet) eşya kesmek

Görsel üretim aracından tek sayfada birden çok eşya geldiyse:

1. Sayfayı `source/` klasörüne koy.
2. `python3 scripts/cut-sheet.py assets/art/source/sayfa.png assets/art lamba:x0,y0,x1,y1:glass ...`
   ile her eşyayı kaba bir kutuyla kes. `:glass` cam kısımları saydamlaştırır, `:holes` kulp
   halkası gibi boşlukları temizler. (Pillow, numpy, scipy gerekir; yalnızca geliştirme aracı.)
3. `placement.ts` içinde eşyanın çapa noktasını (lambanın tabanı, kalemin ucu, merceğin
   merkezi…) ve masadaki genişliğini yaz. Alev gibi kodla çizilen parçalar buradaki
   noktalara yerleşir.
4. `npm run assets`.

## Kurallar

- **Işık görsele çizilmez.** Lamba ışığı, titreme, vinyet ve gece kodla eklenir. Görseller
  düz, gölgesiz-nötr bir ışıkta çizilmeli, yoksa ışık iki kez uygulanır.
- **Yazı görsele çizilmez.** Adresler, tarihler, levha yazısı, mühür yazısı kodla basılır (çeviri için).
- **Kamera tam tepeden.** Eşyaların yan yüzü görünmez (tek istisna duvardaki pencere).
- Ölçüler sahnenin 1000×560'lık "dünya" birimindedir; teslim ölçüsü 3 katıdır.
- Kâğıt (`paper`) tek görsel olarak kullanılır; her mektubun rengi/yıpranması kodla üzerine eklenir.

## Slotlar

| Slot (dosya adı) | Dünya ölçüsü | Teslim ölçüsü (3×) | Not |
|---|---|---|---|
| `desk.png` | 1640×560 | 4920×1680 px | Masa yüzeyi; ortadaki 1000 birim oyun alanı, iki yanda 320 birim geniş ekranlar için taşma. Işık ve vinyet kodla eklenir. |
| `window.png` | 150×235 | 450×705 px | Sol üstte gece penceresi, çerçevesiyle. |
| `lamp.png` | 150×260 | 450×780 px | Gaz lambası, tam tepeden. Alev ve ışık kodla çizilir; şişe ağzı boş kalsın. |
| `calendar.png` | 92×118 | 276×354 px | Koparılmış takvim yaprağı, yazısız (tarih kodla yazılır). |
| `purse_note.png` | 120×64 | 360×192 px | Para hesabı yazılan kâğıt parçası, yazısız. |
| `coin.png` | 30×30 | 90×90 px | Tek madeni para; masada döndürülerek tekrarlanır. |
| `brass_plate.png` | 170×40 | 510×120 px | Pirinç isim levhası, yazısız. |
| `envelope.png` | 168×104 | 504×312 px | Mektup zarfı, adres alanı boş. |
| `envelope_package.png` | 176×116 | 528×348 px | Kâğıda sarılmış, iple bağlanmış paket. |
| `paper.png` | 360×410 | 1080×1230 px | Mektup kâğıdı. Yazısız; el yazısı kodla yerleşir. |
| `pen.png` | 18×170 | 54×510 px | Kırmızı sansür kalemi, uç aşağıda. |
| `candle.png` | 80×90 | 240×270 px | Kulplu pirinç şamdanda mum, tam tepeden. Alev kodla çizilir. |
| `magnifier.png` | 120×120 | 360×360 px | Büyüteç, sap sağ-aşağı. Cam kısmı saydam olsun. |
| `stamp.png` | 86×52 | 258×156 px | Lastik mühür ıstampası. Yazı ve renk kodla basılır. |
| `tray.png` | 180×120 | 540×360 px | Kilitli aletlerin karanlık tepsisi. |
| `ledger.png` | 520×470 | 1560×1410 px | Gün sonu defteri, açık sayfa, yazısız. |
| `item_corap.png` | 96×60 | 288×180 px | Paketten çıkan yün çorap. |
| `item_dut.png` | 58×52 | 174×156 px | Bez kesede kuru dut. |

Slot listesinin kaynağı `src/art/slots.ts`; tabloyu güncellemek için `node scripts/print-art-slots.js`.
