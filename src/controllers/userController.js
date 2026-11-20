const authService = require('../services/authService');
const passwordService = require('../services/passwordService');

const ROLES = new Set(['admin', 'editor', 'viewer']);

function listUsers(req, res, next) {
    authService.listUsers().then((users) => res.json(users)).catch(next);
}

function listAuditLogs(req, res, next) {
    authService.listAuditLogs().then((logs) => res.json(logs)).catch(next);
}

async function createUser(req, res, next) {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const { role, password } = req.body || {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
        return res.status(400).json({ error: 'Provide a valid email address.' });
    }
    if (!name || name.length > 255) return res.status(400).json({ error: 'Name is required and must be 255 characters or fewer.' });
    if (!ROLES.has(role)) return res.status(400).json({ error: 'Provide a valid role.' });
    if (!passwordService.isStrongPassword(password)) {
        return res.status(400).json({ error: 'Passwords must be between 12 and 256 characters.' });
    }
    try {
        const user = await authService.createUser({ email, name, role, passwordHash: await passwordService.hashPassword(password) }, req.user);
        return res.status(201).json(user);
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'An account with that email already exists.' });
        return next(error);
    }
}

async function updateUser(req, res, next) {
    const id = Number(req.params.id);
    const { role, is_active, password } = req.body || {};
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'User id must be a positive integer.' });
    if (!ROLES.has(role) || typeof is_active !== 'boolean') {
        return res.status(400).json({ error: 'Provide a valid role and active state.' });
    }
    if (password !== undefined && !passwordService.isStrongPassword(password)) {
        return res.status(400).json({ error: 'Passwords must be between 12 and 256 characters.' });
    }

    try {
        const user = await authService.updateUserAccess(id, {
            role,
            is_active,
            passwordHash: password ? await passwordService.hashPassword(password) : null
        }, req.user);
        if (!user) return res.status(404).json({ error: 'User not found.' });
        return res.json(user);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        return next(error);
    }
}

module.exports = { listUsers, listAuditLogs, createUser, updateUser };
