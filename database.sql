-- Buat Database


-- 1. Tabel Users (Petugas)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nip VARCHAR(20) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- Idealnya di-hash (bcrypt)
    nama VARCHAR(100) NOT NULL,
    role ENUM('Guest', 'Petugas', 'Admin') DEFAULT 'Guest',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Absensi
CREATE TABLE IF NOT EXISTS absensi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    tanggal DATE NOT NULL,
    jam_masuk TIME,
    jam_pulang TIME,
    shift VARCHAR(50), -- Pagi / Siang / Malam
    status VARCHAR(50), -- Tepat Waktu / Terlambat
    is_late BOOLEAN DEFAULT FALSE,
    lokasi VARCHAR(255),
    qr_code_data VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Tabel Laporan Harian
CREATE TABLE IF NOT EXISTS laporan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    tanggal DATE NOT NULL,
    isi_laporan TEXT,
    checklist_json JSON, -- Simpan data checklist {patroli: true, ...}
    foto_bukti VARCHAR(255), -- Path file foto
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Dummy Data untuk Login
INSERT INTO users (nip, password, nama, role) VALUES 
('123456', '123456', 'Dzikri', 'Petugas'),
('654321', '654321', 'Admin User', 'Admin');