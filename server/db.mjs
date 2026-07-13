// Konuttalebim - veritabani katmani (node:sqlite, sifir dis bagimlilik)
import { DatabaseSync } from "node:sqlite";
import { randomUUID, scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync, existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || join(__dirname, "data");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = process.env.DB_PATH || join(DATA_DIR, "app.db");

export const db = new DatabaseSync(DB_PATH);
// Not: WAL bazi ag/FUSE dosya sistemlerinde desteklenmez; varsayilan journal kullaniyoruz.
try { db.exec("PRAGMA foreign_keys = ON;"); } catch { /* yoksay */ }

// ---------- Sema ----------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, role TEXT, name TEXT, email TEXT UNIQUE, phone TEXT,
  city TEXT, status TEXT DEFAULT 'ACTIVE', trustScore INTEGER DEFAULT 50, createdAt TEXT
);
CREATE TABLE IF NOT EXISTS auth_accounts (
  userId TEXT PRIMARY KEY, email TEXT UNIQUE, passwordHash TEXT,
  emailVerified INTEGER DEFAULT 0, createdAt TEXT, lastLoginAt TEXT
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY, userId TEXT, createdAt TEXT
);
CREATE TABLE IF NOT EXISTS buyer_profiles (
  userId TEXT PRIMARY KEY, verificationLevel TEXT, badge TEXT,
  budgetTrustScore INTEGER, profileCompletion INTEGER,
  declaredBudgetMin INTEGER, declaredBudgetMax INTEGER, declaredDownPayment INTEGER,
  declaredCashReady INTEGER, declaredUsesCredit INTEGER
);
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY, name TEXT, roleType TEXT, price INTEGER,
  interval TEXT, category TEXT, features TEXT
);
CREATE TABLE IF NOT EXISTS demands (
  id TEXT PRIMARY KEY, buyerId TEXT, title TEXT, city TEXT, district TEXT, neighborhood TEXT,
  propertyType TEXT, roomCount TEXT, minSqm INTEGER, maxSqm INTEGER,
  minBudget INTEGER, maxBudget INTEGER, downPayment INTEGER,
  usesCredit INTEGER, cashReady INTEGER, exchangePossible INTEGER,
  purchaseTimeline TEXT, description TEXT, privacyLevel TEXT, status TEXT DEFAULT 'ACTIVE',
  boostedUntil TEXT, viewCount INTEGER DEFAULT 0, offerCount INTEGER DEFAULT 0, imageData TEXT,
  transactionType TEXT DEFAULT 'SALE', depositAmount INTEGER DEFAULT 0, furnished INTEGER DEFAULT 0, createdAt TEXT
);
CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY, sellerId TEXT, title TEXT, city TEXT, district TEXT, neighborhood TEXT,
  propertyType TEXT, roomCount TEXT, grossSqm INTEGER, netSqm INTEGER, buildingAge TEXT,
  floor TEXT, totalFloors INTEGER, heatingType TEXT, bathroomCount INTEGER,
  hasBalcony INTEGER, hasParking INTEGER, hasElevator INTEGER, inComplex INTEGER,
  dues INTEGER, occupancyStatus TEXT, deedStatus TEXT, creditEligible INTEGER,
  exchangePossible INTEGER, price INTEGER, negotiable INTEGER, description TEXT,
  status TEXT DEFAULT 'ACTIVE', boostedUntil TEXT, photoClass TEXT, imageData TEXT,
  transactionType TEXT DEFAULT 'SALE', depositAmount INTEGER DEFAULT 0, furnished INTEGER DEFAULT 0, createdAt TEXT
);
CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY, demandId TEXT, propertyId TEXT, sellerId TEXT, buyerId TEXT,
  price INTEGER, message TEXT, matchScore INTEGER, status TEXT DEFAULT 'SENT',
  buyerResponse TEXT, seenAt TEXT, createdAt TEXT
);
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY, offerId TEXT UNIQUE, buyerId TEXT, sellerId TEXT,
  status TEXT DEFAULT 'WAITING_BUYER_APPROVAL',
  buyerContactApproved INTEGER DEFAULT 0, sellerContactApproved INTEGER DEFAULT 0,
  buyerApprovedAt TEXT, sellerApprovedAt TEXT, contactUnlockedAt TEXT, createdAt TEXT
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY, matchId TEXT, senderId TEXT, body TEXT, maskedBody TEXT,
  containsSensitiveInfo INTEGER DEFAULT 0, createdAt TEXT
);
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY, userId TEXT, type TEXT, title TEXT, body TEXT,
  actionUrl TEXT, readAt TEXT, createdAt TEXT
);
CREATE TABLE IF NOT EXISTS email_outbox (
  id TEXT PRIMARY KEY, toUserId TEXT, toEmail TEXT, toName TEXT, subject TEXT,
  body TEXT, actionUrl TEXT, reason TEXT, status TEXT DEFAULT 'MOCK_SENT', createdAt TEXT
);
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY, userId TEXT, planId TEXT, provider TEXT, amount INTEGER,
  currency TEXT DEFAULT 'TRY', status TEXT DEFAULT 'SUCCESS', createdAt TEXT
);
CREATE TABLE IF NOT EXISTS entitlements (
  id TEXT PRIMARY KEY, userId TEXT, planId TEXT, activeFrom TEXT, activeTo TEXT
);
CREATE TABLE IF NOT EXISTS verification_documents (
  id TEXT PRIMARY KEY, userId TEXT, type TEXT, status TEXT DEFAULT 'PENDING',
  riskScore INTEGER DEFAULT 0, reviewedById TEXT, reviewedAt TEXT
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY, actorId TEXT, action TEXT, entityType TEXT, entityId TEXT,
  metadata TEXT, createdAt TEXT
);
`);

// ---------- Migrasyonlar (mevcut DB'ye eksik sutunlari ekle) ----------
for (const alter of [
  "ALTER TABLE properties ADD COLUMN imageData TEXT",
  "ALTER TABLE demands ADD COLUMN imageData TEXT",
  "ALTER TABLE demands ADD COLUMN transactionType TEXT DEFAULT 'SALE'",
  "ALTER TABLE demands ADD COLUMN depositAmount INTEGER DEFAULT 0",
  "ALTER TABLE demands ADD COLUMN furnished INTEGER DEFAULT 0",
  "ALTER TABLE properties ADD COLUMN transactionType TEXT DEFAULT 'SALE'",
  "ALTER TABLE properties ADD COLUMN depositAmount INTEGER DEFAULT 0",
  "ALTER TABLE properties ADD COLUMN furnished INTEGER DEFAULT 0",
  "ALTER TABLE payments ADD COLUMN boostItemType TEXT",
  "ALTER TABLE payments ADD COLUMN boostItemId TEXT"
]) {
  try { db.exec(alter); } catch { /* sutun zaten varsa yoksay */ }
}

// ---------- Kullanici verisi temizligi ----------
// Verilen kullanicilara ait TUM kayitlari siler. Ortak yardimci.
function deleteUsersData(users) {
  const clean = users.map((u) => String(u).replace(/[^a-zA-Z0-9-]/g, "")).filter(Boolean);
  if (!clean.length) return;
  const inU = "(" + clean.map((u) => `'${u}'`).join(",") + ")";
  const run = (sql) => { try { db.exec(sql); } catch { /* tablo/sutun yoksa yoksay */ } };
  const matchIds = (() => { try { return db.prepare(`SELECT id FROM matches WHERE buyerId IN ${inU} OR sellerId IN ${inU}`).all().map((r) => `'${r.id}'`); } catch { return []; } })();
  const inM = matchIds.length ? "(" + matchIds.join(",") + ")" : "('')";
  run(`DELETE FROM messages WHERE matchId IN ${inM}`);
  run(`DELETE FROM matches WHERE buyerId IN ${inU} OR sellerId IN ${inU}`);
  run(`DELETE FROM offers WHERE buyerId IN ${inU} OR sellerId IN ${inU}`);
  run(`DELETE FROM demands WHERE buyerId IN ${inU}`);
  run(`DELETE FROM properties WHERE sellerId IN ${inU}`);
  run(`DELETE FROM buyer_profiles WHERE userId IN ${inU}`);
  run(`DELETE FROM verification_documents WHERE userId IN ${inU}`);
  run(`DELETE FROM entitlements WHERE userId IN ${inU}`);
  run(`DELETE FROM payments WHERE userId IN ${inU}`);
  run(`DELETE FROM notifications WHERE userId IN ${inU}`);
  run(`DELETE FROM complaints WHERE reporterId IN ${inU} OR reportedUserId IN ${inU}`);
  run(`DELETE FROM abuse_signals WHERE userId IN ${inU}`);
  run(`DELETE FROM audit_logs WHERE actorId IN ${inU}`);
  run(`DELETE FROM auth_accounts WHERE userId IN ${inU}`);
  run(`DELETE FROM sessions WHERE userId IN ${inU}`);
  run(`DELETE FROM users WHERE id IN ${inU}`);
}

// Tohum (seed) demo hesaplarini temizler (PURGE_DEMO=1). Admin korunur. Idempotent.
export function purgeDemoData() {
  deleteUsersData(["u-buyer-1", "u-buyer-2", "u-buyer-3", "u-seller-1", "u-seller-2", "u-agent-1"]);
}
// Belirtilen kullanici id'lerini temizler (PURGE_USERS="id1,id2").
export function purgeUsersByIds(csv) {
  deleteUsersData(String(csv || "").split(",").map((s) => s.trim()).filter(Boolean));
}

// Paket adlarini/iceriklerini son modele gore GUNCELLER (mevcut satirlar dahil). Her acilista calisir, idempotent.
export function syncPlans() {
  // Kanonik paket listesi. Satılık + Kiralık + Danışman. Kiralıkta KİRACI ücretsiz; EV SAHİBİ öder.
  const plans = [
    ["plan-buyer-free", "Alıcı Ücretsiz", "BUYER", 0, "ay", "Satılık · Temel", ["1 aktif talep", "Sana uygun ilanlarla eşleşme", "Eşleşme bildirimleri"]],
    ["plan-buyer-boost", "Talebimi Üste Taşı", "BUYER", 99, "7 gün", "Satılık · Reklam", ["Talep kartı üst sıralarda", "Satıcı havuzunda renkli vurgu", "Uygun satıcılara ek bildirim"]],
    ["plan-buyer-contact", "Satıcı Bilgilerini Gör", "BUYER", 199, "ay", "Satılık · İletişim", ["Eşleştiğin satıcının telefon/e-posta bilgisi", "Bilgiyi gör, doğrudan ara", "Güvenli iletişim uyarıları"]],
    ["plan-seller-boost", "İlanımı Üste Taşı", "SELLER", 149, "7 gün", "Satılık · Reklam", ["Ev kartı üst sıralarda", "Alıcı taleplerinde renkli vurgu", "Uygun alıcılara ek bildirim"]],
    ["plan-seller-contact", "Alıcı Bilgilerini Gör", "SELLER", 299, "ay", "Satılık · İletişim", ["Eşleştiğin alıcının telefon/e-posta bilgisi", "Bilgiyi gör, doğrudan ara", "Sınırsız talep görüntüleme"]],
    ["plan-tenant-free", "Kiracı Ücretsiz", "BUYER", 0, "ay", "Kiralık · Temel", ["Sınırsız kiralık talebi", "Ev sahipleri sana ulaşır", "Tamamen ücretsiz"]],
    ["plan-landlord-contact", "Kiracı Bilgilerini Gör", "SELLER", 199, "ay", "Kiralık · İletişim", ["Eşleştiğin kiracının telefon/e-posta bilgisi", "Bilgiyi gör, doğrudan ara", "Sınırsız kiracı talebi görüntüleme"]],
    ["plan-landlord-boost", "Kiralık İlanımı Üste Taşı", "SELLER", 99, "7 gün", "Kiralık · Reklam", ["Kiralık ilanın üst sıralarda", "Kiracı havuzunda renkli vurgu", "Uygun kiracılara ek bildirim"]],
    ["plan-pro", "Profesyonel Paket", "AGENT", 799, "ay", "Danışman · Reklam + üyelik", ["Satılık + kiralık çoklu portföy", "Tüm iletişim bilgilerini görme", "Aylık öne çıkarma hakları"]],
  ];
  try {
    db.exec("DELETE FROM plans");
    const ins = db.prepare("INSERT INTO plans (id,name,roleType,price,interval,category,features) VALUES (?,?,?,?,?,?,?)");
    for (const p of plans) ins.run(p[0], p[1], p[2], p[3], p[4], p[5], JSON.stringify(p[6]));
  } catch { /* yoksay */ }
}

// ---------- Yardimcilar ----------
export const uid = (p = "id") => `${p}-${randomUUID().slice(0, 8)}`;
export const today = () => new Date().toISOString().slice(0, 10);
export const now = () => new Date().toISOString().slice(0, 16).replace("T", " ");

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}
export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const test = scryptSync(password, salt, 32).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(test, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---------- Seed (ilk calistirmada demo veri) ----------
export function seedIfEmpty() {
  const count = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
  if (count > 0) return;

  const insUser = db.prepare(
    "INSERT INTO users (id,role,name,email,phone,city,status,trustScore,createdAt) VALUES (?,?,?,?,?,?,?,?,?)"
  );
  const insAuth = db.prepare(
    "INSERT INTO auth_accounts (userId,email,passwordHash,emailVerified,createdAt,lastLoginAt) VALUES (?,?,?,?,?,?)"
  );
  const users = [
    ["u-buyer-1", "BUYER", "Deniz Kaya", "deniz@ornek.com", "0532 000 10 10", "İstanbul", 82],
    ["u-buyer-2", "BUYER", "Ayşe Demir", "ayse@ornek.com", "0533 000 20 20", "Ankara", 74],
    ["u-buyer-3", "BUYER", "Mert Yıldız", "mert@ornek.com", "0534 000 30 30", "İzmir", 58],
    ["u-seller-1", "SELLER", "Selin Arslan", "selin@ornek.com", "0535 000 40 40", "İstanbul", 88],
    ["u-seller-2", "SELLER", "Burak Koç", "burak@ornek.com", "0536 000 50 50", "Ankara", 76],
    ["u-agent-1", "AGENT", "Pera Gayrimenkul", "ofis@peraornek.com", "0212 000 60 60", "İstanbul", 69],
    ["u-admin-1", "ADMIN", "Admin Kullanıcı", "admin@konuttalebim.com", "0212 000 00 00", "İstanbul", 100]
  ];
  for (const [id, role, name, email, phone, city, trust] of users) {
    insUser.run(id, role, name, email, phone, city, "ACTIVE", trust, "2026-07-01");
    insAuth.run(id, email, hashPassword("demo1234"), 1, "2026-07-01", null);
  }

  const insBP = db.prepare(
    "INSERT INTO buyer_profiles (userId,verificationLevel,badge,budgetTrustScore,profileCompletion,declaredBudgetMin,declaredBudgetMax,declaredDownPayment,declaredCashReady,declaredUsesCredit) VALUES (?,?,?,?,?,?,?,?,?,?)"
  );
  insBP.run("u-buyer-1", "Bütçe Beyanı: 6-8 mn TL", "blue", 82, 76, 6000000, 8000000, 2500000, 0, 1);
  insBP.run("u-buyer-2", "Bütçe Beyanı: 10-14 mn TL", "green", 86, 68, 10000000, 14000000, 8000000, 1, 0);
  insBP.run("u-buyer-3", "Bütçe Beyanı: 4-5 mn TL", "neutral", 45, 42, 4000000, 5000000, 1200000, 0, 1);

  const insPlan = db.prepare(
    "INSERT INTO plans (id,name,roleType,price,interval,category,features) VALUES (?,?,?,?,?,?,?)"
  );
  const plans = [
    ["plan-buyer-free", "Alıcı Ücretsiz", "BUYER", 0, "ay", "Temel", ["1 aktif talep", "Gelen teklifleri görme", "Platform içi mesajlaşma"]],
    ["plan-buyer-boost", "Talebimi Üste Taşı", "BUYER", 99, "7 gün", "Reklam", ["Talep kartı üst sıralarda", "Satıcı havuzunda renkli vurgu", "Uygun satıcılara ek bildirim"]],
    ["plan-buyer-contact", "Satıcı Bilgilerini Gör", "BUYER", 199, "ay", "İletişim üyeliği", ["Eşleştiğin satıcının telefon/e-posta kartı", "İki taraf onayı sonrası iletişim", "Güvenli iletişim uyarıları"]],
    ["plan-seller-boost", "İlanımı Üste Taşı", "SELLER", 149, "7 gün", "Reklam", ["Ev kartı üst sıralarda", "Alıcı tekliflerinde renkli vurgu", "Uygun alıcılara ek bildirim"]],
    ["plan-seller-contact", "Alıcı Bilgilerini Gör", "SELLER", 299, "ay", "İletişim üyeliği", ["Eşleştiğin alıcının telefon/e-posta kartı", "İki taraf onayı sonrası iletişim", "Talebe özel teklif sonrası iletişim"]],
    ["plan-pro", "Profesyonel Reklam Paketi", "AGENT", 799, "ay", "Reklam + üyelik", ["Çoklu portföy", "Aylık öne çıkarma hakları", "Bilgileri görme üyeliği dahil"]]
  ];
  for (const p of plans) insPlan.run(p[0], p[1], p[2], p[3], p[4], p[5], JSON.stringify(p[6]));

  const insDemand = db.prepare(
    "INSERT INTO demands (id,buyerId,title,city,district,neighborhood,propertyType,roomCount,minSqm,maxSqm,minBudget,maxBudget,downPayment,usesCredit,cashReady,exchangePossible,purchaseTimeline,description,privacyLevel,status,viewCount,offerCount,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
  );
  insDemand.run("d-1", "u-buyer-1", "Kadıköy'de aile için 3+1", "İstanbul", "Kadıköy", "Göztepe / Feneryolu", "Daire", "3+1", 110, 155, 6000000, 8000000, 2500000, 1, 0, 0, "3 ay içinde", "Metroya ve okula yakın, krediye uygun, bakımlı bir aile evi arıyorum.", "Rozet ve bütçe aralığı görünsün", "ACTIVE", 46, 2, "2026-07-01");
  insDemand.run("d-2", "u-buyer-2", "Çankaya'da bahçeli villa", "Ankara", "Çankaya", "Oran / İncek", "Villa", "4+1", 220, 360, 10000000, 14000000, 8000000, 0, 1, 1, "1 ay içinde", "Bahçeli, site içinde veya güvenlikli, tapusu net bir villa arıyoruz.", "Sadece bütçe beyanı görünsün", "ACTIVE", 31, 1, "2026-07-02");
  insDemand.run("d-3", "u-buyer-3", "Bornova'da ilk ev arayışı", "İzmir", "Bornova", "Kazımdirik / Erzene", "Daire", "2+1", 75, 110, 4000000, 5000000, 1200000, 1, 0, 0, "6 ay içinde", "Ulaşımı kolay, deprem yönetmeliğine uygun, ilk ev için masrafsız daire arıyorum.", "Telefon gizli kalsın", "ACTIVE", 22, 0, "2026-07-03");

  const insProp = db.prepare(
    "INSERT INTO properties (id,sellerId,title,city,district,neighborhood,propertyType,roomCount,grossSqm,netSqm,buildingAge,floor,totalFloors,heatingType,bathroomCount,hasBalcony,hasParking,hasElevator,inComplex,dues,occupancyStatus,deedStatus,creditEligible,exchangePossible,price,negotiable,description,status,photoClass,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
  );
  insProp.run("p-1", "u-seller-1", "Kadıköy Göztepe'de yenilenmiş 3+1", "İstanbul", "Kadıköy", "Göztepe", "Daire", "3+1", 138, 122, "11-15", "4/8", 8, "Kombi", 2, 1, 1, 1, 0, 950, "Boş", "Kat mülkiyeti", 1, 0, 7350000, 1, "Bağdat Caddesi'ne yakın, bakımlı, krediye uygun daire.", "ACTIVE", "apartment", "2026-06-28");
  insProp.run("p-2", "u-seller-1", "Ataşehir'de 2+1 rezidans", "İstanbul", "Ataşehir", "Barbaros", "Rezidans", "2+1", 104, 86, "0-5", "12/24", 24, "Merkezi", 1, 0, 1, 1, 1, 2100, "Kiracılı", "Kat mülkiyeti", 1, 0, 5150000, 0, "Kurumsal kiracılı, sosyal alanlı, yatırım için uygun.", "ACTIVE", "residence", "2026-06-29");
  insProp.run("p-3", "u-seller-2", "Çankaya Oran'da bahçeli 4+1 villa", "Ankara", "Çankaya", "Oran", "Villa", "4+1", 310, 260, "6-10", "Villa", 2, "Yerden ısıtma", 3, 1, 1, 0, 1, 3600, "Boş", "Kat mülkiyeti", 1, 1, 13200000, 1, "Güvenlikli sitede, geniş bahçeli, masrafsız villa.", "ACTIVE", "villa", "2026-07-01");

  // --- Kiralik demo (yeni modul): eslesecek talep + ilan cifti ---
  db.prepare(
    "INSERT INTO demands (id,buyerId,title,city,district,neighborhood,propertyType,roomCount,minSqm,maxSqm,minBudget,maxBudget,downPayment,usesCredit,cashReady,exchangePossible,purchaseTimeline,description,privacyLevel,status,viewCount,offerCount,transactionType,depositAmount,furnished,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
  ).run("d-4", "u-buyer-1", "Kadıköy'de eşyalı kiralık 2+1", "İstanbul", "Kadıköy", "Göztepe / Feneryolu", "Daire", "2+1", 70, 110, 25000, 35000, 0, 0, 0, 0, "Bu ay taşınmak istiyorum", "Metroya yürüme mesafesinde, eşyalı, ara kat bir kiralık daire arıyorum.", "Rozet ve kira aralığı görünsün", "ACTIVE", 12, 0, "RENT", 35000, 1, "2026-07-05");
  db.prepare(
    "INSERT INTO properties (id,sellerId,title,city,district,neighborhood,propertyType,roomCount,grossSqm,netSqm,buildingAge,floor,totalFloors,heatingType,bathroomCount,hasBalcony,hasParking,hasElevator,inComplex,dues,occupancyStatus,deedStatus,creditEligible,exchangePossible,price,negotiable,description,status,photoClass,transactionType,depositAmount,furnished,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
  ).run("p-4", "u-seller-1", "Göztepe'de eşyalı kiralık 2+1", "İstanbul", "Kadıköy", "Göztepe", "Daire", "2+1", 95, 80, "6-10", "3/6", 6, "Kombi", 1, 1, 1, 1, 0, 850, "Boş", "Kat mülkiyeti", 0, 0, 32000, 1, "Eşyalı, aydınlık, metroya yakın; hemen taşınmaya hazır kiralık daire.", "ACTIVE", "residence", "RENT", 32000, 1, "2026-07-05");

  const insOffer = db.prepare(
    "INSERT INTO offers (id,demandId,propertyId,sellerId,buyerId,price,message,matchScore,status,buyerResponse,seenAt,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
  );
  insOffer.run("o-1", "d-1", "p-1", "u-seller-1", "u-buyer-1", 7350000, "Bütçenize ve bölge tercihlerinize uyduğu için bu daireyi size özel sunuyorum.", 94, "SENT", null, null, "2026-07-03");
  insOffer.run("o-2", "d-2", "p-3", "u-seller-2", "u-buyer-2", 13200000, "Bahçe, site güvenliği ve tapu durumuyla talebinize güçlü uyum sağlıyor.", 91, "INTERESTED", "INTERESTED", "2026-07-03", "2026-07-03");

  db.prepare(
    "INSERT INTO matches (id,offerId,buyerId,sellerId,status,buyerContactApproved,sellerContactApproved,buyerApprovedAt,createdAt) VALUES (?,?,?,?,?,?,?,?,?)"
  ).run("m-1", "o-2", "u-buyer-2", "u-seller-2", "WAITING_SELLER_APPROVAL", 1, 0, "2026-07-03", "2026-07-03");

  const insMsg = db.prepare(
    "INSERT INTO messages (id,matchId,senderId,body,maskedBody,containsSensitiveInfo,createdAt) VALUES (?,?,?,?,?,?,?)"
  );
  insMsg.run("msg-1", "m-1", "system", "Eşleşme başladı. İletişim bilgileri iki taraf onay verene kadar gizli kalır.", "Eşleşme başladı. İletişim bilgileri iki taraf onay verene kadar gizli kalır.", 0, "2026-07-03 13:10");
  insMsg.run("msg-2", "m-1", "u-buyer-2", "Merhaba, villayı hafta sonu görmek isterim.", "Merhaba, villayı hafta sonu görmek isterim.", 0, "2026-07-03 13:12");

  db.prepare("INSERT INTO payments (id,userId,planId,provider,amount,currency,status,createdAt) VALUES (?,?,?,?,?,?,?,?)")
    .run("pay-1", "u-seller-1", "plan-seller-boost", "MockPaymentProvider", 149, "TRY", "SUCCESS", "2026-07-01");

  const insDoc = db.prepare("INSERT INTO verification_documents (id,userId,type,status,riskScore,reviewedById,reviewedAt) VALUES (?,?,?,?,?,?,?)");
  insDoc.run("doc-3", "u-seller-1", "Tapu / yetki belgesi", "PENDING", 24, null, null);
  insDoc.run("doc-4", "u-agent-1", "Vergi levhası", "PENDING", 28, null, null);

  console.log("[db] Seed tamamlandi: demo kullanicilar ve veriler yuklendi.");
}

// Admin hesabini ortam degiskenlerinden (Render ayarlari) guvenli sekilde kurar.
// ADMIN_EMAIL ve ADMIN_PASSWORD ayarliysa admin girisi bunlarla calisir; kod/sohbet sifreyi gormez.
export function ensureAdminFromEnv() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!email || !password) {
    console.log("[db] ADMIN_EMAIL/ADMIN_PASSWORD ayarli degil; varsayilan demo admin gecerli.");
    return;
  }
  const existing = db.prepare("SELECT * FROM users WHERE role = 'ADMIN' ORDER BY createdAt ASC").get();
  if (existing) {
    db.prepare("UPDATE users SET email = ? WHERE id = ?").run(email, existing.id);
    db.prepare("UPDATE auth_accounts SET email = ?, passwordHash = ?, emailVerified = 1 WHERE userId = ?")
      .run(email, hashPassword(password), existing.id);
    console.log("[db] Admin hesabi ortam degiskenlerinden guncellendi.");
  } else {
    const id = uid("u");
    db.prepare("INSERT INTO users (id,role,name,email,phone,city,status,trustScore,createdAt) VALUES (?,?,?,?,?,?,?,?,?)")
      .run(id, "ADMIN", "Yönetici", email, "", "İstanbul", "ACTIVE", 100, today());
    db.prepare("INSERT INTO auth_accounts (userId,email,passwordHash,emailVerified,createdAt,lastLoginAt) VALUES (?,?,?,?,?,?)")
      .run(id, email, hashPassword(password), 1, today(), null);
    console.log("[db] Admin hesabi ortam degiskenlerinden olusturuldu.");
  }
}
