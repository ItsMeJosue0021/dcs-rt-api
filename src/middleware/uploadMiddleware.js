const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { uploadsDir } = require('../config/paths');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${crypto.randomUUID()}.pdf`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files allowed!'), false);
        }
        return cb(null, true);
    }
});

async function verifyPdfSignature(req, res, next) {
    if (!req.file) return next();

    let isPdf = false;
    try {
        const handle = await fs.promises.open(req.file.path, 'r');
        const header = Buffer.alloc(5);
        try {
            const { bytesRead } = await handle.read(header, 0, header.length, 0);
            isPdf = bytesRead === 5 && header.toString('ascii') === '%PDF-';
        } finally {
            await handle.close();
        }
    } catch (error) {
        await fs.promises.unlink(req.file.path).catch(() => {});
        return next(error);
    }

    if (!isPdf) {
        await fs.promises.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ error: 'The uploaded file is not a valid PDF.' });
    }
    return next();
}

module.exports = { upload, verifyPdfSignature };
