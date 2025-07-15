// Keşfet ekranı için örnek veriler
import colors from '../styles/colors';

// Falcılar Listesi
export const FORTUNE_TELLERS = [
  { 
    id: '1', 
    name: 'Elarina', 
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1964&auto=format&fit=crop',
    rating: 4.8,
    experience: 12,
    specialty: 'Kahve Falı',
    price: 49.99,
    available: true
  },
  { 
    id: '2', 
    name: 'Mi tina', 
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1974&auto=format&fit=crop',
    rating: 4.6,
    experience: 8,
    specialty: 'Tarot',
    price: 59.99,
    available: true
  },
  { 
    id: '3', 
    name: 'Bariça', 
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=1964&auto=format&fit=crop',
    rating: 4.9,
    experience: 15,
    specialty: 'El Falı',
    price: 69.99,
    available: false
  },
  { 
    id: '4', 
    name: 'Falcılar', 
    type: 'add'
  },
];

// Fal Hikayeleri
export const FORTUNE_STORIES = [
  {
    id: '1',
    name: 'Elarina',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1964&auto=format&fit=crop',
    time: '2 saat önce',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=1974&auto=format&fit=crop',
    description: 'Kahve falına baktırmak isteyenler? ☕✨ Fincanınızda görülen şekiller geleceğe dair ipuçları taşıyor...',
    likes: 42,
    comments: 5
  },
  {
    id: '2',
    name: 'Mi tina',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1974&auto=format&fit=crop',
    time: '5 saat önce',
    imageUrl: 'https://images.unsplash.com/photo-1531946740830-139962e44ba3?q=80&w=1974&auto=format&fit=crop',
    description: 'Tarot kartları bugün ne söylüyor? Bilgelik ve içgörü için kartların rehberliğine kulak verin... 🔮✨',
    likes: 36,
    comments: 3
  },
  {
    id: '3',
    name: 'Bariça',
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=1964&auto=format&fit=crop',
    time: '1 gün önce',
    imageUrl: 'https://images.unsplash.com/photo-1567427361984-0cbe7396fc6c?q=80&w=1974&auto=format&fit=crop',
    description: 'El falı okumalarımda en çok dikkat ettiğim çizgiler: yaşam, kalp ve kader çizgileri. Bu çizgiler hayatınıza dair çok şey anlatıyor. Siz de el falınıza baktırmak ister misiniz?',
    likes: 58,
    comments: 7
  }
];

// Günlük Mesajlar
export const DAILY_MESSAGES = [
  "Bugün sezgilerinize güvenin...",
  "Yıldızlar size yeni fırsatlar getiriyor...",
  "İçinizden gelen sesi dinleyin...",
  "Önünüzdeki engelleri aşmak için sabırlı olun...",
  "Hayatınızdaki değişimlere açık olun..."
];

// Abonelik Paketleri
export const SUBSCRIPTION_PACKAGES = [
  {
    id: '1',
    name: 'Aylık Mini',
    price: 99.99,
    features: [
      '2 Fal Hakkı',
      '%10 İndirimli Jeton'
    ],
    popular: false,
    color: colors.primary
  },
  {
    id: '2',
    name: 'Aylık Standart',
    price: 149.99,
    features: [
      '4 Fal Hakkı',
      '%15 İndirimli Jeton',
      'Keşfete Çıkma Hakkı'
    ],
    popular: true,
    color: colors.primaryLight
  },
  {
    id: '3',
    name: 'Aylık Premium',
    price: 219.99,
    features: [
      '6 Fal Hakkı',
      '%15 İndirimli Jeton',
      'Fal Yorum Önceliği',
      'Keşfete Çıkma Hakkı'
    ],
    popular: false,
    color: colors.secondary
  }
]; 