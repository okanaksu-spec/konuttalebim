// server/payment.mjs
// Banka-bagimsiz odeme cekirdegi.
//
// Amac: odeme akisinin govdesi (siparis olustur -> 3D'ye yonlendir -> donen
// sonucu SUNUCUDA imzayla dogrula -> uyeligi ac) her bankada AYNI kalsin;
// her bankaya/gateway'e ozel alan isimleri ve hash algoritmasi TEK bir
// "adapter" icinde toplansin. Boylece banka paketi gelince yalnizca ilgili
// adapter doldurulur, gerisi degismez.
//
// Aktif saglayici PAYMENT_PROVIDER ortam degiskeni ile secilir:
//   - "mock"    : gercek banka olmadan tum akisi yerelde/canlida test etmek icin
//   - "nestpay" : EST/NestPay altyapisi (Akbank, Isbank, Ziraat, QNB, TEB... coğu)
//   - "garanti" : Garanti BBVA sanal POS
//   - "posnet"  : Yapi Kredi Posnet
//   (banka belli olunca dogru adapter doldurulacak)
//
// Adapter arayuzu:
//   start(order)          -> yonlendirme bilgisi
//        order = { orderId, amount(kurus), currency, planName, okUrl, failUrl, userId }
//        donus: { kind:"redirect", url, fields }   (banka 3D sayfasina auto-submit form)
//             | { kind:"mock", confirmUrl }        (yerel sahte 3D onay sayfasi)
//   parseCallback(params) -> { orderId, approved, providerRef, raw }
//        (imza/hash burada uretilir; server ayrica PENDING->PAID gecisini yapar)

import crypto from "node:crypto";

const PROVIDER = (process.env.PAYMENT_PROVIDER || "mock").toLowerCase();

// ---------------------------------------------------------------------------
// Ortak yardimcilar (bankalarin cogu SHA-512/SHA-1 tabanli hash kullanir)
// ---------------------------------------------------------------------------
export function sha512Base64(str) {
  return crypto.createHash("sha512").update(String(str), "utf8").digest("base64");
}
export function sha1Base64(str) {
  return crypto.createHash("sha1").update(String(str), "utf8").digest("base64");
}
// Sabit-zamanli karsilastirma (hash dogrulamada timing saldirisina kapali)
export function safeEqual(a, b) {
  const ba = Buffer.from(String(a) || "", "utf8");
  const bb = Buffer.from(String(b) || "", "utf8");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
// PayTR HMAC-SHA256 -> base64
export function hmacSha256Base64(data, key) {
  return crypto.createHmac("sha256", String(key)).update(String(data), "utf8").digest("base64");
}

// ---------------------------------------------------------------------------
// PayTR iFrame API adapter.
// Akis: sunucu get-token ister -> istemci PayTR iframe'ini gomer -> kullanici
// oder -> PayTR callback (merchant_ok_url/notification) POST eder -> sunucu
// hash'i DOGRULAR -> uyeligi acar -> PayTR'ye "OK" doner.
// Gizli anahtarlar yalnizca Render ortam degiskeninde: PAYTR_MERCHANT_ID/KEY/SALT.
// ---------------------------------------------------------------------------
const PAYTR = {
  get merchantId() { return (process.env.PAYTR_MERCHANT_ID || "").trim(); },
  get merchantKey() { return (process.env.PAYTR_MERCHANT_KEY || "").trim(); },
  get merchantSalt() { return (process.env.PAYTR_MERCHANT_SALT || "").trim(); },
  // Varsayilan test modu; canli icin Render'da PAYTR_TEST_MODE=0 yapilir.
  get testMode() { return process.env.PAYTR_TEST_MODE === "0" ? "0" : "1"; },
};

const paytrAdapter = {
  name: "paytr",
  configured() { return Boolean(PAYTR.merchantId && PAYTR.merchantKey && PAYTR.merchantSalt); },
  async start(order) {
    if (!this.configured())
      throw new Error("[payment] PayTR ortam degiskenleri (PAYTR_MERCHANT_ID/KEY/SALT) tanimli degil.");
    const merchant_id = PAYTR.merchantId, test_mode = PAYTR.testMode;
    const merchant_oid = String(order.orderId).replace(/[^a-zA-Z0-9]/g, "");
    const email = order.email || "musteri@konuttalebi.com";
    const payment_amount = String(order.amount);              // kurus (TL*100)
    const user_ip = (order.userIp || "127.0.0.1").slice(0, 45);
    const user_basket = Buffer.from(JSON.stringify([[String(order.planName || "Uyelik"), (order.amount / 100).toFixed(2), 1]]), "utf8").toString("base64");
    const no_installment = "1", max_installment = "0", currency = "TL";
    const hashStr = merchant_id + user_ip + merchant_oid + email + payment_amount + user_basket + no_installment + max_installment + currency + test_mode;
    const paytr_token = hmacSha256Base64(hashStr + PAYTR.merchantSalt, PAYTR.merchantKey);
    const params = new URLSearchParams({
      merchant_id, user_ip, merchant_oid, email, payment_amount, paytr_token, user_basket,
      debug_on: test_mode, no_installment, max_installment,
      user_name: (order.userName || "Konuttalebi Uyesi").slice(0, 60),
      user_address: (order.userAddress || "Konuttalebi").slice(0, 400),
      user_phone: (order.userPhone || "0000000000").slice(0, 20),
      merchant_ok_url: order.okUrl, merchant_fail_url: order.failUrl,
      timeout_limit: "30", currency, test_mode, lang: "tr",
    });
    const resp = await fetch("https://www.paytr.com/odeme/api/get-token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString(),
    });
    const data = await resp.json().catch(() => ({}));
    if (data.status !== "success")
      throw new Error("[payment] PayTR token alinamadi: " + (data.reason || JSON.stringify(data)));
    return { kind: "iframe", token: data.token, iframeUrl: `https://www.paytr.com/odeme/guvenli/${data.token}` };
  },
  parseCallback(p) {
    const merchant_oid = p.merchant_oid || "";
    const status = p.status || "";
    const total_amount = p.total_amount || "";
    const expected = hmacSha256Base64(merchant_oid + PAYTR.merchantSalt + status + total_amount, PAYTR.merchantKey);
    const hashValid = safeEqual(expected, p.hash || "");
    return { orderId: merchant_oid, approved: hashValid && status === "success", hashValid, providerRef: `PAYTR-${merchant_oid}`, raw: p };
  },
};

// ---------------------------------------------------------------------------
// MOCK adapter — gercek banka olmadan uctan uca test icin.
// Kullanici sahte bir 3D onay sayfasina gider; o sayfa banka gibi
// /api/payments/callback adresine POST eder. Boylece GERCEK callback kod
// yolu (imza disi) birebir calisir; banka gelince sadece adapter degisir.
// ---------------------------------------------------------------------------
const mockAdapter = {
  name: "mock",
  start(order) {
    return { kind: "mock", confirmUrl: `/odeme/mock?oid=${encodeURIComponent(order.orderId)}` };
  },
  parseCallback(p) {
    const orderId = p.oid || p.orderId || p.oId || "";
    const approved = (p.result || p.status || "success") === "success";
    return { orderId, approved, providerRef: `MOCK-${orderId}`, raw: p };
  },
};

// ---------------------------------------------------------------------------
// Banka adapter iskeleti — banka bilgisi gelince doldurulacak.
// Ortak desen (NestPay/EST ornegi):
//   Istek hash'i  = SHA512( clientId + oid + amount + okUrl + failUrl + tranType
//                           + installment + rnd + storeKey )   (alan sirasi bankaya gore)
//   Kullanici bankanin 3D URL'sine (fields ile) auto-submit edilir.
//   Donuste bankanin gonderdigi HASH sunucuda YENIDEN uretilip karsilastirilir;
//   mdStatus 1/2/3/4 ise 3D basarili sayilir.
// Not: Gizli anahtar (storeKey) yalnizca Render ortam degiskeninde tutulur.
// ---------------------------------------------------------------------------
function bankStub(name) {
  const msg = `[payment] '${name}' adapteri henuz yapilandirilmadi. `
    + `Banka paketi (gateway, merchant/terminal ID, store key, test URL, entegrasyon dok.) gelince doldurulacak.`;
  return {
    name,
    start() { throw new Error(msg); },
    parseCallback() { throw new Error(msg); },
  };
}

const adapters = {
  mock: mockAdapter,
  paytr: paytrAdapter,
  nestpay: bankStub("nestpay"),
  garanti: bankStub("garanti"),
  posnet: bankStub("posnet"),
};

export function paymentProvider() {
  return adapters[PROVIDER] || mockAdapter;
}
export const PAYMENT_PROVIDER = PROVIDER;
export const IS_MOCK = PROVIDER === "mock";

// Odemeler gercekten CANLI mi? Yalnizca PayTR yapilandirilmis VE canli modda
// (PAYTR_TEST_MODE=0) ise true doner. Istemci bu bayraga gore odeme butonlarini
// acar; boylece canli-moda gecis TEK bir ortam degiskeni ile yapilir.
// PayTR canli-mod INCELEMESI icin gecici erisim bayragi.
// true iken, TEST modunda bile odeme butonlari acilir; token yine test_mode=1
// ile alinir, yani GERCEK PARA CEKILMEZ. Amac: PayTR denetci hesabi odeme
// adimini (test ekranini) gorebilsin. PayTR onayindan sonra bu bayrak false
// yapilip Render'da PAYTR_TEST_MODE=0 edilecek (gercek canli mod).
const PAYMENTS_REVIEW = true;

export function paymentsAreLive() {
  if (PROVIDER === "paytr") {
    if (!paytrAdapter.configured()) return false;
    return PAYTR.testMode === "0" || PAYMENTS_REVIEW;
  }
  return false;
}
