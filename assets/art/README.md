# assets/art — illüstrasyon slotları

Sahnedeki her nesne bir **art slot** üzerinden çizilir. Bu klasörde slotun adıyla bir
görsel varsa o kullanılır; yoksa Skia ile çizilen yer tutucu görünür.

## Görsel eklemek

1. Dosyayı slot adıyla bu klasöre koy (ör. `lamp.png`). PNG tercih edilir, saydamlık korunur.
2. `npm run assets` çalıştır: `manifest.ts` yeniden üretilir.
3. Uygulamayı yenile.

## Kurallar

- **Işık görsele çizilmez.** Lamba ışığı, titreme, vinyet ve gece kodla eklenir. Görseller
  düz, gölgesiz-nötr bir ışıkta çizilmeli, yoksa ışık iki kez uygulanır.
- **Yazı görsele çizilmez.** Adresler, tarihler, levha yazısı, mühür yazısı kodla basılır (çeviri için).
- Ölçüler sahnenin 1000×560'lık "dünya" birimindedir; teslim ölçüsü 3 katıdır.
- Kâğıt (`paper`) tek görsel olarak kullanılır; her mektubun rengi/yıpranması kodla üzerine eklenir.

## Slotlar

| Slot (dosya adı) | Dünya ölçüsü | Teslim ölçüsü (3×) | Not |
|---|---|---|---|
| `desk.png` | 1000×560 | 3000×1680 px | Masa yüzeyi, tüm sahne. Işık ve vinyet kodla eklenir; görselde ışık olmasın. |
| `window.png` | 150×235 | 450×705 px | Sol üstte gece penceresi, çerçevesiyle. |
| `lamp.png` | 150×150 | 450×450 px | Gaz lambası, yukarıdan. Alev kodla çizilir; görselde camın içi boş kalsın. |
| `calendar.png` | 92×118 | 276×354 px | Koparılmış takvim yaprağı, yazısız (tarih kodla yazılır). |
| `purse_note.png` | 120×64 | 360×192 px | Para hesabı yazılan kâğıt parçası, yazısız. |
| `coin.png` | 30×30 | 90×90 px | Tek madeni para; masada döndürülerek tekrarlanır. |
| `brass_plate.png` | 170×40 | 510×120 px | Pirinç isim levhası, yazısız. |
| `envelope.png` | 168×104 | 504×312 px | Mektup zarfı, adres alanı boş. |
| `envelope_package.png` | 176×116 | 528×348 px | Kâğıda sarılmış, iple bağlanmış paket. |
| `paper.png` | 360×410 | 1080×1230 px | Mektup kâğıdı. Yazısız; el yazısı kodla yerleşir. |
| `pen.png` | 18×170 | 54×510 px | Kırmızı sansür kalemi, uç aşağıda. |
| `candle.png` | 56×56 | 168×168 px | Şamdandaki mum, yukarıdan. Alev kodla çizilir. |
| `magnifier.png` | 120×120 | 360×360 px | Büyüteç, sap sağ-aşağı. Cam kısmı saydam olsun. |
| `stamp.png` | 86×52 | 258×156 px | Lastik mühür ıstampası. Yazı ve renk kodla basılır. |
| `tray.png` | 180×120 | 540×360 px | Kilitli aletlerin karanlık tepsisi. |
| `ledger.png` | 520×470 | 1560×1410 px | Gün sonu defteri, açık sayfa, yazısız. |
| `item_corap.png` | 96×60 | 288×180 px | Paketten çıkan yün çorap. |
| `item_dut.png` | 58×52 | 174×156 px | Bez kesede kuru dut. |

Slot listesinin kaynağı `src/art/slots.ts`; tabloyu güncellemek için `node scripts/print-art-slots.js`.
