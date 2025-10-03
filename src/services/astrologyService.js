import OpenAI from 'openai';
import { EXPO_PUBLIC_OPENAI_API_KEY } from '@env';

const openai = new OpenAI({
  apiKey: EXPO_PUBLIC_OPENAI_API_KEY,
});

/**
 * Yapay Zeka Tabanlı Astroloji Analizi Servisi
 * Detaylı doğum haritası ve kişisel astroloji analizleri
 */
class AstrologyService {
  
  // Burç isimleri (UI için)
  static SIGNS = [
    'Koç', 'Boğa', 'İkizler', 'Yengeç', 'Aslan', 'Başak',
    'Terazi', 'Akrep', 'Yay', 'Oğlak', 'Kova', 'Balık'
  ];

  // Gezegen isimleri (UI için)
  static PLANETS = {
    sun: 'Güneş',
    moon: 'Ay',
    mercury: 'Merkür',
    venus: 'Venüs',
    mars: 'Mars',
    jupiter: 'Jüpiter',
    saturn: 'Satürn',
    uranus: 'Uranüs',
    neptune: 'Neptün',
    pluto: 'Plüton'
  };

  /**
   * Ana doğum haritası analizi prompt'u
   */
  static buildBirthChartPrompt(birthDate, birthTime, birthPlace) {
    const currentDate = new Date().toLocaleDateString('tr-TR');
    const currentYear = new Date().getFullYear();
    
    return `Sen uzman bir astrologsun. Aşağıdaki doğum bilgilerine göre son derece detaylı ve kişisel bir doğum haritası analizi yapacaksın.

DOĞUM BİLGİLERİ:
- Doğum Tarihi: ${birthDate}
- Doğum Saati: ${birthTime}
- Doğum Yeri: ${birthPlace}
- Analiz Tarihi: ${currentDate}

Bu bilgilere dayanarak aşağıdaki yapıda TÜRKÇE bir analiz hazırla:

1. DOĞUM HARITASI TEMEL BİLGİLER:
- Güneş Burcu ve detaylı özellikleri
- Ay Burcu ve duygusal yapı analizi
- Yükselen Burç ve dış kişilik analizi
- Merkür, Venüs, Mars konumları ve etkileri

2. KİŞİLİK ANALİZİ:
- Ana karakter özellikleri (3-4 paragraf)
- Güçlü yönler ve yetenekler
- Gelişim alanları ve dikkat edilmesi gerekenler
- İlişkilerde nasıl davranır

3. ELEMENT DENGESİ:
- Ateş, Toprak, Hava, Su elementlerinin kişideki dağılımı
- Hangi elementlerin baskın olduğu
- Element eksikliği varsa bunun etkileri

4. KARİYER VE YAŞAM YOLU:
- Hangi alanlarda başarılı olabilir
- Doğal yetenekleri ve işine dönük önerileri
- Finansal yaklaşımı

5. İLİŞKİLER VE SOSYAL YAŞAM:
- Aşk hayatında nasıl davranır
- Hangi burçlarla uyumlu
- Aile ve arkadaşlık ilişkileri

LÜTFEN:
- Çok kişisel ve özel hissettiren bir dil kullan
- Genel burç yorumu yapmaktan kaçın, tamamen bu kişiye özel yaz
- Pozitif ama gerçekçi bir yaklaşım sergile
- Her bölümü minimum 2-3 cümle olacak şekilde detaylandır
- Türkçe dilbilgisi kurallarına dikkat et

SADECE JSON formatında, hiçbir ek açıklama yapmadan döndür:
{
  "birthChart": {
    "sunSign": "burç_adı",
    "moonSign": "burç_adı", 
    "risingSign": "burç_adı",
    "sunAnalysis": "detaylı güneş burcu analizi",
    "moonAnalysis": "detaylı ay burcu analizi",
    "risingAnalysis": "detaylı yükselen burç analizi"
  },
  "personalityAnalysis": {
    "mainTraits": "ana kişilik özellikleri analizi",
    "strengths": "güçlü yönler analizi",
    "developmentAreas": "gelişim alanları analizi",
    "relationshipStyle": "ilişki tarzı analizi"
  },
  "elementBalance": {
    "dominantElements": ["element1", "element2"],
    "elementAnalysis": "element dengesi detaylı analizi",
    "fireLevel": 1-5_arası_sayı,
    "earthLevel": 1-5_arası_sayı,
    "airLevel": 1-5_arası_sayı,
    "waterLevel": 1-5_arası_sayı
  },
  "careerAndLife": {
    "careerSuggestions": "kariyer önerileri",
    "naturalTalents": "doğal yetenekler",
    "financialApproach": "finansal yaklaşım"
  },
  "relationships": {
    "loveStyle": "aşk tarzı",
    "compatibleSigns": ["uyumlu_burç1", "uyumlu_burç2", "uyumlu_burç3"],
    "socialLife": "sosyal yaşam analizi"
  }
}`;
  }

  /**
   * Transit ve öngörüler prompt'u
   */
  static buildTransitPrompt(birthDate, birthTime, birthPlace) {
    const currentDate = new Date().toLocaleDateString('tr-TR');
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR');
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR');
    
    return `Sen uzman bir astrologsun. Aşağıdaki doğum bilgilerine göre güncel transit analizi ve öngörüler yapacaksın.

DOĞUM BİLGİLERİ:
- Doğum Tarihi: ${birthDate}
- Doğum Saati: ${birthTime}
- Doğum Yeri: ${birthPlace}

GÜNCEL TARİHLER:
- Bugün: ${currentDate}
- Gelecek Hafta: ${nextWeek}
- Gelecek Ay: ${nextMonth}

Bu kişi için GÜNCEL gezegen hareketlerini ve etkilerini analiz et:

1. HAFTALIK TRANSİTLER (Bu hafta için):
- Hangi gezegenler bu kişiyi nasıl etkiliyor
- Dikkat edilmesi gereken durumlar
- Fırsat zamanları
- Her transit için etki yüzdesi (45-95 arası)

2. AYLIK ÖNGÖRÜLER (Bu ay için):
- Kariyer ve iş hayatı
- Aşk ve ilişkiler  
- Sağlık ve enerji
- Finans ve para
- Her alan için başarı yüzdesi (50-95 arası) ve tavsiyelere

LÜTFEN:
- Güncel gezegen konumlarını dikkate al
- Kişiye özel, detaylı analizler yap
- Her öngörü için pratik tavsiyeler ver
- Pozitif ama gerçekçi yaklaşım sergile

SADECE JSON formatında, hiçbir ek açıklama yapmadan döndür:
{
  "weeklyTransits": [
    {
      "planet": "gezegen_adı",
      "aspect": "trigon/kare/konjünksiyon_vb",
      "effect": "bu hafta nasıl etkiliyor",
      "advice": "ne yapması gerekiyor",
      "percentage": 45-95_arası_sayı
    }
  ],
  "monthlyPredictions": [
    {
      "area": "Kariyer",
      "prediction": "bu aydaki durum",
      "advice": "tavsiyeler",
      "percentage": 50-95_arası_sayı
    },
    {
      "area": "Aşk",
      "prediction": "aşk hayatı öngörüsü", 
      "advice": "aşk tavsiyeleri",
      "percentage": 50-95_arası_sayı
    },
    {
      "area": "Sağlık",
      "prediction": "sağlık durumu",
      "advice": "sağlık tavsiyeleri", 
      "percentage": 50-95_arası_sayı
    },
    {
      "area": "Finans",
      "prediction": "finansal durum",
      "advice": "para tavsiyeleri",
      "percentage": 50-95_arası_sayı
    }
  ]
}`;
  }

  /**
   * AI ile doğum haritası analizi oluştur
   */
  static async generateBirthChartAnalysis(birthDate, birthTime, birthPlace) {
    try {
      const prompt = this.buildBirthChartPrompt(birthDate, birthTime, birthPlace);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Sen dünyaca ünlü, son derece deneyimli bir astrologsun. Doğum haritası analizlerinde uzman olarak tanınıyorsun. Her analiz kişiye özel, detaylı ve profesyonel olmalı. SADECE temiz JSON formatında yanıt ver, başka hiçbir metin ekleme."
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.8,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      
      // JSON parse etmeye çalış
      try {
        // AI'dan gelen response'u temizle
        let cleanContent = content.trim();
        
        // Markdown code block'ları temizle
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
        }
        if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/```\n?/g, '').replace(/```\n?$/g, '');
        }
        
        // Başta ve sonda ekstra karakterler varsa temizle
        cleanContent = cleanContent.replace(/^[^\{]*/, '').replace(/[^\}]*$/, '');
        
        
        const parsed = JSON.parse(cleanContent);
        return parsed;
      } catch (parseError) {
        console.error('❌ JSON parse hatası:', parseError);
        
        // Fallback: yapılandırılmış veri döndür
        return this.parseTextToBirthChart(content);
      }
      
    } catch (error) {
      console.error('AI doğum haritası analizi hatası:', error);
      throw new Error('Doğum haritası analizi oluşturulamadı');
    }
  }

  /**
   * AI ile transit analizi oluştur
   */
  static async generateTransitAnalysis(birthDate, birthTime, birthPlace) {
    try {
      const prompt = this.buildTransitPrompt(birthDate, birthTime, birthPlace);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Sen güncel astroloji ve transit analizlerinde uzman bir astrologsun. Gezegen hareketlerini takip eder ve bunların bireysel etkileri konusunda rehberlik sağlarsın. SADECE temiz JSON formatında yanıt ver."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2500,
        temperature: 0.8,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      
      try {
        // AI'dan gelen response'u temizle
        let cleanContent = content.trim();
        
        // Markdown code block'ları temizle
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
        }
        if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/```\n?/g, '').replace(/```\n?$/g, '');
        }
        
        // Başta ve sonda ekstra karakterler varsa temizle
        cleanContent = cleanContent.replace(/^[^\{]*/, '').replace(/[^\}]*$/, '');
        
        const parsed = JSON.parse(cleanContent);
        return parsed;
      } catch (parseError) {
        console.error('❌ Transit JSON parse hatası:', parseError);
        return this.parseTextToTransit(content);
      }
      
    } catch (error) {
      console.error('AI transit analizi hatası:', error);
      throw new Error('Transit analizi oluşturulamadı');
    }
  }

  /**
   * Metin analizi JSON'a çevirme (fallback)
   */
  static parseTextToBirthChart(text) {
    
    const signs = this.SIGNS;
    const randomSunSign = signs[Math.floor(Math.random() * signs.length)];
    const randomMoonSign = signs[Math.floor(Math.random() * signs.length)];
    const randomRisingSign = signs[Math.floor(Math.random() * signs.length)];

    // Metinden güvenli şekilde parçalar çıkar
    const safeSubstring = (str, start, end) => {
             const result = (str || '').substring(start, end);
       return result.length > 20 ? result + '...' : 'Analiz işleniyor...';
     };

    return {
      birthChart: {
        sunSign: randomSunSign,
        moonSign: randomMoonSign,
        risingSign: randomRisingSign,
        sunAnalysis: safeSubstring(text, 0, 200),
        moonAnalysis: safeSubstring(text, 200, 400),
        risingAnalysis: safeSubstring(text, 400, 600)
      },
      personalityAnalysis: {
        mainTraits: safeSubstring(text, 600, 800),
        strengths: safeSubstring(text, 800, 1000),
        developmentAreas: safeSubstring(text, 1000, 1200),
        relationshipStyle: safeSubstring(text, 1200, 1400)
      },
      elementBalance: {
        dominantElements: ["Ateş", "Su"],
        elementAnalysis: "Element dengesi hesaplanıyor...",
        fireLevel: Math.floor(Math.random() * 3) + 3,
        earthLevel: Math.floor(Math.random() * 3) + 2,
        airLevel: Math.floor(Math.random() * 3) + 2,
        waterLevel: Math.floor(Math.random() * 3) + 3
      },
      careerAndLife: {
        careerSuggestions: "Kariyer önerileri hazırlanıyor...",
        naturalTalents: "Doğal yetenekler analizi devam ediyor...",
        financialApproach: "Finansal yaklaşım değerlendirmesi yapılıyor..."
      },
      relationships: {
        loveStyle: "Aşk tarzı hesaplanıyor...",
        compatibleSigns: [signs[0], signs[4], signs[8]],
        socialLife: "Sosyal yaşam analizi hesaplanıyor..."
      }
    };
  }

  /**
   * Metin transit analizi JSON'a çevirme (fallback)
   */
  static parseTextToTransit(text) {
    const planets = ['Merkür', 'Venüs', 'Mars', 'Jüpiter', 'Satürn'];
    const aspects = ['Trigon', 'Kare', 'Konjünksiyon', 'Sextile', 'Opposisyon'];
    
    return {
      weeklyTransits: planets.slice(0, 3).map((planet, index) => ({
        planet: planet,
        aspect: aspects[index],
        effect: `${planet} bu hafta önemli etkiler yaratıyor...`,
        advice: "Bu dönemde dikkatli olmanız öneriliyor...",
        percentage: Math.floor(Math.random() * 30) + 65
      })),
      monthlyPredictions: [
        {
          area: "Kariyer",
          prediction: "Bu ay kariyer konularında gelişmeler yaşanacak...",
          advice: "Yeni fırsatlara açık olun...",
          percentage: Math.floor(Math.random() * 25) + 70
        },
        {
          area: "Aşk", 
          prediction: "Duygusal hayatınızda önemli değişimler...",
          advice: "İletişime odaklanın...",
          percentage: Math.floor(Math.random() * 25) + 70
        },
        {
          area: "Sağlık",
          prediction: "Enerji seviyeniz yüksek olacak...",
          advice: "Düzenli beslenme ve egzersize devam edin...",
          percentage: Math.floor(Math.random() * 20) + 75
        },
        {
          area: "Finans",
          prediction: "Mali konularda istikrarlı bir dönem...",
          advice: "Birikimlerinizi değerlendirin...",
          percentage: Math.floor(Math.random() * 25) + 65
        }
      ]
    };
  }

  /**
   * Yıldız puanlaması hesapla
   */
  static calculateStarRating(percentage) {
    if (percentage >= 90) return 5;
    if (percentage >= 75) return 4;
    if (percentage >= 60) return 3;
    if (percentage >= 45) return 2;
    return 1;
  }

  /**
   * Ana analiz fonksiyonu - AI ile tam analiz
   */
  static async generateFullAnalysis(birthDate, birthTime = '12:00', birthPlace = 'İstanbul') {
    try {
      
      // İki AI isteğini paralel olarak yap
      const [birthChartData, transitData] = await Promise.all([
        this.generateBirthChartAnalysis(birthDate, birthTime, birthPlace),
        this.generateTransitAnalysis(birthDate, birthTime, birthPlace)
      ]);


      return {
        birthChart: {
          sunSign: birthChartData?.birthChart?.sunSign || 'Koç',
          moonSign: birthChartData?.birthChart?.moonSign || 'Boğa', 
          risingSign: birthChartData?.birthChart?.risingSign || 'İkizler',
          planetPositions: {} // UI uyumluluğu için
        },
        personalityAnalysis: {
          sunSign: birthChartData?.birthChart?.sunAnalysis || 'Kişilik analizi hazırlanıyor...',
          moonSign: birthChartData?.birthChart?.moonAnalysis || 'Duygusal analiz hazırlanıyor...',
          risingSign: birthChartData?.birthChart?.risingAnalysis || 'Dış karakter analizi hazırlanıyor...',
          mainTraits: birthChartData?.personalityAnalysis?.mainTraits || null,
          strengths: birthChartData?.personalityAnalysis?.strengths || null,
          developmentAreas: birthChartData?.personalityAnalysis?.developmentAreas || null,
          relationshipStyle: birthChartData?.personalityAnalysis?.relationshipStyle || null
        },
        elementBalance: {
          fire: birthChartData?.elementBalance?.fireLevel || 3,
          earth: birthChartData?.elementBalance?.earthLevel || 3,
          air: birthChartData?.elementBalance?.airLevel || 3,
          water: birthChartData?.elementBalance?.waterLevel || 3,
          dominantElements: birthChartData?.elementBalance?.dominantElements || ['Ateş'],
          analysis: birthChartData?.elementBalance?.elementAnalysis || null
        },
        careerAndLife: {
          careerSuggestions: birthChartData?.careerAndLife?.careerSuggestions || null,
          naturalTalents: birthChartData?.careerAndLife?.naturalTalents || null,
          financialApproach: birthChartData?.careerAndLife?.financialApproach || null
        },
        relationships: {
          loveStyle: birthChartData?.relationships?.loveStyle || null,
          compatibleSigns: birthChartData?.relationships?.compatibleSigns || [],
          socialLife: birthChartData?.relationships?.socialLife || null
        },
        transitsAndPredictions: {
          weeklyTransits: transitData?.weeklyTransits || [],
          monthlyPredictions: transitData?.monthlyPredictions || []
        },
        generatedAt: new Date().toISOString(),
        source: 'PROFESSIONAL' // Profesyonel sistem belirteci
      };
      
    } catch (error) {
      console.error('❌ Astroloji Analizi Hatası:', error);
      
      // Hata durumunda fallback sistem
      
      // Temel burç hesaplaması ile basit analiz döndür
      const basicSunSign = this.calculateBasicSunSign(birthDate);
      
      return {
        birthChart: {
          sunSign: basicSunSign,
          moonSign: 'Yengeç',
          risingSign: 'Koç',
          planetPositions: {}
        },
        personalityAnalysis: {
          sunSign: `${basicSunSign} burcu olarak, doğal liderlik özellikleriniz ve kararlı yaklaşımınız öne çıkıyor. Bu özellikler size hayatta avantaj sağlar.`,
          moonSign: 'Duygusal yapınız derin ve sezgisel. İçsel dünyınız zengin ve empati yeteneğiniz gelişmiş.',
          risingSign: 'Dışa yansıyan karakteriniz enerjik ve girişimci. İlk izlenimde dinamik bir kişi olarak algılanırsınız.',
          mainTraits: 'Güçlü karakter yapınız, hedef odaklı yaklaşımınız ve sosyal becerileriniz size özel bir kişilik kazandırıyor.',
          strengths: 'Analitik düşünce yapınız, liderlik kapasiteneniz ve uyum sağlama yeteneğiniz en güçlü yönlerinizdir.',
          developmentAreas: 'Sabır geliştirme, stres yönetimi ve iletişim becerilerinizi güçlendirme alanlarında gelişim gösterebilirsiniz.',
          relationshipStyle: 'İlişkilerinizde samimi ve destekleyici yaklaşım sergilersiniz. Güven ve anlayış sizin için önemlidir.'
        },
        elementBalance: {
          fire: 4,
          earth: 3,
          air: 3,
          water: 4,
          dominantElements: ['Ateş', 'Su'],
          analysis: 'Element dengenizde ateş ve su elementleri baskın. Bu size hem tutkulu hem de duygusal bir yapı kazandırıyor.'
        },
        careerAndLife: {
          careerSuggestions: 'Liderlik gerektiren pozisyonlar, yaratıcı alanlar ve insan ilişkilerine dayalı meslekler size uygun.',
          naturalTalents: 'Doğal organizasyon yeteneğiniz, problem çözme beceriniz ve empati kapasiteneiz öne çıkıyor.',
          financialApproach: 'Para konusunda dengeli yaklaşımınız var. Hem tasarruf etmeyi hem de gerektiğinde harcama yapmayı bilirsiniz.'
        },
        relationships: {
          loveStyle: 'Aşkta samimi ve derinlikli ilişkiler kurarsınız. Güven ve sadakat sizin için temel değerlerdir.',
          compatibleSigns: ['Balık', 'Akrep', 'Boğa'],
          socialLife: 'Sosyal çevrenizde güvenilir ve destekleyici biri olarak tanınırsınız. Kaliteli arkadaşlıklar kurarsınız.'
        },
        transitsAndPredictions: {
          weeklyTransits: [
            {
              planet: 'Merkür',
              aspect: 'Trigon',
              effect: 'Bu hafta iletişim konularında olumlu gelişmeler yaşayacaksınız',
              advice: 'Önemli konuşmalar için ideal bir dönem',
              percentage: 78
            }
          ],
          monthlyPredictions: [
            {
              area: 'Kariyer',
              prediction: 'Mesleki hayatınızda yeni fırsatlar doğacak',
              advice: 'Girişimlerinizi destekleyecek kişilerle iletişim kurun',
              percentage: 72
            },
            {
              area: 'Aşk',
              prediction: 'Duygusal hayatınızda pozitif değişimler olacak',
              advice: 'Açık iletişim kurmaya odaklanın',
              percentage: 75
            }
          ]
        },
        generatedAt: new Date().toISOString(),
        source: 'FALLBACK'
      };
    }
  }

  /**
   * Hızlı burç bilgisi (basit hesaplama - UI için)
   */
  static calculateBasicSunSign(birthDate) {
    const date = new Date(birthDate);
    const month = date.getMonth() + 1;
    const day = date.getDate();

    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Koç';
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Boğa';
    if ((month === 5 && day >= 21) || (month === 6 && day <= 21)) return 'İkizler';
    if ((month === 6 && day >= 22) || (month === 7 && day <= 22)) return 'Yengeç';
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Aslan';
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Başak';
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Terazi';
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Akrep';
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Yay';
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Oğlak';
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Kova';
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'Balık';
    
    return 'Bilinmiyor';
  }
}

export default AstrologyService; 