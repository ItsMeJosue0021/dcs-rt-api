const pool = require('../config/db');

async function createResearch(data) {
    const query = `
        INSERT INTO research
        (title, type, authors, abstract, pdf_url, adviser, critic, status, website_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(query, [
        data.title,
        data.type || 'Capstone',
        data.authors,
        data.abstract,
        data.pdf_url,
        data.adviser,
        data.critic,
        data.status,
        data.website_url || null
    ]);

    return result.insertId;
}

async function getAllResearch() {
    const [rows] = await pool.query('SELECT * FROM research ORDER BY id DESC');
    return rows;
}

async function deleteResearch(id) {
    const [result] = await pool.query(
        'DELETE FROM research WHERE id = ?',
        [id]
    );

    return result;
}

async function updateResearch(id, data) {
    const query = `
        UPDATE research
        SET
            title = ?,
            type = ?,
            authors = ?,
            abstract = ?,
            adviser = ?,
            critic = ?,
            status = ?,
            website_url = ?,
            pdf_url = COALESCE(?, pdf_url)
        WHERE id = ?
    `;

    const [result] = await pool.query(query, [
        data.title,
        data.type || 'Capstone',
        data.authors,
        data.abstract,
        data.adviser,
        data.critic,
        data.status,
        data.website_url || null,
        data.pdf_url,
        id
    ]);

    return result;
}

module.exports = {
    createResearch,
    getAllResearch,
    deleteResearch,
    updateResearch
};
