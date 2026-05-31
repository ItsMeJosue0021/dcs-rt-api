const authService = require('../services/authService');

async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const result = await authService.login(email, password);

        if (!result) {
            return res.status(401).json({ error: 'Invalid admin credentials.' });
        }

        return res.json(result);
    } catch (error) {
        console.error('LOGIN ERROR:', error);
        return res.status(500).json({ error: error.message });
    }
}

async function me(req, res) {
    return res.json({ user: req.user });
}

async function logout(req, res) {
    return res.json({ message: 'Logged out successfully.' });
}

module.exports = {
    login,
    me,
    logout
};
