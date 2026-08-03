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

/**
 * Istege bagli acik rizalari kaydeder ve HER BIRINI denetim kaydina yazar.
 *
 * KVKK acisinden onemli: rizanin ne zaman ve hangi kapsamla verildigini
 * ispatlayabilmek gerekir. Bu yuzden salt kolon guncellemek yetmez; her izin
 * icin tarih damgasi tutulur ve denetim kaydina EVET/HAYIR olarak dusulur.
 * Uc kayit ucundan da (register, misafir talep, google complete) cagrilir.
 */
function izinleriKaydet(userId, body) {
  const izinler = [
    ["marketingConsent", "marketingConsentAt", "MARKETING_CONSENT", "Ticari elektronik ileti izni"],
    ["personalizationConsent", "personalizationConsentAt", "PERSONALIZATION_CONSENT", "Pazarlama ve kişiselleştirme izni"],
    ["partnerTransferConsent", "partnerTransferConsentAt", "PARTNER_TRANSFER_CONSENT", "İş ortaklarına aktarım izni"],
  ];
  for (const [kolon, tarihKolon, olay, etiket] of izinler) {
    const deger = body[kolon] ? 1 : 0;
    db.prepare(`UPDATE users SET ${kolon}=?, ${tarihKolon}=? WHERE id=?`)
      .run(deger, deger ? now() : null, userId);
    addAudit(userId, olay, "User", userId, `${etiket}: ${deger ? "EVET" : "HAYIR"}`);
  }
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
    "Konut aramanın yeni yolu Konuttalebi'ne hoş geldin.",
    "Burada yüzlerce sayfayı tek tek gezmezsin. Ne aradığını bir kez yazarsın; evi sana uyanlar ve onaylı danışmanlar talebini görür ve seni doğrudan arar.",
    "Hemen paneline girerek talebini oluşturabilir veya mevcut talepleri inceleyebilirsin.",
    "İletişim bilgilerin gizli tutulur; yalnızca ücretli üyeler ve onaylı danışmanlar görüntüleyebilir ve her görüntülemede sana haber verilir.",
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

/* Olcum kimlikleri — KÜNYE'deki degerlerle ve app.js / index.html ile
   BIREBIR ayni olmali. Burada tekrar taniminin sebebi: misafir talep akisinda
   asil donusum (talep yayina girdi) sunucunun dondurdugu dogrulama sayfasinda
   gerceklesiyor; o sayfa SPA degil, bu yuzden gtag'i kendisi yuklemek zorunda.
   Kimlikler degisirse UC yerde birlikte guncellenmeli. */
const OLCUM = {
  ads: "AW-18335656859",
  ga4: "G-LFBWPTNVDE",
  talepDonusumEtiketi: "IuOECKTCnNMcEJvXj6dE",   // "Talep oluşturma" donusumu
};

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
  const htmlLinkli = html.replace(/href="[^"]*"(\s+style="display:inline-block;background:#4f46e5)/, `href="${link}"$1`);
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
      "Doğrulamadığında talebinle ilgili bildirimleri kaçırabilirsin."
    ].join("\n\n"), "", null, u.id);
  const htmlLinkli = html.replace(/href="[^"]*"(\s+style="display:inline-block;background:#4f46e5)/, `href="${link}"$1`);
  addAudit(u.id, "EMAIL_VERIFY_REMINDER", "User", u.id, `${kalanSaat} saat kala hatırlatma gönderildi.`);
  return deliverEmail(u.id, u.email, u.name, "Konuttalebi — E-postanı doğrulamayı unutma", htmlLinkli, "E-posta doğrulama hatırlatması");
}

/**
 * Suresi dolan dogrulanmamis hesaplari askiya alir.
 *
 * - Yalnizca `epostaMuaf = 0` hesaplara isler. Duvar oncesi kayitli uyeler
 *   kapsam disidir, hicbir kosulda askiya alinmazlar.
 * - `autoSuspendedAt` doldurulur; boylece bu askinin sebebinin sure dolumu
 *   oldugu bellidir ve e-posta dogrulandiginda kendiliginden kalkar.
 *   Yoneticinin elle askiya aldigi hesaplarda bu alan bostur ve dokunulmaz.
 * - Oturum KAPATILMAZ: kullanici girip dogrulama ekranini gorebilmelidir.
 */
async function epostaSureDolduTara() {
  const dolanlar = db.prepare(`
    SELECT u.id, u.name, u.email
    FROM users u JOIN auth_accounts a ON a.userId = u.id
    WHERE a.emailVerified = 0 AND u.status = 'ACTIVE'
      AND COALESCE(u.epostaMuaf,0) = 0 AND u.role <> 'ADMIN'
      AND u.emailVerifyDeadline IS NOT NULL
      AND u.emailVerifyDeadline < ?`).all(new Date().toISOString());
  let askiya = 0;
  for (const u of dolanlar) {
    db.prepare("UPDATE users SET status='SUSPENDED', autoSuspendedAt=? WHERE id=?").run(now(), u.id);
    addAudit(u.id, "ACCOUNT_AUTO_SUSPENDED", "User", u.id,
      `E-posta ${EPOSTA_SURE_SAAT} saat içinde doğrulanmadı, hesap otomatik askıya alındı.`);
    notify(u.id, "ACCOUNT_SUSPENDED", "Üyeliğin askıya alındı",
      "E-posta adresini doğrulamadığın için üyeliğin askıya alındı.", "");
    askiya++;
    if (u.email) {
      try {
        await deliverEmail(u.id, u.email, u.name, "Konuttalebi — Üyeliğin askıya alındı",
          notificationEmailHtml(u.name, "Üyeliğin askıya alındı",
            [`E-posta adresini ${EPOSTA_SURE_SAAT} saat içinde doğrulamadığın için üyeliğin askıya alındı.`,
              "Askıyı kaldırmak için tek yapman gereken e-postanı doğrulamak. Giriş yap, çıkan uyarı ekranından yeni doğrulama bağlantısı iste ve bağlantıya tıkla — hesabın anında yeniden açılır.",
              "Verilerin duruyor, hiçbir talebin silinmedi."
            ].join("\n\n"), `${BASE_URL}/#/giris`, "Konuttalebi'ne git", u.id),
          "Hesap askıya alma bildirimi");
      } catch (e) { console.error("[mail] aski bildirimi gonderilemedi:", e && e.message); }
    }
  }
  return askiya;
}

/**
 * Otomatik askiyi kaldirir. Yalnizca `autoSuspendedAt` dolu hesaplarda calisir —
 * yoneticinin elle verdigi aski karari kendiliginden geri alinmaz.
 */
function otomatikAskiyiKaldir(userId) {
  const u = db.prepare("SELECT status, autoSuspendedAt FROM users WHERE id=?").get(userId);
  if (!u || !u.autoSuspendedAt) return false;
  db.prepare("UPDATE users SET status='ACTIVE', autoSuspendedAt=NULL WHERE id=?").run(userId);
  addAudit(userId, "ACCOUNT_AUTO_REACTIVATED", "User", userId,
    "E-posta doğrulandı, otomatik askı kaldırıldı.");
  return true;
}

/**
 * Misafir akisinda dogrulanmayan taleplerin temizligi.
 *
 * 48 saat icinde e-postasi dogrulanmayan talep silinir. Talebin sahibi olan
 * hesap da hicbir ise yaramadigi icin (hic dogrulanmamis, tek talebi buydu)
 * birlikte silinir — yoksa panelde ve uye sayilarinda cop birikir.
 *
 * Guvenlik: yalnizca (a) e-postasi hic dogrulanmamis, (b) tek talebi
 * PENDING_VERIFY olan, (c) baska hicbir kaydi (teklif, odeme, ilan) bulunmayan
 * hesaplar silinir. Kosullardan biri tutmazsa hesaba dokunulmaz.
 */
const MISAFIR_TALEP_SURE_SAAT = 48;
function misafirTalepTemizle() {
  const sinir = new Date(Date.now() - MISAFIR_TALEP_SURE_SAAT * 3600 * 1000).toISOString().slice(0, 16).replace("T", " ");
  const bekleyenler = db.prepare(`
    SELECT d.id AS demandId, d.buyerId, d.createdAt
    FROM demands d JOIN auth_accounts a ON a.userId = d.buyerId
    WHERE d.status='PENDING_VERIFY' AND a.emailVerified = 0`).all();
  let silinen = 0;
  for (const b of bekleyenler) {
    if (String(b.createdAt || "") > sinir) continue;    // henuz 48 saat olmamis
    const baskaKayit =
      db.prepare("SELECT COUNT(*) c FROM demands WHERE buyerId=? AND id<>?").get(b.buyerId, b.demandId).c +
      db.prepare("SELECT COUNT(*) c FROM properties WHERE sellerId=?").get(b.buyerId).c +
      db.prepare("SELECT COUNT(*) c FROM offers WHERE buyerId=? OR sellerId=?").get(b.buyerId, b.buyerId).c +
      db.prepare("SELECT COUNT(*) c FROM payments WHERE userId=?").get(b.buyerId).c;
    db.prepare("DELETE FROM demands WHERE id=?").run(b.demandId);
    silinen++;
    if (baskaKayit === 0) {
      db.prepare("DELETE FROM buyer_profiles WHERE userId=?").run(b.buyerId);
      db.prepare("DELETE FROM email_verifications WHERE userId=?").run(b.buyerId);
      db.prepare("DELETE FROM notifications WHERE userId=?").run(b.buyerId);
      db.prepare("DELETE FROM sessions WHERE userId=?").run(b.buyerId);
      db.prepare("DELETE FROM auth_accounts WHERE userId=?").run(b.buyerId);
      db.prepare("DELETE FROM users WHERE id=?").run(b.buyerId);
    }
  }
  return silinen;
}


/**
 * 24. saat dogrulama hatirlatmasi (KUYRUK #29a).
 *
 * Misafir talep akisinda kullanici formu doldurup e-postasini dogrulamazsa talep
 * 48 saatte silinir (misafirTalepTemizle). Arada hicbir uyari gitmiyordu: kisi
 * maili gozden kacirdiysa emegi de talebi de sessizce kayboluyordu.
 *
 * Kural: talep PENDING_VERIFY, hesap dogrulanmamis, uzerinden 24 saat gecmis ve
 * daha once hatirlatilmamis (dogrulamaHatirlatildiAt NULL) ise TEK bir mail gider.
 * 48 saat silme kurali degismedi. Dogrulama baglantisi yeniden uretilir; eski
 * token gecerliligini korur, iki baglanti da calisir.
 */
const HATIRLATMA_SAAT = 24;
function dogrulamaHatirlatmaTaramasi() {
  const sinir = new Date(Date.now() - HATIRLATMA_SAAT * 3600 * 1000).toISOString().slice(0, 16).replace("T", " ");
  const bekleyen = db.prepare(`
    SELECT d.id AS demandId, d.createdAt, d.city, d.transactionType,
           u.id AS userId, u.name, u.email
    FROM demands d
    JOIN auth_accounts a ON a.userId = d.buyerId
    JOIN users u ON u.id = d.buyerId
    WHERE d.status='PENDING_VERIFY' AND a.emailVerified = 0
      AND (d.dogrulamaHatirlatildiAt IS NULL OR d.dogrulamaHatirlatildiAt = '')`).all();
  let gonderilen = 0;
  for (const b of bekleyen) {
    if (String(b.createdAt || "") > sinir) continue;   // henuz 24 saat olmamis
    if (!b.email) continue;
    try {
      // Yeni token uret ve maili gonder (ayni altyapi: epostaDogrulamaBaslat).
      epostaDogrulamaBaslat(b.userId, b.email, b.name || "");
      db.prepare("UPDATE demands SET dogrulamaHatirlatildiAt=? WHERE id=?").run(now(), b.demandId);
      gonderilen++;
    } catch (e) {
      console.error("[mail] dogrulama hatirlatmasi gonderilemedi:", e && e.message);
    }
  }
  if (gonderilen) console.log(`[mail] 24. saat dogrulama hatirlatmasi: ${gonderilen} talep`);
  return gonderilen;
}

async function epostaHatirlatmaTara() {
  const bekleyenler = db.prepare(`
    SELECT u.id, u.name, u.email, u.emailVerifyDeadline
    FROM users u JOIN auth_accounts a ON a.userId = u.id
    WHERE a.emailVerified = 0 AND u.status = 'ACTIVE'
      AND COALESCE(u.epostaMuaf,0) = 0
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
// Once hatirlatma (sure dolmadan once), sonra aski (sure dolduktan sonra).
async function epostaTaramasi() {
  const hatirlatilan = await epostaHatirlatmaTara().catch((e) => {
    console.error("[mail] hatirlatma taramasi hatasi:", e && e.message); return 0;
  });
  const askiyaAlinan = await epostaSureDolduTara().catch((e) => {
    console.error("[mail] aski taramasi hatasi:", e && e.message); return 0;
  });
  let temizlenen = 0;
  try { temizlenen = misafirTalepTemizle(); }
  catch (e) { console.error("[talep] misafir temizligi hatasi:", e && e.message); }
  try { dogrulamaHatirlatmaTaramasi(); }
  catch (e) { console.error("[mail] dogrulama hatirlatma taramasi hatasi:", e && e.message); }
  try { danismanBelgeTaramasi(); }
  catch (e) { console.error("[belge] danisman taramasi hatasi:", e && e.message); }
  try { talepSuresiTaramasi(); }
  catch (e) { console.error("[talep] sure taramasi hatasi:", e && e.message); }
  try { dogumGunuTaramasi(); }
  catch (e) { console.error("[mail] dogum gunu taramasi hatasi:", e && e.message); }
  if (hatirlatilan) console.log(`[mail] e-posta dogrulama hatirlatmasi: ${hatirlatilan} kisi`);
  if (askiyaAlinan) console.log(`[uyelik] sure dolumu nedeniyle askiya alinan: ${askiyaAlinan} hesap`);
  if (temizlenen) console.log(`[talep] dogrulanmayan misafir talebi silindi: ${temizlenen}`);
  return { hatirlatilan, askiyaAlinan, temizlenen };
}

// ---------- Faz 3: danisman belge taramasi (saatlik) ----------
// 1) KVKK hijyeni: reddedilen Seviye 5 dosyasi 30 gun sonra silinir (kayit kalir,
//    dosya icerigi NULL olur) — senaryo karari.
// 2) Gecis uyarilari: 14 gunluk deadline'a <=3 gun kalan onaysiz danismanlara tek
//    seferlik hatirlatma; sure dolanlara tek seferlik "iletisim kapandi" bildirimi.
//    Tek seferlik'lik ayni tipte bildirim var mi kontroluyle saglanir (dedupe).
function danismanBelgeTaramasi() {
  const sinir = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const silinen = db.prepare(
    "UPDATE verification_documents SET fileData=NULL WHERE status='REJECTED' AND fileData IS NOT NULL AND reviewedAt <= ?"
  ).run(sinir).changes;
  if (silinen) console.log(`[belge] 30 gunu dolan ${silinen} reddedilmis belge dosyasi silindi.`);

  const bugun = today();
  const esik = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const gecisdekiler = db.prepare(
    "SELECT id,name FROM users WHERE role='AGENT' AND agentApproved=0 AND agentDocDeadline IS NOT NULL"
  ).all();
  const bildirimVar = (uid2, tip) =>
    db.prepare("SELECT COUNT(*) c FROM notifications WHERE userId=? AND type=?").get(uid2, tip).c > 0;
  for (const u of gecisdekiler) {
    const dl = db.prepare("SELECT agentDocDeadline dl FROM users WHERE id=?").get(u.id).dl;
    if (dl < bugun) {
      if (!bildirimVar(u.id, "AGENT_DOC_DEADLINE_PASSED")) {
        notify(u.id, "AGENT_DOC_DEADLINE_PASSED", "Belge süren doldu — iletişim açma kapandı",
          "Sorumlu Emlak Danışmanı belgeni 14 günlük geçiş süresinde yüklemedin. İletişim bilgisi görüntüleme kapatıldı; belgeni yükleyip onaylandığında yeniden açılır.", "dashboard/satici/dogrulama");
        queueEmail(u.id, "Belge süren doldu — iletişim açma kapandı",
          "Sorumlu Emlak Danışmanı (Seviye 5) belgen için tanınan 14 günlük süre doldu. Talep sahiplerinin iletişim bilgisini görüntüleme özelliğin kapatıldı. Panelinden belgeni yüklediğinde ve onaylandığında özellik yeniden açılır.",
          "dashboard/satici/dogrulama", "Danışman belge süresi doldu", "Belgeni bekliyoruz.", "tx");
      }
    } else if (dl <= esik && !bildirimVar(u.id, "AGENT_DOC_DEADLINE_SOON")) {
      notify(u.id, "AGENT_DOC_DEADLINE_SOON", "Belge için son günler",
        `Sorumlu Emlak Danışmanı belgeni en geç ${dl} tarihine kadar yüklemelisin; yoksa iletişim bilgisi görüntüleme kapanır.`, "dashboard/satici/dogrulama");
      queueEmail(u.id, "Danışman belgen için son günler",
        `Sorumlu Emlak Danışmanı (Seviye 5) belgeni en geç ${dl} tarihine kadar yüklemen gerekiyor. Süre dolarsa talep sahiplerinin iletişim bilgisini görüntüleme özelliğin, belgen onaylanana dek kapanır. Belge e-Devlet üzerinden barkodlu alınabilir (PDF, JPG veya PNG, en fazla 5 MB).`,
        "dashboard/satici/dogrulama", "Danışman belge hatırlatması", "Belgeni bekliyoruz.", "tx");
    }
  }
}
setInterval(() => { epostaTaramasi().catch(() => {}); }, 60 * 60 * 1000).unref?.();
// ACILISTA TEK SEFER (2026-07-31 bulgusu): saatlik sayac her yeniden baslatmada
// sifirlaniyordu. Yogun deploy gunlerinde servis saat dolmadan yeniden basladigi
// icin tarama hic calismayabiliyordu — sure dolan talepler, dogum gunu ve belge
// uyarilari atlaniyordu. Acilistan 15 sn sonra bir kez calistirilir; tum
// taramalar dedupe'lu oldugu icin tekrar calismasi zararsizdir.
setTimeout(() => { epostaTaramasi().catch(() => {}); }, 15 * 1000).unref?.();
setTimeout(() => { epostaTaramasi().catch(() => {}); }, 60 * 1000).unref?.();

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
    actionUrl || "dashboard", "Kriterine uyan talep bildirimi", null, "digest");
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
  const tur = `${d.roomCount || ""} ${kira ? "kiralık" : "satın alınacak"} ${String(d.propertyType || "konut").toLowerCase()}`.trim();
  const panelUrl = `${APP_URL()}/#/dashboard/alici/taleplerim`;
  const yardimUrl = `${APP_URL()}/#/yardim`;

  const satir = (etiket, deger) => `
    <td style="padding:0 8px 14px 0;vertical-align:top;width:50%">
      <div style="font-size:12.5px;color:#8496a8;margin-bottom:3px">${escapeHtmlSrv(etiket)}</div>
      <div style="font-size:15px;font-weight:700;color:#020617">${escapeHtmlSrv(deger)}</div>
    </td>`;

  // Eslesme kutusu (2.0): sayi = talebinle ilgilenen profildeki uye sayisi.
  const kutu = uygunSayi > 0
    ? `<div style="background:#eef7f0;border:1px solid #d3e8d9;border-radius:12px;padding:22px;text-align:center;margin:18px 0">
         <div style="font-size:40px;font-weight:800;color:#020617;line-height:1.1">${uygunSayi}</div>
         <div style="font-size:14.5px;color:#41556d;margin-top:6px">
           ${kira ? "ev sahibi/danışmanın" : "evine alıcı arayanın/danışmanın"} aradığı profil talebinle uyuşuyor; talebin onlara bildirildi.
         </div>
       </div>`
    : `<div style="background:#fbf6ec;border:1px solid #f0e2c8;border-radius:12px;padding:20px;margin:18px 0">
         <div style="font-size:14.5px;color:#41556d;line-height:1.6">
           Talebin aktif ve havuzda görünüyor. Talebinle ilgilenen bir üye
           iletişim bilgini görüntülediğinde sana haber veririz.
         </div>
       </div>`;

  const sss = [
    ["Beni kim arayacak?", `Talebini gören ${kira ? "ev sahipleri ve onaylı emlak danışmanları" : "evine alıcı arayanlar ve onaylı emlak danışmanları"} iletişim bilgini üyelikle görüntüler ve seni doğrudan arar. Sen aramazsın.`],
    ["İletişim bilgilerim güvende mi?", "Talebinde adın, telefonun ve e-postan herkese açık görünmez. İletişim bilgin yalnızca ücretli üyeliği olan üyeler ve onaylı emlak danışmanları tarafından görüntülenebilir; her görüntülemede sana haber veririz."],
    ["Kimse aramazsa ne yapmalıyım?", "Talebini panelinden düzenleyip bütçe aralığını veya bölgeyi genişletebilirsin; aranma ihtimalin artar."]
  ].map(([s, c]) => `
    <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#41556d">
      <strong style="color:#020617">${escapeHtmlSrv(s)}</strong><br>${escapeHtmlSrv(c)}
    </p>`).join("");

  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#020617">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden">

        <tr><td style="background:#ffffff;padding:24px 26px 18px;text-align:left;border-bottom:1px solid #e2e8f0">
          <div style="color:#020617;font-size:17px;font-weight:700;letter-spacing:-.2px">${MARKA.ad}</div><div style="color:#b08a35;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:2px 0 12px">${MARKA.slogan}</div>
          <div style="font-size:36px;line-height:1;margin-bottom:10px">&#127881;</div>
          <div style="color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-.3px">Talebin yayında</div>
          <div style="color:#a8bcd0;font-size:14px;margin-top:6px">Artık teklifler sana gelecek</div>
        </td></tr>

        <tr><td style="padding:26px">
          <p style="margin:0 0 6px;font-size:15px;color:#41556d">Merhaba${ad ? " " + ad : ""},</p>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#41556d">
            Talebin başarıyla yayınlandı. <strong style="color:#020617">${escapeHtmlSrv(konum)}</strong> için
            <strong style="color:#020617">${escapeHtmlSrv(tur)}</strong> talebin aktif.
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
            <a href="${panelUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 28px;border-radius:8px">Talebimi görüntüle</a>
          </div>

          <div style="border-top:1px solid #e8edf3;margin-top:24px;padding-top:20px">
            <div style="font-size:15px;font-weight:700;color:#020617;margin-bottom:12px">Sıkça sorulanlar</div>
            ${sss}
          </div>
        </td></tr>

        <tr><td style="background:#f8fafc;padding:18px 26px;font-size:12px;line-height:1.6;color:#64748b;border-top:1px solid #e2e8f0">
          <p style="margin:0 0 8px;color:#020617;font-weight:600;font-size:13px">${MARKA.ad} Ekibi<br>
            <span style="color:#64748b;font-weight:500;font-style:italic">&ldquo;${MARKA.epostaSlogan}&rdquo;</span></p>
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
  const label = /yenile|süre/i.test(String(title)) ? "Talebimi Yenile"
    : clean.startsWith("dashboard") ? "Panelime Git" : "Konuttalebi'ne git";
  const merhaba = toName ? `Merhaba ${escapeHtmlSrv(String(toName).split(" ")[0])},` : "Merhaba,";
  // Bos satirla ayrilmis metni paragraflara cevir.
  const paragraphs = String(body || "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#41556d">${escapeHtmlSrv(p)}</p>`).join("");
  // closing verilirse butonun altinda o gorunur; yoksa standart gizlilik notu.
  const afterCta = closing
    ? `<p style="margin:22px 0 0;font-size:14px;line-height:1.7;color:#41556d">${escapeHtmlSrv(closing)}</p>`
    : `<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#94a3b8">İletişim bilgin yalnızca ücretli üyeler ve onaylı danışmanlarca görüntülenir; her görüntülemede sana haber veririz. Fiyata, pazarlığa veya sözleşmeye karışmayız.</p>`;
  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#020617">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
        <tr><td style="background:#ffffff;padding:24px 26px 18px;text-align:left;border-bottom:1px solid #e2e8f0">
          <div style="color:#020617;font-size:17px;font-weight:700;letter-spacing:-.2px">${MARKA.ad}</div><div style="color:#b08a35;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:2px 0 12px">${MARKA.slogan}</div>
          ${emoji ? `<div style="font-size:32px;line-height:1;margin-bottom:8px">${emoji}</div>` : ""}
          <div style="color:#020617;font-size:21px;font-weight:700;letter-spacing:-.3px;line-height:1.3">${escapeHtmlSrv(title)}</div>
        </td></tr>
        <tr><td style="padding:26px">
          <p style="margin:0 0 14px;font-size:15px;color:#41556d">${merhaba}</p>
          ${paragraphs}
          <div style="text-align:center;margin:20px 0 4px">
            <a href="${link}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 28px;border-radius:8px">${label}</a>
          </div>
          ${afterCta}
        </td></tr>
        <tr><td style="background:#f8fafc;padding:18px 26px;font-size:12px;line-height:1.6;color:#64748b;border-top:1px solid #e2e8f0">
          <p style="margin:0 0 8px;color:#020617;font-weight:600;font-size:13px">${MARKA.ad} Ekibi<br>
            <span style="color:#64748b;font-weight:500;font-style:italic">&ldquo;${MARKA.epostaSlogan}&rdquo;</span></p>
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


async function deliverEmail(userId, toEmail, toName, subject, html, reason, unsubUserId, ekler) {
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
        // Ekler (2026-08-03): fatura PDF'i e-postaya ek olarak gider.
        // Resend "attachments": [{ filename, content(base64) }] bekler.
        body: JSON.stringify({
          from: MAIL_FROM(), to: [toEmail], reply_to: MAIL_REPLY_TO(), subject, html,
          ...(headers ? { headers } : {}),
          ...(Array.isArray(ekler) && ekler.length ? { attachments: ekler } : {}),
        })
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
  // 2.0: iletisimi yalnizca uye tarafi (SELLER/AGENT) acar; talep birakan
  // (BUYER) hicbir kosulda baskasinin iletisimini goremez - gorulecek ilan yok.
  // Eski plan id'leri geriye uyum icin kabul edilir (mevcut uyelik kirilmasin).
  if (role === "BUYER") return false;
  // Faz 3: danisman ayrica Seviye 5 belge onayindan gecmis olmali.
  if (role === "AGENT" && !agentBelgeGecerli(userId)) return false;
  const ids = ["plan-landlord-contact", "plan-seller-contact", "plan-buyer-contact"];
  const ph = ids.map(() => "?").join(",");
  const row = db.prepare(
    `SELECT COUNT(*) AS c FROM entitlements WHERE userId = ? AND (planId IN (${ph}) OR planId = 'plan-pro') AND (activeTo IS NULL OR activeTo >= ?)`
  ).get(userId, ...ids, today());
  return row.c > 0;
}

// Faz 3: danismanin belge durumu iletisim acmaya uygun mu?
// - agentApproved=1 -> belge onaylandi, tamam.
// - Gecis donemi (Okan karari, senaryo #3): 2.0'dan ONCE kayitli danismanlara
//   14 gunluk agentDocDeadline yazildi; sure dolana kadar belgesiz de acabilir.
//   Yeni kayit danismanlarda deadline yoktur -> belge onayi sarttir.
function agentBelgeGecerli(userId) {
  const u = db.prepare("SELECT agentApproved, agentDocDeadline FROM users WHERE id=?").get(userId);
  if (!u) return false;
  if (Number(u.agentApproved) === 1) return true;
  return Boolean(u.agentDocDeadline && u.agentDocDeadline >= today());
}

// MARKA SABITLERI — MASTER (Okan, 31 Tem): tek merkezden yonetilir.
const MARKA = { ad: "Konuttalebi", slogan: "Talep ve Teklif", epostaSlogan: "Sen aramazsın, teklifler sana gelir." };

const SEVIYE5_TIP = "Sorumlu Emlak Danışmanı (Seviye 5)";
// Turkce karakterler farkli Unicode bicimlerinde gelebilir (İ birlesik/ayrik);
// birebir esitlik yerine ayirt edici "Seviye 5" parcasina bakilir.
const seviye5Mi = (t) => String(t || "").includes("Seviye 5");

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
  // E-posta dogrulama durumu users listesine islenir; authAccounts disariya
  // hic verilmiyor (gizlilik), o yuzden bu bilgi burada tasinir.
  const dogrulanmisMap = new Map(
    db.prepare("SELECT userId, emailVerified FROM auth_accounts").all().map((a) => [a.userId, a.emailVerified ? 1 : 0])
  );
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
      // Istege bagli acik rizalar: kisi kendi tercihlerini ayarlardan yonetir,
      // yonetici izin durumunu (ispat geregi) panelde gorur.
      marketingConsent: (self || isAdmin) ? (u.marketingConsent ? 1 : 0) : undefined,
      personalizationConsent: (self || isAdmin) ? (u.personalizationConsent ? 1 : 0) : undefined,
      partnerTransferConsent: (self || isAdmin) ? (u.partnerTransferConsent ? 1 : 0) : undefined,
      // Telefon dogrulama durumu: kendisi ve admin gorur. Karsi tarafa
      // "dogrulanmis uye" bilgisi guven sinyali olarak da gosterilebilir.
      // Fatura bilgisi: kullanici kendi kayitli bilgisini gorur (odemede on dolu
      // gelsin diye), admin de gorur (fatura kesimi icin). Baskasina gitmez.
      invoiceType: (self || isAdmin) ? (u.invoiceType || "") : undefined,
      invoiceTitle: (self || isAdmin) ? (u.invoiceTitle || "") : undefined,
      invoiceTaxNo: (self || isAdmin) ? (u.invoiceTaxNo || "") : undefined,
      invoiceTaxOffice: (self || isAdmin) ? (u.invoiceTaxOffice || "") : undefined,
      invoiceAddress: (self || isAdmin) ? (u.invoiceAddress || "") : undefined,
      invoiceCity: (self || isAdmin) ? (u.invoiceCity || "") : undefined,
      invoiceDistrict: (self || isAdmin) ? (u.invoiceDistrict || "") : undefined,
      phoneVerified: u.phoneVerified ? 1 : 0,
      phoneVerifiedAt: (self || isAdmin) ? (u.phoneVerifiedAt || "") : undefined,
      // Kayit formu 2. adim beyanlari + e-posta dogrulama suresi: kendisi ve admin gorur.
      monthlyIncome: (self || isAdmin) ? (u.monthlyIncome || "") : undefined,
      occupationGroup: (self || isAdmin) ? (u.occupationGroup || "") : undefined,
      emailVerifyDeadline: (self || isAdmin) ? (u.emailVerifyDeadline || "") : undefined,
      emailVerified: (self || isAdmin) ? (dogrulanmisMap.get(u.id) || 0) : undefined,
      // Duvar oncesi kayitli hesaplar: dogrulama zorunlulugu ve aski disinda.
      epostaMuaf: (self || isAdmin) ? (u.epostaMuaf ? 1 : 0) : undefined,
      // Dolu ise aski sebebi sure dolumudur (yonetici karari degil).
      autoSuspendedAt: (self || isAdmin) ? (u.autoSuspendedAt || "") : undefined,
      // Faz 3: danisman belge durumu (kendisi + admin; havuzda rozet icin approved herkese acik).
      agentApproved: u.role === "AGENT" ? (u.agentApproved ? 1 : 0) : undefined,
      agentDocDeadline: (self || isAdmin) ? (u.agentDocDeadline || "") : undefined
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
  // PENDING_VERIFY talepler: misafir akisinda e-posta dogrulanana kadar bekleyen
  // kayitlar. Sahibi ve yonetici gorur; baska hicbir kullaniciya gosterilmez ki
  // dogrulanmamis talepler satici havuzunu kirletmesin.
  const demandsArr = conv(all("demands"), boolFields.demands)
    .filter((d) => (d.status || "ACTIVE") !== "PENDING_VERIFY" || isAdmin || (user && d.buyerId === user.id));
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
    // fileData state'e BILEREK konmaz (megabaytlarca base64 her state cagrisini
    // sisirirdi); dosya ayri uctan indirilir: GET /verification-documents/:id/file
    verificationDocuments: !user
      ? []
      : (() => {
        const q = "SELECT id,userId,type,status,riskScore,reviewedById,reviewedAt,fileName,rejectReason,createdAt, (fileData IS NOT NULL) AS hasFile FROM verification_documents";
        return ["ADMIN", "REVIEWER"].includes(user.role)
          ? db.prepare(q).all()
          : db.prepare(q + " WHERE userId=?").all(user.id);
      })(),
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
    // 2.0: uyenin kayitli kriteri (kendi kaydi) ve iletisim goruntulemeleri.
    // Talep sahibi tarafinda viewerId GONDERILMEZ (anonimlik karari); yalnizca
    // tarih ve talep id gider. Goruntuleyen kendi actiklarini tam gorur.
    savedSearch: user ? (db.prepare("SELECT * FROM saved_searches WHERE userId=?").get(user.id) || null) : null,
    contactViews: !user ? [] : isAdmin
      ? all("contact_views")
      : db.prepare("SELECT id, demandId, ownerId, createdAt, CASE WHEN viewerId=? THEN viewerId ELSE '' END AS viewerId FROM contact_views WHERE viewerId=? OR ownerId=?").all(user.id, user.id, user.id),
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
// ---------- Talep yardimcilari ----------
// Govdeden talep kaydi nesnesi kurar. Iki yerden cagrilir: panelden talep
// olusturma ve misafir talep akisi. Tek kaynak olmasi, iki akisin zamanla
// birbirinden ayrilmasini engeller.
function talepNesnesiKur(body, buyerId) {
  return {
    id: uid("d"), buyerId, title: (body.title || "").trim(), city: body.city || "İstanbul",
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
}

/**
 * Talep basligini otomatik uretir.
 *
 * Kullaniciya baslik yazdirmiyoruz: bir alan daha demek oldugu gibi, elle
 * yazilan basliklar tutarsiz ve genelde bilgisiz oluyor.
 *
 * Ek almayan ayirici bicim kullanilir ("Kadıköy · 2+1 ...") — cunku Turkce'de
 * yer adina bulunma eki getirmek ses uyumuna ve son harfe gore degisir
 * (Kadıköy'de, Ankara'da, Zonguldak'ta) ve yanlis ek marka dilini bozar.
 */
function talepBasligiUret(d) {
  const yer = [d.district, d.city].filter(Boolean)[0] || d.city || "";
  const oda = d.roomCount ? `${d.roomCount} ` : "";
  const ne = (d.transactionType === "RENT") ? "kiralık ev arıyor" : "satılık ev arıyor";
  const butce = (d.minBudget && d.maxBudget)
    ? ` · ${Number(d.minBudget).toLocaleString("tr-TR")}–${Number(d.maxBudget).toLocaleString("tr-TR")} TL`
    : "";
  return `${yer ? yer + " · " : ""}${oda}${ne}${butce}`.slice(0, 160);
}

// Talep kaydini veritabanina yazar. durum: "ACTIVE" | "PENDING_VERIFY"
function talepKaydet(d, imageData, durum) {
  db.prepare("INSERT INTO demands (id,buyerId,title,city,district,neighborhood,propertyType,roomCount,minSqm,maxSqm,minBudget,maxBudget,downPayment,usesCredit,cashReady,exchangePossible,purchaseTimeline,description,privacyLevel,status,viewCount,offerCount,imageData,transactionType,depositAmount,furnished,interiorFeatures,exteriorFeatures,heatingType,buildingAge,floorPref,occupation,neighborhoods,mainCategory,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(d.id, d.buyerId, d.title, d.city, d.district, d.neighborhood, d.propertyType, d.roomCount, d.minSqm, d.maxSqm, d.minBudget, d.maxBudget, d.downPayment, d.usesCredit, d.cashReady, d.exchangePossible, d.purchaseTimeline, d.description, d.privacyLevel, durum, 0, 0, imageData, d.transactionType, d.depositAmount, d.furnished, d.interiorFeatures, d.exteriorFeatures, d.heatingType, d.buildingAge, d.floorPref, d.occupation, d.neighborhoods, d.mainCategory, today());
}

/**
 * Talebi yayina almanin YAN ETKILERI: uygun saticilara bildirim, talep sahibine
 * eslesme bildirimi ve "Talebin yayinda" e-postasi.
 *
 * Neden ayri fonksiyon: panelden olusturulan talepte bunlar aninda calisir;
 * misafir akisinda ise talep once PENDING_VERIFY olarak yazilir ve bu blok
 * ancak e-posta dogrulandiktan sonra calisir. Ayni kodun iki yerde kopyalanmasi
 * zamanla iki akisin farkli davranmasina yol acardi.
 */
// ---------- Faz 4: 60 gun talep suresi (saatlik tarama) ----------
// Modelin can damari taze talep: odeme yapan uyeye bayat havuz gosterilmez.
// Sure COALESCE(renewedAt, createdAt) + 60 gun. 7 gun kala tek seferlik
// "hala ariyor musun?" uyarisi; dolunca PAUSED + yenileme cagrisi.
function talepSuresiTaramasi() {
  const bugun = today();
  const g = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  const aktifler = db.prepare("SELECT id,buyerId,title,createdAt,renewedAt,expiryWarnedAt FROM demands WHERE status='ACTIVE'").all();
  for (const d of aktifler) {
    const baslangic = String(d.renewedAt || d.createdAt || bugun).slice(0, 10);
    if (baslangic <= g(60)) {
      db.prepare("UPDATE demands SET status='PAUSED' WHERE id=?").run(d.id);
      notify(d.buyerId, "DEMAND_EXPIRED", "Talebinin süresi doldu",
        `"${d.title}" 60 günü doldurduğu için yayından alındı. Hâlâ arıyorsan panelinden tek tıkla yenileyebilirsin; talebin yeniden yayına girer.`, "dashboard/alici/talepler");
      queueEmail(d.buyerId, "Talebinin süresi doldu — hâlâ arıyor musan yenile",
        `"${d.title}" talebin 60 günü doldurduğu için yayından alındı. Hâlâ ev arıyorsan panelindeki Taleplerim sayfasından "Yenile" düğmesine basman yeterli — talebin 60 gün daha yayında kalır ve kriterine uyan üyelere yeniden duyurulur.`,
        "dashboard/alici/talepler", "Talep süresi doldu", "Aradığını bulmanı dileriz.", "tx");
    } else if (baslangic <= g(53) && !d.expiryWarnedAt) {
      db.prepare("UPDATE demands SET expiryWarnedAt=? WHERE id=?").run(bugun, d.id);
      notify(d.buyerId, "DEMAND_EXPIRY_SOON", "Hâlâ arıyor musun?",
        `"${d.title}" talebinin süresi 7 gün içinde doluyor. Hâlâ arıyorsan panelinden yenile; bulduysan talebini kapatabilirsin.`, "dashboard/alici/talepler");
      queueEmail(d.buyerId, "Hâlâ arıyor musun? Talebinin süresi doluyor",
        `"${d.title}" talebinin 60 günlük yayın süresi 7 gün içinde doluyor. Hâlâ ev arıyorsan panelindeki Taleplerim sayfasından "Yenile" de — talebin kesintisiz yayında kalır. Aradığını bulduysan hiçbir şey yapmana gerek yok; süre dolunca talebin kendiliğinden yayından kalkar.`,
        "dashboard/alici/talepler", "Talep süresi uyarısı", "Kolay gelsin.", "tx");
    }
  }
}

// ---------- Okan istegi (31 Tem): dogum gunu kutlama maili ----------
// Her sabah TR saatiyle ~09:00'da (06 UTC penceresi) o gun dogmus uyelere
// kutlama gider. Yilda bir kez (birthdayMailedAt yil kontrolu). Dogum tarihi
// kimlik dogrulama amaciyla alindigi icin kutlama yalnizca PAZARLAMA iznine
// benzer sekilde notifyMatch izni acik uyelere gider; ayar kapaliysa gitmez.
function dogumGunuTaramasi() {
  if (new Date().getUTCHours() !== 6) return; // gunun tek penceresi
  const bugun = today();                       // YYYY-MM-DD
  const ayGun = bugun.slice(5);                // MM-DD
  const yil = bugun.slice(0, 4);
  const kisiler = db.prepare(
    "SELECT id,name FROM users WHERE birthDate IS NOT NULL AND substr(birthDate,6,5)=? AND status='ACTIVE' AND role<>'ADMIN'"
  ).all(ayGun);
  let n = 0;
  for (const u of kisiler) {
    const son = db.prepare("SELECT birthdayMailedAt FROM users WHERE id=?").get(u.id).birthdayMailedAt || "";
    if (son.slice(0, 4) === yil) continue;     // bu yil zaten kutlandi
    if (!mailIzniVar(u.id, "match")) continue; // bildirim tercihi kapaliysa gitmez
    db.prepare("UPDATE users SET birthdayMailedAt=? WHERE id=?").run(bugun, u.id);
    queueEmail(u.id, `Mutlu Yıllar 🎂`,
      `Bugün senin günün. Doğum gününü içtenlikle kutluyor; yeni yaşının sağlık, mutluluk, huzur ve güzel gelişmelerle dolu olmasını diliyoruz.\n\nKonuttalebi olarak, yeni yaşında aradığın eve kavuşma yolculuğunda da yanındayız. Nice mutlu yaşlara!`,
      "dashboard", "Doğum günü kutlaması", "", "match");
    n++;
  }
  if (n) console.log(`[mail] dogum gunu kutlamasi gonderildi: ${n} uye`);
}

// Faz 4: gercekdisi talep bayragi — basit kurallar (senaryo karari).
// Supheli talep yayina CIKMAZ: PAUSED kalir, admin onayina duser.
function talepSupheliMi(d) {
  const kira = (d.transactionType || "SALE") === "RENT";
  const max = +d.maxBudget || 0;
  if (kira && max > 0 && max < 2000) return "Aylık kira üst sınırı gerçekçi değil (2.000 TL altı).";
  if (!kira && max > 0 && max < 250000) return "Satın alma bütçesi gerçekçi değil (250 bin TL altı).";
  return "";
}

function talebiYayinaAl(d) {
  // Faz 4: supheli talep yayilmadan durdurulur.
  const suphe = talepSupheliMi(d);
  if (suphe) {
    db.prepare("UPDATE demands SET status='PAUSED' WHERE id=?").run(d.id);
    db.prepare("INSERT INTO abuse_signals (id,userId,type,score,metadata,createdAt) VALUES (?,?,?,?,?,?)")
      .run(uid("ab"), d.buyerId, "SUSPICIOUS_DEMAND", 60, `${d.id}: ${suphe}`, today());
    notify(d.buyerId, "DEMAND_UNDER_REVIEW", "Talebin incelemeye alındı",
      "Talebindeki bütçe bilgisi kontrol gerektiriyor. İncelendikten sonra yayına alınacak; gerekirse talebini düzenleyebilirsin.", "dashboard/alici/talepler");
    const admins = db.prepare("SELECT id FROM users WHERE role='ADMIN'").all();
    for (const a of admins) notify(a.id, "DEMAND_FLAGGED", "İncelenecek talep",
      `"${d.title}" — ${suphe}`, "dashboard/admin/talepler");
    addAudit(d.buyerId, "DEMAND_FLAGGED", "Demand", d.id, suphe);
    return;
  }
  // 2.0: Ilan kalkti. Eslesme artik "talep <-> uyenin kayitli kriteri".
  // Kriterine uyan her uyeye bildirim + (izinliyse) e-posta ozeti gider.
  const kriterler = db.prepare("SELECT * FROM saved_searches").all();
  let matchCount = 0;
  for (const k of kriterler) {
    if (k.userId === d.buyerId) continue;
    if (k.tx && k.tx !== (d.transactionType || "SALE")) continue;
    let iller = [];
    try { iller = JSON.parse(k.cities || "[]"); } catch { iller = []; }
    if (iller.length && !iller.includes(d.city)) continue;
    if (k.mainCategory && k.mainCategory !== (d.mainCategory || "Konut")) continue;
    // Butce kesisimi: kriterde aralik tanimliysa taleple ortusmeli.
    if (k.minBudget && (+d.maxBudget || 0) && (+d.maxBudget || 0) < k.minBudget) continue;
    if (k.maxBudget && (+d.minBudget || 0) > k.maxBudget) continue;
    matchCount++;
    const metin = `${d.title} — aradığın profile uyan yeni bir talep yayında.`;
    notify(k.userId, "NEW_MATCHABLE_DEMAND", "Kriterine uyan yeni talep", metin, "dashboard/satici/talepler");
    queueDigest(k.userId, "demand", "Kriterine uyan yeni talep", metin, "dashboard/satici/talepler");
  }
  if (matchCount > 0) {
    notify(d.buyerId, "MATCH_FOUND", "Talebin duyuruldu", `Talebin, kriterine uyan ${matchCount} üyeye bildirildi. İlgilenen üye iletişim bilgini görüntülediğinde haber vereceğiz.`, "");
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
  return matchCount;
}

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
    izinleriKaydet(id, body);
    saveIdentity(id, kimlik);
    saveAttribution(id, body.attribution);
    db.prepare("INSERT INTO auth_accounts (userId,email,passwordHash,emailVerified,createdAt,lastLoginAt) VALUES (?,?,?,?,?,?)")
      .run(id, email, hashPassword(password), 0, today(), today());
    if (role === "BUYER")
      db.prepare("INSERT INTO buyer_profiles (userId,verificationLevel,badge,budgetTrustScore,profileCompletion,declaredBudgetMin,declaredBudgetMax,declaredDownPayment,declaredCashReady,declaredUsesCredit) VALUES (?,?,?,?,?,?,?,?,?,?)")
        .run(id, "Bütçe Beyanı Bekleniyor", "neutral", 35, 20, 0, 0, 0, 0, 0);
    notify(id, "WELCOME", "Üyeliğin oluşturuldu", "Panelin hazır.", "");
    queueEmail(id, "Konuttalebi'ne hoş geldin", welcomeBody(), dashboardPathForRole(role), "Yeni üyelik karşılama", "Bir sorunda bu e-postayı yanıtlaman yeterli. Yanındayız.");
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
    // Sure dolumu nedeniyle OTOMATIK askiya alinanlar giris yapabilir: aksi halde
    // dogrulama ekranina ulasip kendi kendine cozemezler. Yoneticinin elle
    // askiya aldigi hesaplar (autoSuspendedAt bos) giremez.
    if (!u) return err(res, 401, "E-posta veya şifre hatalı.");
    if (u.status !== "ACTIVE" && !u.autoSuspendedAt) return err(res, 403, "Bu üyelik aktif değil.");
    db.prepare("UPDATE auth_accounts SET lastLoginAt = ? WHERE userId = ?").run(today(), u.id);
    addAudit(u.id, "USER_LOGGED_IN", "User", u.id, "Giriş yapıldı.");
    // E-postasi dogrulanmamis ve hic baglanti almamis eski uyeler: girise
    // calistigi anda baglanti gonderilir ki duvarda kilitli kalmasin.
    // Muaf hesaplara dokunulmaz.
    if (!acc.emailVerified && !u.epostaMuaf && !db.prepare("SELECT emailVerifyDeadline FROM users WHERE id=?").get(u.id).emailVerifyDeadline) {
      try { epostaDogrulamaBaslat(u.id, u.email || acc.email, u.name); } catch { /* giris akisini bozma */ }
    }
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
    izinleriKaydet(id, body);
    saveIdentity(id, kimlik);
    saveAttribution(id, body.attribution);
    // Sifre yok: saglayici Google. E-posta Google tarafindan dogrulanmis kabul edilir.
    db.prepare("INSERT INTO auth_accounts (userId,email,passwordHash,emailVerified,createdAt,lastLoginAt,provider) VALUES (?,?,?,?,?,?,?)")
      .run(id, email, "", 1, today(), today(), "google");
    if (role === "BUYER")
      db.prepare("INSERT INTO buyer_profiles (userId,verificationLevel,badge,budgetTrustScore,profileCompletion,declaredBudgetMin,declaredBudgetMax,declaredDownPayment,declaredCashReady,declaredUsesCredit) VALUES (?,?,?,?,?,?,?,?,?,?)")
        .run(id, "Bütçe Beyanı Bekleniyor", "neutral", 35, 20, 0, 0, 0, 0, 0);
    notify(id, "WELCOME", "Üyeliğin oluşturuldu", "Panelin hazır.", "");
    queueEmail(id, "Konuttalebi'ne hoş geldin", welcomeBody(), dashboardPathForRole(role), "Yeni üyelik karşılama", "Bir sorunda bu e-postayı yanıtlaman yeterli. Yanındayız.");
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
        const html = `<div style="margin:0 auto;max-width:560px;background:#f8fafc;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">
            <tr><td style="padding:22px 26px;border-bottom:1px solid #e2e8f0">
              <div style="color:#020617;font-size:17px;font-weight:700;letter-spacing:-.2px">${MARKA.ad}</div>
              <div style="color:#b08a35;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-top:2px">${MARKA.slogan}</div>
            </td></tr>
            <tr><td style="padding:26px">
              <h2 style="margin:0 0 12px;font-size:19px;color:#020617">Şifre sıfırlama</h2>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#41556d">Merhaba ${escapeHtmlSrv(u.name || "")},</p>
              <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#41556d">Konuttalebi hesabının şifresini sıfırlamak için aşağıdaki butona tıkla. Bağlantı <b>1 saat</b> geçerlidir ve yalnızca bir kez kullanılabilir.</p>
              <div style="text-align:center;margin:22px 0"><a href="${link}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:10px">Şifremi sıfırla</a></div>
              <p style="color:#64748b;font-size:13px;line-height:1.6">Buton çalışmazsa bu bağlantıyı tarayıcına yapıştır:<br>${link}</p>
              <p style="color:#64748b;font-size:13px;line-height:1.6">Bu talebi sen yapmadıysan bu e-postayı yok sayabilirsin; şifren değişmez.</p>
            </td></tr>
            <tr><td style="background:#f8fafc;padding:18px 26px;font-size:12px;line-height:1.6;color:#64748b;border-top:1px solid #e2e8f0">
              <p style="margin:0 0 8px;color:#020617;font-weight:600;font-size:13px">${MARKA.ad} Ekibi<br><span style="color:#64748b;font-weight:500;font-style:italic">&ldquo;${MARKA.epostaSlogan}&rdquo;</span></p>
              Sorun yaşarsan bu e-postayı yanıtlayabilir ya da <a href="mailto:${escapeHtmlSrv(MAIL_REPLY_TO())}" style="color:#41556d">${escapeHtmlSrv(MAIL_REPLY_TO())}</a> adresine yazabilirsin.
            </td></tr>
          </table>
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
    // Kural kayittakiyle AYNI olmali: eskiden burada "en az 6 karakter" yaziyordu,
    // yani sifirlama yoluyla kayit kuralindan zayif sifre belirlenebiliyordu.
    const sifreHatasi = sifreGecerliMi(password);
    if (sifreHatasi) return err(res, 400, sifreHatasi);
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
    // 2.0: ilan vitrini kapandi. Eski istemci onbellekleri hata almasin diye
    // bos liste doner (410 degil - vitrin bileseni sessizce bos gosterir).
    return ok(res, { items: [] });
  }
  if (false) {
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
  // --- MISAFIR TALEP: tek cagrida hesap + talep (giris gerektirmez) ---
  //
  // NEDEN: Once uyelik isteyen akista kiracinin onune bos bir giris ekrani
  // cikiyordu ve reklamdan gelen trafigin neredeyse tamami geri donuyordu.
  // Bu ucta sira tersine cevrilir: kisi formu doldurur, hesap ve talep AYNI
  // istekte olusur. Talep "PENDING_VERIFY" durumunda bekler; e-posta
  // dogrulanmadan ne yayina girer, ne aramada gorunur, ne sayaca yazilir.
  //
  // Hesap ve talep tek islemde olusturuldugu icin e-posta dogrulama duvarina
  // takilmaz — duvar yalnizca sonraki isteklerde devreye girer.
  if (seg[0] === "kayit" && seg[1] === "talep" && method === "POST") {
    if (!rateLimit(`misafir-talep-ip:${clientIp(req)}`, 5, 60 * 60 * 1000))
      return err(res, 429, "Çok fazla talep denemesi. Lütfen bir süre sonra tekrar dene.");

    const name = (body.name || "").trim();
    const email = norm(body.email);
    const phone = (body.phone || "").trim();
    // SIFRESIZ MISAFIR AKISI (2026-08-03, Okan onayi)
    // Onceki durum: kullanici 7 soruyu doldurduktan sonra bir de sifre uyduruyordu.
    // Oysa dogrulama baglantisina tiklandiginda oturum zaten aciliyor (asagida).
    // Sifre gonderilmezse rastgele guclu bir deger yazilir; kullanici isterse
    // "Sifremi unuttum" ile kendi sifresini belirler. Gonderilirse eski kural isler.
    const password = body.password || (randomBytes(18).toString("base64url") + "Aa1");
    if (name.length < 3) return err(res, 400, "Adını ve soyadını yaz.");
    if (!email.includes("@")) return err(res, 400, "Geçerli bir e-posta adresi yaz.");
    if (!normalizePhone(phone)) return err(res, 400, "Geçerli bir cep telefonu numarası gir (5xx xxx xx xx).");
    if (body.password) {
      const sifreHata = sifreGecerliMi(body.password);
      if (sifreHata) return err(res, 400, sifreHata);
    }
    if (!body.termsAccepted) return err(res, 400, "Devam etmek için kullanım koşullarını ve KVKK metnini onaylaman gerekiyor.");
    if (db.prepare("SELECT 1 FROM auth_accounts WHERE email = ?").get(email))
      return err(res, 409, "Bu e-posta ile kayıtlı bir üyelik var. Giriş yapıp talebini oradan oluşturabilirsin.");

    // Kimlik alanlari hesap acilmadan ONCE dogrulanir ki yarim kayit olusmasin.
    const kimlik = prepareIdentity(body, null);
    if (!kimlik.ok) return err(res, 400, kimlik.error);

    // Talep gecerliligi hesap acmadan once kontrol edilir: gecersiz formda
    // ortada sahipsiz bir uyelik kalmasin.
    const gecici = talepNesnesiKur(body, "gecici");
    // Faz 4: ayni sayfa iki modda calisir — kiralik (varsayilan) ve satin alma.
    const misafirTx = body.transactionType === "SALE" ? "SALE" : "RENT";
    gecici.transactionType = misafirTx;
    let krediCevap = null;
    if (misafirTx === "SALE") {
      krediCevap = body.creditInterest === "EVET" ? "EVET" : body.creditInterest === "HAYIR" ? "HAYIR" : null;
      if (!krediCevap) return err(res, 400, "Banka kredisi sorusunu yanıtla (Evet veya Hayır).");
    }
    if (!gecici.minBudget || !gecici.maxBudget || gecici.maxBudget < gecici.minBudget)
      return err(res, 400, misafirTx === "RENT" ? "Geçerli bir aylık kira aralığı gir." : "Geçerli bir bütçe aralığı gir.");
    if (!gecici.city) return err(res, 400, "Hangi ilde ev aradığını seç.");

    const uid_ = uid("u");
    const marketingConsent = body.marketingConsent ? 1 : 0;
    db.prepare("INSERT INTO users (id,role,name,email,phone,city,status,trustScore,createdAt,marketingConsent,occupationGroup,phoneVerified,phoneVerifiedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .run(uid_, "BUYER", name, email, phone, gecici.city, "ACTIVE", 54, today(), marketingConsent,
        (body.occupation || "").toString().slice(0, 40), 0, null);
    izinleriKaydet(uid_, body);
    saveIdentity(uid_, kimlik);
    saveAttribution(uid_, body.attribution);
    db.prepare("INSERT INTO auth_accounts (userId,email,passwordHash,emailVerified,createdAt,lastLoginAt) VALUES (?,?,?,?,?,?)")
      .run(uid_, email, hashPassword(password), 0, today(), today());
    db.prepare("INSERT INTO buyer_profiles (userId,verificationLevel,badge,budgetTrustScore,profileCompletion,declaredBudgetMin,declaredBudgetMax,declaredDownPayment,declaredCashReady,declaredUsesCredit) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .run(uid_, "Bütçe Beyanı Bekleniyor", "neutral", 35, 20, gecici.minBudget, gecici.maxBudget, 0, 0, 0);
    addAudit(uid_, "USER_REGISTERED", "User", uid_, "BUYER üyeliği misafir talep akışıyla oluşturuldu.");

    // Talep, kullanicinin gercek id'siyle yeniden kurulur ve BEKLEMEDE yazilir.
    const d = talepNesnesiKur(body, uid_);
    d.transactionType = misafirTx; // Faz 4: RENT veya SALE
    if (!d.title) d.title = talepBasligiUret(d);
    talepKaydet(d, cleanImage(body.imageData), "PENDING_VERIFY");
    if (krediCevap) db.prepare("UPDATE demands SET creditInterest=? WHERE id=?").run(krediCevap, d.id);
    addAudit(uid_, "DEMAND_CREATED_PENDING", "Demand", d.id, `${d.title} — e-posta doğrulaması bekliyor.`);

    // Dogrulama baglantisi. Hos geldin maili GONDERILMEZ: dogrulanana kadar
    // kisiye tek bir mail gitsin, kafa karismasin.
    epostaDogrulamaBaslat(uid_, email, name);
    return ok(res, { userId: uid_, demandId: d.id, email });
  }

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
    let askiKalkti = false;
    let yayinaAlinan = 0;
    let ekBaslik = {};
    if (gecerli) {
      db.prepare("UPDATE email_verifications SET usedAt=? WHERE tokenHash=?").run(now(), tokenHash);
      db.prepare("UPDATE auth_accounts SET emailVerified=1 WHERE userId=?").run(kayit.userId);
      addAudit(kayit.userId, "EMAIL_VERIFIED", "User", kayit.userId, kayit.email || "");
      notify(kayit.userId, "EMAIL_VERIFIED", "E-postan doğrulandı", "Üyeliğin tamamlandı.", "");
      // Sure dolumu nedeniyle askidaysa aski burada kendiliginden kalkar.
      askiKalkti = otomatikAskiyiKaldir(kayit.userId);
      if (askiKalkti)
        notify(kayit.userId, "ACCOUNT_REACTIVATED", "Üyeliğin yeniden aktif",
          "E-postanı doğruladın, hesabın yeniden kullanıma açıldı.", "");

      // MISAFIR TALEP AKISI: beklemede duran talepler burada yayina girer.
      // Eslesme taramasi, saticilara bildirim ve "Talebin yayinda" e-postasi
      // panelden olusturulan taleple birebir ayni kodu kullanir.
      const bekleyenler = db.prepare("SELECT * FROM demands WHERE buyerId=? AND status='PENDING_VERIFY'").all(kayit.userId);
      for (const bekleyen of bekleyenler) {
        db.prepare("UPDATE demands SET status='ACTIVE' WHERE id=?").run(bekleyen.id);
        addAudit(kayit.userId, "DEMAND_PUBLISHED", "Demand", bekleyen.id, "E-posta doğrulandı, talep yayına alındı.");
        try { talebiYayinaAl({ ...bekleyen, status: "ACTIVE" }); }
        catch (e) { console.error("[talep] yayina alma hatasi:", e && e.message); }
      }
      yayinaAlinan = bekleyenler.length;

      // Kisi dogrulama baglantisina tikladiktan sonra tekrar giris yapmak
      // zorunda kalmasin: oturum burada aciliyor.
      try {
        const oturum = randomUUID();
        db.prepare("INSERT INTO sessions (token,userId,createdAt) VALUES (?,?,?)").run(oturum, kayit.userId, new Date().toISOString());
        ekBaslik = { "Set-Cookie": `kt_session=${oturum}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800` };
      } catch { /* oturum acilamazsa kullanici elle giris yapar */ }
    }
    const govde = gecerli
      ? yayinaAlinan > 0
        ? `<h1>Talebin yayında</h1><p>E-postanı doğruladın ve talebin yayına alındı. Artık ev sahipleri sana teklif gönderebilir.</p>
           <p class="small">Girişin açık — aşağıdaki butonla talebini görebilir, dilediğin zaman düzenleyebilirsin.</p>`
        : `<h1>E-postan doğrulandı</h1><p>${askiKalkti
          ? "Üyeliğinin askısı kalktı, hesabın yeniden kullanıma açıldı."
          : "Üyeliğin tamamlandı. Panelinden devam edebilirsin."}</p>`
      : kayit && kayit.usedAt
        ? `<h1>Zaten doğrulanmış</h1><p>Bu bağlantı daha önce kullanılmış. Giriş yapabilirsin.</p>`
        : suresiDolmus
          ? `<h1>Bağlantının süresi doldu</h1><p>Doğrulama bağlantısı ${EPOSTA_SURE_SAAT} saat geçerlidir.</p>
             <p class="small">Giriş yapıp panelindeki uyarıdan yeni bağlantı isteyebilirsin.</p>`
          : `<h1>Bağlantı geçersiz</h1><p>Bu bağlantı tanınmadı.</p>`;
    const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Konuttalebi | E-posta doğrulama</title>
<meta name="robots" content="noindex"><link rel="icon" href="/favicon.ico" sizes="any">
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;color:#020617;
font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;padding:24px}
.box{max-width:520px;text-align:center}h1{font-size:24px;margin:0 0 12px}p{line-height:1.65;color:#475569;margin:0 0 12px}
.small{font-size:13.5px;color:#64748b}a.btn{display:inline-block;margin-top:14px;background:#4f46e5;color:#ffffff;
text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px}</style>
${yayinaAlinan > 0 ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${OLCUM.ads}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${OLCUM.ads}');
  gtag('config', '${OLCUM.ga4}');
  /* ASIL DONUSUM: talep yayina girdi. Form gonderiminde degil BURADA sayilir —
     ev sahibinin karsiligini gordugu sey dogrulanmis talep. */
  gtag('event', 'conversion', { send_to: '${OLCUM.ads}/${OLCUM.talepDonusumEtiketi}', currency: 'TRY', value: 1.0 });
  gtag('event', 'kt_talep_dogrulandi', { send_to: ['${OLCUM.ga4}', '${OLCUM.ads}'], akis: 'misafir' });
</script>` : ""}</head>
<body><div class="box">${govde}<a class="btn" href="${BASE_URL}/#/${yayinaAlinan > 0 ? "dashboard/alici/taleplerim" : "giris"}">${yayinaAlinan > 0 ? "Talebimi gör" : "Giriş yap"}</a></div></body></html>`;
    res.writeHead(gecerli || kayit ? 200 : 400, { "Content-Type": "text/html; charset=utf-8", ...ekBaslik });
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
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;color:#020617;
font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;padding:24px}
.box{max-width:520px;text-align:center}h1{font-size:24px;margin:0 0 12px}p{line-height:1.65;color:#475569;margin:0 0 12px}
.small{font-size:13.5px;color:#64748b}a.btn{display:inline-block;margin-top:14px;background:#4f46e5;color:#ffffff;
text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px}</style></head>
<body><div class="box">${govde}<a class="btn" href="${BASE_URL}/">Konuttalebi'ne dön</a></div></body></html>`;
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
    notify(user.id, "PHONE_VERIFIED", "Telefonun doğrulandı", "Artık talep oluşturabilir ve talep sahiplerinin iletişim bilgisini görüntüleyebilirsin.", "");
    return ok(res, { verified: true });
  }

  // --- admin: e-posta hatirlatma taramasini elle calistir ---
  if (seg[0] === "admin" && seg[1] === "eposta-hatirlat" && method === "POST") {
    if (user.role !== "ADMIN") return err(res, 403, "Bu işlem için yetkiniz yok.");
    const { hatirlatilan, askiyaAlinan } = await epostaTaramasi();
    addAudit(user.id, "ADMIN_EMAIL_REMINDER_RUN", "User", user.id,
      `${hatirlatilan} kişiye hatırlatma gönderildi, ${askiyaAlinan} hesap askıya alındı.`);
    return ok(res, { sent: hatirlatilan, suspended: askiyaAlinan });
  }

  // --- E-POSTA DOGRULAMA DUVARI ---
  // Dogrulamayan kullanici sitede hicbir islem yapamaz. Okuma (GET) serbesttir ki
  // dogrulama ekrani ve kendi durumu gorunebilsin; e-posta uclari ve cikis her
  // zaman aciktir. ADMIN muaftir — yonetici kendini disarida birakmasin.
  // Duvar devreye girmeden once kayitli olan hesaplar muaftir (users.epostaMuaf).
  const epostaMuaf = user.role === "ADMIN"
    || method === "GET"
    || seg[0] === "eposta"
    || seg[0] === "logout"
    || Boolean(user.epostaMuaf);
  if (!epostaMuaf) {
    const hesap = db.prepare("SELECT emailVerified FROM auth_accounts WHERE userId=?").get(user.id);
    if (hesap && !hesap.emailVerified)
      return err(res, 403, "Devam etmek için e-posta adresini doğrulaman gerekiyor. Gelen kutunu kontrol et.");
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

  // --- acik riza tercihleri (giris gerekli) ---
  // Kullanici kayitta verdigi (veya vermedigi) istege bagli izinleri sonradan
  // degistirebilmeli - KVKK'da rizanin geri alinabilirligi sarttir. Her
  // degisiklik izinleriKaydet uzerinden denetim kaydina duser.
  if (seg[0] === "izinler" && method === "PATCH") {
    izinleriKaydet(user.id, {
      marketingConsent: body.marketingConsent,
      personalizationConsent: body.personalizationConsent,
      partnerTransferConsent: body.partnerTransferConsent,
    });
    return ok(res);
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
  // seg.length === 1 sarti kritik: /demands/:id/contact da POST'tur ve bu blok
  // onda calisirsa iletisim ucu hic erisilemez (2026-07-31 testinde yakalandi).
  if (seg[0] === "demands" && method === "POST" && seg.length === 1) {
    if (user.role !== "BUYER") return err(res, 403, "Sadece alıcı talep oluşturabilir.");
    // Telefon dogrulamasi: kayit sonrasi ILK islemde istenir.
    if (requirePhone(res, user)) return;
    const d = talepNesnesiKur(body, user.id);
    if (!d.title || !d.minBudget || !d.maxBudget || d.maxBudget < d.minBudget || d.description.length < 20)
      return err(res, 400, "Başlık, geçerli bütçe ve en az 20 karakter açıklama gerekli.");
    talepKaydet(d, cleanImage(body.imageData), "ACTIVE");
    // Faz 4: ev almak isteyene banka kredisi sorusu (EVET/HAYIR; veri bankasi stratejisi).
    if ((d.transactionType || "SALE") === "SALE" && ["EVET", "HAYIR"].includes(body.creditInterest))
      db.prepare("UPDATE demands SET creditInterest=? WHERE id=?").run(body.creditInterest, d.id);
    talebiYayinaAl(d);
    addAudit(user.id, "DEMAND_CREATED", "Demand", d.id, d.title);
    return ok(res, { id: d.id });
  }

  /* =========================================================================
     2.0 "YALNIZ TALEP" MODELI (2026-07-31, Okan onayli senaryo)
     -------------------------------------------------------------------------
     Ilan (arz) ve site ici iletisim akislari KAPANDI:
     - Ilan eklenmez, teklif gonderilmez, eslesme onayi ve mesajlasma yok.
     - Yerine tek akis: odeme yapan uye (bireysel) veya odeme + admin onayli
       danisman, talep sahibinin telefon/e-postasini dogrudan gorur ve arar.
     - "Eslesme" yeni tanimiyla yasiyor: uye kriter kaydeder (saved_searches),
       kritere uyan yeni talep yayina girince bildirim alir.
     Kapatilan uclar 410 "Gone" doner ki eski istemci onbellekleri anlasilir
     bir mesaj gorsun; sessiz 404 kafa karistirirdi.
     ========================================================================= */
  const MODEL2_MESAJ = "Konuttalebi yenilendi: artık ilan ve teklif yok. Talepleri görüntüleyip iletişim bilgisini ücretli üyelikle açabilirsin.";
  if (seg[0] === "properties" && method === "POST") return err(res, 410, MODEL2_MESAJ);
  if (seg[0] === "offers" && method === "POST") return err(res, 410, MODEL2_MESAJ);
  if (seg[0] === "matches" && seg[2] === "messages" && method === "POST") return err(res, 410, MODEL2_MESAJ);
  if (seg[0] === "matches" && seg[2] === "approve" && method === "POST") return err(res, 410, MODEL2_MESAJ);

  // --- kriter: "aradigim talepler" (giris gerekli; SELLER/AGENT) ---
  // Uye tek kriter seti tutar; yeni talep bu kritere uyarsa eslesme bildirimi alir.
  if (seg[0] === "kriter" && method === "PUT") {
    if (!["SELLER", "AGENT"].includes(user.role)) return err(res, 403, "Kriter kaydı yalnızca üye tarafı içindir.");
    const tx = body.tx === "RENT" || body.tx === "SALE" ? body.tx : "";
    const cities = Array.isArray(body.cities) ? body.cities.slice(0, 10).map((c) => String(c).slice(0, 40)) : [];
    const mainCategory = MAIN_CATS.includes(body.mainCategory) ? body.mainCategory : "";
    db.prepare(`INSERT INTO saved_searches (userId,tx,cities,mainCategory,minBudget,maxBudget,updatedAt)
      VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(userId) DO UPDATE SET tx=excluded.tx, cities=excluded.cities,
        mainCategory=excluded.mainCategory, minBudget=excluded.minBudget,
        maxBudget=excluded.maxBudget, updatedAt=excluded.updatedAt`)
      .run(user.id, tx, JSON.stringify(cities), mainCategory, +body.minBudget || 0, +body.maxBudget || 0, now());
    addAudit(user.id, "SAVED_SEARCH_UPDATED", "User", user.id, `Kriter: ${tx || "hepsi"} · ${cities.join(", ") || "tüm iller"}`);
    return ok(res);
  }

  // --- iletisimi gor: modelin yeni kalbi (giris gerekli) ---
  // --- Faz 4: talebi yenile (60 gunluk sureyi bastan baslatir) ---
  if (seg[0] === "demands" && seg[2] === "renew" && method === "POST") {
    const d = db.prepare("SELECT * FROM demands WHERE id=?").get(seg[1]);
    if (!d) return err(res, 404, "Talep bulunamadı.");
    if (d.buyerId !== user.id && user.role !== "ADMIN") return err(res, 403, "Yalnızca talep sahibi yenileyebilir.");
    if (d.status === "REMOVED") return err(res, 400, "Bu talep yönetici tarafından kaldırılmış; yenilenemez.");
    db.prepare("UPDATE demands SET status='ACTIVE', renewedAt=?, expiryWarnedAt=NULL WHERE id=?").run(today(), d.id);
    addAudit(user.id, "DEMAND_RENEWED", "Demand", d.id, "Talep yenilendi; 60 günlük süre yeniden başladı.");
    return ok(res);
  }

  // --- Faz 4: talep sikayeti (havuzdaki Bildir dugmesi) ---
  if (seg[0] === "demands" && seg[2] === "report" && method === "POST") {
    if (!rateLimit(`sikayet:${user.id}`, 5, 60 * 60 * 1000)) return err(res, 429, "Çok fazla şikayet gönderdin; bir süre sonra tekrar dene.");
    const d = db.prepare("SELECT id,buyerId,title FROM demands WHERE id=?").get(seg[1]);
    if (!d) return err(res, 404, "Talep bulunamadı.");
    const sebep = String(body.reason || "").trim().slice(0, 60) || "Belirtilmedi";
    const aciklama = String(body.description || "").trim().slice(0, 500);
    db.prepare("INSERT INTO complaints (id,reporterId,reportedUserId,reason,description,status,priority,createdAt) VALUES (?,?,?,?,?,?,?,?)")
      .run(uid("c"), user.id, d.buyerId, sebep, `Talep: ${d.title} (${d.id}). ${aciklama}`, "OPEN", "Orta", today());
    addAudit(user.id, "COMPLAINT_CREATED", "Demand", d.id, sebep);
    return ok(res);
  }

  // Kosullar: SELLER/AGENT rolu + aktif iletisim uyeligi (admin muaf).
  // Danisman belge onayi Faz 3'te devreye girecek (14 gun gecis karari).
  if (seg[0] === "demands" && seg[2] === "contact" && method === "POST") {
    if (!["SELLER", "AGENT"].includes(user.role) && user.role !== "ADMIN")
      return err(res, 403, "İletişim bilgisini yalnızca üye tarafı (ev sahibi/evine alıcı arayan/danışman) görüntüleyebilir.");
    const d = db.prepare("SELECT * FROM demands WHERE id=?").get(seg[1]);
    if (!d || d.status !== "ACTIVE") return err(res, 404, "Talep bulunamadı veya yayında değil.");
    if (d.buyerId === user.id) return err(res, 400, "Bu talep zaten sana ait.");
    // Faz 3: danismanin belge engeli uyelik engelinden AYRI anlatilir ki
    // kullanici yanlislikla paket satin almaya yonlendirilmesin.
    if (user.role === "AGENT" && !agentBelgeGecerli(user.id))
      return err(res, 403, "Sorumlu Emlak Danışmanı (Seviye 5) belgen onaylanmadan iletişim bilgisi görüntüleyemezsin. Belgeni panelindeki Danışman Doğrulama sayfasından yükleyebilirsin.");
    if (user.role !== "ADMIN" && !hasContactMembership(user.id, user.role))
      return err(res, 402, "İletişim bilgisini görmek için aktif bir üyelik gerekiyor. Paketleri fiyatlandırma sayfasında bulabilirsin.");
    const sahip = db.prepare("SELECT name,phone,email FROM users WHERE id=?").get(d.buyerId);
    if (!sahip) return err(res, 404, "Talep sahibi bulunamadı.");
    // Ayni uye ayni talebe ikinci kez bakarsa: kayit ve bildirim TEKRARLANMAZ,
    // bilgiler yeniden gosterilir (paket sinirsiz goruntuleme icerir).
    const onceki = db.prepare("SELECT 1 FROM contact_views WHERE viewerId=? AND demandId=?").get(user.id, d.id);
    if (!onceki) {
      db.prepare("INSERT INTO contact_views (id,viewerId,demandId,ownerId,createdAt) VALUES (?,?,?,?,?)")
        .run(uid("cv"), user.id, d.id, d.buyerId, now());
      addAudit(user.id, "CONTACT_VIEWED", "Demand", d.id, `Talep sahibinin iletişimi görüntülendi (talep: ${d.title}).`);
      // Talep sahibine ANONIM haber (Okan karari: kim baktigi soylenmez).
      notify(d.buyerId, "CONTACT_VIEWED", "İletişim bilgin görüntülendi",
        `"${d.title}" talebindeki iletişim bilgin bir üye tarafından görüntülendi. Yakında aranabilirsin.`, "");
      const sahipMail = db.prepare("SELECT name,email FROM users WHERE id=?").get(d.buyerId);
      if (sahipMail && sahipMail.email && mailIzniVar(d.buyerId, "match")) {
        Promise.resolve().then(() => deliverEmail(d.buyerId, sahipMail.email, sahipMail.name,
          "Konuttalebi — İletişim bilgin görüntülendi",
          notificationEmailHtml(sahipMail.name, "İletişim bilgin görüntülendi",
            [`"${d.title}" talebindeki iletişim bilgin bir üye tarafından görüntülendi.`,
              "Yakında telefonla aranabilir veya e-posta alabilirsin. Görüşme, pazarlık ve anlaşma tamamen sizin aranızda gerçekleşir.",
              "Talebini panelinden dilediğin an yayından kaldırabilirsin."
            ].join("\n\n"), `${BASE_URL}/#/dashboard/alici/taleplerim`, "Talebimi yönet", d.buyerId),
          "İletişim görüntülenme bildirimi")).catch(() => {});
      }
    }
    return ok(res, { name: sahip.name, phone: sahip.phone, email: sahip.email });
  }

  // --- ilan olustur (2.0'da KAPALI - ulasilmaz, tarihce icin duruyor) ---
// [Faz 5] POST /properties (eski) govdesi silindi - 2.0 sonrasi 410 donen uc.


  // --- teklif gonder ---
  // [2026-08-03] Olu 1.0 uclari silindi: POST /offers, /offers/:id/respond,
  // /matches/:id/messages, /matches/:id/approve. Bu uclara zaten satir ~2215'teki
  // 410 kapisi yaniti veriyordu (2.0'da teklif ve eslesme akisi yok); asagidaki
  // kod erisilemezdi ve denetimlerde yanlis alarma sebep oluyordu.

  // --- teklife yanit (ilgileniyorum vb.) ---

  // --- mesaj gonder (sunucu tarafi maskeleme) ---

  // --- iletisim onayi (uyelik + cift onay kurali) ---

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

// --- Fatura bilgisi dogrulama (2026-08-03) --------------------------------
// Odeme alan her islem icin fatura kesilecek; bilgiler odeme aninda alinir.
// Bireysel: ad soyad + TCKN + adres. Kurumsal: unvan + VKN + vergi dairesi + adres.
// TCKN dogrulamasi identity.mjs'teki algoritmayi kullanir; VKN 10 hane sayidir.
function faturaBilgisiHazirla(body, user) {
  const tip = body.invoiceType === "KURUMSAL" ? "KURUMSAL" : "BIREYSEL";
  const kirp = (v, n) => String(v == null ? "" : v).trim().slice(0, n);
  const unvan = kirp(body.invoiceTitle, 160);
  const vergiNo = kirp(body.invoiceTaxNo, 11).replace(/\D/g, "");
  const vd = kirp(body.invoiceTaxOffice, 80);
  const adres = kirp(body.invoiceAddress, 240);
  const il = kirp(body.invoiceCity, 60);
  const ilce = kirp(body.invoiceDistrict, 60);
  const eposta = kirp(body.invoiceEmail, 160).toLowerCase();

  if (unvan.length < 3) return { ok: false, error: tip === "KURUMSAL" ? "Fatura için şirket unvanını yaz." : "Fatura için ad ve soyadını yaz." };
  if (tip === "KURUMSAL") {
    if (vergiNo.length !== 10) return { ok: false, error: "Vergi kimlik numarası 10 haneli olmalı." };
    if (vd.length < 2) return { ok: false, error: "Vergi dairesini yaz." };
  } else {
    if (vergiNo.length !== 11 || !isValidTckn(vergiNo)) return { ok: false, error: "Fatura için geçerli bir T.C. kimlik numarası yaz." };
  }
  if (adres.length < 10) return { ok: false, error: "Fatura adresini yaz (en az 10 karakter)." };
  if (!il) return { ok: false, error: "Fatura adresi için il seç." };
  if (eposta && !eposta.includes("@")) return { ok: false, error: "Fatura e-posta adresi geçersiz." };

  return {
    ok: true,
    invoiceType: tip, invoiceTitle: unvan, invoiceTaxNo: vergiNo, invoiceTaxOffice: tip === "KURUMSAL" ? vd : "",
    invoiceAddress: adres, invoiceCity: il, invoiceDistrict: ilce,
    invoiceEmail: eposta || (user && user.email) || "",
  };
}
function faturaBilgisiniProfileYaz(userId, f) {
  try {
    db.prepare(`UPDATE users SET invoiceType=?, invoiceTitle=?, invoiceTaxNo=?, invoiceTaxOffice=?,
      invoiceAddress=?, invoiceCity=?, invoiceDistrict=? WHERE id=?`)
      .run(f.invoiceType, f.invoiceTitle, f.invoiceTaxNo, f.invoiceTaxOffice, f.invoiceAddress, f.invoiceCity, f.invoiceDistrict, userId);
  } catch (e) { console.error("[fatura] profile yazilamadi:", e && e.message); }
}

  if (seg[0] === "payments" && seg[1] === "checkout" && method === "POST") {
    const plan = db.prepare("SELECT * FROM plans WHERE id = ?").get(body.planId);
    if (!plan) return err(res, 404, "Paket bulunamadı.");
    if (!plan.price || plan.price <= 0) return err(res, 400, "Bu paket ücretsiz; ödeme gerekmez.");
    // Faz 3 (senaryo D): danisman, belgesi onaylanmadan danisman uyeligi satin alamaz.
    // Gecis donemindeki mevcut danismanlar (deadline sure iciyse) muaftir.
    if (plan.id === "plan-pro" && user.role === "AGENT" && !agentBelgeGecerli(user.id))
      return err(res, 403, "Danışman üyeliği satın almadan önce Sorumlu Emlak Danışmanı (Seviye 5) belgenin onaylanması gerekiyor. Belgeni Danışman Doğrulama sayfasından yükle.");
    // Fatura bilgisi olmadan odeme baslatilmaz (2026-08-03).
    const fatura = faturaBilgisiHazirla(body, user);
    if (!fatura.ok) return err(res, 400, fatura.error);
    faturaBilgisiniProfileYaz(user.id, fatura);

    const pid = uid("pay").replace(/[^a-zA-Z0-9]/g, "");
    const boostType = (plan.id === "plan-buyer-boost" || plan.id === "plan-seller-boost") ? (body.itemType || null) : null;
    const boostId = boostType ? (body.itemId || null) : null;
    const provider = paymentProvider();
    db.prepare(`INSERT INTO payments
      (id,userId,planId,provider,amount,currency,status,createdAt,boostItemType,boostItemId,
       invoiceType,invoiceTitle,invoiceTaxNo,invoiceTaxOffice,invoiceAddress,invoiceCity,invoiceDistrict,invoiceEmail)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(pid, user.id, plan.id, provider.name, plan.price, "TRY", "PENDING", today(), boostType, boostId,
           fatura.invoiceType, fatura.invoiceTitle, fatura.invoiceTaxNo, fatura.invoiceTaxOffice,
           fatura.invoiceAddress, fatura.invoiceCity, fatura.invoiceDistrict, fatura.invoiceEmail);
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


  // --- Fatura kesildi isareti (admin) ---------------------------------------
  // Fatura sistem disinda (mali musavir / e-fatura portali) kesiliyor; burada
  // yalnizca "kesildi" isareti ve fatura numarasi tutulur ki takip kaybolmasin.
  if (seg[0] === "payments" && seg[2] === "invoiced" && method === "POST") {
    if (user.role !== "ADMIN") return err(res, 403, "Bu işlem yalnızca yönetici içindir.");
    const pay = db.prepare("SELECT * FROM payments WHERE id=?").get(seg[1]);
    if (!pay) return err(res, 404, "Ödeme kaydı bulunamadı.");
    const no = String(body.invoiceNo || "").trim().slice(0, 40);
    const dosyaAdi = String(body.fileName || "").trim().slice(0, 120) || (no ? `fatura-${no}.pdf` : "fatura.pdf");
    const veri = String(body.fileData || "");

    // Fatura PDF'i verildiyse musteriye e-posta ile gonderilir (Okan karari,
    // 2026-08-03). Dosya saklanmaz; yalnizca adi ve gonderim zamani kaydedilir —
    // KVKK hijyeni geregi gereksiz veri tutulmaz, fatura zaten musavirde arsivli.
    let gonderim = "";
    if (veri) {
      if (!veri.startsWith("data:application/pdf")) return err(res, 400, "Fatura dosyası PDF olmalı.");
      const b64 = veri.split(",")[1] || "";
      if (b64.length > 8 * 1024 * 1024) return err(res, 400, "Fatura dosyası en fazla 6 MB olabilir.");
      const alici = pay.invoiceEmail || (db.prepare("SELECT email FROM users WHERE id=?").get(pay.userId) || {}).email || "";
      if (!alici) return err(res, 400, "Bu ödemede fatura e-posta adresi yok.");
      const isim = pay.invoiceTitle || "";
      const planAd = (db.prepare("SELECT name FROM plans WHERE id=?").get(pay.planId) || {}).name || "Üyelik";
      const html = notificationEmailHtml(isim, "Faturan hazır",
        [`${planAd} ödemene ait faturan ektedir.`,
         `Tutar: ${paraTR(pay.amount)}${no ? ` · Fatura no: ${no}` : ""}`,
         `Faturayla ilgili bir sorun görürsen bu e-postayı yanıtlaman yeterli.`].join("\n\n"),
        "", null, pay.userId);
      gonderim = await deliverEmail(pay.userId, alici, isim, `Konuttalebi — Faturan (${planAd})`, html, "Fatura gönderimi", null,
        [{ filename: dosyaAdi, content: b64 }]);
      db.prepare("UPDATE payments SET invoiceFileName=?, invoiceSentAt=? WHERE id=?").run(dosyaAdi, now(), pay.id);
    }
    db.prepare("UPDATE payments SET invoicedAt=?, invoiceNo=? WHERE id=?").run(now(), no, pay.id);
    addAudit(user.id, "INVOICE_MARKED", "Payment", pay.id, `${no || "fatura kesildi"}${gonderim ? " · e-posta: " + gonderim : ""}`);
    return ok(res, { emailStatus: gonderim || "gonderilmedi" });
  }

  // --- uye/danisman dogrulama belgesi yukle ---
  // Faz 3: danisman Seviye 5 belgesi GERCEK dosya ister (e-Devlet barkodlu,
  // PDF/JPG/PNG, en fazla 5 MB). Dosya data URL olarak saklanir; havuza ve
  // state'e asla cikmaz, yalnizca sahibi ve admin ayri uctan indirir.
  if (seg[0] === "verification-documents" && method === "POST" && seg.length === 1) {
    if (!["SELLER", "AGENT"].includes(user.role)) return err(res, 403, "Sadece üye tarafı belge yükleyebilir.");
    const type = (body.type || "Tapu / yetki belgesi").toString().trim().slice(0, 120) || "Tapu / yetki belgesi";
    const seviye5 = seviye5Mi(type);
    let fileData = null, fileName = null;
    if (seviye5) {
      if (user.role !== "AGENT") return err(res, 403, "Seviye 5 belgesini yalnızca emlak danışmanı yükleyebilir.");
      fileData = String(body.fileData || "");
      fileName = String(body.fileName || "belge").slice(0, 120);
      const m = fileData.match(/^data:(application\/pdf|image\/jpeg|image\/png);base64,[A-Za-z0-9+/=]+$/);
      if (!m) return err(res, 400, "Belge PDF, JPG veya PNG olmalı.");
      if (fileData.length > 7 * 1024 * 1024) return err(res, 400, "Belge en fazla 5 MB olabilir.");
      // Bekleyen eski Seviye 5 belgesi varsa kapat: tek aktif basvuru kalsin.
      db.prepare("UPDATE verification_documents SET status='SUPERSEDED', fileData=NULL WHERE userId=? AND type LIKE '%Seviye 5%' AND status='PENDING'")
        .run(user.id);
    }
    const id = uid("doc");
    const risk = Math.floor(Math.random() * 25) + 10;
    db.prepare("INSERT INTO verification_documents (id,userId,type,status,riskScore,reviewedById,reviewedAt,fileData,fileName,rejectReason,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
      .run(id, user.id, type, "PENDING", risk, null, null, fileData, fileName, null, today());
    addAudit(user.id, "DOCUMENT_SUBMITTED", "VerificationDocument", id, type);
    if (seviye5) notify(user.id, "AGENT_DOC_RECEIVED", "Belgen alındı",
      "Sorumlu Emlak Danışmanı belgen incelemeye alındı. Onaylanınca haber vereceğiz.", "dashboard/satici/dogrulama");
    return ok(res, { id });
  }

  // --- belge dosyasini indir (yalnizca sahibi veya admin/reviewer) ---
  if (seg[0] === "verification-documents" && seg[2] === "file" && method === "GET") {
    const doc = db.prepare("SELECT * FROM verification_documents WHERE id=?").get(seg[1]);
    if (!doc || !doc.fileData) return err(res, 404, "Belge dosyası bulunamadı.");
    if (doc.userId !== user.id && !["ADMIN", "REVIEWER"].includes(user.role))
      return err(res, 403, "Bu belgeyi görüntüleme yetkin yok.");
    addAudit(user.id, "DOCUMENT_VIEWED", "VerificationDocument", doc.id, "Belge dosyası görüntülendi.");
    return ok(res, { fileData: doc.fileData, fileName: doc.fileName || "belge" });
  }

  // --- admin/moderator belge inceleme ---
  // Faz 3: Seviye 5 belgesinde onay users.agentApproved'i acar, red sebep ister.
  if (seg[0] === "documents" && seg[2] === "review" && method === "POST") {
    if (!["ADMIN", "REVIEWER"].includes(user.role)) return err(res, 403, "Bu işlem için yetkiniz yok.");
    const doc = db.prepare("SELECT * FROM verification_documents WHERE id = ?").get(seg[1]);
    if (!doc) return err(res, 404, "Belge bulunamadı.");
    const status = ["APPROVED", "REJECTED"].includes(body.status) ? body.status : "APPROVED";
    const sebep = String(body.reason || "").trim().slice(0, 300);
    if (status === "REJECTED" && seviye5Mi(doc.type) && !sebep)
      return err(res, 400, "Red için sebep yazmalısın; danışmana iletilecek.");
    db.prepare("UPDATE verification_documents SET status=?, reviewedById=?, reviewedAt=?, rejectReason=? WHERE id=?")
      .run(status, user.id, today(), sebep || null, doc.id);
    const sahip = db.prepare("SELECT * FROM users WHERE id=?").get(doc.userId);
    if (seviye5Mi(doc.type) && sahip) {
      if (status === "APPROVED") {
        db.prepare("UPDATE users SET agentApproved=1 WHERE id=?").run(doc.userId);
        notify(doc.userId, "AGENT_DOC_APPROVED", "Danışman belgen onaylandı",
          "Sorumlu Emlak Danışmanı belgen onaylandı. Artık üyeliğinle talep sahiplerinin iletişim bilgisini görüntüleyebilirsin.", "dashboard/satici/talepler");
        queueEmail(doc.userId, "Danışman belgen onaylandı",
          "Sorumlu Emlak Danışmanı (Seviye 5) belgen incelendi ve onaylandı. Danışman üyeliğinle talep havuzundaki iletişim bilgilerini görüntüleyebilirsin.",
          "dashboard/satici/talepler", "Danışman belge onayı", "İyi çalışmalar dileriz.", "tx");
      } else {
        db.prepare("UPDATE users SET agentApproved=0 WHERE id=?").run(doc.userId);
        notify(doc.userId, "AGENT_DOC_REJECTED", "Danışman belgen reddedildi",
          `Belgen şu sebeple reddedildi: ${sebep}. Yeni belge yükleyebilirsin; reddedilen dosya 30 gün içinde silinir.`, "dashboard/satici/dogrulama");
        queueEmail(doc.userId, "Danışman belgen reddedildi",
          `Sorumlu Emlak Danışmanı belgen reddedildi. Sebep: ${sebep}. Panelinden yeni belge yükleyebilirsin; reddedilen dosya 30 gün içinde sistemden silinir.`,
          "dashboard/satici/dogrulama", "Danışman belge reddi", "Yeni belgeni bekliyoruz.", "tx");
      }
    } else {
      notify(doc.userId, `DOCUMENT_${status}`, status === "APPROVED" ? "Belgen onaylandı" : "Belgen reddedildi",
        status === "APPROVED" ? "Doğrulama belgen onaylandı." : "Doğrulama belgen reddedildi, tekrar yükleyebilirsin.", "dashboard/satici/dogrulama");
    }
    addAudit(user.id, `DOCUMENT_${status}`, "VerificationDocument", doc.id,
      seviye5Mi(doc.type) ? `Seviye 5 belgesi: ${status}${sebep ? " — " + sebep : ""}` : "Belge durumu güncellendi.");
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
      // Elle askiya alma oturumlari kapatir; elle aktiflestirme otomatik aski
      // isaretini de temizler ki sonraki taramada tekrar askiya alinmasin.
      if (yeni === "SUSPENDED") db.prepare("DELETE FROM sessions WHERE userId=?").run(hedef.id);
      if (yeni === "ACTIVE") { setler.push("autoSuspendedAt=NULL"); }
    }
    // Duvar muafiyeti: yonetici tek tek verebilir veya kaldirabilir.
    if (body.epostaMuaf !== undefined) {
      const yeni = body.epostaMuaf ? 1 : 0;
      setler.push("epostaMuaf=?"); degerler.push(yeni);
      notlar.push(yeni ? "e-posta doğrulama muafiyeti verildi" : "e-posta doğrulama muafiyeti kaldırıldı");
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
// .webp EKSIKTI: hero ve ilan gorselleri "application/octet-stream" olarak
// gidiyordu. Tarayici yine gosteriyor ama sikistirma/onbellek kararlarini
// dogru veremiyor ve bazi araclar gorsel saymiyor.
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".woff2": "font/woff2", ".woff": "font/woff", ".svg": "image/svg+xml", ".json": "application/json", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8" };
// /assets/ altindaki gorsel ve fontlar 30 gun onbellege alinir. Bu dosyalarin
// adi degistiginde yeni adres olusacagi icin uzun sure guvenlidir.
const ASSET_ONBELLEK_SN = 30 * 24 * 3600;
// Yalnizca bu dosyalar ve /assets/ altindaki gorseller disariya servis edilir.
// Boylece server/data/app.db, *.mjs, render.yaml, *.md gibi hassas dosyalar HTTP'den indirilemez.
const STATIC_ALLOW = new Set(["/index.html", "/app.js", "/styles.css", "/favicon.ico", "/robots.txt", "/sitemap.xml", "/google65cc11299e6e1d55.html", "/kiralik-ev-arayan.html", "/evine-kiraci-bul.html", "/ev-almak-isteyen.html", "/evine-alici-bul.html"]);
// Duzgun 404 sayfasi: UTF-8 basligi olmadan Turkce karakterler bozuk gorunuyordu.
function notFoundPage(res) {
  const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Konuttalebi | Sayfa bulunamadı</title><meta name="robots" content="noindex">
<link rel="icon" href="/favicon.ico" sizes="any">
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;color:#020617;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;text-align:center;padding:24px}
.box{max-width:520px}h1{font-size:64px;margin:0;color:#4f46e5;letter-spacing:-2px}h2{font-size:24px;margin:8px 0 12px}p{opacity:.8;line-height:1.6;margin:0 0 24px}
a{display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px}</style></head>
<body><div class="box"><h1>404</h1><h2>Bu sayfa bulunamadı</h2>
<p>Aradığın sayfa taşınmış veya kaldırılmış olabilir. Ana sayfadan talebini oluşturabilir ya da yayındaki konutlara göz atabilirsin.</p>
<a href="/">Ana sayfaya dön</a></div></body></html>`;
  res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
  return res.end(html);
}
// --- Sehir bazli SEO sayfalari -------------------------------------------
// /kiralik-ev-arayan/{il} ve /evine-kiraci-bul/{il}: sunucudan tam HTML.
// Sondaki slash ve buyuk harf 301 ile normalize edilir; bilinmeyen il 404 doner.
const CITY_ROUTE = /^\/(kiralik-ev-arayan|evine-kiraci-bul|ev-almak-isteyen|evine-alici-bul)\/([^/]+)\/?$/i;
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
  const TARAF_YOL = {
    "kiralik-ev-arayan": "tenant",
    "evine-kiraci-bul": "owner",
    "ev-almak-isteyen": "buyer",
    "evine-alici-bul": "vendor",
  };
  const html = renderCityPage(TARAF_YOL[base] || "tenant", slug);
  if (!html) return false;
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=600" });
  res.end(html);
  return true;
}


// --- Emlak danismanlari inis sayfasi (KUYRUK AJANS->TASARIM #34) -----------
// Title/meta/H1: SAYFA HARITASI satir 23, AJANS onayli (Onay ✅, 2026-07-31).
// Birebir uygulanir, serbestce degistirilmez. Sitemap'te kayitli.
function danismanPage(res) {
  const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Emlak Danışmanı Müşteri Bulma: Hazır Talepler | Konuttalebi</title>
<meta name="description" content="Soğuk arama yapmadan müşteri bul. Kiracı ve alıcılar ne aradığını yazdı; belgeli danışman olarak bölgendeki hazır talepleri gör, doğrudan iletişime geç.">
<link rel="canonical" href="https://konuttalebi.com/emlak-danismanlari-icin">
<link rel="icon" href="/favicon.ico" sizes="any">
<meta property="og:type" content="website"><meta property="og:site_name" content="Konuttalebi">
<meta property="og:title" content="Emlak Danışmanı Müşteri Bulma: Hazır Talepler | Konuttalebi">
<meta property="og:description" content="Soğuk arama yapmadan müşteri bul. Kiracı ve alıcılar ne aradığını yazdı; belgeli danışman olarak bölgendeki hazır talepleri gör, doğrudan iletişime geç.">
<meta property="og:url" content="https://konuttalebi.com/emlak-danismanlari-icin">
<meta property="og:image" content="https://konuttalebi.com/assets/og-image.jpg">
<style>
body{margin:0;background:#f8fafc;color:#020617;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.65}
.wrap{max-width:820px;margin:0 auto;padding:40px 22px 64px}
.logo{display:inline-block;text-decoration:none;color:#020617;font-weight:800;font-size:19px;letter-spacing:-.2px}
.logo small{display:block;color:#4338ca;font-size:9.5px;font-weight:800;letter-spacing:2.2px}
h1{font-size:33px;line-height:1.2;letter-spacing:-.6px;margin:30px 0 12px}
.lead{font-size:17px;color:#475569;margin:0 0 26px}
.kart{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:22px 24px;margin:14px 0}
.kart h2{font-size:18px;margin:0 0 8px}
.kart p{margin:0;color:#475569;font-size:15px}
.adim{display:flex;gap:12px;margin:10px 0;align-items:flex-start}
.no{flex:none;width:26px;height:26px;border-radius:50%;background:#eef2ff;color:#4f46e5;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center}
.cta{display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-weight:600;padding:13px 24px;border-radius:10px;margin:18px 12px 0 0}
.cta2{display:inline-block;background:#fff;border:1px solid #e2e8f0;color:#020617;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:10px;margin-top:18px}
.not{font-size:13px;color:#64748b;margin-top:26px}
@media(max-width:640px){
  .wrap{padding:28px 18px 48px}
  h1{font-size:26px;line-height:1.25}
  .lead{font-size:16px}
  .kart{padding:18px 18px}
  .cta,.cta2{display:block;text-align:center;margin:14px 0 0}
}
</style></head>
<body><div class="wrap">
<a class="logo" href="/">Konuttalebi<small>TALEP VE TEKLİF</small></a>
<h1>Müşteri talepleri burada — portföyüne uyanı sen seç.</h1>
<p class="lead">Konuttalebi'nde ilan yok; ev arayanlar ve konut alıcıları talep bırakır. Onaylı danışman olarak bu talepleri incelersin, sana uyanların iletişim bilgisini üyelikle görüntüler ve talep sahibini doğrudan ararsın.</p>
<div class="kart"><h2>Nasıl çalışır?</h2>
<div class="adim"><span class="no">1</span><p>Danışman olarak üye ol ve Sorumlu Emlak Danışmanı (Seviye 5) belgeni yükle.</p></div>
<div class="adim"><span class="no">2</span><p>Belgen yönetici tarafından incelenir; onaylanınca hesabın açılır.</p></div>
<div class="adim"><span class="no">3</span><p>6 ildeki kiralık ve konut satın alma taleplerini incele; kriterlerine uyan yeni talepler sana bildirilir, iletişim bilgisini üyelikle görüntüleyip doğrudan ararsın.</p></div>
</div>
<div class="kart"><h2>Belge şartı</h2><p>Danışman hesapları yalnızca geçerli Sorumlu Emlak Danışmanı (Seviye 5) belgesiyle çalışır. Belge yüklemeden veya onay tamamlanmadan talep sahiplerinin iletişim bilgisi görüntülenemez. Taşınmaz Ticareti Yönetmeliği'ne uyum bizim için ön şarttır.</p></div>
<div class="kart"><h2>Ne görürsün?</h2><p>İstanbul, Ankara, İzmir, Eskişehir, Bursa ve Antalya'daki güncel talepler: bölge, bütçe aralığı, oda sayısı, taşınma veya alım zamanı. Talep sahibinin kimliği ve iletişimi, sen görüntüleyene kadar gizlidir; her görüntülemede talep sahibine haber verilir.</p></div>
<a class="cta" href="/#/uye-ol">Danışman olarak üye ol</a>
<a class="cta2" href="/#/fiyatlandirma">Üyelik paketlerini gör</a>
<p class="not">Fiyata, pazarlığa veya sözleşmeye karışmayız; talep sahibiyle doğrudan görüşürsün.</p>
</div></body></html>`;
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=600" });
  res.end(html);
}



// --- Gercek yol sayfalarina sunucu tarafi govde (AJANS 2026-07-31 bulgusu) ----
// Sorun: /fiyatlandirma gibi yollar ayni bos SPA kabugunu donuyordu; Google
// (ve Ads kalite kontrolu) yedi farkli adreste ayni bos sayfayi goruyordu.
// Cozum: index.html'deki on cizim blogu bu yollarda sayfaya ozel metinle
// degistirilir. app.js yuklenince blok zaten tamamen degisir; bu metin yalniz
// ilk yanit icindir (ana sayfadaki desenin aynisi, KUYRUK #23).
// Kisa tutulur: uzun tutulursa app.js'teki asil sayfayla surum farki olusur.
const YOL_ICERIK = {
  fiyatlandirma: {
    baslik: "Fiyatlandırma ve üyelik paketleri",
    h1: "Talep bırakmak ücretsiz; iletişim görüntüleme üyelikle",
    p: [
      "Konuttalebi'nde ev almak veya kiralamak isteyen için talep bırakmak tamamen ücretsizdir; komisyon alınmaz. Ücret yalnızca karşı taraf içindir: evine kiracı veya alıcı arayan üyeler ve onaylı emlak danışmanları, talep sahibinin telefon ve e-posta bilgisini görüntülemek için üyelik alır.",
      "Bireysel üyelik aylık 199 TL'dir: kiracı ve alıcı taleplerinin tamamını görür, üyelik süresince sınırsız iletişim görüntülersin. Danışman üyeliği aylık 799 TL'dir ve Sorumlu Emlak Danışmanı (Seviye 5) belgesi şartına bağlıdır. Talebini üste taşıma ise ayrı ve isteğe bağlı bir hizmettir.",
      "Her iletişim görüntülemesinde talep sahibine bildirim gider. Fiyata, pazarlığa veya sözleşmeye karışmayız; taraflar kendi aralarında anlaşır.",
    ],
    baglantilar: [["/kiralik-ev-arayan", "Kiralık ev arıyorum"], ["/evine-kiraci-bul", "Evime kiracı arıyorum"], ["/emlak-danismanlari-icin", "Emlak danışmanıyım"]],
  },
  "nasil-calisir": {
    baslik: "Nasıl çalışır?",
    h1: "Ters ilan: sen aramazsın, seni bulurlar",
    p: [
      "Konuttalebi'nde konut ilanı yoktur. Ev almak veya kiralamak isteyen kişi ne aradığını yazar: bölge, bütçe aralığı, oda sayısı ve taşınma ya da alım zamanı. Talep e-posta doğrulamasından geçer ve herkese açık listede yayınlanır; adın ve iletişim bilgin gizli kalır.",
      "Evi talebe uyan kişiler ve Sorumlu Emlak Danışmanı (Seviye 5) belgeli onaylı danışmanlar bu talepleri inceler. Uygun bir talep bulduklarında ücretli üyelikle talep sahibinin iletişim bilgisini görüntüler ve doğrudan arar. Her görüntülemede talep sahibine bildirim gider.",
      "Talepler 60 günde bir yenilenir; süresi geçen talep listeden kalkar. Gerçekçi olmayan bütçeli talepler yayına alınmaz. Fiyata, pazarlığa veya sözleşmeye karışmayız.",
    ],
    baglantilar: [["/kiralik-ev-arayan", "Kiralık ev arayanlar"], ["/ev-almak-isteyen", "Ev almak isteyenler"], ["/fiyatlandirma", "Üyelik paketleri"]],
  },
  yardim: {
    baslik: "Yardım ve sık sorulan sorular",
    h1: "Yardım ve sık sorulan sorular",
    p: [
      "Talep bırakmak için üyeliğe gerek yok: formu doldurur, e-postanı doğrularsın ve talebin yayına girer. Kimlik veya gelir belgesi istenmez. Talep bırakan kiracı ve alıcılar için hizmet tamamen ücretsizdir, komisyon alınmaz.",
      "İletişim bilgin gizlidir. Yalnızca ücretli üyelikle görüntülenebilir ve her görüntülemede sana e-posta gider. Rahatsız edici bir arama olursa ilgili talebi panelinden bildirebilir, talebini dilediğin an duraklatabilir veya kaldırabilirsin.",
      "Talepler 60 gün boyunca yayında kalır; süre dolmadan hatırlatma e-postası gönderilir ve tek tıkla yenileyebilirsin. Üyelik, ödeme ve iptal koşulları için fiyatlandırma sayfasına, kişisel verilerin için KVKK aydınlatma metnine bakabilirsin.",
    ],
    baglantilar: [["/fiyatlandirma", "Fiyatlandırma"], ["/nasil-calisir", "Nasıl çalışır?"], ["/kiralik-ev-arayan", "Kiralık ev arıyorum"]],
  },
};
function yolGovdesi(rota) {
  const y = YOL_ICERIK[rota];
  if (!y) return null;
  const par = y.p.map((t) => `<p style="font-size:clamp(15.5px,4vw,17px);line-height:1.7;margin:0 0 14px">${escapeHtmlSrv(t)}</p>`).join("\n        ");
  const lin = y.baglantilar.map(([u, t]) => `<a href="${u}" style="color:#4f46e5;font-weight:600">${escapeHtmlSrv(t)}</a>`).join("\n          &nbsp;·&nbsp;\n          ");
  return `<main style="max-width:760px;margin:0 auto;padding:clamp(28px,7vw,48px) clamp(16px,5vw,24px);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#020617">
        <h1 style="font-size:clamp(24px,6vw,34px);line-height:1.25;margin:0 0 14px">${escapeHtmlSrv(y.h1)}</h1>
        ${par}
        <p style="font-size:17px;line-height:1.7;margin:22px 0 0">
          ${lin}
        </p>
      </main>`;
}

// --- SPA rotalari icin gercek adresler (KUYRUK #26 + #30b) --------------------
// Reklam varliklari /#/uye-ol gibi hash adresler kullaniyordu: Google Ads acilis
// sayfasi raporunda hash goremiyor, kalite puani ve olcum zayif kaliyor.
// Bu yollar ayni SPA'yi servis eder; index.html'e iki sey enjekte edilir:
//   1) window.KT_PATH_ROTA -> app.js hash yoksa bu rotayi acar
//   2) canonical + noindex -> icerik istemci tarafinda ciziliyor, ince icerik
//      cezasi almamak icin indekslenmez. Prerender govdesi yazilirsa (AJANS
//      isterse) noindex kaldirilir.
const SPA_YOLLARI = {
  "/uye-ol": "uye-ol",
  "/giris": "giris",
  "/fiyatlandirma": "fiyatlandirma",
  "/nasil-calisir": "nasil-calisir",
  "/yardim": "yardim",
  "/talepler": "talepler",
  "/talep-birak": "talep-birak",
};
async function spaYolSayfasi(res, yol, rota, arama) {
  try {
    let html = await readFile(join(WEB_DIR, "index.html"), "utf-8");
    // tx=SALE yalniz misafir talep formunda anlamli; digerlerinde rota sade kalir.
    const tamRota = rota === "talep-birak" && arama && /tx=SALE/.test(arama) ? `${rota}?tx=SALE` : rota;
    html = html.replace(
      '<link rel="canonical" href="https://konuttalebi.com/" />',
      `<link rel="canonical" href="https://konuttalebi.com${yol}" />`
    ).replace(
      '<meta name="robots" content="index, follow" />',
      '<meta name="robots" content="noindex, follow" />'
    );
    // Sayfaya ozel govde + baslik (bos kabuk sorunu, AJANS 2026-07-31)
    const govde = yolGovdesi(rota);
    if (govde) {
      const y = YOL_ICERIK[rota];
      html = html.replace(/<title>[^<]*<\/title>/, `<title>Konuttalebi | ${y.baslik}</title>`);
      const bas = html.indexOf('<div id="app">');
      const son = html.indexOf("</div>", html.lastIndexOf("</main>"));
      if (bas > -1 && son > bas) html = html.slice(0, bas) + `<div id="app">\n      ${govde}\n    ` + html.slice(son);
    }
    html = html.replace(
      '<script src="./app.js"></script>',
      `<script>window.KT_PATH_ROTA=${JSON.stringify(tamRota)};</script>\n    <script src="./app.js"></script>`
    );
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
    return res.end(html);
  } catch { return notFoundPage(res); }
}


// --- Talepler sayfasi: sunucudan icerikli govde (C2, 2026-07-31) ------------
// AJANS 29 Tem brief'i: talep havuzu uzun vadede en degerli organik varlik ama
// istemci tarafinda cizildigi icin arama motoru bos sayfa goruyordu.
// Burada /talepler ve /talepler/{il} sunucudan tam HTML doner: baslik, aciklama,
// canli talep ozeti (anonim), sehir baglantilari ve ItemList yapilandirilmis veri.
// Kisisel veri YOK: yalniz il/ilce, oda, butce araligi, zaman ve tazelik.
const TALEP_IL = {
  istanbul: "İstanbul", ankara: "Ankara", izmir: "İzmir",
  eskisehir: "Eskişehir", bursa: "Bursa", antalya: "Antalya",
};
function talepOzetleri(il, tx) {
  let rows = [];
  try {
    rows = db.prepare("SELECT city, district, roomCount, minBudget, maxBudget, transactionType, purchaseTimeline, createdAt FROM demands WHERE status='ACTIVE' ORDER BY createdAt DESC LIMIT 200").all();
  } catch { return []; }
  return rows
    .filter((d) => (!il || String(d.city || "").toLowerCase() === String(il).toLowerCase()))
    .filter((d) => (!tx || (d.transactionType || "SALE") === tx))
    .slice(0, 20);
}
function talepSatiri(d) {
  const kira = (d.transactionType || "SALE") === "RENT";
  const konum = [d.city, d.district].filter(Boolean).join(" / ") || "Konum belirtilmedi";
  const butce = d.minBudget || d.maxBudget
    ? `${paraTR(d.minBudget)} – ${paraTR(d.maxBudget)}${kira ? " / ay" : ""}`
    : "Bütçe belirtilmedi";
  const oda = d.roomCount ? `${d.roomCount} · ` : "";
  return `<li style="margin:0 0 10px;line-height:1.6">
          <strong>${escapeHtmlSrv(konum)}</strong> — ${escapeHtmlSrv(oda)}${escapeHtmlSrv(kira ? "kiralık ev arıyor" : "konut almak istiyor")}<br>
          <span style="color:#475569">${escapeHtmlSrv(butce)}${d.purchaseTimeline ? " · " + escapeHtmlSrv(d.purchaseTimeline) : ""}</span>
        </li>`;
}
function taleplerSayfasi(res, ilSlug, arama) {
  const ilAd = ilSlug ? TALEP_IL[ilSlug] : "";
  if (ilSlug && !ilAd) return notFoundPage(res);
  const tx = /tx=SALE/.test(arama || "") ? "SALE" : /tx=RENT/.test(arama || "") ? "RENT" : "";
  const liste = talepOzetleri(ilAd, tx);
  const sayi = liste.length;
  const yer = ilAd ? `${ilAd}'da` : "Türkiye'nin altı şehrinde";
  const baslik = ilAd ? `${ilAd} Konut Talepleri: Kiracı ve Alıcı Talepleri` : "Konut Talepleri: Kiracı ve Alıcı Talepleri";
  const aciklama = ilAd
    ? `${ilAd}'da ev arayan kiracıların ve konut almak isteyenlerin güncel taleplerini gör. Evine uygun talebi seç, iletişim bilgisini ücretli üyelikle görüntüle ve doğrudan ara.`
    : "Ev arayan kiracıların ve konut almak isteyenlerin güncel taleplerini gör. Evine uygun talebi seç, iletişim bilgisini ücretli üyelikle görüntüle ve doğrudan ara.";
  const yol = ilSlug ? `/talepler/${ilSlug}` : "/talepler";
  const ilLinkleri = Object.entries(TALEP_IL)
    .filter(([sl]) => sl !== ilSlug)
    .map(([sl, ad]) => `<a href="/talepler/${sl}" style="color:#4f46e5;font-weight:600">${escapeHtmlSrv(ad)} talepleri</a>`)
    .join("\n          &nbsp;·&nbsp;\n          ");
  const itemList = sayi
    ? `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org", "@type": "ItemList",
        name: baslik, numberOfItems: sayi,
        itemListElement: liste.slice(0, 10).map((d, i) => ({
          "@type": "ListItem", position: i + 1,
          name: `${[d.city, d.district].filter(Boolean).join(" / ")} · ${d.roomCount || ""} ${(d.transactionType || "SALE") === "RENT" ? "kiralık ev talebi" : "konut alım talebi"}`.trim(),
        })),
      })}</script>`
    : "";
  const govde = `<main style="max-width:820px;margin:0 auto;padding:clamp(28px,7vw,48px) clamp(16px,5vw,24px);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#020617">
        <h1 style="font-size:clamp(24px,6vw,33px);line-height:1.25;margin:0 0 14px">${escapeHtmlSrv(ilAd ? ilAd + "'daki konut talepleri" : "Konut talepleri — kiracı ve alıcı talepleri")}</h1>
        <p style="font-size:clamp(15.5px,4vw,17px);line-height:1.7;margin:0 0 14px">Konuttalebi'nde konut ilanı yoktur. ${escapeHtmlSrv(yer)} ev aramak veya satın almak isteyenler ne aradıklarını yazar: bölge, bütçe aralığı, oda sayısı ve taşınma ya da alım zamanı. Bu sayfadaki talepler üye olmadan görüntülenebilir.</p>
        <p style="font-size:clamp(15.5px,4vw,17px);line-height:1.7;margin:0 0 14px">Evine uygun bir talep bulduğunda, talep sahibinin telefon ve e-posta bilgisini ücretli üyelikle görüntüler ve doğrudan ararsın. Her görüntülemede talep sahibine bildirim gider; adı ve iletişim bilgisi o ana kadar gizlidir. Fiyata, pazarlığa veya sözleşmeye karışmayız.</p>
        ${sayi ? `<h2 style="font-size:clamp(19px,5vw,22px);margin:26px 0 12px">Yayındaki talepler${ilAd ? " — " + escapeHtmlSrv(ilAd) : ""}</h2>
        <ul style="padding-left:20px;margin:0 0 18px">${liste.map(talepSatiri).join("")}</ul>` : `<p style="font-size:clamp(15.5px,4vw,17px);line-height:1.7;margin:0 0 14px">${escapeHtmlSrv(ilAd || "Bu listede")} şu anda yayında talep görünmüyor. Talepler 60 günde bir yenilenir; kısa süre içinde yeni talepler eklenir.</p>`}
        <p style="font-size:17px;line-height:1.7;margin:22px 0 0">
          <a href="/talep-birak" style="color:#4f46e5;font-weight:600">Kiralık ev talebi bırak</a>
          &nbsp;·&nbsp;
          <a href="/talep-birak?tx=SALE" style="color:#4f46e5;font-weight:600">Konut alım talebi bırak</a>
        </p>
        <p style="font-size:15px;line-height:1.7;color:#475569;margin:22px 0 0">
          ${ilLinkleri}
        </p>
      </main>`;
  readFile(join(WEB_DIR, "index.html"), "utf-8").then((html) => {
    html = html
      .replace(/<title>[^<]*<\/title>/, `<title>Konuttalebi | ${escapeHtmlSrv(baslik)}</title>`)
      .replace(/(name="description"\s*\n?\s*content=)"[^"]*"/, `$1"${escapeHtmlSrv(aciklama)}"`)
      .replace('<link rel="canonical" href="https://konuttalebi.com/" />', `<link rel="canonical" href="https://konuttalebi.com${yol}" />`)
      .replace('<meta name="robots" content="index, follow" />', '<meta name="robots" content="noindex, follow" />');
    const bas = html.indexOf('<div id="app">');
    const son = html.indexOf("</div>", html.lastIndexOf("</main>"));
    if (bas > -1 && son > bas) html = html.slice(0, bas) + `<div id="app">\n      ${govde}\n    ` + html.slice(son);
    html = html.replace('<script src="./app.js"></script>',
      `${itemList}\n    <script>window.KT_PATH_ROTA=${JSON.stringify("talepler")};window.KT_IL=${JSON.stringify(ilAd || "")};</script>\n    <script src="./app.js"></script>`);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" });
    res.end(html);
  }).catch(() => notFoundPage(res));
}

async function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (tryCityPage(req, res, p)) return;
  if (p === "/emlak-danismanlari-icin" || p === "/emlak-danismanlari-icin/") return danismanPage(res);
  {
    const kisa = p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
    // Eski ad -> yeni ad (301). Reklamda /#/ilanlar site baglantisi hala yayinda
    // (12 gunde 2.242 gosterim); app.js eski adi taniyor ama koddan kalktigi gun
    // baglanti kirilirdi. Kalici yonlendirme o riski kapatir.
    if (kisa === "/ilanlar") { res.writeHead(301, { Location: "/talepler" }); return res.end(); }
    if (kisa === "/talepler") return taleplerSayfasi(res, "", url.search);
    const ilM = kisa.match(/^\/talepler\/([a-z]+)$/);
    if (ilM) return taleplerSayfasi(res, ilM[1], url.search);
    if (SPA_YOLLARI[kisa]) return spaYolSayfasi(res, kisa, SPA_YOLLARI[kisa], url.search);
  }
  if (p === "/") p = "/index.html";
  else if (p === "/kiralik-ev-arayan") p = "/kiralik-ev-arayan.html";
  else if (p === "/ev-almak-isteyen") p = "/ev-almak-isteyen.html";
  else if (p === "/evine-alici-bul") p = "/evine-alici-bul.html";
  else if (p === "/evine-kiraci-bul") p = "/evine-kiraci-bul.html";
  const isAsset = p.startsWith("/assets/") && !p.includes("..");
  if (!STATIC_ALLOW.has(p) && !isAsset) return notFoundPage(res);
  const filePath = normalize(join(WEB_DIR, p));
  if (filePath !== WEB_DIR && !filePath.startsWith(WEB_DIR + "/")) { res.writeHead(403); return res.end("Forbidden"); }
  if (!existsSync(filePath)) return notFoundPage(res);
  try {
    const data = await readFile(filePath);
    const tip = MIME[extname(filePath)] || "application/octet-stream";

    // ONBELLEK (2026-07-30, KUYRUK #15)
    // Onceki durum: hicbir statik dosyada Cache-Control, ETag veya Last-Modified
    // yoktu. Sonucu: Cloudflare hicbir seyi onbelleklemiyordu (cf-cache-status:
    // DYNAMIC) ve tarayici da onbelleklemedigi icin her ziyarette ~360 KB
    // (app.js 319 + styles.css 39 + gorseller) bastan iniyordu.
    //
    // Iki farkli strateji, sebebiyle birlikte:
    //
    // 1) /assets/ altindaki gorsel ve fontlar -> 30 gun. Bu dosyalar
    //    degistiginde adlari da degisiyor, o yuzden uzun sure guvenli.
    //
    // 2) index.html / app.js / styles.css -> "no-cache" + ETag. Bu dosyalarin
    //    adinda surum/hash YOK; uzun onbellek verilirse deploy sonrasi
    //    kullanicilar eski surumde kalir. "no-cache" adi yaniltici: dosyayi
    //    onbellege ALIR, ama her kullanimda sunucuya "degisti mi" diye sorar.
    //    Degismediyse 304 + BOS govde doner (birkac yuz bayt), degistiyse
    //    yenisi iner. Yani hem taze hem hizli.
    if (isAsset) {
      res.writeHead(200, { "Content-Type": tip, "Cache-Control": `public, max-age=${ASSET_ONBELLEK_SN}` });
      return res.end(data);
    }
    const etag = `"${createHash("sha256").update(data).digest("hex").slice(0, 20)}"`;
    if (req.headers["if-none-match"] === etag) {
      res.writeHead(304, { ETag: etag, "Cache-Control": "no-cache" });
      return res.end();
    }
    res.writeHead(200, { "Content-Type": tip, "Cache-Control": "no-cache", ETag: etag });
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
