const express = require('express');
const authController = require('../controllers/authController');
const { requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/login', authController.login);
router.get('/me', requireAdmin, authController.me);
router.post('/logout', requireAdmin, authController.logout);

module.exports = router;
