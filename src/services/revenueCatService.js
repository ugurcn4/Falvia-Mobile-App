import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import { 
  createOrUpdateSubscription, 
  createPaymentTransaction,
  getCurrentSubscription 
} from './supabaseService';

// RevenueCat API anahtarları
import {REVENUECAT_ANDROID_API_KEY, REVENUE_CAT_DEBUG } from '@env';

const REVENUECAT_API_KEYS = {
  android: REVENUECAT_ANDROID_API_KEY 
};

// Abonelik paket tanımları
export const SUBSCRIPTION_PRODUCTS = {
  MINI_MONTHLY: 'mini_monthly',
  STANDART_MONTHLY: 'standart_monthly', 
  PREMIUM_MONTHLY: 'premium_monthly'
};

// Abonelik paketleri bilgileri
export const SUBSCRIPTION_INFO = {
  [SUBSCRIPTION_PRODUCTS.MINI_MONTHLY]: {
    title: 'Aylık Mini',
    price: '99,99₺',
    features: ['2 Fal Hakkı', 'Jeton Alımlarında %10 İndirim'],
    color: '#2196F3'
  },
  [SUBSCRIPTION_PRODUCTS.STANDART_MONTHLY]: {
    title: 'Aylık Standart',
    price: '149,99₺',
    features: ['4 Fal Hakkı', 'Jeton Alımlarında %15 İndirim', 'Keşfet\'te Paylaşım Hakkı'],
    color: '#FFD700',
    popular: true
  },
  [SUBSCRIPTION_PRODUCTS.PREMIUM_MONTHLY]: {
    title: 'Aylık Premium',
    price: '219,99₺',
    features: ['6 Fal Hakkı', 'Jeton Alımlarında %20 İndirim', 'Fal Yorum Önceliği', 'Keşfet\'te Paylaşım Hakkı'],
    color: '#9C27B0'
  }
};

// RevenueCat'i başlat
export const initializeRevenueCat = async () => {
  try {
    // Debug modunu kapat (daha temiz console için)
    Purchases.setLogLevel(Purchases.LOG_LEVEL.ERROR);
    
    // Sadece Android için API anahtarını al
    const apiKey = REVENUECAT_API_KEYS.android;
    
    // API anahtarları kontrol et
    if (!apiKey) {
      console.warn('RevenueCat Android API anahtarı henüz ayarlanmamış. Lütfen .env dosyasına REVENUECAT_ANDROID_API_KEY ekleyin.');
      return { success: false, error: 'Android API anahtarı ayarlanmamış' };
    }
    
    // RevenueCat'i yapılandır
    await Purchases.configure({
      apiKey,
      appUserID: null, // Kullanıcı girişi yapıldıktan sonra setRevenueCatUserID() ile ayarlanacak
      observerMode: false,
      useAmazon: false
    });
    return { success: true };
  } catch (error) {
    console.error('RevenueCat başlatma hatası:', error);
    return { success: false, error };
  }
};

// Kullanıcı ID'sini RevenueCat'e kaydet
export const setRevenueCatUserID = async (userId) => {
  try {
    await Purchases.logIn(userId);
    return { success: true };
  } catch (error) {
    console.error('RevenueCat kullanıcı ID ayarlama hatası:', error);
    return { success: false, error };
  }
};

// Mevcut offerings'leri al
export const getOfferings = async () => {
  try {
    const offerings = await Purchases.getOfferings();
    
    // Önce "default" offering'ini dene, yoksa "preview-offering" kullan
    let targetOffering = offerings.all?.default || offerings.current;
    
    if (!targetOffering) {
      console.warn('⚠️ Default offering bulunamadı, preview-offering kullanılıyor');
      targetOffering = offerings.all?.['preview-offering'];
    }
    
    const availablePackages = targetOffering?.availablePackages || [];
    
    return { 
      success: true, 
      offerings: availablePackages 
    };
  } catch (error) {
    console.error('Offerings alma hatası:', error);
    return { success: false, error, offerings: [] };
  }
};

// Jeton paketi satın al
export const purchaseTokenPackage = async (tokenPackage, userId) => {
  try {
    // Jeton paketini RevenueCat'ten satın al
    const { customerInfo, productIdentifier } = await Purchases.purchasePackage(tokenPackage);
    
    // Satın alma başarılı, jetonları veritabanına ekle
    if (customerInfo.entitlements.active) {
      // Jeton işlemini kaydet
      const transactionData = {
        user_id: userId,
        transaction_id: customerInfo.originalPurchaseDate,
        original_transaction_id: customerInfo.originalPurchaseDate,
        product_id: productIdentifier,
        type: 'token_purchase',
        amount: getTokenPackagePrice(productIdentifier),
        currency: '₺',
        platform: Platform.OS,
        platform_transaction_id: productIdentifier,
        receipt_data: JSON.stringify(customerInfo),
        status: 'completed'
      };
      
      await createPaymentTransaction(transactionData);
    }
    
    return { 
      success: true, 
      customerInfo,
      productIdentifier 
    };
  } catch (error) {
    console.error('Jeton paketi satın alma hatası:', error);
    
    let errorMessage = 'Satın alma işlemi sırasında bir hata oluştu.';
    
    if (error.code === 'PURCHASES_ERROR_PURCHASE_CANCELLED') {
      errorMessage = 'Satın alma işlemi iptal edildi.';
    } else if (error.code === 'PURCHASES_ERROR_PURCHASE_NOT_ALLOWED') {
      errorMessage = 'Satın alma işlemi bu cihazda desteklenmiyor.';
    } else if (error.code === 'PURCHASES_ERROR_PAYMENT_PENDING') {
      errorMessage = 'Ödeme işlemi beklemede. Lütfen daha sonra tekrar deneyin.';
    }
    
    return { success: false, error, errorMessage };
  }
};

// Abonelik satın al
export const purchaseSubscription = async (packageToPurchase, userId) => {
  try {
    const { customerInfo, productIdentifier } = await Purchases.purchasePackage(packageToPurchase);
    
    // Satın alma başarılı, veritabanını güncelle
    const activeSubscription = customerInfo.activeSubscriptions[0];
    const entitlements = customerInfo.entitlements.active;
    
    if (activeSubscription && Object.keys(entitlements).length > 0) {
      // Abonelik bilgilerini veritabanına kaydet
      const subscriptionData = {
        user_id: userId,
        subscription_id: activeSubscription,
        product_id: productIdentifier,
        platform: Platform.OS,
        status: 'active',
        is_trial: customerInfo.entitlements.active[Object.keys(entitlements)[0]].isTrialPeriod,
        trial_end_date: customerInfo.entitlements.active[Object.keys(entitlements)[0]].expirationDate,
        current_period_start: customerInfo.entitlements.active[Object.keys(entitlements)[0]].latestPurchaseDate,
        current_period_end: customerInfo.entitlements.active[Object.keys(entitlements)[0]].expirationDate,
        cancel_at_period_end: false,
        cancelled_at: null,
        revenuecat_customer_id: customerInfo.originalAppUserId,
        original_purchase_date: customerInfo.entitlements.active[Object.keys(entitlements)[0]].originalPurchaseDate,
        auto_renew: customerInfo.entitlements.active[Object.keys(entitlements)[0]].willRenew
      };
      
      await createOrUpdateSubscription(subscriptionData);
      
      // Ödeme işlemini kaydet
      const transactionData = {
        user_id: userId,
        transaction_id: customerInfo.originalPurchaseDate, // Gerçek transaction ID
        original_transaction_id: customerInfo.originalPurchaseDate,
        product_id: productIdentifier,
        type: 'subscription',
        amount: getSubscriptionPrice(productIdentifier),
        currency: '₺',
        platform: Platform.OS,
        platform_transaction_id: activeSubscription,
        receipt_data: JSON.stringify(customerInfo),
        status: 'completed'
      };
      
      await createPaymentTransaction(transactionData);
    }
    
    return { 
      success: true, 
      customerInfo,
      productIdentifier 
    };
  } catch (error) {
    console.error('Abonelik satın alma hatası:', error);
    
    // Hata türlerine göre mesaj
    let errorMessage = 'Satın alma işlemi sırasında bir hata oluştu.';
    
    if (error.code === 'PURCHASES_ERROR_PURCHASE_CANCELLED') {
      errorMessage = 'Satın alma işlemi iptal edildi.';
    } else if (error.code === 'PURCHASES_ERROR_PURCHASE_NOT_ALLOWED') {
      errorMessage = 'Satın alma işlemi bu cihazda desteklenmiyor.';
    } else if (error.code === 'PURCHASES_ERROR_PAYMENT_PENDING') {
      errorMessage = 'Ödeme işlemi beklemede. Lütfen daha sonra tekrar deneyin.';
    }
    
    return { success: false, error, errorMessage };
  }
};

// Satın alımları geri yükle
export const restorePurchases = async (userId) => {
  try {
    const customerInfo = await Purchases.restorePurchases();
    
    // Aktif abonelik var mı kontrol et
    const activeSubscriptions = customerInfo.activeSubscriptions;
    const entitlements = customerInfo.entitlements.active;
    
    if (activeSubscriptions.length > 0 && Object.keys(entitlements).length > 0) {
      // Abonelik bilgilerini veritabanına kaydet
      const activeSubscription = activeSubscriptions[0];
      const entitlementKey = Object.keys(entitlements)[0];
      
      const subscriptionData = {
        user_id: userId,
        subscription_id: activeSubscription,
        product_id: entitlements[entitlementKey].productIdentifier,
        platform: Platform.OS,
        status: 'active',
        is_trial: entitlements[entitlementKey].isTrialPeriod,
        trial_end_date: entitlements[entitlementKey].expirationDate,
        current_period_start: entitlements[entitlementKey].latestPurchaseDate,
        current_period_end: entitlements[entitlementKey].expirationDate,
        cancel_at_period_end: false,
        cancelled_at: null,
        revenuecat_customer_id: customerInfo.originalAppUserId,
        original_purchase_date: entitlements[entitlementKey].originalPurchaseDate,
        auto_renew: entitlements[entitlementKey].willRenew
      };
      
      await createOrUpdateSubscription(subscriptionData);
      
      return { 
        success: true, 
        customerInfo,
        hasActiveSubscription: true,
        message: 'Satın alımlarınız başarıyla geri yüklendi.'
      };
    } else {
      return { 
        success: true, 
        customerInfo,
        hasActiveSubscription: false,
        message: 'Geri yüklenecek aktif abonelik bulunamadı.'
      };
    }
  } catch (error) {
    console.error('Satın alımları geri yükleme hatası:', error);
    return { 
      success: false, 
      error,
      message: 'Satın alımları geri yükleme sırasında bir hata oluştu.'
    };
  }
};

// Müşteri bilgilerini al
export const getCustomerInfo = async () => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return { success: true, customerInfo };
  } catch (error) {
    console.error('Müşteri bilgisi alma hatası:', error);
    return { success: false, error };
  }
};

// Abonelik fiyatını al
const getSubscriptionPrice = (productId) => {
  const prices = {
    [SUBSCRIPTION_PRODUCTS.MINI_MONTHLY]: 99.99,
    [SUBSCRIPTION_PRODUCTS.STANDART_MONTHLY]: 149.99,
    [SUBSCRIPTION_PRODUCTS.PREMIUM_MONTHLY]: 219.99
  };
  return prices[productId] || 0;
};

// Jeton paketi fiyatını al
const getTokenPackagePrice = (productId) => {
  const prices = {
    'token_10': 49.99,
    'token_30': 129.99,
    'token_50': 209.99,
    'token_80': 299.99
  };
  return prices[productId] || 0;
};

// Müşteri bilgilerini dinle
export const addCustomerInfoUpdateListener = (listener) => {
  return Purchases.addCustomerInfoUpdateListener(listener);
};

// Listener'ı kaldır
export const removeCustomerInfoUpdateListener = (listener) => {
  Purchases.removeCustomerInfoUpdateListener(listener);
};

// RevenueCat'ten çıkış yap
export const logOutRevenueCat = async () => {
  try {
    await Purchases.logOut();
    return { success: true };
  } catch (error) {
    console.error('RevenueCat çıkış hatası:', error);
    return { success: false, error };
  }
};

// Abonelik durumunu kontrol et
export const checkSubscriptionStatus = async (userId) => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const entitlements = customerInfo.entitlements.active;
    
    const hasActiveSubscription = Object.keys(entitlements).length > 0;
    
    if (hasActiveSubscription) {
      const entitlementKey = Object.keys(entitlements)[0];
      const entitlement = entitlements[entitlementKey];
      
      return {
        success: true,
        hasActiveSubscription: true,
        productId: entitlement.productIdentifier,
        isTrial: entitlement.isTrialPeriod,
        expirationDate: entitlement.expirationDate,
        willRenew: entitlement.willRenew
      };
    } else {
      return {
        success: true,
        hasActiveSubscription: false
      };
    }
  } catch (error) {
    console.error('Abonelik durumu kontrol hatası:', error);
    return { success: false, error };
  }
};

// TEST FONKSIYONLARI
// ===================

// Test satın alma işlemi
export const testPurchase = async (productId) => {
  try {
    // Test için offerings al
    const offerings = await Purchases.getOfferings();
    
    // Önce "default" offering'ini dene, yoksa "preview-offering" kullan
    let targetOffering = offerings.all?.default || offerings.current;
    
    if (!targetOffering) {
      console.warn('⚠️ Default offering bulunamadı, preview-offering kullanılıyor');
      targetOffering = offerings.all?.['preview-offering'];
    }
    
    if (!targetOffering) {
      throw new Error('Test için aktif offering bulunamadı');
    }
    
    // Preview API modunda ise mevcut paketlerden birini kullan
    let testPackage;
    
    if (targetOffering.identifier === 'preview-offering') {
      // Preview modunda ilk mevcut paketi kullan
      testPackage = targetOffering.availablePackages[0];
    } else {
      // Normal modda belirtilen paketi ara
      testPackage = targetOffering.availablePackages.find(
        pkg => pkg.product.identifier === productId
      );
    }
    
    if (!testPackage) {
      throw new Error(`Test paketi bulunamadı: ${productId}`);
    }
    
    // Test satın alma
    const { customerInfo, productIdentifier } = await Purchases.purchasePackage(testPackage);
    
    return {
      success: true,
      productId: productIdentifier,
      customerInfo
    };
    
  } catch (error) {
    console.error('❌ TEST SATINMA HATASI:', error);
    
    // Kullanıcı iptal etmişse
    if (error.code === 'USER_CANCELLED') {
      return { success: false, cancelled: true };
    }
    
    return { success: false, error };
  }
};

// Test kullanıcı bilgilerini göster
export const getTestUserInfo = async () => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    
    return {
      success: true,
      customerInfo: {
        originalUserId: customerInfo.originalUserId,
        activeSubscriptions: customerInfo.activeSubscriptions,
        entitlements: customerInfo.entitlements.active,
        purchasedProductIdentifiers: customerInfo.purchasedProductIdentifiers
      }
    };
  } catch (error) {
    console.error('Test kullanıcı bilgileri hatası:', error);
    return { success: false, error };
  }
}; 