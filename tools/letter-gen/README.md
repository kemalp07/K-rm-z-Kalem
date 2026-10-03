# letter-gen — Kırmızı Kalem yan mektup havuzu

Her gün masaya rastgele düşecek tek seferlik "yan mektupları" toplu üretir, kurallara göre
kontrol eder, ikinci bir modele (eleştirmen) puanlatır ve oyunun içerik dosyasına aktarır.

Yazım kuralları ve dünya bilgisi koda gömülü **değildir**; her çalıştırmada şu iki dosyadan okunur:

- `source/Mektup_Atolyesi.json` — SillyTavern karakter kartı (chara_card_v2)
- `source/Kirmizi_Kalem_Dunyasi.json` — SillyTavern world info (lorebook)

Dosyaları güncellediğinde araç da güncellenir. Yolları `config.yaml` belirler.

## Kurulum

```bash
cd tools/letter-gen
python3.11 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # proje, bölge, model adlarını doldur
gcloud auth application-default login   # ya da GOOGLE_APPLICATION_CREDENTIALS
```

Model adları, proje ve bölge yalnızca `.env`'den gelir. `.env` ve anahtar dosyaları git'e girmez.

## Komutlar

```bash
python -m letter_gen.cli generate -n 10 --dry-run          # modele gitmeden istekler + örnek prompt
python -m letter_gen.cli generate -n 10 --seed 42          # üret, kontrol et, eleştirmene incelet
python -m letter_gen.cli generate -n 20 -d cepheye --no-review
python -m letter_gen.cli review                            # incelenmemişleri incelet
python -m letter_gen.cli promote pool_cepheden_000003 --note "iyi"
python -m letter_gen.cli reject  pool_cepheye_000004  --note "klişe"
python -m letter_gen.cli stats
python -m letter_gen.cli export --out ../../content/pool_letters.json
```

`--dry-run` ayrıca lorebook'tan okunan yasak kelime listesini ve karttan okunan istek
etiketlerini gösterir: kart ya da lorebook biçimi değişince ilk bakılacak yer burası.

## Akış

1. **Örnekleyici** (`pools.yaml`): yön, ilişki, isim, yaş, memleket, meslek, rütbe, yazma biçimi
   ve okuryazarlık, ses, konu, saklanan şey, dikkatsizlik, uzunluk, paket. Tutarlılık kuralları:
   yazma biçimi–okuryazarlık birlikte seçilir; ilişki cinsiyeti ve yaş farkını belirler;
   bir çalıştırmada aynı isim+memleket tekrarlanmaz; bir isim havuzda en fazla
   `sampler.name_max_uses` kez geçer. Aynı `--seed` ve aynı havuz durumu aynı istekleri verir.
2. **Prompt**: kartın `system_prompt` + `description` + lorebook (önce sabit girdiler `order`
   sırasıyla, sonra anahtar kelimesi istekte geçenler); `mes_example` örnekleri çok turlu
   konuşma olarak; en sonda istek + `depth_prompt` + `post_history_instructions`.
3. **Üretim**: en fazla 4 eşzamanlı istek, geçici hatalarda üstel bekleme; token kullanımı ve
   (fiyatlar `.env`'de verilmişse) tahmini maliyet.
4. **Ayrıştırma**: BAŞLIK / HİTAP / GÖVDE / KAPANIŞ / İMZA / NOT / ZARF. Gövde cümlelere bölünür;
   ⟦ ⟧ içi `sensitive` segment olur; "(mühür: İsim)" imzadan ayrılır. Bozuk biçim → `rejected`.
5. **Kontroller** (`checks.py`): biçim, uzunluk, yasak kelimeler, okuryazarlık kelimeleri,
   anlatıcı izi, hassas bilgi dengesi, asker başlığı, zarf adresi, mühür, tekrar.
   Herhangi bir `fail` → `rejected`.
6. **Eleştirmen**: altı ölçüt (1–5) + sorunlu satırlar ve öneriler. Hepsi ≥4 → `accepted`,
   biri 3 → `needs_review`, biri ≤2 → `rejected` (`config.yaml`'da değiştirilebilir).
7. **Çıktı**: `pool/{accepted,needs_review,rejected}/<id>.json`, `pool/index.json`, `pool/report.md`.

## Mektup kaydı

Kullanıcının verdiği şemaya ek alanlar:

| Alan | Neden |
|---|---|
| `segments[].para` | Paragraf düzeni oyunda korunsun |
| `length_target` | Uzunluk kontrolünün hedefi |
| `hand` | Oyundaki el yazısı tipi (dictated / hurried / careful / elegant) |
| `meta.request_fields` | İsteğin yapılandırılmış hâli; istatistik ve yeniden üretim için |
| `meta.raw`, `meta.attempts`, `meta.lore` | Ham model çıktısı, deneme sayısı, kullanılan lorebook girdileri |
| `history` | Durum değişiklikleri (otomatik / elle, zaman, not) |
| `parse_error` | Biçim reddinin nedeni |

## Testler

```bash
pip install pytest && python -m pytest -q
```

Testler ağa çıkmaz; `tests/fixtures/` altındaki küçük sahte kart ve lorebook ile sahte bir
model istemcisi kullanır.

## Bilinen sınırlar

- Yasak kelime listesi, lorebook'taki "Dil kuralları ve yasak kelimeler" girdisinden tırnak
  içindeki ifadeler ve "yasak … :" satırlarındaki virgüllü listeler okunarak çıkarılır.
  Gerçek dosyada farklı yazılmışsa `--dry-run` çıktısından kontrol edip `checks.extra_forbidden`
  ile tamamla.
- Zarf adresi kontrolü kalıp benzerliğine bakar (askerî: alay/tabur/bölük…, ev: köy/kaza/mahalle…);
  askerî adreste `[..]` dışında rakam ya da yazıyla sıra sayısı varsa reddeder.
