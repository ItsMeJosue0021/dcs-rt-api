const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { uploadsDir } = require('./config/paths');
const researchRoutes = require('./routes/researchRoutes');

const app = express();

const allowedOrigins = (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({ origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
} }));
app.use(express.json({ limit: '32kb' }));
app.use('/uploads', express.static(uploadsDir));

app.use('/api/research', researchRoutes);

app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof multer.MulterError) {
        const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        return res.status(status).json({ error: error.code === 'LIMIT_FILE_SIZE'
            ? 'PDF files must be 10 MB or smaller.'
            : 'Invalid file upload.' });
    }
    if (error.message === 'Only PDF files allowed!') {
        return res.status(400).json({ error: error.message });
    }
    if (error.message === 'Origin is not allowed by CORS') {
        return res.status(403).json({ error: 'Origin is not allowed.' });
    }
    console.error('Unhandled request error:', error);
    return res.status(500).json({ error: 'An unexpected server error occurred.' });
});

module.exports = app;
