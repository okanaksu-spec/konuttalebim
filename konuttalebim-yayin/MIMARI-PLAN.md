# Konuttalebim — Prototipten Canlı Ürüne Geçiş Mimari Planı

**Sürüm:** 1.0 · **Tarih:** 5 Temmuz 2026
**Karar:** Mevcut vanilla-JS arayüz korunur, ayrı bir Node API katmanı kurulur (Fastify/NestJS + Prisma + PostgreSQL).
**Amaç:** Çalışan statik MVP'yi hiç bozmadan, adım adım gerçek backend'e taşımak.

---

## 1. Yönetici Özeti

Konuttalebim şu an tamamen tarayıcıda çalışan, verisini `localStorage`'da tutan tek sayfalık (SPA) bir prototip. Domain modeli olgun: 16 varlık, tüm ana akışlar (talep → teklif → eşleşme → mesaj → iletişim açma) ve gelir modeli (reklam + bilgi görme üyeliği) kodda mevcut ve tutarlı. Yani **iş mantığı zaten tasarlanmış durumda** — eksik olan, bunun sunucu tarafında güvenli, kalıcı ve ölçeklenebilir biçimde çalışması.

Geçiş stratejisi tek cümlede: **Frontend'deki tüm veri okuma/yazma işlemlerini tek bir soyutlama katmanının (`store`) arkasına al, sonra bu katmanın içini `localStorage`'dan `fetch` (API) çağrılarına çevir.** Böylece arayüz kodunun %90'ı aynı kalır, MVP her aşamada çalışır durumda kalır.

Bu doküman; hedef mimariyi, tam Prisma şemasını, REST API sözleşmesini, güvenlik/KVKK tasarımını ve 6 fazlık yol haritasını içerir.

---

## 2. Mevcut Durumun Envanteri

### Dosyalar
| Dosya | Satır | Rol |
|---|---|---|
| `index.html` | 18 | Sadece `#app` kabuğu + script/style bağlama |
| `app.js` | ~2119 | Tüm SPA: state, router, render, iş mantığı, event handler |
| `styles.css` | ~1779 | Tüm stil |
| `assets/` | 4 png | Hero + örnek ilan görselleri |

### Mimari gözlemler
- **Router:** hash/path tabanlı, `render()` içinde string switch. `dashboard/alici*`, `dashboard/satici*`, `dashboard/admin*` ve public sayfalar.
- **State:** tek global `state` nesnesi, `seedState()` demo verisiyle başlar, `saveState()` her mutasyonda `localStorage`'a yazar.
- **Render:** her aksiyon sonrası `innerHTML` ile tüm sayfa yeniden çizilir (framework yok).
- **İş mantığı:** eşleşme skoru (`calculateMatchScore`), hassas bilgi maskeleme (`maskSensitiveInfo`), iletişim açma state machine'i (`approveContact`) hepsi client'ta.

### 16 varlık (mevcut veri modeli)
`User`, `AuthAccount`, `BuyerProfile`, `Plan`, `Demand`, `Property`, `Offer`, `Match`, `Message`, `VerificationDocument`, `Notification`, `EmailOutbox`, `Complaint`, `AbuseSignal`, `AuditLog`, `Payment`.

### Kritik güvenlik borçları (canlıya çıkmadan kapatılmalı)
1. Şifreler düz metin `localStorage`'da → **hash (argon2/bcrypt) + sunucu.**
2. Maskeleme client'ta → **istemci atlatılabilir; sunucuda zorunlu.**
3. İletişim açma kuralı client'ta → **yetki kontrolü sunucuda.**
4. Ödeme ve e-posta mock → **gerçek sağlayıcı + webhook doğrulama.**
5. Yetkilendirme yok → **rol bazlı erişim (RBAC) her endpoint'te.**

---

## 3. Hedef Mimari

```
┌─────────────────────────────────────────────────────────────┐
│  TARAYICI (mevcut vanilla-JS SPA — korunuyor)                │
│  index.html · app.js · styles.css                            │
│                                                              │
│   app.js  ──►  store.js (YENİ soyutlama katmanı)             │
│                   │  Faz 1'de localStorage'ı sarar           │
│                   │  Faz 3'te fetch() + JWT'ye döner          │
└───────────────────┼──────────────────────────────────────────┘
                     │  HTTPS / REST + JSON (JWT cookie)
┌────────────────────▼─────────────────────────────────────────┐
│  API SUNUCUSU  (Node 20 · Fastify · TypeScript)              │
│  ├─ routes/        REST endpoint'leri                        │
│  ├─ services/      iş mantığı (match, mask, contact-unlock)  │
│  ├─ middleware/    auth (JWT), rbac, rate-limit, validation  │
│  ├─ adapters/      payment(iyzico) · mail(SES/Resend) · sms  │
│  └─ prisma/        şema + migration                          │
└────────────────────┬─────────────────────────────────────────┘
                     │  Prisma ORM
┌────────────────────▼─────────────────────────────────────────┐
│  PostgreSQL 16   ·   (opsiyonel) Redis: rate-limit + session │
└──────────────────────────────────────────────────────────────┘
        │ iyzico/PayTR (ödeme)   │ Resend/SES (e-posta)   │ NetGSM/İleti (SMS)
```

### Stack seçimi ve gerekçe

**Backend framework: Fastify (öneri)** — NestJS'e alternatif olarak.
- **Fastify:** hafif, hızlı, düşük boilerplate; küçük–orta ekip ve tek servis için ideal. Şema tabanlı doğrulama (JSON Schema/Zod) hazır. Bu MVP'nin ölçeği için en pragmatik.
- **NestJS:** daha kurumsal, katmanlı (module/controller/service/guard), DI ve test altyapısı güçlü; ekip büyüyecekse veya çok sayıda geliştirici olacaksa tercih edilir. Boilerplate maliyeti yüksek.

> **Öneri:** Faz 2'de **Fastify** ile başla. İlerde ekip büyürse NestJS'e taşınabilir; servis katmanı framework-bağımsız yazıldığı sürece maliyet düşük kalır.

| Katman | Seçim | Neden |
|---|---|---|
| Runtime | Node.js 20 LTS | Uzun destek, yaygın |
| Dil | TypeScript | Tip güvenliği, refactor kolaylığı |
| Framework | Fastify (alt: NestJS) | Hız + düşük boilerplate |
| ORM | Prisma | Şema-önce, migration, tip güvenli sorgu |
| DB | PostgreSQL 16 | İlişkisel model bu domaine uygun |
| Auth | JWT (httpOnly cookie) + argon2 | Stateless + güvenli hash |
| Doğrulama | Zod | Runtime input validation |
| Rate limit / cache | Redis (opsiyonel, Faz 5) | Rate limit, oturum kara listesi |
| Ödeme | iyzico veya PayTR | Türkiye, kart + taksit |
| E-posta | Resend veya Amazon SES | Kalkış hızı vs. maliyet |
| SMS | NetGSM / İleti Merkezi | TR yerel |
| Depolama | (İleride) S3/R2 | Belge/görsel; MVP'de gerekmez |

---

## 4. Repo / Klasör Yapısı (hedef monorepo)

```
konuttalebim/
├─ web/                      # mevcut frontend (taşınır, aynen çalışır)
│  ├─ index.html
│  ├─ app.js
│  ├─ store.js               # YENİ: veri erişim soyutlaması
│  ├─ styles.css
│  └─ assets/
├─ api/                      # YENİ backend
│  ├─ src/
│  │  ├─ server.ts
│  │  ├─ routes/             # auth, demands, properties, offers, matches...
│  │  ├─ services/           # matchService, maskService, contactService...
│  │  ├─ middleware/         # auth, rbac, rateLimit, errorHandler
│  │  ├─ adapters/
│  │  │  ├─ payment/         # iyzicoAdapter.ts · mockPaymentAdapter.ts
│  │  │  ├─ mail/            # resendAdapter.ts · mockMailAdapter.ts
│  │  │  └─ sms/
│  │  ├─ lib/                # jwt, hash, zod şemaları
│  │  └─ seed.ts             # seedState() → DB seed'e çevrilir
│  ├─ prisma/
│  │  ├─ schema.prisma
│  │  └─ migrations/
│  ├─ .env.example
│  └─ package.json
├─ docker-compose.yml        # postgres + (redis) + api lokal
└─ README.md
```

---

## 5. Veri Modeli → Prisma Şeması

Aşağıdaki şema, mevcut `seedState()` yapısından birebir türetildi. Enum'lar mevcut string değerlerden çıkarıldı.

```prisma
// prisma/schema.prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

enum Role { BUYER SELLER AGENT ADMIN REVIEWER }
enum UserStatus { ACTIVE SUSPENDED BANNED }
enum DemandStatus { ACTIVE PAUSED CLOSED }
enum PropertyStatus { ACTIVE PASSIVE SOLD }
enum OfferStatus { SENT SEEN INTERESTED INFO_REQUESTED REJECTED }
enum BuyerResponse { INTERESTED INFO_REQUESTED REJECTED }
enum MatchStatus { WAITING_BUYER_APPROVAL WAITING_SELLER_APPROVAL CONTACT_UNLOCKED CLOSED }
enum DocStatus { PENDING APPROVED REJECTED }
enum PaymentStatus { PENDING SUCCESS FAILED REFUNDED }
enum PlanCategory { BASIC AD CONTACT PRO }

model User {
  id          String     @id @default(cuid())
  role        Role
  name        String
  email       String     @unique
  phone       String
  city        String
  status      UserStatus @default(ACTIVE)
  trustScore  Int        @default(50)
  createdAt   DateTime   @default(now())

  auth            AuthAccount?
  buyerProfile    BuyerProfile?
  demands         Demand[]
  properties      Property[]
  offersAsSeller  Offer[]        @relation("SellerOffers")
  offersAsBuyer   Offer[]        @relation("BuyerOffers")
  matchesAsBuyer  Match[]        @relation("BuyerMatches")
  matchesAsSeller Match[]        @relation("SellerMatches")
  messages        Message[]
  documents       VerificationDocument[]
  notifications   Notification[]
  payments        Payment[]
  entitlements    Entitlement[]  // aktif paket/üyelik hakları
}

model AuthAccount {
  userId          String   @id
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  email           String   @unique
  passwordHash    String              // argon2 — asla düz metin
  emailVerified   Boolean  @default(false)
  emailVerifyToken String?
  resetToken      String?
  resetTokenExp   DateTime?
  lastLoginAt     DateTime?
  createdAt       DateTime @default(now())
}

model BuyerProfile {
  userId              String  @id
  user                User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  verificationLevel   String
  badge               String            // blue | green | neutral
  budgetTrustScore    Int     @default(40)
  profileCompletion   Int     @default(20)
  declaredBudgetMin   BigInt  @default(0)
  declaredBudgetMax   BigInt  @default(0)
  declaredDownPayment BigInt  @default(0)
  declaredCashReady   Boolean @default(false)
  declaredUsesCredit  Boolean @default(false)
}

model Plan {
  id       String       @id
  name     String
  roleType Role
  price    Int
  interval String
  category PlanCategory
  features String[]
  payments Payment[]
  entitlements Entitlement[]
}

model Demand {
  id              String       @id @default(cuid())
  buyer           User         @relation(fields: [buyerId], references: [id])
  buyerId         String
  title           String
  city            String
  district        String
  neighborhood    String
  propertyType    String
  roomCount       String
  minSqm          Int
  maxSqm          Int
  minBudget       BigInt
  maxBudget       BigInt
  downPayment     BigInt
  usesCredit      Boolean
  cashReady       Boolean
  exchangePossible Boolean
  purchaseTimeline String
  description     String
  privacyLevel    String
  status          DemandStatus @default(ACTIVE)
  boostedUntil    DateTime?             // "Talebimi Üste Taşı"
  viewCount       Int          @default(0)
  offerCount      Int          @default(0)
  createdAt       DateTime     @default(now())
  offers          Offer[]
}

model Property {
  id              String         @id @default(cuid())
  seller          User           @relation(fields: [sellerId], references: [id])
  sellerId        String
  title           String
  city            String
  district        String
  neighborhood    String
  propertyType    String
  roomCount       String
  grossSqm        Int
  netSqm          Int
  buildingAge     String
  floor           String
  totalFloors     Int
  heatingType     String
  bathroomCount   Int
  hasBalcony      Boolean
  hasParking      Boolean
  hasElevator     Boolean
  inComplex       Boolean
  dues            Int
  occupancyStatus String
  deedStatus      String
  creditEligible  Boolean
  exchangePossible Boolean
  price           BigInt
  negotiable      Boolean
  description     String
  status          PropertyStatus @default(ACTIVE)
  boostedUntil    DateTime?             // "İlanımı Üste Taşı"
  photoClass      String
  createdAt       DateTime       @default(now())
  offers          Offer[]
}

model Offer {
  id            String        @id @default(cuid())
  demand        Demand        @relation(fields: [demandId], references: [id])
  demandId      String
  property      Property      @relation(fields: [propertyId], references: [id])
  propertyId    String
  seller        User          @relation("SellerOffers", fields: [sellerId], references: [id])
  sellerId      String
  buyer         User          @relation("BuyerOffers", fields: [buyerId], references: [id])
  buyerId       String
  price         BigInt
  message       String
  matchScore    Int
  status        OfferStatus   @default(SENT)
  buyerResponse BuyerResponse?
  seenAt        DateTime?
  createdAt     DateTime      @default(now())
  match         Match?
}

model Match {
  id                    String      @id @default(cuid())
  offer                 Offer       @relation(fields: [offerId], references: [id])
  offerId               String      @unique
  buyer                 User        @relation("BuyerMatches", fields: [buyerId], references: [id])
  buyerId               String
  seller                User        @relation("SellerMatches", fields: [sellerId], references: [id])
  sellerId              String
  status                MatchStatus @default(WAITING_BUYER_APPROVAL)
  buyerContactApproved  Boolean     @default(false)
  sellerContactApproved Boolean     @default(false)
  buyerApprovedAt       DateTime?
  sellerApprovedAt      DateTime?
  contactUnlockedAt     DateTime?
  createdAt             DateTime    @default(now())
  messages              Message[]
}

model Message {
  id                   String   @id @default(cuid())
  match                Match    @relation(fields: [matchId], references: [id])
  matchId              String
  senderId             String            // userId veya "system"
  body                 String            // ham metin — yalnızca sunucuda
  maskedBody           String            // istemciye giden maskeli metin
  containsSensitiveInfo Boolean @default(false)
  createdAt            DateTime @default(now())
}

model VerificationDocument {
  id           String    @id @default(cuid())
  user         User      @relation(fields: [userId], references: [id])
  userId       String
  type         String
  status       DocStatus @default(PENDING)
  riskScore    Int       @default(0)
  reviewedById String?
  reviewedAt   DateTime?
}

model Notification {
  id        String   @id @default(cuid())
  user      User     @relation(fields: [userId], references: [id])
  userId    String
  type      String
  title     String
  body      String
  actionUrl String?
  readAt    DateTime?
  createdAt DateTime @default(now())
}

model EmailOutbox {
  id        String   @id @default(cuid())
  toUserId  String?
  toEmail   String
  toName    String?
  subject   String
  body      String
  actionUrl String?
  reason    String?
  status    String   @default("QUEUED")   // QUEUED | SENT | FAILED (mock: MOCK_SENT)
  createdAt DateTime @default(now())
}

model Complaint {
  id             String   @id @default(cuid())
  reporterId     String
  reportedUserId String
  reason         String
  description    String
  status         String   @default("IN_REVIEW")
  priority       String
  createdAt      DateTime @default(now())
}

model AbuseSignal {
  id        String   @id @default(cuid())
  userId    String
  type      String
  score     Int
  metadata  String?
  createdAt DateTime @default(now())
}

model AuditLog {
  id         String   @id @default(cuid())
  actorId    String?
  action     String
  entityType String
  entityId   String
  metadata   String?
  createdAt  DateTime @default(now())
}

model Payment {
  id           String        @id @default(cuid())
  user         User          @relation(fields: [userId], references: [id])
  userId       String
  plan         Plan          @relation(fields: [planId], references: [id])
  planId       String
  provider     String                    // iyzico | paytr | mock
  providerRef  String?                   // sağlayıcı işlem no
  amount       Int
  currency     String        @default("TRY")
  status       PaymentStatus @default(PENDING)
  createdAt    DateTime      @default(now())
  entitlement  Entitlement?
}

// YENİ: paket/üyelik haklarını ödemeden ayır (boost süresi, iletişim üyeliği vb.)
model Entitlement {
  id         String   @id @default(cuid())
  user       User     @relation(fields: [userId], references: [id])
  userId     String
  plan       Plan     @relation(fields: [planId], references: [id])
  planId     String
  payment    Payment? @relation(fields: [paymentId], references: [id])
  paymentId  String?  @unique
  activeFrom DateTime @default(now())
  activeTo   DateTime?                   // null = süresiz/abonelik aktif
  createdAt  DateTime @default(now())
}
```

> **Not:** Para alanları `BigInt` (kuruş yerine TL tam sayısı; ileride kuruşa çevrilebilir). `Entitlement` modeli mevcut MVP'de yok ama üyelik hakkını ödeme kaydından ayırmak için eklendi — "bilgileri görme üyeliği alınmadan iletişim açılmasın" kuralını temiz biçimde uygular.

---

## 6. API Sözleşmesi (frontend aksiyonları → REST)

Mevcut `window.KT.*` fonksiyonları doğrudan endpoint'lere eşlenir. Böylece frontend'de değişecek tek şey, fonksiyonun içindeki `state` mutasyonunun yerine bir `fetch` çağrısı gelmesi.

| Frontend aksiyonu (`app.js`) | Metod & Endpoint | Yetki | Notlar |
|---|---|---|---|
| `register()` | `POST /auth/register` | herkes | argon2 hash, doğrulama e-postası kuyruğa |
| `login()` | `POST /auth/login` | herkes | JWT httpOnly cookie döner |
| `logout()` | `POST /auth/logout` | üye | cookie temizle |
| (yeni) | `POST /auth/verify-email` | herkes | token ile doğrula |
| (yeni) | `POST /auth/forgot-password` | herkes | reset token e-postası |
| (yeni) | `POST /auth/reset-password` | herkes | yeni şifre |
| (yeni) | `GET /me` | üye | oturum + rol bilgisi |
| `saveProfileSettings()` | `PATCH /me` | üye | e-posta değişince yeniden doğrula |
| `createDemand()` | `POST /demands` | BUYER | oluşturunca uygun satıcılara bildirim |
| `buyerDemands()` | `GET /demands?mine=1` | BUYER | |
| `sellerDemands()` | `GET /demands?matchable=1` | SELLER/AGENT | maskeli alıcı görünümü |
| `createProperty()` | `POST /properties` | SELLER/AGENT | uygun alıcılara bildirim |
| `sellerProperties()` | `GET /properties?mine=1` | SELLER/AGENT | |
| `createOffer()` | `POST /offers` | SELLER/AGENT | `matchScore` sunucuda hesaplanır |
| `buyerOffers()` | `GET /offers?mine=1` | BUYER | |
| `respondOffer()` | `POST /offers/:id/respond` | BUYER | INTERESTED → Match yaratır |
| `openMatch()` | `GET /matches/:id` | taraflar | mesajlar maskeli döner |
| `matchesPage()` | `GET /matches?mine=1` | üye | |
| `sendMessage()` | `POST /matches/:id/messages` | taraflar | **maskeleme sunucuda** |
| `approveContact()` | `POST /matches/:id/approve-contact` | taraflar | üyelik + çift onay kontrolü |
| (iletişim kartı) | `GET /matches/:id/contact` | taraflar | yalnız kilit açıksa 200, aksi 403 |
| `saveBudgetDeclaration()` | `PUT /me/buyer-profile` | BUYER | |
| `addSellerDoc()` | `POST /verification-documents` | SELLER/AGENT | |
| `reviewDocument()` | `PATCH /admin/documents/:id` | ADMIN/REVIEWER | |
| `mockPromote()` | `POST /promotions` | üye | boost; ödeme akışını tetikler |
| `mockUpgrade()` | `POST /payments/checkout` | üye | iyzico/PayTR oturumu başlatır |
| (yeni) | `POST /payments/webhook` | sağlayıcı | imza doğrula → Entitlement aç |
| `notificationsPage()` | `GET /notifications` | üye | |
| `adminOverview()` | `GET /admin/metrics` | ADMIN | ciro, kullanıcı, ödeme |
| `adminEmails()` | `GET /admin/emails` | ADMIN | outbox |
| (şikayet) | `POST /complaints` | üye | moderasyon kuyruğu |

**Yanıt zarfı standardı:** `{ ok: true, data }` / `{ ok: false, error: { code, message } }`. Sayfalama: `?page=&limit=`, dönüş `{ data, meta: { total, page } }`.

---

## 7. Auth ve Güvenlik Tasarımı

### Kimlik doğrulama
- **Şifre:** `argon2id` ile hash (alt: bcrypt cost≥12). Düz metin asla saklanmaz.
- **Oturum:** JWT, **httpOnly + Secure + SameSite=Lax** cookie'de. Access token kısa ömürlü (15 dk) + refresh token (7 gün) rotasyonlu. Alternatif basit yol: tek httpOnly session token + Redis.
- **E-posta doğrulama:** kayıt sonrası tek kullanımlık token; doğrulanmadan teklif/talep oluşturma kısıtlanabilir.
- **Şifre sıfırlama:** süreli (`resetTokenExp`) tek kullanımlık token, e-posta ile.

### Yetkilendirme (RBAC)
Her endpoint bir `requireRole([...])` middleware'i ile korunur. Kaynak sahipliği ayrıca kontrol edilir (ör. bir alıcı yalnız kendi taleplerini düzenler). Roller: `BUYER, SELLER, AGENT, ADMIN, REVIEWER`.

### İletişim açma — sunucu tarafı state machine
Bu ürünün kalbi. Kural: **iletişim kartı ancak (a) ilgili taraf "bilgileri görme" üyeliğine (Entitlement) sahipse VE (b) her iki taraf da onay verdiyse** açılır.

```
Offer INTERESTED
   └─► Match(WAITING_BUYER_APPROVAL)
        buyer approve  → buyerContactApproved = true
        seller approve → sellerContactApproved = true
        her iki onay + her iki tarafta gerekli Entitlement
                       → status = CONTACT_UNLOCKED, contactUnlockedAt = now()
GET /matches/:id/contact
   → CONTACT_UNLOCKED değilse 403 (telefon/e-posta asla dönmez)
```
`approve-contact` endpoint'i, üyelik yoksa `402 Payment Required` (veya `403`) döner ve satın alma akışına yönlendirir.

### Hassas bilgi maskeleme — sunucuda zorunlu
`maskSensitiveInfo` mantığı `maskService` olarak sunucuya taşınır. `POST /messages` gelen `body`'yi hem ham (`body`, sadece DB/denetim) hem maskeli (`maskedBody`) saklar; **istemciye yalnızca `maskedBody` döner** (iletişim açılana kadar). Telefon, e-posta, WhatsApp, adres regex'leri sunucuda çalışır — istemci atlatılamaz.

### Diğer güvenlik önlemleri
- **Rate limit:** `POST /auth/*`, `/messages`, `/offers` için IP+kullanıcı bazlı (Redis veya Fastify plugin).
- **Girdi doğrulama:** tüm body'ler Zod şemasıyla; doğrulama hatası `400`.
- **CORS:** yalnız web origin'e izin; cookie için `credentials`.
- **Güvenlik başlıkları:** helmet (CSP, HSTS).
- **Audit log:** kritik aksiyonlar (`USER_LOGGED_IN`, `CONTACT_APPROVED`, `BUDGET_DECLARED`, `DOC_REVIEWED`, ödeme) `AuditLog`'a yazılır — mevcut `addAudit` mantığı korunur.
- **Moderasyon:** `Complaint` + `AbuseSignal` admin kuyruğu; tekrarlı mesaj sinyali sunucuda üretilir.

### KVKK uyumu
- Açık rıza metinleri (kayıt onayı zaten var) + aydınlatma metni versiyonlanır.
- **Veri minimizasyonu:** alıcıdan belge/kimlik istenmez (ürün kararı korunur); yalnız beyan.
- **Silme/erişim hakkı:** `DELETE /me` (soft-delete + anonimleştirme) ve veri dışa aktarma endpoint'i.
- İletişim bilgileri varsayılan gizli; loglarda maskeli tutulur.

---

## 8. Ödeme Entegrasyonu (adaptör deseni)

Kod, sağlayıcıdan bağımsız bir `PaymentAdapter` arayüzüne konuşur:

```ts
interface PaymentAdapter {
  createCheckout(input: { userId; plan; amount }): Promise<{ redirectUrl; ref }>;
  verifyWebhook(req): Promise<{ ref; status: "SUCCESS"|"FAILED" }>;
}
```
- **Şimdi:** `MockPaymentAdapter` (mevcut demo davranışı) — `SUCCESS` döner, `Payment` + `Entitlement` yazar.
- **Canlı:** `IyzicoAdapter` veya `PaytrAdapter`. Akış: `POST /payments/checkout` → sağlayıcı ödeme sayfası → kullanıcı öder → sağlayıcı `POST /payments/webhook` → **imza doğrulanır** → `Payment.status=SUCCESS` → ilgili `Entitlement` açılır (boost süresi veya iletişim üyeliği).
- Fatura/geçmiş: `GET /me/payments`. Abonelik vs. tek seferlik: `Plan.interval` + `Entitlement.activeTo` ile yönetilir.

> Sağlayıcı seçimi: **iyzico** (kurumsal, taksit, geniş belge) vs **PayTR** (hızlı başvuru, düşük hacim dostu). İkisi de aynı adaptör arkasında değiştirilebilir.

## 9. E-posta / SMS (adaptör deseni)

`MailAdapter` arayüzü; şimdilik `MockMailAdapter` mevcut `EmailOutbox`'a yazar (davranış korunur). Canlıda `ResendAdapter`/`SesAdapter` gerçek gönderir ama **her gönderi yine `EmailOutbox`'a loglanır** (denetim + admin görünürlüğü). Tetikleyiciler: yeni teklif, yeni eşleşme, üyelik doğrulama, şifre sıfırlama, ödeme onayı. SMS için `NetGsmAdapter` (kritik bildirimler).

---

## 10. Frontend Entegrasyon Stratejisi (MVP'yi bozmadan)

Anahtar fikir: **tek bir `store.js` soyutlaması.** Bugün `app.js`, doğrudan `state.demands.push(...)` + `saveState()` yapıyor. Bunun yerine:

**Adım A (Faz 1 — davranış aynı):** Tüm veri erişimini `store` fonksiyonlarına topla:
```js
// store.js — Faz 1: hâlâ localStorage
export const store = {
  async createDemand(input) { /* state.demands.push; saveState(); */ },
  async listOffers(userId) { /* return state.offers... */ },
  async login(email, pw)   { /* mevcut kontrol */ },
  // ...her KT aksiyonu için bir metod
};
```
`app.js` içindeki `window.KT.*` fonksiyonları artık `await store.createDemand(...)` çağırır. Görünürde hiçbir şey değişmez, MVP çalışmaya devam eder.

**Adım B (Faz 3 — içi değişir):** `store` metodlarının gövdesi `fetch`'e döner:
```js
async createDemand(input) {
  const r = await fetch("/api/demands", { method:"POST", credentials:"include",
    headers:{ "Content-Type":"application/json" }, body: JSON.stringify(input) });
  return (await r.json()).data;
}
```
`app.js`'in geri kalanı (render, router, UI) **hiç değişmez.** Bu, riski en aza indiren tek noktadan geçiş sağlar. Auth artık cookie ile; `currentUser()` → `GET /me`.

Render bugün senkron; `store` async olduğu için ilgili handler'lar `async` yapılır ve render öncesi `await` eklenir (küçük, mekanik değişiklik).

---

## 11. Fazlı Yol Haritası

Her faz sonunda ürün **çalışır** ve denenebilir durumda kalır.

### Faz 0 — Hazırlık (0.5 gün)
Repoyu `web/` + `api/` olarak düzenle, `docker-compose` (postgres) kur, `.env.example`, CI iskeleti. **Frontend hiç değişmez.**

### Faz 1 — Store soyutlaması (1–2 gün)
`store.js` ekle, tüm `KT.*` aksiyonlarını `store.*` üzerinden geçir (içi hâlâ localStorage). Regresyon testi: tüm akışlar elle denenir. **Kullanıcıya görünmez ama en kritik adım.**

### Faz 2 — Backend temeli (3–5 gün)
Fastify + Prisma + Postgres ayağa kalkar. `schema.prisma` migrate edilir, `seed.ts` demo veriyi DB'ye basar. **Auth:** register/login/logout/verify/reset, argon2, JWT cookie, RBAC middleware, Zod doğrulama, rate limit. Endpoint smoke testleri.

### Faz 3 — Çekirdek domain API + frontend bağlama (4–6 gün)
`demands, properties, offers, matches, messages, buyer-profile, notifications` endpoint'leri. Match skoru + maskeleme + iletişim state machine **sunucuya** taşınır. `store.js` içi `fetch`'e döner. Uçtan uca akış canlı DB üzerinde çalışır.

### Faz 4 — Ödeme + e-posta (gerçek adaptörler) (3–4 gün)
`PaymentAdapter` (iyzico/PayTR) + webhook + `Entitlement`. `MailAdapter` (Resend/SES) gerçek gönderim + outbox log. Boost ve iletişim üyeliği gerçek satın almayla çalışır.

### Faz 5 — Güvenlik & moderasyon sertleştirme (2–3 gün)
Rate limit (Redis), helmet/CSP, şikayet + abuse sinyali kuyruğu, admin moderasyon aksiyonları, audit log tamamlanır, KVKK silme/dışa aktarma, pentest checklist.

### Faz 6 — UX/UI & mobil + yayın (3–5 gün)
Kayıt/giriş akışını cilala, paket satın alma ekranları, onboarding, mobil responsive iyileştirme, admin metrikleri. Domain + SSL + prod deploy + izleme (log/uptime).

**Toplam kaba tahmin:** ~17–25 iş günü (tek geliştirici, tam zamanlı). Fazlar bağımsız teslim edilebilir.

---

## 12. Deployment (Türkiye dostu)

| Bileşen | Öneri | Alternatif |
|---|---|---|
| Frontend (statik) | Vercel / Netlify / Cloudflare Pages | Nginx + VPS |
| API (Node) | Railway / Render / Fly.io | TR VPS (Hetzner, DigitalOcean) |
| PostgreSQL | Neon / Supabase / Railway PG | Yönetilen VPS PG |
| Redis | Upstash | VPS Redis |
| Ödeme | iyzico / PayTR (TR mevzuat) | — |
| E-posta | Resend / Amazon SES | Postmark |
| Domain/SSL | Cloudflare (DNS + SSL) | Let's Encrypt |

KVKK verisi için TR/AB lokasyonlu veri barındırma tercih edilir. Ortam değişkenleri: `DATABASE_URL, JWT_SECRET, IYZICO_*, MAIL_*, SMS_*` — asla repoya girmez.

---

## 13. Açık Kararlar (senden onay bekleyenler)

1. **Ödeme sağlayıcı:** iyzico mı PayTR mı? (başvuru/komisyon farkı)
2. **Oturum modeli:** salt JWT (refresh rotasyonlu) mu, JWT + Redis kara liste mi?
3. **E-posta sağlayıcı:** Resend (hızlı) mı SES (ucuz/ölçekli) mi?
4. **Hosting:** yönetilen PaaS (Railway/Render, hızlı) mı TR VPS (tam kontrol) mi?
5. **Backend framework:** Fastify (öneri) mi NestJS (kurumsal) mi?

---

## 14. Sıradaki Adım

Onayınla **Faz 0 + Faz 1**'i bu ortamda başlatabilirim: repoyu `web/` + `api/` olarak düzenler, `docker-compose` + boş Fastify/Prisma iskeletini kurar ve `store.js` soyutlamasını yazıp mevcut `app.js`'i ona bağlarım — arayüz aynen çalışmaya devam ederek. Ardından Faz 2'de auth API'yi gerçek DB ile ayağa kaldırırız.

> İstersen bu planı adım adım koda dökmeye Faz 0'dan başlayalım; yukarıdaki 5 açık kararı netleştirirsen doğrudan o seçimlere göre kurarım.
