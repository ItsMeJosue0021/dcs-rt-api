const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { uploadsDir } = require('./config/paths');
const researchRoutes = require('./routes/researchRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const { requireAuth } = require('./middleware/authMiddleware');
const db = require('./config/db');

const app = express();
app.set('trust proxy', 1);

const configuredOrigins = (process.env.CLIENT_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const allowedOrigins = new Set(['http://localhost:5173', ...configuredOrigins]);

app.use(cors({ credentials: true, origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
} }));
app.use(express.json({ limit: '32kb' }));
app.get('/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        return res.json({ status: 'ok' });
    } catch (error) {
        console.error('Health check failed:', error.message);
        return res.status(503).json({ status: 'unavailable' });
    }
});
app.use('/uploads', requireAuth, express.static(uploadsDir));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
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
