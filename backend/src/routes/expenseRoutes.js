import express from 'express';
const router = express.Router();
import { getExpenses, createExpense, updateExpense, deleteExpense, getExpenseSummary } from '../controllers/expenseController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize as requireRole } from '../middleware/roleMiddleware.js';
import upload from '../utils/upload.js';

router.use(authenticate);

router.get('/summary', getExpenseSummary);
router.get('/', getExpenses);
router.post('/', requireRole(['admin', 'pharmacist']), upload.single('receipt'), createExpense);
router.put('/:id', requireRole(['admin', 'pharmacist']), updateExpense);
router.delete('/:id', requireRole(['admin']), deleteExpense);

export default router;