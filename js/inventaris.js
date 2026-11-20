// ==========================================
// MANAJEMEN INVENTARIS & PENOMORAN KATEGORI
// ==========================================
function getPrefixKategoriAktif() {
  const val = document.getElementById('pilihKodeKategori').value;
  if (val === 'CUSTOM') {
    const custom = (document.getElementById('inputKodeKategoriCustom').value || 'BR').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return custom || 'BR';
  }
  return val.split('|')[0];
}

function handleKategoriChange() {
  const val = document.getElementById('pilihKodeKategori').value;
  const customInput = document.getElementById('inputKodeKategoriCustom');
  const labelInput = document.getElementById('kategoriBarang');

  if (val === 'CUSTOM') {
    customInput.classList.remove('hidden');
    customInput.focus();
  } else {
    customInput.classList.add('hidden');
    labelInput.value = val.split('|')[1];
  }
  generateKodeOtomatis(true);
}

async function hitungNomorUrutKategori(prefixKat, unit, tahunStr, excludeId = null) {
  const { data } = await sb
    .from('inventaris')
    .select('id, kode_barang, unit_pemilik')
    .eq('unit_pemilik', unit);

  const list = data || allInventaris.filter(i => i.unit_pemilik === unit);
  let maxUrut = 0;

  list.forEach(item => {
    if (excludeId && item.id === excludeId) return;
    const kode = (item.kode_barang || '').toUpperCase();
    const parts = kode.split('-');
    // Format: [KATEGORI]-[LOKASI/UNIT]-[TAHUN]-[URUT]
    if (parts.length >= 4 && parts[0] === prefixKat && parts[2] === tahunStr) {
      const angka = parseInt(parts[3], 10);
      if (!isNaN(angka) && angka > maxUrut) maxUrut = angka;
    }
  });

  return maxUrut + 1;
}

async function generateKodeOtomatis(syncDb = true) {
  const editId = document.getElementById('barangId').value;
  const settings = getUserSettings();
  const prefixKat = getPrefixKategoriAktif();
  const unit = document.getElementById('unitPemilik').value || 'LPMI';
  const kodeLokasiInput = (document.getElementById('kodeLokasiBarang').value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const kodeUnitDefault = unit === 'Rektorat' ? 'REKT' : 'LPMI';
  const kodeLokasi = kodeLokasiInput || settings.kodeLokasi || kodeUnitDefault;

  const tglInput = document.getElementById('tanggalMasuk').value;
  const tahunFull = tglInput ? tglInput.split('-')[0] : String(new Date().getFullYear());
  const formatTahun = settings.formatTahun || '2';
  const tahunStr = formatTahun === '4' ? tahunFull : tahunFull.slice(-2);
  const digitUrut = parseInt(settings.digitUrut || '3', 10);

  const statusEl = document.getElementById('statusSyncKode');
  if (syncDb && statusEl) statusEl.textContent = '⏳ Menyinkronkan urutan...';

  const nextUrut = await hitungNomorUrutKategori(prefixKat, unit, tahunStr, editId || null);
  const urutStr = String(nextUrut).padStart(digitUrut, '0');
  document.getElementById('kodeBarang').value = `${prefixKat}-${kodeLokasi}-${tahunStr}-${urutStr}`;

  if (statusEl) statusEl.textContent = `✓ Urutan ke-${nextUrut} untuk kategori ${prefixKat}`;
}

async function loadInventaris() {
  const { data, error } = await sb.from('inventaris').select('*').order('created_at', { ascending: false });
  if (error) {
    alert('Gagal memuat inventaris: ' + error.message);
    return;
  }
  allInventaris = data || [];
  updateStats();
  renderTable();
}

function updateStats() {
  const visibleData = allInventaris.filter(item =>
    currentProfile.role === 'admin' || item.unit_pemilik.toLowerCase() === currentProfile.role
  );

  const totalJenis = visibleData.length;
  const totalUnit = visibleData.reduce((sum, item) => sum + item.jumlah, 0);
  const kondisiBaik = visibleData.filter(i => i.kondisi === 'Baik').reduce((sum, item) => sum + item.jumlah, 0);
  const perluPerbaikan = visibleData.filter(i => i.kondisi !== 'Baik').reduce((sum, item) => sum + item.jumlah, 0);

  document.getElementById('statsContainer').innerHTML = `
    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <p class="text-xs font-semibold text-slate-500 uppercase">Total Baris Aset</p>
      <p class="text-2xl font-bold text-slate-800 mt-1">${totalJenis}</p>
    </div>
    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <p class="text-xs font-semibold text-slate-500 uppercase">Total Fisik Barang</p>
      <p class="text-2xl font-bold text-blue-900 mt-1">${totalUnit} Unit</p>
    </div>
    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <p class="text-xs font-semibold text-slate-500 uppercase">Kondisi Baik</p>
      <p class="text-2xl font-bold text-emerald-600 mt-1">${kondisiBaik} Unit</p>
    </div>
    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <p class="text-xs font-semibold text-slate-500 uppercase">Rusak Ringan / Berat</p>
      <p class="text-2xl font-bold text-amber-600 mt-1">${perluPerbaikan} Unit</p>
    </div>
  `;
}

function getFilteredInventaris() {
  const keyword = document.getElementById('searchInput').value.toLowerCase();
  const fKondisi = document.getElementById('filterKondisi').value;
  const fUnit = document.getElementById('filterUnit').value;

  return allInventaris.filter(item => {
    const matchSearch =
      item.nama_barang.toLowerCase().includes(keyword) ||
      item.kode_barang.toLowerCase().includes(keyword) ||
      (item.nama_pic || '').toLowerCase().includes(keyword) ||
      (item.keterangan || '').toLowerCase().includes(keyword);
    const matchKondisi = fKondisi === 'ALL' || item.kondisi === fKondisi;
    const matchUnit = fUnit === 'ALL' || item.unit_pemilik === fUnit;
    return matchSearch && matchKondisi && matchUnit;
  });
}

function renderTable() {
  const filtered = getFilteredInventaris();
  const tbody = document.getElementById('tabelInventaris');

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="p-6 text-center text-slate-400">Tidak ada data barang yang sesuai.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const bisaEdit = currentProfile.role === 'admin' || item.unit_pemilik.toLowerCase() === currentProfile.role;
    const badgeColor = item.kondisi === 'Baik'
      ? 'bg-emerald-100 text-emerald-700'
      : item.kondisi === 'Rusak Ringan' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';

    const fotoHtml = item.foto_url
      ? `<a href="${item.foto_url}" target="_blank"><img src="${item.foto_url}" class="w-12 h-12 object-cover rounded-lg border border-slate-200 hover:scale-105 transition"></a>`
      : `<div class="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 text-center">No Foto</div>`;

    const isChecked = selectedBarangIds.has(item.id) ? 'checked' : '';
    const { lokasi, catatan } = pisahLokasiDanKeterangan(item.keterangan);

    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="p-4">
          <input type="checkbox" ${isChecked} onchange="togglePilihBarang('${item.id}', this.checked)" class="rounded border-slate-300">
        </td>
        <td class="p-4">${fotoHtml}</td>
        <td class="p-4">
          <div class="font-mono text-xs font-bold text-slate-800">${item.kode_barang}</div>
          <button type="button" onclick="bukaCetakA4Satuan('${item.id}')" class="mt-1 text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-semibold">
            🖨️ Cetak QR
          </button>
        </td>
        <td class="p-4">
          <div class="font-semibold text-slate-900">${item.nama_barang}</div>
          <div class="text-xs text-slate-400">${item.kategori}</div>
        </td>
        <td class="p-4 text-xs font-medium text-slate-700">${lokasi}</td>
        <td class="p-4 text-xs text-slate-600 max-w-[180px]">${catatan}</td>
        <td class="p-4 font-bold">${item.jumlah}</td>
        <td class="p-4">
          <span class="px-2.5 py-1 rounded-full text-xs font-medium ${badgeColor}">${item.kondisi}</span>
        </td>
        <td class="p-4">
          <span class="px-2 py-0.5 rounded text-xs font-semibold ${item.unit_pemilik === 'LPMI' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}">
            ${item.unit_pemilik}
          </span>
          <div class="text-xs text-slate-600 mt-1">PIC: <strong>${item.nama_pic || '-'}</strong></div>
        </td>
        <td class="p-4 text-xs text-slate-500">
          <div>Masuk: <strong>${formatTanggalSaja(item.tanggal_masuk)}</strong></div>
          <div class="text-[11px] text-slate-400 mt-0.5">Unggah: ${formatWaktu(item.created_at)}</div>
        </td>
        <td class="p-4 text-right whitespace-nowrap space-x-2">
          ${bisaEdit ? `
            <button type="button" onclick="bukaModalPecah('${item.id}')" title="Pecah sebagian barang ke kondisi lain"
              class="text-amber-700 hover:underline font-semibold text-xs">Pecah</button>
            <button type="button" onclick="editBarang('${item.id}')" class="text-blue-700 hover:underline font-medium text-xs">Edit</button>
            <button type="button" onclick="hapusBarang('${item.id}', '${item.kode_barang}', '${item.nama_barang}')" class="text-red-600 hover:underline font-medium text-xs">Hapus</button>
          ` : '<span class="text-xs text-slate-400 italic">Lihat saja</span>'}
        </td>
      </tr>
    `;
  }).join('');

  document.getElementById('countSelected').textContent = selectedBarangIds.size;
}

function togglePilihBarang(id, checked) {
  if (checked) selectedBarangIds.add(id);
  else selectedBarangIds.delete(id);
  document.getElementById('countSelected').textContent = selectedBarangIds.size;
}

function togglePilihSemua(checked) {
  const filtered = getFilteredInventaris();
  filtered.forEach(item => {
    if (checked) selectedBarangIds.add(item.id);
    else selectedBarangIds.delete(item.id);
  });
  renderTable();
}

function handlePilihFotoBarang(input) {
  const file = input.files[0];
  if (!file) return;
  document.getElementById('namaFileFotoTerpilih').textContent = file.name;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('previewFotoBarangImg').src = e.target.result;
    document.getElementById('previewFotoBarangBox').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

async function openModalBarang() {
  document.getElementById('formBarang').reset();
  document.getElementById('barangId').value = '';
  document.getElementById('existingFotoUrl').value = '';
  document.getElementById('namaFileFotoTerpilih').textContent = 'Belum ada foto dipilih';
  document.getElementById('previewFotoBarangBox').classList.add('hidden');
  document.getElementById('modalTitle').textContent = 'Tambah Barang Inventaris';
  document.getElementById('tanggalMasuk').value = new Date().toISOString().split('T')[0];

  if (currentProfile.role === 'lpmi') document.getElementById('unitPemilik').value = 'LPMI';
  if (currentProfile.role === 'rektorat') document.getElementById('unitPemilik').value = 'Rektorat';

  const settings = getUserSettings();
  document.getElementById('kodeLokasiBarang').value = settings.kodeLokasi || '';
  document.getElementById('pilihKodeKategori').value = 'EL|Elektronik';
  document.getElementById('inputKodeKategoriCustom').classList.add('hidden');
  document.getElementById('kategoriBarang').value = 'Elektronik';

  document.getElementById('modalBarang').classList.remove('hidden');
  await generateKodeOtomatis(true);
}

function closeModalBarang() {
  document.getElementById('modalBarang').classList.add('hidden');
}

function editBarang(id) {
  const item = allInventaris.find(i => i.id === id);
  if (!item) return;

  document.getElementById('modalTitle').textContent = 'Edit Barang Inventaris';
  document.getElementById('barangId').value = item.id;
  document.getElementById('existingFotoUrl').value = item.foto_url || '';
  document.getElementById('kodeBarang').value = item.kode_barang;
  document.getElementById('namaBarang').value = item.nama_barang;
  document.getElementById('namaPic').value = item.nama_pic || '';
  document.getElementById('kategoriBarang').value = item.kategori;
  document.getElementById('jumlahBarang').value = item.jumlah;
  document.getElementById('kondisiBarang').value = item.kondisi;
  document.getElementById('unitPemilik').value = item.unit_pemilik;
  document.getElementById('tanggalMasuk').value = item.tanggal_masuk || new Date().toISOString().split('T')[0];

  const { lokasi, catatan } = pisahLokasiDanKeterangan(item.keterangan);
  document.getElementById('lokasiPenyimpananBarang').value = lokasi === '-' ? '' : lokasi;
  document.getElementById('keteranganBarang').value = catatan === '-' ? '' : catatan;

  const prefix = (item.kode_barang || '').split('-')[0];
  const opsiKategori = ['EL|Elektronik', 'TK|Teknologi/Komputer', 'FU|Furniture/Mebel', 'ATK|Alat Tulis Kantor', 'KD|Kendaraan/Operasional'];
  const ketemu = opsiKategori.find(o => o.startsWith(prefix + '|'));
  if (ketemu) {
    document.getElementById('pilihKodeKategori').value = ketemu;
    document.getElementById('inputKodeKategoriCustom').classList.add('hidden');
  } else {
    document.getElementById('pilihKodeKategori').value = 'CUSTOM';
    document.getElementById('inputKodeKategoriCustom').classList.remove('hidden');
    document.getElementById('inputKodeKategoriCustom').value = prefix;
  }

  if (item.foto_url) {
    document.getElementById('previewFotoBarangImg').src = item.foto_url;
    document.getElementById('previewFotoBarangBox').classList.remove('hidden');
    document.getElementById('namaFileFotoTerpilih').textContent = 'Foto tersimpan saat ini';
  } else {
    document.getElementById('previewFotoBarangBox').classList.add('hidden');
    document.getElementById('namaFileFotoTerpilih').textContent = 'Belum ada foto';
  }

  document.getElementById('modalBarang').classList.remove('hidden');
}

document.getElementById('formBarang').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btnSimpanBarang');
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  const id = document.getElementById('barangId').value;
  let fotoUrl = document.getElementById('existingFotoUrl').value || null;

  const fileGaleri = document.getElementById('fotoBarangFile').files[0];
  const fileKamera = document.getElementById('fotoBarangCamera').files[0];
  const fileUpload = fileKamera || fileGaleri;

  if (fileUpload) {
    const ext = fileUpload.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const { error: uploadError } = await sb.storage.from('foto-inventaris').upload(fileName, fileUpload);
    if (uploadError) {
      alert('Gagal mengunggah foto: ' + uploadError.message);
      btn.disabled = false;
      btn.textContent = 'Simpan Data';
      return;
    }
    const { data: urlData } = sb.storage.from('foto-inventaris').getPublicUrl(fileName);
    fotoUrl = urlData.publicUrl;
  }

  const lokasiInput = document.getElementById('lokasiPenyimpananBarang').value;
  const catatanInput = document.getElementById('keteranganBarang').value;
  const keteranganGabung = gabungLokasiDanKeterangan(lokasiInput, catatanInput);

  const payload = {
    kode_barang: document.getElementById('kodeBarang').value.trim().toUpperCase(),
    nama_barang: document.getElementById('namaBarang').value.trim(),
    nama_pic: document.getElementById('namaPic').value.trim(),
    kategori: document.getElementById('kategoriBarang').value.trim(),
    jumlah: parseInt(document.getElementById('jumlahBarang').value),
    kondisi: document.getElementById('kondisiBarang').value,
    unit_pemilik: document.getElementById('unitPemilik').value,
    tanggal_masuk: document.getElementById('tanggalMasuk').value,
    foto_url: fotoUrl,
    keterangan: keteranganGabung,
    updated_at: new Date()
  };

  let error;
  if (id) {
    ({ error } = await sb.from('inventaris').update(payload).eq('id', id));
    if (!error) await catatKegiatan('Edit Barang', `Mengubah data ${payload.kode_barang} (${payload.nama_barang})`);
  } else {
    ({ error } = await sb.from('inventaris').insert([payload]));
    if (!error) await catatKegiatan('Tambah Barang', `Menambahkan ${payload.kode_barang} - ${payload.nama_barang} (${payload.jumlah} unit)`);
  }

  btn.disabled = false;
  btn.textContent = 'Simpan Data';

  if (error) {
    alert('Gagal menyimpan data: ' + error.message);
  } else {
    closeModalBarang();
    await loadInventaris();
    await loadKegiatan();
  }
});

async function hapusBarang(id, kode, nama) {
  if (!confirm(`Yakin ingin menghapus "${kode} - ${nama}" dari daftar inventaris?`)) return;
  const { error } = await sb.from('inventaris').delete().eq('id', id);
  if (error) {
    alert('Gagal menghapus: ' + error.message);
  } else {
    selectedBarangIds.delete(id);
    await catatKegiatan('Hapus Barang', `Menghapus ${kode} (${nama})`);
    await loadInventaris();
    await loadKegiatan();
  }
}

// ==========================================
// PECAH KONDISI BARANG OTOMATIS
// ==========================================
let itemPecahAktif = null;

function bukaModalPecah(id) {
  const item = allInventaris.find(i => i.id === id);
  if (!item) return;
  if (item.jumlah < 2) {
    alert('Jumlah barang minimal 2 unit untuk dapat dipecah kondisinya.');
    return;
  }

  itemPecahAktif = item;
  document.getElementById('pecahBarangId').value = item.id;
  document.getElementById('pecahKodeAsal').textContent = item.kode_barang;
  document.getElementById('pecahNamaBarang').textContent = item.nama_barang;
  document.getElementById('pecahKondisiAsal').textContent = item.kondisi;
  document.getElementById('pecahLabelKondisiAsal').textContent = item.kondisi;
  document.getElementById('pecahTotalAwal').textContent = item.jumlah;

  document.getElementById('pecahJmlBaik').value = 0;
  document.getElementById('pecahJmlRusakRingan').value = 0;
  document.getElementById('pecahJmlRusakBerat').value = 0;

  document.getElementById('rowInputBaik').classList.toggle('hidden', item.kondisi === 'Baik');
  document.getElementById('rowInputRusakRingan').classList.toggle('hidden', item.kondisi === 'Rusak Ringan');
  document.getElementById('rowInputRusakBerat').classList.toggle('hidden', item.kondisi === 'Rusak Berat');

  hitungSisaPecah();
  document.getElementById('modalPecahKondisi').classList.remove('hidden');
}

function hitungSisaPecah() {
  if (!itemPecahAktif) return;
  const jBaik = itemPecahAktif.kondisi === 'Baik' ? 0 : (parseInt(document.getElementById('pecahJmlBaik').value) || 0);
  const jRingan = itemPecahAktif.kondisi === 'Rusak Ringan' ? 0 : (parseInt(document.getElementById('pecahJmlRusakRingan').value) || 0);
  const jBerat = itemPecahAktif.kondisi === 'Rusak Berat' ? 0 : (parseInt(document.getElementById('pecahJmlRusakBerat').value) || 0);

  const sisa = itemPecahAktif.jumlah - (jBaik + jRingan + jBerat);
  const el = document.getElementById('pecahSisaAsal');
  el.textContent = `${sisa} unit`;
  el.className = sisa < 0 ? 'text-base font-extrabold text-red-600' : 'text-base font-extrabold text-slate-900';
}

document.getElementById('formPecahKondisi').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!itemPecahAktif) return;

  const targetSplits = [];
  if (itemPecahAktif.kondisi !== 'Baik') {
    const v = parseInt(document.getElementById('pecahJmlBaik').value) || 0;
    if (v > 0) targetSplits.push({ kondisi: 'Baik', jumlah: v });
  }
  if (itemPecahAktif.kondisi !== 'Rusak Ringan') {
    const v = parseInt(document.getElementById('pecahJmlRusakRingan').value) || 0;
    if (v > 0) targetSplits.push({ kondisi: 'Rusak Ringan', jumlah: v });
  }
  if (itemPecahAktif.kondisi !== 'Rusak Berat') {
    const v = parseInt(document.getElementById('pecahJmlRusakBerat').value) || 0;
    if (v > 0) targetSplits.push({ kondisi: 'Rusak Berat', jumlah: v });
  }

  if (targetSplits.length === 0) {
    alert('Masukkan minimal 1 unit pada kondisi tujuan yang ingin dipisahkan.');
    return;
  }

  const totalPindah = targetSplits.reduce((s, x) => s + x.jumlah, 0);
  const sisaAsal = itemPecahAktif.jumlah - totalPindah;
  if (sisaAsal < 0) {
    alert('Total unit yang dipisahkan melebihi jumlah awal barang!');
    return;
  }

  const btn = document.getElementById('btnProsesPecah');
  btn.disabled = true;
  btn.textContent = 'Memproses...';

  const partsAsal = (itemPecahAktif.kode_barang || 'BR-LPMI-26-001').split('-');
  const prefixKat = partsAsal[0] || 'BR';
  const kodeLokasi = partsAsal[1] || (itemPecahAktif.unit_pemilik === 'Rektorat' ? 'REKT' : 'LPMI');
  const tahunStr = partsAsal[2] || String(new Date().getFullYear()).slice(-2);
  const settings = getUserSettings();
  const digitUrut = parseInt(settings.digitUrut || '3', 10);

  let nextUrut = await hitungNomorUrutKategori(prefixKat, itemPecahAktif.unit_pemilik, tahunStr);
  const kodeBaruTerbuat = [];

  for (const sp of targetSplits) {
    const kodeBaru = `${prefixKat}-${kodeLokasi}-${tahunStr}-${String(nextUrut).padStart(digitUrut, '0')}`;
    nextUrut++;

    const payloadBaru = {
      kode_barang: kodeBaru,
      nama_barang: itemPecahAktif.nama_barang,
      nama_pic: itemPecahAktif.nama_pic,
      kategori: itemPecahAktif.kategori,
      jumlah: sp.jumlah,
      kondisi: sp.kondisi,
      unit_pemilik: itemPecahAktif.unit_pemilik,
      tanggal_masuk: itemPecahAktif.tanggal_masuk,
      foto_url: itemPecahAktif.foto_url,
      keterangan: itemPecahAktif.keterangan,
      updated_at: new Date()
    };

    const { error: insErr } = await sb.from('inventaris').insert([payloadBaru]);
    if (insErr) {
      alert('Gagal membuat pecahan barang: ' + insErr.message);
      btn.disabled = false;
      btn.textContent = 'Proses Pecah Kondisi';
      return;
    }
    kodeBaruTerbuat.push(`${kodeBaru} (${sp.jumlah} ${sp.kondisi})`);
  }

  if (sisaAsal === 0) {
    await sb.from('inventaris').delete().eq('id', itemPecahAktif.id);
  } else {
    await sb.from('inventaris').update({ jumlah: sisaAsal, updated_at: new Date() }).eq('id', itemPecahAktif.id);
  }

  await catatKegiatan(
    'Pecah Kondisi Barang',
    `Memecah ${itemPecahAktif.kode_barang} (${itemPecahAktif.nama_barang}) menjadi: sisa ${sisaAsal} ${itemPecahAktif.kondisi}, dan kode baru ${kodeBaruTerbuat.join(', ')}`
  );

  btn.disabled = false;
  btn.textContent = 'Proses Pecah Kondisi';
  document.getElementById('modalPecahKondisi').classList.add('hidden');
  await loadInventaris();
  await loadKegiatan();
});