function getJwtSecret() {
    const secret = process.env.JWT_SECRET;

    if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET is required in production');
    }

    return secret || 'dcs-research-local-dev-secret';
}

module.exports = {
    getJwtSecret
};
