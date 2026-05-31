require('dotenv').config();

const fs = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');
const { getDatabaseConfig } = require('../src/config/databaseConfig');

const migrationsDir = path.join(__dirname, '..', 'migrations');

async function getMigrationFiles() {
    const entries = await fs.readdir(migrationsDir);

    return entries
        .filter((entry) => entry.endsWith('.js'))
        .sort((a, b) => a.localeCompare(b));
}

async function ensureDatabaseExists(config) {
    const connection = await mysql.createConnection({
        host: config.host,
        user: config.user,
        password: config.password,
        port: config.port,
        multipleStatements: false
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\``);
    await connection.end();
}

async function ensureMigrationsTable(connection) {
    await connection.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

async function getAppliedMigrations(connection) {
    const [rows] = await connection.query('SELECT name FROM schema_migrations');
    return new Set(rows.map((row) => row.name));
}

async function run() {
    const config = getDatabaseConfig();

    await ensureDatabaseExists(config);

    const connection = await mysql.createConnection(config);

    try {
        await ensureMigrationsTable(connection);

        const appliedMigrations = await getAppliedMigrations(connection);
        const migrationFiles = await getMigrationFiles();

        for (const fileName of migrationFiles) {
            if (appliedMigrations.has(fileName)) {
                console.log(`Skipping ${fileName}`);
                continue;
            }

            const migrationPath = path.join(migrationsDir, fileName);
            const migration = require(migrationPath);

            if (typeof migration.up !== 'function') {
                throw new Error(`${fileName} must export an up(connection) function`);
            }

            console.log(`Running ${fileName}`);
            await migration.up(connection);
            await connection.query(
                'INSERT INTO schema_migrations (name) VALUES (?)',
                [fileName]
            );
            console.log(`Applied ${fileName}`);
        }

        console.log('Migrations complete');
    } finally {
        await connection.end();
    }
}

run().catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
});
