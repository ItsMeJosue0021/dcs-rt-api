const express = require('express');
const researchController = require('../controllers/researchController');
const { upload, verifyPdfSignature } = require('../middleware/uploadMiddleware');
const { requireAuth, requireRoles, requireCsrf } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', requireAuth, requireRoles('admin', 'editor'), requireCsrf, upload.single('pdf_file'), verifyPdfSignature, researchController.createResearch);
router.get('/', requireAuth, researchController.getAllResearch);
router.delete('/:id', requireAuth, requireRoles('admin'), requireCsrf, researchController.deleteResearch);
router.put('/:id', requireAuth, requireRoles('admin', 'editor'), requireCsrf, upload.single('pdf_file'), verifyPdfSignature, researchController.updateResearch);

module.exports = router;
