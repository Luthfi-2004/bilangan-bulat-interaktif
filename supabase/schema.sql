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
    dibuat_oleh_guru_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

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
    dibuat_oleh_guru_id
  ) VALUES (
    new_id,
    LOWER(TRIM(student_email)),
    student_name,
    'siswa',
    guru_id
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = 'siswa';

  RETURN json_build_object('id', new_id, 'email', student_email, 'name', student_name);
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
CREATE POLICY "Users can read own profile" ON public.users_metadata
  FOR SELECT USING (auth.uid() = id OR public.is_guru() OR auth.role() = 'anon');

CREATE POLICY "Users can update own profile" ON public.users_metadata
  FOR UPDATE USING (auth.uid() = id OR public.is_guru());

CREATE POLICY "Allow insert profile" ON public.users_metadata
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Guru can delete users_metadata" ON public.users_metadata
  FOR DELETE USING (public.is_guru());

-- 2. Policies untuk questions (Siswa read-only, Guru CRUD)
CREATE POLICY "Public read questions" ON public.questions
  FOR SELECT USING (true);

CREATE POLICY "Guru can insert questions" ON public.questions
  FOR INSERT WITH CHECK (public.is_guru() OR auth.role() = 'authenticated');

CREATE POLICY "Guru can update questions" ON public.questions
  FOR UPDATE USING (public.is_guru() OR auth.role() = 'authenticated');

CREATE POLICY "Guru can delete questions" ON public.questions
  FOR DELETE USING (public.is_guru() OR auth.role() = 'authenticated');

-- 3. Policies untuk materi_content (Siswa read-only, Guru CRUD)
CREATE POLICY "Public read materi_content" ON public.materi_content
  FOR SELECT USING (true);

CREATE POLICY "Guru can insert materi_content" ON public.materi_content
  FOR INSERT WITH CHECK (public.is_guru() OR auth.role() = 'authenticated');

CREATE POLICY "Guru can update materi_content" ON public.materi_content
  FOR UPDATE USING (public.is_guru() OR auth.role() = 'authenticated');

-- 4. Policies untuk test_results
CREATE POLICY "Read test_results" ON public.test_results
  FOR SELECT USING (auth.uid() = student_id OR public.is_guru() OR auth.role() = 'anon');

CREATE POLICY "Insert test_results" ON public.test_results
  FOR INSERT WITH CHECK (auth.uid() = student_id OR auth.role() = 'anon' OR auth.role() = 'authenticated');

-- 5. Policies untuk student_progress
CREATE POLICY "Read student_progress" ON public.student_progress
  FOR SELECT USING (auth.uid() = student_id OR public.is_guru() OR auth.role() = 'anon');

CREATE POLICY "Upsert student_progress" ON public.student_progress
  FOR ALL USING (auth.uid() = student_id OR public.is_guru() OR auth.role() = 'anon');

-- 6. Policies untuk student_badges
CREATE POLICY "Read student_badges" ON public.student_badges
  FOR SELECT USING (auth.uid() = student_id OR public.is_guru() OR auth.role() = 'anon');

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
