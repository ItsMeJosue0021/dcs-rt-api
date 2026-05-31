const express = require('express');
const cors = require('cors');
const { uploadsDir } = require('./config/paths');
const authRoutes = require('./routes/authRoutes');
const researchRoutes = require('./routes/researchRoutes');
const { requireAdmin } = require('./middleware/authMiddleware');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/uploads', requireAdmin, express.static(uploadsDir));
app.use('/api/research', requireAdmin, researchRoutes);

module.exports = app;
