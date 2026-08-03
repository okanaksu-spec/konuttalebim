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
const OG_IMAGE = `${SITE}/assets/og-image.jpg`;

export const CITY_ORDER = ["istanbul", "ankara", "izmir", "eskisehir", "bursa", "antalya"];

// Tum oznitelikler cift tirnakli oldugu icin kesme isareti kacisi gerekmez;
// boylece baslik ve metinlerde "İstanbul'da" duzgun gorunur.
// Turkce ek uyumu: son unluye gore 'da / 'de (Izmir'de, Ankara'da).
const ekDA = (il) => {
  const u = String(il).toLowerCase().split("").reverse().find((h) => "aeıioöuü".includes(h)) || "a";
  return "aıou".includes(u) ? "da" : "de";
};
const ilDA = (il) => `${il}'${ekDA(il)}`;
const ilDAKI = (il) => `${il}'${ekDA(il)}ki`;

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export const CITIES = {
  istanbul: {
    name: "İstanbul",
    tenant: {
      title: "İstanbul Kiralık Ev: Talebini Bırak | Konuttalebi",
      description: "İstanbul'da kiralık ev arıyorsan aramayı bırak. Nasıl bir ev istediğini ve bütçeni yaz; talebin yayına girsin, İstanbul'daki evi uyanlar seni doğrudan arasın.",
      h1: "İstanbul'da kiralık ev arıyorsan aramayı bırak",
      city: [
        "İstanbul'da ev aramak, çoğu zaman şehri baştan sona gezmek anlamına geliyor. Kadıköy ve Beşiktaş'ta metroya yürüme mesafesindeki daireler günler içinde el değiştiriyor; Şişli ve Üsküdar'da ise aynı kira aralığında bambaşka büyüklükte evler çıkabiliyor. Sen bu koşuşturmayı yapmak yerine ne aradığını bir kez yazıyorsun: hangi semtte oturmak istediğini, kira aralığını, oda sayısını ve taşınma zamanını.",
        "Talebini gören ev sahipleri seni arıyor. Ataşehir ve Başakşehir tarafındaki site içi dairelerden Bakırköy ve Maltepe'nin daha yerleşik mahallelerine, Beylikdüzü ve Kartal'ın yeni yapılarına kadar farklı bölgelerden ev sahipleri sana ulaşabilir. İki yakadan da aranmak istiyorsan talebine birden fazla semt yazman yeterli.",
        "İstanbul'da ulaşım, kirayı kadar belirleyici. Talebini yazarken işine ya da okuluna kaç dakikada gitmek istediğini belirtirsen, seni arayan ev sahipleri baştan bu ölçüye göre gelir."
      ]
    },
    owner: {
      title: "İstanbul'da Evine Kiracı Bul: Talepleri Gör | Konuttalebi",
      description: "İstanbul'da ev arayan kiracıların taleplerini gör. Evine uygun talebi seç, iletişime geç, kiracıyla doğrudan konuş. Kiracıyı beklemek yok; seçim tamamen sende.",
      h1: "İstanbul'daki kiracı talepleri seni bekliyor",
      city: [
        "İstanbul'da bir daireyi boş bekletmenin maliyeti başka hiçbir şehirle kıyaslanmıyor. Burada sırayı tersine çeviriyorsun: ilan verip beklemek yerine, hâlihazırda ev arayan kiracıların taleplerini görüyor ve uygun bulduğunu doğrudan arıyorsun.",
        "Talepleri semt ve kira aralığına göre süzebilirsin. Kadıköy, Beşiktaş ve Şişli tarafında talep yoğunluğu genellikle yüksek; Ataşehir, Bakırköy ve Maltepe'de aile büyüklüğüne göre net beklentiler görürsün; Beylikdüzü, Başakşehir ve Kartal'da ise site içi daire arayan kiracılar öne çıkar. Evine uygun talebi seçer, üyelikle kiracının iletişim bilgisini görüntüler ve telefonla ararsın.",
        "Kirayı, depozitoyu ve sözleşme şartlarını sen belirlersin. Konuttalebi pazarlığa girmez; kiracıyla doğrudan görüşürsün."
      ]
    },
    buyer: {
      title: "İstanbul Konut Alım Talebi: Talebini Bırak | Konuttalebi",
      description: "İstanbul'da ev almak istiyorsan aramayı bırak. Bölgeni, bütçeni ve kredi tercihini yaz; evi sana uyanlar iletişim bilgine ulaşıp seni doğrudan arasın.",
      h1: "İstanbul'da ev almak istiyorsan aramayı bırak",
      city: [
        "İstanbul'da ev satın almak, aynı bütçeyle bambaşka hayatlar arasında seçim yapmak demek. Kadıköy ve Beşiktaş'ta metro yakınındaki daireler hızla el değiştirirken, Beylikdüzü ve Başakşehir'de aynı rakama site içinde çok daha geniş bir daire çıkabiliyor. Sen bu karşılaştırmayı tek tek gezerek yapmak yerine ne aradığını bir kez yazıyorsun: semt, bütçe aralığı, oda sayısı ve alım zamanı.",
        "Talebini gören ev sahipleri ve onaylı danışmanlar sana ulaşıyor. Ataşehir ve Ümraniye'nin yeni projelerinden Bakırköy ve Maltepe'nin yerleşik mahallelerine, Kartal ve Pendik'in dönüşüm bölgelerine kadar farklı yakalardan aramalar gelebilir. Birden fazla semt yazarsan iki yakadan da aranırsın.",
        "İstanbul'da kredi kullanımı alım kararını doğrudan etkiliyor. Banka kredisi kullanıp kullanmayacağını talebinde belirtirsen, seni arayanlar bunu baştan bilerek arar; peşinat ve ödeme planı konuşmaları ilk telefonda başlar."
      ]
    },
    vendor: {
      title: "İstanbul'da Evine Alıcı Bul: Talepleri Gör | Konuttalebi",
      description: "İstanbul'da ev almak isteyenlerin taleplerini gör. Evine uygun alıcıyı seç, iletişim bilgisini görüntüle ve doğrudan konuş. Alıcıyı beklemek yok.",
      h1: "İstanbul'daki konut alım talepleri seni bekliyor",
      city: [
        "İstanbul'da bir evi elden çıkarmak için sıra beklemek zaman kaybı. Burada tersini yapıyorsun: hâlihazırda ev almak isteyenlerin taleplerini görüyor, evine uyanı seçip doğrudan arıyorsun.",
        "Talepleri semt ve bütçe aralığına göre süzebilirsin. Kadıköy, Beşiktaş ve Şişli tarafında talep yoğunluğu genellikle yüksek; Ataşehir, Bakırköy ve Maltepe'de aile büyüklüğüne göre net beklentiler görürsün; Beylikdüzü, Başakşehir ve Kartal'da site içi daire arayan alıcılar öne çıkar.",
        "Her talepte alıcının banka kredisi kullanıp kullanmayacağı yazar; peşin alıcıyla krediyle alacak olanı aramadan önce ayırt edersin. Fiyatı ve şartları sen belirlersin, pazarlığa karışmayız."
      ]
    }
  },

  ankara: {
    name: "Ankara",
    tenant: {
      title: "Ankara Kiralık Ev: Talebini Bırak | Konuttalebi",
      description: "Ankara'da kiralık ev arıyorsan aramayı bırak. Nasıl bir ev istediğini ve bütçeni yaz; talebin yayına girsin, Ankara'daki evi uyanlar seni doğrudan arasın.",
      h1: "Ankara'da kiralık ev arıyorsan aramayı bırak",
      city: [
        "Ankara'da kiralık ev ararken semt seçimi çoğu zaman işe ya da okula olan mesafeyle başlıyor. Çankaya'da merkeze yakın daireler hızlı el değiştiriyor, Keçiören ve Yenimahalle'de aynı kiraya daha geniş bir daire bulmak mümkün olabiliyor. Sen bu karşılaştırmayı tek tek yapmak yerine, aradığın evi tarif ediyorsun.",
        "Talebini yazdıktan sonra Etimesgut ve Sincan tarafındaki yeni yapılardan, Mamak ve Pursaklar'ın uygun kira aralığındaki dairelerine, Gölbaşı'nın daha sakin mahallelerine kadar farklı bölgelerden ev sahipleri seni arayabilir. Kamu kurumlarına ya da üniversite kampüslerine yakınlık senin için önemliyse bunu talebine yazman yeterli; seni o çerçevede ararlar.",
        "Ankara'da kış aylarında ısınma gideri kirayı doğrudan etkiliyor. Doğalgaz, merkezi sistem ya da kombi tercihini belirtirsen, seni arayan ev sahipleri bu ayrıntıyı baştan bilerek gelir."
      ]
    },
    owner: {
      title: "Ankara'da Evine Kiracı Bul: Talepleri Gör | Konuttalebi",
      description: "Ankara'da ev arayan kiracıların taleplerini gör. Evine uygun talebi seç, iletişime geç, kiracıyla doğrudan konuş. Kiracıyı beklemek yok; seçim tamamen sende.",
      h1: "Ankara'daki kiracı talepleri seni bekliyor",
      city: [
        "Ankara'da kiracı ararken en çok vakit kaybettiren şey, evine hiç uymayan görüşme taleplerine cevap yetiştirmek. Burada süreç tersten işliyor: kiracılar ne aradıklarını önceden yazıyor, sen de yalnızca evine uyan talep sahiplerini arıyorsun.",
        "Çankaya'da merkeze yakın daireler için talep genellikle yoğun; Keçiören, Yenimahalle ve Mamak'ta aile büyüklüğüne göre net kira aralıkları görürsün. Etimesgut, Sincan ve Pursaklar'da site içi ve yeni yapı arayan kiracılar öne çıkar, Gölbaşı'nda ise daha sakin bir çevre arayan talepler ağırlıkta olur.",
        "Üyelikle kiracının telefonunu görüntüler ve doğrudan ararsın; görüşme tamamen ikinizin arasında geçer. Kirayı ve şartları belirleyen taraf sensin."
      ]
    },
    buyer: {
      title: "Ankara Konut Alım Talebi: Talebini Bırak | Konuttalebi",
      description: "Ankara'da ev almak istiyorsan aramayı bırak. Bölgeni, bütçeni ve kredi tercihini yaz; evi sana uyanlar iletişim bilgine ulaşıp seni doğrudan arasın.",
      h1: "Ankara'da ev almak istiyorsan aramayı bırak",
      city: [
        "Ankara'da ev satın alırken semt seçimi çoğu zaman işe ve okula mesafeyle başlıyor. Çankaya'da merkeze yakın daireler değerini korurken, Etimesgut ve Sincan'da aynı bütçeyle daha yeni ve daha geniş bir daire mümkün olabiliyor. Sen bu hesabı tek tek yapmak yerine aradığın evi tarif ediyorsun.",
        "Talebini yazdıktan sonra Yenimahalle ve Keçiören'in yerleşik mahallelerinden, Gölbaşı ve Pursaklar'ın daha sakin bölgelerine kadar farklı yerlerden ev sahipleri ve onaylı danışmanlar seni arayabilir. Kamu kurumlarına veya üniversite kampüslerine yakınlık senin için önemliyse bunu talebine yazman yeterli.",
        "Ankara'da ısınma gideri ve bina yaşı, alım kararının ayrılmaz parçası. Bütçe aralığını ve alım zamanını net yazarsan, seni arayanlar bu çerçeveye uyan evlerle gelir."
      ]
    },
    vendor: {
      title: "Ankara'da Evine Alıcı Bul: Talepleri Gör | Konuttalebi",
      description: "Ankara'da ev almak isteyenlerin taleplerini gör. Evine uygun alıcıyı seç, iletişim bilgisini görüntüle ve doğrudan konuş. Alıcıyı beklemek yok.",
      h1: "Ankara'daki konut alım talepleri seni bekliyor",
      city: [
        "Ankara'da evini elden çıkarmak isteyip alıcı bekleyenlerin en çok yakındığı şey, eve hiç uymayan görüşme talepleri. Burada alıcılar ne aradığını önceden yazıyor; sen yalnızca evine uyanları arıyorsun.",
        "Çankaya'da merkeze yakın daireler için talep genellikle yoğun; Keçiören, Yenimahalle ve Mamak'ta aile büyüklüğüne göre net bütçe aralıkları görürsün. Etimesgut, Sincan ve Pursaklar'da yeni yapı ve site içi arayan alıcılar öne çıkar, Gölbaşı'nda daha sakin çevre arayanlar ağırlıkta olur.",
        "Ücretli üyelikle alıcının telefonunu görüntüler ve doğrudan ararsın; görüşme tamamen ikinizin arasında geçer. Fiyatı belirleyen taraf sensin."
      ]
    }
  },

  izmir: {
    name: "İzmir",
    tenant: {
      title: "İzmir Kiralık Ev: Talebini Bırak | Konuttalebi",
      description: "İzmir'de kiralık ev arıyorsan aramayı bırak. Nasıl bir ev istediğini ve bütçeni yaz; talebin yayına girsin, İzmir'deki evi uyanlar seni doğrudan arasın.",
      h1: "İzmir'de kiralık ev arıyorsan aramayı bırak",
      city: [
        "İzmir'de kiralık ev aramak, çoğu zaman körfezin iki yakası arasında gidip gelmek demek. Karşıyaka ve Bornova'da ulaşımı kolay daireler hızla kiralanıyor, Konak çevresinde ise aynı bütçeyle bambaşka yaşlarda binalar karşına çıkabiliyor. Sen semt semt dolaşmak yerine, aradığın evi bir kez tarif ediyorsun.",
        "Talebini gören ev sahipleri sana ulaşıyor. Buca ve Karabağlar tarafında uygun kira aralığında geniş daireler, Bayraklı'da yeni yapılar, Gaziemir ve Çiğli'de site içi seçenekler, Balçova'da ise merkeze yakın ama daha sakin mahalleler öne çıkıyor. Birden fazla semti aynı anda talebine yazabilirsin.",
        "İzmir'de deniz etkisi nedeniyle nemli katlar ve ısıtma tercihi kirayı etkileyen ayrıntılar arasında. Kaçıncı katta oturmak istediğini ve ısıtma tercihini belirtirsen, seni arayan ev sahipleri baştan buna göre gelir."
      ]
    },
    owner: {
      title: "İzmir'de Evine Kiracı Bul: Talepleri Gör | Konuttalebi",
      description: "İzmir'de ev arayan kiracıların taleplerini gör. Evine uygun talebi seç, iletişime geç, kiracıyla doğrudan konuş. Kiracıyı beklemek yok; seçim tamamen sende.",
      h1: "İzmir'deki kiracı talepleri seni bekliyor",
      city: [
        "İzmir'de evini kiraya verirken doğru kiracıyı beklemek yerine, ev arayanların taleplerini incelemekle işe başlıyorsun. Kiracılar hangi semtte, hangi kira aralığında ve nasıl bir evde oturmak istediklerini önceden yazıyor.",
        "Karşıyaka ve Bornova'da ulaşıma yakın daireler için talep genellikle yoğun; Konak ve Balçova'da merkeze yakınlık öne çıkıyor. Buca ve Karabağlar'da geniş ve uygun kiralı daire arayan talepler, Bayraklı, Gaziemir ve Çiğli'de ise site içi ve yeni yapı arayan kiracılar görürsün.",
        "Evine uyan talebi seçip üyelikle kiracının iletişim bilgisini görüntülüyor ve doğrudan arıyorsun. Şartları kendi aranızda konuşuyorsunuz; araya kimse girmiyor."
      ]
    },
    buyer: {
      title: "İzmir Konut Alım Talebi: Talebini Bırak | Konuttalebi",
      description: "İzmir'de ev almak istiyorsan aramayı bırak. Bölgeni, bütçeni ve kredi tercihini yaz; evi sana uyanlar iletişim bilgine ulaşıp seni doğrudan arasın.",
      h1: "İzmir'de ev almak istiyorsan aramayı bırak",
      city: [
        "İzmir'de ev satın almak, körfezin iki yakası arasında karar vermek demek. Karşıyaka ve Bornova'da ulaşımı kolay daireler hızla el değiştirirken, Buca ve Karabağlar'da aynı bütçeyle daha geniş bir daire çıkabiliyor. Sen semt semt dolaşmak yerine aradığın evi bir kez tarif ediyorsun.",
        "Talebini gören ev sahipleri ve onaylı danışmanlar sana ulaşıyor. Bayraklı'nın yeni yapıları, Gaziemir ve Çiğli'nin site içi seçenekleri, Balçova ve Narlıdere'nin merkeze yakın ama sakin mahalleleri arasından birden fazla semti aynı anda talebine yazabilirsin.",
        "İzmir'de bina yaşı, kat ve cephe alım kararını etkileyen ayrıntılar arasında. Bunları ve banka kredisi tercihini talebinde belirtirsen, seni arayanlar baştan buna göre arar."
      ]
    },
    vendor: {
      title: "İzmir'de Evine Alıcı Bul: Talepleri Gör | Konuttalebi",
      description: "İzmir'de ev almak isteyenlerin taleplerini gör. Evine uygun alıcıyı seç, iletişim bilgisini görüntüle ve doğrudan konuş. Alıcıyı beklemek yok.",
      h1: "İzmir'deki konut alım talepleri seni bekliyor",
      city: [
        "İzmir'de evini elden çıkarırken alıcı beklemek yerine, ev almak isteyenlerin taleplerini incelemekle işe başlıyorsun. Alıcılar hangi semtte, hangi bütçeyle ve nasıl bir evde oturmak istediklerini önceden yazıyor.",
        "Karşıyaka ve Bornova'da ulaşıma yakın daireler için talep genellikle yoğun; Konak ve Balçova'da merkeze yakınlık öne çıkıyor. Buca ve Karabağlar'da geniş ve uygun bütçeli daire arayanlar, Bayraklı, Gaziemir ve Çiğli'de yeni yapı arayan alıcılar görürsün.",
        "Evine uyan talebi seçip ücretli üyelikle alıcının iletişim bilgisini görüntülüyor ve doğrudan arıyorsun. Şartları kendi aranızda konuşuyorsunuz; araya kimse girmiyor."
      ]
    }
  },

  eskisehir: {
    name: "Eskişehir",
    tenant: {
      title: "Eskişehir Kiralık Ev: Talebini Bırak | Konuttalebi",
      description: "Eskişehir'de kiralık ev arıyorsan aramayı bırak. Nasıl bir ev istediğini ve bütçeni yaz; talebin yayına girsin, Eskişehir'deki evi uyanlar seni doğrudan arasın.",
      h1: "Eskişehir'de kiralık ev arıyorsan aramayı bırak",
      city: [
        "Eskişehir'de kiralık ev piyasası dönem başlarında hızlanıyor; uygun daireler birkaç gün içinde kiralanabiliyor. Bu tempoda tek tek gezmek yerine talebini önceden yazmak, seni sıranın önüne geçiriyor.",
        "Tepebaşı ve Odunpazarı ilçeleri şehrin iki ana yaşam alanı. Bağlar ve Emek çevresinde öğrenci ve genç çalışanların tercih ettiği daireler, Çamlıca tarafında ise ailelerin aradığı daha geniş evler öne çıkıyor. Hangi semti düşündüğünü, kira aralığını ve oda sayısını yazdığında ev sahipleri seni doğrudan arıyor.",
        "Üniversiteye ya da tramvay hattına yakınlık senin için belirleyiciyse talebine ekle. Eşyalı ev arıyorsan bunu da belirt; seni arayanlar baştan bu ölçülere göre gelsin."
      ]
    },
    owner: {
      title: "Eskişehir'de Evine Kiracı Bul: Talepleri Gör | Konuttalebi",
      description: "Eskişehir'de ev arayan kiracıların taleplerini gör. Evine uygun talebi seç, iletişime geç, kiracıyla doğrudan konuş. Kiracıyı beklemek yok; seçim tamamen sende.",
      h1: "Eskişehir'deki kiracı talepleri seni bekliyor",
      city: [
        "Eskişehir'de kiracı talebi dönemsel dalgalanıyor; okul dönemi yaklaştığında ev arayan sayısı belirgin biçimde artıyor. Burada bu dalgayı beklemek yerine, hâlihazırda ev arayan kiracıların taleplerini görüp uygun olanı doğrudan arıyorsun.",
        "Tepebaşı ve Odunpazarı'ndaki talepleri kira aralığına göre süzebilirsin. Bağlar ve Emek çevresinde tek kişilik ya da paylaşımlı kullanıma uygun daireler için talep yoğun olurken, Çamlıca tarafında aile büyüklüğüne göre geniş daire arayan kiracılar öne çıkıyor.",
        "Eşyalı bir daire kiraya veriyorsan eşyalı ev arayan talepleri süzmen işini kolaylaştırır; kiracıların önemli bir bölümü bu ayrıntıyı talebine baştan yazıyor."
      ]
    },
    buyer: {
      title: "Eskişehir Konut Alım Talebi: Talebini Bırak | Konuttalebi",
      description: "Eskişehir'de ev almak istiyorsan aramayı bırak. Bölgeni, bütçeni ve kredi tercihini yaz; evi sana uyanlar iletişim bilgine ulaşıp seni doğrudan arasın.",
      h1: "Eskişehir'de ev almak istiyorsan aramayı bırak",
      city: [
        "Eskişehir'de ev satın alırken şehrin ölçeği işi kolaylaştırıyor: çoğu semt merkeze yakın, ulaşım tramvayla çözülüyor. Yine de Odunpazarı'nın yerleşik mahalleleriyle Tepebaşı'nın yeni yapı bölgeleri arasında ciddi fiyat ve yaşam farkı var. Sen bu farkı tek tek gezerek değil, ne aradığını yazarak çözüyorsun.",
        "Talebini gören ev sahipleri ve onaylı danışmanlar seni arıyor. Üniversite çevresi, çarşıya yakınlık veya sakin bir mahalle senin için önemliyse bunu talebine yazman yeterli; aramalar o çerçevede gelir.",
        "Eskişehir'de kışın ısınma gideri alım kararında belirleyici. Bina yaşı ve ısıtma tercihini bütçenle birlikte yazarsan, seni arayanlar uygun evlerle gelir."
      ]
    },
    vendor: {
      title: "Eskişehir'de Evine Alıcı Bul: Talepleri Gör | Konuttalebi",
      description: "Eskişehir'de ev almak isteyenlerin taleplerini gör. Evine uygun alıcıyı seç, iletişim bilgisini görüntüle ve doğrudan konuş. Alıcıyı beklemek yok.",
      h1: "Eskişehir'deki konut alım talepleri seni bekliyor",
      city: [
        "Eskişehir'de evini elden çıkarmak için sıra beklemek yerine, ev almak isteyenlerin taleplerini görüyorsun. Şehir küçük ölçekli olduğu için evine uyan alıcıyı bulmak birkaç dakikalık iş.",
        "Odunpazarı ve Tepebaşı'ndaki talepler çoğunlukla merkeze ve tramvay hattına yakınlık üzerinden şekilleniyor; üniversite çevresinde ise daha küçük ve pratik daire arayanlar öne çıkıyor.",
        "Ücretli üyelikle alıcının telefonunu görüntüler, doğrudan ararsın. Fiyatı ve şartları belirleyen taraf sensin; pazarlığa karışmayız."
      ]
    }
  },

  bursa: {
    name: "Bursa",
    tenant: {
      title: "Bursa Kiralık Ev: Talebini Bırak | Konuttalebi",
      description: "Bursa'da kiralık ev arıyorsan aramayı bırak. Nasıl bir ev istediğini ve bütçeni yaz; talebin yayına girsin, Bursa'daki evi uyanlar seni doğrudan arasın.",
      h1: "Bursa'da kiralık ev arıyorsan aramayı bırak",
      city: [
        "Bursa'da semtler arasındaki fark kiraya doğrudan yansıyor. Nilüfer'de yeni yapılar ve site içi daireler öne çıkarken, Osmangazi'de merkeze yakınlık, Yıldırım'da ise daha uygun kira aralıkları belirleyici oluyor. Sen bu karşılaştırmayı yapmak yerine aradığın evi tarif ediyorsun.",
        "Talebini yazdığında Gürsu ve Kestel tarafındaki sanayi bölgelerine yakın dairelerden, Mudanya'nın deniz kıyısındaki evlerine kadar farklı bölgelerden ev sahipleri seni arayabilir. Birden fazla semt yazmak, aranma şansını artırır.",
        "İşine yakınlık Bursa'da en çok sorulan ayrıntılardan biri. Hangi bölgede çalıştığını ve kaç dakikalık mesafeyi kabul ettiğini yazarsan, seni arayanlar baştan bu çerçevede gelir."
      ]
    },
    owner: {
      title: "Bursa'da Evine Kiracı Bul: Talepleri Gör | Konuttalebi",
      description: "Bursa'da ev arayan kiracıların taleplerini gör. Evine uygun talebi seç, iletişime geç, kiracıyla doğrudan konuş. Kiracıyı beklemek yok; seçim tamamen sende.",
      h1: "Bursa'daki kiracı talepleri seni bekliyor",
      city: [
        "Bursa'da evini kiraya verirken kiracı beklemek yerine, ev arayanların yazdığı talepleri inceleyerek başlıyorsun. Her talepte bölge, kira aralığı, oda sayısı ve taşınma zamanı yazılı oluyor.",
        "Nilüfer'de site içi ve yeni yapı arayan kiracılar, Osmangazi'de merkeze yakınlık isteyen talepler, Yıldırım'da ise uygun kira aralığında geniş daire arayanlar öne çıkıyor. Gürsu ve Kestel'de işine yakın oturmak isteyen çalışanların talepleri, Mudanya'da ise deniz tarafında oturmak isteyenlerin talepleri görülür.",
        "Evine uygun talebi seçtikten sonra üyelikle kiracının iletişim bilgisini görüntüleyip doğrudan arıyorsun. Kirayı ve depozitoyu belirleyen taraf sensin."
      ]
    },
    buyer: {
      title: "Bursa Konut Alım Talebi: Talebini Bırak | Konuttalebi",
      description: "Bursa'da ev almak istiyorsan aramayı bırak. Bölgeni, bütçeni ve kredi tercihini yaz; evi sana uyanlar iletişim bilgine ulaşıp seni doğrudan arasın.",
      h1: "Bursa'da ev almak istiyorsan aramayı bırak",
      city: [
        "Bursa'da ev satın alırken Nilüfer'in site içi yeni yapıları ile Osmangazi ve Yıldırım'ın yerleşik mahalleleri arasında net bir tercih yapmak gerekiyor. Aynı bütçe iki bölgede bambaşka evler açıyor. Sen bu karşılaştırmayı tek tek gezmek yerine, aradığın evi bir kez tarif ediyorsun.",
        "Talebini gören ev sahipleri ve onaylı danışmanlar sana ulaşıyor. Sanayi bölgelerine, hastanelere veya okullara yakınlık senin için önemliyse talebine yazman yeterli; aramalar o ölçüye göre gelir.",
        "Bursa'da site aidatı ve bina yaşı aylık gideri doğrudan etkiliyor. Bütçe aralığını, alım zamanını ve kredi tercihini net yazarsan, seni arayanlar bunları bilerek arar."
      ]
    },
    vendor: {
      title: "Bursa'da Evine Alıcı Bul: Talepleri Gör | Konuttalebi",
      description: "Bursa'da ev almak isteyenlerin taleplerini gör. Evine uygun alıcıyı seç, iletişim bilgisini görüntüle ve doğrudan konuş. Alıcıyı beklemek yok.",
      h1: "Bursa'daki konut alım talepleri seni bekliyor",
      city: [
        "Bursa'da evini elden çıkarırken alıcı beklemek yerine hazır talepler arasından seçim yapıyorsun. Alıcılar bölgeyi, bütçeyi ve alım zamanını önceden yazıyor.",
        "Nilüfer'de site içi ve yeni yapı arayan alıcılar öne çıkarken, Osmangazi ve Yıldırım'da merkeze yakın ve uygun bütçeli daire arayanlar ağırlıkta oluyor. Mudanya tarafında ise deniz yakını arayan talepler görürsün.",
        "Evine uyan talebi seç, ücretli üyelikle alıcının iletişim bilgisini görüntüle ve doğrudan ara. Fiyatı sen belirlersin."
      ]
    }
  },

  antalya: {
    name: "Antalya",
    tenant: {
      title: "Antalya Kiralık Ev: Talebini Bırak | Konuttalebi",
      description: "Antalya'da kiralık ev arıyorsan aramayı bırak. Nasıl bir ev istediğini ve bütçeni yaz; talebin yayına girsin, Antalya'daki evi uyanlar seni doğrudan arasın.",
      h1: "Antalya'da kiralık ev arıyorsan aramayı bırak",
      city: [
        "Antalya'da uzun dönem kiralık ev bulmak, sezon hareketliliği nedeniyle çoğu şehirden daha zor olabiliyor. Muratpaşa'da merkeze yakın daireler hızla kiralanırken, Konyaaltı'nda sahile yakınlık kirayı belirleyen ilk başlık oluyor. Sen bu yarışın içinde tek tek aramak yerine talebini yazıyorsun.",
        "Kepez tarafında uygun kira aralığında geniş daireler, Döşemealtı'nda yeni yapılar öne çıkıyor. Alanya ve Manavgat'ta ise yıllık kiralama ile sezonluk kullanım bir arada bulunuyor; uzun dönem oturmak istediğini talebine yazarsan seni arayanlar buna göre gelir.",
        "Eşyalı ya da eşyasız tercihini ve taşınmak istediğin ayı belirtmen, Antalya'da seni arayan ev sahiplerinin isabetini belirgin biçimde artırır."
      ]
    },
    owner: {
      title: "Antalya'da Evine Kiracı Bul: Talepleri Gör | Konuttalebi",
      description: "Antalya'da ev arayan kiracıların taleplerini gör. Evine uygun talebi seç, iletişime geç, kiracıyla doğrudan konuş. Kiracıyı beklemek yok; seçim tamamen sende.",
      h1: "Antalya'daki kiracı talepleri seni bekliyor",
      city: [
        "Antalya'da uzun dönem kiracı arıyorsan, sezonluk taleplerin arasında doğru kişiyi bulmak vakit alıyor. Burada kiracılar ne aradıklarını önceden yazdığı için, evine uyanı baştan seçebiliyorsun.",
        "Muratpaşa'da merkeze yakın oturmak isteyen talepler, Konyaaltı'nda sahile yakınlık arayan kiracılar öne çıkıyor. Kepez'de uygun kira aralığında geniş daire arayanlar, Döşemealtı'nda yeni yapı tercih edenler, Alanya ve Manavgat'ta ise yıl boyu oturacak kiracı talepleri görülür.",
        "Talebi seçip üyelikle kiracının iletişim bilgisini görüntülüyor ve doğrudan arıyorsun; şartları kendi aranızda konuşuyorsunuz. Kira ve sözleşme kararları tamamen sana ait."
      ]
    },
    buyer: {
      title: "Antalya Konut Alım Talebi: Talebini Bırak | Konuttalebi",
      description: "Antalya'da ev almak istiyorsan aramayı bırak. Bölgeni, bütçeni ve kredi tercihini yaz; evi sana uyanlar iletişim bilgine ulaşıp seni doğrudan arasın.",
      h1: "Antalya'da ev almak istiyorsan aramayı bırak",
      city: [
        "Antalya'da ev satın almak, yıl boyu oturmakla sezonluk kullanım arasında bir tercih meselesi. Muratpaşa ve Konyaaltı'nda merkeze ve sahile yakın daireler değerini korurken, Kepez ve Döşemealtı'nda aynı bütçeyle daha geniş bir daire mümkün olabiliyor. Sen bu hesabı tek tek gezerek değil, talebini yazarak yapıyorsun.",
        "Talebini gören ev sahipleri ve onaylı danışmanlar seni arıyor. Sahile mesafe, site içi olması veya havuz gibi tercihler senin için belirleyiciyse talebine yazman yeterli.",
        "Antalya'da sezon dışı ve sezon içi fiyat farkı belirgin. Alım zamanını ve banka kredisi tercihini talebinde belirtirsen, seni arayanlar buna göre gelir."
      ]
    },
    vendor: {
      title: "Antalya'da Evine Alıcı Bul: Talepleri Gör | Konuttalebi",
      description: "Antalya'da ev almak isteyenlerin taleplerini gör. Evine uygun alıcıyı seç, iletişim bilgisini görüntüle ve doğrudan konuş. Alıcıyı beklemek yok.",
      h1: "Antalya'daki konut alım talepleri seni bekliyor",
      city: [
        "Antalya'da evini elden çıkarırken alıcı beklemek yerine, hazır alım taleplerini inceliyorsun. Alıcılar bölgeyi, bütçeyi ve alım zamanını önceden yazıyor.",
        "Muratpaşa ve Konyaaltı'nda merkeze ve sahile yakınlık öne çıkıyor; Kepez ve Döşemealtı'nda daha geniş ve uygun bütçeli daire arayanlar ağırlıkta. Serik ve Aksu tarafında site içi ve yazlık kullanım arayan talepler görürsün.",
        "Ücretli üyelikle alıcının telefonunu görüntüler, doğrudan ararsın. Fiyatı ve şartları sen belirlersin; pazarlığa karışmayız."
      ]
    }
  }
};;

// --- Ortak metinler -------------------------------------------------------
const TENANT_SUB = "Nasıl bir ev aradığını bir kez yaz, arkana yaslan. Uygun ev sahipleri seni bulup doğrudan arasın.";
const OWNER_SUB = "Evini boş bekletme. Kiracı taleplerini incele, iletişim bilgisini üyelikle aç, kirayı ve şartları kendin belirle.";

const BUYER_SUB = "Nasıl bir ev almak istediğini bir kez yaz, arkana yaslan. Evi sana uyanlar seni bulup doğrudan arasın.";
const VENDOR_SUB = "Alıcı bekleme. Konut alım taleplerini incele, iletişim bilgisini ücretli üyelikle aç, fiyatı ve şartları kendin belirle.";

const BUYER_STEPS = [
  ["Talebini yaz", "Hangi semtte oturmak istediğini, bütçe aralığını, oda sayısını, alım zamanını ve banka kredisi kullanıp kullanmayacağını belirtirsin. Belge yüklemene gerek yok."],
  ["Talebin duyurulur", "E-posta doğrulamasıyla talebin yayına girer; herkese açık listede görünür, adın ve iletişim bilgin gizli kalır."],
  ["Seni doğrudan ararlar", "İletişim bilgini ücretli üyelikle görüntüleyenler seni telefonla arar; her görüntülemede sana haber verilir. Fiyatı doğrudan konuşursunuz."]
];

const VENDOR_STEPS = [
  ["Talepleri filtrele", "Bölge ve bütçe aralığına göre süz; evine uyan konut alım taleplerini tek listede görürsün."],
  ["İletişim bilgisini gör", "Uygun bulduğun talebin telefon ve e-postasını ücretli üyelikle görüntülersin; talep sahibine bildirim gider."],
  ["Doğrudan ara ve anlaş", "Alıcıyı kendin arar, fiyatı ve şartları birlikte belirlersiniz. Pazarlığa ve sözleşmeye karışmayız."]
];

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

function buyerFaq(il) {
  return [
    [`${il}'da konut alım talebi oluşturmak ne kadar sürüyor?`,
      "Yaklaşık iki dakika. Hangi semtte oturmak istediğini, bütçe aralığını, oda sayısını ve banka kredisi kullanıp kullanmayacağını yazman yeterli. Belge yüklemene gerek yok, beyanın kabul edilir."],
    ["Alıcı tarafında komisyon var mı?",
      "Hayır. Talep bırakmak ve aranmak tamamen ücretsizdir; komisyon almıyoruz ve fiyat pazarlığına karışmıyoruz. Ev sahibiyle doğrudan görüşürsün."],
    ["Talebimi herkes görebiliyor mu?",
      "Talebin yayındayken herkese açık listede görünür; bölge, oda sayısı, bütçe aralığın ve açıklaman yer alır. Adın, telefonun ve e-postan kartta gösterilmez; iletişim bilgini yalnızca ücretli üyeler ve onaylı danışmanlar görüntüleyebilir ve her görüntülemede sana bildirim gider."],
    ["Banka kredisi sorusu neden var?",
      "Kredi kullanıp kullanmayacağın alım sürecini doğrudan etkiliyor. Bunu baştan belirtmen, seni arayanların ödeme planını bilerek aramasını sağlar; boşa görüşme olmaz."]
  ];
}

function vendorFaq(il) {
  return [
    [`${il}'daki konut alım taleplerini görmek için üye olmam gerekiyor mu?`,
      "Talepleri bölge ve bütçe aralığına göre incelemek için üyelik gerekmez; yayındaki talepleri site üzerinden görebilirsin. Ödeme yalnızca talep sahibinin iletişim bilgisini görüntülemek içindir; üyelik süresince sınırsızdır."],
    ["İletişim bilgisini görünce ne oluyor?",
      "Alıcının adı, telefonu ve e-postası açılır; kendisine iletişim bilgisinin bir üye tarafından görüntülendiği bildirilir. Onu doğrudan arar, görüşmeyi kendi aranızda yürütürsünüz. Araya kimse girmez."],
    ["Fiyatı kim belirliyor?",
      "Sen belirlersin. Fiyata, pazarlığa ya da sözleşme şartlarına karışmayız; alıcıyla doğrudan anlaşırsınız."],
    ["Talepler güncel mi?",
      "Her talep e-posta doğrulamasından geçer ve 60 günde bir yenilenir; süresi geçen talep listeden kalkar. Gerçekçi olmayan bütçeli talepler yayına alınmaz."]
  ];
}

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
      :root{--navy:#020617;--navy2:#0f172a;--gold:#4f46e5;--gold2:#4338ca;--ink:#020617;--muted:#475569;--bg:#f8fafc;--line:#e2e8f0;--soft:#eef2ff}
      *{box-sizing:border-box}
      body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:var(--bg);line-height:1.6}
      a{color:inherit}
      .wrap{max-width:1060px;margin:0 auto;padding:0 22px}
      header.site{background:#fff;border-bottom:1px solid var(--line)}
      header.site .wrap{display:flex;align-items:center;justify-content:space-between;height:66px}
      .logo{font-weight:800;font-size:20px;color:var(--navy);text-decoration:none;letter-spacing:.3px}
      .logo small{display:block;font-size:9.5px;font-weight:800;letter-spacing:2.2px;color:var(--gold2)}
      .nav a{margin-left:20px;text-decoration:none;color:var(--muted);font-weight:600;font-size:15px}
      .btn{display:inline-block;background:var(--gold);color:#fff;padding:13px 24px;border-radius:10px;font-weight:600;text-decoration:none;border:0;font-size:15.5px;cursor:pointer}
      .btn.ghost{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.25)}
      .hero{background:radial-gradient(900px 420px at 20% -10%,var(--soft),transparent),#fff;color:var(--ink);border-bottom:1px solid var(--line);padding:60px 0 66px}
      .eyebrow{display:inline-block;background:var(--soft);color:var(--gold);font-weight:700;font-size:12px;letter-spacing:1.6px;padding:7px 14px;border-radius:999px;text-transform:uppercase}
      .hero h1{font-size:41px;line-height:1.14;margin:18px 0 14px;letter-spacing:-.8px}
      .hero p{font-size:18px;color:var(--muted);max-width:660px;margin:0 0 26px}
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
      .band{background:var(--ink);color:#fff;text-align:center;border-radius:18px;padding:44px 24px}
      .band h2{color:#fff}.band p{color:#cdd9e6;max-width:560px;margin:0 auto 22px}
      footer.site{background:#fff;border-top:1px solid var(--line);color:var(--muted);padding:30px 0;margin-top:52px;font-size:13.5px}
      footer.site a{color:var(--muted);text-decoration:none;margin-right:16px;font-weight:600}
      @media(max-width:820px){.grid{grid-template-columns:1fr}.hero h1{font-size:31px}.nav a:not(.btn){display:none}}@media(max-width:520px){.wrap{padding:0 16px}.hero{padding:40px 0 44px}.hero h1{font-size:26px;line-height:1.24}.hero p{font-size:16px}h2{font-size:23px}.btn{display:block;text-align:center}.band{padding:32px 18px}.prose p{font-size:15.5px}.card{padding:18px}}`;

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

// Sayfa hacmini artiran taraf bazli detay bolumu (Okan, 2026-07-31: "daha cok
// aciklama"). Sehir metinleri zaten ozgun; bu bolum hizmetin isleyisini anlatir.
const DETAY = {
  tenant: {
    baslik: (il) => `${ilDA(il)} kiralık ev talebi bırakmak ne demek?`,
    p: [
      "Klasik yöntemde ev arayan kişi yüzlerce sayfayı gezer, ilgilendiği evi arar, çoğu zaman \"kiralandı\" cevabını alır. Konuttalebi bu sırayı tersine çevirir: arayan taraf ne istediğini bir kez yazar, evi bu tarife uyanlar ona ulaşır. Böylece boşa telefon trafiği ortadan kalkar; yalnızca gerçekten uygun evler için görüşme yaparsın.",
      "Talebinde bölge, oda sayısı, aylık kira aralığı, taşınma zamanı, meslek ve eşyalı tercihini belirtirsin. Bu bilgiler kartında görünür; adın, telefonun ve e-postan görünmez. Ev sahibi veya onaylı danışman iletişim bilgini ancak ücretli üyelikle görüntüleyebilir ve her görüntülemede sana e-posta gider.",
    ],
    m: [
      "Talep bırakmak ve aranmak kiracı için tamamen ücretsizdir; komisyon alınmaz.",
      "Kimlik veya gelir belgesi yüklemezsin; yalnızca tercihlerini beyan edersin.",
      "Talebin 60 gün yayında kalır, süre dolmadan hatırlatma gelir ve tek tıkla yenilenir.",
      "Aynı anda birden fazla semt yazabilirsin; aramalar hepsinden gelir.",
      "Rahatsız edici bir arama olursa talebi panelinden bildirebilir veya duraklatabilirsin.",
    ],
    kapanis: "Kirayı, depozitoyu ve sözleşme şartlarını doğrudan ev sahibiyle konuşursun; fiyata ve pazarlığa karışmayız.",
  },
  owner: {
    baslik: (il) => `${ilDA(il)} kiracı talebi nasıl değerlendirilir?`,
    p: [
      "Evini boş bekletmenin maliyeti her ay cebinden çıkar. Burada beklemek yerine hazır talepler arasından seçim yaparsın: kiracılar hangi bölgede, hangi kira aralığında ve ne zaman taşınmak istediklerini önceden yazmıştır.",
      "Talep kartında bölge, oda sayısı, kira aralığı, taşınma zamanı, meslek ve eşyalı tercihi görünür. Kimlik ve iletişim bilgisi gizlidir. Evine uyan talebi bulduğunda ücretli üyelikle telefonu görüntüler, kiracıyı kendin ararsın.",
    ],
    m: [
      "Talepleri üye olmadan da inceleyebilirsin; ödeme yalnızca iletişim görüntülemek içindir.",
      "Üyelik süresince sınırsız talep görüntülersin, tek tek ücret ödemezsin.",
      "Her talep e-posta doğrulamasından geçer; gerçekçi olmayan bütçeler yayına alınmaz.",
      "Talepler 60 günde bir yenilenir; listede gördüğün talep günceldir.",
      "Kriter kaydedersen, uyan yeni talep geldiğinde sana bildirim gelir.",
    ],
    kapanis: "Kirayı ve şartları sen belirlersin; görüşme tamamen kiracıyla senin aranda geçer.",
  },
  buyer: {
    baslik: (il) => `${ilDA(il)} konut alım talebi bırakmak ne demek?`,
    p: [
      "Ev satın almak, kiralamaktan daha uzun ve daha yorucu bir süreç. Klasik yöntemde yüzlerce sayfa gezilir, çoğu görüşme boşa çıkar. Konuttalebi'nde sırayı tersine çevirirsin: nasıl bir ev almak istediğini bir kez yazarsın, evi bu tarife uyanlar sana ulaşır.",
      "Talebinde bölge, bütçe aralığı, oda sayısı, alım zamanı ve banka kredisi kullanıp kullanmayacağını belirtirsin. Kredi bilgisi özellikle önemlidir: seni arayan taraf ödeme planını baştan bilerek arar, ilk telefonda konu netleşir. Adın ve iletişim bilgin talebinde görünmez.",
    ],
    m: [
      "Talep bırakmak ve aranmak alıcı için tamamen ücretsizdir; komisyon alınmaz.",
      "İletişim bilgini yalnızca ücretli üyeler ve Seviye 5 belgeli onaylı danışmanlar görüntüleyebilir.",
      "Her görüntülemede sana e-posta gider; kimin ulaştığını takip edersin.",
      "Talebin 60 gün yayında kalır, hatırlatmayla tek tıkla yenilenir.",
      "Bütçe aralığını sonradan panelinden değiştirebilir, talebini duraklatabilirsin.",
    ],
    kapanis: "Fiyatı, ödeme planını ve tapu sürecini doğrudan karşı tarafla konuşursun; pazarlığa ve sözleşmeye karışmayız.",
  },
  vendor: {
    baslik: (il) => `${ilDA(il)} konut alım talepleri nasıl değerlendirilir?`,
    p: [
      "Bir evi elden çıkarırken en zor kısım, gerçekten alım niyeti olan kişiye ulaşmaktır. Burada alıcılar ne aradıklarını, bütçelerini ve alım zamanlarını önceden yazar; sen yalnızca evine uyan talebi seçersin.",
      "Talep kartında bölge, bütçe aralığı, oda sayısı, alım zamanı ve banka kredisi tercihi görünür. Peşin alıcıyla krediyle alacak olanı aramadan önce ayırt edersin. Kimlik ve iletişim bilgisi, sen görüntüleyene kadar gizlidir.",
    ],
    m: [
      "Talepleri üye olmadan da inceleyebilirsin; ödeme yalnızca iletişim görüntülemek içindir.",
      "Üyelik süresince sınırsız talep görüntülersin.",
      "Her talep e-posta doğrulamasından geçer; gerçekçi olmayan bütçeler yayına alınmaz.",
      "Kredi tercihi talepte yazılıdır; ödeme planını aramadan önce bilirsin.",
      "Kriter kaydedersen, uyan yeni talep geldiğinde bildirim alırsın.",
    ],
    kapanis: "Fiyatı ve şartları sen belirlersin; alıcıyla doğrudan görüşürsün, araya kimse girmez.",
  },
};

export function renderCityPage(side, slug) {
  const city = CITIES[slug];
  if (!city) return null;
  // 2026-07-31: dort taraf — kiralik (tenant/owner) + satin alma (buyer/vendor).
  const TARAF = {
    tenant: { veri: "tenant", yol: "/kiralik-ev-arayan", ustAd: "Kiralık Ev Arayanlar", karsi: "owner",  cta: "Talep Oluştur",  talepTarafi: true,  tx: "RENT",
      nasilLead: (il) => `${ilDA(il)} kiralık ev aramanın üç adımı. Komisyon yok; şartları doğrudan ev sahibiyle konuşursun.`,
      bant: (il) => `${ilDA(il)} aradığın evi tarif et`,
      bolgeBaslik: (il) => `${ilDA(il)} hangi bölgelerde çalışıyor?` },
    owner:  { veri: "owner",  yol: "/evine-kiraci-bul",  ustAd: "Evine Kiracı Bul",     karsi: "tenant", cta: "Kiracı Taleplerini Gör", talepTarafi: false, tx: "RENT",
      nasilLead: (il) => `${ilDA(il)} kiracı bulmanın üç adımı. Komisyon yok; kirayı ve şartları sen belirlersin.`,
      bant: (il) => `${ilDAKI(il)} kiracı taleplerini incele`,
      bolgeBaslik: (il) => `${ilDA(il)} hangi bölgelerde kiracı talebi var?` },
    buyer:  { veri: "buyer",  yol: "/ev-almak-isteyen",  ustAd: "Ev Almak İsteyenler",  karsi: "vendor", cta: "Talep Oluştur",  talepTarafi: true,  tx: "SALE",
      nasilLead: (il) => `${ilDA(il)} ev satın almanın üç adımı. Komisyon yok; fiyatı doğrudan ev sahibiyle konuşursun.`,
      bant: (il) => `${ilDA(il)} almak istediğin evi tarif et`,
      bolgeBaslik: (il) => `${ilDA(il)} hangi bölgelerde çalışıyor?` },
    vendor: { veri: "vendor", yol: "/evine-alici-bul",   ustAd: "Evine Alıcı Bul",      karsi: "buyer",  cta: "Alım Taleplerini Gör", talepTarafi: false, tx: "SALE",
      nasilLead: (il) => `${ilDA(il)} alıcı bulmanın üç adımı. Komisyon yok; fiyatı ve şartları sen belirlersin.`,
      bant: (il) => `${ilDAKI(il)} konut alım taleplerini incele`,
      bolgeBaslik: (il) => `${ilDA(il)} hangi bölgelerde alıcı talebi var?` },
  };
  const T = TARAF[side] || TARAF.tenant;
  const K = TARAF[T.karsi];
  const isTenant = side === "tenant";
  const data = city[T.veri];
  if (!data) return null;
  const path = `${T.yol}/${slug}`;
  const ustPath = T.yol;
  const ustAd = T.ustAd;
  const sub = side === "tenant" ? TENANT_SUB : side === "owner" ? OWNER_SUB : side === "buyer" ? BUYER_SUB : VENDOR_SUB;
  const steps = side === "tenant" ? TENANT_STEPS : side === "owner" ? OWNER_STEPS : side === "buyer" ? BUYER_STEPS : VENDOR_STEPS;
  const faq = side === "tenant" ? tenantFaq(city.name) : side === "owner" ? ownerFaq(city.name) : side === "buyer" ? buyerFaq(city.name) : vendorFaq(city.name);
  const ctaLabel = T.cta;
  // CTA hedefi: kiraci -> talep formu (il onsecili), ev sahibi -> herkese acik talep listesi
  // 2.0 duzeltmesi (2026-07-31): eski akis (#/uye-ol/tenant ve #/ilanlar) olu.
  // Talep tarafi -> misafir talep formu; arz tarafi -> herkese acik talep listesi.
  const ctaHref = T.talepTarafi
    ? `${SITE}/talep-birak?il=${slug}${T.tx === "SALE" ? "&tx=SALE" : ""}`
    : `${SITE}/talepler?il=${slug}${T.tx === "SALE" ? "&tx=SALE" : ""}`;
  const crossPath = `${K.yol}/${slug}`;
  const CAPRAZ = {
    tenant: {
      baslik: `${ilDA(city.name)} evini kiraya mı vereceksin?`,
      metin: `Aynı şehirde evi olan tarafa geç: ${ilDAKI(city.name)} kiracı taleplerini görebilir, uygun bulduğunun iletişim bilgisini ücretli üyelikle açabilirsin.`,
      etiket: `${ilDA(city.name)} evine kiracı bul`,
    },
    owner: {
      baslik: `${ilDA(city.name)} kiralık ev mi arıyorsun?`,
      metin: `Aynı şehirde ev arayan tarafa geç: ${ilDA(city.name)} kiralık ev talebini oluştur; evi sana uyanlar seni bulup doğrudan arasın.`,
      etiket: `${ilDA(city.name)} kiralık ev talebi oluştur`,
    },
    buyer: {
      baslik: `${ilDA(city.name)} evine alıcı mı arıyorsun?`,
      metin: `Aynı şehirde evi olan tarafa geç: ${ilDAKI(city.name)} konut alım taleplerini görebilir, uygun bulduğunun iletişim bilgisini ücretli üyelikle açabilirsin.`,
      etiket: `${ilDA(city.name)} evine alıcı bul`,
    },
    vendor: {
      baslik: `${ilDA(city.name)} ev mi almak istiyorsun?`,
      metin: `Aynı şehirde alan tarafa geç: ${ilDA(city.name)} konut alım talebini oluştur; evi sana uyanlar seni bulup doğrudan arasın.`,
      etiket: `${ilDA(city.name)} konut alım talebi oluştur`,
    },
  };
  const C = CAPRAZ[side] || CAPRAZ.tenant;
  const D = DETAY[side] || DETAY.tenant;
  const crossTitle = C.baslik;
  const crossText = C.metin;
  const crossLabel = C.etiket;

  // Iki CTA ayni sayfada: ustteki hero, alttaki kapanis bandi. Konum ayri gonderilir.
  const taraf = side === "tenant" ? "kiraci" : side === "owner" ? "ev_sahibi" : side === "buyer" ? "alici" : "evine_alici_arayan";
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
        <span class="eyebrow">${esc(T.ustAd)} · ${esc(city.name)}</span>
        <h1>${esc(data.h1)}</h1>
        <p>${esc(sub)}</p>
        <a class="btn" href="${ctaHref}" ${ctaAttr('hero')}>${ctaLabel}</a>
      </div>
    </div>

    <section>
      <div class="wrap">
        <h2>Nasıl çalışır?</h2>
        <p class="lead">${esc(T.nasilLead(city.name))}</p>
        <div class="grid">
          ${steps.map(([t, d], i) => `<article class="card"><div class="n">${i + 1}</div><h3>${esc(t)}</h3><p>${esc(d)}</p></article>`).join("")}
        </div>
      </div>
    </section>

    <section style="background:#fff;border-top:1px solid var(--line);border-bottom:1px solid var(--line)">
      <div class="wrap prose">
        <h2>${esc(T.bolgeBaslik(city.name))}</h2>
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

    <section>
      <div class="wrap prose">
        <h2>${esc(D.baslik(city.name))}</h2>
        ${D.p.map((t) => `<p>${esc(t)}</p>`).join("\n        ")}
        <ul style="margin:18px 0;padding-left:20px;color:var(--muted)">
          ${D.m.map((t) => `<li style="margin:8px 0">${esc(t)}</li>`).join("\n          ")}
        </ul>
        <p>${esc(D.kapanis)}</p>
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
          <h2>${esc(T.bant(city.name))}</h2>
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
  // Satin alma tarafi: AJANS onayi (SAYFA HARITASI) gelene kadar sitemap'e
  // eklenmez — sayfalar yayinda ama arama motoruna sunulmaz.
  // for (const slug of CITY_ORDER) out.push(`/ev-almak-isteyen/${slug}`);
  // for (const slug of CITY_ORDER) out.push(`/evine-alici-bul/${slug}`);
  return out;
}
