const researchService = require('../services/researchService');

async function createResearch(req, res) {
    try {
        const pdf_url = req.file ? `/uploads/${req.file.filename}` : null;
        const id = await researchService.createResearch({
            ...req.body,
            pdf_url
        });

        res.json({ id });
    } catch (error) {
        console.error('SERVER ERROR:', error);
        res.status(500).json({ error: error.message });
    }
}

async function getAllResearch(req, res) {
    try {
        const rows = await researchService.getAllResearch();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function deleteResearch(req, res) {
    try {
        await researchService.deleteResearch(req.params.id);
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}

async function updateResearch(req, res) {
    try {
        const pdf_url = req.file ? `/uploads/${req.file.filename}` : null;

        await researchService.updateResearch(req.params.id, {
            ...req.body,
            pdf_url
        });

        res.json({ message: 'Updated successfully' });
    } catch (error) {
        console.error('UPDATE ERROR:', error);
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    createResearch,
    getAllResearch,
    deleteResearch,
    updateResearch
};
