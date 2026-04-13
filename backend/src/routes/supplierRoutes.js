import express from 'express';
const router = express.Router();
import {
    getSuppliers,
    getSupplier,
    createSupplier,
    updateSupplier,
    deleteSupplier
} from '../controllers/supplierController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize as requireRole } from '../middleware/roleMiddleware.js';

router.use(authenticate);

router.get('/', getSuppliers);
router.get('/:id', getSupplier);
router.post('/', requireRole(['admin', 'pharmacist']), createSupplier);
router.put('/:id', requireRole(['admin', 'pharmacist']), updateSupplier);
router.delete('/:id', requireRole(['admin']), deleteSupplier);

export default router;