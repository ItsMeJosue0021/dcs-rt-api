const express = require('express');
require('dotenv').config();
const cors = require('cors');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'dcs_research'
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir); // folder where PDFs will go
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files allowed!'), false);
        }
        cb(null, true);
    }
});
app.use('/uploads', express.static(uploadsDir));

// 1. CREATE
app.post('/api/research', upload.single('pdf_file'), async (req, res) => {
    try {
        const { title, type, authors, abstract, adviser, critic, status, website_url } = req.body;
        const pdf_url = req.file ? `/uploads/${req.file.filename}` : null;

        const query = `
            INSERT INTO research 
            (title, type, authors, abstract, pdf_url, adviser, critic, status, website_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await pool.query(query, [
            title,
            type || 'Capstone', 
            authors,
            abstract,
            pdf_url,
            adviser,
            critic,
            status,
            website_url || null
        ]);

        res.json({ id: result.insertId });
    } catch (error) {
        console.error("🔥 SERVER ERROR:", error);
        res.status(500).json({ error: error.message });
    }
});
// 2. READ ALL
app.get('/api/research', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM research ORDER BY id DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.delete('/api/research/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query(
            'DELETE FROM research WHERE id = ?',
            [id]
        );

        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// app.put('/api/research/:id', upload.single('pdf_file'), async (req, res) => {
//     const { id } = req.params;
//     const { title, authors, abstract, adviser, critic, status, website_url } = req.body;

//     let pdf_url = null;

//     if (req.file) {
//         pdf_url = `/uploads/${req.file.filename}`;
//     }

//     try {
//         const query = `
//             UPDATE research 
//             SET title=?, authors=?, abstract=?, adviser=?, critic=?, status=?, website_url=?,
//                 pdf_url = COALESCE(?, pdf_url)
//             WHERE id=?
//         `;

//         await pool.query(query, [
//             title,
//             authors,
//             abstract,
//             adviser,
//             critic,
//             status,
//             website_url || null,
//             pdf_url,
//             id
//         ]);

//         res.json({ message: 'Updated successfully' });

//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: error.message });
//     }
// });

app.put('/api/research/:id', upload.single('pdf_file'), async (req, res) => {
    const { id } = req.params;
    const { title, type, authors, abstract, adviser, critic, status, website_url } = req.body;

    let pdf_url = null;
    if (req.file) {
        pdf_url = `/uploads/${req.file.filename}`;
    }

    try {
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

        await pool.query(query, [
            title,
            type || 'Capstone',
            authors,
            abstract,
            adviser,
            critic,
            status,
            website_url || null,
            pdf_url,
            id
        ]);

        res.json({ message: "Updated successfully" });

    } catch (error) {
        console.error("🔥 UPDATE ERROR:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`DCS Backend running on port ${PORT}`));
