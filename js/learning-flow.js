// ==========================================================
// LEARNING FLOW ENGINE - BilBul (Matematika Kelas VII)
// Mengatur alur belajar terarah berurutan:
// Tes Awal -> Materi -> Latihan -> Game -> Kuis -> Hasil
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
    id: "step_mat_1",
    nomor: 2,
    judul: "Materi 1: Definisi Bilangan",
    deskripsi: "Mengenal bilangan bulat positif, nol, dan negatif",
    kategori: "materi",
    url: "materi/1-definisi.html"
  },
  {
    id: "step_mat_2",
    nomor: 3,
    judul: "Materi 2: Garis Bilangan & Nilai Mutlak",
    deskripsi: "Perbandingan besar-kecil bilangan pada garis bilangan",
    kategori: "materi",
    url: "materi/2-garis-bilangan.html"
  },
  {
    id: "step_lat_1",
    nomor: 4,
    judul: "Latihan 1: Konsep & Garis Bilangan",
    deskripsi: "Uji pemahaman dasar & perbandingan tanda",
    kategori: "latihan",
    url: "latihan.html?tahap=1"
  },
  {
    id: "step_mat_3",
    nomor: 5,
    judul: "Materi 3-5: Penjumlahan & Pengurangan",
    deskripsi: "Aturan penjumlahan, sifat operasi, dan pengurangan",
    kategori: "materi",
    url: "materi/3-penjumlahan.html"
  },
  {
    id: "step_lat_2",
    nomor: 6,
    judul: "Latihan 2: Tambah & Kurang",
    deskripsi: "Latihan hitung penjumlahan dan pengurangan bilangan bulat",
    kategori: "latihan",
    url: "latihan.html?tahap=2"
  },
  {
    id: "step_mat_6",
    nomor: 7,
    judul: "Materi 6-7: Perkalian & Pembagian",
    deskripsi: "Aturan tanda (+/-) perkalian dan pembagian",
    kategori: "materi",
    url: "materi/6-perkalian.html"
  },
  {
    id: "step_lat_3",
    nomor: 8,
    judul: "Latihan 3: Kali & Bagi",
    deskripsi: "Latihan operasi perkalian dan pembagian",
    kategori: "latihan",
    url: "latihan.html?tahap=3"
  },
  {
    id: "step_mat_8",
    nomor: 9,
    judul: "Materi 8: Operasi Campuran (KABATAKU)",
    deskripsi: "Hierarki prioritas: Kurung, Kali/Bagi, Tambah/Kurang",
    kategori: "materi",
    badge: "Master Operasi Campuran",
    url: "materi/8-operasi-campuran.html"
  },
  {
    id: "step_lat_4",
    nomor: 10,
    judul: "Latihan 4: Operasi Hitung Campuran",
    deskripsi: "Latihan tantangan kombinasi hitung campuran",
    kategori: "latihan",
    badge: "Rajin Berlatih",
    url: "latihan.html?tahap=4"
  },
  {
    id: "step_mat_9",
    nomor: 11,
    judul: "Materi 9 & Soal Cerita",
    deskripsi: "Penerapan nyata pada suhu, kedalaman, dan keuangan",
    kategori: "materi",
    badge: "Rajin Belajar",
    url: "materi/9-penerapan.html"
  },
  {
    id: "step_game",
    nomor: 12,
    judul: "Game Edukasi BilBul",
    deskripsi: "Tantang ketangkasan dan kecepatan berpikirmu",
    kategori: "game",
    badge: "Pemburu Skor",
    url: "game.html"
  },
  {
    id: "step_kuis",
    nomor: 13,
    judul: "Kuis Akhir Evaluasi",
    deskripsi: "Ujian evaluasi akhir kelulusan belajar",
    kategori: "kuis",
    badge: "Math Champion",
    url: "kuis.html"
  },
  {
    id: "step_hasil",
    nomor: 14,
    judul: "Hasil Belajar & Lencana",
    deskripsi: "Lihat transkrip nilai dan koleksi lencana kelulusan",
    kategori: "selesai",
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

  // Cek pencocokan spesifik
  let foundIndex = -1;

  if (path.includes('tes-awal.html')) {
    foundIndex = 0;
  } else if (path.includes('1-definisi.html')) {
    foundIndex = 1;
  } else if (path.includes('2-garis-bilangan.html')) {
    foundIndex = 2;
  } else if (path.includes('latihan.html')) {
    if (search.includes('tahap=1')) foundIndex = 3;
    else if (search.includes('tahap=2')) foundIndex = 5;
    else if (search.includes('tahap=3')) foundIndex = 7;
    else if (search.includes('tahap=4') || search.includes('kategori=campuran')) foundIndex = 9;
    else foundIndex = 3; // default
  } else if (path.includes('3-penjumlahan.html') || path.includes('4-sifat-penjumlahan.html') || path.includes('5-pengurangan.html')) {
    foundIndex = 4;
  } else if (path.includes('6-perkalian.html') || path.includes('7-pembagian.html')) {
    foundIndex = 6;
  } else if (path.includes('8-operasi-campuran.html')) {
    foundIndex = 8;
  } else if (path.includes('9-penerapan.html') || path.includes('soal-cerita.html')) {
    foundIndex = 10;
  } else if (path.includes('game.html')) {
    foundIndex = 11;
  } else if (path.includes('kuis.html')) {
    foundIndex = 12;
  } else if (path.includes('hasil.html') || path.includes('pencapaian.html')) {
    foundIndex = 13;
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
 * Merender Bottom Flow Navigation Bar pada halaman pembelajaran
 */
export function renderBottomFlowBar() {
  // Jangan tampilkan di halaman login, admin, landing page, atau dashboard utama
  const path = window.location.pathname;
  if (path.endsWith('/dashboard.html') || path.endsWith('/login.html') || path.includes('/admin/') || path.endsWith('/index.html') || path === '/') {
    return;
  }

  const info = getCurrentStepInfo();
  if (!info) return;

  // Hapus bar lama jika sudah ada
  const existing = document.getElementById('bottom-flow-bar');
  if (existing) existing.remove();

  const isSubfolder = path.includes('/materi/');

  // Format link tombol
  const prevBtn = info.prev ? `
    <a href="${info.prev.resolvedUrl}" class="inline-flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-xs sm:text-sm font-semibold transition-all shadow-xs">
      <i class="fa-solid fa-arrow-left"></i>
      <span class="hidden sm:inline">Sebelumnya:</span>
      <span class="truncate max-w-[120px] sm:max-w-[180px]">${info.prev.judul.split(':')[0]}</span>
    </a>
  ` : `<div></div>`;

  const nextBtn = info.next ? `
    <a href="${info.next.resolvedUrl}" class="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all focus:ring-4 focus:ring-blue-300 group">
      <span>Lanjut:</span>
      <span class="truncate max-w-[140px] sm:max-w-[200px]">${info.next.judul.split(':')[0]}</span>
      <i class="fa-solid fa-arrow-right group-hover:translate-x-0.5 transition-transform"></i>
    </a>
  ` : `
    <a href="${isSubfolder ? '../dashboard.html' : 'dashboard.html'}" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md transition-all">
      <i class="fa-solid fa-house"></i> Kembali ke Beranda
    </a>
  `;

  const percent = Math.round(((info.index + 1) / info.total) * 100);

  const bar = document.createElement('div');
  bar.id = 'bottom-flow-bar';
  bar.className = 'sticky bottom-0 z-30 w-full bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-4 py-3 sm:px-6';
  bar.innerHTML = `
    <div class="max-w-5xl mx-auto flex items-center justify-between gap-3">
      ${prevBtn}

      <!-- Center Progress Pill -->
      <div class="hidden md:flex flex-col items-center">
        <div class="flex items-center gap-2 text-xs font-bold text-slate-700">
          <span class="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
          <span>Langkah ${info.index + 1} dari ${info.total}: <strong class="text-blue-700">${info.current.judul}</strong></span>
        </div>
        <div class="w-48 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
          <div class="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style="width: ${percent}%"></div>
        </div>
      </div>

      ${nextBtn}
    </div>
  `;

  // Tempelkan di akhir #app-content atau #app-main
  const appMain = document.getElementById('app-main');
  const footer = document.getElementById('app-footer');
  if (appMain) {
    if (footer) {
      appMain.insertBefore(bar, footer);
    } else {
      appMain.appendChild(bar);
    }
  } else {
    document.body.appendChild(bar);
  }

  // Tandai langkah ini aktif/selesai
  markStepCompleted(info.current.id);
}
