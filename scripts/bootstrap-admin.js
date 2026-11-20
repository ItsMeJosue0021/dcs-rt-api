require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('../src/config/db');
const passwordService = require('../src/services/passwordService');

function promptHidden(prompt) {
    const input = process.stdin;
    if (!input.isTTY || typeof input.setRawMode !== 'function') {
        throw new Error('Run this command in an interactive terminal so the password can be entered without echo.');
    }
    process.stdout.write(prompt);
    input.setRawMode(true);
    input.resume();

    return new Promise((resolve, reject) => {
        let value = '';
        const finish = (error) => {
            input.removeListener('data', onData);
            input.setRawMode(false);
            input.pause();
            process.stdout.write('\n');
            if (error) reject(error);
            else resolve(value);
        };
        const onData = (buffer) => {
            const key = buffer.toString('utf8');
            if (key === '\u0003') return finish(new Error('Cancelled.'));
            if (key === '\r' || key === '\n') return finish();
            if (key === '\u007f' || key === '\b') value = value.slice(0, -1);
            else if (key >= ' ' && key !== '\u001b') value += key;
        };
        input.on('data', onData);
    });
}

async function main() {
    const email = String(process.argv[2] || '').trim().toLowerCase();
    if (!email || !email.includes('@')) throw new Error('Usage: npm run bootstrap-admin -- admin@example.edu');
    const password = await promptHidden('Set the administrator password (12+ characters): ');
    const name = String(process.env.BOOTSTRAP_ADMIN_NAME || email).trim();
    if (!passwordService.isStrongPassword(password)) throw new Error('Password must be between 12 and 256 characters.');

    const passwordHash = await passwordService.hashPassword(password);
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query(
            `INSERT INTO users (email, name, role, password_hash, is_active)
             VALUES (?, ?, 'admin', ?, TRUE)
             ON DUPLICATE KEY UPDATE name = VALUES(name), role = 'admin', password_hash = VALUES(password_hash), is_active = TRUE,
               failed_login_attempts = 0, locked_until = NULL`,
            [email, name, passwordHash]
        );
        const [rows] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
        await connection.query(
            `INSERT INTO audit_logs (actor_user_id, actor_email, action, entity_type, entity_id, entity_label, details)
             VALUES (NULL, 'system', 'bootstrapped', 'user', ?, ?, JSON_OBJECT('role', 'admin'))`,
            [String(rows[0].id), email]
        );
        await connection.commit();
        console.log(`Administrator account prepared for ${email}.`);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
}).finally(() => pool.end());
