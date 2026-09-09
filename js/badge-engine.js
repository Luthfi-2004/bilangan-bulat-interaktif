import { getTestResults, getStudentBadges, unlockBadge, getStudentProgress } from './supabase-client.js';

export const BADGES = [
  { id: "b_pemula", icon: "🔰", nama: "Pemula", deskripsi: "Menyelesaikan Tes Awal" },
  { id: "b_rajin_belajar", icon: "📚", nama: "Rajin Belajar", deskripsi: "Membuka seluruh 9 materi pembelajaran" },
  { id: "b_rajin_berlatih", icon: "✏️", nama: "Rajin Berlatih", deskripsi: "Menyelesaikan semua jenis latihan" },
  { id: "b_pemburu_skor", icon: "🎮", nama: "Pemburu Skor", deskripsi: "Mendapatkan skor game >= 80" },
  { id: "b_jago_bilbul", icon: "🧠", nama: "Jago Bilangan Bulat", deskripsi: "Rata-rata nilai latihan (dasar & campuran) >= 80" },
  { id: "b_master", icon: "🏆", nama: "Master Operasi Campuran", deskripsi: "Mendapatkan nilai Kuis Akhir >= 90" },
  { id: "b_champion", icon: "👑", nama: "Math Champion", deskripsi: "Mendapatkan semua 6 badge lainnya" }
];

export async function checkAndUnlockBadges(studentId, shouldNotify = false) {
  if (!studentId) return [];
  
  // Ambil data dari database
  const results = await getTestResults(studentId);
  const currentBadges = await getStudentBadges(studentId);
  const progress = await getStudentProgress(studentId);
  
  let newBadgesUnlocked = [];
  
  // Kalkulasi kondisi
  const hasTesAwal = results.some(r => r.jenis === 'tes_awal');
  const hasLatihanDasar = results.some(r => r.jenis === 'latihan_dasar');
  const hasLatihanCampuran = results.some(r => r.jenis === 'latihan_campuran');
  
  const maxGameScore = results.filter(r => r.jenis === 'game').reduce((max, r) => r.skor > max ? r.skor : max, 0);
  const maxKuisScore = results.filter(r => r.jenis === 'kuis').reduce((max, r) => r.skor > max ? r.skor : max, 0);
  
  const latihanDasarMax = results.filter(r => r.jenis === 'latihan_dasar').reduce((max, r) => r.skor > max ? r.skor : max, 0);
  const latihanCampuranMax = results.filter(r => r.jenis === 'latihan_campuran').reduce((max, r) => r.skor > max ? r.skor : max, 0);
  const avgLatihan = (hasLatihanDasar && hasLatihanCampuran) ? (latihanDasarMax + latihanCampuranMax) / 2 : 0;
  
  // Total materi = 9 (berdasarkan default materi dan slug 1-9)
  const uniqueMateriCompleted = progress ? progress.filter(p => (p.persentase_penguasaan || 0) > 0).length : 0;
  
  // Logic check badge 1-6
  const checkAndAdd = async (condition, badgeId) => {
    if (condition && !currentBadges.includes(badgeId)) {
      await unlockBadge(studentId, badgeId);
      const badgeInfo = BADGES.find(b => b.id === badgeId);
      if (badgeInfo) newBadgesUnlocked.push(badgeInfo);
      currentBadges.push(badgeId);
    }
  };

  await checkAndAdd(hasTesAwal, "b_pemula");
  await checkAndAdd(hasLatihanDasar && hasLatihanCampuran, "b_rajin_berlatih");
  await checkAndAdd(uniqueMateriCompleted >= 9, "b_rajin_belajar");
  await checkAndAdd(maxGameScore >= 80, "b_pemburu_skor");
  await checkAndAdd(avgLatihan >= 80, "b_jago_bilbul");
  await checkAndAdd(maxKuisScore >= 90, "b_master");
  
  // Badge ke-7: Jika sudah memiliki 6 badge lainnya, beri Math Champion
  if (currentBadges.length >= 6 && !currentBadges.includes("b_champion")) {
    await unlockBadge(studentId, "b_champion");
    const champ = BADGES.find(b => b.id === "b_champion");
    if (champ) newBadgesUnlocked.push(champ);
  }
  
  if (shouldNotify && newBadgesUnlocked.length > 0) {
    notifyUnlockedBadges(newBadgesUnlocked);
  }
  
  return newBadgesUnlocked;
}

/**
 * Menampilkan notifikasi popup animasi bila ada lencana yang baru terbuka
 */
export function notifyUnlockedBadges(badges) {
  if (!badges || badges.length === 0) return;

  const names = badges.map(b => `<div class="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 font-bold text-sm my-1 flex items-center gap-2"><span class="text-xl">${b.icon}</span> ${b.nama} <span class="text-xs text-amber-700 font-normal">(${b.deskripsi})</span></div>`).join('');

  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: '🎉 Lencana Terbuka!',
      html: `
        <p class="text-slate-600 text-sm mb-3">Hebat! Kamu berhasil membuka lencana baru:</p>
        <div class="text-left space-y-1">${names}</div>
        <p class="text-xs text-slate-400 mt-4">Koleksi lencana lengkapmu dapat dilihat di menu <strong>Pencapaian</strong>.</p>
      `,
      icon: 'success',
      confirmButtonText: 'Keren, Teruskan!',
      confirmButtonColor: '#2563eb',
      customClass: {
        popup: 'rounded-2xl shadow-xl font-sans',
        confirmButton: 'px-5 py-2.5 rounded-xl font-bold text-sm'
      }
    });
  }
}
