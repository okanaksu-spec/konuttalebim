const STORAGE_KEY = "konuttalebim-mvp-state-v1";

const icons = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-5.5h5V20"/>',
  key: '<circle cx="8" cy="15.5" r="3.5"/><path d="M10.5 13 20 3.5"/><path d="m16 7.5 2.5 2.5"/><path d="m14 9.5 2 2"/>',
  shield: '<path d="M12 3.5 19.5 7v5.2c0 4.7-3.1 7.5-7.5 8.3-4.4-.8-7.5-3.6-7.5-8.3V7z"/><path d="m8.5 12.5 2.3 2.3 5-5.2"/>',
  chat: '<path d="M4 7.5A3.5 3.5 0 0 1 7.5 4h9A3.5 3.5 0 0 1 20 7.5v5A3.5 3.5 0 0 1 16.5 16H11l-4.5 3v-3A3.5 3.5 0 0 1 4 12.5z"/>',
  send: '<path d="M21 3 10 14"/><path d="m21 3-7 18-4-7-7-4z"/>',
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="10" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
  file: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M9.5 12h5M9.5 15h5"/>',
  bell: '<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8"/><path d="M10 21h4"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4.5 7 7.5 6 7.5-6"/>',
  chart: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 15v-4"/><path d="M12 15V8"/><path d="M16 15v-6"/>',
  map: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.3"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 15h3"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  alert: '<path d="M12 8v5"/><path d="M12 17h.01"/><path d="M10.3 4.4 2.9 17.6A2 2 0 0 0 4.6 20h14.8a2 2 0 0 0 1.7-2.4L13.7 4.4a2 2 0 0 0-3.4 0z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'
};

function icon(name, size = 18) {
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.home}</svg>`;
}

function money(value) {
  return `${Number(value || 0).toLocaleString("tr-TR")} TL`;
}

function shortMoney(value) {
  const n = Number(value || 0);
  if (n >= 1000000) return `${(n / 1000000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} mn TL`;
  return money(n);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// Bir talep/ilan "üste taşınmış" (boost) mı? boostedUntil bugüne eşit/ileri ise evet.
function isBoosted(item) {
  return Boolean(item && item.boostedUntil && item.boostedUntil >= today());
}

// Satilik/Kiralik yardimcilari
function isRent(item) {
  return Boolean(item && item.transactionType === "RENT");
}
function txPill(item) {
  return isRent(item) ? `<span class="badge badge-gold">Kiralık</span>` : "";
}
function priceText(item) {
  return isRent(item) ? `${money(item.price)}/ay` : money(item.price);
}
function rangeText(item) {
  const r = `${shortMoney(item.minBudget)}-${shortMoney(item.maxBudget)}`;
  return isRent(item) ? `${r}/ay` : r;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

// Tek tirnakli JS string + cift tirnakli HTML attribute icinde guvenli (onclick="KT.x('...')").
function escapeAttr(value) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/"/g, "&quot;").replace(/'/g, "\\'");
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function route() {
  return (location.hash || "#/home").replace(/^#\/?/, "") || "home";
}

function setRoute(path) {
  location.hash = `/${path}`;
}

function seedState() {
  return {
    currentRole: "buyer",
    auth: { currentUserId: null, lastLoginAt: null },
    counters: { user: 100, demand: 100, property: 100, offer: 100, match: 100, message: 100, notification: 100, complaint: 100, audit: 100, doc: 100, abuse: 100, email: 100 },
    users: [
      { id: "u-buyer-1", role: "BUYER", name: "Deniz Kaya", email: "deniz@ornek.com", phone: "0532 000 10 10", city: "İstanbul", status: "ACTIVE", trustScore: 82 },
      { id: "u-buyer-2", role: "BUYER", name: "Ayşe Demir", email: "ayse@ornek.com", phone: "0533 000 20 20", city: "Ankara", status: "ACTIVE", trustScore: 74 },
      { id: "u-buyer-3", role: "BUYER", name: "Mert Yıldız", email: "mert@ornek.com", phone: "0534 000 30 30", city: "İzmir", status: "ACTIVE", trustScore: 58 },
      { id: "u-seller-1", role: "SELLER", name: "Selin Arslan", email: "selin@ornek.com", phone: "0535 000 40 40", city: "İstanbul", status: "ACTIVE", trustScore: 88 },
      { id: "u-seller-2", role: "SELLER", name: "Burak Koç", email: "burak@ornek.com", phone: "0536 000 50 50", city: "Ankara", status: "ACTIVE", trustScore: 76 },
      { id: "u-agent-1", role: "AGENT", name: "Pera Gayrimenkul", email: "ofis@peraornek.com", phone: "0212 000 60 60", city: "İstanbul", status: "ACTIVE", trustScore: 69 },
      { id: "u-admin-1", role: "ADMIN", name: "Admin Kullanıcı", email: "admin@konuttalebim.com", phone: "0212 000 00 00", city: "İstanbul", status: "ACTIVE", trustScore: 100 }
    ],
    authAccounts: [
      { userId: "u-buyer-1", email: "deniz@ornek.com", password: "demo1234", emailVerified: true, createdAt: "2026-07-01", lastLoginAt: null },
      { userId: "u-seller-1", email: "selin@ornek.com", password: "demo1234", emailVerified: true, createdAt: "2026-07-01", lastLoginAt: null },
      { userId: "u-agent-1", email: "ofis@peraornek.com", password: "demo1234", emailVerified: true, createdAt: "2026-07-01", lastLoginAt: null },
      { userId: "u-admin-1", email: "admin@konuttalebim.com", password: "demo1234", emailVerified: true, createdAt: "2026-07-01", lastLoginAt: null }
    ],
    buyerProfiles: {
      "u-buyer-1": { verificationLevel: "Bütçe Beyanı: 6-8 mn TL", badge: "blue", budgetTrustScore: 82, profileCompletion: 76, declaredBudgetMin: 6000000, declaredBudgetMax: 8000000, declaredDownPayment: 2500000, declaredCashReady: false, declaredUsesCredit: true },
      "u-buyer-2": { verificationLevel: "Bütçe Beyanı: 10-14 mn TL", badge: "green", budgetTrustScore: 86, profileCompletion: 68, declaredBudgetMin: 10000000, declaredBudgetMax: 14000000, declaredDownPayment: 8000000, declaredCashReady: true, declaredUsesCredit: false },
      "u-buyer-3": { verificationLevel: "Bütçe Beyanı: 4-5 mn TL", badge: "neutral", budgetTrustScore: 45, profileCompletion: 42, declaredBudgetMin: 4000000, declaredBudgetMax: 5000000, declaredDownPayment: 1200000, declaredCashReady: false, declaredUsesCredit: true }
    },
    plans: [
      { id: "plan-buyer-free", name: "Alıcı Ücretsiz", roleType: "BUYER", price: 0, interval: "ay", category: "Satılık · Temel", features: ["1 aktif talep", "Sana uygun ilanlarla eşleşme", "Eşleşme bildirimleri"] },
      { id: "plan-buyer-boost", name: "Talebimi Üste Taşı", roleType: "BUYER", price: 99, interval: "7 gün", category: "Satılık · Reklam", features: ["Talep kartı üst sıralarda", "Satıcı havuzunda renkli vurgu", "Uygun satıcılara ek bildirim"] },
      { id: "plan-buyer-contact", name: "Satıcı Bilgilerini Gör", roleType: "BUYER", price: 199, interval: "ay", category: "Satılık · İletişim", features: ["Eşleştiğin satıcının telefon/e-posta bilgisi", "Bilgiyi gör, doğrudan ara", "Güvenli iletişim uyarıları"] },
      { id: "plan-seller-boost", name: "İlanımı Üste Taşı", roleType: "SELLER", price: 149, interval: "7 gün", category: "Satılık · Reklam", features: ["Ev kartı üst sıralarda", "Alıcı taleplerinde renkli vurgu", "Uygun alıcılara ek bildirim"] },
      { id: "plan-seller-contact", name: "Alıcı Bilgilerini Gör", roleType: "SELLER", price: 299, interval: "ay", category: "Satılık · İletişim", features: ["Eşleştiğin alıcının telefon/e-posta bilgisi", "Bilgiyi gör, doğrudan ara", "Sınırsız talep görüntüleme"] },
      { id: "plan-tenant-free", name: "Kiracı Ücretsiz", roleType: "BUYER", price: 0, interval: "ay", category: "Kiralık · Temel", features: ["Sınırsız kiralık talebi", "Ev sahipleri sana ulaşır", "Tamamen ücretsiz"] },
      { id: "plan-landlord-contact", name: "Kiracı Bilgilerini Gör", roleType: "SELLER", price: 199, interval: "ay", category: "Kiralık · İletişim", features: ["Eşleştiğin kiracının telefon/e-posta bilgisi", "Bilgiyi gör, doğrudan ara", "Sınırsız kiracı talebi görüntüleme"] },
      { id: "plan-landlord-boost", name: "Kiralık İlanımı Üste Taşı", roleType: "SELLER", price: 99, interval: "7 gün", category: "Kiralık · Reklam", features: ["Kiralık ilanın üst sıralarda", "Kiracı havuzunda renkli vurgu", "Uygun kiracılara ek bildirim"] },
      { id: "plan-pro", name: "Profesyonel Paket", roleType: "AGENT", price: 799, interval: "ay", category: "Danışman · Reklam + üyelik", features: ["Satılık + kiralık çoklu portföy", "Tüm iletişim bilgilerini görme", "Aylık öne çıkarma hakları"] }
    ],
    demands: [
      { id: "d-1", buyerId: "u-buyer-1", title: "Kadıköy'de aile için 3+1", city: "İstanbul", district: "Kadıköy", neighborhood: "Göztepe / Feneryolu", propertyType: "Daire", roomCount: "3+1", minSqm: 110, maxSqm: 155, minBudget: 6000000, maxBudget: 8000000, downPayment: 2500000, usesCredit: true, cashReady: false, exchangePossible: false, purchaseTimeline: "3 ay içinde", description: "Metroya ve okula yakın, krediye uygun, bakımlı bir aile evi arıyorum.", privacyLevel: "Rozet ve bütçe aralığı görünsün", status: "ACTIVE", viewCount: 46, offerCount: 2, createdAt: "2026-07-01" },
      { id: "d-2", buyerId: "u-buyer-2", title: "Çankaya'da bahçeli villa", city: "Ankara", district: "Çankaya", neighborhood: "Oran / İncek", propertyType: "Villa", roomCount: "4+1", minSqm: 220, maxSqm: 360, minBudget: 10000000, maxBudget: 14000000, downPayment: 8000000, usesCredit: false, cashReady: true, exchangePossible: true, purchaseTimeline: "1 ay içinde", description: "Bahçeli, site içinde veya güvenlikli, tapusu net bir villa arıyoruz.", privacyLevel: "Sadece bütçe beyanı görünsün", status: "ACTIVE", viewCount: 31, offerCount: 1, createdAt: "2026-07-02" },
      { id: "d-3", buyerId: "u-buyer-3", title: "Bornova'da ilk ev arayışı", city: "İzmir", district: "Bornova", neighborhood: "Kazımdirik / Erzene", propertyType: "Daire", roomCount: "2+1", minSqm: 75, maxSqm: 110, minBudget: 4000000, maxBudget: 5000000, downPayment: 1200000, usesCredit: true, cashReady: false, exchangePossible: false, purchaseTimeline: "6 ay içinde", description: "Ulaşımı kolay, deprem yönetmeliğine uygun, ilk ev için masrafsız daire arıyorum.", privacyLevel: "Telefon gizli kalsın", status: "ACTIVE", viewCount: 22, offerCount: 0, createdAt: "2026-07-03" },
      { id: "d-4", buyerId: "u-buyer-1", title: "Eskişehir'de yatırım için 2+1", city: "Eskişehir", district: "Tepebaşı", neighborhood: "Batıkent", propertyType: "Daire", roomCount: "2+1", minSqm: 80, maxSqm: 120, minBudget: 2500000, maxBudget: 3400000, downPayment: 1700000, usesCredit: true, cashReady: false, exchangePossible: false, purchaseTimeline: "Fırsat olursa", description: "Kiralanabilirliği güçlü, yeni binada yatırım amaçlı daire bakıyorum.", privacyLevel: "Rozet ve bütçe aralığı görünsün", status: "ACTIVE", viewCount: 18, offerCount: 0, createdAt: "2026-07-04" }
    ],
    properties: [
      { id: "p-1", sellerId: "u-seller-1", title: "Kadıköy Göztepe'de yenilenmiş 3+1", city: "İstanbul", district: "Kadıköy", neighborhood: "Göztepe", propertyType: "Daire", roomCount: "3+1", grossSqm: 138, netSqm: 122, buildingAge: "11-15", floor: "4/8", totalFloors: 8, heatingType: "Kombi", bathroomCount: 2, hasBalcony: true, hasParking: true, hasElevator: true, inComplex: false, dues: 950, occupancyStatus: "Boş", deedStatus: "Kat mülkiyeti", creditEligible: true, exchangePossible: false, price: 7350000, negotiable: true, description: "Bağdat Caddesi'ne yakın, bakımlı, krediye uygun daire.", status: "ACTIVE", photoClass: "apartment", createdAt: "2026-06-28" },
      { id: "p-2", sellerId: "u-seller-1", title: "Ataşehir'de 2+1 rezidans", city: "İstanbul", district: "Ataşehir", neighborhood: "Barbaros", propertyType: "Rezidans", roomCount: "2+1", grossSqm: 104, netSqm: 86, buildingAge: "0-5", floor: "12/24", totalFloors: 24, heatingType: "Merkezi", bathroomCount: 1, hasBalcony: false, hasParking: true, hasElevator: true, inComplex: true, dues: 2100, occupancyStatus: "Kiracılı", deedStatus: "Kat mülkiyeti", creditEligible: true, exchangePossible: false, price: 5150000, negotiable: false, description: "Kurumsal kiracılı, sosyal alanlı, yatırım için uygun.", status: "ACTIVE", photoClass: "residence", createdAt: "2026-06-29" },
      { id: "p-3", sellerId: "u-seller-2", title: "Çankaya Oran'da bahçeli 4+1 villa", city: "Ankara", district: "Çankaya", neighborhood: "Oran", propertyType: "Villa", roomCount: "4+1", grossSqm: 310, netSqm: 260, buildingAge: "6-10", floor: "Villa", totalFloors: 2, heatingType: "Yerden ısıtma", bathroomCount: 3, hasBalcony: true, hasParking: true, hasElevator: false, inComplex: true, dues: 3600, occupancyStatus: "Boş", deedStatus: "Kat mülkiyeti", creditEligible: true, exchangePossible: true, price: 13200000, negotiable: true, description: "Güvenlikli sitede, geniş bahçeli, masrafsız villa.", status: "ACTIVE", photoClass: "villa", createdAt: "2026-07-01" },
      { id: "p-4", sellerId: "u-agent-1", title: "Tepebaşı'nda yeni bina 2+1", city: "Eskişehir", district: "Tepebaşı", neighborhood: "Batıkent", propertyType: "Daire", roomCount: "2+1", grossSqm: 96, netSqm: 82, buildingAge: "0-5", floor: "2/5", totalFloors: 5, heatingType: "Kombi", bathroomCount: 1, hasBalcony: true, hasParking: false, hasElevator: true, inComplex: false, dues: 450, occupancyStatus: "Boş", deedStatus: "Kat irtifakı", creditEligible: true, exchangePossible: false, price: 3150000, negotiable: true, description: "Üniversite ve tramvaya yakın, yatırım değeri yüksek.", status: "ACTIVE", photoClass: "apartment", createdAt: "2026-07-02" }
    ],
    offers: [
      { id: "o-1", demandId: "d-1", propertyId: "p-1", sellerId: "u-seller-1", buyerId: "u-buyer-1", price: 7350000, message: "Bütçenize ve bölge tercihlerinize uyduğu için bu daireyi size özel sunuyorum.", matchScore: 94, status: "SENT", buyerResponse: null, seenAt: null, createdAt: "2026-07-03" },
      { id: "o-2", demandId: "d-2", propertyId: "p-3", sellerId: "u-seller-2", buyerId: "u-buyer-2", price: 13200000, message: "Bahçe, site güvenliği ve tapu durumuyla talebinize güçlü uyum sağlıyor.", matchScore: 91, status: "INTERESTED", buyerResponse: "INTERESTED", seenAt: "2026-07-03", createdAt: "2026-07-03" },
      { id: "o-3", demandId: "d-3", propertyId: "p-2", sellerId: "u-seller-1", buyerId: "u-buyer-3", price: 5150000, message: "Bütçenizin biraz üzerinde ama ulaşım ve bina yaşı açısından beklentinize yakın.", matchScore: 72, status: "SENT", buyerResponse: null, seenAt: null, createdAt: "2026-07-04" }
    ],
    matches: [
      { id: "m-1", offerId: "o-2", buyerId: "u-buyer-2", sellerId: "u-seller-2", status: "WAITING_SELLER_APPROVAL", buyerContactApproved: true, sellerContactApproved: false, buyerApprovedAt: "2026-07-03", sellerApprovedAt: null, contactUnlockedAt: null, createdAt: "2026-07-03" }
    ],
    messages: [
      { id: "msg-1", matchId: "m-1", senderId: "system", body: "Eşleşme başladı. İletişim bilgileri iki taraf onay verene kadar gizli kalır.", maskedBody: "Eşleşme başladı. İletişim bilgileri iki taraf onay verene kadar gizli kalır.", containsSensitiveInfo: false, createdAt: "2026-07-03 13:10" },
      { id: "msg-2", matchId: "m-1", senderId: "u-buyer-2", body: "Merhaba, villayı hafta sonu görmek isterim. Önce birkaç detay sorabilir miyim?", maskedBody: "Merhaba, villayı hafta sonu görmek isterim. Önce birkaç detay sorabilir miyim?", containsSensitiveInfo: false, createdAt: "2026-07-03 13:12" },
      { id: "msg-3", matchId: "m-1", senderId: "u-seller-2", body: "Tabii, site aidatı ve tapu durumu net. Sorularınızı buradan yanıtlayabilirim.", maskedBody: "Tabii, site aidatı ve tapu durumu net. Sorularınızı buradan yanıtlayabilirim.", containsSensitiveInfo: false, createdAt: "2026-07-03 13:18" }
    ],
    verificationDocuments: [
      { id: "doc-3", userId: "u-seller-1", type: "Tapu / yetki belgesi", status: "PENDING", riskScore: 24, reviewedById: null, reviewedAt: null },
      { id: "doc-4", userId: "u-agent-1", type: "Vergi levhası", status: "PENDING", riskScore: 28, reviewedById: null, reviewedAt: null }
    ],
    notifications: [
      { id: "n-1", userId: "u-buyer-1", type: "NEW_OFFER", title: "Yeni teklif geldi", body: "Kadıköy talebinize uygun bir teklif var.", actionUrl: "dashboard/alici/teklifler", readAt: null, createdAt: "2026-07-03" },
      { id: "n-2", userId: "u-seller-2", type: "CONTACT_APPROVAL_REQUESTED", title: "İletişim onayı bekleniyor", body: "Alıcı iletişim açmayı onayladı.", actionUrl: "dashboard/satici/mesajlar/m-1", readAt: null, createdAt: "2026-07-03" }
    ],
    emailOutbox: [
      { id: "e-1", toUserId: "u-buyer-1", toEmail: "deniz@ornek.com", toName: "Deniz Kaya", subject: "Talebinize uygun yeni teklif", body: "Kadıköy talebinize uygun bir ev teklifi geldi.", actionUrl: "dashboard/alici/teklifler", reason: "Başlangıç bildirimi", status: "MOCK_SENT", createdAt: "2026-07-03" }
    ],
    complaints: [
      { id: "c-1", reporterId: "u-buyer-3", reportedUserId: "u-agent-1", reason: "Tekrarlı mesaj", description: "Aynı teklif mesajı farklı taleplere gönderilmiş.", status: "IN_REVIEW", priority: "Orta", createdAt: "2026-07-03" }
    ],
    abuseSignals: [
      { id: "ab-1", userId: "u-agent-1", type: "REPEATED_MESSAGE", score: 42, metadata: "Benzer teklif mesajı 6 kez gönderildi.", createdAt: "2026-07-03" }
    ],
    auditLogs: [
      { id: "a-1", actorId: "u-buyer-1", action: "BUDGET_DECLARED", entityType: "BuyerProfile", entityId: "u-buyer-1", metadata: "Alıcı bütçe aralığını beyan etti.", createdAt: "2026-07-01" },
      { id: "a-2", actorId: "u-buyer-2", action: "CONTACT_APPROVED", entityType: "Match", entityId: "m-1", metadata: "Alıcı iletişim açmayı onayladı.", createdAt: "2026-07-03" }
    ],
    payments: [
      { id: "pay-1", userId: "u-seller-1", planId: "plan-seller-boost", provider: "MockPaymentProvider", amount: 149, currency: "TRY", status: "SUCCESS", createdAt: "2026-07-01" },
      { id: "pay-2", userId: "u-agent-1", planId: "plan-pro", provider: "MockPaymentProvider", amount: 799, currency: "TRY", status: "SUCCESS", createdAt: "2026-07-02" }
    ]
  };
}

// Baslangic yer tutucu; ilk render'dan once sunucudan gercek durum cekilir.
let state = normalizeState(seedState());
let uiTxMode = "SALE"; // Satilik/Kiralik UI secimi (state disinda; refreshState ezmesin)
try { if (new URLSearchParams(location.search).get("tx") === "RENT") uiTxMode = "RENT"; } catch {}
let PAYMENTS_LIVE = false; // Test icin ?pay=1 ile acilir; canli-moda gecince kosulsuz true yapilacak.
try { if (new URLSearchParams(location.search).get("pay") === "1") PAYMENTS_LIVE = true; } catch {}
let _pendingPay = null; // odeme onay modalinda bekleyen islem

// Kiralik talep formu — opsiyonel ozellik listeleri (kiraci modulu)
const IC_OZELLIKLER = ["Ebeveyn Banyosu", "Giyinme Odası", "Gömme Dolap", "Kiler", "Ankastre Mutfak", "Amerikan Mutfak", "Balkon", "Teras", "Çelik Kapı", "Klima", "Şömine", "Laminat/Parke"];
const DIS_OZELLIKLER = ["Otopark", "Asansör", "Site İçerisinde", "7/24 Güvenlik", "Kapıcı", "Bahçe", "Yüzme Havuzu", "Spor Salonu", "Çocuk Oyun Alanı", "Jeneratör"];
const ISITMA_TIPLERI = ["Farketmez", "Kombi (Doğalgaz)", "Merkezi", "Yerden Isıtma", "Klima", "Soba"];
const BINA_YASLARI = ["Farketmez", "Sıfır (0)", "1-5", "6-10", "11-20", "20+"];
const KAT_TERCIHLERI = ["Farketmez", "Giriş / Bahçe katı", "Ara kat", "Yüksek kat", "En üst kat"];
const MESLEK_DURUMLARI = ["Belirtmek istemiyorum", "Kamu çalışanı", "Özel sektör (maaşlı)", "Serbest meslek / Esnaf", "Öğrenci", "Emekli", "Diğer"];
let TR_ILLER = []; // [{code,name}] — kademeli konum icin acilista yuklenir

// --- Kategori taksonomisi: ana kategori -> alt tipler ---
const CATEGORY_TREE = {
  "Konut": ["Daire", "Müstakil Ev", "Villa", "Yazlık", "Rezidans", "Çiftlik Evi"],
  "İş Yeri": ["Dükkan / Mağaza", "Ofis / Büro", "Depo / Antrepo", "Fabrika / Üretim", "Atölye", "Kafe / Restoran", "Plaza Katı"],
  "Arsa": ["Konut İmarlı", "Ticari İmarlı", "Sanayi İmarlı", "Turizm İmarlı", "Tarla", "Bağ / Bahçe"]
};
const MAIN_CATEGORIES = Object.keys(CATEGORY_TREE);
const CAT_KONUT = MAIN_CATEGORIES[0], CAT_ISYERI = MAIN_CATEGORIES[1], CAT_ARSA = MAIN_CATEGORIES[2];
// İş Yeri'ne özgü özellik listesi (interior/exterior JSON kolonlarında saklanır)
const ISYERI_OZELLIKLER = ["Cadde Cephesi", "Vitrinli", "Asansör", "Yük Asansörü", "Otopark", "Klima", "Jeneratör", "Güvenlik", "Yangın Merdiveni", "Bölünebilir Alan", "Depo Alanı", "Kamera Sistemi"];
// Arsa'ya özgü özellik listesi
const ARSA_OZELLIKLER = ["Müstakil Tapu", "Hisseli Tapu", "Köşe Parsel", "Yola Cephe", "İfrazlı", "Projeli", "Elektrik", "Su", "Doğalgaz", "Etrafı Çevrili"];
const ISYERI_KULLANIM = ["Boş", "Kiracılı", "Sahibi kullanıyor"];
// Arama/kesfet ekrani durumu (kategori tikla + kart izgarasi)
let searchState = { tx: "SALE", mainCategory: "", subCategory: "", city: "", cityName: "", district: "", neighborhood: "", minPrice: "", maxPrice: "", sort: "new" };
let _searchItems = [];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeState(seedState());
    const parsed = JSON.parse(raw);
    if (!parsed.users || !parsed.demands || !parsed.properties) return normalizeState(seedState());
    return normalizeState(parsed);
  } catch {
    return normalizeState(seedState());
  }
}

function normalizeState(source) {
  const defaults = seedState();
  const next = source || defaults;
  next.counters = { ...defaults.counters, ...(next.counters || {}) };
  next.auth = { ...defaults.auth, ...(next.auth || {}) };
  next.plans = defaults.plans;
  next.authAccounts = next.authAccounts || [];
  next.users.forEach((user) => {
    const email = normalizeEmail(user.email);
    const hasAccount = next.authAccounts.some((account) => account.userId === user.id || normalizeEmail(account.email) === email);
    if (!hasAccount) {
      next.authAccounts.push({ userId: user.id, email, password: "demo1234", emailVerified: true, createdAt: user.createdAt || "2026-07-01", lastLoginAt: null });
    }
  });
  if (next.auth.currentUserId && !next.users.some((user) => user.id === next.auth.currentUserId)) {
    next.auth.currentUserId = null;
  }
  next.emailOutbox = next.emailOutbox || [];
  next.payments = next.payments || [];
  next.buyerProfiles = next.buyerProfiles || {};
  next.verificationDocuments = (next.verificationDocuments || []).filter((doc) => userByIdFrom(next, doc.userId).role !== "BUYER");
  next.users.filter((user) => user.role === "BUYER").forEach((user) => {
    const demands = next.demands.filter((demand) => demand.buyerId === user.id);
    const primary = demands[0];
    const profile = next.buyerProfiles[user.id] || {};
    const min = profile.declaredBudgetMin || primary?.minBudget || 0;
    const max = profile.declaredBudgetMax || primary?.maxBudget || 0;
    profile.declaredBudgetMin = min;
    profile.declaredBudgetMax = max;
    profile.declaredDownPayment = profile.declaredDownPayment || primary?.downPayment || 0;
    profile.declaredCashReady = Boolean(profile.declaredCashReady ?? primary?.cashReady);
    profile.declaredUsesCredit = Boolean(profile.declaredUsesCredit ?? primary?.usesCredit);
    profile.documents = [];
    profile.verificationLevel = min && max ? `Bütçe Beyanı: ${shortMoney(min)}-${shortMoney(max)}` : "Bütçe Beyanlı Alıcı";
    profile.badge = profile.declaredCashReady ? "green" : (max >= 6000000 ? "blue" : "neutral");
    profile.budgetTrustScore = profile.budgetTrustScore || (max ? Math.min(88, Math.round(max / 100000)) : 40);
    profile.profileCompletion = profile.profileCompletion || (max ? 70 : 35);
    next.buyerProfiles[user.id] = profile;
  });
  return next;
}

function userByIdFrom(source, id) {
  return (source.users || []).find((user) => user.id === id) || { role: "VISITOR" };
}

// Sunucu artik veri kaynagi; yerel yazma devre disi (geriye donuk uyumluluk icin bos birakildi).
function saveState() {}

// ---- Sunucu API istemcisi ----
async function api(path, method = "GET", body) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  let data = {};
  try { data = await res.json(); } catch { /* yoksay */ }
  return { status: res.status, ok: res.ok && data.ok !== false, data };
}

async function refreshState() {
  try {
    const r = await api("/state");
    if (r.data && r.data.state) {
      const s = r.data.state;
      s.buyerProfiles = s.buyerProfiles || {};
      s.verificationDocuments = s.verificationDocuments || [];
      s.complaints = s.complaints || [];
      s.abuseSignals = s.abuseSignals || [];
      s.auditLogs = s.auditLogs || [];
      s.emailOutbox = s.emailOutbox || [];
      s.payments = s.payments || [];
      state = s;
      // Canli-mod bayragi sunucudan gelir: PayTR yapilandirilmis + PAYTR_TEST_MODE=0 ise
      // odeme butonlari herkese acilir. (?pay=1 testte manuel acmayi surdurur.)
      if (s.config && s.config.paymentsLive) PAYMENTS_LIVE = true;
    }
    if (!TR_ILLER.length) {
      const rl = await api("/locations/iller");
      if (rl.ok && rl.data && rl.data.iller) TR_ILLER = rl.data.iller;
    }
  } catch (e) {
    console.error("Durum alinamadi:", e);
  }
}

// Form hata kutusunu gosteren yardimci
function showFormError(id, message) {
  const el = document.getElementById(id);
  if (!el) { toast(message); return; }
  el.textContent = message;
  el.classList.add("show");
}

// Secilen gorseli okur, tarayicida kucultur (max 1100px, JPEG) ve data URL dondurur.
function readImageInput(id) {
  const input = document.getElementById(id);
  const file = input && input.files && input.files[0];
  if (!file || !file.type.startsWith("image/")) return Promise.resolve(null);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1100;
        let width = img.width, height = img.height;
        if (width > max || height > max) {
          const r = Math.min(max / width, max / height);
          width = Math.round(width * r);
          height = Math.round(height * r);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => resolve(null);
      img.src = reader.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function nextId(type) {
  state.counters[type] = (state.counters[type] || 1) + 1;
  return `${type.slice(0, 1)}-${state.counters[type]}`;
}

function currentUser() {
  const activeUser = state.users.find((user) => user.id === state.auth?.currentUserId);
  if (activeUser) return activeUser;
  const roleMap = {
    buyer: "u-buyer-1",
    seller: "u-seller-1",
    agent: "u-agent-1",
    admin: "u-admin-1"
  };
  return state.users.find((user) => user.id === roleMap[state.currentRole]) || state.users[0];
}

function isSignedIn() {
  return Boolean(state.auth?.currentUserId && state.users.some((user) => user.id === state.auth.currentUserId));
}

function roleKeyForRole(role) {
  if (role === "BUYER") return "buyer";
  if (role === "SELLER") return "seller";
  if (role === "AGENT") return "agent";
  if (role === "ADMIN") return "admin";
  return "buyer";
}

function roleForKey(roleKey) {
  if (roleKey === "seller" || roleKey === "landlord") return "SELLER";
  if (roleKey === "agent") return "AGENT";
  return "BUYER"; // buyer, tenant
}

function roleLabel(role) {
  const labels = { BUYER: "Alıcı", SELLER: "Satıcı", AGENT: "Emlak danışmanı", ADMIN: "Admin" };
  return labels[role] || role;
}

function dashboardPathForRole(role) {
  if (role === "ADMIN") return "dashboard/admin";
  if (role === "SELLER" || role === "AGENT") return "dashboard/satici";
  return "dashboard/alici";
}

function authAccountByEmail(email) {
  const normalized = normalizeEmail(email);
  return (state.authAccounts || []).find((account) => normalizeEmail(account.email) === normalized);
}

function userById(id) {
  return state.users.find((user) => user.id === id) || { id, name: "Bilinmeyen kullanıcı", role: "VISITOR", email: "-", phone: "-" };
}

function demandById(id) {
  return state.demands.find((demand) => demand.id === id);
}

function propertyById(id) {
  return state.properties.find((property) => property.id === id);
}

function offerById(id) {
  return state.offers.find((offer) => offer.id === id);
}

function matchById(id) {
  return state.matches.find((match) => match.id === id);
}

function buyerProfile(userId) {
  return state.buyerProfiles[userId] || { verificationLevel: "Bütçe Beyanlı Alıcı", badge: "neutral", budgetTrustScore: 38, profileCompletion: 30, declaredBudgetMin: 0, declaredBudgetMax: 0, declaredDownPayment: 0, declaredCashReady: false, declaredUsesCredit: false, documents: [] };
}

function userPayments(userId) {
  return (state.payments || []).filter((payment) => payment.userId === userId && payment.status === "SUCCESS");
}

function hasPlan(userId, planId) {
  return userPayments(userId).some((payment) => payment.planId === planId);
}

function contactPlanForRole(roleName) {
  if (roleName === "buyer") return "plan-buyer-contact";
  return "plan-seller-contact";
}

function hasContactMembership(userId, roleName) {
  if (hasPlan(userId, "plan-pro")) return true;
  if (roleName === "buyer") return hasPlan(userId, "plan-buyer-contact");
  return hasPlan(userId, "plan-seller-contact") || hasPlan(userId, "plan-landlord-contact");
}

// Paket kartlarında Türkçe rol rozeti + Satılık/Kiralık gruplaması.
const PLAN_META = {
  // Uyelik (iletisim erisimi): kim para oder. Kiraci ucretsiz; alici/satici/ev sahibi/danisman oder.
  "plan-tenant-free": { role: "KİRACI", kind: "membership", order: 1, free: ["buyer", "RENT"] },
  "plan-landlord-contact": { role: "EV SAHİBİ", kind: "membership", order: 2 },
  "plan-buyer-contact": { role: "ALICI", kind: "membership", order: 3 },
  "plan-seller-contact": { role: "SATICI", kind: "membership", order: 4 },
  "plan-pro": { role: "DANIŞMAN", kind: "membership", order: 5 },
  // Uste tasima & reklam (opsiyonel) — ayri bolum.
  "plan-buyer-boost": { role: "ALICI", kind: "boost", order: 1 },
  "plan-seller-boost": { role: "SATICI", kind: "boost", order: 2 },
  "plan-landlord-boost": { role: "EV SAHİBİ", kind: "boost", order: 3 },
  // Kayit herkese ucretsiz; alici icin ayri "ucretsiz" karti gostermeyiz (kafa karistirmasin).
  "plan-buyer-free": { role: "ALICI", kind: "hidden", free: ["buyer", "SALE"] },
};

function planById(planId) {
  return state.plans.find((plan) => plan.id === planId);
}

function planCta(plan) {
  if (!PAYMENTS_LIVE) return "Yakında";
  if ((plan.category || "").includes("İletişim")) return "Üyeliği al";
  if ((plan.category || "").includes("Reklam") && plan.interval === "7 gün") return "Reklamı başlat";
  return "Paketi seç";
}

function badgeForProfile(profile) {
  if (profile.badge === "gold") return "badge-gold";
  if (profile.badge === "green") return "badge-green";
  if (profile.badge === "blue") return "badge-blue";
  return "badge-neutral";
}

function calculateMatchScore(demand, property) {
  let score = 0;
  const reasons = [];
  const warnings = [];
  if (!demand || !property) return { score: 0, reasons, warnings: ["Eksik talep veya ev verisi"] };
  if ((demand.transactionType || "SALE") !== (property.transactionType || "SALE")) return { score: 0, reasons, warnings: ["İşlem tipi farklı (satılık/kiralık)"] };
  if ((demand.mainCategory || CAT_KONUT) !== (property.mainCategory || CAT_KONUT)) return { score: 0, reasons, warnings: ["Kategori farklı (konut/iş yeri/arsa)"] };
  if (demand.city === property.city) score += 12;
  if (demand.district === property.district) {
    score += 13;
    reasons.push("Bölge uyumu yüksek");
  }
  if (property.neighborhood) {
    const dHoods = parseFeatures(demand.neighborhoods);
    if (demand.neighborhood) dHoods.push(demand.neighborhood);
    if (dHoods.includes(property.neighborhood)) { score += 10; reasons.push("Mahalle tam uyumu"); }
  }
  if (property.price >= demand.minBudget && property.price <= demand.maxBudget) {
    score += 25;
    reasons.push("Bütçeye tam uyuyor");
  } else if (property.price <= demand.maxBudget * 1.1) {
    score += 15;
    warnings.push("Fiyat üst sınıra yakın");
  } else {
    warnings.push("Fiyat talep bütçesinin üzerinde");
  }
  if (demand.roomCount === property.roomCount) {
    score += 15;
    reasons.push("Oda sayısı talebe uygun");
  }
  if (property.netSqm >= demand.minSqm && property.netSqm <= demand.maxSqm) score += 10;
  if (demand.propertyType === property.propertyType) score += 10;
  if (demand.purchaseTimeline.includes("1 ay") || demand.purchaseTimeline.includes("3 ay")) score += 5;
  if (!demand.usesCredit || property.creditEligible) {
    score += 5;
    reasons.push("Kredi uygunluğu beklentiyle eşleşiyor");
  }
  const profile = buyerProfile(demand.buyerId);
  if (profile.budgetTrustScore >= 75) score += 5;
  return { score: Math.min(100, score), reasons, warnings };
}

function maskSensitiveInfo(text) {
  let maskedText = text;
  const detectedTypes = [];
  const patterns = [
    { type: "telefon", regex: /(\+?90\s*)?0?\s?5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/gi },
    { type: "e-posta", regex: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi },
    { type: "whatsapp", regex: /whats\s?app|wpden|wp'den|watsap|watsapp/gi },
    { type: "instagram", regex: /(?:instagram|insta|ig)\s*[:@]?\s*[a-z0-9._]+|@[a-z0-9._]{3,}/gi },
    { type: "url", regex: /(https?:\/\/|www\.)\S+/gi },
    { type: "iban", regex: /TR\s?\d{2}\s?(\d{4}\s?){5}\d{2}/gi },
    { type: "açık adres", regex: /\b(mahalle|mah\.|sokak|sok\.|cadde|cad\.|no:?\s?\d+|daire:?\s?\d+)\b.*\d+/gi }
  ];
  patterns.forEach((pattern) => {
    if (pattern.regex.test(maskedText)) {
      detectedTypes.push(pattern.type);
      maskedText = maskedText.replace(pattern.regex, "[iletişim bilgisi gizlendi]");
    }
  });
  return { maskedText, containsSensitiveInfo: detectedTypes.length > 0, detectedTypes };
}

function createNotification(userId, type, title, body, actionUrl) {
  state.notifications.unshift({ id: nextId("notification"), userId, type, title, body, actionUrl, readAt: null, createdAt: today() });
}

function queueEmail(toUserId, subject, body, actionUrl, reason) {
  const recipient = userById(toUserId);
  const email = {
    id: nextId("email"),
    toUserId,
    toEmail: recipient.email,
    toName: recipient.name,
    subject,
    body,
    actionUrl,
    reason,
    status: "MOCK_SENT",
    createdAt: today()
  };
  state.emailOutbox.unshift(email);
  addAudit("EMAIL_QUEUED", "EmailOutbox", email.id, `${recipient.email} adresine e-posta bildirimi hazırlandı.`);
  return email;
}

function uniqueByUser(matches) {
  const seen = new Set();
  return matches.filter((item) => {
    if (seen.has(item.userId)) return false;
    seen.add(item.userId);
    return true;
  });
}

function matchingPropertiesForDemand(demand, threshold = 70) {
  return state.properties
    .filter((property) => property.status === "ACTIVE")
    .map((property) => ({ property, score: calculateMatchScore(demand, property).score, userId: property.sellerId }))
    .filter((item) => item.score >= threshold)
    .sort((a, b) => b.score - a.score);
}

function matchingDemandsForProperty(property, threshold = 70) {
  return state.demands
    .filter((demand) => demand.status === "ACTIVE")
    .map((demand) => ({ demand, score: calculateMatchScore(demand, property).score, userId: demand.buyerId }))
    .filter((item) => item.score >= threshold)
    .sort((a, b) => b.score - a.score);
}

function notifySellersForDemand(demand) {
  const matches = uniqueByUser(matchingPropertiesForDemand(demand).map((item) => ({
    userId: item.property.sellerId,
    property: item.property,
    score: item.score
  })));
  matches.forEach((item) => {
    createNotification(item.userId, "NEW_MATCHING_DEMAND", "Evinize uygun yeni alıcı talebi", `${demand.title} talebi ${item.property.title} ile ${item.score}/100 uyumlu görünüyor.`, "dashboard/satici/talepler");
    queueEmail(
      item.userId,
      "Evinize uygun yeni alıcı talebi var",
      `${demand.city}/${demand.district} bölgesinde ${shortMoney(demand.minBudget)}-${shortMoney(demand.maxBudget)} bütçeli yeni bir alıcı talebi var. ${item.property.title} ile uyum puanı: ${item.score}/100.`,
      "dashboard/satici/talepler",
      "Yeni alıcı talebi satıcının portföyündeki eve uydu"
    );
  });
  return matches.length;
}

function notifyBuyersForProperty(property) {
  const matches = uniqueByUser(matchingDemandsForProperty(property).map((item) => ({
    userId: item.demand.buyerId,
    demand: item.demand,
    score: item.score
  })));
  matches.forEach((item) => {
    createNotification(item.userId, "NEW_MATCHING_PROPERTY", "Talebinize uygun yeni ev", `${property.title} talebinizle ${item.score}/100 uyumlu görünüyor.`, "dashboard/alici/teklifler");
    queueEmail(
      item.userId,
      "Talebinize uygun yeni ev eklendi",
      `${property.city}/${property.district} bölgesinde ${money(property.price)} fiyatlı yeni bir ev eklendi. ${item.demand.title} talebinizle uyum puanı: ${item.score}/100.`,
      "dashboard/alici/teklifler",
      "Yeni satıcı ilanı alıcının talebine uydu"
    );
  });
  return matches.length;
}

function addAudit(action, entityType, entityId, metadata) {
  state.auditLogs.unshift({ id: nextId("audit"), actorId: currentUser().id, action, entityType, entityId, metadata, createdAt: today() });
}

function toast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const node = document.createElement("div");
  node.className = "toast show";
  node.textContent = message;
  document.body.appendChild(node);
  window.setTimeout(() => node.remove(), 2800);
}

function header() {
  const publicLinks = [
    ["home", "Ana Sayfa"],
    ["ilanlar", "İlanlar"],
    ["nasil-calisir", "Nasıl Çalışır"],
    ["fiyatlandirma", "Fiyatlandırma"],
    ["yardim", "Yardım"]
  ];
  const active = route();
  const signedIn = isSignedIn();
  const user = currentUser();
  return `
    <header class="topbar">
      <div class="topbar-inner">
        <a class="brand" href="#/home" aria-label="Konuttalebi ana sayfa">
          <span class="brand-mark">${icon("key", 19)}</span>
          <span class="brand-text"><strong>Konuttalebi</strong><span>Talep ve teklif</span></span>
        </a>
        <nav class="nav" id="site-nav" aria-label="Ana menü">
          ${publicLinks.map(([path, label]) => `<a class="${active === path ? "active" : ""}" href="#/${path}">${label}</a>`).join("")}
        </nav>
        <div class="top-actions">
          <button class="nav-toggle" type="button" aria-label="Menüyü aç/kapat" aria-controls="site-nav" aria-expanded="false" onclick="KT.toggleNav(this)">${icon("menu", 20)}</button>
          ${signedIn ? `
            <span class="account-pill">${icon("user", 15)} ${escapeHtml(user.name)} · ${roleLabel(user.role)}</span>
            <button class="btn btn-outline" onclick="KT.goDashboard()">${icon("chart", 16)} Panel</button>
            <button class="btn btn-ghost" onclick="KT.logout()">Çıkış</button>
          ` : `
            <a class="btn btn-outline" href="#/giris">${icon("lock", 16)} Giriş</a>
            <a class="btn btn-secondary" href="#/uye-ol">Üye ol</a>
          `}
        </div>
      </div>
    </header>
  `;
}

function footer() {
  return `
    <footer class="footer">
      <div class="footer-inner">
        <div>
          <a class="brand" href="#/home">
            <span class="brand-mark">${icon("key", 18)}</span>
            <span class="brand-text"><strong style="color:#fff">Konuttalebi</strong><span>Güvenli eşleşme</span></span>
          </a>
          <p class="muted" style="max-width:520px;margin:14px 0 0;color:#a9bfd2">Konuttalebi ödeme, kapora veya tapu devri garantisi vermez. Tapu ve ödeme işlemlerini resmi kurumlar ve bankalar üzerinden yürütün.</p>
        </div>
        <div class="footer-links">
          <a href="#/iletisim">İletişim / Firma</a>
          <a href="#/mesafeli-satis">Mesafeli Satış Sözleşmesi</a>
          <a href="#/on-bilgilendirme">Ön Bilgilendirme</a>
          <a href="#/iade-iptal">İade ve İptal</a>
          <a href="#/teslimat">Teslimat</a>
          <a href="#/kvkk">KVKK / Gizlilik</a>
          <a href="#/cerez-politikasi">Çerez Politikası</a>
          <a href="#/kullanim-sartlari">Kullanım Koşulları</a>
          <a href="#/guvenli-islem-rehberi">Güvenli İşlem</a>
          <a href="/kiralik-ev-arayan">Kiralık ev arayan</a>
          <a href="/evine-kiraci-bul">Evine kiracı bul</a>
        </div>
      </div>
      <div style="border-top:1px solid rgba(255,255,255,.12);margin-top:22px;padding-top:16px;text-align:center;color:#8ba3b8;font-size:13px">${copyrightText()}</div>
    </footer>
  `;
}

// Her sayfada gorunecek tescil/telif satiri (sirket unvaniyla).
function copyrightText() {
  return `© ${new Date().getFullYear()} Konuttalebi — ${COMPANY.unvan}. Tüm hakları saklıdır.`;
}
function copyrightBar() {
  return `<div class="copyright-bar">${copyrightText()}</div>`;
}

function homePage() {
  // Ana sayfa vitrini: temsili (sabit) ornek. Gercek kayitlara baglanmaz; veritabani bos olsa da calisir.
  const sampleDemand = {
    id: "ornek-talep", buyerId: "ornek", title: "Kadıköy'de aile için 3+1",
    city: "İstanbul", district: "Kadıköy", propertyType: "Daire", roomCount: "3+1",
    minSqm: 110, maxSqm: 155, minBudget: 6000000, maxBudget: 8000000, downPayment: 2500000,
    usesCredit: true, cashReady: false, purchaseTimeline: "3 ay içinde", transactionType: "SALE",
    description: "Metroya ve okula yakın, krediye uygun, bakımlı bir aile evi arıyorum.", offerCount: 0,
  };
  const sampleProperty = {
    id: "ornek-ilan", sellerId: "ornek", title: "Kadıköy Göztepe'de yenilenmiş 3+1",
    city: "İstanbul", district: "Kadıköy", roomCount: "3+1", netSqm: 122, price: 7350000,
    photoClass: "apartment", creditEligible: true, negotiable: true, transactionType: "SALE",
    description: "Bağdat Caddesi'ne yakın, bakımlı, krediye uygun daire.",
  };
  const profile = { verificationLevel: "Bütçe beyanı: 6–8 milyon TL", badge: "blue", budgetTrustScore: 88 };
  return `
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-copy">
          <span class="eyebrow">${icon("shield", 15)} Türkiye'nin ilk alıcı ve kiracı odaklı emlak piyasası</span>
          <h1>Sen ne aradığını söyle, doğru mülk sahibiyle doğrudan buluş.</h1>
          <p>Ev al, sat, kirala veya kiracı bul — talebini oluştur, sana uygun mülk sahibinin iletişim bilgisine üyelikle ulaş, gerisini doğrudan siz konuşun. Aracı yok, komisyon yok.</p>
          <div class="hero-actions">
            <button class="btn btn-primary" onclick="KT.startRegistration('buyer')">${icon("key", 17)} Alıcı olarak üye ol</button>
            <button class="btn btn-secondary" onclick="KT.startRegistration('seller')">${icon("home", 17)} Satıcı olarak üye ol</button>
          </div>
          <div class="hero-trustline" style="display:flex;flex-wrap:wrap;gap:16px;margin-top:20px;color:#cdd9e6;font-weight:600;font-size:14px">
            <span>${icon("card", 15)} Belge istenmez</span>
            <span>${icon("lock", 15)} İletişim açık rızayla</span>
            <span>${icon("shield", 15)} Komisyon yok</span>
          </div>
        </div>
        <div class="hero-preview" aria-hidden="true">
          <div class="hero-card hero-card-main">
            <div class="sample-top">
              <span class="badge ${badgeForProfile(profile)}">${icon("shield", 13)} ${escapeHtml(profile.verificationLevel)}</span>
              <span class="pill">${profile.budgetTrustScore}/100 güven</span>
            </div>
            <h3>${escapeHtml(sampleDemand.title)}</h3>
            <p>${escapeHtml(sampleDemand.city)} / ${escapeHtml(sampleDemand.district)} · ${escapeHtml(sampleDemand.roomCount)} · ${shortMoney(sampleDemand.minBudget)}-${shortMoney(sampleDemand.maxBudget)}</p>
            <div class="hero-progress"><span style="width:${profile.budgetTrustScore}%"></span></div>
          </div>
          <div class="hero-card hero-card-photo">
            <div class="photo ${sampleProperty.photoClass || ""}"></div>
            <div>
              <span class="badge badge-blue">92/100 uyum</span>
              <h3>${escapeHtml(sampleProperty.title)}</h3>
              <p>${escapeHtml(sampleProperty.roomCount)} · ${sampleProperty.netSqm} m2 · ${money(sampleProperty.price)}</p>
            </div>
          </div>
          <div class="hero-card hero-card-lock">
            <span class="brand-mark">${icon("lock", 18)}</span>
            <div>
              <strong>İletişim kilidi</strong>
              <p>Telefon ve e-posta üyelik alınana kadar gizli kalır; üyelikle açılır, doğrudan ararsın.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section class="band band-white">
      <div class="container">
        <div class="section-head">
          <div class="section-title">
            <div class="kicker">Yayındaki konutlar</div>
            <h2>Gerçek konutlar arasında gez, hemen ara.</h2>
            <p class="lead">İl, ilçe, mahalle ve kategoriye göre yayındaki gerçek konutları keşfet — üye olmadan da gezebilirsin. İletişim bilgisi yalnızca üyelikle açılır.</p>
          </div>
        </div>
        <div class="search-filterbar" style="margin-top:6px">
          <select id="home-tx"><option>Satılık</option><option>Kiralık</option></select>
          <select id="home-cat"><option value="">Tüm kategoriler</option>${MAIN_CATEGORIES.map((c) => `<option>${escapeHtml(c)}</option>`).join("")}</select>
          <select id="home-city"><option value="">Tüm iller</option>${TR_ILLER.map((il) => `<option value="${escapeHtml(il.code)}">${escapeHtml(il.name)}</option>`).join("")}</select>
          <button class="btn btn-primary" onclick="KT.homeSearch()">${icon("search", 16)} Ara</button>
        </div>
        <div id="home-listings" class="card-grid" style="margin-top:18px"><div class="empty" style="grid-column:1/-1"><b>Konutlar yükleniyor…</b><span class="muted">Yayındaki konutlar birazdan görünecek.</span></div></div>
        <div class="section-actions" style="margin-top:16px"><a class="btn btn-outline" href="#/ilanlar">${icon("search", 15)} Tüm konutları gör</a></div>
      </div>
    </section>
    <section class="trust-strip">
      <div class="container trust-grid">
        <div class="trust-item">${icon("card", 19)}<div><strong>Bütçe beyanı</strong><span>Alıcı sadece bütçe aralığını ve alım niyetini beyan eder.</span></div></div>
        <div class="trust-item">${icon("lock", 19)}<div><strong>İletişim bilgisi</strong><span>Mülk sahibinin telefon ve e-postası üyelikle açılır; gerisini doğrudan siz konuşursunuz.</span></div></div>
        <div class="trust-item">${icon("chart", 19)}<div><strong>Uyum puanı</strong><span>Bölge, bütçe, oda ve kredi uygunluğu birlikte puanlanır.</span></div></div>
      </div>
    </section>
    <section class="color-showcase">
      <div class="container color-showcase-grid">
        <div class="color-copy">
          <div class="kicker">Canlı talep piyasası</div>
          <h2>Aradığını açıkça söyle; sana uygun mülk sahibinin iletişim bilgisine ulaş, gerisini doğrudan konuş.</h2>
          <p>Konuttalebi'de belge istenmez. Bütçe/kira aralığını ve tercihlerini beyan edersin; sistem seni uygun konutlarla eşleştirir. Üyelikle mülk sahibinin iletişim bilgisine ulaşır, fiyata ve pazarlığa karışmadan doğrudan anlaşırsın.</p>
          <div class="color-chip-row">
            <span class="color-chip chip-coral">Talep beyanı</span>
            <span class="color-chip chip-teal">Talebe özel eşleşme</span>
            <span class="color-chip chip-blue">Doğrudan iletişim</span>
          </div>
        </div>
        <div class="visual-stack">
          <div class="visual-card visual-card-lg">
            <div class="visual-photo apartment"></div>
            <span class="badge badge-coral">6-8 mn TL alıcı talebi</span>
          </div>
          <div class="visual-card visual-card-sm">
            <div class="visual-photo residence"></div>
            <span>Ataşehir rezidans</span>
          </div>
          <div class="visual-card visual-card-sm visual-card-alt">
            <div class="visual-photo villa"></div>
            <span>Bahçeli villa arayan hazır alıcı</span>
          </div>
        </div>
      </div>
    </section>
    <section class="band band-white">
      <div class="container">
        <div class="section-head">
          <div class="section-title">
            <div class="kicker">Ürün akışı</div>
            <h2>Talebini oluştur, eşleş, mülk sahibiyle doğrudan iletişime geç.</h2>
            <p class="lead">Karşı taraf senin kimliğini veya özel bilgini değil, talep özetini ve güven rozetlerini görür. İletişim bilgisi üyelikle açılır; ödemeye, kiraya veya pazarlığa karışmayız — doğrudan siz anlaşırsınız. <em style="opacity:.75">(Aşağıdaki kartlar temsili örnektir.)</em></p>
          </div>
        </div>
        <div class="product-strip">
          ${demandCard(sampleDemand, { sample: true })}
          ${propertyOfferSample(sampleProperty, sampleDemand, profile)}
        </div>
      </div>
    </section>
    <section class="band band-soft">
      <div class="container">
        <div class="section-head">
          <div class="section-title">
            <div class="kicker">Neden farklı?</div>
            <h2>Klasik ev aramasının tersine çevrilmiş hali.</h2>
          </div>
        </div>
        <div class="grid grid-3">
          ${featureCard("key", "Aradığın netleşir", "Bölge, bütçe ve ihtiyacını beyan et; sistem seni en uygun konut ve taleplerle eşleştirir.")}
          ${featureCard("card", "Belge değil, beyan", "Belge yüklemezsin; bütçe/kira aralığı, peşinat ve zaman tercihini beyan edersin.")}
          ${featureCard("lock", "İletişim üyelikle açılır", "Mülk sahibinin telefon ve e-postası yalnızca bilgileri görme üyeliğiyle açılır; sonra doğrudan iletişime geçersin.")}
          ${featureCard("chart", "Talebe göre eşleşme", "Bölge, bütçe, oda, m2, konut tipi ve kredi uygunluğu puanlanır.")}
          ${featureCard("alert", "Kötüye kullanım izlenir", "Sahte, tekrarlı veya taciz amaçlı talep ve içerikler risk paneline düşer.")}
          ${featureCard("card", "Aracı yok, komisyon yok", "Tek işimiz doğru tarafları buluşturmak; fiyata, pazarlığa veya sözleşmeye karışmayız.")}
        </div>
      </div>
    </section>
    <section class="band band-soft" id="roller">
      <div class="container">
        <div class="section-head">
          <div class="section-title">
            <div class="kicker">Rolünü seç</div>
            <h2>Ev al, evini sat, ev kirala veya evini kiraya ver — Konuttalebi sana göre çalışır.</h2>
            <p class="lead">Dört akıştan sana uygun olanı seç: talebini oluştur, sistem seni eşleştirsin; üyelikle iletişim bilgisine ulaşıp doğrudan anlaşın. Emlak danışmanları için profesyonel paket de var.</p>
          </div>
        </div>
        <div class="grid grid-2 role-areas">
          <article class="card role-area">
            <span class="role-ic role-ic-blue">${icon("key", 26)}</span>
            <h3>Ev Al</h3>
            <p>Satın almak istediğin evi tarif et, talebini oluştur; sana uygun mülk sahibine üyelikle ulaş, doğrudan görüş. Belge istenmez, sadece bütçe beyanı.</p>
            <ul class="role-points"><li>Bütçe aralığı ve peşinat beyanı</li><li>Bölge, oda ve tipe göre eşleşme</li><li>Mülk sahibiyle doğrudan iletişim</li></ul>
            <button class="btn btn-primary" onclick="KT.startRegistration('buyer','SALE')">${icon("key", 16)} Ev Al — talep oluştur</button>
          </article>
          <article class="card role-area">
            <span class="role-ic role-ic-blue">${icon("key", 26)}</span>
            <h3>Ev Kirala</h3>
            <p>Kiralamak istediğin evi tarif et; sana uygun ev sahibine üyelikle ulaş, doğrudan anlaş. Aylık kira ve depozito aralığını beyan et.</p>
            <ul class="role-points"><li>Aylık kira aralığı ve eşyalı tercihi</li><li>Bölgeye göre kiralık eşleşme</li><li>Doğrudan ev sahibiyle iletişim</li></ul>
            <button class="btn btn-primary" onclick="KT.startRegistration('buyer','RENT')">${icon("key", 16)} Ev Kirala — talep oluştur</button>
          </article>
          <article class="card role-area">
            <span class="role-ic role-ic-teal">${icon("home", 26)}</span>
            <h3>Evini Sat</h3>
            <p>Satılık evine uygun alıcı taleplerini gör; uygun alıcının iletişim bilgisine üyelikle ulaş, doğrudan görüş. Tam adres alıcıya gösterilmez.</p>
            <ul class="role-points"><li>Uygun alıcı taleplerini gör</li><li>Alıcıya doğrudan ulaş</li><li>Ev görseli yükle</li></ul>
            <button class="btn btn-primary" onclick="KT.startRegistration('seller','SALE')">${icon("home", 16)} Evini Sat — talebini ver</button>
          </article>
          <article class="card role-area">
            <span class="role-ic role-ic-gold">${icon("home", 26)}</span>
            <h3>Evini Kirala</h3>
            <p>Kiraya vereceğin eve uygun kiracı taleplerini gör; uygun kiracının iletişim bilgisine üyelikle ulaş, doğrudan anlaş. Fiyata biz karışmayız.</p>
            <ul class="role-points"><li>Uygun kiracı taleplerini gör</li><li>Aylık kira ve depozito belirt</li><li>Doğrudan kiracıyla iletişim</li></ul>
            <button class="btn btn-primary" onclick="KT.startRegistration('seller','RENT')">${icon("home", 16)} Evini Kirala — talebini ver</button>
          </article>
        </div>
        <p class="lead" style="text-align:center;margin-top:20px">Emlak danışmanı mısın? <button class="btn btn-outline" onclick="KT.startRegistration('agent')">${icon("chart", 15)} Profesyonel paketle üye ol</button></p>
      </div>
    </section>
    <section class="band band-white">
      <div class="container">
        <div class="section-head">
          <div class="section-title">
            <div class="kicker">Nasıl işliyor?</div>
            <h2>Alıcıdan satıcıya uçtan uca, güvenli ve adım adım.</h2>
          </div>
        </div>
        ${howSteps()}
      </div>
    </section>
  `;
}

function featureCard(iconName, title, body) {
  return `<article class="card feature-card"><div class="feature-icon">${icon(iconName, 21)}</div><h3>${title}</h3><p>${body}</p></article>`;
}

function howSteps() {
  const illus1 = `<svg viewBox="0 0 128 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Talep oluştur">
    <rect x="10" y="10" width="108" height="80" rx="14" fill="#eef3f8"/>
    <rect x="34" y="24" width="60" height="58" rx="8" fill="#fff" stroke="#cdd9e6" stroke-width="2"/>
    <rect x="52" y="19" width="24" height="10" rx="4" fill="#4b7bec"/>
    <path d="M50 48 l14-11 14 11 v16 h-28 z" fill="#12243b"/>
    <rect x="58" y="54" width="12" height="10" fill="#eef3f8"/>
    <rect x="44" y="71" width="40" height="5" rx="2.5" fill="#e0a83e"/>
  </svg>`;
  const illus2 = `<svg viewBox="0 0 128 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sistem eşleştirir">
    <rect x="10" y="10" width="108" height="80" rx="14" fill="#eef3f8"/>
    <rect x="26" y="22" width="76" height="16" rx="5" fill="#fff" stroke="#cdd9e6" stroke-width="2"/>
    <rect x="32" y="28" width="24" height="4" rx="2" fill="#12243b"/>
    <rect x="62" y="27" width="34" height="6" rx="3" fill="#2bb3a3"/>
    <rect x="26" y="43" width="76" height="16" rx="5" fill="#fff" stroke="#cdd9e6" stroke-width="2"/>
    <rect x="32" y="49" width="18" height="4" rx="2" fill="#12243b"/>
    <g fill="#cdd9e6"><rect x="60" y="48" width="6" height="6" rx="1"/><rect x="70" y="48" width="6" height="6" rx="1"/><rect x="80" y="48" width="6" height="6" rx="1"/><rect x="90" y="48" width="6" height="6" rx="1"/></g>
    <ellipse cx="64" cy="76" rx="20" ry="11" fill="#12243b"/>
    <circle cx="64" cy="76" r="6" fill="#e0a83e"/><circle cx="64" cy="76" r="2.4" fill="#12243b"/>
  </svg>`;
  const illus3 = `<svg viewBox="0 0 128 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="İletişim bilgisine ulaş">
    <rect x="10" y="10" width="108" height="80" rx="14" fill="#eef3f8"/>
    <rect x="24" y="24" width="58" height="52" rx="8" fill="#fff" stroke="#cdd9e6" stroke-width="2"/>
    <rect x="30" y="30" width="46" height="20" rx="4" fill="#12243b"/>
    <rect x="30" y="56" width="30" height="5" rx="2.5" fill="#4b7bec"/>
    <rect x="30" y="65" width="22" height="5" rx="2.5" fill="#e0a83e"/>
    <path d="M88 50 h18 m-7-7 l7 7-7 7" stroke="#2bb3a3" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  const illus4 = `<svg viewBox="0 0 128 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Doğrudan anlaş">
    <rect x="10" y="10" width="108" height="80" rx="14" fill="#eef3f8"/>
    <path d="M28 32 h46 a6 6 0 0 1 6 6 v14 a6 6 0 0 1-6 6 h-30 l-11 9 v-9 a6 6 0 0 1-5-6 v-14 a6 6 0 0 1 6-6z" fill="#4b7bec"/>
    <g fill="#fff"><circle cx="42" cy="45" r="2.6"/><circle cx="52" cy="45" r="2.6"/><circle cx="62" cy="45" r="2.6"/></g>
    <rect x="72" y="52" width="34" height="30" rx="8" fill="#12243b"/>
    <rect x="83" y="45" width="12" height="13" rx="6" fill="none" stroke="#12243b" stroke-width="4"/>
    <circle cx="89" cy="66" r="4" fill="#e0a83e"/><rect x="87.5" y="66" width="3" height="9" rx="1.5" fill="#e0a83e"/>
  </svg>`;
  const steps = [
    [illus1, "Talebini oluştur", "Şehir, ilçe, bütçe/kira, oda, m2 ve zaman belirlenir; istenirse görsel eklenir."],
    [illus2, "Eşleş ve teklif al", "Bölge, bütçe, oda ve tipe göre eşleşirsin; uygun taraflar sana teklif gönderir, sen de gönderebilirsin. Kimliğin gizli kalır."],
    [illus3, "Üyelikle iletişimi aç", "Beğendiğin eşleşmede bilgileri görme üyeliğiyle karşı tarafın telefon ve e-postası açılır."],
    [illus4, "Doğrudan anlaş", "Fiyata, pazarlığa veya sözleşmeye karışmayız; şartları doğrudan siz belirlersiniz."]
  ];
  return `<div class="grid grid-4 how-steps">${steps.map(([svg, title, body], i) => `<article class="card how-step"><div class="how-illus">${svg}</div><span class="badge badge-gold">${i + 1}. adım</span><h3 style="margin-top:10px">${title}</h3><p>${body}</p></article>`).join("")}</div>`;
}

function demandCard(demand, options = {}) {
  const profile = buyerProfile(demand.buyerId);
  const score = profile.budgetTrustScore || 40;
  return `
    <article class="${options.sample ? "sample-card" : "row-card"}">
      ${options.sample ? "" : (demand.imageData ? `<div class="thumb"><img class="thumb-img" src="${demand.imageData}" alt=""></div>` : `<div class="thumb">${icon("key", 28)}</div>`)}
      <div>
        <div class="sample-top">
          <span class="badge ${badgeForProfile(profile)}">${icon("shield", 13)} ${escapeHtml(profile.verificationLevel)}</span>
          <span class="pill">${score}/100 bütçe güveni</span>
        </div>
        <h3 style="margin-top:12px">${escapeHtml(demand.title)}</h3>
        <p class="muted">${escapeHtml(demand.city)} / ${escapeHtml(demand.district)} · ${escapeHtml(demand.propertyType)} · ${escapeHtml(demand.roomCount)}</p>
        <div class="pill-row" style="margin-top:12px">
          <span class="pill">${shortMoney(demand.minBudget)} - ${shortMoney(demand.maxBudget)}</span>
          <span class="pill">${demand.minSqm}-${demand.maxSqm} m2</span>
          <span class="pill">${escapeHtml(demand.purchaseTimeline)}</span>
        </div>
        <p class="row-note">${escapeHtml(demand.description)}</p>
        ${options.sample ? "" : demandExtraPills(demand)}
      </div>
      ${options.sample ? "" : `<div class="row-side"><span class="badge badge-blue">${demand.offerCount} teklif</span><button class="btn btn-small btn-primary" onclick="KT.goSellerOffer('${demand.id}')">Teklif ver</button></div>`}
    </article>
  `;
}

function propertyOfferSample(property, demand, profile) {
  const match = calculateMatchScore(demand, property);
  return `
    <article class="sample-card">
      <div class="photo ${property.photoClass || ""}"></div>
      <div class="sample-top">
        <span class="badge badge-blue">${match.score}/100 uyum</span>
        <span class="badge ${badgeForProfile(profile)}">${escapeHtml(profile.verificationLevel)}</span>
      </div>
      <div>
        <h3>${escapeHtml(property.title)}</h3>
        <p class="muted">${escapeHtml(property.city)} / ${escapeHtml(property.district)} · ${property.roomCount} · ${property.netSqm} m2</p>
      </div>
      <div class="pill-row">
        <span class="pill">${money(property.price)}</span>
        <span class="pill">${property.creditEligible ? "Krediye uygun" : "Krediye uygun değil"}</span>
        <span class="pill">${property.negotiable ? "Pazarlığa açık" : "Net fiyat"}</span>
      </div>
      <p class="row-note">${escapeHtml(property.description)}</p>
      ${propertyExtraPills(property)}
    </article>
  `;
}

function registerFlowInfo(sel) {
  if (sel === "agent") return { label: "Emlak danışmanı", steps: [
    "Satılık ve kiralık portföyünü ekle; tam adres karşı tarafa gösterilmez.",
    "Sana uygun alıcı ve kiracı taleplerini eşleşme puanına göre gör.",
    "Üyelikle talep sahibinin iletişim bilgisine ulaş; doğrudan görüşüp anlaşırsın."
  ]};
  if (sel === "landlord") return { label: "Ev sahibi", steps: [
    "Evini ekle; aylık kira ve depozitoyu belirt, tam adres gizli kalır.",
    "Kiralık ev arayan kiracıların taleplerini gör.",
    "Üyelikle kiracının iletişim bilgisine ulaş; kirayı ve şartları doğrudan siz belirlersiniz."
  ]};
  if (sel === "seller") return { label: "Satıcı", steps: [
    "Evini ekle; konum, özellik ve fiyatını gir, tam adres alıcıya gösterilmez.",
    "Evine uygun, gerçek alıcı taleplerini gör.",
    "Üyelikle alıcının iletişim bilgisine ulaş; doğrudan görüşüp anlaşırsın."
  ]};
  if (sel === "tenant") return { label: "Kiracı", steps: [
    "Kiralık talebini oluştur; bölge, aylık kira aralığı, oda ve eşyalı tercihini belirt.",
    "Sana uygun kiralık konutlar eşleşme puanına göre öne çıkar.",
    "Üyelikle mülk sahibinin iletişim bilgisine ulaş; doğrudan ev sahibiyle anlaşırsın."
  ]};
  return { label: "Alıcı", steps: [
    "Talebini oluştur; bölge, bütçe aralığı, oda ve tercihlerini belirt (belge istenmez).",
    "Sana uygun satılık konutlar eşleşme puanına göre öne çıkar.",
    "Üyelikle mülk sahibinin iletişim bilgisine ulaş; fiyatı doğrudan siz belirlersiniz."
  ]};
}
function regAsideHTML(sel) {
  const flow = registerFlowInfo(sel);
  return `
    <span class="badge badge-blue">${icon("shield", 13)} ${flow.label} üyeliği</span>
    <h3>Nasıl çalışır?</h3>
    <ol style="list-style:none;margin:14px 0 0;padding:0;display:grid;gap:12px">
      ${flow.steps.map((s, i) => `<li style="display:flex;gap:10px;align-items:flex-start"><span style="flex:0 0 26px;height:26px;border-radius:8px;background:var(--navy,#10243a);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px">${i + 1}</span><span style="color:#33475b;font-size:14.5px;line-height:1.45">${s}</span></li>`).join("")}
    </ol>
    <p style="font-size:14px;margin-top:16px">Zaten üyeysen <a href="#/giris">giriş yap</a>.</p>`;
}

function authRegisterPage(roleKey = "buyer") {
  const base = ["buyer", "seller", "agent"].includes(roleKey) ? roleKey : "buyer";
  const selectedRole = base === "agent" ? "agent"
    : base === "seller" ? (uiTxMode === "RENT" ? "landlord" : "seller")
    : (uiTxMode === "RENT" ? "tenant" : "buyer");
  const roleOptions = [
    ["buyer", "Alıcı"],
    ["tenant", "Kiracı"],
    ["seller", "Satıcı"],
    ["landlord", "Ev sahibi"],
    ["agent", "Emlak danışmanı"]
  ];
  return publicShell("Üyelik oluştur", "Alıcı, kiracı, satıcı, ev sahibi veya emlak danışmanı olarak hesabını aç; panelin rolüne göre hazırlanır.", `
    <div class="auth-layout">
      <form class="panel auth-panel" onsubmit="KT.register(event)">
        <div class="form-grid">
          ${field("Ad soyad / firma adı", "r-name", "text", "Ad Soyad")}
          <div class="field">
            <label for="r-role">Üyelik tipi</label>
            <select id="r-role" onchange="KT.onRegRoleChange()">
              ${roleOptions.map(([value, label]) => `<option value="${value}" ${value === selectedRole ? "selected" : ""}>${label}</option>`).join("")}
            </select>
          </div>
          ${field("E-posta", "r-email", "email", "ornek@eposta.com")}
          ${field("Telefon", "r-phone", "tel", "05xx xxx xx xx")}
          <div class="field">
            <label for="r-city">Şehir</label>
            <select id="r-city">
              ${["İstanbul", "Ankara", "İzmir", "Eskişehir", "Bursa", "Antalya"].map((city) => `<option>${city}</option>`).join("")}
            </select>
          </div>
          ${field("Şifre", "r-password", "password", "En az 6 karakter")}
          ${field("Şifre tekrar", "r-password2", "password", "Şifreni tekrar yaz")}
          <div class="field full">
            <label class="check"><input id="r-terms" type="checkbox"><span style="font-weight:500;line-height:1.55"><a href="#/kullanim-sartlari" target="_blank">Kullanım Koşulları</a>, <a href="#/kvkk" target="_blank">KVKK Aydınlatma Metni</a> ve <a href="#/cerez-politikasi" target="_blank">Gizlilik/Çerez Politikası</a>'nı okudum ve kabul ediyorum. Eşleştiğim ve iletişim bilgilerini görme üyeliği olan tarafın iletişim bilgilerimi görebileceğini onaylıyorum. <span style="color:#c0392b">*</span></span></label>
          </div>
          <div class="field full">
            <label class="check"><input id="r-marketing" type="checkbox"><span style="font-weight:500;line-height:1.55">Kampanya, duyuru ve fırsatlardan haberdar olmak için ticari elektronik ileti (e-posta/SMS) gönderilmesine izin veriyorum. <span class="muted" style="font-weight:400">(İsteğe bağlı)</span></span></label>
          </div>
        </div>
        <div id="r-error" class="error"></div>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">${icon("check", 16)} Üyeliği oluştur</button>
          <a class="btn btn-outline" href="#/giris">Zaten üyeyim</a>
        </div>
      </form>
      <aside class="auth-side" id="reg-aside">${regAsideHTML(selectedRole)}</aside>
    </div>
  `);
}

function authLoginPage() {
  return publicShell("Giriş yap", "Üyeliğinle panele dön; alıcı, satıcı, kiracı ve ev sahibi akışına devam et.", `
    <div class="auth-layout auth-layout-narrow">
      <form class="panel auth-panel" onsubmit="KT.login(event)">
        <div class="form-grid">
          ${field("E-posta", "l-email", "email", "adiniz@eposta.com")}
          ${field("Şifre", "l-password", "password", "Şifreniz")}
        </div>
        <div id="l-error" class="error"></div>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">${icon("lock", 16)} Giriş yap</button>
          <a class="btn btn-outline" href="#/uye-ol">Üye ol</a>
        </div>
        <p class="muted" style="margin-top:12px;font-size:13px"><a href="#/sifremi-unuttum">Şifreni mi unuttun?</a></p>
      </form>
      <aside class="auth-side">
        <span class="badge badge-gold">${icon("lock", 13)} Güvenli giriş</span>
        <h3>Tekrar hoş geldin.</h3>
        <p>Üyeliğinle paneline dön; talep, teklif ve eşleşmelerini tek yerden yönet. İletişim bilgilerin her zaman korunur.</p>
        <div class="auth-benefits">
          <span>${icon("key", 16)} Talep ve teklif yönetimi</span>
          <span>${icon("lock", 16)} Doğrudan iletişim</span>
        </div>
      </aside>
    </div>
  `);
}

function forgotPasswordPage() {
  return publicShell("Şifreni sıfırla", "E-posta adresini gir; sana bir sıfırlama bağlantısı gönderelim.", `
    <div class="auth-layout auth-layout-narrow">
      <form class="panel auth-panel" onsubmit="KT.requestPasswordReset(event)">
        <div class="form-grid">
          ${field("E-posta", "fp-email", "email", "adiniz@eposta.com")}
        </div>
        <div id="fp-error" class="error"></div>
        <div id="fp-ok" class="notice" style="display:none;margin:6px 0 12px">Eğer bu e-posta kayıtlıysa, sıfırlama bağlantısı gönderildi. Gelen kutunu (ve spam) kontrol et.</div>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">${icon("mail", 16)} Sıfırlama bağlantısı gönder</button>
          <a class="btn btn-outline" href="#/giris">Girişe dön</a>
        </div>
      </form>
      <aside class="auth-side">
        <span class="badge badge-gold">${icon("lock", 13)} Güvenli sıfırlama</span>
        <h3>Şifreni mi unuttun?</h3>
        <p>E-postana tek kullanımlık, <strong>1 saat</strong> geçerli bir bağlantı gönderiyoruz. Bağlantıdan yeni şifreni belirleyebilirsin. Güvenlik için e-postanın kayıtlı olup olmadığını açık etmeyiz.</p>
      </aside>
    </div>
  `);
}

function resetPasswordPage() {
  const token = new URLSearchParams((location.hash.split("?")[1] || "")).get("token") || "";
  const hasToken = token.length > 10;
  return publicShell("Yeni şifre belirle", "Hesabın için yeni bir şifre oluştur.", `
    <div class="auth-layout auth-layout-narrow">
      <form class="panel auth-panel" onsubmit="KT.submitPasswordReset(event)">
        ${hasToken ? "" : `<div class="error show" style="margin-bottom:12px">Bağlantı geçersiz görünüyor. Lütfen <a href="#/sifremi-unuttum">yeniden şifre sıfırlama isteyin</a>.</div>`}
        <input type="hidden" id="rp-token" value="${escapeAttr(token)}">
        <div class="form-grid">
          ${field("Yeni şifre", "rp-password", "password", "En az 6 karakter")}
          ${field("Yeni şifre tekrar", "rp-password2", "password", "Şifreni tekrar yaz")}
        </div>
        <div id="rp-error" class="error"></div>
        <div id="rp-ok" class="notice" style="display:none;margin:6px 0 12px">Şifren güncellendi. Giriş sayfasına yönlendiriliyorsun…</div>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit"${hasToken ? "" : " disabled"}>${icon("check", 16)} Şifreyi güncelle</button>
          <a class="btn btn-outline" href="#/giris">Girişe dön</a>
        </div>
      </form>
      <aside class="auth-side">
        <span class="badge badge-gold">${icon("lock", 13)} Güvenli</span>
        <h3>Neredeyse tamam.</h3>
        <p>Yeni şifreni belirledikten sonra güvenlik için tüm cihazlardaki oturumların kapanır; yeni şifrenle tekrar giriş yaparsın.</p>
      </aside>
    </div>
  `);
}

function publicPage(kind) {
  if (kind === "giris") {
    return authLoginPage();
  }
  if (kind === "sifremi-unuttum") {
    return forgotPasswordPage();
  }
  if (kind === "sifre-sifirla" || kind.startsWith("sifre-sifirla")) {
    return resetPasswordPage();
  }
  if (kind === "uye-ol" || kind.startsWith("uye-ol/")) {
    return authRegisterPage(kind.split("/")[1] || "buyer");
  }
  if (kind === "hosgeldin") {
    return packageOfferPage();
  }
  if (kind === "nasil-calisir") {
    return publicShell("Nasıl Çalışır", "Talep ve teklif eşleşir; iletişim bilgisiyle taraflar doğrudan buluşur.", `
      ${howSteps()}
      <div class="grid grid-2" style="margin-top:18px">
        <article class="card"><h3>Alıcı / kiracı akışı</h3><p>Hesap oluştur, aradığın evi tarif et, bütçeni beyan et; sana uygun konutlarla eşleş, üyelikle mülk sahibinin iletişim bilgisine ulaş, doğrudan görüş.</p></article>
        <article class="card"><h3>Satıcı / ev sahibi akışı</h3><p>Evini ekle, sana uygun alıcı ve kiracı taleplerini gör; üyelikle karşı tarafın iletişim bilgisine ulaş, doğrudan görüşüp anlaş.</p></article>
      </div>
    `);
  }
  if (kind === "alici") {
    return publicShell("Alıcılar için", "Yüzlerce konut arasında kaybolmadan aradığın evi tarif et.", `
      <div class="grid grid-3">
        ${featureCard("key", "Talebini aç", "Bölge, bütçe ve özelliklerini tek kartta toparla.")}
        ${featureCard("card", "Bütçeni beyan et", "Belge yüklemeden bütçe aralığını, peşinatını ve alım zamanını belirt.")}
        ${featureCard("chat", "Doğrudan ulaş", "Üyelikle mülk sahibinin telefon ve e-postasına eriş, doğrudan görüş.")}
      </div>
      <div class="section-actions"><button class="btn btn-primary" onclick="KT.startRegistration('buyer')">Alıcı olarak üye ol</button></div>
    `);
  }
  if (kind === "satici") {
    return publicShell("Satıcılar için", "Evin için gerçek ihtiyacı olan alıcı taleplerini gör.", `
      <div class="grid grid-3">
        ${featureCard("home", "Hazır talep havuzu", "Bütçesi ve ihtiyacı belli alıcıları filtrele.")}
        ${featureCard("send", "Doğrudan iletişim", "Üyelikle uygun alıcının iletişim bilgisine ulaş, doğrudan görüş.")}
        ${featureCard("chart", "Kalite ve limit", "Paket limitleri ve risk skoru ile sürdürülebilir pazaryeri.")}
      </div>
      <div class="section-actions"><button class="btn btn-primary" onclick="KT.startRegistration('seller')">Satıcı olarak üye ol</button></div>
    `);
  }
  if (kind === "fiyatlandirma") {
    return publicShell("Fiyatlandırma", "Kayıt ücretsiz. Kiralık ev arayan (kiracı) tamamen ücretsizdir. Alıcı, satıcı, ev sahibi ve emlak danışmanı yalnızca eşleştikten sonra karşı tarafın iletişim bilgisini görmek için öder. Üste taşıma & reklam ise ayrı, isteğe bağlı bir hizmettir.", pricingCards());
  }
  if (kind === "yardim") {
    return publicShell("Yardım ve SSS", "Konuttalebi'nin temel kurallarını sade biçimde incele.", faq());
  }
  if (["iletisim", "kvkk", "gizlilik", "kullanim-sartlari", "cerez-politikasi", "mesafeli-satis", "on-bilgilendirme", "iade-iptal", "teslimat", "guvenli-islem-rehberi"].includes(kind)) {
    return legalPage(kind);
  }
  if (kind === "ilanlar" || kind === "ara") {
    return `<section class="band band-white"><div class="container">${searchPage()}</div></section>`;
  }
  return homePage();
}

function publicShell(title, subtitle, body) {
  return `<section class="band band-white"><div class="container"><div class="section-head"><div class="section-title"><div class="kicker">Konuttalebi</div><h2>${title}</h2><p class="lead">${subtitle}</p></div></div>${body}</div></section>`;
}

function pricingCards(roleTypes = null) {
  const plans = roleTypes ? state.plans.filter((plan) => roleTypes.includes(plan.roleType)) : state.plans;
  const meta = (id) => PLAN_META[id] || { role: "", group: "Diğer" };
  const card = (plan) => {
    const m = meta(plan.id);
    const btn = m.free
      ? `<button class="btn btn-outline" style="margin-top:16px;width:100%" onclick="KT.startRegistration('${m.free[0]}','${m.free[1]}')">Ücretsiz başla</button>`
      : `<button class="btn btn-primary" style="margin-top:16px;width:100%" onclick="KT.mockUpgrade('${plan.id}')">${planCta(plan)}</button>`;
    return `<article class="card">
      <div class="sample-top">
        <span class="badge ${plan.price ? "badge-gold" : "badge-neutral"}">${escapeHtml(m.role || plan.roleType)}</span>
        <span class="pill">${escapeHtml(plan.category || "Paket")}</span>
      </div>
      <h3 style="margin-top:12px">${escapeHtml(plan.name)}</h3>
      <p><strong style="font-size:28px;color:var(--navy)">${plan.price ? `${plan.price} TL` : "Ücretsiz"}</strong> ${plan.price ? `/ ${plan.interval}` : ""}</p>
      <div class="pill-row" style="margin-top:14px">${plan.features.map((f) => `<span class="pill">${escapeHtml(f)}</span>`).join("")}</div>
      ${btn}
    </article>`;
  };
  const sections = [
    ["membership", "Üyelik — İletişim Erişimi", "Kayıt herkes için ücretsiz. Ödeme yalnızca eşleştikten sonra karşı tarafın iletişim bilgisini görmek içindir. <strong>Kiralık ev arayan (kiracı) tamamen ücretsizdir.</strong>"],
    ["boost", "Üste Taşıma & Reklam · opsiyonel", "İsteğe bağlı. Talebini veya ilanını listelerin üstüne taşıyıp daha çok görünürlük al — zorunlu değildir, üyelikten ayrıdır."],
  ];
  return sections.map(([kind, title, sub]) => {
    const gp = plans.filter((p) => meta(p.id).kind === kind)
      .sort((a, b) => (meta(a.id).order || 99) - (meta(b.id).order || 99));
    if (!gp.length) return "";
    return `<div style="margin-bottom:30px"><div class="kicker" style="font-size:15px;color:var(--gold,#c8a24b);margin:6px 0 2px">${title}</div><p class="muted" style="margin:0 0 12px">${sub}</p><div class="grid grid-4">${gp.map(card).join("")}</div></div>`;
  }).join("");
}

function packageOfferPage() {
  const user = currentUser();
  if (!user) return authLoginPage();
  const role = user.role === "BUYER" ? "buyer" : user.role === "AGENT" ? "agent" : "seller";
  const rent = uiTxMode === "RENT";
  let planIds = [];
  if (role === "agent") planIds = ["plan-pro"];
  else if (role === "seller") planIds = rent ? ["plan-landlord-contact", "plan-landlord-boost"] : ["plan-seller-contact", "plan-seller-boost"];
  else planIds = rent ? [] : ["plan-buyer-contact", "plan-buyer-boost"]; // kiracı ücretsiz; upsell yok
  const plans = planIds.map((id) => planById(id)).filter(Boolean);
  const first = user.name ? escapeHtml(user.name.split(" ")[0]) : "";
  const cards = plans.length
    ? `<div class="grid grid-3" style="margin-top:6px">${plans.map((plan) => `
        <article class="card">
          <div class="sample-top"><span class="badge badge-gold">${escapeHtml((PLAN_META[plan.id] || {}).role || "")}</span><span class="pill">${escapeHtml(plan.category || "")}</span></div>
          <h3 style="margin-top:12px">${escapeHtml(plan.name)}</h3>
          <p><strong style="font-size:26px;color:var(--navy)">${plan.price} TL</strong> <span class="muted">/ ${plan.interval}</span></p>
          <div class="pill-row" style="margin-top:12px">${plan.features.map((f) => `<span class="pill">${escapeHtml(f)}</span>`).join("")}</div>
          <button class="btn btn-primary" style="margin-top:14px;width:100%" onclick="KT.mockUpgrade('${plan.id}')">${planCta(plan)}</button>
        </article>`).join("")}</div>`
    : `<div class="notice" style="margin-top:6px"><strong>Kiracı olarak tamamen ücretsizsin.</strong> Kiralık talebini oluştur; sana uygun ev sahipleri seninle iletişime geçsin. Ödeme yapman gerekmez.</div>`;
  return publicShell(`Hoş geldin${first ? ", " + first : ""}!`,
    "Üyeliğin hazır. İstersen bir paketle başla, istersen hiçbir paket almadan ücretsiz devam et — dilediğin an panelden yükseltebilirsin.", `
    ${cards}
    <div style="margin-top:22px;display:flex;gap:14px;flex-wrap:wrap;align-items:center">
      <button class="btn btn-outline" onclick="KT.skipPackages()">${icon("key", 16)} Paketsiz ücretsiz devam et</button>
      <span class="muted">Paket almadan da talep oluşturabilir ve eşleşebilirsin.</span>
    </div>
  `);
}

function faq() {
  const rows = [
    ["Konuttalebi nedir?", "Alıcı ve kiracıların konut talebi oluşturduğu, satıcı ve ev sahiplerinin talep verdiği çift yönlü bir emlak platformudur. Talebine/ilanına uygun taraflar sana teklif gönderir; beğendiğin eşleşmede bilgileri görme üyeliğiyle karşı tarafın iletişim bilgisine ulaşır, doğrudan kendi aranızda anlaşırsınız. Platform içi mesajlaşma yoktur; fiyata ve pazarlığa karışmayız."],
    ["Belge yüklemem gerekiyor mu?", "Hayır. Yalnızca bütçe/kira aralığını, peşinatını ve zaman tercihini beyan edersin."],
    ["Telefonum ne zaman görünür?", "Karşı taraf, senin talebin/ilanın için bilgileri görme üyeliğini aldığında iletişim bilgin görünür. Bu bilgi yalnızca eşleşme kapsamında ve açık rızanla paylaşılır."],
    ["Emlak danışmanları kullanabilir mi?", "Evet, ancak daha sıkı rate limit ve kalite skoruna tabidir."],
    ["Bütçe beyanı zorunlu mu?", "Talep oluşturmak için bütçe/kira aralığı gerekir; belge yükleme yoktur."],
    ["Şikayet nasıl yapılır?", "İlan, talep veya kullanıcı kartından şikayet oluşturulabilir; admin panelde incelenir."]
  ];
  return `<div class="grid grid-2">${rows.map(([q, a]) => `<article class="card"><h3>${q}</h3><p>${a}</p></article>`).join("")}</div>`;
}

const COMPANY = {
  unvan: "TLP Danışmanlık Sanayi ve Ticaret Limited Şirketi",
  adres: "Zincirlikuyu Mah. 8048 Sk. No: 3B İç Kapı No: 2 Tepebaşı / Eskişehir",
  mersis: "0845077119400001",
  vergi: "Eskişehir Defterdarlığı / 8450771194",
  sicil: "Eskişehir Ticaret Sicili Müdürlüğü - 58820",
  email: "konuttalebi@gmail.com",
  tel: "0544 339 20 23",
  odeme: "PayTR Ödeme ve Elektronik Para Hizmetleri A.Ş. (PayTR)",
};

function legalPage(kind) {
  const C = COMPANY;
  const firmaList = `<ul class="legal-list">
      <li><strong>Ünvan:</strong> ${C.unvan}</li>
      <li><strong>Adres:</strong> ${C.adres}</li>
      <li><strong>MERSİS No:</strong> ${C.mersis}</li>
      <li><strong>Vergi Dairesi / No:</strong> ${C.vergi}</li>
      <li><strong>Ticaret Sicil:</strong> ${C.sicil}</li>
      <li><strong>E-posta:</strong> ${C.email}</li>
      <li><strong>Telefon:</strong> ${C.tel}</li>
      <li><strong>Web:</strong> https://konuttalebi.com</li>
    </ul>`;
  const docs = {
    "iletisim": { t: "İletişim ve Firma Bilgileri", s: "Konuttalebi'yi işleten şirket ve iletişim bilgileri.", h: `
      <h3>Firma Bilgileri</h3>${firmaList}
      <h3>İletişim</h3>
      <p>Her türlü soru, öneri, talep ve şikâyetiniz için <strong>${C.email}</strong> adresine e-posta gönderebilir veya <strong>${C.tel}</strong> numaralı telefondan bize ulaşabilirsiniz. Başvurularınız en kısa sürede yanıtlanır.</p>
      <p class="muted">Konuttalebi bir çevrim içi emlak platformudur; gayrimenkul alım-satım veya kiralama işlemine taraf olmaz, fiyata ve pazarlığa karışmaz. Tapu, kapora ve ödeme işlemlerinizi resmi kurumlar ve bankalar üzerinden yürütünüz.</p>` },
    "on-bilgilendirme": { t: "Ön Bilgilendirme Formu", s: "Sipariş öncesi yasal bilgilendirme (6502 sayılı Kanun).", h: `
      <p>Bu form, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca, siparişinizi onaylamadan önce sizi bilgilendirmek için sunulur.</p>
      <h3>1. Hizmet Sağlayıcı</h3>${firmaList}
      <h3>2. Hizmetin Konusu</h3>
      <p>Konuttalebi'de sunulan dijital hizmet paketleri: (a) <strong>Bilgileri Görme Üyeliği</strong> — eşleştiğiniz karşı tarafın iletişim bilgisini (telefon/e-posta) görüntüleme hakkı; (b) <strong>Öne Çıkarma (Üste Taşı) Paketleri</strong> — talep veya ilanın listelerde belirli süre üstte gösterilmesi. Paketin adı, kapsamı, süresi ve KDV dâhil fiyatı satın alma ekranında açıkça belirtilir.</p>
      <h3>3. Fiyat ve Ödeme</h3>
      <p>Satın alma anında ekranda gösterilen, tüm vergiler dâhil tutar geçerlidir. Ödemeler ${C.odeme} sanal POS altyapısı ve 3D Secure ile alınır; kart bilgileriniz Konuttalebi tarafından görülmez ve saklanmaz.</p>
      <h3>4. İfa / Teslim</h3>
      <p>Hizmet elektronik ortamda, ödeme onayının ardından anında sağlanır.</p>
      <h3>5. Cayma Hakkı</h3>
      <p>Elektronik ortamda anında ifa edilen hizmetlerde, ifaya başlanmasına açık onay vermeniz hâlinde cayma hakkı kullanılamaz (Mesafeli Sözleşmeler Yönetmeliği m.15). Satın alma sırasında hizmetin hemen başlamasını ve cayma hakkının sona ereceğini onaylarsınız.</p>
      <h3>6. Şikâyet ve Uyuşmazlık</h3>
      <p>Başvurularınızı ${C.email} adresine iletebilirsiniz. Uyuşmazlıklarda, Ticaret Bakanlığı'nca belirlenen parasal sınırlar dâhilinde Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir.</p>` },
    "mesafeli-satis": { t: "Mesafeli Satış Sözleşmesi", s: "Dijital hizmet paketi satın alımına ilişkin sözleşme.", h: `
      <h3>Madde 1 — Taraflar</h3>
      <p>Bir tarafta HİZMET SAĞLAYICI ${C.unvan} (${C.adres}; e-posta: ${C.email}; tel: ${C.tel}) ile diğer tarafta https://konuttalebi.com üzerinden paket satın alan ÜYE arasında elektronik ortamda kurulmuştur.</p>
      <h3>Madde 2 — Konu</h3>
      <p>ÜYE'nin platformdan elektronik ortamda satın aldığı dijital hizmet paketinin (bilgileri görme üyeliği ve/veya öne çıkarma) sunulmasına ilişkin tarafların hak ve yükümlülüklerinin belirlenmesidir.</p>
      <h3>Madde 3 — Hizmetin Niteliği ve Fiyatı</h3>
      <p>Paketin adı, kapsamı, süresi ve KDV dâhil toplam bedeli sipariş özetinde yer alır. Konuttalebi bir platform hizmeti sunar; gayrimenkulün kendisini satmaz, kiralamaz ve alım-satıma taraf olmaz. Satılan şey, platform üzerindeki erişim/görünürlük hizmetidir.</p>
      <h3>Madde 4 — Ödeme</h3>
      <p>Ödeme, ${C.odeme} sanal POS ve 3D Secure ile kredi/banka kartından tahsil edilir. Kart bilgileri Konuttalebi sunucularında saklanmaz. Ödeme onaylanmadan hizmet aktifleşmez.</p>
      <h3>Madde 5 — İfa</h3>
      <p>Hizmet, ödeme onayının hemen ardından elektronik ortamda anında sağlanır. Üyelik süresi paket açıklamasındaki süre kadardır; aksi belirtilmedikçe otomatik yenileme yoktur.</p>
      <h3>Madde 6 — Cayma Hakkı ve İstisnası</h3>
      <p>Hizmet anında ifa edildiğinden, ÜYE'nin ifaya başlanmasına açık onay vermesiyle cayma hakkı sona erer (Yönetmelik m.15/ğ). ÜYE bu durumu satın alma ekranında onaylayarak siparişi tamamlar.</p>
      <h3>Madde 7 — Genel Hükümler ve Uyuşmazlık</h3>
      <p>Platform kullanımı Kullanım Koşulları ve KVKK Aydınlatma Metni'ne tabidir. Uyuşmazlıklarda Türkiye Cumhuriyeti hukuku uygulanır; Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir. ÜYE siparişi elektronik ortamda onayladığında sözleşmenin tüm koşullarını kabul etmiş sayılır.</p>` },
    "iade-iptal": { t: "İade ve İptal (Cayma) Politikası", s: "Dijital hizmet paketlerinde iade koşulları.", h: `
      <h3>1. Hizmetin Niteliği</h3>
      <p>Satılan paketler dijital hizmetlerdir ve ödeme onayının ardından anında sunulur.</p>
      <h3>2. Cayma Hakkı İstisnası</h3>
      <p>Elektronik ortamda anında ifa edilen hizmetlerde, ÜYE'nin ifaya başlanmasına açık onay vermesiyle cayma hakkı kullanılamaz (Mesafeli Sözleşmeler Yönetmeliği m.15). Bu nedenle kullanılmaya başlanan paketlerde kural olarak iade yapılmaz.</p>
      <h3>3. İstisnai İade Hâlleri</h3>
      <p>Aşağıdaki durumlarda ${C.email} adresine başvurabilirsiniz; uygun görülen hâllerde bedel aynı ödeme yöntemiyle iade edilir:</p>
      <ul class="legal-list"><li>Teknik arıza nedeniyle hizmetin hiç sunulamamış olması,</li><li>Aynı paketin mükerrer (çift) tahsil edilmesi,</li><li>Yasal olarak iade gereken diğer hâller.</li></ul>
      <h3>4. İade Süresi ve Başvuru</h3>
      <p>Onaylanan iadeler, ilgili banka/ödeme kuruluşu süreçlerine bağlı olarak genellikle birkaç iş günü içinde kart hesabınıza yansır. Talepleriniz için işlem no ve tarih ile ${C.email} adresine yazınız.</p>` },
    "teslimat": { t: "Teslimat ve İfa Koşulları", s: "Dijital hizmet; fiziksel teslimat/kargo yoktur.", h: `
      <p>Konuttalebi'de satılan tüm paketler <strong>dijital hizmettir</strong>; fiziksel ürün gönderimi, kargo veya teslimat söz konusu değildir.</p>
      <h3>İfa Şekli ve Süresi</h3>
      <p>Ödeme 3D Secure ile onaylandığı anda hizmet (üyelik / öne çıkarma) hesabınızda <strong>anında</strong> aktifleşir; ayrıca bir teslimat süresi yoktur. Üyelik, ilgili paketin açıklamasında belirtilen süre boyunca geçerlidir.</p>
      <h3>Kargo / Teslimat Ücreti</h3>
      <p>Dijital hizmet olduğundan herhangi bir kargo veya teslimat ücreti alınmaz.</p>` },
    "kvkk": { t: "KVKK Aydınlatma Metni ve Gizlilik Politikası", s: "Kişisel verilerinizin 6698 sayılı Kanun kapsamında işlenmesi hakkında.", h: `
      <p>${C.unvan} olarak kişisel verilerinizin güvenliğine azami önem veriyoruz. Verileriniz 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında aşağıda açıklandığı şekilde işlenir.</p>
      <h3>1. Veri Sorumlusu</h3>${firmaList}
      <p>Veri sorumlusu sıfatıyla ${C.unvan}. KVKK başvuruları için: <strong>${C.email}</strong>.</p>
      <h3>2. İşlenen Kişisel Veri Kategorileri</h3>
      <ul class="legal-list">
        <li><strong>Kimlik:</strong> ad-soyad; yasal zorunluluk hâlinde T.C. kimlik no.</li>
        <li><strong>İletişim:</strong> e-posta, telefon, şehir/adres.</li>
        <li><strong>İşlem güvenliği:</strong> IP, oturum ve log kayıtları, şifre (şifrelenmiş olarak), cihaz bilgisi.</li>
        <li><strong>Hizmet kullanımı:</strong> oluşturduğunuz talep/ilanlar ve beyanlar (bütçe/kira aralığı, peşinat, kredi/nakit tercihi), gönderdiğiniz teklifler, eşleşmeler, favoriler.</li>
        <li><strong>İşlem/ödeme:</strong> tutar, tarih, işlem numarası (<strong>kart numarası hariç</strong> — kart bilgisi yalnızca ödeme kuruluşu tarafında işlenir, bize aktarılmaz).</li>
        <li><strong>Pazarlama:</strong> çerez ve tercih kayıtları (onayınız dâhilinde).</li>
      </ul>
      <h3>3. İşleme Amaçları</h3>
      <p>Üyeliğin ve hizmetin sunulması; alıcı/kiracı taleplerinin satıcı/ev sahibi ilanlarıyla eşleştirilmesi; <strong>Bilgileri Görme Üyeliği</strong> kapsamında iletişim bilgisinin açılması; ödeme ve faturalandırma; güvenlik, dolandırıcılık ve kötüye kullanımın önlenmesi; yasal yükümlülüklerin yerine getirilmesi; talep/şikâyet yönetimi ve hizmet kalitesinin artırılması.</p>
      <h3>4. Toplama Yöntemi ve Hukuki Sebepler (KVKK m.5)</h3>
      <p>Veriler; web sitesi, mobil uygulama ve e-posta yoluyla elektronik ortamda toplanır. Hukuki sebepler: sözleşmenin kurulması/ifası; hukuki yükümlülük; bir hakkın tesisi/korunması; meşru menfaat; ve gerekli hâllerde açık rıza (örn. iletişim bilginizin, eşleştiğiniz ve üyeliği olan tarafa açılması).</p>
      <h3>5. Aktarım (KVKK m.8-9)</h3>
      <p>Veriler amaçla sınırlı olarak; ödeme kuruluşu (${C.odeme}), barındırma/altyapı ve e-posta/SMS sağlayıcıları, mali müşavir ve hukuk danışmanları ile yetkili kamu kurum ve kuruluşlarıyla (ör. adli merciler, BTK) paylaşılabilir. Verileriniz pazarlama amacıyla üçüncü kişilere <strong>satılmaz</strong>. Eşleşmede yalnızca ilgili iletişim bilgisi, üyeliği olan tarafa açılır.</p>
      <h3>6. Saklama Süresi</h3>
      <p>Veriler, işleme amacının gerektirdiği ve mevzuatın öngördüğü süre boyunca saklanır; süre sonunda resen veya talebiniz üzerine silinir, yok edilir ya da anonimleştirilir.</p>
      <h3>7. Haklarınız (KVKK m.11)</h3>
      <p>Kişisel veri sahibi olarak; verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işlenme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme, yurt içinde/dışında aktarıldığı üçüncü kişileri bilme, eksik/yanlış işlenmişse düzeltilmesini, şartlar oluştuğunda silinmesini/yok edilmesini isteme, otomatik analiz sonucu aleyhinize çıkan bir sonuca itiraz etme ve kanuna aykırı işleme nedeniyle zararınızın giderilmesini talep etme haklarına sahipsiniz. Başvurularınız ${C.email} üzerinden en geç <strong>30 gün</strong> içinde ücretsiz sonuçlandırılır.</p>` },
    "cerez-politikasi": { t: "Çerez (Cookie) Politikası", s: "Sitede kullanılan çerezler ve yönetimi hakkında.", h: `
      <p>Konuttalebi, hizmetin çalışması ve kullanıcı deneyiminin iyileştirilmesi için çerez (cookie) kullanır. Aşağıda çerez türleri ve yönetimi açıklanmıştır.</p>
      <h3>Çerez Türleri</h3>
      <ul class="legal-list">
        <li><strong>Zorunlu çerezler:</strong> Oturum açma, güvenlik ve temel işlevler için gereklidir (örn. oturum çerezi <code>kt_session</code>). Bunlar olmadan site çalışmaz; rıza gerektirmez.</li>
        <li><strong>İşlevsel çerezler:</strong> Dil, şehir veya görünüm gibi tercihlerinizi hatırlar.</li>
        <li><strong>Analitik / performans çerezleri:</strong> Ziyaret sayısı ve sayfa kullanımını <strong>anonim</strong> olarak ölçerek hizmeti iyileştirmemize yardımcı olur.</li>
        <li><strong>Hedefleme / reklam çerezleri:</strong> İlgi alanınıza uygun içerik ve reklam sunmak amacıyla, yalnızca onayınızla kullanılabilir.</li>
      </ul>
      <h3>Çerezlerin Yönetimi</h3>
      <p>Tarayıcı ayarlarınızdan çerezleri silebilir, engelleyebilir veya her girişte uyarı almayı seçebilirsiniz. Zorunlu çerezleri engellerseniz oturumun açık kalması gibi bazı özellikler çalışmayabilir. Kişisel veri işleme için KVKK Aydınlatma Metni'ne bakınız.</p>` },
    "kullanim-sartlari": { t: "Kullanım Koşulları (Üyelik Sözleşmesi)", s: "Platformu kullanırken geçerli kurallar ve tarafların hak/yükümlülükleri.", h: `
      <p>Lütfen Site'yi kullanmadan önce bu koşulları dikkatlice okuyunuz. Site'ye üye olan veya Site'yi kullanan herkes bu koşulları kabul etmiş sayılır.</p>
      <h3>1. Taraflar ve Kapsam</h3>
      <p>Bu sözleşme, ${C.unvan} ("PLATFORM" / "Konuttalebi"; ${C.adres}) ile https://konuttalebi.com ve mobil uygulamalarına ("Site") üye olan ya da Site'yi kullanan gerçek/tüzel kişi ("ÜYE" / "KULLANICI") arasında elektronik ortamda akdedilmiştir.</p>
      <h3>2. Tanımlar</h3>
      <ul class="legal-list">
        <li><strong>Site:</strong> Konuttalebi web sitesi ve mobil uygulamaları.</li>
        <li><strong>Üye:</strong> Site'ye kayıt olan ve hizmetlerden yararlanan gerçek veya tüzel kişi.</li>
        <li><strong>Talep:</strong> Alıcı veya kiracının aradığı konutu tarif eden kayıt.</li>
        <li><strong>İlan:</strong> Satıcı veya ev sahibinin sunduğu konut kaydı.</li>
        <li><strong>Alıcı / Kiracı:</strong> Konut almak veya kiralamak için talep oluşturan Üye.</li>
        <li><strong>Satıcı / Ev Sahibi:</strong> Konut satan veya kiraya veren, ilan oluşturan Üye.</li>
        <li><strong>Bilgileri Görme Üyeliği:</strong> Eşleşilen karşı tarafın iletişim bilgisini görüntüleme hakkı veren ücretli üyelik.</li>
      </ul>
      <h3>3. Platformun Hukuki Statüsü</h3>
      <p>Konuttalebi, 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun kapsamında bir <strong>aracı hizmet sağlayıcı / yer sağlayıcı</strong> konumundadır. Taraflar arasındaki alım-satım veya kiralama ilişkisine taraf değildir; talep/ilan içeriğini bizzat oluşturmaz, doğruluğunu garanti etmez ve içerikten kullanıcılar sorumludur.</p>
      <h3>4. Üyelik ve Hesap</h3>
      <ul class="legal-list">
        <li>Üyelik, gerekli bilgilerin doğru ve eksiksiz girilmesi ve bu koşulların kabulüyle tamamlanır.</li>
        <li>18 yaşından küçükler üye olamaz; tüzel kişiler adına yalnızca yetkili temsilci işlem yapabilir.</li>
        <li>Üye tek bir hesap açabilir; hesabının ve şifresinin güvenliğinden bizzat sorumludur.</li>
        <li>Yanlış/eksik bilgi veya şifrenin üçüncü kişilerce kullanımından doğan zararlardan Üye sorumludur.</li>
      </ul>
      <h3>5. Üyenin Yükümlülükleri</h3>
      <ul class="legal-list">
        <li>Yürürlükteki mevzuata (TCK, TBK, TTK, FSEK vb.) uygun davranmak.</li>
        <li>Gerçek, doğru ve güncel talep/ilan oluşturmak; yanıltıcı, sahte veya hukuka aykırı içerik paylaşmamak.</li>
        <li>Başkasının kişisel/iletişim bilgilerini izinsiz kullanmamak ve paylaşmamak.</li>
        <li>Edindiği iletişim bilgisini yalnızca ilgili talep/ilan amacıyla kullanmak; izinsiz toplu pazarlama (spam) yapmamak.</li>
      </ul>
      <h3>6. Platformun Hak ve Yükümlülükleri</h3>
      <ul class="legal-list">
        <li>Hizmetin sürekliliği için azami özen gösterir; teknik arıza ve mücbir sebep kaynaklı kesintilerden sorumlu değildir.</li>
        <li>Mevzuata aykırı, yanıltıcı veya şüpheli gördüğü talep/ilanı yayınlamama ya da kaldırma hakkına sahiptir.</li>
        <li>Koşullara aykırı davranan hesapları geçici veya kalıcı olarak askıya alabilir.</li>
        <li>Yetkili mercilerin talebi hâlinde üye bilgilerini mevzuata uygun paylaşabilir.</li>
      </ul>
      <h3>7. İletişim Bilgisi, Teklif ve Mesajlaşma</h3>
      <p>Telefon, e-posta ve adres gibi iletişim bilgileri herkese açık değildir; yalnızca eşleşme sonrası <strong>Bilgileri Görme Üyeliği</strong> alan tarafa açılır. Site'de platform içi mesajlaşma yoktur; taraflar iletişim bilgisiyle doğrudan görüşür ve kendi aralarında anlaşır. Teklif iletmek ücretsizdir.</p>
      <h3>8. İkili İlişkiler ve Mali Sorumluluk Muafiyeti (ÖNEMLİ)</h3>
      <p>Konuttalebi bir <strong>ödeme veya emanet (escrow) hizmeti değildir</strong> ve taraflar arasındaki hiçbir alım-satım, kiralama, kapora, ödeme veya tapu işlemine taraf değildir. Kullanıcıların birbirleriyle kurdukları her ilişki, anlaşma ve ödeme tamamen kendi sorumluluklarındadır. Taşınmazın ayıplı olması, teslim/tescil edilmemesi, ödemenin yapılmaması gibi durumlarda Platform'un hiçbir hukuki, idari veya cezai sorumluluğu yoktur. Kullanıcılar, taşınmazı görmeden ve resmî belgeleri teyit etmeden <strong>kapora/ön ödeme yapmamaları</strong> konusunda uyarılır.</p>
      <h3>9. Ücretli Hizmetler</h3>
      <p>Bilgileri Görme Üyeliği ve öne çıkarma (üste taşıma) paketlerinin kapsam, süre ve KDV dâhil ücretleri satın alma ekranında belirtilir. Ödeme ve iade koşulları Ön Bilgilendirme Formu, Mesafeli Satış Sözleşmesi ve İade/İptal Politikası'na tabidir. Kiralık ev arayan (kiracı) için kayıt ve kullanım ücretsizdir.</p>
      <h3>10. Fikri Mülkiyet</h3>
      <p>Site'nin tasarımı, yazılımı, markası, logosu, veritabanı ve özgün içerikleri üzerindeki haklar ${C.unvan}'ne aittir; izinsiz kopyalanamaz, çoğaltılamaz veya tersine mühendislik yapılamaz. Üyelerin yüklediği içeriklerin hakları kendilerine ait olup, yayınlanmalarıyla Platform'a bunları hizmet kapsamında gösterme lisansı verilmiş sayılır.</p>
      <h3>11. Mücbir Sebep</h3>
      <p>Doğal afet, yangın, salgın, siber saldırı, altyapı/iletişim kesintisi gibi mücbir sebep hâllerinde Platform, yükümlülüklerini geç/eksik ifa etmesinden ya da ifa edememesinden sorumlu tutulamaz.</p>
      <h3>12. Değişiklikler, Uyuşmazlık ve Yürürlük</h3>
      <p>Platform, bu koşulları ve ücretlendirme politikasını tek taraflı değiştirme hakkını saklı tutar; değişiklikler Site'de yayımlandığında yürürlüğe girer. Uyuşmazlıklarda Türkiye Cumhuriyeti hukuku uygulanır ve <strong>Eskişehir Mahkemeleri ile İcra Daireleri</strong> yetkilidir. Üye, kaydını tamamlamakla bu koşulları okuduğunu ve kabul ettiğini beyan eder.</p>` },
    "guvenli-islem-rehberi": { t: "Güvenli İşlem Rehberi", s: "Hesap güvenliği, dolandırıcılığa karşı korunma ve emlak işlemlerinde dikkat edilecekler.", h: `
      <p>Konuttalebi tarafları buluşturur; ödeme, kapora ve tapu işlemlerine taraf olmaz. Güvenliğiniz için aşağıdaki başlıklara dikkat edin.</p>
      <h3>Hesap Güvenliği</h3>
      <ul class="legal-list">
        <li>Şifrenizi kimseyle paylaşmayın; harf, rakam ve sembol içeren güçlü bir şifre kullanın.</li>
        <li>Konuttalebi çalışanları sizden <strong>asla şifrenizi istemez</strong>; kendini yetkili gibi tanıtan kişilere itibar etmeyin.</li>
        <li>Hesabınızda şüpheli bir hareket görürseniz hemen ${C.email} adresine bildirin.</li>
      </ul>
      <h3>Dolandırıcılığa Karşı</h3>
      <ul class="legal-list">
        <li>Taşınmazı görmeden ve tapu/kimlik belgelerini teyit etmeden <strong>kapora veya ön ödeme yapmayın</strong>.</li>
        <li>Platform ödemelere aracılık etmez; para transferleri tamamen sizin sorumluluğunuzdadır.</li>
        <li>Gerçek olamayacak kadar düşük fiyatlı veya "acele karar ver" baskısı yapan tekliflere şüpheyle yaklaşın.</li>
      </ul>
      <h3>Emlak İşlemlerinde</h3>
      <ul class="legal-list">
        <li>Kapora, ödeme ve tapu devrini yalnızca <strong>resmî kanallar ve bankalar</strong> üzerinden yapın; tapu işlemini Tapu Müdürlüğü'nde gerçekleştirin.</li>
        <li>Karşı tarafın kimliğini ve taşınmazın tapu/aidat/ipotek durumunu doğrulayın.</li>
        <li>Üyelik ödemeleri yalnızca 3D Secure ile sanal POS üzerinden alınır; kart bilgilerinizi kimseyle paylaşmayın.</li>
      </ul>` },
  };
  docs["gizlilik"] = docs["kvkk"];
  const d = docs[kind] || docs["iletisim"];
  const style = `<style>.legal-doc h3{margin:20px 0 6px;font-size:17px;color:var(--navy,#10243a)}.legal-doc ul.legal-list{margin:8px 0;padding-left:20px}.legal-doc li{margin:5px 0}.legal-doc p{margin:8px 0}.legal-doc code{background:#eef3f8;padding:1px 5px;border-radius:4px}</style>`;
  return publicShell(d.t, d.s, `${style}<article class="panel legal-doc" style="line-height:1.75">${d.h}<p class="muted" style="margin-top:24px;font-size:13px;border-top:1px solid #e5eaf0;padding-top:14px">Bu metin bilgilendirme amaçlıdır ve yürürlükteki mevzuat esas alınır. Konuttalebi, ${C.unvan} tarafından işletilir. Sorularınız için ${C.email}.</p></article>`);
}

function dashboardLayout(role, content, activePath) {
  const menus = {
    buyer: [
      ["dashboard/alici", "Genel Bakış", "chart"],
      ["dashboard/alici/taleplerim", "Taleplerim", "key"],
      ["dashboard/alici/talep-olustur", "Yeni Talep", "send"],
      ["dashboard/ara", "İlan Ara", "search"],
      ["dashboard/alici/teklifler", "Gelen Teklifler", "home"],
      ["dashboard/alici/eslesmeler", "Eşleşmeler", "lock"],
      ["dashboard/alici/butce-beyani", "Bütçe Beyanı", "card"],
      ["dashboard/alici/bildirimler", "Bildirimler", "bell"],
      ["dashboard/alici/paketler", "Paketlerim", "card"],
      ["dashboard/alici/ayarlar", "Ayarlar", "user"]
    ],
    seller: [
      ["dashboard/satici", "Genel Bakış", "chart"],
      ["dashboard/satici/evlerim", "Evlerim", "home"],
      ["dashboard/satici/ev-ekle", "Yeni Ev", "send"],
      ["dashboard/ara", "İlan Ara", "search"],
      ["dashboard/satici/talepler", "Alıcı Talepleri", "key"],
      ["dashboard/satici/tekliflerim", "Tekliflerim", "card"],
      ["dashboard/satici/eslesmeler", "Eşleşmeler", "lock"],
      ["dashboard/satici/dogrulama", "Satıcı Doğrulama", "shield"],
      ["dashboard/satici/paketler", "Paketlerim", "card"]
    ],
    agent: [
      ["dashboard/satici", "Genel Bakış", "chart"],
      ["dashboard/satici/evlerim", "Portföy", "home"],
      ["dashboard/ara", "İlan Ara", "search"],
      ["dashboard/satici/talepler", "Alıcı Talepleri", "key"],
      ["dashboard/satici/tekliflerim", "Teklifler", "card"],
      ["dashboard/satici/eslesmeler", "Eşleşmeler", "lock"],
      ["dashboard/satici/paketler", "Kurumsal Paket", "card"]
    ],
    admin: [
      ["dashboard/admin", "Dashboard", "chart"],
      ["dashboard/admin/kullanicilar", "Kullanıcılar", "user"],
      ["dashboard/admin/uyelikler", "Üyelikler", "card"],
      ["dashboard/admin/talepler", "Alıcı Talepleri", "key"],
      ["dashboard/admin/ilanlar", "Satıcı İlanları", "home"],
      ["dashboard/admin/teklifler", "Teklifler", "card"],
      ["dashboard/admin/epostalar", "E-postalar", "mail"],
      ["dashboard/admin/belgeler", "Satıcı Belgeleri", "file"],
      ["dashboard/admin/sikayetler", "Şikayetler", "alert"],
      ["dashboard/admin/risk", "Risk Paneli", "shield"],
      ["dashboard/admin/odemeler", "Ödemeler", "card"],
      ["dashboard/admin/audit", "Audit Logs", "file"]
    ]
  };
  const list = menus[role] || menus.buyer;
  return `
    <div class="layout">
      <aside class="sidebar">
        <div class="sidebar-section">
          <p class="sidebar-title">${escapeHtml(currentUser().name)}</p>
          ${list.map(([path, label, iconName]) => `<a class="${activePath === path || activePath.startsWith(`${path}/`) ? "active" : ""}" href="#/${path}">${icon(iconName, 17)} ${label}</a>`).join("")}
        </div>
      </aside>
      <main class="main">${content}</main>
    </div>
  `;
}

function renderBuyer(path) {
  const user = currentUser();
  if (path.includes("/talep-olustur")) return dashboardLayout("buyer", buyerDemandForm(), path);
  if (path.includes("/taleplerim")) return dashboardLayout("buyer", buyerDemands(), path);
  if (path.includes("/teklifler/")) return dashboardLayout("buyer", buyerOfferDetail(path.split("/").pop()), path);
  if (path.includes("/teklifler")) return dashboardLayout("buyer", buyerOffers(), path);
  if (path.includes("/mesajlar/")) return dashboardLayout("buyer", messagesPage(path.split("/").pop(), "buyer"), path);
  if (path.includes("/mesajlar")) return dashboardLayout("buyer", messagesPage(null, "buyer"), path);
  if (path.includes("/eslesmeler")) return dashboardLayout("buyer", matchesPage("buyer"), path);
  if (path.includes("/butce-beyani") || path.includes("/dogrulama")) return dashboardLayout("buyer", budgetDeclarationPage(user.id), path);
  if (path.includes("/bildirimler")) return dashboardLayout("buyer", notificationsPage(user.id), path);
  if (path.includes("/paketler")) return dashboardLayout("buyer", buyerPackages(), path);
  if (path.includes("/ayarlar")) return dashboardLayout("buyer", settingsPage(user), path);
  return dashboardLayout("buyer", buyerOverview(), path);
}

function buyerOverview() {
  const user = currentUser();
  const demands = state.demands.filter((d) => d.buyerId === user.id);
  const offers = state.offers.filter((o) => o.buyerId === user.id);
  const matches = state.matches.filter((m) => m.buyerId === user.id);
  const profile = buyerProfile(user.id);
  return `
    ${pageHead("Alıcı Genel Bakış", "Taleplerin, gelen tekliflerin ve bütçe beyanın burada.")} 
    <div class="stat-grid">
      ${stat("Aktif talep", demands.filter((d) => d.status === "ACTIVE").length)}
      ${stat("Gelen teklif", offers.length)}
      ${stat("Eşleşme", matches.length)}
      ${stat("Profil", `%${profile.profileCompletion}`)}
    </div>
    <div class="grid grid-2">
      <section class="panel"><h3>Bütçe beyanı</h3><p class="muted" style="margin:8px 0 12px">Satıcılar belge değil, beyan ettiğin bütçe aralığını ve alım niyetini görür.</p><span class="badge ${badgeForProfile(profile)}">${icon("card", 13)} ${profile.verificationLevel}</span><div class="section-actions"><a class="btn btn-primary" href="#/dashboard/alici/butce-beyani">Beyanımı güncelle</a></div></section>
      <section class="panel"><h3>Önerilen aksiyon</h3><p class="muted" style="margin:8px 0 12px">Talebini ayrıntılandırmak daha kaliteli teklif almanı sağlar.</p><a class="btn btn-secondary" href="#/dashboard/alici/talep-olustur">Yeni talep oluştur</a></section>
    </div>
    <section class="panel"><h3>Son teklifler</h3><div class="list" style="margin-top:12px">${offers.slice(0, 3).map((offer) => offerRow(offer, "buyer")).join("") || empty("Henüz teklif yok", "Talebin yayına girdikçe satıcı teklifleri burada görünür.")}</div></section>
  `;
}

function buyerDemands() {
  const user = currentUser();
  const demands = state.demands.filter((d) => d.buyerId === user.id).sort((a, b) => Number(isBoosted(b)) - Number(isBoosted(a)));
  return `
    ${pageHead("Taleplerim", "Yayındaki, taslak veya pasif taleplerini yönet.", `<a class="btn btn-primary" href="#/dashboard/alici/talep-olustur">${icon("send", 16)} Yeni talep</a>`)}
    <div class="list">${demands.map((d) => demandRow(d, false)).join("") || empty("Henüz talep yok", "Yeni talep oluşturarak satıcılardan teklif almaya başlayabilirsin.")}</div>
  `;
}

function buyerPackages() {
  return `${pageHead("Paketlerim", "Talebini üste taşıma reklamı ve satıcı bilgilerini görme üyeliği.")}${pricingCards(["BUYER"])}`;
}

function buyerDemandForm() {
  const rent = uiTxMode === "RENT";
  return `
    ${pageHead(rent ? "Yeni Kiralık Talebi" : "Yeni Talep Oluştur", "Satıcı/ev sahiplerinin göreceği anonim talep kartını hazırla.")}
    <div class="wizard-steps">
      <div class="step active">1. Konum</div><div class="step active">2. Özellikler</div><div class="step active">3. ${rent ? "Kira" : "Bütçe"}</div><div class="step active">4. Önizleme</div>
    </div>
    <form class="panel" onsubmit="KT.createDemand(event)">
      <div class="form-grid">
        <div class="field full"><label for="d-txtype">İşlem tipi</label><select id="d-txtype" onchange="KT.setTxMode(this.value)"><option ${!rent ? "selected" : ""}>Satılık</option><option ${rent ? "selected" : ""}>Kiralık</option></select><span class="helper">${rent ? "Kiralık ev arayan talebi (Ev Kirala)." : "Satılık ev arayan talebi (Ev Al)."}</span></div>
        <div class="field"><label for="d-maincat">Ana kategori</label><select id="d-maincat" onchange="KT.onCategory('d')">${MAIN_CATEGORIES.map((c, i) => `<option ${i === 0 ? "selected" : ""}>${escapeHtml(c)}</option>`).join("")}</select></div>
        <div class="field"><label for="d-type">Alt tip</label><select id="d-type">${CATEGORY_TREE[CAT_KONUT].map((s, i) => `<option ${i === 0 ? "selected" : ""}>${escapeHtml(s)}</option>`).join("")}</select></div>
        ${field("Başlık", "d-title", "text", rent ? "Kadıköy'de eşyalı kiralık 2+1" : "Kadıköy'de aile için 3+1")}
        ${locationFields("d", true)}
        ${field("Oda sayısı", "d-rooms", "select", "", ["1+1", "2+1", "3+1", "4+1", "5+1"], CAT_KONUT)}
        ${field("Minimum m2", "d-minsqm", "number", rent ? "60" : "90")}
        ${field("Maksimum m2", "d-maxsqm", "number", rent ? "110" : "140")}
        ${field(rent ? "Minimum aylık kira" : "Minimum bütçe", "d-minbudget", "number", rent ? "20000" : "4500000")}
        ${field(rent ? "Maksimum aylık kira" : "Maksimum bütçe", "d-maxbudget", "number", rent ? "30000" : "6500000")}
        ${rent ? field("Öngörülen depozito", "d-deposit", "number", "30000") : field("Peşinat", "d-down", "number", "1500000")}
        ${field(rent ? "Taşınma zamanı" : "Alım zamanı", "d-timeline", "select", "", ["Hemen", "1 ay içinde", "3 ay içinde", "6 ay içinde", "Fırsat olursa"])}
        ${field("Isıtma tipi", "d-heating", "select", "", ISITMA_TIPLERI, CAT_KONUT + "|" + CAT_ISYERI)}
        ${field("Bina yaşı", "d-buildingage", "select", "", BINA_YASLARI, CAT_KONUT + "|" + CAT_ISYERI)}
        ${field("Tercih edilen kat", "d-floor", "select", "", KAT_TERCIHLERI, CAT_KONUT + "|" + CAT_ISYERI)}
        ${rent ? field("Meslek / çalışma durumu (opsiyonel)", "d-occupation", "select", "", MESLEK_DURUMLARI, CAT_KONUT) : ""}
        <div class="field full" data-cats="${CAT_KONUT}">
          <label>Tercihler</label>
          <div class="check-grid">
            ${rent
              ? `<label class="check"><input id="d-furnished" type="checkbox"> Eşyalı olsun</label>`
              : `<label class="check"><input id="d-credit" type="checkbox" checked> Kredi kullanacağım</label>
            <label class="check"><input id="d-cash" type="checkbox"> Nakit alım olabilir</label>
            <label class="check"><input id="d-exchange" type="checkbox"> Takas düşünebilirim</label>`}
          </div>
        </div>
        <div class="field full" data-cats="${CAT_KONUT}"><label>Olmasını istediğin <strong>iç özellikler</strong> <span class="muted">(opsiyonel, birden çok seçebilirsin)</span></label><div class="check-grid">${IC_OZELLIKLER.map((f) => `<label class="check"><input class="d-ic" type="checkbox" value="${escapeHtml(f)}"> ${escapeHtml(f)}</label>`).join("")}</div></div>
        <div class="field full" data-cats="${CAT_KONUT}"><label>Olmasını istediğin <strong>dış / site özellikleri</strong> <span class="muted">(opsiyonel)</span></label><div class="check-grid">${DIS_OZELLIKLER.map((f) => `<label class="check"><input class="d-dis" type="checkbox" value="${escapeHtml(f)}"> ${escapeHtml(f)}</label>`).join("")}</div></div>
        <div class="field full" data-cats="${CAT_ISYERI}" style="display:none"><label>Aradığın <strong>iş yeri özellikleri</strong> <span class="muted">(opsiyonel)</span></label><div class="check-grid">${ISYERI_OZELLIKLER.map((f) => `<label class="check"><input class="d-isyeri" type="checkbox" value="${escapeHtml(f)}"> ${escapeHtml(f)}</label>`).join("")}</div></div>
        <div class="field full" data-cats="${CAT_ARSA}" style="display:none"><label>Aradığın <strong>arsa özellikleri</strong> <span class="muted">(opsiyonel)</span></label><div class="check-grid">${ARSA_OZELLIKLER.map((f) => `<label class="check"><input class="d-arsa" type="checkbox" value="${escapeHtml(f)}"> ${escapeHtml(f)}</label>`).join("")}</div></div>
        <div class="field full"><p class="muted" style="margin:6px 0 0;font-size:13px">${icon("shield", 13)} İletişim bilgin (telefon/e-posta) herkese kapalıdır; yalnızca eşleştiğin ve üyelik satın alan tarafa açılır.</p></div>
        <div class="field full"><label>Açıklama</label><textarea id="d-desc" placeholder="Aradığın evi, çevre beklentini ve olmazsa olmazlarını yaz."></textarea><span class="helper">En az 20 karakter önerilir.</span></div>
        <div class="field full">
          <label>Görsel (opsiyonel)</label>
          <input id="d-image" type="file" accept="image/*" class="file-input" onchange="KT.previewImage(event,'d-image-preview')">
          <img id="d-image-preview" class="img-preview" alt="" style="display:none">
          <span class="helper">Aradığın ev tarzını gösteren bir görsel ekleyebilirsin.</span>
        </div>
      </div>
      <div id="d-error" class="error"></div>
      <div class="form-actions"><button class="btn btn-primary" type="submit">${icon("check", 16)} Talebi yayınla</button><a class="btn btn-outline" href="#/dashboard/alici/taleplerim">Vazgeç</a></div>
    </form>
  `;
}

function buyerOffers() {
  const user = currentUser();
  const offers = state.offers.filter((offer) => offer.buyerId === user.id);
  return `
    ${pageHead("Gelen Teklifler", "Satıcıların taleplerine özel gönderdiği teklif kartları.")}
    <div class="toolbar">
      <select onchange="KT.filterOffers(this.value)">
        <option value="all">Tüm teklifler</option>
        <option value="budget">Bütçeme uygun</option>
        <option value="new">Yeni teklifler</option>
        <option value="credit">Krediye uygun</option>
      </select>
      <span class="pill">${offers.length} teklif</span>
    </div>
    <div class="list" id="offer-list">${offers.map((offer) => offerRow(offer, "buyer")).join("") || empty("Henüz teklif almadın", "Talebine daha fazla detay ekleyerek satıcıların ilgisini artırabilirsin.")}</div>
  `;
}

function buyerOfferDetail(id) {
  const offer = offerById(id);
  if (!offer) return empty("Teklif bulunamadı", "Bu teklif silinmiş veya sana ait değil.");
  const property = propertyById(offer.propertyId);
  const demand = demandById(offer.demandId);
  const match = calculateMatchScore(demand, property);
  return `
    ${pageHead("Teklif Detayı", "Ev bilgilerini incele ve teklife yanıt ver. İlgilenirsen eşleşirsiniz; iletişim bilgisi üyelikle açılır.", `<a class="btn btn-outline" href="#/dashboard/alici/teklifler">Tüm tekliflere dön</a>`)}
    <article class="panel">
      <div class="grid grid-2">
        <div class="photo ${property.photoClass || ""}" style="min-height:320px"></div>
        <div>
          <span class="badge badge-blue">${match.score}/100 uyum</span>
          <h2 style="font-size:34px;margin-top:12px">${escapeHtml(property.title)}</h2>
          <p class="lead">${escapeHtml(property.city)} / ${escapeHtml(property.district)} · ${property.roomCount} · ${property.netSqm} m2</p>
          <div class="pill-row" style="margin-top:16px">
            <span class="pill">${money(offer.price)}</span>
            <span class="pill">${property.floor}</span>
            <span class="pill">Aidat ${money(property.dues)}</span>
            <span class="pill">${property.creditEligible ? "Krediye uygun" : "Krediye uygun değil"}</span>
            <span class="pill">${property.negotiable ? "Pazarlığa açık" : "Net fiyat"}</span>
          </div>
          <p class="row-note" style="margin-top:16px">${escapeHtml(offer.message)}</p>
          <div class="notice" style="margin-top:16px"><strong>Tam adres gizli.</strong> İlgilendiğinde eşleşme oluşur; iletişim bilgisi bilgileri görme üyeliğinle açılır.</div>
          <div class="form-actions">
            <button class="btn btn-primary" onclick="KT.respondOffer('${offer.id}','INTERESTED')">${icon("check", 16)} İlgileniyorum</button>
            <button class="btn btn-outline" onclick="KT.respondOffer('${offer.id}','INFO_REQUESTED')">Daha fazla bilgi iste</button>
            <button class="btn btn-ghost" onclick="KT.respondOffer('${offer.id}','DECLINED')">Uygun değil</button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderSeller(path) {
  const role = state.currentRole === "agent" ? "agent" : "seller";
  const sellerPath = path.replace("dashboard/satici", "dashboard/satici");
  if (sellerPath.includes("/ev-ekle")) return dashboardLayout(role, propertyForm(), path);
  if (sellerPath.includes("/evlerim")) return dashboardLayout(role, sellerProperties(), path);
  if (sellerPath.includes("/talepler")) return dashboardLayout(role, sellerDemands(), path);
  if (sellerPath.includes("/teklif-gonder/")) return dashboardLayout(role, offerForm(sellerPath.split("/").pop()), path);
  if (sellerPath.includes("/tekliflerim")) return dashboardLayout(role, sellerOffers(), path);
  if (sellerPath.includes("/mesajlar/")) return dashboardLayout(role, messagesPage(sellerPath.split("/").pop(), role), path);
  if (sellerPath.includes("/mesajlar")) return dashboardLayout(role, messagesPage(null, role), path);
  if (sellerPath.includes("/eslesmeler")) return dashboardLayout(role, matchesPage(role), path);
  if (sellerPath.includes("/dogrulama")) return dashboardLayout(role, sellerVerification(), path);
  if (sellerPath.includes("/paketler")) return dashboardLayout(role, sellerPackages(), path);
  return dashboardLayout(role, sellerOverview(), path);
}

function sellerOverview() {
  const user = currentUser();
  const properties = state.properties.filter((p) => p.sellerId === user.id);
  const offers = state.offers.filter((o) => o.sellerId === user.id);
  const matches = state.matches.filter((m) => m.sellerId === user.id);
  return `
    ${pageHead("Satıcı Genel Bakış", "Evlerin, uygun alıcı talepleri ve teklif performansın burada.")}
    <div class="stat-grid">
      ${stat("Aktif ev", properties.length)}
      ${stat("Uygun talep", state.demands.filter((d) => properties.some((p) => p.city === d.city)).length)}
      ${stat("Gönderilen teklif", offers.length)}
      ${stat("Olumlu yanıt", offers.filter((o) => o.status === "INTERESTED" || o.status === "MATCHED").length)}
    </div>
    <div class="grid grid-2">
      <section class="panel"><h3>Alıcı talep havuzu</h3><p class="muted" style="margin:8px 0 12px">Kimlik bilgisi görünmez; rozet, bütçe aralığı ve ihtiyaç görünür.</p><a class="btn btn-primary" href="#/dashboard/satici/talepler">Talepleri gör</a></section>
      <section class="panel"><h3>Portföy</h3><p class="muted" style="margin:8px 0 12px">Evlerini ekleyip talebe özel teklif gönderebilirsin.</p><a class="btn btn-secondary" href="#/dashboard/satici/ev-ekle">Yeni ev ekle</a></section>
    </div>
  `;
}

function sellerProperties() {
  const user = currentUser();
  const properties = state.properties.filter((property) => property.sellerId === user.id).sort((a, b) => Number(isBoosted(b)) - Number(isBoosted(a)));
  return `
    ${pageHead("Evlerim", "Portföyündeki evleri ve uygun alıcı sayılarını takip et.", `<a class="btn btn-primary" href="#/dashboard/satici/ev-ekle">${icon("send", 16)} Yeni ev ekle</a>`)}
    <div class="list">${properties.map(propertyRow).join("") || empty("Henüz ev eklemedin", "Evini ekleyerek uygun alıcı taleplerini görebilirsin.")}</div>
  `;
}

function propertyForm() {
  const rent = uiTxMode === "RENT";
  return `
    ${pageHead(rent ? "Yeni Kiralık İlan" : "Yeni Ev Ekle", "İlanını portföye ekle; tam adres karşı tarafa gösterilmez.")}
    <form class="panel" onsubmit="KT.createProperty(event)">
      <div class="form-grid">
        <div class="field full"><label for="p-txtype">İşlem tipi</label><select id="p-txtype" onchange="KT.setTxMode(this.value)"><option ${!rent ? "selected" : ""}>Satılık</option><option ${rent ? "selected" : ""}>Kiralık</option></select><span class="helper">${rent ? "Kiraya vereceğin ilan (Kirala)." : "Satılık ilan (Sat)."}</span></div>
        <div class="field"><label for="p-maincat">Ana kategori</label><select id="p-maincat" onchange="KT.onCategory('p')">${MAIN_CATEGORIES.map((c, i) => `<option ${i === 0 ? "selected" : ""}>${escapeHtml(c)}</option>`).join("")}</select></div>
        <div class="field"><label for="p-type">Alt tip</label><select id="p-type">${CATEGORY_TREE[CAT_KONUT].map((s, i) => `<option ${i === 0 ? "selected" : ""}>${escapeHtml(s)}</option>`).join("")}</select></div>
        ${field("Başlık", "p-title", "text", rent ? "Kadıköy'de eşyalı kiralık 2+1" : "Kadıköy'de yenilenmiş 3+1")}
        ${locationFields("p", false)}
        ${field("Oda sayısı", "p-rooms", "select", "", ["1+1", "2+1", "3+1", "4+1", "5+1"], CAT_KONUT)}
        ${field("Brüt m2", "p-gross", "number", rent ? "95" : "130")}
        ${field("Net m2", "p-net", "number", rent ? "80" : "115")}
        ${field("Bina yaşı", "p-age", "select", "", ["0-5", "6-10", "11-15", "16-20", "20+"], CAT_KONUT + "|" + CAT_ISYERI)}
        ${field("Kat", "p-floor", "text", "4/8", [], CAT_KONUT + "|" + CAT_ISYERI)}
        ${field("Banyo sayısı", "p-bathroom", "select", "", ["1", "2", "3", "4+"], CAT_KONUT)}
        ${field("Isıtma tipi", "p-heating", "select", "", ["Kombi (Doğalgaz)", "Merkezi", "Yerden Isıtma", "Klima", "Soba", "Yok"], CAT_KONUT + "|" + CAT_ISYERI)}
        ${field("Kullanım durumu", "p-occupancy", "select", "", ["Boş", "Kiracılı", "Sahibi kullanıyor"], CAT_KONUT + "|" + CAT_ISYERI)}
        ${field("Aidat", "p-dues", "number", "950", [], CAT_KONUT + "|" + CAT_ISYERI)}
        ${field(rent ? "Aylık kira" : "Fiyat beklentisi", "p-price", "number", rent ? "32000" : "6500000")}
        ${rent ? field("Depozito", "p-deposit", "number", "32000") : ""}
        <div class="field full" data-cats="${CAT_KONUT}"><label>Evde <strong>bulunan iç özellikler</strong> <span class="muted">(birden çok seçebilirsin)</span></label><div class="check-grid">${IC_OZELLIKLER.map((f) => `<label class="check"><input class="p-ic" type="checkbox" value="${escapeHtml(f)}"> ${escapeHtml(f)}</label>`).join("")}</div></div>
        <div class="field full" data-cats="${CAT_KONUT}"><label>Evde/sitede <strong>bulunan dış özellikler</strong></label><div class="check-grid">${DIS_OZELLIKLER.map((f) => `<label class="check"><input class="p-dis" type="checkbox" value="${escapeHtml(f)}"> ${escapeHtml(f)}</label>`).join("")}</div></div>
        <div class="field full" data-cats="${CAT_ISYERI}" style="display:none"><label>İş yerinde <strong>bulunan özellikler</strong> <span class="muted">(birden çok seçebilirsin)</span></label><div class="check-grid">${ISYERI_OZELLIKLER.map((f) => `<label class="check"><input class="p-isyeri" type="checkbox" value="${escapeHtml(f)}"> ${escapeHtml(f)}</label>`).join("")}</div></div>
        <div class="field full" data-cats="${CAT_ARSA}" style="display:none"><label>Arsa <strong>özellikleri</strong> <span class="muted">(birden çok seçebilirsin)</span></label><div class="check-grid">${ARSA_OZELLIKLER.map((f) => `<label class="check"><input class="p-arsa" type="checkbox" value="${escapeHtml(f)}"> ${escapeHtml(f)}</label>`).join("")}</div></div>
        <div class="field full">
          <label>Diğer</label>
          <div class="check-grid">
            ${rent
              ? `<label class="check"><input id="p-furnished" type="checkbox"> Eşyalı</label>`
              : `<label class="check"><input id="p-credit" type="checkbox" checked> Krediye uygun</label>`}
            <label class="check"><input id="p-negotiable" type="checkbox" checked> Pazarlığa açık</label>
          </div>
        </div>
        <div class="field full"><p class="muted" style="margin:6px 0 0;font-size:13px">${icon("shield", 13)} İletişim bilgin (telefon/e-posta) herkese kapalıdır; yalnızca eşleştiğin ve üyelik satın alan tarafa açılır. Tam adres hiçbir zaman gösterilmez.</p></div>
        <div class="field full"><label>Açıklama</label><textarea id="p-desc" placeholder="Evin güçlü yönlerini ve tapu/kullanım durumunu yaz."></textarea></div>
        <div class="field full">
          <label>İlan görseli (opsiyonel)</label>
          <input id="p-image" type="file" accept="image/*" class="file-input" onchange="KT.previewImage(event,'p-image-preview')">
          <img id="p-image-preview" class="img-preview" alt="" style="display:none">
          <span class="helper">Evin fotoğrafını ekleyerek ilanını öne çıkarabilirsin.</span>
        </div>
      </div>
      <div id="p-error" class="error"></div>
      <div class="form-actions"><button class="btn btn-primary" type="submit">${icon("check", 16)} ${rent ? "İlanı ekle" : "Evi ekle"}</button><a class="btn btn-outline" href="#/dashboard/satici/evlerim">Vazgeç</a></div>
    </form>
  `;
}

function sellerDemands() {
  const user = currentUser();
  const properties = state.properties.filter((p) => p.sellerId === user.id);
  const rows = state.demands
    .map((demand) => ({
      demand,
      best: properties.map((property) => calculateMatchScore(demand, property).score).sort((a, b) => b - a)[0] || 0
    }))
    // Once öne çıkarılanlar, sonra en yüksek konum/bütçe uyum puanı üstte.
    .sort((a, b) => (Number(isBoosted(b.demand)) - Number(isBoosted(a.demand))) || (b.best - a.best))
    .map(({ demand, best }) => demandRow(demand, true, best))
    .join("");
  return `
    ${pageHead("Alıcı Talepleri", "Hazır alıcıları rozet, bütçe ve konuma göre incele.")}
    <div class="toolbar">
      <select><option>Tüm şehirler</option><option>İstanbul</option><option>Ankara</option><option>İzmir</option></select>
      <select><option>Tüm rozetler</option><option>Premium doğrulanmış</option><option>Kredi ön onaylı</option><option>Bütçe beyanlı</option></select>
      <span class="pill">${state.demands.length} aktif talep</span>
    </div>
    <div class="list">${rows || empty("Uygun talep yok", "Filtreleri genişletmeyi deneyebilirsin.")}</div>
  `;
}

function offerForm(demandId) {
  const demand = demandById(demandId);
  const user = currentUser();
  const properties = state.properties.filter((p) => p.sellerId === user.id);
  if (!demand) return empty("Talep bulunamadı", "Bu talep yayından kaldırılmış olabilir.");
  return `
    ${pageHead("Teklif Gönder", "Seçili alıcı talebine talebe özel teklif kartı hazırla.")}
    <section class="panel">
      <h3>Hedef talep</h3>
      <div style="margin-top:12px">${demandCard(demand, { sample: true })}</div>
    </section>
    <form class="panel" onsubmit="KT.createOffer(event,'${demand.id}')">
      <div class="form-grid">
        <div class="field full"><label>Teklif edilecek ev</label><select id="o-property">${properties.map((p) => `<option value="${p.id}">${escapeHtml(p.title)} - ${money(p.price)}</option>`).join("")}</select></div>
        ${field("Teklif fiyatı", "o-price", "number", properties[0] ? properties[0].price : 0)}
        <div class="field full"><label>Teklif notu</label><textarea id="o-message" placeholder="Bu evi neden bu talebe uygun gördüğünü yaz."></textarea></div>
      </div>
      <div id="o-error" class="error"></div>
      <div class="form-actions"><button class="btn btn-primary" type="submit">${icon("send", 16)} Teklif kartını gönder</button><a class="btn btn-outline" href="#/dashboard/satici/talepler">Vazgeç</a></div>
    </form>
  `;
}

function sellerOffers() {
  const user = currentUser();
  const offers = state.offers.filter((offer) => offer.sellerId === user.id);
  return `
    ${pageHead("Tekliflerim", "Gönderilen tekliflerin durumunu ve alıcı yanıtlarını takip et.")}
    <div class="list">${offers.map((offer) => offerRow(offer, "seller")).join("") || empty("Henüz teklif göndermedin", "Alıcı talepleri ekranından ilk teklifini gönderebilirsin.")}</div>
  `;
}

function sellerVerification() {
  const user = currentUser();
  const docs = state.verificationDocuments.filter((doc) => doc.userId === user.id);
  return `
    ${pageHead("Satıcı Doğrulama", "Tapu, yetki ve kurumsal belgelerin denetim durumunu takip et.")}
    <section class="panel">
      <div class="grid grid-3">
        ${featureCard("file", "Tapu / yetki belgesi", "Satış yetkisini netleştirir.")}
        ${featureCard("shield", "Telefon ve e-posta", "Temel iletişim doğrulaması.")}
        ${featureCard("card", "Kurumsal belgeler", "Emlak ofisi ve vergi levhası alanı.")}
      </div>
      <div class="section-actions"><button class="btn btn-primary" onclick="KT.addSellerDoc()">Mock belge gönder</button></div>
    </section>
    <section class="panel"><h3>Belgelerim</h3><div class="list" style="margin-top:12px">${docs.map(documentRow).join("") || empty("Belge yok", "Belge göndererek satıcı güven skorunu yükseltebilirsin.")}</div></section>
  `;
}

function sellerPackages() {
  const roleTypes = state.currentRole === "agent" ? ["SELLER", "AGENT"] : ["SELLER"];
  return `${pageHead("Paketlerim", "İlanı üste taşıma reklamı ve alıcı bilgilerini görme üyeliği.")}${pricingCards(roleTypes)}`;
}

function renderAdmin(path) {
  let content = adminOverview();
  if (path.includes("/kullanicilar")) content = adminUsers();
  if (path.includes("/uyelikler")) content = adminMemberships();
  if (path.includes("/talepler")) content = adminDemands();
  if (path.includes("/ilanlar")) content = adminProperties();
  if (path.includes("/teklifler")) content = adminTable("Teklifler", state.offers, ["id", "demandId", "propertyId", "price", "status", "matchScore"]);
  if (path.includes("/epostalar")) content = adminEmails();
  if (path.includes("/belgeler")) content = adminDocuments();
  if (path.includes("/sikayetler")) content = adminTable("Şikayetler", state.complaints, ["reason", "description", "status", "priority", "createdAt"]);
  if (path.includes("/risk")) content = adminTable("Risk Paneli", state.abuseSignals, ["userId", "type", "score", "metadata", "createdAt"]);
  if (path.includes("/odemeler")) content = adminTable("Ödemeler", state.payments, ["userId", "planId", "provider", "amount", "currency", "status"]);
  if (path.includes("/audit")) content = adminTable("Audit Logs", state.auditLogs, ["actorId", "action", "entityType", "entityId", "metadata", "createdAt"]);
  return dashboardLayout("admin", content, path);
}

function adminOverview() {
  const activeDemands = state.demands.filter((d) => d.status === "ACTIVE").length;
  const activeProperties = state.properties.filter((p) => p.status === "ACTIVE").length;
  const revenue = state.payments.reduce((total, payment) => payment.status === "SUCCESS" ? total + Number(payment.amount || 0) : total, 0);
  return `
    ${pageHead("Admin Dashboard", "Platform sağlığı, güvenlik ve ticari metrikler.")}
    <div class="stat-grid">
      ${stat("Üyelik hesabı", state.authAccounts.length)}
      ${stat("Aktif talep", activeDemands)}
      ${stat("Aktif ev", activeProperties)}
      ${stat("Mock ciro", money(revenue))}
    </div>
    <div class="grid grid-2">
      <section class="panel"><h3>Bekleyen satıcı belgeleri</h3><div class="list" style="margin-top:12px">${state.verificationDocuments.filter((doc) => doc.status === "PENDING").map(documentRow).join("") || empty("Bekleyen belge yok", "Yeni satıcı belgesi gelirse burada görünür.")}</div></section>
      <section class="panel"><h3>Son e-postalar</h3><div class="list" style="margin-top:12px">${state.emailOutbox.slice(0, 3).map(emailRow).join("") || empty("E-posta yok", "Uygun talep veya ev girildiğinde e-postalar burada görünür.")}</div></section>
    </div>
  `;
}

function adminEmails() {
  return `
    ${pageHead("E-posta Outbox", "Uygun alıcı talebi veya satıcı ilanı girildiğinde hazırlanan anlık e-postalar.")}
    <div class="notice" style="margin-bottom:14px"><strong>E-posta bildirimleri:</strong> Kullanıcılara giden bildirimler burada kayıt altında tutulur.</div>
    <div class="list">${state.emailOutbox.map(emailRow).join("") || empty("Henüz e-posta yok", "Yeni talep veya ev eklendiğinde uygun kullanıcılara e-posta kaydı oluşur.")}</div>
  `;
}

function adminDocuments() {
  return `
    ${pageHead("Satıcı Belgeleri", "Tapu, yetki ve kurumsal satıcı belgeleri sadece yetkili admin/reviewer tarafından incelenir.")}
    <div class="list">${state.verificationDocuments.map((doc) => documentRow(doc, true)).join("")}</div>
  `;
}

function adminTable(title, rows, cols) {
  return `
    ${pageHead(title, "Kayıtları arayabilir, filtreleyebilir ve yönetebilirsin.")}
    <div class="table-wrap">
      <table>
        <thead><tr>${cols.map((col) => `<th>${escapeHtml(col)}</th>`).join("")}<th>Aksiyon</th></tr></thead>
        <tbody>
          ${rows.map((row) => `<tr>${cols.map((col) => `<td>${formatCell(row[col], col)}</td>`).join("")}<td><button class="btn btn-small btn-outline" onclick="KT.adminMockAction()">İncele</button></td></tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function formatCell(value, col) {
  if (col === "price" || col === "amount") return money(value);
  if (value == null) return "-";
  return escapeHtml(value);
}

// ---------- Admin: üyelik tipi + aktif üyelik yardımcıları ----------
const PLAN_TYPE = {
  "plan-buyer-free": "Alıcı", "plan-buyer-boost": "Alıcı", "plan-buyer-contact": "Alıcı",
  "plan-tenant-free": "Kiracı",
  "plan-landlord-contact": "Ev sahibi", "plan-landlord-boost": "Ev sahibi",
  "plan-seller-boost": "Satıcı", "plan-seller-contact": "Satıcı",
  "plan-pro": "Emlak danışmanı"
};
function userTip(u) {
  if (!u) return "";
  if (u.role === "ADMIN") return "Yönetici";
  if (u.role === "AGENT") return "Emlak danışmanı";
  if (u.role === "BUYER") {
    const ds = (state.demands || []).filter((d) => d.buyerId === u.id);
    const r = ds.some((d) => (d.transactionType || "SALE") === "RENT");
    const s = ds.some((d) => (d.transactionType || "SALE") === "SALE");
    return r && s ? "Alıcı + Kiracı" : r ? "Kiracı" : s ? "Alıcı" : "Alıcı / Kiracı";
  }
  if (u.role === "SELLER") {
    const ps = (state.properties || []).filter((p) => p.sellerId === u.id);
    const r = ps.some((p) => (p.transactionType || "SALE") === "RENT");
    const s = ps.some((p) => (p.transactionType || "SALE") === "SALE");
    return r && s ? "Satıcı + Ev sahibi" : r ? "Ev sahibi" : s ? "Satıcı" : "Satıcı / Ev sahibi";
  }
  return u.role || "";
}
function activeMembership(userId) {
  const ents = (state.entitlements || []).filter((e) => e.userId === userId);
  if (!ents.length) return null;
  const e = ents.slice().sort((a, b) => String(b.activeFrom || "").localeCompare(String(a.activeFrom || "")))[0];
  const plan = (state.plans || []).find((p) => p.id === e.planId);
  return { planId: e.planId, name: plan ? plan.name : e.planId, activeFrom: e.activeFrom, activeTo: e.activeTo };
}

function adminUsers() {
  const cities = [...new Set((state.users || []).map((u) => u.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr"));
  return `
    ${pageHead("Kullanıcılar", "Tüm üyeler. Ad/e-posta/telefon ile ara; tip ve şehre göre filtrele.")}
    <div class="toolbar">
      <input id="au-q" placeholder="Ara: ad, e-posta, telefon" oninput="KT.renderAdminUsers()" style="flex:1;min-width:200px">
      <select id="au-tip" onchange="KT.renderAdminUsers()"><option value="">Tüm tipler</option><option>Alıcı</option><option>Kiracı</option><option>Satıcı</option><option>Ev sahibi</option><option>Emlak danışmanı</option><option>Yönetici</option></select>
      <select id="au-city" onchange="KT.renderAdminUsers()"><option value="">Tüm şehirler</option>${cities.map((c) => `<option>${escapeHtml(c)}</option>`).join("")}</select>
    </div>
    <div id="admin-users-box">${adminUsersTable(state.users || [])}</div>
  `;
}
function adminUsersTable(list) {
  const rows = list.map((u) => {
    const m = activeMembership(u.id);
    return `<tr>
      <td>${escapeHtml(u.name || "")}</td>
      <td>${escapeHtml(u.phone || "—")}</td>
      <td>${escapeHtml(u.email || "—")}</td>
      <td>${escapeHtml(u.city || "—")}</td>
      <td><span class="badge badge-blue">${escapeHtml(userTip(u))}</span></td>
      <td>${m ? `<span class="badge badge-gold">${escapeHtml(m.name)}</span>` : `<span class="muted">Ücretsiz</span>`}</td>
      <td>${escapeHtml(u.createdAt || "")}</td>
    </tr>`;
  }).join("");
  return `<p class="muted" style="margin:0 0 8px">${list.length} üye</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Ad</th><th>Telefon</th><th>E-posta</th><th>Şehir</th><th>Tip</th><th>Aktif Üyelik</th><th>Kayıt</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="7" class="muted">Kayıt yok</td></tr>`}</tbody>
    </table></div>`;
}

function adminMemberships() {
  return `
    ${pageHead("Üyelikler", "Aktif üyelikler: üye, üyelik tipi, paket ve tarih. Ara/filtrele.")}
    <div class="toolbar">
      <input id="am-q" placeholder="Ara: ad, telefon, şehir" oninput="KT.renderAdminMemberships()" style="flex:1;min-width:200px">
      <select id="am-tip" onchange="KT.renderAdminMemberships()"><option value="">Tüm tipler</option><option>Alıcı</option><option>Kiracı</option><option>Satıcı</option><option>Ev sahibi</option><option>Emlak danışmanı</option></select>
    </div>
    <div id="admin-memb-box">${adminMembTable(state.entitlements || [])}</div>
  `;
}
function adminMembTable(ents) {
  const rows = ents.map((e) => {
    const u = (state.users || []).find((x) => x.id === e.userId) || {};
    const plan = (state.plans || []).find((p) => p.id === e.planId);
    const tip = PLAN_TYPE[e.planId] || userTip(u) || "—";
    return { u, e, plan, tip };
  }).sort((a, b) => String(b.e.activeFrom || "").localeCompare(String(a.e.activeFrom || "")));
  const body = rows.map(({ u, e, plan, tip }) => `<tr>
      <td>${escapeHtml(u.name || e.userId)}</td>
      <td>${escapeHtml(u.phone || "—")}</td>
      <td>${escapeHtml(u.city || "—")}</td>
      <td><span class="badge badge-blue">${escapeHtml(tip)}</span></td>
      <td>${escapeHtml(plan ? plan.name : e.planId)}</td>
      <td>${escapeHtml(e.activeFrom || "")}</td>
      <td>${escapeHtml(e.activeTo || "süresiz")}</td>
    </tr>`).join("");
  return `<p class="muted" style="margin:0 0 8px">${rows.length} üyelik</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Üye</th><th>Telefon</th><th>Şehir</th><th>Üyelik tipi</th><th>Paket</th><th>Başlangıç</th><th>Bitiş</th></tr></thead>
      <tbody>${body || `<tr><td colspan="7" class="muted">Henüz üyelik yok</td></tr>`}</tbody>
    </table></div>`;
}

function adminProperties() {
  return `
    ${pageHead("Satıcı İlanları", "Bir ilanın 'Oku' butonuna basıp tüm içeriğini (açıklama dahil) görebilirsin.")}
    <div class="table-wrap"><table>
      <thead><tr><th>Başlık</th><th>Kategori</th><th>Şehir / İlçe</th><th>Fiyat</th><th>İşlem</th><th>Durum</th><th></th></tr></thead>
      <tbody>${(state.properties || []).map((p) => `<tr>
        <td>${escapeHtml(p.title || "")}</td>
        <td>${escapeHtml([p.mainCategory, p.propertyType].filter(Boolean).join(" · "))}</td>
        <td>${escapeHtml([p.city, p.district].filter(Boolean).join(" / "))}</td>
        <td>${money(p.price)}</td>
        <td>${p.transactionType === "RENT" ? "Kiralık" : "Satılık"}</td>
        <td><span class="badge ${p.status === "ACTIVE" ? "badge-green" : "badge-neutral"}">${escapeHtml(p.status || "")}</span></td>
        <td><button class="btn btn-small btn-primary" onclick="KT.adminItemDetail('property','${escapeAttr(p.id)}')">Oku</button></td>
      </tr>`).join("") || `<tr><td colspan="7" class="muted">İlan yok</td></tr>`}</tbody>
    </table></div>
  `;
}
function adminDemands() {
  return `
    ${pageHead("Alıcı Talepleri", "Bir talebin 'Oku' butonuna basıp tüm içeriğini (açıklama dahil) görebilirsin.")}
    <div class="table-wrap"><table>
      <thead><tr><th>Başlık</th><th>Kategori</th><th>Şehir / İlçe</th><th>Bütçe / Kira</th><th>İşlem</th><th>Durum</th><th></th></tr></thead>
      <tbody>${(state.demands || []).map((d) => `<tr>
        <td>${escapeHtml(d.title || "")}</td>
        <td>${escapeHtml([d.mainCategory, d.propertyType].filter(Boolean).join(" · "))}</td>
        <td>${escapeHtml([d.city, d.district].filter(Boolean).join(" / "))}</td>
        <td>${money(d.minBudget)} - ${money(d.maxBudget)}</td>
        <td>${d.transactionType === "RENT" ? "Kiralık" : "Satılık"}</td>
        <td><span class="badge ${d.status === "ACTIVE" ? "badge-green" : "badge-neutral"}">${escapeHtml(d.status || "")}</span></td>
        <td><button class="btn btn-small btn-primary" onclick="KT.adminItemDetail('demand','${escapeAttr(d.id)}')">Oku</button></td>
      </tr>`).join("") || `<tr><td colspan="7" class="muted">Talep yok</td></tr>`}</tbody>
    </table></div>
  `;
}

function messagesPage(matchId, roleName) {
  // Platform içi mesajlaşma kaldırıldı. Eşleşmeler + üyelikle iletişim ekranına yönlendirilir.
  return matchesPage(roleName);
}

function contactUnlockPanel(match, roleName) {
  const membershipRole = roleName === "buyer" ? "buyer" : "seller";
  const other = roleName === "buyer" ? userById(match.sellerId) : userById(match.buyerId);
  const otherLabel = roleName === "buyer" ? "İlan sahibi" : "Talep sahibi";
  const otherPossessive = roleName === "buyer" ? "İlan sahibinin" : "Talep sahibinin";
  // Sunucu, aktif üyelik yoksa telefon/e-postayı boş döndürür.
  const revealed = other && (other.phone || other.email);
  if (revealed) {
    return `
      <div class="contact-card">
        <strong>İletişim bilgisi açık.</strong>
        <div style="margin-top:10px">${otherLabel}: ${escapeHtml(other.name)} · ${escapeHtml(other.phone || "-")} · ${escapeHtml(other.email || "-")}</div>
        <p class="muted" style="margin:10px 0 0">Fiyat, pazarlık ve sözleşmeyi doğrudan kendi aranızda yürütün. Kapora ve tapu işlemlerini yalnızca resmi kanallar üzerinden yapın.</p>
      </div>
    `;
  }
  const contactPlanId = contactPlanForRole(membershipRole);
  const contactPlan = planById(contactPlanId);
  return `
    <div class="unlock-panel">
      <p class="muted">${otherPossessive} telefon ve e-postasını görmek için <strong>${escapeHtml(contactPlan?.name || "bilgileri görme üyeliği")}</strong> gerekir. Üyeliğinle bilgiyi görür, doğrudan iletişime geçersin.</p>
      <button class="btn btn-primary" onclick="KT.mockUpgrade('${contactPlanId}', true)">${icon("card", 16)} ${escapeHtml(contactPlan?.name || "Bilgileri Gör Üyeliği")} al</button>
    </div>
  `;
}

function bubble(msg, userId) {
  if (msg.senderId === "system") return `<div class="bubble system">${escapeHtml(msg.maskedBody)}</div>`;
  return `<div class="bubble ${msg.senderId === userId ? "me" : ""}">${escapeHtml(msg.maskedBody)}${msg.containsSensitiveInfo ? `<br><span style="font-size:11px;opacity:.8">Hassas bilgi maskelendi</span>` : ""}</div>`;
}

function matchesPage(roleName) {
  const user = currentUser();
  const matches = state.matches.filter((match) => roleName === "buyer" ? match.buyerId === user.id : match.sellerId === user.id);
  return `
    ${pageHead("Eşleşmeler", "Teklifin karşılık bulduğu eşleşmeler. İletişim bilgisini üyelikle aç, doğrudan anlaş.")}
    <div class="list">${matches.map((match) => {
      const offer = offerById(match.offerId);
      const property = propertyById(offer.propertyId);
      const other = roleName === "buyer" ? userById(match.sellerId) : userById(match.buyerId);
      const open = other && (other.phone || other.email);
      return `<article class="row-card" style="flex-direction:column;align-items:stretch;gap:12px">
        <div style="display:flex;gap:12px;align-items:center">
          <div class="thumb">${icon(open ? "key" : "lock", 24)}</div>
          <div style="flex:1"><div class="row-title">${escapeHtml(property.title)}</div><div class="row-meta">${money(offer.price)} · ${escapeHtml(property.city || "")} ${escapeHtml(property.district || "")}</div></div>
          <span class="badge ${open ? "badge-green" : "badge-yellow"}">${open ? "İletişim açık" : "Üyelikle açılır"}</span>
        </div>
        ${contactUnlockPanel(match, roleName)}
      </article>`;
    }).join("") || empty("Henüz eşleşme yok", "Bir teklif olumlu yanıtlandığında eşleşme burada başlar.")}</div>
  `;
}

function budgetDeclarationPage(userId) {
  const profile = buyerProfile(userId);
  const userDemands = state.demands.filter((demand) => demand.buyerId === userId);
  const primary = userDemands[0] || {};
  const min = profile.declaredBudgetMin || primary.minBudget || 0;
  const max = profile.declaredBudgetMax || primary.maxBudget || 0;
  const down = profile.declaredDownPayment || primary.downPayment || 0;
  return `
    ${pageHead("Bütçe Beyanı", "Belge yüklemeden bütçe aralığını, peşinatını ve alım zamanını beyan et.")}
    <section class="panel">
      <div class="grid grid-2">
        <div>
          <span class="badge ${badgeForProfile(profile)}">${icon("card", 13)} ${escapeHtml(profile.verificationLevel)}</span>
          <h3 style="margin-top:12px">Beyan görünürlüğü: ${profile.budgetTrustScore}/100</h3>
          <p class="muted">Bu alanda belge yükleme yoktur. Satıcılar yalnızca bütçe aralığını, peşinat/nakit-kredi tercihini ve talep özetini görür.</p>
          <div class="budget-meter"><span style="width:${Math.min(100, profile.budgetTrustScore || 40)}%"></span></div>
        </div>
        <div class="budget-summary-card">
          <strong>${shortMoney(min)} - ${shortMoney(max)}</strong>
          <span>Beyan edilen bütçe aralığı</span>
          <div class="pill-row" style="margin-top:12px">
            <span class="pill">Peşinat: ${shortMoney(down)}</span>
            <span class="pill">${profile.declaredCashReady ? "Nakit hazır" : "Kredi kullanabilir"}</span>
          </div>
        </div>
      </div>
    </section>
    <section class="panel">
      <h3>Beyanını güncelle</h3>
      <p class="muted" style="margin:6px 0 16px">Bu bilgiler satıcılara yaklaşık bütçe niyeti olarak gösterilir; belge veya dosya istenmez.</p>
      <div class="form-grid">
        ${field("Minimum bütçe", "bd-min", "number", min || 3000000)}
        ${field("Maksimum bütçe", "bd-max", "number", max || 5000000)}
        ${field("Peşinat / hazır tutar", "bd-down", "number", down || 1000000)}
        ${field("Alım zamanı", "bd-timeline", "select", "", ["Hemen", "1 ay içinde", "3 ay içinde", "6 ay içinde", "Fırsat olursa"])}
        <div class="field full">
          <label>Finansman tercihi</label>
          <div class="check-grid">
            <label class="check"><input id="bd-credit" type="checkbox" ${profile.declaredUsesCredit ? "checked" : ""}> Kredi kullanabilirim</label>
            <label class="check"><input id="bd-cash" type="checkbox" ${profile.declaredCashReady ? "checked" : ""}> Nakit / hazır tutarım var</label>
          </div>
        </div>
      </div>
      <div id="bd-error" class="error"></div>
      <div class="form-actions"><button class="btn btn-primary" onclick="KT.saveBudgetDeclaration()">${icon("check", 16)} Bütçe beyanımı kaydet</button></div>
    </section>
    <section class="panel">
      <h3>Satıcıya nasıl görünür?</h3>
      <div class="list" style="margin-top:12px">${userDemands.slice(0, 2).map((demand) => demandCard(demand, { sample: true })).join("") || empty("Henüz talep yok", "Talep oluşturduğunda bütçe beyanın bu kartla birlikte görünür.")}</div>
    </section>
  `;
}

function notificationsPage(userId) {
  const rows = state.notifications.filter((notification) => notification.userId === userId);
  return `${pageHead("Bildirimler", "Teklif, eşleşme ve bütçe beyanı güncellemeleri.")}<div class="list">${rows.map((n) => `<article class="notice"><strong>${escapeHtml(n.title)}</strong><br>${escapeHtml(n.body)}<br><span class="muted">${n.createdAt}</span></article>`).join("") || empty("Bildirim yok", "Yeni gelişmeler burada görünür.")}</div>`;
}

function settingsPage(user) {
  const account = (state.authAccounts || []).find((item) => item.userId === user.id);
  return `
    ${pageHead("Profil ve Ayarlar", "Üyelik bilgileri ve gizlilik tercihleri.")}
    <section class="panel">
      <div class="sample-top" style="margin-bottom:14px">
        <span class="badge badge-blue">${roleLabel(user.role)}</span>
        <span class="pill">${account?.emailVerified ? "E-posta doğrulanmış" : "E-posta doğrulama bekliyor"}</span>
      </div>
      <div class="form-grid">
        <div class="field"><label for="s-name">Ad soyad / firma adı</label><input id="s-name" type="text" value="${escapeHtml(user.name)}" /></div>
        <div class="field"><label for="s-email">E-posta</label><input id="s-email" type="email" value="${escapeHtml(user.email)}" /></div>
        <div class="field"><label for="s-phone">Telefon</label><input id="s-phone" type="tel" value="${escapeHtml(user.phone)}" /></div>
        <div class="field"><label for="s-city">Şehir</label><input id="s-city" type="text" value="${escapeHtml(user.city)}" /></div>
        <div class="field full"><label>Gizlilik</label><div class="check-grid"><label class="check"><input type="checkbox" checked> Telefon iki onay olmadan görünmesin</label><label class="check"><input type="checkbox" checked> Bütçe aralığım yaklaşık gösterilsin</label></div></div>
      </div>
      <div id="s-error" class="error"></div>
      <div class="form-actions"><button class="btn btn-primary" onclick="KT.saveProfileSettings()">${icon("check", 16)} Kaydet</button></div>
    </section>
  `;
}

function pageHead(title, subtitle, action = "") {
  return `<div class="page-head"><div><h1>${title}</h1><p>${subtitle}</p></div>${action ? `<div>${action}</div>` : ""}</div>`;
}

function stat(label, value) {
  return `<div class="stat"><span>${label}</span><b>${value}</b></div>`;
}

// Kademeli konum alanlari (İl→İlçe→Mahalle). multiMahalle=true → talepte çoklu seçim.
function searchPage() {
  searchState.tx = uiTxMode === "RENT" ? "RENT" : "SALE";
  const ilOpts = `<option value="">Tüm iller</option>` + TR_ILLER.map((il) => `<option value="${escapeHtml(il.code)}" ${searchState.city === il.code ? "selected" : ""}>${escapeHtml(il.name)}</option>`).join("");
  return `
    ${pageHead("İlan Ara", "Soldan kategoriye tıkla; yayındaki ilanları kutucuklar halinde gör. Kayıt şehrin fark etmez; her il/ilçe/mahalleyi arayabilirsin. İletişim bilgisi yalnızca üyelikle açılır.")}
    <div class="search-layout">
      <aside class="search-side" id="search-side">${renderSearchSidebar()}</aside>
      <div class="search-main">
        <div class="search-filterbar">
          <select id="s-city" onchange="KT.loadIlce('s')">${ilOpts}</select>
          <select id="s-district" onchange="KT.loadMahalle('s')"><option value="">Tüm ilçeler</option></select>
          <div id="s-mahalle" class="s-mah-wrap"><select id="s-neighborhood"><option value="">Tüm mahalleler</option></select></div>
          <input id="s-minprice" type="number" placeholder="Min ₺">
          <input id="s-maxprice" type="number" placeholder="Max ₺">
          <button type="button" class="btn btn-primary" onclick="KT.searchApplyFilters()">${icon("search", 15)} Uygula</button>
        </div>
        <div class="search-topbar">
          <div class="search-count" id="search-count">İlanlar yükleniyor…</div>
          <select class="search-sort" onchange="KT.searchSort(this.value)">
            <option value="new">En Yeniler</option>
            <option value="price-asc">Fiyat (artan)</option>
            <option value="price-desc">Fiyat (azalan)</option>
          </select>
        </div>
        <div id="search-results" class="card-grid"></div>
      </div>
    </div>
  `;
}

function renderSearchSidebar() {
  const s = searchState;
  const catIcon = (c) => c === CAT_ARSA ? "map" : c === CAT_ISYERI ? "card" : "home";
  const groups = MAIN_CATEGORIES.map((cat) => {
    const open = s.mainCategory === cat;
    const subs = open ? `<div class="sc-subs">${CATEGORY_TREE[cat].map((sub) => `<button type="button" class="sc-sub ${s.subCategory === sub ? "active" : ""}" onclick="KT.searchPick('${escapeAttr(cat)}','${escapeAttr(sub)}')">${escapeHtml(sub)}</button>`).join("")}</div>` : "";
    return `<div class="sc-group">
        <button type="button" class="sc-item ${open && !s.subCategory ? "active" : ""}" onclick="KT.searchPick('${escapeAttr(cat)}')"><span>${icon(catIcon(cat), 16)} ${escapeHtml(cat)}</span><span class="sc-caret">${open ? "▾" : "▸"}</span></button>
        ${subs}
      </div>`;
  }).join("");
  return `
    <div class="sc-tx">
      <button type="button" class="${s.tx === "SALE" ? "active" : ""}" onclick="KT.searchTx('SALE')">Satılık</button>
      <button type="button" class="${s.tx === "RENT" ? "active" : ""}" onclick="KT.searchTx('RENT')">Kiralık</button>
    </div>
    <div class="sc-head">Kategoriler</div>
    <button type="button" class="sc-item sc-root ${!s.mainCategory ? "active" : ""}" onclick="KT.searchPick('')">Tüm Emlak</button>
    ${groups}
  `;
}

function listingCard(p) {
  const rent = p.transactionType === "RENT";
  const loc = [p.city, p.district, p.neighborhood].filter(Boolean).join(", ") || "Konum belirtilmedi";
  const media = p.imageData
    ? `<img src="${p.imageData}" alt="" loading="lazy">`
    : `<div class="lc-ph ${escapeAttr(p.photoClass || "")}">${icon(p.mainCategory === CAT_ARSA ? "map" : p.mainCategory === CAT_ISYERI ? "card" : "home", 40)}</div>`;
  return `
    <article class="listing-card ${isBoosted(p) ? "promoted-card" : ""}" onclick="KT.searchDetail('${escapeAttr(p.id)}')">
      <div class="lc-media">
        ${media}
        <span class="lc-badge">${escapeHtml(p.propertyType || p.mainCategory || "")}</span>
        <span class="lc-tx ${rent ? "rent" : "sale"}">${rent ? "Kiralık" : "Satılık"}</span>
        ${isBoosted(p) ? `<span class="lc-boost">Üste taşındı</span>` : ""}
      </div>
      <div class="lc-body">
        <div class="lc-title">${escapeHtml(p.title)}</div>
        <div class="lc-loc">${icon("map", 13)} ${escapeHtml(loc)}</div>
        <div class="lc-price">${money(p.price)}${rent ? " / ay" : ""}</div>
        <div class="lc-foot"><span class="lc-lock">${icon("lock", 12)} İletişim gizli</span><span class="lc-date">${escapeHtml(p.createdAt || "")}</span></div>
      </div>
    </article>
  `;
}

function locationFields(prefix, multiMahalle) {
  const ilOpts = `<option value="">İl seçiniz</option>` + TR_ILLER.map((il) => `<option value="${escapeHtml(il.code)}">${escapeHtml(il.name)}</option>`).join("");
  const mahalle = multiMahalle
    ? `<div class="field full"><label>Mahalle(ler) <span class="muted">(ilçe seçince gelir, birden çok seçebilirsin)</span></label><div id="${prefix}-mahalle"><span class="muted">Önce ilçe seçin.</span></div></div>`
    : `<div class="field"><label>Mahalle</label><div id="${prefix}-mahalle"><select id="${prefix}-neighborhood"><option value="">Önce ilçe seçin</option></select></div></div>`;
  return `
    <div class="field"><label for="${prefix}-city">Şehir (İl) <span style="color:#c0392b">*</span></label><select id="${prefix}-city" onchange="KT.loadIlce('${prefix}')">${ilOpts}</select></div>
    <div class="field"><label for="${prefix}-district">İlçe</label><select id="${prefix}-district" onchange="KT.loadMahalle('${prefix}')"><option value="">Önce il seçin</option></select></div>
    ${mahalle}`;
}

function field(label, id, type, placeholder, options = [], cats = "") {
  const dc = cats ? ` data-cats="${escapeHtml(cats)}"` : "";
  if (type === "select") {
    return `<div class="field"${dc}><label for="${id}">${label}</label><select id="${id}">${options.map((option, index) => `<option ${index === 0 ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select></div>`;
  }
  return `<div class="field"${dc}><label for="${id}">${label}</label><input id="${id}" type="${type}" placeholder="${escapeHtml(placeholder)}" value="${type === "number" ? placeholder : ""}" /></div>`;
}

function empty(title, body) {
  return `<div class="empty"><b>${title}</b><span class="muted">${body}</span></div>`;
}

function parseFeatures(v) { try { return Array.isArray(v) ? v : JSON.parse(v || "[]"); } catch { return []; } }
function demandExtraPills(demand) {
  const skip = (x) => !x || x === "Farketmez" || x === "Belirtmek istemiyorum";
  const pills = [];
  if (demand.furnished) pills.push("Eşyalı");
  if (!skip(demand.heatingType)) pills.push(escapeHtml(demand.heatingType));
  if (!skip(demand.buildingAge)) pills.push("Bina " + escapeHtml(demand.buildingAge));
  if (!skip(demand.floorPref)) pills.push(escapeHtml(demand.floorPref));
  if (demand.depositAmount) pills.push("Depozito ~" + shortMoney(demand.depositAmount));
  if (!skip(demand.occupation)) pills.push("Meslek: " + escapeHtml(demand.occupation));
  const hoods = parseFeatures(demand.neighborhoods).map(escapeHtml);
  const feats = [...parseFeatures(demand.interiorFeatures), ...parseFeatures(demand.exteriorFeatures)].map(escapeHtml);
  const all = [...hoods, ...pills, ...feats];
  if (!all.length) return "";
  return `<div class="pill-row" style="margin-top:8px">${all.map((t) => `<span class="pill">${t}</span>`).join("")}</div>`;
}
function demandRow(demand, sellerView, score = null) {
  const profile = buyerProfile(demand.buyerId);
  return `
    <article class="row-card ${isBoosted(demand) ? "promoted-card" : ""}">
      <div class="thumb">${icon("key", 28)}</div>
      <div>
        <div class="row-title">${escapeHtml(demand.title)}</div>
        <div class="row-meta">${escapeHtml(demand.city)} / ${escapeHtml(demand.district)} · ${escapeHtml(demand.propertyType)} · ${escapeHtml(demand.roomCount)} · ${rangeText(demand)}</div>
        <div class="pill-row" style="margin-top:8px">${txPill(demand)}<span class="badge ${badgeForProfile(profile)}">${profile.verificationLevel}</span><span class="pill">${demand.purchaseTimeline}</span>${score !== null ? `<span class="pill">${score}/100 en iyi uyum</span>` : ""}${isBoosted(demand) ? `<span class="badge badge-coral">Üste taşındı</span>` : ""}</div>
        <p class="row-note">${escapeHtml(demand.description)}</p>
        ${demandExtraPills(demand)}
      </div>
      <div class="row-side">
        <span class="badge ${demand.status === "ACTIVE" ? "badge-green" : "badge-neutral"}">${statusLabel(demand.status)}</span>
        ${sellerView ? `<button class="btn btn-small btn-primary" onclick="KT.goSellerOffer('${demand.id}')">Bu alıcıya teklif ver</button>` : `<a class="btn btn-small btn-outline" href="#/dashboard/alici/teklifler">${demand.offerCount} teklifi gör</a><button class="btn btn-small btn-primary" onclick="KT.mockPromote('demand','${demand.id}')">Talebi üste taşı · yakında</button>`}
      </div>
    </article>
  `;
}

function propertyExtraPills(property) {
  const skip = (x) => !x || x === "Belirtilmedi" || x === "Yok";
  const pills = [];
  if (property.furnished) pills.push("Eşyalı");
  if (!skip(property.heatingType)) pills.push(escapeHtml(property.heatingType));
  if (property.bathroomCount) pills.push(property.bathroomCount + " banyo");
  if (property.dues) pills.push("Aidat ~" + shortMoney(property.dues));
  if (!skip(property.occupancyStatus)) pills.push(escapeHtml(property.occupancyStatus));
  const feats = [...parseFeatures(property.interiorFeatures), ...parseFeatures(property.exteriorFeatures)].map(escapeHtml);
  const all = [...pills, ...feats];
  if (!all.length) return "";
  return `<div class="pill-row" style="margin-top:8px">${all.map((t) => `<span class="pill">${t}</span>`).join("")}</div>`;
}
function propertyRow(property) {
  const matching = state.demands.filter((d) => d.city === property.city && d.propertyType === property.propertyType && (d.transactionType || "SALE") === (property.transactionType || "SALE")).length;
  return `
    <article class="row-card ${isBoosted(property) ? "promoted-card" : ""}">
      ${property.imageData ? `<div class="thumb"><img class="thumb-img" src="${property.imageData}" alt=""></div>` : `<div class="thumb photo ${property.photoClass || ""}"></div>`}
      <div>
        <div class="row-title">${escapeHtml(property.title)}</div>
        <div class="row-meta">${escapeHtml(property.city)} / ${escapeHtml(property.district)} · ${property.roomCount} · ${property.netSqm} m2 · ${priceText(property)}</div>
        <div class="pill-row" style="margin-top:8px">${txPill(property)}${isBoosted(property) ? `<span class="badge badge-coral">Üste taşındı</span>` : ""}</div>
        <p class="row-note">${escapeHtml(property.description)}</p>
        ${propertyExtraPills(property)}
      </div>
      <div class="row-side"><span class="badge badge-blue">${matching} uygun talep</span><button class="btn btn-small btn-primary" onclick="KT.goSellerDemands()">Uygun talepler</button><button class="btn btn-small btn-primary" onclick="KT.mockPromote('property','${property.id}')">İlanı üste taşı · yakında</button></div>
    </article>
  `;
}

function offerRow(offer, view) {
  const property = propertyById(offer.propertyId);
  const demand = demandById(offer.demandId);
  const statusClass = offer.status === "INTERESTED" || offer.status === "MATCHED" ? "badge-gold" : offer.status === "DECLINED" ? "badge-neutral" : "badge-blue";
  const target = view === "buyer" ? `dashboard/alici/teklifler/${offer.id}` : `dashboard/satici/eslesmeler`;
  return `
    <article class="row-card">
      ${property.imageData ? `<div class="thumb"><img class="thumb-img" src="${property.imageData}" alt=""></div>` : `<div class="thumb photo ${property.photoClass || ""}"></div>`}
      <div>
        <div class="row-title">${escapeHtml(property.title)}</div>
        <div class="row-meta">${escapeHtml(property.city)} / ${escapeHtml(property.district)} · ${property.roomCount} · ${property.netSqm} m2 · talep: ${escapeHtml(demand.title)}</div>
        <p class="row-note">${escapeHtml(offer.message)}</p>
      </div>
      <div class="row-side"><span class="badge ${statusClass}">${statusLabel(offer.status)}</span><span class="price">${money(offer.price)}</span>${view === "buyer" ? `<a class="btn btn-small btn-primary" href="#/${target}">İncele</a>` : `<a class="btn btn-small btn-outline" href="#/${target}">Durumu gör</a>`}</div>
    </article>
  `;
}

function documentRow(doc, admin = false) {
  const user = userById(doc.userId);
  const cls = doc.status === "APPROVED" ? "badge-green" : doc.status === "REJECTED" ? "badge-red" : "badge-yellow";
  return `<article class="row-card"><div class="thumb">${icon("file", 26)}</div><div><div class="row-title">${escapeHtml(doc.type)}</div><div class="row-meta">${escapeHtml(user.name)} · risk skoru ${doc.riskScore}</div></div><div class="row-side"><span class="badge ${cls}">${statusLabel(doc.status)}</span>${admin && doc.status === "PENDING" ? `<button class="btn btn-small btn-primary" onclick="KT.reviewDocument('${doc.id}','APPROVED')">Onayla</button><button class="btn btn-small btn-danger" onclick="KT.reviewDocument('${doc.id}','REJECTED')">Reddet</button>` : ""}</div></article>`;
}

function emailRow(email) {
  return `
    <article class="row-card">
      <div class="thumb">${icon("mail", 28)}</div>
      <div>
        <div class="row-title">${escapeHtml(email.subject)}</div>
        <div class="row-meta">${escapeHtml(email.toName)} · ${escapeHtml(email.toEmail)} · ${escapeHtml(email.createdAt)}</div>
        <p class="row-note">${escapeHtml(email.body)}</p>
        <p class="helper" style="margin-top:6px">${escapeHtml(email.reason || "Otomatik eşleşme bildirimi")}</p>
      </div>
      <div class="row-side"><span class="badge badge-green">${statusLabel(email.status)}</span><span class="pill">${escapeHtml(email.actionUrl || "-")}</span></div>
    </article>
  `;
}

function statusLabel(status) {
  const labels = {
    ACTIVE: "Yayında",
    DRAFT: "Taslak",
    PAUSED: "Pasif",
    SENT: "Gönderildi",
    SEEN: "Görüldü",
    INTERESTED: "Alıcı ilgileniyor",
    INFO_REQUESTED: "Bilgi istendi",
    DECLINED: "Uygun bulunmadı",
    MATCHED: "Eşleşme başladı",
    CONTACT_UNLOCKED: "İletişim açıldı",
    WAITING_BUYER_APPROVAL: "Alıcı onayı bekleniyor",
    WAITING_SELLER_APPROVAL: "Satıcı onayı bekleniyor",
    APPROVED: "Onaylandı",
    REJECTED: "Reddedildi",
    PENDING: "Bekliyor",
    IN_REVIEW: "İncelemede",
    SUCCESS: "Başarılı",
    MOCK_SENT: "Mock gönderildi"
  };
  return labels[status] || status;
}

function matchForOffer(offerId) {
  return state.matches.find((match) => match.offerId === offerId);
}

function ensureMatch(offer) {
  let match = matchForOffer(offer.id);
  if (match) return match;
  match = { id: nextId("match"), offerId: offer.id, buyerId: offer.buyerId, sellerId: offer.sellerId, status: "WAITING_BUYER_APPROVAL", buyerContactApproved: false, sellerContactApproved: false, buyerApprovedAt: null, sellerApprovedAt: null, contactUnlockedAt: null, createdAt: today() };
  state.matches.unshift(match);
  state.messages.push({ id: nextId("message"), matchId: match.id, senderId: "system", body: "Eşleşme başladı. İletişim bilgileri iki taraf onay verene kadar gizli kalır.", maskedBody: "Eşleşme başladı. İletişim bilgileri iki taraf onay verene kadar gizli kalır.", containsSensitiveInfo: false, createdAt: today() });
  return match;
}

function render() {
  const path = route();
  // Panel sayfalari giris gerektirir; admin paneli sadece ADMIN rolune acik.
  if (path.startsWith("dashboard")) {
    if (!isSignedIn()) { location.hash = "/giris"; return; }
    if (path.startsWith("dashboard/admin") && currentUser().role !== "ADMIN") { location.hash = "/home"; return; }
  }
  const roleKey = (() => { const r = ((currentUser() || {}).role || "").toUpperCase(); return r === "ADMIN" ? "admin" : r === "SELLER" ? "seller" : r === "AGENT" ? "agent" : "buyer"; })();
  const content = path.startsWith("dashboard/ara")
    ? dashboardLayout(roleKey, searchPage(), path)
    : path.startsWith("dashboard/alici")
    ? renderBuyer(path)
    : path.startsWith("dashboard/satici")
      ? renderSeller(path)
      : path.startsWith("dashboard/admin")
        ? renderAdmin(path)
        : publicPage(path);
  document.getElementById("app").innerHTML = `<div class="app">${header()}${content}${path.startsWith("dashboard") ? copyrightBar() : footer()}</div>`;
  // Arama sayfasi (uye paneli ya da public #/ilanlar) acilinca ilanlari otomatik yukle.
  if (path.startsWith("dashboard/ara") || path === "ilanlar" || path === "ara") KT.searchRun();
  // Ana sayfada yayindaki gercek ilanlari yukle.
  if (path === "home" || path === "" || path === "/") KT.loadHomeListings();
}

window.KT = {
  switchRole(role) {
    state.auth.currentUserId = null;
    state.currentRole = role;
    saveState();
    render();
  },
  startRegistration(role, tx) {
    if (tx) uiTxMode = tx === "RENT" ? "RENT" : "SALE";
    setRoute(`uye-ol/${role}`);
  },
  setTxMode(val) {
    uiTxMode = (val === "Kiralık" || val === "RENT") ? "RENT" : "SALE";
    render();
  },
  onRegRoleChange() {
    const sel = (document.getElementById("r-role") || {}).value || "buyer";
    uiTxMode = (sel === "tenant" || sel === "landlord") ? "RENT" : "SALE";
    const aside = document.getElementById("reg-aside");
    if (aside) aside.innerHTML = regAsideHTML(sel);
  },
  startByRole() {
    if (isSignedIn()) return this.goDashboard();
    setRoute("uye-ol");
  },
  toggleNav(btn) {
    const nav = document.getElementById("site-nav");
    if (!nav) return;
    const open = nav.classList.toggle("open");
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
  },
  async requestPasswordReset(event) {
    event.preventDefault();
    const btn = event.submitter;
    const email = (document.getElementById("fp-email").value || "").trim();
    document.getElementById("fp-error").classList.remove("show");
    if (!email.includes("@")) return showFormError("fp-error", "Geçerli bir e-posta gir.");
    if (btn) btn.disabled = true;
    const r = await api("/password/forgot", "POST", { email });
    if (btn) btn.disabled = false;
    if (!r.ok) return showFormError("fp-error", (r.data && r.data.error) || "İşlem başarısız. Tekrar dene.");
    const okEl = document.getElementById("fp-ok");
    if (r.data && r.data.message) okEl.textContent = r.data.message;
    okEl.style.display = "block";
  },
  async submitPasswordReset(event) {
    event.preventDefault();
    const btn = event.submitter;
    const token = (document.getElementById("rp-token").value || "").trim();
    const p1 = document.getElementById("rp-password").value || "";
    const p2 = document.getElementById("rp-password2").value || "";
    document.getElementById("rp-error").classList.remove("show");
    if (p1.length < 6 || p1 !== p2) return showFormError("rp-error", "Şifre en az 6 karakter olmalı ve iki alan eşleşmeli.");
    if (btn) btn.disabled = true;
    const r = await api("/password/reset", "POST", { token, password: p1 });
    if (btn) btn.disabled = false;
    if (!r.ok) return showFormError("rp-error", (r.data && r.data.error) || "İşlem başarısız.");
    document.getElementById("rp-ok").style.display = "block";
    toast("Şifren güncellendi. Giriş yapabilirsin.");
    setTimeout(() => setRoute("giris"), 1400);
  },
  goDashboard(path) {
    if (path) return setRoute(path);
    const user = currentUser();
    if (isSignedIn()) return setRoute(dashboardPathForRole(user.role));
    if (state.currentRole === "buyer") return setRoute("dashboard/alici");
    if (state.currentRole === "admin") return setRoute("dashboard/admin");
    return setRoute("dashboard/satici");
  },
  previewImage(event, previewId) {
    const file = event.target.files && event.target.files[0];
    const el = document.getElementById(previewId);
    if (!file || !el) return;
    const reader = new FileReader();
    reader.onload = () => { el.src = reader.result; el.style.display = "block"; };
    reader.readAsDataURL(file);
  },
  async register(event) {
    event.preventDefault();
    document.getElementById("r-error").classList.remove("show");
    const name = document.getElementById("r-name").value.trim();
    const roleKey = document.getElementById("r-role").value;
    uiTxMode = (roleKey === "tenant" || roleKey === "landlord") ? "RENT" : "SALE";
    const email = normalizeEmail(document.getElementById("r-email").value);
    const phone = document.getElementById("r-phone").value.trim();
    const city = document.getElementById("r-city").value;
    const password = document.getElementById("r-password").value;
    const password2 = document.getElementById("r-password2").value;
    const accepted = document.getElementById("r-terms").checked;
    const marketingEl = document.getElementById("r-marketing");
    const marketingConsent = marketingEl ? marketingEl.checked : false;
    if (!name || name.length < 3 || !email.includes("@") || phone.length < 10)
      return showFormError("r-error", "Ad, geçerli e-posta ve telefon bilgisi gerekli.");
    if (password.length < 6 || password !== password2)
      return showFormError("r-error", "Şifre en az 6 karakter olmalı ve tekrar alanıyla eşleşmeli.");
    if (!accepted)
      return showFormError("r-error", "Üyelik için Kullanım Koşulları ve KVKK metnini kabul etmelisin.");
    const r = await api("/register", "POST", { name, email, phone, city, role: roleForKey(roleKey), password, marketingConsent });
    if (!r.ok) return showFormError("r-error", r.data.error || "Üyelik oluşturulamadı.");
    await refreshState();
    toast("Üyelik oluşturuldu ve giriş yapıldı.");
    setRoute("hosgeldin"); // önce paket öneri ekranı; oradan panele geçilir
  },
  skipPackages() {
    const user = currentUser();
    const role = user ? user.role : "BUYER";
    setRoute(role === "BUYER" ? "dashboard/alici/talep-olustur" : role === "AGENT" ? "dashboard/satici/evlerim" : "dashboard/satici/ev-ekle");
  },
  async login(event) {
    event.preventDefault();
    document.getElementById("l-error").classList.remove("show");
    const email = normalizeEmail(document.getElementById("l-email").value);
    const password = document.getElementById("l-password").value;
    const r = await api("/login", "POST", { email, password });
    if (!r.ok) return showFormError("l-error", r.data.error || "E-posta veya şifre hatalı.");
    await refreshState();
    toast("Giriş yapıldı.");
    setRoute(dashboardPathForRole(r.data.role));
  },
  async logout() {
    await api("/logout", "POST", {});
    await refreshState();
    toast("Çıkış yapıldı.");
    setRoute("home");
    render();
  },
  async saveProfileSettings() {
    document.getElementById("s-error").classList.remove("show");
    const name = document.getElementById("s-name").value.trim();
    const email = normalizeEmail(document.getElementById("s-email").value);
    const phone = document.getElementById("s-phone").value.trim();
    const city = document.getElementById("s-city").value.trim();
    if (!name || !email.includes("@") || phone.length < 10 || !city)
      return showFormError("s-error", "Ad, e-posta, telefon ve şehir bilgisi gerekli.");
    const r = await api("/profile", "PATCH", { name, email, phone, city });
    if (!r.ok) return showFormError("s-error", r.data.error || "Kaydedilemedi.");
    await refreshState();
    toast("Profil bilgileri kaydedildi.");
    render();
  },
  async loadIlce(prefix) {
    const ilSel = document.getElementById(prefix + "-city");
    const ilceSel = document.getElementById(prefix + "-district");
    if (!ilSel || !ilceSel) return;
    KT.resetMahalle(prefix);
    const code = ilSel.value;
    if (!code) { ilceSel.innerHTML = `<option value="">Önce il seçin</option>`; return; }
    ilceSel.innerHTML = `<option value="">Yükleniyor…</option>`;
    const r = await api("/locations/ilceler?il=" + encodeURIComponent(code));
    const list = (r.ok && r.data.ilceler) ? r.data.ilceler : [];
    ilceSel.innerHTML = `<option value="">İlçe seçiniz</option>` + list.map((d) => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join("");
  },
  async loadMahalle(prefix) {
    const code = (document.getElementById(prefix + "-city") || {}).value || "";
    const ilce = (document.getElementById(prefix + "-district") || {}).value || "";
    const box = document.getElementById(prefix + "-mahalle");
    if (!box) return;
    if (!code || !ilce) { KT.resetMahalle(prefix); return; }
    box.innerHTML = `<span class="muted">Yükleniyor…</span>`;
    const r = await api("/locations/mahalleler?il=" + encodeURIComponent(code) + "&ilce=" + encodeURIComponent(ilce));
    const list = (r.ok && r.data.mahalleler) ? r.data.mahalleler : [];
    if (prefix === "p" || prefix === "s") {
      box.innerHTML = `<select id="${prefix}-neighborhood"><option value="">Mahalle seçiniz (opsiyonel)</option>${list.map((m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join("")}</select>`;
    } else {
      box.innerHTML = list.length
        ? `<div class="check-grid">${list.map((m) => `<label class="check"><input class="${prefix}-mah" type="checkbox" value="${escapeHtml(m)}"> ${escapeHtml(m)}</label>`).join("")}</div>`
        : `<span class="muted">Bu ilçede mahalle kaydı yok; boş bırakabilirsin.</span>`;
    }
  },
  resetMahalle(prefix) {
    const box = document.getElementById(prefix + "-mahalle");
    if (!box) return;
    box.innerHTML = (prefix === "p" || prefix === "s")
      ? `<select id="${prefix}-neighborhood"><option value="">Önce ilçe seçin</option></select>`
      : `<span class="muted">Önce ilçe seçin.</span>`;
  },
  // Ana kategori degisince: alt tip listesini yenile + kategoriye ozel alanlari goster/gizle.
  onCategory(prefix) {
    const cat = (document.getElementById(prefix + "-maincat") || {}).value || CAT_KONUT;
    const typeSel = document.getElementById(prefix + "-type");
    if (typeSel) {
      const subs = CATEGORY_TREE[cat] || [];
      typeSel.innerHTML = subs.map((s, i) => `<option ${i === 0 ? "selected" : ""}>${escapeHtml(s)}</option>`).join("");
    }
    const scope = (typeSel && typeSel.closest("form")) || document;
    scope.querySelectorAll("[data-cats]").forEach((el) => {
      const cats = (el.getAttribute("data-cats") || "").split("|");
      el.style.display = cats.includes(cat) ? "" : "none";
    });
  },
  // --- Arama/kesfet ekrani (kategori tikla + kart izgarasi) ---
  searchTx(tx) {
    searchState.tx = tx === "RENT" ? "RENT" : "SALE";
    const side = document.getElementById("search-side");
    if (side) side.innerHTML = renderSearchSidebar();
    KT.searchRun();
  },
  searchPick(main, sub) {
    searchState.mainCategory = main || "";
    searchState.subCategory = sub || "";
    const side = document.getElementById("search-side");
    if (side) side.innerHTML = renderSearchSidebar();
    KT.searchRun();
  },
  searchApplyFilters() {
    const el = (id) => document.getElementById(id);
    const citySel = el("s-city");
    searchState.city = citySel ? citySel.value : "";
    searchState.cityName = (citySel && citySel.value) ? citySel.selectedOptions[0].text : "";
    searchState.district = el("s-district") ? el("s-district").value : "";
    searchState.neighborhood = el("s-neighborhood") ? el("s-neighborhood").value : "";
    searchState.minPrice = el("s-minprice") ? el("s-minprice").value : "";
    searchState.maxPrice = el("s-maxprice") ? el("s-maxprice").value : "";
    KT.searchRun();
  },
  searchSort(v) {
    searchState.sort = v || "new";
    KT.searchRun();
  },
  async searchRun() {
    const box = document.getElementById("search-results");
    const cnt = document.getElementById("search-count");
    const s = searchState;
    const params = new URLSearchParams();
    params.set("tx", s.tx);
    if (s.mainCategory) params.set("mainCategory", s.mainCategory);
    if (s.subCategory) params.set("subCategory", s.subCategory);
    if (s.cityName) params.set("city", s.cityName);
    if (s.district) params.set("district", s.district);
    if (s.neighborhood) params.set("neighborhood", s.neighborhood);
    if (s.minPrice) params.set("minPrice", s.minPrice);
    if (s.maxPrice) params.set("maxPrice", s.maxPrice);
    if (box) box.innerHTML = `<div class="empty" style="grid-column:1/-1"><b>Aranıyor…</b><span class="muted">Uygun ilanlar getiriliyor.</span></div>`;
    const r = await api("/properties/search?" + params.toString());
    let items = (r.ok && r.data && r.data.items) ? r.data.items : [];
    if (s.sort === "price-asc") items = items.slice().sort((a, b) => (a.price || 0) - (b.price || 0));
    else if (s.sort === "price-desc") items = items.slice().sort((a, b) => (b.price || 0) - (a.price || 0));
    _searchItems = items;
    if (cnt) cnt.textContent = items.length ? `${items.length} ilan listelendi` : "İlan bulunamadı";
    if (!box) return;
    box.innerHTML = items.length
      ? items.map(listingCard).join("")
      : `<div class="empty" style="grid-column:1/-1"><b>Sonuç bulunamadı</b><span class="muted">Filtreleri genişletmeyi dene: mahalle/ilçe kaldır ya da fiyat aralığını aç.</span></div>`;
  },
  // Ana sayfadaki hızlı arama çubuğu → public #/ilanlar sayfasına filtreyle geç.
  homeSearch() {
    const g = (id) => (document.getElementById(id) || {}).value || "";
    searchState.tx = g("home-tx") === "Kiralık" ? "RENT" : "SALE";
    uiTxMode = searchState.tx;
    searchState.mainCategory = g("home-cat") || "";
    searchState.subCategory = "";
    const citySel = document.getElementById("home-city");
    searchState.city = citySel ? citySel.value : "";
    searchState.cityName = (citySel && citySel.value) ? citySel.selectedOptions[0].text : "";
    searchState.district = ""; searchState.neighborhood = ""; searchState.minPrice = ""; searchState.maxPrice = ""; searchState.sort = "new";
    setRoute("ilanlar");
  },
  // Ana sayfada yayındaki en yeni gerçek ilanları göster (giriş gerekmez).
  async loadHomeListings() {
    const box = document.getElementById("home-listings");
    if (!box) return;
    const r = await api("/properties/search?");
    const items = (r.ok && r.data && r.data.items) ? r.data.items.slice(0, 8) : [];
    _searchItems = items;
    box.innerHTML = items.length
      ? items.map(listingCard).join("")
      : `<div class="empty" style="grid-column:1/-1"><b>Henüz konut yok</b><span class="muted">İlk konutlar eklendiğinde burada görünür.</span></div>`;
  },
  searchDetail(id) {
    const p = _searchItems.find((x) => x.id === id);
    if (!p) return;
    const u = currentUser();
    const rent = p.transactionType === "RENT";
    const loc = [p.city, p.district, p.neighborhood].filter(Boolean).join(", ") || "Konum belirtilmedi";
    const meta = [p.mainCategory, p.propertyType].filter(Boolean);
    if (p.roomCount) meta.push(p.roomCount);
    if (p.netSqm) meta.push(p.netSqm + " m²");
    if (p.buildingAge) meta.push("Bina " + p.buildingAge);
    if (p.floor) meta.push("Kat " + p.floor);
    const feats = [...parseFeatures(p.interiorFeatures), ...parseFeatures(p.exteriorFeatures)].map(escapeHtml);
    const cta = !isSignedIn()
      ? `<a class="btn btn-primary" style="flex:1" href="#/uye-ol" onclick="KT.closeSearchDetail()">İletişim için üye ol</a>`
      : (u && u.role === "BUYER")
      ? `<a class="btn btn-primary" style="flex:1" href="#/dashboard/alici/talep-olustur" onclick="KT.closeSearchDetail()">Uygun talep oluştur</a>`
      : `<a class="btn btn-primary" style="flex:1" href="#/dashboard/satici/paketler" onclick="KT.closeSearchDetail()">Paketleri gör</a>`;
    const old = document.getElementById("kt-listing-overlay");
    if (old) old.remove();
    const ov = document.createElement("div");
    ov.id = "kt-listing-overlay";
    ov.style.cssText = "position:fixed;inset:0;background:rgba(8,18,30,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px";
    ov.onclick = (e) => { if (e.target === ov) KT.closeSearchDetail(); };
    ov.innerHTML = `<div style="background:#fff;border-radius:14px;max-width:560px;width:100%;max-height:90vh;overflow:auto;box-shadow:0 20px 60px rgba(8,18,30,.35)">
        <div class="lc-media" style="height:200px;border-radius:14px 14px 0 0">${p.imageData ? `<img src="${p.imageData}" alt="">` : `<div class="lc-ph ${escapeAttr(p.photoClass || "")}">${icon(p.mainCategory === CAT_ARSA ? "map" : p.mainCategory === CAT_ISYERI ? "card" : "home", 46)}</div>`}<span class="lc-tx ${rent ? "rent" : "sale"}">${rent ? "Kiralık" : "Satılık"}</span></div>
        <div style="padding:20px">
          <h3 style="margin:0 0 6px;font-size:20px;color:#10243a">${escapeHtml(p.title)}</h3>
          <p style="margin:0 0 4px;color:#5b6b7d;font-size:14px">${icon("map", 13)} ${escapeHtml(loc)}</p>
          <p style="margin:8px 0;font-size:22px;font-weight:700;color:#e07b39">${money(p.price)}${rent ? " / ay" : ""}</p>
          <div class="pill-row" style="margin:10px 0">${meta.map((t) => `<span class="pill">${escapeHtml(t)}</span>`).join("")}</div>
          ${feats.length ? `<div class="pill-row" style="margin:10px 0">${feats.map((t) => `<span class="pill">${t}</span>`).join("")}</div>` : ""}
          <p style="margin:12px 0;color:#26333f;font-size:14px;line-height:1.6">${escapeHtml(p.description || "")}</p>
          <div class="notice" style="margin:12px 0"><strong>${icon("lock", 13)} İletişim gizli.</strong> Mülk sahibinin telefon/e-postası yalnızca eşleşme sonrası üyelikle açılır. Tam adres gösterilmez.</div>
          <div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-outline" style="flex:1" onclick="KT.closeSearchDetail()">Kapat</button>${cta}</div>
        </div>
      </div>`;
    document.body.appendChild(ov);
  },
  closeSearchDetail() {
    const ov = document.getElementById("kt-listing-overlay");
    if (ov) ov.remove();
  },
  // --- Admin: kullanıcı/üyelik filtreleri + ilan/talep okuma ---
  renderAdminUsers() {
    const g = (id) => (document.getElementById(id) || {}).value || "";
    const q = g("au-q").toLowerCase().trim(), tip = g("au-tip"), city = g("au-city");
    let list = (state.users || []).slice();
    if (q) list = list.filter((u) => ((u.name || "") + " " + (u.email || "") + " " + (u.phone || "")).toLowerCase().includes(q));
    if (city) list = list.filter((u) => u.city === city);
    if (tip) list = list.filter((u) => userTip(u).includes(tip));
    const box = document.getElementById("admin-users-box");
    if (box) box.innerHTML = adminUsersTable(list);
  },
  renderAdminMemberships() {
    const g = (id) => (document.getElementById(id) || {}).value || "";
    const q = g("am-q").toLowerCase().trim(), tip = g("am-tip");
    const ents = (state.entitlements || []).filter((e) => {
      const u = (state.users || []).find((x) => x.id === e.userId) || {};
      const t = PLAN_TYPE[e.planId] || userTip(u) || "";
      if (tip && !t.includes(tip)) return false;
      if (q && !(((u.name || "") + " " + (u.phone || "") + " " + (u.city || "")).toLowerCase().includes(q))) return false;
      return true;
    });
    const box = document.getElementById("admin-memb-box");
    if (box) box.innerHTML = adminMembTable(ents);
  },
  adminItemDetail(type, id) {
    const it = type === "property" ? (state.properties || []).find((p) => p.id === id) : (state.demands || []).find((d) => d.id === id);
    if (!it) return;
    const rent = it.transactionType === "RENT";
    const owner = type === "property" ? (state.users || []).find((u) => u.id === it.sellerId) : (state.users || []).find((u) => u.id === it.buyerId);
    const hoods = parseFeatures(it.neighborhoods);
    const loc = [it.city, it.district].concat(hoods.length ? hoods : (it.neighborhood ? [it.neighborhood] : [])).filter(Boolean).join(", ") || "Konum belirtilmedi";
    const meta = [it.mainCategory, it.propertyType].filter(Boolean);
    if (it.roomCount) meta.push(it.roomCount);
    if (type === "property" && it.netSqm) meta.push(it.netSqm + " m²");
    if (type === "property" && it.floor) meta.push("Kat " + it.floor);
    if (it.buildingAge) meta.push("Bina " + it.buildingAge);
    if (type === "property" && it.heatingType) meta.push(it.heatingType);
    if (type === "property" && it.occupancyStatus) meta.push(it.occupancyStatus);
    const feats = [...parseFeatures(it.interiorFeatures), ...parseFeatures(it.exteriorFeatures)].map(escapeHtml);
    const priceLine = type === "property"
      ? money(it.price) + (rent ? " / ay" : "")
      : money(it.minBudget) + " – " + money(it.maxBudget) + (rent ? " / ay" : "");
    const ownerLine = owner ? `${escapeHtml(owner.name || "—")} · ${escapeHtml(owner.phone || "—")} · ${escapeHtml(owner.email || "—")}` : "—";
    const ownerLabel = type === "property" ? "İlan sahibi (satıcı)" : "Talep sahibi (alıcı)";
    const old = document.getElementById("kt-admin-detail"); if (old) old.remove();
    const ov = document.createElement("div");
    ov.id = "kt-admin-detail";
    ov.style.cssText = "position:fixed;inset:0;background:rgba(8,18,30,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px";
    ov.onclick = (e) => { if (e.target === ov) KT.closeAdminDetail(); };
    ov.innerHTML = `<div style="background:#fff;border-radius:14px;max-width:600px;width:100%;max-height:90vh;overflow:auto;box-shadow:0 20px 60px rgba(8,18,30,.35);padding:22px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <h3 style="margin:0;font-size:20px;color:#10243a">${escapeHtml(it.title || "")}</h3>
          <span class="badge ${rent ? "badge-blue" : "badge-green"}">${rent ? "Kiralık" : "Satılık"}</span>
        </div>
        <p style="margin:6px 0;color:#5b6b7d;font-size:14px">${icon("map", 13)} ${escapeHtml(loc)}</p>
        <p style="margin:8px 0;font-size:20px;font-weight:700;color:#e07b39">${priceLine}</p>
        <div class="pill-row" style="margin:10px 0">${meta.map((t) => `<span class="pill">${escapeHtml(t)}</span>`).join("")}</div>
        ${feats.length ? `<div class="pill-row" style="margin:10px 0">${feats.map((t) => `<span class="pill">${t}</span>`).join("")}</div>` : ""}
        <div style="margin:12px 0;padding:12px;background:#f5f8fb;border-radius:10px">
          <div style="font-size:12px;color:#7a8a99;text-transform:uppercase;letter-spacing:.03em;margin-bottom:4px">Açıklama</div>
          <div style="font-size:14px;color:#26333f;line-height:1.6;white-space:pre-wrap">${escapeHtml(it.description || "—")}</div>
        </div>
        <div style="margin:12px 0;font-size:13.5px;color:#26333f;padding:10px;background:#fff7ed;border:1px solid #f4e2c8;border-radius:10px"><strong>${ownerLabel}:</strong> ${ownerLine}</div>
        <div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="btn btn-outline" onclick="KT.closeAdminDetail()">Kapat</button></div>
      </div>`;
    document.body.appendChild(ov);
  },
  closeAdminDetail() {
    const ov = document.getElementById("kt-admin-detail"); if (ov) ov.remove();
  },
  async createDemand(event) {
    event.preventDefault();
    document.getElementById("d-error").classList.remove("show");
    const rent = uiTxMode === "RENT";
    const val = (id) => { const el = document.getElementById(id); return el ? el.value : ""; };
    const chk = (id) => { const el = document.getElementById(id); return el ? el.checked : false; };
    const multi = (cls) => [...document.querySelectorAll("." + cls + ":checked")].map((x) => x.value);
    const selVal = (id) => { const v = val(id); return /^(Farketmez|Belirtmek istemiyorum)$/.test(v) ? "" : v; };
    const cityName = (id) => { const s = document.getElementById(id); return s && s.value ? s.selectedOptions[0].text : ""; };
    const mahalleler = multi("d-mah");
    const cat = val("d-maincat") || CAT_KONUT;
    const feats = cat === CAT_ISYERI ? { interior: [], exterior: multi("d-isyeri") }
      : cat === CAT_ARSA ? { interior: [], exterior: multi("d-arsa") }
      : { interior: multi("d-ic"), exterior: multi("d-dis") };
    const payload = {
      title: val("d-title").trim(),
      city: cityName("d-city"),
      district: val("d-district").trim(),
      neighborhood: mahalleler[0] || "",
      neighborhoods: mahalleler,
      mainCategory: cat,
      propertyType: val("d-type"),
      roomCount: cat === CAT_KONUT ? val("d-rooms") : "",
      minSqm: Number(val("d-minsqm")),
      maxSqm: Number(val("d-maxsqm")),
      minBudget: Number(val("d-minbudget")),
      maxBudget: Number(val("d-maxbudget")),
      downPayment: Number(val("d-down") || 0),
      usesCredit: chk("d-credit"),
      cashReady: chk("d-cash"),
      exchangePossible: chk("d-exchange"),
      purchaseTimeline: val("d-timeline"),
      description: val("d-desc").trim(),
      privacyLevel: "Platform varsayılanı",
      transactionType: rent ? "RENT" : "SALE",
      depositAmount: Number(val("d-deposit") || 0),
      furnished: chk("d-furnished"),
      interiorFeatures: feats.interior,
      exteriorFeatures: feats.exterior,
      heatingType: cat === CAT_ARSA ? "" : selVal("d-heating"),
      buildingAge: cat === CAT_ARSA ? "" : selVal("d-buildingage"),
      floorPref: cat === CAT_ARSA ? "" : selVal("d-floor"),
      occupation: selVal("d-occupation")
    };
    if (!payload.title || !payload.city || !payload.minBudget || !payload.maxBudget || payload.maxBudget < payload.minBudget || payload.description.length < 20)
      return showFormError("d-error", rent ? "Başlık, şehir, geçerli kira aralığı ve en az 20 karakter açıklama gerekli." : "Başlık, şehir, geçerli bütçe aralığı ve en az 20 karakter açıklama gerekli.");
    payload.imageData = await readImageInput("d-image");
    const r = await api("/demands", "POST", payload);
    if (!r.ok) return showFormError("d-error", r.data.error || "Talep oluşturulamadı.");
    toast(`Talebin yayına alındı. Uygun ${rent ? "ev sahiplerine" : "satıcılara"} bildirim hazırlandı.`);
    setRoute("dashboard/alici/taleplerim");
  },
  async createProperty(event) {
    event.preventDefault();
    document.getElementById("p-error").classList.remove("show");
    const rent = uiTxMode === "RENT";
    const val = (id) => { const el = document.getElementById(id); return el ? el.value : ""; };
    const chk = (id) => { const el = document.getElementById(id); return el ? el.checked : false; };
    const type = val("p-type");
    const multi = (cls) => [...document.querySelectorAll("." + cls + ":checked")].map((x) => x.value);
    const cityName = (id) => { const s = document.getElementById(id); return s && s.value ? s.selectedOptions[0].text : ""; };
    const cat = val("p-maincat") || CAT_KONUT;
    const ic = cat === CAT_KONUT ? multi("p-ic") : [];
    const dis = cat === CAT_ISYERI ? multi("p-isyeri") : cat === CAT_ARSA ? multi("p-arsa") : multi("p-dis");
    const payload = {
      title: val("p-title").trim(),
      city: cityName("p-city"),
      district: val("p-district").trim(),
      neighborhood: val("p-neighborhood"),
      mainCategory: cat,
      propertyType: type,
      roomCount: cat === CAT_KONUT ? val("p-rooms") : "",
      grossSqm: Number(val("p-gross")),
      netSqm: Number(val("p-net")),
      buildingAge: cat === CAT_ARSA ? "" : val("p-age"),
      floor: cat === CAT_ARSA ? "" : val("p-floor").trim(),
      bathroomCount: cat === CAT_KONUT ? (Number(String(val("p-bathroom") || "1").replace("+", "")) || 1) : 0,
      heatingType: cat === CAT_ARSA ? "" : val("p-heating"),
      occupancyStatus: cat === CAT_ARSA ? "" : (val("p-occupancy") || "Boş"),
      dues: cat === CAT_ARSA ? 0 : Number(val("p-dues")),
      interiorFeatures: ic,
      exteriorFeatures: dis,
      hasBalcony: ic.includes("Balkon"),
      hasParking: dis.includes("Otopark"),
      hasElevator: dis.includes("Asansör"),
      inComplex: dis.includes("Site İçerisinde"),
      creditEligible: chk("p-credit"),
      negotiable: chk("p-negotiable"),
      price: Number(val("p-price")),
      description: val("p-desc").trim(),
      photoClass: cat === CAT_ARSA ? "land" : cat === CAT_ISYERI ? "commercial" : (type === "Villa" ? "villa" : type === "Rezidans" ? "residence" : "apartment"),
      transactionType: rent ? "RENT" : "SALE",
      depositAmount: Number(val("p-deposit") || 0),
      furnished: chk("p-furnished")
    };
    if (!payload.title || !payload.city || !payload.price || payload.description.length < 15)
      return showFormError("p-error", `Başlık, şehir, ${rent ? "aylık kira" : "fiyat"} ve en az 15 karakter açıklama gerekli.`);
    payload.imageData = await readImageInput("p-image");
    const r = await api("/properties", "POST", payload);
    if (!r.ok) return showFormError("p-error", r.data.error || "İlan eklenemedi.");
    toast(`${rent ? "İlanın" : "Evin"} portföyüne eklendi. Uygun ${rent ? "kiracılara" : "alıcılara"} bildirim hazırlandı.`);
    setRoute("dashboard/satici/evlerim");
  },
  goSellerOffer(demandId) {
    state.currentRole = state.currentRole === "agent" ? "agent" : "seller";
    saveState();
    setRoute(`dashboard/satici/teklif-gonder/${demandId}`);
  },
  goSellerDemands() {
    setRoute("dashboard/satici/talepler");
  },
  async createOffer(event, demandId) {
    event.preventDefault();
    document.getElementById("o-error").classList.remove("show");
    const propertyId = document.getElementById("o-property").value;
    const price = Number(document.getElementById("o-price").value);
    const message = document.getElementById("o-message").value.trim();
    if (!propertyId || !price || message.length < 15)
      return showFormError("o-error", "Ev seçimi, fiyat ve en az 15 karakter teklif notu gerekli.");
    const r = await api("/offers", "POST", { demandId, propertyId, price, message });
    if (!r.ok) return showFormError("o-error", r.data.error || "Teklif gönderilemedi.");
    toast("Teklif kartı alıcıya gönderildi.");
    setRoute("dashboard/satici/tekliflerim");
  },
  async respondOffer(offerId, response) {
    const r = await api(`/offers/${offerId}/respond`, "POST", { response });
    if (!r.ok) return toast(r.data.error || "İşlem başarısız.");
    await refreshState();
    if (response === "DECLINED") {
      toast("Teklif uygun değil olarak işaretlendi.");
      setRoute("dashboard/alici/teklifler");
      return;
    }
    toast("Eşleşme oluştu. Üyelikle iletişim bilgisine ulaşabilirsin.");
    setRoute("dashboard/alici/eslesmeler");
  },
  openMatch(matchId) {
    if (state.currentRole === "buyer") setRoute("dashboard/alici/eslesmeler");
    else setRoute("dashboard/satici/eslesmeler");
  },
  async sendMessage(event, matchId) {
    event.preventDefault();
    const input = document.getElementById(`chat-input-${matchId}`);
    const value = input.value.trim();
    if (!value) return;
    const r = await api(`/matches/${matchId}/messages`, "POST", { body: value });
    if (!r.ok) return toast(r.data.error || "Mesaj gönderilemedi.");
    if (r.data.masked) toast("İletişim bilgisi maskelendi.");
    await refreshState();
    render();
  },
  async approveContact(matchId) {
    const r = await api(`/matches/${matchId}/approve`, "POST", {});
    if (!r.ok) return toast(r.data.error || "İletişim onayı için ilgili üyelik gerekli.");
    await refreshState();
    toast(r.data.unlocked ? "İletişim kartı açıldı." : "İletişim onayın kaydedildi. Karşı tarafın onayı bekleniyor.");
    render();
  },
  async saveBudgetDeclaration() {
    document.getElementById("bd-error").classList.remove("show");
    const min = Number(document.getElementById("bd-min").value);
    const max = Number(document.getElementById("bd-max").value);
    const down = Number(document.getElementById("bd-down").value);
    if (!min || !max || max < min)
      return showFormError("bd-error", "Geçerli bir minimum ve maksimum bütçe aralığı gir.");
    const r = await api("/buyer-profile", "PUT", {
      declaredBudgetMin: min, declaredBudgetMax: max, declaredDownPayment: down,
      declaredUsesCredit: document.getElementById("bd-credit").checked,
      declaredCashReady: document.getElementById("bd-cash").checked
    });
    if (!r.ok) return showFormError("bd-error", r.data.error || "Kaydedilemedi.");
    await refreshState();
    toast("Bütçe beyanın güncellendi. Belge yüklemesi gerekmez.");
    render();
  },
  async addSellerDoc() {
    const r = await api("/verification-documents", "POST", { type: "Tapu / yetki belgesi" });
    if (!r.ok) return toast(r.data.error || "Belge gönderilemedi.");
    await refreshState();
    toast("Belge admin incelemesine gönderildi.");
    render();
  },
  async reviewDocument(docId, status) {
    const r = await api(`/documents/${docId}/review`, "POST", { status });
    if (!r.ok) return toast(r.data.error || "İşlem başarısız.");
    await refreshState();
    toast(`Belge ${status === "APPROVED" ? "onaylandı" : "reddedildi"}.`);
    render();
  },
  mockPromote(itemType, itemId) {
    if (!PAYMENTS_LIVE) return toast("Ödeme altyapısı çok yakında aktifleşecek. Öne çıkarma kısa süre sonra kullanılabilir olacak.");
    const planId = itemType === "demand" ? "plan-buyer-boost" : "plan-seller-boost";
    KT.showPayConsent(planId, () => KT.runCheckout({ planId, itemType, itemId }, planById(planId), true));
  },
  mockUpgrade(planId, rerender = false) {
    if (!PAYMENTS_LIVE) return toast("Ödeme altyapısı çok yakında aktifleşecek. Paketler kısa süre sonra satın alınabilir olacak.");
    KT.showPayConsent(planId, () => KT.runCheckout({ planId }, planById(planId), rerender));
  },
  async runCheckout(body, plan, rerender = false) {
    const r = await api("/payments/checkout", "POST", body);
    if (!r.ok) return toast(r.data.error || "İşlem başarısız.");
    if (r.data.provider === "paytr" && r.data.iframeUrl) return KT.openPaymentFrame(r.data.iframeUrl);
    await refreshState();
    toast(`${plan ? plan.name : "Paket"} işlemi tamamlandı.`);
    if (rerender) render();
  },
  showPayConsent(planId, action) {
    const plan = planById(planId);
    _pendingPay = action;
    const old = document.getElementById("kt-consent-overlay");
    if (old) old.remove();
    const ov = document.createElement("div");
    ov.id = "kt-consent-overlay";
    ov.style.cssText = "position:fixed;inset:0;background:rgba(8,18,30,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px";
    ov.innerHTML = `<div style="background:#fff;border-radius:14px;max-width:470px;width:100%;padding:24px;box-shadow:0 20px 60px rgba(8,18,30,.35)">
        <h3 style="margin:0 0 4px;font-size:18px;color:#10243a">${escapeHtml(plan ? plan.name : "Paket")}${plan && plan.price ? ` · ${plan.price} TL` : ""}</h3>
        <p style="margin:0 0 16px;color:#5b6b7d;font-size:14px">Güvenli ödemeye geçmeden önce lütfen onaylayın:</p>
        <label style="display:flex;gap:11px;align-items:flex-start;font-size:13.5px;line-height:1.55;color:#26333f;cursor:pointer">
          <input id="kt-consent-cb" type="checkbox" style="margin-top:3px;flex:none;width:18px;height:18px;cursor:pointer">
          <span><a href="#/on-bilgilendirme" target="_blank" style="color:#1f6feb;text-decoration:underline">Ön Bilgilendirme Formu</a>'nu, <a href="#/mesafeli-satis" target="_blank" style="color:#1f6feb;text-decoration:underline">Mesafeli Satış Sözleşmesi</a>'ni ve <a href="#/iade-iptal" target="_blank" style="color:#1f6feb;text-decoration:underline">İade &amp; İptal koşulları</a>nı okudum, onaylıyorum. Hizmetin onay sonrası hemen başlayacağını ve dijital içerik/hizmet niteliği gereği <b>cayma hakkımın sona ereceğini</b> kabul ediyorum.</span>
        </label>
        <div style="display:flex;gap:10px;margin-top:22px">
          <button class="btn btn-outline" style="flex:1" onclick="KT.closePayConsent()">Vazgeç</button>
          <button class="btn btn-primary" style="flex:1" onclick="KT.confirmPayConsent()">Onayla ve öde</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
  },
  closePayConsent() {
    const ov = document.getElementById("kt-consent-overlay");
    if (ov) ov.remove();
    _pendingPay = null;
  },
  confirmPayConsent() {
    const cb = document.getElementById("kt-consent-cb");
    if (!cb || !cb.checked) return toast("Devam etmek için koşulları onaylamanız gerekiyor.");
    const action = _pendingPay;
    _pendingPay = null;
    const ov = document.getElementById("kt-consent-overlay");
    if (ov) ov.remove();
    if (typeof action === "function") action();
  },
  openPaymentFrame(url) {
    const old = document.getElementById("kt-pay-overlay");
    if (old) old.remove();
    const ov = document.createElement("div");
    ov.id = "kt-pay-overlay";
    ov.style.cssText = "position:fixed;inset:0;background:rgba(8,18,30,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px";
    ov.innerHTML = `<div style="background:#fff;border-radius:14px;max-width:520px;width:100%;max-height:92vh;overflow:hidden;display:flex;flex-direction:column">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #e5eaf0">
          <strong>Güvenli Ödeme — PayTR</strong>
          <button onclick="KT.closePaymentFrame()" style="border:0;background:#eef3f8;border-radius:8px;padding:6px 12px;cursor:pointer;font-weight:700">Kapat</button>
        </div>
        <iframe src="${url}" style="border:0;width:100%;height:70vh" allow="payment"></iframe>
        <div style="padding:10px 16px;border-top:1px solid #e5eaf0;font-size:13px;color:#5b6b7d">Ödeme tamamlanınca bu pencereyi kapatın; üyeliğiniz birkaç saniye içinde etkinleşir.</div>
      </div>`;
    document.body.appendChild(ov);
  },
  async closePaymentFrame() {
    const ov = document.getElementById("kt-pay-overlay");
    if (ov) ov.remove();
    await refreshState();
    render();
    toast("Ödeme sonucu kontrol edildi. Üyeliğin aktifse iletişim bilgisi artık açık.");
  },
  adminMockAction() {
    toast("Paketin hesabına tanımlandı.");
  },
  filterOffers(kind) {
    const user = currentUser();
    let offers = state.offers.filter((offer) => offer.buyerId === user.id);
    if (kind === "budget") offers = offers.filter((offer) => {
      const demand = demandById(offer.demandId);
      return offer.price <= demand.maxBudget;
    });
    if (kind === "new") offers = offers.filter((offer) => offer.status === "SENT");
    if (kind === "credit") offers = offers.filter((offer) => propertyById(offer.propertyId).creditEligible);
    document.getElementById("offer-list").innerHTML = offers.map((offer) => offerRow(offer, "buyer")).join("") || empty("Sonuç yok", "Filtreleri genişletmeyi deneyebilirsin.");
  }
};

async function navigate() {
  await refreshState();
  render();
}
window.addEventListener("hashchange", navigate);
window.addEventListener("DOMContentLoaded", async () => {
  await refreshState();
  if (!location.hash) location.hash = "/home";
  render();
});
