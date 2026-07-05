# Konuttalebim'i Ücretsiz İnternete Koyma (Render)

Hedef: herkesin girebileceği canlı bir adres, örn. `https://konuttalebim.onrender.com`.
İki ücretsiz hesap açacağız: **GitHub** (kodu tutar) ve **Render** (siteyi çalıştırır). Kredi kartı gerekmez.

Sende `konuttalebim-yayin.zip` dosyası var. **Önce ona çift tıklayıp klasörü çıkar** (Mac otomatik açar). İçindeki dosyaları GitHub'a yükleyeceğiz.

---

## Adım 1 — GitHub hesabı aç (2 dk)
1. https://github.com/signup adresine gir.
2. E-posta, şifre, kullanıcı adı belirle, e-postanı doğrula. Bitti.

## Adım 2 — Kodu GitHub'a yükle (3 dk)
1. Giriş yaptıktan sonra sağ üstte **+ → New repository**.
2. **Repository name:** `konuttalebim` yaz. **Public** seçili kalsın. **Create repository** de.
3. Açılan sayfada **"uploading an existing file"** bağlantısına tıkla.
4. `konuttalebim-yayin` klasörünü aç, **içindeki her şeyi seç** (index.html, app.js, styles.css, render.yaml, server klasörü, assets klasörü…) ve yükleme alanına **sürükle bırak**.
5. Aşağıda **Commit changes** düğmesine bas. Dosyalar yüklendi.

> `konuttalebim-yayin.zip` dosyasını değil, **içinden çıkan dosyaları** yükle.

## Adım 3 — Render hesabı aç (2 dk)
1. https://render.com adresine gir, **Get Started / Sign Up**.
2. **"Sign in with GitHub"** ile gir (en kolayı). İzin iste ekranında **Authorize** de.

## Adım 4 — Siteyi yayınla (3 dk)
1. Render panelinde **New + → Blueprint**.
2. `konuttalebim` deposunu seç. Render, içindeki `render.yaml` dosyasını otomatik görür.
3. **Apply / Create** de. Render kurmaya başlar (birkaç dakika sürer).
4. Bitince yeşil **Live** yazısı ve `https://konuttalebim-xxxx.onrender.com` gibi bir **adres** çıkar. O adres herkese açık!

**Test:** Adresi telefonundan aç, üye ol, talep oluştur. Demo giriş: `deniz@ornek.com` / `demo1234`.

---

## Bilmen gereken tek sınır
Ücretsiz planda site **15 dakika kullanılmayınca uykuya** dalar; sonraki ilk açılış ~1 dakika sürer (uyanma). Ayrıca ücretsiz katmanda depolama kalıcı olmadığından, güncelleme/yeniden başlatmada **kayıtlar zaman zaman sıfırlanabilir.** Gerçek kullanıcılarla denemek için sorun değil.

Kayıtların **asla sıfırlanmaması** için sıradaki küçük adım: ücretsiz **Neon** veritabanını bağlamak. Hazır olduğunda bunu birlikte yaparız (motor buna göre tasarlandı, sadece birkaç ayar).

---

## Takılırsan
Bu adımları senin tarayıcında **birlikte, tıklaya tıklaya** yapabilirim. "Birlikte yapalım" de yeter; ekranda yönlendiririm. Hesap açma (e-posta/şifre) kısımlarını sen yaparsın, gerisinde ben tıklarım.
