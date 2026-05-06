import express from 'express';
const router = express.Router();
import { getDebts, recordPayment, sendPaymentReminder, getDebtSummary, createDebt, deleteDebt } from '../controllers/debtController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize as requireRole } from '../middleware/roleMiddleware.js';

router.use(authenticate);

router.get('/', getDebts);
router.post('/', requireRole(['admin', 'pharmacist']), createDebt);
router.get('/summary', getDebtSummary);
router.post('/payments', requireRole(['admin', 'pharmacist', 'cashier']), recordPayment);
router.delete('/:id', requireRole(['admin']), deleteDebt);
router.post('/:debt_id/remind', requireRole(['admin', 'pharmacist']), sendPaymentReminder);

export default router;