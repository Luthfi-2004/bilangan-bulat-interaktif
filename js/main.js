import { getCurrentUser, signOut } from './supabase-client.js';

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
    const loginPath = isSubfolder ? '../login.html' : 'login.html';
    window.location.href = loginPath;
    return;
  }

  // Set timeout kecil agar topbar layout selesai di-inject
  setTimeout(() => updateProfileUI(currentUser), 200);
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
    if (confirm("Apakah kamu ingin keluar dari sesi belajar?")) {
      await signOut();
      window.location.href = loginPath;
    }
  });
}

// Global utility helper untuk komponen yang membutuhkan data siswa
window.getCurrentStudent = function() {
  const cached = localStorage.getItem('math_current_user') || localStorage.getItem('math_student');
  return cached ? JSON.parse(cached) : null;
};
