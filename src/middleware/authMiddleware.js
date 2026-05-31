const authService = require('../services/authService');

async function requireAdmin(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Authentication required.' });
    }

    try {
        const user = await authService.getUserFromToken(token);

        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required.' });
        }

        req.user = user;
        return next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
}

module.exports = {
    requireAdmin
};
