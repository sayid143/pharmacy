import express from 'express';
const router = express.Router();
import { createSale, getSales, getSale, updateSale, refundSale, deleteSale } from '../controllers/salesController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize as requireRole } from '../middleware/roleMiddleware.js';

router.use(authenticate);

router.post('/', createSale);
router.get('/', getSales);
router.get('/:id', getSale);
router.put('/:id', requireRole(['admin', 'pharmacist']), updateSale);
router.post('/:id/refund', requireRole(['admin', 'pharmacist']), refundSale);
router.delete('/:id', requireRole(['admin', 'pharmacist']), deleteSale);

export default router;