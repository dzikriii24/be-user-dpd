const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./config/db');

// Load Config
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Biar frontend bisa akses
app.use(express.json()); // Biar bisa baca JSON dari frontend
app.use(express.static('public')); // Untuk akses folder foto/uploads

// Route Test Sederhana
app.get('/', (req, res) => {
    res.send('🚀 Server API User Absensi Siap!');
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
    const { user_id, tanggal, isi_laporan, checklist_json, foto_bukti } = req.body;
    try {
        await db.query(
            'INSERT INTO laporan (user_id, tanggal, isi_laporan, checklist_json, foto_bukti) VALUES (?, ?, ?, ?, ?)',
            [user_id, tanggal, isi_laporan, JSON.stringify(checklist_json), foto_bukti]
        );
        res.json({ status: 'success', message: 'Laporan berhasil dikirim' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
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