import express from 'express';
const router = express.Router();
import { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer } from '../controllers/customerController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize as requireRole } from '../middleware/roleMiddleware.js';

router.use(authenticate);

router.get('/', getCustomers);
router.get('/:id', getCustomer);
router.post('/', createCustomer);
router.put('/:id', requireRole(['admin', 'pharmacist']), updateCustomer);
router.delete('/:id', requireRole(['admin']), deleteCustomer);

export default router;