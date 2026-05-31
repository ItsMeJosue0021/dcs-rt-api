const pool = require('../config/db');

async function findUserByEmail(email) {
    const [rows] = await pool.query(
        'SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1',
        [email]
    );

    return rows[0] || null;
}

async function findUserById(id) {
    const [rows] = await pool.query(
        'SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1',
        [id]
    );

    return rows[0] || null;
}

async function createAdminUser({ name, email, passwordHash }) {
    const [result] = await pool.query(
        `
            INSERT INTO users (name, email, password_hash, role)
            VALUES (?, ?, ?, 'admin')
        `,
        [name, email, passwordHash]
    );

    return result.insertId;
}

module.exports = {
    findUserByEmail,
    findUserById,
    createAdminUser
};
