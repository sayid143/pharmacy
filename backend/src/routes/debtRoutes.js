import express from 'express';
const router = express.Router();
import { getDebts, recordPayment, sendPaymentReminder, getDebtSummary, createDebt, deleteDebt } from '../controllers/debtController.js';
import { authenticate } from '../middleware/authMiddleware.js';

router.use(authenticate);

router.get('/', getDebts);
router.post('/', createDebt);
router.get('/summary', getDebtSummary);
router.post('/payments', recordPayment);
router.delete('/:id', deleteDebt);
router.post('/:debt_id/remind', sendPaymentReminder);

export default router;