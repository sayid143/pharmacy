import express from 'express';
const router = express.Router();
import { getUsers, createUser, updateUser, resetUserPassword, getActivityLogs, getRoles } from '../controllers/userController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize as requireRole } from '../middleware/roleMiddleware.js';

router.use(authenticate);
router.use(requireRole(['admin']));

router.get('/', getUsers);
router.get('/roles', getRoles);
router.get('/activity-logs', getActivityLogs);
router.post('/', createUser);
router.put('/:id', updateUser);
router.post('/:id/reset-password', resetUserPassword);

export default router;