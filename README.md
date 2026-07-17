# GemaNusa Lite

**GemaNusa Lite** adalah starter webapp untuk LIDM 2026 Divisi IPDP: HP sebagai seismograf mini untuk belajar getaran dan keselamatan bangunan.

## Fitur
- Halaman masalah nyata, tujuan belajar, pre-test, prediksi, eksperimen, analisis, refleksi, dan post-test.
- Membaca sensor `DeviceMotionEvent`/accelerometer smartphone.
- Grafik getaran real-time berbasis canvas, tanpa library eksternal.
- Simpan data Model A dan Model B.
- Bandingkan getaran maksimum.
- NusaMentor rule-based sederhana.
- Export hasil ke CSV.
- PWA sederhana dengan service worker.

## Cara menjalankan di laptop
Karena sensor HP biasanya butuh HTTPS atau localhost, jangan hanya membuka file HTML langsung untuk uji sensor.

Cara lokal:
```bash
cd gemanusa-lite
python -m http.server 8000
```

Buka:
```text
http://localhost:8000
```

## Cara uji di HP
Cara paling mudah:
1. Upload folder ini ke GitHub.
2. Aktifkan GitHub Pages.
3. Buka link GitHub Pages dari Chrome Android.
4. Tekan **Mulai Sensor**.
5. Jika sensor tidak muncul, cek izin motion sensor di browser.

Alternatif hosting cepat:
- Netlify
- Vercel
- GitHub Pages

## Catatan penting untuk demo
- Gunakan Chrome Android.
- Letakkan HP di papan getar dengan aman.
- Tekan **Kalibrasi** saat HP diam.
- Uji Model A terlebih dahulu, simpan.
- Reset data.
- Uji Model B, simpan.
- Buka halaman **Bandingkan Hasil**.

## Struktur file
```text
gemanusa-lite/
├── index.html
├── style.css
├── app.js
├── manifest.json
├── service-worker.js
└── assets/
    ├── icon.svg
    └── wave.svg
```

## Prioritas pengembangan berikutnya
1. Rapikan tampilan sesuai identitas lomba.
2. Tambahkan foto alat dan miniatur.
3. Tambahkan dashboard guru sederhana.
4. Tambahkan data uji coba siswa.
5. Buat video demo 2–3 menit.
