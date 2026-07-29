// Konuttalebi - SMS gonderim katmani (Netgsm)
//
// TASARIM NOTLARI:
// 1) Saglayici bilgileri yoksa TEST MODU calisir: SMS gonderilmez, kod
//    veritabanina yazilir ve yalnizca yonetim panelinden gorunur. Boylece
//    hesap acilmadan once akis ucdan uca denenebilir.
// 2) Dogrulama SMS'i ticari ileti degildir (hizmetin ifasi), Iysa kaydi
//    gerektirmez. Yine de pazarlama amacli SMS BU DOSYADAN GONDERILMEZ.
// 3) Kod hicbir zaman istemciye donulmez; sadece SMS ile gider.

const NETGSM = {
  usercode: (process.env.NETGSM_USERCODE || "").trim(),
  password: (process.env.NETGSM_PASSWORD || "").trim(),
  header: (process.env.NETGSM_HEADER || "").trim(),   // onayli gonderici basligi
};

export function smsEnabled() {
  return Boolean(NETGSM.usercode && NETGSM.password && NETGSM.header);
}

export function smsDurumu() {
  if (smsEnabled()) return "Netgsm yapilandirildi - gercek SMS gonderilecek.";
  const eksik = [];
  if (!NETGSM.usercode) eksik.push("NETGSM_USERCODE");
  if (!NETGSM.password) eksik.push("NETGSM_PASSWORD");
  if (!NETGSM.header) eksik.push("NETGSM_HEADER");
  return `TEST MODU - eksik: ${eksik.join(", ")}. Kodlar panelde gorunur, SMS gitmez.`;
}

/**
 * Turkiye cep telefonu normalizasyonu.
 * Kabul edilenler: 05xxxxxxxxx, 5xxxxxxxxx, +905xxxxxxxxx, 905xxxxxxxxx
 * Donus: "5xxxxxxxxx" (10 hane) veya null
 */
export function normalizePhone(value) {
  let s = String(value || "").replace(/[^\d]/g, "");
  if (s.startsWith("90") && s.length === 12) s = s.slice(2);
  if (s.startsWith("0") && s.length === 11) s = s.slice(1);
  if (!/^5\d{9}$/.test(s)) return null;
  return s;
}

/** Panelde ve loglarda gosterim icin: 5551112233 -> 555 *** 22 33 */
export function maskPhone(value) {
  const p = normalizePhone(value);
  if (!p) return "";
  return `${p.slice(0, 3)} *** ${p.slice(6, 8)} ${p.slice(8)}`;
}

/**
 * SMS gonderir. Basarili olursa { ok:true, mode:"live"|"test" } doner.
 * Netgsm "get" API'si: 00 veya 01/02 ile baslayan yanit basarilidir.
 */
export async function sendSms(phone, message) {
  const p = normalizePhone(phone);
  if (!p) return { ok: false, error: "Geçersiz telefon numarası." };
  if (!smsEnabled()) {
    console.log(`[sms] TEST MODU - gonderilmedi. Hedef: ${maskPhone(p)}`);
    return { ok: true, mode: "test" };
  }
  try {
    const params = new URLSearchParams({
      usercode: NETGSM.usercode,
      password: NETGSM.password,
      gsmno: "90" + p,
      message,
      msgheader: NETGSM.header,
      dil: "TR",
    });
    const resp = await fetch("https://api.netgsm.com.tr/sms/send/get?" + params.toString(), { method: "GET" });
    const text = (await resp.text()).trim();
    const kod = text.split(/\s+/)[0];
    // 00 = basarili, 01/02 = basarili (farkli tarih formatlariyla), digerleri hata
    if (["00", "01", "02"].includes(kod)) return { ok: true, mode: "live", ref: text };
    const hatalar = {
      "20": "Mesaj metni çok uzun veya karakter sorunu",
      "30": "Kullanıcı adı/şifre hatalı veya API erişim izni yok",
      "40": "Gönderici başlığı onaylı değil",
      "50": "Abonelik/İYS kaynaklı gönderim engeli",
      "51": "Aboneliğe tanımlı gönderici başlığı bulunamadı",
      "70": "Hatalı sorgu - parametrelerden biri eksik",
      "80": "Gönderim sınırı aşıldı",
      "85": "Aynı numaraya çok fazla istek",
    };
    console.error("[sms] Netgsm hata kodu:", text);
    return { ok: false, error: hatalar[kod] || `SMS gönderilemedi (kod: ${kod})` };
  } catch (e) {
    console.error("[sms] gonderim hatasi:", e && e.message);
    return { ok: false, error: "SMS servisine ulaşılamadı." };
  }
}

/** Dogrulama mesaji - kisa ve tek amacli. */
export function verificationMessage(code) {
  return `Konuttalebi dogrulama kodun: ${code}. Kod 5 dakika gecerlidir. Bu kodu kimseyle paylasma.`;
}
