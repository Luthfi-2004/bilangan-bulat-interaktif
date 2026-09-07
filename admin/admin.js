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
  updateMateriContent
} from '../js/supabase-client.js';

let currentUser = null;
let allQuestionsCache = [];
let allStudentsProgressCache = [];
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

// ==========================================================
// INISIALISASI & AUTH GUARD
// ==========================================================
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Cek sesi login
  currentUser = await getCurrentUser();
  if (!currentUser) {
    alert("Silakan login terlebih dahulu sebagai Guru.");
    window.location.href = '../login.html';
    return;
  }

  // Jika bukan guru, tolak akses dan arahkan ke dashboard belajar siswa
  if (currentUser.role !== 'guru') {
    alert("Akses ditolak. Halaman ini khusus untuk Pendidik / Guru.");
    window.location.href = '../dashboard.html';
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
      if (confirm("Hapus soal ini dari database?")) {
        try {
          await deleteQuestion(qId);
          alert("Soal berhasil dihapus!");
          await loadQuestionsCMS();
          await loadDashboardMetrics();
        } catch (e) {
          alert("Gagal menghapus soal: " + e.message);
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
    if (list.length === 0) {
      container.innerHTML = `<div class="p-6 bg-white rounded-xl text-center text-slate-400">Data materi kosong di Supabase.</div>`;
      return;
    }

    let html = '';
    list.forEach(m => {
      html += `
        <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
            <div>
              <span class="text-[11px] font-bold text-blue-600 uppercase tracking-widest">Submateri #${m.urutan}</span>
              <h3 class="text-lg font-bold text-slate-900">${m.judul}</h3>
            </div>
            <button class="btn-save-materi px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 self-start" data-slug="${m.slug}">
              <i class="fa-solid fa-floppy-disk"></i> Simpan Materi
            </button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Judul Submateri</label>
              <input type="text" id="materi-title-${m.slug}" value="${m.judul}" class="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Ringkasan Materi (Muncul di Halaman Siswa)</label>
              <textarea id="materi-desc-${m.slug}" rows="3" class="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm leading-relaxed">${m.ringkasan || ''}</textarea>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // Pasang listener simpan materi
    document.querySelectorAll('.btn-save-materi').forEach(btn => {
      btn.addEventListener('click', async () => {
        const slug = btn.getAttribute('data-slug');
        const judul = document.getElementById(`materi-title-${slug}`).value.trim();
        const ringkasan = document.getElementById(`materi-desc-${slug}`).value.trim();

        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...`;

        try {
          await updateMateriContent(slug, { judul, ringkasan });
          alert(`Materi "${judul}" berhasil diperbarui!`);
        } catch (e) {
          alert("Gagal memperbarui materi: " + e.message);
        } finally {
          btn.disabled = false;
          btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Simpan Materi`;
        }
      });
    });

  } catch (err) {
    console.error("Gagal load materi CMS:", err);
  }
}

// ==========================================================
// MODAL & EVENT LISTENERS
// ==========================================================
function setupEventListeners() {
  // Logout Guru
  document.getElementById('btn-admin-logout')?.addEventListener('click', async () => {
    if (confirm("Apakah Anda ingin keluar dari Admin Panel Guru?")) {
      await signOut();
      window.location.href = '../login.html';
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

      alert(`Akun Siswa Berhasil Dibuat!\n\nNama: ${name}\nEmail: ${email}\nPassword: ${password}\n\nSilakan berikan informasi ini kepada siswa untuk login.`);
      
      modalStudent.classList.add('hidden');
      formCreateStudent.reset();
      document.getElementById('new-student-password').value = 'siswa123';

      await loadStudentsList();
      await loadDashboardMetrics();

    } catch (err) {
      alert("Gagal membuat akun siswa: " + (err.message || err));
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
      alert("Nama dan email wajib diisi.");
      return;
    }

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...`;

    try {
      await updateStudentByGuru({ id, name, email, password });
      showToastNotification(`Akun siswa "${name}" berhasil diperbarui!`);
      modalEditStudent.classList.add('hidden');

      await loadStudentsList();
      await loadProgressData();
      await loadDashboardMetrics();
    } catch (err) {
      alert("Gagal memperbarui akun siswa: " + (err.message || err));
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
      if (confirm(`Apakah Anda yakin ingin menghapus data siswa "${name}"?`)) {
        try {
          await deleteStudent(id);
          showToastNotification(`Siswa "${name}" berhasil dihapus.`);
          await loadStudentsList();
          await loadDashboardMetrics();
        } catch (err) {
          alert("Gagal menghapus siswa: " + (err.message || err));
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
          showToastNotification(`Password "${pass}" berhasil disalin!`);
        } catch (_) {
          prompt("Salin password:", pass);
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
        alert("Soal berhasil diperbarui!");
      } else {
        await addQuestion(payload);
        alert("Soal baru berhasil ditambahkan!");
      }

      modalQuestion.classList.add('hidden');
      await loadQuestionsCMS();
      await loadDashboardMetrics();

    } catch (err) {
      alert("Gagal menyimpan soal: " + err.message);
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
      alert("Tidak ada data untuk diekspor.");
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
