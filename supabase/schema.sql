-- ==========================================================
-- SCHEMA SUPABASE: Operasi Campuran Bilangan Bulat
-- Mencakup: Auth Trigger, Role (Guru & Siswa), Questions CMS,
-- Materi CMS, Realtime Subscriptions, dan Row Level Security
-- ==========================================================

-- Aktifkan ekstensi UUID & pgcrypto
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABEL: users_metadata (Profil Pengguna & Role)
-- Terhubung langsung dengan auth.users Supabase
CREATE TABLE IF NOT EXISTS public.users_metadata (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'siswa', -- 'guru' atau 'siswa'
    password_plain TEXT, -- Password akun siswa agar guru dapat melihat, menyalin, dan membagikan
    dibuat_oleh_guru_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Pastikan kolom password_plain tersedia jika tabel sudah pernah dibuat sebelumnya
ALTER TABLE public.users_metadata ADD COLUMN IF NOT EXISTS password_plain TEXT;

-- 2. TABEL: questions (Bank Soal Dinamis / CMS)
CREATE TABLE IF NOT EXISTS public.questions (
    id TEXT PRIMARY KEY,
    jenis TEXT NOT NULL, -- 'tes_awal', 'latihan_dasar', 'latihan_campuran', 'soal_cerita', 'kuis'
    pertanyaan TEXT NOT NULL,
    pilihan JSONB DEFAULT '[]'::jsonb, -- Array string pilihan: ["-13", "-3", "3", "13"]
    jawaban_benar TEXT NOT NULL,
    pembahasan TEXT,
    judul TEXT, -- Khusus soal cerita (misal: "Suhu", "Kedalaman")
    urutan INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. TABEL: materi_content (Konten Materi Dinamis / CMS)
CREATE TABLE IF NOT EXISTS public.materi_content (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL, -- 'konsep-dasar', 'garis-bilangan', 'sifat-operasi', 'operasi-campuran'
    judul TEXT NOT NULL,
    ringkasan TEXT,
    konten_html TEXT,
    urutan INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. TABEL: test_results (Hasil Tes & Kuis Siswa)
CREATE TABLE IF NOT EXISTS public.test_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    jenis TEXT NOT NULL, -- 'tes_awal', 'latihan_dasar', 'latihan_campuran', 'kuis'
    skor INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. TABEL: student_progress (Kemajuan per Materi)
CREATE TABLE IF NOT EXISTS public.student_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    student_name TEXT,
    materi TEXT NOT NULL,
    persentase_penguasaan INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(student_id, materi)
);

-- 6. TABEL: student_badges (Lencana / Pencapaian Siswa)
CREATE TABLE IF NOT EXISTS public.student_badges (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    student_name TEXT,
    badge_id TEXT NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(student_id, badge_id)
);

-- ==========================================================
-- TRIGGER OTOMATIS: Salin data dari auth.users ke users_metadata
-- ==========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_metadata (id, email, name, role, dibuat_oleh_guru_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'siswa'),
    (NEW.raw_user_meta_data->>'dibuat_oleh_guru_id')::uuid
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================================
-- FUNGSI KHUSUS GURU: Buat Akun Siswa Langsung Aktif
-- Tanpa perlu verifikasi email (Direct Confirmation)
-- ==========================================================
CREATE OR REPLACE FUNCTION public.create_student_user(
  student_email TEXT,
  student_password TEXT,
  student_name TEXT,
  guru_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  new_id UUID := gen_random_uuid();
  encrypted_pw TEXT;
BEGIN
  -- Cek apakah email sudah terdaftar
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = LOWER(TRIM(student_email))) THEN
    RAISE EXCEPTION 'Email sudah terdaftar di sistem!';
  END IF;

  encrypted_pw := crypt(student_password, gen_salt('bf'));

  -- Masukkan langsung ke auth.users dengan status terkonfirmasi
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_id,
    'authenticated',
    'authenticated',
    LOWER(TRIM(student_email)),
    encrypted_pw,
    NOW(), -- Langsung aktif seketika tanpa perlu link verifikasi!
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', student_name, 'role', 'siswa', 'dibuat_oleh_guru_id', guru_id),
    NOW(),
    NOW(),
    '', '', '', ''
  );

  -- Pastikan tersimpan di users_metadata
  INSERT INTO public.users_metadata (
    id,
    email,
    name,
    role,
    password_plain,
    dibuat_oleh_guru_id
  ) VALUES (
    new_id,
    LOWER(TRIM(student_email)),
    student_name,
    'siswa',
    student_password,
    guru_id
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = 'siswa',
    password_plain = EXCLUDED.password_plain;

  RETURN json_build_object('id', new_id, 'email', student_email, 'name', student_name, 'password_plain', student_password);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================================
-- FUNGSI EDIT AKUN SISWA (OLEH GURU)
-- Mengupdate nama, email, dan password baru sekaligus
-- ==========================================================
CREATE OR REPLACE FUNCTION public.update_student_user(
  student_id UUID,
  new_name TEXT,
  new_email TEXT,
  new_password TEXT DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
  -- 1. Update data di users_metadata
  IF new_password IS NOT NULL AND TRIM(new_password) <> '' THEN
    UPDATE public.users_metadata
    SET 
      name = new_name,
      email = LOWER(TRIM(new_email)),
      password_plain = new_password
    WHERE id = student_id;

    -- Update juga di auth.users dengan hash baru
    UPDATE auth.users
    SET 
      email = LOWER(TRIM(new_email)),
      encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = NOW()
    WHERE id = student_id;
  ELSE
    UPDATE public.users_metadata
    SET 
      name = new_name,
      email = LOWER(TRIM(new_email))
    WHERE id = student_id;

    UPDATE auth.users
    SET 
      email = LOWER(TRIM(new_email)),
      updated_at = NOW()
    WHERE id = student_id;
  END IF;

  RETURN json_build_object('success', true, 'id', student_id, 'name', new_name, 'email', new_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================
ALTER TABLE public.users_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materi_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;

-- Helper function: cek apakah user saat ini adalah guru
CREATE OR REPLACE FUNCTION public.is_guru()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users_metadata
    WHERE id = auth.uid() AND role = 'guru'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Policies untuk users_metadata
DROP POLICY IF EXISTS "Users can read own profile" ON public.users_metadata;
CREATE POLICY "Users can read own profile" ON public.users_metadata
  FOR SELECT USING (auth.uid() = id OR public.is_guru() OR auth.role() = 'anon');

DROP POLICY IF EXISTS "Users can update own profile" ON public.users_metadata;
CREATE POLICY "Users can update own profile" ON public.users_metadata
  FOR UPDATE USING (auth.uid() = id OR public.is_guru());

DROP POLICY IF EXISTS "Allow insert profile" ON public.users_metadata;
CREATE POLICY "Allow insert profile" ON public.users_metadata
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Guru can delete users_metadata" ON public.users_metadata;
CREATE POLICY "Guru can delete users_metadata" ON public.users_metadata
  FOR DELETE USING (public.is_guru());

-- 2. Policies untuk questions (Siswa read-only, Guru CRUD)
DROP POLICY IF EXISTS "Public read questions" ON public.questions;
CREATE POLICY "Public read questions" ON public.questions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Guru can insert questions" ON public.questions;
CREATE POLICY "Guru can insert questions" ON public.questions
  FOR INSERT WITH CHECK (public.is_guru() OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Guru can update questions" ON public.questions;
CREATE POLICY "Guru can update questions" ON public.questions
  FOR UPDATE USING (public.is_guru() OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Guru can delete questions" ON public.questions;
CREATE POLICY "Guru can delete questions" ON public.questions
  FOR DELETE USING (public.is_guru() OR auth.role() = 'authenticated');

-- 3. Policies untuk materi_content (Siswa read-only, Guru CRUD)
DROP POLICY IF EXISTS "Public read materi_content" ON public.materi_content;
CREATE POLICY "Public read materi_content" ON public.materi_content
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Guru can insert materi_content" ON public.materi_content;
CREATE POLICY "Guru can insert materi_content" ON public.materi_content
  FOR INSERT WITH CHECK (public.is_guru() OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Guru can update materi_content" ON public.materi_content;
CREATE POLICY "Guru can update materi_content" ON public.materi_content
  FOR UPDATE USING (public.is_guru() OR auth.role() = 'authenticated');

-- 4. Policies untuk test_results
DROP POLICY IF EXISTS "Enable all access for anon" ON public.test_results;
DROP POLICY IF EXISTS "Read test_results" ON public.test_results;
CREATE POLICY "Read test_results" ON public.test_results
  FOR SELECT USING (auth.uid() = student_id OR public.is_guru() OR auth.role() = 'anon');

DROP POLICY IF EXISTS "Insert test_results" ON public.test_results;
CREATE POLICY "Insert test_results" ON public.test_results
  FOR INSERT WITH CHECK (auth.uid() = student_id OR auth.role() = 'anon' OR auth.role() = 'authenticated');

-- 5. Policies untuk student_progress
DROP POLICY IF EXISTS "Enable all access for anon" ON public.student_progress;
DROP POLICY IF EXISTS "Read student_progress" ON public.student_progress;
CREATE POLICY "Read student_progress" ON public.student_progress
  FOR SELECT USING (auth.uid() = student_id OR public.is_guru() OR auth.role() = 'anon');

DROP POLICY IF EXISTS "Upsert student_progress" ON public.student_progress;
CREATE POLICY "Upsert student_progress" ON public.student_progress
  FOR ALL USING (auth.uid() = student_id OR public.is_guru() OR auth.role() = 'anon');

-- 6. Policies untuk student_badges
DROP POLICY IF EXISTS "Enable all access for anon" ON public.student_badges;
DROP POLICY IF EXISTS "Read student_badges" ON public.student_badges;
CREATE POLICY "Read student_badges" ON public.student_badges
  FOR SELECT USING (auth.uid() = student_id OR public.is_guru() OR auth.role() = 'anon');

DROP POLICY IF EXISTS "Insert student_badges" ON public.student_badges;
CREATE POLICY "Insert student_badges" ON public.student_badges
  FOR INSERT WITH CHECK (auth.uid() = student_id OR auth.role() = 'anon' OR auth.role() = 'authenticated');

-- ==========================================================
-- REALTIME SUBSCRIPTIONS
-- Mengizinkan listening update realtime pada tabel penting
-- ==========================================================
BEGIN;
  -- Tambahkan tabel ke publikasi realtime Supabase
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.test_results, 
    public.student_progress, 
    public.student_badges,
    public.users_metadata,
    public.questions;
COMMIT;

-- ==========================================================
-- SEED DATA: SOAL-SOAL LENGKAP (Questions Table)
-- ==========================================================

-- Soal Tes Awal
INSERT INTO public.questions (id, jenis, pertanyaan, pilihan, jawaban_benar, pembahasan, judul, urutan)
VALUES
('TA001', 'tes_awal', '−5 + 8 = ...', '["−13", "−3", "3", "13"]'::jsonb, '3', 'Bergerak 8 langkah ke kanan dari -5, berakhir di 3.', 'Penjumlahan Bilangan', 1),
('TA002', 'tes_awal', '7 − 12 = ...', '["−19", "−5", "5", "19"]'::jsonb, '−5', '7 dikurangi 12 menghasilkan bilangan negatif karena 12 > 7.', 'Pengurangan Bilangan', 2),
('TA003', 'tes_awal', '−4 × 3 = ...', '["−12", "−7", "7", "12"]'::jsonb, '−12', 'Negatif × positif = negatif. 4 × 3 = 12, maka hasilnya -12.', 'Perkalian Tanda Berbeda', 3),
('TA004', 'tes_awal', '20 ÷ (−5) = ...', '["−4", "−5", "4", "5"]'::jsonb, '−4', 'Positif ÷ negatif = negatif. 20 ÷ 5 = 4, maka hasilnya -4.', 'Pembagian Tanda Berbeda', 4),
('TA005', 'tes_awal', '5 + 3 × 2 = ...', '["16", "11", "13", "10"]'::jsonb, '11', 'Perkalian (3 × 2 = 6) dikerjakan lebih dahulu, lalu 5 + 6 = 11.', 'Hierarki Hitung Dasar', 5)
ON CONFLICT (id) DO NOTHING;

-- Soal Latihan Dasar
INSERT INTO public.questions (id, jenis, pertanyaan, pilihan, jawaban_benar, pembahasan, judul, urutan)
VALUES
('L001', 'latihan_dasar', '−15 + 8 = ...', '["−23", "−7", "7", "23"]'::jsonb, '−7', 'Tanda berbeda: kurangkan (15 - 8 = 7), ikuti tanda bilangan terbesar (15 adalah negatif).', 'Penjumlahan', 1),
('L002', 'latihan_dasar', '12 − (−7) = ...', '["5", "−5", "19", "−19"]'::jsonb, '19', 'Kurang negatif sama dengan tambah positif. 12 + 7 = 19.', 'Pengurangan Negatif', 2),
('L003', 'latihan_dasar', '−9 − 6 = ...', '["−3", "3", "−15", "15"]'::jsonb, '−15', '-9 - 6 = -9 + (-6). Tanda sama, dijumlahkan menjadi -15.', 'Pengurangan Berulang', 3),
('L004', 'latihan_dasar', '−8 × (−6) = ...', '["−48", "48", "−14", "14"]'::jsonb, '48', 'Negatif dikali negatif hasilnya positif. 8 × 6 = 48.', 'Perkalian Tanda Sama', 4),
('L005', 'latihan_dasar', '−72 ÷ 9 = ...', '["−8", "8", "−9", "9"]'::jsonb, '−8', 'Negatif dibagi positif hasilnya negatif.', 'Pembagian Negatif', 5),
('L006', 'latihan_dasar', 'Pernyataan yang menunjukkan sifat komutatif adalah...', '["5 + 0 = 5", "3 + 7 = 7 + 3", "(2 + 3) + 4 = 2 + (3 + 4)", "5 + (−5) = 0"]'::jsonb, '3 + 7 = 7 + 3', 'Sifat komutatif adalah pertukaran posisi.', 'Sifat Komutatif', 6),
('L007', 'latihan_dasar', '−12 + 12 = ...', '["−24", "24", "0", "1"]'::jsonb, '0', 'Ini adalah sifat invers penjumlahan. Bilangan dijumlahkan dengan lawannya menghasilkan 0.', 'Invers Penjumlahan', 7)
ON CONFLICT (id) DO NOTHING;

-- Soal Latihan Campuran
INSERT INTO public.questions (id, jenis, pertanyaan, pilihan, jawaban_benar, pembahasan, judul, urutan)
VALUES
('LC01', 'latihan_campuran', '145 ÷ (−5) + 23 − 85 = ...', '["−91", "−10", "−50", "91"]'::jsonb, '−91', '145 ÷ (-5) = -29. Lalu -29 + 23 = -6. Lalu -6 - 85 = -91.', 'Operasi Campuran 1', 1),
('LC02', 'latihan_campuran', '125 + 25 ÷ 5 − 4 × 7 = ...', '["102", "88", "134", "140"]'::jsonb, '102', 'Bagi dan kali dulu: 25÷5=5, 4×7=28. Jadi 125 + 5 - 28 = 102.', 'Operasi Campuran 2', 2),
('LC03', 'latihan_campuran', '100 − [20 + (−5)] × 3 = ...', '["255", "55", "45", "15"]'::jsonb, '55', 'Kurung dulu: [20 + (-5)] = 15. Lalu kali: 15 × 3 = 45. Terakhir kurang: 100 - 45 = 55.', 'Operasi Campuran Bertanda Kurung', 3),
('LC04', 'latihan_campuran', '−60 ÷ 5 + 8 × (−3) − (−10) = ...', '["−26", "−46", "−14", "10"]'::jsonb, '−26', 'Bagi: -60÷5=-12. Kali: 8×(-3)=-24. Persamaan: -12 + (-24) - (-10) = -36 + 10 = -26.', 'Operasi Campuran Kompleks', 4),
('LC05', 'latihan_campuran', '150 + 50 ÷ (−10) − (−5) × 4 = ...', '["165", "125", "105", "145"]'::jsonb, '165', 'Bagi: 50÷(-10)=-5. Kali: (-5)×4=-20. Persamaan: 150 + (-5) - (-20) = 145 + 20 = 165.', 'Operasi Campuran Lanjutan', 5)
ON CONFLICT (id) DO NOTHING;

-- Soal Cerita
INSERT INTO public.questions (id, jenis, pertanyaan, pilihan, jawaban_benar, pembahasan, judul, urutan)
VALUES
('SC01', 'soal_cerita', 'Suhu sebuah ruangan pada pagi hari adalah −4°C. Pada siang hari suhu naik 9°C, kemudian pada malam hari turun lagi 6°C. Berapakah suhu ruangan pada malam hari?', '[]'::jsonb, '−1°C', '-4 + 9 - 6 = 5 - 6 = -1°C', 'Perubahan Suhu Ruangan', 1),
('SC02', 'soal_cerita', 'Seekor lumba-lumba berada 8 meter di bawah permukaan laut. Lumba-lumba tersebut naik 5 meter kemudian turun lagi 3 meter. Pada kedalaman berapa lumba-lumba tersebut berada sekarang?', '[]'::jsonb, '6 meter di bawah laut (−6)', '-8 + 5 - 3 = -3 - 3 = -6 meter (6 meter di bawah laut)', 'Kedalaman Laut', 2),
('SC03', 'soal_cerita', 'Seorang pedagang mengalami kerugian Rp50.000 pada hari pertama dan Rp30.000 pada hari kedua. Pada hari ketiga ia memperoleh keuntungan Rp75.000. Berapa hasil keseluruhan keuntungan/kerugian pedagang tersebut?', '[]'::jsonb, 'Rugi Rp5.000 (−5000)', '(-50.000) + (-30.000) + 75.000 = -80.000 + 75.000 = -5.000 (Rugi Rp5.000)', 'Untung Rugi Perdagangan', 3)
ON CONFLICT (id) DO NOTHING;

-- Soal Kuis Akhir
INSERT INTO public.questions (id, jenis, pertanyaan, pilihan, jawaban_benar, pembahasan, judul, urutan)
VALUES
('Q001', 'kuis', 'Hasil dari −18 + 25 − (−7) adalah...', '["0", "14", "18", "32"]'::jsonb, '14', '-18 + 25 = 7, lalu 7 - (-7) = 7 + 7 = 14.', 'Evaluasi 1', 1),
('Q002', 'kuis', 'Nilai dari (−6) × 4 ÷ (−3) adalah...', '["−8", "8", "−12", "12"]'::jsonb, '8', '(-6) × 4 = -24. Lalu -24 ÷ (-3) = 8.', 'Evaluasi 2', 2),
('Q003', 'kuis', 'Hasil dari 40 − 12 ÷ (−3) + (−5) × 2 adalah...', '["26", "34", "30", "44"]'::jsonb, '34', '12 ÷ (-3) = -4, (-5) × 2 = -10. Maka: 40 - (-4) + (-10) = 44 - 10 = 34.', 'Evaluasi 3', 3),
('Q004', 'kuis', 'Suhu es mula-mula −5°C. Setelah dipanaskan selama 10 menit suhunya menjadi 25°C. Kenaikan suhu per menit adalah...', '["2°C", "3°C", "2.5°C", "30°C"]'::jsonb, '3°C', 'Total kenaikan = 25 - (-5) = 30°C. Kenaikan per menit = 30 ÷ 10 = 3°C.', 'Evaluasi 4', 4),
('Q005', 'kuis', 'Hasil dari [15 + (−3)] × [−8 − (−4)] adalah...', '["−48", "48", "−144", "144"]'::jsonb, '−48', '[15 + (-3)] = 12. [-8 - (-4)] = -8 + 4 = -4. 12 × (-4) = -48.', 'Evaluasi 5', 5)
ON CONFLICT (id) DO NOTHING;

-- ==========================================================
-- SEED DATA: MATERI CONTENT (Materi Dinamis / CMS)
-- ==========================================================
INSERT INTO public.materi_content (id, slug, judul, ringkasan, urutan, konten_html)
VALUES
('MAT01', 'konsep-dasar', 'Mengenal Bilangan Bulat', 'Memahami bilangan positif, nol, negatif, serta aplikasinya di kehidupan nyata.', 1, '<p>Bilangan bulat terdiri dari himpunan bilangan bulat positif, bilangan nol, dan bilangan bulat negatif...</p>'),
('MAT02', 'garis-bilangan', 'Garis Bilangan & Nilai Mutlak', 'Memvisualisasikan letak bilangan, perbandingan besar-kecil, dan konsep jarak mutlak.', 2, '<p>Pada garis bilangan horizontal, semakin ke kanan letak bilangan maka nilainya semakin besar...</p>'),
('MAT03', 'sifat-operasi', 'Sifat-Sifat Operasi Hitung', 'Kuasai sifat komutatif, asosiatif, distributif, elemen identitas, dan invers.', 3, '<p>Operasi hitung bilangan bulat memiliki beberapa sifat penting seperti komutatif dan distributif...</p>'),
('MAT04', 'operasi-campuran', 'Operasi Campuran (KABATAKU)', 'Aturan tingkatan operasi: tanda kurung, kali/bagi dari kiri, lalu tambah/kurang.', 4, '<p>Dalam operasi campuran, dahulukan tanda kurung, kemudian perkalian dan pembagian, lalu penjumlahan dan pengurangan...</p>')
ON CONFLICT (id) DO NOTHING;

-- ==========================================================
-- SEED DATA: AKUN GURU BAWAAN (DEFAULT TEACHER ACCOUNT)
-- Email: guru@bilbul.sch.id
-- Password: guru123
-- ==========================================================
DO $$
DECLARE
  guru_uuid UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'guru@bilbul.sch.id') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      guru_uuid,
      'authenticated',
      'authenticated',
      'guru@bilbul.sch.id',
      crypt('guru123', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Bapak/Ibu Guru Matematika","role":"guru"}'::jsonb,
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO public.users_metadata (
      id,
      email,
      name,
      role
    ) VALUES (
      guru_uuid,
      'guru@bilbul.sch.id',
      'Bapak/Ibu Guru Matematika',
      'guru'
    ) ON CONFLICT (id) DO UPDATE SET
      role = 'guru',
      name = 'Bapak/Ibu Guru Matematika';
  END IF;
END $$;

-- ==========================================================
-- 8. TABEL KONTEN MATERI (CMS MATERI GURU)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.materi_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  urutan INT NOT NULL DEFAULT 1,
  judul TEXT NOT NULL,
  ringkasan TEXT,
  konten TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.materi_content ENABLE ROW LEVEL SECURITY;

-- Policy: Siapapun dapat membaca materi
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'materi_content' AND policyname = 'Anyone can view materi'
  ) THEN
    CREATE POLICY "Anyone can view materi" ON public.materi_content
      FOR SELECT USING (true);
  END IF;
END $$;

-- Policy: Hanya Guru yang dapat mengelola (Insert, Update, Delete) materi
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'materi_content' AND policyname = 'Guru can manage materi'
  ) THEN
    CREATE POLICY "Guru can manage materi" ON public.materi_content
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.users_metadata
          WHERE id = auth.uid() AND role = 'guru'
        )
      );
  END IF;
END $$;

-- Seed Data Awal untuk 9 Submateri Inti
INSERT INTO public.materi_content (slug, urutan, judul, ringkasan, konten) VALUES
('1-definisi', 1, 'Definisi Bilangan Bulat', 'Mengenal bilangan bulat positif, negatif, dan nol beserta garis bilangannya.', '<div class="space-y-6">
  <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
    <h3 class="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
      <i class="fa-solid fa-lightbulb text-amber-500"></i> Pengertian Bilangan Bulat
    </h3>
    <p class="text-slate-600 leading-relaxed text-base mb-4">
      Bilangan bulat adalah himpunan bilangan utuh (bukan pecahan atau desimal) yang terdiri dari:
    </p>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
      <div class="p-4 rounded-xl bg-red-50 border border-red-100 text-center">
        <div class="text-xs font-bold uppercase tracking-wider text-red-600 mb-1">Bilangan Negatif</div>
        <div class="font-mono text-lg font-bold text-red-700">..., -3, -2, -1</div>
        <div class="text-xs text-slate-500 mt-1">Nilai lebih kecil dari nol</div>
      </div>
      <div class="p-4 rounded-xl bg-slate-100 border border-slate-200 text-center">
        <div class="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Bilangan Nol</div>
        <div class="font-mono text-lg font-bold text-slate-900">0</div>
        <div class="text-xs text-slate-500 mt-1">Bukan positif & bukan negatif</div>
      </div>
      <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
        <div class="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Bilangan Positif</div>
        <div class="font-mono text-lg font-bold text-emerald-700">1, 2, 3, ...</div>
        <div class="text-xs text-slate-500 mt-1">Nilai lebih besar dari nol</div>
      </div>
    </div>
  </div>

  <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
    <h3 class="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
      <i class="fa-solid fa-arrows-left-right text-blue-600"></i> Garis Bilangan Interaktif
    </h3>
    <p class="text-slate-600 text-sm mb-4">Klik titik bilangan pada garis berikut untuk melihat posisi dan nilainya:</p>
    <div id="number-line-container" class="my-6"></div>
    <div id="nilai-mutlak-info" class="p-4 rounded-xl bg-blue-50 border border-blue-200 text-center font-medium text-blue-900">
      Klik salah satu angka pada garis bilangan di atas.
    </div>
  </div>

  <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
    <h3 class="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
      <i class="fa-solid fa-calculator text-indigo-600"></i> Nilai Mutlak |x|
    </h3>
    <p class="text-slate-600 leading-relaxed text-sm mb-3">
      Nilai mutlak menyatakan jarak suatu bilangan terhadap titik nol pada garis bilangan. Karena jarak tidak pernah bernilai negatif, nilai mutlak selalu bernilai positif atau nol.
    </p>
    <div class="flex flex-wrap gap-4 justify-center font-mono font-bold text-slate-800">
      <span class="px-4 py-2 bg-slate-100 rounded-xl border border-slate-200">|-7| = 7</span>
      <span class="px-4 py-2 bg-slate-100 rounded-xl border border-slate-200">|0| = 0</span>
      <span class="px-4 py-2 bg-slate-100 rounded-xl border border-slate-200">|+7| = 7</span>
    </div>
  </div>
</div>'),

('2-garis-bilangan', 2, 'Garis Bilangan & Perbandingan', 'Aturan membandingkan bilangan bulat: semakin ke kanan semakin besar nilainya.', '<div class="space-y-6">
  <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
    <h3 class="text-xl font-bold text-slate-900 mb-3">Prinsip Perbandingan</h3>
    <div class="p-4 rounded-xl bg-blue-50 border-l-4 border-blue-600 text-blue-900 space-y-2 text-sm font-medium">
      <p>• Semakin ke <strong>kanan</strong> posisi suatu bilangan, nilainya semakin <strong>besar</strong>.</p>
      <p>• Semakin ke <strong>kiri</strong> posisi suatu bilangan, nilainya semakin <strong>kecil</strong>.</p>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
      <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center font-mono">
        <span class="text-emerald-700 font-bold text-xl">5 > -8</span>
        <div class="text-xs text-slate-500 mt-1">5 lebih besar dari -8 (5 berada jauh di kanan -8)</div>
      </div>
      <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center font-mono">
        <span class="text-red-700 font-bold text-xl">-10 < -2</span>
        <div class="text-xs text-slate-500 mt-1">-10 lebih kecil dari -2 (-10 berada lebih ke kiri)</div>
      </div>
    </div>
  </div>
</div>'),

('3-penjumlahan', 3, 'Operasi Penjumlahan Bilangan Bulat', 'Konsep menjumlahkan dua bilangan bulat bertanda sama maupun berbeda.', '<div class="space-y-6">
  <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
    <h3 class="text-xl font-bold text-slate-900 mb-3">Aturan Penjumlahan</h3>
    <div class="space-y-3 text-sm text-slate-700">
      <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
        <strong>1. Bertanda Sama:</strong> Jumlahkan kedua nilainya, tandanya mengikuti tanda bilangan tersebut.<br>
        <span class="font-mono text-blue-700 font-bold">5 + 3 = 8</span> | <span class="font-mono text-red-700 font-bold">(-5) + (-3) = -8</span>
      </div>
      <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
        <strong>2. Bertanda Beda:</strong> Cari selisih angka besar dikurangi angka kecil, tandanya mengikuti bilangan dengan nilai mutlak terbesar.<br>
        <span class="font-mono text-blue-700 font-bold">9 + (-4) = 5</span> | <span class="font-mono text-red-700 font-bold">(-9) + 4 = -5</span>
      </div>
    </div>
  </div>
</div>'),

('4-sifat-penjumlahan', 4, 'Sifat-Sifat Penjumlahan', 'Mempelajari sifat komutatif, asosiatif, unsur identitas (0), dan invers tambah.', '<div class="space-y-6">
  <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
    <h3 class="text-xl font-bold text-slate-900 mb-3">Sifat-Sifat Utama</h3>
    <ul class="space-y-3 text-sm text-slate-700 list-disc list-inside">
      <li><strong>Komutatif (Pertukaran):</strong> a + b = b + a</li>
      <li><strong>Asosiatif (Pengelompokan):</strong> (a + b) + c = a + (b + c)</li>
      <li><strong>Unsur Identitas:</strong> a + 0 = a</li>
      <li><strong>Invers Tambah (Lawan):</strong> a + (-a) = 0</li>
    </ul>
  </div>
</div>'),

('5-pengurangan', 5, 'Operasi Pengurangan Bilangan Bulat', 'Memahami bahwa mengurangi sama dengan menjumlahkan dengan lawan bilangan.', '<div class="space-y-6">
  <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
    <h3 class="text-xl font-bold text-slate-900 mb-3">Rumus Kunci Pengurangan</h3>
    <div class="p-4 rounded-xl bg-amber-50 border border-amber-200 font-mono text-center text-lg font-bold text-amber-900 mb-3">
      a - b = a + (-b)<br>
      a - (-b) = a + b
    </div>
    <p class="text-slate-600 text-sm">Contoh: 7 - (-3) = 7 + 3 = 10.</p>
  </div>
</div>'),

('6-perkalian', 6, 'Operasi Perkalian Bilangan Bulat', 'Aturan perkalian tanda: (+)(+) = (+), (-)(-) = (+), (+)(-) = (-).', '<div class="space-y-6">
  <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
    <h3 class="text-xl font-bold text-slate-900 mb-3">Aturan Tanda Perkalian</h3>
    <div class="grid grid-cols-2 gap-3 text-center font-mono font-bold text-sm">
      <div class="p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">(+) x (+) = (+)</div>
      <div class="p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">(-) x (-) = (+)</div>
      <div class="p-3 rounded-lg bg-red-50 text-red-800 border border-red-200">(+) x (-) = (-)</div>
      <div class="p-3 rounded-lg bg-red-50 text-red-800 border border-red-200">(-) x (+) = (-)</div>
    </div>
  </div>
</div>'),

('7-pembagian', 7, 'Operasi Pembagian Bilangan Bulat', 'Kebalikan dari perkalian dengan aturan tanda yang serupa.', '<div class="space-y-6">
  <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
    <h3 class="text-xl font-bold text-slate-900 mb-3">Aturan Pembagian</h3>
    <p class="text-slate-600 text-sm mb-3">Pembagian dua bilangan bertanda sama menghasilkan bilangan positif. Bertanda beda menghasilkan bilangan negatif.</p>
    <div class="font-mono text-sm space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-200">
      <div>12 : 3 = 4</div>
      <div>(-12) : (-3) = 4</div>
      <div>(-12) : 3 = -4</div>
    </div>
  </div>
</div>'),

('8-operasi-campuran', 8, 'Operasi Campuran (KABATAKU)', 'Tingkat prioritas operasi hitung: Kurung, Kali & Bagi, Tambah & Kurang.', '<div class="space-y-6">
  <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
    <h3 class="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
      <i class="fa-solid fa-ranking-star text-amber-500"></i> Urutan Hierarki Operasi
    </h3>
    <ol class="space-y-2 text-sm text-slate-700 list-decimal list-inside font-semibold">
      <li>Kerjakan tanda kurung <strong>(...)</strong> terlebih dahulu.</li>
      <li>Kerjakan <strong>Perkalian (x)</strong> dan <strong>Pembagian (:)</strong> dari kiri ke kanan.</li>
      <li>Kerjakan <strong>Penjumlahan (+)</strong> dan <strong>Pengurangan (-)</strong> dari kiri ke kanan.</li>
    </ol>
  </div>
</div>'),

('9-penerapan', 9, 'Penerapan di Kehidupan Nyata', 'Contoh penerapan bilangan bulat pada suhu udara, kedalaman laut, dan keuangan.', '<div class="space-y-6">
  <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
    <h3 class="text-xl font-bold text-slate-900 mb-3">Penerapan Nyata</h3>
    <ul class="space-y-2 text-sm text-slate-700 list-disc list-inside">
      <li><strong>Suhu:</strong> 5°C di bawah titik beku ditulis <strong>-5°C</strong>.</li>
      <li><strong>Kedalaman Laut:</strong> 150 meter di bawah permukaan laut ditulis <strong>-150 m</strong>.</li>
      <li><strong>Keuangan:</strong> Keuntungan ditulis positif, kerugian/utang ditulis negatif.</li>
    </ul>
  </div>
</div>')
ON CONFLICT (slug) DO UPDATE SET
  judul = EXCLUDED.judul,
  ringkasan = EXCLUDED.ringkasan,
  konten = EXCLUDED.konten,
  urutan = EXCLUDED.urutan;
