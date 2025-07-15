# Fal Uygulaması

Bu proje, React Native ve Expo kullanılarak geliştirilmiş bir fal uygulamasıdır. Kullanıcılar fal gönderebilir, falcılarla mesajlaşabilir ve fal sonuçlarını görüntüleyebilir.

## Proje Yapısı

```
FalUygulamasi/
├── assets/                # Expo varsayılan varlıklar klasörü
├── src/                   # Kaynak kodlar
│   ├── components/        # Yeniden kullanılabilir bileşenler
│   ├── hooks/             # Özel React hook'ları
│   ├── navigation/        # React Navigation yapılandırması
│   ├── screens/           # Uygulama ekranları
│   ├── services/          # API ve servis fonksiyonları
│   └── utils/             # Yardımcı fonksiyonlar ve sabitler
├── lib/                   # Harici kütüphane entegrasyonları
│   └── supabase.js        # Supabase yapılandırması
├── .env                   # Ortam değişkenleri
├── App.js                 # Ana uygulama bileşeni
├── babel.config.js        # Babel yapılandırması
└── package.json           # NPM paket yapılandırması
```

## Renk Paleti

Uygulama, şık ve modern bir görünüm için aşağıdaki renk paletini kullanmaktadır:

- **Ana Renk**: Koyu mor (#4A0080)
- **Yardımcı Renk**: Altın sarısı (#FFD700)
- **Arka Plan**: Gece laciverti (#0A0A1A)
- **Detay**: Parlayan beyaz (#FFFFFF)

Bu renk paleti, mistik ve lüks bir atmosfer yaratmak için özel olarak seçilmiştir.

## Supabase Kurulumu

### 1. Supabase Hesabı ve Proje Oluşturma
- [Supabase](https://supabase.com) üzerinde hesap oluşturuldu
- Yeni bir proje oluşturuldu: "FalUygulamasi"
- Bölge ve şifre belirlendi

### 2. Veritabanı Tabloları
Aşağıdaki tablolar SQL sorgusu kullanılarak oluşturuldu:

- users: Kullanıcı bilgileri
- fortune_tellers: Falcı profilleri
- fortunes: Gönderilen fallar
- messages: Kullanıcılar arası mesajlar
- conversations: Konuşma başlıkları
- posts: Keşfet ekranındaki gönderiler
- stories: Hikayeler
- comments: Gönderi yorumları
- likes: Gönderi beğenileri
- token_transactions: Jeton işlemleri
- promo_codes: Promosyon kodları
- notifications: Kullanıcı bildirimleri
- user_promo_codes: Kullanıcı-promosyon kodu ilişkileri

### 3. React Native Entegrasyonu
Supabase'i React Native projesine entegre etmek için aşağıdaki paketler kuruldu:

```bash
npm install @supabase/supabase-js
npm install @react-native-async-storage/async-storage
npm install react-native-url-polyfill
npm install react-native-dotenv
```

### 4. Supabase Yapılandırması
`lib/supabase.js` dosyasında Supabase istemcisi yapılandırıldı ve temel auth fonksiyonları oluşturuldu:

- signUp: Kullanıcı kaydı
- signIn: Kullanıcı girişi
- signOut: Çıkış yapma
- resetPassword: Şifre sıfırlama
- getCurrentUser: Mevcut kullanıcıyı alma
- signInWithGoogle: Google ile giriş

### 5. Ortam Değişkenleri
`.env` dosyasında Supabase bağlantı bilgileri saklanıyor:

```
SUPABASE_URL=<Supabase_URL>
SUPABASE_ANON_KEY=<Supabase_Anon_Key>
```

## Navigasyon Yapısı

Uygulama içinde gezinme için React Navigation kütüphanesi kullanılmıştır:

- **Bottom Tab Navigation**: Ana sayfalar arasında geçiş için alt tab navigasyonu
- **Stack Navigation**: Her tab içinde ekranlar arası geçiş için stack navigasyonu

### Modern Tab Navigasyon Tasarımı

Uygulama, modern ve göz alıcı bir tab navigasyon tasarımına sahiptir:

- **Yüzen Tab Bar**: Ekranın altında yüzen, oval şekilli bir tab bar
- **Animasyonlu Butonlar**: Seçilen sekmeye göre ölçeklendirme animasyonu
- **Görsel Geri Bildirim**: Seçilen sekme için renk değişimi ve gölge efekti
- **Bulanıklaştırma Efekti**: iOS için BlurView ile şeffaf bulanık arka plan
- **Platform Uyumlu**: Android için özel gölge ve yükseltme efektleri
- **Koyu Tema**: Gece laciverti arka plan ve altın sarısı vurgular

Bu tasarım için aşağıdaki kütüphaneler kullanılmıştır:
```bash
npm install expo-blur react-native-reanimated
```

### Ekranlar

- **Ana Sayfa**: Uygulamanın giriş ekranı
- **Fal**: Fal sonuçlarının görüntülendiği ekran
- **Profil**: Kullanıcı bilgilerinin görüntülendiği ekran

## Sonraki Adımlar

- React Navigation kurulumu
- Giriş ve kayıt ekranlarının oluşturulması
- Splash Screen tasarımı
- Ana ekranların geliştirilmesi 

## Yeni Özellikler

### Otomatik Kullanıcı Profili Oluşturma
- Kullanıcı ilk kez giriş yaptığında otomatik olarak `users` tablosunda profil kaydı oluşturulur
- Kullanıcı bilgileri auth servisinden alınarak doldurulur
- Yeni kullanıcılara 10 jeton hoş geldin bonusu verilir ve `token_transactions` tablosuna kaydedilir
- Bu sayede kullanıcılar kayıt olduktan hemen sonra uygulamayı kullanmaya başlayabilirler

### Modern Ana Sayfa Tasarımı
- Koyu tema üzerine kurulu, göz alıcı ve modern bir ana sayfa tasarımı eklendi
- Gradient header ile bütünleşik bir görünüm sağlandı
- Fal kategorileri için aktif/pasif durumları gösteren interaktif seçiciler eklendi
- Günün önerileri bölümü ile kullanıcılara özel fal türleri sunuldu
- Falcıların durumunu (müsait/meşgul) gösteren durum göstergeleri eklendi
- Falcı kartları, rating, deneyim ve fiyat bilgilerini içerecek şekilde zenginleştirildi
- Alt menü tasarımı yenilendi ve ortada fal gönderme butonu eklendi
- Tüm renkler için `colors.js` dosyasındaki renk paleti kullanıldı
- Gradient efektleri için `expo-linear-gradient` kütüphanesi entegre edildi 

### Geliştirilmiş Profil Ekranı
- Profil ekranına isteğe bağlı kişisel bilgiler bölümü eklendi
- Kullanıcılar burç, yükselen burç, cinsiyet, medeni durum ve favori falcı bilgilerini ekleyebilirler
- Tüm kişisel bilgiler için düzenleme ekranı oluşturuldu
- Profil fotoğrafı değiştirme özelliği için `expo-image-picker` entegrasyonu yapıldı
- Kişisel bilgiler için şık ve modern bir kart tasarımı eklendi
- Bilgilerin görselleştirilmesi için özel ikonlar ve renk kodları kullanıldı
- Burç bilgileri için özel simgeler ve gösterimler eklendi
- Tüm veriler Supabase veritabanında saklanmaktadır 

### Yeniden Tasarlanan Fal Ekranı
- Fal ekranı tamamen yeniden tasarlandı
- Kullanıcıların yeni fal baktırabilecekleri ve geçmiş fallarını görüntüleyebilecekleri tab yapısı eklendi
- Fal türleri için görsel kartlar oluşturuldu
- Geçmiş fallar için durum göstergeleri ve detaylı bilgiler eklendi
- Falcı bilgileri ve puanlama sistemi entegre edildi
- Promosyon teklifi bölümü ile kullanıcılara özel indirimler sunuldu
- Gradient renk geçişleri ve modern UI elementleri ile görsel zenginlik sağlandı
- Yükleme durumları ve boş durum tasarımları eklendi

### Jeton Mağazası
- Kullanıcıların fal hizmetleri için jeton satın alabileceği modern bir mağaza ekranı eklendi
- Dört farklı jeton paketi (Başlangıç, Standart, Premium, VIP) ve bunların özellikleri tanımlandı
- Paket fiyatları, indirim oranları ve sağladıkları avantajlar görsel olarak ifade edildi
- Özel teklif kartları ile kullanıcılara sınırlı süreli fırsatlar sunuldu
- Kullanıcı jeton bakiyesi gerçek zamanlı olarak görüntülenebiliyor
- Jeton alımı için ödeme işlemi simülasyonu eklendi
- "Neden Jeton Almalıyım?" bölümü ile kullanıcılara jetonların avantajları anlatıldı
- SSS bölümü ile sık sorulan sorulara cevap verildi
- Ana ekrandan ve profil ekranından kolayca erişilebilen tasarım
- Uygulama genelindeki renk paleti ve tasarım dili ile uyumlu görsel deneyim

### Jeton ve Abonelik Sistemi
- Jeton sistemi ile kullanıcılar fal hizmetlerini satın alabilir
- Her fal için 10 jeton (49,99 TL) kullanılır
- Yeni kayıt olan kullanıcılara 10 jeton (1 fal) hediye verilir
- Çoklu hesap açımını önlemek için doğrulama sistemi entegre edildi
- Farklı jeton paketleri sunulur:
  - 1 Fal Paketi: 49,99 TL (10 jeton)
  - 3 Fal Paketi: 129,99 TL (30 jeton)
  - 5 Fal Paketi: 209,99 TL (50 jeton) - En çok tercih edilen
  - 8 Fal Paketi: 299,99 TL (80 jeton)
- İlk alışverişe özel +1 fal hediye kampanyası (10 jeton bonus)
- Abonelik sistemi ile düzenli fal baktıranlar için avantajlar:
  - Aylık Mini: 99,99 TL - 2 Fal + %10 indirimli jeton satın alma hakkı
  - Aylık Standart: 149,99 TL - 4 Fal + Jetonlara %15 indirim + Keşfete çıkma hakkı (isteğe bağlı)
  - Aylık Premium: 219,99 TL - 6 Fal + Jetonlara %15 indirim + Fal yorum önceliği + Keşfete çıkma hakkı (isteğe bağlı)
- Keşfete çıkma özelliği ile kullanıcılar fallarını ve sonuçlarını (izin verdikleri takdirde) keşfet ekranında paylaşabilirler
- Jeton bakiyesi ve abonelik durumu profil ekranında görüntülenebilir
- Abonelik almış kullanıcılara özel avantajlar ve öncelikli hizmet sunulur 

### Modern Fal Baktırma Ekranı
- Fal baktırma için özel bir ekran tasarlandı
- Kullanıcılar 3 adet görsel yükleyebilir (kamera veya galeriden)
- Fal türüne özel yönlendirmeler (kahve falı için fincan içi, dışı ve tabak altı gibi)
- Falcı seçim ekranı ile kullanıcılar istedikleri falcıyı seçebilir
- Falcı profilleri, puanları ve deneyim yılları görüntülenebilir
- İsteğe bağlı not/açıklama ekleme özelliği
- Jeton bakiyesi kontrolü ve yetersiz jeton durumunda satın alma yönlendirmesi
- Modern ve kullanıcı dostu arayüz tasarımı
- Fal gönderme işlemi sonrası otomatik bildirim sistemi
- Tüm fal türleri (kahve, tarot, el falı, yıldızname) için tek ekrandan destek 

### Yardım ve Destek Ekranı
- Kullanıcılar için kapsamlı bir yardım ve destek ekranı tasarlandı
- Üç sekme içeren modern bir arayüz: Sık Sorulanlar, İletişim ve Destek Talebi
- Sık Sorulan Sorular bölümünde genişletilebilir/daraltılabilir soru-cevap kartları
- İletişim sekmesinde e-posta, telefon, WhatsApp ve adres bilgileri
- Sosyal medya hesaplarına kolay erişim için bağlantılar
- Destek talebi oluşturma formu ile kullanıcıların doğrudan mesaj gönderebilmesi
- Form doğrulama ve başarılı gönderim bildirimleri
- Profil ekranından kolay erişim
- Uygulama genelindeki renk paleti ve tasarım diliyle uyumlu görsel deneyim
- Geri bildirim mekanizması ile kullanıcı deneyimini iyileştirme odaklı yaklaşım

### Hesap Bilgileri Ekranı
- Kullanıcıların hesap ayarlarını yönetebileceği kapsamlı bir ekran tasarlandı
- Hesap bilgileri bölümünde e-posta ve üyelik tarihi görüntüleme
- Şifre değiştirme özelliği ile güvenlik kontrolü
- Bildirim ayarları: E-posta bildirimleri, push bildirimleri ve pazarlama e-postaları tercihleri
- Uygulama ayarları: Koyu mod, gizli profil ve iki faktörlü doğrulama seçenekleri
- Ayarlar için modern switch kontrolleri ve anında güncelleme
- Hesap silme özelliği ile kullanıcı verilerinin tamamen silinebilmesi
- Çift onay sistemi ile yanlışlıkla hesap silme işleminin önlenmesi
- Supabase veritabanı ile entegre çalışan ayar yönetimi
- Kullanıcı dostu arayüz ve kolay erişilebilir tasarım

### Fal Geçmişim Ekranı
- Kullanıcıların baktırdıkları tüm falları görüntüleyebilecekleri özel bir ekran tasarlandı
- Falları filtreleme özelliği: Tümü, Tamamlanan ve Bekleyen kategorileri
- Her fal için durum göstergeleri: Tamamlandı, İnceleniyor, Bekliyor, İptal Edildi
- Fal kartları üzerinde fal türü, açıklama, falcı bilgileri ve tarih detayları
- Falcı profil fotoğrafı, ismi, puanı ve deneyim yılı bilgileri
- Tamamlanan fallar için favorilere ekleme ve paylaşma seçenekleri
- Bekleyen fallar için iptal etme özelliği
- Yükleme durumları ve yenileme kontrolü
- Fal olmadığında özel boş durum ekranı ve yönlendirme butonu
- Fal detaylarına kolay erişim için kart yapısı
- Supabase veritabanından dinamik veri çekme 

### Keşfet Ekranı
- Kullanıcıların fal içeriklerini keşfedebileceği zengin bir sosyal akış tasarlandı
- Popüler falcıların hikaye paylaşımlarını görüntüleme
- Falcıların profil fotoğraflarıyla kolay seçim için yatay kaydırma listesi
- Kahve falı paylaşımları için özel görsel formatlar
- Fal hikayelerini beğenme ve yorumlama özellikleri
- Paylaşımlar için kart tabanlı, modern bir tasarım
- Falcıların günlük fal ipuçları ve mesajları için alan
- Aboneliği olan kullanıcılar için içerik paylaşım hakkı
- Abonelik bilgilendirme kutusu ve kolay abonelik alma seçeneği
- Uygulama renk paletine uygun şık ve kullanıcı dostu tasarım
- Uygulamanın merkezinde yer alan sosyal etkileşim odaklı ekran
- Aşağı kaydırarak yenileme özelliği ile yeni içerikleri görüntüleme
- Sağ alt köşedeki paylaşım butonu ile hızlı içerik oluşturma
- Paylaşım modalı ile fal türü seçimi, görsel yükleme ve açıklama ekleme
- Beğeni animasyonları ve kaydırma geçişleri ile canlı bir kullanıcı deneyimi
- Abonelik kontrolü ile sadece abonelerin paylaşım yapabilmesi

### Profil Düzenleme Ekranı İyileştirmeleri

#### Oturum Yönetimi Bug Fix'i
- EditProfileScreen'de "Oturum bilgileriniz alınamadı" hatası giderildi
- Artık AuthContext'ten gelen kullanıcı bilgisi kullanılarak daha güvenli oturum kontrolü yapılıyor
- Supabase auth.getUser() yerine AuthContext'teki user state'i kullanılarak session süresi dolması sorunları çözüldü
- Profil güncelleme işlemi artık daha kararlı ve güvenli şekilde çalışıyor
- Oturum bilgisi alınamazsa kullanıcı otomatik olarak login ekranına yönlendiriliyor
- Kod kalitesi artırılarak authentication kontrolü tek bir yerden yapılıyor

### JWT Token Yenileme Sistemi

#### JWT Expired Hatası Çözümü
- EditProfileScreen ve diğer Supabase işlemleri için JWT expired (PGRST301) hatası çözümü eklendi
- Token süresi dolduğunda otomatik olarak `supabase.auth.refreshSession()` ile token yenileme
- Token yenileme başarısız olursa kullanıcı login ekranına yönlendiriliyor
- `src/utils/authUtils.js` dosyasında genel kullanım için utility fonksiyonları oluşturuldu:
  - `handleJWTExpired()`: JWT expired hatası için retry mekanizması
  - `withTokenRefresh()`: Supabase işlemleri için token yenileme wrapper'ı
- Kullanıcı deneyimini bozmadan arka planda token yenileme işlemi gerçekleştiriliyor
- Hata durumlarında kullanıcı dostu mesajlar ve yönlendirmeler 