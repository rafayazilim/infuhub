/** Kayıt formlarında gösterilen yasal metinler (KVKK, iade, hizmet tanımı) */

export type LegalDocSubsection = {
  title: string;
  bullets: string[];
  intro?: string[];
};

export type LegalDocSection = {
  id: "privacyKvkk" | "refundPolicy" | "serviceDefinition";
  title: string;
  subsections: LegalDocSubsection[];
};

export const REGISTER_LEGAL_DOCUMENTS: LegalDocSection[] = [
  {
    id: "privacyKvkk",
    title: "Gizlilik Koşulları Ve KVKK",
    subsections: [
      {
        title: "1. Veri Sorumlusu",
        intro: [
          "Infuhub Platformu (“Infuhub”) olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) kapsamında veri sorumlusu sıfatıyla, kişisel verilerinizi aşağıda açıklanan kapsamda işlemekteyiz.",
          "Infuhub; markalar ile influencerları bir araya getiren, yapay zeka destekli analizler ve veri odaklı eşleştirme sistemleri aracılığıyla dijital pazarlama süreçlerini optimize etmeyi amaçlayan bir influencer marketing platformudur.",
          "Platform kapsamında; influencer performans analizleri, kampanya yönetimi, dönüşüm takibi (conversion tracking), kullanıcı davranış analizi, yeniden pazarlama (remarketing) faaliyetleri, finansal işlem yönetimi ve raporlama hizmetleri sunulmaktadır.",
          "Bu doğrultuda kişisel verileriniz; platforma üyelik oluşturulması, kullanıcı işlemlerinin gerçekleştirilmesi, kampanya süreçlerinin yürütülmesi, API ve SDK entegrasyonları, çerezler (cookies) ve diğer dijital teknolojiler aracılığıyla otomatik veya otomatik olmayan yöntemlerle toplanmakta ve işlenmektedir.",
          "Platform üzerinde gerçekleştirilen marka ve influencer iş birlikleri kapsamında, kullanıcılar tarafından paylaşılan veriler, işin gerekliliği doğrultusunda diğer kullanıcılar ile paylaşılabilmektedir.",
        ],
        bullets: [],
      },
      {
        title: "2. İşlenen Kişisel Veriler",
        intro: [
          "Infuhub Platformu kapsamında sunulan hizmetler doğrultusunda, kullanıcıların (influencerlar ve markalar) kişisel verileri aşağıdaki kategorilerde işlenmektedir:",
        ],
        bullets: [
          "Kimlik Bilgileri: Ad, soyad, kimlik doğrulama süreçlerinde paylaşılan kimlik belgesi görselleri ve kullanıcıların doğrulama amacıyla yüklediği yüz fotoğrafları.",
          "İletişim Bilgileri: E-posta adresi, telefon numarası ve kullanıcılar tarafından sağlanan diğer iletişim bilgileri.",
          "Mesleki ve Platform Kullanım Bilgileri: Influencerlara ait takipçi kitlesine ilişkin analiz verileri, etkileşim oranları, içerik türleri, portfolyo bilgileri ve platform üzerindeki performans verileri; markalara ait sektör, kategori, marka adı ve platform kullanım bilgileri.",
          "Finansal Bilgiler: Ödeme süreçlerinin yürütülmesi amacıyla IBAN bilgileri ve ödeme hareketlerine ilişkin veriler.",
          "Görsel ve Kurumsal Veriler: Influencerların doğrulama amacıyla yüklediği fotoğraflar ve içerikler; markaların doğrulama süreçlerinde sunduğu vergi levhası, marka logoları ve ilgili belgeler.",
          "Teknik ve Davranışsal Veriler: IP adresi, çerez (cookie) verileri, platform kullanım hareketleri, tıklama ve etkileşim verileri, kampanya performans verileri ve kullanıcı davranışlarına ilişkin analiz verileri.",
          "Entegrasyon ve Sistem Verileri: Platformun teknik altyapısı kapsamında elde edilen performans, dönüşüm ve analiz verileri.",
          "Kampanya ve İş Birliği Verileri: Influencerlar ile markalar arasında gerçekleştirilen kampanyalara ilişkin eşleşme bilgileri, kampanya içerikleri, performans ölçümleri, dönüşüm verileri ve iş birliği süreçlerine ilişkin tüm operasyonel veriler.",
        ],
      },
      {
        title: "3. Kişisel Verilerin İşlenme Amaçları",
        intro: ["Toplanan kişisel veriler aşağıdaki amaçlarla işlenmektedir:"],
        bullets: [
          "Influencerlar ile markalar arasında uygun eşleşmelerin sağlanması ve iş birliği süreçlerinin yürütülmesi",
          "Kampanya oluşturma, yönetme ve sonuçlandırma süreçlerinin gerçekleştirilmesi",
          "Influencer performanslarının analiz edilmesi ve kampanya verimliliğinin ölçülmesi",
          "Dönüşüm takibi, kullanıcı davranış analizi ve raporlama faaliyetlerinin yürütülmesi",
          "Finansal işlemlerin gerçekleştirilmesi, ödeme ve gelir takibinin sağlanması",
          "Kullanıcı deneyiminin geliştirilmesi ve platformun optimize edilmesi",
          "Teknik entegrasyonların sağlanması ve sistemin sürdürülebilirliğinin sağlanması",
          "Platform güvenliğinin sağlanması ve kullanıcı doğrulama süreçlerinin yürütülmesi",
          "Yasal yükümlülüklerin yerine getirilmesi",
        ],
      },
      {
        title: "4. Kişisel Verilerin Aktarılması",
        intro: [
          "Infuhub Platformu tarafından işlenen kişisel veriler, yalnızca hizmetin gereklilikleri doğrultusunda sınırlı şekilde aktarılmaktadır:",
        ],
        bullets: [
          "Influencerlar ile markalar arasında iş birliği süreçlerinin yürütülmesi amacıyla karşılıklı veri paylaşımı yapılabilir.",
          "Influencerlara ait performans verileri, etkileşim oranları, kampanya başarı ölçümleri ve portfolyo içerikleri markalar tarafından görüntülenebilir.",
          "Markalara ait marka bilgileri, kampanya içerikleri ve hedeflenen performans kriterleri influencerlar tarafından görüntülenebilir.",
          "Bu paylaşımlar yalnızca platform işleyişi ile sınırlı olup, üçüncü taraflarla izinsiz paylaşım yapılmamaktadır.",
        ],
      },
      {
        title: "5. İlgili Kişinin Hakları",
        intro: [
          "Platform kapsamında; influencer performans analizleri (erişim, gösterim, etkileşim oranları, içerik performansı, takipçi artış/azalış verileri, kampanya bazlı performans skorları), kampanya yönetimi (kampanya oluşturma, hedef kitle belirleme, içerik planlama, yayın takibi ve onay süreçleri), dönüşüm takibi (satış, tıklama, lead ve diğer aksiyon bazlı dönüşümlerin ölçümlenmesi), kullanıcı davranış analizi (platform içi etkileşimler, içerik görüntüleme alışkanlıkları, kampanya katılım davranışları), yeniden pazarlama (remarketing) faaliyetleri (segment bazlı hedefleme, yeniden erişim kampanyaları ve kişiselleştirilmiş reklam gösterimi), finansal işlem yönetimi (ödeme, faturalandırma, komisyon hesaplama ve raporlama süreçleri) ve raporlama hizmetleri (detaylı analitik paneller, performans raporları ve kampanya çıktılarının ölçümlenmesi) sunulmaktadır.",
        ],
        bullets: [],
      },
      {
        title: "6. Kişisel Verilerin Saklanma Süresi",
        intro: [
          "Kişisel veriler, işlenme amaçlarının gerektirdiği süre boyunca ve ilgili yasal mevzuatta öngörülen süreler boyunca saklanmaktadır.",
          "Üyeliğin sona ermesi durumunda veriler, olası hukuki yükümlülükler doğrultusunda belirli bir süre daha saklanabilir.",
        ],
        bullets: [],
      },
      {
        title: "7. İletişim",
        intro: [
          "KVKK kapsamındaki taleplerinizi aşağıdaki iletişim adresi üzerinden iletebilirsiniz:",
          "E-posta: infuhubcom@gmail.com",
        ],
        bullets: [],
      },
      {
        title: "8. Uyuşmazlıkların Çözümü",
        intro: [
          "Bu metinden doğabilecek uyuşmazlıklarda Türkiye Cumhuriyeti kanunları uygulanacak olup, Gaziantep Mahkemeleri ve İcra Daireleri yetkilidir.",
        ],
        bullets: [],
      },
    ],
  },
  {
    id: "refundPolicy",
    title: "Kullanım Koşulları ve İptal Şartları",
    subsections: [
      {
        title: "1. Cayma Hakkı İstisnası ve Dijital Hizmet Başlangıcı",
        intro: [
          "Infuhub tarafından sunulan servisler, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca \"elektronik ortamda anında ifa edilen hizmetler\" kapsamındadır.",
        ],
        bullets: [
          "Hizmetin İfası: İşletmeye özel API anahtarlarının tanımlanması, JSON tabanlı REST API erişiminin açılması veya mobil SDK entegrasyon dokümantasyonunun paylaşılması ile hizmet ifası başlamış kabul edilir.",
          "İade Kısıtlaması: Kullanıcı, yazılımın teknik imkanlarından faydalanmaya başladığı ve veri çekme işlemi aktifleştiği andan itibaren, dijital içeriğin doğası gereği cayma hakkını kullanamaz.",
        ],
      },
      {
        title: "2. Hizmet Kusuru ve Teknik Destek Süreçleri",
        intro: [
          "Platform, sunduğu servislerin sürekliliğini ve veri doğruluğunu garanti altına almak için belirli teknik protokoller uygular.",
        ],
        bullets: [
          "Sistem Arızaları: Yazılımın mikro servis mimarisinden veya arka uç modüllerinden kaynaklanan teknik aksaklıklar, \"Sistem entegrasyonu ve uçtan uca testler\" protokolleri çerçevesinde en kısa sürede analiz edilir.",
          "Veri Senkronizasyonu: URL izleme bağlantıları veya dönüşüm takibi sırasında oluşabilecek senkronizasyon hataları, sistemin Ar-Ge içeriğinde yer alan stabilizasyon seviyeleri ve optimizasyon patternleri doğrultusunda ivedilikle giderilir.",
          "Kusurlu Hizmet: Eğer teknik kusur makul bir süre içerisinde giderilemezse, kullanıcının kullanamadığı döneme ilişkin hakları platformun iç politikaları çerçevesinde değerlendirilir.",
        ],
      },
      {
        title: "3. Abonelik Feshi ve Hizmetin Sonlandırılması",
        intro: [
          "İşletmeler, abonelik türlerine bağlı olarak hizmeti diledikleri zaman sonlandırma hakkına sahiptir.",
        ],
        bullets: [
          "Fesih Bildirimi: Aboneliğin iptali, bir sonraki faturalandırma dönemi başlamadan önce \"Transaction Dashboard Panel\" (Yönetim Paneli) üzerinden dijital olarak gerçekleştirilmelidir.",
          "Veri Erişimi: Fesih işleminin tamamlanmasının ardından, işletmenin geçmiş döneme ait influencer gelir takibi, satış raporları ve performans eğilim verilerine erişimi güvenlik ve gizlilik protokolleri gereği kısıtlanır.",
          "Cayma Sonrası Sorumluluk: Fesih tarihine kadar gerçekleşen influencer hakedişleri ve operasyonel işlem kayıtlarının sorumluluğu işletmeye aittir.",
        ],
      },
      {
        title: "4. Finansal Hükümler ve İade Süreci",
        bullets: [
          "E-Fatura: İptal ve iade süreçlerine ilişkin tüm mali kayıtlar, kağıt tüketimini minimuma indirme hedefimiz doğrultusunda e-fatura/e-arşiv sistemi üzerinden dijital olarak yönetilir.",
          "İade Edilemez Kalemler: Yazılımın kullanımı için sağlanan teknik kurulum desteği, özel API özelleştirmeleri ve geçmişe dönük veri işleme bedelleri iade kapsamı dışındadır.",
        ],
      },
    ],
  },
  {
    id: "serviceDefinition",
    title: "Hizmet Tanımı",
    subsections: [
      {
        title: "1. Hizmetin Kapsamı ve Tanımı",
        bullets: [
          "Yapay Zeka Destekli Ekosistem: Infuhub, işletmeler ile influencerlar arasında köprü kuran, reklam sonrası davranışları yapay zeka desteğiyle analiz eden bir platformdur.",
          "Temel Servisler: Platform; influencer gelir takibi, URL bazlı dönüşüm analizi, tekil etkileyici veya kampanya bazlı performans eğilimlerinin belirlenmesi ve kullanıcı segmentine bağlı etkileşim analizi hizmetlerini kapsar.",
          "Bütünleşik Yönetim: Tüm operasyonel, finansal ve yönetimsel süreçler, satış ve promosyon verileriyle birlikte Yönetim Paneli üzerinden gerçek zamanlı olarak sunulur.",
        ],
      },
      {
        title: "2. Teknik Entegrasyon ve API/SDK Kullanım Şartları",
        bullets: [
          "Esnek Altyapı Sunumu: İşletmelere, kendi mevcut ekosistemlerine entegre edebilecekleri, özelleştirilebilir ve esnek yapılı API'ler sunulur.",
          "Entegrasyon Yöntemleri — Web Tabanlı: Platform verilerini işletme sitesine çekmek için JSON tabanlı REST API erişimi sağlanır.",
          "Entegrasyon Yöntemleri — Mobil Tabanlı: Mobil uygulamalar için özel yazılım geliştirme kiti (SDK) entegrasyonu sunulur.",
          "Kullanıcı Sorumluluğu: İşletme, sunulan API ve SDK'ların kendi teknik altyapısına uyumluluğundan, entegrasyonun kurulumundan ve sistemin doğru yapılandırılmasından bizzat sorumludur.",
          "Üçüncü Taraf Entegrasyonları: Platform, üçüncü taraf bir araç kullanma zorunluluğunu ortadan kaldırarak Google, Facebook ve Twitter (X) için doğrudan yeniden pazarlama (remarketing) entegrasyonu sağlar.",
        ],
      },
      {
        title: "3. Sistem Mimari ve Süreklilik Standartları",
        bullets: [
          "Mikro Servis Yapısı: Sistem, yüksek performans ve ölçeklenebilirlik sağlayan mikro servis mimarisi üzerine inşa edilmiştir.",
          "Modüler Hizmet Dağılımı: Hizmet sürekliliği; bağımsız çalışan ödeme, kullanıcı, hesap, güvenlik ve işlem modülleri üzerinden koordine edilir.",
          "Gelişmiş Veri İşleme: Uygulama altyapısında atomik işlemler, dağıtık bellek yönetimi ve güncel Java yazılım kütüphaneleri kullanılarak veri bütünlüğü ve işlem hızı optimize edilmiştir.",
          "Güvenlik Protokolleri: Tüm sistem erişimleri ve veri transferleri, projenin özel güvenlik modülü ve tanımlanan yazılım standartları çerçevesinde korunmaktadır.",
        ],
      },
      {
        title: "4. Performans ve İzleme Teknolojileri",
        bullets: [
          "URL ve İzleme: İşletmeler, influencerlar için tanımlanan özel izleme bağlantıları (URL'ler) üzerinden tıklama, sepet etkinliği (ekleme/çıkarma) ve kesinleşmiş satış rakamlarını anlık takip etme hakkına sahiptir.",
          "İlişkilendirme: Ziyaretçilerin dönüşüm yolundaki satın alma davranışları, sistemin sunduğu farklı ilişkilendirme metodolojilerine göre derinlemesine analiz edilir.",
          "Kullanıcı Segmentasyonu: Demografik bilgiler, alışveriş frekansı, ürün eğilimi ve kullanıcı yaşam boyu değeri gibi kriterlerle segment analizi yapılarak pazarlama verimliliği ölçülür.",
        ],
      },
    ],
  },
];

export type RegisterLegalConsentState = Record<
  LegalDocSection["id"],
  boolean
>;

export const initialRegisterLegalConsentState = (): RegisterLegalConsentState => ({
  privacyKvkk: false,
  refundPolicy: false,
  serviceDefinition: false,
});

export function areRegisterLegalConsentsComplete(s: RegisterLegalConsentState): boolean {
  return s.privacyKvkk && s.refundPolicy && s.serviceDefinition;
}
