// Konuttalebim - API sunucusu (node:http, sifir dis bagimlilik)
import http from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, normalize } from "node:path";
import { randomUUID } from "node:crypto";
import {
  db, uid, today, now, hashPassword, verifyPassword, seedIfEmpty, ensureAdminFromEnv
} from "./db.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_DIR = join(__dirname, "..");        // frontend dosyalari (index.html, app.js...)
const PORT = process.env.PORT || 3000;
const MAX_IMAGE_CHARS = 2_600_000;            // ~1.9MB base64 gorsel siniri

// Yuklenen gorseli dogrula: sadece kucuk data URL resimlerine izin ver.
function cleanImage(value) {
  if (!value || typeof value !== "string") return null;
  if (!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value)) return null;
  if (value.length > MAX_IMAGE_CHARS) return null;
  return value;
}

seedIfEmpty();
ensureAdminFromEnv();

// ---------- Yardimcilar ----------
const B = (v) => v === 1 || v === true;        // int -> boolean
const parseCookies = (h = "") =>
  Object.fromEntries(h.split(";").map((c) => c.trim().split("=").map(decodeURIComponent)).filter((p) => p[0]));

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;   // oturum 7 gun sonra gecersiz
function sessionUser(req) {
  const token = parseCookies(req.headers.cookie).kt_session;
  if (!token) return null;
  const s = db.prepare("SELECT userId, createdAt FROM sessions WHERE token = ?").get(token);
  if (!s) return null;
  const age = Date.now() - new Date(s.createdAt).getTime();
  if (!s.createdAt || Number.isNaN(age) || age > SESSION_TTL_MS) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  return db.prepare("SELECT * FROM users WHERE id = ?").get(s.userId) || null;
}

// --- Basit bellek-ici hiz siniri (kaba kuvvet denemelerine karsi) ---
const rateBuckets = new Map();
function clientIp(req) {
  return (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "unknown";
}
function rateLimit(key, maxHits, windowMs) {
  const t = Date.now();
  const arr = (rateBuckets.get(key) || []).filter((x) => t - x < windowMs);
  arr.push(t);
  rateBuckets.set(key, arr);
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) if (!v.some((x) => t - x < windowMs)) rateBuckets.delete(k);
  }
  return arr.length <= maxHits;
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => { try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); } });
  });
}

const json = (res, code, obj, headers = {}) => {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", ...headers });
  res.end(JSON.stringify(obj));
};
const ok = (res, data = {}, headers = {}) => json(res, 200, { ok: true, ...data }, headers);
const err = (res, code, message) => json(res, code, { ok: false, error: message });

function addAudit(actorId, action, entityType, entityId, metadata) {
  db.prepare("INSERT INTO audit_logs (id,actorId,action,entityType,entityId,metadata,createdAt) VALUES (?,?,?,?,?,?,?)")
    .run(uid("a"), actorId, action, entityType, entityId, metadata || "", today());
}
function notify(userId, type, title, body, actionUrl) {
  db.prepare("INSERT INTO notifications (id,userId,type,title,body,actionUrl,createdAt) VALUES (?,?,?,?,?,?,?)")
    .run(uid("n"), userId, type, title, body, actionUrl || "", today());
}
function queueEmail(userId, subject, body, actionUrl, reason) {
  const u = db.prepare("SELECT name,email FROM users WHERE id = ?").get(userId);
  if (!u) return;
  db.prepare("INSERT INTO email_outbox (id,toUserId,toEmail,toName,subject,body,actionUrl,reason,status,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)")
    .run(uid("e"), userId, u.email, u.name, subject, body, actionUrl || "", reason || "", "MOCK_SENT", today());
}

// ---------- Is mantigi (sunucu tarafi) ----------
function calculateMatchScore(demand, property) {
  let score = 0;
  if (!demand || !property) return 0;
  if ((demand.transactionType || "SALE") !== (property.transactionType || "SALE")) return 0;
  if (demand.city === property.city) score += 12;
  if (demand.district === property.district) score += 13;
  if (property.price >= demand.minBudget && property.price <= demand.maxBudget) score += 25;
  else if (property.price <= demand.maxBudget * 1.1) score += 15;
  if (demand.roomCount === property.roomCount) score += 15;
  if (property.netSqm >= demand.minSqm && property.netSqm <= demand.maxSqm) score += 10;
  if (demand.propertyType === property.propertyType) score += 10;
  if (demand.purchaseTimeline && (demand.purchaseTimeline.includes("1 ay") || demand.purchaseTimeline.includes("3 ay"))) score += 5;
  if (!B(demand.usesCredit) || B(property.creditEligible)) score += 5;
  const bp = db.prepare("SELECT budgetTrustScore FROM buyer_profiles WHERE userId = ?").get(demand.buyerId);
  if (bp && bp.budgetTrustScore >= 75) score += 5;
  return Math.min(100, score);
}

function maskSensitiveInfo(text) {
  let masked = text;
  const detected = [];
  const patterns = [
    { type: "telefon", regex: /(\+?90\s*)?0?\s?5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/gi },
    { type: "e-posta", regex: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi },
    { type: "whatsapp", regex: /whats\s?app|wpden|wp'den|watsap|watsapp/gi },
    { type: "instagram", regex: /(?:instagram|insta|ig)\s*[:@]?\s*[a-z0-9._]+|@[a-z0-9._]{3,}/gi },
    { type: "url", regex: /(https?:\/\/|www\.)\S+/gi },
    { type: "iban", regex: /TR\s?\d{2}\s?(\d{4}\s?){5}\d{2}/gi },
    { type: "acik adres", regex: /\b(mahalle|mah\.|sokak|sok\.|cadde|cad\.|no:?\s?\d+|daire:?\s?\d+)\b.*\d+/gi }
  ];
  for (const p of patterns) {
    if (p.regex.test(masked)) { detected.push(p.type); masked = masked.replace(p.regex, "[iletişim bilgisi gizlendi]"); }
  }
  return { maskedText: masked, containsSensitiveInfo: detected.length > 0 };
}

function hasContactMembership(userId, role) {
  const planId = role === "BUYER" ? "plan-buyer-contact" : "plan-seller-contact";
  const row = db.prepare(
    "SELECT COUNT(*) AS c FROM entitlements WHERE userId = ? AND (planId = ? OR planId = 'plan-pro')"
  ).get(userId, planId);
  return row.c > 0;
}

// ---------- Durum anlik goruntusu (frontend'in bekledigi sekil) ----------
function buildState(user) {
  const all = (t) => db.prepare(`SELECT * FROM ${t}`).all();
  const boolFields = {
    demands: ["usesCredit", "cashReady", "exchangePossible"],
    properties: ["hasBalcony", "hasParking", "hasElevator", "inComplex", "creditEligible", "negotiable"],
    buyer_profiles: ["declaredCashReady", "declaredUsesCredit"],
    matches: ["buyerContactApproved", "sellerContactApproved"],
    messages: ["containsSensitiveInfo"]
  };
  const conv = (rows, fields) => rows.map((r) => {
    const o = { ...r };
    for (const f of fields || []) o[f] = B(o[f]);
    return o;
  });

  const matches = conv(all("matches"), boolFields.matches);
  // iletisim kilidi kontrolu: sadece acikken karsi tarafin iletisimi gorunur
  const unlockedWith = new Set();
  if (user) {
    for (const m of matches) {
      if (m.status === "CONTACT_UNLOCKED" && (m.buyerId === user.id || m.sellerId === user.id)) {
        unlockedWith.add(m.buyerId === user.id ? m.sellerId : m.buyerId);
      }
    }
  }
  const users = all("users").map((u) => {
    const self = user && u.id === user.id;
    const canSeeContact = self || (user && unlockedWith.has(u.id)) || (user && user.role === "ADMIN");
    return {
      id: u.id, role: u.role, name: u.name, city: u.city, status: u.status,
      trustScore: u.trustScore, createdAt: u.createdAt,
      email: canSeeContact ? u.email : "",
      phone: canSeeContact ? u.phone : ""
    };
  });

  const buyerProfiles = {};
  for (const bp of conv(all("buyer_profiles"), boolFields.buyer_profiles)) {
    buyerProfiles[bp.userId] = { ...bp, documents: [] };
  }
  const plans = all("plans").map((p) => ({ ...p, features: JSON.parse(p.features || "[]") }));

  // --- Gizlilik: teklif/eslesme/mesaj/bildirim/odeme yalnizca sahibine (ve admin'e) doner. ---
  const isAdmin = Boolean(user && user.role === "ADMIN");
  const myMatches = isAdmin ? matches
    : (user ? matches.filter((m) => m.buyerId === user.id || m.sellerId === user.id) : []);
  const myMatchIds = new Set(myMatches.map((m) => m.id));
  const allOffers = all("offers");
  const myOffers = isAdmin ? allOffers
    : (user ? allOffers.filter((o) => o.buyerId === user.id || o.sellerId === user.id) : []);
  const myMessages = conv(all("messages"), boolFields.messages)
    .filter((m) => isAdmin || myMatchIds.has(m.matchId))
    .map(({ body, ...rest }) => rest);          // ham govde asla istemciye gonderilmez
  const myNotifications = isAdmin ? all("notifications")
    : (user ? all("notifications").filter((n) => n.userId === user.id) : []);
  const myPayments = isAdmin ? all("payments")
    : (user ? all("payments").filter((p) => p.userId === user.id) : []);
  const demandsArr = conv(all("demands"), boolFields.demands);

  return {
    currentRole: user ? (user.role === "BUYER" ? "buyer" : user.role === "ADMIN" ? "admin" : "seller") : "buyer",
    auth: { currentUserId: user ? user.id : null, lastLoginAt: null },
    counters: { user: 100, demand: 100, property: 100, offer: 100, match: 100, message: 100, notification: 100, complaint: 100, audit: 100, doc: 100, abuse: 100, email: 100 },
    users,
    authAccounts: [],
    buyerProfiles,
    plans,
    demands: demandsArr,
    properties: conv(all("properties"), boolFields.properties),
    offers: myOffers,
    matches: myMatches,
    messages: myMessages,
    verificationDocuments: !user
      ? []
      : (["ADMIN", "REVIEWER"].includes(user.role)
        ? all("verification_documents")
        : all("verification_documents").filter((d) => d.userId === user.id)),
    notifications: myNotifications,
    emailOutbox: isAdmin ? all("email_outbox") : [],
    complaints: [],
    abuseSignals: [],
    auditLogs: isAdmin ? all("audit_logs") : [],
    payments: myPayments,
    // Ana sayfa vitrin sayaclari (kisisel veri degil, sadece toplam adet)
    stats: { demands: demandsArr.length, offers: allOffers.length, matches: matches.length }
  };
}

// ---------- API yonlendirme ----------
async function handleApi(req, res, url) {
  const seg = url.pathname.replace(/^\/api\//, "").split("/");
  const method = req.method;
  const user = sessionUser(req);
  const body = ["POST", "PUT", "PATCH"].includes(method) ? await readBody(req) : {};
  const norm = (s) => (s || "").trim().toLowerCase();

  // --- durum ---
  if (seg[0] === "state" && method === "GET") return ok(res, { state: buildState(user) });

  // --- kayit ---
  if (seg[0] === "register" && method === "POST") {
    if (!rateLimit(`register:${clientIp(req)}`, 6, 15 * 60 * 1000))
      return err(res, 429, "Çok fazla kayıt denemesi. Lütfen biraz sonra tekrar deneyin.");
    const name = (body.name || "").trim();
    const email = norm(body.email);
    const phone = (body.phone || "").trim();
    const city = (body.city || "").trim() || "İstanbul";
    const role = ["BUYER", "SELLER", "AGENT"].includes(body.role) ? body.role : "BUYER";
    const password = body.password || "";
    if (name.length < 3 || !email.includes("@") || phone.length < 10)
      return err(res, 400, "Ad, geçerli e-posta ve telefon gerekli.");
    if (password.length < 6) return err(res, 400, "Şifre en az 6 karakter olmalı.");
    if (db.prepare("SELECT 1 FROM auth_accounts WHERE email = ?").get(email))
      return err(res, 409, "Bu e-posta ile kayıtlı bir üyelik var.");
    const id = uid("u");
    db.prepare("INSERT INTO users (id,role,name,email,phone,city,status,trustScore,createdAt) VALUES (?,?,?,?,?,?,?,?,?)")
      .run(id, role, name, email, phone, city, "ACTIVE", role === "BUYER" ? 54 : 50, today());
    db.prepare("INSERT INTO auth_accounts (userId,email,passwordHash,emailVerified,createdAt,lastLoginAt) VALUES (?,?,?,?,?,?)")
      .run(id, email, hashPassword(password), 0, today(), today());
    if (role === "BUYER")
      db.prepare("INSERT INTO buyer_profiles (userId,verificationLevel,badge,budgetTrustScore,profileCompletion,declaredBudgetMin,declaredBudgetMax,declaredDownPayment,declaredCashReady,declaredUsesCredit) VALUES (?,?,?,?,?,?,?,?,?,?)")
        .run(id, "Bütçe Beyanı Bekleniyor", "neutral", 35, 20, 0, 0, 0, 0, 0);
    notify(id, "WELCOME", "Üyeliğin oluşturuldu", "Panelin hazır.", "");
    queueEmail(id, "Konuttalebim üyeliğiniz oluşturuldu", "Hesabınız hazır.", "", "Yeni üyelik karşılama");
    addAudit(id, "USER_REGISTERED", "User", id, `${role} üyeliği oluşturuldu.`);
    const token = randomUUID();
    db.prepare("INSERT INTO sessions (token,userId,createdAt) VALUES (?,?,?)").run(token, id, new Date().toISOString());
    return ok(res, { userId: id, role }, sessionCookie(token));
  }

  // --- giris ---
  if (seg[0] === "login" && method === "POST") {
    if (!rateLimit(`login:${clientIp(req)}`, 10, 5 * 60 * 1000))
      return err(res, 429, "Çok fazla giriş denemesi. Lütfen birkaç dakika sonra tekrar deneyin.");
    const email = norm(body.email);
    const acc = db.prepare("SELECT * FROM auth_accounts WHERE email = ?").get(email);
    if (!acc || !verifyPassword(body.password || "", acc.passwordHash))
      return err(res, 401, "E-posta veya şifre hatalı.");
    const u = db.prepare("SELECT * FROM users WHERE id = ?").get(acc.userId);
    if (!u || u.status !== "ACTIVE") return err(res, 403, "Bu üyelik aktif değil.");
    db.prepare("UPDATE auth_accounts SET lastLoginAt = ? WHERE userId = ?").run(today(), u.id);
    addAudit(u.id, "USER_LOGGED_IN", "User", u.id, "Giriş yapıldı.");
    const token = randomUUID();
    db.prepare("INSERT INTO sessions (token,userId,createdAt) VALUES (?,?,?)").run(token, u.id, new Date().toISOString());
    return ok(res, { userId: u.id, role: u.role }, sessionCookie(token));
  }

  // --- cikis ---
  if (seg[0] === "logout" && method === "POST") {
    const token = parseCookies(req.headers.cookie).kt_session;
    if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return ok(res, {}, { "Set-Cookie": "kt_session=; HttpOnly; Path=/; Max-Age=0" });
  }

  if (!user) return err(res, 401, "Giriş gerekli.");

  // --- profil ---
  if (seg[0] === "profile" && method === "PATCH") {
    const name = (body.name || "").trim(), email = norm(body.email), phone = (body.phone || "").trim(), city = (body.city || "").trim();
    if (!name || !email.includes("@") || phone.length < 10 || !city) return err(res, 400, "Tüm alanlar gerekli.");
    const dup = db.prepare("SELECT 1 FROM auth_accounts WHERE email = ? AND userId != ?").get(email, user.id);
    if (dup) return err(res, 409, "Bu e-posta başka üyelikte kullanılıyor.");
    db.prepare("UPDATE users SET name=?,email=?,phone=?,city=? WHERE id=?").run(name, email, phone, city, user.id);
    db.prepare("UPDATE auth_accounts SET email=?, emailVerified=0 WHERE userId=?").run(email, user.id);
    addAudit(user.id, "PROFILE_UPDATED", "User", user.id, "Profil güncellendi.");
    return ok(res);
  }

  // --- talep olustur ---
  if (seg[0] === "demands" && method === "POST") {
    if (user.role !== "BUYER") return err(res, 403, "Sadece alıcı talep oluşturabilir.");
    const id = uid("d");
    const d = {
      id, buyerId: user.id, title: (body.title || "").trim(), city: body.city || "İstanbul",
      district: (body.district || "").trim(), neighborhood: (body.neighborhood || "").trim(),
      propertyType: body.propertyType || "Daire", roomCount: body.roomCount || "2+1",
      minSqm: +body.minSqm || 0, maxSqm: +body.maxSqm || 0, minBudget: +body.minBudget || 0,
      maxBudget: +body.maxBudget || 0, downPayment: +body.downPayment || 0,
      usesCredit: body.usesCredit ? 1 : 0, cashReady: body.cashReady ? 1 : 0, exchangePossible: body.exchangePossible ? 1 : 0,
      purchaseTimeline: body.purchaseTimeline || "Fırsat olursa", description: (body.description || "").trim(),
      privacyLevel: body.privacyLevel || "Platform varsayılanı",
      transactionType: body.transactionType === "RENT" ? "RENT" : "SALE",
      depositAmount: +body.depositAmount || 0, furnished: body.furnished ? 1 : 0
    };
    if (!d.title || !d.minBudget || !d.maxBudget || d.maxBudget < d.minBudget || d.description.length < 20)
      return err(res, 400, "Başlık, geçerli bütçe ve en az 20 karakter açıklama gerekli.");
    const dImage = cleanImage(body.imageData);
    db.prepare("INSERT INTO demands (id,buyerId,title,city,district,neighborhood,propertyType,roomCount,minSqm,maxSqm,minBudget,maxBudget,downPayment,usesCredit,cashReady,exchangePossible,purchaseTimeline,description,privacyLevel,status,viewCount,offerCount,imageData,transactionType,depositAmount,furnished,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .run(d.id, d.buyerId, d.title, d.city, d.district, d.neighborhood, d.propertyType, d.roomCount, d.minSqm, d.maxSqm, d.minBudget, d.maxBudget, d.downPayment, d.usesCredit, d.cashReady, d.exchangePossible, d.purchaseTimeline, d.description, d.privacyLevel, "ACTIVE", 0, 0, dImage, d.transactionType, d.depositAmount, d.furnished, today());
    // uygun saticilara bildirim
    const props = db.prepare("SELECT * FROM properties WHERE status='ACTIVE'").all();
    const seen = new Set();
    for (const p of props) {
      if (calculateMatchScore(d, p) >= 70 && !seen.has(p.sellerId)) {
        seen.add(p.sellerId);
        notify(p.sellerId, "NEW_MATCHABLE_DEMAND", "Yeni uygun alıcı talebi", `${d.title} talebi ilanınıza uyuyor.`, "dashboard/satici/alici-talepleri");
        queueEmail(p.sellerId, "Size uygun yeni alıcı talebi", `${d.title} talebi portföyünüze uygun.`, "", "Uygun talep bildirimi");
      }
    }
    addAudit(user.id, "DEMAND_CREATED", "Demand", id, d.title);
    return ok(res, { id });
  }

  // --- ilan olustur ---
  if (seg[0] === "properties" && method === "POST") {
    if (!["SELLER", "AGENT"].includes(user.role)) return err(res, 403, "Sadece satıcı ilan ekleyebilir.");
    const id = uid("p");
    const p = {
      id, sellerId: user.id, title: (body.title || "").trim(), city: body.city || "İstanbul",
      district: (body.district || "").trim(), neighborhood: (body.neighborhood || "").trim(),
      propertyType: body.propertyType || "Daire", roomCount: body.roomCount || "2+1",
      grossSqm: +body.grossSqm || 0, netSqm: +body.netSqm || 0, buildingAge: body.buildingAge || "0-5",
      floor: body.floor || "", totalFloors: +body.totalFloors || 0, heatingType: body.heatingType || "Kombi",
      bathroomCount: +body.bathroomCount || 1, hasBalcony: body.hasBalcony ? 1 : 0, hasParking: body.hasParking ? 1 : 0,
      hasElevator: body.hasElevator ? 1 : 0, inComplex: body.inComplex ? 1 : 0, dues: +body.dues || 0,
      occupancyStatus: body.occupancyStatus || "Boş", deedStatus: body.deedStatus || "Kat mülkiyeti",
      creditEligible: body.creditEligible ? 1 : 0, exchangePossible: body.exchangePossible ? 1 : 0,
      price: +body.price || 0, negotiable: body.negotiable ? 1 : 0, description: (body.description || "").trim(),
      photoClass: body.photoClass || "apartment",
      transactionType: body.transactionType === "RENT" ? "RENT" : "SALE",
      depositAmount: +body.depositAmount || 0, furnished: body.furnished ? 1 : 0
    };
    if (!p.title || !p.price || p.description.length < 15) return err(res, 400, "Başlık, fiyat ve en az 15 karakter açıklama gerekli.");
    const pImage = cleanImage(body.imageData);
    db.prepare("INSERT INTO properties (id,sellerId,title,city,district,neighborhood,propertyType,roomCount,grossSqm,netSqm,buildingAge,floor,totalFloors,heatingType,bathroomCount,hasBalcony,hasParking,hasElevator,inComplex,dues,occupancyStatus,deedStatus,creditEligible,exchangePossible,price,negotiable,description,status,photoClass,imageData,transactionType,depositAmount,furnished,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .run(p.id, p.sellerId, p.title, p.city, p.district, p.neighborhood, p.propertyType, p.roomCount, p.grossSqm, p.netSqm, p.buildingAge, p.floor, p.totalFloors, p.heatingType, p.bathroomCount, p.hasBalcony, p.hasParking, p.hasElevator, p.inComplex, p.dues, p.occupancyStatus, p.deedStatus, p.creditEligible, p.exchangePossible, p.price, p.negotiable, p.description, "ACTIVE", p.photoClass, pImage, p.transactionType, p.depositAmount, p.furnished, today());
    const demands = db.prepare("SELECT * FROM demands WHERE status='ACTIVE'").all();
    const seen = new Set();
    for (const d of demands) {
      if (calculateMatchScore(d, p) >= 70 && !seen.has(d.buyerId)) {
        seen.add(d.buyerId);
        notify(d.buyerId, "NEW_MATCHABLE_PROPERTY", "Talebinize uygun yeni ev", `${p.title} talebinize uyuyor.`, "dashboard/alici/teklifler");
      }
    }
    addAudit(user.id, "PROPERTY_CREATED", "Property", id, p.title);
    return ok(res, { id });
  }

  // --- teklif gonder ---
  if (seg[0] === "offers" && method === "POST" && seg.length === 1) {
    if (!["SELLER", "AGENT"].includes(user.role)) return err(res, 403, "Sadece satıcı teklif gönderebilir.");
    const demand = db.prepare("SELECT * FROM demands WHERE id = ?").get(body.demandId);
    const property = db.prepare("SELECT * FROM properties WHERE id = ?").get(body.propertyId);
    if (!demand || !property) return err(res, 404, "Talep veya ilan bulunamadı.");
    if (property.sellerId !== user.id) return err(res, 403, "Bu ilan size ait değil.");
    const id = uid("o");
    const score = calculateMatchScore(demand, property);
    db.prepare("INSERT INTO offers (id,demandId,propertyId,sellerId,buyerId,price,message,matchScore,status,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .run(id, demand.id, property.id, user.id, demand.buyerId, +body.price || property.price, (body.message || "").trim(), score, "SENT", today());
    db.prepare("UPDATE demands SET offerCount = offerCount + 1 WHERE id = ?").run(demand.id);
    notify(demand.buyerId, "NEW_OFFER", "Yeni teklif geldi", `${demand.title} talebinize teklif var.`, "dashboard/alici/teklifler");
    queueEmail(demand.buyerId, "Talebinize yeni teklif", "Talebinize uygun bir teklif geldi.", "", "Yeni teklif bildirimi");
    addAudit(user.id, "OFFER_SENT", "Offer", id, `Skor ${score}`);
    return ok(res, { id, matchScore: score });
  }

  // --- teklife yanit (ilgileniyorum vb.) ---
  if (seg[0] === "offers" && seg[2] === "respond" && method === "POST") {
    const offer = db.prepare("SELECT * FROM offers WHERE id = ?").get(seg[1]);
    if (!offer) return err(res, 404, "Teklif bulunamadı.");
    if (offer.buyerId !== user.id) return err(res, 403, "Bu teklif size ait değil.");
    let response = body.response === "DECLINED" ? "REJECTED" : body.response;
    if (!["INTERESTED", "INFO_REQUESTED", "REJECTED"].includes(response)) response = "INTERESTED";
    const status = response === "REJECTED" ? "REJECTED" : response;
    db.prepare("UPDATE offers SET status=?, buyerResponse=?, seenAt=? WHERE id=?").run(status, response, today(), offer.id);
    if (response === "INTERESTED") {
      let match = db.prepare("SELECT * FROM matches WHERE offerId = ?").get(offer.id);
      if (!match) {
        const mid = uid("m");
        db.prepare("INSERT INTO matches (id,offerId,buyerId,sellerId,status,createdAt) VALUES (?,?,?,?,?,?)")
          .run(mid, offer.id, offer.buyerId, offer.sellerId, "WAITING_BUYER_APPROVAL", today());
        db.prepare("INSERT INTO messages (id,matchId,senderId,body,maskedBody,containsSensitiveInfo,createdAt) VALUES (?,?,?,?,?,?,?)")
          .run(uid("msg"), mid, "system", "Eşleşme başladı. İletişim bilgileri iki taraf onay verene kadar gizli kalır.", "Eşleşme başladı. İletişim bilgileri iki taraf onay verene kadar gizli kalır.", 0, now());
        notify(offer.sellerId, "NEW_MATCH", "Yeni eşleşme", "Alıcı teklifinizle ilgilendi.", "dashboard/satici/mesajlar");
      }
    }
    addAudit(user.id, "OFFER_RESPONDED", "Offer", offer.id, response);
    return ok(res);
  }

  // --- mesaj gonder (sunucu tarafi maskeleme) ---
  if (seg[0] === "matches" && seg[2] === "messages" && method === "POST") {
    const match = db.prepare("SELECT * FROM matches WHERE id = ?").get(seg[1]);
    if (!match) return err(res, 404, "Eşleşme bulunamadı.");
    if (![match.buyerId, match.sellerId].includes(user.id)) return err(res, 403, "Bu eşleşmenin tarafı değilsiniz.");
    const text = (body.body || "").trim();
    if (!text) return err(res, 400, "Boş mesaj gönderilemez.");
    const { maskedText, containsSensitiveInfo } = maskSensitiveInfo(text);
    db.prepare("INSERT INTO messages (id,matchId,senderId,body,maskedBody,containsSensitiveInfo,createdAt) VALUES (?,?,?,?,?,?,?)")
      .run(uid("msg"), match.id, user.id, text, maskedText, containsSensitiveInfo ? 1 : 0, now());
    return ok(res, { masked: containsSensitiveInfo });
  }

  // --- iletisim onayi (uyelik + cift onay kurali) ---
  if (seg[0] === "matches" && seg[2] === "approve" && method === "POST") {
    const match = db.prepare("SELECT * FROM matches WHERE id = ?").get(seg[1]);
    if (!match) return err(res, 404, "Eşleşme bulunamadı.");
    const isBuyer = match.buyerId === user.id, isSeller = match.sellerId === user.id;
    if (!isBuyer && !isSeller) return err(res, 403, "Yetkiniz yok.");
    if (!hasContactMembership(user.id, user.role))
      return err(res, 402, "İletişim bilgilerini görmek için önce ilgili üyeliği almalısınız.");
    if (isBuyer) db.prepare("UPDATE matches SET buyerContactApproved=1, buyerApprovedAt=? WHERE id=?").run(today(), match.id);
    if (isSeller) db.prepare("UPDATE matches SET sellerContactApproved=1, sellerApprovedAt=? WHERE id=?").run(today(), match.id);
    const m = db.prepare("SELECT * FROM matches WHERE id = ?").get(match.id);
    let unlocked = false;
    if (B(m.buyerContactApproved) && B(m.sellerContactApproved) &&
        hasContactMembership(m.buyerId, "BUYER") && hasContactMembership(m.sellerId, "SELLER")) {
      db.prepare("UPDATE matches SET status='CONTACT_UNLOCKED', contactUnlockedAt=? WHERE id=?").run(now(), m.id);
      db.prepare("INSERT INTO messages (id,matchId,senderId,body,maskedBody,containsSensitiveInfo,createdAt) VALUES (?,?,?,?,?,?,?)")
        .run(uid("msg"), m.id, "system", "İki taraf onay verdi. İletişim kartı açıldı.", "İki taraf onay verdi. İletişim kartı açıldı.", 0, now());
      unlocked = true;
    } else {
      db.prepare("UPDATE matches SET status=? WHERE id=?").run(isBuyer ? "WAITING_SELLER_APPROVAL" : "WAITING_BUYER_APPROVAL", m.id);
    }
    addAudit(user.id, "CONTACT_APPROVED", "Match", m.id, unlocked ? "İletişim açıldı" : "Onay verildi");
    return ok(res, { unlocked });
  }

  // --- butce beyani ---
  if (seg[0] === "buyer-profile" && method === "PUT") {
    if (user.role !== "BUYER") return err(res, 403, "Sadece alıcı.");
    const min = +body.declaredBudgetMin || 0, max = +body.declaredBudgetMax || 0;
    db.prepare(`UPDATE buyer_profiles SET declaredBudgetMin=?,declaredBudgetMax=?,declaredDownPayment=?,declaredCashReady=?,declaredUsesCredit=?,verificationLevel=?,profileCompletion=? WHERE userId=?`)
      .run(min, max, +body.declaredDownPayment || 0, body.declaredCashReady ? 1 : 0, body.declaredUsesCredit ? 1 : 0,
        min && max ? `Bütçe Beyanı: ${Math.round(min / 1e6)}-${Math.round(max / 1e6)} mn TL` : "Bütçe Beyanı Bekleniyor", 70, user.id);
    addAudit(user.id, "BUDGET_DECLARED", "BuyerProfile", user.id, "Bütçe beyan edildi.");
    return ok(res);
  }

  // --- mock odeme / uyelik satin alma ---
  if (seg[0] === "payments" && seg[1] === "checkout" && method === "POST") {
    const plan = db.prepare("SELECT * FROM plans WHERE id = ?").get(body.planId);
    if (!plan) return err(res, 404, "Paket bulunamadı.");
    const pid = uid("pay");
    db.prepare("INSERT INTO payments (id,userId,planId,provider,amount,currency,status,createdAt) VALUES (?,?,?,?,?,?,?,?)")
      .run(pid, user.id, plan.id, "MockPaymentProvider", plan.price, "TRY", "SUCCESS", today());
    db.prepare("INSERT INTO entitlements (id,userId,planId,activeFrom,activeTo) VALUES (?,?,?,?,?)")
      .run(uid("ent"), user.id, plan.id, today(), null);
    // "Uste tasi" paketi: ilgili talep/ilana 7 gunluk boost uygula (yalniz sahibine)
    if ((plan.id === "plan-buyer-boost" || plan.id === "plan-seller-boost") && body.itemType && body.itemId) {
      const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      if (body.itemType === "demand") {
        const d = db.prepare("SELECT id FROM demands WHERE id = ? AND buyerId = ?").get(body.itemId, user.id);
        if (d) db.prepare("UPDATE demands SET boostedUntil = ? WHERE id = ?").run(until, d.id);
      } else if (body.itemType === "property") {
        const p = db.prepare("SELECT id FROM properties WHERE id = ? AND sellerId = ?").get(body.itemId, user.id);
        if (p) db.prepare("UPDATE properties SET boostedUntil = ? WHERE id = ?").run(until, p.id);
      }
    }
    queueEmail(user.id, "Paket satın alındı", `${plan.name} paketiniz aktif.`, "", "Ödeme bildirimi");
    addAudit(user.id, "PAYMENT_SUCCESS", "Payment", pid, plan.name);
    return ok(res, { paymentId: pid });
  }

  // --- satici/danisman dogrulama belgesi yukle ---
  if (seg[0] === "verification-documents" && method === "POST" && seg.length === 1) {
    if (!["SELLER", "AGENT"].includes(user.role)) return err(res, 403, "Sadece satıcı veya emlak danışmanı belge yükleyebilir.");
    const type = (body.type || "Tapu / yetki belgesi").toString().trim().slice(0, 120) || "Tapu / yetki belgesi";
    const id = uid("doc");
    const risk = Math.floor(Math.random() * 25) + 10;
    db.prepare("INSERT INTO verification_documents (id,userId,type,status,riskScore,reviewedById,reviewedAt) VALUES (?,?,?,?,?,?,?)")
      .run(id, user.id, type, "PENDING", risk, null, null);
    addAudit(user.id, "DOCUMENT_SUBMITTED", "VerificationDocument", id, type);
    return ok(res, { id });
  }

  // --- admin/moderator belge inceleme ---
  if (seg[0] === "documents" && seg[2] === "review" && method === "POST") {
    if (!["ADMIN", "REVIEWER"].includes(user.role)) return err(res, 403, "Bu işlem için yetkiniz yok.");
    const doc = db.prepare("SELECT * FROM verification_documents WHERE id = ?").get(seg[1]);
    if (!doc) return err(res, 404, "Belge bulunamadı.");
    const status = ["APPROVED", "REJECTED"].includes(body.status) ? body.status : "APPROVED";
    db.prepare("UPDATE verification_documents SET status=?, reviewedById=?, reviewedAt=? WHERE id=?")
      .run(status, user.id, today(), doc.id);
    notify(doc.userId, `DOCUMENT_${status}`, status === "APPROVED" ? "Belgen onaylandı" : "Belgen reddedildi",
      status === "APPROVED" ? "Doğrulama belgen onaylandı." : "Doğrulama belgen reddedildi, tekrar yükleyebilirsin.", "dashboard/satici/dogrulama");
    addAudit(user.id, `DOCUMENT_${status}`, "VerificationDocument", doc.id, "Belge durumu güncellendi.");
    return ok(res);
  }

  return err(res, 404, "Bilinmeyen API isteği.");
}

const sessionCookie = (token) => ({
  "Set-Cookie": `kt_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`
});

// ---------- Statik dosya servisi ----------
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".json": "application/json", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8" };
// Yalnizca bu dosyalar ve /assets/ altindaki gorseller disariya servis edilir.
// Boylece server/data/app.db, *.mjs, render.yaml, *.md gibi hassas dosyalar HTTP'den indirilemez.
const STATIC_ALLOW = new Set(["/index.html", "/app.js", "/styles.css", "/favicon.ico", "/robots.txt", "/sitemap.xml", "/google65cc11299e6e1d55.html"]);
async function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (p === "/") p = "/index.html";
  const isAsset = p.startsWith("/assets/") && !p.includes("..");
  if (!STATIC_ALLOW.has(p) && !isAsset) { res.writeHead(404); return res.end("Bulunamadı"); }
  const filePath = normalize(join(WEB_DIR, p));
  if (filePath !== WEB_DIR && !filePath.startsWith(WEB_DIR + "/")) { res.writeHead(403); return res.end("Forbidden"); }
  if (!existsSync(filePath)) { res.writeHead(404); return res.end("Bulunamadı"); }
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[extname(filePath)] || "application/octet-stream" });
    res.end(data);
  } catch { res.writeHead(500); res.end("Hata"); }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    return await serveStatic(req, res, url);
  } catch (e) {
    console.error("Sunucu hatası:", e);
    return err(res, 500, "Sunucu hatası: " + e.message);
  }
});

server.listen(PORT, () => console.log(`[konuttalebim] http://localhost:${PORT} adresinde calisiyor`));
