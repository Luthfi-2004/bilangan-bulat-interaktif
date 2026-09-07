import { loginOrRegisterStudent } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', () => {
  // Tunggu sedikit agar layout.js selesai memuat topbar
  setTimeout(initSession, 500);
});

async function initSession() {
  const profileBtn = document.getElementById('student-profile-btn');
  const nameDisplay = document.getElementById('student-name-display');
  
  // 1. Cek local storage untuk sesi saat ini
  let currentStudent = JSON.parse(localStorage.getItem('math_student'));
  
  if (currentStudent && currentStudent.name) {
    if (nameDisplay) nameDisplay.textContent = currentStudent.name;
  }
  
  // 2. Tambahkan event listener ke tombol profil
  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      promptForName();
    });
  }
  
  // 3. Jika belum ada sesi, minta user isi nama (opsional, jangan paksa jika di halaman awal)
  const isHomepage = window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html');
  if (!currentStudent && !isHomepage) {
    // promptForName(); 
    // Kita panggil lewat interaksi pengguna saja untuk UX yang lebih baik
  }
}

async function promptForName() {
  const currentStudent = JSON.parse(localStorage.getItem('math_student'));
  const promptMessage = currentStudent 
    ? \`Kamu masuk sebagai "\${currentStudent.name}". Ingin ganti nama siswa?\` 
    : 'Masukkan namamu untuk menyimpan skor dan pencapaian:';
    
  const inputName = prompt(promptMessage);
  
  if (inputName && inputName.trim() !== '') {
    const name = inputName.trim();
    // Tampilkan loading state
    const nameDisplay = document.getElementById('student-name-display');
    if (nameDisplay) nameDisplay.textContent = "Menyimpan...";
    
    // Simpan/sinkronkan ke Supabase
    try {
      const studentData = await loginOrRegisterStudent(name);
      if (studentData) {
        localStorage.setItem('math_student', JSON.stringify(studentData));
        if (nameDisplay) nameDisplay.textContent = studentData.name;
        alert(\`Selamat datang, \${studentData.name}! Progresmu akan tersimpan aman.\`);
        // Refresh page untuk memuat ulang data jika perlu
        // window.location.reload();
      } else {
        alert("Gagal terhubung ke database. Namun progres akan disimpan di browser ini.");
        localStorage.setItem('math_student', JSON.stringify({ id: 'local-' + Date.now(), name }));
        if (nameDisplay) nameDisplay.textContent = name;
      }
    } catch (e) {
      console.error(e);
      localStorage.setItem('math_student', JSON.stringify({ id: 'local-' + Date.now(), name }));
      if (nameDisplay) nameDisplay.textContent = name;
    }
  }
}

// Global utility methods for other scripts to use
window.getCurrentStudent = function() {
  return JSON.parse(localStorage.getItem('math_student'));
};
