-- Supabase Schema untuk "Operasi Campuran Bilangan Bulat"

-- Aktifkan ekstensi UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabel Students
CREATE TABLE IF NOT EXISTS public.students (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Tabel Test Results (Untuk Tes Awal, Latihan Umum, Kuis)
CREATE TABLE IF NOT EXISTS public.test_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    jenis TEXT NOT NULL, -- 'tes_awal', 'latihan', 'kuis'
    skor INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Tabel Student Progress (Untuk melacak persentase per materi)
CREATE TABLE IF NOT EXISTS public.student_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    materi TEXT NOT NULL,
    persentase_penguasaan INTEGER DEFAULT 0,
    UNIQUE(student_id, materi)
);

-- 4. Tabel Student Badges (Untuk mencatat pencapaian)
CREATE TABLE IF NOT EXISTS public.student_badges (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    badge_id TEXT NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(student_id, badge_id)
);

-- Row Level Security (RLS)
-- Dalam aplikasi sederhana ini, kita hanya pakai anon key. 
-- Agar siswa hanya bisa baca/tulis datanya sendiri, aplikasi client 
-- harus mengirim nama siswa atau kita batasi insert.
-- Untuk prototipe murni sisi klien (tanpa auth JWT yang strict), 
-- kita biarkan anon role bisa mengakses, tapi dibatasi lewat kode client.
-- Namun, best practice adalah:
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;

-- Policy sederhana (Buka akses penuh untuk Anon Role di prototipe)
-- PERINGATAN: Di production sungguhan, jangan gunakan ini. 
CREATE POLICY "Enable all access for anon" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for anon" ON public.test_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for anon" ON public.student_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for anon" ON public.student_badges FOR ALL USING (true) WITH CHECK (true);
