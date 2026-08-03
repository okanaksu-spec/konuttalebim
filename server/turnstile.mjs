/**
 * Cloudflare Turnstile — bot korumasi (CAPTCHA).
 *
 * Neden Turnstile:
 * - Ucretsiz ve sinirsiz, zaten Cloudflare kullaniyoruz.
 * - Ziyaretcilerin cogu icin gorunmez; resim secme/bulmaca yok.
 * - Ziyaretci verisi Google'a gitmiyor (reCAPTCHA'nin aksine) — KVKK acisindan temiz.
 *
 * KRITIK TASARIM KARARI — anahtar yoksa kapi ACILMAZ, ozellik UYUR:
 * SMS modulundeki (sms.mjs) desenin aynisi. Secret anahtar tanimli degilse
 * dogrulama tamamen atlanir ve formlar eskisi gibi calisir. Aksi halde
 * anahtar unutuldugunda tum kayit/talep akisi kilitlenirdi.
 *
 * Ortam degiskenleri (Render):
 *   TURNSTILE_SITE_KEY   — istemciye gonderilir, gizli degil
 *   TURNSTILE_SECRET_KEY — yalniz sunucuda, ASLA istemciye gitmez
 */

const SITE_KEY = process.env.TURNSTILE_SITE_KEY || "";
const SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || "";
const DOGRULAMA_UCU = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Turnstile yapilandirilmis mi? Ikisi de gerekli. */
export function turnstileEnabled() {
  return Boolean(SITE_KEY && SECRET_KEY);
}

/** Istemcinin widget'i cizmesi icin gereken acik anahtar. Kapaliysa bos string. */
export function turnstileSiteKey() {
  return turnstileEnabled() ? SITE_KEY : "";
}

/** Admin panelinde gostermek icin insan okur durum metni. */
export function turnstileDurumu() {
  if (!SITE_KEY && !SECRET_KEY) return "kapali (anahtar yok)";
  if (!SITE_KEY) return "eksik: TURNSTILE_SITE_KEY";
  if (!SECRET_KEY) return "eksik: TURNSTILE_SECRET_KEY";
  return "acik";
}

/**
 * Istemciden gelen token'i Cloudflare'e sorar.
 *
 * @param {string} token  Formdan gelen cf-turnstile-response degeri
 * @param {string} ip     Istemci IP'si (istege bagli, dogrulugu artirir)
 * @returns {Promise<{ok:boolean, reason?:string}>}
 *
 * ok:true tek bir durumda doner: Cloudflare "success" dedi.
 * Ag hatasi veya zaman asimi da ok:false doner — supheli istegi gecirmektense
 * kullaniciya "tekrar dene" demek daha guvenli.
 */
export async function verifyTurnstile(token, ip) {
  if (!turnstileEnabled()) return { ok: true, reason: "kapali" };
  if (!token || typeof token !== "string") return { ok: false, reason: "token-yok" };

  const govde = new URLSearchParams();
  govde.set("secret", SECRET_KEY);
  govde.set("response", token);
  if (ip) govde.set("remoteip", ip);

  // Cloudflare yanit vermezse sonsuza kadar beklemeyelim.
  const kontrol = new AbortController();
  const zamanlayici = setTimeout(() => kontrol.abort(), 8000);
  try {
    const yanit = await fetch(DOGRULAMA_UCU, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: govde.toString(),
      signal: kontrol.signal,
    });
    const veri = await yanit.json();
    if (veri && veri.success === true) return { ok: true };
    const kodlar = Array.isArray(veri && veri["error-codes"]) ? veri["error-codes"].join(",") : "bilinmiyor";
    return { ok: false, reason: kodlar };
  } catch (e) {
    return { ok: false, reason: e && e.name === "AbortError" ? "zaman-asimi" : "ag-hatasi" };
  } finally {
    clearTimeout(zamanlayici);
  }
}

/**
 * Uc icinde tek satirda kullanmak icin yardimci.
 * Dogrulama basarisizsa 400 doner ve true doner (cagiran yer return eder).
 *
 * Kullanim:
 *   if (await turnstileKapisi(req, res, body)) return;
 */
export async function turnstileKapisi(req, res, body, err, clientIp) {
  if (!turnstileEnabled()) return false;
  const token = body && (body.turnstileToken || body["cf-turnstile-response"]);
  const sonuc = await verifyTurnstile(token, clientIp(req));
  if (sonuc.ok) return false;
  err(res, 400, "Güvenlik doğrulaması tamamlanamadı. Sayfayı yenileyip tekrar dene.");
  return true;
}
