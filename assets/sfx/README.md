# assets/sfx — ses slotları

Dosya yoksa oyun **sessiz** geçer; hiçbir şey kırılmaz.

## Ses eklemek

1. Dosyayı aşağıdaki adla bu klasöre koy (`.mp3`, `.m4a`, `.wav` veya `.ogg`).
2. `npm run assets` çalıştır.

| Dosya adı | Ne zaman çalar | Not |
|---|---|---|
| `envelope_tear` | Zarf ortaya bırakılıp açılınca | Kısa, kuru bir yırtılma. |
| `paper` | Mektup kâğıdı açılırken / defter kayarken | Kâğıt hışırtısı. |
| `pen` | Kalemle karalarken (her yeni çizgide) | Kalem ucunun kâğıtta sürtünmesi, kısa. |
| `stamp` | Mühür basılınca | Tok, lastik bir vuruş. |
| `flame` | Sürekli, döngüde, çok kısık | Lamba fitilinin hafif hışırtısı; sorunsuz döngü olmalı. |
| `candle` | Mum alınınca | Kibrit/fitil, çok kısa. |
| `drawer` | Gün sonu, lamba kısılırken | Çekmece ya da vidanın kısılma sesi. |

Ses kimliklerinin kaynağı `src/sfx/sfx.ts`.
