require('dotenv').config();

const bcrypt = require('bcryptjs');
const userService = require('../src/services/userService');
const pool = require('../src/config/db');

async function run() {
    const [, , emailArg, passwordArg, nameArg] = process.argv;
    const email = emailArg || process.env.ADMIN_EMAIL;
    const password = passwordArg || process.env.ADMIN_PASSWORD;
    const name = nameArg || process.env.ADMIN_NAME || 'Administrator';

    if (!email || !password) {
        throw new Error('Usage: npm run create-admin -- admin@example.com password "Admin Name"');
    }

    const existingUser = await userService.findUserByEmail(email);

    if (existingUser) {
        console.log(`Admin already exists: ${email}`);
        return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const id = await userService.createAdminUser({
        name,
        email,
        passwordHash
    });

    console.log(`Created admin user ${email} with id ${id}`);
}

run()
    .catch((error) => {
        console.error('Create admin failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });
