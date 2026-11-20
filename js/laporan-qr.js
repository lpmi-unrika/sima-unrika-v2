// ==========================================
// PENGATURAN LOGO, CETAK QR & EKSPOR LAPORAN
// ==========================================
let tempLogoUnitDataUrl = null;
let tempLogoInstitusiDataUrl = null;

function terapkanPengaturanPengguna() {
  const s = getUserSettings();
  if (s.customTitle) {
    document.getElementById('sidebarTitle').textContent = s.customTitle;
    document.getElementById('inputCustomTitle').value = s.customTitle;
  }
  if (s.customSubtitle) {
    document.getElementById('sidebarSubtitle').textContent = s.customSubtitle;
    document.getElementById('inputCustomSubtitle').value = s.customSubtitle;
  }
  if (s.logoDataUrl) {
    document.getElementById('sidebarLogo').innerHTML = `<img src="${s.logoDataUrl}" class="w-full h-full object-contain bg-white p-1">`;
    document.getElementById('previewLogoImg').src = s.logoDataUrl;
    document.getElementById('previewLogoBox').classList.remove('hidden');
  } else {
    document.getElementById('sidebarLogo').innerHTML = currentProfile ? currentProfile.role.substring(0, 2).toUpperCase() : 'S';
  }
  if (s.logoInstitusiDataUrl) {
    document.getElementById('previewLogoInstitusiImg').src = s.logoInstitusiDataUrl;
    document.getElementById('previewLogoInstitusiBox').classList.remove('hidden');
  }
  if (s.formatTahun) document.getElementById('settingFormatTahun').value = s.formatTahun;
  if (s.digitUrut) document.getElementById('settingDigitUrut').value = s.digitUrut;
  if (s.kodeLokasi) document.getElementById('settingKodeLokasi').value = s.kodeLokasi;
  updateContohNomor();
}

function previewLogoFile(input, jenis) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    if (jenis === 'INSTITUSI') {
      tempLogoInstitusiDataUrl = e.target.result;
      document.getElementById('previewLogoInstitusiImg').src = tempLogoInstitusiDataUrl;
      document.getElementById('previewLogoInstitusiBox').classList.remove('hidden');
    } else {
      tempLogoUnitDataUrl = e.target.result;
      document.getElementById('previewLogoImg').src = tempLogoUnitDataUrl;
      document.getElementById('previewLogoBox').classList.remove('hidden');
    }
  };
  reader.readAsDataURL(file);
}

function simpanPengaturanLogo() {
  const existing = getUserSettings();
  saveUserSettings({
    customTitle: document.getElementById('inputCustomTitle').value.trim(),
    customSubtitle: document.getElementById('inputCustomSubtitle').value.trim(),
    logoDataUrl: tempLogoUnitDataUrl || existing.logoDataUrl || null,
    logoInstitusiDataUrl: tempLogoInstitusiDataUrl || existing.logoInstitusiDataUrl || null
  });
  terapkanPengaturanPengguna();
  alert('Pengaturan logo dan identitas dashboard berhasil disimpan!');
}

function resetLogoDefault() {
  const existing = getUserSettings();
  tempLogoUnitDataUrl = null;
  tempLogoInstitusiDataUrl = null;
  saveUserSettings({
    customTitle: '',
    customSubtitle: '',
    logoDataUrl: null,
    logoInstitusiDataUrl: null,
    formatTahun: existing.formatTahun,
    digitUrut: existing.digitUrut,
    kodeLokasi: existing.kodeLokasi
  });
  document.getElementById('previewLogoBox').classList.add('hidden');
  document.getElementById('previewLogoInstitusiBox').classList.add('hidden');
  terapkanPengaturanPengguna();
  alert('Logo dan judul dikembalikan ke pengaturan default.');
}

function updateContohNomor() {
  const fTahun = document.getElementById('settingFormatTahun').value;
  const dUrut = parseInt(document.getElementById('settingDigitUrut').value, 10);
  const kLok = (document.getElementById('settingKodeLokasi').value || 'LPMI').toUpperCase();
  const thn = fTahun === '4' ? '2026' : '26';
  const urut = '1'.padStart(dUrut, '0');
  document.getElementById('contohFormatNomor').textContent = `EL-${kLok}-${thn}-${urut}`;
}

function simpanPengaturanKode() {
  saveUserSettings({
    formatTahun: document.getElementById('settingFormatTahun').value,
    digitUrut: document.getElementById('settingDigitUrut').value,
    kodeLokasi: document.getElementById('settingKodeLokasi').value.trim().toUpperCase()
  });
  alert('Format nomor inventaris otomatis berhasil disimpan!');
}

function cetakDokumen(bodyClass) {
  document.body.classList.remove('printing-qr', 'printing-report');
  document.body.classList.add(bodyClass);
  window.print();
}

// ==========================================
// CETAK QR CODE SATUAN & MASSAL A4
// ==========================================
let itemsToPrintA4 = [];

function bukaCetakA4Satuan(id) {
  const item = allInventaris.find(i => i.id === id);
  if (!item) return;
  itemsToPrintA4 = [item];
  bukaModalCetakA4();
}

function bukaCetakA4Terpilih() {
  if (selectedBarangIds.size === 0) {
    alert('Centang minimal satu barang pada tabel terlebih dahulu.');
    return;
  }
  itemsToPrintA4 = allInventaris.filter(i => selectedBarangIds.has(i.id));
  bukaModalCetakA4();
}

function bukaCetakA4Semua() {
  const filtered = getFilteredInventaris();
  if (filtered.length === 0) {
    alert('Tidak ada data barang untuk dicetak.');
    return;
  }
  itemsToPrintA4 = filtered;
  bukaModalCetakA4();
}

function handlePresetUkuranChange() {
  const preset = document.getElementById('presetUkuranLabel').value;
  const customBox = document.getElementById('boxCustomUkuran');
  if (preset === 'CUSTOM') {
    customBox.classList.remove('hidden');
  } else {
    customBox.classList.add('hidden');
  }
  if (preset === '8x3') {
    document.getElementById('printLogoMode').value = 'SIDE';
  }
  renderGridCetakA4();
}

function getDimensiLabelCm() {
  const preset = document.getElementById('presetUkuranLabel').value;
  if (preset === '5x5') return { w: 5, h: 5 };
  if (preset === '8x3') return { w: 8, h: 3 };
  if (preset === '10x10') return { w: 10, h: 10 };
  const w = Math.max(2, Math.min(19, parseFloat(document.getElementById('customLebarCm').value) || 8));
  const h = Math.max(2, Math.min(27, parseFloat(document.getElementById('customTinggiCm').value) || 3));
  return { w, h };
}

function bukaModalCetakA4() {
  document.getElementById('modalCetakA4').classList.remove('hidden');
  renderGridCetakA4();
}

function renderGridCetakA4() {
  const grid = document.getElementById('gridLabelA4');
  const logoMode = document.getElementById('printLogoMode').value;
  const { w, h } = getDimensiLabelCm();
  const settings = getUserSettings();
  const logoUrl = settings.logoDataUrl || null;
  const headerLabel = settings.customTitle || 'INVENTARIS UNRIKA';

  const isHorizontal = w > h * 1.25;
  const pxPerCm = 37.795;
  const qrSizePx = isHorizontal
    ? Math.max(54, Math.round((h - 0.55) * pxPerCm))
    : Math.max(68, Math.round(Math.min(w - 1.3, h - 1.75) * pxPerCm));

  grid.innerHTML = '';

  itemsToPrintA4.forEach((item, idx) => {
    const card = document.createElement('div');
    card.style.width = `${w}cm`;
    card.style.height = `${h}cm`;
    card.style.boxSizing = 'border-box';
    card.className = 'border border-slate-900 rounded-md p-1.5 bg-white overflow-hidden break-inside-avoid flex ' +
      (isHorizontal ? 'flex-row items-center justify-between gap-2' : 'flex-col items-center justify-between text-center');

    const qrId = `qr-a4-canvas-${idx}`;

    if (isHorizontal) {
      const sideLogoHtml = (logoMode === 'SIDE' && logoUrl)
        ? `<img src="${logoUrl}" style="max-height: ${Math.max(22, (h * 10) - 12)}mm; max-width: ${Math.max(16, (w * 2.8))}mm;" class="object-contain shrink-0">`
        : '';

      card.innerHTML = `
        <div class="flex items-center gap-1.5 h-full min-w-0 flex-1">
          ${sideLogoHtml}
          <div class="min-w-0 flex-1 text-left leading-tight">
            <div class="text-[7px] font-bold uppercase tracking-wider text-slate-500 truncate">${headerLabel}</div>
            <div class="font-mono text-[10px] font-extrabold text-slate-950 truncate mt-0.5">${item.kode_barang}</div>
            <div class="text-[8.5px] font-semibold text-slate-800 line-clamp-2 mt-0.5">${item.nama_barang}</div>
            <div class="text-[7px] text-slate-600 truncate mt-0.5">Unit: ${item.unit_pemilik} • PIC: ${item.nama_pic || '-'}</div>
          </div>
        </div>
        <div class="relative flex items-center justify-center shrink-0">
          <div id="${qrId}"></div>
          ${(logoMode === 'CENTER' && logoUrl) ? `<img src="${logoUrl}" class="w-5 h-5 object-contain bg-white p-0.5 rounded border border-slate-300 absolute">` : ''}
        </div>
      `;
    } else {
      const topSideLogoHtml = (logoMode === 'SIDE' && logoUrl)
        ? `<img src="${logoUrl}" class="h-5 max-w-[36px] object-contain shrink-0">`
        : '';

      card.innerHTML = `
        <div class="w-full flex items-center justify-center gap-1.5 border-b border-slate-200 pb-0.5">
          ${topSideLogoHtml}
          <div class="text-[8px] font-extrabold uppercase tracking-wider text-slate-700 truncate">${headerLabel}</div>
        </div>
        <div class="relative flex items-center justify-center my-auto">
          <div id="${qrId}"></div>
          ${(logoMode === 'CENTER' && logoUrl) ? `<img src="${logoUrl}" class="w-7 h-7 object-contain bg-white p-0.5 rounded border border-slate-300 absolute">` : ''}
        </div>
        <div class="w-full leading-tight">
          <div class="font-mono text-[9.5px] font-extrabold text-slate-950 truncate">${item.kode_barang}</div>
          <div class="text-[8px] font-medium text-slate-800 truncate">${item.nama_barang}</div>
          <div class="text-[7px] text-slate-500 truncate">${item.unit_pemilik} | PIC: ${item.nama_pic || '-'}</div>
        </div>
      `;
    }

    grid.appendChild(card);

    new QRCode(document.getElementById(qrId), {
      text: `KODE: ${item.kode_barang} | BARANG: ${item.nama_barang} | UNIT: ${item.unit_pemilik}`,
      width: qrSizePx,
      height: qrSizePx,
      correctLevel: QRCode.CorrectLevel.H
    });
  });
}

// ==========================================
// EKSPOR LAPORAN RESMI (PDF A4 / EXCEL / CSV)
// ==========================================
function getDatasetLaporan() {
  const modeUnit = document.getElementById('lapFilterUnit').value;
  if (modeUnit === 'FOLLOW') return getFilteredInventaris();
  if (modeUnit === 'ALL') return allInventaris;
  return allInventaris.filter(i => i.unit_pemilik === modeUnit);
}

function bukaModalLaporanA4() {
  document.getElementById('modalLaporanA4').classList.remove('hidden');
  renderPratinjauLaporan();
}

function renderPratinjauLaporan() {
  const settings = getUserSettings();
  const logoUnit = settings.logoDataUrl || null;
  const logoInstitusi = settings.logoInstitusiDataUrl || logoUnit;

  document.getElementById('lapLogoKiriBox').innerHTML = logoInstitusi
    ? `<img src="${logoInstitusi}" class="w-16 h-16 object-contain">`
    : `<div class="w-14 h-14 rounded-full border-2 border-slate-800 flex items-center justify-center text-[9px] font-extrabold text-center">UNRIKA</div>`;

  document.getElementById('lapLogoKananBox').innerHTML = logoUnit
    ? `<img src="${logoUnit}" class="w-16 h-16 object-contain">`
    : `<div class="w-14 h-14 rounded-lg border-2 border-blue-900 flex items-center justify-center text-[9px] font-extrabold text-blue-900 text-center">LPMI</div>`;

  document.getElementById('prevLapJudul1').textContent = document.getElementById('lapJudul1').value;
  document.getElementById('prevLapJudul2').textContent = document.getElementById('lapJudul2').value;
  document.getElementById('prevLapTahun').textContent = document.getElementById('lapTahun').value;
  document.getElementById('prevLapRuang').textContent = document.getElementById('lapRuang').value;
  document.getElementById('prevLapGedung').textContent = document.getElementById('lapGedung').value;
  document.getElementById('prevLapTanggalTtd').textContent = document.getElementById('lapTanggalTtd').value;
  document.getElementById('prevLapJabatanTtd').textContent = document.getElementById('lapJabatanTtd').value;
  document.getElementById('prevLapNamaTtd').textContent = document.getElementById('lapNamaTtd').value;

  const data = getDatasetLaporan();
  document.getElementById('prevLapJumlahJenis').textContent = data.length;

  let sumTotal = 0;
  let sumBaik = 0;
  let sumRusak = 0;

  const tbody = document.getElementById('tbodyLaporanA4');
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="border border-slate-900 p-4 text-center text-slate-500">Tidak ada data aset untuk filter yang dipilih.</td></tr>';
  } else {
    tbody.innerHTML = data.map((item, idx) => {
      const tahunBeli = item.tanggal_masuk ? item.tanggal_masuk.split('-')[0] : '-';
      const jmlBaik = item.kondisi === 'Baik' ? item.jumlah : 0;
      const jmlRusak = item.kondisi !== 'Baik' ? item.jumlah : 0;
      const { lokasi, catatan } = pisahLokasiDanKeterangan(item.keterangan);

      sumTotal += item.jumlah;
      sumBaik += jmlBaik;
      sumRusak += jmlRusak;

      return `
        <tr>
          <td class="border border-slate-900 px-1 py-1 text-center">${idx + 1}</td>
          <td class="border border-slate-900 px-1.5 py-1 font-mono text-[9px] font-semibold">${item.kode_barang}</td>
          <td class="border border-slate-900 px-1.5 py-1 font-medium">${item.nama_barang}</td>
          <td class="border border-slate-900 px-1 py-1 text-center">${tahunBeli}</td>
          <td class="border border-slate-900 px-1 py-1 text-center font-bold">${item.jumlah}</td>
          <td class="border border-slate-900 px-1 py-1 text-center">${jmlBaik > 0 ? jmlBaik : '-'}</td>
          <td class="border border-slate-900 px-1 py-1 text-center">${jmlRusak > 0 ? jmlRusak : '-'}</td>
          <td class="border border-slate-900 px-1.5 py-1">${lokasi}</td>
          <td class="border border-slate-900 px-1.5 py-1">${item.nama_pic || '-'}</td>
          <td class="border border-slate-900 px-1.5 py-1">${catatan}</td>
        </tr>
      `;
    }).join('');
  }

  document.getElementById('tfootLaporanA4').innerHTML = `
    <tr class="bg-slate-100 font-extrabold">
      <td colspan="4" class="border border-slate-900 px-2 py-1.5 text-center uppercase">JUMLAH TOTAL</td>
      <td class="border border-slate-900 px-1 py-1.5 text-center">${sumTotal}</td>
      <td class="border border-slate-900 px-1 py-1.5 text-center">${sumBaik}</td>
      <td class="border border-slate-900 px-1 py-1.5 text-center">${sumRusak}</td>
      <td colspan="3" class="border border-slate-900 px-1.5 py-1.5"></td>
    </tr>
  `;
}

function buildRowsExport() {
  const data = getDatasetLaporan();
  return data.map((item, idx) => {
    const tahunBeli = item.tanggal_masuk ? item.tanggal_masuk.split('-')[0] : '-';
    const { lokasi, catatan } = pisahLokasiDanKeterangan(item.keterangan);
    return {
      'No': idx + 1,
      'Kode Inventaris': item.kode_barang,
      'Nama Aset (Barang)': item.nama_barang,
      'Kategori': item.kategori,
      'Unit Pemilik': item.unit_pemilik,
      'Tahun Masuk': tahunBeli,
      'Jumlah Total': item.jumlah,
      'Kondisi Baik': item.kondisi === 'Baik' ? item.jumlah : 0,
      'Kondisi Rusak': item.kondisi !== 'Baik' ? item.jumlah : 0,
      'Status Kondisi': item.kondisi,
      'Lokasi Penyimpanan': lokasi,
      'PIC Penanggung Jawab': item.nama_pic || '-',
      'Keterangan': catatan
    };
  });
}

function exportToExcel() {
  const rows = buildRowsExport();
  if (rows.length === 0) {
    alert('Tidak ada data untuk diunduh.');
    return;
  }
  if (typeof XLSX === 'undefined') {
    alert('Pustaka Excel sedang dimuat, silakan gunakan Unduh CSV atau coba sesaat lagi.');
    return;
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daftar Aset');
  const tgl = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Laporan_Inventaris_SIMA_${tgl}.xlsx`);
}

function exportToCsv() {
  const rows = buildRowsExport();
  if (rows.length === 0) {
    alert('Tidak ada data untuk diunduh.');
    return;
  }
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(';'),
    ...rows.map(r => headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(';'))
  ];
  const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Laporan_Inventaris_SIMA_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}