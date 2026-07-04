# CLAUDE.md — aselovers-web

Astro tabanlı e-ticaret sitesi. İçerir: admin panel, blog (JSON DB), guest chat + traffic
analytics, PayTR ödeme entegrasyonu, Etsy senkron.

Komutlar: `npm run dev` (astro dev) · `npm run build` · `npm run preview` ·
`npm test` (vitest) · `npm run sync` (Etsy).

---

## Skill yönlendirme kuralı (ZORUNLU)

Bir işe başlamadan önce türünü belirle ve aşağıdaki tabloda o iş için işaretlenen skill'i
**mutlaka** kullan. Her kategoride "önce hangi skill" bellidir: önce süreç skill'i (planlama/
brainstorm), sonra uygulama skill'i (tasarım/kod). Emin değilsen daha iddialı olanı seç.

| İş türü | Önce çağır | Sonra / birlikte |
|---|---|---|
| **Yeni özellik / "X yapalım"** | `superpowers:brainstorming` | `superpowers:writing-plans` → `superpowers:executing-plans` |
| **UI/UX tasarım kararı** (renk, tipografi, stil, layout yönü) | `ui-ux-pro-max` | `frontend-design:frontend-design` |
| **Tasarımı koda dökme** (Astro/React/Tailwind bileşen) | `ui-ux-pro-max` | `ui-styling` (shadcn/Tailwind) |
| **Tasarım sistemi / tokenlar** | `design-system` | `ui-ux-pro-max` |
| **Marka / ton / kimlik** | `brand` | `design` |
| **Banner / sosyal görsel / hero** | `banner-design` | `design` |
| **Slayt / sunum** | `slides` | `design-system` |
| **Araştırma + içerik/blog yazımı (SEO)** | `content-research-writer` | `superpowers:brainstorming` (konu netleştirme) |
| **Bug / hata / beklenmedik davranış** | `superpowers:systematic-debugging` | ilgili domain skill'i |
| **Kod yazımı (feature/fix)** | `superpowers:test-driven-development` | — |
| **Uygulamayı gerçekten çalıştırıp doğrulama** | `webapp-testing` (Playwright) | `/run`, `/verify` |
| **İş bitti / merge öncesi** | `superpowers:verification-before-completion` | `superpowers:requesting-code-review` |

### İddialı seçim politikası
- **Tasarım = `ui-ux-pro-max` + `frontend-design` ikilisi.** ui-ux-pro-max yön/stil/stack
  zekâsını verir (Astro dahil 21 stack, 67 stil, 161 palet); frontend-design şablon
  görünümünden kaçınan özgün, karakterli uygulamayı getirir. İkisini birlikte kullan.
- **Araştırma = `content-research-writer`** ("awesome" listeden gelen en güçlü araştırma+yazım
  skill'i). Blog ve SEO işlerinin varsayılanı budur.
- **Planlama = superpowers.** Çok adımlı her işte brainstorming → writing-plans → executing.

### Notlar
- `brand-guidelines` (global) **Anthropic'in** marka kimliğidir; ASElovers markası için değil —
  kullanıcı açıkça Anthropic görünümü istemedikçe kullanma. ASElovers markası için `brand` kullan.
- `theme-factory` (global): hızlı hazır tema uygulamak için artifact/HTML işlerinde yardımcı.
- Proje-scope skill'lerin (`ui-ux-pro-max`, `design*`, `ui-styling`, `brand`, `banner-design`,
  `slides`) bazıları Python script'i barındırır; çalıştırmak için `python` gerekir.

## Genel kurallar
- Yanıtları kullanıcının dilinde (Türkçe) ver.
- Astro projesi: bileşenler `.astro`; stil için Tailwind tercih et, mevcut konvansiyona uy.
- Değişiklikten sonra iddia etmeden önce `npm test` / build ile doğrula.
