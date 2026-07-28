// Konuttalebi - kimlik verisi katmani (TC kimlik no + dogum tarihi)
//
// TASARIM NOTLARI - degistirmeden once oku:
// 1) TCKN veritabaninda ACIK METIN OLARAK TUTULMAZ. AES-256-GCM ile sifrelenir.
//    Anahtar KT_ENC_KEY ortam degiskeninden gelir (32 bayt, hex veya base64).
// 2) Anahtar yoksa kimlik alani HIC KAYDEDILMEZ (fail-closed). Yanlislikla acik
//    metin yazmaktansa hic yazmamak dogru davranis.
// 3) Ayni TCKN ile ikinci hesap acilmasini engellemek icin ayrica HMAC-SHA256
//    ozeti tutulur. Ozet geri cevrilemez, yalnizca esitlik karsilastirmasi icindir.
// 4) Panelde varsayilan gorunum MASKELIDIR. Acik deger yalnizca ayri bir istekle
//    ve denetim kaydi dusurulerek gosterilir.
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

const RAW_KEY = process.env.KT_ENC_KEY || "";

function loadKey() {
  if (!RAW_KEY) return null;
  let buf = null;
  try {
    if (/^[0-9a-f]{64}$/i.test(RAW_KEY.trim())) buf = Buffer.from(RAW_KEY.trim(), "hex");
    else buf = Buffer.from(RAW_KEY.trim(), "base64");
  } catch { return null; }
  if (!buf || buf.length !== 32) return null;
  return buf;
}

const KEY = loadKey();

/** Kimlik verisi saklanabilir mi? Anahtar yoksa false. */
export function identityEnabled() {
  return Boolean(KEY);
}

/** Ortam degiskeni verilmis ama gecersizse acik uyari verelim. */
export function identityKeyStatus() {
  if (!RAW_KEY) return "KT_ENC_KEY tanimli degil - kimlik alanlari kaydedilmeyecek.";
  if (!KEY) return "KT_ENC_KEY gecersiz (32 bayt hex veya base64 olmali) - kimlik alanlari kaydedilmeyecek.";
  return "KT_ENC_KEY yuklendi - kimlik alanlari sifreli saklanacak.";
}

/** AES-256-GCM. Cikti: iv(12) . tag(16) . ciphertext, base64. */
export function encryptSecret(plain) {
  if (!KEY || !plain) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecret(packed) {
  if (!KEY || !packed) return "";
  try {
    const buf = Buffer.from(String(packed), "base64");
    if (buf.length < 29) return "";
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
  } catch { return ""; }
}

/** Tekillik kontrolu icin geri cevrilemez ozet. */
export function hashIdentity(value) {
  if (!KEY || !value) return "";
  return createHmac("sha256", KEY).update(String(value)).digest("hex");
}

/**
 * T.C. kimlik numarasi dogrulama (resmi algoritma).
 * - 11 hane, tamami rakam
 * - ilk hane 0 olamaz
 * - 10. hane: (tek siralarin toplami * 7 - cift siralarin toplami) mod 10
 * - 11. hane: ilk 10 hanenin toplami mod 10
 * Bu kontrol numaranin BICIMSEL gecerliligini olcer; kisiye ait oldugunu kanitlamaz.
 */
export function isValidTckn(value) {
  const s = String(value || "").trim();
  if (!/^[1-9][0-9]{10}$/.test(s)) return false;
  const d = s.split("").map(Number);
  const tek = d[0] + d[2] + d[4] + d[6] + d[8];
  const cift = d[1] + d[3] + d[5] + d[7];
  const h10 = (tek * 7 - cift) % 10;
  if (h10 < 0 ? h10 + 10 !== d[9] : h10 !== d[9]) return false;
  const toplam = d.slice(0, 10).reduce((a, b) => a + b, 0);
  return toplam % 10 === d[10];
}

/** Dogum tarihi: YYYY-AA-GG, gercek tarih, 18-100 yas araligi. */
export function validateBirthDate(value) {
  const s = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { ok: false, error: "Doğum tarihi GG.AA.YYYY biçiminde olmalı." };
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s)
    return { ok: false, error: "Geçerli bir doğum tarihi girin." };
  const bugun = new Date();
  let yas = bugun.getUTCFullYear() - d.getUTCFullYear();
  const ayGun = (bugun.getUTCMonth() - d.getUTCMonth()) || (bugun.getUTCDate() - d.getUTCDate());
  if (ayGun < 0) yas -= 1;
  if (yas < 18) return { ok: false, error: "Üyelik için 18 yaşından büyük olmalısın." };
  if (yas > 100) return { ok: false, error: "Geçerli bir doğum tarihi girin." };
  return { ok: true, value: s, age: yas };
}

/** 12345678901 -> 123******01 */
export function maskTckn(value) {
  const s = String(value || "").trim();
  if (s.length !== 11) return "";
  return `${s.slice(0, 3)}******${s.slice(-2)}`;
}

/** 1990-05-17 -> ****-05-17 degil; tam gizleme: yalnizca yil gosterilir. */
export function maskBirthDate(value) {
  const s = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  return `${s.slice(0, 4)}-**-**`;
}

/** Dogum tarihinden yas (panelde ozet gostermek icin). */
export function ageFromBirthDate(value) {
  const r = validateBirthDate(value);
  return r.ok ? r.age : null;
}
