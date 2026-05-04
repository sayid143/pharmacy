import express from 'express';
const router = express.Router();
import {
    getMedicines,
    getMedicine,
    createMedicine,
    updateMedicine,
    deleteMedicine,
    getMedicineByBarcode,
    getStats
} from '../controllers/medicineController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize as requireRole } from '../middleware/roleMiddleware.js';
import upload from '../utils/upload.js';

router.use(authenticate);

// Priority routes
router.get('/stats', getStats);
router.get('/', getMedicines);
router.get('/barcode/:barcode', getMedicineByBarcode);
router.get('/:id', getMedicine);

// Protected mutations
router.post('/', requireRole(['admin', 'pharmacist']), upload.single('image'), createMedicine);
router.put('/:id', requireRole(['admin', 'pharmacist']), upload.single('image'), updateMedicine);
router.delete('/:id', requireRole(['admin']), deleteMedicine);

export default router;