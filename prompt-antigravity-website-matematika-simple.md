# PROMPT UNTUK ANTIGRAVITY — Website Pembelajaran "Operasi Campuran Bilangan Bulat" (Versi Simpel)

## Konteks & Tujuan
Buatkan website pembelajaran matematika interaktif berjudul **"Operasi Campuran Bilangan Bulat"** dengan tagline **"Kenali Bilangannya, Kuasai Operasinya!"**, ditujukan untuk siswa SMP Kelas VII. Website ini dibuat berdasarkan blueprint dari mahasiswa Pendidikan Matematika (bukan Informatika), jadi buat sesederhana dan semudah mungkin dipahami/di-maintain. Semua isi materi, contoh, dan soal WAJIB mengikuti dokumen sumber yang saya lampirkan di bawah — jangan mengarang materi baru, boleh dirapikan penulisannya saja.

## Tech Stack (WAJIB — simpel, tanpa framework berat)
- **Frontend**: HTML + CSS + Vanilla JavaScript murni (tanpa React/Next.js/framework JS lain). Boleh pakai beberapa file HTML terpisah per halaman (multi-page), bukan single page app, supaya gampang dipahami.
- **Database**: Supabase (Postgres) — untuk simpan progress siswa, jawaban, skor, dan badge. Akses Supabase langsung dari JavaScript sisi client pakai Supabase JS SDK (`@supabase/supabase-js` via CDN atau bundle ringan), TIDAK perlu backend server custom.
- **"Backend"**: Karena hosting di Vercel dan pakai Supabase, backend logic cukup pakai Supabase langsung (client-side calls dengan Row Level Security yang aman) DAN/atau Vercel Serverless Functions (folder `/api`) kalau ada logic yang tidak aman dilakukan di client (misal validasi skor akhir).
- **Deployment**: Project di-push ke GitHub lalu deploy ke Vercel (static site + serverless functions). Siapkan `.env.example` untuk `SUPABASE_URL` dan `SUPABASE_ANON_KEY`, jangan hardcode key di kode.
- **Responsive**: WAJIB fully responsive — HP, tablet, laptop, PC (pakai CSS Flexbox/Grid + media queries, mobile-first).

## Struktur File (usulan, boleh disesuaikan Antigravity)
```
/
├── index.html              (Beranda)
├── petunjuk.html
├── tes-awal.html
├── materi/
│   ├── index.html          (daftar submateri)
│   ├── 1-definisi.html
│   ├── 2-garis-bilangan.html
│   ├── 3-penjumlahan.html
│   ├── 4-sifat-penjumlahan.html
│   ├── 5-pengurangan.html
│   ├── 6-perkalian.html
│   ├── 7-pembagian.html
│   ├── 8-operasi-campuran.html
│   └── 9-penerapan.html
├── soal-cerita.html
├── latihan.html
├── game.html
├── hasil.html
├── pencapaian.html
├── css/
│   └── style.css           (styling global, tema warna, komponen reusable)
├── js/
│   ├── supabase-client.js  (init koneksi Supabase)
│   ├── soal-data.js        (data soal dalam bentuk array/object JS)
│   ├── quiz-engine.js      (logic cek jawaban, skor, feedback — dipakai di banyak halaman)
│   ├── number-line.js      (garis bilangan interaktif)
│   └── badge-engine.js     (logic cek & buka badge)
├── api/                    (Vercel Serverless Functions, opsional untuk validasi skor)
└── .env.example
```

## Navigasi (Navbar, konsisten di semua halaman HTML — pakai include manual atau JS fetch partial)
🏠 Beranda · 📋 Petunjuk · 🧠 Tes Awal · 📚 Materi · ✏️ Latihan · 🎮 Game · 📊 Hasil · 🏆 Pencapaian

## Alur Belajar Utama
Tes Awal → Materi → Latihan → Soal Cerita → Game → Kuis → Hasil → Pencapaian

## Rincian Halaman

### 1. Beranda (index.html)
- Hero: judul, tagline, deskripsi singkat, 2 tombol CTA ("🚀 Mulai Belajar", "📚 Lihat Materi")
- Section "Yang Akan Kamu Pelajari" — 4 card: Bilangan Bulat, Operasi Hitung, Operasi Campuran, Uji Kemampuan
- Section alur belajar (stepper visual)

### 2. Petunjuk
List bernomor cara pakai tiap fitur (Tes Awal → Materi → Latihan → Soal Cerita → Game → Kuis → Hasil → Pencapaian), sesuai isi dokumen.

### 3. Tes Awal
- 5 soal pilihan ganda (data dari dokumen)
- Fitur: pilihan jawaban, tombol Next, progress bar, submit, skor otomatis, feedback sesuai rentang skor (≥80 / 60–79 / <60)
- Simpan hasil ke Supabase (tabel `test_results`)

### 4. Materi
9 halaman terpisah (jangan satu halaman panjang), sesuai daftar submateri di dokumen:
1. Definisi Bilangan Bulat (+ garis bilangan interaktif via JS: klik/geser angka, tampilkan nilai mutlak)
2. Garis Bilangan
3. Penjumlahan (+ mini quiz)
4. Sifat-sifat Penjumlahan (5 sifat + contoh + mini quiz)
5. Pengurangan (+ visual langkah a−b = a+(−b))
6. Perkalian (+ tabel tanda)
7. Pembagian (+ tabel tanda + warning tidak bisa dibagi 0)
8. Operasi Hitung Campuran — materi inti, step-by-step solver dengan tombol "Langkah 1/2/3"
9. Penerapan (konteks: suhu, uang, untung, rugi, kedalaman, lantai gedung, ketinggian)

Isi teks, rumus, contoh ikuti persis dokumen sumber.

### 5. Soal Cerita
3 soal cerita (Suhu, Kedalaman, Usaha Dagang) sesuai dokumen, pembahasan bisa expand/collapse (pakai `<details>` HTML atau toggle JS sederhana).

### 6. Latihan
3 kategori sesuai dokumen: A. Operasi Dasar (7 soal), B. Operasi Campuran (10 soal), C. Soal Cerita (3 soal).
Alur: jawab → klik "Cek Jawaban" → feedback benar/salah → kalau salah beri petunjuk → tampilkan pembahasan → skor tersimpan ke Supabase.

### 7. Game
- **Tebak Posisi** (garis bilangan)
- **Benar atau Salah** (pernyataan operasi bilangan bulat)
- **Tantangan Operasi** (timer 15 detik, +10 poin per jawaban benar, tampilkan skor akhir)

### 8. Kuis
15 soal (3 penjumlahan, 3 pengurangan, 3 perkalian/pembagian, 4 operasi campuran, 2 soal cerita). Predikat: 90–100 Sangat Baik, 80–89 Baik, 70–79 Cukup, <70 Perlu Belajar Lagi. Simpan hasil ke Supabase.

### 9. Hasil
Dashboard progress: nilai Tes Awal/Latihan/Kuis (%), progress bar keseluruhan, breakdown penguasaan per submateri (bar sederhana pakai CSS width, tidak perlu library chart). Rekomendasi otomatis berbasis nilai.

### 10. Pencapaian (Badge)
7 badge (Pemula, Rajin Belajar, Rajin Berlatih, Pemburu Skor, Jago Bilangan Bulat, Master Operasi Campuran, Math Champion) sesuai syarat di dokumen. Badge belum didapat = abu-abu, sudah didapat = full warna. Cek status dari data Supabase.

## Struktur Data Soal (simpan di `js/soal-data.js` sebagai array JS, plus disinkron ke tabel Supabase `questions`)
```js
{
  id: "OC001",
  materi: "Operasi Campuran",
  soal: "125 + 25 ÷ 5 − 4 × 7 = ...",
  pilihan: null, // atau array kalau pilihan ganda
  jawaban: 102,  // WAJIB dihitung ulang & divalidasi, jangan asal salin dari draft dokumen
  level: "Sedang",
  pembahasan: "25 ÷ 5 = 5; 4 × 7 = 28; 125 + 5 − 28 = 102",
  feedback: "",
  tipe: "isian"
}
```
⚠️ Catatan penting dari dokumen sumber: kunci jawaban contoh di draft perlu dicek ulang sebelum dipakai — jangan hard-code tanpa validasi. Tolong hitung ulang semua jawaban soal latihan/kuis saat generate data, karena berpotensi ada draft yang belum final.

## Skema Tabel Supabase (usulan)
- `students` (id, nama, created_at)
- `questions` (sesuai struktur di atas)
- `student_answers` (student_id, question_id, jawaban_siswa, benar, created_at)
- `test_results` (student_id, jenis: "tes_awal"|"latihan"|"kuis", skor, created_at)
- `student_progress` (student_id, materi, persentase_penguasaan)
- `student_badges` (student_id, badge_id, unlocked_at)

Aktifkan Row Level Security (RLS) sederhana: siswa hanya bisa baca/tulis data miliknya sendiri (pakai session id yang disimpan di localStorage sebagai identitas siswa, tanpa perlu login rumit — cukup input nama di awal).

## Desain (WAJIB)
- Gaya: modern, edukatif, clean — bukan gaya "anak TK"
- Warna dominan: navy / dark blue / white / blue, aksen kuning-oranye
- Elemen: rounded card, icon (emoji atau icon set ringan), progress bar, garis bilangan visual
- Hindari: layar ramai, animasi berlebihan, teks terlalu padat
- Simpan semua warna/spacing sebagai CSS variables di `:root` supaya konsisten dan gampang diubah

## Fitur Teknis Wajib
- Navbar responsif (hamburger menu di mobile, pure CSS/JS tanpa library)
- Progress bar & skor otomatis tersimpan real-time ke Supabase
- Feedback jawaban benar/salah
- Number line interaktif (SVG atau div + CSS, dengan event listener klik/drag sederhana)
- Timer game (pakai `setInterval`)
- Badge system terhubung ke data progress asli
- Animasi ringan pakai CSS transition/keyframes saja (tanpa library animasi)
- Kode JS dipecah per file sesuai fungsinya (lihat struktur file di atas), diberi komentar dalam Bahasa Indonesia yang mudah dipahami

## Prioritas Pengerjaan
1. ⭐⭐⭐ Beranda, Petunjuk, Materi lengkap, Tes Awal, Latihan, Kuis, Hasil
2. ⭐⭐ Number line interaktif, Soal Cerita, penyimpanan progress ke Supabase
3. ⭐ Game, Badge/Pencapaian, animasi tambahan

## Yang Saya Minta Dari Kamu (Antigravity)
1. Setup project HTML/CSS/JS vanilla + koneksi Supabase, siap push ke GitHub dan deploy ke Vercel (static hosting, plus `/api` serverless functions kalau diperlukan).
2. Buat data soal (tes awal, latihan, kuis, game) di `js/soal-data.js` berdasarkan dokumen ini, dengan jawaban yang sudah divalidasi ulang.
3. Implementasikan semua halaman di atas sesuai urutan alur belajar, dengan navbar konsisten.
4. Pastikan semua teks materi mengikuti isi dokumen sumber.
5. Buat file `.env.example` dan instruksi singkat cara isi Supabase URL/anon key serta cara setup tabel di Supabase (bisa berupa file SQL `schema.sql`).
6. Berikan struktur folder akhir + penjelasan singkat tiap file, karena saya (yang akan mengelola konten) berlatar belakang Pendidikan Matematika, bukan Informatika — jadi tolong jelaskan dengan bahasa sederhana.
