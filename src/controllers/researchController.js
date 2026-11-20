const fs = require('fs/promises');
const path = require('path');
const { uploadsDir } = require('../config/paths');
const researchService = require('../services/researchService');

const ALLOWED_TYPES = new Set(['Capstone', 'Thesis']);
const ALLOWED_STATUSES = new Set(['MOR', 'Part A', 'Part B', 'Finished']);
const REQUIRED_FIELDS = ['title', 'authors', 'abstract', 'adviser', 'critic', 'status'];

function validateResearch(data) {
    for (const field of REQUIRED_FIELDS.filter((field) => field !== 'abstract')) {
        if (typeof data[field] !== 'string' || !data[field].trim()) {
            return `${field} is required.`;
        }
    }
    if (data.status === 'Finished') {
        if (typeof data.abstract !== 'string' || !data.abstract.trim()) return 'abstract is required for finished research.';
    } else if (typeof data.abstract === 'string' && data.abstract.trim()) {
        return 'abstract can only be added when status is Finished.';
    }
    if (data.title.trim().length > 255) return 'title must be 255 characters or fewer.';
    if (data.adviser.trim().length > 255) return 'adviser must be 255 characters or fewer.';
    if (data.critic.trim().length > 255) return 'critic must be 255 characters or fewer.';
    if (data.type !== undefined && !ALLOWED_TYPES.has(data.type)) return 'type must be Capstone or Thesis.';
    if (!ALLOWED_STATUSES.has(data.status)) return 'status is not supported.';
    if (typeof data.academic_year !== 'string' || !/^\d{4}-\d{4}$/.test(data.academic_year)) {
        return 'academic_year must use the format YYYY-YYYY.';
    }
    const [startYear, endYear] = data.academic_year.split('-').map(Number);
    if (endYear !== startYear + 1) return 'academic_year must contain consecutive years.';

    if (data.website_url !== undefined && typeof data.website_url !== 'string') {
        return 'website_url must be a string.';
    }
    if (data.website_url && data.website_url.trim()) {
        try {
            const url = new URL(data.website_url);
            if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
            if (data.website_url.length > 500) return 'website_url must be 500 characters or fewer.';
        } catch {
            return 'website_url must be a valid HTTP or HTTPS URL.';
        }
    }
    return null;
}

async function discardUploadedFile(req) {
    if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
}

function validId(id) {
    return /^\d+$/.test(id) && Number.isSafeInteger(Number(id)) && Number(id) > 0;
}

async function removeStoredPdf(pdfUrl, label) {
    if (!pdfUrl?.startsWith('/uploads/')) return;
    const filename = path.basename(pdfUrl);
    await fs.unlink(path.join(uploadsDir, filename)).catch((error) => {
        if (error.code !== 'ENOENT') console.error(`Unable to remove ${label} PDF:`, error);
    });
}

async function createResearch(req, res) {
    const validationError = validateResearch(req.body);
    if (validationError) {
        await discardUploadedFile(req);
        return res.status(400).json({ error: validationError });
    }

    try {
        const pdf_url = req.file ? `/uploads/${req.file.filename}` : null;
        const id = await researchService.createResearch({
            ...req.body,
            abstract: req.body.status === 'Finished' ? req.body.abstract.trim() : '',
            pdf_url
        });
        return res.status(201).json({ id });
    } catch (error) {
        await discardUploadedFile(req);
        console.error('Create research failed:', error);
        return res.status(500).json({ error: 'Unable to create the research record.' });
    }
}

async function getAllResearch(req, res) {
    try {
        return res.json(await researchService.getAllResearch());
    } catch (error) {
        console.error('List research failed:', error);
        return res.status(500).json({ error: 'Unable to load research records.' });
    }
}

async function deleteResearch(req, res) {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'id must be a positive integer.' });
    try {
        const existing = await researchService.getResearchById(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Research record not found.' });
        await researchService.deleteResearch(req.params.id);
        await removeStoredPdf(existing.pdf_url, 'deleted');
        return res.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error('Delete research failed:', error);
        return res.status(500).json({ error: 'Unable to delete the research record.' });
    }
}

async function updateResearch(req, res) {
    if (!validId(req.params.id)) {
        await discardUploadedFile(req);
        return res.status(400).json({ error: 'id must be a positive integer.' });
    }
    const validationError = validateResearch(req.body);
    if (validationError) {
        await discardUploadedFile(req);
        return res.status(400).json({ error: validationError });
    }

    try {
        const existing = await researchService.getResearchById(req.params.id);
        if (!existing) {
            await discardUploadedFile(req);
            return res.status(404).json({ error: 'Research record not found.' });
        }

        const pdf_url = req.file ? `/uploads/${req.file.filename}` : null;
        await researchService.updateResearch(req.params.id, {
            ...req.body,
            abstract: req.body.status === 'Finished' ? req.body.abstract.trim() : '',
            pdf_url
        });
        if (req.file) await removeStoredPdf(existing.pdf_url, 'replaced');
        return res.json({ message: 'Updated successfully' });
    } catch (error) {
        await discardUploadedFile(req);
        console.error('Update research failed:', error);
        return res.status(500).json({ error: 'Unable to update the research record.' });
    }
}

module.exports = { createResearch, getAllResearch, deleteResearch, updateResearch };
