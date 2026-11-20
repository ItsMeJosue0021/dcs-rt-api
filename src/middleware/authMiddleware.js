const crypto = require('crypto');
const pool = require('../config/db');

function readCookie(req, name) {
    const cookies = (req.headers.cookie || '').split(';');
    const entry = cookies.map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(`${name}=`));
    if (!entry) return null;
    try { return decodeURIComponent(entry.slice(name.length + 1)); } catch { return null; }
}

async function requireAuth(req, res, next) {
    const token = readCookie(req, 'research_session');
    if (!token) return res.status(401).json({ error: 'Sign in to continue.' });
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    try {
        const [rows] = await pool.query(
            `SELECT s.token_hash, s.csrf_token, u.id, u.email, u.name, u.role, u.is_active
             FROM sessions s JOIN users u ON u.id = s.user_id
             WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP() AND u.is_active = TRUE`,
            [tokenHash]
        );
        if (!rows.length) return res.status(401).json({ error: 'Your session expired. Sign in again.' });
        req.user = { id: rows[0].id, email: rows[0].email, name: rows[0].name, role: rows[0].role };
        req.csrfToken = rows[0].csrf_token;
        req.sessionTokenHash = rows[0].token_hash;
        return next();
    } catch (error) {
        console.error('Session lookup failed:', error);
        return res.status(500).json({ error: 'Unable to verify your session.' });
    }
}

function requireRoles(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'You do not have permission to perform this action.' });
        }
        return next();
    };
}

function requireCsrf(req, res, next) {
    const supplied = req.get('x-csrf-token') || '';
    const expected = req.csrfToken || '';
    const suppliedBuffer = Buffer.from(supplied);
    const expectedBuffer = Buffer.from(expected);
    const valid = suppliedBuffer.length === expectedBuffer.length
        && crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);
    if (!valid) return res.status(403).json({ error: 'Invalid request token. Refresh the page and try again.' });
    return next();
}

module.exports = { requireAuth, requireRoles, requireCsrf };
