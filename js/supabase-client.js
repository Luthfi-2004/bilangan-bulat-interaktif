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
  localStorage.removeItem('math_current_user');
  localStorage.removeItem('math_student'); // Kompatibilitas versi lama
  if (supabase) {
    await supabase.auth.signOut();
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
// KONTEN MATERI (MATERI CMS)
// ----------------------------------------------------

export async function getMateri(slug) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('materi_content')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function getAllMateri() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('materi_content')
    .select('*')
    .order('urutan', { ascending: true });

  if (error) return [];
  return data;
}

export async function updateMateriContent(slug, contentData) {
  if (!supabase) throw new Error("Database offline.");
  const { data, error } = await supabase
    .from('materi_content')
    .update({ ...contentData, updated_at: new Date().toISOString() })
    .eq('slug', slug)
    .select()
    .single();

  if (error) throw error;
  return data;
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

      // Hitung rata-rata penguasaan materi
      let avgProgress = 0;
      if (studentProgress.length > 0) {
        const total = studentProgress.reduce((acc, curr) => acc + (curr.persentase_penguasaan || 0), 0);
        avgProgress = Math.round(total / studentProgress.length);
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
  const studentName = student?.name || 'Siswa';

  if (!supabase) return { success: true, localOnly: true };

  const { data, error } = await supabase
    .from('test_results')
    .insert([{ 
      student_id: studentId, 
      student_name: studentName,
      jenis, 
      skor 
    }]);

  if (error) {
    console.error("Gagal simpan test result:", error);
    return false;
  }
  return true;
}

export async function getTestResults(studentId) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('test_results')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Gagal ambil test results:", error);
    return [];
  }
  return data;
}

export async function saveStudentProgress(studentId, materi, persentase) {
  const student = await getCurrentUser();
  const studentName = student?.name || 'Siswa';

  if (!supabase) return { success: true };
  
  const { data: existing } = await supabase
    .from('student_progress')
    .select('*')
    .eq('student_id', studentId)
    .eq('materi', materi)
    .maybeSingle();
    
  if (existing) {
    if (persentase > existing.persentase_penguasaan) {
      const { error } = await supabase
        .from('student_progress')
        .update({ persentase_penguasaan: persentase, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      return !error;
    }
    return true;
  } else {
    const { error } = await supabase
      .from('student_progress')
      .insert([{ 
        student_id: studentId, 
        student_name: studentName,
        materi, 
        persentase_penguasaan: persentase 
      }]);
    return !error;
  }
}

export async function unlockBadge(studentId, badgeId) {
  const student = await getCurrentUser();
  const studentName = student?.name || 'Siswa';

  if (!supabase) return { success: true };
  
  const { data: existing } = await supabase
    .from('student_badges')
    .select('*')
    .eq('student_id', studentId)
    .eq('badge_id', badgeId)
    .maybeSingle();
    
  if (!existing) {
    const { error } = await supabase
      .from('student_badges')
      .insert([{ 
        student_id: studentId, 
        student_name: studentName,
        badge_id: badgeId 
      }]);
    return !error;
  }
  return true;
}

export async function getStudentBadges(studentId) {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('student_badges')
    .select('badge_id')
    .eq('student_id', studentId);
    
  if (error) return [];
  return data.map(b => b.badge_id);
}
