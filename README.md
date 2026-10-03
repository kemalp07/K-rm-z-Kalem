# Kırmızı Kalem

1915, Çanakkale. Bir sansür kâtibinin gece masası. Mobil (yalnızca yatay), Expo + Skia.

## Çalıştırma

```bash
npm install
npx expo start          # Expo Go ya da development build ile aç
npm run web             # tarayıcıda, geliştirme sunucusuyla
npm run build:web       # dist/ altına statik web sürümü (canvaskit.wasm dahil)
npm run typecheck       # tsc --noEmit
npm test                # saf oyun mantığı testleri (jest)
npm run assets          # assets/art ve assets/sfx manifestlerini yeniden üret
```

Skia, Reanimated ve Gesture Handler Expo Go'da hazır gelir. Expo Go'da sorun çıkarsa
`npx expo run:android` / `npx expo run:ios` ile development build alın.

Web sürümü her push'ta `.github/workflows/web.yml` ile GitHub Pages'e yayınlanır.
Bir kez açmak gerekir: depo **Settings → Pages → Source: GitHub Actions**.

## Yapı

```
app/                 expo-router — tek ekran
content/             TÜM oyuncu metni: day01.json, threads.json, desk.json, strings/tr.json
src/content/         şema tipleri, yükleyici, içerik doğrulayıcı, t() metin erişimi
src/logic/           saf oyun mantığı: flag'ler, koşullar, variant'lar, karalama, ısı, gün akışı (+ testler)
src/state/           zustand store + AsyncStorage kaydı
src/scene/           Skia sahne: masa, pencere, lamba, ışık havuzu, vinyet, ana ekran ve dokunma denetimi
src/objects/         masadaki nesneler: zarf, mektup, aletler, mühürler, defter…
src/art/  src/sfx/   art slot ve ses slot sistemleri
assets/art/README.md hangi slotun hangi ölçüde görsel beklediği
assets/sfx/README.md hangi sesin ne zaman çaldığı
```

## İçerik yazmak

Bir mektup `content/dayNN.json` içinde `segments` listesidir. Her segment `normal`,
`sensitive` ya da `hiddenInk` (`revealBy: "mum"`). Kararlar flag üretir
(`d1_mehmet:delivered`, `d1_mehmet:censored:s3`, `d1_mehmet:revealed:s4`,
`d1_imzasiz:inspected:seal` …). Sonraki günlerin mektupları `variants` ile bu flag'lere
göre segment ekler/çıkarır/değiştirir; gün sonu cümleleri `outcomes` ile aynı koşul
diliyle seçilir (ilk eşleşen; sonuncusu koşulsuz olmalı). İçerik hataları geliştirme
modunda açılışta konsola yazılır ve `npm test` ile yakalanır.
