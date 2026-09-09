// ==========================================================
// SUPABASE CLIENT & API MODULE
// Operasi Campuran Bilangan Bulat
// ==========================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { 
  SOAL_TES_AWAL, 
  SOAL_LATIHAN_DASAR, 
  SOAL_LATIHAN_CAMPURAN, 
  SOAL_CERITA, 
  SOAL_KUIS 
} from './soal-data.js';

// Kredensial Supabase Project
export const SUPABASE_URL = "https://epcpqnrewpddcihctzjj.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwY3BxbnJld3BkZGNpaGN0empqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NTA1OTUsImV4cCI6MjEwNDMyNjU5NX0.USO4T_JWYJfnDpX_i9f89rigbi8g45_SogY2KaTBvks";

// Inisialisasi Klien Utama Supabase
export let supabase = null;
try {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
} catch (err) {
  console.warn("Gagal inisialisasi Supabase:", err);
}

// ----------------------------------------------------
// AUTHENTICATION FUNCTIONS
// ----------------------------------------------------

/**
 * Login user (Siswa atau Guru) menggunakan email dan password
 */
export async function signIn(email, password) {
  if (!supabase) throw new Error("Koneksi database tidak tersedia.");

  let { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  // Jika akun guru bawaan belum pernah terdaftar di Supabase Auth, buatkan otomatis sekarang juga!
  if (error && email.toLowerCase() === 'guru@bilbul.sch.id' && password === 'guru123') {
    try {
      await signUpGuru('guru@bilbul.sch.id', 'guru123', 'Bapak/Ibu Guru Matematika');
      // Coba login ulang seketika
      const retry = await supabase.auth.signInWithPassword({
        email: 'guru@bilbul.sch.id',
        password: 'guru123'
      });
      data = retry.data;
      error = retry.error;
    } catch (createErr) {
      console.warn("Auto-creation guru error:", createErr);
    }
  }

  if (error) throw error;

  // Ambil profil & role dari tabel users_metadata
  const profile = await getUserProfile(data.user.id);
  
  // Simpan ringkasan sesi di localStorage untuk sinkronisasi cepat
  const sessionUser = {
    id: data.user.id,
    email: data.user.email,
    name: profile?.name || data.user.user_metadata?.name || data.user.email.split('@')[0],
    role: profile?.role || data.user.user_metadata?.role || 'siswa'
  };
  localStorage.setItem('math_current_user', JSON.stringify(sessionUser));

  return { session: data.session, user: sessionUser };
}

/**
 * Pendaftaran Akun Guru (Admin)
 */
export async function signUpGuru(email, password, name) {
  if (!supabase) throw new Error("Koneksi database tidak tersedia.");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role: 'guru'
      }
    }
  });

  if (error) throw error;

  // Pastikan record tersimpan di users_metadata
  if (data.user) {
    await supabase.from('users_metadata').upsert({
      id: data.user.id,
      email,
      name,
      role: 'guru'
    });
  }

  return data;
}

/**
 * Logout pengguna saat ini
 */
export async function signOut() {
  // Panggil Supabase signOut lebih dulu agar ia dapat membersihkan tokennya sendiri
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Supabase server signOut error:", e);
    }
  }

  try {
    localStorage.removeItem('math_current_user');
    localStorage.removeItem('math_student');

    // Hapus custom keys yang terkait aplikasi kita (tanpa menyentuh internal Supabase secara paksa jika tidak perlu)
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('math_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    sessionStorage.clear();
  } catch (err) {
    console.warn("Storage cleanup error:", err);
  }
}

/**
 * Mendapatkan profil pengguna saat ini beserta role
 */
export async function getCurrentUser() {
  // Cek cache lokal dulu untuk render cepat
  const cached = localStorage.getItem('math_current_user');
  let localUser = cached ? JSON.parse(cached) : null;

  if (!supabase) return localUser;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) {
    localStorage.removeItem('math_current_user');
    return null;
  }

  // Refresh profile dari database
  const profile = await getUserProfile(session.user.id);
  const userObj = {
    id: session.user.id,
    email: session.user.email,
    name: profile?.name || session.user.user_metadata?.name || session.user.email.split('@')[0],
    role: profile?.role || session.user.user_metadata?.role || 'siswa'
  };

  localStorage.setItem('math_current_user', JSON.stringify(userObj));
  // Sinkronkan ke 'math_student' agar komponen lama tetap jalan
  localStorage.setItem('math_student', JSON.stringify(userObj));
  
  return userObj;
}

/**
 * Mengambil profil spesifik dari users_metadata
 */
export async function getUserProfile(userId) {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('users_metadata')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn("Gagal mengambil users_metadata:", error.message);
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }
}

// ----------------------------------------------------
// BANK SOAL (QUESTIONS CMS - FETCH, INSERT, UPDATE, DELETE)
// ----------------------------------------------------

/**
 * Mengambil soal berdasarkan jenis dari database Supabase
 * Jika tabel belum ada atau offline, gunakan fallback soal lokal dari soal-data.js
 */
export async function getQuestions(jenis) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('jenis', jenis)
        .order('urutan', { ascending: true });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (e) {
      console.warn("Fallback ke data soal lokal:", e);
    }
  }

  // Fallback lokal jika database kosong atau offline
  switch (jenis) {
    case 'tes_awal':
      return SOAL_TES_AWAL;
    case 'latihan_dasar':
      return SOAL_LATIHAN_DASAR;
    case 'latihan_campuran':
      return SOAL_LATIHAN_CAMPURAN;
    case 'soal_cerita':
      return SOAL_CERITA;
    case 'kuis':
      return SOAL_KUIS;
    default:
      return [];
  }
}

/**
 * Mengambil seluruh soal untuk Admin CMS
 */
export async function getAllQuestions() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .order('jenis', { ascending: true })
    .order('urutan', { ascending: true });

  if (error) {
    console.error("Gagal mengambil semua soal:", error);
    return [];
  }
  return data;
}

/**
 * Tambah soal baru (Admin)
 */
export async function addQuestion(questionData) {
  if (!supabase) throw new Error("Database offline.");
  const id = questionData.id || ('Q_' + Date.now().toString(36));
  const payload = { ...questionData, id };

  const { data, error } = await supabase
    .from('questions')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update soal (Admin)
 */
export async function updateQuestion(id, questionData) {
  if (!supabase) throw new Error("Database offline.");
  const { data, error } = await supabase
    .from('questions')
    .update(questionData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Hapus soal (Admin)
 */
export async function deleteQuestion(id) {
  if (!supabase) throw new Error("Database offline.");
  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// ----------------------------------------------------
// KONTEN MATERI (MATERI CMS - FULL CRUD DENGAN SYNC & FALLBACK)
// ----------------------------------------------------

export const DEFAULT_MATERI = [
  {
    id: 'mat_1',
    slug: '1-definisi',
    urutan: 1,
    judul: 'Definisi Bilangan Bulat',
    ringkasan: 'Mengenal bilangan bulat positif, negatif, dan nol beserta garis bilangannya.',
    konten: `<div class="space-y-6">
      <div class="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs">
        <h3 class="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
          <i class="fa-solid fa-lightbulb text-amber-500"></i> Pengertian Bilangan Bulat
        </h3>
        <p class="text-slate-600 leading-relaxed text-base mb-4">
          Bilangan bulat adalah himpunan bilangan utuh (bukan pecahan atau desimal) yang terdiri dari bilangan bulat positif, nol, dan bilangan bulat negatif.
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

      <div class="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs">
        <h3 class="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
          <i class="fa-solid fa-arrows-left-right text-blue-600"></i> Garis Bilangan Interaktif
        </h3>
        <p class="text-slate-600 text-sm mb-4">Klik titik bilangan pada garis berikut untuk melihat posisi dan nilainya secara interaktif:</p>
        <div id="number-line-container" class="my-6"></div>
        <div id="nilai-mutlak-info" class="p-4 rounded-xl bg-blue-50 border border-blue-200 text-center font-medium text-blue-900">
          Klik salah satu angka pada garis bilangan di atas untuk mengecek nilainya.
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs">
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
    </div>`
  },
  {
    id: 'mat_2',
    slug: '2-garis-bilangan',
    urutan: 2,
    judul: 'Garis Bilangan & Perbandingan',
    ringkasan: 'Aturan membandingkan bilangan bulat: semakin ke kanan semakin besar nilainya.',
    konten: `<div class="space-y-6">
      <div class="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs">
        <h3 class="text-xl font-bold text-slate-900 mb-3">Prinsip Perbandingan</h3>
        <div class="p-4 rounded-xl bg-blue-50 border-l-4 border-blue-600 text-blue-900 space-y-2 text-sm font-medium">
          <p>• Semakin ke <strong>kanan</strong> posisi suatu bilangan, nilainya semakin <strong>besar</strong>.</p>
          <p>• Semakin ke <strong>kiri</strong> posisi suatu bilangan, nilainya semakin <strong>kecil</strong>.</p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center font-mono">
            <span class="text-emerald-700 font-bold text-xl">5 > -8</span>
            <div class="text-xs text-slate-500 mt-1">5 lebih besar dari -8 (5 berada jauh di sebelah kanan -8)</div>
          </div>
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center font-mono">
            <span class="text-red-700 font-bold text-xl">-10 < -2</span>
            <div class="text-xs text-slate-500 mt-1">-10 lebih kecil dari -2 (-10 berada lebih ke kiri)</div>
          </div>
        </div>
      </div>
    </div>`
  },
  {
    id: 'mat_3',
    slug: '3-penjumlahan',
    urutan: 3,
    judul: 'Operasi Penjumlahan Bilangan Bulat',
    ringkasan: 'Konsep menjumlahkan dua bilangan bulat bertanda sama maupun berbeda.',
    konten: `<div class="space-y-6">
      <div class="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs">
        <h3 class="text-xl font-bold text-slate-900 mb-3">Aturan Penjumlahan</h3>
        <div class="space-y-3 text-sm text-slate-700">
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <strong>1. Bertanda Sama:</strong> Jumlahkan kedua nilainya, tandanya mengikuti tanda bilangan tersebut.<br>
            <span class="font-mono text-blue-700 font-bold">5 + 3 = 8</span> | <span class="font-mono text-red-700 font-bold">(-5) + (-3) = -8</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <strong>2. Bertanda Beda:</strong> Cari selisih angka besar dikurangi angka kecil, tandanya mengikuti tanda bilangan dengan nilai mutlak terbesar.<br>
            <span class="font-mono text-blue-700 font-bold">9 + (-4) = 5</span> | <span class="font-mono text-red-700 font-bold">(-9) + 4 = -5</span>
          </div>
        </div>
      </div>
    </div>`
  },
  {
    id: 'mat_4',
    slug: '4-sifat-penjumlahan',
    urutan: 4,
    judul: 'Sifat-Sifat Penjumlahan',
    ringkasan: 'Mempelajari sifat komutatif, asosiatif, unsur identitas (0), dan invers tambah.',
    konten: `<div class="space-y-6">
      <div class="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs">
        <h3 class="text-xl font-bold text-slate-900 mb-3">Sifat-Sifat Utama</h3>
        <ul class="space-y-3 text-sm text-slate-700 list-disc list-inside">
          <li><strong>Komutatif (Pertukaran):</strong> a + b = b + a (Contoh: 4 + 7 = 7 + 4 = 11)</li>
          <li><strong>Asosiatif (Pengelompokan):</strong> (a + b) + c = a + (b + c)</li>
          <li><strong>Unsur Identitas:</strong> a + 0 = a (Bilangan berapapun ditambah 0 hasilnya tetap)</li>
          <li><strong>Invers Tambah (Lawan):</strong> a + (-a) = 0</li>
        </ul>
      </div>
    </div>`
  },
  {
    id: 'mat_5',
    slug: '5-pengurangan',
    urutan: 5,
    judul: 'Operasi Pengurangan Bilangan Bulat',
    ringkasan: 'Memahami bahwa mengurangi sama dengan menjumlahkan dengan lawan bilangan.',
    konten: `<div class="space-y-6">
      <div class="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs">
        <h3 class="text-xl font-bold text-slate-900 mb-3">Rumus Kunci Pengurangan</h3>
        <div class="p-4 rounded-xl bg-amber-50 border border-amber-200 font-mono text-center text-lg font-bold text-amber-900 mb-3">
          a - b = a + (-b)<br>
          a - (-b) = a + b
        </div>
        <p class="text-slate-600 text-sm">Contoh: 7 - (-3) = 7 + 3 = 10.</p>
      </div>
    </div>`
  },
  {
    id: 'mat_6',
    slug: '6-perkalian',
    urutan: 6,
    judul: 'Operasi Perkalian Bilangan Bulat',
    ringkasan: 'Aturan perkalian tanda: (+)(+) = (+), (-)(-) = (+), (+)(-) = (-).',
    konten: `<div class="space-y-6">
      <div class="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs">
        <h3 class="text-xl font-bold text-slate-900 mb-3">Aturan Tanda Perkalian</h3>
        <div class="grid grid-cols-2 gap-3 text-center font-mono font-bold text-sm">
          <div class="p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">(+) x (+) = (+)</div>
          <div class="p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">(-) x (-) = (+)</div>
          <div class="p-3 rounded-lg bg-red-50 text-red-800 border border-red-200">(+) x (-) = (-)</div>
          <div class="p-3 rounded-lg bg-red-50 text-red-800 border border-red-200">(-) x (+) = (-)</div>
        </div>
      </div>
    </div>`
  },
  {
    id: 'mat_7',
    slug: '7-pembagian',
    urutan: 7,
    judul: 'Operasi Pembagian Bilangan Bulat',
    ringkasan: 'Kebalikan dari perkalian dengan aturan tanda yang serupa.',
    konten: `<div class="space-y-6">
      <div class="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs">
        <h3 class="text-xl font-bold text-slate-900 mb-3">Aturan Pembagian</h3>
        <p class="text-slate-600 text-sm mb-3">Pembagian dua bilangan bertanda sama menghasilkan bilangan positif. Bertanda beda menghasilkan bilangan negatif.</p>
        <div class="font-mono text-sm space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>12 : 3 = 4</div>
          <div>(-12) : (-3) = 4</div>
          <div>(-12) : 3 = -4</div>
        </div>
      </div>
    </div>`
  },
  {
    id: 'mat_8',
    slug: '8-operasi-campuran',
    urutan: 8,
    judul: 'Operasi Campuran (KABATAKU)',
    ringkasan: 'Tingkat prioritas operasi hitung: Kurung, Kali & Bagi, Tambah & Kurang.',
    konten: `<div class="space-y-6">
      <div class="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs">
        <h3 class="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
          <i class="fa-solid fa-ranking-star text-amber-500"></i> Urutan Hierarki Operasi
        </h3>
        <ol class="space-y-2 text-sm text-slate-700 list-decimal list-inside font-semibold">
          <li>Kerjakan tanda kurung <strong>(...)</strong> terlebih dahulu.</li>
          <li>Kerjakan <strong>Perkalian (x)</strong> dan <strong>Pembagian (:)</strong> dari kiri ke kanan.</li>
          <li>Kerjakan <strong>Penjumlahan (+)</strong> dan <strong>Pengurangan (-)</strong> dari kiri ke kanan.</li>
        </ol>
      </div>
    </div>`
  },
  {
    id: 'mat_9',
    slug: '9-penerapan',
    urutan: 9,
    judul: 'Penerapan di Kehidupan Nyata',
    ringkasan: 'Contoh penerapan bilangan bulat pada suhu udara, kedalaman laut, dan keuangan.',
    konten: `<div class="space-y-6">
      <div class="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs">
        <h3 class="text-xl font-bold text-slate-900 mb-3">Penerapan Nyata</h3>
        <ul class="space-y-2 text-sm text-slate-700 list-disc list-inside">
          <li><strong>Suhu:</strong> 5°C di bawah titik beku ditulis <strong>-5°C</strong>.</li>
          <li><strong>Kedalaman Laut:</strong> 150 meter di bawah permukaan laut ditulis <strong>-150 m</strong>.</li>
          <li><strong>Keuangan:</strong> Keuntungan ditulis positif, kerugian/utang ditulis negatif.</li>
        </ul>
      </div>
    </div>`
  }
];

function getLocalMateriList() {
  const custom = localStorage.getItem('math_custom_materi');
  if (custom) {
    try {
      const parsed = JSON.parse(custom);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (_) {}
  }
  return DEFAULT_MATERI;
}

function saveLocalMateriList(list) {
  try {
    localStorage.setItem('math_custom_materi', JSON.stringify(list));
  } catch (_) {}
}

/**
 * Mengambil seluruh materi pembelajaran
 */
export async function getAllMateri() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('materi_content')
        .select('*')
        .order('urutan', { ascending: true });

      if (!error && data && data.length > 0) {
        saveLocalMateriList(data);
        return data;
      }
    } catch (e) {
      console.warn("Supabase getAllMateri fallback:", e);
    }
  }

  return getLocalMateriList();
}

/**
 * Mengambil materi spesifik berdasarkan slug
 */
export async function getMateri(slug) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('materi_content')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (!error && data) return data;
    } catch (e) {
      console.warn("Supabase getMateri fallback:", e);
    }
  }

  const localList = getLocalMateriList();
  return localList.find(m => m.slug === slug) || null;
}

/**
 * Tambah Materi Baru (Guru / Admin)
 */
export async function addMateri(materiData) {
  const id = materiData.id || ('mat_' + Date.now().toString(36));
  const slug = materiData.slug || (materiData.judul.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
  const payload = {
    ...materiData,
    id,
    slug,
    urutan: parseInt(materiData.urutan) || 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 1. Simpan ke database Supabase jika online
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('materi_content')
        .insert([payload])
        .select()
        .single();

      if (!error && data) {
        // Sync ke local
        const list = getLocalMateriList();
        list.push(data);
        list.sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
        saveLocalMateriList(list);
        return data;
      }
    } catch (err) {
      console.warn("Insert materi to supabase warning:", err);
    }
  }

  // 2. Simpan ke local cache fallback
  const list = getLocalMateriList();
  list.push(payload);
  list.sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
  saveLocalMateriList(list);
  return payload;
}

/**
 * Update Materi (Guru / Admin)
 */
export async function updateMateriContent(idOrSlug, contentData) {
  const updatedPayload = {
    ...contentData,
    urutan: parseInt(contentData.urutan) || contentData.urutan,
    updated_at: new Date().toISOString()
  };

  // 1. Coba update di Supabase
  if (supabase) {
    try {
      // Coba match berdasarkan slug atau id
      let query = supabase.from('materi_content').update(updatedPayload);
      if (contentData.id) {
        query = query.eq('id', contentData.id);
      } else {
        query = query.eq('slug', idOrSlug);
      }
      const { data, error } = await query.select().single();
      if (!error && data) {
        // Sync ke local
        const list = getLocalMateriList().map(m => (m.slug === idOrSlug || m.id === contentData.id) ? { ...m, ...data } : m);
        list.sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
        saveLocalMateriList(list);
        return data;
      }
    } catch (err) {
      console.warn("Update materi supabase warning:", err);
    }
  }

  // 2. Update di local storage
  const list = getLocalMateriList();
  const idx = list.findIndex(m => m.slug === idOrSlug || (contentData.id && m.id === contentData.id));
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...updatedPayload };
  } else {
    list.push({ slug: idOrSlug, ...updatedPayload });
  }
  list.sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
  saveLocalMateriList(list);
  return list[idx] || updatedPayload;
}

/**
 * Hapus Materi (Guru / Admin)
 */
export async function deleteMateri(idOrSlug) {
  // 1. Hapus dari Supabase jika ada
  if (supabase) {
    try {
      await supabase
        .from('materi_content')
        .delete()
        .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`);
    } catch (err) {
      console.warn("Delete materi supabase warning:", err);
    }
  }

  // 2. Hapus dari local storage
  const list = getLocalMateriList().filter(m => m.id !== idOrSlug && m.slug !== idOrSlug);
  saveLocalMateriList(list);
  return true;
}

// ----------------------------------------------------
// KELOLA SISWA (ADMIN PANEL GURU)
// ----------------------------------------------------

/**
 * Guru mendaftarkan akun siswa baru tanpa menyebabkan sesi guru logout.
 * Menggunakan temporary client dengan persistSession = false.
 */
export async function registerStudentByGuru({ name, email, password, guruId }) {
  if (!supabase) throw new Error("Database offline.");

  // 1. Coba lewat RPC function PostgreSQL (Paling handal, 100% bypass email verification & domain restriction)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_student_user', {
      student_email: email,
      student_password: password,
      student_name: name,
      guru_id: guruId
    });

    if (!rpcError && rpcData) {
      return rpcData;
    }
  } catch (rpcErr) {
    console.warn("RPC create_student_user belum aktif di database, mencoba fallback signUp...", rpcErr);
  }

  // 2. Fallback: Buat client sekunder tanpa merusak sesi guru yang aktif
  const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  const { data, error } = await tempClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role: 'siswa',
        dibuat_oleh_guru_id: guruId
      }
    }
  });

  if (error) {
    // Jika Supabase memblokir karena format email / domain / confirm email setting
    if (error.message && error.message.includes('is invalid')) {
      throw new Error(
        `Email "${email}" ditolak oleh Supabase. ` +
        `Solusi: Jalankan ulang script SQL schema.sql terbaru di Supabase SQL Editor ` +
        `atau matikan toggle "Confirm email" di Supabase Dashboard -> Authentication -> Providers -> Email.`
      );
    }
    throw error;
  }

  // 3. Pastikan tabel users_metadata tercatat
  if (data?.user) {
    try {
      await supabase.from('users_metadata').upsert({
        id: data.user.id,
        email,
        name,
        role: 'siswa',
        password_plain: password,
        dibuat_oleh_guru_id: guruId
      });
    } catch (e) {
      console.warn("Insert metadata warning:", e);
    }
  }

  return data.user;
}

/**
 * Guru mengupdate data akun siswa (Nama, Email, dan/atau Password)
 */
export async function updateStudentByGuru({ id, name, email, password }) {
  if (!supabase) throw new Error("Database offline.");

  // 1. Coba update lewat RPC PostgreSQL
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('update_student_user', {
      student_id: id,
      new_name: name,
      new_email: email,
      new_password: password || null
    });

    if (!rpcError && rpcData) {
      return rpcData;
    }
  } catch (rpcErr) {
    console.warn("RPC update_student_user belum tersedia, mencoba update metadata langsung:", rpcErr);
  }

  // 2. Fallback update metadata langsung
  const updatePayload = {
    name,
    email
  };
  if (password && password.trim() !== '') {
    updatePayload.password_plain = password;
  }

  const { data, error } = await supabase
    .from('users_metadata')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mengambil daftar seluruh siswa
 */
export async function getStudentsList() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('users_metadata')
    .select('*')
    .eq('role', 'siswa')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Gagal mengambil data siswa:", error);
    return [];
  }
  return data;
}

/**
 * Hapus akun siswa dari metadata
 */
export async function deleteStudent(userId) {
  if (!supabase) throw new Error("Database offline.");
  const { error } = await supabase
    .from('users_metadata')
    .delete()
    .eq('id', userId);

  if (error) throw error;
  return true;
}

// ----------------------------------------------------
// PROGRES & MONITORING REALTIME
// ----------------------------------------------------

/**
 * Mengambil kompilasi progres seluruh siswa untuk tabel Admin
 */
export async function getAllStudentsProgress() {
  if (!supabase) return [];

  try {
    const [studentsRes, testsRes, badgesRes, progressRes] = await Promise.all([
      supabase.from('users_metadata').select('*').eq('role', 'siswa').order('created_at', { ascending: false }),
      supabase.from('test_results').select('*').order('created_at', { ascending: false }),
      supabase.from('student_badges').select('*'),
      supabase.from('student_progress').select('*')
    ]);

    const students = studentsRes.data || [];
    const tests = testsRes.data || [];
    const badges = badgesRes.data || [];
    const progresses = progressRes.data || [];

    // Gabungkan data per siswa
    return students.map(st => {
      const studentTests = tests.filter(t => t.student_id === st.id);
      const studentBadges = badges.filter(b => b.student_id === st.id);
      const studentProgress = progresses.filter(p => p.student_id === st.id);

      // Cari skor terbaru per kategori
      const tesAwal = studentTests.find(t => t.jenis === 'tes_awal')?.skor ?? '-';
      const latihanDasar = studentTests.find(t => t.jenis === 'latihan_dasar')?.skor ?? '-';
      const latihanCampuran = studentTests.find(t => t.jenis === 'latihan_campuran')?.skor ?? '-';
      const kuis = studentTests.find(t => t.jenis === 'kuis')?.skor ?? '-';

      // Hitung penguasaan materi dari total 9 submateri kurikulum
      let avgProgress = 0;
      if (studentProgress.length > 0) {
        const completedCount = studentProgress.filter(p => (p.persentase_penguasaan || 0) > 0).length;
        avgProgress = Math.min(100, Math.round((completedCount / 9) * 100));
      }

      return {
        id: st.id,
        name: st.name,
        email: st.email,
        created_at: st.created_at,
        tesAwal,
        latihanDasar,
        latihanCampuran,
        kuis,
        totalBadges: studentBadges.length,
        avgProgress
      };
    });
  } catch (err) {
    console.error("Gagal agregasi progress siswa:", err);
    return [];
  }
}

/**
 * Subscribe realtime ke perubahan tabel Supabase
 */
export function subscribeToRealtimeProgress(onUpdateCallback) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('admin-realtime-tracker')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'test_results' }, () => onUpdateCallback('test_results'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'student_progress' }, () => onUpdateCallback('student_progress'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'student_badges' }, () => onUpdateCallback('student_badges'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users_metadata' }, () => onUpdateCallback('users_metadata'))
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ----------------------------------------------------
// PENYIMPANAN NILAI & PROGRES SISWA (CLIENT SIDE)
// ----------------------------------------------------

export async function saveTestResult(studentId, jenis, skor) {
  const student = await getCurrentUser();
  const validStudentId = studentId || student?.id;
  const studentName = student?.name || 'Siswa';

  if (!validStudentId) {
    console.warn("saveTestResult: Tidak ada ID siswa yang valid.");
    return false;
  }

  // Simpan juga ke cache lokal sebagai cadangan instan
  try {
    const localKey = `math_results_${validStudentId}`;
    const cached = JSON.parse(localStorage.getItem(localKey) || '[]');
    cached.unshift({ student_id: validStudentId, student_name: studentName, jenis, skor, created_at: new Date().toISOString() });
    localStorage.setItem(localKey, JSON.stringify(cached.slice(0, 50)));
  } catch (_) {}

  if (!supabase) return { success: true, localOnly: true };

  // 1. Coba insert dengan student_name
  let { error } = await supabase
    .from('test_results')
    .insert([{ 
      student_id: validStudentId, 
      student_name: studentName,
      jenis, 
      skor 
    }]);

  // 2. Jika kolom student_name belum ada di tabel Supabase (Error 42703), retry tanpa student_name
  if (error && (error.code === '42703' || error.message?.includes('student_name'))) {
    const retry = await supabase
      .from('test_results')
      .insert([{ 
        student_id: validStudentId, 
        jenis, 
        skor 
      }]);
    error = retry.error;
  }

  if (error) {
    console.error("Gagal simpan test result ke Supabase:", error);
    return false;
  }
  return true;
}

export async function getTestResults(studentId) {
  const student = await getCurrentUser();
  const validStudentId = studentId || student?.id;
  if (!validStudentId) return [];

  if (supabase) {
    const { data, error } = await supabase
      .from('test_results')
      .select('*')
      .eq('student_id', validStudentId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data;
    }
    console.warn("Gagal ambil test results dari Supabase, mencoba cache lokal:", error);
  }

  // Fallback ke cache lokal jika database offline atau gagal
  try {
    const localKey = `math_results_${validStudentId}`;
    const cached = localStorage.getItem(localKey);
    return cached ? JSON.parse(cached) : [];
  } catch (_) {
    return [];
  }
}

export async function saveStudentProgress(studentId, materi, persentase) {
  const student = await getCurrentUser();
  const validStudentId = studentId || student?.id;
  const studentName = student?.name || 'Siswa';

  if (!validStudentId) return { success: false };

  // Cache lokal
  try {
    const localKey = `math_progress_${validStudentId}`;
    const cached = JSON.parse(localStorage.getItem(localKey) || '{}');
    if (!cached[materi] || persentase > cached[materi]) {
      cached[materi] = persentase;
      localStorage.setItem(localKey, JSON.stringify(cached));
    }
  } catch (_) {}

  if (!supabase) return { success: true };
  
  const { data: existing } = await supabase
    .from('student_progress')
    .select('*')
    .eq('student_id', validStudentId)
    .eq('materi', materi)
    .maybeSingle();
    
  if (existing) {
    if (persentase > existing.persentase_penguasaan) {
      let { error } = await supabase
        .from('student_progress')
        .update({ 
          persentase_penguasaan: persentase, 
          student_name: studentName,
          updated_at: new Date().toISOString() 
        })
        .eq('id', existing.id);

      if (error && (error.code === '42703' || error.message?.includes('student_name'))) {
        const retry = await supabase
          .from('student_progress')
          .update({ 
            persentase_penguasaan: persentase, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', existing.id);
        error = retry.error;
      }

      return !error;
    }
    return true;
  } else {
    let { error } = await supabase
      .from('student_progress')
      .insert([{ 
        student_id: validStudentId, 
        student_name: studentName,
        materi, 
        persentase_penguasaan: persentase 
      }]);

    if (error && (error.code === '42703' || error.message?.includes('student_name'))) {
      const retry = await supabase
        .from('student_progress')
        .insert([{ 
          student_id: validStudentId, 
          materi, 
          persentase_penguasaan: persentase 
        }]);
      error = retry.error;
    }

    return !error;
  }
}

export async function unlockBadge(studentId, badgeId) {
  const student = await getCurrentUser();
  const validStudentId = studentId || student?.id;
  const studentName = student?.name || 'Siswa';

  if (!validStudentId) return { success: false };

  // Cache lokal
  try {
    const localKey = `math_badges_${validStudentId}`;
    const cached = JSON.parse(localStorage.getItem(localKey) || '[]');
    if (!cached.includes(badgeId)) {
      cached.push(badgeId);
      localStorage.setItem(localKey, JSON.stringify(cached));
    }
  } catch (_) {}

  if (!supabase) return { success: true };
  
  const { data: existing } = await supabase
    .from('student_badges')
    .select('*')
    .eq('student_id', validStudentId)
    .eq('badge_id', badgeId)
    .maybeSingle();
    
  if (!existing) {
    let { error } = await supabase
      .from('student_badges')
      .insert([{ 
        student_id: validStudentId, 
        student_name: studentName,
        badge_id: badgeId 
      }]);

    if (error && (error.code === '42703' || error.message?.includes('student_name'))) {
      const retry = await supabase
        .from('student_badges')
        .insert([{ 
          student_id: validStudentId, 
          badge_id: badgeId 
        }]);
      error = retry.error;
    }

    return !error;
  }
  return true;
}

export async function getStudentBadges(studentId) {
  const student = await getCurrentUser();
  const validStudentId = studentId || student?.id;
  if (!validStudentId) return [];
  
  if (supabase) {
    const { data, error } = await supabase
      .from('student_badges')
      .select('badge_id')
      .eq('student_id', validStudentId);
      
    if (!error && data) return data.map(b => b.badge_id);
  }

  // Fallback cache lokal
  try {
    const localKey = `math_badges_${validStudentId}`;
    const cached = localStorage.getItem(localKey);
    return cached ? JSON.parse(cached) : [];
  } catch (_) {
    return [];
  }
}

export async function getStudentProgress(studentId) {
  const student = await getCurrentUser();
  const validStudentId = studentId || student?.id;
  if (!validStudentId) return [];
  
  if (supabase) {
    const { data, error } = await supabase
      .from('student_progress')
      .select('*')
      .eq('student_id', validStudentId);
      
    if (!error && data) return data;
    console.warn("Gagal ambil student progress dari Supabase:", error);
  }

  // Fallback cache lokal
  try {
    const localKey = `math_progress_${validStudentId}`;
    const cached = localStorage.getItem(localKey);
    if (cached) {
      const obj = JSON.parse(cached);
      return Object.keys(obj).map(materi => ({ materi, persentase_penguasaan: obj[materi] }));
    }
  } catch (_) {}

  return [];
}
