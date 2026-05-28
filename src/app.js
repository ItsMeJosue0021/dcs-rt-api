const express = require('express');
const cors = require('cors');
const { uploadsDir } = require('./config/paths');
const researchRoutes = require('./routes/researchRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

app.use('/api/research', researchRoutes);

module.exports = app;
