import { saveTestResult } from './supabase-client.js';
import { checkAndUnlockBadges } from './badge-engine.js';

export class QuizEngine {
  constructor(containerId, soalArray, jenis, onComplete, nextAction = null) {
    this.container = document.querySelector(containerId.includes('#') ? containerId : `#${containerId}`) || document.getElementById(containerId);
    this.soalArray = soalArray;
    this.jenis = jenis; // 'tes_awal', 'kuis', 'latihan'
    this.onComplete = onComplete;
    this.nextAction = nextAction;
    
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
    const progressPercent = ((this.currentIndex) / this.soalArray.length) * 100;
    
    let html = `
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 relative overflow-hidden">
        <div class="flex justify-between items-center mb-6">
          <span class="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-sm">Soal ${this.currentIndex + 1} dari ${this.soalArray.length}</span>
          <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">${this.jenis.replace('_', ' ')}</span>
        </div>
        
        <div class="w-full bg-slate-100 rounded-full h-2 mb-8 overflow-hidden">
          <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: ${progressPercent}%"></div>
        </div>
        
        <h3 class="text-2xl font-bold text-slate-800 mb-8 leading-snug">${soal.pertanyaan}</h3>
        
        <div class="space-y-3" id="pilihan-container">
    `;
    
    soal.pilihan.forEach((pilihanText, index) => {
      const isSelected = this.jawabanSiswa[this.currentIndex] === pilihanText;
      const baseBtnClass = "w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-200 focus:outline-none";
      const stateClass = isSelected 
        ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold shadow-sm" 
        : "border-slate-200 hover:border-blue-300 hover:bg-slate-50 text-slate-700";
        
      html += `
        <button class="${baseBtnClass} ${stateClass}" data-jawaban="${pilihanText}">
          <span class="inline-block w-8 font-bold opacity-60">${String.fromCharCode(65 + index)}.</span> ${pilihanText}
        </button>
      `;
    });
    
    html += `
        </div>
        
        <div class="flex justify-between mt-10 border-t border-slate-100 pt-6">
          <button class="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" id="btn-prev" ${this.currentIndex === 0 ? 'disabled' : ''}>
            <i class="fa-solid fa-arrow-left mr-2"></i> Sebelumnya
          </button>
          
          <button class="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 shadow-sm transition-colors" id="btn-next">
            ${this.currentIndex === this.soalArray.length - 1 ? 'Selesai & Cek Skor <i class="fa-solid fa-check ml-2"></i>' : 'Selanjutnya <i class="fa-solid fa-arrow-right ml-2"></i>'}
          </button>
        </div>
      </div>
    `;
    
    this.container.innerHTML = html;
    this.attachEvents();
  }
  
  attachEvents() {
    const pilihanBtns = this.container.querySelectorAll('#pilihan-container button');
    pilihanBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const selectedValue = e.currentTarget.getAttribute('data-jawaban');
        this.jawabanSiswa[this.currentIndex] = selectedValue;
        this.render(); 
      });
    });
    
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
          if (typeof Swal !== 'undefined') {
            Swal.fire({
              icon: 'warning',
              title: 'Pilih Jawaban',
              text: 'Silakan pilih salah satu jawaban terlebih dahulu sebelum melanjutkan!',
              confirmButtonText: 'Baik, Mengerti',
              confirmButtonColor: '#2563eb',
              customClass: {
                popup: 'rounded-2xl shadow-xl font-sans',
                confirmButton: 'px-5 py-2.5 rounded-xl font-bold text-sm'
              }
            });
          } else {
            alert('Silakan pilih jawaban terlebih dahulu!');
          }
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
    
    const student = window.getCurrentStudent();
    if (student) {
      await saveTestResult(student.id, this.jenis, this.skor);
      await checkAndUnlockBadges(student.id, true);
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
    let iconClass = "";
    
    if (this.skor >= 80) {
      feedback = "Wah, kemampuanmu sangat memuaskan!";
      alertClass = "bg-emerald-50 border-emerald-200 text-emerald-800";
      iconClass = "text-emerald-500 fa-solid fa-face-grin-stars";
    } else if (this.skor >= 60) {
      feedback = "Lumayan! Kamu sudah punya dasar yang cukup baik.";
      alertClass = "bg-blue-50 border-blue-200 text-blue-800";
      iconClass = "text-blue-500 fa-solid fa-thumbs-up";
    } else {
      feedback = "Tidak apa-apa kalau masih banyak salah. Yuk mulai belajar dari konsep dasar!";
      alertClass = "bg-amber-50 border-amber-200 text-amber-800";
      iconClass = "text-amber-500 fa-solid fa-lightbulb";
    }
    
    let html = `
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center mb-8">
        <h2 class="text-2xl font-bold text-slate-800 mb-2">Skor ${this.jenis.replace('_', ' ').toUpperCase()}</h2>
        <div class="text-6xl md:text-8xl font-black text-blue-600 my-6 drop-shadow-sm">${this.skor}</div>
        
        <div class="inline-flex items-center gap-3 px-6 py-4 border rounded-xl ${alertClass} max-w-xl mx-auto">
          <i class="${iconClass} text-2xl"></i>
          <span class="font-medium">${feedback}</span>
        </div>
        
        <div class="mt-10 flex flex-wrap justify-center gap-3">
          ${(() => {
            let nextUrl = 'materi/index.html';
            let nextLabel = 'Lanjut ke Tahap Berikutnya';
            if (this.nextAction) {
              nextUrl = this.nextAction.url;
              nextLabel = this.nextAction.label || nextLabel;
            } else if (this.jenis === 'tes_awal') {
              nextUrl = 'materi/index.html';
              nextLabel = 'Mulai Pelajari Materi';
            } else if (this.jenis === 'kuis') {
              nextUrl = 'hasil.html';
              nextLabel = 'Lihat Hasil Belajar & Lencana';
            }
            return `
              <a href="${nextUrl}" class="inline-flex items-center px-8 py-3.5 bg-blue-600 text-white font-bold text-sm sm:text-base rounded-xl hover:bg-blue-700 shadow-md hover:shadow-lg transition-all focus:ring-4 focus:ring-blue-300">
                ${nextLabel} <i class="fa-solid fa-arrow-right ml-2"></i>
              </a>
            `;
          })()}
        </div>
      </div>
      
      <div class="flex items-center mb-6 mt-12">
        <h3 class="text-xl font-bold text-slate-800"><i class="fa-solid fa-list-check text-blue-600 mr-2"></i> Pembahasan Jawaban</h3>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    `;
    
    this.soalArray.forEach((soal, index) => {
      const jawabanUser = this.jawabanSiswa[index];
      const isCorrect = jawabanUser === soal.jawaban_benar;
      const borderColor = isCorrect ? 'border-l-emerald-500' : 'border-l-red-500';
      const iconResult = isCorrect ? '<i class="fa-solid fa-circle-check text-emerald-500"></i>' : '<i class="fa-solid fa-circle-xmark text-red-500"></i>';
      
      html += `
        <div class="bg-white rounded-lg shadow-sm border border-slate-200 border-l-4 ${borderColor} p-6 h-full flex flex-col">
          <h4 class="font-bold text-slate-800 mb-4 text-lg">Soal ${index + 1}: <span class="font-normal font-mono bg-slate-100 px-2 py-1 rounded">${soal.pertanyaan}</span></h4>
          
          <div class="mb-4">
            <p class="text-slate-600 mb-1">Jawabanmu: <strong class="text-slate-800">${jawabanUser || '-'}</strong> ${iconResult}</p>
            ${!isCorrect ? `<p class="text-slate-600">Jawaban Benar: <strong class="text-emerald-600">${soal.jawaban_benar}</strong></p>` : ''}
          </div>
          
          <div class="mt-auto bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm">
            <strong class="text-slate-700 block mb-1"><i class="fa-solid fa-lightbulb text-amber-500 mr-1"></i> Pembahasan:</strong>
            <span class="text-slate-600">${soal.pembahasan}</span>
          </div>
        </div>
      `;
    });
    
    html += `</div>`;
    this.container.innerHTML = html;
  }
}
