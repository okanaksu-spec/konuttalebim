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
      { id: "plan-buyer-boost", name: "Talebimi Üste Taşı", roleType: "BUYER", price: 99, interval: "7 gün", category: "Talep · Üste Taşıma", features: ["Talep kartı üst sıralarda", "Havuzda renkli vurgu", "Uygun üyelere ek bildirim"] },
      { id: "plan-tenant-free", name: "Kiracı Ücretsiz", roleType: "BUYER", price: 0, interval: "ay", category: "Kiralık · Temel", features: ["Sınırsız kiralık talebi", "Ev sahipleri sana ulaşır", "Tamamen ücretsiz"] },
      { id: "plan-landlord-contact", name: "Kiracı Bilgilerini Gör", roleType: "SELLER", price: 199, interval: "ay", category: "Kiralık · İletişim", features: ["Eşleştiğin kiracının telefon/e-posta bilgisi", "Bilgiyi gör, doğrudan ara", "Sınırsız kiracı talebi görüntüleme"] },
      { id: "plan-pro", name: "Profesyonel Paket", roleType: "AGENT", price: 799, interval: "ay", category: "Danışman · Reklam + üyelik", features: ["Tüm talep havuzuna sınırsız erişim", "Tüm iletişim bilgilerini görme", "Onaylı danışman rozeti"] }
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
let uiTxMode = "RENT"; // 2.0 + Okan karari (30 Tem): varsayilan Kiralik. ?tx=SALE ile degisir.
try { if (new URLSearchParams(location.search).get("tx") === "SALE") uiTxMode = "SALE"; } catch {}
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
// Varsayilan islem tipi KIRALIK: reklam kampanyasi, misafir talep formu ve
// sehir sayfalarinin tamami kiraci tarafina odakli. Kenar cubugunda da Kiralik
// once duruyor; varsayilan Satilik kalirsa ilk gorunen sekme ile secili sekme
// birbirini tutmuyor.
// =====================================================================
// MARKA SABITLERI — MASTER (Okan). Logo alti slogan ve marka adi TEK yerden
// yonetilir; degisiklik Okan onayi ile buradan yapilir ve siteye yansir.
// (E-posta ve SEO sayfalari icin es degerleri server/server.mjs + seo-pages.mjs
// icindeki MARKA sabitlerindedir - uc dosya birlikte guncellenir.)
const MARKA = {
  ad: "Konuttalebi",
  slogan: "Talep ve Teklif",                          // logo alti (MASTER, 31 Tem)
  epostaSlogan: "Sen aramazsın, teklifler sana gelir.", // e-posta imzasi (MASTER, 31 Tem)
};

let searchState = { tx: "RENT", mainCategory: "", subCategory: "", city: "", cityName: "", district: "", neighborhood: "", minPrice: "", maxPrice: "", sort: "new" };
let _searchItems = [];

// ---------- Olcumleme (Google Ads dönüşümleri + reklam kaynagi) ----------
// Google Ads'te her dönüşüm eylemi kendi etiketiyle gelir. Yeni bir dönüşüm
// olusturulunca etiketi asagidaki haritaya yazmak yeterli; kod degismez.
// Etiketi olmayan olaylar yine de gtag olayi olarak gonderilir (GA4/ileride kullanilir).
const ADS_ID = "AW-18335656859";
const GA4_ID = "G-LFBWPTNVDE";
// label: Ads dönüşüm etiketi · value/currency: Ads'te tanimli varsayilan deger
const CONVERSIONS = {
  talep_olustur: { label: "IuOECKTCnNMcEJvXj6dE" },                            // Talep oluşturma
  kayit_tamamla: { label: "3tnDCObH7tYcEJvXj6dE", value: 1.0, currency: "TRY" }, // Kayıt tamamlama
  ilan_ekle: { label: "vR85COnH7tYcEJvXj6dE", value: 1.0, currency: "TRY" },     // İlan (ev) ekleme
  teklif_gonder: { label: "8xOrCPSGg9ccEJvXj6dE", value: 1.0, currency: "TRY" }, // Teklif gönderme
  odeme: { label: "-cS3CPeGg9ccEJvXj6dE", currency: "TRY" },                     // Ödeme (deger islemden gelir)
  iletisim_acildi: { label: "hbiFCK3tr9kcEJvXj6dE", value: 1.0, currency: "TRY" }, // İletişim açma (S3 hedefi · KUYRUK #33)
};
// Reklam kaynagi: ilk gelisteki gclid/utm parametrelerini sakla (30 gun).
const ATTR_KEY = "kt-attribution-v1";
// Sehir sayfalarindan gelen ?il=istanbul parametresi: formda il onsecili gelsin.
// Slug -> il adi (TR_ILLER icinde eslesme kurulur).
const CITY_SLUGS = { istanbul: "İstanbul", ankara: "Ankara", izmir: "İzmir", eskisehir: "Eskişehir", bursa: "Bursa", antalya: "Antalya" };
let preselectCity = "";
try {
  const ilParam = (new URLSearchParams(location.search).get("il") || "").toLowerCase();
  if (CITY_SLUGS[ilParam]) preselectCity = CITY_SLUGS[ilParam];
} catch { /* yoksay */ }
// Formdaki il alanini (varsa) sehir sayfasindan gelen ile ayarlar ve ilceleri yukler.
function applyPreselectCity(prefix) {
  if (!preselectCity) return;
  const sel = document.getElementById(prefix + "-city");
  if (!sel || sel.value) return;
  const match = TR_ILLER.find((il) => il.name === preselectCity);
  if (!match) return;
  sel.value = match.code;
  if (sel.value === match.code && window.KT && KT.loadIlce) KT.loadIlce(prefix);
}

function captureAttribution() {
  try {
    const qs = new URLSearchParams(location.search);
    const get = (k) => (qs.get(k) || "").slice(0, 120);
    const fresh = { gclid: get("gclid"), source: get("utm_source"), medium: get("utm_medium"), campaign: get("utm_campaign"), term: get("utm_term"), at: Date.now() };
    const hasNew = fresh.gclid || fresh.source || fresh.campaign;
    if (hasNew) { localStorage.setItem(ATTR_KEY, JSON.stringify(fresh)); return fresh; }
    const saved = JSON.parse(localStorage.getItem(ATTR_KEY) || "null");
    if (saved && Date.now() - (saved.at || 0) < 30 * 24 * 3600 * 1000) return saved;
    if (!saved && document.referrer && !document.referrer.includes(location.host))
      return { gclid: "", source: "referral", medium: "referral", campaign: document.referrer.slice(0, 120), term: "", at: Date.now() };
  } catch { /* yoksay */ }
  return { gclid: "", source: "", medium: "", campaign: "", term: "", at: Date.now() };
}
function attribution() { return captureAttribution(); }
// Tek giris noktasi: hem Ads dönüşümü hem adlandirilmis olay gonderir.
// Donusumler yalnizca canli alan adinda gonderilir; localhost/staging reklam verisini kirletmesin.
const IS_PROD = typeof location !== "undefined" && /(^|\.)konuttalebi\.com$/i.test(location.hostname);
// Ayni islem iki kez sayilmasin (ozellikle odeme: kullanici ekrani yenilerse).
const SENT_CONV_KEY = "kt-sent-conversions-v1";
function alreadySent(id) {
  if (!id) return false;
  try {
    const list = JSON.parse(localStorage.getItem(SENT_CONV_KEY) || "[]");
    if (list.includes(id)) return true;
    list.push(id);
    localStorage.setItem(SENT_CONV_KEY, JSON.stringify(list.slice(-100)));
  } catch { /* depolama yoksa yoksay */ }
  return false;
}
function ktTrack(eventName, params) {
  try {
    if (!window.gtag) return;
    const p = params || {};
    const conv = CONVERSIONS[eventName];
    if (conv && conv.label && IS_PROD) {
      // Mukerrer koruma: islem numarasi varsa (odeme) ayni kayit ikinci kez gonderilmez.
      if (p.transaction_id && alreadySent(`${eventName}:${p.transaction_id}`)) return;
      // Google Ads'e yalnizca bu dort alan gider; kisisel veri veya ek alan gonderilmez.
      const payload = { send_to: `${ADS_ID}/${conv.label}`, currency: conv.currency || "TRY" };
      payload.value = p.value !== undefined ? p.value : (conv.value !== undefined ? conv.value : 1.0);
      if (p.transaction_id) payload.transaction_id = p.transaction_id;
      gtag("event", "conversion", payload);
    }
    // Adlandirilmis olay (GA4): baglam bilgisi burada kalir, dönüşüm yukune karismaz.
    // send_to acikca yaziliyor. DUZELTME (29 Tem 2026): eskiden buraya "send_to
    // yazilmazsa olay GA4'e hic ulasmaz" diye bir not dusmustuk — bu YANLIS.
    // Canlida olculdu: send_to verilmeyen ozel olay sayfadaki TUM config hedeflerine
    // gidiyor, yani GA4'e de ulasiyor. Yine de hedefi acik yazmak dogru aliskanlik.
    gtag("event", `kt_${eventName}`, { send_to: [GA4_ID, ADS_ID], ...p });
  } catch { /* olcum hatasi akisi bozmasin */ }
}

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
  const labels = { BUYER: "Konut alıcısı", SELLER: "Evine alıcı arayan", AGENT: "Emlak danışmanı", ADMIN: "Admin" };
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
  // 2.0: dort plan. Talep birakan ucretsiz; iletisimi goren taraf oder.
  "plan-tenant-free": { role: "KİRACI / KONUT ALICISI", kind: "membership", order: 1, free: ["buyer", "RENT"] },
  "plan-landlord-contact": { role: "BİREYSEL", kind: "membership", order: 2 },
  "plan-pro": { role: "DANIŞMAN", kind: "membership", order: 3 },
  "plan-buyer-boost": { role: "TALEP SAHİBİ", kind: "boost", order: 1 },
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
  if ((demand.transactionType || "SALE") !== (property.transactionType || "SALE")) return { score: 0, reasons, warnings: ["İşlem tipi farklı (satın alma/kiralık)"] };
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

// [Faz 5] maskSensitiveInfo silindi - 2.0 sonrasi erisilemeyen eski akis.


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

// [Faz 5] matchingPropertiesForDemand silindi - 2.0 sonrasi erisilemeyen eski akis.


// [Faz 5] matchingDemandsForProperty silindi - 2.0 sonrasi erisilemeyen eski akis.


// [Faz 5] notifySellersForDemand silindi - 2.0 sonrasi erisilemeyen eski akis.


// [Faz 5] notifyBuyersForProperty silindi - 2.0 sonrasi erisilemeyen eski akis.


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
    ["talepler", "Talepler"],
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
          <span class="brand-text"><strong>${MARKA.ad}</strong><span>${MARKA.slogan}</span></span>
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

// Sosyal medya ikonlari (footer'da her sayfada). YouTube/X hesaplari acilinca buraya eklenecek.
const SOCIAL = [
  ["Instagram", "https://www.instagram.com/konuttalebi/", '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="5.5"/><circle cx="12" cy="12" r="4.6"/><circle cx="17.6" cy="6.4" r="1.3" fill="currentColor" stroke="none"/></svg>']
];
function socialLinks() {
  return `<div class="social-links" style="display:inline-flex;gap:14px;align-items:center">${SOCIAL.map(([n, u, s]) => `<a href="${u}" target="_blank" aria-label="${n}" title="${n}" rel="noopener" style="color:inherit;opacity:.82;display:inline-flex">${s}</a>`).join("")}</div>`;
}

function footer() {
  return `
    <footer class="footer">
      <div class="footer-inner">
        <div>
          <a class="brand" href="#/home">
            <span class="brand-mark">${icon("key", 18)}</span>
            <span class="brand-text"><strong style="color:#fff">${MARKA.ad}</strong><span>${MARKA.slogan}</span></span>
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
      <div style="border-top:1px solid rgba(255,255,255,.12);margin-top:22px;padding-top:16px;color:#8ba3b8;font-size:13px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between"><span>${copyrightText()}</span>${socialLinks()}</div>
    </footer>
  `;
}

// Her sayfada gorunecek tescil/telif satiri (sirket unvaniyla).
function copyrightText() {
  return `© ${new Date().getFullYear()} Konuttalebi — ${COMPANY.unvan}. Tüm hakları saklıdır.`;
}
function copyrightBar() {
  return `<div class="copyright-bar" style="display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;justify-content:space-between"><span>${copyrightText()}</span>${socialLinks()}</div>`;
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
  // 2.0: ornek ILAN nesnesi kaldirildi — sitede arz yok, yalniz talep.
  const profile = { verificationLevel: "Bütçe beyanı: 6–8 milyon TL", badge: "blue", budgetTrustScore: 88 };
  return `
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-copy">
          <span class="eyebrow">${icon("shield", 15)} Türkiye'nin ilk alıcı ve kiracı odaklı emlak piyasası</span>
          <h1>Sen ne aradığını söyle, doğru mülk sahibiyle doğrudan buluş.</h1>
          <p>Ev almak veya kiralamak istiyorsan talebini bırak; evi sana uygun olanlar iletişim bilgini üyelikle görüntüler ve seni doğrudan arar. Aracı yok, komisyon yok.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:18px">
            <span style="font-size:13px;color:#334155;background:var(--soft-line);padding:6px 12px;border-radius:999px;font-weight:600">1 · Talebini bırak</span>
            <span style="font-size:13px;color:#334155;background:var(--soft-line);padding:6px 12px;border-radius:999px;font-weight:600">2 · Kriterine uyanlara duyurulur</span>
            <span style="font-size:13px;color:#334155;background:var(--soft-line);padding:6px 12px;border-radius:999px;font-weight:600">3 · Seni doğrudan ararlar</span>
          </div>
          <div class="hero-actions">
            <a class="btn btn-primary" href="#/talep-birak">${icon("key", 17)} Kiralık ev arıyorum</a>
            <a class="btn btn-secondary" href="/evine-kiraci-bul">${icon("home", 17)} Evime kiracı arıyorum</a>
            <a class="btn btn-secondary" href="#/talep-birak?tx=SALE">${icon("card", 17)} Ev almak istiyorum</a>
          </div>
          <div class="hero-trustline" style="display:flex;flex-wrap:wrap;gap:16px;margin-top:20px;color:var(--muted);font-weight:600;font-size:14px">
            <span>${icon("card", 15)} Belge istenmez</span>
            <span>${icon("lock", 15)} İletişim açık rızayla</span>
            <span>${icon("shield", 15)} Komisyon yok</span>
          </div>
        </div>
        <div class="hero-preview" aria-hidden="true">
          <div class="hero-card hero-card-main">
            <div class="sample-top">
              <span class="badge ${badgeForProfile(profile)}">${icon("shield", 13)} ${escapeHtml(profile.verificationLevel)}</span>
              <span class="pill">${profile.budgetTrustScore}/100 bütçe güveni</span>
            </div>
            <h3>${escapeHtml(sampleDemand.title)}</h3>
            <p>${escapeHtml(sampleDemand.city)} / ${escapeHtml(sampleDemand.district)} · ${escapeHtml(sampleDemand.roomCount)} · ${shortMoney(sampleDemand.minBudget)}-${shortMoney(sampleDemand.maxBudget)}</p>
            <div class="hero-progress"><span style="width:${profile.budgetTrustScore}%"></span></div>
          </div>
<!-- 2.0: ornek ILAN karti kaldirildi; yerine ikinci ornek TALEP karti. -->
          <div class="hero-card hero-card-main" style="opacity:.94">
            <div class="sample-top">
              <span class="badge badge-gold">Kiralık ev arıyor</span>
              <span class="pill">1 ay içinde taşınacak</span>
            </div>
            <h3>Nilüfer'de eşyalı 2+1 arıyorum</h3>
            <p>Bursa / Nilüfer · 2+1 · 20-30 bin ₺/ay</p>
          </div>
          <div class="hero-card hero-card-lock">
            <span class="brand-mark">${icon("lock", 18)}</span>
            <div>
              <strong>İletişim kilidi</strong>
              <p>Talep sahibinin telefonu ve e-postası yalnızca ücretli üyeler ve onaylı danışmanlar tarafından görüntülenir; her görüntülemede talep sahibine haber verilir.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
<!-- 2.0: "Yayindaki konutlar" bolumu kaldirildi - sitede artik ilan yok. -->
    <section class="band band-white">
      <div class="container">
        <div class="section-head">
          <div class="section-title">
            <div class="kicker">Talep havuzu</div>
            <h2>Ev satın almak isteyenleri gör, iletişime geç.</h2>
            <p class="lead">Ev almak isteyenlerin ve kiralık ev arayanların taleplerini il, ilçe ve kategoriye göre üye olmadan gez. Talep sahibinin iletişim bilgisini üyelikle aç, doğrudan ara.</p>
          </div>
        </div>
        <div class="search-filterbar" style="margin-top:6px">
          <select id="home-tx"><option value="SALE">Ev almak isteyenlerin talepleri</option><option value="RENT">Kiralık ev talepleri</option></select>
          <select id="home-cat"><option value="">Tüm kategoriler</option>${MAIN_CATEGORIES.map((c) => `<option>${escapeHtml(c)}</option>`).join("")}</select>
          <select id="home-city"><option value="">Tüm iller</option>${TR_ILLER.map((il) => `<option value="${escapeHtml(il.code)}">${escapeHtml(il.name)}</option>`).join("")}</select>
          <button class="btn btn-primary" onclick="KT.homeSearch()">${icon("search", 16)} Talepleri ara</button>
        </div>
        <div class="section-actions" style="margin-top:16px"><a class="btn btn-outline" href="#/talepler">${icon("search", 15)} Tüm talepleri gör</a></div>
      </div>
    </section>
    <section class="band band-soft">
      <div class="container">
        <div class="section-head">
          <div class="section-title">
            <div class="kicker">Kiralık Ev Arayanlar</div>
            <h2>Ne aradığını söyleyenler burada; iletişime geç, doğrudan anlaş.</h2>
            <p class="lead">Yayındaki gerçek talepler. Kimlik bilgileri gizli kalır; ihtiyaç özetini görür, üyelikle iletişim bilgisini açar, talep sahibini doğrudan ararsın.</p>
          </div>
        </div>
        <div id="home-demands" class="card-grid" style="margin-top:18px"><div class="empty" style="grid-column:1/-1"><b>Talepler yükleniyor…</b><span class="muted">Yayındaki talepler birazdan görünecek.</span></div></div>
        <div class="section-actions" style="margin-top:16px"><button class="btn btn-outline" onclick="KT.tumTalepler()">${icon("key", 15)} Tüm talepleri gör</button></div>
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
          <p>Konuttalebi'nde belge istenmez. Bütçe/kira aralığını ve tercihlerini beyan edersin; sistem seni uygun konutlarla eşleştirir. Üyelikle mülk sahibinin iletişim bilgisine ulaşır, fiyata ve pazarlığa karışmadan doğrudan anlaşırsın.</p>
          <div class="color-chip-row">
            <span class="color-chip chip-coral">Talep beyanı</span>
            <span class="color-chip chip-teal">Talebe özel bildirim</span>
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
            <h2>Talebini bırak; ev sahipleri ve danışmanlar seni arasın.</h2>
            <p class="lead">Havuzda herkes talebinin özetini görür; telefonunu ve e-postanı yalnızca ücretli üyeler ile onaylı emlak danışmanları görüntüleyebilir ve her görüntülemede sana haber veririz. Fiyata, kiraya veya pazarlığa karışmayız — doğrudan siz anlaşırsınız. <em style="opacity:.75">(Aşağıdaki kart temsili örnektir.)</em></p>
          </div>
        </div>
        <div class="product-strip">
          ${demandCard(sampleDemand, { sample: true, profile })}
          <article class="sample-card">
            <div class="sample-top">
              <span class="badge badge-blue">${icon("lock", 13)} Üye görünümü</span>
              <span class="badge badge-gold">Bireysel üye</span>
            </div>
            <div>
              <h3>İletişim bilgisini gör</h3>
              <p class="muted">Kriterine uyan talep yayına girince bildirim alırsın; kartta tek düğmeyle telefon ve e-posta açılır.</p>
            </div>
            <div class="pill-row">
              <span class="pill">0532 ··· ·· ··</span>
              <span class="pill">e-posta gizli</span>
              <span class="pill">Görüntüleme kayıt altında</span>
            </div>
            <p class="row-note">Teklif kartı, mesajlaşma veya onay bekleme yok: numarayı görür, doğrudan ararsın.</p>
          </article>
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
          ${featureCard("key", "Aradığın netleşir", "Bölge, bütçe ve ihtiyacını beyan et; talebin kriterine uyan ev sahipleri ve danışmanlara duyurulur.")}
          ${featureCard("card", "Belge değil, beyan", "Belge yüklemezsin; bütçe/kira aralığı, peşinat ve zaman tercihini beyan edersin.")}
          ${featureCard("lock", "İletişim üyelikle açılır", "Talep sahibinin telefon ve e-postası yalnızca ücretli üyeler ve onaylı danışmanlar tarafından görüntülenir; her görüntülemede talep sahibine haber verilir.")}
          ${featureCard("chart", "Kriterine uyan talep", "Üyeler il, kiralık/satın alma, kategori ve bütçe kriterini kaydeder; uyan talep yayına girince bildirim alır.")}
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
            <p class="lead">Sana uygun akışı seç: talebini oluştur, sistem seni eşleştirsin; üyelikle iletişim bilgisine ulaşıp doğrudan anlaşın. Emlak danışmanıysan profesyonel paketle tüm portföyünü yönet.</p>
          </div>
        </div>
        <div class="grid grid-2 role-areas">
          <article class="card role-area">
            <span class="role-ic role-ic-blue">${icon("key", 26)}</span>
            <h3>Ev Al</h3>
            <p>Satın almak istediğin evi tarif et, talebini bırak; evine alıcı arayanlar ve onaylı danışmanlar iletişim bilgini görüntüleyip seni doğrudan arasın. Belge istenmez, sadece bütçe beyanı. Tamamen ücretsiz.</p>
            <ul class="role-points"><li>Bütçe aralığı ve peşinat beyanı</li><li>Talebin kriterine uyan üyelere duyurulur</li><li>Seni doğrudan ararlar</li></ul>
            <button class="btn btn-primary" onclick="KT.startRegistration('buyer','SALE')">${icon("key", 16)} Ev Al — talep oluştur</button>
          </article>
          <article class="card role-area">
            <span class="role-ic role-ic-blue">${icon("key", 26)}</span>
            <h3>Ev Kirala</h3>
            <p>Kiralamak istediğin evi tarif et, talebini bırak; ev sahipleri iletişim bilgini görüntüleyip seni doğrudan arasın. Tamamen ücretsiz.</p>
            <ul class="role-points"><li>Aylık kira aralığı ve eşyalı tercihi</li><li>Talebin kriterine uyan üyelere duyurulur</li><li>Ev sahibi seni doğrudan arar</li></ul>
            <button class="btn btn-primary" onclick="KT.startRegistration('buyer','RENT')">${icon("key", 16)} Ev Kirala — talep oluştur</button>
          </article>
          <article class="card role-area">
            <span class="role-ic role-ic-teal">${icon("home", 26)}</span>
            <h3>Evine Alıcı Bul</h3>
            <p>Evine uygun konut alıcılarının taleplerini gör; uygun alıcının iletişim bilgisine üyelikle ulaş, doğrudan görüş. İlan vermezsin, alıcıyı sen seçersin.</p>
            <ul class="role-points"><li>Konut alıcılarının taleplerini gör</li><li>Alıcı kriterini kaydet, bildirim al</li><li>Alıcıya doğrudan ulaş</li></ul>
            <button class="btn btn-primary" onclick="KT.startRegistration('seller','SALE')">${icon("home", 16)} Konut alıcılarının taleplerini gör</button>
          </article>
          <article class="card role-area">
            <span class="role-ic role-ic-gold">${icon("home", 26)}</span>
            <h3>Evini Kirala</h3>
            <p>Kiraya vereceğin eve uygun kiracı taleplerini gör; uygun kiracının iletişim bilgisine üyelikle ulaş, doğrudan anlaş. Fiyata biz karışmayız.</p>
            <ul class="role-points"><li>Uygun kiracı taleplerini gör</li><li>Kiracı kriterini kaydet, bildirim al</li><li>Doğrudan kiracıyla iletişim</li></ul>
            <button class="btn btn-primary" onclick="KT.startRegistration('seller','RENT')">${icon("home", 16)} Evini Kirala — kiracı taleplerini gör</button>
          </article>
          <article class="card role-area" style="grid-column:1/-1">
            <span class="role-ic role-ic-gold">${icon("chart", 26)}</span>
            <h3>Emlak Danışmanı</h3>
            <p>Alıcı ve kiracı taleplerinin tamamına profesyonel üyelikle ulaş; ilan peşinde koşma, hazır talebe çalış. Sorumlu Emlak Danışmanı (Seviye 5) belgesiyle onaylanırsın.</p>
            <ul class="role-points"><li>Tüm talep havuzuna sınırsız erişim</li><li>Kriter kaydet, uyan talepte bildirim al</li><li>Onaylı danışman rozeti</li></ul>
            <button class="btn btn-primary" onclick="KT.startRegistration('agent')">${icon("chart", 16)} Danışman üyeliğiyle başla</button>
          </article>
        </div>
      </div>
    </section>
    <section class="band band-white">
      <div class="container">
        <div class="section-head">
          <div class="section-title">
            <div class="kicker">Nasıl işliyor?</div>
            <h2>Talebini bırakmandan aranmana kadar güvenli ve adım adım.</h2>
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
    [illus1, "Talebini oluştur", "Şehir, ilçe, bütçe/kira, oda, m2 ve zaman belirlenir; e-posta doğrulamasıyla yayına girer."],
    [illus2, "Talebin duyurulur", "Kriterine uyan ev sahipleri, evine alıcı arayanlar ve onaylı danışmanlar talebinden haberdar olur. Kimliğin havuzda gizli kalır."],
    [illus3, "Üyelikle iletişim açılır", "Ücretli üye veya onaylı danışman, talep sahibinin telefon ve e-postasını görüntüler; her görüntülemede talep sahibine haber verilir."],
    [illus4, "Doğrudan anlaş", "Fiyata, pazarlığa veya sözleşmeye karışmayız; şartları doğrudan siz belirlersiniz."]
  ];
  return `<div class="grid grid-4 how-steps">${steps.map(([svg, title, body], i) => `<article class="card how-step"><div class="how-illus">${svg}</div><span class="badge badge-gold">${i + 1}. adım</span><h3 style="margin-top:10px">${title}</h3><p>${body}</p></article>`).join("")}</div>`;
}

function demandCard(demand, options = {}) {
  // options.profile: temsili orneklerde ayni profili paylasmak icin (ana sayfa vitrini)
  const profile = options.profile || buyerProfile(demand.buyerId);
  const score = profile.budgetTrustScore || 40;
  return `
    <article class="${options.sample ? "sample-card" : "row-card"}">
      ${options.sample ? "" : (demand.imageData ? `<div class="thumb"><img class="thumb-img" src="${demand.imageData}" alt=""></div>` : `<div class="thumb">${icon("key", 28)}</div>`)}
      <div>
        ${options.profile ? `<div class="sample-top">
          <span class="badge ${badgeForProfile(profile)}">${icon("shield", 13)} ${escapeHtml(profile.verificationLevel)}</span>
          <span class="pill">${score}/100 bütçe güveni</span>
        </div>` : `<div class="sample-top">${txPill(demand)}</div>`}
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
      ${options.sample ? "" : `<div class="row-side"><button class="btn btn-small btn-primary" onclick="KT.iletisimGor('${demand.id}')">İletişim bilgisini gör</button></div>`}
    </article>
  `;
}

// [Faz 5] propertyOfferSample silindi - 2.0 sonrasi erisilemeyen eski akis.


function registerFlowInfo(sel) {
  // 2.0: sitede ilan yok; uyelerin isi talep havuzunu izlemek ve iletisim acmak.
  if (sel === "agent") return { label: "Emlak danışmanı", steps: [
    "Kaydını oluştur; danışman üyeliğinle talep havuzunun tamamına erişirsin.",
    "Aradığın talebin kriterini kaydet; uyan talep yayına girince bildirim al.",
    "Talep sahibinin iletişim bilgisini gör, doğrudan ara; görüşmeyi siz yürütürsünüz."
  ]};
  if (sel === "landlord") return { label: "Ev sahibi", steps: [
    "Kaydını oluştur; kiralık ev arayanların taleplerini filtrele.",
    "Evine uygun kiracı kriterini kaydet; uyan talep gelince haber al.",
    "Üyelikle kiracının iletişim bilgisine ulaş; kirayı ve şartları doğrudan siz belirlersiniz."
  ]};
  if (sel === "seller") return { label: "Evine alıcı arayan", steps: [
    "Kaydını oluştur; ev almak isteyenlerin taleplerini filtrele.",
    "Evine uygun alıcı kriterini kaydet; uyan talep gelince haber al.",
    "Üyelikle alıcının iletişim bilgisine ulaş; doğrudan görüşüp anlaşırsın."
  ]};
  if (sel === "tenant") return { label: "Kiracı", steps: [
    "Kiralık talebini oluştur; bölge, aylık kira aralığı, oda ve eşyalı tercihini belirt.",
    "Talebin doğrulamadan sonra yayına girer; kriterine uyan üyelere duyurulur.",
    "İletişim bilgini görüntüleyen üyeler seni doğrudan arar; her görüntülemede sana haber veririz."
  ]};
  return { label: "Konut alıcısı", steps: [
    "Talebini oluştur; bölge, bütçe aralığı, oda ve tercihlerini belirt (belge istenmez).",
    "Talebin doğrulamadan sonra yayına girer; kriterine uyan üyelere duyurulur.",
    "İletişim bilgini görüntüleyen üyeler seni doğrudan arar; her görüntülemede sana haber veririz."
  ]};
}
// Kayit sayfasinin sag sutunundaki gorsel. Rol degistikce degisir ki
// kullanici dogru akista oldugunu anlasin. Gorseller assets/ altinda mevcut.
const REG_GORSEL = {
  buyer: { src: "/assets/property-residence.webp", alt: "Konut görseli", not: "Talebini bırak, ev sahipleri seni arasın." },
  tenant: { src: "/assets/property-apartment.webp", alt: "Kiralık daire görseli", not: "Ev arama, ev sahipleri seni bulsun." },
  seller: { src: "/assets/property-villa.webp", alt: "Konut görseli", not: "Hazır konut alıcısı taleplerine ulaş." },
  landlord: { src: "/assets/property-apartment.webp", alt: "Kiralık konut görseli", not: "Evine uygun kiracıyı sen seç." },
  agent: { src: "/assets/hero-konuttalebim.webp", alt: "Emlak danışmanı görseli", not: "Gerçek taleplerle çalış, ilanla değil." },
};

function regAsideHTML(sel) {
  const flow = registerFlowInfo(sel);
  const g = REG_GORSEL[sel] || REG_GORSEL.buyer;
  return `
    <figure style="margin:0 0 18px;position:relative;border-radius:12px;overflow:hidden;box-shadow:0 12px 30px rgba(16,36,58,.14)">
      <img src="${escapeAttr(g.src)}" alt="${escapeAttr(g.alt)}" loading="lazy" decoding="async"
           style="display:block;width:100%;height:200px;object-fit:cover">
      <figcaption style="position:absolute;inset:auto 0 0 0;padding:14px 16px;color:#fff;font-size:14.5px;font-weight:600;
                         background:linear-gradient(to top,rgba(10,24,38,.82),rgba(10,24,38,0))">
        ${escapeHtml(g.not)}
      </figcaption>
    </figure>
    <span class="badge badge-blue">${icon("shield", 13)} ${flow.label} üyeliği</span>
    <h3>Nasıl çalışır?</h3>
    <ol style="list-style:none;margin:14px 0 0;padding:0;display:grid;gap:12px">
      ${flow.steps.map((s, i) => `<li style="display:flex;gap:10px;align-items:flex-start"><span style="flex:0 0 26px;height:26px;border-radius:8px;background:var(--navy,#10243a);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px">${i + 1}</span><span style="color:#33475b;font-size:14.5px;line-height:1.45">${s}</span></li>`).join("")}
    </ol>
    <p style="font-size:14px;margin-top:16px">Zaten üyeysen <a href="#/giris">giriş yap</a>.</p>`;
}

/* ==========================================================================
   IZIN BLOGU (2026-07-30 KVKK yapisi)
   --------------------------------------------------------------------------
   Uc kayit formunda da AYNI blok kullanilir; kopyalanirsa metinler zamanla
   birbirinden ayrilir ve ayni site iki farkli riza toplamis olur.

   Yapinin hukuki mantigi (Kurul'un aydinlatma/riza ayrimi karari):
   - Kullanim Kosullari = SOZLESME -> kutu var, zorunlu.
   - KVKK Aydinlatma + Cerez = BILGILENDIRME -> kutu YOK, yalnizca baglanti.
     Eski halde "KVKK metnini kabul ediyorum" yazdiriliyordu; aydinlatma
     onaylatilan bir belge degildir, bu duzeltildi.
   - Uc istege bagli acik riza: isaretsiz baslar, hicbiri hizmetin sarti
     degildir. "Tumunu sec" sag ustte belirgin bir dugmedir (Okan karari);
     yalnizca istege bagli kutulari isaretler, zorunlulara dokunmaz.
   - Is ortaklari kutusu alicilari ADIYLA sayar; "ve benzeri" gibi acik uclu
     ifade KULLANILMAZ (battaniye riza gecersizlik riski). TCKN bu kapsamda
     aktarilmaz - bu cumle kutunun icinde acikca yazilidir.
   ========================================================================== */
function izinBloguHTML(pre) {
  return `
    <div class="field full">
      <label class="check"><input id="${pre}-terms" type="checkbox"><span style="font-weight:500;line-height:1.55"><a href="#/kullanim-sartlari" target="_blank">Kullanım Koşulları</a>'nı okudum ve kabul ediyorum. Talep bırakırsam ad, telefon ve e-posta bilgilerimin, benimle iletişime geçmeleri amacıyla ücretli üyeler ve onaylı emlak danışmanları tarafından görüntülenebileceğini biliyorum; her görüntülemede bana haber verilir. <span style="color:#c0392b">*</span></span></label>
    </div>
    <div class="field full">
      <div class="notice" style="margin:0;font-size:13px">
        Kişisel verilerinin nasıl işlendiğine dair bilgilendirme:
        <a href="#/kvkk" target="_blank">KVKK Aydınlatma Metni</a> ·
        <a href="#/cerez-politikasi" target="_blank">Çerez Politikası</a>
      </div>
    </div>
    <div class="field full" style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:-6px">
      <span class="muted" style="font-size:12.5px;text-transform:uppercase;letter-spacing:.04em">İsteğe bağlı izinler — işaretlemeden de üye olursun</span>
      <button type="button" id="${pre}-izin-tumu" class="btn btn-small btn-outline" style="flex:none" onclick="KT.izinTumunuSec('${pre}')">Tümünü seç</button>
    </div>
    <div class="field full">
      <label class="check"><input id="${pre}-personalization" type="checkbox" class="${pre}-izin"><span style="font-weight:500;line-height:1.55">Pazarlama ve kişiselleştirme. Kimlik, iletişim, talep ve tercih bilgilerimin; Konuttalebi'nin gayrimenkul, konut projeleri, finansman ve konutla bağlantılı ürün ve hizmetlerinin tanıtılması, bana özel tekliflerin oluşturulması ve tercihlerin analiz edilmesi amacıyla işlenmesine açık rıza veriyorum. <span class="muted" style="font-weight:400">(İsteğe bağlı)</span></span></label>
    </div>
    <div class="field full">
      <label class="check"><input id="${pre}-partner" type="checkbox" class="${pre}-izin"><span style="font-weight:500;line-height:1.55">İş ortaklarına aktarım. İletişim ve konut talep/tercih bilgilerimin; kredi teklifi için bankalara, katılım bankalarına ve yetkili finansman kuruluşlarına; proje tanıtımı ve teklif için konut projesi geliştiren firmalara; konut, DASK ve eşya sigortası teklifi için sigorta şirketleri ve yetkili acentelerine; taşınma teklifi için nakliyat firmalarına; abonelik teklifleri için elektrik, doğalgaz ve internet sağlayıcılarına aktarılmasına açık rıza veriyorum. T.C. kimlik numaram bu kapsamda aktarılmaz. <a href="#/kvkk" target="_blank">Tam metin</a> <span class="muted" style="font-weight:400">(İsteğe bağlı)</span></span></label>
    </div>
    <div class="field full">
      <label class="check"><input id="${pre}-marketing" type="checkbox" class="${pre}-izin"><span style="font-weight:500;line-height:1.55">Ticari elektronik ileti. Konuttalebi'nin kampanya, fırsat ve duyuruları hakkında bana e-posta, SMS, telefon araması ve mobil bildirim yoluyla ileti göndermesini onaylıyorum. <span class="muted" style="font-weight:400">(İsteğe bağlı)</span></span></label>
    </div>`;
}

// Formdan uc iznin degerini okur; kayit uclarina gonderilecek govdeye eklenir.
function izinDegerleri(pre) {
  const oku = (id) => { const e = document.getElementById(id); return e ? e.checked : false; };
  return {
    personalizationConsent: oku(`${pre}-personalization`),
    partnerTransferConsent: oku(`${pre}-partner`),
    marketingConsent: oku(`${pre}-marketing`),
  };
}

function authRegisterPage(roleKey = "buyer") {
  const base = ["buyer", "seller", "agent"].includes(roleKey) ? roleKey : "buyer";
  const selectedRole = base === "agent" ? "agent"
    : base === "seller" ? (uiTxMode === "RENT" ? "landlord" : "seller")
    : (uiTxMode === "RENT" ? "tenant" : "buyer");
  const roleOptions = [
    ["buyer", "Konut alıcısı"],
    ["tenant", "Kiracı"],
    ["seller", "Evine alıcı arayan"],
    ["landlord", "Ev sahibi"],
    ["agent", "Emlak danışmanı"]
  ];
  const smsAcik = Boolean(state.config && state.config.smsVerification);
  const bugun = new Date().toISOString().slice(0, 10);
  const illerSecenek = TR_ILLER.length
    ? TR_ILLER.map((il) => `<option value="${escapeAttr(il.name)}">${escapeHtml(il.name)}</option>`).join("")
    : ["İstanbul", "Ankara", "İzmir", "Eskişehir", "Bursa", "Antalya"].map((c) => `<option>${c}</option>`).join("");

  return publicShell("Üyelik oluştur", "İki kısa adımda hesabını aç; panelin rolüne göre hazırlanır.", `
    <div class="auth-layout">
      <form class="panel auth-panel" onsubmit="KT.register(event)">

        <div class="reg-steps" style="display:flex;gap:8px;margin-bottom:18px">
          <div id="reg-tab-1" class="reg-step reg-step-on">1 · Kimlik ve iletişim</div>
          <div id="reg-tab-2" class="reg-step">2 · Kısa profil</div>
        </div>

        <div id="reg-step-1">
          <div class="form-grid">
            ${field("Ad soyad / firma adı", "r-name", "text", "Ad Soyad")}
            <div class="field">
              <label for="r-role">Üyelik tipi</label>
              <select id="r-role" onchange="KT.onRegRoleChange()">
                ${roleOptions.map(([value, label]) => `<option value="${value}" ${value === selectedRole ? "selected" : ""}>${label}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="r-tckn">T.C. kimlik numarası</label>
              <input id="r-tckn" type="text" inputmode="numeric" maxlength="11" placeholder="11 hane"
                     autocomplete="off" oninput="KT.tcknFormat(this)">
              <span id="r-tckn-hint" class="muted" style="font-size:12.5px"></span>
            </div>
            <div class="field">
              <label for="r-birth">Doğum tarihi</label>
              <input id="r-birth" type="date" max="${bugun}">
            </div>
            <div class="field">
              <label for="r-phone">Telefon</label>
              <div style="display:flex;gap:8px;align-items:stretch">
                <span style="display:flex;align-items:center;padding:0 12px;background:#f1f5f9;border:1px solid #dde4ec;border-radius:10px;font-weight:600;color:#41556d">+90</span>
                <input id="r-phone" type="tel" inputmode="numeric" maxlength="13" placeholder="5xx xxx xx xx"
                       style="flex:1" oninput="KT.phoneFormat(this)">
              </div>
            </div>
            ${smsAcik ? `
            <div class="field">
              <label for="r-sms">SMS onay kodu</label>
              <div style="display:flex;gap:8px">
                <input id="r-sms" type="text" inputmode="numeric" maxlength="6" placeholder="6 hane" style="flex:1;letter-spacing:.25em;text-align:center">
                <button type="button" class="btn btn-outline" id="r-sms-btn" onclick="KT.regSendSms()">Kod gönder</button>
              </div>
              <span id="r-sms-hint" class="muted" style="font-size:12.5px"></span>
            </div>` : ""}
            ${field("E-posta", "r-email", "email", "ornek@eposta.com")}
            <div class="field">
              <label for="r-password">Şifre</label>
              <input id="r-password" type="password" placeholder="En az 8 karakter" oninput="KT.sifreGucu(this)">
              <span id="r-pw-hint" class="muted" style="font-size:12.5px">En az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam.</span>
            </div>
            ${field("Şifre tekrar", "r-password2", "password", "Şifreni tekrar yaz")}

            <div class="field full">
              <div class="notice" style="margin:0">
                <strong>Kimlik bilgin neden isteniyor?</strong> Sahte üyeliği önlemek ve eşleşen tarafların gerçek kişiler olduğundan emin olmak için.
                Numaran <strong>şifreli</strong> saklanır, panelde bile maskeli görünür (123******01), hiçbir kullanıcıyla paylaşılmaz.
                Ayrıntı: <a href="#/kvkk" target="_blank">KVKK Aydınlatma Metni</a>.
              </div>
            </div>
            <div class="field full">
              <label class="check"><input id="r-identity-consent" type="checkbox"><span style="font-weight:500;line-height:1.55">T.C. kimlik numaramın ve doğum tarihimin, kimlik doğrulama ve sahte üyelik önleme amacıyla işlenmesine açık rıza veriyorum. <span class="muted" style="font-weight:400">(Kimlik alanlarını doldurduysan gerekli)</span></span></label>
            </div>
          </div>
          <div id="r-error" class="error"></div>
          <div class="form-actions">
            <button type="button" class="btn btn-primary" onclick="KT.regNext()">Devam et ${icon("send", 15)}</button>
            <a class="btn btn-outline" href="#/giris">Zaten üyeyim</a>
          </div>
          ${googleAuthBlock("Google ile üye ol")}
        </div>

        <div id="reg-step-2" style="display:none">
          <div class="form-grid">
            <div class="field">
              <label for="r-income">Aylık gelir</label>
              <select id="r-income">
                <option value="">Seçiniz</option>
                ${GELIR_ARALIKLARI.map((g) => `<option>${escapeHtml(g)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="r-occupation">Meslek</label>
              <select id="r-occupation">
                <option value="">Seçiniz</option>
                ${Object.entries(MESLEK_GRUPLARI).map(([grup, liste]) => `
                  <optgroup label="${escapeAttr(grup)}">${liste.map((m) => `<option>${escapeHtml(m)}</option>`).join("")}</optgroup>`).join("")}
              </select>
            </div>
            <div class="field full">
              <label for="r-city">Yaşadığın il</label>
              <select id="r-city">${illerSecenek}</select>
            </div>
            <div class="field full">
              <div class="notice" style="margin:0">
                Gelir ve meslek beyanın <strong>karşı tarafa gösterilmez</strong>; yalnızca sana uygun konut ve talepleri
                daha isabetli eşleştirmek için kullanılır. Boş bırakabilirsin.
              </div>
            </div>
            ${izinBloguHTML("r")}
          </div>
          <div id="r-error2" class="error"></div>
          <div class="form-actions">
            <button type="button" class="btn btn-outline" onclick="KT.regBack()">Geri</button>
            <button class="btn btn-primary" type="submit">${icon("check", 16)} Üyeliği oluştur</button>
          </div>
        </div>

      </form>
      <aside class="auth-side" id="reg-aside">${regAsideHTML(selectedRole)}</aside>
    </div>
  `);
}


// Telefon dogrulama ekrani. Kayit sonrasi ILK islemden once bir kez gorunur.
// E-posta dogrulanmadan panele girilemez. Duvar ekrani: cikis ve tekrar
// gonderme disinda bir sey yapilamaz. ADMIN muaftir (yonetici kilitlenmesin).
function emailWallPage() {
  const u = currentUser();
  if (!u) { location.hash = "/giris"; return ""; }
  const kalan = epostaKalanSaat(u);
  // Sure dolumu nedeniyle askiya alinmis hesap: durumu acikca yaz, cozumu goster.
  const askida = Boolean(u.autoSuspendedAt);
  return publicShell(askida ? "Üyeliğin askıya alındı" : "E-postanı doğrula",
    askida ? "Askıyı kaldırmak için e-postanı doğrulaman yeterli." : "Üyeliğini kullanmaya başlamadan önce tek bir adım kaldı.", `
    <div class="auth-layout auth-layout-narrow">
      <div class="panel auth-panel" style="text-align:center">
        <div style="font-size:44px;line-height:1;margin-bottom:10px">${askida ? "&#9888;&#65039;" : "&#128231;"}</div>
        <h3 style="margin:0 0 10px;font-size:21px">${askida ? "Üyeliğin askıya alındı" : "E-postanı doğrulaman gerekiyor"}</h3>
        ${askida ? `<div class="notice" style="text-align:left;margin:0 0 14px;background:#fdf3e3;border-color:#e6c882">
          E-posta adresini süresi içinde doğrulamadığın için üyeliğin askıya alındı.
          <strong>Verilerin duruyor</strong> — taleplerinin hiçbiri silinmedi.
          Aşağıdan yeni bağlantı iste ve tıkla; hesabın <strong>anında</strong> yeniden açılır.
        </div>` : ""}
        <p class="muted" style="margin:0 0 6px;line-height:1.6">
          <strong>${escapeHtml(u.email || "")}</strong> adresine bir doğrulama bağlantısı gönderdik.
          Bağlantıya tıkladığında hesabın açılır.
        </p>
        ${kalan !== null ? `<p class="muted" style="margin:0 0 16px;font-size:13.5px">
          ${kalan > 0 ? `Bağlantı <strong>${kalan} saat</strong> daha geçerli.` : "Bağlantının süresi doldu; aşağıdan yenisini iste."}
        </p>` : ""}
        <div class="notice" style="text-align:left;margin:0 0 16px">
          Gelen kutunda göremiyorsan <strong>spam / gereksiz</strong> klasörüne bak.
          Adresin yanlışsa çıkış yapıp doğru adresle yeniden üye olabilirsin.
        </div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="KT.epostaTekrarGonder()">${icon("mail", 16)} Bağlantıyı tekrar gönder</button>
          <button class="btn btn-outline" onclick="KT.checkVerified()">Doğruladım, kontrol et</button>
          <button class="btn btn-outline" onclick="KT.logout()">Çıkış yap</button>
        </div>
      </div>
    </div>`);
}

/* ==========================================================================
   MISAFIR TALEP AKISI  (#/talep-birak)
   --------------------------------------------------------------------------
   NEDEN VAR: Eski akista kiraci "talep birak" deyince once GIRIS ekraniyla
   karsilasiyordu — hesabi olmayan, siteyi ilk kez goren biri icin kapali kapi.
   Reklam trafiginin neredeyse tamami buradan geri donuyordu.

   BU AKISTA SIRA TERSTIR: kisi once aradigi evi tarif eder (7 soru), sonra
   kendini tanitir, uyelik o anda kendiliginden olusur. Talep gonderim aninda
   sunucuya kaydedilir; boylece "kod gelmedi, form uctu" durumu imkansizdir.

   Sayfa arama motorlarina KAPALI ve menude gorunmez — reklam inis sayfasidir.
   Organik trafik eski akista kalir ki ikisi karsilastirilabilsin.
   ========================================================================== */
let misafirAdim = 1;
let misafirVeri = {};          // 1. adimda toplanan form verisi
// Faz 4: ayni misafir form iki modda — RENT (varsayilan) ve SALE (Ev Al).
function misafirTx() {
  try { if (new URLSearchParams(location.hash.split("?")[1] || "").get("tx") === "SALE") return "SALE"; } catch {}
  return "RENT";
}
let misafirSonuc = null;       // { email } — gonderim basarili olunca dolar
let misafirKisi = {};          // 2. adimdaki kisisel alanlar (geri donusta korunur)
let misafirOlayGitti = false;  // "form basladi" olayi bir kez gonderilsin

function guestDemandPage() {
  // Giris yapmis kullanici bu sayfaya dusmesin; kendi panelinden devam etsin.
  if (isSignedIn()) {
    const u = currentUser();
    if (u && u.role === "BUYER") { location.hash = "/dashboard/alici/talep-olustur"; return ""; }
  }
  if (misafirSonuc) return guestDemandSentScreen();
  return misafirAdim === 1 ? guestDemandStep1() : guestDemandStep2();
}

function guestAdimCubugu(aktif) {
  const kutu = (no, etiket) => {
    const durum = aktif === no ? "reg-step reg-step-on" : (no < aktif ? "reg-step reg-step-done" : "reg-step");
    return `<div class="${durum}"><span>${no}</span> ${etiket}</div>`;
  };
  return `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px">
    ${kutu(1, "Aradığın ev")}${kutu(2, "Talebini yayına al")}</div>`;
}

function guestDemandStep1() {
  const v = misafirVeri;
  const satis = misafirTx() === "SALE";
  return publicShell(satis ? "Nasıl bir ev almak istiyorsun?" : "Nasıl bir ev arıyorsun?",
    "Üye olmadan doldur. Talebini yayına alırken tanışırız.", `
    <div class="panel" style="max-width:760px;margin:0 auto">
      ${guestAdimCubugu(1)}
      <form class="form-grid" onsubmit="KT.misafirDevam(event)" oninput="KT.misafirFormBasladi()">
        ${locationFields("g", true)}
        <div class="field"><label for="g-type">Ev tipi</label>
          <select id="g-type">${CATEGORY_TREE[CAT_KONUT].map((t) => `<option ${v.propertyType === t ? "selected" : ""}>${escapeHtml(t)}</option>`).join("")}</select></div>
        <div class="field"><label for="g-rooms">Oda sayısı</label>
          <select id="g-rooms">${["1+1", "2+1", "3+1", "4+1", "5+1"].map((r) => `<option ${v.roomCount === r ? "selected" : ""}>${r}</option>`).join("")}</select></div>
        <div class="field"><label for="g-minbudget">${satis ? "En az bütçe" : "En az aylık kira"} <span style="color:#c0392b">*</span></label>
          <input id="g-minbudget" type="number" inputmode="numeric" placeholder="${satis ? "4000000" : "20000"}" value="${escapeAttr(v.minBudget || "")}"></div>
        <div class="field"><label for="g-maxbudget">${satis ? "En fazla bütçe" : "En fazla aylık kira"} <span style="color:#c0392b">*</span></label>
          <input id="g-maxbudget" type="number" inputmode="numeric" placeholder="${satis ? "6000000" : "30000"}" value="${escapeAttr(v.maxBudget || "")}"></div>
        <div class="field"><label for="g-timeline">Ne zaman taşınmak istiyorsun?</label>
          <select id="g-timeline">${["Hemen", "1 ay içinde", "3 ay içinde", "6 ay içinde", "Fırsat olursa"].map((t) => `<option ${v.purchaseTimeline === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
        <div class="field"><label for="g-occupation">Meslek / çalışma durumu</label>
          <select id="g-occupation">${MESLEK_DURUMLARI.map((m) => `<option ${v.occupation === m ? "selected" : ""}>${escapeHtml(m)}</option>`).join("")}</select></div>
        ${satis ? `<div class="field full">
          <label style="font-weight:600">Banka kredisi kullanmayı düşünüyor musun? <span style="color:#c0392b">*</span></label>
          <div style="display:flex;gap:16px;margin-top:6px">
            <label class="check" style="margin:0"><input type="radio" name="g-kredi" value="EVET" ${v.creditInterest === "EVET" ? "checked" : ""}><span style="font-weight:500">Evet</span></label>
            <label class="check" style="margin:0"><input type="radio" name="g-kredi" value="HAYIR" ${v.creditInterest === "HAYIR" ? "checked" : ""}><span style="font-weight:500">Hayır</span></label>
          </div>
        </div>` : `<div class="field full">
          <label class="check"><input id="g-furnished" type="checkbox" ${v.furnished ? "checked" : ""}><span style="font-weight:500">Eşyalı olsun</span></label>
        </div>`}
        <div id="g-error" class="form-error"></div>
        <div class="field full" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          <button class="btn btn-primary" type="submit">Devam et ${icon("send", 16)}</button>
          <a class="btn btn-outline" href="#/giris">Zaten üyeyim</a>
        </div>
        <p class="muted full" style="font-size:13px;margin:0">
          ${misafirTx() === "SALE" ? "Alıcı" : "Kiracı"} için tamamen ücretsiz. Komisyon yok. İletişim bilgin, sen onaylamadan kimseye gösterilmez.
        </p>
      </form>
    </div>`);
}

function guestDemandStep2() {
  const k = misafirKisi || {};
  return publicShell("Talebini yayına al",
    "Son adım. Ev sahipleri seni bu bilgilerle bulacak.", `
    <div class="panel" style="max-width:640px;margin:0 auto">
      ${guestAdimCubugu(2)}
      <div class="notice" style="margin:0 0 16px">
        <strong>Talebin hazır.</strong> ${escapeHtml(misafirOzetMetni())}
        <button class="btn btn-small btn-outline" style="margin-left:8px" onclick="KT.misafirGeri()">Değiştir</button>
      </div>
      <form class="form-grid" onsubmit="KT.misafirGonder(event)">
        <div class="field full"><label for="g-name">Ad Soyad <span style="color:#c0392b">*</span></label>
          <input id="g-name" type="text" autocomplete="name" placeholder="Adın ve soyadın" value="${escapeAttr(k.name || "")}"></div>
        <div class="field full"><label for="g-email">E-posta <span style="color:#c0392b">*</span></label>
          <input id="g-email" type="email" autocomplete="email" inputmode="email" placeholder="ornek@eposta.com" value="${escapeAttr(k.email || "")}">
          <span class="muted" style="font-size:12.5px">Talebini yayına almak için buraya bir onay bağlantısı göndereceğiz.</span></div>
        <div class="field full"><label for="g-phone">Cep telefonu <span style="color:#c0392b">*</span></label>
          <div style="display:flex;gap:8px;align-items:stretch">
            <span style="display:flex;align-items:center;padding:0 12px;border:1px solid #dde4ec;border-radius:8px;background:#f5f8fb;font-weight:600">+90</span>
            <input id="g-phone" type="tel" autocomplete="tel" inputmode="numeric" placeholder="5xx xxx xx xx" oninput="KT.phoneFormat(this)" style="flex:1" value="${escapeAttr(k.phone || "")}">
          </div>
          <span class="muted" style="font-size:12.5px">Yalnızca sen onayladıktan sonra karşı tarafa gösterilir.</span></div>
        <div class="field"><label for="g-tckn">T.C. Kimlik No <span style="color:#c0392b">*</span></label>
          <input id="g-tckn" type="text" inputmode="numeric" placeholder="11 haneli" oninput="KT.tcknFormat(this,'g-tckn-hint')" value="${escapeAttr(k.tckn || "")}">
          <span id="g-tckn-hint" class="muted" style="font-size:12.5px"></span></div>
        <div class="field"><label for="g-birth">Doğum tarihi <span style="color:#c0392b">*</span></label>
          <input id="g-birth" type="date" value="${escapeAttr(k.birth || "")}" max="${escapeAttr(new Date(Date.now() - 18 * 365.25 * 864e5).toISOString().slice(0, 10))}"></div>
        <div class="field full"><label for="g-password">Şifre <span style="color:#c0392b">*</span></label>
          <input id="g-password" type="password" autocomplete="new-password" placeholder="En az 8 karakter" oninput="KT.sifreGucu(this,'g-password-guc')">
          <div id="g-password-guc" class="muted" style="font-size:12.5px;margin-top:4px">En az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam.</div></div>

        <div class="field full" style="background:#f5f8fb;border-radius:10px;padding:12px;font-size:13px;line-height:1.6" class="muted">
          <strong>Kimlik bilgin neden isteniyor?</strong> Sahte üyeliği önlemek ve eşleşen tarafların gerçek kişiler
          olduğundan emin olmak için. Numaran <strong>şifreli</strong> saklanır, yönetim panelinde bile maskeli görünür
          (123******01) ve <strong>hiçbir kullanıcıyla paylaşılmaz</strong>. Ayrıntı: <a href="#/kvkk" target="_blank">KVKK Aydınlatma Metni</a>.
        </div>
        <div class="field full">
          <label class="check"><input id="g-identity-consent" type="checkbox"><span style="font-weight:500;line-height:1.55">T.C. kimlik numaramın ve doğum tarihimin, kimlik doğrulama ve sahte üyelik önleme amacıyla işlenmesine açık rıza veriyorum. <span style="color:#c0392b">*</span></span></label>
        </div>
        ${izinBloguHTML("g")}
        <div id="g-error2" class="form-error"></div>
        <div class="field full" style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-primary" type="submit" id="g-submit">Talebimi yayına al</button>
          <button class="btn btn-outline" type="button" onclick="KT.misafirGeri()">Geri</button>
        </div>
      </form>
    </div>`);
}

function guestDemandSentScreen() {
  const mail = (misafirSonuc && misafirSonuc.email) || "";
  return publicShell("Son bir adım kaldı", "Talebin kaydedildi; e-postanı onaylayınca yayına giriyor.", `
    <div class="panel" style="max-width:560px;margin:0 auto;text-align:center">
      <div style="font-size:44px;line-height:1;margin-bottom:10px">&#128231;</div>
      <h3 style="margin:0 0 10px;font-size:21px">Postana bak</h3>
      <p class="muted" style="margin:0 0 4px;line-height:1.6">
        <strong>${escapeHtml(mail)}</strong> adresine bir onay bağlantısı gönderdik.
        Bağlantıya tıkladığın anda talebin yayına giriyor ve kriterine uyan ev sahiplerine duyuruluyor.
      </p>
      <div class="notice" style="text-align:left;margin:16px 0">
        Gelen kutunda göremiyorsan <strong>spam / gereksiz</strong> klasörüne bak.
        Talebin bizde kayıtlı — hiçbir şeyi yeniden doldurmayacaksın.
      </div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-outline" onclick="KT.misafirTekrarGonder()">Bağlantıyı tekrar gönder</button>
        <button class="btn btn-outline" onclick="KT.misafirEpostaDuzelt()">E-postamı yanlış yazdım</button>
      </div>
    </div>`);
}

function misafirOzetMetni() {
  const v = misafirVeri || {};
  const yer = [v.district, v.cityName].filter(Boolean).join(", ");
  const kira = (v.minBudget && v.maxBudget)
    ? `${Number(v.minBudget).toLocaleString("tr-TR")}–${Number(v.maxBudget).toLocaleString("tr-TR")} TL`
    : "";
  return [yer, v.roomCount, v.propertyType, kira].filter(Boolean).join(" · ");
}

function phoneVerifyPage() {
  const u = currentUser();
  if (!u) { location.hash = "/giris"; return ""; }
  if (u.phoneVerified) {
    return publicShell("Telefonun doğrulandı", "Bu adımı tamamladın.", `
      <div class="auth-layout auth-layout-narrow">
        <div class="panel auth-panel" style="text-align:center">
          <div style="font-size:44px;line-height:1;margin-bottom:10px">✅</div>
          <h3 style="margin:0 0 8px">Telefonun doğrulandı</h3>
          <p class="muted" style="margin:0 0 18px">Artık talep oluşturabilir ve talep havuzunu kullanabilirsin.</p>
          <a class="btn btn-primary" href="#/${escapeAttr(dashboardPathForRole(u.role))}">Panele git</a>
        </div>
      </div>`);
  }
  const tel = (u.phone || "").trim();
  return publicShell("Telefonunu doğrula", "Sahte üyeliği önlemek için tek seferlik bir kod gönderiyoruz.", `
    <div class="auth-layout auth-layout-narrow">
      <div class="panel auth-panel">
        <div class="notice" style="margin:0 0 16px">
          Numaranı doğrulamak <strong>bir kez</strong> yapılır ve ücretsizdir. Numaran talep kartında
          <strong>görünmez</strong>; yalnızca ücretli üyeler ve onaylı danışmanlar görüntüleyebilir, her görüntülemede sana haber verilir.
        </div>

        <div id="pv-step1">
          <div class="form-grid">
            <div class="field full">
              <label for="pv-phone">Cep telefonun</label>
              <input id="pv-phone" type="tel" inputmode="numeric" placeholder="5xx xxx xx xx" value="${escapeAttr(tel)}">
            </div>
          </div>
          <div id="pv-error" class="error"></div>
          <div class="form-actions">
            <button class="btn btn-primary" onclick="KT.phoneSendCode()">${icon("send", 16)} Kodu gönder</button>
          </div>
        </div>

        <div id="pv-step2" style="display:none">
          <p style="margin:0 0 12px;font-size:14.5px;color:#41556d">
            <strong id="pv-target"></strong> numarasına 6 haneli kod gönderildi. Kod 5 dakika geçerli.
          </p>
          <div class="form-grid">
            <div class="field full">
              <label for="pv-code">Doğrulama kodu</label>
              <input id="pv-code" type="text" inputmode="numeric" maxlength="6" placeholder="6 hane"
                     style="letter-spacing:.35em;font-size:20px;text-align:center" autocomplete="one-time-code">
            </div>
          </div>
          <div id="pv-error2" class="error"></div>
          <div class="form-actions" style="gap:10px">
            <button class="btn btn-primary" onclick="KT.phoneVerify()">${icon("check", 16)} Doğrula</button>
            <button class="btn btn-outline" id="pv-resend" onclick="KT.phoneSendCode(true)">Kodu tekrar gönder</button>
          </div>
          <p class="muted" style="margin:10px 0 0;font-size:13px">Kod gelmediyse numarayı kontrol et; yanlışsa yukarıdan düzeltip tekrar gönder.</p>
        </div>
      </div>
      <aside class="auth-side">
        <span class="badge badge-blue">${icon("shield", 13)} Neden isteniyor?</span>
        <h3>Gerçek kişilerle güvenle görüşmen için</h3>
        <ol style="list-style:none;margin:14px 0 0;padding:0;display:grid;gap:12px">
          <li style="display:flex;gap:10px;align-items:flex-start"><span style="flex:0 0 26px;height:26px;border-radius:8px;background:var(--navy,#10243a);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px">1</span><span style="color:#33475b;font-size:14.5px;line-height:1.45">Sahte üyelik ve boş arama trafiği azalır.</span></li>
          <li style="display:flex;gap:10px;align-items:flex-start"><span style="flex:0 0 26px;height:26px;border-radius:8px;background:var(--navy,#10243a);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px">2</span><span style="color:#33475b;font-size:14.5px;line-height:1.45">Karşı taraf gerçek biriyle konuştuğunu bilir.</span></li>
          <li style="display:flex;gap:10px;align-items:flex-start"><span style="flex:0 0 26px;height:26px;border-radius:8px;background:var(--navy,#10243a);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px">3</span><span style="color:#33475b;font-size:14.5px;line-height:1.45">Numaran havuzda gizli kalır; yalnızca ücretli üyeler ve onaylı danışmanlar görüntüleyebilir.</span></li>
        </ol>
      </aside>
    </div>`);
}

// "Google ile devam et" butonu — yalnizca sunucuda GOOGLE_CLIENT_ID/SECRET tanimliysa gorunur.
function googleAuthBlock(label = "Google ile devam et") {
  if (!(state.config && state.config.googleAuth)) return "";
  const g = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.5 13.2l7.9 6.1C12.3 13.2 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-2.8-.4-4.1H24v8.4h12.8c-.3 2.1-1.7 5.2-4.9 7.3l7.7 6c4.5-4.2 6.9-10.3 6.9-17.6z"/><path fill="#FBBC05" d="M10.4 28.7A14.6 14.6 0 0 1 9.6 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.5 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.6-5.8l-7.7-6c-2.1 1.4-4.8 2.4-7.9 2.4-6.3 0-11.7-3.7-13.6-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';
  return `
    <div class="google-auth" style="margin-top:14px">
      <div style="display:flex;align-items:center;gap:10px;color:#8496a8;font-size:12.5px;margin:4px 0 12px"><span style="flex:1;height:1px;background:#e5eaf0"></span>veya<span style="flex:1;height:1px;background:#e5eaf0"></span></div>
      <a class="btn btn-outline" href="/api/auth/google/start" style="width:100%;justify-content:center;gap:10px">${g} ${label}</a>
    </div>`;
}

function authLoginPage() {
  // Google donusunde hata olduysa kullaniciya nedenini goster (#/giris?google=hata gibi).
  const gErrCode = new URLSearchParams((location.hash.split("?")[1] || "")).get("google") || "";
  const gErrText = { hata: "Google ile giriş tamamlanamadı. Lütfen tekrar deneyin.", dogrulanmamis: "Google hesabının e-postası doğrulanmamış görünüyor.", pasif: "Bu üyelik aktif değil. Destek ile iletişime geçin." }[gErrCode] || "";
  return publicShell("Giriş yap", "Üyeliğinle panele dön; kiracı, konut alıcısı, ev sahibi ve danışman akışına devam et.", `
    <div class="auth-layout auth-layout-narrow">
      <form class="panel auth-panel" onsubmit="KT.login(event)">
        ${gErrText ? `<div class="error show" style="margin-bottom:12px">${gErrText}</div>` : ""}
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
        ${googleAuthBlock("Google ile giriş yap")}
      </form>
      <aside class="auth-side">
        <span class="badge badge-gold">${icon("lock", 13)} Güvenli giriş</span>
        <h3>Tekrar hoş geldin.</h3>
        <p>Üyeliğinle paneline dön; taleplerini, kriterlerini ve açtığın iletişimleri tek yerden yönet. İletişim bilgilerin her zaman korunur.</p>
        <div class="auth-benefits">
          <span>${icon("key", 16)} Talep ve kriter yönetimi</span>
          <span>${icon("lock", 16)} Doğrudan iletişim</span>
        </div>
      </aside>
    </div>
  `);
}

// Google'dan donen yeni kullanici icin kisa tamamlama ekrani (rol + telefon + sehir).
function googleCompletePage() {
  const roleOptions = [["buyer", "Konut alıcısı"], ["tenant", "Kiracı"], ["seller", "Evine alıcı arayan"], ["landlord", "Ev sahibi"], ["agent", "Emlak danışmanı"]];
  return publicShell("Üyeliğini tamamla", "Google hesabınla giriş yaptın. Eşleşme için birkaç bilgi daha gerekiyor.", `
    <div class="auth-layout auth-layout-narrow">
      <form class="panel auth-panel" onsubmit="KT.googleComplete(event)">
        <div class="notice" id="gc-info" style="margin-bottom:14px">Google bilgilerin alınıyor…</div>
        <div class="form-grid">
          <div class="field"><label for="gc-name">Ad Soyad</label><input id="gc-name" type="text" placeholder="Adınız"></div>
          <div class="field"><label for="gc-email">E-posta</label><input id="gc-email" type="email" disabled style="background:#f1f5f9"></div>
          <div class="field"><label for="gc-role">Üyelik tipi</label><select id="gc-role">${roleOptions.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select></div>
          ${field("Telefon", "gc-phone", "tel", "05xx xxx xx xx")}
          <div class="field full"><label for="gc-city">Şehir</label><select id="gc-city">${["İstanbul", "Ankara", "İzmir", "Eskişehir", "Bursa", "Antalya"].map((c) => `<option>${c}</option>`).join("")}</select></div>
          <div class="field"><label for="gc-tckn">T.C. kimlik numarası</label><input id="gc-tckn" type="text" inputmode="numeric" maxlength="11" placeholder="11 hane" autocomplete="off"></div>
          <div class="field"><label for="gc-birth">Doğum tarihi</label><input id="gc-birth" type="date" max="${new Date().toISOString().slice(0, 10)}"></div>
          <div class="field full">
            <div class="notice" style="margin:0">Kimlik bilgin sahte üyeliği önlemek için isteniyor; <strong>şifreli</strong> saklanır, panelde maskeli görünür, hiçbir kullanıcıyla paylaşılmaz. <a href="#/kvkk" target="_blank">Ayrıntı</a></div>
          </div>
          <div class="field full">
            <label class="check"><input id="gc-identity-consent" type="checkbox"><span style="font-weight:500;line-height:1.55">T.C. kimlik numaramın ve doğum tarihimin kimlik doğrulama amacıyla işlenmesine açık rıza veriyorum.</span></label>
          </div>
          ${izinBloguHTML("gc")}
        </div>
        <div id="gc-error" class="error"></div>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">${icon("check", 16)} Üyeliği tamamla</button>
          <a class="btn btn-outline" href="#/giris">Vazgeç</a>
        </div>
      </form>
      <aside class="auth-side">
        <span class="badge badge-gold">${icon("lock", 13)} Son adım</span>
        <h3>Neden bu bilgiler?</h3>
        <p>Üyelik tipin akışını belirler (talep mi bırakacaksın, talep havuzunu mu izleyeceksin). Telefonun herkese açık değildir; yalnızca ücretli üyeler ve onaylı danışmanlar görüntüleyebilir ve her görüntülemede sana haber verilir.</p>
        <div class="auth-benefits">
          <span>${icon("key", 16)} Şifre belirlemene gerek yok</span>
          <span>${icon("lock", 16)} Bilgilerin rızanla paylaşılır</span>
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
  if (kind === "google-tamamla") {
    return googleCompletePage();
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
  if (kind === "telefon-dogrula") {
    return phoneVerifyPage();
  }
  // Reklam inis sayfasi: uyeliksiz talep formu. Menude yok, arama motorlarina kapali.
  if (kind === "talep-birak" || kind.startsWith("talep-birak")) {
    return guestDemandPage();
  }
  if (kind === "nasil-calisir") {
    return publicShell("Nasıl Çalışır", "Ev arayan talebini bırakır; ev sahipleri ve danışmanlar iletişime geçer, taraflar doğrudan buluşur.", `
      ${howSteps()}
      <div class="grid grid-2" style="margin-top:18px">
        <article class="card"><h3>Alıcı / kiracı akışı</h3><p>Talebini bırak, e-postanı doğrula; talebin yayına girer ve kriterine uyan üyelere duyurulur. İletişim bilgini görüntüleyen üyeler seni doğrudan arar — sitede başka bir şey yapman gerekmez.</p></article>
        <article class="card"><h3>Ev sahibi / evine alıcı arayan / danışman akışı</h3><p>Üye ol, talep havuzunu filtrele, aradığın talebin kriterini kaydet; üyelikle talep sahibinin iletişim bilgisini gör, doğrudan ara ve anlaş.</p></article>
      </div>
    `);
  }
  if (kind === "alici") {
    return publicShell("Konut alıcıları için", "Yüzlerce ilan arasında kaybolmadan aradığın evi tarif et.", `
      <div class="grid grid-3">
        ${featureCard("key", "Talebini aç", "Bölge, bütçe ve özelliklerini tek kartta toparla.")}
        ${featureCard("card", "Bütçeni beyan et", "Belge yüklemeden bütçe aralığını, peşinatını ve alım zamanını belirt.")}
        ${featureCard("chat", "Aranmayı bekle", "Talebine uygun evine alıcı arayanlar ve onaylı danışmanlar iletişim bilgini görüntüler ve seni doğrudan arar.")}
      </div>
      <div class="section-actions"><button class="btn btn-primary" onclick="KT.startRegistration('buyer')">Konut alıcısı olarak üye ol</button></div>
    `);
  }
  if (kind === "satici") {
    return publicShell("Evine alıcı arayanlar için", "Evin için gerçek ihtiyacı olan konut alıcısı taleplerini gör.", `
      <div class="grid grid-3">
        ${featureCard("home", "Hazır talep havuzu", "Bütçesi ve ihtiyacı belli alıcıları filtrele.")}
        ${featureCard("send", "Doğrudan iletişim", "Üyelikle uygun alıcının iletişim bilgisine ulaş, doğrudan görüş.")}
        ${featureCard("chart", "Kriter bildirimi", "Aradığın alıcı profilini kaydet; uyan talep yayına girince haber al.")}
      </div>
      <div class="section-actions"><button class="btn btn-primary" onclick="KT.startRegistration('seller')">Evine alıcı bul — üye ol</button></div>
    `);
  }
  if (kind === "fiyatlandirma") {
    return publicShell("Fiyatlandırma", "Talep bırakmak (kiracı ve alıcı) tamamen ücretsizdir, komisyon yoktur. Ev sahibi, evine alıcı arayan ve onaylı emlak danışmanı, talep sahibinin iletişim bilgisini görmek için üyelik alır. Üste taşıma ise ayrı, isteğe bağlı bir hizmettir.", pricingCards());
  }
  if (kind === "yardim") {
    return publicShell("Yardım ve SSS", "Konuttalebi'nin temel kurallarını sade biçimde incele.", faq());
  }
  if (["iletisim", "kvkk", "gizlilik", "kullanim-sartlari", "cerez-politikasi", "mesafeli-satis", "on-bilgilendirme", "iade-iptal", "teslimat", "guvenli-islem-rehberi"].includes(kind)) {
    return legalPage(kind);
  }
  if (kind === "talepler" || kind === "ilanlar" || kind === "ara") {
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
    ["membership", "Üyelik — İletişim Erişimi", "Kayıt herkes için ücretsiz. Ödeme yalnızca talep sahibinin iletişim bilgisini görüntülemek içindir; üyelik süresince sınırsızdır. <strong>Talep bırakan (kiracı ve alıcı) tamamen ücretsizdir.</strong>"],
    ["boost", "Üste Taşıma · opsiyonel", "İsteğe bağlı. Talebini listenin üstüne taşıyıp daha çok görünürlük al — zorunlu değildir, üyelikten ayrıdır."],
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
  else if (role === "seller") planIds = ["plan-landlord-contact"]; // 2.0: tek bireysel uyelik
  else planIds = rent ? [] : ["plan-buyer-boost"]; // talep birakan ucretsiz; istege bagli uste tasima
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
    : `<div class="notice" style="margin-top:6px"><strong>Talep bırakmak tamamen ücretsiz.</strong> Talebini oluştur; sana uygun ev sahipleri iletişim bilgini görüntüleyip seni arasın. Ödeme yapman gerekmez.</div>`;
  return publicShell(`Hoş geldin${first ? ", " + first : ""}!`,
    "Üyeliğin hazır. İstersen bir paketle başla, istersen hiçbir paket almadan ücretsiz devam et — dilediğin an panelden yükseltebilirsin.", `
    ${cards}
    <div style="margin-top:22px;display:flex;gap:14px;flex-wrap:wrap;align-items:center">
      <button class="btn btn-outline" onclick="KT.skipPackages()">${icon("key", 16)} Paketsiz ücretsiz devam et</button>
      <span class="muted">Paket almadan da talep oluşturabilir ve havuzu inceleyebilirsin.</span>
    </div>
  `);
}

function faq() {
  const rows = [
    ["Konuttalebi nedir?", "Ev almak veya kiralamak isteyenlerin talep bıraktığı ters ilan platformudur. Sitede ilan yoktur; ev sahipleri, evine alıcı arayanlar ve onaylı emlak danışmanları talep havuzunu inceler, üyelikle talep sahibinin iletişim bilgisini görüntüler ve doğrudan arar. Fiyata, pazarlığa ve sözleşmeye karışmayız."],
    ["Belge yüklemem gerekiyor mu?", "Talep bırakanlardan belge istenmez; bütçe/kira aralığını ve tercihlerini beyan edersin. Yalnızca emlak danışmanları, Sorumlu Emlak Danışmanı (Seviye 5) belgesiyle onaylanır."],
    ["Telefonum ne zaman görünür?", "Telefonun ve e-postan talep kartında görünmez. Yalnızca ücretli üyeler ve onaylı danışmanlar, seninle iletişime geçmek amacıyla görüntüleyebilir; her görüntülemede sana haber veririz."],
    ["Emlak danışmanları kullanabilir mi?", "Evet. Danışman üyeliği için Sorumlu Emlak Danışmanı (Seviye 5) belgesi gerekir; belge onaylanmadan iletişim bilgisi görüntülenemez."],
    ["Bütçe beyanı zorunlu mu?", "Talep oluşturmak için bütçe/kira aralığı gerekir; belge yükleme yoktur."],
    ["Şikayet nasıl yapılır?", "Talep veya kullanıcı kartından şikayet oluşturulabilir; admin panelde incelenir."]
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
    "iletisim": { t: "İletişim ve Firma Bilgileri", s: "Konuttalebi'ni işleten şirket ve iletişim bilgileri.", h: `
      <h3>Firma Bilgileri</h3>${firmaList}
      <h3>İletişim</h3>
      <p>Her türlü soru, öneri, talep ve şikâyetiniz için <strong>${C.email}</strong> adresine e-posta gönderebilir veya <strong>${C.tel}</strong> numaralı telefondan bize ulaşabilirsiniz. Başvurularınız en kısa sürede yanıtlanır.</p>
      <p class="muted">Konuttalebi bir çevrim içi emlak platformudur; gayrimenkul alım-satım veya kiralama işlemine taraf olmaz, fiyata ve pazarlığa karışmaz. Tapu, kapora ve ödeme işlemlerinizi resmi kurumlar ve bankalar üzerinden yürütünüz.</p>` },
    "on-bilgilendirme": { t: "Ön Bilgilendirme Formu", s: "Sipariş öncesi yasal bilgilendirme (6502 sayılı Kanun).", h: `
      <p>Bu form, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca, siparişinizi onaylamadan önce sizi bilgilendirmek için sunulur.</p>
      <h3>1. Hizmet Sağlayıcı</h3>${firmaList}
      <h3>2. Hizmetin Konusu</h3>
      <p>Konuttalebi'nde sunulan dijital hizmet paketleri: (a) <strong>Üyelik (İletişim Erişimi)</strong> — talep sahiplerinin iletişim bilgisini (ad/telefon/e-posta), kendileriyle iletişime geçmek amacıyla üyelik süresince görüntüleme hakkı; (b) <strong>Öne Çıkarma (Üste Taşı) Paketi</strong> — talebin listelerde belirli süre üstte gösterilmesi. Paketin adı, kapsamı, süresi ve KDV dâhil fiyatı satın alma ekranında açıkça belirtilir.</p>
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
      <p>Konuttalebi'nde satılan tüm paketler <strong>dijital hizmettir</strong>; fiziksel ürün gönderimi, kargo veya teslimat söz konusu değildir.</p>
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
        <li><strong>Kimlik:</strong> ad-soyad; açık rızanızla T.C. kimlik numarası ve doğum tarihi.</li>
        <li><strong>İletişim:</strong> e-posta, telefon, şehir/adres.</li>
        <li><strong>İşlem güvenliği:</strong> IP, oturum ve log kayıtları, şifre (şifrelenmiş olarak), cihaz bilgisi.</li>
        <li><strong>Hizmet kullanımı:</strong> oluşturduğunuz talepler ve beyanlar (bütçe/kira aralığı, peşinat, kredi/nakit tercihi), kaydettiğiniz arama kriterleri, iletişim bilgisi görüntüleme kayıtları.</li>
        <li><strong>İşlem/ödeme:</strong> tutar, tarih, işlem numarası (<strong>kart numarası hariç</strong> — kart bilgisi yalnızca ödeme kuruluşu tarafında işlenir, bize aktarılmaz).</li>
        <li><strong>Pazarlama:</strong> çerez ve tercih kayıtları (onayınız dâhilinde).</li>
      </ul>
      <h3>3. İşleme Amaçları</h3>
      <p>Üyeliğin ve hizmetin sunulması; konut taleplerinin, üyelerin kaydettiği arama kriterlerine göre duyurulması; <strong>üyelik</strong> kapsamında talep sahibinin iletişim bilgisinin, kendisiyle iletişime geçilmesi amacıyla ücretli üyeler ve onaylı emlak danışmanlarına görüntületilmesi ve her görüntülemenin kayıt altına alınıp talep sahibine bildirilmesi; ödeme ve faturalandırma; güvenlik, dolandırıcılık ve kötüye kullanımın önlenmesi; yasal yükümlülüklerin yerine getirilmesi; talep/şikâyet yönetimi ve hizmet kalitesinin artırılması.</p>
      <h3>4. Toplama Yöntemi ve Hukuki Sebepler (KVKK m.5)</h3>
      <p>Veriler; web sitesi, mobil uygulama ve e-posta yoluyla elektronik ortamda toplanır. Hukuki sebepler: sözleşmenin kurulması/ifası; hukuki yükümlülük; bir hakkın tesisi/korunması; meşru menfaat; ve gerekli hâllerde açık rıza (örn. talep bıraktığınızda iletişim bilginizin, sizinle iletişime geçmeleri amacıyla ücretli üyeler ve onaylı danışmanlara görüntületilmesi — bu husus kayıt sırasında kabul ettiğiniz Kullanım Koşulları'nda açıkça yer alır).</p>
      <h3>5. Taleplerin Herkese Açık Görünürlüğü ve İletişim Bilgisinin Görüntülenmesi</h3>
      <p>Oluşturduğunuz <strong>talepler, üyeliği olmayan ziyaretçiler dâhil herkese açık olarak</strong> platformda listelenir. Bu listelemede yalnızca ihtiyaç özeti görünür: şehir/ilçe, konut tipi, oda sayısı, m² aralığı, bütçe veya kira aralığı, zaman tercihi, tercih ettiğiniz özellikler ve yazdığınız açıklama metni. <strong>Adınız, telefonunuz, e-postanız ve kimliğiniz bu listelemede gösterilmez</strong>; açıklama metnine yazılan telefon/e-posta gibi iletişim bilgileri sistem tarafından otomatik olarak maskelenir. Ad, telefon ve e-posta bilgileriniz; sizinle iletişime geçmeleri amacıyla yalnızca <strong>ücretli üyelik sahibi kullanıcılar ve belgesi onaylanmış emlak danışmanları</strong> tarafından görüntülenebilir. Her görüntüleme kayıt altına alınır ve size bildirim gönderilir; görüntüleyenin kimliği tarafınıza açıklanmaz, ancak kötüye kullanım hâlinde inceleme için kayıtlarda tutulur. Açıklama alanına kimliğinizi ortaya çıkarabilecek bilgiler yazmamanızı öneririz. Talebinizi panelinizden yayından kaldırdığınızda herkese açık listelemeden çıkar ve iletişim bilginiz artık görüntülenemez.</p>
      <h3>6. T.C. Kimlik Numarası ve Doğum Tarihi</h3>
      <p>T.C. kimlik numarası ve doğum tarihi <strong>yalnızca açık rızanızla</strong> alınır; amacı sahte üyeliğin önlenmesi ve tarafların gerçek kişiler olduğunun teyididir. Bu veriler şu güvencelerle işlenir:</p>
      <ul class="legal-list">
        <li>T.C. kimlik numarası veritabanında <strong>açık metin olarak tutulmaz</strong>; endüstri standardı şifreleme (AES-256-GCM) ile saklanır.</li>
        <li>Yönetim panelinde dahi <strong>maskeli</strong> görünür (örn. 123******01). Açık değerin görüntülenmesi ayrı bir yetki gerektirir ve <strong>her görüntüleme gerekçesiyle birlikte kayıt altına alınır</strong>.</li>
        <li>Bu veriler <strong>hiçbir kullanıcıyla paylaşılmaz</strong>; üyelikle görüntülenen iletişim bilgilerine dâhil değildir.</li>
        <li>Alanların doldurulması <strong>zorunlu değildir</strong>; boş bırakabilir, rızanızı dilediğiniz zaman ${C.email} adresine yazarak geri çekebilirsiniz. Rıza geri çekildiğinde bu veriler silinir.</li>
        <li>Üyeliğiniz silindiğinde veya anonimleştirildiğinde bu veriler <strong>geri döndürülemez şekilde</strong> kaldırılır.</li>
      </ul>
      <h3>7. Aktarım (KVKK m.8-9)</h3>
      <p>Veriler amaçla sınırlı olarak; ödeme kuruluşu (${C.odeme}), barındırma/altyapı ve e-posta/SMS sağlayıcıları, mali müşavir ve hukuk danışmanları ile yetkili kamu kurum ve kuruluşlarıyla (ör. adli merciler, BTK) paylaşılabilir. Verileriniz pazarlama amacıyla üçüncü kişilere <strong>satılmaz</strong>. Platform içinde yalnızca ad, telefon ve e-posta bilgisi, sizinle iletişime geçmeleri amacıyla ücretli üyeler ve onaylı danışmanlara görüntületilir (bkz. bölüm 5).</p>
      <h3>7a. Açık Rızaya Bağlı Aktarım — İş Ortakları</h3>
      <p><strong>Yalnızca ayrıca açık rıza vermeniz hâlinde</strong>; iletişim bilgileriniz (ad-soyad, telefon, e-posta, şehir) ve konut talep/tercih bilgileriniz (aradığınız konut tipi, bölge, bütçe/kira aralığı, taşınma veya satın alma zamanlaması) aşağıdaki alıcı gruplarına, karşılarında yazan amaçla sınırlı olarak aktarılabilir:</p>
      <ul class="legal-list">
        <li><strong>Bankalar, katılım bankaları ve kanunen yetkili finansman kuruluşları:</strong> size kredi ve finansman teklifi sunulabilmesi.</li>
        <li><strong>Konut projesi geliştiren firmalar:</strong> konut projeleri hakkında tanıtım ve teklif sunulabilmesi.</li>
        <li><strong>Sigorta şirketleri ve yetkili sigorta acenteleri:</strong> konut, DASK ve eşya sigortası teklifi sunulabilmesi.</li>
        <li><strong>Taşınma ve nakliyat hizmeti veren firmalar:</strong> taşınma hizmeti teklifi sunulabilmesi.</li>
        <li><strong>Elektrik, doğalgaz ve internet aboneliği sağlayıcıları:</strong> yeni adresinize yönelik abonelik teklifleri sunulabilmesi.</li>
      </ul>
      <p><strong>T.C. kimlik numaranız ve doğum tarihiniz bu kapsamda hiçbir alıcıya aktarılmaz.</strong> Bu izin isteğe bağlıdır; vermemeniz platformu kullanmanızı hiçbir şekilde etkilemez. İzninizi dilediğiniz zaman hesap ayarlarınızdan veya ${C.email} adresine yazarak geri çekebilirsiniz; geri çekme, o ana kadarki aktarımların hukuka uygunluğunu etkilemez. Aktarım yapılan kuruluşlar, kendi veri işleme faaliyetleri bakımından ayrı veri sorumlusudur.</p>
      <h3>8. Saklama Süresi</h3>
      <p>Veriler, işleme amacının gerektirdiği ve mevzuatın öngördüğü süre boyunca saklanır; süre sonunda resen veya talebiniz üzerine silinir, yok edilir ya da anonimleştirilir.</p>
      <h3>9. Haklarınız (KVKK m.11)</h3>
      <p>Kişisel veri sahibi olarak; verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işlenme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme, yurt içinde/dışında aktarıldığı üçüncü kişileri bilme, eksik/yanlış işlenmişse düzeltilmesini, şartlar oluştuğunda silinmesini/yok edilmesini isteme, otomatik analiz sonucu aleyhinize çıkan bir sonuca itiraz etme ve kanuna aykırı işleme nedeniyle zararınızın giderilmesini talep etme haklarına sahipsiniz. Başvurularınız ${C.email} üzerinden en geç <strong>30 gün</strong> içinde ücretsiz sonuçlandırılır.</p>
      <hr style="margin:28px 0;border:none;border-top:1px solid #e5eaf0">
      <p class="muted" style="font-size:13.5px">Aşağıdaki üç metin, yukarıdaki aydınlatmadan <strong>ayrı</strong> birer açık rıza / onay beyanıdır. Kayıt sırasında veya hesap ayarlarından, her biri için ayrı ve isteğe bağlı olarak onay verebilirsiniz; hiçbiri platformu kullanmanın şartı değildir.</p>
      <h3>Ek-1: Pazarlama ve Kişiselleştirme Açık Rıza Metni</h3>
      <p>Kimlik (ad-soyad), iletişim (e-posta, telefon, şehir), üyelik, gayrimenkul talep ve tercih, bütçe/kira aralığı, işlem ve platform kullanım bilgilerimin; ${C.unvan} tarafından gayrimenkul, konut projeleri, finansman ve konutla bağlantılı ürün ve hizmetlerin tanıtılması, bana özel teklif ve kampanyaların oluşturulması, kullanıcı tercihlerinin analiz edilmesi ve pazarlama faaliyetlerinin geliştirilmesi amaçlarıyla işlenmesine açık rıza veriyorum. Bu rıza kapsamında verilerim üçüncü kişilere aktarılmaz; aktarım ayrı bir rızaya tabidir. Rızamı dilediğim zaman hesap ayarlarından veya ${C.email} adresine yazarak geri çekebilirim.</p>
      <h3>Ek-2: İş Ortaklarına Aktarım Açık Rıza Metni</h3>
      <p>İletişim bilgilerimin (ad-soyad, telefon, e-posta, şehir) ve konut talep/tercih bilgilerimin (aradığım konut tipi, bölge, bütçe veya kira aralığı, taşınma/satın alma zamanlaması); yalnızca aşağıda sayılan alıcı gruplarına ve karşılarında yazan amaçlarla sınırlı olarak aktarılmasına açık rıza veriyorum:</p>
      <ul class="legal-list">
        <li>Türkiye'de faaliyet gösteren <strong>bankalar, katılım bankaları ve kanunen yetkili finansman kuruluşlarına</strong> — kredi ve finansman teklifi sunulabilmesi;</li>
        <li><strong>Konut projesi geliştiren firmalara</strong> — konut projeleri hakkında tanıtım ve teklif sunulabilmesi;</li>
        <li><strong>Sigorta şirketleri ve yetkili sigorta acentelerine</strong> — konut, DASK ve eşya sigortası teklifi sunulabilmesi;</li>
        <li><strong>Taşınma ve nakliyat hizmeti veren firmalara</strong> — taşınma hizmeti teklifi sunulabilmesi;</li>
        <li><strong>Elektrik, doğalgaz ve internet aboneliği sağlayıcılarına</strong> — abonelik teklifleri sunulabilmesi.</li>
      </ul>
      <p><strong>T.C. kimlik numaram ve doğum tarihim bu kapsamda aktarılmaz.</strong> Bu aktarımın tek başına kredi başvurusu, kredi onayı veya herhangi bir sözleşme kurulması anlamına gelmediğini; aktarım yapılan kuruluşların kendi süreçleri bakımından ayrı veri sorumlusu olduğunu; rızamı dilediğim zaman hesap ayarlarından veya ${C.email} adresine yazarak geri çekebileceğimi biliyorum.</p>
      <h3>Ek-3: Ticari Elektronik İleti Onay Metni</h3>
      <p>${C.unvan}'nin gayrimenkul, konut projeleri, finansman ve konutla bağlantılı ürün, hizmet, kampanya, avantaj ve fırsatları hakkında tarafıma <strong>e-posta, SMS, telefon araması ve mobil bildirim</strong> kanalları üzerinden ticari elektronik ileti göndermesini onaylıyorum. Bu onayı dilediğim zaman hesap ayarlarından, iletideki abonelikten çıkma bağlantısından veya ${C.email} adresine yazarak geri alabilirim.</p>` },
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
        <li><strong>Talep:</strong> Alıcı veya kiracının aradığı konutu, iş yerini veya arsayı tarif eden kayıt. Site'de ilan yayımlanmaz; yalnızca talepler listelenir.</li>
        <li><strong>Talep Sahibi (Alıcı / Kiracı):</strong> Konut almak veya kiralamak için talep oluşturan Üye. Talep bırakmak ücretsizdir.</li>
        <li><strong>Bireysel Üye (Ev Sahibi / Evine Alıcı Arayan):</strong> Talep havuzunu inceleyen ve ücretli üyelikle talep sahibinin iletişim bilgisini görüntüleyebilen Üye.</li>
        <li><strong>Onaylı Emlak Danışmanı:</strong> Sorumlu Emlak Danışmanı (Seviye 5) belgesi platform tarafından onaylanmış, danışman üyeliğine sahip Üye.</li>
        <li><strong>Üyelik (İletişim Erişimi):</strong> Talep sahibinin iletişim bilgisini, kendisiyle iletişime geçmek amacıyla görüntüleme hakkı veren ücretli üyelik.</li>
      </ul>
      <h3>3. Platformun Hukuki Statüsü</h3>
      <p>Konuttalebi, 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun kapsamında bir <strong>aracı hizmet sağlayıcı / yer sağlayıcı</strong> konumundadır. Taraflar arasındaki alım-satım veya kiralama ilişkisine taraf değildir; talep içeriğini bizzat oluşturmaz, doğruluğunu garanti etmez ve içerikten kullanıcılar sorumludur.</p>
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
        <li>Gerçek, doğru ve güncel talep oluşturmak; yanıltıcı, sahte veya hukuka aykırı içerik paylaşmamak.</li>
        <li>Başkasının kişisel/iletişim bilgilerini izinsiz kullanmamak ve paylaşmamak.</li>
        <li>Görüntülediği iletişim bilgisini yalnızca ilgili talep amacıyla kullanmak; izinsiz toplu pazarlama (spam) yapmamak, bilgiyi üçüncü kişilerle paylaşmamak.</li>
      </ul>
      <h3>6. Platformun Hak ve Yükümlülükleri</h3>
      <ul class="legal-list">
        <li>Hizmetin sürekliliği için azami özen gösterir; teknik arıza ve mücbir sebep kaynaklı kesintilerden sorumlu değildir.</li>
        <li>Mevzuata aykırı, yanıltıcı veya şüpheli gördüğü talebi yayınlamama ya da kaldırma hakkına sahiptir.</li>
        <li>Koşullara aykırı davranan hesapları geçici veya kalıcı olarak askıya alabilir.</li>
        <li>Yetkili mercilerin talebi hâlinde üye bilgilerini mevzuata uygun paylaşabilir.</li>
      </ul>
      <h3>7. İletişim Bilgisi, Teklif ve Mesajlaşma</h3>
      <p>Telefon, e-posta ve adres gibi iletişim bilgileri herkese açık değildir; talep sahibinin iletişim bilgisini yalnızca <strong>ücretli üyeliği olan kullanıcılar ve belgesi onaylanmış emlak danışmanları</strong> görüntüleyebilir. Her görüntüleme kayıt altına alınır ve talep sahibine bildirilir. Site'de platform içi mesajlaşma ve teklif akışı yoktur; taraflar iletişim bilgisiyle doğrudan görüşür ve kendi aralarında anlaşır.</p>
      <h3>8. İkili İlişkiler ve Mali Sorumluluk Muafiyeti (ÖNEMLİ)</h3>
      <p>Konuttalebi bir <strong>ödeme veya emanet (escrow) hizmeti değildir</strong> ve taraflar arasındaki hiçbir alım-satım, kiralama, kapora, ödeme veya tapu işlemine taraf değildir. Kullanıcıların birbirleriyle kurdukları her ilişki, anlaşma ve ödeme tamamen kendi sorumluluklarındadır. Taşınmazın ayıplı olması, teslim/tescil edilmemesi, ödemenin yapılmaması gibi durumlarda Platform'un hiçbir hukuki, idari veya cezai sorumluluğu yoktur. Kullanıcılar, taşınmazı görmeden ve resmî belgeleri teyit etmeden <strong>kapora/ön ödeme yapmamaları</strong> konusunda uyarılır.</p>
      <h3>9. Ücretli Hizmetler</h3>
      <p>Üyelik (iletişim erişimi) ve öne çıkarma (üste taşıma) paketlerinin kapsam, süre ve KDV dâhil ücretleri satın alma ekranında belirtilir. Ödeme ve iade koşulları Ön Bilgilendirme Formu, Mesafeli Satış Sözleşmesi ve İade/İptal Politikası'na tabidir. Talep bırakmak (kiracı ve alıcı) için kayıt ve kullanım ücretsizdir.</p>
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
    // 2.0: ilan/teklif/eslesme ekranlari menulerden kalkti. Talep birakan taraf
    // sade bir panel gorur; uye tarafi (seller/agent) talep havuzu + kriter +
    // actiklari + paket gorur.
    buyer: [
      ["dashboard/alici", "Genel Bakış", "chart"],
      ["dashboard/alici/taleplerim", "Taleplerim", "key"],
      ["dashboard/alici/talep-olustur", "Yeni Talep", "send"],
      ["dashboard/alici/bildirimler", "Bildirimler", "bell"],
      ["dashboard/alici/paketler", "Paketlerim", "card"],
      ["dashboard/alici/ayarlar", "Ayarlar", "user"]
    ],
    seller: [
      ["dashboard/satici", "Genel Bakış", "chart"],
      ["dashboard/satici/talepler", "Talep Havuzu", "key"],
      ["dashboard/satici/kriter", "Aradığım Talepler", "search"],
      ["dashboard/satici/actiklarim", "İletişim Açtıklarım", "lock"],
      ["dashboard/satici/paketler", "Üyeliğim", "card"],
      ["dashboard/satici/ayarlar", "Ayarlar", "user"]
    ],
    agent: [
      ["dashboard/satici", "Genel Bakış", "chart"],
      ["dashboard/satici/talepler", "Talep Havuzu", "key"],
      ["dashboard/satici/kriter", "Aradığım Talepler", "search"],
      ["dashboard/satici/actiklarim", "İletişim Açtıklarım", "lock"],
      ["dashboard/satici/dogrulama", "Danışman Doğrulama", "shield"],
      ["dashboard/satici/paketler", "Üyeliğim", "card"],
      ["dashboard/satici/ayarlar", "Ayarlar", "user"]
    ],
    admin: [
      ["dashboard/admin", "Dashboard", "chart"],
      ["dashboard/admin/kullanicilar", "Kullanıcılar", "user"],
      ["dashboard/admin/uyelikler", "Üyelikler", "card"],
      ["dashboard/admin/talepler", "Alıcı Talepleri", "key"],
      ["dashboard/admin/ilanlar", "İlan Arşivi", "home"],
      ["dashboard/admin/epostalar", "E-postalar", "mail"],
      ["dashboard/admin/danisman-onay", "Danışman Onayı", "shield"],
      ["dashboard/admin/belgeler", "Üye Belgeleri", "file"],
      ["dashboard/admin/sikayetler", "Şikayetler", "alert"],
      ["dashboard/admin/risk", "Risk Paneli", "shield"],
      ["dashboard/admin/odemeler", "Ödemeler", "card"],
      ["dashboard/admin/sms", "SMS Doğrulama", "shield"],
      ["dashboard/admin/audit", "Denetim Kaydı", "shield"]
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
  // 2.0: teklif/eslesme/mesaj/butce ekranlari kalkti; eski baglantilar
  // taleplerime dusurulur.
  if (path.includes("/teklifler") || path.includes("/mesajlar") ||
      path.includes("/eslesmeler") || path.includes("/butce-beyani") || path.includes("/dogrulama"))
    return dashboardLayout("buyer", buyerDemands(), path);
  if (path.includes("/bildirimler")) return dashboardLayout("buyer", notificationsPage(user.id), path);
  if (path.includes("/paketler")) return dashboardLayout("buyer", buyerPackages(), path);
  if (path.includes("/ayarlar")) return dashboardLayout("buyer", settingsPage(user), path);
  return dashboardLayout("buyer", buyerOverview(), path);
}

function buyerOverview() {
  // 2.0: teklif/eslesme istatistikleri kalkti; talepler + goruntulenme sayaci.
  const user = currentUser();
  const demands = state.demands.filter((d) => d.buyerId === user.id);
  const idler = demands.map((d) => d.id);
  const goruntulenme = (state.contactViews || []).filter((v) => idler.includes(v.demandId)).length;
  return `
    ${pageHead("Genel Bakış", "Taleplerin ve iletişim bilginin kaç kez görüntülendiği burada.")}
    <div class="stat-grid">
      ${stat("Aktif talep", demands.filter((d) => d.status === "ACTIVE").length)}
      ${stat("İletişim görüntülenmesi", goruntulenme)}
      ${stat("Toplam talep", demands.length)}
      ${stat("Bildirimler", (state.notifications || []).filter((n) => !n.readAt).length)}
    </div>
    <div class="grid grid-2">
      <section class="panel"><h3>Nasıl işliyor?</h3><p class="muted" style="margin:8px 0 12px">Talebin havuzda anonim listelenir. İletişim bilgini bir üye görüntülediğinde sana haber verilir; seni doğrudan ararlar.</p><a class="btn btn-primary" href="#/dashboard/alici/talepler">Taleplerimi gör</a></section>
      <section class="panel"><h3>Önerilen aksiyon</h3><p class="muted" style="margin:8px 0 12px">Talebini ayrıntılandırmak doğru kişilerce aranma şansını artırır.</p><a class="btn btn-secondary" href="#/dashboard/alici/talep-olustur">Yeni talep oluştur</a></section>
    </div>
  `;
}

function buyerDemands() {
  const user = currentUser();
  const demands = state.demands.filter((d) => d.buyerId === user.id).sort((a, b) => Number(isBoosted(b)) - Number(isBoosted(a)));
  return `
    ${pageHead("Taleplerim", "Yayındaki, taslak veya pasif taleplerini yönet.", `<a class="btn btn-primary" href="#/dashboard/alici/talep-olustur">${icon("send", 16)} Yeni talep</a>`)}
    <div class="list">${demands.map((d) => demandRow(d, false)).join("") || empty("Henüz talep yok", "Yeni talep oluştur; kriterine uyan ev sahipleri ve danışmanlar seni arasın.")}</div>
  `;
}

function buyerPackages() {
  return `${pageHead("Paketlerim", "Talep bırakmak ücretsiz; istersen talebini üste taşıyabilirsin.")}${pricingCards(["BUYER"])}`;
}

function buyerDemandForm() {
  const rent = uiTxMode === "RENT";
  return `
    ${pageHead(rent ? "Yeni Kiralık Talebi" : "Yeni Talep Oluştur", "Satıcı/ev sahiplerinin göreceği anonim talep kartını hazırla.")}
    <div class="wizard-steps">
      <div class="step active">1. Konum</div><div class="step active">2. Özellikler</div><div class="step active">3. ${rent ? "Kira" : "Bütçe"}</div><div class="step active">4. Önizleme</div>
    </div>
    <div class="notice" style="margin:0 0 16px">
      <strong>${icon("lock", 13)} Talebin herkese açık listelenir — ama kimliğin gizli kalır.</strong>
      Yayına aldığında talebin, üye olmayan ziyaretçilerin de görebildiği <a href="#/talepler" target="_blank">Talepler</a> listesinde görünür.
      Görünen bilgiler: şehir/ilçe, konut tipi, oda, m², ${rent ? "kira" : "bütçe"} aralığı, zaman tercihin ve yazdığın açıklama.
      <strong>Adın, telefonun ve e-postan kartta gösterilmez;</strong> açıklamaya yazılan telefon/e-posta otomatik gizlenir.
      İletişim bilgini yalnızca ücretli üyeler ve onaylı danışmanlar görüntüleyebilir; her görüntülemede sana haber verilir.
    </div>
    <form class="panel" onsubmit="KT.createDemand(event)">
      <div class="form-grid">
        <div class="field full"><label for="d-txtype">İşlem tipi</label><select id="d-txtype" onchange="KT.setTxMode(this.value)"><option value="Satılık" ${!rent ? "selected" : ""}>Satın Alma</option><option value="Kiralık" ${rent ? "selected" : ""}>Kiralık</option></select><span class="helper">${rent ? "Kiralık ev arayan talebi (Ev Kirala)." : "Konut alıcısı talebi (Ev Al)."}</span></div>
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
              : `<span style="font-weight:600;display:block;margin-bottom:4px">Banka kredisi kullanmayı düşünüyor musun?</span>
                 <label class="check" style="display:inline-flex;margin-right:14px"><input type="radio" name="d-kredi" value="EVET" checked> Evet</label>
                 <label class="check" style="display:inline-flex"><input type="radio" name="d-kredi" value="HAYIR"> Hayır</label>
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

// [Faz 5] buyerOffers silindi - 2.0 sonrasi erisilemeyen eski akis.


// [Faz 5] buyerOfferDetail silindi - 2.0 sonrasi erisilemeyen eski akis.


function renderSeller(path) {
  const role = state.currentRole === "agent" ? "agent" : "seller";
  const sellerPath = path;
  // 2.0: ilan/teklif/eslesme/mesaj rotalari kaldirildi; eski baglantilar
  // talep havuzuna dusurulur ki kimse olu sayfada kalmasin.
  if (sellerPath.includes("/ev-ekle") || sellerPath.includes("/evlerim") ||
      sellerPath.includes("/teklif-gonder") || sellerPath.includes("/tekliflerim") ||
      sellerPath.includes("/mesajlar") || sellerPath.includes("/eslesmeler"))
    return dashboardLayout(role, sellerDemands(), path);
  if (sellerPath.includes("/talepler")) return dashboardLayout(role, sellerDemands(), path);
  if (sellerPath.includes("/kriter")) return dashboardLayout(role, kriterPage(), path);
  if (sellerPath.includes("/actiklarim")) return dashboardLayout(role, actiklarimPage(), path);
  if (sellerPath.includes("/dogrulama")) return dashboardLayout(role, sellerVerification(), path);
  if (sellerPath.includes("/paketler")) return dashboardLayout(role, sellerPackages(), path);
  if (sellerPath.includes("/ayarlar")) return dashboardLayout(role, settingsPage(currentUser()), path);
  return dashboardLayout(role, sellerOverview(), path);
}

/* 2.0 — "Aradigim Talepler" kriter ekrani. Uye kriter kaydeder; kritere uyan
   yeni talep yayina girdiginde eslesme bildirimi alir. */
function kriterPage() {
  const k = state.savedSearch || {};
  let iller = [];
  try { iller = JSON.parse(k.cities || "[]"); } catch { iller = []; }
  return `
    ${pageHead("Aradığım Talepler", "Kriterini kaydet; uyan yeni bir talep yayına girdiğinde sana haber verelim.")}
    <section class="panel">
      <div class="form-grid">
        <div class="field"><label for="kr-tx">Talep türü</label>
          <select id="kr-tx">
            <option value="" ${!k.tx ? "selected" : ""}>Kiralık + Satın alma</option>
            <option value="RENT" ${k.tx === "RENT" ? "selected" : ""}>Kiralık (kiracı arayanlar)</option>
            <option value="SALE" ${k.tx === "SALE" ? "selected" : ""}>Satın alma (konut alıcıları)</option>
          </select></div>
        <div class="field"><label for="kr-cat">Kategori</label>
          <select id="kr-cat">
            <option value="" ${!k.mainCategory ? "selected" : ""}>Tümü</option>
            ${MAIN_CATEGORIES.map((c) => `<option ${k.mainCategory === c ? "selected" : ""}>${escapeHtml(c)}</option>`).join("")}
          </select></div>
        <div class="field full"><label>İller <span class="muted">(en çok 10; boş bırakırsan tüm iller)</span></label>
          <div class="check-grid" style="max-height:220px;overflow:auto;border:1px solid #dde4ec;border-radius:8px;padding:10px">
            ${TR_ILLER.map((il) => `<label class="check"><input type="checkbox" class="kr-il" value="${escapeHtml(il.name)}" ${iller.includes(il.name) ? "checked" : ""}> ${escapeHtml(il.name)}</label>`).join("")}
          </div></div>
        <div class="field"><label for="kr-min">En az bütçe <span class="muted">(opsiyonel)</span></label>
          <input id="kr-min" type="number" inputmode="numeric" value="${k.minBudget || ""}" placeholder="0"></div>
        <div class="field"><label for="kr-max">En fazla bütçe <span class="muted">(opsiyonel)</span></label>
          <input id="kr-max" type="number" inputmode="numeric" value="${k.maxBudget || ""}" placeholder="Sınırsız"></div>
        <div id="kr-error" class="form-error"></div>
        <div class="field full"><button class="btn btn-primary" onclick="KT.kriterKaydet()">${icon("check", 16)} Kriterimi kaydet</button></div>
      </div>
      <div class="notice" style="margin-top:12px">Kriterine uyan yeni talepler yayına girdiğinde site içi bildirim ve (bildirim tercihin açıksa) e-posta alırsın.</div>
    </section>`;
}

/* 2.0 — "Iletisim Actiklarim": uyenin goruntledigi talepler. Bilgiler yeniden
   gosterilir; paket sinirsiz goruntuleme icerdigi icin tekrar ucret yoktur. */
function actiklarimPage() {
  const u = currentUser();
  const benimkiler = (state.contactViews || []).filter((v) => v.viewerId === u.id);
  const kartlar = benimkiler.map((v) => {
    const d = (state.demands || []).find((x) => x.id === v.demandId);
    return `<article class="card">
      <h3 style="margin:0 0 6px">${escapeHtml(d ? d.title : "Talep")}</h3>
      <p class="muted" style="margin:0 0 10px;font-size:13px">Görüntüleme: ${escapeHtml(v.createdAt || "")}</p>
      <button class="btn btn-small btn-primary" onclick="KT.iletisimGor('${escapeAttr(v.demandId)}')">${icon("lock", 14)} İletişimi tekrar gör</button>
    </article>`;
  }).join("");
  return `
    ${pageHead("İletişim Açtıklarım", "Görüntülediğin taleplerin iletişim bilgilerine buradan yeniden ulaşabilirsin.")}
    <div class="card-grid">${kartlar || empty("Henüz iletişim açmadın", "Talep havuzundan bir talep seç ve iletişim bilgisini gör.")}</div>`;
}

function sellerOverview() {
  // 2.0: ilan/teklif istatistikleri kalkti; talep havuzu + kriter + acilan iletisimler.
  const user = currentUser();
  const acilan = (state.contactViews || []).filter((v) => v.viewerId === user.id);
  const kriter = state.savedSearch || null;
  const uyelik = hasContactMembershipUI();
  return `
    ${pageHead("Genel Bakış", "Talep havuzu, aradığın talepler ve açtığın iletişimler burada.")}
    <div class="stat-grid">
      ${stat("Yayındaki talep", state.demands.filter((d) => d.status === "ACTIVE").length)}
      ${stat("Açtığın iletişim", acilan.length)}
      ${stat("Kayıtlı kriter", kriter ? "Var" : "Yok")}
      ${stat("Üyelik", uyelik ? "Aktif" : "Yok")}
    </div>
    <div class="grid grid-2">
      <section class="panel"><h3>Talep havuzu</h3><p class="muted" style="margin:8px 0 12px">Kimlik bilgisi görünmez; ihtiyaç özeti ve bütçe aralığı görünür. Üyelikle iletişim bilgisini açarsın.</p><a class="btn btn-primary" href="#/dashboard/satici/talepler">Talepleri gör</a></section>
      <section class="panel"><h3>Aradığın talepler</h3><p class="muted" style="margin:8px 0 12px">Kriterini kaydet; uyan talep yayına girince bildirim al.</p><a class="btn btn-secondary" href="#/dashboard/satici/kriter">Kriterimi ayarla</a></section>
    </div>
  `;
}

// [Faz 5] sellerProperties silindi - 2.0 sonrasi erisilemeyen eski akis.


// [Faz 5] propertyForm silindi - 2.0 sonrasi erisilemeyen eski akis.


// Talep havuzu filtresi (panel ici; sayfa yenilenmeden calisir)
let demandPoolFilter = { tx: "", city: "", touched: false };

function demandPoolTitle(tx) {
  if (tx === "RENT") return "Kiracı Talepleri";
  if (tx === "SALE") return "Konut Satın Alma Talepleri";
  return "Talep Havuzu";
}
function demandPoolRows() {
  // 2.0: ilan kalktigi icin uyum puani da kalkti; siralama one cikarilanlar +
  // en yeni. Yalniz ACTIVE talepler listelenir.
  const list = state.demands.filter((d) => {
    if ((d.status || "ACTIVE") !== "ACTIVE") return false;
    if (demandPoolFilter.tx && (d.transactionType || "SALE") !== demandPoolFilter.tx) return false;
    if (demandPoolFilter.city && d.city !== demandPoolFilter.city) return false;
    return true;
  });
  const rows = list
    .slice()
    .sort((a, b) => (Number(isBoosted(b)) - Number(isBoosted(a))) || String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .map((demand) => demandRow(demand, true, null))
    .join("");
  return { html: rows, count: list.length };
}
function sellerDemands() {
  // Varsayilan: uyenin akisina uygun taraf (ev sahibi -> kiracı talepleri).
  // Emlak danismani iki tarafla da calisir; ona tum talepler acilir.
  if (demandPoolFilter.tx === undefined || demandPoolFilter.tx === null) demandPoolFilter.tx = "";
  if (demandPoolFilter.tx === "" && !demandPoolFilter.touched) {
    const role = (currentUser() || {}).role;
    demandPoolFilter.tx = role === "AGENT" ? "" : (uiTxMode === "RENT" ? "RENT" : "SALE");
    demandPoolFilter.touched = true;
  }
  const { html, count } = demandPoolRows();
  const cities = [...new Set(state.demands.map((d) => d.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr"));
  const opt = (v, label, sel) => `<option value="${escapeAttr(v)}"${sel === v ? " selected" : ""}>${escapeHtml(label)}</option>`;
  const tx = demandPoolFilter.tx;
  // Faz 3: belgesi olmayan danismana havuz ustunde kilit bandi.
  const u = currentUser();
  const agentBandi = agentKilitli(u)
    ? `<div class="notice" style="margin:0 0 14px;background:#fdf3e3;border-color:#e6c882"><strong>${icon("lock", 14)} İletişim erişimin kilitli.</strong> Sorumlu Emlak Danışmanı (Seviye 5) belgen onaylanmadan iletişim bilgisi görüntüleyemezsin. <a href="#/dashboard/satici/dogrulama">Belgeni yükle →</a></div>`
    : (u && u.role === "AGENT" && Number(u.agentApproved) !== 1 && u.agentDocDeadline
      ? `<div class="notice" style="margin:0 0 14px"><strong>${icon("shield", 14)} Geçiş süresi:</strong> Belgeni en geç <strong>${escapeHtml(u.agentDocDeadline)}</strong> tarihine kadar yükle; yoksa iletişim erişimin kapanır. <a href="#/dashboard/satici/dogrulama">Danışman Doğrulama →</a></div>`
      : "");
  return `
    ${pageHead(demandPoolTitle(tx), tx === "RENT"
      ? "Evini kiralamak istiyorsan sana uygun kiracı talebini seç, iletişim bilgisini üyelikle aç ve doğrudan ara."
      : tx === "SALE"
        ? "Evine alıcı arıyorsan sana uygun konut alıcısının talebini seç, iletişim bilgisini üyelikle aç ve doğrudan ara."
        : "Yayındaki tüm talepler. Sana uygun olanı seç, iletişim bilgisini üyelikle aç, doğrudan ara.")}
    ${agentBandi}
    <div class="toolbar">
      <select id="dp-tx" onchange="KT.setDemandPoolFilter()">
        ${opt("RENT", "Kiralık ev talepleri", tx)}
        ${opt("SALE", "Konut satın alma talepleri", tx)}
        ${opt("", "Tümü", tx)}
      </select>
      <select id="dp-city" onchange="KT.setDemandPoolFilter()">
        ${opt("", "Tüm şehirler", demandPoolFilter.city)}
        ${cities.map((c) => opt(c, c, demandPoolFilter.city)).join("")}
      </select>
      <span class="pill" id="dp-count">${count} talep</span>
    </div>
    <div class="list" id="dp-list">${html || empty("Uygun talep yok", "Farklı bir şehir veya işlem türü seçmeyi deneyebilirsin.")}</div>
  `;
}

// [Faz 5] offerForm silindi - 2.0 sonrasi erisilemeyen eski akis.


// [Faz 5] sellerOffers silindi - 2.0 sonrasi erisilemeyen eski akis.


// Faz 3: danisman kilitli mi? (belge onayi yok VE gecis suresi de gecerli degil)
function agentKilitli(u) {
  if (!u || u.role !== "AGENT") return false;
  if (Number(u.agentApproved) === 1) return false;
  const bugun = new Date().toISOString().slice(0, 10);
  return !(u.agentDocDeadline && u.agentDocDeadline >= bugun);
}

// Faz 3: Danisman Dogrulama sayfasi — Seviye 5 belge yukleme + durum takibi.
function agentVerifyPage() {
  const user = currentUser();
  const SEVIYE5 = "Sorumlu Emlak Danışmanı (Seviye 5)";
  const belgeler = (state.verificationDocuments || [])
    .filter((d) => d.userId === user.id && String(d.type || "").includes("Seviye 5"))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  const son = belgeler[0];
  const onayli = Number(user.agentApproved) === 1;
  const bugun = new Date().toISOString().slice(0, 10);
  const gecis = user.agentDocDeadline && user.agentDocDeadline >= bugun;
  let durumHTML;
  if (onayli) {
    durumHTML = `<div class="notice" style="background:#eaf6ee;border-color:#9fd0ad"><strong>✅ Belgen onaylı.</strong> Danışman üyeliğinle talep sahiplerinin iletişim bilgisini görüntüleyebilirsin.</div>`;
  } else if (son && son.status === "PENDING") {
    durumHTML = `<div class="notice"><strong>⏳ Belgen incelemede.</strong> ${escapeHtml(son.fileName || "Belge")} — ${escapeHtml(son.createdAt || "")} tarihinde alındı. Onaylanınca bildirim ve e-posta alacaksın.</div>`;
  } else if (son && son.status === "REJECTED") {
    durumHTML = `<div class="notice" style="background:#fdecec;border-color:#e8a0a0"><strong>Belgen reddedildi.</strong> Sebep: ${escapeHtml(son.rejectReason || "belirtilmedi")}. Aşağıdan yeni belge yükleyebilirsin; reddedilen dosya 30 gün içinde silinir.</div>`;
  } else if (gecis) {
    durumHTML = `<div class="notice" style="background:#fdf3e3;border-color:#e6c882"><strong>Geçiş süresi:</strong> Belgeni en geç <strong>${escapeHtml(user.agentDocDeadline)}</strong> tarihine kadar yüklemelisin. Süre dolarsa iletişim bilgisi görüntüleme, belgen onaylanana dek kapanır.</div>`;
  } else {
    durumHTML = `<div class="notice" style="background:#fdf3e3;border-color:#e6c882"><strong>Belge gerekli.</strong> Talep sahiplerinin iletişim bilgisini görüntülemek ve danışman üyeliği satın almak için belgeni yükleyip onaylatman gerekiyor.</div>`;
  }
  return `
    ${pageHead("Danışman Doğrulama", "Sorumlu Emlak Danışmanı (Seviye 5) belgeni yükle; admin onayından sonra iletişim erişimin açılır.")}
    ${durumHTML}
    <section class="panel">
      <h3>Belge yükle</h3>
      <p class="muted" style="margin:8px 0 12px">e-Devlet üzerinden alınmış <strong>barkodlu</strong> "Sorumlu Emlak Danışmanı (Seviye 5)" belgeni yükle. Kabul edilen biçimler: PDF, JPG, PNG — en fazla 5 MB. Belgen yalnızca yönetici tarafından görüntülenir; talep sahipleriyle veya diğer üyelerle asla paylaşılmaz.</p>
      <div class="form-grid">
        <div class="field full"><label for="ag-file">Belge dosyası</label><input id="ag-file" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"></div>
      </div>
      <div id="ag-error" class="error"></div>
      <div class="form-actions"><button class="btn btn-primary" onclick="KT.belgeYukle()">${icon("shield", 16)} Belgeyi gönder</button></div>
    </section>
    <section class="panel"><h3>Belge geçmişim</h3><div class="list" style="margin-top:12px">${belgeler.map((d) => `
      <article class="row">
        <div class="row-main"><strong>${escapeHtml(d.fileName || d.type)}</strong>
          <p class="muted">${escapeHtml(d.createdAt || "")} · ${statusLabel(d.status)}${d.status === "REJECTED" && d.rejectReason ? " — " + escapeHtml(d.rejectReason) : ""}</p></div>
      </article>`).join("") || empty("Henüz belge yüklemedin", "Belgeni yükle; genellikle aynı gün incelenir.")}</div></section>
  `;
}

// Faz 3 (senaryo E): admin Danisman Onayi ekrani — belgeyi goruntule, onayla
// veya sebep yazarak reddet. Her islem sunucuda denetim kaydina duser.
function adminAgentApproval() {
  const SEVIYE5 = "Sorumlu Emlak Danışmanı (Seviye 5)";
  const belgeler = (state.verificationDocuments || []).filter((d) => String(d.type || "").includes("Seviye 5"));
  const bekleyen = belgeler.filter((d) => d.status === "PENDING");
  const gecmis = belgeler.filter((d) => d.status !== "PENDING")
    .sort((a, b) => String(b.reviewedAt || "").localeCompare(String(a.reviewedAt || ""))).slice(0, 20);
  const uyeAdi = (uid2) => { const u = (state.users || []).find((x) => x.id === uid2); return u ? `${u.name} (${u.email || ""})` : uid2; };
  const satir = (d, bekliyor) => `
    <article class="row">
      <div class="row-main">
        <strong>${escapeHtml(uyeAdi(d.userId))}</strong>
        <p class="muted">${escapeHtml(d.fileName || "belge")} · yükleme: ${escapeHtml(d.createdAt || "")}${d.reviewedAt ? " · inceleme: " + escapeHtml(d.reviewedAt) : ""} · ${statusLabel(d.status)}${d.rejectReason ? " — " + escapeHtml(d.rejectReason) : ""}</p>
        <div id="agr-goruntu-${escapeAttr(d.id)}" style="margin-top:8px"></div>
      </div>
      <div class="row-side" style="display:flex;gap:6px;flex-wrap:wrap">
        ${d.hasFile ? `<button class="btn btn-small btn-outline" onclick="KT.belgeGoruntule('${escapeAttr(d.id)}')">${icon("file", 14)} Belgeyi aç</button>` : `<span class="pill">dosya silinmiş</span>`}
        ${bekliyor ? `<button class="btn btn-small btn-primary" onclick="KT.belgeIncele('${escapeAttr(d.id)}','APPROVED')">Onayla</button>
        <button class="btn btn-small btn-outline" onclick="KT.belgeIncele('${escapeAttr(d.id)}','REJECTED')">Reddet</button>` : ""}
      </div>
    </article>`;
  return `
    ${pageHead("Danışman Onayı", "Sorumlu Emlak Danışmanı (Seviye 5) belgeleri. Onay, danışmanın iletişim erişimini açar; red sebep ister ve danışmana iletilir.")}
    <section class="panel"><h3>Bekleyen (${bekleyen.length})</h3><div class="list" style="margin-top:12px">${bekleyen.map((d) => satir(d, true)).join("") || empty("Bekleyen belge yok", "Yeni danışman belgesi yüklendiğinde burada görünür.")}</div></section>
    <section class="panel"><h3>Son incelenenler</h3><div class="list" style="margin-top:12px">${gecmis.map((d) => satir(d, false)).join("") || empty("Kayıt yok", "")}</div></section>
  `;
}

function sellerVerification() {
  if (currentUser().role === "AGENT") return agentVerifyPage();
  const user = currentUser();
  const docs = state.verificationDocuments.filter((doc) => doc.userId === user.id);
  return `
    ${pageHead("Üye Doğrulama", "Tapu, yetki ve kurumsal belgelerin denetim durumunu takip et.")}
    <section class="panel">
      <div class="grid grid-3">
        ${featureCard("file", "Tapu / yetki belgesi", "Satış yetkisini netleştirir.")}
        ${featureCard("shield", "Telefon ve e-posta", "Temel iletişim doğrulaması.")}
        ${featureCard("card", "Kurumsal belgeler", "Emlak ofisi ve vergi levhası alanı.")}
      </div>
      <div class="section-actions"><button class="btn btn-primary" onclick="KT.addSellerDoc()">Mock belge gönder</button></div>
    </section>
    <section class="panel"><h3>Belgelerim</h3><div class="list" style="margin-top:12px">${docs.map(documentRow).join("") || empty("Belge yok", "Belge göndererek güven skorunu yükseltebilirsin.")}</div></section>
  `;
}

function sellerPackages() {
  const roleTypes = state.currentRole === "agent" ? ["SELLER", "AGENT"] : ["SELLER"];
  return `${pageHead("Üyeliğim", "Talep sahiplerinin iletişim bilgisini görüntüleme üyeliği.")}${pricingCards(roleTypes)}`;
}

function renderAdmin(path) {
  let content = adminOverview();
  if (path.includes("/kullanicilar")) content = adminUsers();
  if (path.includes("/uyelikler")) content = adminMemberships();
  if (path.includes("/talepler")) content = adminDemands();
  if (path.includes("/ilanlar")) content = adminProperties();
  if (path.includes("/teklifler")) content = adminTable("Teklifler", state.offers, ["id", "demandId", "propertyId", "price", "status", "matchScore"]);
  if (path.includes("/epostalar")) content = adminEmails();
  if (path.includes("/danisman-onay")) content = adminAgentApproval();
  if (path.includes("/belgeler")) content = adminDocuments();
  if (path.includes("/sikayetler")) content = adminTable("Şikayetler", state.complaints, ["reason", "description", "status", "priority", "createdAt"]);
  if (path.includes("/risk")) content = adminTable("Risk Paneli", state.abuseSignals, ["userId", "type", "score", "metadata", "createdAt"]);
  if (path.includes("/odemeler")) content = adminTable("Ödemeler", state.payments, ["userId", "planId", "provider", "amount", "currency", "status"]);
  if (path.includes("/audit")) content = adminAudit();
  if (path.includes("/sms")) content = adminSms();
  return dashboardLayout("admin", content, path);
}

// Belirli gun sayisi icindeki kayitlari say (createdAt "YYYY-MM-DD" biciminde).
function sonGunSayisi(list, gun) {
  const sinir = new Date(Date.now() - gun * 86400000).toISOString().slice(0, 10);
  return (list || []).filter((x) => String(x.createdAt || "").slice(0, 10) >= sinir).length;
}
function panoSatir(etiket, bugun, hafta, ay) {
  return `<tr><td>${escapeHtml(etiket)}</td><td style="text-align:right;font-weight:600">${bugun}</td><td style="text-align:right">${hafta}</td><td style="text-align:right">${ay}</td></tr>`;
}

function adminOverview() {
  const users = state.users || [], demands = state.demands || [], properties = state.properties || [];
  const offers = state.offers || [], matches = state.matches || [], payments = state.payments || [];
  const activeDemands = demands.filter((d) => d.status === "ACTIVE").length;
  const activeProperties = properties.filter((p) => p.status === "ACTIVE").length;
  const revenue = payments.reduce((t, p) => p.status === "SUCCESS" ? t + Number(p.amount || 0) : t, 0);
  const askida = users.filter((u) => u.status === "SUSPENDED").length;

  // Huni: uye -> talep/ilan -> teklif -> eslesme. Oranlar bir onceki adima gore.
  const oran = (a, b) => b > 0 ? Math.round((a / b) * 100) + "%" : "—";
  const icerikSahibi = new Set([...demands.map((d) => d.buyerId), ...properties.map((p) => p.sellerId)].filter(Boolean)).size;

  // Kaynak kirilimi: uyeler nereden geldi?
  const kaynaklar = {};
  for (const u of users) {
    const k = u.acqGclid ? "Google Ads" : (u.acqSource || "").trim() || "Doğrudan";
    kaynaklar[k] = (kaynaklar[k] || 0) + 1;
  }
  const kaynakListe = Object.entries(kaynaklar).sort((a, b) => b[1] - a[1]);
  const enBuyuk = kaynakListe.length ? kaynakListe[0][1] : 1;

  return `
    ${pageHead("Operasyon Panosu", "Günlük hareket, dönüşüm hunisi ve üyelerin nereden geldiği.")}
    <div class="stat-grid">
      ${stat("Toplam üye", users.length)}
      ${stat("Yayındaki talep", activeDemands)}
      ${stat("Yayındaki ilan", activeProperties)}
      ${stat("Ciro", money(revenue))}
    </div>
    <div class="grid grid-2">
      <section class="panel">
        <h3>Hareket</h3>
        <div class="table-wrap" style="margin-top:12px"><table>
          <thead><tr><th></th><th style="text-align:right">Bugün</th><th style="text-align:right">7 gün</th><th style="text-align:right">30 gün</th></tr></thead>
          <tbody>
            ${panoSatir("Yeni üye", sonGunSayisi(users, 1), sonGunSayisi(users, 7), sonGunSayisi(users, 30))}
            ${panoSatir("Yeni talep", sonGunSayisi(demands, 1), sonGunSayisi(demands, 7), sonGunSayisi(demands, 30))}
            ${panoSatir("Yeni ilan", sonGunSayisi(properties, 1), sonGunSayisi(properties, 7), sonGunSayisi(properties, 30))}
            ${panoSatir("Teklif", sonGunSayisi(offers, 1), sonGunSayisi(offers, 7), sonGunSayisi(offers, 30))}
            ${panoSatir("Eşleşme", sonGunSayisi(matches, 1), sonGunSayisi(matches, 7), sonGunSayisi(matches, 30))}
            ${panoSatir("Ödeme", sonGunSayisi(payments, 1), sonGunSayisi(payments, 7), sonGunSayisi(payments, 30))}
          </tbody>
        </table></div>
        ${askida ? `<p class="muted" style="margin:10px 0 0">${askida} üye askıda.</p>` : ""}
      </section>
      <section class="panel">
        <h3>Dönüşüm hunisi</h3>
        <div class="table-wrap" style="margin-top:12px"><table>
          <thead><tr><th>Adım</th><th style="text-align:right">Sayı</th><th style="text-align:right">Bir önceki adıma göre</th></tr></thead>
          <tbody>
            <tr><td>Üye oldu</td><td style="text-align:right;font-weight:600">${users.length}</td><td style="text-align:right">—</td></tr>
            <tr><td>Talep veya ilan girdi</td><td style="text-align:right;font-weight:600">${icerikSahibi}</td><td style="text-align:right">${oran(icerikSahibi, users.length)}</td></tr>
            <tr><td>Teklif aldı/gönderdi</td><td style="text-align:right;font-weight:600">${offers.length}</td><td style="text-align:right">${oran(offers.length, demands.length + properties.length)}</td></tr>
            <tr><td>Eşleşti</td><td style="text-align:right;font-weight:600">${matches.length}</td><td style="text-align:right">${oran(matches.length, offers.length)}</td></tr>
            <tr><td>Ödeme yaptı</td><td style="text-align:right;font-weight:600">${payments.filter((p) => p.status === "SUCCESS").length}</td><td style="text-align:right">${oran(payments.filter((p) => p.status === "SUCCESS").length, matches.length)}</td></tr>
          </tbody>
        </table></div>
      </section>
    </div>
    <div class="grid grid-2">
      <section class="panel">
        <h3>Üyeler nereden geldi?</h3>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
          ${kaynakListe.map(([k, v]) => `
            <div>
              <div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:3px"><span>${escapeHtml(k)}</span><strong>${v}</strong></div>
              <div style="height:8px;background:#eef2f6;border-radius:99px;overflow:hidden"><div style="height:100%;width:${Math.round((v / enBuyuk) * 100)}%;background:${k === "Google Ads" ? "#e07b39" : "#2f6f9f"}"></div></div>
            </div>`).join("") || `<p class="muted">Henüz kaynak verisi yok.</p>`}
        </div>
      </section>
      <section class="panel"><h3>Bekleyen üye belgeleri</h3><div class="list" style="margin-top:12px">${(state.verificationDocuments || []).filter((doc) => doc.status === "PENDING").map(documentRow).join("") || empty("Bekleyen belge yok", "Yeni satıcı belgesi gelirse burada görünür.")}</div></section>
    </div>
  `;
}

// Denetim kaydi: kim, ne zaman, neye, ne yapti. Hassas alan goruntulemeleri de burada.
const AUDIT_ETIKET = {
  USER_REGISTERED: "Üyelik oluşturuldu", USER_LOGGED_IN: "Giriş yapıldı",
  PROFILE_UPDATED: "Profil güncellendi", MARKETING_CONSENT: "Pazarlama izni",
  IDENTITY_SAVED: "Kimlik verisi kaydedildi",
  ADMIN_IDENTITY_VIEWED: "Kimlik verisi görüntülendi",
  ADMIN_CONTENT_REMOVED: "İçerik yayından kaldırıldı", ADMIN_CONTENT_RESTORED: "İçerik geri alındı",
  ADMIN_CONTENT_EDITED: "İçerik düzenlendi", ADMIN_USER_MANAGED: "Üye yönetildi",
  ADMIN_MEMBERSHIP_GRANTED: "Üyelik tanımlandı", ADMIN_USER_ANONYMIZED: "Üye verisi silindi",
  PAYMENT_STARTED: "Ödeme başlatıldı", DOCUMENT_SUBMITTED: "Belge gönderildi",
  DOCUMENT_APPROVED: "Belge onaylandı", DOCUMENT_REJECTED: "Belge reddedildi",
  EMAIL_VERIFIED: "E-posta doğrulandı", EMAIL_VERIFY_RESENT: "Doğrulama bağlantısı yeniden gönderildi",
  EMAIL_VERIFY_REMINDER: "Doğrulama hatırlatması gönderildi",
  ACCOUNT_AUTO_SUSPENDED: "Süre doldu, hesap askıya alındı",
  ACCOUNT_AUTO_REACTIVATED: "Doğrulandı, askı kalktı",
};
// Dikkat cekmesi gereken islemler kirmizi gorunsun.
const AUDIT_KRITIK = new Set(["ADMIN_IDENTITY_VIEWED", "ADMIN_USER_ANONYMIZED", "ADMIN_USER_MANAGED", "ADMIN_CONTENT_REMOVED"]);

function adminAudit() {
  const kisi = (id) => { const u = (state.users || []).find((x) => x.id === id); return u ? u.name : (id || "—"); };
  const list = (state.auditLogs || []).slice().reverse();
  return `
    ${pageHead("Denetim Kaydı", "Panelde yapılan her işlem burada tutulur. Kimlik verisi görüntülemeleri de dâhil.")}
    <div class="toolbar">
      <input id="al-q" placeholder="Ara: kişi, işlem, açıklama" oninput="KT.renderAdminAudit()" style="flex:1;min-width:200px">
      <select id="al-tip" onchange="KT.renderAdminAudit()">
        <option value="">Tüm işlemler</option>
        <option value="kritik">Sadece kritik işlemler</option>
        ${Object.keys(AUDIT_ETIKET).map((k) => `<option value="${k}">${escapeHtml(AUDIT_ETIKET[k])}</option>`).join("")}
      </select>
    </div>
    <div id="admin-audit-box">${adminAuditTable(list, kisi)}</div>
  `;
}
function adminAuditTable(list, kisi) {
  const rows = list.map((a) => `<tr${AUDIT_KRITIK.has(a.action) ? ' style="background:#fff7f7"' : ""}>
      <td style="white-space:nowrap">${escapeHtml(a.createdAt || "")}</td>
      <td>${escapeHtml(kisi(a.actorId))}</td>
      <td>${AUDIT_KRITIK.has(a.action) ? `<strong style="color:#a12727">` : ""}${escapeHtml(AUDIT_ETIKET[a.action] || a.action || "")}${AUDIT_KRITIK.has(a.action) ? "</strong>" : ""}</td>
      <td>${escapeHtml(a.entityType || "")} <span class="muted" style="font-size:12px">${escapeHtml(a.entityId || "")}</span></td>
      <td style="font-size:13px">${escapeHtml(a.metadata || "")}</td>
    </tr>`).join("");
  return `<div style="display:flex;align-items:center;gap:10px;margin:0 0 8px">
      <p class="muted" style="margin:0;flex:1">${list.length} kayıt</p>
      <button class="btn btn-small btn-outline" onclick="KT.adminExportAudit()">${icon("file", 14)} CSV indir</button>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Tarih</th><th>Kim</th><th>İşlem</th><th>Kayıt</th><th>Açıklama</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="5" class="muted">Kayıt yok</td></tr>`}</tbody>
    </table></div>`;
}

// Telefon dogrulama kayitlari. Test modunda kod burada gorunur; gercek
// gonderimde kod hicbir yerde saklanmaz, yalnizca ozeti tutulur.
function adminSms() {
  const cfg = state.smsConfig || {};
  const rows = (state.phoneCodes || []).map((k) => {
    const u = (state.users || []).find((x) => x.id === k.userId) || {};
    const suresiDolmus = k.expiresAt && new Date(k.expiresAt) < new Date();
    const durum = k.usedAt ? "kullanıldı" : suresiDolmus ? "süresi doldu" : "bekliyor";
    return `<tr>
      <td>${escapeHtml(k.sentAt || "")}</td>
      <td>${escapeHtml(u.name || k.userId || "")}</td>
      <td>${escapeHtml(k.phone || "")}</td>
      <td>${k.testCode ? `<code style="font-size:15px;font-weight:700;letter-spacing:.08em">${escapeHtml(k.testCode)}</code>` : `<span class="muted">SMS ile gönderildi</span>`}</td>
      <td>${escapeHtml(String(k.attempts || 0))}</td>
      <td><span class="badge ${durum === "kullanıldı" ? "badge-green" : durum === "bekliyor" ? "badge-blue" : "badge-neutral"}">${durum}</span></td>
    </tr>`;
  }).join("");
  return `
    ${pageHead("SMS Doğrulama", "Telefon doğrulama kodları ve sağlayıcı durumu.")}
    <div class="notice" style="margin-bottom:14px">
      <strong>${cfg.enabled ? "Gerçek gönderim açık." : "Test modu."}</strong> ${escapeHtml(cfg.durum || "")}
      ${cfg.enabled ? "" : `<br><span class="muted">Netgsm hesabı açılıp NETGSM_USERCODE, NETGSM_PASSWORD ve NETGSM_HEADER değişkenleri girildiğinde gerçek SMS'e geçer.</span>`}
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Gönderim</th><th>Üye</th><th>Telefon</th><th>Kod</th><th>Deneme</th><th>Durum</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="6" class="muted">Henüz doğrulama isteği yok</td></tr>`}</tbody>
    </table></div>
  `;
}

function adminEmails() {
  const bekleyen = (state.users || []).filter((u) => !u.emailVerified && !u.epostaMuaf && u.emailVerifyDeadline);
  const yakin = bekleyen.filter((u) => { const k = epostaKalanSaat(u); return k !== null && k > 0 && k <= 24; });
  return `
    ${pageHead("E-posta Outbox", "Uygun talep girildiğinde hazırlanan anlık e-postalar.")}
    <section class="panel" style="margin-bottom:14px">
      <h3>E-posta doğrulama hatırlatması</h3>
      <p class="muted" style="margin:8px 0 12px">
        Doğrulamayan üyelere, süre dolmasına <strong>24 saatten az</strong> kaldığında otomatik hatırlatma gider —
        kişi başına bir kez. Sunucu bunu saatte bir kontrol eder; aşağıdaki düğme aynı taramayı hemen çalıştırır.
      </p>
      <div class="stat-grid" style="margin-bottom:12px">
        ${stat("Doğrulama bekleyen", bekleyen.length)}
        ${stat("Süresi 24 saatten az", yakin.length)}
      </div>
      <button class="btn btn-outline" onclick="KT.epostaHatirlatmaCalistir()">${icon("mail", 15)} Hatırlatma taramasını çalıştır</button>
    </section>
    <div class="notice" style="margin-bottom:14px"><strong>E-posta bildirimleri:</strong> Kullanıcılara giden bildirimler burada kayıt altında tutulur.</div>
    <div class="list">${state.emailOutbox.map(emailRow).join("") || empty("Henüz e-posta yok", "Yeni talep veya ev eklendiğinde uygun kullanıcılara e-posta kaydı oluşur.")}</div>
  `;
}

function adminDocuments() {
  return `
    ${pageHead("Üye Belgeleri", "Tapu, yetki ve kurumsal belgeler sadece yetkili admin/reviewer tarafından incelenir.")}
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
  "plan-seller-boost": "Evine alıcı arayan", "plan-seller-contact": "Evine alıcı arayan",
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
    return r && s ? "Konut alıcısı + Kiracı" : r ? "Kiracı" : s ? "Konut alıcısı" : "Kiracı / Konut alıcısı";
  }
  if (u.role === "SELLER") {
    const ps = (state.properties || []).filter((p) => p.sellerId === u.id);
    const r = ps.some((p) => (p.transactionType || "SALE") === "RENT");
    const s = ps.some((p) => (p.transactionType || "SALE") === "SALE");
    return r && s ? "Bireysel üye" : r ? "Ev sahibi" : s ? "Evine alıcı arayan" : "Bireysel üye";
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

// 2.0: sunucudaki hasContactMembership'in ekran tarafi (yalniz gosterim; asil kontrol sunucuda).
function hasContactMembershipUI() {
  const u = currentUser();
  if (!u) return false;
  if (u.role === "ADMIN") return true;
  if (u.role === "BUYER") return false;
  const KABUL = ["plan-landlord-contact", "plan-seller-contact", "plan-buyer-contact", "plan-pro"];
  const bugun = new Date().toISOString().slice(0, 10);
  return (state.entitlements || []).some((e) =>
    e.userId === u.id && KABUL.includes(e.planId) && String(e.activeTo || "") >= bugun);
}

function adminUsers() {
  const cities = [...new Set((state.users || []).map((u) => u.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr"));
  return `
    ${pageHead("Kullanıcılar", "Tüm üyeler. Ad/e-posta/telefon ile ara; tip ve şehre göre filtrele.")}
    <div class="toolbar">
      <input id="au-q" placeholder="Ara: ad, e-posta, telefon" oninput="KT.renderAdminUsers()" style="flex:1;min-width:200px">
      <select id="au-tip" onchange="KT.renderAdminUsers()"><option value="">Tüm tipler</option><option>Konut alıcısı</option><option>Kiracı</option><option>Evine alıcı arayan</option><option>Ev sahibi</option><option>Bireysel üye</option><option>Emlak danışmanı</option><option>Yönetici</option></select>
      <select id="au-city" onchange="KT.renderAdminUsers()"><option value="">Tüm şehirler</option>${cities.map((c) => `<option>${escapeHtml(c)}</option>`).join("")}</select>
      <select id="au-status" onchange="KT.renderAdminUsers()"><option value="">Tüm durumlar</option><option value="ACTIVE">Aktif</option><option value="SUSPENDED">Askıda</option><option value="ANONYMIZED">Anonimleştirilmiş</option></select>
      <select id="au-uyelik" onchange="KT.renderAdminUsers()"><option value="">Üyelik farketmez</option><option value="var">Üyeliği olanlar</option><option value="yok">Ücretsiz kullananlar</option></select>
    </div>
    <div id="admin-users-box">${adminUsersTable(state.users || [])}</div>
  `;
}
// Uyenin nereden geldigi (yalnizca admin panelinde). gclid varsa Google Ads demektir.
function acqLabel(u) {
  const src = (u.acqSource || "").trim();
  const cmp = (u.acqCampaign || "").trim();
  if (u.acqGclid) return `<span class="badge badge-gold" title="${escapeAttr(cmp || "Google Ads")}">Google Ads</span>`;
  if (!src) return `<span class="muted">Doğrudan</span>`;
  const label = src === "referral" ? "Yönlendirme" : src;
  return `<span class="badge badge-neutral" title="${escapeAttr([src, u.acqMedium, cmp].filter(Boolean).join(" · "))}">${escapeHtml(label)}</span>`;
}

// Kullanicilar ekranindaki filtreleri tek yerden uygula (tablo ve CSV ayni sonucu versin).
function filtreliUyeler() {
  const g = (id) => (document.getElementById(id) || {}).value || "";
  const q = g("au-q").toLowerCase().trim(), tip = g("au-tip"), city = g("au-city");
  const durum = g("au-status"), uyelik = g("au-uyelik");
  let list = (state.users || []).slice();
  if (q) list = list.filter((u) => ((u.name || "") + " " + (u.email || "") + " " + (u.phone || "")).toLowerCase().includes(q));
  if (city) list = list.filter((u) => u.city === city);
  if (tip) list = list.filter((u) => userTip(u).includes(tip));
  if (durum) list = list.filter((u) => (u.status || "ACTIVE") === durum);
  if (uyelik === "var") list = list.filter((u) => activeMembership(u.id));
  if (uyelik === "yok") list = list.filter((u) => !activeMembership(u.id));
  return list;
}

function filtreliDenetim() {
  const g = (id) => (document.getElementById(id) || {}).value || "";
  const q = g("al-q").toLowerCase().trim(), tip = g("al-tip");
  const kisi = (id) => { const u = (state.users || []).find((x) => x.id === id); return u ? u.name : (id || ""); };
  let list = (state.auditLogs || []).slice().reverse();
  if (tip === "kritik") list = list.filter((a) => AUDIT_KRITIK.has(a.action));
  else if (tip) list = list.filter((a) => a.action === tip);
  if (q) list = list.filter((a) => (kisi(a.actorId) + " " + (AUDIT_ETIKET[a.action] || a.action || "") + " " + (a.metadata || "")).toLowerCase().includes(q));
  return list;
}

// Basit CSV uretici. Excel'in Turkce karakterleri dogru okumasi icin BOM eklenir.
function csvIndir(rows, dosyaAdi) {
  if (!rows.length) return toast("Dışa aktarılacak kayıt yok.");
  const basliklar = Object.keys(rows[0]);
  const kacir = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
  const csv = [basliklar.join(";"), ...rows.map((r) => basliklar.map((h) => kacir(r[h])).join(";"))].join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${dosyaAdi}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  toast(`${rows.length} kayıt indirildi.`);
}

// Panel liste siralamasi: sutun basligina basinca sirala.
let adminSort = { key: "createdAt", dir: -1 };
function sortableHead(label, key) {
  const ok = adminSort.key === key;
  const ar = ok ? (adminSort.dir === 1 ? " ▲" : " ▼") : "";
  return `<th style="cursor:pointer;user-select:none" onclick="KT.adminSortBy('${key}')">${escapeHtml(label)}${ar}</th>`;
}
function applyAdminSort(list, valueOf) {
  return list.slice().sort((a, b) => {
    const va = valueOf(a, adminSort.key), vb = valueOf(b, adminSort.key);
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * adminSort.dir;
    return String(va || "").localeCompare(String(vb || ""), "tr") * adminSort.dir;
  });
}

// E-posta dogrulama durumu ve 72 saatlik sure gostergeleri (yalnizca panelde).
function epostaDurumRozeti(u) {
  if (u.emailVerified) return `<span class="badge badge-green">doğrulandı</span>`;
  // Duvar oncesi hesaplar: dogrulama zorunlu degil, aski uygulanmaz.
  if (u.epostaMuaf) return `<span class="badge badge-neutral" title="Doğrulama duvarı öncesi kayıtlı hesap — zorunlu değil">muaf</span>`;
  if (u.autoSuspendedAt) return `<span class="badge badge-neutral" style="background:#fde8e8;color:#a12727">askıya alındı</span>`;
  const kalan = epostaKalanSaat(u);
  if (kalan === null) return `<span class="badge badge-neutral">bekliyor</span>`;
  if (kalan <= 0) return `<span class="badge badge-neutral" style="background:#fde8e8;color:#a12727">süresi doldu</span>`;
  return `<span class="badge badge-blue">${kalan} saat kaldı</span>`;
}
function epostaKalanSaat(u) {
  if (!u || !u.emailVerifyDeadline) return null;
  const fark = new Date(u.emailVerifyDeadline) - new Date();
  return Math.ceil(fark / 3600000);
}
function epostaSureEtiketi(u) {
  const kalan = epostaKalanSaat(u);
  if (kalan === null) return "";
  return kalan > 0
    ? ` <span class="muted" style="font-size:12.5px">· ${kalan} saat içinde doğrulamalı</span>`
    : ` <span class="muted" style="font-size:12.5px;color:#a12727">· süre doldu</span>`;
}

function statusBadge(u) {
  if (u.status === "SUSPENDED") return `<span class="badge badge-neutral" style="background:#fde8e8;color:#a12727">Askıda</span>`;
  if (u.status === "ANONYMIZED") return `<span class="badge badge-neutral">Anonim</span>`;
  return `<span class="badge badge-green">Aktif</span>`;
}

function adminUsersTable(list) {
  const sorted = applyAdminSort(list, (u, k) => k === "tip" ? userTip(u) : u[k]);
  const rows = sorted.map((u) => {
    const m = activeMembership(u.id);
    return `<tr>
      <td>${escapeHtml(u.name || "")}</td>
      <td>${escapeHtml(u.phone || "—")}${u.phoneVerified ? ` <span title="Telefon doğrulandı" style="color:#2f8f4e;font-weight:700">✓</span>` : ""}</td>
      <td>${escapeHtml(u.email || "—")}</td>
      <td>${escapeHtml(u.city || "—")}</td>
      <td><span class="badge badge-blue">${escapeHtml(userTip(u))}</span></td>
      <td>${u.tcknMasked ? `<code style="font-size:12px">${escapeHtml(u.tcknMasked)}</code>` : `<span class="muted">—</span>`}</td>
      <td>${epostaDurumRozeti(u)}</td>
      <td style="font-size:13px">${escapeHtml(u.monthlyIncome || "—")}</td>
      <td style="font-size:13px">${escapeHtml(u.occupationGroup || "—")}</td>
      <td>${m ? `<span class="badge badge-gold">${escapeHtml(m.name)}</span>` : `<span class="muted">Ücretsiz</span>`}</td>
      <td>${acqLabel(u)}</td>
      <td>${statusBadge(u)}</td>
      <td>${escapeHtml(u.createdAt || "")}</td>
      <td><button class="btn btn-small btn-primary" onclick="KT.adminUserDetail('${escapeAttr(u.id)}')">Detay</button></td>
    </tr>`;
  }).join("");
  return `<div style="display:flex;align-items:center;gap:10px;margin:0 0 8px">
      <p class="muted" style="margin:0;flex:1">${list.length} üye</p>
      <button class="btn btn-small btn-outline" onclick="KT.adminExportUsers()">${icon("file", 14)} CSV indir</button>
    </div>
    <div class="table-wrap"><table>
      <thead><tr>${sortableHead("Ad", "name")}<th>Telefon</th><th>E-posta</th>${sortableHead("Şehir", "city")}${sortableHead("Tip", "tip")}<th>TCKN</th><th>E-posta durumu</th><th>Gelir</th><th>Meslek</th><th>Aktif Üyelik</th><th>Kaynak</th>${sortableHead("Durum", "status")}${sortableHead("Kayıt", "createdAt")}<th></th></tr></thead>
      <tbody>${rows || `<tr><td colspan="14" class="muted">Kayıt yok</td></tr>`}</tbody>
    </table></div>`;
}

function adminMemberships() {
  return `
    ${pageHead("Üyelikler", "Aktif üyelikler: üye, üyelik tipi, paket ve tarih. Ara/filtrele.")}
    <div class="toolbar">
      <input id="am-q" placeholder="Ara: ad, telefon, şehir" oninput="KT.renderAdminMemberships()" style="flex:1;min-width:200px">
      <select id="am-tip" onchange="KT.renderAdminMemberships()"><option value="">Tüm tipler</option><option>Konut alıcısı</option><option>Kiracı</option><option>Evine alıcı arayan</option><option>Ev sahibi</option><option>Bireysel üye</option><option>Emlak danışmanı</option></select>
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

// Ilan/talep icerik listesi: arama + filtre + moderasyon aksiyonlari.
function adminContentToolbar(pre) {
  return `<div class="toolbar">
      <input id="${pre}-q" placeholder="Ara: başlık, şehir, ilçe, açıklama" oninput="KT.renderAdminContent('${pre}')" style="flex:1;min-width:200px">
      <select id="${pre}-tx" onchange="KT.renderAdminContent('${pre}')"><option value="">Satılık + Kiralık</option><option value="SALE">Satılık</option><option value="RENT">Kiralık</option></select>
      <select id="${pre}-st" onchange="KT.renderAdminContent('${pre}')"><option value="">Tüm durumlar</option><option value="ACTIVE">Yayında</option><option value="REMOVED">Kaldırılmış</option></select>
    </div>`;
}

function adminModButtons(tur, it) {
  const yayinda = (it.status || "ACTIVE") === "ACTIVE";
  return `<button class="btn btn-small btn-primary" onclick="KT.adminItemDetail('${tur}','${escapeAttr(it.id)}')">Oku</button>
    <button class="btn btn-small btn-outline" onclick="KT.adminEditItem('${tur}','${escapeAttr(it.id)}')">Düzenle</button>
    ${yayinda
      ? `<button class="btn btn-small btn-outline" style="border-color:#e0b4b4;color:#a12727" onclick="KT.adminModerate('${tur}','${escapeAttr(it.id)}','REMOVED')">Kaldır</button>`
      : `<button class="btn btn-small btn-outline" onclick="KT.adminModerate('${tur}','${escapeAttr(it.id)}','ACTIVE')">Geri al</button>`}`;
}

function adminPropertiesTable(list) {
  const sorted = applyAdminSort(list, (p, k) => k === "price" ? Number(p.price || 0) : p[k]);
  const rows = sorted.map((p) => `<tr>
        <td>${escapeHtml(p.title || "")}</td>
        <td>${escapeHtml([p.mainCategory, p.propertyType].filter(Boolean).join(" · "))}</td>
        <td>${escapeHtml([p.city, p.district].filter(Boolean).join(" / "))}</td>
        <td>${money(p.price)}</td>
        <td>${p.transactionType === "RENT" ? "Kiralık" : "Satılık"}</td>
        <td><span class="badge ${p.status === "ACTIVE" ? "badge-green" : "badge-neutral"}">${p.status === "ACTIVE" ? "Yayında" : "Kaldırıldı"}</span>${p.moderationReason ? `<div class="muted" style="font-size:11.5px;margin-top:3px">${escapeHtml(p.moderationReason)}</div>` : ""}</td>
        <td style="white-space:nowrap;display:flex;gap:6px">${adminModButtons("property", p)}</td>
      </tr>`).join("");
  return `<div style="display:flex;align-items:center;gap:10px;margin:0 0 8px">
      <p class="muted" style="margin:0;flex:1">${list.length} ilan</p>
      <button class="btn btn-small btn-outline" onclick="KT.adminExportContent('property')">${icon("file", 14)} CSV indir</button>
    </div>
    <div class="table-wrap"><table>
      <thead><tr>${sortableHead("Başlık", "title")}<th>Kategori</th>${sortableHead("Şehir / İlçe", "city")}${sortableHead("Fiyat", "price")}<th>İşlem</th>${sortableHead("Durum", "status")}<th>Aksiyon</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="7" class="muted">İlan yok</td></tr>`}</tbody>
    </table></div>`;
}

function adminDemandsTable(list) {
  const sorted = applyAdminSort(list, (d, k) => k === "price" ? Number(d.maxBudget || 0) : d[k]);
  const rows = sorted.map((d) => `<tr>
        <td>${escapeHtml(d.title || "")}</td>
        <td>${escapeHtml([d.mainCategory, d.propertyType].filter(Boolean).join(" · "))}</td>
        <td>${escapeHtml([d.city, d.district].filter(Boolean).join(" / "))}</td>
        <td>${money(d.minBudget)} - ${money(d.maxBudget)}</td>
        <td>${d.transactionType === "RENT" ? "Kiralık" : "Satılık"}</td>
        <td><span class="badge ${d.status === "ACTIVE" ? "badge-green" : "badge-neutral"}">${d.status === "ACTIVE" ? "Yayında" : "Kaldırıldı"}</span>${d.moderationReason ? `<div class="muted" style="font-size:11.5px;margin-top:3px">${escapeHtml(d.moderationReason)}</div>` : ""}</td>
        <td style="white-space:nowrap;display:flex;gap:6px">${adminModButtons("demand", d)}</td>
      </tr>`).join("");
  return `<div style="display:flex;align-items:center;gap:10px;margin:0 0 8px">
      <p class="muted" style="margin:0;flex:1">${list.length} talep</p>
      <button class="btn btn-small btn-outline" onclick="KT.adminExportContent('demand')">${icon("file", 14)} CSV indir</button>
    </div>
    <div class="table-wrap"><table>
      <thead><tr>${sortableHead("Başlık", "title")}<th>Kategori</th>${sortableHead("Şehir / İlçe", "city")}${sortableHead("Bütçe / Kira", "price")}<th>İşlem</th>${sortableHead("Durum", "status")}<th>Aksiyon</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="7" class="muted">Talep yok</td></tr>`}</tbody>
    </table></div>`;
}

function adminProperties() {
  return `
    ${pageHead("İlan Arşivi", "2.0 geçişinde arşivlenen eski ilanlar. Site vitrininde görünmezler; kayıt amaçlı saklanır.")}
    ${adminContentToolbar("ap")}
    <div id="admin-prop-box">${adminPropertiesTable(state.properties || [])}</div>
  `;
}
function adminDemands() {
  return `
    ${pageHead("Alıcı Talepleri", "İçeriği oku, başlık/açıklamayı düzelt, gerekirse gerekçeyle yayından kaldır.")}
    ${adminContentToolbar("ad")}
    <div id="admin-dem-box">${adminDemandsTable(state.demands || [])}</div>
  `;
}

// [Faz 5] messagesPage silindi - 2.0 sonrasi erisilemeyen eski akis.


// [Faz 5] contactUnlockPanel silindi - 2.0 sonrasi erisilemeyen eski akis.


// [Faz 5] bubble silindi - 2.0 sonrasi erisilemeyen eski akis.


// [Faz 5] matchesPage silindi - 2.0 sonrasi erisilemeyen eski akis.


// [Faz 5] budgetDeclarationPage silindi - 2.0 sonrasi erisilemeyen eski akis.


function notificationsPage(userId) {
  const rows = state.notifications.filter((notification) => notification.userId === userId);
  return `${pageHead("Bildirimler", "Talep ve iletişim güncellemeleri.")}<div class="list">${rows.map((n) => `<article class="notice"><strong>${escapeHtml(n.title)}</strong><br>${escapeHtml(n.body)}<br><span class="muted">${n.createdAt}</span></article>`).join("") || empty("Bildirim yok", "Yeni gelişmeler burada görünür.")}</div>`;
}

function settingsPage(user) {
  const account = (state.authAccounts || []).find((item) => item.userId === user.id);
  const kalanSaat = epostaKalanSaat(user);
  // Muaf hesaplarda dogrulama zorunlu degil; uyariyla rahatsiz etme.
  const uyari = (user.emailVerified || user.epostaMuaf) ? "" : `
    <div class="notice" style="margin-bottom:14px;border-color:#f0e2c8;background:#fbf6ec">
      <strong>E-postanı doğrula.</strong>
      ${kalanSaat === null ? "Sana bir doğrulama bağlantısı gönderdik."
        : kalanSaat > 0 ? `Doğrulama bağlantın <strong>${kalanSaat} saat</strong> daha geçerli.`
        : "Doğrulama bağlantının süresi doldu; yeni bağlantı isteyebilirsin."}
      Gelen kutunda bulamazsan spam klasörüne bak.
      <div style="margin-top:10px"><button class="btn btn-small btn-outline" onclick="KT.epostaTekrarGonder()">Bağlantıyı tekrar gönder</button></div>
    </div>`;
  return `
    ${pageHead("Profil ve Ayarlar", "Üyelik bilgileri ve gizlilik tercihleri.")}
    ${uyari}
    <section class="panel">
      <div class="sample-top" style="margin-bottom:14px">
        <span class="badge badge-blue">${roleLabel(user.role)}</span>
        <span class="pill">${user.emailVerified ? "E-posta doğrulanmış" : (user.epostaMuaf ? "E-posta doğrulaması gerekmiyor" : "E-posta doğrulama bekliyor")}</span>
        ${user.phoneVerified ? `<span class="pill">Telefon doğrulanmış</span>` : ""}
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

    <section class="panel">
      <h3>Bildirim tercihleri</h3>
      <p class="muted" style="margin:8px 0 14px">Hangi e-postaları almak istediğini buradan seçersin. Ayarını istediğin zaman değiştirebilirsin.</p>
      <div class="check-grid">
        <label class="check">
          <input id="n-match" type="checkbox" ${user.notifyMatch === 0 ? "" : "checked"}>
          <span><strong>Talep ve iletişim e-postaları</strong><br>
          <span class="muted" style="font-size:13px">Teklif geldiğinde, eşleştiğinde ve iletişim bilgileri açıldığında anında haber veririz. Kapatırsan gelişmeleri yalnızca panelden takip edersin.</span></span>
        </label>
        <label class="check">
          <input id="n-digest" type="checkbox" ${user.notifyDigest === 0 ? "" : "checked"}>
          <span><strong>Sana uygun yeni ilan ve talepler</strong><br>
          <span class="muted" style="font-size:13px">Aramana uyan yeni bir ilan veya talep çıktığında haber veririz. Aynı bildirim 24 saat içinde ikinci kez gönderilmez.</span></span>
        </label>
      </div>
      <div class="notice" style="margin-top:14px">
        Şifre sıfırlama, ödeme ve hesabınla ilgili zorunlu e-postalar bu ayarlardan etkilenmez; onları her hâlükârda göndeririz.
      </div>
      <div class="form-actions"><button class="btn btn-primary" onclick="KT.saveNotifyPrefs()">${icon("check", 16)} Tercihleri kaydet</button></div>
    </section>

    <section class="panel" style="margin-top:16px">
      <h3 style="margin:0 0 6px">Açık rıza tercihleri</h3>
      <p class="muted" style="margin:0 0 14px;font-size:13.5px">
        Bu izinler isteğe bağlıdır; kapatman siteyi kullanmanı etkilemez. Her değişiklik tarihiyle kayda geçer.
      </p>
      <div class="check-grid" style="grid-template-columns:1fr">
        <label class="check" style="align-items:flex-start">
          <input id="iz-personalization" type="checkbox" ${user.personalizationConsent ? "checked" : ""}>
          <span><strong>Pazarlama ve kişiselleştirme</strong><br>
          <span class="muted" style="font-size:13px">Bilgilerinin, Konuttalebi'nin gayrimenkul, konut projeleri, finansman ve konutla bağlantılı ürün ve hizmetlerinin tanıtımı ile sana özel tekliflerin oluşturulması amacıyla işlenmesi.</span></span>
        </label>
        <label class="check" style="align-items:flex-start">
          <input id="iz-partner" type="checkbox" ${user.partnerTransferConsent ? "checked" : ""}>
          <span><strong>İş ortaklarına aktarım</strong><br>
          <span class="muted" style="font-size:13px">İletişim ve konut talep/tercih bilgilerinin; teklif sunulabilmesi için bankalara ve finansman kuruluşlarına, konut projesi geliştiren firmalara, sigorta şirketlerine, nakliyat firmalarına ve abonelik sağlayıcılarına aktarılması. T.C. kimlik numaran bu kapsamda aktarılmaz. <a href="#/kvkk" target="_blank">Tam metin</a></span></span>
        </label>
        <label class="check" style="align-items:flex-start">
          <input id="iz-marketing" type="checkbox" ${user.marketingConsent ? "checked" : ""}>
          <span><strong>Ticari elektronik ileti</strong><br>
          <span class="muted" style="font-size:13px">Kampanya, fırsat ve duyurular hakkında e-posta, SMS, telefon araması ve mobil bildirim gönderilmesi.</span></span>
        </label>
      </div>
      <div class="form-actions"><button class="btn btn-primary" onclick="KT.saveConsents()">${icon("check", 16)} İzinleri kaydet</button></div>
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
  // 2.0: tek icerik turu var - TALEP. "Konutlar" sekmesi kaldirildi, mod hep
  // demands. tx varsayilani route/uiTxMode'a gore RENT.
  searchState.mode = "demands";
  searchState.tx = uiTxMode === "SALE" ? "SALE" : "RENT";
  const ilOpts = `<option value="">Tüm iller</option>` + TR_ILLER.map((il) => `<option value="${escapeHtml(il.code)}" ${searchState.city === il.code ? "selected" : ""}>${escapeHtml(il.name)}</option>`).join("");
  const demandMode = true;
  return `
    ${pageHead("Talepler",
      "Yayındaki kiracı ve alıcı talepleri. Kimlik bilgisi görünmez; bölge, ihtiyaç ve bütçe aralığı görünür. Talep sahibinin iletişim bilgisine üyelikle ulaşır, doğrudan ararsın.")}
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
          <div class="search-count" id="search-count">${demandMode ? "Talepler" : "İlanlar"} yükleniyor…</div>
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
      <button type="button" class="${s.tx === "RENT" ? "active" : ""}" onclick="KT.searchTx('RENT')">Kiralık ev talepleri</button>
      <button type="button" class="${s.tx === "SALE" ? "active" : ""}" onclick="KT.searchTx('SALE')">Konut satın alma talepleri</button>
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

// Herkese acik talep karti: kimlik yok, yalnizca ihtiyac ozeti + maskeli aciklama.
// Faz 4: 60 gunluk yayin suresinden kalan gun (0 alti gosterilmez).
function talepKalanGun(d) {
  const bas = new Date(String(d.renewedAt || d.createdAt || "").slice(0, 10)).getTime();
  if (isNaN(bas)) return 60;
  return Math.max(0, 60 - Math.floor((Date.now() - bas) / 86400000));
}

// Kart tarihini dogal dile cevirir: bugun/dun/N gun once (aciliyet hissi).
function tarihGoreli(t) {
  if (!t) return "";
  const gun = Math.floor((Date.now() - new Date(String(t).slice(0, 10)).getTime()) / 86400000);
  if (isNaN(gun) || gun < 0) return String(t).slice(0, 10);
  if (gun === 0) return "bugün";
  if (gun === 1) return "dün";
  if (gun < 30) return `${gun} gün önce`;
  return String(t).slice(0, 10);
}

// Stil C kart hiyerarsisi (Okan onayi): butce en buyuk oge, ustte chip'ler,
// altta dogrulama rozeti + tazelik. "Satilik" kelimesi kullanilmaz (KARARLAR #9).
function publicDemandCard(d) {
  const rent = d.transactionType === "RENT";
  const loc = [d.city, d.district].filter(Boolean).join(", ") || "Konum belirtilmedi";
  const budget = (d.minBudget || d.maxBudget)
    ? `${shortMoney(d.minBudget)} – ${shortMoney(d.maxBudget)}${rent ? " / ay" : ""}`
    : "Bütçe belirtilmedi";
  const sqm = (d.minSqm || d.maxSqm) ? `${d.minSqm || "?"}–${d.maxSqm || "?"} m²` : "";
  return `
    <article class="listing-card ${isBoosted(d) ? "promoted-card" : ""}" onclick="KT.searchDetail('${escapeAttr(d.id)}')">
      <div class="lc-body">
        <div class="lc-chips">
          <span class="lc-tx ${rent ? "rent" : "sale"}">${rent ? "Kiralık ev arıyor" : "Konut satın almak istiyor"}</span>
          ${d.roomCount ? `<span class="lc-chip">${escapeHtml(d.roomCount)}</span>` : ""}
          ${sqm ? `<span class="lc-chip">${escapeHtml(sqm)}</span>` : ""}
          ${isBoosted(d) ? `<span class="lc-boost">Üste taşındı</span>` : ""}
        </div>
        <div class="lc-price">${escapeHtml(budget)}</div>
        <div class="lc-title">${escapeHtml(d.title || "")}</div>
        <div class="lc-loc">${icon("map", 13)} ${escapeHtml(loc)}${d.purchaseTimeline ? " · " + escapeHtml(d.purchaseTimeline) : ""}</div>
        <div class="lc-foot"><span class="lc-lock">✓ E-posta doğrulı · ${icon("lock", 12)} kimlik gizli</span><span class="lc-date">${escapeHtml(tarihGoreli(d.createdAt))}</span></div>
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

// --- Kayit formu listeleri. Sunucudaki listelerle BIREBIR ayni olmali. ---
const GELIR_ARALIKLARI = [
  "0 – 25.000 TL", "25.001 – 45.000 TL", "45.001 – 70.000 TL", "70.001 – 100.000 TL",
  "100.001 – 150.000 TL", "150.001 – 250.000 TL", "250.001 TL ve üzeri", "Belirtmek istemiyorum",
];
const MESLEK_GRUPLARI = {
  "Kamu & Kurumsal": ["Kamu Memuru / Devlet Personeli", "Özel Sektör Çalışanı (Büyük Şirket)", "KOBİ / SME Çalışanı"],
  "Serbest Meslekler": ["Doktor / Hekim", "Avukat / Hukukçu", "Mali Müşavir / Muhasebeci",
    "Mühendis (İnşaat, Makine, Elektrik, Yazılım vb.)", "Mimar / İç Mimar", "Diğer Serbest Meslek"],
  "Ticaret & Esnaf": ["Esnaf / Sanatkâr", "Tüccar / İthalat-İhracatçı", "Restoran / Cafe / Otel İşletmecisi", "Perakende Satış"],
  "Finans & Teknoloji": ["Bankacılık / Finans / Sigorta", "Bilgi Teknolojileri / Yazılım", "Danışmanlık"],
  "Eğitim & Sağlık & Sosyal": ["Öğretmen / Akademisyen", "Sağlık Personeli (Hemşire, Ebe, Tekniker vb.)", "Sosyal Hizmetler / STK"],
  "Üretim & Hizmet": ["İnşaat / Taahhüt", "Üretim / Sanayi", "Lojistik / Ulaşım",
    "Turizm / Otelcilik / Gastronomi", "Medya / İletişim / Reklam", "Tarım / Hayvancılık / Ormancılık"],
  "Diğer": ["Emekli", "Öğrenci", "Ev Hanımı / Ev Ekonomisine Katkı", "İşveren / Patron (Sektör Belirtmeli)",
    "Çalışmıyor / İş Arıyor", "Diğer"],
};

// T.C. kimlik numarasi bicimsel dogrulama (sunucudaki kontrolun aynisi).
// Istemcide de yapiyoruz ki kullanici hatayi aninda gorsun; asil kontrol sunucuda.
function tcknGecerliMi(value) {
  const s = String(value || "").trim();
  if (!/^[1-9][0-9]{10}$/.test(s)) return false;
  const d = s.split("").map(Number);
  const tek = d[0] + d[2] + d[4] + d[6] + d[8];
  const cift = d[1] + d[3] + d[5] + d[7];
  let h10 = (tek * 7 - cift) % 10;
  if (h10 < 0) h10 += 10;
  if (h10 !== d[9]) return false;
  return d.slice(0, 10).reduce((a, b) => a + b, 0) % 10 === d[10];
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
  // Guven rozeti/puani panel listelerinde gosterilmiyor (gercek skorlama sonraki asamada).
  return `
    <article class="row-card ${isBoosted(demand) ? "promoted-card" : ""}">
      <div class="thumb">${icon("key", 28)}</div>
      <div>
        <div class="row-title">${escapeHtml(demand.title)}</div>
        <div class="row-meta">${escapeHtml(demand.city)} / ${escapeHtml(demand.district)} · ${escapeHtml(demand.propertyType)} · ${escapeHtml(demand.roomCount)} · ${rangeText(demand)}</div>
        <div class="pill-row" style="margin-top:8px">${txPill(demand)}<span class="pill">${escapeHtml(demand.purchaseTimeline || "")}</span>${score !== null ? `<span class="pill">${score}/100 en iyi uyum</span>` : ""}${isBoosted(demand) ? `<span class="badge badge-coral">Üste taşındı</span>` : ""}</div>
        <p class="row-note">${escapeHtml(demand.description)}</p>
        ${demandExtraPills(demand)}
      </div>
      <div class="row-side">
        <span class="badge ${demand.status === "ACTIVE" ? "badge-green" : "badge-neutral"}">${statusLabel(demand.status)}</span>
        ${sellerView
          ? `<button class="btn btn-small btn-primary" onclick="KT.iletisimGor('${demand.id}')">${icon("lock", 14)} İletişim bilgisini gör</button>
             <button class="btn btn-small btn-outline" onclick="KT.talepBildir('${demand.id}')" title="Bu talebi yöneticiye bildir">Bildir</button>`
          : `<span class="pill" title="İletişimin kaç kez görüntülendi">${(state.contactViews || []).filter((v) => v.demandId === demand.id).length} görüntülenme</span>
             <span class="pill" title="60 günlük yayın süresinden kalan">${talepKalanGun(demand)} gün kaldı</span>
             <button class="btn btn-small btn-outline" onclick="KT.talepYenile('${demand.id}')">${icon("check", 14)} Yenile</button>
             <button class="btn btn-small btn-primary" onclick="KT.mockPromote('demand','${demand.id}')">Talebi üste taşı · yakında</button>`}
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
// [Faz 5] propertyRow silindi - 2.0 sonrasi erisilemeyen eski akis.


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
        <p class="helper" style="margin-top:6px">${escapeHtml(email.reason || "Otomatik bildirim")}</p>
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
    ARCHIVED: "Arşivlendi",
    SENT: "Gönderildi",
    SEEN: "Görüldü",
    INTERESTED: "Alıcı ilgileniyor",
    INFO_REQUESTED: "Bilgi istendi",
    DECLINED: "Uygun bulunmadı",
    MATCHED: "İletişim açıldı",
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

// [Faz 5] matchForOffer silindi - 2.0 sonrasi erisilemeyen eski akis.


// [Faz 5] ensureMatch silindi - 2.0 sonrasi erisilemeyen eski akis.


// Rotaya gore tarayici sekme basligi. Tek sayfa uygulama oldugu icin elle guncelliyoruz.
const PAGE_TITLES = {
  "": "Talebini Bırak, Seni Bulsunlar",
  // AJANS onaylı title (SAYFA HARİTASI 1. satır). index.html'deki <title> ile
  // AYNI olmalı — burada farklı yazılırsa tarayıcı sekmesi Google'ın gördüğünden
  // başka bir başlık gösterir.
  home: "Talebini Bırak, Seni Bulsunlar",
  ilanlar: "Talepler",
  talepler: "Talepler",
  ara: "Konut ara",
  "nasil-calisir": "Nasıl çalışır?",
  fiyatlandirma: "Fiyatlandırma ve üyelik paketleri",
  yardim: "Yardım ve sık sorulan sorular",
  alici: "Konut alıcıları için",
  satici: "Evine alıcı arayanlar için",
  giris: "Giriş yap",
  "uye-ol": "Üye ol",
  "talep-birak": "Kiralık ev talebi oluştur",
  "sifremi-unuttum": "Şifremi unuttum",
  "sifre-sifirla": "Yeni şifre belirle",
  "google-tamamla": "Bilgilerini tamamla",
  hosgeldin: "Hoş geldin — paketini seç",
  iletisim: "İletişim",
  kvkk: "KVKK aydınlatma metni",
  gizlilik: "Gizlilik politikası",
  "kullanim-sartlari": "Kullanım şartları",
  "cerez-politikasi": "Çerez politikası",
  "mesafeli-satis": "Mesafeli satış sözleşmesi",
  "on-bilgilendirme": "Ön bilgilendirme formu",
  "iade-iptal": "İade ve iptal koşulları",
  teslimat: "Teslimat ve ifa",
  "guvenli-islem-rehberi": "Güvenli işlem rehberi",
};
function updatePageTitle(path) {
  const base = "Konuttalebi";
  let suffix = "";
  if (path.startsWith("dashboard")) {
    suffix = path.startsWith("dashboard/admin") ? "Yönetim paneli" : "Panelim";
  } else {
    const key = path.split("/")[0].split("?")[0];
    suffix = PAGE_TITLES[key] !== undefined ? PAGE_TITLES[key] : PAGE_TITLES.home;
    // Alici modu (?tx=SALE): GA4/Ads trafiginde kiraci-alici ayrimi icin ayri baslik.
    if (key === "talep-birak" && /tx=SALE/.test(location.hash)) suffix = "Konut satın alma talebi oluştur";
  }
  document.title = suffix ? `${base} | ${suffix}` : base;
  // Reklam inis sayfasi arama sonuclarina girmesin. Hash rotasi oldugu icin
  // Google zaten ayri sayfa saymaz, ama yine de acikca kapatiyoruz: sadece
  // arama motoru icin var olan, ice linki olmayan sayfalar "doorway page"
  // muamelesi gorur ve cezasi tek sayfayla kalmaz, alan adina yazilir.
  const robots = document.querySelector('meta[name="robots"]');
  if (robots) {
    const kapali = path === "talep-birak" || path.startsWith("talep-birak");
    robots.setAttribute("content", kapali ? "noindex, nofollow" : "index, follow");
  }
}

function render() {
  const path = route();
  // Panel sayfalari giris gerektirir; admin paneli sadece ADMIN rolune acik.
  // E-posta dogrulama duvari: giris yapmis ama dogrulamamis kullanici panele
  // giremez. Yalnizca duvar ekrani ve hukuki sayfalar acik kalir.
  const oturumAcik = isSignedIn();
  const kul = oturumAcik ? currentUser() : null;
  const duvarAcikSayfalar = ["eposta-dogrula", "kvkk", "kullanim-sartlari", "cerez-politikasi", "yardim"];
  // epostaMuaf: duvar devreye girmeden once kayitli olan hesaplar kapsam disi.
  if (kul && kul.role !== "ADMIN" && !kul.epostaMuaf && kul.emailVerified === 0 && !duvarAcikSayfalar.includes(path)) {
    document.getElementById("app").innerHTML = `<div class="app">${header()}${emailWallPage()}${footer()}</div>`;
    updatePageTitle("eposta-dogrula");
    return;
  }
  if (path.startsWith("dashboard")) {
    if (!isSignedIn()) { location.hash = "/giris"; return; }
    if (path.startsWith("dashboard/admin") && currentUser().role !== "ADMIN") { location.hash = "/home"; return; }
    // Telefon dogrulamasi: talep/ilan/teklif olusturma ekranlari once dogrulama ister.
    // Sunucu da ayni kontrolu yapiyor; bu yalnizca kullaniciyi bos form doldurmaktan kurtarir.
    const dogrulamaGerektiren = ["/talep-olustur", "/ev-ekle", "/teklif-gonder"];
    const u = currentUser();
    const smsAcik = Boolean(state.config && state.config.smsVerification);
    if (smsAcik && u && !u.phoneVerified && dogrulamaGerektiren.some((x) => path.includes(x))) {
      try { sessionStorage.setItem("kt-dogrulama-sonrasi", path); } catch { /* onemli degil */ }
      location.hash = "/telefon-dogrula";
      return;
    }
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
  updatePageTitle(path);
  // Arama sayfasi (uye paneli ya da public #/ilanlar) acilinca ilanlari otomatik yukle.
  if (path.startsWith("dashboard/ara") || path === "talepler" || path === "ilanlar" || path === "ara") KT.searchRun();
  // Ana sayfada yayindaki gercek ilanlari yukle.
  if (path === "home" || path === "" || path === "/") KT.loadHomeListings();
  // Google tamamlama ekraninda bekleyen profili (ad/e-posta) doldur.
  if (path === "google-tamamla" || path.startsWith("google-tamamla")) KT.loadGooglePending();
  // Sehir sayfasindan ?il= ile gelindiyse formlarda il onsecili acilsin.
  if (preselectCity) { applyPreselectCity("d"); applyPreselectCity("p"); applyPreselectCity("s"); }
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
  // Talep havuzu filtresi: liste ve baslik sayfa yenilenmeden guncellenir.
  setDemandPoolFilter() {
    const tx = (document.getElementById("dp-tx") || {}).value;
    const city = (document.getElementById("dp-city") || {}).value;
    demandPoolFilter = {
      tx: tx === undefined ? demandPoolFilter.tx : tx,
      city: city === undefined ? demandPoolFilter.city : city,
      touched: true // kullanici sectiyse varsayilan bir daha ezmesin
    };
    render();
  },
  toggleNav(btn) {
    const nav = document.getElementById("site-nav");
    if (!nav) return;
    const open = nav.classList.toggle("open");
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
  },
  // Google'dan donen bekleyen profili tamamlama ekranina doldur.
  async loadGooglePending() {
    const info = document.getElementById("gc-info");
    const r = await api("/auth/google/pending");
    if (!r.ok) {
      if (info) { info.textContent = "Google oturumu bulunamadı veya süresi doldu. Lütfen tekrar deneyin."; info.style.background = "#fdecea"; }
      const btn = document.querySelector('form[onsubmit*="googleComplete"] button[type="submit"]');
      if (btn) btn.disabled = true;
      return;
    }
    const nameEl = document.getElementById("gc-name");
    const mailEl = document.getElementById("gc-email");
    if (nameEl && !nameEl.value) nameEl.value = r.data.name || "";
    if (mailEl) mailEl.value = r.data.email || "";
    if (info) info.innerHTML = `<strong>${escapeHtml(r.data.email || "")}</strong> ile devam ediyorsun. Şifre belirlemene gerek yok.`;
  },
  async googleComplete(event) {
    event.preventDefault();
    const g = (id) => (document.getElementById(id) || {}).value || "";
    document.getElementById("gc-error").classList.remove("show");
    const name = g("gc-name").trim();
    const phone = g("gc-phone").trim();
    const city = g("gc-city");
    const roleKey = g("gc-role") || "buyer";
    if (name.length < 3) return showFormError("gc-error", "Ad Soyad en az 3 karakter olmalı.");
    if (!(document.getElementById("gc-terms") || {}).checked) return showFormError("gc-error", "Üyelik için Kullanım Koşulları'nı kabul etmelisin.");
    if (phone.replace(/\D/g, "").length < 10) return showFormError("gc-error", "Geçerli bir telefon numarası gir.");
    const tckn = ((document.getElementById("gc-tckn") || {}).value || "").replace(/\D/g, "");
    const birthDate = (document.getElementById("gc-birth") || {}).value || "";
    const identityConsent = (document.getElementById("gc-identity-consent") || {}).checked || false;
    if (tckn && !tcknGecerliMi(tckn)) return showFormError("gc-error", "T.C. kimlik numarası geçersiz. Lütfen kontrol et.");
    if ((tckn || birthDate) && !identityConsent) return showFormError("gc-error", "Kimlik bilgilerinin işlenmesi için açık rıza kutusunu işaretlemelisin.");
    const btn = event.submitter; if (btn) btn.disabled = true;
    const r = await api("/auth/google/complete", "POST", { name, phone, city, role: roleForKey(roleKey), ...izinDegerleri("gc"), tckn, birthDate, identityConsent, attribution: attribution() });
    if (btn) btn.disabled = false;
    if (!r.ok) return showFormError("gc-error", (r.data && r.data.error) || "Üyelik tamamlanamadı.");
    ktTrack("kayit_tamamla", { rol: roleForKey(roleKey), sehir: city, yontem: "google" });
    uiTxMode = (roleKey === "tenant" || roleKey === "landlord") ? "RENT" : "SALE";
    await refreshState();
    toast("Üyeliğin oluşturuldu. Hoş geldin!");
    setRoute(dashboardPathForRole(r.data.role));
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
  // --- Kayit formu: bicimlendirme ve adim gecisi ---
  // ipucuId: ayni islev iki formda kullaniliyor (kayit ve misafir talep);
  // ipucu kutusunun kimligi cagirandan gelir.
  tcknFormat(el, ipucuId) {
    el.value = el.value.replace(/\D/g, "").slice(0, 11);
    const h = document.getElementById(ipucuId || "r-tckn-hint");
    if (!h) return;
    if (!el.value) { h.textContent = ""; h.style.color = ""; return; }
    if (el.value.length < 11) { h.textContent = `${el.value.length}/11 hane`; h.style.color = ""; return; }
    const ok = tcknGecerliMi(el.value);
    h.textContent = ok ? "Numara geçerli görünüyor." : "Bu numara geçersiz, kontrol et.";
    h.style.color = ok ? "#2f8f4e" : "#c0392b";
  },
  phoneFormat(el) {
    // +90 kutu ayri duruyor; burada yalniz 10 hane tutulur: 5xx xxx xx xx
    let d = el.value.replace(/\D/g, "");
    if (d.startsWith("90")) d = d.slice(2);
    if (d.startsWith("0")) d = d.slice(1);
    d = d.slice(0, 10);
    el.value = d.replace(/^(\d{3})(\d{0,3})(\d{0,2})(\d{0,2}).*$/, (m, a, b, c, e) =>
      [a, b, c, e].filter(Boolean).join(" "));
  },
  sifreGucu(el, ipucuId) {
    const h = document.getElementById(ipucuId || "r-pw-hint");
    if (!h) return;
    const v = el.value;
    const eksik = [];
    if (v.length < 8) eksik.push("en az 8 karakter");
    if (!/[a-zçğıöşü]/.test(v)) eksik.push("küçük harf");
    if (!/[A-ZÇĞİÖŞÜ]/.test(v)) eksik.push("büyük harf");
    if (!/\d/.test(v)) eksik.push("rakam");
    if (!v) { h.textContent = "En az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam."; h.style.color = ""; return; }
    h.textContent = eksik.length ? `Eksik: ${eksik.join(", ")}` : "Şifre kurallara uygun.";
    h.style.color = eksik.length ? "#c0392b" : "#2f8f4e";
  },
  /* ---------- 2.0: ILETISIMI GOR + KRITER ---------- */
  // Modelin yeni kalbi: talep sahibinin telefon/e-postasini uyelikle ac.
  // 402 = uyelik yok -> fiyatlandirmaya yonlendir. Bilgi modalda gosterilir;
  // panoya kopyalama yok, kullanici gorur ve arar.
  async iletisimGor(demandId) {
    if (!isSignedIn()) { toast("İletişim bilgisini görmek için üye olman gerekiyor."); setRoute("uye-ol/landlord"); return; }
    const r = await api(`/demands/${demandId}/contact`, "POST", {});
    if (!r.ok) {
      const mesaj = (r.data && r.data.error) || "İletişim bilgisi alınamadı.";
      toast(mesaj);
      // Faz 3: belge engeli dogrulama sayfasina, uyelik engeli fiyatlandirmaya goturur.
      if (mesaj.includes("belgen") || mesaj.includes("Belgeni")) setTimeout(() => setRoute("dashboard/satici/dogrulama"), 1200);
      else if (mesaj.includes("üyelik")) setTimeout(() => setRoute("fiyatlandirma"), 1200);
      return;
    }
    ktTrack("iletisim_acildi", { talep: demandId });
    const d = r.data;
    const eski = document.getElementById("kt-contact-modal");
    if (eski) eski.remove();
    const kutu = document.createElement("div");
    kutu.id = "kt-contact-modal";
    kutu.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(16,36,58,.55);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px" onclick="if(event.target===this)this.parentNode.remove()">
        <div class="panel" style="max-width:420px;width:100%;text-align:center">
          <div style="font-size:38px;line-height:1;margin-bottom:8px">&#128275;</div>
          <h3 style="margin:0 0 4px">${escapeHtml(d.name || "Talep sahibi")}</h3>
          <p class="muted" style="margin:0 0 14px;font-size:13.5px">Talep sahibine görüntülendiğin bilgisi iletildi (kimliğin paylaşılmadı).</p>
          <div style="display:grid;gap:8px;text-align:left">
            <a class="btn btn-outline" href="tel:${escapeAttr((d.phone || "").replace(/\D/g, ""))}">${icon("phone", 15)} ${escapeHtml(d.phone || "—")}</a>
            <a class="btn btn-outline" href="mailto:${escapeAttr(d.email || "")}">${icon("mail", 15)} ${escapeHtml(d.email || "—")}</a>
          </div>
          <p class="muted" style="margin:14px 0 10px;font-size:12.5px">Fiyat, pazarlık ve sözleşme için iletişime geçiniz. Konuttalebi ödeme ve tapu sürecine karışmaz.</p>
          <button class="btn btn-primary" style="width:100%" onclick="document.getElementById('kt-contact-modal').remove()">Kapat</button>
        </div>
      </div>`;
    document.body.appendChild(kutu);
    await refreshState();
  },
  async kriterKaydet() {
    const iller = [...document.querySelectorAll(".kr-il:checked")].map((k) => k.value);
    if (iller.length > 10) return showFormError("kr-error", "En fazla 10 il seçebilirsin.");
    const g = (id) => (document.getElementById(id) || {}).value || "";
    const r = await api("/kriter", "PUT", {
      tx: g("kr-tx"),
      mainCategory: g("kr-cat"),
      cities: iller,
      minBudget: Number(g("kr-min") || 0),
      maxBudget: Number(g("kr-max") || 0),
    });
    if (!r.ok) return showFormError("kr-error", (r.data && r.data.error) || "Kriter kaydedilemedi.");
    await refreshState();
    toast("Kriterin kaydedildi. Uyan yeni talepte haber vereceğiz.");
    render();
  },

  /* ---------- IZIN BLOGU ---------- */
  // "Tumunu sec" YALNIZCA istege bagli uc izni isaretler; zorunlu kutulara
  // (kosullar, kimlik rizasi) dokunmaz — zorunlu islemler toplu onaya
  // katilamaz. Hepsi seciliyken tekrar basilirsa temizler.
  izinTumunuSec(pre) {
    const kutular = [...document.querySelectorAll(`.${pre}-izin`)];
    if (!kutular.length) return;
    const hepsiSecili = kutular.every((k) => k.checked);
    kutular.forEach((k) => { k.checked = !hepsiSecili; });
    const btn = document.getElementById(`${pre}-izin-tumu`);
    if (btn) btn.textContent = hepsiSecili ? "Tümünü seç" : "Seçimi kaldır";
  },

  /* ---------- MISAFIR TALEP AKISI ---------- */
  // Form dolduruldugu an bir kez olay gonderilir: kac kisi baslayip
  // bitirmedigini gorebilmek icin. Donusum degil, yalnizca huni olcumu.
  misafirFormBasladi() {
    if (misafirOlayGitti) return;
    misafirOlayGitti = true;
    ktTrack("talep_formu_basladi", { akis: "misafir" });
  },
  misafirDevam(event) {
    event.preventDefault();
    const el = (id) => document.getElementById(id);
    const val = (id) => { const e = el(id); return e ? e.value : ""; };
    const sec = (id) => { const v = val(id); return /^(Farketmez|Belirtmek istemiyorum)$/.test(v) ? "" : v; };
    const ilSec = el("g-city");
    const cityName = ilSec && ilSec.value ? ilSec.selectedOptions[0].text : "";
    const mahalleler = [...document.querySelectorAll(".g-mah:checked")].map((x) => x.value);
    const min = Number(val("g-minbudget")), max = Number(val("g-maxbudget"));
    if (!cityName) return showFormError("g-error", "Hangi ilde ev aradığını seç.");
    if (!min || !max) return showFormError("g-error", "Aylık kira aralığını yaz.");
    if (max < min) return showFormError("g-error", "En fazla kira, en az kiradan küçük olamaz.");
    misafirVeri = {
      cityName, city: cityName,
      district: val("g-district"),
      neighborhoods: mahalleler,
      neighborhood: mahalleler[0] || "",
      mainCategory: CAT_KONUT,
      propertyType: val("g-type"),
      roomCount: val("g-rooms"),
      minBudget: min, maxBudget: max,
      purchaseTimeline: val("g-timeline"),
      occupation: sec("g-occupation"),
      furnished: el("g-furnished") ? el("g-furnished").checked : false,
      transactionType: misafirTx(),
      creditInterest: (document.querySelector('input[name="g-kredi"]:checked') || {}).value || "",
    };
    if (misafirTx() === "SALE" && !misafirVeri.creditInterest)
      return showFormError("g-error", "Banka kredisi sorusunu yanıtla (Evet veya Hayır).");
    misafirAdim = 2;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  },
  misafirGeri() { misafirAdim = 1; render(); window.scrollTo({ top: 0 }); },
  async misafirGonder(event) {
    event.preventDefault();
    const val = (id) => { const e = document.getElementById(id); return e ? e.value.trim() : ""; };
    const chk = (id) => { const e = document.getElementById(id); return e ? e.checked : false; };
    const name = val("g-name"), email = val("g-email"), phone = val("g-phone");
    const tckn = val("g-tckn"), birth = val("g-birth"), password = document.getElementById("g-password").value;
    if (name.length < 3) return showFormError("g-error2", "Adını ve soyadını yaz.");
    if (!email.includes("@")) return showFormError("g-error2", "Geçerli bir e-posta adresi yaz.");
    if (phone.replace(/\D/g, "").length !== 10) return showFormError("g-error2", "Cep telefonunu 10 hane olarak yaz (5xx xxx xx xx).");
    if (!tcknGecerliMi(tckn)) return showFormError("g-error2", "T.C. kimlik numarası geçersiz. Lütfen kontrol et.");
    if (!birth) return showFormError("g-error2", "Doğum tarihini gir.");
    const sifreEksik = (() => {
      if (password.length < 8) return "Şifre en az 8 karakter olmalı.";
      if (!/[a-zçğıöşü]/.test(password)) return "Şifre en az bir küçük harf içermeli.";
      if (!/[A-ZÇĞİÖŞÜ]/.test(password)) return "Şifre en az bir büyük harf içermeli.";
      if (!/\d/.test(password)) return "Şifre en az bir rakam içermeli.";
      return "";
    })();
    if (sifreEksik) return showFormError("g-error2", sifreEksik);
    if (!chk("g-identity-consent")) return showFormError("g-error2", "Kimlik bilgilerinin işlenmesi için açık rıza gerekiyor.");
    if (!chk("g-terms")) return showFormError("g-error2", "Kullanım Koşulları'nı kabul etmelisin.");

    // Girilen kisisel alanlar saklanir: "e-postami yanlis yazdim" dendiginde
    // veya bir hata dondugunde kullanici hicbir seyi yeniden yazmasin.
    misafirKisi = { name, email, phone, tckn, birth, marketing: chk("g-marketing") };

    const btn = document.getElementById("g-submit");
    if (btn) { btn.disabled = true; btn.textContent = "Gönderiliyor…"; }
    const r = await api("/kayit/talep", "POST", {
      ...misafirVeri,
      name, email, phone, password, tckn, birthDate: birth,
      identityConsent: true, termsAccepted: true,
      ...izinDegerleri("g"),
      attribution: attribution(),
    });
    if (btn) { btn.disabled = false; btn.textContent = "Talebimi yayına al"; }
    if (!r.ok) return showFormError("g-error2", (r.data && r.data.error) || "Talep gönderilemedi. Lütfen tekrar dene.");
    // Bu bir donusum DEGIL: asil donusum e-posta dogrulaninca sunucu tarafinda
    // tamamlanir. Burada yalnizca huni adimi olculur.
    ktTrack("talep_gonderildi", { akis: "misafir", sehir: misafirVeri.cityName });
    misafirSonuc = { email };
    render();
    window.scrollTo({ top: 0 });
  },
  async misafirTekrarGonder() {
    // Hesap olustu ama oturum yok; kullanici sifresiyle girip panelden de
    // isteyebilir. Burada sifre sifirlama altyapisi degil, dogrulama ucu gerekli
    // oldugu icin kullaniciyi girise yonlendirmek en durustu.
    toast("Bağlantıyı yeniden göndermek için giriş yap; panelinde 'tekrar gönder' düğmesi var.");
    setTimeout(() => { location.hash = "/giris"; }, 1200);
  },
  misafirEpostaDuzelt() {
    toast("E-postanı düzeltmek için talebi yeniden gönder — bilgilerin formda duruyor.");
    misafirSonuc = null;
    misafirAdim = 2;
    render();
  },
  // Kayit oncesi SMS kodu (yalnizca saglayici acikken gorunur)
  async regSendSms() {
    const tel = (document.getElementById("r-phone") || {}).value || "";
    const btn = document.getElementById("r-sms-btn");
    const hint = document.getElementById("r-sms-hint");
    if (btn) btn.disabled = true;
    const r = await api("/kayit/telefon-kod", "POST", { phone: tel });
    if (btn) btn.disabled = false;
    if (!r.ok) { if (hint) { hint.textContent = (r.data && r.data.error) || "Kod gönderilemedi."; hint.style.color = "#c0392b"; } return; }
    if (hint) { hint.textContent = r.data.testMode ? "Test modu: kod yönetim panelinde." : `${r.data.phoneMasked} numarasına kod gönderildi.`; hint.style.color = "#2f8f4e"; }
    if (btn) {
      let kalan = 60; btn.disabled = true;
      const t = setInterval(() => { kalan -= 1; btn.textContent = kalan > 0 ? `Tekrar (${kalan})` : "Kod gönder";
        if (kalan <= 0) { clearInterval(t); btn.disabled = false; } }, 1000);
    }
  },
  // 1. adimdan 2. adima gecis: burada TÜM 1. adim alanlari dogrulanir.
  async regNext() {
    const g = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
    document.getElementById("r-error").classList.remove("show");
    const name = g("r-name");
    const email = normalizeEmail(g("r-email"));
    const phone = g("r-phone").replace(/\D/g, "");
    const password = (document.getElementById("r-password") || {}).value || "";
    const password2 = (document.getElementById("r-password2") || {}).value || "";
    const tckn = g("r-tckn").replace(/\D/g, "");
    const birthDate = g("r-birth");
    const identityConsent = (document.getElementById("r-identity-consent") || {}).checked || false;

    if (name.length < 3) return showFormError("r-error", "Ad soyad en az 3 karakter olmalı.");
    if (!email.includes("@")) return showFormError("r-error", "Geçerli bir e-posta gir.");
    if (!/^5\d{9}$/.test(phone)) return showFormError("r-error", "Telefon 5 ile başlayan 10 hane olmalı (5xx xxx xx xx).");
    const pwEksik = [];
    if (password.length < 8) pwEksik.push("en az 8 karakter");
    if (!/[a-zçğıöşü]/.test(password)) pwEksik.push("küçük harf");
    if (!/[A-ZÇĞİÖŞÜ]/.test(password)) pwEksik.push("büyük harf");
    if (!/\d/.test(password)) pwEksik.push("rakam");
    if (pwEksik.length) return showFormError("r-error", `Şifre kuralları: ${pwEksik.join(", ")}.`);
    if (password !== password2) return showFormError("r-error", "Şifreler eşleşmiyor.");
    if (tckn && !tcknGecerliMi(tckn)) return showFormError("r-error", "T.C. kimlik numarası geçersiz. Lütfen kontrol et.");
    if ((tckn || birthDate) && !identityConsent)
      return showFormError("r-error", "Kimlik bilgilerinin işlenmesi için açık rıza kutusunu işaretlemelisin.");

    // SMS acikken kodu burada dogrula; kapaliyken bu adim atlanir.
    if (state.config && state.config.smsVerification) {
      const kod = ((document.getElementById("r-sms") || {}).value || "").replace(/\D/g, "");
      if (kod.length !== 6) return showFormError("r-error", "SMS onay kodunu gir.");
      const r = await api("/kayit/telefon-dogrula", "POST", { phone, code: kod });
      if (!r.ok) return showFormError("r-error", (r.data && r.data.error) || "Kod doğrulanamadı.");
    }
    KT.regStep(2);
  },
  regBack() { KT.regStep(1); },
  regStep(n) {
    const s1 = document.getElementById("reg-step-1"), s2 = document.getElementById("reg-step-2");
    const t1 = document.getElementById("reg-tab-1"), t2 = document.getElementById("reg-tab-2");
    if (!s1 || !s2) return;
    s1.style.display = n === 1 ? "" : "none";
    s2.style.display = n === 2 ? "" : "none";
    if (t1) t1.className = "reg-step" + (n === 1 ? " reg-step-on" : " reg-step-done");
    if (t2) t2.className = "reg-step" + (n === 2 ? " reg-step-on" : "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  },
  async register(event) {
    event.preventDefault();
    const g = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
    document.getElementById("r-error2").classList.remove("show");
    const roleKey = g("r-role");
    uiTxMode = (roleKey === "tenant" || roleKey === "landlord") ? "RENT" : "SALE";
    const accepted = (document.getElementById("r-terms") || {}).checked || false;
    if (!accepted)
      return showFormError("r-error2", "Üyelik için Kullanım Koşulları'nı kabul etmelisin.");
    const payload = {
      name: g("r-name"),
      email: normalizeEmail(g("r-email")),
      phone: "0" + g("r-phone").replace(/\D/g, ""),
      city: g("r-city"),
      role: roleForKey(roleKey),
      password: (document.getElementById("r-password") || {}).value || "",
      ...izinDegerleri("r"),
      tckn: g("r-tckn").replace(/\D/g, ""),
      birthDate: g("r-birth"),
      identityConsent: (document.getElementById("r-identity-consent") || {}).checked || false,
      monthlyIncome: g("r-income"),
      occupationGroup: g("r-occupation"),
      attribution: attribution(),
    };
    const btn = event.submitter; if (btn) btn.disabled = true;
    const r = await api("/register", "POST", payload);
    if (btn) btn.disabled = false;
    if (!r.ok) return showFormError("r-error2", (r.data && r.data.error) || "Üyelik oluşturulamadı.");
    ktTrack("kayit_tamamla", { rol: roleForKey(roleKey), sehir: payload.city, yontem: "sifre" });
    await refreshState();
    toast("Üyelik oluşturuldu. E-posta doğrulama bağlantısı gönderildi.");
    setRoute("hosgeldin");
  },
  skipPackages() {
    const user = currentUser();
    const role = user ? user.role : "BUYER";
    // 2.0: satici/danisman kayittan sonra talep havuzuna gider (ilan ekleme yok).
    setRoute(role === "BUYER" ? "dashboard/alici/talep-olustur" : "dashboard/satici/talepler");
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
  // --- Telefon dogrulama ---
  async phoneSendCode(tekrar) {
    const el = document.getElementById("pv-phone");
    const phone = el ? el.value.trim() : "";
    const hedefHata = tekrar ? "pv-error2" : "pv-error";
    const btn = event && event.target ? event.target : null;
    if (btn) btn.disabled = true;
    const r = await api("/phone/send-code", "POST", { phone });
    if (btn) btn.disabled = false;
    if (!r.ok) return showFormError(hedefHata, (r.data && r.data.error) || "Kod gönderilemedi.");
    if (r.data.alreadyVerified) { await refreshState(); return render(); }
    const t = document.getElementById("pv-target");
    if (t) t.textContent = r.data.phoneMasked || phone;
    const s1 = document.getElementById("pv-step1"), s2 = document.getElementById("pv-step2");
    if (s1) s1.style.display = "none";
    if (s2) s2.style.display = "";
    const kod = document.getElementById("pv-code");
    if (kod) kod.focus();
    toast(r.data.testMode
      ? "Test modu: SMS gönderilmedi, kod yönetim panelinde görünüyor."
      : "Kod gönderildi.");
    // Tekrar gonder butonunu 60 sn kilitle (sunucu da ayni siniri uyguluyor).
    const rb = document.getElementById("pv-resend");
    if (rb) {
      let kalan = 60;
      rb.disabled = true;
      const eskiMetin = "Kodu tekrar gönder";
      const sayac = setInterval(() => {
        kalan -= 1;
        rb.textContent = kalan > 0 ? `Tekrar gönder (${kalan})` : eskiMetin;
        if (kalan <= 0) { clearInterval(sayac); rb.disabled = false; }
      }, 1000);
    }
  },
  async phoneVerify() {
    const el = document.getElementById("pv-code");
    const code = el ? el.value.replace(/\D/g, "") : "";
    if (code.length !== 6) return showFormError("pv-error2", "6 haneli kodu gir.");
    const r = await api("/phone/verify", "POST", { code });
    if (!r.ok) return showFormError("pv-error2", (r.data && r.data.error) || "Doğrulanamadı.");
    await refreshState();
    ktTrack("telefon_dogrulandi", {});
    toast("Telefonun doğrulandı.");
    // Doğrulamadan önce gitmek istediği yer varsa oraya dön.
    const hedef = sessionStorage.getItem("kt-dogrulama-sonrasi");
    sessionStorage.removeItem("kt-dogrulama-sonrasi");
    setRoute(hedef || dashboardPathForRole((currentUser() || {}).role));
  },
  async epostaHatirlatmaCalistir() {
    const r = await api("/admin/eposta-hatirlat", "POST", {});
    if (!r.ok) return toast((r.data && r.data.error) || "Çalıştırılamadı.");
    await refreshState();
    toast(r.data.sent > 0 ? `${r.data.sent} kişiye hatırlatma gönderildi.` : "Şu an hatırlatma gerektiren üye yok.");
    render();
  },
  async checkVerified() {
    await refreshState();
    const u = currentUser();
    if (u && u.emailVerified) { toast("E-postan doğrulandı, hoş geldin."); setRoute(dashboardPathForRole(u.role)); }
    else toast("Henüz doğrulanmamış görünüyor. Bağlantıya tıkladığından emin ol.");
    render();
  },
  async epostaTekrarGonder() {
    const r = await api("/eposta/tekrar-gonder", "POST", {});
    if (!r.ok) return toast((r.data && r.data.error) || "Gönderilemedi.");
    if (r.data.alreadyVerified) { await refreshState(); render(); return toast("E-postan zaten doğrulanmış."); }
    await refreshState();
    toast("Doğrulama bağlantısı gönderildi. Gelen kutunu kontrol et.");
    render();
  },
  async saveConsents() {
    const chk = (id) => { const e = document.getElementById(id); return e ? e.checked : false; };
    const r = await api("/izinler", "PATCH", {
      personalizationConsent: chk("iz-personalization"),
      partnerTransferConsent: chk("iz-partner"),
      marketingConsent: chk("iz-marketing"),
    });
    if (!r.ok) return toast((r.data && r.data.error) || "İzinler kaydedilemedi.");
    await refreshState();
    toast("İzin tercihlerin kaydedildi.");
  },
  async saveNotifyPrefs() {
    const chk = (id) => { const el = document.getElementById(id); return el ? el.checked : true; };
    const r = await api("/bildirim/tercihler", "PATCH", { notifyMatch: chk("n-match"), notifyDigest: chk("n-digest") });
    if (!r.ok) return toast((r.data && r.data.error) || "Tercihler kaydedilemedi.");
    await refreshState();
    toast("Bildirim tercihlerin kaydedildi.");
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
  // Konutlar <-> Ev arayanlar (talepler) sekmesi
  // Ana sayfadaki "Tüm talepleri gör": arama sayfasini dogrudan "Ev arayanlar"
  // sekmesinde acar.
  tumTalepler() {
    searchState.mode = "demands";
    setRoute("talepler");
  },
  searchMode() {
    // 2.0: tek mod var. Eski cagrilar kirilmasin diye islev duruyor.
    searchState.mode = "demands";
    render();
  },
  async searchRun() {
    const box = document.getElementById("search-results");
    const cnt = document.getElementById("search-count");
    const s = searchState;
    s.mode = "demands";              // 2.0: yalniz talep
    const demandMode = true;
    const params = new URLSearchParams();
    params.set("tx", s.tx);
    if (s.mainCategory) params.set("mainCategory", s.mainCategory);
    if (s.subCategory) params.set("subCategory", s.subCategory);
    if (s.cityName) params.set("city", s.cityName);
    if (s.district) params.set("district", s.district);
    if (!demandMode && s.neighborhood) params.set("neighborhood", s.neighborhood);
    if (s.minPrice) params.set("minPrice", s.minPrice);
    if (s.maxPrice) params.set("maxPrice", s.maxPrice);
    const kind = demandMode ? "talepler" : "ilanlar";
    if (box) box.innerHTML = `<div class="empty" style="grid-column:1/-1"><b>Aranıyor…</b><span class="muted">Uygun ${kind} getiriliyor.</span></div>`;
    const r = await api((demandMode ? "/demands/search?" : "/properties/search?") + params.toString());
    let items = (r.ok && r.data && r.data.items) ? r.data.items : [];
    const priceOf = (x) => demandMode ? (x.maxBudget || x.minBudget || 0) : (x.price || 0);
    if (s.sort === "price-asc") items = items.slice().sort((a, b) => priceOf(a) - priceOf(b));
    else if (s.sort === "price-desc") items = items.slice().sort((a, b) => priceOf(b) - priceOf(a));
    _searchItems = items;
    if (cnt) cnt.textContent = items.length
      ? `${items.length} ${demandMode ? "talep" : "ilan"} listelendi`
      : (demandMode ? "Talep bulunamadı" : "İlan bulunamadı");
    if (!box) return;
    box.innerHTML = items.length
      ? items.map(demandMode ? publicDemandCard : listingCard).join("")
      : `<div class="empty" style="grid-column:1/-1"><b>Sonuç bulunamadı</b><span class="muted">Filtreleri genişletmeyi dene: ilçe kaldır ya da ${demandMode ? "bütçe" : "fiyat"} aralığını aç.</span></div>`;
  },
  // Ana sayfadaki hızlı arama çubuğu → public #/ilanlar sayfasına filtreyle geç.
  homeSearch() {
    const g = (id) => (document.getElementById(id) || {}).value || "";
    searchState.tx = g("home-tx") === "SALE" ? "SALE" : "RENT";
    uiTxMode = searchState.tx;
    searchState.mainCategory = g("home-cat") || "";
    searchState.subCategory = "";
    const citySel = document.getElementById("home-city");
    searchState.city = citySel ? citySel.value : "";
    searchState.cityName = (citySel && citySel.value) ? citySel.selectedOptions[0].text : "";
    searchState.district = ""; searchState.neighborhood = ""; searchState.minPrice = ""; searchState.maxPrice = ""; searchState.sort = "new";
    searchState.mode = "demands";
    setRoute("talepler");
  },
  // Ana sayfada yayındaki en yeni gerçek ilanları göster (giriş gerekmez).
  async loadHomeListings() {
    // 2.0: ilan vitrini yok; ana sayfa yalniz talep gosterir.
    const dBox = document.getElementById("home-demands");
    if (dBox) {
      const rd = await api("/demands/search?transactionType=RENT");
      const talepler = (rd.ok && rd.data && rd.data.items) ? rd.data.items.slice(0, 8) : [];
      _searchItems = talepler;
      dBox.innerHTML = talepler.length
        ? talepler.map(publicDemandCard).join("")
        : `<div class="empty" style="grid-column:1/-1"><b>Henüz talep yok</b><span class="muted">İlk talepler oluşturulduğunda burada görünür.</span></div>`;
    }
  },
  searchDetail(id) {
    const p = _searchItems.find((x) => x.id === id);
    if (!p) return;
    // Hangi modal acilacak? Arama sayfasinda sekmeye, ana sayfada kaydin kendisine
    // bakariz: talepte fiyat yerine butce araligi vardir.
    const talepMi = p.price === undefined && (p.minBudget !== undefined || p.maxBudget !== undefined);
    if (searchState.mode === "demands" || talepMi) return KT.demandDetail(p);
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
  // Herkese acik talep detayi: kimlik yok; teklif icin uyelik yonlendirmesi var.
  demandDetail(d) {
    const u = currentUser();
    const rent = d.transactionType === "RENT";
    const loc = [d.city, d.district].filter(Boolean).join(", ") || "Konum belirtilmedi";
    const meta = [d.mainCategory, d.propertyType].filter(Boolean);
    if (d.roomCount) meta.push(d.roomCount);
    if (d.minSqm || d.maxSqm) meta.push(`${d.minSqm || "?"}-${d.maxSqm || "?"} m²`);
    if (d.purchaseTimeline) meta.push(d.purchaseTimeline);
    if (d.heatingType) meta.push(d.heatingType);
    const feats = [...parseFeatures(d.interiorFeatures), ...parseFeatures(d.exteriorFeatures)].map(escapeHtml);
    const budget = `${shortMoney(d.minBudget)} - ${shortMoney(d.maxBudget)}${rent ? " / ay" : ""}`;
    const cta = !isSignedIn()
      ? `<a class="btn btn-primary" style="flex:1" href="#/uye-ol/${rent ? "landlord" : "seller"}" onclick="KT.closeSearchDetail()">İletişim için üye ol</a>`
      : (u && u.role === "BUYER")
        ? `<a class="btn btn-primary" style="flex:1" href="#/dashboard/alici/taleplerim" onclick="KT.closeSearchDetail()">Kendi talebimi yönet</a>`
        : `<button class="btn btn-primary" style="flex:1" onclick="KT.closeSearchDetail();KT.iletisimGor('${escapeAttr(d.id)}')">${icon("lock", 14)} İletişim bilgisini gör</button>`;
    const old = document.getElementById("kt-listing-overlay");
    if (old) old.remove();
    const ov = document.createElement("div");
    ov.id = "kt-listing-overlay";
    ov.style.cssText = "position:fixed;inset:0;background:rgba(8,18,30,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px";
    ov.onclick = (e) => { if (e.target === ov) KT.closeSearchDetail(); };
    ov.innerHTML = `<div style="background:#fff;border-radius:14px;max-width:560px;width:100%;max-height:90vh;overflow:auto;box-shadow:0 20px 60px rgba(8,18,30,.35)">
        <div class="lc-media" style="height:150px;border-radius:14px 14px 0 0"><div class="lc-ph">${icon("key", 46)}</div><span class="lc-tx ${rent ? "rent" : "sale"}">${rent ? "Kiralık ev arıyor" : "Satılık ev arıyor"}</span></div>
        <div style="padding:20px">
          <h3 style="margin:0 0 6px;font-size:20px;color:#10243a">${escapeHtml(d.title || "")}</h3>
          <p style="margin:0 0 4px;color:#5b6b7d;font-size:14px">${icon("map", 13)} ${escapeHtml(loc)}</p>
          <p style="margin:8px 0;font-size:22px;font-weight:700;color:#e07b39">${escapeHtml(budget)}</p>
          <div class="pill-row" style="margin:10px 0">${meta.map((t) => `<span class="pill">${escapeHtml(t)}</span>`).join("")}</div>
          ${feats.length ? `<div class="pill-row" style="margin:10px 0">${feats.map((t) => `<span class="pill">${t}</span>`).join("")}</div>` : ""}
          <p style="margin:12px 0;color:#26333f;font-size:14px;line-height:1.6">${escapeHtml(d.description || "")}</p>
          <div class="notice" style="margin:12px 0"><strong>${icon("lock", 13)} Kimlik gizli.</strong> Talep sahibinin adı, telefonu ve e-postası herkese açık gösterilmez; iletişim bilgisi üyelikle görüntülenir. Ödemeye ve pazarlığa karışmayız.</div>
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
    const box = document.getElementById("admin-users-box");
    if (box) box.innerHTML = adminUsersTable(filtreliUyeler());
  },
  // Sutun basligina basinca sirala; hangi liste acikssa onu yeniden ciz.
  adminSortBy(key) {
    adminSort = adminSort.key === key ? { key, dir: -adminSort.dir } : { key, dir: 1 };
    if (document.getElementById("admin-users-box")) KT.renderAdminUsers();
    if (document.getElementById("admin-prop-box")) KT.renderAdminContent("ap");
    if (document.getElementById("admin-dem-box")) KT.renderAdminContent("ad");
  },
  renderAdminContent(pre) {
    const g = (id) => (document.getElementById(id) || {}).value || "";
    const q = g(pre + "-q").toLowerCase().trim(), tx = g(pre + "-tx"), st = g(pre + "-st");
    const ilan = pre === "ap";
    let list = (ilan ? state.properties : state.demands || []).slice();
    if (q) list = list.filter((x) => ((x.title || "") + " " + (x.city || "") + " " + (x.district || "") + " " + (x.description || "")).toLowerCase().includes(q));
    if (tx) list = list.filter((x) => (x.transactionType || "SALE") === tx);
    if (st) list = list.filter((x) => (x.status || "ACTIVE") === st);
    const box = document.getElementById(ilan ? "admin-prop-box" : "admin-dem-box");
    if (box) box.innerHTML = ilan ? adminPropertiesTable(list) : adminDemandsTable(list);
  },
  // --- Moderasyon: yayindan kaldir / geri al ---
  async adminModerate(tur, id, durum) {
    let gerekce = "";
    if (durum === "REMOVED") {
      gerekce = (window.prompt("Yayından kaldırma gerekçesi (kullanıcıya bildirilecek):", "") || "").trim();
      if (!gerekce) return;
      if (gerekce.length < 5) return toast("Gerekçe en az 5 karakter olmalı.");
    }
    const r = await api(`/admin/moderate/${tur}/${id}`, "POST", { status: durum, reason: gerekce });
    if (!r.ok) return toast((r.data && r.data.error) || "İşlem yapılamadı.");
    await refreshState();
    toast(durum === "REMOVED" ? "Yayından kaldırıldı ve kullanıcıya bildirildi." : "Tekrar yayına alındı.");
    render();
  },
  async adminEditItem(tur, id) {
    const it = tur === "property" ? (state.properties || []).find((p) => p.id === id) : (state.demands || []).find((d) => d.id === id);
    if (!it) return;
    const baslik = window.prompt("Başlık:", it.title || "");
    if (baslik === null) return;
    const aciklama = window.prompt("Açıklama:", it.description || "");
    if (aciklama === null) return;
    const r = await api(`/admin/edit/${tur}/${id}`, "PATCH", { title: baslik, description: aciklama });
    if (!r.ok) return toast((r.data && r.data.error) || "Güncellenemedi.");
    await refreshState();
    toast("Kayıt güncellendi.");
    render();
  },
  // --- Uye detay: her sey tek ekranda ---
  adminUserDetail(id) {
    const u = (state.users || []).find((x) => x.id === id);
    if (!u) return;
    const dem = (state.demands || []).filter((d) => d.buyerId === id);
    const prop = (state.properties || []).filter((p) => p.sellerId === id);
    const off = (state.offers || []).filter((o) => o.sellerId === id || o.buyerId === id);
    const mat = (state.matches || []).filter((m) => m.buyerId === id || m.sellerId === id);
    const pay = (state.payments || []).filter((p) => p.userId === id);
    const ents = (state.entitlements || []).filter((e) => e.userId === id);
    const acc = (state.authAccounts || []).find((a) => a.userId === id) || {};
    const planlar = (state.plans || []);
    const satir = (k, v) => `<div style="display:flex;gap:10px;padding:5px 0;border-bottom:1px solid #eef2f6"><span style="color:#7a8a99;min-width:150px;font-size:13px">${escapeHtml(k)}</span><span style="font-size:13.5px;color:#26333f">${v}</span></div>`;
    const mini = (baslik, liste, ciz) => `
      <div style="margin-top:14px">
        <div style="font-size:12px;color:#7a8a99;text-transform:uppercase;letter-spacing:.03em;margin-bottom:6px">${escapeHtml(baslik)} (${liste.length})</div>
        ${liste.length ? `<div style="display:flex;flex-direction:column;gap:5px">${liste.slice(0, 8).map(ciz).join("")}</div>` : `<p class="muted" style="margin:0;font-size:13px">Kayıt yok</p>`}
        ${liste.length > 8 ? `<p class="muted" style="margin:5px 0 0;font-size:12px">…ve ${liste.length - 8} kayıt daha</p>` : ""}
      </div>`;
    const kucukKart = (metin, rozet) => `<div style="display:flex;justify-content:space-between;gap:8px;background:#f5f8fb;border-radius:8px;padding:7px 10px;font-size:13px"><span>${metin}</span><span style="color:#7a8a99;white-space:nowrap">${rozet}</span></div>`;

    const old = document.getElementById("kt-admin-detail"); if (old) old.remove();
    const ov = document.createElement("div");
    ov.id = "kt-admin-detail";
    ov.style.cssText = "position:fixed;inset:0;background:rgba(8,18,30,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px";
    ov.onclick = (e) => { if (e.target === ov) KT.closeAdminDetail(); };
    ov.innerHTML = `<div style="background:#fff;border-radius:14px;max-width:760px;width:100%;max-height:92vh;overflow:auto;box-shadow:0 20px 60px rgba(8,18,30,.35);padding:22px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div>
            <h3 style="margin:0;font-size:20px;color:#10243a">${escapeHtml(u.name || "—")}</h3>
            <p class="muted" style="margin:4px 0 0;font-size:12.5px">${escapeHtml(u.id)}</p>
          </div>
          <div style="display:flex;gap:6px;align-items:center">${statusBadge(u)}<span class="badge badge-blue">${escapeHtml(userTip(u))}</span></div>
        </div>

        <div style="margin-top:14px">
          ${satir("E-posta", escapeHtml(u.email || "—") + (u.emailVerified
            ? ` <span class="badge badge-green" style="margin-left:6px">doğrulandı</span>`
            : ` <span class="badge badge-neutral" style="margin-left:6px">doğrulanmadı</span>${epostaSureEtiketi(u)}`))}
          ${satir("Telefon", escapeHtml(u.phone || "—") + (u.phoneVerified ? ` <span class="badge badge-green" style="margin-left:6px">doğrulandı</span>` : ` <span class="badge badge-neutral" style="margin-left:6px">doğrulanmadı</span>`))}
          ${satir("Şehir", escapeHtml(u.city || "—"))}
          ${satir("Aylık gelir", escapeHtml(u.monthlyIncome || "—"))}
          ${satir("Meslek", escapeHtml(u.occupationGroup || "—"))}
          ${satir("Rol", escapeHtml(u.role || "—"))}
          ${satir("Güven puanı", escapeHtml(String(u.trustScore ?? "—")))}
          ${satir("Kayıt tarihi", escapeHtml(u.createdAt || "—"))}
          ${satir("Son giriş", escapeHtml(acc.lastLoginAt || "—"))}
          ${satir("Giriş yöntemi", acc.provider === "google" ? "Google" : "Şifre")}
          ${satir("Geliş kaynağı", acqLabel(u) + (u.acqCampaign ? ` <span class="muted" style="font-size:12px">${escapeHtml(u.acqCampaign)}</span>` : ""))}
          ${satir("T.C. kimlik no", u.tcknMasked
            ? `<code id="kt-tckn-val">${escapeHtml(u.tcknMasked)}</code> <button class="btn btn-small btn-outline" style="margin-left:8px" onclick="KT.adminRevealIdentity('${escapeAttr(u.id)}')">Açık göster</button>`
            : `<span class="muted">Kayıtlı değil</span>`)}
          ${satir("Doğum tarihi", u.birthDateMasked ? `<span id="kt-birth-val">${escapeHtml(u.birthDateMasked)}</span>${u.age ? ` <span class="muted">(${u.age} yaş)</span>` : ""}` : `<span class="muted">Kayıtlı değil</span>`)}
        </div>

        ${mini("Talepleri", dem, (d) => kucukKart(escapeHtml(d.title || "—"), `${d.status === "ACTIVE" ? "yayında" : "kaldırıldı"} · ${escapeHtml(d.createdAt || "")}`))}
        ${mini("İlanları", prop, (p) => kucukKart(escapeHtml(p.title || "—"), `${p.status === "ACTIVE" ? "yayında" : "kaldırıldı"} · ${escapeHtml(p.createdAt || "")}`))}
        ${mini("Teklifleri", off, (o) => kucukKart(money(o.price), `${escapeHtml(o.status || "")} · ${escapeHtml(o.createdAt || "")}`))}
        ${mini("Eşleşmeleri", mat, (m) => kucukKart(escapeHtml(m.status || "—"), escapeHtml(m.createdAt || "")))}
        ${mini("Ödemeleri", pay, (p) => kucukKart(money(p.amount), `${escapeHtml(p.status || "")} · ${escapeHtml(p.createdAt || "")}`))}
        ${mini("Üyelikleri", ents, (e) => { const pl = planlar.find((x) => x.id === e.planId); return kucukKart(escapeHtml(pl ? pl.name : e.planId), `${escapeHtml(e.activeFrom || "")} → ${escapeHtml(e.activeTo || "süresiz")}`); })}

        <div style="margin-top:16px;padding:12px;background:#f5f8fb;border-radius:10px">
          <div style="font-size:12px;color:#7a8a99;text-transform:uppercase;letter-spacing:.03em;margin-bottom:8px">Yönetim</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
            ${u.status === "SUSPENDED"
              ? `<button class="btn btn-small btn-primary" onclick="KT.adminUserManage('${escapeAttr(u.id)}','status','ACTIVE')">Askıyı kaldır</button>`
              : `<button class="btn btn-small btn-outline" style="border-color:#e0b4b4;color:#a12727" onclick="KT.adminUserManage('${escapeAttr(u.id)}','status','SUSPENDED')">Üyeliği askıya al</button>`}
            <select id="kt-role-sel" class="btn btn-small btn-outline" style="padding:6px 10px">
              ${["BUYER", "SELLER", "AGENT", "REVIEWER", "ADMIN"].map((r) => `<option value="${r}" ${u.role === r ? "selected" : ""}>${r}</option>`).join("")}
            </select>
            <button class="btn btn-small btn-outline" onclick="KT.adminUserManage('${escapeAttr(u.id)}','role',document.getElementById('kt-role-sel').value)">Rolü değiştir</button>
            <button class="btn btn-small btn-outline" onclick="KT.adminGrant('${escapeAttr(u.id)}')">Üyelik tanımla</button>
            ${u.epostaMuaf
              ? `<button class="btn btn-small btn-outline" onclick="KT.adminUserManage('${escapeAttr(u.id)}','epostaMuaf',0)">Doğrulama muafiyetini kaldır</button>`
              : `<button class="btn btn-small btn-outline" onclick="KT.adminUserManage('${escapeAttr(u.id)}','epostaMuaf',1)">Doğrulamadan muaf tut</button>`}
            <button class="btn btn-small btn-outline" style="border-color:#e0b4b4;color:#a12727" onclick="KT.adminAnonymize('${escapeAttr(u.id)}')">KVKK: verilerini sil</button>
          </div>
          ${u.autoSuspendedAt ? `<div class="muted" style="margin-top:8px;font-size:12.5px">
            Bu hesap <strong>e-posta doğrulanmadığı için otomatik</strong> askıya alındı (${escapeHtml(u.autoSuspendedAt)}).
            Kullanıcı e-postasını doğruladığı anda askı kendiliğinden kalkar.
          </div>` : ""}
          <div style="margin-top:10px">
            <label style="font-size:12.5px;color:#7a8a99">Yönetici notu (yalnızca panelde görünür)</label>
            <textarea id="kt-admin-note" rows="2" style="width:100%;margin-top:4px;padding:8px;border:1px solid #dde4ec;border-radius:8px;font-family:inherit;font-size:13.5px">${escapeHtml(u.adminNote || "")}</textarea>
            <button class="btn btn-small btn-outline" style="margin-top:6px" onclick="KT.adminUserManage('${escapeAttr(u.id)}','adminNote',document.getElementById('kt-admin-note').value)">Notu kaydet</button>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="btn btn-outline" onclick="KT.closeAdminDetail()">Kapat</button></div>
      </div>`;
    document.body.appendChild(ov);
  },
  async adminUserManage(id, alan, deger) {
    const govde = {};
    govde[alan] = deger;
    if (alan === "status" && deger === "SUSPENDED") {
      const gerekce = (window.prompt("Askıya alma gerekçesi (kullanıcıya bildirilecek):", "") || "").trim();
      if (!gerekce) return;
      govde.reason = gerekce;
    }
    const r = await api(`/admin/users/${id}/manage`, "POST", govde);
    if (!r.ok) return toast((r.data && r.data.error) || "İşlem yapılamadı.");
    await refreshState();
    toast("Kaydedildi.");
    KT.closeAdminDetail();
    render();
  },
  async adminGrant(id) {
    const planlar = (state.plans || []);
    const liste = planlar.map((p, i) => `${i + 1}) ${p.name}`).join("\n");
    const secim = window.prompt(`Hangi paketi tanımlayalım?\n\n${liste}\n\nNumara yaz:`, "1");
    if (!secim) return;
    const plan = planlar[parseInt(secim, 10) - 1];
    if (!plan) return toast("Geçersiz paket numarası.");
    const gun = window.prompt(`${plan.name} kaç gün geçerli olsun?`, "30");
    if (!gun) return;
    const r = await api(`/admin/users/${id}/grant`, "POST", { planId: plan.id, days: parseInt(gun, 10) });
    if (!r.ok) return toast((r.data && r.data.error) || "Tanımlanamadı.");
    await refreshState();
    toast(`${plan.name} tanımlandı (${r.data.activeTo} tarihine kadar).`);
    KT.closeAdminDetail();
    render();
  },
  // Acik kimlik verisi: gerekce zorunlu, her goruntuleme denetim kaydina yazilir.
  async adminRevealIdentity(id) {
    const gerekce = (window.prompt("Bu üyenin kimlik bilgisini neden görüntülüyorsun? (kayıt altına alınır)", "") || "").trim();
    if (!gerekce) return;
    if (gerekce.length < 5) return toast("Gerekçe en az 5 karakter olmalı.");
    const r = await api(`/admin/users/${id}/identity`, "POST", { reason: gerekce });
    if (!r.ok) return toast((r.data && r.data.error) || "Görüntülenemedi.");
    const t = document.getElementById("kt-tckn-val");
    if (t) { t.textContent = r.data.tckn || "—"; t.style.background = "#fff7ed"; }
    const b = document.getElementById("kt-birth-val");
    if (b && r.data.birthDate) b.textContent = r.data.birthDate;
    toast("Görüntüleme denetim kaydına yazıldı.");
  },
  async adminAnonymize(id) {
    const u = (state.users || []).find((x) => x.id === id);
    if (!u) return;
    if (!window.confirm(`${u.name} adlı üyenin kişisel verileri geri döndürülemez şekilde silinecek.\n\nTalep ve ilanları yayından kalkacak, kimlik/iletişim bilgileri temizlenecek.\n\nDevam edilsin mi?`)) return;
    const gerekce = (window.prompt("Silme talebinin gerekçesi / dayanağı:", "KVKK m.11 silme talebi") || "").trim();
    if (!gerekce) return;
    const r = await api(`/admin/users/${id}/anonymize`, "POST", { confirm: id, reason: gerekce });
    if (!r.ok) return toast((r.data && r.data.error) || "İşlem yapılamadı.");
    await refreshState();
    toast("Üyenin kişisel verileri silindi.");
    KT.closeAdminDetail();
    render();
  },
  // --- CSV disa aktarma. Hassas alanlar MASKELI cikar. ---
  adminExportUsers() {
    const rows = filtreliUyeler().map((u) => {
      const m = activeMembership(u.id);
      return { Ad: u.name, Telefon: u.phone, Eposta: u.email, Sehir: u.city, Tip: userTip(u),
        TCKN_maskeli: u.tcknMasked || "", Dogum_yili: (u.birthDateMasked || "").slice(0, 4),
        Eposta_dogrulandi: u.emailVerified ? "evet" : (u.epostaMuaf ? "muaf" : "hayır"),
        Telefon_dogrulandi: u.phoneVerified ? "evet" : "hayır",
        Aylik_gelir: u.monthlyIncome || "", Meslek: u.occupationGroup || "",
        Uyelik: m ? m.name : "Ücretsiz", Kaynak: u.acqGclid ? "Google Ads" : (u.acqSource || "Doğrudan"),
        Durum: u.status, Kayit: u.createdAt };
    });
    csvIndir(rows, "konuttalebi-uyeler");
  },
  renderAdminAudit() {
    const box = document.getElementById("admin-audit-box");
    if (box) box.innerHTML = adminAuditTable(filtreliDenetim(), (id) => { const u = (state.users || []).find((x) => x.id === id); return u ? u.name : (id || "—"); });
  },
  adminExportAudit() {
    const kisi = (id) => { const u = (state.users || []).find((x) => x.id === id); return u ? u.name : (id || ""); };
    csvIndir(filtreliDenetim().map((a) => ({
      Tarih: a.createdAt, Kim: kisi(a.actorId), Islem: AUDIT_ETIKET[a.action] || a.action,
      Kayit_turu: a.entityType, Kayit_id: a.entityId, Aciklama: a.metadata
    })), "konuttalebi-denetim-kaydi");
  },
  adminExportContent(tur) {
    const pre = tur === "property" ? "ap" : "ad";
    const g = (id) => (document.getElementById(id) || {}).value || "";
    const q = g(pre + "-q").toLowerCase().trim(), tx = g(pre + "-tx"), st = g(pre + "-st");
    let list = ((tur === "property" ? state.properties : state.demands) || []).slice();
    if (q) list = list.filter((x) => ((x.title || "") + " " + (x.city || "") + " " + (x.district || "") + " " + (x.description || "")).toLowerCase().includes(q));
    if (tx) list = list.filter((x) => (x.transactionType || "SALE") === tx);
    if (st) list = list.filter((x) => (x.status || "ACTIVE") === st);
    const rows = list.map((x) => ({
      Baslik: x.title, Kategori: [x.mainCategory, x.propertyType].filter(Boolean).join(" · "),
      Sehir: x.city, Ilce: x.district, Islem: x.transactionType === "RENT" ? "Kiralık" : "Satılık",
      Fiyat: tur === "property" ? x.price : `${x.minBudget}-${x.maxBudget}`,
      Durum: x.status, Gerekce: x.moderationReason || "", Tarih: x.createdAt
    }));
    csvIndir(rows, tur === "property" ? "konuttalebi-ilanlar" : "konuttalebi-talepler");
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
    const ownerLabel = type === "property" ? "İlan sahibi (arşiv)" : "Talep sahibi";
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
      usesCredit: (document.querySelector('input[name="d-kredi"]:checked') || {}).value !== "HAYIR",
      creditInterest: (document.querySelector('input[name="d-kredi"]:checked') || {}).value || "",
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
    // Google Ads — "Talep oluşturma" dönüşümü (reklamdan gelen talep oluşturmayı ölçer)
    ktTrack("talep_olustur", { tx: rent ? "RENT" : "SALE", sehir: payload.city, kategori: payload.mainCategory });
    toast(`Talebin yayına alındı. Uygun ${rent ? "ev sahiplerine" : "evine alıcı arayanlara"} bildirim hazırlandı.`);
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
    ktTrack("ilan_ekle", { tx: rent ? "RENT" : "SALE", sehir: payload.city, kategori: payload.mainCategory });
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
    ktTrack("teklif_gonder", { fiyat: price });
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
    // Faz 3: belgesiz danisman, danisman uyeligi satin alamaz (sunucu da engeller).
    const u = currentUser();
    if (planId === "plan-pro" && agentKilitli(u)) {
      toast("Önce Sorumlu Emlak Danışmanı (Seviye 5) belgeni yükleyip onaylatmalısın.");
      return setRoute("dashboard/satici/dogrulama");
    }
    KT.showPayConsent(planId, () => KT.runCheckout({ planId }, planById(planId), rerender));
  },
  // Faz 4: talebi yenile (60 gunluk sure bastan baslar).
  async talepYenile(id) {
    const r = await api(`/demands/${id}/renew`, "POST", {});
    if (!r.ok) return toast(r.data.error || "Yenileme başarısız.");
    await refreshState();
    toast("Talebin yenilendi; 60 gün daha yayında.");
    render();
  },
  // Faz 4: havuzdaki bir talebi yoneticiye bildir.
  async talepBildir(id) {
    const sebep = (window.prompt("Bu talebi neden bildiriyorsun? (örn. gerçekdışı bütçe, uygunsuz içerik)") || "").trim();
    if (!sebep) return;
    const r = await api(`/demands/${id}/report`, "POST", { reason: sebep.slice(0, 60), description: sebep });
    if (!r.ok) return toast(r.data.error || "Bildirim gönderilemedi.");
    toast("Teşekkürler; talep yönetici incelemesine iletildi.");
  },
  // Faz 3: Seviye 5 belge yukleme (PDF/JPG/PNG, <=5MB) — dosya data URL olarak gider.
  belgeYukle() {
    const inp = document.getElementById("ag-file");
    const hata = (m) => showFormError("ag-error", m);
    const f = inp && inp.files && inp.files[0];
    if (!f) return hata("Önce bir dosya seç.");
    const izinli = ["application/pdf", "image/jpeg", "image/png"];
    if (!izinli.includes(f.type)) return hata("Belge PDF, JPG veya PNG olmalı.");
    if (f.size > 5 * 1024 * 1024) return hata("Belge en fazla 5 MB olabilir.");
    const reader = new FileReader();
    reader.onload = async () => {
      const r = await api("/verification-documents", "POST", {
        type: "Sorumlu Emlak Danışmanı (Seviye 5)", fileData: reader.result, fileName: f.name,
      });
      if (!r.ok) return hata(r.data.error || "Belge gönderilemedi.");
      await refreshState();
      toast("Belgen alındı; incelemeye alındı.");
      render();
    };
    reader.onerror = () => hata("Dosya okunamadı; tekrar dene.");
    reader.readAsDataURL(f);
  },
  // Admin: belgeyi satir icinde goruntule (PDF -> iframe, gorsel -> img).
  async belgeGoruntule(docId) {
    const kutu = document.getElementById(`agr-goruntu-${docId}`);
    const r = await api(`/verification-documents/${docId}/file`);
    if (!r.ok) return toast(r.data.error || "Belge dosyası alınamadı.");
    const veri = r.data.fileData || "";
    if (!kutu) return;
    kutu.innerHTML = veri.startsWith("data:application/pdf")
      ? `<iframe src="${escapeAttr(veri)}" style="width:100%;height:420px;border:1px solid #e5eaf0;border-radius:8px;background:#fff"></iframe>`
      : `<img src="${escapeAttr(veri)}" alt="Danışman belgesi" style="max-width:100%;max-height:420px;border:1px solid #e5eaf0;border-radius:8px">`;
  },
  // Admin: onay/red. Red sebep ister (danismana birebir iletilir).
  async belgeIncele(docId, durum) {
    let sebep = "";
    if (durum === "REJECTED") {
      sebep = (window.prompt("Red sebebi (danışmana iletilecek):") || "").trim();
      if (!sebep) return toast("Red için sebep yazmalısın.");
    }
    const r = await api(`/documents/${docId}/review`, "POST", { status: durum, reason: sebep });
    if (!r.ok) return toast(r.data.error || "İşlem başarısız.");
    await refreshState();
    toast(durum === "APPROVED" ? "Belge onaylandı; danışmanın iletişim erişimi açıldı." : "Belge reddedildi; danışmana sebep iletildi.");
    render();
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
    // Odeme dönüşümü: pencere kapandiktan sonra yeni bir hak (entitlement) olustuysa say.
    const before = (state.entitlements || []).length;
    await refreshState();
    const after = (state.entitlements || []).length;
    if (after > before) {
      const fresh = (state.entitlements || [])[after - 1] || {};
      const plan = planById(fresh.planId);
      ktTrack("odeme", {
        value: plan && plan.price ? Number(plan.price) : undefined,
        currency: "TRY",
        transaction_id: fresh.id || fresh.paymentId || "",
        paket: (plan && plan.name) || fresh.planId || ""
      });
    }
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

// SPA rota degisiminde GA4 sayfa goruntuleme.
// NOT: gelismis olcumun "tarayici gecmisi olaylari" ayari bu sitede page_view
// URETMIYOR — 28 Tem 2026'da canlida olculdu, sonuc 0. Bu yuzden elle gonderim
// ZORUNLU. Kaldirmadan once tekrar olc.
// Ayrica gtag, page_location'i document.location'dan alirken fragment'i (#/...)
// atiyor; bu yuzden adres acikca geciriliyor, yoksa tum rotalar "/" olarak birikir.
let ktIlkRotaAtlandi = false;
function ktPageView() {
  if (typeof gtag !== "function") return;
  // Acilista gtag'in kendi otomatik page_view'u zaten gidiyor (Google tarafindaki
  // Ads-GA4 baglantisi uretiyor; send_page_view:false ile susturulamiyor, denendi).
  // Router acilista rotayi bir kez ayarladigi icin buraya da ugruyoruz — ilk cagriyi
  // atla, yoksa acilista 2 page_view olur.
  if (!ktIlkRotaAtlandi) { ktIlkRotaAtlandi = true; return; }
  try {
    const hash = (location.hash || "").replace(/^#/, "");           // "/ilanlar"
    const base = location.pathname.replace(/\/+$/, "");             // "" (kok icin)
    let yol = (base + (hash.startsWith("/") ? hash : (hash ? "/" + hash : ""))) || "/";
    // Ana sayfa GA4'te tek satirda toplansin: acilis otomatik page_view'u "/" olarak
    // dusuyor, SPA rotasi ise "/home". Ayni ekran, tek yol.
    if (yol === "/home") yol = "/";
    gtag("event", "page_view", {
      send_to: [GA4_ID, ADS_ID],
      page_location: location.origin + yol + location.search,
      page_path: yol,
      page_title: document.title
    });
  } catch { /* olcum hatasi akisi bozmasin */ }
}

async function navigate() {
  await refreshState();
  render();
  // Yalnizca rota degisiminde; ilk yuklemede gtag'in kendi page_view'u zaten gidiyor.
  ktPageView();
}
window.addEventListener("hashchange", navigate);
window.addEventListener("DOMContentLoaded", async () => {
  // Reklam kaynagini ilk aciliste sakla (kullanici site icinde dolasirken kaybolmasin).
  captureAttribution();

  // MUKERRER YUKLEME DUZELTMESI (2026-07-30)
  // Eskiden sira suydu: refreshState() -> location.hash = "/home" -> render().
  // Ortadaki atama hashchange olayini tetikliyor, o da navigate()'i cagiriyordu;
  // navigate() de refreshState()+render() yapiyordu. Sonuc: ilk aciliste
  // /api/state IKI kez, ana sayfa listeleri (properties/search + demands/search)
  // IKI kez iniyordu — dort gereksiz istek.
  //
  // Cozum: hash'i veri cekmeden ONCE ve history.replaceState ile ayarla.
  // replaceState hashchange TETIKLEMEZ; "location.hash = ..." tetikler.
  if (!location.hash) {
    try { history.replaceState(null, "", `${location.pathname}${location.search}#/home`); }
    catch { location.hash = "/home"; }   // cok eski tarayici: eski davranisa dus
  }
  await refreshState();
  render();
  // Ilk aciliste elle page_view GONDERILMEZ; gtag'in config page_view'u zaten gitti.
  // Bu bayragi burada harcamazsak ilk gercek rota degisimi de atlanir ve
  // her oturumda bir page_view eksik olculur.
  ktIlkRotaAtlandi = true;
});
