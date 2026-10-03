# Kırmızı Kalem — 2. aşama planı

Amaç: oyuncu cevabı oyundan almasın, **kendisi bulsun**; oyun ilerledikçe yeni aletlerle
zorlaşsın; kararlarının bedeli dünyada (gazetede) görünsün.

Beş parça, bu sırayla:

| | Parça | Ne getirir |
|---|---|---|
| **A** | Talimatname + büyüteç + kalemle işaretleme | Oynanışın çekirdeği: kurallar kitapta, inceleme oyuncuda |
| **B** | Günler ve aletler | Gün 2–15, her birkaç günde yeni bir alet |
| **C** | Gazete | Gündelik haberler ve kararların bedeli |
| **D** | Mektup çeşitlendirme ve sahtecilik | Kâğıt, zarf, pul, damga, mühür türleri; yan mektuplarda ara sıra sahte |
| **E** | Kalan 200 yan mektup | D'deki alanlarla birlikte üretilir |

Her parçanın sonunda web sürümü güncellenir ve sen denersin.

---

## A. Talimatname, büyüteç, kalemle işaretleme

### A1. Talimatname (kitapçık)

Masada kırmızı ciltli ince defter (`booklet`). Dokununca açılır (`booklet_open`), sayfa
köşesine dokununca sayfa çevrilir, dışarı dokununca kapanır. Yeni alet geldikçe deftere
**ek sayfa** yapıştırılmış olur; "Şube Talimatı" kâğıdı defterin ilk sayfası olur.

| Sayfa | İçerik | Ne yakalatır |
|---|---|---|
| 1. Şube Talimatı | Bugünkü kurallar (karala, mumla yokla, büyüteçle bak, mühürle) | — |
| 2. Takvim ve posta | Rumi aylar ve gün sayıları (Nisan 30, Mayıs 31, Haziran 30…); "Rumi tarih Miladi'den 13 gün geridir"; posta süreleri: cepheden Dersaadet'e 3–6 gün, Anadolu köyüne 10–20 gün | "31 Nisan" gibi olmayan tarih; masaya geldiği günden sonra yazılmış mektup; cepheden dün yazılıp bugün gelmiş köy mektubu |
| 3. Mühürler | 6–8 resmî mühür örneği (Şube, alaylar, bilinen kumpanyalar): halka yazısı, ortadaki işaret, renk. Kurallar: "Kumpanya mühürleri mor basılır", "Yazı düz okunur", "Şahsi mühür yalnız sahibinin adını taşır" | Ters kazınmış, yanlış renk, harfi eksik/yanlış mühür; şahsi mühürde fazladan yazı |
| 4. Posta damgası ve pul | Damga biçimi (şube adı + tarih); pul değerleri (mektup 20 para, kartpostal 10 para); "Asker mektubu pulsuz gider" | Damga tarihi mektuptan önce; cepheden gelen mektupta pul; yanlış değerde ya da ters yapışık pul |
| 5. Adresler | Lorebook'taki köy / şehir / askerî adres kalıpları | Askerî adreste yer adı ya da uydurma birlik numarası |
| 6. Karalanacaklar | Yer, sayı, kayıp, ikmal saati, komutan adı, hastalık, bozgunculuk | Neyin karalanacağı |
| Ek sayfalar | Her yeni alet gelince: kimya, ışık, ızgara… | — |

Mühürler, damgalar ve kitaptaki örnekler **kodla** çizilir (yüzlerce küçük varyasyon
gerekeceği için); sayfa zemini senin görselin.

### A2. Büyüteç: sadece büyütür

Not kâğıdı ("mühür ters kazınmış") **kalkar**. Büyüteç küçük ayrıntıları okunur kılar:
mühür halkasındaki yazı, mürekkebin altındaki silik kurşun kalem, posta damgasının tarihi,
pulun deseni. Ne anlama geldiğine oyuncu talimatnameye bakarak karar verir.

### A3. Kırmızı kalemle daire: "burası şüpheli"

Kalem elindeyken bir yerin etrafına **kapalı bir halka** çizmek = işaretlemek.
Satırın üstünden geçmek eskisi gibi karalamaktır; ikisini çizginin şeklinden ayırırım
(başı ve sonu birbirine yakın, içi alan kaplayan çizgi = daire).

- Daire bir sahtelik noktasını (mühür, tarih, damga, pul, bir kelime) içine alıyorsa
  `mektup:işaretlendi:hedef` bayrağı oluşur; sonuçlar bundan sonra "büyüteçle baktı"
  yerine buna bakar.
- Masum bir yeri işaretlemek bayrak üretmez; işaretli mektubu İSTİHBARAT'a vermek
  sonuç doğurur (yanlış kişi sorgulanır, gazetede görünür).
- Gün sonu defteri her işareti söyler: doğruysa "mühür işaretlendi", yanlışsa **uyarı**:
  "Hatice Hanım'ın mektubunda tarih işaretlendi; tarih doğruydu." Oyuncu neyi yanlış
  yaptığını görür ve bir sonrakinde talimatnameye daha dikkatli bakar.

---

## B. Günler ve aletler

### B1. Takvim

Oyun 5 Mayıs – ~10 Haziran 1331 arası, **15 oynanabilir gün** (her takvim günü değil;
takvim yaprağı atlar). Her gün: **3 ana hikâye mektubu + 2–3 yan mektup**.

### B2. Alet takvimi

| Gün | Alet | Mekanik | Mektuplarda gereken |
|---|---|---|---|
| 1 | Kırmızı kalem, Talimatname | Karala, daire çiz; kitaba bak | — |
| 2 | Büyüteç | Büyütür | Küçük ayrıntılı mühür/damga |
| 3 | Mum | Isıyla beliren mürekkep; artık **kâğıdın her yerinde** (kenar boşluğu, imza altı, köşe) | `hiddenInk` için yer bilgisi |
| 5 | Buhar çaydanlığı | Zarfı buhara tut: kapak açılır, pul kalkar | Pulun altındaki yazı, zarftaki ikinci kâğıt |
| 7 | Işığa tutma | Mektubu lambanın önüne sürükle: filigran görünür | Kâğıt türü ve filigranı |
| 9 | Kimya şişesi + fırça | Fırçayla şerit çek: mumla çıkmayan mürekkep şerit boyunca belirir | `hiddenInk` türü: ısı / kimya |
| 11 | Kod kitabı | Masum görünen kod kelimeler ("kayık", "incir", "fener") kitapta; oyuncu daireyle işaretler | Kod kelime listesi |
| 13 | Kardan ızgarası | Kartı mektubun üstüne oturt; delikler gizli kelimeleri seçer (delikleri kod, kelimelerin yerine göre keser) | Izgaralı mektuplar (elle yazılır) |
| 15 | Şifre çarkı | İç diski çevir; şifreli satırı çöz. Anahtar başka bir mektupta ya da **gazete ilanında** | Şifreli satır + anahtar |

Her alet geldiği gün kendi talimat kâğıdıyla gelir (sistem hazır) ve talimatnameye ek
sayfası yapışır. Kilitli tepsideki üç siluet (ızgara, çark, kod kitabı) sırası gelince açılır.

### B3. Ana hikâye mektupları

Hatlar devam eder: Mehmet ↔ Hatice, Rıza ↔ Emine, Saadet ↔ Nuri ve **imzasız casus ağı**
(her yeni aletin asıl sınandığı hat). Önce sana **15 günlük bir hikâye taslağı** getiririm
(hangi gün hangi hatta ne oluyor, casus ağı hangi aletle yakalanıyor); onaydan sonra:
aile hatlarının mektuplarını `letter-gen` ile Author's Note'taki "hat durumu" notuyla
taslak yazarım, sen düzeltirsin; casus mektuplarını (gizli katmanlı) ben elle yazarım.

---

## C. Gazete

### C1. Görünüş

Her sabah (gün 2'den itibaren) masada katlanmış gazete (`newspaper_folded`); dokununca tek
sayfa açılır (`newspaper_page`). Adı: ***Ceride-i Havadis-i Harbiye*** (1915'te böyle bir
gazete yok; 1840'ların "Ceride-i Havadis"ini anımsatan, dönem usulü bir ad).
Başlık bandı: ad, Rumi + Miladi tarih, "10 para".

**Üslup:** başlıklar ve kalıplar ağır dönem dili ("Harbiye Nezaret-i Celilesinin
Tebliğidir", "Vefeyat", "İlânât", "Havadis-i Dâhiliye"); haberlerin gövdesi bugün de okunur
ama eski kelimelerle ("fiat", "vapur-ı mezkûr", "dün akşam", "malûmat alınmıştır").

Dört sütun:

1. **Harp tebliği** — resmî ağızdan kısa haber; bazı satırları sansürden **karartılmış** basılır.
2. **Şehir ve memleket** — ekmek/şeker fiyatı, vapur seferi, yangın, okullar.
3. **Vefeyat ve ilanlar** — ölüm ilanları, kayıp ilanı, satılık tarla, arzuhalci reklamı.
4. **Bedel** — olduğu günlerde küçük, imzasız bir haber.

Her sayıda bir gravür (dört görsel hazır).

### C2. İçerik nereden

| Kaynak | Nasıl | Örnek |
|---|---|---|
| Gündelik haberler | "Gazete Atölyesi": `letter-gen`'in kardeşi; aynı lorebook + yeni küçük bir kart; günde 6–8 kısa haber; eleştirmen + senin onayın | "Un fiatı okkada 3 kuruş arttı." |
| Bedel haberleri | Elle yazılır; her biri koşul + gecikme (gün) | İmzasız mektup İSTİHBARAT'a verildiyse 3 gün sonra: "Galata'da bir ticarethane kapatıldı." |
| Yan mektupların izi | Kod hesaplar | Çok mektup durdurulduysa "Postalarda gecikme"; şehit haberi iletildiyse birkaç gün sonra o köyden vefat ilanı |

İçerik dosyası: `content/newspapers/gunNN.json` (sütunlar, haberler, koşullu haberler).

---

## D. Mektup çeşitlendirme ve sahtecilik

Mektuplara yeni alanlar: `paper` (düz, çizgili defter yaprağı, kaba kâğıt, antetli),
`envelope` (zarf, kumpanya zarfı, asker üçgeni, kartpostal), `stamp` (5 desen, değer, ters mi),
`postmark` (şube, tarih), `seal` (resmî/şahsi, renk, yazı). Hepsi talimatnamedeki kurallarla
kontrol edilebilir.

Yan mektuplarda: araç bu alanları kurallara **uygun** doldurur; **%5'ine** tek bir sahtelik
koyar (kod koyar, model değil — ne olduğu kesin bilinir). Böylece oyuncu her gün sıradan
mektuplar arasında ara sıra bir tutarsızlık yakalar.

## E. Kalan 200 yan mektup

D bittikten sonra, yeni alanlarla birlikte üretilir (örnekleyici kâğıt/zarf türünü
gönderene göre seçer: asker → üçgen ya da kaba kâğıt, kumpanya → antetli…).

---

## Görseller

| Görsel | Nerede kullanılır |
|---|---|
| Talimatname (kapalı, açık) | A1 |
| Kod kitabı, ızgara kartı, şifre çarkı | B2 (gün 11, 13, 15) |
| Çaydanlık, ispirto ocağı | B2 (gün 5) |
| Şişe, fırça, kap | B2 (gün 9) |
| Gazete (katlı, sayfa), 4 gravür | C |
| 3 kâğıt, 4 zarf/kartpostal, 5 pul | D |

Hepsi hazır (`assets/art/source/`); her biri kendi parçasıyla kesilip yerleştirilir.

## Kararlar

1. **Gün sayısı:** 15 oynanabilir gün.
2. **Gazete:** *Ceride-i Havadis-i Harbiye*; başlıklar ağır dönem dili, haberler sade.
3. **Ana hikâye:** aile hatlarının mektuplarını ben taslak yazarım, sen düzeltirsin.
4. **Yanlış işaretleme:** gün sonu defterinde uyarı.

## İleride

- Ses (kâğıt hışırtısı, damga, gece sesleri).
- Telgraf (kısa, kodlu, ücretli mesajlar) — yeni bir mektup türü.
- Şube müdürünün haftalık değerlendirmesi (çok karalayan / az karalayan kâtip).
