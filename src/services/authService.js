const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/authConfig');
const userService = require('./userService');

function sanitizeUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
    };
}

function createToken(user) {
    return jwt.sign(
        {
            sub: user.id,
            role: user.role
        },
        getJwtSecret(),
        { expiresIn: '8h' }
    );
}

async function login(email, password) {
    const user = await userService.findUserByEmail(email);

    if (!user) {
        return null;
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword || user.role !== 'admin') {
        return null;
    }

    return {
        token: createToken(user),
        user: sanitizeUser(user)
    };
}

async function getUserFromToken(token) {
    const payload = jwt.verify(token, getJwtSecret());
    const user = await userService.findUserById(payload.sub);

    if (!user || user.role !== 'admin') {
        return null;
    }

    return sanitizeUser(user);
}

module.exports = {
    login,
    getUserFromToken,
    sanitizeUser
};
