// soal-data.js
// Berisi data soal untuk tes awal, latihan, dan kuis

export const SOAL_TES_AWAL = [
  { id: "TA001", pertanyaan: "−5 + 8 = ...", pilihan: ["−13", "−3", "3", "13"], jawaban_benar: "3", pembahasan: "Bergerak 8 langkah ke kanan dari -5, berakhir di 3." },
  { id: "TA002", pertanyaan: "7 − 12 = ...", pilihan: ["−19", "−5", "5", "19"], jawaban_benar: "−5", pembahasan: "7 dikurangi 12 menghasilkan bilangan negatif karena 12 > 7." },
  { id: "TA003", pertanyaan: "−4 × 3 = ...", pilihan: ["−12", "−7", "7", "12"], jawaban_benar: "−12", pembahasan: "Negatif × positif = negatif. 4 × 3 = 12, maka hasilnya -12." },
  { id: "TA004", pertanyaan: "20 ÷ (−5) = ...", pilihan: ["−4", "−5", "4", "5"], jawaban_benar: "−4", pembahasan: "Positif ÷ negatif = negatif. 20 ÷ 5 = 4, maka hasilnya -4." },
  { id: "TA005", pertanyaan: "5 + 3 × 2 = ...", pilihan: ["16", "11", "13", "10"], jawaban_benar: "11", pembahasan: "Perkalian (3 × 2 = 6) dikerjakan lebih dahulu, lalu 5 + 6 = 11." }
];

export const SOAL_LATIHAN_DASAR = [
  { id: "L001", pertanyaan: "−15 + 8 = ...", pilihan: ["−23", "−7", "7", "23"], jawaban_benar: "−7", pembahasan: "Tanda berbeda: kurangkan (15 - 8 = 7), ikuti tanda bilangan terbesar (15 adalah negatif)." },
  { id: "L002", pertanyaan: "12 − (−7) = ...", pilihan: ["5", "−5", "19", "−19"], jawaban_benar: "19", pembahasan: "Kurang negatif sama dengan tambah positif. 12 + 7 = 19." },
  { id: "L003", pertanyaan: "−9 − 6 = ...", pilihan: ["−3", "3", "−15", "15"], jawaban_benar: "−15", pembahasan: "-9 - 6 = -9 + (-6). Tanda sama, dijumlahkan menjadi -15." },
  { id: "L004", pertanyaan: "−8 × (−6) = ...", pilihan: ["−48", "48", "−14", "14"], jawaban_benar: "48", pembahasan: "Negatif dikali negatif hasilnya positif. 8 × 6 = 48." },
  { id: "L005", pertanyaan: "−72 ÷ 9 = ...", pilihan: ["−8", "8", "−9", "9"], jawaban_benar: "−8", pembahasan: "Negatif dibagi positif hasilnya negatif." },
  { id: "L006", pertanyaan: "Pernyataan yang menunjukkan sifat komutatif adalah...", pilihan: ["5 + 0 = 5", "3 + 7 = 7 + 3", "(2 + 3) + 4 = 2 + (3 + 4)", "5 + (−5) = 0"], jawaban_benar: "3 + 7 = 7 + 3", pembahasan: "Sifat komutatif adalah pertukaran posisi." },
  { id: "L007", pertanyaan: "−12 + 12 = ...", pilihan: ["−24", "24", "0", "1"], jawaban_benar: "0", pembahasan: "Ini adalah sifat invers penjumlahan. Bilangan dijumlahkan dengan lawannya menghasilkan 0." }
];

export const SOAL_LATIHAN_CAMPURAN = [
  { id: "LC01", pertanyaan: "145 ÷ (−5) + 23 − 85 = ...", pilihan: ["−91", "−10", "−50", "91"], jawaban_benar: "−91", pembahasan: "145 ÷ (-5) = -29. Lalu -29 + 23 = -6. Lalu -6 - 85 = -91." },
  { id: "LC02", pertanyaan: "125 + 25 ÷ 5 − 4 × 7 = ...", pilihan: ["102", "88", "134", "140"], jawaban_benar: "102", pembahasan: "Bagi dan kali dulu: 25÷5=5, 4×7=28. Jadi 125 + 5 - 28 = 102." },
  { id: "LC03", pertanyaan: "100 − [20 + (−5)] × 3 = ...", pilihan: ["255", "55", "45", "15"], jawaban_benar: "55", pembahasan: "Kurung dulu: [20 + (-5)] = 15. Lalu kali: 15 × 3 = 45. Terakhir kurang: 100 - 45 = 55." },
  { id: "LC04", pertanyaan: "−60 ÷ 5 + 8 × (−3) − (−10) = ...", pilihan: ["−26", "−46", "−14", "10"], jawaban_benar: "−26", pembahasan: "Bagi: -60÷5=-12. Kali: 8×(-3)=-24. Persamaan: -12 + (-24) - (-10) = -36 + 10 = -26." },
  { id: "LC05", pertanyaan: "150 + 50 ÷ (−10) − (−5) × 4 = ...", pilihan: ["165", "125", "105", "145"], jawaban_benar: "165", pembahasan: "Bagi: 50÷(-10)=-5. Kali: (-5)×4=-20. Persamaan: 150 + (-5) - (-20) = 145 + 20 = 165." }
];

export const SOAL_LATIHAN_TAHAP_1 = [
  { 
    id: "LT1_01", 
    pertanyaan: "Manakah di antara bilangan-bilangan berikut yang memiliki nilai paling kecil?", 
    pilihan: ["−8", "−2", "0", "5"], 
    jawaban_benar: "−8", 
    pembahasan: "Pada garis bilangan, semakin jauh letak bilangan di sebelah kiri 0, maka nilainya semakin kecil. -8 terletak paling kiri dibanding pilihan lainnya." 
  },
  { 
    id: "LT1_02", 
    pertanyaan: "Nilai mutlak dari |−15| adalah ...", 
    pilihan: ["−15", "0", "15", "±15"], 
    jawaban_benar: "15", 
    pembahasan: "Nilai mutlak menyatakan jarak suatu bilangan terhadap titik 0. Karena jarak selalu bernilai positif atau nol, maka |-15| = 15." 
  },
  { 
    id: "LT1_03", 
    pertanyaan: "Pernyataan perbandingan tanda berikut ini yang bernilai BENAR adalah ...", 
    pilihan: ["−12 > −5", "−4 < −9", "0 < −3", "−7 < 2"], 
    jawaban_benar: "−7 < 2", 
    pembahasan: "Bilangan negatif selalu lebih kecil dari bilangan positif, sehingga -7 < 2 bernilai benar." 
  },
  { 
    id: "LT1_04", 
    pertanyaan: "Jika kamu berdiri di titik −3 pada garis bilangan lalu melangkah 5 satuan ke arah kanan, kamu akan tiba di angka ...", 
    pilihan: ["−8", "−2", "2", "8"], 
    jawaban_benar: "2", 
    pembahasan: "Melangkah ke kanan berarti menambahkan: -3 + 5 = 2." 
  }
];

// Helper filter soal latihan per tahapan belajar
export function getSoalLatihanByTahap(tahap) {
  const t = parseInt(tahap);
  switch (t) {
    case 1:
      return SOAL_LATIHAN_TAHAP_1;
    case 2:
      // Penjumlahan & Pengurangan
      return [
        SOAL_LATIHAN_DASAR[0], // L001
        SOAL_LATIHAN_DASAR[1], // L002
        SOAL_LATIHAN_DASAR[2], // L003
        SOAL_LATIHAN_DASAR[6]  // L007
      ];
    case 3:
      // Perkalian & Pembagian
      return [
        SOAL_LATIHAN_DASAR[3], // L004
        SOAL_LATIHAN_DASAR[4], // L005
        SOAL_LATIHAN_DASAR[5]  // L006
      ];
    case 4:
      // Operasi Campuran
      return SOAL_LATIHAN_CAMPURAN;
    default:
      return SOAL_LATIHAN_DASAR;
  }
}

// Soal Cerita
export const SOAL_CERITA = [
  { id: "SC01", judul: "Suhu", pertanyaan: "Suhu sebuah ruangan pada pagi hari adalah −4°C. Pada siang hari suhu naik 9°C, kemudian pada malam hari turun lagi 6°C. Berapakah suhu ruangan pada malam hari?", jawaban: "−1°C", pembahasan: "-4 + 9 - 6 = 5 - 6 = -1°C" },
  { id: "SC02", judul: "Kedalaman", pertanyaan: "Seekor lumba-lumba berada 8 meter di bawah permukaan laut. Lumba-lumba tersebut naik 5 meter kemudian turun lagi 3 meter. Pada kedalaman berapa lumba-lumba tersebut berada sekarang?", jawaban: "6 meter di bawah laut (-6)", pembahasan: "-8 + 5 - 3 = -3 - 3 = -6 meter (6 meter di bawah laut)" },
  { id: "SC03", judul: "Usaha Dagang", pertanyaan: "Seorang pedagang mengalami kerugian Rp50.000 pada hari pertama dan Rp30.000 pada hari kedua. Pada hari ketiga ia memperoleh keuntungan Rp75.000. Berapa hasil keseluruhan keuntungan/kerugian pedagang tersebut?", jawaban: "Rugi Rp5.000 (-5000)", pembahasan: "(-50.000) + (-30.000) + 75.000 = -80.000 + 75.000 = -5.000 (Rugi Rp5.000)" }
];

// Kuis digabung dari campuran beberapa tipe
export const SOAL_KUIS = [
  ...SOAL_TES_AWAL,
  ...SOAL_LATIHAN_DASAR.slice(0, 5),
  ...SOAL_LATIHAN_CAMPURAN
];


