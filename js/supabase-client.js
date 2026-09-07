// supabase-client.js
// We use ES Modules to import supabase from a CDN since this is a simple static site
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// IMPORTANT: In a real environment, load these from environment variables.
// For this simple static app, we're using a config pattern.
const SUPABASE_URL = "https://epcpqnrewpddcihctzjj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwY3BxbnJld3BkZGNpaGN0empqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NTA1OTUsImV4cCI6MjEwNDMyNjU5NX0.USO4T_JWYJfnDpX_i9f89rigbi8g45_SogY2KaTBvks";

// Initialize Supabase Client
let supabase = null;
try {
  if (SUPABASE_URL !== "https://epcpqnrewpddcihctzjj.supabase.co") {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.warn("Supabase tidak diinisialisasi. Mode offline.");
}

// ----------------------------------------------------
// API Functions
// ----------------------------------------------------

export async function loginOrRegisterStudent(name) {
  if (!supabase) return { id: 'local-user-' + Date.now(), name }; // Fallback
  
  // Check if student exists
  let { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('name', name)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
    console.error("Error finding student:", error);
    return null;
  }

  // If not exists, insert
  if (!data) {
    const { data: newStudent, error: insertError } = await supabase
      .from('students')
      .insert([{ name }])
      .select()
      .single();
      
    if (insertError) {
      console.error("Error creating student:", insertError);
      return null;
    }
    return newStudent;
  }

  return data;
}

export async function saveTestResult(studentId, jenis, skor) {
  if (!supabase) return { success: true, localOnly: true };

  const { data, error } = await supabase
    .from('test_results')
    .insert([{ student_id: studentId, jenis, skor }]);

  if (error) {
    console.error("Error saving test result:", error);
    return false;
  }
  return true;
}

export async function getTestResults(studentId) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('test_results')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error getting test results:", error);
    return [];
  }
  return data;
}

export async function saveStudentProgress(studentId, materi, persentase) {
  if (!supabase) return { success: true };
  
  // Check existing progress
  const { data: existing } = await supabase
    .from('student_progress')
    .select('*')
    .eq('student_id', studentId)
    .eq('materi', materi)
    .single();
    
  if (existing) {
    // Only update if new percentage is higher
    if (persentase > existing.persentase_penguasaan) {
      const { error } = await supabase
        .from('student_progress')
        .update({ persentase_penguasaan: persentase })
        .eq('id', existing.id);
      return !error;
    }
    return true; // No update needed
  } else {
    // Insert new
    const { error } = await supabase
      .from('student_progress')
      .insert([{ student_id: studentId, materi, persentase_penguasaan: persentase }]);
    return !error;
  }
}

export async function unlockBadge(studentId, badgeId) {
  if (!supabase) return { success: true };
  
  const { data: existing } = await supabase
    .from('student_badges')
    .select('*')
    .eq('student_id', studentId)
    .eq('badge_id', badgeId)
    .single();
    
  if (!existing) {
    const { error } = await supabase
      .from('student_badges')
      .insert([{ student_id: studentId, badge_id: badgeId }]);
    return !error;
  }
  return true;
}

export async function getStudentBadges(studentId) {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('student_badges')
    .select('badge_id')
    .eq('student_id', studentId);
    
  if (error) return [];
  return data.map(b => b.badge_id);
}
