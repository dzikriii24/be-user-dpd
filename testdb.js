const db = require('./config/db');

async function testConnection() {
    try {
        console.log("🔄 Mencoba menghubungkan ke database...");
        
        // Tes query sederhana
        const [rows] = await db.query('SELECT 1 + 1 AS result');
        
        console.log("BERHASIL TERHUBUNG!");
        console.log("   Database:", process.env.DB_NAME);
        console.log("   Test Query Result:", rows[0].result); // Harus keluar 2
        console.log("Siap untuk Jambudipa!");
        
        process.exit(0); // Keluar sukses
    } catch (error) {
        console.error("GAGAL TERHUBUNG!");
        console.error("   Pesan Error:", error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.error("   Tips: Pastikan XAMPP/MySQL sudah dinyalakan!");
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.error("   Tips: Pastikan nama database 'db_absensi' sudah dibuat!");
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error("   Tips: Cek username/password di file .env!");
        }
        
        process.exit(1); // Keluar error
    }
}

testConnection();