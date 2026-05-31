async function tableExists(connection, tableName) {
    const [rows] = await connection.query(
        `
            SELECT COUNT(*) AS table_count
            FROM information_schema.tables
            WHERE table_schema = DATABASE()
                AND table_name = ?
        `,
        [tableName]
    );

    return rows[0].table_count > 0;
}

async function columnExists(connection, tableName, columnName) {
    const [rows] = await connection.query(
        `
            SELECT COUNT(*) AS column_count
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
                AND table_name = ?
                AND column_name = ?
        `,
        [tableName, columnName]
    );

    return rows[0].column_count > 0;
}

async function addColumnIfMissing(connection, tableName, columnName, definition) {
    if (await columnExists(connection, tableName, columnName)) {
        return;
    }

    await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
}

async function up(connection) {
    if (!(await tableExists(connection, 'research'))) {
        await connection.query(`
            CREATE TABLE research (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                type VARCHAR(100) NOT NULL DEFAULT 'Capstone',
                authors TEXT NULL,
                abstract TEXT NULL,
                pdf_url VARCHAR(500) NULL,
                adviser VARCHAR(255) NULL,
                critic VARCHAR(255) NULL,
                status VARCHAR(100) NULL,
                website_url VARCHAR(500) NULL
            )
        `);
        return;
    }

    await addColumnIfMissing(connection, 'research', 'title', 'VARCHAR(255) NULL');
    await addColumnIfMissing(connection, 'research', 'type', "VARCHAR(100) NOT NULL DEFAULT 'Capstone'");
    await addColumnIfMissing(connection, 'research', 'authors', 'TEXT NULL');
    await addColumnIfMissing(connection, 'research', 'abstract', 'TEXT NULL');
    await addColumnIfMissing(connection, 'research', 'pdf_url', 'VARCHAR(500) NULL');
    await addColumnIfMissing(connection, 'research', 'adviser', 'VARCHAR(255) NULL');
    await addColumnIfMissing(connection, 'research', 'critic', 'VARCHAR(255) NULL');
    await addColumnIfMissing(connection, 'research', 'status', 'VARCHAR(100) NULL');
    await addColumnIfMissing(connection, 'research', 'website_url', 'VARCHAR(500) NULL');
}

module.exports = {
    up
};
