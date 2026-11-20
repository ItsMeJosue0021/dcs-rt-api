const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth, requireCsrf } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/login', authController.signIn);
router.get('/me', requireAuth, authController.getCurrentUser);
router.post('/password', requireAuth, requireCsrf, authController.changePassword);
router.post('/logout', requireAuth, requireCsrf, authController.signOut);

module.exports = router;
