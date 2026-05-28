const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');
const uploadsDir = path.join(rootDir, 'uploads');

module.exports = {
    rootDir,
    uploadsDir
};
