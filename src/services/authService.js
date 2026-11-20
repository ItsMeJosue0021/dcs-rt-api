const crypto = require('crypto');
const pool = require('../config/db');
const passwordService = require('./passwordService');

function publicUser(user) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_active: Boolean(user.is_active)
    };
}

async function findUserByEmail(email) {
    const [rows] = await pool.query(
        'SELECT *, (locked_until IS NOT NULL AND locked_until > UTC_TIMESTAMP()) AS is_locked FROM users WHERE email = ?',
        [email]
    );
    return rows[0] || null;
}

async function recordFailedLogin(userId) {
    if (!userId) return;
    await pool.query(
        `UPDATE users
         SET failed_login_attempts = failed_login_attempts + 1,
             locked_until = IF(failed_login_attempts >= 5,
               DATE_ADD(UTC_TIMESTAMP(), INTERVAL 15 MINUTE), locked_until)
         WHERE id = ?`,
        [userId]
    );
}

async function clearFailedLogins(userId) {
    await pool.query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [userId]);
}

async function createSession(userId) {
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const csrfToken = crypto.randomBytes(32).toString('hex');
    await pool.query(
        'INSERT INTO sessions (user_id, token_hash, csrf_token, expires_at) VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR))',
        [userId, tokenHash, csrfToken]
    );
    return { token, tokenHash, csrfToken };
}

async function insertAudit(connection, actor, { action, entityType, entityId, entityLabel, details }) {
    await connection.query(
        `INSERT INTO audit_logs (actor_user_id, actor_email, action, entity_type, entity_id, entity_label, details)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [actor?.id || null, actor?.email || 'system', action, entityType, String(entityId), entityLabel, JSON.stringify(details)]
    );
}

async function listUsers() {
    const [rows] = await pool.query(
        'SELECT id, email, name, role, is_active, created_at, last_login_at FROM users ORDER BY name ASC'
    );
    return rows;
}

async function listAuditLogs() {
    const [rows] = await pool.query(
        'SELECT id, actor_email, action, entity_type, entity_id, entity_label, details, created_at FROM audit_logs ORDER BY id DESC LIMIT 200'
    );
    return rows.map((row) => ({ ...row, details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details }));
}

async function createUser({ email, name, role, passwordHash }, actor) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [result] = await connection.query(
            'INSERT INTO users (email, name, role, password_hash) VALUES (?, ?, ?, ?)',
            [email, name, role, passwordHash]
        );
        await insertAudit(connection, actor, {
            action: 'created', entityType: 'user', entityId: result.insertId, entityLabel: email,
            details: { after: { email, name, role, is_active: true } }
        });
        await connection.commit();
        return { id: result.insertId, email, name, role, is_active: true };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function updateUserAccess(id, { role, is_active, passwordHash }, actor) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [rows] = await connection.query('SELECT id, email, name, role, is_active FROM users WHERE id = ? FOR UPDATE', [id]);
        const current = rows[0];
        if (!current) {
            await connection.rollback();
            return null;
        }
        if (Number(current.id) === Number(actor.id) && (!is_active || role !== current.role)) {
            const error = new Error('You cannot change your own role or deactivate your own account.');
            error.status = 400;
            throw error;
        }
        const activeAdmins = current.role === 'admin' && current.is_active
            ? (await connection.query("SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND is_active = TRUE"))[0][0].total
            : null;
        if (current.role === 'admin' && current.is_active && (role !== 'admin' || !is_active) && activeAdmins <= 1) {
            const error = new Error('At least one active administrator must remain.');
            error.status = 400;
            throw error;
        }

        const assignments = ['role = ?', 'is_active = ?'];
        const values = [role, is_active];
        if (passwordHash) {
            assignments.push('password_hash = ?', 'failed_login_attempts = 0', 'locked_until = NULL');
            values.push(passwordHash);
        }
        values.push(id);
        await connection.query(`UPDATE users SET ${assignments.join(', ')} WHERE id = ?`, values);
        if (!is_active || (passwordHash && Number(id) !== Number(actor.id))) {
            await connection.query('DELETE FROM sessions WHERE user_id = ?', [id]);
        }
        const after = { role, is_active: Boolean(is_active) };
        if (passwordHash) after.password_reset = true;
        await insertAudit(connection, actor, {
            action: passwordHash ? 'access_and_password_updated' : 'access_updated',
            entityType: 'user', entityId: id, entityLabel: current.email,
            details: { before: { role: current.role, is_active: Boolean(current.is_active) }, after }
        });
        await connection.commit();
        return { ...current, role, is_active: Boolean(is_active) };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function changePassword(userId, currentPassword, newPassword, actor, currentSessionHash) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [rows] = await connection.query('SELECT password_hash FROM users WHERE id = ? FOR UPDATE', [userId]);
        const account = rows[0];
        if (!account || !(await passwordService.verifyPassword(currentPassword, account.password_hash))) {
            const error = new Error('Current password is incorrect.');
            error.status = 400;
            throw error;
        }
        const passwordHash = await passwordService.hashPassword(newPassword);
        await connection.query('UPDATE users SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL WHERE id = ?', [passwordHash, userId]);
        await connection.query('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?', [userId, currentSessionHash]);
        await insertAudit(connection, actor, {
            action: 'password_changed', entityType: 'user', entityId: userId, entityLabel: actor.email,
            details: { changed_by_self: true }
        });
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    publicUser,
    findUserByEmail,
    recordFailedLogin,
    clearFailedLogins,
    createSession,
    listUsers,
    listAuditLogs,
    createUser,
    updateUserAccess,
    changePassword
};
