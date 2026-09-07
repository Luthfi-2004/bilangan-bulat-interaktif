import { getCurrentUser, signOut } from './supabase-client.js';

// Tangani Back/Forward Cache (BFCache) agar browser tidak memulihkan halaman dari memori saat logout
window.addEventListener('pageshow', async (event) => {
  const path = window.location.pathname;
  if (path.endsWith('/index.html') || path === '/' || path.endsWith('/login.html') || path.includes('/admin/')) {
    return;
  }
  if (event.persisted || (window.performance && window.performance.getEntriesByType && window.performance.getEntriesByType("navigation")[0]?.type === "back_forward")) {
    const user = await getCurrentUser();
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

  // Auth Guard: Cek apakah siswa sudah login
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    // Siswa belum login, arahkan ke login.html
    const isSubfolder = path.includes('/materi/');
    const loginPath = isSubfolder ? '../login.html?logout=true' : 'login.html?logout=true';
    window.location.replace(loginPath);
    return;
  }

  // Set timeout kecil agar topbar layout selesai di-inject
  setTimeout(() => updateProfileUI(currentUser), 200);

  // Responsif terhadap perpindahan halaman SPA
  window.addEventListener('spa:navigated', () => {
    updateProfileUI(currentUser);
  });
});

function updateProfileUI(user) {
  const profileDiv = document.getElementById('student-profile');
  if (!profileDiv) return;

  const isGuru = user.role === 'guru';
  const isSubfolder = window.location.pathname.includes('/materi/');
  const adminPath = isSubfolder ? '../admin/index.html' : 'admin/index.html';
  const loginPath = isSubfolder ? '../login.html' : 'login.html';

  profileDiv.innerHTML = `
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
        ${user.name.substring(0, 2).toUpperCase()}
      </div>
      <div class="hidden sm:block text-left mr-2">
        <div class="text-xs font-bold text-slate-800 leading-none">${user.name}</div>
        <div class="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">${isGuru ? 'Pendidik / Guru' : 'Siswa Kelas VII'}</div>
      </div>
    </div>

    ${isGuru ? `
      <a href="${adminPath}" class="px-2.5 py-1.5 text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200 font-semibold focus:outline-none">
        <i class="fa-solid fa-chalkboard-user mr-1"></i> Admin Panel
      </a>
    ` : ''}

    <button id="logout-btn" class="px-3 py-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-red-200 font-semibold focus:outline-none">
      <i class="fa-solid fa-right-from-bracket mr-1"></i> Keluar
    </button>
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
