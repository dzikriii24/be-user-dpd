const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load Config
// PENTING: Load dotenv sebelum load file database agar process.env terbaca
dotenv.config(); 

const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Biar frontend bisa akses
app.use(express.json({ limit: '10mb' })); // Diperbesar agar bisa upload foto (Base64)
app.use(express.static('public')); // Untuk akses folder foto/uploads

// Pastikan folder uploads ada
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Route Test Sederhana
app.get('/', (req, res) => {
    res.send('🚀 Server API User Absensi Siap!');
});

// --- API TEST DATABASE CONNECTION ---
app.get('/api/test-db', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT 1 + 1 AS result');
        res.json({
            status: 'success',
            message: 'Database Terhubung!',
            result: rows[0].result
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Contoh Route Test Database Langsung di Browser
app.get('/api/test-users', async (req, res) => {
    try {
        const [users] = await db.query('SELECT * FROM users');
        res.json({
            status: 'success',
            message: 'Koneksi DB Aman',
            data: users
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- API LOGIN ---
app.post('/api/login', async (req, res) => {
    const { nip, password } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM users WHERE nip = ? AND password = ?', [nip, password]);
        
        if (users.length > 0) {
            const user = users[0];
            res.json({
                status: 'success',
                message: 'Login Berhasil',
                data: {
                    id: user.id,
                    nama: user.nama,
                    nip: user.nip,
                    role: user.role
                }
            });
        } else {
            res.status(401).json({ status: 'error', message: 'NIP atau Password salah!' });
        }
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// --- API RIWAYAT ABSENSI ---
app.get('/api/riwayat-absensi/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        // Ambil data absensi urut dari yang terbaru
        const [rows] = await db.query(
            'SELECT * FROM absensi WHERE user_id = ? ORDER BY tanggal DESC, jam_masuk DESC', 
            [userId]
        );
        res.json({ status: 'success', data: rows });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// --- API RIWAYAT LAPORAN ---
app.get('/api/riwayat-laporan/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const [rows] = await db.query(
            'SELECT * FROM laporan WHERE user_id = ? ORDER BY tanggal DESC, created_at DESC', 
            [userId]
        );
        
        // Parsing JSON checklist karena di DB tersimpan sebagai string/JSON
        const parsedRows = rows.map(row => ({
            ...row,
            checklist_json: typeof row.checklist_json === 'string' 
                ? JSON.parse(row.checklist_json) 
                : row.checklist_json
        }));

        res.json({ status: 'success', data: parsedRows });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// --- API SIMPAN ABSEN MASUK ---
app.post('/api/absensi', async (req, res) => {
    const { user_id, tanggal, jam_masuk, shift, status, is_late, lokasi, qr_code_data } = req.body;
    try {
        await db.query(
            'INSERT INTO absensi (user_id, tanggal, jam_masuk, shift, status, is_late, lokasi, qr_code_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [user_id, tanggal, jam_masuk, shift, status, is_late, lokasi, qr_code_data]
        );
        res.json({ status: 'success', message: 'Absen masuk berhasil disimpan' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// --- API SIMPAN ABSEN PULANG ---
app.post('/api/absensi-pulang', async (req, res) => {
    const { user_id, tanggal, jam_pulang } = req.body;
    try {
        // Update jam pulang berdasarkan user dan tanggal hari ini
        await db.query(
            'UPDATE absensi SET jam_pulang = ? WHERE user_id = ? AND tanggal = ?',
            [jam_pulang, user_id, tanggal]
        );
        res.json({ status: 'success', message: 'Absen pulang berhasil disimpan' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// --- API SIMPAN LAPORAN (HARIAN / DARURAT) ---
app.post('/api/laporan', async (req, res) => {
    let { user_id, tanggal, isi_laporan, checklist_json, foto_bukti } = req.body;
    try {
        // PROSES UPLOAD FOTO (Base64 -> File)
        if (foto_bukti && foto_bukti.startsWith('data:image')) {
            // 1. Ambil ekstensi & data
            const matches = foto_bukti.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                const buffer = Buffer.from(matches[2], 'base64');
                
                // 2. Buat nama file unik
                const filename = `laporan-${Date.now()}-${Math.round(Math.random() * 1000)}.${ext}`;
                const filepath = path.join(uploadDir, filename);

                // 3. Simpan file ke folder public/uploads
                fs.writeFileSync(filepath, buffer);

                // 4. Update variabel foto_bukti jadi path URL (bukan base64 lagi)
                foto_bukti = `/uploads/${filename}`;
            }
        }

        await db.query(
            'INSERT INTO laporan (user_id, tanggal, isi_laporan, checklist_json, foto_bukti) VALUES (?, ?, ?, ?, ?)',
            [user_id, tanggal, isi_laporan, JSON.stringify(checklist_json), foto_bukti]
        );
        res.json({ status: 'success', message: 'Laporan berhasil dikirim' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// --- API UPDATE PROFIL (Hanya Nama) ---
app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { nama } = req.body;
    try {
        await db.query('UPDATE users SET nama = ? WHERE id = ?', [nama, id]);
        res.json({ status: 'success', message: 'Profil berhasil diperbarui' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// --- API NOTIFIKASI (MOCK) ---
app.get('/api/notifications', (req, res) => {
    // Simulasi notifikasi dari Admin
    const notifications = [
        { id: 1, title: 'Jadwal Shift Baru', message: 'Jadwal shift bulan depan sudah keluar. Silakan cek di papan pengumuman.', date: new Date().toISOString(), type: 'info' },
        { id: 2, title: 'Maintenance Sistem', message: 'Akan ada pemeliharaan server pada tanggal 30 Oktober pukul 00:00 WIB.', date: new Date(Date.now() - 86400000).toISOString(), type: 'warning' },
    ];
    res.json({ status: 'success', data: notifications });
});

// Jalankan Server
app.listen(PORT, () => {
    console.log(`
    ========================================
    SERVER USER RUNNING ON PORT ${PORT}
    http://localhost:${PORT}
    ========================================
    `);
});