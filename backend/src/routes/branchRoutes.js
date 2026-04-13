import express from 'express';
const router = express.Router();
import { getBranches, createBranch, updateBranch } from '../controllers/branchController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize as requireRole } from '../middleware/roleMiddleware.js';

router.use(authenticate);

router.get('/', getBranches);
router.post('/', requireRole(['admin']), createBranch);
router.put('/:id', requireRole(['admin']), updateBranch);

export default router;