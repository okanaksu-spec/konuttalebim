# Konuttalebim — Nasıl Çalıştırılır ve Ücretsiz Yayına Alınır

Bu sürüm artık gerçek bir **motora** sahip: üyelikler, talepler, teklifler ve mesajlar tek bir merkezde, kalıcı olarak saklanıyor. Önceki sürümde her şey sadece senin tarayıcındaydı; artık öyle değil.

---

## 1. Bilgisayarında çalıştırma (en kolay yol)

**Önce bir kez:** Bilgisayarında **Node.js** kurulu olmalı. Kontrol/kurulum:
- https://nodejs.org adresine gir, **LTS (22)** sürümünü indir ve kur. (Bir kez yapılır.)

**Her çalıştırma:**
1. Proje klasöründeki **`basla.command`** dosyasına çift tıkla.
2. Küçük bir siyah pencere açılır ve tarayıcında otomatik olarak **http://localhost:3000** açılır.
3. Site burada tam çalışır: üye ol, talep oluştur, teklif gönder, eşleş, mesajlaş.
4. Durdurmak için o siyah pencerede **Control + C** yap veya pencereyi kapat.

> İlk çift tıkta Mac "geliştirici doğrulanamadı" uyarısı verirse: dosyaya **sağ tık → Aç → Aç** de. Bu sadece ilk seferde gerekir.

**Önemli:** Artık `index.html` dosyasına doğrudan çift tıklama **çalışmaz** (çünkü site verileri sunucudan alıyor). Her zaman `basla.command` ile aç.

**Demo giriş bilgileri** (istersen hazır hesaplarla dene):
- Alıcı: `deniz@ornek.com` / `demo1234`
- Satıcı: `selin@ornek.com` / `demo1234`
- Admin: `admin@konuttalebim.com` / `demo1234`

---

## 2. Başkalarının da kullanabilmesi için internete koyma (ücretsiz)

Bilgisayarında çalışan site sadece sende görünür. Başkalarının kendi telefonundan girebilmesi için siteyi bir **sunucuya** koymak gerekir. Ücretsiz başlamak için önerilen yol:

### Adımlar (birlikte yapabiliriz)
1. **GitHub hesabı aç** (ücretsiz) — proje dosyalarını buraya koyarız. Kod için "depo" gibi düşün.
2. **Render.com hesabı aç** (ücretsiz) — "New Web Service" de, GitHub'daki projeyi seç.
3. Render ayarları:
   - Build command: (boş bırak)
   - Start command: `node --experimental-sqlite server.mjs`
   - Root: `server` klasörü
4. Render sana `https://konuttalebim.onrender.com` gibi bir **canlı adres** verir. Bu adresi herkes açabilir.

### Ücretsiz katmanın tek sınırı
Render'ın ücretsiz planında site bir süre kullanılmayınca "uykuya" geçer ve **kayıtlar zaman zaman sıfırlanabilir.** Yani ücretsiz sürüm gerçek kullanıcılarla **denemek** için harikadır, ama "kalıcı ve hiç sıfırlanmayan" bir sistem için küçük bir sonraki adım gerekir:

- **Kalıcı ücretsiz veritabanı:** Neon.com (ücretsiz PostgreSQL) bağlarız — kayıtlar bir daha asla sıfırlanmaz. Bu, sadece birkaç satır ayar değişikliğidir; motor buna göre tasarlandı.

> İstersen bu yayına alma adımlarını (GitHub + Render + Neon) seninle **birlikte, adım adım** yapabilirim. Senin sadece birkaç hesap açman ve birkaç düğmeye tıklaman yeterli; teknik kısımları ben hallederim.

---

## 3. Şu an gerçekten çalışan özellikler

- Üyelik (alıcı / satıcı / danışman) — şifreler güvenli biçimde şifrelenerek saklanır
- Giriş / çıkış (oturum çerezi ile), profil güncelleme
- Talep oluşturma, ev/ilan ekleme
- Otomatik eşleştirme (uygun taraflara bildirim)
- Teklif gönderme, "ilgileniyorum / bilgi istiyorum / uygun değil"
- Eşleşme ve platform içi mesajlaşma
- **Mesajlarda telefon/e-posta/adres otomatik gizleme (sunucuda, atlatılamaz)**
- **İletişim kartı yalnızca ilgili üyelik alınıp iki taraf da onayladığında açılır**
- Bütçe beyanı (belge istenmez), paket/üyelik satın alma (şimdilik demo ödeme)
- Veriler yeniden başlatmada kaybolmaz (kalıcı veritabanı)

## 4. Henüz gerçek servise bağlanmayı bekleyenler
- Gerçek ödeme (iyzico/PayTR) — şu an demo; canlıda birkaç ayarla bağlanır
- Gerçek e-posta/SMS gönderimi — şu an kayıt tutuluyor, gönderim canlıda eklenir
- E-posta doğrulama ve şifre sıfırlama akışının kullanıcıya açılması

Detaylı teknik yol haritası için `MIMARI-PLAN.md` dosyasına bak.
