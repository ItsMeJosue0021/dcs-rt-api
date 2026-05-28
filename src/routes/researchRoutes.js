const express = require('express');
const researchController = require('../controllers/researchController');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/', upload.single('pdf_file'), researchController.createResearch);
router.get('/', researchController.getAllResearch);
router.delete('/:id', researchController.deleteResearch);
router.put('/:id', upload.single('pdf_file'), researchController.updateResearch);

module.exports = router;
