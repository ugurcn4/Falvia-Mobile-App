-- Falcılar tablosunu kullanıcılardan bağımsız hale getirme
-- Bu script'i Supabase SQL Editor'da çalıştırın

-- Önce mevcut fortune_tellers tablosunu kontrol et
-- Eğer user_id bağımlılığı varsa kaldır
DO $$ 
BEGIN
    -- user_id foreign key constraint'ini kaldır (eğer varsa)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fortune_tellers_user_id_fkey'
    ) THEN
        ALTER TABLE fortune_tellers DROP CONSTRAINT fortune_tellers_user_id_fkey;
    END IF;
    
    -- user_id sütununu kaldır (eğer varsa)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fortune_tellers' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE fortune_tellers DROP COLUMN user_id;
    END IF;
    
    -- Gerekli sütunları ekle (eğer yoksa)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fortune_tellers' AND column_name = 'name'
    ) THEN
        ALTER TABLE fortune_tellers ADD COLUMN name TEXT NOT NULL DEFAULT 'Anonim Falcı';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fortune_tellers' AND column_name = 'profile_image'
    ) THEN
        ALTER TABLE fortune_tellers ADD COLUMN profile_image TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fortune_tellers' AND column_name = 'rank'
    ) THEN
        ALTER TABLE fortune_tellers ADD COLUMN rank TEXT DEFAULT 'başlangıç';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fortune_tellers' AND column_name = 'is_available'
    ) THEN
        ALTER TABLE fortune_tellers ADD COLUMN is_available BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fortune_tellers' AND column_name = 'total_readings'
    ) THEN
        ALTER TABLE fortune_tellers ADD COLUMN total_readings INTEGER DEFAULT 0;
    END IF;
END $$;

-- Örnek falcı verilerini ekle
INSERT INTO fortune_tellers (
    name, 
    profile_image, 
    bio, 
    experience_years, 
    specialties, 
    rating, 
    price_per_fortune, 
    rank, 
    is_available, 
    total_readings
) VALUES 
(
    'Ayşe Hanım', 
    'https://example.com/ayse-hanim.jpg', 
    'Kahve falı konusunda 15 yıllık deneyimim var. Samimi ve içten yorumlarımla size yardımcı olmaya hazırım.', 
    15, 
    ARRAY['kahve', 'tarot'], 
    4.8, 
    25, 
    'usta', 
    true, 
    1250
),
(
    'Mehmet Bey', 
    'https://example.com/mehmet-bey.jpg', 
    'Astroloji ve tarot alanında uzmanım. Gezegensel hareketleri takip ederek size rehberlik ediyorum.', 
    8, 
    ARRAY['astroloji', 'tarot'], 
    4.5, 
    20, 
    'uzman', 
    true, 
    680
),
(
    'Fatma Teyze', 
    'https://example.com/fatma-teyze.jpg', 
    'Geleneksel kahve falı okumayı annemden öğrendim. 20 yıldır bu işi yapıyorum.', 
    20, 
    ARRAY['kahve'], 
    4.9, 
    30, 
    'usta', 
    true, 
    2100
);

-- Row Level Security (RLS) politikalarını güncelle
-- Falcılar tablosu için herkesin okuma yetkisi ver
DROP POLICY IF EXISTS "fortune_tellers_select_policy" ON fortune_tellers;
CREATE POLICY "fortune_tellers_select_policy" ON fortune_tellers
    FOR SELECT USING (true);

-- Sadece admin kullanıcıları falcıları düzenleyebilir
DROP POLICY IF EXISTS "fortune_tellers_admin_policy" ON fortune_tellers;
CREATE POLICY "fortune_tellers_admin_policy" ON fortune_tellers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- RLS'yi etkinleştir
ALTER TABLE fortune_tellers ENABLE ROW LEVEL SECURITY; 