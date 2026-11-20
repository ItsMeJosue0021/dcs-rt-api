const pool = require('../config/db');

async function insertAudit(connection, actor, { action, entityId, entityLabel, details }) {
    await connection.query(
        `INSERT INTO audit_logs
         (actor_user_id, actor_email, action, entity_type, entity_id, entity_label, details)
         VALUES (?, ?, ?, 'research', ?, ?, ?)`,
        [actor.id, actor.email, action, String(entityId), entityLabel, JSON.stringify(details)]
    );
}

async function createResearch(data, actor) {
    const query = `
        INSERT INTO research
        (title, type, authors, abstract, description, pdf_url, adviser, critic, status, website_url, academic_year)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [result] = await connection.query(query, [
            data.title,
            data.type || 'Capstone',
            data.authors,
            data.abstract,
            data.description,
            data.pdf_url,
            data.adviser,
            data.critic,
            data.status,
            data.website_url || null,
            data.academic_year
        ]);
        await insertAudit(connection, actor, {
            action: 'created',
            entityId: result.insertId,
            entityLabel: data.title,
            details: { after: data }
        });
        await connection.commit();
        return result.insertId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function getAllResearch() {
    const [rows] = await pool.query('SELECT * FROM research ORDER BY id DESC');
    return rows;
}

async function getResearchById(id) {
    const [rows] = await pool.query('SELECT * FROM research WHERE id = ?', [id]);
    return rows[0] || null;
}

async function deleteResearch(id, before, actor) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [result] = await connection.query('DELETE FROM research WHERE id = ?', [id]);
        if (result.affectedRows) {
            await insertAudit(connection, actor, {
                action: 'deleted',
                entityId: id,
                entityLabel: before.title,
                details: { before }
            });
        }
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function updateResearch(id, data, before, actor) {
    const query = `
        UPDATE research
        SET
            title = ?,
            type = ?,
            authors = ?,
            abstract = ?,
            description = ?,
            adviser = ?,
            critic = ?,
            status = ?,
            website_url = ?,
            academic_year = ?,
            pdf_url = COALESCE(?, pdf_url)
        WHERE id = ?
    `;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [result] = await connection.query(query, [
            data.title,
            data.type || 'Capstone',
            data.authors,
            data.abstract,
            data.description,
            data.adviser,
            data.critic,
            data.status,
            data.website_url || null,
            data.academic_year,
            data.pdf_url,
            id
        ]);
        if (result.affectedRows) {
            await insertAudit(connection, actor, {
                action: 'updated',
                entityId: id,
                entityLabel: data.title,
                details: {
                    before,
                    after: { ...data, pdf_url: data.pdf_url || before.pdf_url }
                }
            });
        }
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    createResearch,
    getAllResearch,
    getResearchById,
    deleteResearch,
    updateResearch
};
