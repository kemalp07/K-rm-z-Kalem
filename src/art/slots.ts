// Every drawn object has an art slot. A slot with a file in assets/art is drawn
// from that image; an empty slot falls back to the Skia placeholder.
// Sizes are in world units (the scene is laid out on a 1000×560 board);
// final art should be delivered at 3× these numbers.

export const ART_SLOTS = {
  desk: { w: 1640, h: 560, note: 'Masa yüzeyi; ortadaki 1000 birim oyun alanı, iki yanda 320 birim geniş ekranlar için taşma. Işık ve vinyet kodla eklenir.' },
  window: { w: 150, h: 235, note: 'Sol üstte gece penceresi, çerçevesiyle.' },
  lamp: { w: 150, h: 260, note: 'Gaz lambası, tam tepeden. Alev ve ışık kodla çizilir; şişe ağzı boş kalsın.' },
  calendar: { w: 92, h: 118, note: 'Koparılmış takvim yaprağı, yazısız (tarih kodla yazılır).' },
  purse_note: { w: 120, h: 93, note: 'Para hesabı yazılan kâğıt parçası, yazısız.' },
  coin: { w: 30, h: 30, note: 'Bakır madeni para; masada döndürülerek tekrarlanır.' },
  coin_silver: { w: 30, h: 30, note: 'Gümüş (büyük) madeni para.' },
  brass_plate: { w: 150, h: 60, note: 'Pirinç isim levhası, yazısız.' },
  envelope: { w: 168, h: 104, note: 'Mektup zarfı, adres alanı boş.' },
  envelope_package: { w: 176, h: 116, note: 'Kâğıda sarılmış, iple bağlanmış paket.' },
  paper: { w: 360, h: 410, note: 'Mektup kâğıdı. Yazısız; el yazısı kodla yerleşir.' },
  pen: { w: 18, h: 170, note: 'Kırmızı sansür kalemi, uç aşağıda.' },
  candle: { w: 80, h: 90, note: 'Kulplu pirinç şamdanda mum, tam tepeden. Alev kodla çizilir.' },
  magnifier: { w: 120, h: 120, note: 'Büyüteç, sap sağ-aşağı. Cam kısmı saydam olsun.' },
  stamp: { w: 86, h: 52, note: 'Lastik mühür ıstampası. Yazı ve renk kodla basılır.' },
  tray: { w: 180, h: 120, note: 'Kilitli aletlerin karanlık tepsisi.' },
  ledger: { w: 520, h: 470, note: 'Gün sonu defteri, açık sayfa, yazısız.' },
  item_corap: { w: 96, h: 60, note: 'Paketten çıkan yün çorap.' },
  item_dut: { w: 58, h: 52, note: 'Bez kesede kuru dut.' },
} as const;

export type ArtSlotId = keyof typeof ART_SLOTS;
