// Kart Falları Servisi
// Tarot ve Katina falları için ayrı kart yönetimi

// Katina kartları (İskambil) - 32 kart
const KATINA_CARDS = {
  suits: ['hearts', 'diamonds', 'clubs', 'spades'],
  values: ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'],
  suitNames: {
    hearts: 'Kupa',
    diamonds: 'Karo', 
    clubs: 'Sinek',
    spades: 'Maça'
  },
  valueNames: {
    '7': 'Yedi',
    '8': 'Sekiz', 
    '9': 'Dokuz',
    '10': 'On',
    'J': 'Vale',
    'Q': 'Kız',
    'K': 'Papaz',
    'A': 'As'
  }
};

// Tarot kartları - Major Arcana (22 kart)
const TAROT_MAJOR_ARCANA = [
  { id: 'fool', number: 0, name: 'The Fool', turkishName: 'Deli', meaning: 'Yeni başlangıçlar, masumiyet, spontane kararlar' },
  { id: 'magician', number: 1, name: 'The Magician', turkishName: 'Büyücü', meaning: 'İrade gücü, yaratıcılık, beceri' },
  { id: 'high_priestess', number: 2, name: 'The High Priestess', turkishName: 'Yüksek Rahibe', meaning: 'Sezgi, gizli bilgi, iç bilgelik' },
  { id: 'empress', number: 3, name: 'The Empress', turkishName: 'İmparatoriçe', meaning: 'Bereket, yaratıcılık, doğa' },
  { id: 'emperor', number: 4, name: 'The Emperor', turkishName: 'İmparator', meaning: 'Otorite, yapı, kontrol' },
  { id: 'hierophant', number: 5, name: 'The Hierophant', turkishName: 'Aziz', meaning: 'Gelenek, eğitim, manevi rehberlik' },
  { id: 'lovers', number: 6, name: 'The Lovers', turkishName: 'Aşıklar', meaning: 'Aşk, seçimler, uyum' },
  { id: 'chariot', number: 7, name: 'The Chariot', turkishName: 'Savaş Arabası', meaning: 'Zafer, kontrol, ilerleme' },
  { id: 'strength', number: 8, name: 'Strength', turkishName: 'Güç', meaning: 'İç güç, sabır, merhamet' },
  { id: 'hermit', number: 9, name: 'The Hermit', turkishName: 'Ermiş', meaning: 'İç arayış, rehberlik, yalnızlık' },
  { id: 'wheel_fortune', number: 10, name: 'Wheel of Fortune', turkishName: 'Kader Çarkı', meaning: 'Değişim, şans, kader' },
  { id: 'justice', number: 11, name: 'Justice', turkishName: 'Adalet', meaning: 'Denge, hakikat, adalet' },
  { id: 'hanged_man', number: 12, name: 'The Hanged Man', turkishName: 'Asılan Adam', meaning: 'Fedakarlık, sabır, farklı bakış açısı' },
  { id: 'death', number: 13, name: 'Death', turkishName: 'Ölüm', meaning: 'Dönüşüm, son, yeniden doğuş' },
  { id: 'temperance', number: 14, name: 'Temperance', turkishName: 'Ölçülülük', meaning: 'Denge, uyum, sabır' },
  { id: 'devil', number: 15, name: 'The Devil', turkishName: 'Şeytan', meaning: 'Bağımlılık, kısıtlama, materyalizm' },
  { id: 'tower', number: 16, name: 'The Tower', turkishName: 'Kule', meaning: 'Ani değişim, yıkım, aydınlanma' },
  { id: 'star', number: 17, name: 'The Star', turkishName: 'Yıldız', meaning: 'Umut, ilham, manevi rehberlik' },
  { id: 'moon', number: 18, name: 'The Moon', turkishName: 'Ay', meaning: 'İllüzyon, sezgi, bilinçdışı' },
  { id: 'sun', number: 19, name: 'The Sun', turkishName: 'Güneş', meaning: 'Başarı, mutluluk, yaşam enerjisi' },
  { id: 'judgement', number: 20, name: 'Judgement', turkishName: 'Mahkeme', meaning: 'Yeniden doğuş, bağışlama, çağrı' },
  { id: 'world', number: 21, name: 'The World', turkishName: 'Dünya', meaning: 'Tamamlanma, başarı, bütünlük' }
];

// Kart görselini getir
export const getKatinaCardImage = (suit, value) => {
  const imageName = `${suit}_${value}`;
  
  // Dinamik import için path oluştur
  switch (imageName) {
    // Hearts
    case 'hearts_7': return require('../../assets/iskambil/hearts_7.png');
    case 'hearts_8': return require('../../assets/iskambil/hearts_8.png');
    case 'hearts_9': return require('../../assets/iskambil/hearts_9.png');
    case 'hearts_10': return require('../../assets/iskambil/hearts_10.png');
    case 'hearts_J': return require('../../assets/iskambil/hearts_J.png');
    case 'hearts_Q': return require('../../assets/iskambil/hearts_Q.png');
    case 'hearts_K': return require('../../assets/iskambil/hearts_K.png');
    case 'hearts_A': return require('../../assets/iskambil/hearts_A.png');
    
    // Diamonds
    case 'diamonds_7': return require('../../assets/iskambil/diamonds_7.png');
    case 'diamonds_8': return require('../../assets/iskambil/diamonds_8.png');
    case 'diamonds_9': return require('../../assets/iskambil/diamonds_9.png');
    case 'diamonds_10': return require('../../assets/iskambil/diamonds_10.png');
    case 'diamonds_J': return require('../../assets/iskambil/diamonds_J.png');
    case 'diamonds_Q': return require('../../assets/iskambil/diamonds_Q.png');
    case 'diamonds_K': return require('../../assets/iskambil/diamonds_K.png');
    case 'diamonds_A': return require('../../assets/iskambil/diamonds_A.png');
    
    // Clubs
    case 'clubs_7': return require('../../assets/iskambil/clubs_7.png');
    case 'clubs_8': return require('../../assets/iskambil/clubs_8.png');
    case 'clubs_9': return require('../../assets/iskambil/clubs_9.png');
    case 'clubs_10': return require('../../assets/iskambil/clubs_10.png');
    case 'clubs_J': return require('../../assets/iskambil/clubs_J.png');
    case 'clubs_Q': return require('../../assets/iskambil/clubs_Q.png');
    case 'clubs_K': return require('../../assets/iskambil/clubs_K.png');
    case 'clubs_A': return require('../../assets/iskambil/clubs_A.png');
    
    // Spades
    case 'spades_7': return require('../../assets/iskambil/spades_7.png');
    case 'spades_8': return require('../../assets/iskambil/spades_8.png');
    case 'spades_9': return require('../../assets/iskambil/spades_9.png');
    case 'spades_10': return require('../../assets/iskambil/spades_10.png');
    case 'spades_J': return require('../../assets/iskambil/spades_J.png');
    case 'spades_Q': return require('../../assets/iskambil/spades_Q.png');
    case 'spades_K': return require('../../assets/iskambil/spades_K.png');
    case 'spades_A': return require('../../assets/iskambil/spades_A.png');
    
    default: return require('../../assets/iskambil/back_dark.png');
  }
};

// Tarot kartı görselini getir (şimdilik iskambil kartlarını kullanıyoruz)
export const getTarotCardImage = (cardId) => {
  // Şimdilik Major Arcana kartlarını iskambil kartlarıyla eşleştiriyoruz
  const tarotToKatina = {
    'fool': 'hearts_A',
    'magician': 'spades_A',
    'high_priestess': 'hearts_Q',
    'empress': 'diamonds_Q',
    'emperor': 'spades_K',
    'hierophant': 'clubs_K',
    'lovers': 'hearts_K',
    'chariot': 'diamonds_K',
    'strength': 'hearts_J',
    'hermit': 'spades_J',
    'wheel_fortune': 'diamonds_J',
    'justice': 'clubs_J',
    'hanged_man': 'hearts_10',
    'death': 'spades_10',
    'temperance': 'diamonds_10',
    'devil': 'clubs_10',
    'tower': 'spades_9',
    'star': 'hearts_9',
    'moon': 'clubs_9',
    'sun': 'diamonds_9',
    'judgement': 'spades_8',
    'world': 'hearts_8'
  };
  
  const katinaCard = tarotToKatina[cardId];
  if (katinaCard) {
    const [suit, value] = katinaCard.split('_');
    return getKatinaCardImage(suit, value);
  }
  
  return require('../../assets/iskambil/back_dark.png');
};

// Kart arkası görseli
export const getCardBack = () => {
  return require('../../assets/iskambil/back_dark.png');
};

// Tarot için özel arka plan (daha mistik)
export const getTarotCardBack = () => {
  // Şimdilik aynı arka planı kullan, sonra özel tarot arkası ekleyebiliriz
  return require('../../assets/iskambil/back_dark.png');
};

// Katina destesi oluştur (İskambil)
export const createKatinaDeck = () => {
  const deck = [];
  KATINA_CARDS.suits.forEach(suit => {
    KATINA_CARDS.values.forEach(value => {
      deck.push({
        id: `${suit}_${value}`,
        suit,
        value,
        image: getKatinaCardImage(suit, value),
        suitName: KATINA_CARDS.suitNames[suit],
        valueName: KATINA_CARDS.valueNames[value]
      });
    });
  });
  return deck;
};

// Tarot destesi oluştur (Major Arcana)
export const createTarotDeck = () => {
  return TAROT_MAJOR_ARCANA.map(card => ({
    id: card.id,
    number: card.number,
    name: card.name,
    turkishName: card.turkishName,
    meaning: {
      name: card.turkishName,
      meaning: card.meaning
    },
    image: getTarotCardImage(card.id),
    type: 'tarot'
  }));
};

// Kartları karıştır
export const shuffleDeck = (deck) => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Rastgele kartlar seç
export const drawKatinaCards = (count = 3) => {
  const deck = createKatinaDeck();
  const shuffled = shuffleDeck(deck);
  return shuffled.slice(0, count);
};

// Tarot kartları çek
export const drawTarotCards = (count = 3) => {
  const deck = createTarotDeck();
  const shuffled = shuffleDeck(deck);
  return shuffled.slice(0, count);
};

// Tarot yorumu getir
export const getTarotMeaning = (cardId) => {
  return TAROT_MAJOR_ARCANA.find(card => card.id === cardId) || { 
    name: 'Bilinmeyen', 
    meaning: 'Bu kartın özel bir anlamı bulunmaktadır.' 
  };
};

// Katina falı için özel kart çekimi (Senin + O kişinin + Ortak) 
export const drawKatinaFortune = () => {
  const deck = createKatinaDeck();
  const shuffled = shuffleDeck(deck);
  
  return {
    yourCards: shuffled.slice(0, 3),    // İlk 3 kart senin
    theirCards: shuffled.slice(3, 6),   // Sonraki 3 kart o kişinin
     sharedCard: shuffled[6]             // 7. kart ortak
   };
 };
 
// Tarot falı için özel kart çekimi (Geçmiş-Şimdi-Gelecek) 
export const drawTarotFortune = (spread = 'past-present-future') => {
  const cards = drawTarotCards(3);
   
  if (spread === 'past-present-future') {
    return {
      past: { ...cards[0], position: 'Geçmiş', meaning: getTarotMeaning(cards[0].id) },
      present: { ...cards[1], position: 'Şimdi', meaning: getTarotMeaning(cards[1].id) },
      future: { ...cards[2], position: 'Gelecek', meaning: getTarotMeaning(cards[2].id) }
    };
  }
   
  return cards.map(card => ({
    ...card,
    meaning: getTarotMeaning(card.id)
  }));
 };

// Animasyonlu karıştırma için deck hazırla
export const prepareAnimatedDeck = (type = 'tarot', count = 12) => {
  const deck = type === 'tarot' ? createTarotDeck() : createKatinaDeck();
  const shuffled = shuffleDeck(deck);
  return shuffled.slice(0, count);
};

// Kart dağıtma animasyonu için sıralı kartlar
export const dealCardsWithDelay = (cards, callback, delay = 200) => {
  cards.forEach((card, index) => {
    setTimeout(() => {
      callback(card, index);
    }, index * delay);
  });
};

// Karıştırma animasyonu simülasyonu
export const shuffleAnimation = (deck, iterations = 5, callback) => {
  let currentDeck = [...deck];
  let iteration = 0;
  
  const shuffle = () => {
    if (iteration < iterations) {
      currentDeck = shuffleDeck(currentDeck);
      callback(currentDeck, iteration);
      iteration++;
      setTimeout(shuffle, 300); // 300ms aralıklarla karıştır
    } else {
      callback(currentDeck, iteration, true); // Son karıştırma
    }
  };
  
  shuffle();
};

export default {
  getKatinaCardImage,
  getTarotCardImage,
  getCardBack,
  getTarotCardBack,
  createKatinaDeck,
  createTarotDeck,
  shuffleDeck,
  drawKatinaCards,
  drawTarotCards,
  getTarotMeaning,
  drawKatinaFortune,
  drawTarotFortune,
  prepareAnimatedDeck,
  dealCardsWithDelay,
  shuffleAnimation
}; 