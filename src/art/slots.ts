// Every drawn object has an art slot. A slot with a file in assets/art is drawn
// from that image; an empty slot falls back to the Skia placeholder.
// Sizes are in world units (the scene is laid out on a 1000×560 board);
// final art should be delivered at 3× these numbers.

export const ART_SLOTS = {
  desk: { w: 1000, h: 560, note: 'Masa yüzeyi, tüm sahne. Işık ve vinyet kodla eklenir; görselde ışık olmasın.' },
  window: { w: 150, h: 235, note: 'Sol üstte gece penceresi, çerçevesiyle.' },
  lamp: { w: 150, h: 150, note: 'Gaz lambası, yukarıdan. Alev kodla çizilir; görselde camın içi boş kalsın.' },
  calendar: { w: 92, h: 118, note: 'Koparılmış takvim yaprağı, yazısız (tarih kodla yazılır).' },
  purse_note: { w: 120, h: 64, note: 'Para hesabı yazılan kâğıt parçası, yazısız.' },
  coin: { w: 30, h: 30, note: 'Tek madeni para; masada döndürülerek tekrarlanır.' },
  brass_plate: { w: 170, h: 40, note: 'Pirinç isim levhası, yazısız.' },
  envelope: { w: 168, h: 104, note: 'Mektup zarfı, adres alanı boş.' },
  envelope_package: { w: 176, h: 116, note: 'Kâğıda sarılmış, iple bağlanmış paket.' },
  paper: { w: 360, h: 410, note: 'Mektup kâğıdı. Yazısız; el yazısı kodla yerleşir.' },
  pen: { w: 18, h: 170, note: 'Kırmızı sansür kalemi, uç aşağıda.' },
  candle: { w: 56, h: 56, note: 'Şamdandaki mum, yukarıdan. Alev kodla çizilir.' },
  magnifier: { w: 120, h: 120, note: 'Büyüteç, sap sağ-aşağı. Cam kısmı saydam olsun.' },
  stamp: { w: 86, h: 52, note: 'Lastik mühür ıstampası. Yazı ve renk kodla basılır.' },
  tray: { w: 180, h: 120, note: 'Kilitli aletlerin karanlık tepsisi.' },
  ledger: { w: 520, h: 470, note: 'Gün sonu defteri, açık sayfa, yazısız.' },
  item_corap: { w: 96, h: 60, note: 'Paketten çıkan yün çorap.' },
  item_dut: { w: 58, h: 52, note: 'Bez kesede kuru dut.' },
} as const;

export type ArtSlotId = keyof typeof ART_SLOTS;
