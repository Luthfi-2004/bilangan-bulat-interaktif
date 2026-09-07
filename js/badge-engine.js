import { getTestResults, getStudentBadges, unlockBadge } from './supabase-client.js';

export const BADGES = [
  { id: "b_pemula", icon: "🔰", nama: "Pemula", deskripsi: "Menyelesaikan Tes Awal" },
  { id: "b_rajin_belajar", icon: "📚", nama: "Rajin Belajar", deskripsi: "Membuka seluruh materi (simulasi)" },
  { id: "b_rajin_berlatih", icon: "✏️", nama: "Rajin Berlatih", deskripsi: "Menyelesaikan semua jenis latihan" },
  { id: "b_pemburu_skor", icon: "🎮", nama: "Pemburu Skor", deskripsi: "Mendapatkan skor game >= 80 (simulasi)" },
  { id: "b_jago_bilbul", icon: "🧠", nama: "Jago Bilangan Bulat", deskripsi: "Mendapatkan nilai kuis >= 80" },
  { id: "b_master", icon: "🏆", nama: "Master Operasi Campuran", deskripsi: "Mendapatkan nilai kuis >= 90" },
  { id: "b_champion", icon: "👑", nama: "Math Champion", deskripsi: "Mendapatkan semua badge lainnya" }
];

export async function checkAndUnlockBadges(studentId) {
  if (!studentId) return [];
  
  // Ambil data test results
  const results = await getTestResults(studentId);
  const currentBadges = await getStudentBadges(studentId);
  
  let newBadgesUnlocked = [];
  
  const hasTesAwal = results.some(r => r.jenis === 'tes_awal');
  const maxKuisScore = results.filter(r => r.jenis === 'kuis').reduce((max, r) => r.skor > max ? r.skor : max, 0);
  const hasLatihanDasar = results.some(r => r.jenis === 'latihan_dasar');
  const hasLatihanCampuran = results.some(r => r.jenis === 'latihan_campuran');
  
  // Logic check badge
  if (hasTesAwal && !currentBadges.includes("b_pemula")) {
    await unlockBadge(studentId, "b_pemula");
    newBadgesUnlocked.push("b_pemula");
    currentBadges.push("b_pemula");
  }
  
  if (hasLatihanDasar && hasLatihanCampuran && !currentBadges.includes("b_rajin_berlatih")) {
    await unlockBadge(studentId, "b_rajin_berlatih");
    newBadgesUnlocked.push("b_rajin_berlatih");
    currentBadges.push("b_rajin_berlatih");
  }
  
  if (maxKuisScore >= 80 && !currentBadges.includes("b_jago_bilbul")) {
    await unlockBadge(studentId, "b_jago_bilbul");
    newBadgesUnlocked.push("b_jago_bilbul");
    currentBadges.push("b_jago_bilbul");
  }
  
  if (maxKuisScore >= 90 && !currentBadges.includes("b_master")) {
    await unlockBadge(studentId, "b_master");
    newBadgesUnlocked.push("b_master");
    currentBadges.push("b_master");
  }
  
  // Jika sudah 6 badge, beri Math Champion
  if (currentBadges.length >= 6 && !currentBadges.includes("b_champion")) {
    await unlockBadge(studentId, "b_champion");
    newBadgesUnlocked.push("b_champion");
  }
  
  return newBadgesUnlocked;
}
