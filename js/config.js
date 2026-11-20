// ==========================================
// KONFIGURASI SUPABASE & HELPER GLOBAL
// ==========================================
const SUPABASE_URL = 'https://prbxzgplgphvnwgnfhon.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByYnh6Z3BsZ3Bodm53Z25maG9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwODEyOTMsImV4cCI6MjExMDY1NzI5M30.v3eDXKjtSaH0Ypt2zx-lF_tgsWVmhRWQ3AGRRX8vYMI';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentProfile = null;
let allInventaris = [];
let selectedBarangIds = new Set();

function formatWaktu(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function formatTanggalSaja(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function pisahLokasiDanKeterangan(rawKeterangan) {
  if (!rawKeterangan) return { lokasi: '-', catatan: '-' };
  const text = String(rawKeterangan).trim();
  const match = text.match(/^\[LOKASI:\s*(.*?)\]\s*(.*)$/i);
  if (match) {
    return {
      lokasi: match[1].trim() || '-',
      catatan: match[2].trim() || '-'
    };
  }
  return { lokasi: '-', catatan: text || '-' };
}

function gabungLokasiDanKeterangan(lokasi, catatan) {
  const lok = (lokasi || '').trim();
  const ket = (catatan || '').trim();
  if (lok && ket) return `[LOKASI: ${lok}] ${ket}`;
  if (lok) return `[LOKASI: ${lok}]`;
  return ket;
}

function getUserSettingsKey() {
  return currentUser ? `sima_settings_${currentUser.id}` : 'sima_settings_default';
}

function getUserSettings() {
  try {
    return JSON.parse(localStorage.getItem(getUserSettingsKey())) || {};
  } catch (e) {
    return {};
  }
}

function saveUserSettings(obj) {
  const current = getUserSettings();
  localStorage.setItem(getUserSettingsKey(), JSON.stringify({ ...current, ...obj }));
}

async function catatKegiatan(aksi, detail) {
  if (!currentProfile) return;
  await sb.from('riwayat_kegiatan').insert([{
    pelaku: currentProfile.nama_lengkap,
    role_pelaku: currentProfile.role.toUpperCase(),
    aksi: aksi,
    detail: detail
  }]);
}