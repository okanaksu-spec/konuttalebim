// ---------------------------------------------------------------------------
// Sehir bazli SEO acilis sayfalari (12 sayfa).
// Sunucudan tam HTML doner: baslik, aciklama, H1 ve govde metni kaynak kodda
// gorunur; JavaScript beklemeye gerek yoktur.
//   /kiralik-ev-arayan/{il}  -> kiraci tarafi (talep olustur)
//   /evine-kiraci-bul/{il}   -> ev sahibi tarafi (talepleri gor)
// Metinler her il icin ozgundur; sablonun ili degistirilerek kopyalanmasi
// Google tarafindan yinelenen icerik sayilir.
// ---------------------------------------------------------------------------

const SITE = "https://konuttalebi.com";
const OG_IMAGE = `${SITE}/assets/hero-konuttalebim.webp`;

export const CITY_ORDER = ["istanbul", "ankara", "izmir", "eskisehir", "bursa", "antalya"];

// Tum oznitelikler cift tirnakli oldugu icin kesme isareti kacisi gerekmez;
// boylece baslik ve metinlerde "İstanbul'da" duzgun gorunur.
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export const CITIES = {
  istanbul: {
    name: "İstanbul",
    tenant: {
      title: "İstanbul Kiralık Ev Talebi Oluştur | Konuttalebi",
      description: "İstanbul'da nasıl bir ev aradığını yaz, ev sahipleri sana teklif göndersin. İlan karıştırmak yok, komisyon yok, aracı yok.",
      h1: "İstanbul'da kiralık ev arıyorsan aramayı bırak",
      city: [
        "İstanbul'da ev aramak, çoğu zaman şehri baştan sona gezmek anlamına geliyor. Kadıköy ve Beşiktaş'ta metroya yürüme mesafesindeki daireler günler içinde el değiştiriyor; Şişli ve Üsküdar'da ise aynı kira aralığında bambaşka büyüklükte evler çıkabiliyor. Sen bu koşuşturmayı yapmak yerine ne aradığını bir kez yazıyorsun: hangi semtte oturmak istediğini, kira aralığını, oda sayısını ve taşınma zamanını.",
        "Talebini gören ev sahipleri seni arıyor. Ataşehir ve Başakşehir tarafındaki site içi dairelerden Bakırköy ve Maltepe'nin daha yerleşik mahallelerine, Beylikdüzü ve Kartal'ın yeni yapılarına kadar farklı bölgelerden ev sahipleri sana ulaşabilir. İki yakadan da aranmak istiyorsan talebine birden fazla semt yazman yeterli.",
        "İstanbul'da ulaşım, kirayı kadar belirleyici. Talebini yazarken işine ya da okuluna kaç dakikada gitmek istediğini belirtirsen, seni arayan ev sahipleri baştan bu ölçüye göre gelir."
      ]
    },
    owner: {
      title: "İstanbul'da Evine Kiracı Bul | Konuttalebi",
      description: "İstanbul'da ev arayan kiracıların taleplerini bölgeye ve bütçeye göre filtrele, uygun olana teklifini gönder. Aracı yok.",
      h1: "İstanbul'daki kiracı talepleri seni bekliyor",
      city: [
        "İstanbul'da bir daireyi boş bekletmenin maliyeti başka hiçbir şehirle kıyaslanmıyor. Burada sırayı tersine çeviriyorsun: ilan verip beklemek yerine, hâlihazırda ev arayan kiracıların taleplerini görüyor ve uygun bulduğunu doğrudan arıyorsun.",
        "Talepleri semt ve kira aralığına göre süzebilirsin. Kadıköy, Beşiktaş ve Şişli tarafında talep yoğunluğu genellikle yüksek; Ataşehir, Bakırköy ve Maltepe'de aile büyüklüğüne göre net beklentiler görürsün; Beylikdüzü, Başakşehir ve Kartal'da ise site içi daire arayan kiracılar öne çıkar. Evine uygun talebi seçer, üyelikle kiracının iletişim bilgisini görüntüler ve telefonla ararsın.",
        "Kirayı, depozitoyu ve sözleşme şartlarını sen belirlersin. Konuttalebi pazarlığa girmez; kiracıyla doğrudan görüşürsün."
      ]
    }
  },

  ankara: {
    name: "Ankara",
    tenant: {
      title: "Ankara Kiralık Ev Talebi Oluştur | Konuttalebi",
      description: "Ankara'da aradığın evi tarif et, uygun ev sahipleri sana ulaşsın. Sen aramazsın, teklifler sana gelir. Komisyon yok.",
      h1: "Ankara'da kiralık ev arıyorsan aramayı bırak",
      city: [
        "Ankara'da kiralık ev ararken semt seçimi çoğu zaman işe ya da okula olan mesafeyle başlıyor. Çankaya'da merkeze yakın daireler hızlı el değiştiriyor, Keçiören ve Yenimahalle'de aynı kiraya daha geniş bir daire bulmak mümkün olabiliyor. Sen bu karşılaştırmayı tek tek yapmak yerine, aradığın evi tarif ediyorsun.",
        "Talebini yazdıktan sonra Etimesgut ve Sincan tarafındaki yeni yapılardan, Mamak ve Pursaklar'ın uygun kira aralığındaki dairelerine, Gölbaşı'nın daha sakin mahallelerine kadar farklı bölgelerden ev sahipleri seni arayabilir. Kamu kurumlarına ya da üniversite kampüslerine yakınlık senin için önemliyse bunu talebine yazman yeterli; seni o çerçevede ararlar.",
        "Ankara'da kış aylarında ısınma gideri kirayı doğrudan etkiliyor. Doğalgaz, merkezi sistem ya da kombi tercihini belirtirsen, seni arayan ev sahipleri bu ayrıntıyı baştan bilerek gelir."
      ]
    },
    owner: {
      title: "Ankara'da Evine Kiracı Bul | Konuttalebi",
      description: "Ankara'da ev arayan kiracıların taleplerini gör, sana uygun olanı seç ve teklifini doğrudan gönder. Emlakçı aracılığı yok.",
      h1: "Ankara'daki kiracı talepleri seni bekliyor",
      city: [
        "Ankara'da kiracı ararken en çok vakit kaybettiren şey, evine hiç uymayan görüşme taleplerine cevap yetiştirmek. Burada süreç tersten işliyor: kiracılar ne aradıklarını önceden yazıyor, sen de yalnızca evine uyan talep sahiplerini arıyorsun.",
        "Çankaya'da merkeze yakın daireler için talep genellikle yoğun; Keçiören, Yenimahalle ve Mamak'ta aile büyüklüğüne göre net kira aralıkları görürsün. Etimesgut, Sincan ve Pursaklar'da site içi ve yeni yapı arayan kiracılar öne çıkar, Gölbaşı'nda ise daha sakin bir çevre arayan talepler ağırlıkta olur.",
        "Üyelikle kiracının telefonunu görüntüler ve doğrudan ararsın; görüşme tamamen ikinizin arasında geçer. Kirayı ve şartları belirleyen taraf sensin."
      ]
    }
  },

  izmir: {
    name: "İzmir",
    tenant: {
      title: "İzmir Kiralık Ev Talebi Oluştur | Konuttalebi",
      description: "İzmir'de bütçeni ve semtini yaz, ev sahipleri teklifini sana göndersin. İlan gezmek yok, komisyon yok, aracı yok.",
      h1: "İzmir'de kiralık ev arıyorsan aramayı bırak",
      city: [
        "İzmir'de kiralık ev aramak, çoğu zaman körfezin iki yakası arasında gidip gelmek demek. Karşıyaka ve Bornova'da ulaşımı kolay daireler hızla kiralanıyor, Konak çevresinde ise aynı bütçeyle bambaşka yaşlarda binalar karşına çıkabiliyor. Sen semt semt dolaşmak yerine, aradığın evi bir kez tarif ediyorsun.",
        "Talebini gören ev sahipleri sana ulaşıyor. Buca ve Karabağlar tarafında uygun kira aralığında geniş daireler, Bayraklı'da yeni yapılar, Gaziemir ve Çiğli'de site içi seçenekler, Balçova'da ise merkeze yakın ama daha sakin mahalleler öne çıkıyor. Birden fazla semti aynı anda talebine yazabilirsin.",
        "İzmir'de deniz etkisi nedeniyle nemli katlar ve ısıtma tercihi kirayı etkileyen ayrıntılar arasında. Kaçıncı katta oturmak istediğini ve ısıtma tercihini belirtirsen, seni arayan ev sahipleri baştan buna göre gelir."
      ]
    },
    owner: {
      title: "İzmir'de Evine Kiracı Bul | Konuttalebi",
      description: "İzmir'de ev arayan kiracıların taleplerini semte ve kira aralığına göre filtrele, uygun talebe teklifini gönder.",
      h1: "İzmir'deki kiracı talepleri seni bekliyor",
      city: [
        "İzmir'de evini kiraya verirken doğru kiracıyı beklemek yerine, ev arayanların taleplerini incelemekle işe başlıyorsun. Kiracılar hangi semtte, hangi kira aralığında ve nasıl bir evde oturmak istediklerini önceden yazıyor.",
        "Karşıyaka ve Bornova'da ulaşıma yakın daireler için talep genellikle yoğun; Konak ve Balçova'da merkeze yakınlık öne çıkıyor. Buca ve Karabağlar'da geniş ve uygun kiralı daire arayan talepler, Bayraklı, Gaziemir ve Çiğli'de ise site içi ve yeni yapı arayan kiracılar görürsün.",
        "Evine uyan talebi seçip üyelikle kiracının iletişim bilgisini görüntülüyor ve doğrudan arıyorsun. Şartları kendi aranızda konuşuyorsunuz; araya kimse girmiyor."
      ]
    }
  },

  eskisehir: {
    name: "Eskişehir",
    tenant: {
      title: "Eskişehir Kiralık Ev Talebi Oluştur | Konuttalebi",
      description: "Eskişehir'de aradığın evi anlat, uygun ev sahipleri sana teklif getirsin. Saatlerce ilan karıştırmana gerek yok.",
      h1: "Eskişehir'de kiralık ev arıyorsan aramayı bırak",
      city: [
        "Eskişehir'de kiralık ev piyasası dönem başlarında hızlanıyor; uygun daireler birkaç gün içinde kiralanabiliyor. Bu tempoda tek tek gezmek yerine talebini önceden yazmak, seni sıranın önüne geçiriyor.",
        "Tepebaşı ve Odunpazarı ilçeleri şehrin iki ana yaşam alanı. Bağlar ve Emek çevresinde öğrenci ve genç çalışanların tercih ettiği daireler, Çamlıca tarafında ise ailelerin aradığı daha geniş evler öne çıkıyor. Hangi semti düşündüğünü, kira aralığını ve oda sayısını yazdığında ev sahipleri seni doğrudan arıyor.",
        "Üniversiteye ya da tramvay hattına yakınlık senin için belirleyiciyse talebine ekle. Eşyalı ev arıyorsan bunu da belirt; seni arayanlar baştan bu ölçülere göre gelsin."
      ]
    },
    owner: {
      title: "Eskişehir'de Evine Kiracı Bul | Konuttalebi",
      description: "Eskişehir'de ev arayan kiracıların taleplerini incele, evine uygun olanı seç ve teklifini gönder. Aracı yok, komisyon yok.",
      h1: "Eskişehir'deki kiracı talepleri seni bekliyor",
      city: [
        "Eskişehir'de kiracı talebi dönemsel dalgalanıyor; okul dönemi yaklaştığında ev arayan sayısı belirgin biçimde artıyor. Burada bu dalgayı beklemek yerine, hâlihazırda ev arayan kiracıların taleplerini görüp uygun olanı doğrudan arıyorsun.",
        "Tepebaşı ve Odunpazarı'ndaki talepleri kira aralığına göre süzebilirsin. Bağlar ve Emek çevresinde tek kişilik ya da paylaşımlı kullanıma uygun daireler için talep yoğun olurken, Çamlıca tarafında aile büyüklüğüne göre geniş daire arayan kiracılar öne çıkıyor.",
        "Eşyalı bir daire kiraya veriyorsan eşyalı ev arayan talepleri süzmen işini kolaylaştırır; kiracıların önemli bir bölümü bu ayrıntıyı talebine baştan yazıyor."
      ]
    }
  },

  bursa: {
    name: "Bursa",
    tenant: {
      title: "Bursa Kiralık Ev Talebi Oluştur | Konuttalebi",
      description: "Bursa'da nasıl bir ev istediğini yaz, ev sahipleri sana ulaşsın. Sen aramazsın, teklifler sana gelir. Komisyon yok.",
      h1: "Bursa'da kiralık ev arıyorsan aramayı bırak",
      city: [
        "Bursa'da semtler arasındaki fark kiraya doğrudan yansıyor. Nilüfer'de yeni yapılar ve site içi daireler öne çıkarken, Osmangazi'de merkeze yakınlık, Yıldırım'da ise daha uygun kira aralıkları belirleyici oluyor. Sen bu karşılaştırmayı yapmak yerine aradığın evi tarif ediyorsun.",
        "Talebini yazdığında Gürsu ve Kestel tarafındaki sanayi bölgelerine yakın dairelerden, Mudanya'nın deniz kıyısındaki evlerine kadar farklı bölgelerden ev sahipleri seni arayabilir. Birden fazla semt yazmak, aranma şansını artırır.",
        "İşine yakınlık Bursa'da en çok sorulan ayrıntılardan biri. Hangi bölgede çalıştığını ve kaç dakikalık mesafeyi kabul ettiğini yazarsan, seni arayanlar baştan bu çerçevede gelir."
      ]
    },
    owner: {
      title: "Bursa'da Evine Kiracı Bul | Konuttalebi",
      description: "Bursa'da ev arayan kiracıların taleplerini bölge ve bütçeye göre filtrele, uygun talebe teklifini doğrudan gönder.",
      h1: "Bursa'daki kiracı talepleri seni bekliyor",
      city: [
        "Bursa'da evini kiraya verirken kiracı beklemek yerine, ev arayanların yazdığı talepleri inceleyerek başlıyorsun. Her talepte bölge, kira aralığı, oda sayısı ve taşınma zamanı yazılı oluyor.",
        "Nilüfer'de site içi ve yeni yapı arayan kiracılar, Osmangazi'de merkeze yakınlık isteyen talepler, Yıldırım'da ise uygun kira aralığında geniş daire arayanlar öne çıkıyor. Gürsu ve Kestel'de işine yakın oturmak isteyen çalışanların talepleri, Mudanya'da ise deniz tarafında oturmak isteyenlerin talepleri görülür.",
        "Evine uygun talebi seçtikten sonra üyelikle kiracının iletişim bilgisini görüntüleyip doğrudan arıyorsun. Kirayı ve depozitoyu belirleyen taraf sensin."
      ]
    }
  },

  antalya: {
    name: "Antalya",
    tenant: {
      title: "Antalya Kiralık Ev Talebi Oluştur | Konuttalebi",
      description: "Antalya'da aradığın evi tarif et, uygun ev sahipleri teklif göndersin. İlan karıştırmak yok, komisyon yok, aracı yok.",
      h1: "Antalya'da kiralık ev arıyorsan aramayı bırak",
      city: [
        "Antalya'da uzun dönem kiralık ev bulmak, sezon hareketliliği nedeniyle çoğu şehirden daha zor olabiliyor. Muratpaşa'da merkeze yakın daireler hızla kiralanırken, Konyaaltı'nda sahile yakınlık kirayı belirleyen ilk başlık oluyor. Sen bu yarışın içinde tek tek aramak yerine talebini yazıyorsun.",
        "Kepez tarafında uygun kira aralığında geniş daireler, Döşemealtı'nda yeni yapılar öne çıkıyor. Alanya ve Manavgat'ta ise yıllık kiralama ile sezonluk kullanım bir arada bulunuyor; uzun dönem oturmak istediğini talebine yazarsan seni arayanlar buna göre gelir.",
        "Eşyalı ya da eşyasız tercihini ve taşınmak istediğin ayı belirtmen, Antalya'da seni arayan ev sahiplerinin isabetini belirgin biçimde artırır."
      ]
    },
    owner: {
      title: "Antalya'da Evine Kiracı Bul | Konuttalebi",
      description: "Antalya'da ev arayan kiracıların taleplerini gör, evine uygun olanı seç ve teklifini gönder. Emlakçı aracılığı yok.",
      h1: "Antalya'daki kiracı talepleri seni bekliyor",
      city: [
        "Antalya'da uzun dönem kiracı arıyorsan, sezonluk taleplerin arasında doğru kişiyi bulmak vakit alıyor. Burada kiracılar ne aradıklarını önceden yazdığı için, evine uyanı baştan seçebiliyorsun.",
        "Muratpaşa'da merkeze yakın oturmak isteyen talepler, Konyaaltı'nda sahile yakınlık arayan kiracılar öne çıkıyor. Kepez'de uygun kira aralığında geniş daire arayanlar, Döşemealtı'nda yeni yapı tercih edenler, Alanya ve Manavgat'ta ise yıl boyu oturacak kiracı talepleri görülür.",
        "Talebi seçip üyelikle kiracının iletişim bilgisini görüntülüyor ve doğrudan arıyorsun; şartları kendi aranızda konuşuyorsunuz. Kira ve sözleşme kararları tamamen sana ait."
      ]
    }
  }
};

// --- Ortak metinler -------------------------------------------------------
const TENANT_SUB = "Nasıl bir ev aradığını bir kez yaz, arkana yaslan. Uygun ev sahipleri seni bulup doğrudan arasın.";
const OWNER_SUB = "Evini boş bekletme. Kiracı taleplerini incele, iletişim bilgisini üyelikle aç, kirayı ve şartları kendin belirle.";

const TENANT_STEPS = [
  ["Talebini yaz", "Hangi semtte oturmak istediğini, kira aralığını, oda sayısını ve taşınma zamanını belirtirsin. Belge yüklemene gerek yok."],
  ["Talebin duyurulur", "E-posta doğrulamasıyla talebin yayına girer; kriterine uyan ev sahipleri ve onaylı danışmanlar haberdar olur."],
  ["Seni doğrudan ararlar", "İletişim bilgini görüntüleyen üyeler seni telefonla arar; her görüntülemede sana haber verilir. Şartları doğrudan konuşursunuz."]
];

const OWNER_STEPS = [
  ["Talepleri filtrele", "Bölge ve kira aralığına göre süz; evine uyan kiracı taleplerini tek listede görürsün."],
  ["İletişim bilgisini gör", "Uygun bulduğun talebin telefon ve e-postasını üyelikle görüntülersin; talep sahibine anonim bildirim gider."],
  ["Doğrudan ara ve anlaş", "Kiracıyı kendin arar, kirayı ve şartları birlikte belirlersiniz. Pazarlığa ve sözleşmeye karışmayız."]
];

function tenantFaq(il) {
  return [
    [`${il}'da kiralık ev talebi oluşturmak ne kadar sürüyor?`,
      "Yaklaşık iki dakika. Hangi semtte oturmak istediğini, kira aralığını ve oda sayısını yazman yeterli. Belge yüklemene gerek yok, beyanın kabul edilir."],
    ["Kiracı tarafında komisyon var mı?",
      "Hayır. Kiracı tarafında komisyon almıyoruz ve kira pazarlığına karışmıyoruz. Ev sahibiyle doğrudan görüşürsün."],
    ["Talebimi herkes görebiliyor mu?",
      "Talebin yayındayken sitede herkese açık olarak listelenir; bölge, oda sayısı, kira aralığın ve açıklaman görünür. Adın, telefonun ve e-postan kartta gösterilmez; iletişim bilgini yalnızca ücretli üyeler ve onaylı danışmanlar görüntüleyebilir ve her görüntülemede sana haber verilir."],
    [`${il}'da beni kimse aramazsa ne olur?`,
      "Talebin yayında kalır ve kriterine uyan yeni üyeler geldikçe onlara duyurulmaya devam eder. Talebini istediğin zaman düzenleyebilir ya da kapatabilirsin."]
  ];
}

function ownerFaq(il) {
  return [
    [`${il}'daki kiracı taleplerini görmek için üye olmam gerekiyor mu?`,
      "Talepleri bölge ve kira aralığına göre incelemek için üyelik gerekmez; yayındaki talepleri site üzerinden görebilirsin. Ödeme yalnızca talep sahibinin iletişim bilgisini görüntülemek içindir; üyelik süresince sınırsızdır."],
    ["İletişim bilgisini görünce ne oluyor?",
      "Kiracının adı, telefonu ve e-postası açılır; kendisine iletişim bilgisinin bir üye tarafından görüntülendiği bildirilir. Onu doğrudan arar, görüşmeyi kendi aranızda yürütürsünüz. Araya kimse girmez."],
    ["Kirayı ve şartları kim belirliyor?",
      "Sen belirlersin. Fiyata, depozitoya ya da sözleşme şartlarına karışmıyoruz."],
    [`${il}'da evim için uygun talep yoksa?`,
      "Panelinden aradığın kiracı profilini (bölge, kira aralığı) kriter olarak kaydedersin; uyan yeni bir talep yayına girdiğinde bildirim alırsın. Yeni kiracı talepleri sürekli ekleniyor."]
  ];
}

// --- HTML sablonu ---------------------------------------------------------
const HEADER_HTML = `
    <header class="site">
      <div class="wrap">
        <a class="logo" href="${SITE}/">Konuttalebi<small>TALEP VE TEKLİF</small></a>
        <nav class="nav">
          <a href="${SITE}/kiralik-ev-arayan">Kiralık ev arayan</a>
          <a href="${SITE}/evine-kiraci-bul">Evine kiracı bul</a>
          <a href="${SITE}/">Ana sayfa</a>
        </nav>
      </div>
    </header>`;

const FOOTER_HTML = `
    <footer class="site">
      <div class="wrap">
        <a href="${SITE}/#/nasil-calisir">Nasıl çalışır</a>
        <a href="${SITE}/#/fiyatlandirma">Fiyatlandırma</a>
        <a href="${SITE}/#/yardim">Yardım</a>
        <a href="${SITE}/#/kvkk">KVKK</a>
        <a href="${SITE}/#/kullanim-sartlari">Kullanım şartları</a>
        <p style="margin:14px 0 0">© 2026 Konuttalebi</p>
      </div>
    </footer>`;

const STYLE = `
      :root{--navy:#10243a;--navy2:#1b3552;--gold:#c8a24b;--ink:#14263b;--muted:#5b6b7d;--bg:#f6f8fb;--line:#e5eaf0}
      *{box-sizing:border-box}
      body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:var(--bg);line-height:1.6}
      a{color:inherit}
      .wrap{max-width:1060px;margin:0 auto;padding:0 22px}
      header.site{background:#fff;border-bottom:1px solid var(--line)}
      header.site .wrap{display:flex;align-items:center;justify-content:space-between;height:66px}
      .logo{font-weight:800;font-size:20px;color:var(--navy);text-decoration:none;letter-spacing:.3px}
      .logo small{display:block;font-size:10px;font-weight:700;letter-spacing:2px;color:var(--gold)}
      .nav a{margin-left:20px;text-decoration:none;color:var(--muted);font-weight:600;font-size:15px}
      .btn{display:inline-block;background:var(--gold);color:#231a06;padding:14px 24px;border-radius:12px;font-weight:800;text-decoration:none;border:0;font-size:16px;cursor:pointer}
      .btn.ghost{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.25)}
      .hero{background:linear-gradient(180deg,var(--navy),var(--navy2));color:#fff;padding:64px 0 70px}
      .eyebrow{display:inline-block;background:rgba(200,162,75,.16);color:var(--gold);font-weight:800;font-size:12.5px;letter-spacing:1.4px;padding:8px 14px;border-radius:999px;text-transform:uppercase}
      .hero h1{font-size:42px;line-height:1.12;margin:20px 0 14px;letter-spacing:-.5px}
      .hero p{font-size:19px;color:#cdd9e6;max-width:640px;margin:0 0 26px}
      section{padding:52px 0}
      h2{font-size:28px;letter-spacing:-.4px;margin:0 0 12px;color:var(--navy)}
      h3{font-size:18px;color:var(--navy);margin:0 0 6px}
      .lead{color:var(--muted);font-size:18px;max-width:700px;margin:0 0 28px}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
      .card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:24px}
      .card .n{width:34px;height:34px;border-radius:9px;background:var(--navy);color:var(--gold);display:flex;align-items:center;justify-content:center;font-weight:800;margin-bottom:12px}
      .prose p{color:#2b3b4d;font-size:16.5px;max-width:780px}
      .faq{background:#fff;border:1px solid var(--line);border-radius:16px;padding:22px 24px;margin-bottom:12px;max-width:820px}
      .faq p{margin:6px 0 0;color:var(--muted)}
      .cross{background:#fff;border:1px solid var(--line);border-radius:16px;padding:24px;max-width:820px}
      .band{background:var(--navy);color:#fff;text-align:center;border-radius:22px;padding:44px 24px}
      .band h2{color:#fff}.band p{color:#cdd9e6;max-width:560px;margin:0 auto 22px}
      footer.site{background:#0c1c2e;color:#9fb0c2;padding:34px 0;margin-top:52px;font-size:14px}
      footer.site a{color:#cdd9e6;text-decoration:none;margin-right:16px}
      @media(max-width:820px){.grid{grid-template-columns:1fr}.hero h1{font-size:31px}.nav{display:none}}`;

function jsonLd({ title, description, path, ilAdi, ustAd, ustPath, faq }) {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${SITE}/#website`, url: `${SITE}/`, name: "Konuttalebi", inLanguage: "tr-TR", publisher: { "@id": `${SITE}/#org` } },
      { "@type": "Organization", "@id": `${SITE}/#org`, name: "Konuttalebi", url: `${SITE}/`, logo: `${SITE}/assets/icon-512.png`, areaServed: CITY_ORDER.map((s) => CITIES[s].name) },
      { "@type": "WebPage", "@id": `${SITE}${path}#webpage`, url: `${SITE}${path}`, name: title, description, inLanguage: "tr-TR", isPartOf: { "@id": `${SITE}/#website` }, about: { "@type": "Place", name: ilAdi } },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: ustAd, item: `${SITE}${ustPath}` },
        { "@type": "ListItem", position: 3, name: ilAdi }
      ] },
      { "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }
    ]
  };
  // </script> kacisi: JSON icinde kapanis etiketi olusmasin
  return JSON.stringify(graph).replace(/</g, "\\u003c");
}

/**
 * Sehir sayfasinin tam HTML'ini uretir.
 * @param {"tenant"|"owner"} side
 * @param {string} slug  istanbul | ankara | izmir | eskisehir | bursa | antalya
 */
export function renderCityPage(side, slug) {
  const city = CITIES[slug];
  if (!city) return null;
  const isTenant = side === "tenant";
  const data = isTenant ? city.tenant : city.owner;
  const path = `${isTenant ? "/kiralik-ev-arayan" : "/evine-kiraci-bul"}/${slug}`;
  const ustPath = isTenant ? "/kiralik-ev-arayan" : "/evine-kiraci-bul";
  const ustAd = isTenant ? "Kiralık Ev Arayanlar" : "Evine Kiracı Bul";
  const sub = isTenant ? TENANT_SUB : OWNER_SUB;
  const steps = isTenant ? TENANT_STEPS : OWNER_STEPS;
  const faq = isTenant ? tenantFaq(city.name) : ownerFaq(city.name);
  const ctaLabel = isTenant ? "Talep Oluştur" : "Kiracı Taleplerini Gör";
  // CTA hedefi: kiraci -> talep formu (il onsecili), ev sahibi -> herkese acik talep listesi
  const ctaHref = isTenant
    ? `${SITE}/?il=${slug}&tx=RENT#/uye-ol/tenant`
    : `${SITE}/?il=${slug}#/ilanlar`;
  const crossPath = `${isTenant ? "/evine-kiraci-bul" : "/kiralik-ev-arayan"}/${slug}`;
  const crossTitle = isTenant
    ? `${city.name}'da evini kiraya mı vereceksin?`
    : `${city.name}'da kiralık ev mi arıyorsun?`;
  const crossText = isTenant
    ? `Aynı şehirde evi olan tarafa geç: ${city.name}'daki kiracı taleplerini görebilir, uygun bulduğunun iletişim bilgisini üyelikle açabilirsin.`
    : `Aynı şehirde ev arayan tarafa geç: ${city.name}'da kiralık ev talebini oluştur; ev sahipleri seni bulup doğrudan arasın.`;
  const crossLabel = isTenant ? `${city.name}'da evine kiracı bul` : `${city.name}'da kiralık ev talebi oluştur`;

  // Iki CTA ayni sayfada: ustteki hero, alttaki kapanis bandi. Konum ayri gonderilir.
  const taraf = isTenant ? "kiraci" : "ev_sahibi";
  const ctaAttr = (konum) => `onclick="ktCityCta('${slug}','${taraf}','${konum}','${ctaHref}')"`;

  return `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(data.title)}</title>
    <meta name="description" content="${esc(data.description)}" />
    <link rel="canonical" href="${SITE}${path}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta name="theme-color" content="#10243a" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="icon" type="image/png" sizes="32x32" href="/assets/icon-32.png" />
    <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" />

    <meta property="og:type" content="website" />
    <meta property="og:locale" content="tr_TR" />
    <meta property="og:site_name" content="Konuttalebi" />
    <meta property="og:title" content="${esc(data.title)}" />
    <meta property="og:description" content="${esc(data.description)}" />
    <meta property="og:url" content="${SITE}${path}" />
    <meta property="og:image" content="${OG_IMAGE}" />
    <meta name="twitter:card" content="summary_large_image" />

    <style>${STYLE}</style>

    <!-- Google tag (gtag.js) — Google Ads AW-18335656859 + GA4 -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=AW-18335656859"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'AW-18335656859');
      gtag('config', 'G-LFBWPTNVDE');
      // Sehir sayfasi CTA olayi (hangi ilin, hangi konumdaki butonu calisiyor?)
      // ONEMLI: gtag yukleyicisi Ads kimligiyle basladigi icin varsayilan hedef Ads'tir.
      // send_to yazilmazsa olay GA4'e ulasmaz; bu yuzden iki kimlik de acikca verilir.
      function ktCityCta(sehir, taraf, konum, hedef){
        try {
          gtag('event','sehir_sayfasi_cta',{
            send_to: ['G-LFBWPTNVDE','AW-18335656859'],
            sehir: sehir,
            taraf: taraf,
            konum: konum,   // 'hero' | 'bant'
            hedef: hedef    // gercek varis adresi
          });
        } catch(e){}
      }
    </script>
  </head>
  <body>
${HEADER_HTML}

    <div class="hero">
      <div class="wrap">
        <span class="eyebrow">${isTenant ? "Kiralık ev arayanlar" : "Evine kiracı bul"} · ${esc(city.name)}</span>
        <h1>${esc(data.h1)}</h1>
        <p>${esc(sub)}</p>
        <a class="btn" href="${ctaHref}" ${ctaAttr('hero')}>${ctaLabel}</a>
      </div>
    </div>

    <section>
      <div class="wrap">
        <h2>Nasıl çalışır?</h2>
        <p class="lead">${isTenant
          ? `${esc(city.name)}'da ev aramanın üç adımı. Aracı yok, komisyon yok; taraflar doğrudan anlaşır.`
          : `${esc(city.name)}'da kiracı bulmanın üç adımı. Aracı yok, komisyon yok; şartları sen belirlersin.`}</p>
        <div class="grid">
          ${steps.map(([t, d], i) => `<article class="card"><div class="n">${i + 1}</div><h3>${esc(t)}</h3><p>${esc(d)}</p></article>`).join("")}
        </div>
      </div>
    </section>

    <section style="background:#fff;border-top:1px solid var(--line);border-bottom:1px solid var(--line)">
      <div class="wrap prose">
        <h2>${esc(city.name)}'da hangi bölgelerde çalışıyor?</h2>
        ${data.city.map((p) => `<p>${esc(p)}</p>`).join("\n        ")}
      </div>
    </section>

    <section>
      <div class="wrap">
        <h2>${esc(crossTitle)}</h2>
        <div class="cross">
          <p style="margin:0 0 14px;color:var(--muted)">${esc(crossText)}</p>
          <a href="${SITE}${crossPath}" style="font-weight:700;color:#1f6feb">${esc(crossLabel)} →</a>
        </div>
      </div>
    </section>

    <section style="background:#fff;border-top:1px solid var(--line)">
      <div class="wrap">
        <h2>Sık sorulan sorular</h2>
        ${faq.map(([q, a]) => `<div class="faq"><h3>${esc(q)}</h3><p>${esc(a)}</p></div>`).join("\n        ")}
      </div>
    </section>

    <section>
      <div class="wrap">
        <div class="band">
          <h2>${isTenant ? `${esc(city.name)}'da aradığın evi tarif et` : `${esc(city.name)}'daki talepleri incele`}</h2>
          <p>${esc(sub)}</p>
          <a class="btn" href="${ctaHref}" ${ctaAttr('bant')}>${ctaLabel}</a>
        </div>
      </div>
    </section>

${FOOTER_HTML}

    <script type="application/ld+json">${jsonLd({ title: data.title, description: data.description, path, ilAdi: city.name, ustAd, ustPath, faq })}</script>
  </body>
</html>`;
}

// Sitemap icin tum sehir sayfasi yollari
export function cityPagePaths() {
  const out = [];
  for (const slug of CITY_ORDER) out.push(`/kiralik-ev-arayan/${slug}`);
  for (const slug of CITY_ORDER) out.push(`/evine-kiraci-bul/${slug}`);
  return out;
}
