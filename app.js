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
  alert: '<path d="M12 8v5"/><path d="M12 17h.01"/><path d="M10.3 4.4 2.9 17.6A2 2 0 0 0 4.6 20h14.8a2 2 0 0 0 1.7-2.4L13.7 4.4a2 2 0 0 0-3.4 0z"/>'
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
      { id: "plan-buyer-free", name: "Alıcı Ücretsiz", roleType: "BUYER", price: 0, interval: "ay", category: "Temel", features: ["1 aktif talep", "Gelen teklifleri görme", "Platform içi mesajlaşma"] },
      { id: "plan-buyer-boost", name: "Talebimi Üste Taşı", roleType: "BUYER", price: 99, interval: "7 gün", category: "Reklam", features: ["Talep kartı üst sıralarda", "Satıcı havuzunda renkli vurgu", "Uygun satıcılara ek bildirim"] },
      { id: "plan-buyer-contact", name: "Satıcı Bilgilerini Gör", roleType: "BUYER", price: 199, interval: "ay", category: "İletişim üyeliği", features: ["Eşleştiğin satıcının telefon/e-posta kartı", "İki taraf onayı sonrası iletişim", "Güvenli iletişim uyarıları"] },
      { id: "plan-seller-boost", name: "İlanımı Üste Taşı", roleType: "SELLER", price: 149, interval: "7 gün", category: "Reklam", features: ["Ev kartı üst sıralarda", "Alıcı tekliflerinde renkli vurgu", "Uygun alıcılara ek bildirim"] },
      { id: "plan-seller-contact", name: "Alıcı Bilgilerini Gör", roleType: "SELLER", price: 299, interval: "ay", category: "İletişim üyeliği", features: ["Eşleştiğin alıcının telefon/e-posta kartı", "İki taraf onayı sonrası iletişim", "Talebe özel teklif sonrası iletişim"] },
      { id: "plan-pro", name: "Profesyonel Reklam Paketi", roleType: "AGENT", price: 799, interval: "ay", category: "Reklam + üyelik", features: ["Çoklu portföy", "Aylık öne çıkarma hakları", "Bilgileri görme üyeliği dahil"] }
    ],
    demands: [
      { id: "d-1", buyerId: "u-buyer-1", title: "Kadıköy'de aile için 3+1", city: "İstanbul", district: "Kadıköy", neighborhood: "Göztepe / Feneryolu", propertyType: "Daire", roomCount: "3+1", minSqm: 110, maxSqm: 155, minBudget: 6000000, maxBudget: 8000000, downPayment: 2500000, usesCredit: true, cashReady: false, exchangePossible: false, purchaseTimeline: "3 ay içinde", description: "Metroya ve okula yakın, krediye uygun, bakımlı bir aile evi arıyorum.", privacyLevel: "Rozet ve bütçe aralığı görünsün", status: "ACTIVE", viewCount: 46, offerCount: 2, createdAt: "2026-07-01" },
      { id: "d-2", buyerId: "u-buyer-2", title: "Çankaya'da bahçeli villa", city: "Ankara", district: "Çankaya", neighborhood: "Oran / İncek", propertyType: "Villa", roomCount: "4+1", minSqm: 220, maxSqm: 360, minBudget: 10000000, maxBudget: 14000000, downPayment: 8000000, usesCredit: false, cashReady: true, exchangePossible: true, purchaseTimeline: "1 ay içinde", description: "Bahçeli, site içinde veya güvenlikli, tapusu net bir villa arıyoruz.", privacyLevel: "Sadece bütçe beyanı görünsün", status: "ACTIVE", viewCount: 31, offerCount: 1, createdAt: "2026-07-02" },
      { id: "d-3", buyerId: "u-buyer-3", title: "Bornova'da ilk ev arayışı", city: "İzmir", district: "Bornova", neighborhood: "Kazımdirik / Erzene", propertyType: "Daire", roomCount: "2+1", minSqm: 75, maxSqm: 110, minBudget: 4000000, maxBudget: 5000000, downPayment: 1200000, usesCredit: true, cashReady: false, exchangePossible: false, purchaseTimeline: "6 ay içinde", description: "Ulaşımı kolay, deprem yönetmeliğine uygun, ilk ev için masrafsız daire arıyorum.", privacyLevel: "Telefon gizli kalsın", status: "ACTIVE", viewCount: 22, offerCount: 0, createdAt: "2026-07-03" },
      { id: "d-4", buyerId: "u-buyer-1", title: "Eskişehir'de yatırım için 2+1", city: "Eskişehir", district: "Tepebaşı", neighborhood: "Batıkent", propertyType: "Daire", roomCount: "2+1", minSqm: 80, maxSqm: 120, minBudget: 2500000, maxBudget: 3400000, downPayment: 1700000, usesCredit: true, cashReady: false, exchangePossible: false, purchaseTimeline: "Fırsat olursa", description: "Kiralanabilirliği güçlü, yeni binada yatırım amaçlı daire bakıyorum.", privacyLevel: "Sadece platform içi mesaj", status: "ACTIVE", viewCount: 18, offerCount: 0, createdAt: "2026-07-04" }
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
      { id: "e-1", toUserId: "u-buyer-1", toEmail: "deniz@ornek.com", toName: "Deniz Kaya", subject: "Talebinize uygun yeni teklif", body: "Kadıköy talebinize uygun bir ev teklifi geldi.", actionUrl: "dashboard/alici/teklifler", reason: "Demo başlangıç e-postası", status: "MOCK_SENT", createdAt: "2026-07-03" }
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
  if (roleKey === "seller") return "SELLER";
  if (roleKey === "agent") return "AGENT";
  return "BUYER";
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
  return hasPlan(userId, contactPlanForRole(roleName));
}

function planById(planId) {
  return state.plans.find((plan) => plan.id === planId);
}

function planCta(plan) {
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
  if (demand.city === property.city) score += 12;
  if (demand.district === property.district) {
    score += 13;
    reasons.push("Bölge uyumu yüksek");
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
  addAudit("EMAIL_QUEUED", "EmailOutbox", email.id, `${recipient.email} adresine mock e-posta hazırlandı.`);
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
        <nav class="nav" aria-label="Ana menü">
          ${publicLinks.map(([path, label]) => `<a class="${active === path ? "active" : ""}" href="#/${path}">${label}</a>`).join("")}
        </nav>
        <div class="top-actions">
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
          <a href="/kiralik-ev-arayan">Kiralık ev arayan</a>
          <a href="/evine-kiraci-bul">Evine kiracı bul</a>
          <a href="#/kvkk">KVKK</a>
          <a href="#/gizlilik">Gizlilik</a>
          <a href="#/kullanim-sartlari">Kullanım Şartları</a>
          <a href="#/cerez-politikasi">Çerez Politikası</a>
          <a href="#/guvenli-islem-rehberi">Güvenli İşlem</a>
        </div>
      </div>
    </footer>
  `;
}

function homePage() {
  const sampleDemand = state.demands[0];
  const sampleProperty = state.properties[0];
  const profile = buyerProfile(sampleDemand.buyerId);
  return `
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-copy">
          <span class="eyebrow">${icon("shield", 15)} Türkiye odaklı alıcı talebi pazaryeri</span>
          <h1>Aradığın evi sadece arama, talebini oluştur.</h1>
          <p>Konuttalebi'de ev <b>al</b>, evini <b>sat</b>, ev <b>kirala</b> veya evini <b>kiraya ver</b>. Talebini oluştur; karşı taraf sana özel teklif sunsun. Fiyata biz karışmayız — doğrudan siz anlaşırsınız.</p>
          <div class="hero-actions">
            <button class="btn btn-primary" onclick="KT.startRegistration('buyer')">${icon("key", 17)} Alıcı olarak üye ol</button>
            <button class="btn btn-secondary" onclick="KT.startRegistration('seller')">${icon("home", 17)} Satıcı olarak üye ol</button>
          </div>
          <div class="hero-metrics">
            <div class="metric-tile"><b>${(state.stats || {}).demands ?? state.demands.length}</b><span>aktif talep</span></div>
            <div class="metric-tile"><b>${(state.stats || {}).offers ?? state.offers.length}</b><span>teklif kartı</span></div>
            <div class="metric-tile"><b>${(state.stats || {}).matches ?? state.matches.length}</b><span>güvenli eşleşme</span></div>
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
              <span class="badge badge-blue">${calculateMatchScore(sampleDemand, sampleProperty).score}/100 uyum</span>
              <h3>${escapeHtml(sampleProperty.title)}</h3>
              <p>${escapeHtml(sampleProperty.roomCount)} · ${sampleProperty.netSqm} m2 · ${money(sampleProperty.price)}</p>
            </div>
          </div>
          <div class="hero-card hero-card-lock">
            <span class="brand-mark">${icon("lock", 18)}</span>
            <div>
              <strong>İletişim kilidi</strong>
              <p>Telefon ve e-posta iki taraf onay verene kadar gizli kalır.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section class="trust-strip">
      <div class="container trust-grid">
        <div class="trust-item">${icon("card", 19)}<div><strong>Bütçe beyanı</strong><span>Alıcı sadece bütçe aralığını ve alım niyetini beyan eder.</span></div></div>
        <div class="trust-item">${icon("lock", 19)}<div><strong>Çift onay</strong><span>Telefon ve e-posta ancak iki taraf onaylarsa açılır.</span></div></div>
        <div class="trust-item">${icon("chart", 19)}<div><strong>Uyum puanı</strong><span>Bölge, bütçe, oda ve kredi uygunluğu birlikte puanlanır.</span></div></div>
      </div>
    </section>
    <section class="color-showcase">
      <div class="container color-showcase-grid">
        <div class="color-copy">
          <div class="kicker">Canlı talep piyasası</div>
          <h2>Alıcı aradığını açıkça söyler; satıcı doğru evi renkli, net ve hızlı bir teklif kartıyla sunar.</h2>
          <p>Konuttalebi'de alıcıdan belge istenmez. Bütçe aralığı, peşinat, kredi/nakit tercihi ve alım zamanı beyan edilir; satıcı da bu niyete göre teklif verir.</p>
          <div class="color-chip-row">
            <span class="color-chip chip-coral">Bütçe beyanı</span>
            <span class="color-chip chip-teal">Talebe özel teklif</span>
            <span class="color-chip chip-blue">Güvenli mesajlaşma</span>
          </div>
        </div>
        <div class="visual-stack">
          <div class="visual-card visual-card-lg">
            <div class="visual-photo apartment"></div>
            <span class="badge badge-coral">6-8 mn TL alıcı talebi</span>
          </div>
          <div class="visual-card visual-card-sm">
            <div class="visual-photo residence"></div>
            <span>Ataşehir rezidans teklifi</span>
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
            <h2>Alıcı piyasaya talep açar, satıcı talebe özel teklif sunar.</h2>
            <p class="lead">Satıcı alıcının kimliğini veya özel bilgisini değil, bütçe beyanını ve talep özetini görür. İletişim bilgileri iki taraf onay vermeden açılmaz.</p>
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
            <h2>Klasik ilan aramasının tersine çevrilmiş hali.</h2>
          </div>
        </div>
        <div class="grid grid-3">
          ${featureCard("key", "Alıcı görünür olur", "Bölge, bütçe ve ihtiyaç netleşir; satıcılar doğrudan uygun teklif sunar.")}
          ${featureCard("card", "Bütçe beyanı yeterli", "Alıcı belge yüklemez; bütçe aralığı, peşinat ve alım zamanını beyan eder.")}
          ${featureCard("lock", "İletişim üyelikle açılır", "Telefon, e-posta ve adres yalnızca bilgileri görme üyeliği ve iki taraf onayıyla açılır.")}
          ${featureCard("chart", "Talebe göre eşleşme", "Bölge, bütçe, oda, m2, konut tipi ve kredi uygunluğu puanlanır.")}
          ${featureCard("alert", "Kötüye kullanım izlenir", "Tekrarlı mesaj, veri toplama ve iletişim kaçırma denemeleri risk paneline düşer.")}
          ${featureCard("card", "Reklam ve üyelik modeli", "Talep/ilan üste taşıma reklamları ve bilgileri görme üyelikleriyle gelir modeli kurulur.")}
        </div>
      </div>
    </section>
    <section class="band band-soft" id="roller">
      <div class="container">
        <div class="section-head">
          <div class="section-title">
            <div class="kicker">Rolünü seç</div>
            <h2>Ev al, evini sat, ev kirala veya evini kiraya ver — Konuttalebi sana göre çalışır.</h2>
            <p class="lead">Dört akıştan sana uygun olanı seç: talebini oluştur ya da ilanını ver, karşı taraf sana özel teklif sunsun. Emlak danışmanları için profesyonel paket de var.</p>
          </div>
        </div>
        <div class="grid grid-2 role-areas">
          <article class="card role-area">
            <span class="role-ic role-ic-blue">${icon("key", 26)}</span>
            <h3>Ev Al</h3>
            <p>Satın almak istediğin evi tarif et, talebini oluştur; uygun satıcılar sana özel teklif göndersin. Belge istenmez, sadece bütçe beyanı.</p>
            <ul class="role-points"><li>Bütçe aralığı ve peşinat beyanı</li><li>Bölge, oda ve tipe göre eşleşme</li><li>Gelen teklifleri incele</li></ul>
            <button class="btn btn-primary" onclick="KT.startRegistration('buyer','SALE')">${icon("key", 16)} Ev Al — talep oluştur</button>
          </article>
          <article class="card role-area">
            <span class="role-ic role-ic-blue">${icon("key", 26)}</span>
            <h3>Ev Kirala</h3>
            <p>Kiralamak istediğin evi tarif et; ev sahipleri sana özel kiralık teklifleri sunsun. Aylık kira ve depozito aralığını beyan et.</p>
            <ul class="role-points"><li>Aylık kira aralığı ve eşyalı tercihi</li><li>Bölgeye göre kiralık eşleşme</li><li>Doğrudan ev sahibiyle anlaş</li></ul>
            <button class="btn btn-primary" onclick="KT.startRegistration('buyer','RENT')">${icon("key", 16)} Ev Kirala — talep oluştur</button>
          </article>
          <article class="card role-area">
            <span class="role-ic role-ic-teal">${icon("home", 26)}</span>
            <h3>Evini Sat</h3>
            <p>Satılık evine uygun alıcı taleplerini gör, talebe özel teklif gönder. Tam adres alıcıya gösterilmez.</p>
            <ul class="role-points"><li>Uygun alıcı taleplerini gör</li><li>Talebe özel teklif gönder</li><li>İlan görseli yükle</li></ul>
            <button class="btn btn-primary" onclick="KT.startRegistration('seller','SALE')">${icon("home", 16)} Evini Sat — ilan ver</button>
          </article>
          <article class="card role-area">
            <span class="role-ic role-ic-gold">${icon("home", 26)}</span>
            <h3>Evini Kirala</h3>
            <p>Kiraya vereceğin eve uygun kiracı taleplerini gör; aylık kira ve depozitoyu belirt, doğrudan anlaş. Fiyata biz karışmayız.</p>
            <ul class="role-points"><li>Uygun kiracı taleplerini gör</li><li>Aylık kira ve depozito belirt</li><li>Eşyalı/eşyasız seçeneği</li></ul>
            <button class="btn btn-primary" onclick="KT.startRegistration('seller','RENT')">${icon("home", 16)} Evini Kirala — ilan ver</button>
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
  const illus2 = `<svg viewBox="0 0 128 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Satıcı talebi görür">
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
  const illus3 = `<svg viewBox="0 0 128 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Teklif kartı gönderilir">
    <rect x="10" y="10" width="108" height="80" rx="14" fill="#eef3f8"/>
    <rect x="24" y="24" width="58" height="52" rx="8" fill="#fff" stroke="#cdd9e6" stroke-width="2"/>
    <rect x="30" y="30" width="46" height="20" rx="4" fill="#12243b"/>
    <rect x="30" y="56" width="30" height="5" rx="2.5" fill="#4b7bec"/>
    <rect x="30" y="65" width="22" height="5" rx="2.5" fill="#e0a83e"/>
    <path d="M88 50 h18 m-7-7 l7 7-7 7" stroke="#2bb3a3" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  const illus4 = `<svg viewBox="0 0 128 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Güvenli mesajlaşma">
    <rect x="10" y="10" width="108" height="80" rx="14" fill="#eef3f8"/>
    <path d="M28 32 h46 a6 6 0 0 1 6 6 v14 a6 6 0 0 1-6 6 h-30 l-11 9 v-9 a6 6 0 0 1-5-6 v-14 a6 6 0 0 1 6-6z" fill="#4b7bec"/>
    <g fill="#fff"><circle cx="42" cy="45" r="2.6"/><circle cx="52" cy="45" r="2.6"/><circle cx="62" cy="45" r="2.6"/></g>
    <rect x="72" y="52" width="34" height="30" rx="8" fill="#12243b"/>
    <rect x="83" y="45" width="12" height="13" rx="6" fill="none" stroke="#12243b" stroke-width="4"/>
    <circle cx="89" cy="66" r="4" fill="#e0a83e"/><rect x="87.5" y="66" width="3" height="9" rx="1.5" fill="#e0a83e"/>
  </svg>`;
  const steps = [
    [illus1, "Alıcı talep oluşturur", "Şehir, ilçe, bütçe, oda, m2 ve alım zamanı belirlenir; istenirse görsel eklenir."],
    [illus2, "Satıcı uygun talebi görür", "Kimlik ve telefon görünmez; rozet, bütçe aralığı ve talep özeti görünür."],
    [illus3, "Teklif kartı gönderilir", "Ev, fiyat, özellikler, görsel, mesaj ve uyum puanı alıcıya ulaşır."],
    [illus4, "Güvenli mesajlaşma", "İletişim maskelenir; üyelik ve iki taraf onayıyla iletişim kartı açılır."]
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
    </article>
  `;
}

function authRegisterPage(roleKey = "buyer") {
  const selectedRole = ["buyer", "seller", "agent"].includes(roleKey) ? roleKey : "buyer";
  const roleOptions = [
    ["buyer", "Alıcı"],
    ["seller", "Satıcı"],
    ["agent", "Emlak danışmanı"]
  ];
  return publicShell("Üyelik oluştur", "Alıcı, satıcı veya emlak danışmanı hesabını aç; panelin seçtiğin role göre hazırlanır.", `
    <div class="auth-layout">
      <form class="panel auth-panel" onsubmit="KT.register(event)">
        <div class="form-grid">
          ${field("Ad soyad / firma adı", "r-name", "text", "Ad Soyad")}
          <div class="field">
            <label for="r-role">Üyelik tipi</label>
            <select id="r-role">
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
            <label class="check"><input id="r-terms" type="checkbox"> KVKK, gizlilik ve kullanım şartlarını kabul ediyorum.</label>
          </div>
        </div>
        <div id="r-error" class="error"></div>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">${icon("check", 16)} Üyeliği oluştur</button>
          <a class="btn btn-outline" href="#/giris">Zaten üyeyim</a>
        </div>
      </form>
      <aside class="auth-side">
        <span class="badge badge-blue">${icon("shield", 13)} Demo üyelik</span>
        <h3>Bu adım üyelik altyapısının ilk katmanı.</h3>
        <p>Yeni hesap tarayıcıda saklanır, role göre panele yönlenir ve admin kullanıcı listesinde görünür. Canlı sürümde aynı akış güvenli backend, doğrulama e-postası ve ödeme servisine bağlanır.</p>
        <div class="auth-benefits">
          <span>${icon("user", 16)} Hesap profili</span>
          <span>${icon("lock", 16)} Oturum açma</span>
          <span>${icon("mail", 16)} Karşılama e-postası kaydı</span>
        </div>
      </aside>
    </div>
  `);
}

function authLoginPage() {
  return publicShell("Giriş yap", "Üyeliğinle panele dön ve alıcı/satıcı akışına devam et.", `
    <div class="auth-layout auth-layout-narrow">
      <form class="panel auth-panel" onsubmit="KT.login(event)">
        <div class="form-grid">
          ${field("E-posta", "l-email", "email", "deniz@ornek.com")}
          ${field("Şifre", "l-password", "password", "demo1234")}
        </div>
        <div id="l-error" class="error"></div>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">${icon("lock", 16)} Giriş yap</button>
          <a class="btn btn-outline" href="#/uye-ol">Üye ol</a>
        </div>
      </form>
      <aside class="auth-side">
        <span class="badge badge-gold">Demo hesaplar</span>
        <h3>Mevcut demo kullanıcılarıyla da giriş yapılabilir.</h3>
        <p>Örnek hesaplar için şifre: <strong>demo1234</strong></p>
        <div class="auth-benefits">
          <span>deniz@ornek.com</span>
          <span>selin@ornek.com</span>
        </div>
      </aside>
    </div>
  `);
}

function publicPage(kind) {
  if (kind === "giris") {
    return authLoginPage();
  }
  if (kind === "uye-ol" || kind.startsWith("uye-ol/")) {
    return authRegisterPage(kind.split("/")[1] || "buyer");
  }
  if (kind === "nasil-calisir") {
    return publicShell("Nasıl Çalışır", "Alıcı talebi ve satıcı teklifi tek güvenli akışta birleşir.", `
      ${howSteps()}
      <div class="grid grid-2" style="margin-top:18px">
        <article class="card"><h3>Alıcı akışı</h3><p>Hesap oluştur, aradığın evi tarif et, bütçeni beyan et, teklifleri incele, platform içinde konuş, üyelik ve iki taraf onayıyla iletişimi aç.</p></article>
        <article class="card"><h3>Satıcı akışı</h3><p>Evini ekle, uygun alıcı taleplerini gör, teklif kartı gönder, yanıtı takip et, güvenli mesajlaşma üzerinden ilerle.</p></article>
      </div>
    `);
  }
  if (kind === "alici") {
    return publicShell("Alıcılar için", "Yüzlerce ilan arasında kaybolmadan aradığın evi tarif et.", `
      <div class="grid grid-3">
        ${featureCard("key", "Talebini aç", "Bölge, bütçe ve özelliklerini tek kartta toparla.")}
        ${featureCard("card", "Bütçeni beyan et", "Belge yüklemeden bütçe aralığını, peşinatını ve alım zamanını belirt.")}
        ${featureCard("chat", "Kontrollü konuş", "Satıcılarla platform içinde, maskelenmiş iletişimle görüş.")}
      </div>
      <div class="section-actions"><button class="btn btn-primary" onclick="KT.startRegistration('buyer')">Alıcı olarak üye ol</button></div>
    `);
  }
  if (kind === "satici") {
    return publicShell("Satıcılar için", "Evin için gerçek ihtiyacı olan alıcı taleplerini gör.", `
      <div class="grid grid-3">
        ${featureCard("home", "Hazır talep havuzu", "Bütçesi ve ihtiyacı belli alıcıları filtrele.")}
        ${featureCard("send", "Talebe özel teklif", "Teklif kartını sadece uygun talebe gönder.")}
        ${featureCard("chart", "Kalite ve limit", "Paket limitleri ve risk skoru ile sürdürülebilir pazaryeri.")}
      </div>
      <div class="section-actions"><button class="btn btn-primary" onclick="KT.startRegistration('seller')">Satıcı olarak üye ol</button></div>
    `);
  }
  if (kind === "fiyatlandirma") {
    return publicShell("Fiyatlandırma", "Gelir modeli: ilan/talep üste taşıma reklamları ve eşleşme sonrası bilgileri görme üyelikleri.", pricingCards());
  }
  if (kind === "yardim") {
    return publicShell("Yardım ve SSS", "Konuttalebi'nin temel kurallarını sade biçimde incele.", faq());
  }
  if (["kvkk", "gizlilik", "kullanim-sartlari", "cerez-politikasi", "guvenli-islem-rehberi", "blog"].includes(kind)) {
    return legalPage(kind);
  }
  return homePage();
}

function publicShell(title, subtitle, body) {
  return `<section class="band band-white"><div class="container"><div class="section-head"><div class="section-title"><div class="kicker">Konuttalebi</div><h2>${title}</h2><p class="lead">${subtitle}</p></div></div>${body}</div></section>`;
}

function pricingCards(roleTypes = null) {
  const plans = roleTypes ? state.plans.filter((plan) => roleTypes.includes(plan.roleType)) : state.plans;
  return `<div class="grid grid-4">${plans.map((plan) => `
    <article class="card">
      <div class="sample-top">
        <span class="badge ${plan.price ? "badge-gold" : "badge-neutral"}">${plan.roleType}</span>
        <span class="pill">${escapeHtml(plan.category || "Paket")}</span>
      </div>
      <h3 style="margin-top:12px">${escapeHtml(plan.name)}</h3>
      <p><strong style="font-size:28px;color:var(--navy)">${plan.price ? `${plan.price} TL` : "Ücretsiz"}</strong> ${plan.price ? `/ ${plan.interval}` : ""}</p>
      <div class="pill-row" style="margin-top:14px">${plan.features.map((f) => `<span class="pill">${escapeHtml(f)}</span>`).join("")}</div>
      <button class="btn btn-primary" style="margin-top:16px;width:100%" onclick="KT.mockUpgrade('${plan.id}')">${planCta(plan)}</button>
    </article>
  `).join("")}</div>`;
}

function faq() {
  const rows = [
    ["Konuttalebi nedir?", "Alıcıların konut talebi oluşturduğu, satıcıların bu taleplere uygun teklif gönderdiği çift yönlü emlak platformudur."],
    ["Belge yüklemem gerekiyor mu?", "Hayır. Alıcı yalnızca bütçe aralığını, peşinatını ve alım zamanını beyan eder."],
    ["Telefonum ne zaman görünür?", "Bilgileri görme üyeliği alındığında ve ilgili eşleşmede hem alıcı hem satıcı iletişim açmayı onayladığında görünür."],
    ["Emlak danışmanları kullanabilir mi?", "Evet, ancak daha sıkı rate limit ve kalite skoruna tabidir."],
    ["Bütçe beyanı zorunlu mu?", "Talep oluşturmak için bütçe aralığı gerekir; belge yükleme yoktur."],
    ["Şikayet nasıl yapılır?", "Teklif, mesaj veya kullanıcı kartından şikayet oluşturulabilir; admin panelde incelenir."]
  ];
  return `<div class="grid grid-2">${rows.map(([q, a]) => `<article class="card"><h3>${q}</h3><p>${a}</p></article>`).join("")}</div>`;
}

function legalPage(kind) {
  const titles = {
    kvkk: "KVKK Aydınlatma Metni",
    gizlilik: "Gizlilik Politikası",
    "kullanim-sartlari": "Kullanım Şartları",
    "cerez-politikasi": "Çerez Politikası",
    "guvenli-islem-rehberi": "Güvenli İşlem Rehberi",
    blog: "Blog"
  };
  const title = titles[kind] || "Bilgilendirme";
  return publicShell(title, "Bu sayfa MVP için profesyonel placeholder içerik olarak hazırlanmıştır.", `
    <article class="panel">
      <p class="muted">Konuttalebi; talep, teklif, mesajlaşma, bütçe beyanı ve güvenlik süreçlerinde veri minimizasyonu, erişim kontrolü ve kayıt izlenebilirliği ilkelerini esas alır. Gerçek yayına geçmeden önce bu metinlerin tamamı alanında uzman bir hukukçu tarafından incelenmelidir.</p>
      <div class="grid grid-3" style="margin-top:18px">
        ${featureCard("shield", "Kişisel veri", "Kimlik ve iletişim bilgileri yalnızca gerekli akışlarda kullanılır.")}
        ${featureCard("card", "Bütçe beyanı", "Alıcıdan belge yüklemesi istenmez; sadece bütçe ve alım niyeti beyan edilir.")}
        ${featureCard("alert", "Güvenli işlem", "Kapora ve tapu işlemleri platform dışında resmi kanallardan yürütülmelidir.")}
      </div>
    </article>
  `);
}

function dashboardLayout(role, content, activePath) {
  const menus = {
    buyer: [
      ["dashboard/alici", "Genel Bakış", "chart"],
      ["dashboard/alici/taleplerim", "Taleplerim", "key"],
      ["dashboard/alici/talep-olustur", "Yeni Talep", "send"],
      ["dashboard/alici/teklifler", "Gelen Teklifler", "home"],
      ["dashboard/alici/mesajlar", "Mesajlar", "chat"],
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
      ["dashboard/satici/talepler", "Alıcı Talepleri", "key"],
      ["dashboard/satici/tekliflerim", "Tekliflerim", "card"],
      ["dashboard/satici/mesajlar", "Mesajlar", "chat"],
      ["dashboard/satici/eslesmeler", "Eşleşmeler", "lock"],
      ["dashboard/satici/dogrulama", "Satıcı Doğrulama", "shield"],
      ["dashboard/satici/paketler", "Paketlerim", "card"]
    ],
    agent: [
      ["dashboard/satici", "Genel Bakış", "chart"],
      ["dashboard/satici/evlerim", "Portföy", "home"],
      ["dashboard/satici/talepler", "Alıcı Talepleri", "key"],
      ["dashboard/satici/tekliflerim", "Teklifler", "card"],
      ["dashboard/satici/mesajlar", "Mesajlar", "chat"],
      ["dashboard/satici/paketler", "Kurumsal Paket", "card"]
    ],
    admin: [
      ["dashboard/admin", "Dashboard", "chart"],
      ["dashboard/admin/kullanicilar", "Kullanıcılar", "user"],
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
        ${field("Başlık", "d-title", "text", rent ? "Kadıköy'de eşyalı kiralık 2+1" : "Kadıköy'de aile için 3+1")}
        ${field("Şehir", "d-city", "select", "", ["İstanbul", "Ankara", "İzmir", "Eskişehir", "Bursa"])}
        ${field("İlçe", "d-district", "text", "Kadıköy")}
        ${field("Mahalle / bölge", "d-neighborhood", "text", "Göztepe / Feneryolu")}
        ${field("Konut tipi", "d-type", "select", "", ["Daire", "Villa", "Müstakil ev", "Rezidans", "Yazlık", "Arsa"])}
        ${field("Oda sayısı", "d-rooms", "select", "", ["1+1", "2+1", "3+1", "4+1", "5+1"])}
        ${field("Minimum m2", "d-minsqm", "number", rent ? "60" : "90")}
        ${field("Maksimum m2", "d-maxsqm", "number", rent ? "110" : "140")}
        ${field(rent ? "Minimum aylık kira" : "Minimum bütçe", "d-minbudget", "number", rent ? "20000" : "4500000")}
        ${field(rent ? "Maksimum aylık kira" : "Maksimum bütçe", "d-maxbudget", "number", rent ? "30000" : "6500000")}
        ${rent ? field("Öngörülen depozito", "d-deposit", "number", "30000") : field("Peşinat", "d-down", "number", "1500000")}
        ${field(rent ? "Taşınma zamanı" : "Alım zamanı", "d-timeline", "select", "", ["Hemen", "1 ay içinde", "3 ay içinde", "6 ay içinde", "Fırsat olursa"])}
        <div class="field full">
          <label>Tercihler</label>
          <div class="check-grid">
            ${rent
              ? `<label class="check"><input id="d-furnished" type="checkbox"> Eşyalı olsun</label>`
              : `<label class="check"><input id="d-credit" type="checkbox" checked> Kredi kullanacağım</label>
            <label class="check"><input id="d-cash" type="checkbox"> Nakit alım olabilir</label>`}
            <label class="check"><input id="d-exchange" type="checkbox"> Takas düşünebilirim</label>
            <label class="check"><input id="d-private" type="checkbox" checked> Telefonum gizli kalsın</label>
          </div>
        </div>
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
    ${pageHead("Teklif Detayı", "Ev bilgilerini incele, yanıt ver veya satıcıyla güvenli mesajlaşmayı başlat.", `<a class="btn btn-outline" href="#/dashboard/alici/teklifler">Tüm tekliflere dön</a>`)}
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
          <div class="notice" style="margin-top:16px"><strong>Tam adres gizli.</strong> İletişim bilgileri yalnızca iki taraf onay verirse açılır.</div>
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
        <div class="field full"><label for="p-txtype">İşlem tipi</label><select id="p-txtype" onchange="KT.setTxMode(this.value)"><option ${!rent ? "selected" : ""}>Satılık</option><option ${rent ? "selected" : ""}>Kiralık</option></select><span class="helper">${rent ? "Kiraya vereceğin ev ilanı (Evini Kirala)." : "Satılık ev ilanı (Evini Sat)."}</span></div>
        ${field("Başlık", "p-title", "text", rent ? "Kadıköy'de eşyalı kiralık 2+1" : "Kadıköy'de yenilenmiş 3+1")}
        ${field("Şehir", "p-city", "select", "", ["İstanbul", "Ankara", "İzmir", "Eskişehir", "Bursa"])}
        ${field("İlçe", "p-district", "text", "Kadıköy")}
        ${field("Mahalle", "p-neighborhood", "text", "Göztepe")}
        ${field("Konut tipi", "p-type", "select", "", ["Daire", "Villa", "Müstakil ev", "Rezidans", "Yazlık", "Arsa"])}
        ${field("Oda sayısı", "p-rooms", "select", "", ["1+1", "2+1", "3+1", "4+1", "5+1"])}
        ${field("Brüt m2", "p-gross", "number", rent ? "95" : "130")}
        ${field("Net m2", "p-net", "number", rent ? "80" : "115")}
        ${field("Bina yaşı", "p-age", "select", "", ["0-5", "6-10", "11-15", "16-20", "20+"])}
        ${field("Kat", "p-floor", "text", "4/8")}
        ${field("Aidat", "p-dues", "number", "950")}
        ${field(rent ? "Aylık kira" : "Fiyat beklentisi", "p-price", "number", rent ? "32000" : "6500000")}
        ${rent ? field("Depozito", "p-deposit", "number", "32000") : ""}
        <div class="field full">
          <label>Özellikler</label>
          <div class="check-grid">
            <label class="check"><input id="p-balcony" type="checkbox" checked> Balkon</label>
            <label class="check"><input id="p-parking" type="checkbox" checked> Otopark</label>
            <label class="check"><input id="p-elevator" type="checkbox" checked> Asansör</label>
            <label class="check"><input id="p-complex" type="checkbox"> Site içinde</label>
            ${rent
              ? `<label class="check"><input id="p-furnished" type="checkbox"> Eşyalı</label>`
              : `<label class="check"><input id="p-credit" type="checkbox" checked> Krediye uygun</label>`}
            <label class="check"><input id="p-negotiable" type="checkbox" checked> Pazarlığa açık</label>
          </div>
        </div>
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
    .slice()
    .sort((a, b) => Number(isBoosted(b)) - Number(isBoosted(a)))
    .map((demand) => {
    const best = properties.map((property) => calculateMatchScore(demand, property).score).sort((a, b) => b - a)[0] || 0;
    return demandRow(demand, true, best);
  }).join("");
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
        <div class="field full"><label>Satıcı mesajı</label><textarea id="o-message" placeholder="Bu evi neden bu talebe uygun gördüğünü yaz."></textarea></div>
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
  if (path.includes("/kullanicilar")) content = adminTable("Kullanıcılar", state.users, ["name", "email", "role", "city", "status", "createdAt"]);
  if (path.includes("/talepler")) content = adminTable("Alıcı Talepleri", state.demands, ["title", "city", "district", "status", "offerCount"]);
  if (path.includes("/ilanlar")) content = adminTable("Satıcı İlanları", state.properties, ["title", "city", "district", "price", "status"]);
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
    <div class="notice" style="margin-bottom:14px"><strong>Mock e-posta servisi:</strong> Bu MVP dışarı gerçek e-posta göndermez; e-postaları outbox'a kaydeder. Production aşamasında aynı servis Resend, SendGrid veya SMTP sağlayıcısına bağlanır.</div>
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
    ${pageHead(title, "Arama, filtre ve aksiyon alanları gerçek backend'e bağlanmaya hazır tablo yapısında.")}
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

function messagesPage(matchId, roleName) {
  const user = currentUser();
  const matches = state.matches.filter((match) => roleName === "buyer" ? match.buyerId === user.id : match.sellerId === user.id);
  const activeMatch = matchById(matchId) || matches[0];
  if (!matches.length) return `${pageHead("Mesajlar", "Eşleşme başladığında güvenli mesajlaşma burada görünür.")}${empty("Henüz mesajlaşma başlamadı", "Bir teklif olumlu yanıtlandığında konuşma otomatik açılır.")}`;
  const activeOffer = offerById(activeMatch.offerId);
  const activeProperty = propertyById(activeOffer.propertyId);
  const activeDemand = demandById(activeOffer.demandId);
  const msgs = state.messages.filter((msg) => msg.matchId === activeMatch.id);
  return `
    ${pageHead("Mesajlar", "Telefon, e-posta ve adres otomatik maskelenir.")}
    <div class="chat-shell">
      <div class="conversation-list">
        ${matches.map((match) => {
          const offer = offerById(match.offerId);
          const property = propertyById(offer.propertyId);
          return `<button class="conversation-item ${match.id === activeMatch.id ? "active" : ""}" onclick="KT.openMatch('${match.id}')"><strong>${escapeHtml(property.title)}</strong><br><span class="muted">${statusLabel(match.status)} · ${money(offer.price)}</span></button>`;
        }).join("")}
      </div>
      <section class="chat-panel">
        <div class="chat-head"><strong>${escapeHtml(activeProperty.title)}</strong><br><span class="muted">${escapeHtml(activeDemand.title)} · ${statusLabel(activeMatch.status)}</span></div>
        <div class="chat-log" id="chat-log">
          ${msgs.map((msg) => bubble(msg, user.id)).join("")}
        </div>
        ${contactUnlockPanel(activeMatch, roleName)}
        <form class="chat-input" onsubmit="KT.sendMessage(event,'${activeMatch.id}')">
          <input id="chat-input-${activeMatch.id}" placeholder="Mesajını yaz. Telefon, e-posta ve adres otomatik gizlenir." autocomplete="off" />
          <button class="btn btn-secondary" type="submit">${icon("send", 16)} Gönder</button>
        </form>
      </section>
    </div>
  `;
}

function contactUnlockPanel(match, roleName) {
  if (match.contactUnlockedAt) {
    const buyer = userById(match.buyerId);
    const seller = userById(match.sellerId);
    return `
      <div class="contact-card">
        <strong>İletişim açıldı.</strong>
        <div class="grid grid-2" style="margin-top:10px">
          <span>Alıcı: ${escapeHtml(buyer.name)} · ${escapeHtml(buyer.phone)} · ${escapeHtml(buyer.email)}</span>
          <span>Satıcı: ${escapeHtml(seller.name)} · ${escapeHtml(seller.phone)} · ${escapeHtml(seller.email)}</span>
        </div>
        <p class="muted" style="margin:10px 0 0">Kapora, ödeme ve tapu işlemlerini yalnızca resmi kanallar üzerinden yapın.</p>
      </div>
    `;
  }
  const approveSide = roleName === "buyer" ? "buyer" : "seller";
  const membershipRole = roleName === "buyer" ? "buyer" : "seller";
  const contactPlanId = contactPlanForRole(membershipRole);
  const contactPlan = planById(contactPlanId);
  const hasMembership = hasContactMembership(currentUser().id, membershipRole);
  const canApprove = approveSide === "buyer" ? !match.buyerContactApproved : !match.sellerContactApproved;
  return `
    <div class="unlock-panel">
      <div class="unlock-states">
        <div><span>Alıcı onayı</span><b>${match.buyerContactApproved ? "Onaylandı" : "Bekleniyor"}</b></div>
        <div><span>Satıcı onayı</span><b>${match.sellerContactApproved ? "Onaylandı" : "Bekleniyor"}</b></div>
      </div>
      ${canApprove && !hasMembership ? `<p class="muted">Telefon ve e-posta bilgilerini görmek için önce ${escapeHtml(contactPlan?.name || "bilgileri görme üyeliği")} gerekir.</p>` : ""}
      ${canApprove && !hasMembership ? `<button class="btn btn-primary" onclick="KT.mockUpgrade('${contactPlanId}', true)">${icon("card", 16)} ${escapeHtml(contactPlan?.name || "Bilgileri Gör Üyeliği")} al</button>` : ""}
      ${canApprove && hasMembership ? `<button class="btn btn-primary" onclick="KT.approveContact('${match.id}','${approveSide}')">${icon("lock", 16)} Bilgilerimi açmayı onayla</button>` : ""}
      ${!canApprove ? `<span class="badge badge-yellow">Karşı taraf bekleniyor</span>` : ""}
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
    ${pageHead("Eşleşmeler", "Mesajlaşma, onay bekleme ve iletişim açılma durumlarını takip et.")}
    <div class="list">${matches.map((match) => {
      const offer = offerById(match.offerId);
      const property = propertyById(offer.propertyId);
      return `<article class="row-card"><div class="thumb">${icon("lock", 28)}</div><div><div class="row-title">${escapeHtml(property.title)}</div><div class="row-meta">${money(offer.price)} · ${statusLabel(match.status)}</div></div><div class="row-side"><span class="badge ${match.contactUnlockedAt ? "badge-green" : "badge-yellow"}">${match.contactUnlockedAt ? "İletişim açık" : "Onay bekleniyor"}</span><button class="btn btn-small btn-primary" onclick="KT.openMatch('${match.id}')">Mesajlara git</button></div></article>`;
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
  return `${pageHead("Bildirimler", "Teklif, mesaj ve bütçe beyanı güncellemeleri.")}<div class="list">${rows.map((n) => `<article class="notice"><strong>${escapeHtml(n.title)}</strong><br>${escapeHtml(n.body)}<br><span class="muted">${n.createdAt}</span></article>`).join("") || empty("Bildirim yok", "Yeni gelişmeler burada görünür.")}</div>`;
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

function field(label, id, type, placeholder, options = []) {
  if (type === "select") {
    return `<div class="field"><label for="${id}">${label}</label><select id="${id}">${options.map((option, index) => `<option ${index === 0 ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select></div>`;
  }
  return `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" placeholder="${escapeHtml(placeholder)}" value="${type === "number" ? placeholder : ""}" /></div>`;
}

function empty(title, body) {
  return `<div class="empty"><b>${title}</b><span class="muted">${body}</span></div>`;
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
      </div>
      <div class="row-side">
        <span class="badge ${demand.status === "ACTIVE" ? "badge-green" : "badge-neutral"}">${statusLabel(demand.status)}</span>
        ${sellerView ? `<button class="btn btn-small btn-primary" onclick="KT.goSellerOffer('${demand.id}')">Bu alıcıya teklif ver</button>` : `<a class="btn btn-small btn-outline" href="#/dashboard/alici/teklifler">${demand.offerCount} teklifi gör</a><button class="btn btn-small btn-primary" onclick="KT.mockPromote('demand','${demand.id}')">Talebi üste taşı</button>`}
      </div>
    </article>
  `;
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
      </div>
      <div class="row-side"><span class="badge badge-blue">${matching} uygun talep</span><button class="btn btn-small btn-primary" onclick="KT.goSellerDemands()">Uygun talepler</button><button class="btn btn-small btn-primary" onclick="KT.mockPromote('property','${property.id}')">İlanı üste taşı</button></div>
    </article>
  `;
}

function offerRow(offer, view) {
  const property = propertyById(offer.propertyId);
  const demand = demandById(offer.demandId);
  const statusClass = offer.status === "INTERESTED" || offer.status === "MATCHED" ? "badge-gold" : offer.status === "DECLINED" ? "badge-neutral" : "badge-blue";
  const target = view === "buyer" ? `dashboard/alici/teklifler/${offer.id}` : `dashboard/satici/mesajlar/${matchForOffer(offer.id)?.id || ""}`;
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
  const content = path.startsWith("dashboard/alici")
    ? renderBuyer(path)
    : path.startsWith("dashboard/satici")
      ? renderSeller(path)
      : path.startsWith("dashboard/admin")
        ? renderAdmin(path)
        : publicPage(path);
  document.getElementById("app").innerHTML = `<div class="app">${header()}${content}${path.startsWith("dashboard") ? "" : footer()}</div>`;
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
  startByRole() {
    if (isSignedIn()) return this.goDashboard();
    setRoute("uye-ol");
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
    const email = normalizeEmail(document.getElementById("r-email").value);
    const phone = document.getElementById("r-phone").value.trim();
    const city = document.getElementById("r-city").value;
    const password = document.getElementById("r-password").value;
    const password2 = document.getElementById("r-password2").value;
    const accepted = document.getElementById("r-terms").checked;
    if (!name || name.length < 3 || !email.includes("@") || phone.length < 10)
      return showFormError("r-error", "Ad, geçerli e-posta ve telefon bilgisi gerekli.");
    if (password.length < 6 || password !== password2)
      return showFormError("r-error", "Şifre en az 6 karakter olmalı ve tekrar alanıyla eşleşmeli.");
    if (!accepted)
      return showFormError("r-error", "Üyelik için kullanım şartlarını kabul etmelisin.");
    const r = await api("/register", "POST", { name, email, phone, city, role: roleForKey(roleKey), password });
    if (!r.ok) return showFormError("r-error", r.data.error || "Üyelik oluşturulamadı.");
    await refreshState();
    toast("Üyelik oluşturuldu ve giriş yapıldı.");
    const role = r.data.role;
    setRoute(role === "BUYER" ? "dashboard/alici/butce-beyani" : role === "AGENT" ? "dashboard/satici/evlerim" : "dashboard/satici/ev-ekle");
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
  async createDemand(event) {
    event.preventDefault();
    document.getElementById("d-error").classList.remove("show");
    const rent = uiTxMode === "RENT";
    const val = (id) => { const el = document.getElementById(id); return el ? el.value : ""; };
    const chk = (id) => { const el = document.getElementById(id); return el ? el.checked : false; };
    const payload = {
      title: val("d-title").trim(),
      city: val("d-city"),
      district: val("d-district").trim(),
      neighborhood: val("d-neighborhood").trim(),
      propertyType: val("d-type"),
      roomCount: val("d-rooms"),
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
      privacyLevel: chk("d-private") ? "Telefon gizli kalsın" : "Platform varsayılanı",
      transactionType: rent ? "RENT" : "SALE",
      depositAmount: Number(val("d-deposit") || 0),
      furnished: chk("d-furnished")
    };
    if (!payload.title || !payload.minBudget || !payload.maxBudget || payload.maxBudget < payload.minBudget || payload.description.length < 20)
      return showFormError("d-error", rent ? "Başlık, geçerli kira aralığı ve en az 20 karakter açıklama gerekli." : "Başlık, geçerli bütçe aralığı ve en az 20 karakter açıklama gerekli.");
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
    const payload = {
      title: val("p-title").trim(),
      city: val("p-city"),
      district: val("p-district").trim(),
      neighborhood: val("p-neighborhood").trim(),
      propertyType: type,
      roomCount: val("p-rooms"),
      grossSqm: Number(val("p-gross")),
      netSqm: Number(val("p-net")),
      buildingAge: val("p-age"),
      floor: val("p-floor").trim(),
      dues: Number(val("p-dues")),
      hasBalcony: chk("p-balcony"),
      hasParking: chk("p-parking"),
      hasElevator: chk("p-elevator"),
      inComplex: chk("p-complex"),
      creditEligible: chk("p-credit"),
      negotiable: chk("p-negotiable"),
      price: Number(val("p-price")),
      description: val("p-desc").trim(),
      photoClass: type === "Villa" ? "villa" : type === "Rezidans" ? "residence" : "apartment",
      transactionType: rent ? "RENT" : "SALE",
      depositAmount: Number(val("p-deposit") || 0),
      furnished: chk("p-furnished")
    };
    if (!payload.title || !payload.price || payload.description.length < 15)
      return showFormError("p-error", `Başlık, ${rent ? "aylık kira" : "fiyat"} ve en az 15 karakter açıklama gerekli.`);
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
      return showFormError("o-error", "Ev seçimi, fiyat ve en az 15 karakter teklif mesajı gerekli.");
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
    toast("Eşleşme ve mesajlaşma başlatıldı.");
    const match = matchForOffer(offerId);
    setRoute(match ? `dashboard/alici/mesajlar/${match.id}` : "dashboard/alici/teklifler");
  },
  openMatch(matchId) {
    if (state.currentRole === "buyer") setRoute(`dashboard/alici/mesajlar/${matchId}`);
    else setRoute(`dashboard/satici/mesajlar/${matchId}`);
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
  async mockPromote(itemType, itemId) {
    const planId = itemType === "demand" ? "plan-buyer-boost" : "plan-seller-boost";
    const plan = planById(planId);
    const r = await api("/payments/checkout", "POST", { planId, itemType, itemId });
    if (!r.ok) return toast(r.data.error || "İşlem başarısız.");
    await refreshState();
    toast(`${plan ? plan.name : "Öne çıkarma"} aktif edildi.`);
    render();
  },
  async mockUpgrade(planId, rerender = false) {
    const plan = planById(planId);
    const r = await api("/payments/checkout", "POST", { planId });
    if (!r.ok) return toast(r.data.error || "İşlem başarısız.");
    await refreshState();
    toast(`${plan ? plan.name : "Paket"} satın alındı.`);
    if (rerender) render();
  },
  adminMockAction() {
    toast("Bu aksiyon MVP'de mock olarak kaydedildi.");
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
