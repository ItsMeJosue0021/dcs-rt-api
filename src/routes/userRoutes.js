const express = require('express');
const userController = require('../controllers/userController');
const { requireAuth, requireRoles, requireCsrf } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(requireAuth, requireRoles('admin'));
router.get('/', userController.listUsers);
router.post('/', requireCsrf, userController.createUser);
router.patch('/:id', requireCsrf, userController.updateUser);
router.get('/audit-logs', userController.listAuditLogs);

module.exports = router;
