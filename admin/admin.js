// ==========================================================
// ADMIN PANEL SCRIPT (GURU)
// Operasi Campuran Bilangan Bulat
// ==========================================================

import { 
  getCurrentUser, 
  signOut, 
  registerStudentByGuru, 
  updateStudentByGuru,
  getStudentsList, 
  deleteStudent,
  getAllStudentsProgress,
  subscribeToRealtimeProgress,
  getAllQuestions,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  getAllMateri,
  addMateri,
  updateMateriContent,
  deleteMateri
} from '../js/supabase-client.js';

let currentUser = null;
let allQuestionsCache = [];
let allStudentsProgressCache = [];
let allMateriCache = [];
let studentsDataTable = null;
let progressDataTable = null;

// Konfigurasi Bahasa DataTables Bahasa Indonesia yang Elegan
const dtIndonesian = {
  search: "",
  searchPlaceholder: "Cari data...",
  lengthMenu: "Tampilkan _MENU_ data",
  info: "Menampilkan _START_ s/d _END_ dari _TOTAL_ data",
  infoEmpty: "Menampilkan 0 data",
  infoFiltered: "(disaring dari total _MAX_)",
  zeroRecords: "Tidak ada data yang cocok",
  paginate: {
    first: "«",
    previous: "‹",
    next: "›",
    last: "»"
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Override window.alert agar dialog default browser tidak pernah muncul
if (typeof window !== 'undefined') {
  const origAlert = window.alert;
  window.alert = function (message) {
    if (typeof Swal !== 'undefined') {
      return Swal.fire({
        title: 'Pemberitahuan',
        text: String(message),
        icon: 'info',
        confirmButtonColor: '#2563eb',
        customClass: {
          popup: 'rounded-2xl shadow-xl font-sans',
          confirmButton: 'px-5 py-2.5 rounded-xl font-bold text-sm'
        }
      });
    }
    return origAlert(message);
  };
}

// ==========================================================
// INISIALISASI & AUTH GUARD
// ==========================================================

// Cegah akses kembali via tombol Back browser (BFCache)
window.addEventListener('pageshow', async (event) => {
  if (event.persisted || (window.performance && window.performance.getEntriesByType && window.performance.getEntriesByType("navigation")[0]?.type === "back_forward")) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'guru') {
      window.location.replace('../login.html?logout=true');
    }
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Cek sesi login
  currentUser = await getCurrentUser();
  if (!currentUser) {
    window.location.replace('../login.html?logout=true');
    return;
  }

  // Jika bukan guru, tolak akses dan arahkan ke dashboard belajar siswa
  if (currentUser.role !== 'guru') {
    window.location.replace('../dashboard.html');
    return;
  }

  // Set informasi guru di sidebar
  const adminNameEl = document.getElementById('admin-user-name');
  const adminEmailEl = document.getElementById('admin-user-email');
  if (adminNameEl) adminNameEl.textContent = currentUser.name || 'Bapak/Ibu Guru';
  if (adminEmailEl) adminEmailEl.textContent = currentUser.email;

  // Set tanggal hari ini
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('current-date-display').textContent = new Date().toLocaleDateString('id-ID', dateOptions);

  // 2. Setup Navigasi Tab
  setupNavigation();

  // 3. Load Data Awal
  await loadAllDashboardData();

  // 4. Inisialisasi Supabase Realtime Subscription
  initRealtimeSubscription();

  // 5. Setup Event Listeners
  setupEventListeners();
});

// ==========================================================
// REALTIME SUBSCRIPTION
// ==========================================================
function initRealtimeSubscription() {
  subscribeToRealtimeProgress(async (table) => {
    console.log(`[REALTIME UPDATE] Perubahan terdeteksi pada tabel: ${table}`);
    
    // Tampilkan notifikasi toast kecil
    showToastNotification(`Data ${table.replace('_', ' ')} baru saja diperbarui oleh siswa!`);

    // Segarkan data progress dan dashboard
    await loadProgressData();
    await loadDashboardMetrics();
  });
}

function showToastNotification(message) {
  let toast = document.getElementById('admin-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'admin-toast';
    toast.className = 'fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center gap-3 transition-all duration-300 transform translate-y-10 opacity-0';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<span class="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span> ${message}`;
  toast.classList.remove('translate-y-10', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');

  setTimeout(() => {
    toast.classList.add('translate-y-10', 'opacity-0');
    toast.classList.remove('translate-y-0', 'opacity-100');
  }, 4000);
}

// ==========================================================
// NAVIGASI TAB
// ==========================================================
function setupNavigation() {
  const tabs = [
    { navId: 'nav-dashboard', sectionId: 'section-dashboard', title: 'Dashboard Guru', subtitle: 'Ringkasan aktivitas kelas dan pemantauan pembelajaran' },
    { navId: 'nav-students', sectionId: 'section-students', title: 'Kelola Siswa', subtitle: 'Daftar dan buatkan kredensial akun siswa' },
    { navId: 'nav-progress', sectionId: 'section-progress', title: 'Progress Siswa (Live Realtime)', subtitle: 'Pantauan nilai tes awal, latihan, dan kuis secara langsung' },
    { navId: 'nav-questions', sectionId: 'section-questions', title: 'Bank Soal Dinamis (CMS)', subtitle: 'Tambah, edit, dan hapus soal di cloud database' },
    { navId: 'nav-materi', sectionId: 'section-materi', title: 'Kelola Materi (CMS)', subtitle: 'Sesuaikan ringkasan penjelasan submateri' }
  ];

  tabs.forEach(tab => {
    const btn = document.getElementById(tab.navId);
    if (!btn) return;

    btn.addEventListener('click', () => {
      // Update styling nav buttons
      document.querySelectorAll('.admin-nav-item').forEach(el => {
        el.className = 'admin-nav-item w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-slate-400 hover:text-white hover:bg-slate-800';
      });
      btn.className = 'admin-nav-item w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all bg-blue-600 text-white shadow-sm';

      // Hide all sections
      tabs.forEach(t => {
        const sec = document.getElementById(t.sectionId);
        if (sec) sec.classList.add('hidden');
      });

      // Show selected section
      const targetSec = document.getElementById(tab.sectionId);
      if (targetSec) targetSec.classList.remove('hidden');

      // Update Topbar
      document.getElementById('page-title').textContent = tab.title;
      document.getElementById('page-subtitle').textContent = tab.subtitle;

      // Lazy load tab specific data
      if (tab.navId === 'nav-students') {
        loadStudentsList();
        setTimeout(() => {
          if (studentsDataTable) studentsDataTable.columns.adjust();
        }, 100);
      }
      if (tab.navId === 'nav-progress') {
        loadProgressData();
        setTimeout(() => {
          if (progressDataTable) progressDataTable.columns.adjust();
        }, 100);
      }
      if (tab.navId === 'nav-questions') loadQuestionsCMS();
      if (tab.navId === 'nav-materi') loadMateriCMS();
    });
  });

  // Quick action buttons di Dashboard
  document.getElementById('btn-quick-add-student')?.addEventListener('click', () => {
    document.getElementById('nav-students').click();
    document.getElementById('btn-open-add-student-modal').click();
  });

  document.getElementById('btn-quick-add-question')?.addEventListener('click', () => {
    document.getElementById('nav-questions').click();
    document.getElementById('btn-open-add-question-modal').click();
  });

  document.getElementById('btn-quick-view-progress')?.addEventListener('click', () => {
    document.getElementById('nav-progress').click();
  });
}

// ==========================================================
// LOAD ALL DATA
// ==========================================================
async function loadAllDashboardData() {
  await Promise.all([
    loadDashboardMetrics(),
    loadStudentsList(),
    loadProgressData(),
    loadQuestionsCMS(),
    loadMateriCMS()
  ]);
}

// ==========================================================
// 1. DASHBOARD METRICS & FEED
// ==========================================================
async function loadDashboardMetrics() {
  try {
    const students = await getStudentsList();
    const progressList = await getAllStudentsProgress();
    const questions = await getAllQuestions();

    document.getElementById('stat-total-students').textContent = students.length;
    document.getElementById('stat-total-questions').textContent = questions.length;

    // Rata-rata progress
    if (progressList.length > 0) {
      const avgProg = Math.round(progressList.reduce((sum, s) => sum + (s.avgProgress || 0), 0) / progressList.length);
      document.getElementById('stat-avg-progress').textContent = `${avgProg}%`;

      // Rata-rata nilai kuis
      const validQuiz = progressList.filter(s => typeof s.kuis === 'number');
      const avgQuiz = validQuiz.length > 0 
        ? Math.round(validQuiz.reduce((sum, s) => sum + s.kuis, 0) / validQuiz.length)
        : 0;
      document.getElementById('stat-avg-quiz').textContent = avgQuiz;
    }

    // Render Recent Activity Feed
    renderRecentActivity(progressList);

  } catch (err) {
    console.error("Gagal memuat metrik dashboard:", err);
  }
}

function renderRecentActivity(progressList) {
  const container = document.getElementById('recent-activity-list');
  if (!container) return;

  if (progressList.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-400 text-sm">
        <i class="fa-solid fa-clock mb-2 text-xl block text-slate-300"></i>
        Belum ada aktivitas siswa yang tercatat.
      </div>
    `;
    return;
  }

  let html = '';
  // Tampilkan 6 siswa teratas yang aktif
  progressList.slice(0, 6).forEach(st => {
    const dateFormatted = new Date(st.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    html += `
      <div class="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
            ${st.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div class="font-bold text-slate-800 text-sm">${st.name}</div>
            <div class="text-[11px] text-slate-400">Terdaftar: ${dateFormatted} • Penguasaan: ${st.avgProgress}%</div>
          </div>
        </div>
        <div class="text-right">
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${st.kuis !== '-' && st.kuis >= 75 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}">
            Kuis: ${st.kuis}
          </span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ==========================================================
// 2. KELOLA SISWA (GURU MEMBUATKAN AKUN)
// ==========================================================
async function loadStudentsList() {
  const tbody = document.getElementById('students-table-body');
  if (!tbody) return;

  // Hancurkan instance DataTable sebelumnya jika ada sebelum memanipulasi DOM
  if (studentsDataTable) {
    try {
      studentsDataTable.destroy();
    } catch (e) {
      console.warn("Destroy DataTable students error:", e);
    }
    studentsDataTable = null;
  }

  try {
    const students = await getStudentsList();
    if (students.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-12 text-center text-slate-400 text-sm">
            <i class="fa-solid fa-users text-3xl text-slate-300 mb-2 block"></i>
            Belum ada siswa yang didaftarkan. Klik tombol <strong>Tambah Siswa Baru</strong> di atas untuk membuatkan akun.
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    students.forEach((s, idx) => {
      const dateStr = new Date(s.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      const pass = s.password_plain || 'siswa123';

      html += `
        <tr class="hover:bg-slate-50/80 transition-colors">
          <td class="px-4 py-3.5 font-semibold text-slate-400 text-center">${idx + 1}</td>
          <td class="px-4 py-3.5">
            <div class="font-bold text-slate-900">${escapeHtml(s.name)}</div>
          </td>
          <td class="px-4 py-3.5">
            <span class="font-mono text-xs bg-slate-100 px-2.5 py-1 rounded-md text-slate-700">${escapeHtml(s.email)}</span>
          </td>
          <td class="px-4 py-3.5">
            <div class="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
              <span class="font-mono text-xs text-slate-800 font-semibold student-pass-text" data-pass="${escapeHtml(pass)}" data-masked="false">${escapeHtml(pass)}</span>
              <button type="button" class="btn-toggle-pass text-slate-400 hover:text-blue-600 p-0.5 transition-colors" title="Lihat / Sembunyikan Sandi">
                <i class="fa-solid fa-eye-slash text-xs"></i>
              </button>
              <button type="button" class="btn-copy-pass text-slate-400 hover:text-emerald-600 p-0.5 transition-colors" data-pass="${escapeHtml(pass)}" title="Salin Sandi">
                <i class="fa-solid fa-copy text-xs"></i>
              </button>
            </div>
          </td>
          <td class="px-4 py-3.5 text-xs text-slate-500">${dateStr}</td>
          <td class="px-4 py-3.5 text-center">
            <div class="flex items-center justify-center gap-1">
              <button class="btn-edit-student text-slate-500 hover:text-amber-600 hover:bg-amber-50 p-2 rounded-lg transition-colors" 
                data-id="${s.id}" 
                data-name="${escapeHtml(s.name)}" 
                data-email="${escapeHtml(s.email)}" 
                data-password="${escapeHtml(pass)}" 
                title="Edit Akun Siswa">
                <i class="fa-solid fa-user-pen"></i>
              </button>
              <button class="btn-delete-student text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors" 
                data-id="${s.id}" 
                data-name="${escapeHtml(s.name)}" 
                title="Hapus Siswa">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    // Inisialisasi DataTable untuk fitur sorting & pagination tanpa lag
    if (window.jQuery && typeof window.jQuery.fn.DataTable === 'function') {
      studentsDataTable = window.jQuery('#table-students').DataTable({
        pageLength: 10,
        order: [[0, 'asc']],
        columnDefs: [
          { orderable: false, targets: [3, 5] } // Password & Aksi dinonaktifkan dari sorting
        ],
        language: dtIndonesian,
        retrieve: true
      });
    }

  } catch (err) {
    console.error("Gagal load students:", err);
  }
}

// ==========================================================
// 3. PROGRESS SISWA REALTIME
// ==========================================================
async function loadProgressData() {
  const tbody = document.getElementById('progress-table-body');
  if (!tbody) return;

  try {
    const data = await getAllStudentsProgress();
    allStudentsProgressCache = data;
    renderProgressTable(data);
  } catch (err) {
    console.error("Gagal load progress data:", err);
  }
}

function renderProgressTable(list) {
  const tbody = document.getElementById('progress-table-body');
  if (!tbody) return;

  // Hancurkan DataTable sebelumnya jika ada
  if (progressDataTable) {
    try {
      progressDataTable.destroy();
    } catch (e) {
      console.warn("Destroy DataTable progress error:", e);
    }
    progressDataTable = null;
  }

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="px-6 py-12 text-center text-slate-400 text-sm">
          Belum ada data pengerjaan dari siswa.
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  list.forEach(st => {
    // Format warna badge nilai
    const formatScore = (val) => {
      if (val === '-') return `<span class="text-slate-300 font-mono">-</span>`;
      const num = Number(val);
      const colorClass = num >= 80 ? 'text-emerald-700 bg-emerald-50' : (num >= 60 ? 'text-blue-700 bg-blue-50' : 'text-amber-700 bg-amber-50');
      return `<span class="px-2.5 py-1 rounded-md text-xs font-bold ${colorClass}">${num}</span>`;
    };

    html += `
      <tr class="hover:bg-slate-50/80 transition-colors">
        <td class="px-4 py-3.5">
          <div class="font-bold text-slate-900">${escapeHtml(st.name)}</div>
        </td>
        <td class="px-4 py-3.5">
          <span class="font-mono text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100">${escapeHtml(st.email)}</span>
        </td>
        <td class="px-4 py-3.5 text-center">${formatScore(st.tesAwal)}</td>
        <td class="px-4 py-3.5 text-center">${formatScore(st.latihanDasar)}</td>
        <td class="px-4 py-3.5 text-center">${formatScore(st.latihanCampuran)}</td>
        <td class="px-4 py-3.5 text-center">${formatScore(st.kuis)}</td>
        <td class="px-4 py-3.5 text-center" data-order="${st.avgProgress || 0}">
          <div class="flex items-center justify-center gap-2">
            <div class="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div class="bg-blue-600 h-2 rounded-full" style="width: ${st.avgProgress}%"></div>
            </div>
            <span class="text-xs font-bold text-slate-700">${st.avgProgress}%</span>
          </div>
        </td>
        <td class="px-4 py-3.5 text-center" data-order="${st.totalBadges || 0}">
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-xs border border-amber-200">
            <i class="fa-solid fa-medal text-amber-500"></i> ${st.totalBadges} / 7
          </span>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  // Inisialisasi DataTable pada tabel progress
  if (window.jQuery && typeof window.jQuery.fn.DataTable === 'function') {
    progressDataTable = window.jQuery('#table-progress').DataTable({
      pageLength: 10,
      order: [[6, 'desc']], // Urutkan default berdasarkan Penguasaan (%) terbesar
      language: dtIndonesian,
      retrieve: true
    });
  }
}

// ==========================================================
// 4. CMS BANK SOAL
// ==========================================================
async function loadQuestionsCMS() {
  const container = document.getElementById('questions-list-container');
  if (!container) return;

  try {
    const questions = await getAllQuestions();
    allQuestionsCache = questions;
    renderQuestionsList(questions);
  } catch (err) {
    console.error("Gagal load questions CMS:", err);
  }
}

function renderQuestionsList(questions) {
  const container = document.getElementById('questions-list-container');
  if (!container) return;

  const filter = document.getElementById('filter-question-type')?.value || 'all';
  const filtered = filter === 'all' ? questions : questions.filter(q => q.jenis === filter);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-400">
        <i class="fa-solid fa-folder-open text-3xl text-slate-300 mb-2 block"></i>
        Tidak ada soal dalam kategori ini.
      </div>
    `;
    return;
  }

  let html = '';
  filtered.forEach((q, index) => {
    // Label kategori
    const categoryLabels = {
      'tes_awal': 'Tes Awal',
      'latihan_dasar': 'Latihan Dasar',
      'latihan_campuran': 'Latihan Campuran',
      'soal_cerita': 'Soal Cerita',
      'kuis': 'Kuis Akhir'
    };

    const choicesHtml = (q.pilihan && Array.isArray(q.pilihan) && q.pilihan.length > 0)
      ? `<div class="grid grid-cols-2 gap-1.5 mt-3 pt-3 border-t border-slate-100 text-xs">
          ${q.pilihan.map((p, i) => `
            <div class="px-2.5 py-1.5 rounded-lg border ${p === q.jawaban_benar ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold' : 'border-slate-200 bg-slate-50 text-slate-600'}">
              <span class="opacity-50">${String.fromCharCode(65 + i)}.</span> ${p}
            </div>
          `).join('')}
         </div>`
      : '';

    html += `
      <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-blue-50 text-blue-700">
              ${categoryLabels[q.jenis] || q.jenis}
            </span>
            <div class="flex items-center gap-1">
              <button class="btn-edit-q p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" data-id="${q.id}" title="Edit Soal">
                <i class="fa-solid fa-pen text-xs"></i>
              </button>
              <button class="btn-delete-q p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" data-id="${q.id}" title="Hapus Soal">
                <i class="fa-solid fa-trash-can text-xs"></i>
              </button>
            </div>
          </div>

          ${q.judul ? `<div class="font-bold text-xs text-slate-400 uppercase tracking-wider mb-1">${q.judul}</div>` : ''}
          <h4 class="font-bold text-slate-800 text-base leading-snug">${q.pertanyaan}</h4>

          ${choicesHtml}
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span class="text-slate-500">Jawaban Benar: <strong class="text-emerald-600">${q.jawaban_benar}</strong></span>
          <span class="text-slate-400">Urutan #${q.urutan || (index + 1)}</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // Pasang listener edit & delete soal
  document.querySelectorAll('.btn-edit-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const qId = btn.getAttribute('data-id');
      const q = allQuestionsCache.find(item => item.id === qId);
      if (q) openQuestionModal(q);
    });
  });

  document.querySelectorAll('.btn-delete-q').forEach(btn => {
    btn.addEventListener('click', async () => {
      const qId = btn.getAttribute('data-id');
      let confirmed = false;

      if (typeof Swal !== 'undefined') {
        const res = await Swal.fire({
          title: 'Hapus Soal?',
          text: 'Soal ini akan dihapus secara permanen dari database.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#ef4444',
          cancelButtonColor: '#64748b',
          confirmButtonText: 'Ya, Hapus!',
          cancelButtonText: 'Batal'
        });
        confirmed = res.isConfirmed;
      } else {
        confirmed = confirm("Hapus soal ini dari database?");
      }

      if (confirmed) {
        try {
          await deleteQuestion(qId);
          if (typeof Swal !== 'undefined') {
            Swal.fire({
              icon: 'success',
              title: 'Berhasil!',
              text: 'Soal berhasil dihapus dari bank soal.',
              timer: 1500,
              showConfirmButton: false
            });
          } else {
            alert("Soal berhasil dihapus!");
          }
          await loadQuestionsCMS();
          await loadDashboardMetrics();
        } catch (e) {
          if (typeof Swal !== 'undefined') {
            Swal.fire({
              icon: 'error',
              title: 'Gagal Menghapus',
              text: e.message || 'Terjadi kendala saat menghapus soal.',
              confirmButtonColor: '#2563eb'
            });
          } else {
            alert("Gagal menghapus soal: " + e.message);
          }
        }
      }
    });
  });
}

// ==========================================================
// 5. CMS KONTEN MATERI
// ==========================================================
async function loadMateriCMS() {
  const container = document.getElementById('materi-cms-container');
  if (!container) return;

  try {
    const list = await getAllMateri();
    allMateriCache = list || [];

    if (allMateriCache.length === 0) {
      container.innerHTML = `
        <div class="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-400">
          <i class="fa-solid fa-folder-open text-3xl mb-2 text-slate-300"></i>
          <p class="text-sm font-semibold text-slate-600">Belum ada data materi di sistem.</p>
          <p class="text-xs text-slate-400 mt-1">Klik tombol "Tambah Materi Baru" di atas untuk menambahkan submateri pertama.</p>
        </div>
      `;
      return;
    }

    let html = '';
    allMateriCache.forEach(m => {
      const isStatic = ['1-definisi', '2-garis-bilangan', '3-penjumlahan', '4-sifat-penjumlahan', '5-pengurangan', '6-perkalian', '7-pembagian', '8-operasi-campuran', '9-penerapan'].includes(m.slug);
      const previewUrl = isStatic ? `../materi/${m.slug}.html` : `../materi/baca.html?slug=${encodeURIComponent(m.slug)}`;

      html += `
        <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-blue-200 transition-all">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-black text-sm flex-shrink-0">
                #${m.urutan || 1}
              </div>
              <div>
                <h3 class="text-base font-bold text-slate-900 leading-snug">${escapeHtml(m.judul)}</h3>
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">slug: ${escapeHtml(m.slug)}</span>
                  ${m.konten ? `<span class="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-100"><i class="fa-solid fa-check mr-1"></i>Uraian Tersedia</span>` : ''}
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2 self-start sm:self-auto">
              <a href="${previewUrl}" target="_blank" class="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5" title="Buka Pratinjau Materi">
                <i class="fa-solid fa-arrow-up-right-from-square text-[11px]"></i>
                <span class="hidden sm:inline">Pratinjau</span>
              </a>
              <button class="btn-edit-materi px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs rounded-xl border border-blue-200 transition-colors flex items-center gap-1.5" data-slug="${escapeHtml(m.slug)}">
                <i class="fa-solid fa-pen-to-square text-[11px]"></i>
                <span>Edit</span>
              </button>
              <button class="btn-delete-materi px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl border border-red-200 transition-colors flex items-center gap-1.5" data-slug="${escapeHtml(m.slug)}" data-judul="${escapeHtml(m.judul)}">
                <i class="fa-solid fa-trash-can text-[11px]"></i>
                <span>Hapus</span>
              </button>
            </div>
          </div>

          <div class="mt-4 space-y-2">
            <div>
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ringkasan Materi:</span>
              <p class="text-xs text-slate-600 mt-0.5 leading-relaxed">${escapeHtml(m.ringkasan || 'Tidak ada ringkasan.')}</p>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // Pasang listener Edit Materi
    container.querySelectorAll('.btn-edit-materi').forEach(btn => {
      btn.addEventListener('click', () => {
        const slug = btn.getAttribute('data-slug');
        const materi = allMateriCache.find(m => m.slug === slug);
        if (materi) {
          openMateriModal(materi);
        }
      });
    });

    // Pasang listener Hapus Materi
    container.querySelectorAll('.btn-delete-materi').forEach(btn => {
      btn.addEventListener('click', async () => {
        const slug = btn.getAttribute('data-slug');
        const judul = btn.getAttribute('data-judul');

        let confirmed = false;
        if (typeof Swal !== 'undefined') {
          const res = await Swal.fire({
            title: 'Hapus Submateri?',
            text: `Apakah Anda yakin ingin menghapus materi "${judul}"? Tindakan ini akan menghapus materi dari platform belajar siswa.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Hapus Materi',
            cancelButtonText: 'Batal',
            customClass: {
              popup: 'rounded-2xl shadow-xl font-sans',
              confirmButton: 'px-5 py-2.5 rounded-xl font-bold text-sm',
              cancelButton: 'px-5 py-2.5 rounded-xl font-semibold text-sm'
            }
          });
          confirmed = res.isConfirmed;
        } else {
          confirmed = confirm(`Apakah Anda yakin ingin menghapus materi "${judul}"?`);
        }

        if (confirmed) {
          try {
            await deleteMateri(slug);
            if (typeof Swal !== 'undefined') {
              Swal.fire({
                icon: 'success',
                title: 'Materi Dihapus!',
                text: `Materi "${judul}" berhasil dihapus.`,
                timer: 1800,
                showConfirmButton: false
              });
            } else {
              alert(`Materi "${judul}" berhasil dihapus.`);
            }
            await loadMateriCMS();
          } catch (e) {
            if (typeof Swal !== 'undefined') {
              Swal.fire({
                icon: 'error',
                title: 'Gagal Menghapus',
                text: e.message || 'Terjadi kesalahan saat menghapus materi.',
                confirmButtonColor: '#2563eb'
              });
            } else {
              alert("Gagal menghapus materi: " + e.message);
            }
          }
        }
      });
    });

  } catch (err) {
    console.error("Gagal load materi CMS:", err);
    container.innerHTML = `<div class="p-6 bg-red-50 text-red-600 rounded-xl text-center text-sm">Gagal memuat materi: ${err.message}</div>`;
  }
}

// ==========================================================
// MODAL & EVENT LISTENERS
// ==========================================================
function setupEventListeners() {
  // Logout Guru
  document.getElementById('btn-admin-logout')?.addEventListener('click', async () => {
    let confirmed = false;
    if (typeof Swal !== 'undefined') {
      const res = await Swal.fire({
        title: 'Keluar dari Panel?',
        text: 'Apakah Anda ingin keluar dari Admin Panel Guru?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Keluar',
        cancelButtonText: 'Batal'
      });
      confirmed = res.isConfirmed;
    } else {
      confirmed = confirm("Apakah Anda ingin keluar dari Admin Panel Guru?");
    }

    if (confirmed) {
      await signOut();
      window.location.replace('../login.html?logout=true');
    }
  });

  // Segarkan Data
  document.getElementById('btn-refresh-data')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-refresh-data');
    btn.innerHTML = `<i class="fa-solid fa-rotate fa-spin"></i> Memuat...`;
    await loadAllDashboardData();
    btn.innerHTML = `<i class="fa-solid fa-rotate"></i> Segarkan Data`;
  });

  // Modal Tambah Siswa
  const modalStudent = document.getElementById('modal-add-student');
  const btnOpenStudent = document.getElementById('btn-open-add-student-modal');
  const btnCloseStudent = document.getElementById('btn-close-student-modal');
  const formCreateStudent = document.getElementById('form-create-student');

  btnOpenStudent?.addEventListener('click', () => {
    modalStudent.classList.remove('hidden');
  });

  btnCloseStudent?.addEventListener('click', () => {
    modalStudent.classList.add('hidden');
  });

  document.getElementById('btn-gen-pass')?.addEventListener('click', () => {
    const randomPass = 'bb' + Math.floor(1000 + Math.random() * 9000);
    document.getElementById('new-student-password').value = randomPass;
  });

  formCreateStudent?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('new-student-name').value.trim();
    const email = document.getElementById('new-student-email').value.trim();
    const password = document.getElementById('new-student-password').value;
    const btnSubmit = document.getElementById('btn-submit-student');

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Mendaftarkan...`;

    try {
      await registerStudentByGuru({
        name,
        email,
        password,
        guruId: currentUser.id
      });

      if (typeof Swal !== 'undefined') {
        await Swal.fire({
          icon: 'success',
          title: 'Akun Siswa Berhasil Dibuat!',
          html: `
            <div class="text-left bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm space-y-2 mt-2">
              <div><span class="text-slate-400">Nama:</span> <strong class="text-slate-800">${escapeHtml(name)}</strong></div>
              <div><span class="text-slate-400">Email:</span> <strong class="text-slate-800 font-mono">${escapeHtml(email)}</strong></div>
              <div><span class="text-slate-400">Password:</span> <strong class="text-blue-600 font-mono text-base">${escapeHtml(password)}</strong></div>
            </div>
            <p class="text-xs text-slate-500 mt-3">Silakan berikan informasi login ini kepada siswa.</p>
          `,
          confirmButtonText: 'Selesai',
          confirmButtonColor: '#2563eb'
        });
      } else {
        alert(`Akun Siswa Berhasil Dibuat!\n\nNama: ${name}\nEmail: ${email}\nPassword: ${password}\n\nSilakan berikan informasi ini kepada siswa untuk login.`);
      }
      
      modalStudent.classList.add('hidden');
      formCreateStudent.reset();
      document.getElementById('new-student-password').value = 'siswa123';

      await loadStudentsList();
      await loadDashboardMetrics();

    } catch (err) {
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Mendaftar',
          text: err.message || 'Terjadi kendala saat mendaftarkan akun siswa.',
          confirmButtonColor: '#2563eb'
        });
      } else {
        alert("Gagal membuat akun siswa: " + (err.message || err));
      }
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<span>Daftarkan Siswa</span> <i class="fa-solid fa-check"></i>`;
    }
  });

  // Modal Edit Akun Siswa
  const modalEditStudent = document.getElementById('modal-edit-student');
  const btnCloseEditStudent = document.getElementById('btn-close-edit-student-modal');
  const btnCancelEditStudent = document.getElementById('btn-cancel-edit-student');
  const formEditStudent = document.getElementById('form-edit-student');

  btnCloseEditStudent?.addEventListener('click', () => {
    modalEditStudent.classList.add('hidden');
  });

  btnCancelEditStudent?.addEventListener('click', () => {
    modalEditStudent.classList.add('hidden');
  });

  document.getElementById('btn-edit-gen-pass')?.addEventListener('click', () => {
    const randomPass = 'bb' + Math.floor(1000 + Math.random() * 9000);
    document.getElementById('edit-student-password').value = randomPass;
  });

  formEditStudent?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-student-id').value;
    const name = document.getElementById('edit-student-name').value.trim();
    const email = document.getElementById('edit-student-email').value.trim();
    const password = document.getElementById('edit-student-password').value.trim();
    const btnSubmit = document.getElementById('btn-submit-edit-student');

    if (!name || !email) {
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'warning',
          title: 'Data Belum Lengkap',
          text: 'Nama dan email siswa wajib diisi.',
          confirmButtonColor: '#2563eb'
        });
      } else {
        alert("Nama dan email wajib diisi.");
      }
      return;
    }

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...`;

    try {
      await updateStudentByGuru({ id, name, email, password });
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'success',
          title: 'Akun Diperbarui!',
          text: `Akun siswa "${name}" berhasil diperbarui.`,
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        showToastNotification(`Akun siswa "${name}" berhasil diperbarui!`);
      }
      modalEditStudent.classList.add('hidden');

      await loadStudentsList();
      await loadProgressData();
      await loadDashboardMetrics();
    } catch (err) {
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Memperbarui',
          text: err.message || 'Terjadi kesalahan saat memperbarui akun.',
          confirmButtonColor: '#2563eb'
        });
      } else {
        alert("Gagal memperbarui akun siswa: " + (err.message || err));
      }
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<span>Simpan Perubahan</span> <i class="fa-solid fa-check"></i>`;
    }
  });

  // Delegated Event Listeners untuk Tabel Siswa (Mendukung DataTables Pagination & Sorting)
  document.addEventListener('click', async (e) => {
    // 1. Tombol Edit Siswa
    const btnEdit = e.target.closest('.btn-edit-student');
    if (btnEdit) {
      const id = btnEdit.getAttribute('data-id');
      const name = btnEdit.getAttribute('data-name') || '';
      const email = btnEdit.getAttribute('data-email') || '';
      const password = btnEdit.getAttribute('data-password') || '';

      document.getElementById('edit-student-id').value = id;
      document.getElementById('edit-student-name').value = name;
      document.getElementById('edit-student-email').value = email;
      document.getElementById('edit-student-password').value = password;

      modalEditStudent.classList.remove('hidden');
      return;
    }

    // 2. Tombol Hapus Siswa
    const btnDelete = e.target.closest('.btn-delete-student');
    if (btnDelete) {
      const id = btnDelete.getAttribute('data-id');
      const name = btnDelete.getAttribute('data-name');
      let confirmed = false;

      if (typeof Swal !== 'undefined') {
        const res = await Swal.fire({
          title: 'Hapus Siswa?',
          text: `Apakah Anda yakin ingin menghapus data siswa "${name}"? Data riwayat nilai siswa ini akan ikut terhapus.`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#ef4444',
          cancelButtonColor: '#64748b',
          confirmButtonText: 'Ya, Hapus Siswa',
          cancelButtonText: 'Batal'
        });
        confirmed = res.isConfirmed;
      } else {
        confirmed = confirm(`Apakah Anda yakin ingin menghapus data siswa "${name}"?`);
      }

      if (confirmed) {
        try {
          await deleteStudent(id);
          if (typeof Swal !== 'undefined') {
            Swal.fire({
              icon: 'success',
              title: 'Terhapus',
              text: `Data siswa "${name}" berhasil dihapus.`,
              timer: 1500,
              showConfirmButton: false
            });
          } else {
            showToastNotification(`Siswa "${name}" berhasil dihapus.`);
          }
          await loadStudentsList();
          await loadDashboardMetrics();
        } catch (err) {
          if (typeof Swal !== 'undefined') {
            Swal.fire({
              icon: 'error',
              title: 'Gagal Menghapus',
              text: err.message || 'Terjadi kesalahan saat menghapus siswa.',
              confirmButtonColor: '#2563eb'
            });
          } else {
            alert("Gagal menghapus siswa: " + (err.message || err));
          }
        }
      }
      return;
    }

    // 3. Tombol Salin Password
    const btnCopy = e.target.closest('.btn-copy-pass');
    if (btnCopy) {
      const pass = btnCopy.getAttribute('data-pass');
      if (pass) {
        try {
          await navigator.clipboard.writeText(pass);
          if (typeof Swal !== 'undefined') {
            Swal.fire({
              icon: 'success',
              title: 'Tersalin!',
              text: `Password "${pass}" berhasil disalin ke clipboard.`,
              timer: 1500,
              showConfirmButton: false
            });
          } else {
            showToastNotification(`Password "${pass}" berhasil disalin!`);
          }
        } catch (_) {
          if (typeof Swal !== 'undefined') {
            Swal.fire({
              title: 'Password Siswa',
              text: pass,
              confirmButtonColor: '#2563eb'
            });
          } else {
            prompt("Salin password:", pass);
          }
        }
      }
      return;
    }

    // 4. Tombol Toggle Password (Lihat / Sembunyikan)
    const btnToggle = e.target.closest('.btn-toggle-pass');
    if (btnToggle) {
      const parent = btnToggle.closest('div');
      const textEl = parent?.querySelector('.student-pass-text');
      const icon = btnToggle.querySelector('i');
      if (textEl && icon) {
        const isMasked = textEl.getAttribute('data-masked') === 'true';
        const realPass = textEl.getAttribute('data-pass');
        if (isMasked) {
          textEl.textContent = realPass;
          textEl.setAttribute('data-masked', 'false');
          icon.className = 'fa-solid fa-eye-slash text-xs';
        } else {
          textEl.textContent = '••••••••';
          textEl.setAttribute('data-masked', 'true');
          icon.className = 'fa-solid fa-eye text-xs';
        }
      }
      return;
    }
  });

  // Modal Soal CMS
  const modalQuestion = document.getElementById('modal-question');
  const btnOpenQuestion = document.getElementById('btn-open-add-question-modal');
  const btnCloseQuestion = document.getElementById('btn-close-question-modal');
  const btnCancelQ = document.getElementById('btn-cancel-q');
  const formQuestion = document.getElementById('form-question');

  btnOpenQuestion?.addEventListener('click', () => {
    openQuestionModal(null);
  });

  btnCloseQuestion?.addEventListener('click', () => {
    modalQuestion.classList.add('hidden');
  });

  btnCancelQ?.addEventListener('click', () => {
    modalQuestion.classList.add('hidden');
  });

  formQuestion?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('q-id').value;
    const jenis = document.getElementById('q-jenis').value;
    const judul = document.getElementById('q-judul').value.trim();
    const pertanyaan = document.getElementById('q-pertanyaan').value.trim();
    const jawaban_benar = document.getElementById('q-jawaban-benar').value.trim();
    const urutan = parseInt(document.getElementById('q-urutan').value) || 1;
    const pembahasan = document.getElementById('q-pembahasan').value.trim();

    // Pilihan ganda jika bukan essay
    let pilihan = [];
    const opt0 = document.getElementById('q-opt-0').value.trim();
    const opt1 = document.getElementById('q-opt-1').value.trim();
    const opt2 = document.getElementById('q-opt-2').value.trim();
    const opt3 = document.getElementById('q-opt-3').value.trim();

    if (opt0 || opt1 || opt2 || opt3) {
      pilihan = [opt0, opt1, opt2, opt3];
    }

    const payload = {
      jenis,
      judul,
      pertanyaan,
      pilihan,
      jawaban_benar,
      urutan,
      pembahasan
    };

    const btnSave = document.getElementById('btn-save-q');
    btnSave.disabled = true;
    btnSave.textContent = 'Menyimpan...';

    try {
      if (id) {
        await updateQuestion(id, payload);
        if (typeof Swal !== 'undefined') {
          Swal.fire({
            icon: 'success',
            title: 'Soal Diperbarui!',
            text: 'Data soal berhasil diperbarui di cloud database.',
            timer: 1800,
            showConfirmButton: false
          });
        } else {
          alert("Soal berhasil diperbarui!");
        }
      } else {
        await addQuestion(payload);
        if (typeof Swal !== 'undefined') {
          Swal.fire({
            icon: 'success',
            title: 'Soal Ditambahkan!',
            text: 'Soal baru berhasil ditambahkan ke bank soal.',
            timer: 1800,
            showConfirmButton: false
          });
        } else {
          alert("Soal baru berhasil ditambahkan!");
        }
      }

      modalQuestion.classList.add('hidden');
      await loadQuestionsCMS();
      await loadDashboardMetrics();

    } catch (err) {
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Menyimpan',
          text: err.message || 'Terjadi kesalahan saat menyimpan soal.',
          confirmButtonColor: '#2563eb'
        });
      } else {
        alert("Gagal menyimpan soal: " + err.message);
      }
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = 'Simpan Soal';
    }
  });

  // Filter Kategori Soal
  document.getElementById('filter-question-type')?.addEventListener('change', () => {
    renderQuestionsList(allQuestionsCache);
  });

  // Search Filter Progress Siswa
  document.getElementById('search-student-progress')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = allStudentsProgressCache.filter(s => 
      s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
    renderProgressTable(filtered);
  });

  // Ekspor CSV Nilai
  document.getElementById('btn-export-csv')?.addEventListener('click', () => {
    if (allStudentsProgressCache.length === 0) {
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'info',
          title: 'Data Masih Kosong',
          text: 'Belum ada data pengerjaan siswa untuk diekspor ke CSV.',
          confirmButtonColor: '#2563eb'
        });
      } else {
        alert("Tidak ada data untuk diekspor.");
      }
      return;
    }

    let csv = "Nama Siswa,Email,Tes Awal,Latihan Dasar,Latihan Campuran,Kuis Akhir,Penguasaan Materi (%),Jumlah Lencana\n";
    allStudentsProgressCache.forEach(s => {
      csv += `"${s.name}","${s.email}","${s.tesAwal}","${s.latihanDasar}","${s.latihanCampuran}","${s.kuis}","${s.avgProgress}","${s.totalBadges}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Rekap_Nilai_BilBul_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // ==========================================================
  // EVENT LISTENER MODAL MATERI (CMS)
  // ==========================================================
  const modalMateri = document.getElementById('modal-materi');
  const formMateri = document.getElementById('form-materi');
  const btnSaveMateri = document.getElementById('btn-save-materi');

  document.getElementById('btn-open-add-materi-modal')?.addEventListener('click', () => {
    openMateriModal(null);
  });

  document.getElementById('btn-close-materi-modal')?.addEventListener('click', () => {
    modalMateri?.classList.add('hidden');
  });

  document.getElementById('btn-cancel-materi')?.addEventListener('click', () => {
    modalMateri?.classList.add('hidden');
  });

  formMateri?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('materi-id').value;
    const existingSlug = document.getElementById('materi-slug').value;
    const urutan = parseInt(document.getElementById('materi-urutan').value) || 1;
    const judul = document.getElementById('materi-judul').value.trim();
    const ringkasan = document.getElementById('materi-ringkasan').value.trim();
    const konten = document.getElementById('materi-konten').value.trim();

    if (!judul) {
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'warning',
          title: 'Judul Wajib Diisi',
          text: 'Harap masukkan judul submateri pembelajaran.',
          confirmButtonColor: '#2563eb'
        });
      } else {
        alert("Judul materi wajib diisi!");
      }
      return;
    }

    btnSaveMateri.disabled = true;
    btnSaveMateri.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...`;

    try {
      if (existingSlug || id) {
        // Mode Edit Materi
        await updateMateriContent(existingSlug || id, {
          id: id || undefined,
          slug: existingSlug || undefined,
          urutan,
          judul,
          ringkasan,
          konten
        });

        if (typeof Swal !== 'undefined') {
          Swal.fire({
            icon: 'success',
            title: 'Materi Diperbarui!',
            text: `Perubahan pada "${judul}" berhasil disimpan ke sistem.`,
            timer: 1800,
            showConfirmButton: false
          });
        } else {
          alert("Materi berhasil diperbarui!");
        }
      } else {
        // Mode Tambah Materi Baru
        const slug = judul.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        await addMateri({
          urutan,
          judul,
          slug,
          ringkasan,
          konten
        });

        if (typeof Swal !== 'undefined') {
          Swal.fire({
            icon: 'success',
            title: 'Materi Ditambahkan!',
            text: `Submateri baru "${judul}" berhasil ditambahkan ke silabus siswa.`,
            timer: 1800,
            showConfirmButton: false
          });
        } else {
          alert("Materi baru berhasil ditambahkan!");
        }
      }

      modalMateri.classList.add('hidden');
      await loadMateriCMS();

    } catch (err) {
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Menyimpan',
          text: err.message || 'Terjadi kendala saat menyimpan data materi.',
          confirmButtonColor: '#2563eb'
        });
      } else {
        alert("Gagal menyimpan materi: " + err.message);
      }
    } finally {
      btnSaveMateri.disabled = false;
      btnSaveMateri.innerHTML = `<span>Simpan Materi</span> <i class="fa-solid fa-check"></i>`;
    }
  });
}

function openQuestionModal(q) {
  const modal = document.getElementById('modal-question');
  const title = document.getElementById('modal-question-title');
  const form = document.getElementById('form-question');

  if (q) {
    title.innerHTML = `<i class="fa-solid fa-pen-to-square text-blue-600"></i> Edit Soal (${q.id})`;
    document.getElementById('q-id').value = q.id;
    document.getElementById('q-jenis').value = q.jenis;
    document.getElementById('q-judul').value = q.judul || '';
    document.getElementById('q-pertanyaan').value = q.pertanyaan;
    document.getElementById('q-jawaban-benar').value = q.jawaban_benar;
    document.getElementById('q-urutan').value = q.urutan || 1;
    document.getElementById('q-pembahasan').value = q.pembahasan || '';

    if (q.pilihan && Array.isArray(q.pilihan)) {
      document.getElementById('q-opt-0').value = q.pilihan[0] || '';
      document.getElementById('q-opt-1').value = q.pilihan[1] || '';
      document.getElementById('q-opt-2').value = q.pilihan[2] || '';
      document.getElementById('q-opt-3').value = q.pilihan[3] || '';
    } else {
      document.getElementById('q-opt-0').value = '';
      document.getElementById('q-opt-1').value = '';
      document.getElementById('q-opt-2').value = '';
      document.getElementById('q-opt-3').value = '';
    }
  } else {
    title.innerHTML = `<i class="fa-solid fa-plus text-blue-600"></i> Tambah Soal Baru`;
    form.reset();
    document.getElementById('q-id').value = '';
    document.getElementById('q-urutan').value = 1;
  }

  modal.classList.remove('hidden');
}

function openMateriModal(m) {
  const modal = document.getElementById('modal-materi');
  const title = document.getElementById('modal-materi-title');
  const form = document.getElementById('form-materi');

  if (m) {
    title.innerHTML = `<i class="fa-solid fa-pen-to-square text-blue-600"></i> Edit Materi (${escapeHtml(m.judul)})`;
    document.getElementById('materi-id').value = m.id || '';
    document.getElementById('materi-slug').value = m.slug || '';
    document.getElementById('materi-urutan').value = m.urutan || 1;
    document.getElementById('materi-judul').value = m.judul || '';
    document.getElementById('materi-ringkasan').value = m.ringkasan || '';
    document.getElementById('materi-konten').value = m.konten || '';
  } else {
    title.innerHTML = `<i class="fa-solid fa-book-open text-blue-600"></i> Tambah Materi Baru`;
    form.reset();
    document.getElementById('materi-id').value = '';
    document.getElementById('materi-slug').value = '';

    // Hitung urutan berikutnya
    let nextUrutan = 1;
    if (allMateriCache && allMateriCache.length > 0) {
      nextUrutan = Math.max(...allMateriCache.map(x => parseInt(x.urutan) || 0)) + 1;
    }
    document.getElementById('materi-urutan').value = nextUrutan;
  }

  modal.classList.remove('hidden');
}
