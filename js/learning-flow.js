// ==========================================================
// LEARNING FLOW ENGINE - BilBul (Matematika Kelas VII)
// Mengatur alur belajar terarah berurutan:
// Tes Awal -> Materi Pembelajaran -> Latihan (1-4) -> Kuis Akhir -> Hasil
// ==========================================================

export const FLOW_STEPS = [
  {
    id: "step_tes_awal",
    nomor: 1,
    judul: "Tes Awal (Diagnostik)",
    deskripsi: "Ukur pemahaman awal sebelum memulai materi",
    kategori: "tes",
    badge: "Pemula",
    url: "tes-awal.html"
  },
  {
    id: "step_materi",
    nomor: 2,
    judul: "Materi Pembelajaran",
    deskripsi: "Pelajari materi bilangan bulat yang disusun oleh Guru",
    kategori: "materi",
    badge: "Rajin Belajar",
    url: "materi/index.html"
  },
  {
    id: "step_lat_1",
    nomor: 3,
    judul: "Latihan 1: Konsep & Garis Bilangan",
    deskripsi: "Uji pemahaman dasar & perbandingan tanda",
    kategori: "latihan",
    url: "latihan.html?tahap=1"
  },
  {
    id: "step_lat_2",
    nomor: 4,
    judul: "Latihan 2: Penjumlahan & Pengurangan",
    deskripsi: "Latihan hitung penjumlahan dan pengurangan bilangan bulat",
    kategori: "latihan",
    url: "latihan.html?tahap=2"
  },
  {
    id: "step_lat_3",
    nomor: 5,
    judul: "Latihan 3: Perkalian & Pembagian",
    deskripsi: "Latihan aturan perkalian dan pembagian",
    kategori: "latihan",
    url: "latihan.html?tahap=3"
  },
  {
    id: "step_lat_4",
    nomor: 6,
    judul: "Latihan 4: Operasi Hitung Campuran",
    deskripsi: "Latihan tantangan kombinasi hitung campuran KABATAKU",
    kategori: "latihan",
    badge: "Rajin Berlatih",
    url: "latihan.html?tahap=4"
  },
  {
    id: "step_kuis",
    nomor: 7,
    judul: "Kuis Akhir Evaluasi",
    deskripsi: "Ujian evaluasi akhir kelulusan belajar",
    kategori: "kuis",
    badge: "Master Operasi Campuran",
    url: "kuis.html"
  },
  {
    id: "step_hasil",
    nomor: 8,
    judul: "Hasil Belajar & Lencana",
    deskripsi: "Lihat transkrip nilai dan koleksi lencana kelulusan",
    kategori: "selesai",
    badge: "Math Champion",
    url: "hasil.html"
  }
];

/**
 * Mencari step index berdasarkan URL saat ini
 */
export function getCurrentStepInfo() {
  const path = window.location.pathname;
  const search = window.location.search;
  const isSubfolder = path.includes('/materi/');

  let foundIndex = -1;

  if (path.includes('tes-awal.html')) {
    foundIndex = 0;
  } else if (path.includes('/materi/')) {
    foundIndex = 1;
  } else if (path.includes('latihan.html')) {
    if (search.includes('tahap=1')) foundIndex = 2;
    else if (search.includes('tahap=2')) foundIndex = 3;
    else if (search.includes('tahap=3')) foundIndex = 4;
    else if (search.includes('tahap=4') || search.includes('kategori=campuran')) foundIndex = 5;
    else foundIndex = 2; // default ke latihan 1
  } else if (path.includes('kuis.html')) {
    foundIndex = 6;
  } else if (path.includes('hasil.html') || path.includes('pencapaian.html')) {
    foundIndex = 7;
  }

  if (foundIndex === -1) return null;

  const current = FLOW_STEPS[foundIndex];
  const prev = foundIndex > 0 ? FLOW_STEPS[foundIndex - 1] : null;
  const next = foundIndex < FLOW_STEPS.length - 1 ? FLOW_STEPS[foundIndex + 1] : null;

  // Sesuaikan URL jika di dalam subfolder /materi/
  const normalizeUrl = (url) => {
    if (!url) return null;
    if (isSubfolder) {
      return url.startsWith('materi/') ? url.replace('materi/', '') : '../' + url;
    } else {
      return url;
    }
  };

  return {
    index: foundIndex,
    current,
    prev: prev ? { ...prev, resolvedUrl: normalizeUrl(prev.url) } : null,
    next: next ? { ...next, resolvedUrl: normalizeUrl(next.url) } : null,
    total: FLOW_STEPS.length,
    isFirst: foundIndex === 0,
    isLast: foundIndex === FLOW_STEPS.length - 1
  };
}

/**
 * Menyimpan progres langkah siswa ke cache lokal
 */
export function markStepCompleted(stepId) {
  try {
    const student = window.getCurrentStudent ? window.getCurrentStudent() : null;
    const id = student?.id || 'guest';
    const key = `math_flow_completed_${id}`;
    const completed = JSON.parse(localStorage.getItem(key) || '[]');
    if (!completed.includes(stepId)) {
      completed.push(stepId);
      localStorage.setItem(key, JSON.stringify(completed));
    }
    // Update langkah aktif terakhir
    localStorage.setItem(`math_last_step_${id}`, stepId);
  } catch (_) {}
}

/**
 * Mengambil daftar langkah yang sudah selesai
 */
export function getCompletedStepIds() {
  try {
    const student = window.getCurrentStudent ? window.getCurrentStudent() : null;
    const id = student?.id || 'guest';
    const key = `math_flow_completed_${id}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch (_) {
    return [];
  }
}

/**
 * Mengambil rekomendasi langkah selanjutnya untuk Dashboard
 */
export function getResumeStep() {
  const completed = getCompletedStepIds();
  // Cari langkah pertama yang belum selesai
  for (let i = 0; i < FLOW_STEPS.length; i++) {
    if (!completed.includes(FLOW_STEPS[i].id)) {
      return FLOW_STEPS[i];
    }
  }
  // Jika semua selesai, arahkan ke kuis atau hasil
  return FLOW_STEPS[FLOW_STEPS.length - 1];
}

/**
 * Merender Bottom Flow Navigation Bar pada halaman pembelajaran (dinonaktifkan untuk mencegah tombol duplikat)
 */
export function renderBottomFlowBar() {
  // Seluruh navigasi sekarang menggunakan tombol kontekstual bawaan halaman untuk menghindari duplikasi
  const info = getCurrentStepInfo();
  if (info) {
    markStepCompleted(info.current.id);
  }
}
