const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');
const uploadsDir = process.env.UPLOADS_DIR || path.join(rootDir, 'uploads');

module.exports = {
    rootDir,
    uploadsDir
};
