import { getCurrentUser, signOut, saveStudentProgress } from './supabase-client.js';
import { checkAndUnlockBadges } from './badge-engine.js';
import { renderBottomFlowBar } from './learning-flow.js';

// Fungsi pelacak otomatis pengerjaan / pembacaan materi pembelajaran
async function trackMateriReading() {
  const path = window.location.pathname;
  if (!path.includes('/materi/')) return;

  let slug = null;
  if (path.includes('baca.html')) {
    const params = new URLSearchParams(window.location.search);
    slug = params.get('slug');
  } else {
    const match = path.match(/\/materi\/([^\/\?#]+)\.html/i);
    if (match && match[1] && match[1] !== 'index') {
      slug = match[1];
    }
  }

  if (slug) {
    const student = window.getCurrentStudent();
    if (student) {
      try {
        await saveStudentProgress(student.id, slug, 100);
        await checkAndUnlockBadges(student.id, true);
      } catch (err) {
        console.warn("Auto-track materi warning:", err);
      }
    }
  }
}

// Tangani Back/Forward Cache (BFCache) agar browser tidak memulihkan halaman dari memori saat logout
window.addEventListener('pageshow', async (event) => {
  const path = window.location.pathname;
  if (path.endsWith('/index.html') || path === '/' || path.endsWith('/login.html') || path.includes('/admin/')) {
    return;
  }
  if (event.persisted || (window.performance && window.performance.getEntriesByType && window.performance.getEntriesByType("navigation")[0]?.type === "back_forward")) {
    let user = localStorage.getItem('math_current_user');
    if (!user) {
      user = await getCurrentUser();
    }
    if (!user) {
      const isSubfolder = path.includes('/materi/');
      const loginPath = isSubfolder ? '../login.html?logout=true' : 'login.html?logout=true';
      window.location.replace(loginPath);
    }
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  // Lewati pemeriksaan jika di landing page promosi, login page, atau admin
  const path = window.location.pathname;
  if (path.endsWith('/index.html') || path === '/' || path.endsWith('/login.html') || path.includes('/admin/')) {
    return;
  }

  // Tampilkan loading state sederhana di layar
  const originalDisplay = document.body.style.display;
  document.body.style.display = 'none';
  
  const loadingOverlay = document.createElement('div');
  loadingOverlay.id = 'auth-loading-overlay';
  loadingOverlay.innerHTML = `
    <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:#f8fafc;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;">
      <div style="width:40px;height:40px;border:4px solid #cbd5e1;border-top-color:#2563eb;border-radius:50%;animation:spin 1s linear infinite;"></div>
      <p style="margin-top:16px;color:#475569;font-weight:600;">Memverifikasi sesi...</p>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    </div>
  `;
  document.documentElement.appendChild(loadingOverlay);

  try {
    // Auth Guard: Cek apakah siswa sudah login secara asinkron
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      // Siswa belum login, arahkan ke login.html
      const isSubfolder = path.includes('/materi/');
      const loginPath = isSubfolder ? '../login.html?logout=true' : 'login.html?logout=true';
      window.location.replace(loginPath);
      return;
    }

    // Hapus overlay dan kembalikan body
    loadingOverlay.remove();
    document.body.style.display = originalDisplay;

    // Set timeout kecil agar topbar layout selesai di-inject
    setTimeout(() => {
      updateProfileUI(currentUser);
      trackMateriReading();
      renderBottomFlowBar();
    }, 200);

    // Responsif terhadap perpindahan halaman SPA
    window.addEventListener('spa:navigated', () => {
      updateProfileUI(currentUser);
      trackMateriReading();
      renderBottomFlowBar();
    });
  } catch (err) {
    loadingOverlay.remove();
    document.body.style.display = originalDisplay;
    console.error("Auth error:", err);
  }
});

function updateProfileUI(user) {
  const profileDiv = document.getElementById('student-profile');
  if (!profileDiv) return;

  const isGuru = user.role === 'guru';
  const isSubfolder = window.location.pathname.includes('/materi/');
  const adminPath = isSubfolder ? '../admin/index.html' : 'admin/index.html';
  const loginPath = isSubfolder ? '../login.html' : 'login.html';

  profileDiv.innerHTML = `
    <div class="flex items-center gap-3 mb-3 user-info">
      <div class="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
        ${user.name.substring(0, 2).toUpperCase()}
      </div>
      <div class="overflow-hidden">
        <div class="font-bold text-sm text-slate-800 truncate">${user.name}</div>
        <div class="text-[10px] text-slate-500 truncate uppercase tracking-wider font-semibold">${isGuru ? 'Pendidik / Guru' : 'Siswa Kelas VII'}</div>
      </div>
    </div>
    <div class="grid ${isGuru ? 'grid-cols-2' : 'grid-cols-1'} gap-2 btn-grid">
      ${isGuru ? `
        <a href="${adminPath}" class="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold text-center transition-colors focus:outline-none">
          <i class="fa-solid fa-chalkboard-user mr-1"></i> Admin
        </a>
      ` : ''}
      <button id="logout-btn" class="px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold text-center transition-colors focus:outline-none">
        <i class="fa-solid fa-right-from-bracket mr-1"></i> Keluar
      </button>
    </div>
  `;

  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    let confirmed = false;
    if (typeof Swal !== 'undefined') {
      const res = await Swal.fire({
        title: 'Keluar Belajar?',
        text: 'Apakah kamu yakin ingin keluar dari sesi belajar?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Keluar',
        cancelButtonText: 'Tetap Belajar',
        customClass: {
          popup: 'rounded-2xl shadow-xl font-sans',
          confirmButton: 'px-5 py-2.5 rounded-xl font-bold text-sm',
          cancelButton: 'px-5 py-2.5 rounded-xl font-semibold text-sm'
        }
      });
      confirmed = res.isConfirmed;
    } else {
      confirmed = confirm("Apakah kamu ingin keluar dari sesi belajar?");
    }

    if (confirmed) {
      await signOut();
      window.location.replace(loginPath + '?logout=true');
    }
  });
}

// Global utility helper untuk komponen yang membutuhkan data siswa
window.getCurrentStudent = function() {
  const cached = localStorage.getItem('math_current_user') || localStorage.getItem('math_student');
  return cached ? JSON.parse(cached) : null;
};
