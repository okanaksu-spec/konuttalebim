# Konuttalebim MVP

Bu klasör, Konuttalebim için ilk çalışan web uygulaması prototipini içerir.

## Nasıl açılır?

`index.html` dosyasını tarayıcıda açman yeterli.

## Denenecek ana akışlar

1. Üst menüden `Üye ol` ile alıcı, satıcı veya danışman hesabı oluştur.
2. Oluşan hesap otomatik giriş yapar ve role göre panele yönlenir.
3. Alıcı panelinde `Yeni Talep` ekranından talep oluştur.
4. Satıcı panelinde `Alıcı Talepleri` ekranında talebi gör ve teklif gönder.
5. Alıcı hesabıyla `Gelen Teklifler` ekranında teklifi incele ve `İlgileniyorum` de.
6. `Bütçe Beyanı` ekranında bütçe aralığını ve peşinatını güncelle.
7. `Mesajlar` ekranında mesaj gönder. Telefon/e-posta yazarsan otomatik maskelenir.
8. Alıcı ve satıcı tarafında `Bilgileri Gör` üyeliği alınıp iletişim onayı verildiğinde iletişim kartı açılır.
9. `Admin modu` ile kullanıcılar, e-posta outbox, satıcı belgeleri, şikayetler, risk sinyalleri ve audit kayıtlarını incele.

## Üyelik durumu

- Üye olma, giriş yapma, çıkış yapma ve profil bilgisi güncelleme demo olarak çalışır.
- Kayıtlı kullanıcı admin panelindeki kullanıcılar tablosunda görünür.
- Üyelik karşılama e-postası gerçek gönderilmez; mock outbox kaydı oluşur.
- Bu sürümde şifreler yalnızca demo amaçlı localStorage içinde tutulur. Canlı sürümde şifre hashleme, güvenli oturum, e-posta doğrulama ve sunucu tarafı kayıt sistemi gerekir.

## Gelir modeli

- Alıcı talebini `Talebimi Üste Taşı` reklamıyla üst sıralara çıkarabilir.
- Satıcı ilanını `İlanımı Üste Taşı` reklamıyla uygun alıcıların önüne çıkarabilir.
- Alıcı, satıcının telefon/e-posta bilgisini görmek için `Satıcı Bilgilerini Gör` üyeliği alır.
- Satıcı, alıcının telefon/e-posta bilgisini görmek için `Alıcı Bilgilerini Gör` üyeliği alır.
- Emlak danışmanları için çoklu portföy ve iletişim hakkı içeren profesyonel paket vardır.

## Bu sürümde çalışanlar

- Ana sayfa ve public bilgilendirme sayfaları
- Rol seçimi
- Demo üyelik kaydı ve giriş/çıkış
- Profil bilgisi güncelleme
- Alıcı paneli
- Satıcı paneli
- Admin panel temeli
- Talep oluşturma
- Ev ekleme
- Teklif gönderme
- Gelen teklif detayı
- Eşleşme oluşturma
- Mesajlaşma
- Hassas bilgi maskeleme
- Çift taraflı iletişim onayı
- Alıcı bütçe beyanı
- Uygun talep/ev girildiğinde anlık mock e-posta outbox kaydı
- Talep/ilan üste taşıma reklamı
- Bilgileri görme üyeliği
- Mock paket/ödeme seçimi ve admin ödeme tablosu
- Yerel veri saklama

## Not

Bu sürüm dış servis kullanmaz. E-posta gönderimi mock outbox olarak tutulur. Gerçek üretim aşamasında auth, PostgreSQL/Prisma, ödeme, SMS/e-posta, dosya depolama ve satıcı belge inceleme servisleri bu mimarinin üzerine bağlanmalıdır.
