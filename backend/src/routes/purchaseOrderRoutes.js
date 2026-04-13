import express from 'express';
const router = express.Router();
import { getPurchaseOrders, getPurchaseOrder, createPurchaseOrder, updatePurchaseOrderStatus } from '../controllers/purchaseOrderController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize as requireRole } from '../middleware/roleMiddleware.js';

router.use(authenticate);

router.get('/', getPurchaseOrders);
router.get('/:id', getPurchaseOrder);
router.post('/', requireRole(['admin', 'pharmacist']), createPurchaseOrder);
router.put('/:id/status', requireRole(['admin', 'pharmacist']), updatePurchaseOrderStatus);

export default router;