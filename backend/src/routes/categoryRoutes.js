import express from 'express';
const router = express.Router();
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize as requireRole } from '../middleware/roleMiddleware.js';

router.use(authenticate);

router.get('/', getCategories);
router.post('/', requireRole(['admin', 'pharmacist']), createCategory);
router.put('/:id', requireRole(['admin', 'pharmacist']), updateCategory);
router.delete('/:id', requireRole(['admin']), deleteCategory);

export default router;