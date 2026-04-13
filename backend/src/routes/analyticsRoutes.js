import express from 'express';
const router = express.Router();
import {
    getDailyReport,
    getWeeklyReport,
    getReportByMonth,
    getCustomReport,
    getDashboard
} from '../controllers/analyticsController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize as requireRole } from '../middleware/roleMiddleware.js';

router.use(authenticate);
router.use(requireRole(['admin', 'pharmacist']));

router.get('/dashboard', getDashboard);
router.get('/daily', getDailyReport);
router.get('/weekly', getWeeklyReport);
router.get('/monthly', getReportByMonth);
router.get('/custom', getCustomReport);

export default router;
