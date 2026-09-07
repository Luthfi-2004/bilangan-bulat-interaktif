import { saveTestResult } from './supabase-client.js';

export class QuizEngine {
  constructor(containerId, soalArray, jenis, onComplete) {
    this.container = document.getElementById(containerId);
    this.soalArray = soalArray;
    this.jenis = jenis; // 'tes_awal', 'kuis', 'latihan'
    this.onComplete = onComplete;
    
    this.currentIndex = 0;
    this.jawabanSiswa = new Array(this.soalArray.length).fill(null);
    this.isFinished = false;
    
    this.render();
  }
  
  render() {
    if (this.isFinished) {
      this.renderHasil();
      return;
    }
    
    const soal = this.soalArray[this.currentIndex];
    
    let html = \`
      <div class="card">
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
          <span style="font-weight: 600; color: var(--primary);">Soal \${this.currentIndex + 1} dari \${this.soalArray.length}</span>
          <span class="text-muted">\${this.jenis.replace('_', ' ').toUpperCase()}</span>
        </div>
        
        <div class="progress-container">
          <div class="progress-bar" style="width: \${((this.currentIndex) / this.soalArray.length) * 100}%"></div>
        </div>
        
        <h3 style="font-size: 1.5rem; margin-top: 20px;">\${soal.pertanyaan}</h3>
        
        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 30px;" id="pilihan-container">
    \`;
    
    soal.pilihan.forEach((pilihanText, index) => {
      const isSelected = this.jawabanSiswa[this.currentIndex] === pilihanText;
      html += \`
        <button class="btn \${isSelected ? 'btn-primary' : 'btn-outline'}" 
                style="justify-content: flex-start; text-align: left; padding: 15px;"
                data-jawaban="\${pilihanText}">
          \${String.fromCharCode(65 + index)}. \${pilihanText}
        </button>
      \`;
    });
    
    html += \`
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-top: 30px;">
          <button class="btn btn-outline" id="btn-prev" \${this.currentIndex === 0 ? 'disabled' : ''}>← Sebelumnya</button>
          <button class="btn btn-primary" id="btn-next">\${this.currentIndex === this.soalArray.length - 1 ? 'Selesai & Cek Skor' : 'Selanjutnya →'}</button>
        </div>
      </div>
    \`;
    
    this.container.innerHTML = html;
    this.attachEvents();
  }
  
  attachEvents() {
    // Tombol Pilihan
    const pilihanBtns = this.container.querySelectorAll('#pilihan-container .btn');
    pilihanBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.jawabanSiswa[this.currentIndex] = e.target.getAttribute('data-jawaban');
        this.render(); // Re-render untuk mengupdate state tombol
      });
    });
    
    // Navigasi
    const btnPrev = this.container.querySelector('#btn-prev');
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (this.currentIndex > 0) {
          this.currentIndex--;
          this.render();
        }
      });
    }
    
    const btnNext = this.container.querySelector('#btn-next');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        if (this.jawabanSiswa[this.currentIndex] === null) {
          alert('Silakan pilih jawaban terlebih dahulu!');
          return;
        }
        
        if (this.currentIndex < this.soalArray.length - 1) {
          this.currentIndex++;
          this.render();
        } else {
          this.selesai();
        }
      });
    }
  }
  
  async selesai() {
    this.isFinished = true;
    this.hitungSkor();
    this.renderHasil();
    
    // Simpan ke database
    const student = window.getCurrentStudent();
    if (student) {
      await saveTestResult(student.id, this.jenis, this.skor);
    }
    
    if (this.onComplete) {
      this.onComplete(this.skor);
    }
  }
  
  hitungSkor() {
    let benar = 0;
    this.soalArray.forEach((soal, index) => {
      if (this.jawabanSiswa[index] === soal.jawaban_benar) {
        benar++;
      }
    });
    this.skor = Math.round((benar / this.soalArray.length) * 100);
  }
  
  renderHasil() {
    let feedback = "";
    let alertClass = "";
    
    if (this.skor >= 80) {
      feedback = "Wah, kemampuan awalmu sudah bagus!";
      alertClass = "alert-success";
    } else if (this.skor >= 60) {
      feedback = "Lumayan! Kamu sudah punya dasar.";
      alertClass = "alert-info";
    } else {
      feedback = "Tidak apa-apa kalau masih banyak yang salah. Yuk mulai belajar dari konsep dasarnya!";
      alertClass = "alert-warning"; // Using a warning style, or fall back to error
    }
    
    let html = \`
      <div class="card text-center">
        <h2>Skor \${this.jenis.replace('_', ' ').toUpperCase()}</h2>
        <div style="font-size: 4rem; font-weight: 800; color: var(--primary); margin: 20px 0;">\${this.skor}</div>
        <div class="alert \${alertClass}" style="display: inline-block;">\${feedback}</div>
        
        <div style="margin-top: 30px;">
          <a href="materi/index.html" class="btn btn-primary">Lanjut ke Materi →</a>
        </div>
      </div>
      
      <h3 style="margin-top: 30px;">Pembahasan Jawaban</h3>
      <div class="grid">
    \`;
    
    this.soalArray.forEach((soal, index) => {
      const jawabanUser = this.jawabanSiswa[index];
      const isCorrect = jawabanUser === soal.jawaban_benar;
      
      html += \`
        <div class="card" style="border-left: 5px solid \${isCorrect ? 'var(--success)' : 'var(--danger)'}">
          <h4>Soal \${index + 1}: \${soal.pertanyaan}</h4>
          <p>Jawabanmu: <strong>\${jawabanUser || '-'}</strong> \${isCorrect ? '✅' : '❌'}</p>
          \${!isCorrect ? \`<p>Jawaban Benar: <strong>\${soal.jawaban_benar}</strong></p>\` : ''}
          <div style="background: var(--bg-color); padding: 15px; border-radius: var(--radius); margin-top: 10px;">
            <strong>Pembahasan:</strong><br>
            \${soal.pembahasan}
          </div>
        </div>
      \`;
    });
    
    html += \`</div>\`;
    this.container.innerHTML = html;
  }
}
