const authService = require('../services/authService');
const passwordService = require('../services/passwordService');

const SESSION_HOURS = 8;

function setSessionCookie(req, res, token) {
    const secure = req.secure || process.env.NODE_ENV === 'production';
    const sameSite = secure ? 'None' : 'Lax';
    res.setHeader('Set-Cookie', `research_session=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${SESSION_HOURS * 60 * 60}; SameSite=${sameSite}${secure ? '; Secure' : ''}`);
}

function clearSessionCookie(req, res) {
    const secure = req.secure || process.env.NODE_ENV === 'production';
    const sameSite = secure ? 'None' : 'Lax';
    res.setHeader('Set-Cookie', `research_session=; HttpOnly; Path=/; Max-Age=0; SameSite=${sameSite}${secure ? '; Secure' : ''}`);
}

async function signIn(req, res) {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = req.body?.password;
    if (!email || typeof password !== 'string') return res.status(400).json({ error: 'Email and password are required.' });
    if (password.length > 256) return res.status(400).json({ error: 'Password is too long.' });

    try {
        const user = await authService.findUserByEmail(email);
        if (user?.is_locked) return res.status(429).json({ error: 'Too many failed attempts. Try again in 15 minutes.' });
        const validPassword = user?.is_active && await passwordService.verifyPassword(password, user.password_hash);
        if (!validPassword) {
            if (user) await authService.recordFailedLogin(user.id);
            return res.status(401).json({ error: 'Email or password is incorrect.' });
        }

        await authService.clearFailedLogins(user.id);
        const session = await authService.createSession(user.id);
        setSessionCookie(req, res, session.token);
        return res.json({ user: authService.publicUser(user), csrfToken: session.csrfToken });
    } catch (error) {
        console.error('Sign-in failed:', error);
        return res.status(500).json({ error: 'Unable to sign in right now.' });
    }
}

function getCurrentUser(req, res) {
    return res.json({ user: authService.publicUser(req.user), csrfToken: req.csrfToken });
}

async function changePassword(req, res) {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
        return res.status(400).json({ error: 'Current and new passwords are required.' });
    }
    if (currentPassword.length > 256) return res.status(400).json({ error: 'Current password is too long.' });
    if (!passwordService.isStrongPassword(newPassword)) {
        return res.status(400).json({ error: 'New passwords must be between 12 and 256 characters.' });
    }
    try {
        await authService.changePassword(req.user.id, currentPassword, newPassword, req.user, req.sessionTokenHash);
        return res.json({ message: 'Password changed.' });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        console.error('Password change failed:', error);
        return res.status(500).json({ error: 'Unable to change your password.' });
    }
}

async function signOut(req, res) {
    try {
        const pool = require('../config/db');
        await pool.query('DELETE FROM sessions WHERE token_hash = ?', [req.sessionTokenHash]);
        clearSessionCookie(req, res);
        return res.json({ message: 'Signed out.' });
    } catch (error) {
        console.error('Sign-out failed:', error);
        return res.status(500).json({ error: 'Unable to sign out.' });
    }
}

module.exports = { signIn, getCurrentUser, changePassword, signOut };
