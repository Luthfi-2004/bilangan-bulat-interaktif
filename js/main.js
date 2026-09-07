import { loginOrRegisterStudent } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', () => {
  // Tunggu sedikit agar layout.js selesai memuat topbar
  setTimeout(initSession, 500);
});

async function initSession() {
  updateProfileUI();
}

function updateProfileUI() {
  const profileDiv = document.getElementById('student-profile');
  if (!profileDiv) return;
  
  let currentStudent = window.getCurrentStudent();
  
  if (currentStudent && currentStudent.name) {
    profileDiv.innerHTML = `
      <span class="text-sm md:text-base font-semibold text-slate-700 mr-2">Halo, ${currentStudent.name}!</span>
      <button id="logout-btn" class="px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-red-200 focus:outline-none">
        <i class="fa-solid fa-right-from-bracket mr-1"></i> Keluar
      </button>
    `;
    
    document.getElementById('logout-btn').addEventListener('click', () => {
      localStorage.removeItem('math_student');
      window.location.reload();
    });
  } else {
    profileDiv.innerHTML = `
      <button id="login-btn" class="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow hover:shadow-md transition-all focus:outline-none">
        <i class="fa-solid fa-user mr-1"></i> Masuk / Daftar
      </button>
    `;
    
    document.getElementById('login-btn').addEventListener('click', promptForName);
  }
}

async function promptForName() {
  const promptMessage = 'Masukkan namamu untuk menyimpan skor dan pencapaian:';
  const inputName = prompt(promptMessage);
  
  if (inputName && inputName.trim() !== '') {
    const name = inputName.trim();
    
    // Tampilkan loading state sementara
    const profileDiv = document.getElementById('student-profile');
    if (profileDiv) {
      profileDiv.innerHTML = `<span class="text-slate-500 animate-pulse"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Menyimpan...</span>`;
    }
    
    try {
      const studentData = await loginOrRegisterStudent(name);
      if (studentData) {
        localStorage.setItem('math_student', JSON.stringify(studentData));
        alert(`Selamat datang, ${studentData.name}! Progresmu akan tersimpan aman.`);
      } else {
        alert("Gagal terhubung ke database. Namun progres akan disimpan di browser ini.");
        localStorage.setItem('math_student', JSON.stringify({ id: 'local-' + Date.now(), name }));
      }
    } catch (e) {
      console.error(e);
      localStorage.setItem('math_student', JSON.stringify({ id: 'local-' + Date.now(), name }));
    }
    updateProfileUI();
  }
}

// Global utility methods for other scripts to use
window.getCurrentStudent = function() {
  return JSON.parse(localStorage.getItem('math_student'));
};
