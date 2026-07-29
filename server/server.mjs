// Konuttalebim - API sunucusu (node:http, sifir dis bagimlilik)
import http from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, normalize } from "node:path";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import {
  db, uid, today, now, hashPassword, verifyPassword, seedIfEmpty, ensureAdminFromEnv, purgeDemoData, purgeUsersByIds, syncPlans
} from "./db.mjs";
import { paymentProvider, paymentsAreLive } from "./payment.mjs";
import { renderCityPage, cityPagePaths, CITIES } from "./seo-pages.mjs";
import {
  identityEnabled, identityKeyStatus, encryptSecret, decryptSecret, hashIdentity,
  isValidTckn, validateBirthDate, maskTckn, maskBirthDate, ageFromBirthDate
} from "./identity.mjs";
import { smsEnabled, smsDurumu, normalizePhone, maskPhone, sendSms, verificationMessage } from "./sms.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_DIR = join(__dirname, "..");        // frontend dosyalari (index.html, app.js...)
const PORT = process.env.PORT || 3000;
const BASE_URL = (process.env.PUBLIC_BASE_URL || "https://konuttalebi.com").replace(/\/+$/, "");
const MAX_IMAGE_CHARS = 2_600_000;            // ~1.9MB base64 gorsel siniri

// ---------- TR konum verisi (81 il / 973 ilce / ~73k mahalle) ----------
// Bellekte tutulur, endpoint'ler dilim dilim doner; istemciye tumu gonderilmez.
const LOC_DIR = join(__dirname, "data");
const loadLoc = (f) => { try { return JSON.parse(readFileSync(join(LOC_DIR, f), "utf8")); } catch (e) { console.error("[loc] " + f + " yuklenemedi:", e.message); return null; } };
const TR_CITIES = (loadLoc("tr-cities.json") || []).slice().sort((a, b) => a.name.localeCompare(b.name, "tr")); // [{code,name}]
const TR_DISTRICTS = loadLoc("tr-districts.json") || {};      // { "34": ["Kadıköy", ...] }
const TR_NEIGHBOURHOODS = loadLoc("tr-neighbourhoods.json") || {}; // { "34": { "Kadıköy": ["Bostancı Mah", ...] } }
const trCode = (v) => (v || "").toString().replace(/[^0-9]/g, "").padStart(2, "0");

// Yuklenen gorseli dogrula: sadece kucuk data URL resimlerine izin ver.
function cleanImage(value) {
  if (!value || typeof value !== "string") return null;
  if (!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value)) return null;
  if (value.length > MAX_IMAGE_CHARS) return null;
  return value;
}

seedIfEmpty();
ensureAdminFromEnv();
syncPlans(); // paket adlari/icerikleri son modele gore guncellenir
if (process.env.PURGE_DEMO === "1") { purgeDemoData(); console.log("[konuttalebim] PURGE_DEMO=1 -> demo/test verileri temizlendi."); }
if (process.env.PURGE_USERS) { purgeUsersByIds(process.env.PURGE_USERS); console.log("[konuttalebim] PURGE_USERS -> belirtilen hesaplar temizlendi."); }

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
    req.on("end", () => {
      const ct = (req.headers["content-type"] || "").toLowerCase();
      if (ct.includes("application/x-www-form-urlencoded")) {
        const o = {}; try { for (const [k, v] of new URLSearchParams(data)) o[k] = v; } catch {} return resolve(o);
      }
      try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); }
    });
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
// Kimlik alanlarini dogrula ve sifreli bicimde don. Anahtar yoksa sessizce atlanir.
// Donus: { ok, error } | { ok:true, tcknEnc, tcknHash, birthDate, consent }
function prepareIdentity(body, userIdToSkip) {
  const tckn = String(body.tckn || "").replace(/\s/g, "");
  const birth = String(body.birthDate || "").trim();
  if (!tckn && !birth) return { ok: true, empty: true };
  if (!identityEnabled())
    return { ok: false, error: "Kimlik bilgisi şu anda alınamıyor. Lütfen daha sonra tekrar deneyin." };
  if (!body.identityConsent)
    return { ok: false, error: "Kimlik bilgilerinin işlenmesi için onay vermen gerekiyor." };
  const out = { ok: true, consent: 1 };
  if (tckn) {
    if (!isValidTckn(tckn)) return { ok: false, error: "Geçerli bir T.C. kimlik numarası girin." };
    const h = hashIdentity(tckn);
    const dupe = db.prepare("SELECT id FROM users WHERE tcknHash = ?").get(h);
    if (dupe && dupe.id !== userIdToSkip)
      return { ok: false, error: "Bu T.C. kimlik numarası başka bir üyelikte kayıtlı." };
    out.tcknEnc = encryptSecret(tckn);
    out.tcknHash = h;
  }
  if (birth) {
    const r = validateBirthDate(birth);
    if (!r.ok) return { ok: false, error: r.error };
    out.birthDate = r.value;
  }
  return out;
}

function saveIdentity(userId, prepared) {
  if (!prepared || !prepared.ok || prepared.empty) return;
  const sets = [];
  const vals = [];
  if (prepared.tcknEnc) { sets.push("tcknEnc=?", "tcknHash=?"); vals.push(prepared.tcknEnc, prepared.tcknHash); }
  if (prepared.birthDate) { sets.push("birthDate=?"); vals.push(prepared.birthDate); }
  if (!sets.length) return;
  sets.push("identityConsent=?", "identityConsentAt=?");
  vals.push(1, now());
  vals.push(userId);
  db.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id=?`).run(...vals);
  addAudit(userId, "IDENTITY_SAVED", "User", userId,
    `Kimlik verisi kaydedildi (şifreli). Alanlar: ${prepared.tcknEnc ? "TCKN " : ""}${prepared.birthDate ? "doğum tarihi" : ""}`.trim());
}

function notify(userId, type, title, body, actionUrl) {
  db.prepare("INSERT INTO notifications (id,userId,type,title,body,actionUrl,createdAt) VALUES (?,?,?,?,?,?,?)")
    .run(uid("n"), userId, type, title, body, actionUrl || "", today());
}
// Reklam/kanal kaynagini kaydet (istemci ilk gelisteki gclid/utm degerlerini yollar).
// Kisisel veri degil; yalnizca kampanya kimligi. Uzunluklar sinirlandirilir.
function saveAttribution(userId, attr) {
  if (!attr || typeof attr !== "object") return;
  const cut = (v) => String(v == null ? "" : v).slice(0, 120);
  const src = cut(attr.source), med = cut(attr.medium), cmp = cut(attr.campaign), trm = cut(attr.term), gcl = cut(attr.gclid);
  if (!src && !med && !cmp && !trm && !gcl) return;
  try {
    db.prepare("UPDATE users SET acqSource=?, acqMedium=?, acqCampaign=?, acqTerm=?, acqGclid=? WHERE id=?")
      .run(src, med, cmp, trm, gcl, userId);
  } catch { /* kolon yoksa yoksay */ }
}

// Uyelik tipine gore panel yolu ve karsilama metni (e-postalarda kullanilir).
function dashboardPathForRole(role) {
  const r = String(role || "").toUpperCase();
  if (r === "ADMIN") return "dashboard/admin";
  if (r === "SELLER" || r === "AGENT") return "dashboard/satici";
  return "dashboard/alici";
}
// Karsilama metni her uyelik tipi icin ayni (genel). Yalnizca yeni kayitlarda gonderilir.
function welcomeBody() {
  return [
    "Konut aramanın yeni yolu Konuttalebi'ye hoş geldin.",
    "Burada ilanların arasında kaybolmazsın. Ne aradığını söylersin, sana uygun talepler ve teklifler doğrudan karşına gelir.",
    "Hemen paneline girerek talebini oluşturabilir veya mevcut talepleri inceleyebilirsin.",
    "İletişim bilgilerin gizli tutulur ve yalnızca karşılıklı eşleşme sonrasında paylaşılır.",
    "Başlamaya hazır mısın?"
  ].join("\n\n");
}

// Bildirim e-postasi: panel ici bildirimle ayni anda uyeye e-posta da gider.
// Gonderim deliverEmail uzerinden (Resend); anahtar yoksa outbox'a MOCK_SENT yazilir.
// Bilerek "atesle ve bekleme" (fire-and-forget): e-posta gecikmesi API yanitini bekletmesin.
// ---------- Kayit formu sabitleri ----------
// Bu listeler istemcideki listelerle AYNI olmali; sunucu gelen degeri dogrular.
const GELIR_ARALIKLARI = [
  "0 – 25.000 TL", "25.001 – 45.000 TL", "45.001 – 70.000 TL", "70.001 – 100.000 TL",
  "100.001 – 150.000 TL", "150.001 – 250.000 TL", "250.001 TL ve üzeri", "Belirtmek istemiyorum",
];
const MESLEK_GRUPLARI = [
  "Kamu Memuru / Devlet Personeli", "Özel Sektör Çalışanı (Büyük Şirket)", "KOBİ / SME Çalışanı",
  "Doktor / Hekim", "Avukat / Hukukçu", "Mali Müşavir / Muhasebeci",
  "Mühendis (İnşaat, Makine, Elektrik, Yazılım vb.)", "Mimar / İç Mimar", "Diğer Serbest Meslek",
  "Esnaf / Sanatkâr", "Tüccar / İthalat-İhracatçı", "Restoran / Cafe / Otel İşletmecisi", "Perakende Satış",
  "Bankacılık / Finans / Sigorta", "Bilgi Teknolojileri / Yazılım", "Danışmanlık",
  "Öğretmen / Akademisyen", "Sağlık Personeli (Hemşire, Ebe, Tekniker vb.)", "Sosyal Hizmetler / STK",
  "İnşaat / Taahhüt", "Üretim / Sanayi", "Lojistik / Ulaşım", "Turizm / Otelcilik / Gastronomi",
  "Medya / İletişim / Reklam", "Tarım / Hayvancılık / Ormancılık",
  "Emekli", "Öğrenci", "Ev Hanımı / Ev Ekonomisine Katkı", "İşveren / Patron (Sektör Belirtmeli)",
  "Çalışmıyor / İş Arıyor", "Diğer",
];

/** Sifre kurali: en az 8 karakter, buyuk + kucuk harf ve rakam. */
function sifreGecerliMi(pw) {
  const s = String(pw || "");
  if (s.length < 8) return "Şifre en az 8 karakter olmalı.";
  if (!/[a-zçğıöşü]/.test(s)) return "Şifre en az bir küçük harf içermeli.";
  if (!/[A-ZÇĞİÖŞÜ]/.test(s)) return "Şifre en az bir büyük harf içermeli.";
  if (!/\d/.test(s)) return "Şifre en az bir rakam içermeli.";
  return "";
}

// ---------- E-posta dogrulama (72 saat) ----------
const EPOSTA_SURE_SAAT = 72;

function epostaDogrulamaBaslat(userId, email, isim) {
  const token = randomBytes(24).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expires = new Date(Date.now() + EPOSTA_SURE_SAAT * 3600 * 1000).toISOString();
  db.prepare("INSERT INTO email_verifications (tokenHash,userId,email,createdAt,expiresAt,usedAt,sentCount) VALUES (?,?,?,?,?,NULL,1)")
    .run(tokenHash, userId, email, now(), expires);
  db.prepare("UPDATE users SET emailVerifyDeadline=? WHERE id=?").run(expires, userId);
  const link = `${BASE_URL}/api/eposta/dogrula?t=${token}`;
  const html = notificationEmailHtml(isim, "E-postanı doğrula",
    [`Üyeliğini tamamlamak için e-posta adresini doğrulaman gerekiyor.`,
      `Aşağıdaki butona tıkladığında işlem tamamlanır. Bağlantı ${EPOSTA_SURE_SAAT} saat geçerlidir.`,
      `Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.`].join("\n\n"),
    "", null, userId);
  // Butonun dogru adrese gitmesi icin baglantiyi HTML icinde degistiriyoruz.
  const htmlLinkli = html.replace(/href="[^"]*"(\s+style="display:inline-block;background:#d6a94a)/, `href="${link}"$1`);
  Promise.resolve()
    .then(() => deliverEmail(userId, email, isim, "Konuttalebi — E-postanı doğrula", htmlLinkli, "E-posta doğrulama"))
    .catch((e) => console.error("[mail] eposta dogrulama gonderilemedi:", e && e.message));
  return expires;
}

/**
 * E-posta dogrulama hatirlatmasi.
 *
 * Ne zaman: sure dolmasina 24 saatten az kaldiginda, kullanici basina BIR KEZ.
 * Yeni bir baglanti uretir ama SURE UZATMAZ — token, ilk kayittaki bitis aninda
 * gecersiz olur. Aksi halde hatirlatma sureyi surekli oteler, 72 saat kurali
 * anlamsizlasirdi.
 *
 * Bu bir islem e-postasidir (hesabin isleyisi), pazarlama degildir; bildirim
 * tercihlerinden etkilenmez.
 */
function epostaHatirlatmaGonder(u) {
  const token = randomBytes(24).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  db.prepare("INSERT INTO email_verifications (tokenHash,userId,email,createdAt,expiresAt,usedAt,sentCount) VALUES (?,?,?,?,?,NULL,1)")
    .run(tokenHash, u.id, u.email, now(), u.emailVerifyDeadline);
  db.prepare("UPDATE users SET emailReminderSentAt=? WHERE id=?").run(now(), u.id);
  const kalanSaat = Math.max(1, Math.round((new Date(u.emailVerifyDeadline) - Date.now()) / 3600000));
  const link = `${BASE_URL}/api/eposta/dogrula?t=${token}`;
  const html = notificationEmailHtml(u.name, "E-postanı doğrulamayı unutma",
    ["Üyeliğini açtın ama e-posta adresini henüz doğrulamadın.",
      `Doğrulama bağlantın yaklaşık ${kalanSaat} saat sonra geçersiz olacak. Aşağıdaki butona tıklaman yeterli.`,
      "Doğrulamadığında talep ve tekliflerinle ilgili bildirimleri kaçırabilirsin."
    ].join("\n\n"), "", null, u.id);
  const htmlLinkli = html.replace(/href="[^"]*"(\s+style="display:inline-block;background:#d6a94a)/, `href="${link}"$1`);
  addAudit(u.id, "EMAIL_VERIFY_REMINDER", "User", u.id, `${kalanSaat} saat kala hatırlatma gönderildi.`);
  return deliverEmail(u.id, u.email, u.name, "Konuttalebi — E-postanı doğrulamayı unutma", htmlLinkli, "E-posta doğrulama hatırlatması");
}

async function epostaHatirlatmaTara() {
  const bekleyenler = db.prepare(`
    SELECT u.id, u.name, u.email, u.emailVerifyDeadline
    FROM users u JOIN auth_accounts a ON a.userId = u.id
    WHERE a.emailVerified = 0 AND u.status = 'ACTIVE'
      AND u.emailVerifyDeadline IS NOT NULL AND u.emailReminderSentAt IS NULL
      AND u.email IS NOT NULL AND u.email <> ''`).all();
  let gonderilen = 0;
  for (const u of bekleyenler) {
    const kalanSaat = (new Date(u.emailVerifyDeadline) - Date.now()) / 3600000;
    if (kalanSaat > 0 && kalanSaat <= 24) {
      try { await epostaHatirlatmaGonder(u); gonderilen++; }
      catch (e) { console.error("[mail] hatirlatma gonderilemedi:", e && e.message); }
    }
  }
  return gonderilen;
}

// Saatte bir kontrol; ilk kontrol sunucu acildiktan 1 dk sonra.
setInterval(() => {
  epostaHatirlatmaTara()
    .then((n) => { if (n) console.log(`[mail] e-posta dogrulama hatirlatmasi: ${n} kisi`); })
    .catch((e) => console.error("[mail] hatirlatma taramasi hatasi:", e && e.message));
}, 60 * 60 * 1000).unref?.();
setTimeout(() => { epostaHatirlatmaTara().catch(() => {}); }, 60 * 1000).unref?.();

// ---------- Telefon dogrulama ----------
// Kod veritabaninda ACIK TUTULMAZ; SHA-256 ozeti saklanir. Test modunda
// (Netgsm bilgileri yokken) kod ayrica testCode alanina yazilir ve YALNIZCA
// yonetim panelinden gorunur — istemciye hicbir kosulda donulmez.
const KOD_GECERLILIK_DK = 5;
const KOD_MAX_DENEME = 5;

function hashCode(code) {
  const secret = process.env.KT_ENC_KEY || process.env.RESEND_API_KEY || "konuttalebi-otp";
  return createHash("sha256").update(`${secret}:${code}`).digest("hex");
}

function phoneVerified(userId) {
  const u = db.prepare("SELECT phoneVerified FROM users WHERE id=?").get(userId);
  return Boolean(u && u.phoneVerified);
}

/**
 * Dogrulanmamis kullaniciya 403 doner; cagiran yer return eder.
 *
 * KRITIK: SMS saglayicisi yapilandirilmamissa kapi ACILMAZ. Aksi halde
 * kullanici kod isteyebilir ama SMS almadigi icin asla dogrulayamaz ve
 * talep/ilan/teklif akisi tamamen kilitlenir. Netgsm bilgileri girilene
 * kadar ozellik uykuda bekler.
 */
function requirePhone(res, user) {
  if (!smsEnabled()) return false;
  if (phoneVerified(user.id)) return false;
  err(res, 403, "Devam etmek için telefon numaranı doğrulaman gerekiyor.");
  return true;
}

// ---------- Bildirim tercihleri ve abonelikten cikma ----------
// Tek tikla birakma linki icin kullaniciya ozel imza. Anahtar yoksa oturum
// sirri yerine sabit bir yedek kullanilir; amac tahmin edilemez olmasi.
function unsubToken(userId) {
  const secret = process.env.KT_ENC_KEY || process.env.RESEND_API_KEY || "konuttalebi-unsub";
  return createHash("sha256").update(`${secret}:${userId}`).digest("hex").slice(0, 24);
}
function unsubUrl(userId) {
  return `${BASE_URL}/api/bildirim/birak?u=${encodeURIComponent(userId)}&t=${unsubToken(userId)}`;
}
/**
 * Bu kullaniciya bu turden e-posta gonderilebilir mi?
 * tur: "match"   -> eslesme/iletisim bildirimleri (notifyMatch)
 *      "digest"  -> gunluk ozet (notifyDigest)
 *      "tx"      -> islem e-postasi (sifre, odeme, moderasyon): HER ZAMAN gonderilir
 */
function mailIzniVar(userId, tur) {
  if (tur === "tx") return true;
  const u = db.prepare("SELECT notifyMatch, notifyDigest FROM users WHERE id=?").get(userId);
  if (!u) return false;
  if (tur === "digest") return u.notifyDigest === null || u.notifyDigest === undefined ? true : Boolean(u.notifyDigest);
  return u.notifyMatch === null || u.notifyMatch === undefined ? true : Boolean(u.notifyMatch);
}

/**
 * "Sana uygun yeni ilan/talep" bildirimi. Okan'in karari (29 Tem 2026):
 * takvime bagli gunluk ozet YOK, aksiyon aninda gonderilir.
 *
 * Tekrar korumasi: ayni kullaniciya ayni satir 24 saat icinde ikinci kez
 * gonderilmez. Kayit digest_queue tablosunda tutulur (gecmis + tekrar kontrolu).
 */
function queueDigest(userId, kind, title, line, actionUrl) {
  if (!mailIzniVar(userId, "digest")) return;
  const sinir = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const ayni = db.prepare("SELECT 1 FROM digest_queue WHERE userId=? AND line=? AND createdAt > ?").get(userId, line, sinir);
  if (ayni) return;
  db.prepare("INSERT INTO digest_queue (id,userId,kind,title,line,actionUrl,createdAt,sentAt) VALUES (?,?,?,?,?,?,?,?)")
    .run(uid("dg"), userId, kind, title, line, actionUrl || "", now(), now());
  queueEmail(userId, title, [line, "Panelinden inceleyip harekete geçebilirsin."].join("\n\n"),
    actionUrl || "dashboard", "Uygun ilan/talep bildirimi", null, "digest");
}

// Eski kayitlari temizle: digest_queue artik yalnizca "ayni bildirimi 24 saat
// icinde iki kez gonderme" kontrolu icin tutuluyor; 30 gunden eskisi gereksiz.
function digestCleanup() {
  try {
    const sinir = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    db.prepare("DELETE FROM digest_queue WHERE createdAt < ?").run(sinir);
  } catch { /* temizlik hatasi sunucuyu etkilemesin */ }
}
setInterval(digestCleanup, 24 * 3600 * 1000).unref?.();

/**
 * "Talebin yayında" e-postasi. Duz metin sablonundan farkli, kartli tasarim.
 *
 * DIKKAT — buradaki her sayi GERCEK veriden gelir:
 *  - uygunSayi: talep olusturulurken hesaplanan gercek eslesme sayisi.
 *  - Uydurma istatistik (ornegin "ortalama ilk teklif suresi") KOYULMAZ;
 *    elimizde o veri yok, tahmini rakam yaziyi guvenilmez yapar.
 */
function demandPublishedEmailHtml(toName, d, uygunSayi, userId) {
  const kira = (d.transactionType || "SALE") === "RENT";
  const ad = toName ? escapeHtmlSrv(String(toName).split(" ")[0]) : "";
  const konum = [d.city, d.district].filter(Boolean).join(" / ") || "Belirtilmedi";
  const butce = `${paraTR(d.minBudget)} – ${paraTR(d.maxBudget)}${kira ? " / ay" : ""}`;
  const tur = `${d.roomCount || ""} ${kira ? "kiralık" : "satılık"} ${String(d.propertyType || "konut").toLowerCase()}`.trim();
  const panelUrl = `${APP_URL()}/#/dashboard/alici/taleplerim`;
  const yardimUrl = `${APP_URL()}/#/yardim`;

  const satir = (etiket, deger) => `
    <td style="padding:0 8px 14px 0;vertical-align:top;width:50%">
      <div style="font-size:12.5px;color:#8496a8;margin-bottom:3px">${escapeHtmlSrv(etiket)}</div>
      <div style="font-size:15px;font-weight:700;color:#10243a">${escapeHtmlSrv(deger)}</div>
    </td>`;

  // Eslesme kutusu: sayi varsa yesil, yoksa durust bir bekleme mesaji.
  const kutu = uygunSayi > 0
    ? `<div style="background:#eef7f0;border:1px solid #d3e8d9;border-radius:12px;padding:22px;text-align:center;margin:18px 0">
         <div style="font-size:40px;font-weight:800;color:#10243a;line-height:1.1">${uygunSayi}</div>
         <div style="font-size:14.5px;color:#41556d;margin-top:6px">
           ${kira ? "ev sahibinin" : "satıcının"} yayındaki konutu talebinle uyuşuyor; talebin onlara bildirildi.
         </div>
       </div>`
    : `<div style="background:#fbf6ec;border:1px solid #f0e2c8;border-radius:12px;padding:20px;margin:18px 0">
         <div style="font-size:14.5px;color:#41556d;line-height:1.6">
           Talebin aktif. Kriterlerine uyan bir konut yayınlandığı anda
           ${kira ? "ev sahibine" : "satıcıya"} bildirilir ve sana haber veririz.
         </div>
       </div>`;

  const sss = [
    ["Teklifi kim gönderir?", `Talebini gören ${kira ? "ev sahipleri ve emlak danışmanları" : "satıcılar ve emlak danışmanları"} sana özel teklif gönderir. Sen aramazsın.`],
    ["İletişim bilgilerim güvende mi?", "Evet. Talebinde adın, telefonun ve e-postan görünmez. İletişim bilgisi yalnızca eşleşme sonrası, iki taraf da onay verdiğinde paylaşılır."],
    ["Teklif gelmezse ne yapmalıyım?", "Talebini panelinden düzenleyip bütçe aralığını veya bölgeyi genişletebilirsin; daha fazla konutla eşleşirsin."]
  ].map(([s, c]) => `
    <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#41556d">
      <strong style="color:#10243a">${escapeHtmlSrv(s)}</strong><br>${escapeHtmlSrv(c)}
    </p>`).join("");

  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#10243a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden">

        <tr><td style="background:#10243a;padding:30px 26px;text-align:center">
          <div style="color:#d6a94a;font-size:11px;font-weight:700;letter-spacing:1.6px;margin-bottom:10px">KONUTTALEBİ</div>
          <div style="font-size:36px;line-height:1;margin-bottom:10px">&#127881;</div>
          <div style="color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-.3px">Talebin yayında</div>
          <div style="color:#a8bcd0;font-size:14px;margin-top:6px">Artık teklifler sana gelecek</div>
        </td></tr>

        <tr><td style="padding:26px">
          <p style="margin:0 0 6px;font-size:15px;color:#41556d">Merhaba${ad ? " " + ad : ""},</p>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#41556d">
            Talebin başarıyla yayınlandı. <strong style="color:#10243a">${escapeHtmlSrv(konum)}</strong> için
            <strong style="color:#10243a">${escapeHtmlSrv(tur)}</strong> talebin aktif.
          </p>

          <div style="background:#f5f8fb;border-radius:12px;padding:18px 18px 4px">
            <div style="font-size:11.5px;font-weight:700;letter-spacing:.06em;color:#8496a8;margin-bottom:12px">TALEP DETAYLARIN</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>${satir("Lokasyon", konum)}${satir(kira ? "Aylık kira" : "Bütçe", butce)}</tr>
              <tr>${satir("Oda", d.roomCount || "Belirtilmedi")}${satir(kira ? "Taşınma" : "Alım zamanı", d.purchaseTimeline || "Belirtilmedi")}</tr>
            </table>
          </div>

          ${kutu}

          <div style="text-align:center;margin:22px 0 6px">
            <a href="${panelUrl}" style="display:inline-block;background:#d6a94a;color:#10243a;text-decoration:none;font-weight:700;font-size:15px;padding:14px 30px;border-radius:10px">Talebimi görüntüle</a>
          </div>

          <div style="border-top:1px solid #e8edf3;margin-top:24px;padding-top:20px">
            <div style="font-size:15px;font-weight:700;color:#10243a;margin-bottom:12px">Sıkça sorulanlar</div>
            ${sss}
          </div>
        </td></tr>

        <tr><td style="background:#f7f9fc;padding:18px 26px;font-size:12px;line-height:1.6;color:#7d8ea1">
          <p style="margin:0 0 8px;color:#10243a;font-weight:700;font-size:13px">Konuttalebi<br>
            <span style="color:#b08a35;font-weight:700">Sen aramazsın, teklifler sana gelir!</span></p>
          <a href="${panelUrl}" style="color:#41556d">Talebimi düzenle</a> ·
          <a href="${yardimUrl}" style="color:#41556d">Yardım</a> ·
          <a href="mailto:info@konuttalebi.com" style="color:#41556d">info@konuttalebi.com</a>
          ${userId ? `<br><br>Bu tür bildirimleri almak istemiyorsan
          <a href="${unsubUrl(userId)}" style="color:#41556d">tek tıkla bırakabilirsin</a>.` : ""}
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ---------- Eslesme e-postalari icin ozet metinleri ----------
// Kimlik, telefon veya e-posta ASLA girmez. Yalnizca ilan/talep ozeti.
const paraTR = (n) => Number(n || 0).toLocaleString("tr-TR") + " TL";

function ilanOzeti(propertyId) {
  const p = db.prepare("SELECT * FROM properties WHERE id=?").get(propertyId);
  if (!p) return "";
  const kira = (p.transactionType || "SALE") === "RENT";
  const parcalar = [
    [p.city, p.district].filter(Boolean).join(" / "),
    [p.mainCategory, p.propertyType].filter(Boolean).join(" "),
    p.roomCount,
    p.netSqm ? `${p.netSqm} m²` : "",
    p.price ? paraTR(p.price) + (kira ? " / ay" : "") : ""
  ].filter(Boolean);
  return `${p.title}\n${parcalar.join(" · ")}`;
}

function talepOzeti(demandId) {
  const d = db.prepare("SELECT * FROM demands WHERE id=?").get(demandId);
  if (!d) return "";
  const kira = (d.transactionType || "SALE") === "RENT";
  const butce = d.minBudget || d.maxBudget
    ? `${paraTR(d.minBudget)} – ${paraTR(d.maxBudget)}${kira ? " / ay" : ""}`
    : "";
  const parcalar = [
    [d.city, d.district].filter(Boolean).join(" / "),
    [d.mainCategory, d.propertyType].filter(Boolean).join(" "),
    d.roomCount,
    butce
  ].filter(Boolean);
  return `${d.title}\n${parcalar.join(" · ")}`;
}

function queueEmail(userId, subject, body, actionUrl, reason, closing, tur) {
  const u = db.prepare("SELECT name,email FROM users WHERE id = ?").get(userId);
  if (!u || !u.email) return;
  if (!mailIzniVar(userId, tur || "tx")) return;
  const html = notificationEmailHtml(u.name, subject, body, actionUrl, closing, userId);
  // Konu zaten marka adiyla basliyorsa tekrar on ek koyma.
  const subj = /^konuttalebi/i.test(subject) ? subject : `Konuttalebi — ${subject}`;
  Promise.resolve()
    .then(() => deliverEmail(userId, u.email, u.name, subj, html, reason, userId))
    .catch((e) => console.error("[mail] bildirim gonderilemedi:", e && e.message));
}

// ---------- Google ile giris (OAuth 2.0 / OpenID Connect) ----------
// Gizli anahtarlar yalnizca ortam degiskeninde: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
// Tanimli degilse ozellik kapali kalir (istemcide buton gorunmez).
const GOOGLE = {
  get clientId() { return (process.env.GOOGLE_CLIENT_ID || "").trim(); },
  get clientSecret() { return (process.env.GOOGLE_CLIENT_SECRET || "").trim(); },
  get enabled() { return Boolean(this.clientId && this.clientSecret); },
};
const googleRedirectUri = () => `${BASE_URL}/api/auth/google/callback`;
// Kisa omurlu imzali cerez (state + bekleyen profil) — sunucu sirri ile HMAC'lenir.
const cookieSecret = () => process.env.SESSION_SECRET || process.env.GOOGLE_CLIENT_SECRET || "konuttalebi-dev-secret";
function signPayload(objOrStr) {
  const raw = typeof objOrStr === "string" ? objOrStr : JSON.stringify(objOrStr);
  const b64 = Buffer.from(raw, "utf8").toString("base64url");
  const mac = createHash("sha256").update(b64 + cookieSecret()).digest("base64url").slice(0, 32);
  return `${b64}.${mac}`;
}
function verifyPayload(signed) {
  if (!signed || !signed.includes(".")) return null;
  const [b64, mac] = signed.split(".");
  const expected = createHash("sha256").update(b64 + cookieSecret()).digest("base64url").slice(0, 32);
  if (mac !== expected) return null;
  try { return JSON.parse(Buffer.from(b64, "base64url").toString("utf8")); } catch { return null; }
}

// ---------- Gercek e-posta gonderimi ----------
// RESEND_API_KEY tanimliysa Resend API'si ile gonderir; yoksa yalnizca outbox'a
// (mock) yazar. Boylece saglayici gelene kadar akis kirilmadan calisir, saglayici
// baglaninca tek ortam degiskeni ile gercek gonderime gecer.
const APP_URL = () => (process.env.APP_URL || "https://konuttalebi.com").replace(/\/+$/, "");
const MAIL_FROM = () => process.env.MAIL_FROM || "Konuttalebi <onboarding@resend.dev>";
// Kullanici gonderdigimiz maile YANIT yazarsa buraya duser (kurumsal kutu).
const MAIL_REPLY_TO = () => process.env.MAIL_REPLY_TO || "info@konuttalebi.com";
const sha256hex = (s) => createHash("sha256").update(String(s)).digest("hex");
const escapeHtmlSrv = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Bildirim e-postalari icin ortak sablon (marka basligi + metin + tek eylem butonu).
/**
 * Mail basligina gore emoji secer. Olumsuz haber tasiyan e-postalarda
 * (yayindan kaldirildi, askiya alindi, reddedildi) EMOJI KULLANILMAZ —
 * kotu haberin yanindaki neseli simge kullaniciyi rahatsiz eder.
 * HTML varlik kodu kullaniyoruz; boylece kodlama sorunlarindan etkilenmez.
 */
function mailEmojisi(title) {
  const t = String(title || "").toLocaleLowerCase("tr");
  if (/kaldırıld|askıya|reddedild|iptal|başarısız/.test(t)) return "";      // olumsuz: emoji yok
  if (/hoş geldin/.test(t)) return "&#128075;";                              // el sallama
  if (/yayında|geri alındı|tekrar yayında/.test(t)) return "&#127881;";      // konfeti
  // SIRA ONEMLI: "Eşleştiniz — teklifin ilgi gördü" hem "eşleş" hem "teklif"
  // iceriyor; eslesme daha guclu anlam tasidigi icin once o kontrol edilir.
  if (/eşleş/.test(t)) return "&#129309;";                                   // tokalasma
  if (/iletişim açıldı/.test(t)) return "&#128275;";                         // acik kilit
  if (/sıra sende|onay verdi|bekleniyor/.test(t)) return "&#8987;";          // kum saati
  if (/teklif/.test(t)) return "&#128236;";                                  // posta kutusu
  if (/uygun/.test(t)) return "&#127968;";                                   // ev
  if (/şifre/.test(t)) return "&#128273;";                                   // anahtar
  if (/paket|üyelik|tanımlandı|onaylandı|aktif/.test(t)) return "&#9989;";   // onay isareti
  return "";
}

function notificationEmailHtml(toName, title, body, actionUrl, closing, unsubUserId) {
  const emoji = mailEmojisi(title);
  const clean = String(actionUrl || "").replace(/^#?\/*/, "");
  const link = clean ? `${APP_URL()}/#/${clean}` : APP_URL();
  const label = clean.startsWith("dashboard") ? "Panelime Git" : "Konuttalebi'ye git";
  const merhaba = toName ? `Merhaba ${escapeHtmlSrv(String(toName).split(" ")[0])},` : "Merhaba,";
  // Bos satirla ayrilmis metni paragraflara cevir.
  const paragraphs = String(body || "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#41556d">${escapeHtmlSrv(p)}</p>`).join("");
  // closing verilirse butonun altinda o gorunur; yoksa standart gizlilik notu.
  const afterCta = closing
    ? `<p style="margin:22px 0 0;font-size:14px;line-height:1.7;color:#41556d">${escapeHtmlSrv(closing)}</p>`
    : `<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#7d8ea1">İletişim bilgileri yalnızca üyelikle ve karşı tarafın rızasıyla paylaşılır. Fiyata, pazarlığa veya sözleşmeye karışmayız.</p>`;
  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#10243a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden">
        <tr><td style="background:#10243a;padding:30px 26px;text-align:center">
          <div style="color:#d6a94a;font-size:11px;font-weight:700;letter-spacing:1.6px;margin-bottom:10px">KONUTTALEBİ</div>
          ${emoji ? `<div style="font-size:36px;line-height:1;margin-bottom:10px">${emoji}</div>` : ""}
          <div style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-.3px;line-height:1.3">${escapeHtmlSrv(title)}</div>
        </td></tr>
        <tr><td style="padding:26px">
          <p style="margin:0 0 14px;font-size:15px;color:#41556d">${merhaba}</p>
          ${paragraphs}
          <div style="text-align:center;margin:20px 0 4px">
            <a href="${link}" style="display:inline-block;background:#d6a94a;color:#10243a;text-decoration:none;font-weight:700;font-size:15px;padding:14px 30px;border-radius:10px">${label}</a>
          </div>
          ${afterCta}
        </td></tr>
        <tr><td style="background:#f7f9fc;padding:18px 26px;font-size:12px;line-height:1.6;color:#7d8ea1">
          <p style="margin:0 0 8px;color:#10243a;font-weight:700;font-size:13px">Konuttalebi<br>
            <span style="color:#b08a35;font-weight:700">Sen aramazsın, teklifler sana gelir!</span></p>
          <a href="${APP_URL()}/#/yardim" style="color:#41556d">Yardım</a> ·
          <a href="mailto:info@konuttalebi.com" style="color:#41556d">info@konuttalebi.com</a>
          ${unsubUserId ? `<br><br>Bu tür bildirimleri almak istemiyorsan
          <a href="${unsubUrl(unsubUserId)}" style="color:#41556d">tek tıkla bırakabilirsin</a>.
          Şifre, ödeme ve hesap güvenliğiyle ilgili e-postalar her hâlükârda gönderilir.` : ""}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function deliverEmail(userId, toEmail, toName, subject, html, reason, unsubUserId) {
  const key = (process.env.RESEND_API_KEY || "").trim();
  let status = "MOCK_SENT";
  if (key && toEmail) {
    try {
      // List-Unsubscribe: posta kutularinin (Gmail/Outlook) kendi "abonelikten cik"
      // butonunu gostermesini saglar; spam sikayetini dusurur.
      const headers = unsubUserId ? {
        "List-Unsubscribe": `<${unsubUrl(unsubUserId)}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
      } : undefined;
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: MAIL_FROM(), to: [toEmail], reply_to: MAIL_REPLY_TO(), subject, html, ...(headers ? { headers } : {}) })
      });
      status = resp.ok ? "SENT" : "FAILED";
      if (!resp.ok) console.error("[mail] Resend hata:", resp.status, await resp.text().catch(() => ""));
    } catch (e) { status = "FAILED"; console.error("[mail] gonderim hatasi:", e.message); }
  }
  try {
    db.prepare("INSERT INTO email_outbox (id,toUserId,toEmail,toName,subject,body,actionUrl,reason,status,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .run(uid("e"), userId || "", toEmail || "", toName || "", subject, html, "", reason || "", status, today());
  } catch { /* yoksay */ }
  return status;
}

// ---------- Is mantigi (sunucu tarafi) ----------
const MAIN_CATS = ["Konut", "İş Yeri", "Arsa"];
function calculateMatchScore(demand, property) {
  let score = 0;
  if (!demand || !property) return 0;
  if ((demand.transactionType || "SALE") !== (property.transactionType || "SALE")) return 0;
  if ((demand.mainCategory || "Konut") !== (property.mainCategory || "Konut")) return 0;
  if (demand.city === property.city) score += 12;
  if (demand.district === property.district) score += 13;
  // Mahalle uyumu: ilanin mahallesi, talebin sectigi mahalleler arasindaysa ekstra puan
  if (property.neighborhood) {
    let dHoods = [];
    try { dHoods = JSON.parse(demand.neighborhoods || "[]"); } catch {}
    if (demand.neighborhood) dHoods.push(demand.neighborhood);
    if (dHoods.includes(property.neighborhood)) score += 10;
  }
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

// ---- Konum bazli eslesme (puandan bagimsiz bildirim tetikleyici) ----
// Talebin sectigi mahalleleri diziye cevir (coklu mahalle + tekil neighborhood).
function demandHoods(demand) {
  let hoods = [];
  try { hoods = JSON.parse(demand.neighborhoods || "[]"); } catch {}
  if (!Array.isArray(hoods)) hoods = [];
  if (demand.neighborhood) hoods.push(demand.neighborhood);
  return hoods.map((h) => String(h || "").trim()).filter(Boolean);
}
// Talep hangi konum duzeyini belirttiyse ILAN o duzeyde ayni yerde mi?
// Oncelik: mahalle > ilce > il. Donen: "mahalle" | "ilce" | "il" | null.
// Kural: talep dar bir alan sectiyse (mahalle), ilan mutlaka o mahallelerden
// birinde olmali; talep sadece ilce sectiyse ayni ilce; sadece il sectiyse ayni il.
function locationMatchLevel(demand, property) {
  if (!demand || !property) return null;
  if ((demand.transactionType || "SALE") !== (property.transactionType || "SALE")) return null;
  if ((demand.mainCategory || "Konut") !== (property.mainCategory || "Konut")) return null;
  if (!demand.city || !property.city || demand.city !== property.city) return null;
  const hoods = demandHoods(demand);
  if (hoods.length) {
    // Once tam mahalle uyumu; degilse ayni ilcede olmasi da uyum sayilir.
    if (property.neighborhood && hoods.includes(String(property.neighborhood).trim())) return "mahalle";
    if (demand.district && property.district && String(property.district).trim() === String(demand.district).trim()) return "ilce";
    return null;
  }
  if (demand.district) {
    return (property.district && String(property.district).trim() === String(demand.district).trim()) ? "ilce" : null;
  }
  return "il";
}
// Bildirim icin butce uyumu: ilan fiyati, talebin ust butcesini %10'dan fazla asmasin.
function budgetFits(demand, property) {
  const max = +demand.maxBudget || 0;
  if (!max) return true;                 // butce belirtilmemisse engelleme
  const price = +property.price || 0;
  if (!price) return true;
  return price <= max * 1.1;
}
// Konum + butce esli bir eslesme mi? Donen konum duzeyi ("mahalle"/"ilce"/"il") ya da null.
function locationNotifyMatch(demand, property) {
  const lvl = locationMatchLevel(demand, property);
  if (!lvl) return null;
  return budgetFits(demand, property) ? lvl : null;
}
// Bildirim metni icin okunur konum etiketi.
function locationLabel(property, lvl) {
  if (lvl === "mahalle") return [property.district, property.neighborhood].filter(Boolean).join(" ").trim();
  if (lvl === "ilce") return String(property.district || "").trim();
  return String(property.city || "").trim();
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
  // Satıcı/ev sahibi hem satılık (plan-seller-contact) hem kiralık (plan-landlord-contact) üyeliğiyle iletişim görebilir.
  const ids = role === "BUYER" ? ["plan-buyer-contact"] : ["plan-seller-contact", "plan-landlord-contact"];
  const ph = ids.map(() => "?").join(",");
  const row = db.prepare(
    `SELECT COUNT(*) AS c FROM entitlements WHERE userId = ? AND (planId IN (${ph}) OR planId = 'plan-pro')`
  ).get(userId, ...ids);
  return row.c > 0;
}

// Odeme onaylandiginda uyeligi ac, boost uygula, bildir. Idempotent (callback tekrar gelebilir).
function fulfillPayment(pid) {
  const pay = db.prepare("SELECT * FROM payments WHERE id = ?").get(pid);
  if (!pay) return false;
  if (pay.status === "SUCCESS") return true;
  db.prepare("UPDATE payments SET status='SUCCESS' WHERE id=?").run(pid);
  db.prepare("INSERT INTO entitlements (id,userId,planId,activeFrom,activeTo) VALUES (?,?,?,?,?)")
    .run(uid("ent"), pay.userId, pay.planId, today(), null);
  if ((pay.planId === "plan-buyer-boost" || pay.planId === "plan-seller-boost") && pay.boostItemType && pay.boostItemId) {
    const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (pay.boostItemType === "demand") {
      const d = db.prepare("SELECT id FROM demands WHERE id = ? AND buyerId = ?").get(pay.boostItemId, pay.userId);
      if (d) db.prepare("UPDATE demands SET boostedUntil = ? WHERE id = ?").run(until, d.id);
    } else if (pay.boostItemType === "property") {
      const p = db.prepare("SELECT id FROM properties WHERE id = ? AND sellerId = ?").get(pay.boostItemId, pay.userId);
      if (p) db.prepare("UPDATE properties SET boostedUntil = ? WHERE id = ?").run(until, p.id);
    }
  }
  const plan = db.prepare("SELECT * FROM plans WHERE id = ?").get(pay.planId);
  queueEmail(pay.userId, "Paketin aktif", `${plan ? plan.name : "Üyelik"} paketin ödemesi alındı ve hesabında aktif edildi. Panelinden kullanmaya başlayabilirsin.`, "dashboard", "Ödeme bildirimi");
  addAudit(pay.userId, "PAYMENT_SUCCESS", "Payment", pid, plan ? plan.name : pay.planId);
  return true;
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
  // Iletisim kilidi: eslesme varsa VE goruntuleyen tarafin aktif ucretli "bilgileri gorme"
  // uyeligi varsa karsi tarafin iletisim bilgisi acilir. Tek tarafli: odeyen gorur, karsi onay gerekmez.
  const unlockedWith = new Set();
  if (user) {
    const viewerHasMembership = hasContactMembership(user.id, user.role);
    for (const m of matches) {
      if (m.buyerId !== user.id && m.sellerId !== user.id) continue;
      const other = m.buyerId === user.id ? m.sellerId : m.buyerId;
      if (viewerHasMembership || m.status === "CONTACT_UNLOCKED") unlockedWith.add(other);
    }
  }
  const users = all("users").map((u) => {
    const self = user && u.id === user.id;
    const canSeeContact = self || (user && unlockedWith.has(u.id)) || (user && user.role === "ADMIN");
    const isAdmin = user && user.role === "ADMIN";
    return {
      id: u.id, role: u.role, name: u.name, city: u.city, status: u.status,
      trustScore: u.trustScore, createdAt: u.createdAt,
      email: canSeeContact ? u.email : "",
      phone: canSeeContact ? u.phone : "",
      // Kanal bilgisi yalnizca admin panelinde gorunur (kampanya raporlamasi icin).
      acqSource: isAdmin ? (u.acqSource || "") : undefined,
      acqMedium: isAdmin ? (u.acqMedium || "") : undefined,
      acqCampaign: isAdmin ? (u.acqCampaign || "") : undefined,
      acqGclid: isAdmin ? (u.acqGclid || "") : undefined,
      // Kimlik verisi: ADMIN'e bile yalnizca MASKELI doner. Acik deger icin ayri
      // bir istek (/users/:id/identity) gerekir ve o istek denetim kaydi dusurur.
      // Kullaniciya kendi TCKN'si de maskeli gosterilir (omuz ustu okumaya karsi).
      tcknMasked: (isAdmin || self) ? maskTckn(decryptSecret(u.tcknEnc)) : undefined,
      birthDateMasked: (isAdmin || self) ? maskBirthDate(u.birthDate) : undefined,
      age: isAdmin ? ageFromBirthDate(u.birthDate) : undefined,
      identityConsent: isAdmin ? (u.identityConsent ? 1 : 0) : undefined,
      adminNote: isAdmin ? (u.adminNote || "") : undefined,
      // Bildirim tercihleri: kullanici kendisinin, admin herkesinkini gorur.
      // NULL = hic dokunulmamis = acik kabul edilir.
      notifyMatch: (self || isAdmin) ? (u.notifyMatch === 0 ? 0 : 1) : undefined,
      notifyDigest: (self || isAdmin) ? (u.notifyDigest === 0 ? 0 : 1) : undefined,
      // Telefon dogrulama durumu: kendisi ve admin gorur. Karsi tarafa
      // "dogrulanmis uye" bilgisi guven sinyali olarak da gosterilebilir.
      phoneVerified: u.phoneVerified ? 1 : 0,
      phoneVerifiedAt: (self || isAdmin) ? (u.phoneVerifiedAt || "") : undefined,
      // Kayit formu 2. adim beyanlari + e-posta dogrulama suresi: kendisi ve admin gorur.
      monthlyIncome: (self || isAdmin) ? (u.monthlyIncome || "") : undefined,
      occupationGroup: (self || isAdmin) ? (u.occupationGroup || "") : undefined,
      emailVerifyDeadline: (self || isAdmin) ? (u.emailVerifyDeadline || "") : undefined
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
  const propertiesArr = conv(all("properties"), boolFields.properties);

  return {
    currentRole: user ? (user.role === "BUYER" ? "buyer" : user.role === "ADMIN" ? "admin" : "seller") : "buyer",
    // smsVerification: SMS saglayicisi bagli mi? Istemci bu bayrak acikken
    // dogrulama ekranina yonlendirir; kapaliyken ozellik uykudadir.
    config: { paymentsLive: paymentsAreLive(), googleAuth: GOOGLE.enabled, smsVerification: smsEnabled(), emailVerifyHours: EPOSTA_SURE_SAAT },
    auth: { currentUserId: user ? user.id : null, lastLoginAt: null },
    counters: { user: 100, demand: 100, property: 100, offer: 100, match: 100, message: 100, notification: 100, complaint: 100, audit: 100, doc: 100, abuse: 100, email: 100 },
    // Gizlilik: misafir (giris yapmamis) istekte kisisel/ters-pazar verisi donmez.
    // Kullanici listesi, alici butce profilleri, talepler ve ham ilan kayitlari
    // yalnizca giris yapmis kullaniciya doner. Public ilan bocesi /properties/search
    // endpoint'inden (maskeli) beslenir; ana sayfa vitrin sayaci stats'tan gelir.
    users: user ? users : [],
    authAccounts: [],
    buyerProfiles: user ? buyerProfiles : {},
    plans,
    demands: user ? demandsArr : [],
    properties: user ? propertiesArr : [],
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
    // Telefon dogrulama kayitlari yalnizca admin panelinde gorunur.
    // TEST MODUNDA kod burada gorunur ki hesap acilmadan akis denenebilsin;
    // gercek gonderimde testCode NULL kalir.
    phoneCodes: isAdmin ? db.prepare("SELECT id,userId,phone,attempts,sentAt,expiresAt,usedAt,testCode,mode FROM phone_verifications ORDER BY sentAt DESC LIMIT 50").all() : [],
    smsConfig: isAdmin ? { enabled: smsEnabled(), durum: smsDurumu() } : undefined,
    complaints: [],
    abuseSignals: [],
    auditLogs: isAdmin ? all("audit_logs") : [],
    payments: myPayments,
    entitlements: isAdmin ? all("entitlements") : (user ? all("entitlements").filter((e) => e.userId === user.id) : []),
    // Ana sayfa vitrin sayaclari (kisisel veri degil, sadece toplam adet).
    // Yalnizca yayinda olan kayitlar sayilir; kaldirilan/pasif olanlar vitrine yansimaz.
    stats: {
      demands: demandsArr.filter((d) => (d.status || "ACTIVE") === "ACTIVE").length,
      offers: allOffers.length,
      matches: matches.length
    }
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
    const marketingConsent = body.marketingConsent ? 1 : 0;
    // 2. adim alanlari (istege bagli beyan) — listede yoksa bos birakilir.
    const monthlyIncome = GELIR_ARALIKLARI.includes(body.monthlyIncome) ? body.monthlyIncome : "";
    const occupationGroup = MESLEK_GRUPLARI.includes(body.occupationGroup) ? body.occupationGroup : "";
    if (name.length < 3 || !email.includes("@") || phone.length < 10)
      return err(res, 400, "Ad, geçerli e-posta ve telefon gerekli.");
    if (!normalizePhone(phone)) return err(res, 400, "Geçerli bir cep telefonu numarası gir (5xx xxx xx xx).");
    const sifreHata = sifreGecerliMi(password);
    if (sifreHata) return err(res, 400, sifreHata);
    if (db.prepare("SELECT 1 FROM auth_accounts WHERE email = ?").get(email))
      return err(res, 409, "Bu e-posta ile kayıtlı bir üyelik var.");
    // SMS acikken: kayittan once telefonun dogrulanmis olmasi gerekir.
    if (smsEnabled()) {
      const p = normalizePhone(phone);
      const yarimSaat = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const dogrulanmis = db.prepare("SELECT 1 FROM phone_verifications WHERE userId IS NULL AND phone=? AND usedAt IS NOT NULL AND mode='verified' AND usedAt > ?").get(p, yarimSaat);
      if (!dogrulanmis) return err(res, 400, "Telefonunu doğrulaman gerekiyor. Kod iste ve onayla.");
    }
    // Kimlik alanlari: hesap acilmadan ONCE dogrulanir ki yarim kayit olusmasin.
    const kimlik = prepareIdentity(body, null);
    if (!kimlik.ok) return err(res, 400, kimlik.error);
    const id = uid("u");
    db.prepare("INSERT INTO users (id,role,name,email,phone,city,status,trustScore,createdAt,marketingConsent,monthlyIncome,occupationGroup,phoneVerified,phoneVerifiedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .run(id, role, name, email, phone, city, "ACTIVE", role === "BUYER" ? 54 : 50, today(), marketingConsent,
        monthlyIncome, occupationGroup, smsEnabled() ? 1 : 0, smsEnabled() ? now() : null);
    addAudit(id, "MARKETING_CONSENT", "User", id, `Ticari elektronik ileti izni: ${marketingConsent ? "EVET" : "HAYIR"}`);
    saveIdentity(id, kimlik);
    saveAttribution(id, body.attribution);
    db.prepare("INSERT INTO auth_accounts (userId,email,passwordHash,emailVerified,createdAt,lastLoginAt) VALUES (?,?,?,?,?,?)")
      .run(id, email, hashPassword(password), 0, today(), today());
    if (role === "BUYER")
      db.prepare("INSERT INTO buyer_profiles (userId,verificationLevel,badge,budgetTrustScore,profileCompletion,declaredBudgetMin,declaredBudgetMax,declaredDownPayment,declaredCashReady,declaredUsesCredit) VALUES (?,?,?,?,?,?,?,?,?,?)")
        .run(id, "Bütçe Beyanı Bekleniyor", "neutral", 35, 20, 0, 0, 0, 0, 0);
    notify(id, "WELCOME", "Üyeliğin oluşturuldu", "Panelin hazır.", "");
    queueEmail(id, "Konuttalebi'ye hoş geldin", welcomeBody(), dashboardPathForRole(role), "Yeni üyelik karşılama", "Bir sorunda bu e-postayı yanıtlaman yeterli. Yanındayız.");
    addAudit(id, "USER_REGISTERED", "User", id, `${role} üyeliği oluşturuldu.`);
    // E-posta dogrulama baglantisi: 72 saat gecerli.
    epostaDogrulamaBaslat(id, email, name);
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
    // Google ile acilmis hesaplarin sifresi yoktur; kullaniciyi dogru yola yonlendir.
    if (acc && acc.provider === "google" && !acc.passwordHash)
      return err(res, 401, "Bu hesap Google ile açılmış. Lütfen \"Google ile devam et\" ile giriş yapın.");
    if (!acc || !acc.passwordHash || !verifyPassword(body.password || "", acc.passwordHash))
      return err(res, 401, "E-posta veya şifre hatalı.");
    const u = db.prepare("SELECT * FROM users WHERE id = ?").get(acc.userId);
    if (!u || u.status !== "ACTIVE") return err(res, 403, "Bu üyelik aktif değil.");
    db.prepare("UPDATE auth_accounts SET lastLoginAt = ? WHERE userId = ?").run(today(), u.id);
    addAudit(u.id, "USER_LOGGED_IN", "User", u.id, "Giriş yapıldı.");
    const token = randomUUID();
    db.prepare("INSERT INTO sessions (token,userId,createdAt) VALUES (?,?,?)").run(token, u.id, new Date().toISOString());
    return ok(res, { userId: u.id, role: u.role }, sessionCookie(token));
  }

  // --- Google ile giris: 1) baslat (kullaniciyi Google'a yonlendir) ---
  if (seg[0] === "auth" && seg[1] === "google" && seg[2] === "start" && method === "GET") {
    if (!GOOGLE.enabled) return err(res, 503, "Google ile giriş şu anda kapalı.");
    const state = randomBytes(16).toString("hex");
    const params = new URLSearchParams({
      client_id: GOOGLE.clientId,
      redirect_uri: googleRedirectUri(),
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });
    res.writeHead(302, {
      "Location": `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      "Set-Cookie": `kt_gstate=${state}; HttpOnly; Path=/; SameSite=Lax; Max-Age=600`,
    });
    return res.end();
  }

  // --- Google ile giris: 2) donus (kod -> token -> profil) ---
  if (seg[0] === "auth" && seg[1] === "google" && seg[2] === "callback" && method === "GET") {
    if (!GOOGLE.enabled) return err(res, 503, "Google ile giriş şu anda kapalı.");
    const redirectTo = (hash, extraCookie) => {
      const headers = { "Location": `${BASE_URL}/${hash}` };
      const cookies = ["kt_gstate=; HttpOnly; Path=/; Max-Age=0"];
      if (extraCookie) cookies.push(extraCookie);
      headers["Set-Cookie"] = cookies;
      res.writeHead(302, headers);
      return res.end();
    };
    const code = url.searchParams.get("code") || "";
    const state = url.searchParams.get("state") || "";
    const cookieState = parseCookies(req.headers.cookie).kt_gstate || "";
    if (!code || !state || state !== cookieState) return redirectTo("#/giris?google=hata");
    let profile = null;
    try {
      const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code, client_id: GOOGLE.clientId, client_secret: GOOGLE.clientSecret,
          redirect_uri: googleRedirectUri(), grant_type: "authorization_code",
        }).toString(),
      });
      const tokens = await tokenResp.json();
      if (!tokenResp.ok || !tokens.access_token) throw new Error(tokens.error_description || "token alinamadi");
      const infoResp = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { "Authorization": `Bearer ${tokens.access_token}` },
      });
      const info = await infoResp.json();
      if (!infoResp.ok || !info.email) throw new Error("profil alinamadi");
      profile = { email: String(info.email).trim().toLowerCase(), name: (info.name || "").trim(), verified: info.email_verified !== false };
    } catch (e) {
      console.error("[google] giris hatasi:", e.message);
      return redirectTo("#/giris?google=hata");
    }
    if (!profile.verified) return redirectTo("#/giris?google=dogrulanmamis");
    // Mevcut uye mi? -> dogrudan giris
    const acc = db.prepare("SELECT * FROM auth_accounts WHERE email = ?").get(profile.email);
    if (acc) {
      const u = db.prepare("SELECT * FROM users WHERE id = ?").get(acc.userId);
      if (!u || u.status !== "ACTIVE") return redirectTo("#/giris?google=pasif");
      db.prepare("UPDATE auth_accounts SET lastLoginAt = ? WHERE userId = ?").run(today(), u.id);
      addAudit(u.id, "USER_LOGGED_IN", "User", u.id, "Google ile giriş");
      const token = randomUUID();
      db.prepare("INSERT INTO sessions (token,userId,createdAt) VALUES (?,?,?)").run(token, u.id, new Date().toISOString());
      const dash = u.role === "BUYER" ? "dashboard/alici" : u.role === "ADMIN" ? "dashboard/admin" : "dashboard/satici";
      return redirectTo(`#/${dash}`, `kt_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`);
    }
    // Yeni kullanici -> kisa tamamlama ekranina (imzali bekleyen profil cerezi, 30 dk)
    const pending = signPayload({ email: profile.email, name: profile.name, exp: Date.now() + 30 * 60 * 1000 });
    return redirectTo("#/google-tamamla", `kt_gpending=${pending}; HttpOnly; Path=/; SameSite=Lax; Max-Age=1800`);
  }

  // --- Google ile giris: 3) bekleyen profili oku (tamamlama ekrani icin) ---
  if (seg[0] === "auth" && seg[1] === "google" && seg[2] === "pending" && method === "GET") {
    const p = verifyPayload(parseCookies(req.headers.cookie).kt_gpending || "");
    if (!p || !p.email || (p.exp && p.exp < Date.now())) return err(res, 404, "Bekleyen Google kaydı yok.");
    return ok(res, { email: p.email, name: p.name || "" });
  }

  // --- Google ile giris: 4) tamamla (rol + telefon + sehir ile hesabi ac) ---
  if (seg[0] === "auth" && seg[1] === "google" && seg[2] === "complete" && method === "POST") {
    const p = verifyPayload(parseCookies(req.headers.cookie).kt_gpending || "");
    if (!p || !p.email || (p.exp && p.exp < Date.now())) return err(res, 400, "Google oturumu zaman aşımına uğradı. Tekrar deneyin.");
    const email = String(p.email).trim().toLowerCase();
    const name = ((body.name || p.name || "").trim()) || email.split("@")[0];
    const phone = (body.phone || "").trim();
    const city = (body.city || "").trim() || "İstanbul";
    const role = ["BUYER", "SELLER", "AGENT"].includes(body.role) ? body.role : "BUYER";
    const marketingConsent = body.marketingConsent ? 1 : 0;
    if (name.length < 3 || phone.length < 10) return err(res, 400, "Ad ve geçerli telefon gerekli.");
    if (db.prepare("SELECT 1 FROM auth_accounts WHERE email = ?").get(email))
      return err(res, 409, "Bu e-posta ile kayıtlı bir üyelik var. Lütfen giriş yapın.");
    const kimlik = prepareIdentity(body, null);
    if (!kimlik.ok) return err(res, 400, kimlik.error);
    const id = uid("u");
    db.prepare("INSERT INTO users (id,role,name,email,phone,city,status,trustScore,createdAt,marketingConsent) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .run(id, role, name, email, phone, city, "ACTIVE", role === "BUYER" ? 54 : 50, today(), marketingConsent);
    addAudit(id, "MARKETING_CONSENT", "User", id, `Ticari elektronik ileti izni: ${marketingConsent ? "EVET" : "HAYIR"}`);
    saveIdentity(id, kimlik);
    saveAttribution(id, body.attribution);
    // Sifre yok: saglayici Google. E-posta Google tarafindan dogrulanmis kabul edilir.
    db.prepare("INSERT INTO auth_accounts (userId,email,passwordHash,emailVerified,createdAt,lastLoginAt,provider) VALUES (?,?,?,?,?,?,?)")
      .run(id, email, "", 1, today(), today(), "google");
    if (role === "BUYER")
      db.prepare("INSERT INTO buyer_profiles (userId,verificationLevel,badge,budgetTrustScore,profileCompletion,declaredBudgetMin,declaredBudgetMax,declaredDownPayment,declaredCashReady,declaredUsesCredit) VALUES (?,?,?,?,?,?,?,?,?,?)")
        .run(id, "Bütçe Beyanı Bekleniyor", "neutral", 35, 20, 0, 0, 0, 0, 0);
    notify(id, "WELCOME", "Üyeliğin oluşturuldu", "Panelin hazır.", "");
    queueEmail(id, "Konuttalebi'ye hoş geldin", welcomeBody(), dashboardPathForRole(role), "Yeni üyelik karşılama", "Bir sorunda bu e-postayı yanıtlaman yeterli. Yanındayız.");
    addAudit(id, "USER_REGISTERED", "User", id, `${role} üyeliği Google ile oluşturuldu.`);
    const token = randomUUID();
    db.prepare("INSERT INTO sessions (token,userId,createdAt) VALUES (?,?,?)").run(token, id, new Date().toISOString());
    return ok(res, { userId: id, role }, {
      "Set-Cookie": [`kt_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`, "kt_gpending=; HttpOnly; Path=/; Max-Age=0"],
    });
  }

  // --- sifre: sifirlama talebi (herkese acik) ---
  if (seg[0] === "password" && seg[1] === "forgot" && method === "POST") {
    if (!rateLimit(`pwforgot:${clientIp(req)}`, 5, 15 * 60 * 1000))
      return err(res, 429, "Çok fazla deneme. Lütfen biraz sonra tekrar deneyin.");
    const email = norm(body.email);
    // Guvenlik: e-posta kayitli olsun olmasin AYNI notr yanit doner (kullanici sayimini engeller).
    const neutral = { message: "Eğer bu e-posta kayıtlıysa, şifre sıfırlama bağlantısı gönderildi. Gelen kutunu kontrol et." };
    const accRaw = email.includes("@") ? db.prepare("SELECT * FROM auth_accounts WHERE email = ?").get(email) : null;
    // Google ile acilmis hesaplarda sifre yok; sifirlama maili gondermek anlamsiz olur.
    const acc = (accRaw && accRaw.provider === "google" && !accRaw.passwordHash) ? null : accRaw;
    if (acc) {
      const u = db.prepare("SELECT id,name,email,status FROM users WHERE id = ?").get(acc.userId);
      if (u && u.status === "ACTIVE") {
        db.prepare("DELETE FROM password_resets WHERE userId = ? AND usedAt IS NULL").run(u.id);
        const rawToken = randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 saat gecerli
        db.prepare("INSERT INTO password_resets (tokenHash,userId,expiresAt,usedAt,createdAt) VALUES (?,?,?,?,?)")
          .run(sha256hex(rawToken), u.id, expiresAt, null, new Date().toISOString());
        const link = `${APP_URL()}/#/sifre-sifirla?token=${rawToken}`;
        const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#10243a">
          <h2 style="margin:0 0 12px">Şifre sıfırlama</h2>
          <p>Merhaba ${escapeHtmlSrv(u.name || "")},</p>
          <p>Konuttalebi hesabının şifresini sıfırlamak için aşağıdaki butona tıkla. Bağlantı <b>1 saat</b> geçerlidir ve yalnızca bir kez kullanılabilir.</p>
          <p style="margin:22px 0"><a href="${link}" style="display:inline-block;background:#c8a24b;color:#10243a;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Şifremi sıfırla</a></p>
          <p style="color:#5a6b7c;font-size:13px">Buton çalışmazsa bu bağlantıyı tarayıcına yapıştır:<br>${link}</p>
          <p style="color:#5a6b7c;font-size:13px">Bu talebi sen yapmadıysan bu e-postayı yok sayabilirsin; şifren değişmez.</p>
          <p style="color:#5a6b7c;font-size:13px;border-top:1px solid #e5eaf0;padding-top:12px;margin-top:18px">Sorun yaşarsan bu e-postayı yanıtlayabilir ya da <a href="mailto:${escapeHtmlSrv(MAIL_REPLY_TO())}" style="color:#10243a">${escapeHtmlSrv(MAIL_REPLY_TO())}</a> adresine yazabilirsin.</p>
        </div>`;
        addAudit(u.id, "PASSWORD_RESET_REQUESTED", "User", u.id, "Şifre sıfırlama talebi");
        await deliverEmail(u.id, u.email, u.name, "Konuttalebi — şifre sıfırlama", html, "Şifre sıfırlama");
      }
    }
    return ok(res, neutral);
  }

  // --- sifre: yeni sifre belirleme (token ile, herkese acik) ---
  if (seg[0] === "password" && seg[1] === "reset" && method === "POST") {
    if (!rateLimit(`pwreset:${clientIp(req)}`, 10, 15 * 60 * 1000))
      return err(res, 429, "Çok fazla deneme. Lütfen biraz sonra tekrar deneyin.");
    const rawToken = (body.token || "").trim();
    const password = body.password || "";
    if (!rawToken) return err(res, 400, "Geçersiz bağlantı.");
    if (password.length < 6) return err(res, 400, "Şifre en az 6 karakter olmalı.");
    const row = db.prepare("SELECT * FROM password_resets WHERE tokenHash = ?").get(sha256hex(rawToken));
    if (!row || row.usedAt || new Date(row.expiresAt).getTime() < Date.now())
      return err(res, 400, "Bağlantı geçersiz veya süresi dolmuş. Lütfen yeniden şifre sıfırlama isteyin.");
    db.prepare("UPDATE auth_accounts SET passwordHash = ? WHERE userId = ?").run(hashPassword(password), row.userId);
    db.prepare("UPDATE password_resets SET usedAt = ? WHERE tokenHash = ?").run(new Date().toISOString(), row.tokenHash);
    db.prepare("DELETE FROM sessions WHERE userId = ?").run(row.userId); // guvenlik: tum oturumlari kapat
    addAudit(row.userId, "PASSWORD_RESET_DONE", "User", row.userId, "Şifre sıfırlandı");
    return ok(res, { message: "Şifren güncellendi. Yeni şifrenle giriş yapabilirsin." });
  }

  // --- cikis ---
  if (seg[0] === "logout" && method === "POST") {
    const token = parseCookies(req.headers.cookie).kt_session;
    if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return ok(res, {}, { "Set-Cookie": "kt_session=; HttpOnly; Path=/; Max-Age=0" });
  }

  // --- PayTR bildirim/callback (sunucu-sunucu; oturum yok, imza dogrulanir) ---
  if (seg[0] === "payments" && seg[1] === "paytr" && seg[2] === "callback" && method === "POST") {
    let parsed;
    try { parsed = paymentProvider().parseCallback(body); }
    catch { res.writeHead(200, { "Content-Type": "text/plain" }); return res.end("OK"); }
    if (!parsed.hashValid) { res.writeHead(400, { "Content-Type": "text/plain" }); return res.end("PAYTR hash gecersiz"); }
    if (parsed.approved) fulfillPayment(parsed.orderId);
    else if (parsed.orderId) db.prepare("UPDATE payments SET status='FAILED' WHERE id=?").run(parsed.orderId);
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("OK");
  }

  // --- konum verisi (il/ilce/mahalle) — herkese açık, kademeli dropdown için ---
  if (seg[0] === "locations" && method === "GET") {
    if (seg[1] === "iller") return ok(res, { iller: TR_CITIES });
    if (seg[1] === "ilceler") {
      const code = trCode(url.searchParams.get("il"));
      return ok(res, { ilceler: (TR_DISTRICTS[code] || []).slice().sort((a, b) => a.localeCompare(b, "tr")) });
    }
    if (seg[1] === "mahalleler") {
      const code = trCode(url.searchParams.get("il"));
      const ilce = url.searchParams.get("ilce") || "";
      const list = (TR_NEIGHBOURHOODS[code] && TR_NEIGHBOURHOODS[code][ilce]) || [];
      return ok(res, { mahalleler: list.slice().sort((a, b) => a.localeCompare(b, "tr")) });
    }
    return ok(res, {});
  }

  // --- ilan arama (HERKESE AÇIK): il/ilce/mahalle + kategori + fiyat filtreli, iletisim gizli ---
  // Giris gerekmez; ilanlar maskeli doner (satici kimligi/iletisim yok, aciklama maskeli).
  if (seg[0] === "properties" && seg[1] === "search" && method === "GET") {
    const q = url.searchParams;
    const tx = q.get("tx") === "RENT" ? "RENT" : (q.get("tx") === "SALE" ? "SALE" : "");
    const mainCategory = q.get("mainCategory") || "";
    const subCategory = q.get("subCategory") || "";
    const city = q.get("city") || "";
    const district = q.get("district") || "";
    const neighborhood = q.get("neighborhood") || "";
    const rooms = q.get("rooms") || "";
    const minPrice = +q.get("minPrice") || 0;
    const maxPrice = +q.get("maxPrice") || 0;
    let rows = db.prepare("SELECT * FROM properties WHERE status='ACTIVE'").all();
    rows = rows.filter((p) => {
      if (tx && (p.transactionType || "SALE") !== tx) return false;
      if (mainCategory && (p.mainCategory || "Konut") !== mainCategory) return false;
      if (subCategory && p.propertyType !== subCategory) return false;
      if (city && p.city !== city) return false;
      if (district && (p.district || "") !== district) return false;
      if (neighborhood && (p.neighborhood || "") !== neighborhood) return false;
      if (rooms && (p.roomCount || "") !== rooms) return false;
      if (minPrice && (+p.price || 0) < minPrice) return false;
      if (maxPrice && (+p.price || 0) > maxPrice) return false;
      return true;
    });
    const boosted = (p) => p.boostedUntil && p.boostedUntil >= today();
    rows.sort((a, b) => (Number(boosted(b)) - Number(boosted(a))) || String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    const items = rows.slice(0, 80).map((p) => ({
      id: p.id, title: p.title, city: p.city, district: p.district, neighborhood: p.neighborhood,
      mainCategory: p.mainCategory || "Konut", propertyType: p.propertyType, roomCount: p.roomCount,
      netSqm: p.netSqm, grossSqm: p.grossSqm, price: p.price, transactionType: p.transactionType || "SALE",
      heatingType: p.heatingType, buildingAge: p.buildingAge, floor: p.floor, dues: p.dues,
      interiorFeatures: p.interiorFeatures, exteriorFeatures: p.exteriorFeatures,
      photoClass: p.photoClass, boostedUntil: p.boostedUntil,
      description: maskSensitiveInfo(p.description || "").maskedText, createdAt: p.createdAt
    }));
    return ok(res, { items });
  }

  // --- herkese acik TALEP aramasi (ters pazar vitrini) ---
  // Kimlik donmez: buyerId, ad, telefon, e-posta yok. Serbest metindeki kacak
  // iletisim bilgileri maskelenir. Iletisim yalnizca eslesme + uyelikle acilir.
  if (seg[0] === "demands" && seg[1] === "search" && method === "GET") {
    const q = url.searchParams;
    const tx = q.get("tx") === "RENT" ? "RENT" : (q.get("tx") === "SALE" ? "SALE" : "");
    const mainCategory = q.get("mainCategory") || "";
    const subCategory = q.get("subCategory") || "";
    const city = q.get("city") || "";
    const district = q.get("district") || "";
    const rooms = q.get("rooms") || "";
    const minPrice = +q.get("minPrice") || 0;
    const maxPrice = +q.get("maxPrice") || 0;
    let rows = db.prepare("SELECT * FROM demands WHERE status='ACTIVE'").all();
    rows = rows.filter((d) => {
      if (tx && (d.transactionType || "SALE") !== tx) return false;
      if (mainCategory && (d.mainCategory || "Konut") !== mainCategory) return false;
      if (subCategory && d.propertyType !== subCategory) return false;
      if (city && d.city !== city) return false;
      if (district && (d.district || "") !== district) return false;
      if (rooms && (d.roomCount || "") !== rooms) return false;
      // Butce araligi kesisiyor mu?
      if (minPrice && (+d.maxBudget || 0) < minPrice) return false;
      if (maxPrice && (+d.minBudget || 0) > maxPrice) return false;
      return true;
    });
    const boosted = (d) => d.boostedUntil && d.boostedUntil >= today();
    rows.sort((a, b) => (Number(boosted(b)) - Number(boosted(a))) || String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    const items = rows.slice(0, 80).map((d) => ({
      id: d.id, title: d.title, city: d.city, district: d.district, neighborhood: d.neighborhood,
      mainCategory: d.mainCategory || "Konut", propertyType: d.propertyType, roomCount: d.roomCount,
      minSqm: d.minSqm, maxSqm: d.maxSqm, minBudget: d.minBudget, maxBudget: d.maxBudget,
      transactionType: d.transactionType || "SALE", purchaseTimeline: d.purchaseTimeline,
      heatingType: d.heatingType, buildingAge: d.buildingAge, floorPref: d.floorPref,
      interiorFeatures: d.interiorFeatures, exteriorFeatures: d.exteriorFeatures,
      usesCredit: d.usesCredit, cashReady: d.cashReady, offerCount: d.offerCount,
      boostedUntil: d.boostedUntil, createdAt: d.createdAt,
      description: maskSensitiveInfo(d.description || "").maskedText
    }));
    return ok(res, { items });
  }

  // --- KAYIT FORMU: telefon dogrulama (giris gerektirmez) ---
  // Hesap acilmadan once telefonu dogrularz; kayit sirasinda bu kayda bakilir.
  if (seg[0] === "kayit" && seg[1] === "telefon-kod" && method === "POST") {
    if (!smsEnabled()) return err(res, 503, "SMS doğrulama şu anda kapalı.");
    const p = normalizePhone(body.phone);
    if (!p) return err(res, 400, "Geçerli bir cep telefonu numarası gir (5xx xxx xx xx).");
    if (db.prepare("SELECT 1 FROM users WHERE phone LIKE ? AND phoneVerified=1").get(`%${p}`))
      return err(res, 409, "Bu numara başka bir üyelikte kayıtlı.");
    if (!rateLimit(`kayit-otp:${p}`, 1, 60 * 1000)) return err(res, 429, "Yeni kod için 1 dakika bekle.");
    if (!rateLimit(`kayit-otp-gun:${p}`, 5, 24 * 3600 * 1000)) return err(res, 429, "Bu numara için günlük kod sınırına ulaşıldı.");
    if (!rateLimit(`kayit-otp-ip:${clientIp(req)}`, 10, 3600 * 1000)) return err(res, 429, "Çok fazla deneme. Bir süre sonra tekrar dene.");
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + KOD_GECERLILIK_DK * 60 * 1000).toISOString();
    db.prepare("UPDATE phone_verifications SET usedAt=? WHERE userId IS NULL AND phone=? AND usedAt IS NULL").run(now(), p);
    const sonuc = await sendSms(p, verificationMessage(code));
    if (!sonuc.ok) return err(res, 502, sonuc.error || "SMS gönderilemedi.");
    db.prepare("INSERT INTO phone_verifications (id,userId,phone,codeHash,attempts,sentAt,expiresAt,usedAt,testCode,mode) VALUES (?,NULL,?,?,0,?,?,NULL,?,?)")
      .run(uid("otp"), p, hashCode(code), now(), expires, sonuc.mode === "test" ? code : null, "kayit");
    return ok(res, { sent: true, phoneMasked: maskPhone(p), testMode: sonuc.mode === "test" });
  }

  if (seg[0] === "kayit" && seg[1] === "telefon-dogrula" && method === "POST") {
    if (!smsEnabled()) return err(res, 503, "SMS doğrulama şu anda kapalı.");
    const p = normalizePhone(body.phone);
    const code = String(body.code || "").replace(/\D/g, "");
    if (!p || code.length !== 6) return err(res, 400, "Telefon ve 6 haneli kod gerekli.");
    const kayit = db.prepare("SELECT * FROM phone_verifications WHERE userId IS NULL AND phone=? AND usedAt IS NULL ORDER BY sentAt DESC LIMIT 1").get(p);
    if (!kayit) return err(res, 400, "Önce kod iste.");
    if (new Date(kayit.expiresAt) < new Date()) return err(res, 400, "Kodun süresi doldu. Yeni kod iste.");
    if (kayit.attempts >= KOD_MAX_DENEME) {
      db.prepare("UPDATE phone_verifications SET usedAt=? WHERE id=?").run(now(), kayit.id);
      return err(res, 429, "Çok fazla hatalı deneme. Yeni kod iste.");
    }
    if (hashCode(code) !== kayit.codeHash) {
      db.prepare("UPDATE phone_verifications SET attempts=attempts+1 WHERE id=?").run(kayit.id);
      const kalan = KOD_MAX_DENEME - (kayit.attempts + 1);
      return err(res, 400, kalan > 0 ? `Kod hatalı. ${kalan} deneme hakkın kaldı.` : "Kod hatalı. Yeni kod iste.");
    }
    // mode='verified' isareti kayit ucunun aradigi kanit.
    db.prepare("UPDATE phone_verifications SET usedAt=?, mode='verified' WHERE id=?").run(now(), kayit.id);
    return ok(res, { verified: true });
  }

  // --- e-posta dogrulama baglantisi (giris gerektirmez) ---
  if (seg[0] === "eposta" && seg[1] === "dogrula" && method === "GET") {
    const t = url.searchParams.get("t") || "";
    const tokenHash = createHash("sha256").update(t).digest("hex");
    const kayit = t ? db.prepare("SELECT * FROM email_verifications WHERE tokenHash=?").get(tokenHash) : null;
    const suresiDolmus = kayit && new Date(kayit.expiresAt) < new Date();
    const gecerli = Boolean(kayit) && !kayit.usedAt && !suresiDolmus;
    if (gecerli) {
      db.prepare("UPDATE email_verifications SET usedAt=? WHERE tokenHash=?").run(now(), tokenHash);
      db.prepare("UPDATE auth_accounts SET emailVerified=1 WHERE userId=?").run(kayit.userId);
      addAudit(kayit.userId, "EMAIL_VERIFIED", "User", kayit.userId, kayit.email || "");
      notify(kayit.userId, "EMAIL_VERIFIED", "E-postan doğrulandı", "Üyeliğin tamamlandı.", "");
    }
    const govde = gecerli
      ? `<h1>E-postan doğrulandı</h1><p>Üyeliğin tamamlandı. Panelinden devam edebilirsin.</p>`
      : kayit && kayit.usedAt
        ? `<h1>Zaten doğrulanmış</h1><p>Bu bağlantı daha önce kullanılmış. Giriş yapabilirsin.</p>`
        : suresiDolmus
          ? `<h1>Bağlantının süresi doldu</h1><p>Doğrulama bağlantısı ${EPOSTA_SURE_SAAT} saat geçerlidir.</p>
             <p class="small">Giriş yapıp panelindeki uyarıdan yeni bağlantı isteyebilirsin.</p>`
          : `<h1>Bağlantı geçersiz</h1><p>Bu bağlantı tanınmadı.</p>`;
    const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Konuttalebi | E-posta doğrulama</title>
<meta name="robots" content="noindex"><link rel="icon" href="/favicon.ico" sizes="any">
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#10243a;color:#f4f7fb;
font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;padding:24px}
.box{max-width:520px;text-align:center}h1{font-size:24px;margin:0 0 12px}p{line-height:1.65;color:#cdd8e4;margin:0 0 12px}
.small{font-size:13.5px;color:#9fb0c3}a.btn{display:inline-block;margin-top:14px;background:#d6a94a;color:#10243a;
text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px}</style></head>
<body><div class="box">${govde}<a class="btn" href="${BASE_URL}/#/giris">Giriş yap</a></div></body></html>`;
    res.writeHead(gecerli || kayit ? 200 : 400, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(html);
  }

  // --- abonelikten cikma: giris gerektirmez, imzali baglanti ile calisir ---
  // GET: kullanici e-postadaki baglantiya tiklar, onay sayfasi doner.
  // POST: posta kutusunun "One-Click" butonu; govdesiz cagirir, kisa yanit doner.
  if (seg[0] === "bildirim" && seg[1] === "birak" && (method === "GET" || method === "POST")) {
    const uId = url.searchParams.get("u") || "";
    const t = url.searchParams.get("t") || "";
    const gecerli = uId && t && t === unsubToken(uId);
    if (gecerli) {
      db.prepare("UPDATE users SET notifyMatch=0, notifyDigest=0, unsubscribedAt=? WHERE id=?").run(now(), uId);
      addAudit(uId, "EMAIL_UNSUBSCRIBED", "User", uId, "E-posta bildirimleri kapatıldı (bağlantıyla).");
    }
    if (method === "POST") {
      res.writeHead(gecerli ? 200 : 400, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end(gecerli ? "ok" : "gecersiz baglanti");
    }
    const govde = gecerli
      ? `<h1>Bildirimler kapatıldı</h1>
         <p>Bundan sonra eşleşme ve özet e-postaları göndermeyeceğiz.</p>
         <p class="small">Şifre sıfırlama, ödeme ve hesap güvenliğiyle ilgili e-postalar göndermeye devam ederiz; bunlar üyeliğin işleyişi için zorunludur.</p>
         <p class="small">Fikrini değiştirirsen panelindeki <strong>Bildirim tercihleri</strong> ekranından tekrar açabilirsin.</p>`
      : `<h1>Bağlantı geçersiz</h1>
         <p>Bu bağlantı geçersiz veya süresi dolmuş görünüyor.</p>
         <p class="small">Bildirimleri panelindeki <strong>Bildirim tercihleri</strong> ekranından kapatabilirsin.</p>`;
    const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Konuttalebi | Bildirim tercihi</title>
<meta name="robots" content="noindex"><link rel="icon" href="/favicon.ico" sizes="any">
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#10243a;color:#f4f7fb;
font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;padding:24px}
.box{max-width:520px;text-align:center}h1{font-size:24px;margin:0 0 12px}p{line-height:1.65;color:#cdd8e4;margin:0 0 12px}
.small{font-size:13.5px;color:#9fb0c3}a.btn{display:inline-block;margin-top:14px;background:#d6a94a;color:#10243a;
text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px}</style></head>
<body><div class="box">${govde}<a class="btn" href="${BASE_URL}/">Konuttalebi'ye dön</a></div></body></html>`;
    res.writeHead(gecerli ? 200 : 400, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(html);
  }

  if (!user) return err(res, 401, "Giriş gerekli.");

  // --- telefon dogrulama: kod gonder ---
  if (seg[0] === "phone" && seg[1] === "send-code" && method === "POST") {
    if (phoneVerified(user.id)) return ok(res, { alreadyVerified: true });
    // Kullanici numarasini duzeltebilsin (kayitta yanlis yazmis olabilir).
    const istenen = body.phone ? normalizePhone(body.phone) : null;
    const mevcut = db.prepare("SELECT phone FROM users WHERE id=?").get(user.id);
    const p = istenen || normalizePhone(mevcut && mevcut.phone);
    if (!p) return err(res, 400, "Geçerli bir cep telefonu numarası gir (5xx xxx xx xx).");
    // Ayni numara baska bir dogrulanmis hesapta kullanilamaz.
    const baskasinda = db.prepare("SELECT id FROM users WHERE phone LIKE ? AND phoneVerified=1 AND id<>?").get(`%${p}`, user.id);
    if (baskasinda) return err(res, 409, "Bu numara başka bir üyelikte doğrulanmış.");
    // Hiz sinirlari: kullanici basina 60 sn'de 1, gunde 5; IP basina saatte 10.
    if (!rateLimit(`otp-user:${user.id}`, 1, 60 * 1000))
      return err(res, 429, "Yeni kod için 1 dakika bekle.");
    if (!rateLimit(`otp-user-day:${user.id}`, 5, 24 * 3600 * 1000))
      return err(res, 429, "Günlük kod sınırına ulaştın. Yarın tekrar dene veya destekle iletişime geç.");
    if (!rateLimit(`otp-ip:${clientIp(req)}`, 10, 3600 * 1000))
      return err(res, 429, "Çok fazla deneme. Bir süre sonra tekrar dene.");

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const now2 = new Date();
    const expires = new Date(now2.getTime() + KOD_GECERLILIK_DK * 60 * 1000).toISOString();
    // Bekleyen eski kodlari gecersiz kil.
    db.prepare("UPDATE phone_verifications SET usedAt=? WHERE userId=? AND usedAt IS NULL").run(now(), user.id);
    const sonuc = await sendSms(p, verificationMessage(code));
    if (!sonuc.ok) return err(res, 502, sonuc.error || "SMS gönderilemedi.");
    db.prepare("INSERT INTO phone_verifications (id,userId,phone,codeHash,attempts,sentAt,expiresAt,usedAt,testCode,mode) VALUES (?,?,?,?,?,?,?,NULL,?,?)")
      .run(uid("otp"), user.id, p, hashCode(code), 0, now2.toISOString(), expires,
        sonuc.mode === "test" ? code : null, sonuc.mode || "live");
    // Kullanici numarasini duzelttiyse profiline de yaz.
    if (istenen && (!mevcut || normalizePhone(mevcut.phone) !== istenen))
      db.prepare("UPDATE users SET phone=? WHERE id=?").run("0" + p, user.id);
    addAudit(user.id, "PHONE_CODE_SENT", "User", user.id, `${maskPhone(p)} · ${sonuc.mode === "test" ? "TEST MODU" : "SMS"}`);
    return ok(res, { sent: true, phoneMasked: maskPhone(p), testMode: sonuc.mode === "test", expiresInSec: KOD_GECERLILIK_DK * 60 });
  }

  // --- telefon dogrulama: kodu dogrula ---
  if (seg[0] === "phone" && seg[1] === "verify" && method === "POST") {
    if (phoneVerified(user.id)) return ok(res, { alreadyVerified: true });
    const code = String(body.code || "").replace(/\D/g, "");
    if (code.length !== 6) return err(res, 400, "6 haneli kodu gir.");
    const kayit = db.prepare("SELECT * FROM phone_verifications WHERE userId=? AND usedAt IS NULL ORDER BY sentAt DESC LIMIT 1").get(user.id);
    if (!kayit) return err(res, 400, "Önce kod iste.");
    if (new Date(kayit.expiresAt) < new Date()) return err(res, 400, "Kodun süresi doldu. Yeni kod iste.");
    if (kayit.attempts >= KOD_MAX_DENEME) {
      db.prepare("UPDATE phone_verifications SET usedAt=? WHERE id=?").run(now(), kayit.id);
      return err(res, 429, "Çok fazla hatalı deneme. Yeni kod iste.");
    }
    if (hashCode(code) !== kayit.codeHash) {
      db.prepare("UPDATE phone_verifications SET attempts=attempts+1 WHERE id=?").run(kayit.id);
      const kalan = KOD_MAX_DENEME - (kayit.attempts + 1);
      return err(res, 400, kalan > 0 ? `Kod hatalı. ${kalan} deneme hakkın kaldı.` : "Kod hatalı. Yeni kod iste.");
    }
    db.prepare("UPDATE phone_verifications SET usedAt=? WHERE id=?").run(now(), kayit.id);
    db.prepare("UPDATE users SET phoneVerified=1, phoneVerifiedAt=?, phone=? WHERE id=?").run(now(), "0" + kayit.phone, user.id);
    addAudit(user.id, "PHONE_VERIFIED", "User", user.id, maskPhone(kayit.phone));
    notify(user.id, "PHONE_VERIFIED", "Telefonun doğrulandı", "Artık talep oluşturabilir ve teklif gönderebilirsin.", "");
    return ok(res, { verified: true });
  }

  // --- admin: e-posta hatirlatma taramasini elle calistir ---
  if (seg[0] === "admin" && seg[1] === "eposta-hatirlat" && method === "POST") {
    if (user.role !== "ADMIN") return err(res, 403, "Bu işlem için yetkiniz yok.");
    const n = await epostaHatirlatmaTara();
    addAudit(user.id, "ADMIN_EMAIL_REMINDER_RUN", "User", user.id, `${n} kişiye hatırlatma gönderildi.`);
    return ok(res, { sent: n });
  }

  // --- e-posta dogrulama baglantisini tekrar gonder (giris gerekli) ---
  if (seg[0] === "eposta" && seg[1] === "tekrar-gonder" && method === "POST") {
    const acc = db.prepare("SELECT emailVerified FROM auth_accounts WHERE userId=?").get(user.id);
    if (acc && acc.emailVerified) return ok(res, { alreadyVerified: true });
    if (!rateLimit(`eposta-dogrula:${user.id}`, 3, 3600 * 1000))
      return err(res, 429, "Saatte en fazla 3 doğrulama bağlantısı gönderilebilir.");
    const u = db.prepare("SELECT name,email FROM users WHERE id=?").get(user.id);
    if (!u || !u.email) return err(res, 400, "E-posta adresi bulunamadı.");
    const bitis = epostaDogrulamaBaslat(user.id, u.email, u.name);
    addAudit(user.id, "EMAIL_VERIFY_RESENT", "User", user.id, u.email);
    return ok(res, { sent: true, expiresAt: bitis });
  }

  // --- bildirim tercihleri (giris gerekli) ---
  if (seg[0] === "bildirim" && seg[1] === "tercihler" && method === "PATCH") {
    const match = body.notifyMatch ? 1 : 0;
    const digest = body.notifyDigest ? 1 : 0;
    db.prepare("UPDATE users SET notifyMatch=?, notifyDigest=?, unsubscribedAt=? WHERE id=?")
      .run(match, digest, (match || digest) ? null : now(), user.id);
    addAudit(user.id, "EMAIL_PREFS_UPDATED", "User", user.id, `eşleşme: ${match ? "açık" : "kapalı"}, özet: ${digest ? "açık" : "kapalı"}`);
    return ok(res);
  }

  // --- profil ---
  if (seg[0] === "profile" && method === "PATCH") {
    const name = (body.name || "").trim(), email = norm(body.email), phone = (body.phone || "").trim(), city = (body.city || "").trim();
    if (!name || !email.includes("@") || phone.length < 10 || !city) return err(res, 400, "Tüm alanlar gerekli.");
    const dup = db.prepare("SELECT 1 FROM auth_accounts WHERE email = ? AND userId != ?").get(email, user.id);
    if (dup) return err(res, 409, "Bu e-posta başka üyelikte kullanılıyor.");
    // Kimlik alanlari: bir kez kaydedildiyse kullanici kendisi degistiremez
    // (dogrulanmis veriyi kullanicinin serbestce degistirmesi guveni bozar).
    const mevcut = db.prepare("SELECT tcknEnc, birthDate FROM users WHERE id=?").get(user.id) || {};
    const kimlikIstegi = String(body.tckn || "").trim() || String(body.birthDate || "").trim();
    if (kimlikIstegi && (mevcut.tcknEnc || mevcut.birthDate))
      return err(res, 409, "Kimlik bilgilerin kayıtlı. Değişiklik için destek ile iletişime geç.");
    const kimlik = prepareIdentity(body, user.id);
    if (!kimlik.ok) return err(res, 400, kimlik.error);
    db.prepare("UPDATE users SET name=?,email=?,phone=?,city=? WHERE id=?").run(name, email, phone, city, user.id);
    db.prepare("UPDATE auth_accounts SET email=?, emailVerified=0 WHERE userId=?").run(email, user.id);
    saveIdentity(user.id, kimlik);
    addAudit(user.id, "PROFILE_UPDATED", "User", user.id, "Profil güncellendi.");
    return ok(res);
  }

  // --- talep olustur ---
  if (seg[0] === "demands" && method === "POST") {
    if (user.role !== "BUYER") return err(res, 403, "Sadece alıcı talep oluşturabilir.");
    // Telefon dogrulamasi: kayit sonrasi ILK islemde istenir.
    if (requirePhone(res, user)) return;
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
      depositAmount: +body.depositAmount || 0, furnished: body.furnished ? 1 : 0,
      interiorFeatures: JSON.stringify(Array.isArray(body.interiorFeatures) ? body.interiorFeatures.slice(0, 40).map((x) => String(x).slice(0, 40)) : []),
      exteriorFeatures: JSON.stringify(Array.isArray(body.exteriorFeatures) ? body.exteriorFeatures.slice(0, 40).map((x) => String(x).slice(0, 40)) : []),
      heatingType: (body.heatingType || "").toString().slice(0, 40),
      buildingAge: (body.buildingAge || "").toString().slice(0, 20),
      floorPref: (body.floorPref || "").toString().slice(0, 40),
      occupation: (body.occupation || "").toString().slice(0, 40),
      neighborhoods: JSON.stringify(Array.isArray(body.neighborhoods) ? body.neighborhoods.slice(0, 60).map((x) => String(x).slice(0, 60)) : []),
      mainCategory: MAIN_CATS.includes(body.mainCategory) ? body.mainCategory : "Konut"
    };
    if (!d.title || !d.minBudget || !d.maxBudget || d.maxBudget < d.minBudget || d.description.length < 20)
      return err(res, 400, "Başlık, geçerli bütçe ve en az 20 karakter açıklama gerekli.");
    const dImage = cleanImage(body.imageData);
    db.prepare("INSERT INTO demands (id,buyerId,title,city,district,neighborhood,propertyType,roomCount,minSqm,maxSqm,minBudget,maxBudget,downPayment,usesCredit,cashReady,exchangePossible,purchaseTimeline,description,privacyLevel,status,viewCount,offerCount,imageData,transactionType,depositAmount,furnished,interiorFeatures,exteriorFeatures,heatingType,buildingAge,floorPref,occupation,neighborhoods,mainCategory,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .run(d.id, d.buyerId, d.title, d.city, d.district, d.neighborhood, d.propertyType, d.roomCount, d.minSqm, d.maxSqm, d.minBudget, d.maxBudget, d.downPayment, d.usesCredit, d.cashReady, d.exchangePossible, d.purchaseTimeline, d.description, d.privacyLevel, "ACTIVE", 0, 0, dImage, d.transactionType, d.depositAmount, d.furnished, d.interiorFeatures, d.exteriorFeatures, d.heatingType, d.buildingAge, d.floorPref, d.occupation, d.neighborhoods, d.mainCategory, today());
    // uygun saticilara bildirim + talep sahibine karsilikli eslesme bildirimi
    const props = db.prepare("SELECT * FROM properties WHERE status='ACTIVE'").all();
    const seen = new Set();
    let matchCount = 0;
    for (const p of props) {
      const loc = locationNotifyMatch(d, p);       // "mahalle"/"ilce"/"il"/null (konum+butce)
      if (calculateMatchScore(d, p) >= 70 || loc) {
        matchCount++;
        if (!seen.has(p.sellerId)) {
          seen.add(p.sellerId);
          const where = loc ? locationLabel(p, loc) : "";
          const body = where
            ? `${d.title} talebi ${where} konumundaki ilanınıza uyuyor.`
            : `${d.title} talebi ilanınıza uyuyor.`;
          notify(p.sellerId, "NEW_MATCHABLE_DEMAND", "Yeni uygun alıcı talebi", body, "dashboard/satici/alici-talepleri");
          // Aninda mail yerine gunluk ozete: yogun donemde ayni kisiye
          // arka arkaya mail gitmesin diye.
          queueDigest(p.sellerId, "demand", "Sana uygun yeni talep", body, "dashboard/satici/alici-talepleri");
        }
      }
    }
    if (matchCount > 0) {
      notify(d.buyerId, "MATCH_FOUND", "Talebine uygun ev bulundu", `Talebine uygun ${matchCount} ilan var. İlgili ${d.transactionType === "RENT" ? "ev sahipleri" : "satıcılar"} sana teklif gönderebilir; tekliflerini takip et.`, "dashboard/alici/teklifler");
    }
    // "Talebin yayında" e-postasi: her talepte bir kez, uygun ilan sayisi
    // gercek deger olarak icine yazilir. Ayri sablon kullanir.
    const talepSahibi = db.prepare("SELECT name,email FROM users WHERE id=?").get(d.buyerId);
    if (talepSahibi && talepSahibi.email && mailIzniVar(d.buyerId, "match")) {
      const html = demandPublishedEmailHtml(talepSahibi.name, d, matchCount, d.buyerId);
      Promise.resolve()
        .then(() => deliverEmail(d.buyerId, talepSahibi.email, talepSahibi.name,
          "Konuttalebi — Talebin yayında", html, "Talep yayınlandı bildirimi", d.buyerId))
        .catch((e) => console.error("[mail] talep yayinda gonderilemedi:", e && e.message));
    }
    addAudit(user.id, "DEMAND_CREATED", "Demand", id, d.title);
    return ok(res, { id });
  }

  // --- ilan olustur ---
  if (seg[0] === "properties" && method === "POST") {
    if (!["SELLER", "AGENT"].includes(user.role)) return err(res, 403, "Sadece satıcı ilan ekleyebilir.");
    if (requirePhone(res, user)) return;
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
      depositAmount: +body.depositAmount || 0, furnished: body.furnished ? 1 : 0,
      interiorFeatures: JSON.stringify(Array.isArray(body.interiorFeatures) ? body.interiorFeatures.slice(0, 40).map((x) => String(x).slice(0, 40)) : []),
      exteriorFeatures: JSON.stringify(Array.isArray(body.exteriorFeatures) ? body.exteriorFeatures.slice(0, 40).map((x) => String(x).slice(0, 40)) : []),
      mainCategory: MAIN_CATS.includes(body.mainCategory) ? body.mainCategory : "Konut"
    };
    if (!p.title || !p.price || p.description.length < 15) return err(res, 400, "Başlık, fiyat ve en az 15 karakter açıklama gerekli.");
    const pImage = cleanImage(body.imageData);
    db.prepare("INSERT INTO properties (id,sellerId,title,city,district,neighborhood,propertyType,roomCount,grossSqm,netSqm,buildingAge,floor,totalFloors,heatingType,bathroomCount,hasBalcony,hasParking,hasElevator,inComplex,dues,occupancyStatus,deedStatus,creditEligible,exchangePossible,price,negotiable,description,status,photoClass,imageData,transactionType,depositAmount,furnished,interiorFeatures,exteriorFeatures,mainCategory,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .run(p.id, p.sellerId, p.title, p.city, p.district, p.neighborhood, p.propertyType, p.roomCount, p.grossSqm, p.netSqm, p.buildingAge, p.floor, p.totalFloors, p.heatingType, p.bathroomCount, p.hasBalcony, p.hasParking, p.hasElevator, p.inComplex, p.dues, p.occupancyStatus, p.deedStatus, p.creditEligible, p.exchangePossible, p.price, p.negotiable, p.description, "ACTIVE", p.photoClass, pImage, p.transactionType, p.depositAmount, p.furnished, p.interiorFeatures, p.exteriorFeatures, p.mainCategory, today());
    const demands = db.prepare("SELECT * FROM demands WHERE status='ACTIVE'").all();
    const seen = new Set();
    let matchCount = 0;
    for (const d of demands) {
      const loc = locationNotifyMatch(d, p);       // "mahalle"/"ilce"/"il"/null (konum+butce)
      if (calculateMatchScore(d, p) >= 70 || loc) {
        matchCount++;
        if (!seen.has(d.buyerId)) {
          seen.add(d.buyerId);
          const where = loc ? locationLabel(p, loc) : "";
          const body = where
            ? `${p.title} — ${where} konumundaki talebinize uyuyor.`
            : `${p.title} talebinize uyuyor.`;
          notify(d.buyerId, "NEW_MATCHABLE_PROPERTY", "Talebinize uygun yeni ev", body, "dashboard/alici/teklifler");
          queueDigest(d.buyerId, "property", "Talebine uygun yeni ev", body, "dashboard/alici/teklifler");
        }
      }
    }
    if (matchCount > 0) {
      notify(p.sellerId, "MATCH_FOUND", "İlanına uygun talep bulundu", `İlanına uygun ${matchCount} ${p.transactionType === "RENT" ? "kiracı" : "alıcı"} talebi var. Uygun talepleri görüp özel teklif gönderebilirsin.`, "dashboard/satici/alici-talepleri");
      queueDigest(p.sellerId, "match", "İlanına uygun talep bulundu", `İlanına uygun ${matchCount} talep bulundu; görüp teklif gönderebilirsin.`, "dashboard/satici/alici-talepleri");
    }
    addAudit(user.id, "PROPERTY_CREATED", "Property", id, p.title);
    return ok(res, { id });
  }

  // --- teklif gonder ---
  if (seg[0] === "offers" && method === "POST" && seg.length === 1) {
    if (!["SELLER", "AGENT"].includes(user.role)) return err(res, 403, "Sadece satıcı teklif gönderebilir.");
    if (requirePhone(res, user)) return;
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
    queueEmail(demand.buyerId, "Talebine yeni teklif geldi",
      [`"${demand.title}" talebine bir mülk sahibi teklif gönderdi.`,
        ilanOzeti(body.propertyId) ? `Teklif edilen konut:\n${ilanOzeti(body.propertyId)}` : "",
        "Teklifi panelinden inceleyip ilgilendiğini belirtebilirsin; ilgilendiğinde eşleşme oluşur."
      ].filter(Boolean).join("\n\n"),
      "dashboard/alici/teklifler", "Yeni teklif bildirimi", null, "match");
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
          .run(mid, offer.id, offer.buyerId, offer.sellerId, "MATCHED", today());
        const dem = db.prepare("SELECT * FROM demands WHERE id=?").get(offer.demandId) || {};
        const kira = (dem.transactionType || "SALE") === "RENT";
        const konut = ilanOzeti(offer.propertyId);
        const talep = talepOzeti(offer.demandId);
        const adim = "Sıradaki adım: iletişim bilgilerinin paylaşılmasını onayla. İki taraf da onay verdiğinde telefon ve e-posta karşılıklı açılır; siz iletişime geçersiniz.";

        // --- Satici / ev sahibi tarafi ---
        notify(offer.sellerId, "NEW_MATCH", "Yeni eşleşme", "Teklifinle ilgilenildi. İletişim onayını verebilirsin.", "dashboard/satici/eslesmeler");
        queueEmail(offer.sellerId, "Eşleştiniz — teklifin ilgi gördü",
          [`Gönderdiğin teklifle ilgilenildi. ${kira ? "Kiracı" : "Alıcı"} tarafı teklifini beğendi ve eşleştiniz.`,
            talep ? `Eşleştiğin talep:\n${talep}` : "",
            adim].filter(Boolean).join("\n\n"),
          "dashboard/satici/eslesmeler", "Yeni eşleşme bildirimi", null, "match");

        // --- Alici / kiraci tarafi ---
        notify(offer.buyerId, "NEW_MATCH", "Yeni eşleşme", "İlgilendiğini belirttin, eşleşme oluştu.", "dashboard/alici/eslesmeler");
        queueEmail(offer.buyerId, "Eşleştiniz — ilgilendiğin teklif",
          [`İlgilendiğini belirttiğin teklif için eşleşme oluştu.`,
            konut ? `Eşleştiğin ${kira ? "kiralık" : "satılık"} konut:\n${konut}` : "",
            adim].filter(Boolean).join("\n\n"),
          "dashboard/alici/eslesmeler", "Yeni eşleşme bildirimi", null, "match");
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

    // --- Bildirimler: akisin burada durmamasi icin karsi tarafa haber ver ---
    const teklif = db.prepare("SELECT * FROM offers WHERE id=?").get(m.offerId) || {};
    const alicidir = (id) => id === m.buyerId;
    const panel = (id) => alicidir(id) ? "dashboard/alici/eslesmeler" : "dashboard/satici/eslesmeler";
    if (unlocked) {
      // Iki tarafa da: artik gorusebilirsiniz.
      for (const uid2 of [m.buyerId, m.sellerId]) {
        const ozet = alicidir(uid2) ? ilanOzeti(teklif.propertyId) : talepOzeti(teklif.demandId);
        notify(uid2, "CONTACT_UNLOCKED", "İletişim açıldı", "Karşı tarafın telefon ve e-postası panelinde görünür.", panel(uid2));
        queueEmail(uid2, "İletişim açıldı — artık doğrudan görüşebilirsiniz",
          ["İki taraf da onay verdi. Karşı tarafın telefon ve e-posta bilgisi panelindeki Eşleşmeler bölümünde açıldı.",
            ozet ? `Eşleşme:\n${ozet}` : "",
            "Fiyat, pazarlık ve sözleşme için iletişime geçiniz. Kaporayı ve tapu işlemlerini yalnızca resmi kanallardan yürüt."
          ].filter(Boolean).join("\n\n"),
          panel(uid2), "İletişim açıldı bildirimi", null, "match");
      }
    } else {
      // Tek taraf onayladi: sira karsi tarafta.
      const bekleyen = isBuyer ? m.sellerId : m.buyerId;
      const ozet = alicidir(bekleyen) ? ilanOzeti(teklif.propertyId) : talepOzeti(teklif.demandId);
      notify(bekleyen, "CONTACT_WAITING", "Onayın bekleniyor", "Karşı taraf iletişim paylaşımını onayladı; sıra sende.", panel(bekleyen));
      queueEmail(bekleyen, "Karşı taraf onay verdi — sıra sende",
        ["Eşleştiğin taraf iletişim bilgilerinin paylaşılmasını onayladı. Sen de onay verdiğinde telefon ve e-posta karşılıklı açılır.",
          ozet ? `Eşleşme:\n${ozet}` : "",
          "Onaylamadığın sürece iletişim bilgilerin karşı tarafa gösterilmez."
        ].filter(Boolean).join("\n\n"),
        panel(bekleyen), "İletişim onayı bekleniyor", null, "match");
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

  // --- odeme / uyelik satin alma (PayTR iFrame API ya da mock) ---
  if (seg[0] === "payments" && seg[1] === "checkout" && method === "POST") {
    const plan = db.prepare("SELECT * FROM plans WHERE id = ?").get(body.planId);
    if (!plan) return err(res, 404, "Paket bulunamadı.");
    if (!plan.price || plan.price <= 0) return err(res, 400, "Bu paket ücretsiz; ödeme gerekmez.");
    const pid = uid("pay").replace(/[^a-zA-Z0-9]/g, "");
    const boostType = (plan.id === "plan-buyer-boost" || plan.id === "plan-seller-boost") ? (body.itemType || null) : null;
    const boostId = boostType ? (body.itemId || null) : null;
    const provider = paymentProvider();
    db.prepare("INSERT INTO payments (id,userId,planId,provider,amount,currency,status,createdAt,boostItemType,boostItemId) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .run(pid, user.id, plan.id, provider.name, plan.price, "TRY", "PENDING", today(), boostType, boostId);
    if (provider.name === "mock") {
      fulfillPayment(pid);
      return ok(res, { provider: "mock", paymentId: pid, done: true });
    }
    try {
      const u = db.prepare("SELECT name,email,phone FROM users WHERE id=?").get(user.id) || {};
      const xff = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
      const userIp = xff || req.socket?.remoteAddress || "127.0.0.1";
      const started = await provider.start({
        orderId: pid, amount: Math.round(plan.price * 100), currency: "TL", planName: plan.name,
        email: u.email || "musteri@konuttalebi.com", userName: u.name, userPhone: u.phone,
        userIp, okUrl: `${BASE_URL}/?odeme=ok`, failUrl: `${BASE_URL}/?odeme=fail`,
      });
      addAudit(user.id, "PAYMENT_STARTED", "Payment", pid, plan.name);
      return ok(res, { provider: provider.name, paymentId: pid, iframeUrl: started.iframeUrl, token: started.token });
    } catch (e) {
      db.prepare("UPDATE payments SET status='FAILED' WHERE id=?").run(pid);
      return err(res, 502, "Ödeme başlatılamadı: " + (e.message || "bilinmeyen hata"));
    }
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

  // =====================================================================
  // YONETIM PANELI UCLARI
  // Hepsi ADMIN yetkisi ister ve hepsi denetim kaydi (audit_logs) dusurur.
  // =====================================================================
  const adminOnly = () => user.role === "ADMIN";

  // --- A) Ilan / talep moderasyonu ---
  // durum: ACTIVE | REMOVED  (kalici silme yok; geri alinabilir olmali)
  if (seg[0] === "admin" && seg[1] === "moderate" && method === "POST") {
    if (!adminOnly()) return err(res, 403, "Bu işlem için yetkiniz yok.");
    const tur = seg[2] === "demand" ? "demand" : seg[2] === "property" ? "property" : "";
    const kayitId = seg[3] || "";
    if (!tur || !kayitId) return err(res, 400, "Geçersiz istek.");
    const tablo = tur === "demand" ? "demands" : "properties";
    const sahipAlan = tur === "demand" ? "buyerId" : "sellerId";
    const kayit = db.prepare(`SELECT * FROM ${tablo} WHERE id=?`).get(kayitId);
    if (!kayit) return err(res, 404, "Kayıt bulunamadı.");
    const yeni = body.status === "ACTIVE" ? "ACTIVE" : "REMOVED";
    const gerekce = String(body.reason || "").trim().slice(0, 400);
    if (yeni === "REMOVED" && gerekce.length < 5)
      return err(res, 400, "Yayından kaldırma için en az 5 karakterlik gerekçe yaz.");
    db.prepare(`UPDATE ${tablo} SET status=?, moderationReason=? WHERE id=?`).run(yeni, gerekce, kayitId);
    addAudit(user.id, yeni === "REMOVED" ? "ADMIN_CONTENT_REMOVED" : "ADMIN_CONTENT_RESTORED",
      tur === "demand" ? "Demand" : "Property", kayitId, gerekce || "Yayına geri alındı.");
    const sahip = kayit[sahipAlan];
    if (sahip) {
      const baslik = kayit.title || (tur === "demand" ? "Talebin" : "İlanın");
      if (yeni === "REMOVED") {
        notify(sahip, "CONTENT_REMOVED", "Bir kaydın yayından kaldırıldı",
          `${baslik} yayından kaldırıldı. Gerekçe: ${gerekce}`, "");
        queueEmail(sahip, "Bir kaydın yayından kaldırıldı",
          `${baslik} adlı kaydın yayından kaldırıldı.\n\nGerekçe: ${gerekce}\n\nDüzenleyip tekrar yayınlayabilirsin.`,
          "", "İçerik moderasyonu", "Katılmıyorsan bu e-postayı yanıtla, birlikte bakalım.");
      } else {
        notify(sahip, "CONTENT_RESTORED", "Kaydın tekrar yayında", `${baslik} yeniden yayına alındı.`, "");
      }
    }
    return ok(res, { status: yeni });
  }

  // --- A2) Ilan / talep basligini ve aciklamasini duzelt ---
  if (seg[0] === "admin" && seg[1] === "edit" && method === "PATCH") {
    if (!adminOnly()) return err(res, 403, "Bu işlem için yetkiniz yok.");
    const tur = seg[2] === "demand" ? "demands" : seg[2] === "property" ? "properties" : "";
    const kayitId = seg[3] || "";
    if (!tur || !kayitId) return err(res, 400, "Geçersiz istek.");
    const kayit = db.prepare(`SELECT * FROM ${tur} WHERE id=?`).get(kayitId);
    if (!kayit) return err(res, 404, "Kayıt bulunamadı.");
    const baslik = String(body.title ?? kayit.title ?? "").trim().slice(0, 160);
    const aciklama = String(body.description ?? kayit.description ?? "").trim().slice(0, 4000);
    if (baslik.length < 5) return err(res, 400, "Başlık en az 5 karakter olmalı.");
    db.prepare(`UPDATE ${tur} SET title=?, description=? WHERE id=?`).run(baslik, aciklama, kayitId);
    addAudit(user.id, "ADMIN_CONTENT_EDITED", tur === "demands" ? "Demand" : "Property", kayitId,
      `Başlık/açıklama düzenlendi. Eski başlık: ${kayit.title || ""}`);
    return ok(res);
  }

  // --- B) Uye yonetimi: durum, rol, not ---
  if (seg[0] === "admin" && seg[1] === "users" && seg[3] === "manage" && method === "POST") {
    if (!adminOnly()) return err(res, 403, "Bu işlem için yetkiniz yok.");
    const hedef = db.prepare("SELECT * FROM users WHERE id=?").get(seg[2]);
    if (!hedef) return err(res, 404, "Üye bulunamadı.");
    if (hedef.id === user.id) return err(res, 400, "Kendi hesabını buradan değiştiremezsin.");
    const setler = [], degerler = [], notlar = [];
    if (body.status !== undefined) {
      const yeni = ["ACTIVE", "SUSPENDED"].includes(body.status) ? body.status : null;
      if (!yeni) return err(res, 400, "Geçersiz durum.");
      setler.push("status=?"); degerler.push(yeni); notlar.push(`durum -> ${yeni}`);
      if (yeni === "SUSPENDED") db.prepare("DELETE FROM sessions WHERE userId=?").run(hedef.id);
    }
    if (body.role !== undefined) {
      const yeni = ["BUYER", "SELLER", "AGENT", "REVIEWER", "ADMIN"].includes(body.role) ? body.role : null;
      if (!yeni) return err(res, 400, "Geçersiz rol.");
      setler.push("role=?"); degerler.push(yeni); notlar.push(`rol -> ${yeni}`);
    }
    if (body.adminNote !== undefined) {
      setler.push("adminNote=?"); degerler.push(String(body.adminNote).slice(0, 1000)); notlar.push("not güncellendi");
    }
    if (!setler.length) return err(res, 400, "Değiştirilecek alan yok.");
    degerler.push(hedef.id);
    db.prepare(`UPDATE users SET ${setler.join(", ")} WHERE id=?`).run(...degerler);
    addAudit(user.id, "ADMIN_USER_MANAGED", "User", hedef.id, notlar.join(", "));
    if (body.status === "SUSPENDED")
      notify(hedef.id, "ACCOUNT_SUSPENDED", "Üyeliğin askıya alındı",
        String(body.reason || "Hesabın geçici olarak askıya alındı. Destek ile iletişime geçebilirsin."), "");
    return ok(res);
  }

  // --- B2) Uyeye ucretsiz uyelik tanimla ---
  if (seg[0] === "admin" && seg[1] === "users" && seg[3] === "grant" && method === "POST") {
    if (!adminOnly()) return err(res, 403, "Bu işlem için yetkiniz yok.");
    const hedef = db.prepare("SELECT * FROM users WHERE id=?").get(seg[2]);
    if (!hedef) return err(res, 404, "Üye bulunamadı.");
    const plan = db.prepare("SELECT * FROM plans WHERE id=?").get(String(body.planId || ""));
    if (!plan) return err(res, 400, "Paket bulunamadı.");
    const gun = Math.min(Math.max(parseInt(body.days, 10) || 30, 1), 730);
    const bitis = new Date(Date.now() + gun * 86400000).toISOString().slice(0, 10);
    db.prepare("INSERT INTO entitlements (id,userId,planId,activeFrom,activeTo) VALUES (?,?,?,?,?)")
      .run(uid("e"), hedef.id, plan.id, today(), bitis);
    addAudit(user.id, "ADMIN_MEMBERSHIP_GRANTED", "User", hedef.id, `${plan.name}, ${gun} gün (${bitis} tarihine kadar)`);
    notify(hedef.id, "MEMBERSHIP_GRANTED", "Üyeliğin tanımlandı",
      `${plan.name} üyeliğin ${bitis} tarihine kadar aktif.`, "dashboard");
    return ok(res, { activeTo: bitis });
  }

  // --- B3) Kimlik verisini acik gormek: AYRI istek + denetim kaydi ---
  if (seg[0] === "admin" && seg[1] === "users" && seg[3] === "identity" && method === "POST") {
    if (!adminOnly()) return err(res, 403, "Bu işlem için yetkiniz yok.");
    const gerekce = String(body.reason || "").trim().slice(0, 300);
    if (gerekce.length < 5) return err(res, 400, "Görüntüleme gerekçesi yazmalısın (en az 5 karakter).");
    const hedef = db.prepare("SELECT id,name,tcknEnc,birthDate FROM users WHERE id=?").get(seg[2]);
    if (!hedef) return err(res, 404, "Üye bulunamadı.");
    const tckn = decryptSecret(hedef.tcknEnc);
    addAudit(user.id, "ADMIN_IDENTITY_VIEWED", "User", hedef.id, `Gerekçe: ${gerekce}`);
    return ok(res, { tckn: tckn || "", birthDate: hedef.birthDate || "" });
  }

  // --- E) Uye verisini anonimlestir (KVKK silme talebi) ---
  // Kayitlar silinmez, kisisel veriler geri donusu olmayacak sekilde temizlenir.
  if (seg[0] === "admin" && seg[1] === "users" && seg[3] === "anonymize" && method === "POST") {
    if (!adminOnly()) return err(res, 403, "Bu işlem için yetkiniz yok.");
    const hedef = db.prepare("SELECT * FROM users WHERE id=?").get(seg[2]);
    if (!hedef) return err(res, 404, "Üye bulunamadı.");
    if (hedef.role === "ADMIN") return err(res, 400, "Yönetici hesabı anonimleştirilemez.");
    if (String(body.confirm || "") !== hedef.id) return err(res, 400, "Onay için üye kimliğini doğru yaz.");
    const takma = `Silinmiş üye ${hedef.id.slice(-4)}`;
    db.prepare(`UPDATE users SET name=?, email=?, phone='', city='', status='ANONYMIZED',
      tcknEnc=NULL, tcknHash=NULL, birthDate=NULL, identityConsent=0,
      acqSource=NULL, acqMedium=NULL, acqCampaign=NULL, acqTerm=NULL, acqGclid=NULL WHERE id=?`)
      .run(takma, `silinmis-${hedef.id}@konuttalebi.invalid`, hedef.id);
    db.prepare("UPDATE auth_accounts SET email=?, passwordHash='' WHERE userId=?")
      .run(`silinmis-${hedef.id}@konuttalebi.invalid`, hedef.id);
    db.prepare("DELETE FROM sessions WHERE userId=?").run(hedef.id);
    db.prepare("UPDATE demands SET status='REMOVED' WHERE buyerId=?").run(hedef.id);
    db.prepare("UPDATE properties SET status='REMOVED' WHERE sellerId=?").run(hedef.id);
    addAudit(user.id, "ADMIN_USER_ANONYMIZED", "User", hedef.id,
      `KVKK silme talebi uygulandı. Gerekçe: ${String(body.reason || "").slice(0, 200)}`);
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
const STATIC_ALLOW = new Set(["/index.html", "/app.js", "/styles.css", "/favicon.ico", "/robots.txt", "/sitemap.xml", "/google65cc11299e6e1d55.html", "/kiralik-ev-arayan.html", "/evine-kiraci-bul.html"]);
// Duzgun 404 sayfasi: UTF-8 basligi olmadan Turkce karakterler bozuk gorunuyordu.
function notFoundPage(res) {
  const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Konuttalebi | Sayfa bulunamadı</title><meta name="robots" content="noindex">
<link rel="icon" href="/favicon.ico" sizes="any">
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#10243a;color:#f4f7fb;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;text-align:center;padding:24px}
.box{max-width:520px}h1{font-size:64px;margin:0;color:#d6a94a;letter-spacing:-2px}h2{font-size:24px;margin:8px 0 12px}p{opacity:.8;line-height:1.6;margin:0 0 24px}
a{display:inline-block;background:#d6a94a;color:#10243a;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px}</style></head>
<body><div class="box"><h1>404</h1><h2>Bu sayfa bulunamadı</h2>
<p>Aradığın sayfa taşınmış veya kaldırılmış olabilir. Ana sayfadan talebini oluşturabilir ya da yayındaki konutlara göz atabilirsin.</p>
<a href="/">Ana sayfaya dön</a></div></body></html>`;
  res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
  return res.end(html);
}
// --- Sehir bazli SEO sayfalari -------------------------------------------
// /kiralik-ev-arayan/{il} ve /evine-kiraci-bul/{il}: sunucudan tam HTML.
// Sondaki slash ve buyuk harf 301 ile normalize edilir; bilinmeyen il 404 doner.
const CITY_ROUTE = /^\/(kiralik-ev-arayan|evine-kiraci-bul)\/([^/]+)\/?$/i;
function tryCityPage(req, res, pathname) {
  const m = pathname.match(CITY_ROUTE);
  if (!m) return false;
  const base = m[1].toLowerCase();
  const slug = m[2].toLowerCase();
  const canonical = `/${base}/${slug}`;
  // Buyuk harf veya sondaki slash -> tek dogru adrese 301
  if (pathname !== canonical) {
    if (!CITIES[slug]) return false; // bilinmeyen il: 404'e dussun
    res.writeHead(301, { Location: canonical });
    res.end();
    return true;
  }
  if (!CITIES[slug]) return false;   // listede olmayan il -> 404
  const html = renderCityPage(base === "kiralik-ev-arayan" ? "tenant" : "owner", slug);
  if (!html) return false;
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=600" });
  res.end(html);
  return true;
}

async function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (tryCityPage(req, res, p)) return;
  if (p === "/") p = "/index.html";
  else if (p === "/kiralik-ev-arayan") p = "/kiralik-ev-arayan.html";
  else if (p === "/evine-kiraci-bul") p = "/evine-kiraci-bul.html";
  const isAsset = p.startsWith("/assets/") && !p.includes("..");
  if (!STATIC_ALLOW.has(p) && !isAsset) return notFoundPage(res);
  const filePath = normalize(join(WEB_DIR, p));
  if (filePath !== WEB_DIR && !filePath.startsWith(WEB_DIR + "/")) { res.writeHead(403); return res.end("Forbidden"); }
  if (!existsSync(filePath)) return notFoundPage(res);
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
