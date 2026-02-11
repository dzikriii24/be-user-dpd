const mysql = require('mysql2');
const dotenv = require('dotenv');

// Load env variables
dotenv.config();

// Buat Connection Pool (Lebih efisien daripada single connection)
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Convert ke Promise based biar bisa pakai async/await (Modern JS)
const dbPromise = db.promise();

module.exports = dbPromise;