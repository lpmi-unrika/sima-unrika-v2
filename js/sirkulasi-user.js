// ==========================================
// PEMINJAMAN, AUTO-SCAN QR & RIWAYAT PENGGUNAAN
// ==========================================
let allPeminjamanAktif = [];
let html5QrInstance = null;
let activeScannerMode = null; // 'PINJAM' atau 'KEMBALI'
let isSedangMenyimpanPinjam = false;

function isIdentitasPinjamLengkap() {
  const nama = (document.getElementById('namaPeminjam')?.value || '').trim();
  const noHp = (document.getElementById('noHpPeminjam')?.value || '').trim();
  const keperluan = (document.getElementById('keperluanPinjam')?.value || '').trim();
  return nama.length > 0 && noHp.length > 0 && keperluan.length > 0;
}

function cekKelengkapanIdentitasPinjam() {
  const lengkap = isIdentitasPinjamLengkap();
  const box = document.getElementById('boxScanPinjam');
  const inputUsb = document.getElementById('inputScanUsbPinjam');
  const btnKamera = document.getElementById('btnToggleKameraPinjam');
  const statusEl = document.getElementById('statusScanPinjam');

  if (!box || !inputUsb || !btnKamera || !statusEl) return;

  if (lengkap) {
    box.className = 'bg-slate-50 border border-blue-200 rounded-xl p-3.5 space-y-2.5 transition';
    inputUsb.disabled = false;
    inputUsb.className = 'w-full px-3 py-2 rounded-lg border border-blue-300 bg-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500';
    inputUsb.placeholder = 'Klik di sini lalu tembak QR (langsung tersimpan otomatis)...';
    btnKamera.disabled = false;

    if (activeScannerMode !== 'PINJAM' && statusEl.textContent.startsWith('🔒')) {
      statusEl.textContent = '✅ Identitas lengkap — tembak QR dengan Scanner USB atau buka Kamera HP untuk otomatis mencatat peminjaman.';
      statusEl.className = 'text-[11px] font-semibold text-emerald-700';
    }
  } else {
    box.className = 'bg-slate-100 border border-slate-200 rounded-xl p-3.5 space-y-2.5 opacity-75 transition';
    inputUsb.disabled = true;
    inputUsb.value = '';
    inputUsb.className = 'w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-200 disabled:cursor-not-allowed font-mono text-xs';
    inputUsb.placeholder = 'Lengkapi identitas di atas untuk mengaktifkan scan...';
    btnKamera.disabled = true;
    statusEl.textContent = '🔒 Isi Nama Peminjam, No. HP, dan Keperluan terlebih dahulu sebelum memindai QR.';
    statusEl.className = 'text-[11px] font-medium text-amber-700';

    if (activeScannerMode === 'PINJAM') {
      hentikanKameraScanner();
    }
  }
}

function ekstrakKodeDariQr(rawText) {
  if (!rawText) return '';
  const text = String(rawText).trim();
  const match = text.match(/KODE\s*:\s*([^|\n\r]+)/i);
  if (match && match[1]) {
    return match[1].trim().toUpperCase();
  }
  return text.toUpperCase();
}

async function hentikanKameraScanner() {
  if (html5QrInstance) {
    try {
      await html5QrInstance.stop();
      html5QrInstance.clear();
    } catch (e) {}
    html5QrInstance = null;
  }

  const readerPinjam = document.getElementById('readerKameraPinjam');
  const readerKembali = document.getElementById('readerKameraKembali');
  const btnPinjam = document.getElementById('btnToggleKameraPinjam');
  const btnKembali = document.getElementById('btnToggleKameraKembali');

  if (readerPinjam) readerPinjam.classList.add('hidden');
  if (readerKembali) readerKembali.classList.add('hidden');
  if (btnPinjam) btnPinjam.textContent = '📷 Buka Kamera HP';
  if (btnKembali) btnKembali.textContent = '📷 Buka Kamera HP';
  activeScannerMode = null;
}

async function toggleKameraScanner(mode) {
  if (mode === 'PINJAM' && !isIdentitasPinjamLengkap()) {
    alert('Silakan lengkapi Nama Peminjam, No. HP, dan Keperluan terlebih dahulu.');
    document.getElementById('namaPeminjam').focus();
    return;
  }

  if (activeScannerMode === mode) {
    await hentikanKameraScanner();
    return;
  }

  await hentikanKameraScanner();

  const readerId = mode === 'PINJAM' ? 'readerKameraPinjam' : 'readerKameraKembali';
  const btnId = mode === 'PINJAM' ? 'btnToggleKameraPinjam' : 'btnToggleKameraKembali';
  const statusId = mode === 'PINJAM' ? 'statusScanPinjam' : 'statusScanKembali';

  const readerEl = document.getElementById(readerId);
  const btnEl = document.getElementById(btnId);
  const statusEl = document.getElementById(statusId);

  if (typeof Html5Qrcode === 'undefined') {
    alert('Pustaka kamera belum siap. Pastikan koneksi internet aktif lalu muat ulang halaman.');
    return;
  }

  readerEl.classList.remove('hidden');
  btnEl.textContent = '⏹️ Tutup Kamera';
  statusEl.textContent = '⏳ Membuka kamera... izinkan akses kamera pada browser Anda.';
  statusEl.className = 'text-[11px] font-semibold text-amber-700';

  try {
    html5QrInstance = new Html5Qrcode(readerId);
    activeScannerMode = mode;

    await html5QrInstance.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      async (decodedText) => {
        await hentikanKameraScanner();
        await prosesHasilScanQr(decodedText, mode);
      },
      () => {}
    );

    statusEl.textContent = '📷 Kamera aktif — arahkan ke stiker QR barang (otomatis simpan saat terbaca).';
    statusEl.className = 'text-[11px] font-semibold text-blue-800';
  } catch (err) {
    await hentikanKameraScanner();
    statusEl.textContent = '❌ Gagal membuka kamera: ' + err;
    statusEl.className = 'text-[11px] font-semibold text-red-600';
  }
}

async function handleScanUsbEnter(event, mode) {
  if (event.key === 'Enter') {
    event.preventDefault();
    if (mode === 'PINJAM' && !isIdentitasPinjamLengkap()) {
      alert('Lengkapi Nama Peminjam, No. HP, dan Keperluan terlebih dahulu!');
      document.getElementById('namaPeminjam').focus();
      return;
    }
    const input = event.target;
    const raw = input.value;
    input.value = '';
    if (raw.trim()) {
      await prosesHasilScanQr(raw, mode);
    }
  }
}

async function prosesHasilScanQr(rawText, mode) {
  const kodeTerbaca = ekstrakKodeDariQr(rawText);
  if (!kodeTerbaca) return;

  if (mode === 'PINJAM') {
    const statusEl = document.getElementById('statusScanPinjam');
    const barang = allInventaris.find(i => (i.kode_barang || '').toUpperCase() === kodeTerbaca);

    if (!barang) {
      statusEl.textContent = `❌ Kode "${kodeTerbaca}" tidak ditemukan di database inventaris.`;
      statusEl.className = 'text-[11px] font-semibold text-red-600';
      return;
    }

    const punyaAksesUnit = currentProfile.role === 'admin' ||
      barang.unit_pemilik.toLowerCase() === currentProfile.role;

    if (!punyaAksesUnit) {
      statusEl.textContent = `❌ Barang ${kodeTerbaca} milik unit ${barang.unit_pemilik} (bukan unit Anda).`;
      statusEl.className = 'text-[11px] font-semibold text-red-600';
      return;
    }

    if (barang.kondisi !== 'Baik') {
      statusEl.textContent = `⚠️ ${kodeTerbaca} (${barang.nama_barang}) berstatus "${barang.kondisi}" dan tidak dapat dipinjam.`;
      statusEl.className = 'text-[11px] font-semibold text-amber-700';
      return;
    }

    if (barang.jumlah <= 0) {
      statusEl.textContent = `⚠️ Stok ${kodeTerbaca} (${barang.nama_barang}) sedang habis (0 unit).`;
      statusEl.className = 'text-[11px] font-semibold text-amber-700';
      return;
    }

    const select = document.getElementById('pilihBarangPinjam');
    select.value = barang.id;
    statusEl.textContent = `⏳ QR terbaca (${barang.kode_barang} — ${barang.nama_barang}). Menyimpan peminjaman otomatis...`;
    statusEl.className = 'text-[11px] font-bold text-blue-800';

    // Langsung simpan peminjaman secara otomatis
    await eksekusiSimpanPeminjaman(barang.id, true);
  } else if (mode === 'KEMBALI') {
    tampilkanTransaksiKembaliUntukKode(kodeTerbaca);
  }
}

async function eksekusiSimpanPeminjaman(invId, dariAutoScan = false) {
  if (isSedangMenyimpanPinjam) return;

  const peminjam = document.getElementById('namaPeminjam').value.trim();
  const noHp = document.getElementById('noHpPeminjam').value.trim();
  const jmlPinjam = parseInt(document.getElementById('jumlahPinjam').value, 10) || 1;
  const keperluanInput = document.getElementById('keperluanPinjam').value.trim();

  if (!peminjam || !noHp || !keperluanInput) {
    alert('Nama Peminjam, No. HP, dan Keperluan wajib diisi!');
    return;
  }

  const barang = allInventaris.find(i => i.id === invId);
  if (!barang || jmlPinjam < 1 || jmlPinjam > barang.jumlah) {
    alert(`Jumlah pinjam (${jmlPinjam}) melebihi stok baik yang tersedia (${barang ? barang.jumlah : 0})!`);
    return;
  }

  isSedangMenyimpanPinjam = true;
  const statusEl = document.getElementById('statusScanPinjam');

  try {
    const keperluanLengkap = `[HP: ${noHp}] ${keperluanInput}`;

    const { error } = await sb.from('peminjaman').insert([{
      inventaris_id: barang.id,
      kode_barang: barang.kode_barang,
      nama_barang: barang.nama_barang,
      unit_pemilik: barang.unit_pemilik,
      nama_peminjam: peminjam,
      jumlah_pinjam: jmlPinjam,
      keperluan: keperluanLengkap,
      dicatat_oleh: currentUser.id,
      nama_pencatat: currentProfile.nama_lengkap
    }]);

    if (error) {
      alert('Gagal mencatat peminjaman: ' + error.message);
      if (statusEl) {
        statusEl.textContent = '❌ Gagal menyimpan: ' + error.message;
        statusEl.className = 'text-[11px] font-semibold text-red-600';
      }
      return;
    }

    await sb.from('inventaris').update({ jumlah: barang.jumlah - jmlPinjam }).eq('id', barang.id);
    await catatKegiatan(
      'Pinjam Barang',
      `${peminjam} (HP: ${noHp}) meminjam ${jmlPinjam} unit ${barang.kode_barang} (${barang.nama_barang}) — ${keperluanInput}`
    );

    await closeModalPinjam();
    await loadInventaris();
    await loadPeminjaman();
    await loadKegiatan();

    if (dariAutoScan) {
      alert(`✅ Peminjaman Otomatis Tercatat!\n\nBarang: ${barang.kode_barang} - ${barang.nama_barang} (${jmlPinjam} unit)\nPeminjam: ${peminjam} (${noHp})\nKeperluan: ${keperluanInput}`);
    }
  } finally {
    isSedangMenyimpanPinjam = false;
  }
}

function pisahNoHpDanKeperluan(rawKeperluan) {
  if (!rawKeperluan) return { noHp: '-', teks: '-' };
  const text = String(rawKeperluan).trim();
  const match = text.match(/^\[HP:\s*(.*?)\]\s*(.*)$/i);
  if (match) {
    return {
      noHp: match[1].trim() || '-',
      teks: match[2].trim() || '-'
    };
  }
  return { noHp: '-', teks: text || '-' };
}

function tampilkanTransaksiKembaliUntukKode(kodeTerbaca) {
  const statusEl = document.getElementById('statusScanKembali');
  const box = document.getElementById('hasilScanKembaliBox');

  const daftarPinjam = allPeminjamanAktif.filter(p =>
    (p.kode_barang || '').toUpperCase() === kodeTerbaca &&
    (currentProfile.role === 'admin' || p.unit_pemilik.toLowerCase() === currentProfile.role)
  );

  if (daftarPinjam.length === 0) {
    statusEl.textContent = `⚠️ Tidak ada transaksi peminjaman aktif untuk kode "${kodeTerbaca}".`;
    statusEl.className = 'text-[11px] font-semibold text-amber-700';
    box.innerHTML = '';
    return;
  }

  statusEl.textContent = `✅ Ditemukan ${daftarPinjam.length} transaksi aktif untuk kode ${kodeTerbaca}:`;
  statusEl.className = 'text-[11px] font-bold text-emerald-700';

  box.innerHTML = daftarPinjam.map(p => {
    const { noHp, teks } = pisahNoHpDanKeperluan(p.keperluan);
    return `
      <div class="p-3.5 rounded-xl border border-blue-200 bg-blue-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="text-xs space-y-0.5">
          <div class="font-mono font-bold text-blue-950">${p.kode_barang} — ${p.nama_barang}</div>
          <div>Peminjam: <strong>${p.nama_peminjam}</strong> (${p.jumlah_pinjam} unit)</div>
          <div class="text-slate-600">No. HP: <strong>${noHp}</strong> • Keperluan: ${teks}</div>
          <div class="text-slate-500">Waktu Pinjam: ${formatWaktu(p.tanggal_pinjam)}</div>
        </div>
        <button type="button"
          onclick="kembalikanBarang('${p.id}', '${p.inventaris_id}', ${p.jumlah_pinjam}, '${p.kode_barang}', '${p.nama_peminjam}', true)"
          class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-2 rounded-lg font-semibold shrink-0 shadow-sm">
          ✓ Konfirmasi Kembali
        </button>
      </div>
    `;
  }).join('');
}

async function loadPeminjaman() {
  const { data } = await sb.from('peminjaman').select('*').order('tanggal_pinjam', { ascending: false });
  if (!data) return;

  allPeminjamanAktif = data.filter(p => p.status === 'Dipinjam');

  const tbody = document.getElementById('tabelPeminjaman');
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="p-6 text-center text-slate-400">Belum ada riwayat peminjaman barang.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(p => {
    const isDipinjam = p.status === 'Dipinjam';
    const { noHp, teks } = pisahNoHpDanKeperluan(p.keperluan);
    return `
      <tr class="hover:bg-slate-50">
        <td class="p-4">
          <div class="font-mono text-xs font-bold">${p.kode_barang}</div>
          <div class="font-medium text-slate-800">${p.nama_barang}</div>
        </td>
        <td class="p-4 text-xs font-semibold">${p.unit_pemilik}</td>
        <td class="p-4">
          <div class="font-medium text-slate-800">${p.nama_peminjam}</div>
          <div class="text-xs text-slate-500">HP: ${noHp}</div>
        </td>
        <td class="p-4 font-bold">${p.jumlah_pinjam}</td>
        <td class="p-4 text-xs text-slate-600">${teks}</td>
        <td class="p-4 text-xs text-slate-500">${formatWaktu(p.tanggal_pinjam)}</td>
        <td class="p-4 text-xs text-slate-500">${formatWaktu(p.tanggal_kembali)}</td>
        <td class="p-4">
          <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${isDipinjam ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}">
            ${p.status}
          </span>
        </td>
        <td class="p-4 text-right">
          ${isDipinjam ? `
            <button type="button" onclick="kembalikanBarang('${p.id}', '${p.inventaris_id}', ${p.jumlah_pinjam}, '${p.kode_barang}', '${p.nama_peminjam}', false)"
              class="bg-blue-900 hover:bg-blue-800 text-white text-xs px-3 py-1.5 rounded-lg font-medium">
              Kembalikan
            </button>
          ` : '<span class="text-xs text-slate-400">Selesai</span>'}
        </td>
      </tr>
    `;
  }).join('');
}

function openModalPinjam() {
  const select = document.getElementById('pilihBarangPinjam');
  const tersedia = allInventaris.filter(i => i.jumlah > 0 && i.kondisi === 'Baik' && (
    currentProfile.role === 'admin' || i.unit_pemilik.toLowerCase() === currentProfile.role
  ));

  if (tersedia.length === 0) {
    alert('Tidak ada stok barang berstatus Baik yang tersedia untuk dipinjam pada unit Anda.');
    return;
  }

  select.innerHTML = tersedia.map(i =>
    `<option value="${i.id}">${i.kode_barang} - ${i.nama_barang} (Stok Baik: ${i.jumlah})</option>`
  ).join('');
  document.getElementById('formPinjam').reset();
  cekKelengkapanIdentitasPinjam();
  document.getElementById('modalPinjam').classList.remove('hidden');

  setTimeout(() => {
    const namaInput = document.getElementById('namaPeminjam');
    if (namaInput) namaInput.focus();
  }, 150);
}

async function closeModalPinjam() {
  await hentikanKameraScanner();
  document.getElementById('modalPinjam').classList.add('hidden');
}

function openModalScanKembali() {
  document.getElementById('hasilScanKembaliBox').innerHTML = '';
  document.getElementById('statusScanKembali').textContent = 'Menunggu pemindaian QR barang...';
  document.getElementById('statusScanKembali').className = 'text-[11px] text-slate-500';
  document.getElementById('modalScanKembali').classList.remove('hidden');

  setTimeout(() => {
    const usbInput = document.getElementById('inputScanUsbKembali');
    if (usbInput) usbInput.focus();
  }, 150);
}

async function closeModalScanKembali() {
  await hentikanKameraScanner();
  document.getElementById('modalScanKembali').classList.add('hidden');
}

document.getElementById('formPinjam').addEventListener('submit', async (e) => {
  e.preventDefault();
  const invId = document.getElementById('pilihBarangPinjam').value;
  await eksekusiSimpanPeminjaman(invId, false);
});

async function kembalikanBarang(pinjamId, invId, jmlKembali, kode, peminjam, dariModalScan = false) {
  if (!confirm(`Konfirmasi pengembalian ${jmlKembali} unit ${kode} dari ${peminjam}?`)) return;

  await sb.from('peminjaman').update({
    status: 'Dikembalikan',
    tanggal_kembali: new Date()
  }).eq('id', pinjamId);

  const barang = allInventaris.find(i => i.id === invId);
  if (barang) {
    await sb.from('inventaris').update({ jumlah: barang.jumlah + jmlKembali }).eq('id', invId);
  }

  await catatKegiatan('Kembalikan Barang', `${peminjam} mengembalikan ${jmlKembali} unit ${kode}`);
  await loadInventaris();
  await loadPeminjaman();
  await loadKegiatan();

  if (dariModalScan) {
    tampilkanTransaksiKembaliUntukKode(kode.toUpperCase());
    alert(`Pengembalian ${jmlKembali} unit ${kode} oleh ${peminjam} berhasil dicatat!`);
  }
}

// ==========================================
// RIWAYAT KEGIATAN & MANAJEMEN PENGGUNA
// ==========================================
async function loadKegiatan() {
  const { data } = await sb.from('riwayat_kegiatan').select('*').order('waktu', { ascending: false }).limit(100);
  if (!data) return;

  const tbody = document.getElementById('tabelKegiatan');
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-slate-400">Belum ada catatan aktivitas.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(k => `
    <tr class="hover:bg-slate-50">
      <td class="p-4 text-xs text-slate-500 whitespace-nowrap">${formatWaktu(k.waktu)}</td>
      <td class="p-4 font-medium">${k.pelaku}</td>
      <td class="p-4"><span class="px-2 py-0.5 rounded bg-slate-100 text-xs font-semibold">${k.role_pelaku}</span></td>
      <td class="p-4 font-semibold text-blue-900 text-xs">${k.aksi}</td>
      <td class="p-4 text-xs text-slate-600">${k.detail}</td>
    </tr>
  `).join('');
}

async function loadUsers() {
  const { data } = await sb.from('profiles').select('*').order('created_at', { ascending: true });
  if (!data) return;

  document.getElementById('tabelPengguna').innerHTML = data.map(u => `
    <tr class="hover:bg-slate-50">
      <td class="p-4 font-medium">${u.nama_lengkap}</td>
      <td class="p-4 text-slate-500">${u.email}</td>
      <td class="p-4">
        <select onchange="ubahRole('${u.id}', this.value)" class="border rounded px-2 py-1 text-xs bg-white uppercase font-semibold">
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
          <option value="lpmi" ${u.role === 'lpmi' ? 'selected' : ''}>Pengguna LPMI</option>
          <option value="rektorat" ${u.role === 'rektorat' ? 'selected' : ''}>Pengguna Rektorat</option>
        </select>
      </td>
      <td class="p-4">
        <span class="px-2.5 py-1 rounded-full text-xs font-medium ${u.status_aktif ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}">
          ${u.status_aktif ? 'Aktif' : 'Nonaktif'}
        </span>
      </td>
      <td class="p-4 text-right">
        ${u.id !== currentUser.id ? `
          <button type="button" onclick="toggleStatus('${u.id}', ${!u.status_aktif})" class="text-xs font-medium ${u.status_aktif ? 'text-red-600' : 'text-emerald-600'} hover:underline">
            ${u.status_aktif ? 'Nonaktifkan' : 'Aktifkan'}
          </button>
        ` : '<span class="text-xs text-slate-400">Akun Anda</span>'}
      </td>
    </tr>
  `).join('');
}

document.getElementById('formUserBaru').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btnBuatUser');
  btn.disabled = true;
  btn.textContent = 'Memproses...';

  const nama = document.getElementById('newNama').value.trim();
  const email = document.getElementById('newEmail').value.trim();
  const password = document.getElementById('newPassword').value;
  const role = document.getElementById('newRole').value;

  const tempClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
  });

  const { error } = await tempClient.auth.signUp({
    email,
    password,
    options: { data: { nama_lengkap: nama, role: role } }
  });

  if (error) {
    alert('Gagal membuat akun: ' + error.message);
  } else {
    await catatKegiatan('Buat Akun Baru', `Mendaftarkan akun ${email} sebagai ${role.toUpperCase()}`);
    alert('Akun pengguna berhasil dibuat!');
    document.getElementById('formUserBaru').reset();
    setTimeout(() => { loadUsers(); loadKegiatan(); }, 1000);
  }

  btn.disabled = false;
  btn.textContent = '+ Buat Akun';
});

async function ubahRole(userId, roleBaru) {
  await sb.from('profiles').update({ role: roleBaru }).eq('id', userId);
  loadUsers();
}

async function toggleStatus(userId, statusBaru) {
  await sb.from('profiles').update({ status_aktif: statusBaru }).eq('id', userId);
  loadUsers();
}

function switchTab(tab) {
  const tabs = ['inventaris', 'peminjaman', 'kegiatan', 'pengaturan', 'pengguna'];
  tabs.forEach(t => {
    const sec = document.getElementById('section-' + t);
    const nav = document.getElementById('nav-' + t);
    if (sec) sec.classList.toggle('hidden', t !== tab);
    if (nav) {
      nav.className = t === tab
        ? 'w-full text-left px-4 py-2.5 rounded-lg bg-blue-800 text-white font-medium flex items-center gap-3 text-sm'
        : (t === 'pengguna' && currentProfile.role !== 'admin'
            ? 'hidden'
            : 'w-full text-left px-4 py-2.5 rounded-lg text-blue-200 hover:bg-blue-900 font-medium flex items-center gap-3 text-sm');
    }
  });
}

async function logout() {
  await hentikanKameraScanner();
  await sb.auth.signOut();
  window.location.href = 'index.html';
}

// ==========================================
// INISIALISASI DASHBOARD & ROLE
// ==========================================
async function initDashboard() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return;
  }

  currentUser = session.user;
  const { data: profile, error } = await sb.from('profiles').select('*').eq('id', currentUser.id).single();

  if (error || !profile) {
    alert('Gagal memuat profil pengguna.');
    logout();
    return;
  }

  currentProfile = profile;
  document.getElementById('userNameDisplay').textContent = profile.nama_lengkap;
  document.getElementById('userRoleBadge').textContent = 'UNIT: ' + profile.role.toUpperCase();
  document.getElementById('settingTargetUserLabel').textContent = `${profile.nama_lengkap} (${profile.role.toUpperCase()})`;

  const unitSelect = document.getElementById('unitPemilik');
  const filterUnit = document.getElementById('filterUnit');

  if (profile.role === 'lpmi') {
    document.getElementById('sidebarTitle').textContent = 'SIMA LPMI';
    document.getElementById('sidebarSubtitle').textContent = 'Inventaris Unit LPMI';
    document.getElementById('headerInventarisTitle').textContent = 'Inventaris Barang LPMI';
    document.getElementById('headerInventarisDesc').textContent = 'Data aset, perlengkapan, dan sirkulasi barang unit LPMI';
    document.getElementById('lapJudul2').value = 'LEMBAGA PENJAMINAN MUTU INTERNAL';
    document.getElementById('lapRuang').value = 'LPMI';
    document.getElementById('lapGedung').value = 'LPMI';
    document.getElementById('lapJabatanTtd').value = 'Ketua LPMI';
    unitSelect.value = 'LPMI';
    unitSelect.disabled = true;
    filterUnit.value = 'LPMI';
  } else if (profile.role === 'rektorat') {
    document.getElementById('sidebarTitle').textContent = 'SIMA REKTORAT';
    document.getElementById('sidebarSubtitle').textContent = 'Inventaris Unit Rektorat';
    document.getElementById('headerInventarisTitle').textContent = 'Inventaris Barang Rektorat';
    document.getElementById('headerInventarisDesc').textContent = 'Data aset, perlengkapan, dan sirkulasi barang unit Rektorat';
    document.getElementById('lapJudul2').value = 'UNIT REKTORAT';
    document.getElementById('lapRuang').value = 'REKTORAT';
    document.getElementById('lapGedung').value = 'REKTORAT';
    document.getElementById('lapJabatanTtd').value = 'Kepala Bagian Rektorat';
    document.getElementById('lapNamaTtd').value = profile.nama_lengkap;
    unitSelect.value = 'Rektorat';
    unitSelect.disabled = true;
    filterUnit.value = 'Rektorat';
  } else if (profile.role === 'admin') {
    document.getElementById('sidebarTitle').textContent = 'SIMA TERPADU';
    document.getElementById('sidebarSubtitle').textContent = 'Manajemen Aset Lintas Unit';
    document.getElementById('headerInventarisTitle').textContent = 'Inventaris Barang Terpadu';
    document.getElementById('headerInventarisDesc').textContent = 'Pengelolaan aset dan inventaris seluruh unit kerja';
    unitSelect.disabled = false;
    document.getElementById('nav-pengguna').classList.remove('hidden');
    loadUsers();
  }

  const tglHariIni = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('lapTanggalTtd').value = `Batam, ${tglHariIni}`;

  terapkanPengaturanPengguna();
  await loadInventaris();
  await loadPeminjaman();
  await loadKegiatan();
}

initDashboard();