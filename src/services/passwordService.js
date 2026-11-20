const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;

async function hashPassword(password) {
    const salt = crypto.randomBytes(16);
    const derivedKey = await scrypt(password, salt, KEY_LENGTH);
    return `scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, encodedHash) {
    if (typeof encodedHash !== 'string') return false;
    const [algorithm, saltHex, keyHex] = encodedHash.split('$');
    if (algorithm !== 'scrypt' || !/^[\da-f]{32}$/i.test(saltHex || '') || !/^[\da-f]{128}$/i.test(keyHex || '')) return false;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(keyHex, 'hex');
    const actual = await scrypt(password, salt, expected.length);
    return crypto.timingSafeEqual(actual, expected);
}

function isStrongPassword(password) {
    return typeof password === 'string' && password.length >= 12 && password.length <= 256;
}

module.exports = { hashPassword, verifyPassword, isStrongPassword };
