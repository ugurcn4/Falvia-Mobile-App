# Fal Uygulaması - Supabase Veritabanı Yapısı

## Tablolar

### 1. users (Kullanıcılar)
- **id**: uuid (PRIMARY KEY, Supabase tarafından otomatik oluşturulur)
- **email**: string (benzersiz)
- **phone**: string (benzersiz, opsiyonel)
- **first_name**: string
- **last_name**: string
- **full_name**: string
- **birth_date**: date
- **birth_place**: string (doğum yeri, opsiyonel)
- **profile_image**: string (URL) - Supabase Storage'da saklanır
- **zodiac_sign**: string (burç, opsiyonel)
- **rising_sign**: string (yükselen burç, opsiyonel)
- **gender**: string (cinsiyet, opsiyonel)
- **marital_status**: string (medeni durum, opsiyonel)
- **favorite_fortune_teller**: string (favori falcı, opsiyonel)
- **created_at**: timestamp
- **updated_at**: timestamp
- **token_balance**: integer (jeton bakiyesi)
- **is_admin**: boolean (admin mi?)

## Storage Konfigürasyonu

### 1. Supabase Storage Buckets
```sql
-- profile-images bucket oluştur
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true);
```

### 2. Storage Policies
```sql
-- Kullanıcılar kendi profil fotoğraflarını yükleyebilir
CREATE POLICY "Users can upload their own profile images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Profil fotoğrafları herkese açık
CREATE POLICY "Profile images are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-images');

-- Kullanıcılar kendi profil fotoğraflarını güncelleyebilir
CREATE POLICY "Users can update their own profile images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Kullanıcılar kendi profil fotoğraflarını silebilir
CREATE POLICY "Users can delete their own profile images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 2. fortune_tellers (Falcılar) - Kullanıcılardan bağımsız
- **id**: uuid (PRIMARY KEY)
- **name**: string (falcı adı)
- **profile_image**: string (profil resmi URL)
- **bio**: text (falcı biyografisi)
- **experience_years**: integer (deneyim yılı)
- **specialties**: string[] (array, uzmanlık alanları: kahve, tarot, astroloji vb.)
- **rating**: float (ortalama puan)
- **price_per_fortune**: integer (fal başına jeton ücreti)
- **rank**: string (falcı seviyesi/rütbesi: başlangıç, uzman, usta vb.)
- **is_available**: boolean (şu anda müsait mi?)
- **total_readings**: integer (toplam bakılan fal sayısı)
- **created_at**: timestamp
- **updated_at**: timestamp

NOT: Bu tablo artık users tablosuna bağlı değil. Falcılar manuel olarak admin tarafından oluşturulur.

### 3. fortunes (Fallar)
- **id**: uuid (PRIMARY KEY)
- **user_id**: uuid (FOREIGN KEY, fal isteyen kullanıcı)
- **fortune_teller_id**: uuid (FOREIGN KEY, falcı)
- **category**: string (kahve, tarot, astroloji vb.)
- **status**: string (beklemede, yorumlanıyor, tamamlandı)
- **image_url**: string (fal resmi URL)
- **description**: text (kullanıcının notu)
- **fortune_text**: text (falcının yorumu)
- **token_amount**: integer (ödenen jeton miktarı)
- **created_at**: timestamp
- **updated_at**: timestamp
- **completed_at**: timestamp

### 4. messages (Mesajlar)
- **id**: uuid (PRIMARY KEY)
- **sender_id**: uuid (FOREIGN KEY, gönderen kullanıcı)
- **receiver_id**: uuid (FOREIGN KEY, alıcı kullanıcı)
- **content**: text (mesaj içeriği)
- **image_url**: string (opsiyonel, resim URL)
- **video_url**: string (opsiyonel, video URL)
- **read**: boolean (okundu mu?)
- **created_at**: timestamp

### 5. conversations (Konuşmalar)
- **id**: uuid (PRIMARY KEY)
- **user1_id**: uuid (FOREIGN KEY)
- **user2_id**: uuid (FOREIGN KEY)
- **last_message**: text (son mesaj)
- **last_message_time**: timestamp
- **unread_count**: integer (okunmamış mesaj sayısı)
- **created_at**: timestamp
- **updated_at**: timestamp

### 6. posts (Gönderiler - Keşfet ekranı için)
- **id**: uuid (PRIMARY KEY)
- **user_id**: uuid (FOREIGN KEY, paylaşan kullanıcı)
- **image_url**: string (gönderi resmi URL)
- **content**: text (gönderi açıklaması)
- **category**: string (kahve, tarot, astroloji vb.)
- **likes_count**: integer
- **comments_count**: integer
- **created_at**: timestamp
- **updated_at**: timestamp

### 7. stories (Hikayeler)
- **id**: uuid (PRIMARY KEY)
- **user_id**: uuid (FOREIGN KEY, paylaşan kullanıcı)
- **media_url**: string (hikaye medyası URL)
- **media_type**: string (image/video)
- **created_at**: timestamp
- **expires_at**: timestamp (24 saat sonra)

### 8. comments (Yorumlar)
- **id**: uuid (PRIMARY KEY)
- **post_id**: uuid (FOREIGN KEY, ilgili gönderi)
- **user_id**: uuid (FOREIGN KEY, yorum yapan kullanıcı)
- **content**: text (yorum içeriği)
- **created_at**: timestamp

### 9. likes (Beğeniler)
- **id**: uuid (PRIMARY KEY)
- **post_id**: uuid (FOREIGN KEY, beğenilen gönderi)
- **user_id**: uuid (FOREIGN KEY, beğenen kullanıcı)
- **created_at**: timestamp

### 10. token_transactions (Jeton İşlemleri)
- **id**: uuid (PRIMARY KEY)
- **user_id**: uuid (FOREIGN KEY, kullanıcı)
- **amount**: integer (jeton miktarı, pozitif veya negatif)
- **transaction_type**: string (satın alma, fal gönderme, hediye vb.)
- **reference_id**: uuid (opsiyonel, ilgili işlem ID'si)
- **created_at**: timestamp

### 11. promo_codes (Promosyon Kodları)
- **id**: uuid (PRIMARY KEY)
- **code**: string (benzersiz kod)
- **token_amount**: integer (verilecek jeton miktarı)
- **usage_limit**: integer (kullanım limiti)
- **usage_count**: integer (kullanım sayısı)
- **expires_at**: timestamp
- **created_at**: timestamp
- **is_active**: boolean

### 12. notifications (Bildirimler)
- **id**: uuid (PRIMARY KEY)
- **user_id**: uuid (FOREIGN KEY, bildirim alıcısı)
- **title**: string (bildirim başlığı)
- **content**: text (bildirim içeriği)
- **type**: string (mesaj, fal hazır, promosyon vb.)
- **reference_id**: uuid (opsiyonel, ilgili içerik ID'si)
- **read**: boolean (okundu mu?)
- **created_at**: timestamp

### 13. user_promo_codes (Kullanıcı Promosyon Kodları)
- **id**: uuid (PRIMARY KEY)
- **user_id**: uuid (FOREIGN KEY, kullanıcı)
- **promo_code_id**: uuid (FOREIGN KEY, promosyon kodu)
- **used_at**: timestamp

## İlişkiler

1. `users` -> `fortunes` (1:N): Bir kullanıcı birden fazla fal isteyebilir
2. `fortune_tellers` -> `fortunes` (1:N): Bir falcı birden fazla fal yorumlayabilir (bağımsız falcılar)
3. `users` -> `messages` (1:N): Bir kullanıcı birden fazla mesaj gönderebilir/alabilir
5. `users` -> `conversations` (1:N): Bir kullanıcı birden fazla konuşmaya dahil olabilir
6. `users` -> `posts` (1:N): Bir kullanıcı birden fazla gönderi paylaşabilir
7. `users` -> `stories` (1:N): Bir kullanıcı birden fazla hikaye paylaşabilir
8. `users` -> `comments` (1:N): Bir kullanıcı birden fazla yorum yapabilir
9. `users` -> `likes` (1:N): Bir kullanıcı birden fazla gönderi beğenebilir
10. `posts` -> `comments` (1:N): Bir gönderiye birden fazla yorum yapılabilir
11. `posts` -> `likes` (1:N): Bir gönderi birden fazla beğeni alabilir
12. `users` -> `token_transactions` (1:N): Bir kullanıcı birden fazla jeton işlemi yapabilir
13. `users` -> `notifications` (1:N): Bir kullanıcı birden fazla bildirim alabilir
14. `promo_codes` -> `user_promo_codes` (1:N): Bir promosyon kodu birden fazla kullanıcı tarafından kullanılabilir

## Supabase Güvenlik Kuralları (RLS - Row Level Security)

1. Kullanıcılar sadece kendi bilgilerini görüntüleyebilir ve düzenleyebilir
2. Falcılar tablosu herkese açık (okuma), sadece admin düzenleyebilir
3. Fallar sistem tarafından otomatik olarak falcılara atanır
4. Mesajlar sadece gönderen ve alıcı tarafından görüntülenebilir
5. Gönderiler ve hikayeler herkese açık olabilir
6. Admin kullanıcıları tüm verilere erişebilir

## Supabase Fonksiyonları ve Tetikleyiciler

1. Fal tamamlandığında bildirim gönderme
2. Mesaj alındığında bildirim gönderme
3. Jeton işlemi yapıldığında kullanıcı bakiyesini güncelleme
4. Hikaye 24 saat sonra otomatik silme/arşivleme 